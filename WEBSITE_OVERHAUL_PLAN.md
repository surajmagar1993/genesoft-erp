# Genesoft Infotech website overhaul: plan

> **Status:** planning only, no code written yet. Owner decisions and open questions are marked.
> **Started:** 15 October 2026 · **Owner:** Genesoft Infotech · **Built in:** this repo (`app/`, Next.js), deployed on Vercel.

---

## 1. Goal

Replace the old company website on **genesoftinfotech.com** (static HTML on GoDaddy) with one modern site that:

1. Presents **Genesoft Infotech** and all of its services: Software Development, Digital Marketing, IT Rentals and IT Support.
2. Features **Genesoft ERP** as the company's flagship product, with its pricing, free trial and sign-in.
3. Can be edited from **Super Admin** without a developer: text, services, portfolio, clients, testimonials, job posts and contact details.
4. Shares one design, one logo set and one set of legal pages with the ERP.

## 2. Owner decisions (15 Oct 2026)

| # | Topic | Decision |
|---|-------|----------|
| 1 | Structure | **Option A:** one site. The company site lives at genesoftinfotech.com; Genesoft ERP becomes its flagship product section; the ERP app (sign-in, dashboard) stays in the same project. |
| 2 | Company name | **"Genesoft Infotech"** everywhere on the site. **"Genesoft Infotech Pvt. Ltd."** only in legal pages (Terms, Privacy, Refund, Delivery, Cookie, DPA, Rental Terms). |
| 3 | Email | **info@genesoftinfotech.com** for general queries and the contact/quote forms. **hello@genesoftinfotech.com** for welcome emails to clients who use our services. |
| 4 | Content | Use **real** clients, portfolio, testimonials and numbers. The owner will supply them (see §14). Nothing invented or placeholder goes live. |
| 5 | IT Rentals | **"Ask for a quote"** only, no public prices. |
| 6 | Careers | No openings now. Page shows "no current openings, send us your CV", and admins can **add job posts later**. |
| 7 | Theme | **Light or dark following the visitor's device setting**, with a manual toggle. |
| 8 | Content editing | Recommended: **inside Super Admin** (see §7). Awaiting owner confirmation. |

## 3. Audit of the current genesoftinfotech.com (15 Oct 2026)

Static HTML on GoDaddy (Apache). Pages: Home, About, Services, Contact.

**Broken**
- `careers.html`, `privacy.html`, `robots.txt`, `sitemap.xml` (and any other missing page) return **500 Internal Server Error** instead of 404.
- The contact form tells visitors they agree to the Privacy Policy and Terms, **but neither page exists**.
- Most links are dead (`#`): Careers, Explore Services, Contact Us, every "Read More", every "View Project", all footer quick links.
- The animation library fails to load (`gsap is not defined`), which leaves large empty blocks on the homepage.
- Three portfolio images fail (`images/blog3.jpg`, `blog4.jpg`, `blog5.jpg`).
- The page scrolls sideways on phones.
- Broken characters: "Â©" and "â€¢" (encoding).

**Wrong or placeholder content**
- "+91 XXXXX XXXXX" and "info@genesoft.com" (not our domain) on About and Services.
- "© 2025 Genesoft Technologies", "Genesoft Infotech Pvt. Ltd." and "Genesoft" all used for the company.
- The About page has no content.
- Numbers (500+ projects, 100+ clients, 15+ years) and testimonials need confirming as real.
- Partner logos (ASUS, Dell) need permission or proof of partnership.
- The contact form's consent text is a US SMS template ("Text STOP to opt out").

**Missing:** page descriptions and social previews, a sitemap, any mention of Genesoft ERP, and working legal pages.

**Domain:** genesoftinfotech.com **expires 5 December 2026 with auto-renew off**.

## 4. Site map and addresses

### 4.1 Public pages

