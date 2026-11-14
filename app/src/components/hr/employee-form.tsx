"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { EmployeeStatus, EmploymentType } from "@prisma/client"
import { createEmployee, updateEmployee, type HROverviewData, type EmployeeRecord } from "@/app/actions/hr"
import { unwrap } from "@/lib/action-result"
import { errorMessage } from "@/lib/utils"
import { useTaxRegime } from "@/hooks/use-tax-regime"
import { searchCountries, searchStates, searchCities } from "@/lib/constants/geo-locations"
import { AutoSuggestInput } from "@/components/ui/auto-suggest-input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { findCities, findStates } from "@/app/actions/geo"

const NONE = "__none__"

/** Add or edit an employee (full page; the directory is /hr). */
export function EmployeeForm({
    departments,
    designations,
    employees,
    employee,
}: {
    departments: HROverviewData["departments"]
    designations: HROverviewData["designations"]
    employees: HROverviewData["employees"]
    employee?: EmployeeRecord
}) {
    const router = useRouter()
    const { regime } = useTaxRegime()
    const editing = !!employee
    const address = (employee?.address || {}) as { country?: string; state?: string; city?: string }
    const emergency = (employee?.emergencyContact || {}) as { name?: string; phone?: string }
    const [saving, setSaving] = useState(false)
    const [f, setF] = useState({
        firstName: employee?.firstName ?? "",
        lastName: employee?.lastName ?? "",
        email: employee?.email ?? "",
        phone: employee?.phone ?? "",
        joiningDate: employee?.joiningDate ? format(new Date(employee.joiningDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        status: (employee?.status ?? "ACTIVE") as EmployeeStatus,
        employmentType: (employee?.employmentType ?? "FULL_TIME") as EmploymentType,
        departmentId: employee?.departmentId ?? "",
        designationId: employee?.designationId ?? "",
        managerId: employee?.managerId ?? "",
        salary: employee?.basicSalary ? String(employee.basicSalary) : "",
        country: address.country ?? "",
        state: address.state ?? "",
        city: address.city ?? "",
        emergencyName: emergency.name ?? "",
        emergencyPhone: emergency.phone ?? "",
    })
    const set = (change: Partial<typeof f>) => setF((prev) => ({ ...prev, ...change }))

    const designationOptions = useMemo(
        () => (f.departmentId ? designations.filter((d) => !d.departmentId || d.departmentId === f.departmentId) : designations),
        [designations, f.departmentId]
    )
    // Anyone but the employee themselves can be the manager
    const managerOptions = employees.filter((e) => e.id !== employee?.id)

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!f.firstName.trim()) return toast.error("Enter the first name")
        if (!f.email.trim()) return toast.error("Enter the work email")
        setSaving(true)
        try {
            const shared = {
                firstName: f.firstName.trim(),
                lastName: f.lastName.trim() || undefined,
                email: f.email.trim(),
                phone: f.phone.trim() || undefined,
                joiningDate: f.joiningDate || undefined,
                status: f.status,
                employmentType: f.employmentType,
                country: f.country.trim() || undefined,
                state: f.state.trim() || undefined,
                city: f.city.trim() || undefined,
                emergencyContactName: f.emergencyName.trim(),
                emergencyContactPhone: f.emergencyPhone.trim(),
            }
            if (editing) {
                unwrap(await updateEmployee(employee.id, {
                    ...shared,
                    departmentId: f.departmentId || null,
                    designationId: f.designationId || null,
                    managerId: f.managerId || null,
                    basicSalary: f.salary ? parseFloat(f.salary) : null,
                }))
                toast.success("Employee saved")
            } else {
                const res = unwrap(await createEmployee({
                    ...shared,
                    departmentId: f.departmentId || undefined,
                    designationId: f.designationId || undefined,
                    managerId: f.managerId || undefined,
                    basicSalary: f.salary ? parseFloat(f.salary) : undefined,
                }))
                toast.success(`Employee ${res.employee.employeeNumber} added`)
            }
            router.push("/hr")
            router.refresh()
        } catch (err) {
            toast.error(errorMessage(err) || "The employee couldn't be saved")
        } finally {
            setSaving(false)
        }
    }

    const pick = (value: string, onChange: (v: string) => void, placeholder: string, options: { value: string; label: string }[], id: string) => (
        <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
            <SelectTrigger id={id}><SelectValue placeholder={placeholder} /></SelectTrigger>
            <SelectContent>
                <SelectItem value={NONE}>{placeholder}</SelectItem>
                {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
        </Select>
    )

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" asChild aria-label="Back to HR">
                    <Link href="/hr"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{editing ? `Edit ${employee.displayName}` : "New employee"}</h1>
                    <p className="text-sm text-muted-foreground">{editing ? employee.employeeNumber : "An employee number is given when you save."}</p>
                </div>
            </div>

            <form onSubmit={submit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Personal details</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="emp-fn">First name *</Label>
                            <Input id="emp-fn" required placeholder="Enter first name" value={f.firstName} onChange={(e) => set({ firstName: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="emp-ln">Last name</Label>
                            <Input id="emp-ln" placeholder="Enter last name" value={f.lastName} onChange={(e) => set({ lastName: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="emp-mail">Work email *</Label>
                            <Input id="emp-mail" type="email" required placeholder="Enter work email" value={f.email} onChange={(e) => set({ email: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="emp-tel">Phone</Label>
                            <Input id="emp-tel" type="tel" placeholder="Enter phone number" value={f.phone} onChange={(e) => set({ phone: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="emp-country">Country</Label>
                            <AutoSuggestInput
                                id="emp-country"
                                placeholder="Enter country"
                                value={f.country}
                                onChange={(e) => set({ country: e.target.value })}
                                options={searchCountries(f.country).map((c) => ({ label: c.name, value: c.name, subLabel: c.code, icon: c.flag }))}
                                onSelectOption={(opt) => set({ country: opt.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="emp-state">State / province</Label>
                            <AutoSuggestInput
                                id="emp-state"
                                placeholder="Enter state or province"
                                value={f.state}
                                onChange={(e) => set({ state: e.target.value })}
                                loadOptions={(q) => findStates(q, f.country || "")}
                                options={searchStates(f.state, f.country).map((s) => ({ label: s.name, value: s.name, subLabel: s.code }))}
                                onSelectOption={(opt) => set({ state: opt.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="emp-city">City</Label>
                            <AutoSuggestInput
                                id="emp-city"
                                placeholder="Enter city"
                                value={f.city}
                                onChange={(e) => set({ city: e.target.value })}
                                loadOptions={(q) => findCities(q, f.state || "", f.country || "")}
                                options={searchCities(f.city, f.state, f.country).map((c) => ({ label: c.name, value: c.name, subLabel: `${c.stateName} • ${c.pincode}` }))}
                                onSelectOption={(opt) => {
                                    const stateName = opt.subLabel?.split(" • ")[0]?.trim()
                                    set({ city: opt.value, ...(stateName && !f.state ? { state: stateName } : {}) })
                                }}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Job</CardTitle>
                        <CardDescription>Where they sit in the business and what they&apos;re paid.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="emp-dept">Department</Label>
                            {pick(f.departmentId, (v) => set({ departmentId: v, designationId: "" }), "No department", departments.map((d) => ({ value: d.id, label: d.name })), "emp-dept")}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="emp-desig">Designation</Label>
                            {pick(f.designationId, (v) => set({ designationId: v }), "No designation", designationOptions.map((d) => ({ value: d.id, label: d.title })), "emp-desig")}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="emp-mgr">Reports to</Label>
                            {pick(f.managerId, (v) => set({ managerId: v }), "Nobody", managerOptions.map((m) => ({ value: m.id, label: `${m.displayName} (${m.employeeNumber})` })), "emp-mgr")}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="emp-type">Employment type</Label>
                            <Select value={f.employmentType} onValueChange={(v) => set({ employmentType: v as EmploymentType })}>
                                <SelectTrigger id="emp-type"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="FULL_TIME">Full time</SelectItem>
                                    <SelectItem value="PART_TIME">Part time</SelectItem>
                                    <SelectItem value="CONTRACT">Contract</SelectItem>
                                    <SelectItem value="INTERN">Intern</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="emp-status">Status</Label>
                            <Select value={f.status} onValueChange={(v) => set({ status: v as EmployeeStatus })}>
                                <SelectTrigger id="emp-status"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ACTIVE">Active</SelectItem>
                                    <SelectItem value="PROBATION">Probation</SelectItem>
                                    <SelectItem value="ON_LEAVE">On leave</SelectItem>
                                    <SelectItem value="RESIGNED">Resigned</SelectItem>
                                    <SelectItem value="TERMINATED">Terminated</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="emp-join">Joining date</Label>
                            <Input id="emp-join" type="date" value={f.joiningDate} onChange={(e) => set({ joiningDate: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="emp-sal">Monthly basic salary{regime?.currency ? ` (${regime.currency})` : ""}</Label>
                            <Input id="emp-sal" type="number" min="0" step="0.01" placeholder="Enter monthly basic salary" value={f.salary} onChange={(e) => set({ salary: e.target.value })} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Emergency contact</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="emp-em-name">Name</Label>
                            <Input id="emp-em-name" placeholder="Enter contact name" value={f.emergencyName} onChange={(e) => set({ emergencyName: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="emp-em-phone">Phone</Label>
                            <Input id="emp-em-phone" type="tel" placeholder="Enter contact phone" value={f.emergencyPhone} onChange={(e) => set({ emergencyPhone: e.target.value })} />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" asChild>
                        <Link href="/hr">Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editing ? "Save changes" : "Add employee"}
                    </Button>
                </div>
            </form>
        </div>
    )
}
