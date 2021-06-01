-- register a new user
<<<<<<< HEAD
INSERT INTO users(registered, name) VALUES(
  SELECT datetime("now", "unixepoch"),
  ? -- John Doe
=======
INSERT INTO users(registered, name, email, password, salt, verified) VALUES(
  SELECT datetime("now", "unixepoch"),
  ?, -- John Doe
  ?, -- johndoe@example.com
  ?, -- Hashed Password
  ?, -- Extra Salt for Password (Secondary not Primary)
  0
>>>>>>> main
);
