const { Client } = require('pg');

/**
 * Executa um comando SQL em banco Postgres.
 * @param {Object} dbConfig Configuração de conexão (host, user, password, database, port, ssl).
 * @param {string} query SQL a ser executado.
 * @param {Array<any>} [params] Parâmetros opcionais da query.
 * @returns {Promise<import('pg').QueryResult<any>>}
 */
async function executePostgresCommand(dbConfig, query, params = []) {
  const client = new Client(dbConfig);

  await client.connect();
  try {
    const result = await client.query(query, params);
    return result;
  } finally {
    await client.end();
  }
}

module.exports = { executePostgresCommand };
