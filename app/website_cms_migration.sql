-- Website content tables (Super Admin → Website), 15 Oct 2026.
-- Platform-wide (no tenant_id): they hold genesoftinfotech.com's own content.
-- Row-level security is ON with no policies, so the Supabase browser/anon API
-- can't read or write them; only the server (Prisma) can.
-- Matches the Site* models in prisma/schema.prisma. Safe to run more than once.

begin;

-- One row of settings: contact details, office hours, social links, map link, SEO defaults
create table if not exists public.site_settings (
  id          text primary key default 'site',
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);

-- Page and legal texts by key ("page:home", "service:it-support", "legal:terms"),
-- edited as a draft and copied to published on Publish
create table if not exists public.site_content (
  key           text primary key,
  draft         jsonb not null default '{}'::jsonb,
  published     jsonb,
  published_at  timestamptz,
  updated_at    timestamptz not null default now(),
  updated_by    uuid
);

-- Every published version, for History and undo
create table if not exists public.site_content_versions (
  id            uuid primary key default gen_random_uuid(),
  key           text not null,
  data          jsonb not null,
  published_at  timestamptz not null default now(),
  published_by  uuid
);
create index if not exists idx_site_content_versions_key on public.site_content_versions (key, published_at desc);

-- Lists: portfolio projects, clients, testimonials, numbers, team, jobs, rental items.
-- "confirmed" is the permission / confirmed tick: nothing unconfirmed is shown.
create table if not exists public.site_items (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('portfolio', 'client', 'testimonial', 'stat', 'team', 'job', 'rental_item')),
  slug        text,
  data        jsonb not null default '{}'::jsonb,
  sort        integer not null default 0,
  status      text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  confirmed   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);
create unique index if not exists uq_site_items_kind_slug on public.site_items (kind, slug) where slug is not null;
create index if not exists idx_site_items_kind_status on public.site_items (kind, status, sort);

-- Uploaded files (the bytes live in Storage: site-media public, site-private for CVs)
create table if not exists public.site_media (
  id           uuid primary key default gen_random_uuid(),
  bucket       text not null check (bucket in ('site-media', 'site-private')),
  path         text not null unique,
  url          text,
  alt          text not null default '',
  mime         text not null,
  bytes        integer not null,
  width        integer,
  height       integer,
  uploaded_by  uuid,
  created_at   timestamptz not null default now()
);

-- Contact messages, rental quote requests and job applications
create table if not exists public.site_leads (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('contact', 'quote', 'application')),
  topic       text not null default 'General',
  name        text not null,
  email       text not null,
  phone       text,
  company     text,
  data        jsonb not null default '{}'::jsonb,
  status      text not null default 'new' check (status in ('new', 'contacted', 'quote_sent', 'won', 'lost', 'spam')),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);
create index if not exists idx_site_leads_status on public.site_leads (status, created_at desc);

alter table public.site_settings          enable row level security;
alter table public.site_content           enable row level security;
alter table public.site_content_versions  enable row level security;
alter table public.site_items             enable row level security;
alter table public.site_media             enable row level security;
alter table public.site_leads             enable row level security;

commit;
