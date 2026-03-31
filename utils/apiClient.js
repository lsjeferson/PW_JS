/**
 * Função utilitária para chamadas de API.
 * @param {string} url URL da API.
 * @param {Object} [options] Opções da requisição.
 * @param {'GET'|'POST'|'PUT'|'PATCH'|'DELETE'} [options.method]
 * @param {Object} [options.headers]
 * @param {any} [options.body]
 * @returns {Promise<{status:number, headers: Headers, data:any}>}
 */
async function callApi(url, options = {}) {
  const {
    method = 'GET',
    headers = { 'Content-Type': 'application/json' },
    body,
  } = options;

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  return {
    status: response.status,
    headers: response.headers,
    data,
  };
}

module.exports = { callApi };
