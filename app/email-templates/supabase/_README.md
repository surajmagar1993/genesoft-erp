# Supabase Auth email templates

These are the emails Supabase Auth sends (sign-up confirmation = welcome, password reset,
invite, email change, security notices). They are applied to the Supabase project
(Authentication → Emails); this folder is the source of truth so changes are reviewed in git.

Links go through `/auth/confirm` (src/app/auth/confirm/route.ts), which turns the
`token_hash` into a session. Available variables: `{{ .SiteURL }}`, `{{ .TokenHash }}`,
`{{ .Token }}`, `{{ .Email }}`, `{{ .NewEmail }}`, `{{ .RedirectTo }}`,
`{{ .Data.full_name }}`, `{{ .Data.company_name }}` (saved at registration).
