-- register a new user
INSERT INTO users(registered, name) VALUES(
  SELECT datetime("now", "unixepoch"),
  ? -- John Doe
);
