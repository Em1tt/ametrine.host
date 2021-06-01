-- register a new user
INSERT INTO users(registered, name, email, password, salt, verified) VALUES(
  SELECT datetime("now", "unixepoch"),
  ?, -- John Doe
  ?, -- johndoe@example.com
  ?, -- Hashed Password
  ?, -- Extra Salt for Password (Secondary not Primary)
  0
);
