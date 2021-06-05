-- initialize all tables
CREATE TABLE IF NOT EXISTS users (
  user_id    INTEGER   NOT NULL PRIMARY KEY, -- The Users ID
  registered TIMESTAMP NOT NULL,             -- When the user registered
  name       TEXT      NOT NULL,             -- The users real name
  email      TEXT      NOT NULL,             -- For contacting the user
  password   TEXT      NOT NULL,             -- Required
  salt       TEXT      NOT NULL,             -- Extra Security, this will be used as an extra salt
  verified   INTEGER   NOT NULL DEFAULT 0    -- If the user verified their email (1) or if they verified their phone # (2)
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

CREATE TABLE IF NOT EXISTS sessions (
  session_id  INTEGER   NOT NULL PRIMARY KEY, -- Session ID
  user_id     INTEGER   NOT NULL,             -- User ID
  jwt         TEXT      NOT NULL,             -- JWT token
  createdIn   TIMESTAMP NOT NULL,             -- When the Token was created
  expiresIn   TIMESTAMP NOT NULL,             -- When the token expires
  ip          TEXT      NOT NULL,             -- Remote Address
  rememberMe  INTEGER   NOT NULL DEFAULT 0    -- Will change what expiresIn should be
);
