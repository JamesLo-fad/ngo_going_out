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

-- Full-Text Search (FTS) tables
CREATE VIRTUAL TABLE IF NOT EXISTS orgs_fts USING fts5(
  org_name, mission, overseas_mission, overseas_projects,
  overseas_regions, overseas_services, service_mode, go_out_level,
  content='orgs', content_rowid='id'
);

CREATE VIRTUAL TABLE IF NOT EXISTS policies_fts USING fts5(
  title, doc_type, issuer_1, issuer_2, issuer_3, issuer_4,
  content='policies', content_rowid='id'
);

-- Facets table for filtering
CREATE TABLE IF NOT EXISTS orgs_facets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL,
  country TEXT,
  sector TEXT,
  FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_facets_org ON orgs_facets(org_id);
CREATE INDEX IF NOT EXISTS idx_facets_country ON orgs_facets(country);
CREATE INDEX IF NOT EXISTS idx_facets_sector ON orgs_facets(sector);

-- Triggers to keep FTS tables in sync
CREATE TRIGGER IF NOT EXISTS orgs_ai AFTER INSERT ON orgs BEGIN
  INSERT INTO orgs_fts(rowid, org_name, mission, overseas_mission, overseas_projects,
                       overseas_regions, overseas_services, service_mode, go_out_level)
  VALUES (new.id, new.org_name, new.mission, new.overseas_mission, new.overseas_projects,
          new.overseas_regions, new.overseas_services, new.service_mode, new.go_out_level);
END;

CREATE TRIGGER IF NOT EXISTS orgs_ad AFTER DELETE ON orgs BEGIN
  INSERT INTO orgs_fts(orgs_fts, rowid, org_name, mission, overseas_mission, overseas_projects,
                       overseas_regions, overseas_services, service_mode, go_out_level)
  VALUES ('delete', old.id, old.org_name, old.mission, old.overseas_mission, old.overseas_projects,
          old.overseas_regions, old.overseas_services, old.service_mode, old.go_out_level);
END;

CREATE TRIGGER IF NOT EXISTS orgs_au AFTER UPDATE ON orgs BEGIN
  INSERT INTO orgs_fts(orgs_fts, rowid, org_name, mission, overseas_mission, overseas_projects,
                       overseas_regions, overseas_services, service_mode, go_out_level)
  VALUES ('delete', old.id, old.org_name, old.mission, old.overseas_mission, old.overseas_projects,
          old.overseas_regions, old.overseas_services, old.service_mode, old.go_out_level);
  INSERT INTO orgs_fts(rowid, org_name, mission, overseas_mission, overseas_projects,
                       overseas_regions, overseas_services, service_mode, go_out_level)
  VALUES (new.id, new.org_name, new.mission, new.overseas_mission, new.overseas_projects,
          new.overseas_regions, new.overseas_services, new.service_mode, new.go_out_level);
END;

CREATE TRIGGER IF NOT EXISTS policies_ai AFTER INSERT ON policies BEGIN
  INSERT INTO policies_fts(rowid, title, doc_type, issuer_1, issuer_2, issuer_3, issuer_4)
  VALUES (new.id, new.title, new.doc_type, new.issuer_1, new.issuer_2, new.issuer_3, new.issuer_4);
END;

CREATE TRIGGER IF NOT EXISTS policies_ad AFTER DELETE ON policies BEGIN
  INSERT INTO policies_fts(policies_fts, rowid, title, doc_type, issuer_1, issuer_2, issuer_3, issuer_4)
  VALUES ('delete', old.id, old.title, old.doc_type, old.issuer_1, old.issuer_2, old.issuer_3, old.issuer_4);
END;

CREATE TRIGGER IF NOT EXISTS policies_au AFTER UPDATE ON policies BEGIN
  INSERT INTO policies_fts(policies_fts, rowid, title, doc_type, issuer_1, issuer_2, issuer_3, issuer_4)
  VALUES ('delete', old.id, old.title, old.doc_type, old.issuer_1, old.issuer_2, old.issuer_3, old.issuer_4);
  INSERT INTO policies_fts(rowid, title, doc_type, issuer_1, issuer_2, issuer_3, issuer_4)
  VALUES (new.id, new.title, new.doc_type, new.issuer_1, new.issuer_2, new.issuer_3, new.issuer_4);
END;