import Link from "next/link"
import { appUrl } from "@/lib/app-url"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Globe, ShieldCheck, Mail, MapPin, CreditCard, WalletCards, Zap, Users, Database, History } from "lucide-react"
import { getTenantSettings } from "@/app/actions/settings/tenant"
import { getTenantPaymentGateways } from "@/app/actions/finance/gateways"
import CompanyProfileTab from "./company-profile-tab"
import TaxConfigClient from "./tax-config-client"
import BillingTab from "./billing-tab"
import PaymentGatewaysTab from "./payment-gateways-tab"
import TeamTab from "./team-tab"
import DataAccountTab from "./data-account-tab"
import { getMyAccess, getTenantRole } from "@/lib/get-tenant-id"
import { getPendingInvites, getTeamMembers } from "@/app/actions/settings/team"
import { getBillingPricing } from "@/app/actions/saas/subscription"
import { getPlanConfig, PLAN_ORDER } from "@/lib/plan-config"
import { getEmailPreferences } from "@/app/actions/settings/email-preferences"
import { EmailPreferencesCard } from "./email-preferences-card"
import { resolveTaxRegime } from "@/lib/tax-jurisdiction"
import { getMyActivityLog } from "@/app/actions/activity"
import { ActivityLogTable } from "@/components/activity-log-table"

const SETTINGS_TABS = ["organization", "taxation", "account", "gateways", "billing", "team", "data", "activity"]

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
    const planConfig = await getPlanConfig()
    const { planModules } = await getMyAccess()
    const planFeatures = Object.fromEntries(PLAN_ORDER.map((t) => [t, planConfig[t].features]))
    const role = await getTenantRole()
    const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN"
    const teamMembers = isAdmin ? await getTeamMembers() : []
    const teamInvites = isAdmin ? await getPendingInvites() : []
    const activity = isAdmin ? await getMyActivityLog().catch(() => []) : []
    const siteUrl = appUrl()
    const emailPrefs = await getEmailPreferences()
    const regime = resolveTaxRegime(settings?.country_code, null, settings?.currency_code)
    const sampleNumber = new Intl.NumberFormat(regime.locale, { minimumFractionDigits: 2 }).format(100000)
    const sampleDate = new Intl.DateTimeFormat(regime.locale, { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(2026, 11, 31))

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

            <Tabs defaultValue={(initialTab === "team" || initialTab === "data") && !isAdmin ? "organization" : initialTab} className="space-y-4">
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
                            <Users className="h-4 w-4" /> Team & Access
                        </TabsTrigger>
                    )}
                    {isAdmin && (
                        <TabsTrigger value="data" className="flex items-center gap-2">
                            <Database className="h-4 w-4" /> Data & Account
                        </TabsTrigger>
                    )}
                    {isAdmin && (
                        <TabsTrigger value="activity" className="flex items-center gap-2">
                            <History className="h-4 w-4" /> Activity log
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
                                    {settings?.currency_code || regime.currencyCode}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Card className="border-dashed bg-muted/5 p-4 flex flex-col justify-between">
                                 <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Business country</p>
                                    <p className="font-semibold mt-1">{regime.countryName} ({regime.countryCode})</p>
                                 </div>
                                 <p className="text-xs text-muted-foreground mt-4 italic">Dates look like {sampleDate}</p>
                              </Card>
                              <Card className="border-dashed bg-muted/5 p-4 flex flex-col justify-between">
                                 <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Number format</p>
                                    <p className="font-semibold mt-1">{regime.locale}</p>
                                 </div>
                                 <p className="text-xs text-muted-foreground mt-4 italic">Example: {sampleNumber}</p>
                              </Card>
                            </div>
                        </CardContent>
                    </Card>
                    <div className="mt-4">
                        <EmailPreferencesCard initial={emailPrefs} />
                    </div>
                </TabsContent>

                {/* Payment Gateways */}
                <TabsContent value="gateways">
                    <PaymentGatewaysTab initialConfig={gatewayConfig} appUrl={siteUrl} />
                </TabsContent>

                {/* Billing Settings */}
                <TabsContent value="billing">
                    <BillingTab settings={settings as any} pricing={billingPricing} checkoutResult={checkoutResult} planFeatures={planFeatures} />
                </TabsContent>

                {/* Team & Access (workspace admins only) */}
                {isAdmin && (
                    <TabsContent value="team">
                        <TeamTab initialMembers={teamMembers} invites={teamInvites} planModules={planModules} />
                    </TabsContent>
                )}

                {/* Export and closing the workspace (workspace admins only) */}
                {isAdmin && (
                    <TabsContent value="data">
                        <DataAccountTab workspaceName={settings?.name || ""} />
                    </TabsContent>
                )}
                {isAdmin && (
                    <TabsContent value="activity">
                        <Card>
                            <CardHeader>
                                <CardTitle>Activity log</CardTitle>
                                <CardDescription>
                                    Important changes in your workspace: plan and billing, team and access, settings and saved credentials, deleted
                                    or voided documents, payroll and data exports. Newest first; secrets are never recorded.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ActivityLogTable rows={activity} emptyText="No changes recorded yet. New activity appears here from now on." />
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>
        </div>
    )
}
