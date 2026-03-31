# Projeto de Automação com Playwright (JavaScript)

Estrutura base de automação de testes usando **Playwright + JavaScript (.js)**, com:

- **Page Object Model (POM)** para UI;
- **Utils de banco Postgres**;
- **Utils para chamadas de API**;
- Teste de UI de exemplo (Google);
- Teste de API de exemplo (ViaCEP).

## Estrutura

```bash
.
├── pages/
│   └── GoogleHomePage.js
├── tests/
│   ├── api/
│   │   └── viacep.spec.js
│   └── ui/
│       └── google-search.spec.js
├── utils/
│   ├── apiClient.js
│   └── dbUtils.js
├── playwright.config.js
└── package.json
```

## Instalação

```bash
npm install
npx playwright install
```

## Execução

```bash
npm run test
npm run test:ui
npm run test:api
```

## Exemplo de uso da função de banco (Postgres)

```js
const { executePostgresCommand } = require('./utils/dbUtils');

(async () => {
  const dbConfig = {
    host: 'localhost',
    user: 'postgres',
    password: 'senha',
    database: 'meu_banco',
    port: 5432,
  };

  const result = await executePostgresCommand(
    dbConfig,
    'SELECT NOW() as data_hora'
  );

  console.log(result.rows);
})();
```
