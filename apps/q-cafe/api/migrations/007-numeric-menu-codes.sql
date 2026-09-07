-- Normalizes the customer menu to a simple 01–60 cashier entry sequence.
-- Archived entries receive a private legacy code so their old numeric code can be reused safely.

UPDATE menu
SET code = 'LEGACY-' || id
WHERE is_active=0;

WITH customer_menu AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS position
  FROM menu
  WHERE is_active=1
)
UPDATE menu
SET code = (SELECT printf('%02d', position) FROM customer_menu WHERE customer_menu.id = menu.id)
WHERE is_active=1;
