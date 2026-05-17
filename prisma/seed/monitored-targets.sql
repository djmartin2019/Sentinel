-- Seed initial MonitoredTarget rows for production / local Postgres.
-- Idempotent: skips any row whose url already exists (never deletes data).
-- Runs automatically via ./build.sh after migrations.
--
-- Manual run (from repo root):
--   docker compose -f docker-compose.prod.yml exec -T postgres \
--     psql -U sentinel -d sentinel -v ON_ERROR_STOP=1 < prisma/seed/monitored-targets.sql

INSERT INTO "MonitoredTarget" ("id", "name", "url", "interval", "createdAt")
SELECT v.id, v.name, v.url, v.interval, v."createdAt"
FROM (
  VALUES
    ('seed_target_vps',           'VPS',              'https://djm-apps.com/',                 30, NOW()),
    ('seed_target_portfolio',     'Portfolio',        'https://djm-tech.dev/',                 30, NOW()),
    ('seed_target_howgodspeaks',  'How God Speaks',   'https://howgodspeakstous.com/',         30, NOW()),
    ('seed_target_pokevote',      'PokeVote',         'https://pokevote.djm-apps.com/',        30, NOW()),
    ('seed_target_daveymaps',     'Davey Maps',       'https://davey-maps.djm-apps.com/',      30, NOW()),
    ('seed_target_githublookup',  'Github Lookup',    'https://githublookup.djm-apps.com/',    30, NOW()),
    ('seed_target_foodlymap',     'Foodly Map',       'https://foodlymap.com/',                30, NOW())
) AS v(id, name, url, interval, "createdAt")
WHERE NOT EXISTS (
  SELECT 1 FROM "MonitoredTarget" t WHERE t.url = v.url
);
