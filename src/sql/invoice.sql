-- make a new invoice
INSERT INTO invoices(id, opened, due, price, currency) VALUES(
  -- explained in register.sql
  (SELECT * FROM invoices ORDER BY column DESC LIMIT 1) + 1,
  SELECT datetime("now", "unixepoch"),
  SELECT datetime(@d, "unixepoch"),
  @p,
  @c
);
