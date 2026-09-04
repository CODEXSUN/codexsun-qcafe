ALTER TABLE menu ADD COLUMN code TEXT;
UPDATE menu SET code = printf('ITM-%03d', id) WHERE code IS NULL;
CREATE UNIQUE INDEX menu_code ON menu(code);

CREATE TABLE order_lines_v2 (
  order_id INTEGER NOT NULL REFERENCES orders(id),
  menu_id INTEGER REFERENCES menu(id),
  item_code TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  price INTEGER NOT NULL CHECK(price > 0)
);
INSERT INTO order_lines_v2(order_id, menu_id, item_code, name, quantity, price)
SELECT order_id, menu_id, printf('ITM-%03d', menu_id), name, quantity, price FROM order_lines;
DROP TABLE order_lines;
ALTER TABLE order_lines_v2 RENAME TO order_lines;
