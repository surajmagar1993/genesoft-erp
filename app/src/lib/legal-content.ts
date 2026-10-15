/**
 * The legal pages: built-in text, in the format of src/lib/legal-markdown.ts.
 * Super Admin → Website → Pages edits them (draft → publish, history); the
 * public pages show the published text over these defaults. Pure data.
 *
 * Built-in text is a draft written from what the code really does; it needs a
 * legal review before go-live (WEBSITE_OVERHAUL_PLAN.md §10).
 */

export interface LegalDef {
    /** site_content key, "legal:<slug>" */
    key: string
    path: string
    title: string
    /** Short label for links (footer, "Related policies") */
    label: string
    metaDescription: string
    /** "Last updated" until the page is first published from Super Admin */
    builtInUpdated: string
    summary: string
    body: string
    /** Hidden from the website until published (no 404 → page, no links) */
    draftOnly?: boolean
}

const TERMS = `## Agreement {#agreement}
These terms are an agreement between you and **{legalName}** ("Genesoft", "we") for the use of Genesoft ERP, our website at {website} and related services (together, the "Service").

By creating an account or using the Service you agree to these terms, our [Privacy Policy](/privacy) and our [Refund & Cancellation Policy](/refund-policy). If you use the Service for a company, you confirm you're allowed to accept these terms on its behalf. You must be 18 or older.

## Your account {#accounts}
- Give accurate details when you sign up, including your business country, and keep them up to date.
- Keep your password safe. You're responsible for what happens under your account and the users you invite.
- Workspace admins decide who joins the workspace and what each person's role allows.
- Tell us straight away at {email} if you think your account has been misused.

## Free trial and free plan {#trial-plans}
New workspaces get a 15-day free trial. No payment details are needed to start. When the trial ends you can choose a paid plan or continue on the free plan, which has the limits shown on our [Pricing](/erp/pricing) page. We may change what the free plan includes, with notice.

## Paid plans and billing {#billing}
- Prices are shown on our [Pricing](/erp/pricing) page in your currency and include applicable taxes. You pay in advance for each monthly or yearly period.
- In India we take payments through Razorpay; you pay for each new period when it's due. In other countries we use Stripe, which renews your plan automatically until you cancel.
- If you upgrade during a period, you pay the prorated difference straight away. Downgrades take effect at your next renewal.
- If a renewal isn't paid, we may move your workspace to the free plan. Your data stays in your workspace.
- We'll tell you in advance before changing the price of your plan. New prices apply from your next period.

## Cancellation and refunds {#refunds}
You can cancel anytime; your plan stays active until the end of the period you've paid for. Your **first** paid subscription comes with a 7-day money-back guarantee. Renewals aren't refundable. Full details are in our [Refund & Cancellation Policy](/refund-policy).

## Your data {#your-data}
- The business data you put into Genesoft ERP belongs to you. You give us permission to store and process it only to provide the Service.
- You're responsible for having the right to store the personal data of your customers, suppliers and employees, and for using it lawfully.
- You can export your data while your account is open. After you close your account we delete it as described in our [Privacy Policy](/privacy).

## Emails and marketing communications {#communications}
**Service emails.** We'll send you emails needed to run your account, such as sign-up confirmation, password resets, payment receipts, security alerts and important changes to the Service or these terms. These are part of the Service and you can't turn them off while your account is open.

**Marketing emails.** We send product news, tips and offers only if you've opted in, for example with the checkbox at sign-up. You can withdraw that consent anytime with the unsubscribe link in any marketing email, in **Settings → Email preferences**, or by emailing {email}. Withdrawing consent doesn't affect your account or service emails.

**Messages you send from Genesoft ERP.** If you use the Service to email or WhatsApp your own customers, you're responsible for having their permission and for following anti-spam and messaging laws (and WhatsApp's policies) that apply to you.

## Acceptable use {#acceptable-use}
Don't use the Service to:
- break any law, including tax, data protection and consumer laws,
- send spam or messages people haven't agreed to receive,
- store or share content you don't have the right to, or that is harmful or fraudulent,
- try to access other companies' data, test our security without permission, or disrupt the Service, or
- copy, resell or reverse-engineer the Service.

## Tax figures {#tax}
Genesoft ERP calculates GST, VAT or sales tax from the rates and details you enter, and gives you a tax summary for any period. It isn't tax or legal advice. You're responsible for checking your figures and filing returns with your tax authority, or asking your accountant to. Direct filing with government systems isn't part of the Service yet.

## Third-party services {#third-parties}
Some features rely on services you connect, such as Razorpay, Stripe, PayPal, WhatsApp or your own email server. Their terms apply to your use of them, and we're not responsible for their availability or actions.

## Availability and changes {#availability}
We work to keep the Service available and reliable, but we can't promise it will never be interrupted. We may need to pause it for maintenance or updates, and we'll try to give notice for planned work. We may add, change or remove features; if we remove something important to paying customers, we'll tell you in advance.

## Suspension and termination {#suspension}
You can close your account anytime. We may suspend or close an account that breaks these terms, puts the Service or other users at risk, or is unpaid. Unless it's urgent or the law prevents it, we'll warn you first and give you a chance to fix the problem or export your data.

## Disclaimers and liability {#liability}
The Service is provided "as is". To the extent the law allows, we don't give warranties beyond those stated in these terms.

To the extent the law allows, we're not liable for indirect or consequential losses (such as lost profits or data), and our total liability for any claim is limited to the amount you paid us for the Service in the 12 months before the claim. Nothing in these terms limits liability that can't be limited by law.

## Governing law {#law}
These terms are governed by the laws of India. The courts of {jurisdiction} have exclusive jurisdiction over any dispute about them. If you're a consumer in another country, you keep any rights your local law gives you that can't be waived.

## Changes to these terms {#changes}
We may update these terms. We'll show the new date at the top and, for significant changes, tell account holders by email or in the app before they take effect. If you keep using the Service after that, the new terms apply.

## Contact {#contact}
{legalName}, {address}.
Email: {email} · Phone: {phone}`

