-- Reference data for address forms: states, cities and Indian PIN codes (no business data).
-- Filled by scripts/import-geo.mts; read only through the app (src/app/actions/geo.ts).

CREATE TABLE "geo_states" (
    "id" SERIAL NOT NULL,
    "country_code" CHAR(2) NOT NULL,
    "code" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    CONSTRAINT "geo_states_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "geo_cities" (
    "id" SERIAL NOT NULL,
    "country_code" CHAR(2) NOT NULL,
    "state_name" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    CONSTRAINT "geo_cities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "geo_postal_codes" (
    "id" SERIAL NOT NULL,
    "country_code" CHAR(2) NOT NULL DEFAULT 'IN',
    "postal_code" TEXT NOT NULL,
    "place_name" TEXT NOT NULL,
    "district" TEXT NOT NULL DEFAULT '',
    "state_name" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "geo_postal_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "geo_states_country_code_name_key" ON "geo_states"("country_code", "name");
CREATE INDEX "geo_cities_country_code_name_idx" ON "geo_cities"("country_code", "name");
CREATE INDEX "geo_postal_codes_country_code_postal_code_idx" ON "geo_postal_codes"("country_code", "postal_code");

-- Only the app reads these (Prisma, server side); the public Supabase API gets nothing.
ALTER TABLE "geo_states" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "geo_cities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "geo_postal_codes" ENABLE ROW LEVEL SECURITY;
