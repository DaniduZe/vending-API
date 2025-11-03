import pool from '../config/db.js';

export const OrdersModel = {
  async create({ machine_id, customer_id, payload }) {
    const { rows } = await pool.query(
      'INSERT INTO orders (machine_id, customer_id, payload) VALUES ($1, $2, $3) RETURNING *',
      [machine_id, customer_id || null, JSON.stringify(payload)]
    );
    return rows[0];
  },

  async setStatus(id, status) {
    const { rows } = await pool.query(
      'UPDATE orders SET status = $2 WHERE id = $1 RETURNING *',
      [id, status]
    );
    return rows[0];
  },

  async byId(id) {
    const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    return rows[0];
  },

  async findAll() {
  const { rows } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
  return { rows };
  },

  async findByVendor(vendor_id) {
  const { rows } = await pool.query(
    `SELECT o.* FROM orders o
     JOIN vending_machines vm ON o.machine_id = vm.id
     WHERE vm.vendor_id = $1
     ORDER BY o.created_at DESC`,
    [vendor_id]
  );
  return { rows };
  },

};
