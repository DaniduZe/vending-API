import pool from '../config/db.js';
import { VendingModel } from './vendingModel.js';

export const InventoryModel = {
  async getInventory(machineId) {
    const table = VendingModel.tableNameForMachine(machineId);
    const { rows } = await pool.query(
      `SELECT p.id AS product_id, p.sku, p.name, p.price_cents, i.quantity
       FROM ${table} i
       JOIN products p ON p.id = i.product_id
       ORDER BY p.name;`
    );
    return rows;
  },

  async upsert(machineId, product_id, quantity) {
    const table = VendingModel.tableNameForMachine(machineId);
    const { rows } = await pool.query(
      `INSERT INTO ${table} (product_id, quantity)
       VALUES ($1, $2)
       ON CONFLICT (product_id) DO UPDATE SET quantity = EXCLUDED.quantity
       RETURNING *;`,
      [product_id, quantity]
    );
    return rows[0];
  },

  async adjustMany(machineId, items) {
    const table = VendingModel.tableNameForMachine(machineId);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const { product_id, delta } of items) {
        const q = await client.query(
          `UPDATE ${table}
           SET quantity = quantity + $2
           WHERE product_id = $1
           RETURNING quantity;`,
          [product_id, delta]
        );
        if (!q.rowCount) throw new Error(`product ${product_id} missing in machine ${machineId}`);
        if (q.rows[0].quantity < 0) throw new Error('quantity would go negative');
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async checkAvailability(machineId, items) {
    const table = VendingModel.tableNameForMachine(machineId);
    for (const it of items) {
      const { rows } = await pool.query(
        `SELECT quantity FROM ${table} WHERE product_id = $1;`,
        [it.product_id]
      );
      const qty = rows[0]?.quantity ?? 0;
      if (qty < it.quantity) return false;
    }
    return true;
  }
};
