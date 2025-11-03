-- Use your existing database
-- CREATE DATABASE vendingdb;

-- 🧍 Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(200) NOT NULL,
  role INT DEFAULT 3, -- 1=admin, 2=vendor, 3=customer
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 🏪 Vending Machines
CREATE TABLE IF NOT EXISTS vending_machines (
  id SERIAL PRIMARY KEY,
  location VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  vendor_id INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 🧃 Product Catalog
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(120) NOT NULL,
  price_cents INT NOT NULL CHECK (price_cents >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 💳 Orders / Purchases
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  machine_id INT NOT NULL REFERENCES vending_machines(id) ON DELETE CASCADE,
  customer_id INT REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending|success|failed
  payload JSONB NOT NULL, -- {product_id, quantity}
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ⏰ Auto-update trigger for "updated_at"
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- 📦 NOTE:
-- Inventory tables are created dynamically per vending machine:
-- e.g. inventory_vm_1, inventory_vm_2 ...
-- Created automatically when you add a new machine.
