-- initialize all tables
-- users
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER   PRIMARY KEY,
  registered TIMESTAMP NOT NULL,
  name       TEXT      NOT NULL
);

-- servers
CREATE TABLE IF NOT EXISTS servers (
  id       INTEGER   PRIMARY KEY,
  opened   TIMESTAMP NOT NULL,
  name     TEXT      NOT NULL,
  location TEXT      NOT NULL DEFAULT "na" -- eu, us...
);

-- receipts
CREATE TABLE IF NOT EXISTS receipts (
  id       INTEGER   PRIMARY KEY,
  opened   TIMESTAMP NOT NULL,
  price    FLOAT     NOT NULL DEFAULT 0.00,
  currency TEXT      NOT NULL DEFAULT '€'
);
