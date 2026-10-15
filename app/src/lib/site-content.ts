/**
 * Built-in content for the public website (genesoftinfotech.com). Pages read
 * it from here today; Super Admin → Website (planned, WEBSITE_OVERHAUL_PLAN.md
 * §7) will store edits that override these defaults.
 *
 * Only facts about what the company does. Anything that must be real and
 * confirmed (clients, numbers, testimonials, projects, photos, office hours)
 * is NOT here: those sections stay hidden until they are added and confirmed.
 */

export type ServiceIcon = "code" | "megaphone" | "laptop" | "headset"

export interface SiteService {
    slug: string
    name: string
    icon: ServiceIcon
    /** One line for cards */
    short: string
    /** Page heading and intro */
    heading: string
    intro: string
    includes: { title: string; text: string }[]
    getList: string[]
    tech?: string[]
    faqs: { q: string; a: string }[]
    /** Topic preselected in the enquiry form */
    topic: string
}

export const SERVICES: SiteService[] = [
    {
        slug: "software-development",
        name: "Software Development",
        icon: "code",
        short: "Web apps, ERP and CRM systems and mobile apps, built around how your business works.",
        heading: "Software built around how your business works",
        intro: "Web applications, ERP and CRM systems, mobile apps and integrations, planned with you, built in steps you can see, and supported after launch.",
        includes: [
            { title: "Web applications", text: "Portals, dashboards and internal tools that work in any browser." },
            { title: "ERP and CRM systems", text: "Custom modules, or Genesoft ERP set up and extended for you." },
            { title: "Mobile apps", text: "Android and iOS apps for your customers or your field team." },
            { title: "E-commerce", text: "Online stores with payments, stock and order tracking." },
            { title: "Integrations and APIs", text: "Connect payment gateways, WhatsApp, accounting and other systems." },
            { title: "Maintenance and upgrades", text: "Keep existing software secure, fast and up to date." },
        ],
        getList: ["A written scope, timeline and fixed quote", "Screens to approve before we build", "Regular demos as features are ready", "Your code, your data, your ownership", "Support and maintenance plans after launch"],
        tech: ["ASP.NET Core", ".NET MVC", "Angular", "React / Next.js", "Node.js", "SQL Server", "PostgreSQL", "Flutter"],
        faqs: [
            { q: "How much does a project cost?", a: "It depends on the scope. After a short call we send a written quote with a fixed price and timeline." },
            { q: "How long does it take?", a: "Small tools take a few weeks; larger systems are delivered in stages so you can start using parts early." },
            { q: "Who owns the code?", a: "You do. On final payment the source code and data are handed over to you." },
            { q: "Do you support it after launch?", a: "Yes. We offer maintenance plans for fixes, updates and new features." },
        ],
        topic: "Software Development",
    },
    {
        slug: "digital-marketing",
        name: "Digital Marketing",
        icon: "megaphone",
        short: "SEO, social media, paid ads and branding that bring you customers, with clear reports.",
        heading: "Marketing that brings in customers, not just clicks",
        intro: "Search, social media, paid campaigns and branding, planned around your goals and reported in plain numbers you can check.",
        includes: [
            { title: "Search engine optimisation", text: "Get found on Google for what your customers search for." },
            { title: "Social media", text: "Content, posting and community for the platforms your customers use." },
            { title: "Paid ads", text: "Google and social ad campaigns with clear budgets and tracking." },
            { title: "Branding", text: "Logos, brand guides and the materials that carry them." },
            { title: "Websites and landing pages", text: "Pages built to turn visitors into enquiries." },
            { title: "Reporting", text: "Monthly reports on traffic, leads and what each rupee returned." },
        ],
        getList: ["A plan tied to your business goals", "Agreed monthly budget and deliverables", "Regular reports in plain language", "Access to your own ad and analytics accounts"],
        faqs: [
            { q: "How soon will I see results?", a: "Paid ads can bring enquiries within days. SEO usually takes a few months to build steady results." },
            { q: "Do I need a long contract?", a: "No. We agree the scope and review it with you regularly." },
            { q: "Who owns the ad accounts?", a: "You do. We work inside accounts in your name, so nothing is lost if you change agency." },
        ],
        topic: "Digital Marketing",
    },
    {
        slug: "it-rentals",
        name: "IT Rentals",
        icon: "laptop",
        short: "Laptops, desktops, servers and networking on rent, for a week, a project or a year.",
        heading: "Laptops, desktops and servers on rent",
        intro: "For a new team, a training batch, an event or a project. Tell us what you need and for how long, and we'll send a quote.",
        includes: [],
        getList: [],
        faqs: [],
        topic: "IT Rentals",
    },
    {
        slug: "it-support",
        name: "IT Support",
        icon: "headset",
        short: "Managed IT, networking, cloud and annual maintenance, with on-site help in Pune.",
        heading: "IT that keeps working, with people who answer",
        intro: "Managed IT, networking, cloud and annual maintenance contracts, with remote help and engineers on site when you need hands.",
        includes: [
            { title: "Managed IT", text: "Ongoing care for your computers, accounts and software." },
            { title: "Networking", text: "Office networks, Wi-Fi, firewalls and secure remote access." },
            { title: "Cloud and email", text: "Set up and look after email, file sharing and cloud servers." },
            { title: "Annual maintenance (AMC)", text: "Regular check-ups and repairs under one yearly contract." },
            { title: "Backups and security", text: "Protect your data and keep systems patched." },
            { title: "On-site support", text: "Engineers at your office in Pune when remote help isn't enough." },
        ],
        getList: ["A clear list of what's covered", "Agreed response times", "Remote and on-site help", "Regular health checks of your systems"],
        faqs: [
            { q: "Do you support small offices?", a: "Yes. Plans scale from a handful of computers to larger offices." },
            { q: "Can you take over from another provider?", a: "Yes. We review your current setup first and agree a handover plan." },
            { q: "Do you come on site?", a: "Yes, in and around Pune. Most issues are fixed remotely first." },
        ],
        topic: "IT Support",
    },
]