| Address | Page | Notes |
|---------|------|-------|
| `/` | **Home** (company) | Hero, the four services, Genesoft ERP highlight, clients, numbers, portfolio, testimonials, call to action |
| `/services` | Services overview | Cards for the four services |
| `/services/software-development` | Software Development | What we build, technologies, process, related projects, enquiry form |
| `/services/digital-marketing` | Digital Marketing | SEO, social media, paid ads, branding; process; enquiry form |
| `/services/it-rentals` | IT Rentals | Equipment categories (laptops, desktops, servers, networking…), how renting works, **quote request form** |
| `/services/it-support` | IT Support | Managed IT, networking, cloud, AMC; enquiry form |
| `/erp` | **Genesoft ERP** product page | Today's ERP homepage, moved here |
| `/erp/pricing` | ERP pricing | Today's `/pricing` (live prices and plan settings from Super Admin) |
| `/portfolio` | Portfolio | Real projects; filter by service |
| `/portfolio/[slug]` | Case study | Problem, solution, technologies, result, images |
| `/about` | About us | Story, what we stand for, office, numbers |
| `/careers` | Careers | Job posts from Super Admin; "no current openings, send your CV" when empty |
| `/careers/[slug]` | Job post | Description and an application form (CV upload) |
| `/contact` | Contact | Form (to info@), phone, WhatsApp, map, office hours |
| `/terms`, `/privacy`, `/refund-policy`, `/delivery-policy`, `/cookie-policy`, `/dpa` | Legal | Exist today; update scope and company name (§10) |
| `/rental-terms` | **New:** IT Rental Terms | Deposit, damage, late return, delivery and pick-up (needs owner input) |
| `/sitemap` | Sitemap page | Exists; extend |
| `/login`, `/register`, `/forgot-password` | ERP sign-in | Unchanged |

### 4.2 Redirects (permanent, 301)

