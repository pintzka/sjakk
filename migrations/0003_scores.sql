-- Poeng lagres i egne kolonner (ikke bare inne i fremgangs-JSON-en), så tabellen og
-- vernet mot at en gammel enhet overskriver nyere fremgang kan lese dem direkte.
ALTER TABLE progress ADD COLUMN total_pts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE progress ADD COLUMN week TEXT;
ALTER TABLE progress ADD COLUMN week_pts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE progress ADD COLUMN rush_best INTEGER NOT NULL DEFAULT 0;
ALTER TABLE progress ADD COLUMN rev INTEGER NOT NULL DEFAULT 0;
UPDATE progress SET
  total_pts = COALESCE(json_extract(data, '$.score.total'), 0),
  week = json_extract(data, '$.score.week'),
  week_pts = COALESCE(json_extract(data, '$.score.weekPts'), 0),
  rush_best = COALESCE(json_extract(data, '$.rush.best'), 0);
