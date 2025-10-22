PRAGMA foreign_keys=ON;

-- ORGS
DROP TABLE IF EXISTS orgs;
CREATE TABLE orgs (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  alias TEXT,                 -- optional alternate names
  umbrella_flags TEXT,        -- e.g. "中促会=1,民促会=0,联合国=1"
  founded_year TEXT,          -- keep raw, because source uses formats like 1985——4——1
  go_out_year TEXT,
  leaders TEXT,
  key_staff TEXT,
  capital_type TEXT,
  reg_location TEXT,
  reg_form TEXT,
  donation_pre TEXT,
  donation_pre_year TEXT,
  donation_post TEXT,
  donation_post_year TEXT,
  mission TEXT,
  org_structure TEXT,
  overseas_office TEXT,       -- 是/否
  overseas_mission TEXT,      -- 官网关于海外项目的组织理念——目标
  project_names TEXT,         -- 海外项目的名称 (raw list)
  project_regions TEXT,       -- 海外涉及的地区 (raw list)
  services TEXT,              -- 海外服务内容 (raw list)
  service_forms TEXT,         -- 服务形式
  official_background TEXT,   -- 主要成员是否有官方背景
  sources TEXT,               -- 主要信息来源
  disclosure_online TEXT,     -- 是否有网上披露
  disclosure_continuous TEXT, -- 是否持续性披露
  go_out_degree TEXT,         -- 走出去程度
  slug TEXT,                  -- optional link handle
  summary TEXT                -- optional computed short description
);

-- Derived facets for orgs
DROP TABLE IF EXISTS orgs_facets;
CREATE TABLE orgs_facets (
  org_id INTEGER REFERENCES orgs(id) ON DELETE CASCADE,
  country TEXT,
  sector TEXT,
  PRIMARY KEY (org_id, country, sector)
);

-- FTS for orgs
DROP TABLE IF EXISTS orgs_fts;
CREATE VIRTUAL TABLE orgs_fts USING fts5(
  name,
  mission,
  overseas_mission,
  project_names,
  project_regions,
  services,
  content='orgs',
  content_rowid='id',
  tokenize='unicode61'
);

DROP TRIGGER IF EXISTS orgs_ai;
DROP TRIGGER IF EXISTS orgs_ad;
DROP TRIGGER IF EXISTS orgs_au;

CREATE TRIGGER orgs_ai AFTER INSERT ON orgs BEGIN
  INSERT INTO orgs_fts(rowid, name, mission, overseas_mission, project_names, project_regions, services)
  VALUES (new.id, new.name, new.mission, new.overseas_mission, new.project_names, new.project_regions, new.services);
END;

CREATE TRIGGER orgs_ad AFTER DELETE ON orgs BEGIN
  INSERT INTO orgs_fts(orgs_fts, rowid, name, mission, overseas_mission, project_names, project_regions, services)
  VALUES('delete', old.id, old.name, old.mission, old.overseas_mission, old.project_names, old.project_regions, old.services);
END;

CREATE TRIGGER orgs_au AFTER UPDATE ON orgs BEGIN
  INSERT INTO orgs_fts(orgs_fts, rowid, name, mission, overseas_mission, project_names, project_regions, services)
  VALUES('delete', old.id, old.name, old.mission, old.overseas_mission, old.project_names, old.project_regions, old.services);
  INSERT INTO orgs_fts(rowid, name, mission, overseas_mission, project_names, project_regions, services)
  VALUES (new.id, new.name, new.mission, new.overseas_mission, new.project_names, new.project_regions, new.services);
END;

CREATE INDEX IF NOT EXISTS idx_orgs_name ON orgs(name);
CREATE INDEX IF NOT EXISTS idx_orgs_goout ON orgs(go_out_year);

-- POLICIES
DROP TABLE IF EXISTS policies;
CREATE TABLE policies (
  id INTEGER PRIMARY KEY,
  no TEXT,               -- No.
  publish_date TEXT,     -- 发布时期
  title TEXT,            -- 题目
  attr TEXT,             -- 属性
  dept1 TEXT,            -- 发布单位1
  dept2 TEXT,
  dept3 TEXT,
  dept4 TEXT,
  link TEXT
);

-- FTS for policies
DROP TABLE IF EXISTS policies_fts;
CREATE VIRTUAL TABLE policies_fts USING fts5(
  title,
  attr,
  dept1,
  dept2,
  dept3,
  dept4,
  content='policies',
  content_rowid='id',
  tokenize='unicode61'
);

DROP TRIGGER IF EXISTS policies_ai;
DROP TRIGGER IF EXISTS policies_ad;
DROP TRIGGER IF EXISTS policies_au;

CREATE TRIGGER policies_ai AFTER INSERT ON policies BEGIN
  INSERT INTO policies_fts(rowid, title, attr, dept1, dept2, dept3, dept4)
  VALUES (new.id, new.title, new.attr, new.dept1, new.dept2, new.dept3, new.dept4);
END;

CREATE TRIGGER policies_ad AFTER DELETE ON policies BEGIN
  INSERT INTO policies_fts(policies_fts, rowid, title, attr, dept1, dept2, dept3, dept4)
  VALUES('delete', old.id, old.title, old.attr, old.dept1, old.dept2, old.dept3, old.dept4);
END;

CREATE TRIGGER policies_au AFTER UPDATE ON policies BEGIN
  INSERT INTO policies_fts(policies_fts, rowid, title, attr, dept1, dept2, dept3, dept4)
  VALUES('delete', old.id, old.title, old.attr, old.dept1, old.dept2, old.dept3, old.dept4);
  INSERT INTO policies_fts(rowid, title, attr, dept1, dept2, dept3, dept4)
  VALUES (new.id, new.title, new.attr, new.dept1, new.dept2, new.dept3, new.dept4);
END;