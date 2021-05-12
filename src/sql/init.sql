-- initialize all tables
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER   NOT NULL DEFAULT 0,
  registered TIMESTAMP NOT NULL,
  name       TEXT      NOT NULL,
  password   TEXT      NOT NULL,
  salt       TEXT      NOT NULL
  PRIMARY KEY("id")
);

CREATE TABLE IF NOT EXISTS servers (
  id       INTEGER   NOT NULL DEFAULT 0,
  opened   TIMESTAMP NOT NULL,
  name     TEXT      NOT NULL,
  location TEXT      NOT NULL DEFAULT "na" -- eu, us...
  PRIMARY KEY("id")
);

CREATE TABLE IF NOT EXISTS invoices (
  id       INTEGER   NOT NULL DEFAULT 0,
  opened   TIMESTAMP NOT NULL,
  due      TIMESTAMP NOT NULL,
  price    REAL      NOT NULL DEFAULT 0.00,
  currency TEXT      NOT NULL DEFAULT '€'
  PRIMARY KEY("id")
);
