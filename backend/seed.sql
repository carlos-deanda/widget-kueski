INSERT INTO users (id, name, username, password, email, phone, credit_rating, credit_remaining, identidad_verificada)
VALUES
  (1, 'Ana Martinez', 'ana', 'ana123', 'ana@kueski.local', NULL, 5, 9800.00, FALSE),
  (2, 'Luis Gomez', 'luis', 'luis123', 'luis@kueski.local', NULL, 3, 2750.00, FALSE),
  (3, 'Marta Ruiz', 'marta', 'marta123', 'marta@kueski.local', NULL, 1, 350.00, FALSE),
  (4, 'Carlos Vega', 'carlos', 'carlos123', 'carlos@kueski.local', NULL, 4, 6200.00, FALSE),
  (5, 'Sofia Torres', 'sofia', 'sofia123', 'sofia@kueski.local', NULL, 2, 1100.00, FALSE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  username = EXCLUDED.username,
  password = EXCLUDED.password,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  credit_rating = EXCLUDED.credit_rating,
  credit_remaining = EXCLUDED.credit_remaining;

INSERT INTO products (id, name, description, store_name, current_price)
VALUES
  (1, 'Premium Headphones', 'Wireless headphones with active noise cancellation.', 'Demo Store', 1299.99),
  (2, 'Smart Watch Pro', 'Smart watch with health tracking.', 'Demo Store', 849.99),
  (3, 'Ultra HD Monitor', '4K productivity monitor.', 'Demo Store', 2499.99),
  (4, 'Gaming Laptop RTX', 'Gaming laptop with RTX graphics.', 'Demo Store', 1899.99),
  (5, 'Mechanical Keyboard', 'Mechanical keyboard for productivity and gaming.', 'Demo Store', 189.99),
  (6, 'Office Chair Pro', 'Ergonomic office chair.', 'Demo Store', 449.99)
ON CONFLICT (id) DO NOTHING;

INSERT INTO purchases (
  id,
  user_id,
  product_id,
  status,
  original_price,
  fee_amount,
  total_cost,
  installment_amount,
  total_installments,
  completed_installments,
  next_payment_date
)
VALUES
  (1, 1, 1, 'active', 1299.99, 194.99, 1494.98, 162.50, 8, 5, '2026-05-10'),
  (2, 1, 2, 'active', 849.99, 0, 849.99, 106.25, 8, 3, '2026-05-12'),
  (3, 1, 3, 'active', 2499.99, 83.37, 2583.36, 260.42, 10, 2, '2026-05-14'),
  (4, 2, 1, 'active', 1299.99, 131.08, 1431.07, 119.26, 12, 4, '2026-05-11'),
  (5, 2, 5, 'active', 189.99, 15.20, 205.19, 34.20, 6, 2, '2026-05-18'),
  (6, 3, 5, 'active', 189.99, 9.50, 199.49, 49.87, 4, 1, '2026-05-15'),
  (7, 4, 4, 'active', 1899.99, 150.00, 2049.99, 170.83, 12, 6, '2026-05-13'),
  (8, 5, 6, 'active', 449.99, 22.50, 472.49, 78.75, 6, 1, '2026-05-20')
ON CONFLICT (id) DO NOTHING;

INSERT INTO price_trackings (id, user_id, product_id, is_active)
VALUES
  (1, 1, 4, TRUE),
  (2, 1, 5, TRUE),
  (3, 1, 6, TRUE),
  (4, 2, 1, TRUE),
  (5, 2, 3, TRUE),
  (6, 3, 2, TRUE),
  (7, 4, 1, TRUE),
  (8, 4, 4, TRUE),
  (9, 5, 5, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO price_history (product_id, price, recorded_at)
VALUES
  (1, 1499.99, NOW() - INTERVAL '14 days'),
  (1, 1399.99, NOW() - INTERVAL '7 days'),
  (1, 1299.99, NOW()),
  (2, 899.99, NOW() - INTERVAL '14 days'),
  (2, 849.99, NOW()),
  (3, 2699.99, NOW() - INTERVAL '14 days'),
  (3, 2499.99, NOW()),
  (4, 2299.99, NOW() - INTERVAL '14 days'),
  (4, 1999.99, NOW() - INTERVAL '7 days'),
  (4, 1899.99, NOW()),
  (5, 185.99, NOW() - INTERVAL '7 days'),
  (5, 189.99, NOW()),
  (6, 499.99, NOW() - INTERVAL '7 days'),
  (6, 449.99, NOW());
