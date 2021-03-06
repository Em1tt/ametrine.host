-- initialize all tables
CREATE TABLE IF NOT EXISTS users (
  user_id        INTEGER   NOT NULL PRIMARY KEY, -- The Users ID
  registered     TIMESTAMP NOT NULL,             -- When the user registered
  name           TEXT      NOT NULL,             -- The users real name
  email          TEXT      NOT NULL,             -- For contacting the user
  password       TEXT      NOT NULL,             -- Required
  salt           TEXT      NOT NULL,             -- Extra Security, this will be used as an extra salt
  verified       INTEGER   NOT NULL DEFAULT 0,   -- If the user verified their email (1) or if they verified their phone # (2)
  permission_id  INTEGER   NOT NULL DEFAULT 0    -- Users permission ID.
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
  jwt         TEXT      NOT NULL,             -- JWT token (Refresh Token)
  createdIn   TIMESTAMP NOT NULL,             -- When the Token was created
  expiresIn   TIMESTAMP NOT NULL,             -- When the token expires
  ip          TEXT      NOT NULL,             -- Remote Address
  rememberMe  INTEGER   NOT NULL DEFAULT 0    -- Will change what expiresIn should be
);

CREATE TABLE IF NOT EXISTS tickets (
  ticket_id     INTEGER   NOT NULL PRIMARY KEY,       -- Ticket ID
  user_id       INTEGER   NOT NULL,                   -- User ID of who created the ticket.
  subject       TEXT      NOT NULL DEFAULT 'Ticket',  -- Ticket Subject (Or title)
  content       TEXT      NOT NULL DEFAULT 'Message', -- Contents of the ticket.
  category_ids  TEXT      NOT NULL DEFAULT '0,1',     -- Category(s) for the ticket. (0 being billing, and 1 being bug)
  status        INTEGER   NOT NULL DEFAULT 0,         -- Status of the Ticket, if its open (0), or if its closed (1).
  opened        TIMESTAMP NOT NULL,                   -- When the ticket was opened.
  closed        TIMESTAMP NOT NULL DEFAULT 0,         -- When the ticket was closed.
  files         TEXT      NOT NULL DEFAULT 0,         -- Any files that are uploaded. (Will be shown in URL form)
  level         INTEGER   NOT NULL DEFAULT 3,         -- Level of support
  createdIn     TIMESTAMP NOT NULL,                   -- When the ticket was created.
  editedIn      TIMESTAMP NOT NULL DEFAULT 0,         -- When the ticket was edited.
  priority      TEXT      NOT NULL DEFAULT 'medium'  -- What priority the ticket is
);

CREATE TABLE IF NOT EXISTS ticket_msgs (
  msg_id     INTEGER   NOT NULL PRIMARY KEY,        -- Message ID
  ticket_id  INTEGER   NOT NULL,                    -- Ticket ID
  user_id    INTEGER   NOT NULL,                    -- User ID of who sent the message.
  content    TEXT      NOT NULL DEFAULT 'Message',  -- Message Content (Encoded in Base64, will probably encrypt in AES256)
  files      TEXT      NOT NULL DEFAULT 0,          -- Any files that are uploaded. (Will be shown in URL form)
  createdIn  TIMESTAMP NOT NULL,                    -- When the message was created.
  editedIn   TIMESTAMP NOT NULL DEFAULT 0           -- When the message was edited.
);

CREATE TABLE IF NOT EXISTS coupons (
  coupon_id    INTEGER   NOT NULL PRIMARY KEY,        -- Coupon ID.
  coupon_name  TEXT      NOT NULL DEFAULT 'CODE25',   -- Coupon Name.
  value        INTEGER   NOT NULL DEFAULT 0.25,       -- Value (percentage) that should be taken off.
  forever      INTEGER   NOT NULL DEFAULT 0,          -- If this coupon should apply in reoccuring payments or not. (0 = False | 1 = True)
  createdIn    TIMESTAMP NOT NULL                     -- When the coupon was created
);

CREATE TABLE IF NOT EXISTS announcements (
  announcement_id      INTEGER   NOT NULL PRIMARY KEY,              -- Announcement ID.
  announcementType     TEXT      NOT NULL DEFAULT 'news',           -- Announcement Type ("outage", "news", "warning")
  announcementText     TEXT      NOT NULL DEFAULT 'Announcement',   -- What the text should show
  deleteIn             TIMESTAMP NOT NULL,                          -- When the announcement should be deleted (or invalid)
  showToCustomersOnly  INTEGER   NOT NULL DEFAULT 0,                 -- If it should only show to users who are logged in (0 = False | 1 = True)
  dateCreated          TIMESTAMP NOT NULL                           -- Date when the announcement was created
);

CREATE TABLE IF NOT EXISTS themes (
  theme_id      INTEGER   NOT NULL PRIMARY KEY,                                           -- Theme ID.
  themeName     TEXT      NOT NULL DEFAULT 'Default Theme',                               -- Name of the Theme.
  themeDesc     TEXT      NOT NULL DEFAULT 'Tell us about your artwork, URLs allowed!',   -- Theme description.
  themeAuthor   INTEGER   NOT NULL,                                                       -- Account ID of the Author.
  themeColors   TEXT      NOT NULL,                                                       -- Hex data
  dateCreated   TIMESTAMP NOT NULL                                                        -- When the Theme was uploaded.
);