const PRIVACY = `## Who we are {#who-we-are}
Genesoft ERP and this website are run by **{legalName}** ("Genesoft", "we", "us"), {address}. Website: {website}.

This policy explains how we handle personal data when you visit our website, send us an enquiry or job application, create an account or use Genesoft ERP.

We play two roles. For your **account data** (who you are, how you pay us) and for what you send us through the website, we decide how it's used. For the **business data** you put into Genesoft ERP (your customers, invoices, employees and so on) you decide, and we process it only to run the service for you.

## What we collect {#what-we-collect}
- **Account details:** your name, work email, phone number, company name, country and currency. Passwords are handled by our sign-in provider and stored only in hashed form.
- **Business data you enter:** contacts, leads, products, invoices, bills, expenses, employees, attendance and other records you choose to keep in your workspace.
- **Billing details:** your plan and payment history. Card and bank details are entered with Razorpay or Stripe; we never see or store full card numbers.
- **Technical data:** IP address, browser and device type, and logs of sign-ins and important actions, which we use to keep accounts secure.
- **Messages to us:** what you send through our contact form, email or support tickets.

## Website enquiries and job applications {#website-forms}
- **Contact and service enquiries:** your name, email, phone number (if you give it), company and message. We use them to reply to you and to send you a quote if you ask for one.
- **IT rental quote requests:** the same details plus the equipment, quantity and rental period you ask about.
- **Job applications:** your name, contact details, the role, your message and your CV. CVs are stored privately; only our team can open them, through a link that expires after a few minutes.
- We keep enquiries and applications only as long as we need them to answer you, prepare a quote or fill a role. You can ask us at any time to delete them by emailing {email}.
- We don't add you to marketing emails because you sent an enquiry or applied for a job.

## How we use your data {#how-we-use}
- To provide Genesoft ERP: create your workspace, store your records, and send the invoices, receipts and messages you ask it to send.
- To answer enquiries, quote for our services and consider job applications.
- To bill you for your subscription and keep records our tax laws require.
- To keep the service secure: detect misuse, block attacks and investigate problems.
- To support you when you contact us.
- To send **service emails** you need, such as sign-up confirmation, password resets, payment receipts and important changes to the service.
- To send **marketing emails**, only if you've agreed to receive them (see the next section).

## Marketing emails and your consent {#marketing-emails}
We send product news, tips and offers **only to people who have opted in**. You can opt in with the checkbox when you create an account. It's not ticked for you, and you can use Genesoft ERP without it.
- **What you'll get:** new features, guides on getting more from Genesoft ERP, and occasional offers. We aim for no more than a few emails a month.
- **Changing your mind:** every marketing email has an unsubscribe link. You can also turn marketing emails off in **Settings → Email preferences**, or email us at {email}. Unsubscribing in the app or from an email takes effect immediately; emailed requests are handled promptly.
- **What doesn't change:** unsubscribing doesn't stop service emails such as password resets and payment receipts, which you need to use your account.
- **Our records:** we keep the date and time you gave or withdrew consent, so we can show we have your permission.
- We never buy email lists, and we never give or sell your email address to anyone else for their marketing.

## Why we're allowed to use your data {#legal-basis}
In India we process personal data under the Digital Personal Data Protection Act, 2023: with your consent, or for the legitimate uses the Act allows, such as providing the service you signed up for, answering a request you sent us, and meeting legal obligations.

If you're in the UK or the European Union, our legal bases are: performing our contract with you (running the service) or taking steps you asked for before one (answering an enquiry or quote request), our legitimate interests (security, improving the service, considering job applications), your consent (marketing emails) and legal obligations (tax records).

## Who we share data with {#sharing}
We don't sell personal data. We share it only with providers that help us run our website and Genesoft ERP, under contracts that protect it. For data your business keeps about its own customers and staff, see our [Data Processing Agreement](/dpa).
- **Supabase:** database, file storage and sign-in.
- **Vercel:** hosting of the website and app.
- **Resend:** sending emails.
- **Cloudflare (Turnstile):** the spam check on our website forms and sign-up page. It looks at technical signals such as your IP address and browser to tell people from bots, and doesn't use advertising cookies.
- **Razorpay** (India) and **Stripe** (other countries): taking payments.
- **Meta (WhatsApp)** and your own email provider: only if you connect them to send messages from your workspace.

We may also share data if the law requires it, to protect people's safety, or as part of a merger or sale of our business (with the same protections).

## Where your data is stored {#where-stored}
Your workspace data, website enquiries and job applications are stored in a database and file storage in Mumbai, India. Some of our providers (for hosting, email and payments) may process data in other countries. When that happens, we rely on their contractual safeguards to keep it protected.

## How long we keep it {#retention}
We keep your account and workspace data while your account is open. When you close your account, we delete or anonymise it within a reasonable time, except records we must keep by law (for example, invoices and payment records for tax purposes). Copies in backups are removed as those backups expire. Website enquiries and job applications are kept as described in [Website enquiries and job applications](#website-forms).

## How we protect it {#security}
- All connections use HTTPS.
- Each company's records are kept separate, and every user has a role that limits what they can see and change.
- Passwords and keys you save for payment gateways, email and WhatsApp are stored encrypted.
- CVs sent with job applications are kept in private storage.
- We log sign-ins and important admin actions.

## Your rights {#your-rights}
You can ask us to:
- tell you what personal data we hold about you and give you a copy,
- correct data that's wrong or incomplete,
- delete your data (unless we must keep it by law),
- stop marketing emails or withdraw any consent you've given,
- under India's DPDP Act, nominate someone to exercise these rights for you if you can't, and
- if you're in the UK or EU, restrict or object to some processing and move your data to another provider.

Email {email} to use any of these rights. If your request is about business data a company stores about you in its workspace (for example, you're one of its customers), we'll pass it to that company, which decides.

## Cookies {#cookies}
We use only the cookies needed to keep you signed in and to remember basic preferences, such as light or dark mode. We don't use advertising or cross-site tracking cookies. The [Cookie Policy](/cookie-policy) lists each one.

## Children {#children}
Our website and Genesoft ERP are for people aged 18 and over. We don't knowingly collect data from children.

## Grievance Officer {#grievance}
If you have a concern about how we handle your data, contact our Grievance Officer:

Grievance Officer, {legalName}
{address}
Email: {email}

We'll acknowledge your complaint and respond within the time the law requires. If you're not satisfied, you can complain to the Data Protection Board of India or, in the UK or EU, your local data protection authority.

## Changes to this policy {#changes}
We'll update this page when our practices change and show the new date at the top. If a change is significant, we'll tell account holders by email or in the app before it takes effect. See also our [Terms of Service](/terms) and [Refund & Cancellation Policy](/refund-policy).`

