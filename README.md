# Projeto de Automação com Playwright (JavaScript)

Projeto base em **Playwright + JavaScript** com Page Objects, testes UI/API de exemplo e geração de JSON consolidado por execução (compatível com CI).

## Execução e geração de JSON

### Fluxo padrão (sem mudar forma de rodar)

```bash
npx playwright test
```

Esse comando mantém os testes como já estavam e gera o bruto em:

- `artifacts/raw/playwright-report.json`

### Consolidar JSON final (pós-processamento)

```bash
npm run test:consolidate
```

### Comando único recomendado (CI/local)

```bash
npm run test:ci:json
```

Esse comando:
1. roda `npx playwright test`
2. executa a consolidação mesmo se houver falha
3. retorna o exit code real dos testes

## Caminhos de saída

- Bruto Playwright: `artifacts/raw/playwright-report.json`
- Consolidado final: `artifacts/test-execution/playwright-run-*.json`

## Exemplo realista do JSON final

```json
{
  "runId": "pw-2026-04-02-13-45-10-3f0d8d9a-8ad0-41a6-a536-8eecf8f9cf4d",
  "generatedAt": "2026-04-02T13:45:10.321Z",
  "framework": "playwright",
  "projectName": "playwright-js-automation",
  "projectPath": "grupo/projeto",
  "ciProvider": "gitlab",
  "pipelineId": "123",
  "pipelineIid": "45",
  "jobId": "456",
  "jobName": "e2e-tests",
  "branch": "main",
  "tag": null,
  "commitSha": "8c9d1a2b",
  "environment": "staging",
  "executor": "gitlab-runner-01",
  "runnerId": "88",
  "os": "linux 6.8.0",
  "nodeVersion": "v22.14.0",
  "suite": "smoke",
  "grep": "@smoke",
  "browser": "chromium",
  "rawReportPath": "artifacts/raw/playwright-report.json",
  "finalReportPath": "artifacts/test-execution/playwright-run-2026-04-02-13-45-10-pipeline-123-job-456-e2e-tests-main-smoke-smoke-chromium.json",
  "summary": {
    "totalTests": 2,
    "passed": 1,
    "failed": 1,
    "skipped": 0,
    "timedOut": 0,
    "interrupted": 0,
    "flaky": 0,
    "retries": 1,
    "durationMs": 4210,
    "durationSeconds": 4.21,
    "startTime": "2026-04-02T13:45:06.111Z",
    "endTime": "2026-04-02T13:45:10.321Z",
    "statusFinal": "failed"
  }
}
```

## Exemplo `.gitlab-ci.yml`

> No repositório atual não existe `.gitlab-ci.yml`, então este é o trecho sugerido.

```yaml
stages:
  - test

playwright_tests:
  stage: test
  image: mcr.microsoft.com/playwright:v1.54.1-jammy
  script:
    - npm ci
    - npm run test:ci:json
  artifacts:
    when: always
    expire_in: 30 days
    paths:
      - artifacts/raw/
      - artifacts/test-execution/
```

## Scripts disponíveis

- `npm test` / `npx playwright test`
- `npm run test:raw`
- `npm run test:consolidate`
- `npm run test:ci:json` (recomendado)

## Estrutura relevante

```bash
.
├── artifacts/
│   ├── raw/
│   └── test-execution/
├── playwright.config.js
├── scripts/
│   ├── build-playwright-execution-report.js
│   └── run-playwright-with-json.js
└── tests/
```
