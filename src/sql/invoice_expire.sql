-- ran when an invoice is paid or closed
DELETE FROM invoices WHERE id = ?;
