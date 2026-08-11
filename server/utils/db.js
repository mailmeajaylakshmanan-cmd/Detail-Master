const db = require('../db');

/**
 * Build a single multi-row INSERT statement.
 * Turns `INSERT ... VALUES ($1,$2),($3,$4),...` so a loop of N round-trips to
 * a remote database (Neon) becomes exactly ONE round-trip.
 *
 * @param {string} table  - table name (hard-coded call sites only)
 * @param {string[]} columns - column names (hard-coded call sites only)
 * @param {Array<Array>} rows  - array of row arrays, each aligned to `columns`
 * @returns {{ text: string, params: unknown[] } | null} null when `rows` is empty
 */
function buildBulkInsert(table, columns, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const nCols = columns.length;
  const valueClauses = [];
  const params = [];

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const cols = [];
    for (let c = 0; c < nCols; c++) {
      params.push(row[c]);
      cols.push(`$${params.length}`);
    }
    valueClauses.push(`(${cols.join(', ')})`);
  }

  return {
    text: `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${valueClauses.join(', ')} RETURNING *`,
    params,
  };
}

/**
 * Batch insert helper bound to the shared pool.
 * @returns {Promise<Array>} inserted rows
 */
async function bulkInsert(table, columns, rows) {
  const q = buildBulkInsert(table, columns, rows);
  if (!q) return [];
  const { rows: inserted } = await db.query(q.text, q.params);
  return inserted;
}

/**
 * Batch insert inside an existing transaction.
 * @param {object} client - a `pg.Client` from `db.pool.connect()` inside BEGIN/COMMIT
 * @returns {Promise<Array>} inserted rows
 */
async function bulkInsertWith(client, table, columns, rows) {
  const q = buildBulkInsert(table, columns, rows);
  if (!q) return [];
  const { rows: inserted } = await client.query(q.text, q.params);
  return inserted;
}

module.exports = { buildBulkInsert, bulkInsert, bulkInsertWith };
