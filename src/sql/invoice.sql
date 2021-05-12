-- make a new invoice
INSERT INTO invoices(opened, due, price, currency) VALUES(
  SELECT datetime("now", "unixepoch"),
  SELECT datetime(@d, "unixepoch"),
  ?, -- 0.75
  ?  -- €
);
