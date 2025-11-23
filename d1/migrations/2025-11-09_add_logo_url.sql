-- Run only if your orgs table already existed without logo_url
ALTER TABLE orgs ADD COLUMN logo_url TEXT;