const REFUND = `## Free trial {#trial}
Every new workspace starts with a 15-day free trial. You don't pay anything during the trial, so there's nothing to refund.

## 7-day money-back guarantee {#money-back}
If you're not happy with your **first paid subscription**, ask for a refund within **7 days** of that payment and we'll refund it in full. This applies to monthly and yearly plans.

The guarantee applies once per business. It doesn't apply to later payments, or to a workspace we've suspended for breaking our [Terms of Service](/terms).

## Renewals and upgrades {#renewals}
- Renewal payments (your second and later months or years) aren't refundable.
- When you upgrade, the prorated amount you pay for the rest of the period isn't refundable, unless it's within the 7 days after your first payment.
- We don't give partial refunds for unused time when you cancel or downgrade.

## How to cancel {#cancel}
You can cancel anytime by switching to the Free plan in **Settings → Billing**, or by emailing {email} from your account email address.
- Your plan stays active until the end of the period you've paid for, then your workspace moves to the free plan.
- Your data isn't deleted when you cancel. You can export it, or ask us to close your account and delete it.
- In India (Razorpay), plans don't renew automatically, so not paying for a new period also ends your paid plan. In other countries (Stripe), cancelling stops automatic renewal.

## Duplicate or incorrect charges {#errors}
If you were charged twice, or charged an amount that doesn't match your plan, tell us and we'll refund the extra amount in full, whenever it happened.

## How to ask for a refund {#request}
Email {email} from your account email address with your company name and the payment date or receipt number. You don't have to give a reason, but it helps us improve.

We'll reply by email to confirm. Approved refunds go back to the card, UPI or bank account you paid with, and usually reach you within 5 to 10 working days, depending on your bank and payment provider. When a refund is made, your workspace moves to the free plan.

## Contact {#contact}
{legalName}, {address}.
Email: {email} · Phone: {phone}`

