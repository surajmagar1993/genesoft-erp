# Supabase Auth email templates

These are the emails Supabase Auth sends (sign-up confirmation = welcome, password reset,
invite, email change, security notices). They are applied to the Supabase project
(Authentication → Emails); this folder is the source of truth so changes are reviewed in git.

Links go through `/auth/confirm` (src/app/auth/confirm/route.ts), which turns the
`token_hash` into a session. Available variables: `{{ .SiteURL }}`, `{{ .TokenHash }}`,
`{{ .Token }}`, `{{ .Email }}`, `{{ .NewEmail }}`, `{{ .RedirectTo }}`,
`{{ .Data.full_name }}`, `{{ .Data.company_name }}` (saved at registration).

**Branding (2026-11-13):** every template uses one layout: charcoal header (#2B2A29) with the logo
`{{ .SiteURL }}/email/genesoft-logo.png` (app/public/email/, white text, so it needs the dark band),
orange button with dark text, a plain link under the button, and a footer with the legal name,
Pune address and genesoftinfotech.com.

**Apply:** subjects, template files, the 2FA notices and the redirect allow-list are declared in
`app/supabase/config.toml`. From `app/`: `supabase config diff` (read-only preview; note it does not
compare template bodies), then `supabase config push`. Deploy the app first so the logo URL works.
After sign-up confirmation users land on `/reports` (the dashboard).
