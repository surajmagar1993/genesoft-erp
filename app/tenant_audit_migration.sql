-- Client activity log (16 Oct 2026).
-- Super Admin → Audit (admin_audit_logs) keeps only what the platform's Super
-- Admin does. What a business's own people do (plan changes, team and access,
-- settings and credentials, deletes, exports) goes to tenant_audit_logs, one
-- log per business: the Super Admin sees each business's log on its page, and
-- the business's admins see their own in Settings → Activity log.
-- Row-level security is ON with no policies, so the Supabase browser/anon API
-- can't read or write it; only the server (Prisma) can.
-- Matches the TenantAuditLog model in prisma/schema.prisma. Safe to run more than once.

begin;

create table if not exists public.tenant_audit_logs (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  -- Who did it: a user of the business, the Super Admin acting on it, or the
  -- billing system (actor_id null, actor_email 'billing@system')
  actor_id     uuid,
  actor_email  text,
  action       text not null,
  target_type  text,
  target_id    text,
  -- Never secrets: credentials are recorded as "changed", not their values
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists idx_tenant_audit_logs_tenant_time on public.tenant_audit_logs (tenant_id, created_at desc);
create index if not exists idx_tenant_audit_logs_action on public.tenant_audit_logs (action);

alter table public.tenant_audit_logs enable row level security;

-- Move the business-side entries that were written to the Super Admin log
-- (plan changes made by a business or applied by the payment gateway, and
-- owners closing their workspace). Entries made by a Super Admin stay.
insert into public.tenant_audit_logs (tenant_id, actor_id, actor_email, action, target_type, target_id, metadata, created_at)
select a.target_id::uuid,
       case when a.admin_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then a.admin_id::uuid end,
       a.admin_email,
       a.action,
       a.target_type,
       a.target_id,
       coalesce(a.metadata, '{}'::jsonb) || jsonb_build_object('movedFromAdminAudit', a.id),
       a.created_at at time zone current_setting('TimeZone')
from public.admin_audit_logs a
where (a.target_type = 'TENANT_SUBSCRIPTION' or a.action = 'TENANT_CLOSED_BY_OWNER')
  and a.target_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and exists (select 1 from public.tenants t where t.id = a.target_id::uuid)
  and not exists (select 1 from public.profiles p where p.id::text = a.admin_id and p.role = 'SUPER_ADMIN')
  and not exists (select 1 from public.tenant_audit_logs x where x.metadata->>'movedFromAdminAudit' = a.id);

delete from public.admin_audit_logs a
where exists (select 1 from public.tenant_audit_logs x where x.metadata->>'movedFromAdminAudit' = a.id);

commit;