- `/pricing` → `/erp/pricing` (keeps links in emails and the app's Billing working)
- `/index.html` → `/`, `/about.html` → `/about`, `/services.html` → `/services`, `/contact.html` → `/contact`, `/careers.html` → `/careers`
- Links inside the app that point to `/` or `/pricing` for the ERP are updated to `/erp` and `/erp/pricing`.

### 4.3 Main menu

`Services ▾` (four services) · `Genesoft ERP ▾` (Overview, Pricing, Start free trial) · `Portfolio` · `About` · `Careers` · `Contact` · **Sign in** · **Get a quote** (button).

On phones the menu becomes a drawer with the same items.

## 5. Page content (what each page says)

Content is written from facts only. Anything not yet supplied stays hidden; there are no placeholders.

- **Home:**
  1. Hero: one line on what Genesoft Infotech does, with "Get a quote" and "Explore Genesoft ERP" buttons.
  2. The four services as cards.
  3. A Genesoft ERP feature band with a screenshot and "Start free trial".
  4. "Why choose us" (real reasons).
  5. Our process (Requirement → Planning → Design → Development → Testing → Launch).
  6. Client logos, with permission.
  7. Numbers, only if confirmed.
  8. Selected portfolio projects.
  9. Testimonials, real and with permission.
  10. A final call to action.
- **Each service page:**
  1. A short intro.
  2. What's included (bullets).
  3. Who it's for.
  4. How we work (steps).
  5. Related portfolio projects.
  6. FAQs.
  7. An enquiry form already set to that service.
- **IT Rentals:**
  1. Equipment categories, with optional brand and spec notes; no prices.
  2. Rental terms in brief.
  3. A **quote form**: equipment type, quantity, rental period, start date, delivery city, company, contact details and notes.
- **Genesoft ERP (`/erp`):** the current ERP homepage content, with pricing linking to `/erp/pricing`.
- **Portfolio and case studies:** title, client (if allowed), service, technologies, summary, the problem and solution, results, a gallery and an optional link.
- **About:** the company story, mission, values, office photos, and team members (optional, owner's choice).
- **Careers:** the list of jobs (title, type, location, experience). When there are none: "We don't have openings right now. Send your CV to info@…". Each job post has an apply form with a CV upload.
- **Contact:** a form with topics (General, Software Development, Digital Marketing, IT Rentals, IT Support, Genesoft ERP, Careers), plus phone, WhatsApp, email (info@), address, a map and office hours.

## 6. Design

- **Theme:**
  - The site follows the visitor's device light/dark setting, with a toggle in the header that is remembered in the browser.
  - The marketing pages are currently forced light; that will change.
  - Every colour is a theme variable, so both modes are designed rather than just inverted.
- **Logo:**
  - `header.png` (dark lettering) on light backgrounds and `logo.png` (white lettering) on dark ones, switched automatically by `BrandLogo`.
  - The icon-only `logo-mark.png` is used for favicons and small spaces.
  - There is no typed name next to the logo.
- **Colour:** the brand orange from the logo becomes the main accent for the company site. **(Question:** keep blue for the ERP section, or orange throughout?)
- **Layout:**
  - Full width up to 1600px (`SITE_CONTAINER`), with reading text kept at a comfortable width.
  - Built for phones first: no sideways scrolling and large tap targets.
- **Type:** the app's existing font, with larger headings on big screens.
- **Motion:** light fade/slide on scroll only, built in (no external animation library), and switched off when the visitor's device asks for reduced motion.
- **Images:**
  - Optimised automatically (`next/image`), using real photos and screenshots only.
  - Illustrations are clearly illustrative, and there is no stock "team" imagery presented as our staff.
- **Accessibility:** proper headings, alt text, keyboard navigation, visible focus and sufficient contrast in both themes.

## 7. Editing the site: where the "backend" lives

### 7.1 Options compared

| | **A. Inside Super Admin (recommended)** | B. Separate admin app | C. Hosted CMS (Sanity, Contentful, Strapi…) |
|---|---|---|---|
| Login | Existing Super Admin login | New login to build and secure | Separate account per editor |
| Cost | None extra | Build and host twice | Monthly fee past free tiers |
| Same database and permissions | Yes | Needs its own setup | No; content lives outside |
| Reuses existing pieces | Audit log, email templates, image tools, tables | Little | Little |
| Effort | Medium | High | Medium, plus vendor lock-in |
| Risk | Low | Two admin systems to maintain | Content outside our control |

**Recommendation: A.** Add a **"Website"** group to the Super Admin menu. Only Super Admins can edit for now; a later option is a "Website editor" role that can edit the site but nothing else.

### 7.2 Super Admin → Website sections

| Section | What can be edited |
|---------|--------------------|
| **Site settings** | Company name, legal name, phones, WhatsApp, emails (info@/hello@), address, map link, office hours, social links, default page title and description |
| **Pages** | Home, About and each service page: headings, text blocks, call-to-action buttons, images, FAQs, page title and description for search engines |
| **Services** | The four services: name, icon, short text, full content, order, shown/hidden |
| **Rental catalogue** | Equipment categories and items (no prices), shown on IT Rentals |
| **Portfolio** | Case studies: title, client, service, technologies, story, images, link, featured on Home, published/draft |
| **Clients and partners** | Logos and names, with a "permission confirmed" tick (must be ticked to show) |
| **Testimonials** | Quote, name, role, company, photo, permission tick |
| **Numbers** | Stats such as projects and clients, each with a "confirmed" tick |
| **Careers** | Job posts (draft, open or closed) and received applications with CVs |
| **Leads inbox** | Contact messages and IT rental quote requests: status (new, contacted, won, lost), notes, reply by email |

Every save is recorded in **Admin Audit**. Pages have **Draft → Preview → Publish**, so changes can be checked before visitors see them.

### 7.3 Where the content is stored

- **Database:** new tables, prefixed `site_` (settings, pages, services, rental_items, portfolio, clients, testimonials, stats, jobs, job_applications, leads). This needs a **database change on the shared Supabase project**, done with a reviewed SQL file in the repo's existing way (`app/*.sql`), **only after owner approval**.
- **Images and CVs:** need file storage. Options:
  - **Supabase Storage**, in the same project. On the free plan the 1 GB limit is shared.
  - **Vercel Blob**, a separate small cost.

  Recommendation: Supabase Storage, with a public `site-media` bucket for images and a **private** `site-private` bucket for CVs.
- **Speed:** public pages are cached and refreshed whenever an admin publishes, so visitors get a fast site.

## 8. Forms, leads and email

| Form | Sent to | Stored | Visitor gets |
|------|---------|--------|--------------|
| Contact (all topics) | **info@** | Leads inbox | "Thanks, we'll reply within one working day" email from info@ |
| Service enquiry | **info@**, tagged with the service | Leads inbox | Same |
| IT rental quote | **info@**, tagged "IT Rentals" | Leads inbox with equipment details | Confirmation with a summary of the request |
| Job application (later) | **info@**, or a careers address if you want one | Applications, with the CV in private storage | Confirmation |

- **Spam protection:** the hidden-field trap and 3-per-10-minutes limit that exist today, plus **Cloudflare Turnstile** (a free, privacy-friendly CAPTCHA) once the site is live.
- **Welcome emails from hello@:**
  - When a client signs up for Genesoft ERP (or is added as a services client), a welcome email is sent from **hello@** using an editable template in Admin → Email Templates.
  - Today the app sends no welcome email; Supabase sends only the confirm-your-email message.
- **Code change:** `PLATFORM.email` is split into `contactEmail` (info@) and `welcomeEmail` (hello@), and every place is updated (website, legal pages, receipts, reply-to addresses).
- **Sending domain:** Resend must be verified for genesoftinfotech.com, which needs DNS records.

## 9. Search engines and sharing

- Each page gets a unique title and description, editable in Super Admin.
- Social previews (Open Graph/Twitter) with a branded image for each page.
- `sitemap.xml` (including portfolio and job posts) and `robots.txt`.
- Structured data: Organization, LocalBusiness (Pune address, phone, hours), Service, Product (ERP) and JobPosting.
- 301 redirects from the old `.html` addresses.
- A Google Business Profile and Search Console set up by the owner, with help.
- A Lighthouse score of 90+ in each category on phone and desktop.

## 10. Legal pages

- **Company name:** "Genesoft Infotech Pvt. Ltd." in all legal pages, as the party to the agreement. "Genesoft Infotech" everywhere else. Platform receipts (tax invoices) should also show the legal name, **to confirm** (see §14).
- **Scope:** the existing pages cover only Genesoft ERP. They need extending to the company's services:
  - **Terms:** a general part plus an ERP part, or separate "Services Terms" for project work. **(Question.)**
  - **IT Rental Terms**, a new page: deposit, damage and loss, late returns, delivery and pick-up, ownership, insurance. Needs the owner's real rules.
  - **Privacy:** add the website forms, quote requests and job applications (CVs and how long they're kept).
- **Placement:** the cookie and privacy links go in the footer, and the contact and quote forms link to them.
- **Review:** everything gets a **legal review** before go-live.

## 11. Moving the domain (go-live)

1. Build and test everything on **genesoftdev.vercel.app**.
2. Owner reviews and approves.
3. Add genesoftinfotech.com and www to the Vercel project.
4. In GoDaddy DNS (owner login needed), point the site records to Vercel. **Keep the email (MX) records unchanged**, so info@ and hello@ keep working.
5. Add the Resend DNS records for sending from genesoftinfotech.com.
6. Update `NEXT_PUBLIC_SITE_URL`, the Supabase auth redirect URLs, and the Razorpay/Stripe webhook addresses to the new domain.
7. **Turn on auto-renew** for the domain (it expires 5 Dec 2026).
8. Keep the old GoDaddy site files as a backup for 30 days.

## 12. Build phases

| Phase | What | Needs from owner |
|-------|------|------------------|
| **0. Plan** (this file) | Agree the plan, answer §14 | Answers |
| **1. Foundations** | Theme (system + toggle), design tokens, header/footer/menu, new addresses and redirects, ERP moved to `/erp` | Colour choice |
| **2. Content storage** | `site_` tables (SQL reviewed first), storage buckets, Super Admin → Website screens | **Approval for the database change** and storage choice |
| **3. Pages** | Home, Services (4), IT Rentals with quote form, Portfolio, About, Careers, Contact | Real content (§14) |
| **4. Leads and email** | Leads inbox, quote form, email routing (info@/hello@), welcome email, Turnstile | Email inbox details |
| **5. Legal and SEO** | Legal updates, Rental Terms, structured data, previews, sitemap | Rental rules; legal review |
| **6. Testing** | Phone/desktop, light/dark, accessibility, speed, broken links, forms end to end | Owner review |
| **7. Go-live** | Domain move (§11) | GoDaddy access |

Each phase is committed and shown on genesoftdev before the next starts. Nothing reaches the live domain until phase 7.

## 13. Risks and how we handle them

- **Email stops working during the domain move:** MX records are not touched; we check with a test email right after.
- **Shared database:** schema changes only through a reviewed SQL file, after approval, never `prisma db push`.
- **Invented content:** every client, testimonial and number has a "permission/confirmed" tick, and is hidden until ticked.
- **Old links break:** 301 redirects, plus a check of every old address.
- **Supabase free-plan limits** (storage and database size): images are compressed on upload; we watch usage in System Health.

## 14. Questions for the owner

1. **Content editing:** confirm **Super Admin → Website** (recommended), rather than a separate backend or an external CMS.
2. **Storage:** OK to use **Supabase Storage** (same project, free-plan limits) for images and CVs?
3. **Database:** OK to add the `site_` tables to the shared database (SQL shown to you first)?
4. **Colours:** orange throughout, or orange for the company and blue for the ERP section?
5. **Content**, which you said you'll provide:
   - Short company story; founding year; team size (optional)
   - For each service: what's included, technologies, typical clients
   - IT Rentals: equipment categories and brands, minimum rental period, delivery cities, deposit rules
   - Portfolio projects you're allowed to show (client names, screenshots, results)
   - Client and partner logos you have permission for (ASUS and Dell: are you an authorised partner?)
   - Testimonials with names and permission
   - True numbers: projects, clients, years
6. **Contact details:** is +91 8888885285 the main number? Is it also on WhatsApp? Office hours? A Google Maps link for the office?
7. **Email inboxes:** where are info@ and hello@ hosted today (GoDaddy, Google Workspace, Zoho)? I need this to keep them working during the move.
8. **Legal:** one Terms document with sections, or separate ERP Terms and Services Terms? Should receipts and tax invoices also show "Genesoft Infotech Pvt. Ltd."? Do you have a CIN or GSTIN to show in the footer and on legal pages?
9. **Careers:** where should applications go: info@ or a separate careers@?
10. **Social media:** links to LinkedIn, Instagram, Facebook, YouTube and X, if you have them.
11. **ERP app address:** keep sign-in on the same domain (genesoftinfotech.com/login), or move the app to **app.genesoftinfotech.com**? Recommended: same domain for now.
12. **Languages:** English only, or Hindi or Marathi later?

## 15. Done when

- [ ] Every page in §4 works on phone and desktop, in light and dark, with no sideways scrolling.
- [ ] Every link works; no 500s; old `.html` addresses redirect.
- [ ] Super Admin can edit every section in §7.2, preview, publish, and see each change in Admin Audit.
- [ ] Contact, service and quote forms reach info@, appear in the Leads inbox and send a confirmation.
- [ ] New ERP clients get the welcome email from hello@.
- [ ] Legal pages use "Genesoft Infotech Pvt. Ltd."; the rest of the site uses "Genesoft Infotech".
- [ ] No placeholder or unconfirmed content is visible.
- [ ] Lighthouse 90+ on phone; sitemap, robots and structured data are valid.
- [ ] Domain points to Vercel, email still works, and auto-renew is on.
