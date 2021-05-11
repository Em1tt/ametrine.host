-- register a new user
INSERT INTO users (id, created, name) VALUES(
  -- get the most recent entry, it will have the highest id
  (SELECT * FROM users ORDER BY column DESC LIMIT 1) + 1,
  -- timestamp
  SELECT datetime("now"),
  -- name and surname
  @name
)
