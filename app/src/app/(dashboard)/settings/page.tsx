import Link from "next/link"
import { appUrl } from "@/lib/app-url"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Globe, ShieldCheck, Mail, MapPin, CreditCard, WalletCards, Zap, Users } from "lucide-react"
import { getTenantSettings } from "@/app/actions/settings/tenant"
import { getTenantPaymentGateways } from "@/app/actions/finance/gateways"
import CompanyProfileTab from "./company-profile-tab"
import TaxConfigClient from "./tax-config-client"
import BillingTab from "./billing-tab"
import PaymentGatewaysTab from "./payment-gateways-tab"
import TeamTab from "./team-tab"
import { getTenantRole } from "@/lib/get-tenant-id"
import { getTeamMembers } from "@/app/actions/settings/team"
import { getBillingPricing } from "@/app/actions/saas/subscription"

const SETTINGS_TABS = ["organization", "taxation", "account", "gateways", "billing", "team"]

export default async function SettingsPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string; success?: string; canceled?: string }>
}) {
    const params = await searchParams
    // Stripe Checkout returns here with ?tab=billing&success=true (or canceled=true)
    const initialTab = SETTINGS_TABS.includes(params.tab || "") ? params.tab! : "organization"
    const checkoutResult = params.success === "true" ? "success" : params.canceled === "true" ? "canceled" : undefined
    const settings = await getTenantSettings()
    const gatewayConfig = await getTenantPaymentGateways()
    const billingPricing = await getBillingPricing().catch(() => undefined)
    const role = await getTenantRole()
    const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN"
    const teamMembers = isAdmin ? await getTeamMembers() : []
    const siteUrl = appUrl()

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your organization, branding, payment gateways, and workspace configuration.
                    </p>
                </div>
                <Link
                    href="/settings/workflows"
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                >
                    <Zap className="h-4 w-4" />
                    Workflow Automation
                </Link>
            </div>

            {!isAdmin && (
                <div className="p-3 rounded-lg bg-muted border text-muted-foreground text-xs font-medium">
                    Only workspace admins can change these settings. You can view them below.
                </div>
            )}

            <Tabs defaultValue={initialTab === "team" && !isAdmin ? "organization" : initialTab} className="space-y-4">
                <TabsList className="bg-muted/50 p-1">
                    <TabsTrigger value="organization" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" /> Organization & Branding
                    </TabsTrigger>
                    <TabsTrigger value="taxation" className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" /> Taxation
                    </TabsTrigger>
                    <TabsTrigger value="account" className="flex items-center gap-2">
                        <Globe className="h-4 w-4" /> Regional
                    </TabsTrigger>
                    <TabsTrigger value="gateways" className="flex items-center gap-2">
                        <WalletCards className="h-4 w-4" /> Payment Gateways
                    </TabsTrigger>
                    <TabsTrigger value="billing" className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" /> Billing
                    </TabsTrigger>
                    {isAdmin && (
                        <TabsTrigger value="team" className="flex items-center gap-2">
                            <Users className="h-4 w-4" /> Team & Roles
                        </TabsTrigger>
                    )}
                </TabsList>

                {/* Organization Settings */}
                <TabsContent value="organization" className="space-y-4">
                    <CompanyProfileTab initialSettings={settings} />
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

                {/* Payment Gateways */}
                <TabsContent value="gateways">
                    <PaymentGatewaysTab initialConfig={gatewayConfig} appUrl={siteUrl} />
                </TabsContent>

                {/* Billing Settings */}
                <TabsContent value="billing">
                    <BillingTab settings={settings as any} pricing={billingPricing} checkoutResult={checkoutResult} />
                </TabsContent>

                {/* Team & Roles (workspace admins only) */}
                {isAdmin && (
                    <TabsContent value="team">
                        <TeamTab initialMembers={teamMembers} />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    )
}