export function serviceBySlug(slug: string): SiteService | undefined {
    return SERVICES.find((s) => s.slug === slug)
}

export const RENTAL_CATEGORIES: { name: string; text: string }[] = [
    { name: "Laptops", text: "Business laptops for staff, trainees and projects." },
    { name: "Desktops", text: "Complete desktop sets with monitor, keyboard and mouse." },
    { name: "Servers", text: "Rack and tower servers for short or long projects." },
    { name: "Networking", text: "Switches, routers, firewalls and Wi-Fi access points." },
    { name: "Monitors and displays", text: "Extra screens, large displays and projectors." },
    { name: "Printers and peripherals", text: "Printers, scanners, docks and accessories." },
]

export const RENTAL_PERIODS = ["1 week", "2 weeks", "1 month", "3 months", "6 months", "12 months", "Other"]

export const RENTAL_STEPS = [
    { title: "Request a quote", text: "Tell us the equipment, quantity, dates and delivery city." },
    { title: "Get your quote", text: "We confirm stock and send the price and terms by email." },
    { title: "Delivery and setup", text: "We deliver, and can set up and test on site." },
    { title: "Extend or return", text: "Keep it longer, swap models, or we collect it." },
]

export const PROCESS = [
    { title: "Requirement", text: "We listen and write down what you need." },
    { title: "Planning", text: "Scope, timeline and a fixed quote." },
    { title: "Design", text: "Screens and flows you approve first." },
    { title: "Development", text: "Built in steps you can see and test." },
    { title: "Testing", text: "Checked on real devices and data." },
    { title: "Launch", text: "Go live, then ongoing support." },
]

export const WHY_US = [
    { title: "One contact for everything", text: "Software, marketing, hardware and support from the same team, so nothing falls between suppliers." },
    { title: "Clear quotes, no surprises", text: "You get the scope, timeline and price in writing before any work starts." },
    { title: "Local team in Pune", text: "Meet us in person, and get on-site help when your IT needs hands, not just a ticket." },
    { title: "We stay after launch", text: "Maintenance, updates and support plans keep your systems running long after go-live." },
]

/** Topics on the contact form */
export const CONTACT_TOPICS = ["General", "Software Development", "Digital Marketing", "IT Rentals", "IT Support", "Genesoft ERP", "Careers"] as const
