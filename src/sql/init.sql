-- initialize all tables
-- users
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY,
  registered TEXT    NOT NULL,
  name       TEXT    NOT NULL
);

-- servers
CREATE TABLE IF NOT EXISTS servers (
  id       INTEGER PRIMARY KEY,
  opened   TEXT    NOT NULL,
  name     TEXT    NOT NULL,
  location TEXT    NOT NULL DEFAULT "na" -- eu, us...
);
