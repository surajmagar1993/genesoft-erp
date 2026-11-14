-- Customer portal links expire 30 days after they're issued (src/lib/portal-link.ts).
ALTER TABLE "contacts" ADD COLUMN "portal_token_issued_at" TIMESTAMPTZ(6);

-- Links that exist today get their 30 days from now, so none stops working the moment this runs.
UPDATE "contacts" SET "portal_token_issued_at" = now() WHERE "portal_token" IS NOT NULL;