const DELIVERY = `## What we deliver {#what-we-deliver}
Genesoft ERP is software you use online, in your web browser. We don't ship any physical goods, so there are no shipping charges or delivery addresses. Everything you buy from us is delivered as access to your Genesoft ERP workspace.

## When you sign up {#free-trial}
Your workspace is created as soon as you complete sign-up, and you can start using it straight away. If we ask you to confirm your email address, you can sign in once you've clicked the link we send you. Every new workspace starts with a 15-day free trial.

## When you buy or change a plan {#paid-plans}
You pay for plans in Settings → Billing, through Razorpay in India or Stripe in other countries. Your new plan starts as soon as the payment provider confirms the payment, which is usually within a few seconds.

A receipt is added to Settings → Billing for every payment.

## If something goes wrong {#delays}
If you've been charged but your plan hasn't changed within 24 hours, email us at {email} with your company name and the payment reference. We'll either start your plan or refund the payment.

## Where the service is available {#where}
Genesoft ERP can be used from any country with an internet connection. Tax rules are built in for India, the UAE, Saudi Arabia, the UK, the US and Australia; businesses elsewhere set up their own tax name and rates.

## Cancellations and refunds {#refunds}
You can cancel anytime. Refunds are covered by our [Refund & Cancellation Policy](/refund-policy).

## Contact {#contact}
{legalName}, {address}. Email: {email}. Phone: {phone}.`

