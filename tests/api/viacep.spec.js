const { test, expect } = require('@playwright/test');
const { callApi } = require('../../utils/apiClient');

test.describe('API ViaCEP', () => {
  test('deve validar que o logradouro do CEP 89046060 é Rua José Seibt', async () => {
    const response = await callApi('https://viacep.com.br/ws/89046060/json/');

    expect(response.status).toBe(200);
    expect(response.data.logradouro).toBe('Rua José Seibt');
  });
});
