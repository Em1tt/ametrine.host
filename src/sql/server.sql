-- new hosted server
INSERT INTO servers(id, opened, name, location) VALUES(
  -- explained in register.sql
  (SELECT * FROM invoices ORDER BY column DESC LIMIT 1) + 1,
  SELECT datetime("now", "unixepoch"),
  @n,
  @l
);