const COOKIES = `## What cookies are {#what}
Cookies are small files a website saves in your browser. Browser storage works in a similar way but stays on your device. We use both only to make our website and Genesoft ERP work and to remember your settings.

## The cookies we use {#ours}
{cookieTable}
We don't use advertising cookies, analytics cookies or anything that tracks you across other websites.

## Cookies from payment providers {#payments}
When you pay for a plan, the payment window is provided by Razorpay (India) or Stripe (other countries). They may set their own cookies, for example to prevent fraud. Those cookies are covered by their own policies.

## Your choices {#control}
You can block or delete cookies in your browser settings. If you block the sign-in cookie you won't be able to stay signed in. Because we only use cookies that the service needs or that remember your own settings, we don't show a cookie banner.

## More about your data {#more}
See our [Privacy Policy](/privacy) for how we handle personal data, or email {email} with any questions.`

const DPA = `## What this agreement covers {#scope}
This Data Processing Agreement ("DPA") is part of our [Terms of Service](/terms). It applies when your business ("you") stores personal data about other people in Genesoft ERP: for example your customers, suppliers, leads and employees ("Customer Data").

For Customer Data you are the controller (or data fiduciary) and {legalName} ("we") is your processor. You don't need to sign anything: this DPA applies automatically while you use the service.

## We only act on your instructions {#instructions}
We process Customer Data only to provide Genesoft ERP to you, as set out in the Terms and in what you do in your workspace (for example sending an invoice by email or WhatsApp). We don't sell Customer Data or use it for advertising. If the law requires us to process it in another way, we'll tell you first unless the law forbids it.

## What data and why {#details}
- **People:** your customers, suppliers, leads, employees and team members.
- **Data:** names, contact details, addresses, tax IDs, transaction and payment records, and HR and payroll records you enter.
- **Purpose:** running your CRM, sales, purchasing, inventory, accounting, HR and payroll in Genesoft ERP.
- **Duration:** while you have a workspace, plus the deletion period below.

## Your responsibilities {#responsibilities}
You make sure you're allowed to put Customer Data into Genesoft ERP (for example, that you have a lawful basis or consent) and that you give people any notices the law requires. Don't store special categories of data (such as health records) unless you need to and the law allows it.

## Confidentiality {#staff}
Only people who need access to run or support the service can reach Customer Data, and they are bound to keep it confidential.

## Security {#security}
We protect Customer Data with measures that include:
- Encrypted connections (HTTPS) between your browser and the service.
- Each business's records kept separate, with checks on every request.
- Roles and per-module access, set by your own workspace admin.
- Passwords for email, payment and messaging connections stored encrypted.
- Records of administrator actions and monitoring for errors.

## Subprocessors {#subprocessors}
You agree that we may use these providers to run the service. Each is bound by a contract that protects the data:
{subprocessorTable}
If you connect your own WhatsApp Business account or email server, those are your providers, not ours. We'll update this list before adding a new subprocessor; if you object for a good reason, you can close your workspace.

## International transfers {#transfers}
Your workspace data is stored in India. Some subprocessors may process data in other countries; when they do, we rely on their contractual safeguards (such as standard contractual clauses) to protect it.

## Helping you with requests {#assistance}
If someone asks you to see, correct, export or delete their data, you can usually do it yourself in your workspace (Settings → Data & Account exports everything). Where you can't, we'll help. If we receive such a request directly, we'll pass it to you.

## Data breaches {#breaches}
If we become aware of a breach affecting Customer Data, we'll tell you without undue delay and give you the information we have, so you can meet any duty to notify authorities or people.

## Deletion at the end {#deletion}
You can export your data at any time. When you close your workspace you have 30 days to change your mind; after that we delete Customer Data, except records the law requires us to keep.

## Information and audits {#audits}
We'll answer reasonable questions about how we protect Customer Data so you can show you meet the law. Email {email}.

## If documents disagree {#order}
If this DPA and the Terms of Service conflict about Customer Data, this DPA wins. Our [Privacy Policy](/privacy) covers the personal data we handle for ourselves, such as your account details.`

