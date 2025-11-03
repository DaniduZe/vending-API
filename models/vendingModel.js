import pool from '../config/db.js';

const tableNameForMachine = (machineId) => `inventory_vm_${machineId}`;

export const VendingModel = {
  async create({ location, status, vendor_id }) {
    const result = await pool.query(
      'INSERT INTO vending_machines (location, status, vendor_id) VALUES ($1, $2, $3) RETURNING *',
      [location, status || 'active', vendor_id]
    );
    const machine = result.rows[0];
    const invTable = tableNameForMachine(machine.id);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${invTable} (
        product_id INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
        PRIMARY KEY (product_id)
      );
    `);
    return machine;
  },

  async findAllByVendor(vendorId) {
    const { rows } = await pool.query(
      'SELECT * FROM vending_machines WHERE vendor_id = $1 ORDER BY id',
      [vendorId]
    );
    return rows;
  },

  async findById(id) {
    const result = await pool.query('SELECT * FROM vending_machines WHERE id = $1', [id]);
    return result.rows[0];
  },

  async update(id, { location, status }, vendorId, isAdmin) {
    const cond = isAdmin ? '' : 'AND vendor_id = $4';
    const params = isAdmin ? [location, status, id] : [location, status, id, vendorId];
    const sql = `
      UPDATE vending_machines
      SET location = COALESCE($1, location), status = COALESCE($2, status)
      WHERE id = $3 ${cond}
      RETURNING *;`;
    const { rows } = await pool.query(sql, params);
    return rows[0];
  },

  async remove(id, vendorId, isAdmin) {
    const cond = isAdmin ? '' : 'AND vendor_id = $2';
    const params = isAdmin ? [id] : [id, vendorId];
    const del = await pool.query(`DELETE FROM vending_machines WHERE id = $1 ${cond} RETURNING id;`, params);
    if (del.rowCount) {
      const invTable = tableNameForMachine(id);
      await pool.query(`DROP TABLE IF EXISTS ${invTable};`);
    }
  },

  async findAll() {
  const { rows } = await pool.query('SELECT * FROM vending_machines ORDER BY id');
  return rows;
  },

  async reassignVendor(id, vendor_id) {
  return await pool.query(
    'UPDATE vending_machines SET vendor_id = $2 WHERE id = $1 RETURNING *',
    [id, vendor_id]
  );
  },

  tableNameForMachine,
};
