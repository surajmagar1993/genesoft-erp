"use client"

import { useEffect, useState } from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { getContacts, type Contact } from "@/app/actions/crm/contacts"
import { cn } from "@/lib/utils"

export interface PickedCustomer {
    contactId: string | null
    customerName: string
    customerEmail: string
}

/**
 * Chooses the customer of a quote or order from CRM contacts (searchable, so
 * it works with any number of contacts). Converting a quote or order into an
 * invoice needs a contact, so documents should be linked to one.
 */
export function CustomerPicker({ id, contactId, customerName, onChange }: { id?: string; contactId?: string | null; customerName: string; onChange: (c: PickedCustomer) => void }) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState("")
    const [results, setResults] = useState<Contact[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!open) return
        let live = true
        // eslint-disable-next-line react-hooks/set-state-in-effect -- showing the loading state while searching
        setLoading(true)
        const t = setTimeout(() => {
            getContacts(1, 20, search.trim() || undefined)
                .then((r) => live && setResults(r.data))
                .catch(() => live && setResults([]))
                .finally(() => live && setLoading(false))
        }, 200)
        return () => {
            live = false
            clearTimeout(t)
        }
    }, [open, search])

    return (
        <div className="flex items-center gap-1.5">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button id={id} type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
                        <span className={cn("truncate", !customerName && "text-muted-foreground")}>{customerName || "Select a customer"}</span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] min-w-72 p-0" align="start">
                    <Command shouldFilter={false}>
                        <CommandInput placeholder="Search customers by name or email" value={search} onValueChange={setSearch} />
                        <CommandList>
                            <CommandEmpty>{loading ? "Searching…" : "No customers found. Add one in CRM → Contacts."}</CommandEmpty>
                            <CommandGroup>
                                {results.map((c) => (
                                    <CommandItem
                                        key={c.id}
                                        value={c.id}
                                        onSelect={() => {
                                            onChange({ contactId: c.id, customerName: c.display_name, customerEmail: c.email || "" })
                                            setOpen(false)
                                        }}
                                    >
                                        <Check className={cn("mr-2 h-4 w-4", contactId === c.id ? "opacity-100" : "opacity-0")} />
                                        <span className="truncate">{c.display_name}</span>
                                        {c.email && <span className="ml-auto truncate pl-2 text-xs text-muted-foreground">{c.email}</span>}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            {contactId && (
                <Button type="button" variant="ghost" size="icon" aria-label="Clear customer" onClick={() => onChange({ contactId: null, customerName: "", customerEmail: "" })}>
                    <X className="h-4 w-4" />
                </Button>
            )}
        </div>
    )
}