/**
 * IT Rental Terms: a skeleton. Every "[OWNER: …]" is a rule only the owner
 * can set; the page can't be published while one is left.
 */
const RENTAL = `## What these terms cover {#scope}
These terms apply when you rent IT equipment (such as laptops, desktops, servers, printers or networking equipment) from **{legalName}** ("Genesoft", "we"). Together with the quote or rental agreement we send you, they form our agreement with you.

## Quotes and orders {#quotes}
Ask for a quote on our [IT Rentals](/services/it-rentals) page or by emailing {email}. A quote lists the equipment, rental period and price. A rental starts only after you accept the quote in writing and we confirm the order.

## Minimum rental period {#minimum-period}
[OWNER: the shortest period you rent for, e.g. one week or one month, and whether it differs by item.]

## Security deposit {#deposit}
[OWNER: whether a deposit is needed, how much (fixed or % of value), how it's paid, and how soon it's returned after the equipment comes back.]

## Payment {#payment}
[OWNER: when rent is paid (in advance per month/period?), accepted methods, and what happens if a payment is late.]

## Delivery and pick-up {#delivery}
[OWNER: whether you deliver and collect, in which areas, and whether it costs extra.]

Check the equipment when it arrives and tell us straight away if anything is missing or not working.

## Looking after the equipment {#care}
- Use the equipment with reasonable care, for its normal purpose, at the address agreed in the order.
- Don't open, repair, modify or move it to another site without asking us first.
- Don't lend, sublet or sell it.
- Keep your own data backed up, and remove your files before you return the equipment.

## Ownership {#ownership}
The equipment stays ours at all times. You can't sell it, pledge it or use it as security.

## Faults and support {#faults}
Tell us as soon as equipment stops working properly. [OWNER: how fast you repair or replace faulty equipment, and whether rent pauses meanwhile.]

## Damage and loss {#damage}
[OWNER: what the customer pays for damage beyond normal wear and tear, and for lost or stolen equipment (repair cost, replacement value, deposit deduction), and whether a police report is needed for theft.]

## Insurance {#insurance}
[OWNER: whether the customer must insure the equipment while it's with them.]

## Late returns {#late-returns}
[OWNER: the charge for each day or period equipment is returned late, and when an unreturned item is treated as lost.]

## Ending a rental early {#ending-early}
[OWNER: whether the customer can return early, the notice needed, and whether rent for the unused time is refunded.]

## Contact {#contact}
{legalName}, {address}.
Email: {email} · Phone: {phone}`

