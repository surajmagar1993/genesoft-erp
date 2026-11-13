-- Document number counters (src/lib/sequence.ts nextSequence / peekSequence), 2026-11-13.
-- One row per business, number series and prefix; taking a number locks and moves the row,
-- so two saves at the same moment never get the same number. Additive: no existing table changes.
-- Run BEFORE deploying the code that uses it. Rollback: drop table public.document_counters;
create table if not exists public.document_counters (
    tenant_id  uuid        not null references public.tenants(id) on delete cascade,
    name       text        not null,
    prefix     text        not null,
    last_value integer     not null,
    updated_at timestamptz not null default now(),
    primary key (tenant_id, name, prefix)
);
-- Same as every other table: RLS on, no policies (only the server, through Prisma, reads it)
alter table public.document_counters enable row level security;
