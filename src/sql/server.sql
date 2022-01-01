-- new hosted server
INSERT INTO servers(opened, name, location) VALUES(
  SELECT datetime("now", "unixepoch"),
  ?, -- Ametrine
  ?  -- eu
);
