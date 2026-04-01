import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Globe, ShieldCheck, Mail, MapPin, CreditCard } from "lucide-react"
import { getTenantSettings } from "@/app/actions/settings/tenant"
import TaxConfigClient from "./tax-config-client"
import BillingTab from "./billing-tab"

export default async function SettingsPage() {
    const settings = await getTenantSettings()

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground mt-1">
                    Manage your organization and workspace configuration.
                </p>
            </div>

            <Tabs defaultValue="organization" className="space-y-4">
                <TabsList className="bg-muted/50 p-1">
                    <TabsTrigger value="organization" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" /> Organization
                    </TabsTrigger>
                    <TabsTrigger value="taxation" className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" /> Taxation
                    </TabsTrigger>
                    <TabsTrigger value="account" className="flex items-center gap-2">
                        <Globe className="h-4 w-4" /> Regional
                    </TabsTrigger>
                    <TabsTrigger value="billing" className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" /> Billing
                    </TabsTrigger>
                </TabsList>

                {/* Organization Settings */}
                <TabsContent value="organization" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <Card className="lg:col-span-4 transition-all hover:border-primary/20">
                            <CardHeader className="border-b bg-muted/10">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-primary" /> Company Profile
                                </CardTitle>
                                <CardDescription>Update your public identity for quotes & invoices.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 rounded-lg border bg-accent/10">
                                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Entity Name</label>
                                        <p className="font-semibold text-sm truncate">{settings?.name || "Not Set"}</p>
                                    </div>
                                    <div className="p-3 rounded-lg border bg-accent/10">
                                        <label className="text-[10px] font-bold uppercase text-muted-foreground">GSTIN / TRN</label>
                                        <p className="font-semibold text-sm truncate">{(settings as any)?.gstin || "Pending"}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 rounded-lg border flex gap-3 items-center group transition-colors hover:bg-primary/5">
                                        <Mail className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                                        <div className="min-w-0">
                                            <label className="text-[10px] font-bold uppercase text-muted-foreground block leading-none mb-1">Support Email</label>
                                            <p className="text-xs truncate">{settings?.email || "No email linked"}</p>
                                        </div>
                                    </div>
                                    <div className="p-3 rounded-lg border flex gap-3 items-center group transition-colors hover:bg-primary/5">
                                        <Globe className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                                        <div className="min-w-0">
                                            <label className="text-[10px] font-bold uppercase text-muted-foreground block leading-none mb-1">Website</label>
                                            <p className="text-xs truncate">{settings?.website || "Enter URL"}</p>
                                        </div>
                                    </div>
                                </div>
                                <Card className="border-dashed flex items-start gap-3 p-4 bg-muted/5">
                                    <MapPin className="h-4 w-4 text-primary mt-1 shrink-0" />
                                    <div className="min-w-0">
                                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Registered Address</label>
                                        <p className="text-sm mt-1 leading-relaxed text-muted-foreground">
                                          {settings?.address ? JSON.stringify(settings.address) : "No formal address defined. Update this to include on Quote PDFs."}
                                        </p>
                                    </div>
                                </Card>
                            </CardContent>
                        </Card>

                        <Card className="lg:col-span-3 border-primary/10 overflow-hidden relative group">
                            <CardHeader className="bg-primary/5 border-b border-primary/10">
                                <CardTitle className="text-md">Brand Asset</CardTitle>
                                <CardDescription>Company Logo (Alpha)</CardDescription>
                            </CardHeader>
                            <CardContent className="h-56 flex flex-col items-center justify-center space-y-4">
                                {settings?.logo_url ? (
                                    <img src={settings.logo_url} alt="Logo" className="max-h-24 object-contain shadow-sm rounded border p-2" />
                                ) : (
                                    <div className="h-24 w-24 rounded-full bg-accent/20 border-2 border-dashed border-accent flex flex-col items-center justify-center text-accent ring-8 ring-accent/5">
                                      <Building2 className="h-10 w-10 opacity-30 group-hover:scale-110 transition-transform" />
                                    </div>
                                )}
                                <p className="text-xs text-muted-foreground text-center max-w-xs">Recommended: SVG or Transparent PNG <br/>(Max 2MB)</p>
                            </CardContent>
                            <div className="absolute inset-x-0 bottom-0 py-2 text-center bg-muted/50 border-t items-center flex justify-center text-[10px] font-bold uppercase text-primary cursor-not-allowed opacity-50">
                                Coming Soon: Upload Logo
                            </div>
                        </Card>
                    </div>
                </TabsContent>

                {/* Taxation Settings */}
                <TabsContent value="taxation">
                    <TaxConfigClient />
                </TabsContent>

                {/* Regional Settings */}
                <TabsContent value="account">
                    <Card>
                        <CardHeader>
                            <CardTitle>Regional & Localization</CardTitle>
                            <CardDescription>Configure currency and number formats.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between p-4 rounded-xl border bg-card">
                                <div className="space-y-1">
                                    <p className="font-semibold text-lg">Base Currency</p>
                                    <p className="text-sm text-muted-foreground">All transactions will be normalized to this currency.</p>
                                </div>
                                <div className="px-6 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary font-mono font-bold text-xl">
                                    {settings?.currency_code || "INR"}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Card className="border-dashed bg-muted/5 p-4 flex flex-col justify-between">
                                 <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Primary Region</label>
                                    <p className="font-semibold mt-1">India (IN)</p>
                                 </div>
                                 <p className="text-xs text-muted-foreground mt-4 italic">Uses DD/MM/YYYY date format</p>
                              </Card>
                              <Card className="border-dashed bg-muted/5 p-4 flex flex-col justify-between">
                                 <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Number Format</label>
                                    <p className="font-semibold mt-1">Indian Numbering System</p>
                                 </div>
                                 <p className="text-xs text-muted-foreground mt-4 italic">Example: 1,00,000.00</p>
                              </Card>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Billing Settings */}
                <TabsContent value="billing">
                    <BillingTab settings={settings as any} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
