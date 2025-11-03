import pool from '../config/db.js';

export const ProductsModel = {
  //
  // 🧩 Create new product (Admin or Vendor)
  //
  async create({ sku, name, price_cents, created_by }) {
    const { rows } = await pool.query(
      `INSERT INTO products (sku, name, price_cents, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [sku, name, price_cents, created_by]
    );
    return rows[0];
  },

  //
  // 🧩 Get all products (Admin or Customer)
  //
  async all() {
    const { rows } = await pool.query(
      'SELECT * FROM products ORDER BY name;'
    );
    return rows;
  },

  //
  // 🧩 Get product by ID
  //
  async byId(id) {
    const { rows } = await pool.query(
      'SELECT * FROM products WHERE id = $1',
      [id]
    );
    return rows[0];
  },

  //
  // 🧩 Get all products created by a specific vendor
  //
  async byCreator(user_id) {
    const { rows } = await pool.query(
      'SELECT * FROM products WHERE created_by = $1 ORDER BY name;',
      [user_id]
    );
    return rows;
  }
};
