-- initialize all tables
CREATE TABLE IF NOT EXISTS users (
  user_id    INTEGER   NOT NULL PRIMARY KEY,
  registered TIMESTAMP NOT NULL,
  name       TEXT      NOT NULL,
  password   TEXT      NOT NULL,
  salt       TEXT      NOT NULL
);

CREATE TABLE IF NOT EXISTS servers (
  server_id  INTEGER   NOT NULL PRIMARY KEY,
  opened     TIMESTAMP NOT NULL,
  name       TEXT      NOT NULL,
  location   TEXT      NOT NULL DEFAULT "na" -- eu, us...
);

CREATE TABLE IF NOT EXISTS invoices (
  invoice_id  INTEGER   NOT NULL PRIMARY KEY,
  opened      TIMESTAMP NOT NULL,
  due         TIMESTAMP NOT NULL,
  price       REAL      NOT NULL DEFAULT 0.00,
  currency    TEXT      NOT NULL DEFAULT '€'
);
