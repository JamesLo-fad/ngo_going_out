BEGIN TRANSACTION;

-- 1) Temp staging table for updates
CREATE TEMP TABLE tmp_updates (
id INTEGER PRIMARY KEY,
org_name TEXT,
logo_url TEXT
);

-- 2) Paste your batch here
INSERT INTO tmp_updates (id, org_name, logo_url) VALUES
(11, '阿里巴巴公益基金会', 'https://drive.google.com/uc?export=view&id=1k97W8kOhqSTqhcteBCJWxgrbLLRczEOE'),
(12, '示例机构A', 'https://drive.google.com/uc?export=view&id=FILE_ID_A'),
(13, '示例机构B', 'https://drive.google.com/uc?export=view&id=FILE_ID_B');

-- 3a) Upsert (insert new + update existing)
INSERT INTO orgs (id, org_name, logo_url)
SELECT id, org_name, logo_url FROM tmp_updates
ON CONFLICT(id) DO UPDATE SET
org_name = excluded.org_name,
logo_url = excluded.logo_url;

-- 3b) If you want update-only, use this instead of 3a:
-- UPDATE orgs
-- SET org_name = COALESCE(t.org_name, orgs.org_name),
-- logo_url = COALESCE(t.logo_url, orgs.logo_url)
-- FROM tmp_updates t
-- WHERE orgs.id = t.id;

DROP TABLE tmp_updates;

COMMIT;