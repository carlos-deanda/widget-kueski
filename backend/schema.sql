CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE,
  password TEXT,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  credit_rating INTEGER NOT NULL DEFAULT 3 CHECK (credit_rating BETWEEN 1 AND 5),
  credit_remaining NUMERIC(10, 2) NOT NULL DEFAULT 0,
  identidad_verificada BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password TEXT;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS credit_rating INTEGER NOT NULL DEFAULT 3 CHECK (credit_rating BETWEEN 1 AND 5);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS credit_remaining NUMERIC(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS identidad_verificada BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  store_name TEXT,
  current_price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchases (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  product_id INTEGER REFERENCES products(id),
  status TEXT NOT NULL DEFAULT 'active',
  original_price NUMERIC(10, 2) NOT NULL,
  fee_amount NUMERIC(10, 2) DEFAULT 0,
  total_cost NUMERIC(10, 2) NOT NULL,
  installment_amount NUMERIC(10, 2) NOT NULL,
  total_installments INTEGER NOT NULL,
  completed_installments INTEGER DEFAULT 0,
  next_payment_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  purchase_id INTEGER REFERENCES purchases(id),
  installment_number INTEGER NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  due_date DATE NOT NULL,
  paid_at TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS price_trackings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  product_id INTEGER REFERENCES products(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE price_trackings
  DROP COLUMN IF EXISTS target_price;

CREATE TABLE IF NOT EXISTS price_history (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  price NUMERIC(10, 2) NOT NULL,
  recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS login_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  logged_in_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('single', 'biweekly')),
  single_term_days INTEGER,
  biweekly_payments INTEGER,
  interest_rate NUMERIC(5, 4) NOT NULL,
  interest_amount NUMERIC(10, 2) NOT NULL,
  total_amount NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved',
  created_at TIMESTAMP DEFAULT NOW()
);
