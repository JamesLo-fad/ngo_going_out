-- Base schema for orgs and policies

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS orgs (
  id INTEGER PRIMARY KEY,
  org_name TEXT NOT NULL,
  in_cnie INTEGER,
  in_cace INTEGER,
  in_un INTEGER,
  founded_date TEXT,
  go_global_date TEXT,
  leaders TEXT,
  key_staff TEXT,
  capital_type TEXT,
  reg_location TEXT,
  reg_type TEXT,
  donation_pre REAL,         -- changed to REAL for clarity
  donation_pre_year TEXT,
  donation_post REAL,        -- changed to REAL for clarity
  mission TEXT,
  org_structure TEXT,
  has_overseas_office INTEGER,
  overseas_mission TEXT,
  overseas_projects TEXT,
  overseas_regions TEXT,
  overseas_services TEXT,
  service_mode TEXT,
  has_official_background INTEGER,
  sources TEXT,
  disclosed_online INTEGER,
  disclosed_continuous INTEGER,
  go_out_level TEXT,
  logo_url TEXT
);

CREATE TABLE IF NOT EXISTS policies (
  id INTEGER PRIMARY KEY,
  published_date TEXT,
  title TEXT,
  doc_type TEXT,
  issuer_1 TEXT,
  issuer_2 TEXT,
  issuer_3 TEXT,
  issuer_4 TEXT,
  link TEXT
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_orgs_name ON orgs(org_name);
CREATE INDEX IF NOT EXISTS idx_orgs_search ON orgs(org_name, overseas_regions, overseas_services);