export const LEGAL_DEFS: LegalDef[] = [
    {
        key: "legal:terms",
        path: "/terms",
        title: "Terms of Service",
        label: "Terms of Service",
        metaDescription: "The terms for using Genesoft ERP, provided by Genesoft Infotech.",
        builtInUpdated: "14 October 2026",
        summary:
            "**In short:** use Genesoft ERP lawfully for your business, keep your account secure, and pay for the plan you choose. Your data stays yours. You can cancel anytime, and your first payment comes with a 7-day money-back guarantee. Marketing emails are opt-in.",
        body: TERMS,
    },
    {
        key: "legal:privacy",
        path: "/privacy",
        title: "Privacy Policy",
        label: "Privacy Policy",
        metaDescription: "How Genesoft Infotech collects, uses and protects personal data on its website and in Genesoft ERP, including enquiries, job applications and marketing email consent.",
        builtInUpdated: "15 October 2026",
        summary:
            "**In short:** we collect what we need to answer your enquiries, run Genesoft ERP and bill you. Your business data belongs to you. We don't sell personal data. We send marketing emails only if you opt in, and you can stop them anytime.",
        body: PRIVACY,
    },
    {
        key: "legal:refund-policy",
        path: "/refund-policy",
        title: "Refund & Cancellation Policy",
        label: "Refund & Cancellation",
        metaDescription: "Cancel Genesoft ERP anytime. Your first paid subscription has a 7-day money-back guarantee.",
        builtInUpdated: "14 October 2026",
        summary:
            "**In short:** try Genesoft ERP free for 15 days. If your first payment doesn't work out, ask within 7 days for a full refund. Renewals aren't refundable, but you can cancel anytime and keep access until the end of your paid period.",
        body: REFUND,
    },
    {
        key: "legal:delivery-policy",
        path: "/delivery-policy",
        title: "Service Delivery Policy",
        label: "Service Delivery",
        metaDescription: "Genesoft ERP is an online service: nothing is shipped. Your workspace is ready as soon as you sign up, and paid plans start once your payment is confirmed.",
        builtInUpdated: "15 October 2026",
        summary:
            "**In short:** Genesoft ERP is an online service, so nothing is shipped. Your workspace is ready when you sign up, and a paid plan starts as soon as your payment is confirmed.",
        body: DELIVERY,
    },
    {
        key: "legal:cookie-policy",
        path: "/cookie-policy",
        title: "Cookie Policy",
        label: "Cookie Policy",
        metaDescription: "The few cookies Genesoft Infotech uses to keep you signed in and remember your settings. No advertising or tracking cookies.",
        builtInUpdated: "15 October 2026",
        summary: "**In short:** we use a sign-in cookie and a few small settings (side menu and light/dark mode). No advertising or tracking cookies.",
        body: COOKIES,
    },
    {
        key: "legal:dpa",
        path: "/dpa",
        title: "Data Processing Agreement",
        label: "Data Processing Agreement",
        metaDescription: "How Genesoft Infotech processes the personal data your business keeps in Genesoft ERP, on your instructions.",
        builtInUpdated: "15 October 2026",
        summary:
            "**In short:** the data your business keeps in Genesoft ERP is yours. We process it only to run the service for you, keep it secure, use a short list of providers, and delete it when you leave.",
        body: DPA,
    },
    {
        key: "legal:rental-terms",
        path: "/rental-terms",
        title: "IT Rental Terms",
        label: "IT Rental Terms",
        metaDescription: "The terms for renting laptops, desktops, servers and other IT equipment from Genesoft Infotech.",
        builtInUpdated: "",
        summary:
            "**In short:** the equipment stays ours, you look after it while you have it, and you return it on time. The quote we send you sets the equipment, period and price.",
        body: RENTAL,
        draftOnly: true,
    },
]

export function legalDef(key: string): LegalDef | undefined {
    return LEGAL_DEFS.find((d) => d.key === key)
}

/** Every cookie or browser-storage item the website and app set themselves. Keep in step with the code. */
export const COOKIE_ITEMS = [
    {
        name: "sb-…-auth-token",
        kind: "Cookie (may be split into parts ending .0, .1)",
        purpose: "Keeps you signed in to your workspace.",
        lasts: "Until you sign out or your session ends",
        needed: "Strictly necessary",
    },
    {
        name: "sidebar_state",
        kind: "Cookie",
        purpose: "Remembers whether you keep the app's side menu open or closed.",
        lasts: "7 days",
        needed: "Preference",
    },
    {
        name: "theme",
        kind: "Browser storage (not sent to us)",
        purpose: "Remembers light or dark mode in the app.",
        lasts: "Until you clear your browser data",
        needed: "Preference",
    },
    {
        name: "site-theme",
        kind: "Browser storage (not sent to us)",
        purpose: "Remembers light or dark mode on this website, if you choose one instead of your device setting.",
        lasts: "Until you clear your browser data",
        needed: "Preference",
    },
]

/** Providers that process customer data for us. Keep in step with the Privacy Policy. */
export const SUBPROCESSORS = [
    { name: "Supabase", purpose: "Database, file storage and sign-in", location: "Mumbai, India" },
    { name: "Vercel", purpose: "Hosting the website and app", location: "Global network" },
    { name: "Resend", purpose: "Sending emails from the service", location: "United States" },
    { name: "Razorpay", purpose: "Subscription payments (India)", location: "India" },
    { name: "Stripe", purpose: "Subscription payments (other countries)", location: "United States and other countries" },
]
