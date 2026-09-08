-- Use the POS row sequence as the customer-facing bill number.
UPDATE pos
SET bill_no = CAST(id AS TEXT);
