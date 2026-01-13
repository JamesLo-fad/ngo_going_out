-- Fix column order: move donation_post_year to position 16 (after donation_post)

-- Create new table with correct column order
CREATE TABLE orgs_new (
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
  donation_pre REAL,
  donation_pre_year TEXT,
  donation_post REAL,
  donation_post_year TEXT,
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

-- Copy data from old table to new table
INSERT INTO orgs_new (
  id, org_name, in_cnie, in_cace, in_un, founded_date, go_global_date, leaders, key_staff, capital_type,
  reg_location, reg_type, donation_pre, donation_pre_year, donation_post, donation_post_year,
  mission, org_structure, has_overseas_office, overseas_mission, overseas_projects, overseas_regions,
  overseas_services, service_mode, has_official_background, sources,
  disclosed_online, disclosed_continuous, go_out_level, logo_url
)
SELECT
  id, org_name, in_cnie, in_cace, in_un, founded_date, go_global_date, leaders, key_staff, capital_type,
  reg_location, reg_type, donation_pre, donation_pre_year, donation_post, donation_post_year,
  mission, org_structure, has_overseas_office, overseas_mission, overseas_projects, overseas_regions,
  overseas_services, service_mode, has_official_background, sources,
  disclosed_online, disclosed_continuous, go_out_level, logo_url
FROM orgs;

-- Drop old table
DROP TABLE orgs;

-- Rename new table to orgs
ALTER TABLE orgs_new RENAME TO orgs;
