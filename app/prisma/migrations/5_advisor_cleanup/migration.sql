-- Supabase advisor clean-up (2026-11-14).

-- 1. Indexes another index already covers (same leading columns), e.g. invoices(tenant_id)
--    next to invoices(tenant_id, status). They cost every write and answer nothing new.

DROP INDEX IF EXISTS "public"."contacts_tenant_id_idx";
DROP INDEX IF EXISTS "public"."products_tenant_id_idx";
DROP INDEX IF EXISTS "public"."invoices_tenant_id_idx";
DROP INDEX IF EXISTS "public"."quotes_tenant_id_idx";
DROP INDEX IF EXISTS "public"."sales_orders_tenant_id_idx";
DROP INDEX IF EXISTS "public"."payments_tenant_id_idx";
DROP INDEX IF EXISTS "public"."bills_tenant_id_idx";
DROP INDEX IF EXISTS "public"."accounts_tenant_id_idx";
DROP INDEX IF EXISTS "public"."warehouses_tenant_id_idx";
DROP INDEX IF EXISTS "public"."stock_movements_tenant_id_idx";
DROP INDEX IF EXISTS "public"."purchase_orders_tenant_id_idx";
DROP INDEX IF EXISTS "public"."departments_tenant_id_idx";
DROP INDEX IF EXISTS "public"."designations_tenant_id_idx";
DROP INDEX IF EXISTS "public"."employees_tenant_id_idx";
DROP INDEX IF EXISTS "public"."attendances_tenant_id_idx";
DROP INDEX IF EXISTS "public"."projects_tenant_id_idx";
DROP INDEX IF EXISTS "public"."project_members_project_id_idx";
DROP INDEX IF EXISTS "public"."project_tasks_tenant_id_idx";
DROP INDEX IF EXISTS "public"."email_templates_tenant_id_idx";
DROP INDEX IF EXISTS "public"."rental_assets_tenant_id_idx";
DROP INDEX IF EXISTS "public"."rental_agreements_tenant_id_idx";
DROP INDEX IF EXISTS "public"."credit_notes_tenant_id_idx";
DROP INDEX IF EXISTS "public"."expenses_tenant_id_idx";
DROP INDEX IF EXISTS "public"."journal_entries_tenant_id_idx";
DROP INDEX IF EXISTS "public"."journal_entry_lines_tenant_id_idx";
DROP INDEX IF EXISTS "public"."price_lists_tenant_id_idx";
DROP INDEX IF EXISTS "public"."price_list_items_price_list_id_idx";
DROP INDEX IF EXISTS "public"."bank_accounts_tenant_id_idx";
DROP INDEX IF EXISTS "public"."bank_statements_tenant_id_idx";
DROP INDEX IF EXISTS "public"."recurring_profiles_tenant_id_idx";
DROP INDEX IF EXISTS "public"."email_accounts_tenant_id_idx";
DROP INDEX IF EXISTS "public"."web_forms_tenant_id_idx";
DROP INDEX IF EXISTS "public"."form_submissions_tenant_id_idx";
DROP INDEX IF EXISTS "public"."salary_structures_tenant_id_idx";
DROP INDEX IF EXISTS "public"."payroll_runs_tenant_id_idx";
DROP INDEX IF EXISTS "public"."payslips_tenant_id_idx";
DROP INDEX IF EXISTS "public"."payslips_payroll_run_id_idx";
DROP INDEX IF EXISTS "public"."bill_of_materials_tenant_id_idx";
DROP INDEX IF EXISTS "public"."work_orders_tenant_id_idx";
DROP INDEX IF EXISTS "public"."quality_inspections_tenant_id_idx";
DROP INDEX IF EXISTS "public"."job_openings_tenant_id_idx";
DROP INDEX IF EXISTS "public"."job_applicants_tenant_id_idx";
DROP INDEX IF EXISTS "public"."delivery_challans_tenant_id_idx";
DROP INDEX IF EXISTS "public"."contacts_portal_token_idx";
DROP INDEX IF EXISTS "public"."idx_notifications_tenant_id";
DROP INDEX IF EXISTS "public"."request_for_quotations_tenant_id_idx";
DROP INDEX IF EXISTS "public"."rfq_vendor_quotes_rfq_id_idx";
DROP INDEX IF EXISTS "public"."product_batches_tenant_id_idx";
DROP INDEX IF EXISTS "public"."product_serials_tenant_id_idx";
DROP INDEX IF EXISTS "public"."appraisal_cycles_tenant_id_idx";
DROP INDEX IF EXISTS "public"."performance_reviews_tenant_id_idx";
DROP INDEX IF EXISTS "public"."employee_goals_tenant_id_idx";
DROP INDEX IF EXISTS "public"."training_programs_tenant_id_idx";
DROP INDEX IF EXISTS "public"."training_enrollments_tenant_id_idx";

-- 2. Tables only the app's server reads (Prisma connects as the owner, which bypasses RLS).
--    RLS was already on with no policy; an explicit deny for every other role (anon, authenticated) says so.

-- Prisma's own history table exists only where `prisma migrate` ran (not in the test database)
DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    EXECUTE 'CREATE POLICY "no_public_api_access" ON "public"."_prisma_migrations" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false)';
  END IF;
END $$;
CREATE POLICY "no_public_api_access" ON "public"."admin_audit_logs" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
CREATE POLICY "no_public_api_access" ON "public"."appraisal_cycles" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
CREATE POLICY "no_public_api_access" ON "public"."companies" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
CREATE POLICY "no_public_api_access" ON "public"."custom_reports" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
CREATE POLICY "no_public_api_access" ON "public"."document_counters" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
CREATE POLICY "no_public_api_access" ON "public"."employee_goals" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
CREATE POLICY "no_public_api_access" ON "public"."exchange_rate_cache" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
CREATE POLICY "no_public_api_access" ON "public"."geo_cities" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
CREATE POLICY "no_public_api_access" ON "public"."geo_postal_codes" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
CREATE POLICY "no_public_api_access" ON "public"."geo_states" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
CREATE POLICY "no_public_api_access" ON "public"."global_settings" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
CREATE POLICY "no_public_api_access" ON "public"."performance_reviews" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
CREATE POLICY "no_public_api_access" ON "public"."pricing_plans" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
CREATE POLICY "no_public_api_access" ON "public"."site_content" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
CREATE POLICY "no_public_api_access" ON "public"."site_content_versions" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
CREATE POLICY "no_public_api_access" ON "public"."site_items" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
CREATE POLICY "no_public_api_access" ON "public"."site_leads" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
CREATE POLICY "no_public_api_access" ON "public"."site_media" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
CREATE POLICY "no_public_api_access" ON "public"."site_settings" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
CREATE POLICY "no_public_api_access" ON "public"."tenant_audit_logs" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
CREATE POLICY "no_public_api_access" ON "public"."training_enrollments" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
CREATE POLICY "no_public_api_access" ON "public"."training_programs" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
CREATE POLICY "no_public_api_access" ON "public"."workflow_executions" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
CREATE POLICY "no_public_api_access" ON "public"."workflow_rules" AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
