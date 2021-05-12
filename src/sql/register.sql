-- register a new user
INSERT INTO users(id, registered, name) VALUES(
  -- get the most recent entry, it will have the highest id
  (SELECT * FROM users ORDER BY column DESC LIMIT 1) + 1,
  -- timestamp
  SELECT datetime("now", "unixepoch"),
  -- name and surname
  @n
);
