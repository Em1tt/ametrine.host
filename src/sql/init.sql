-- initialize all sql tables needed
-- user accounts
CREATE TABLE IF NOT EXISTS Users (
  id      int  NOT null PRIMARY KEY, -- user id
  name    text DEFAULT "User",       -- user name
  servers text NOT null              -- format: server1,server2...
);

-- all servers hosted
CREATE TABLE IF NOT EXISTS Servers (
  id    int   NOT null PRIMARY KEY, -- server id
  name  text  DEFAULT "Server",     -- server name
  owner int   NOT null,             -- server owner id
  price float NOT null,             -- how much is billed/mo
  ip    text  NOT null              -- server ip
);
