
# Projeto NestJS com Docker — Guia para Rodar e Escalar

## Variáveis de Ambiente

O projeto utiliza um arquivo `.env` para configurar diversas opções importantes, tais como:

| Variável                | Descrição                                              | Exemplo                        |
|------------------------|--------------------------------------------------------|-------------------------------|
| `PORT`                 | Porta onde a API NestJS será exposta                   | `3000`                        |
| `NODE_ENV`             | Ambiente da aplicação (ex: local, development, production) | `local`                       |
| `DATABASE_CONNECTION`  | Tipo de banco de dados (usamos postgres)               | `postgres`                    |
| `DATABASE_HOST`        | Host do banco de dados (no Docker, o serviço `db`)     | `db`                          |
| `DATABASE_PORT`        | Porta do banco (geralmente 5432 para postgres)         | `5432`                        |
| `DATABASE_USERNAME`    | Usuário do banco                                        | `postgres`                    |
| `DATABASE_PASSWORD`    | Senha do banco                                         | `postgres`                    |
| `DATABASE_NAME`        | Nome do banco                                         | `myapp`                       |
| `DATABASE_SCHEMA`      | Schema do banco de dados                               | `public`                      |
| `TYPEORM_MIGRATIONS`   | Caminho para os arquivos de migração do TypeORM        | `dist/database/migrations/*.js` |
| `TYPEORM_SYNCHRONIZE`  | Habilita sincronização automática do schema (true/false) | `true`                        |
| `TYPEORM_MIGRATIONS_RUN`| Controla execução automática das migrations (true/false) | `true`                        |
| `ALGORITHM`            | Algoritmo de criptografia usado                         | `aes-256-cbc`                 |
| `ENCRYPT_SECRET_KEY`   | Chave secreta para criptografia (deve ser segura)      | `3e8bf28781e2982f...`         |
| `ENCRYPT_IV`           | Vetor de inicialização para criptografia                | `69c8e8c9f3cac123d397d4d9...`|
| `JWT_SECRET`           | Chave secreta para assinatura JWT                       | `5dfbe3e018d1b2ab0...`        |
| `JWT_EXPIRATION_TIME`  | Tempo de expiração do token JWT                          | `3h`                          |
| `SHORT_URL_CHAR_SIZE`  | Tamanho dos códigos gerados para URLs encurtadas        | `6`                           |

> **Importante:** Nunca compartilhe seu `.env` real com chaves secretas ou senhas. Utilize o `.env.example` como modelo para criação.

---

## Como executar o projeto localmente

### Pré-requisitos

- Docker e Docker Compose instalados na máquina.
- Node.js e npm (opcional, para rodar fora do Docker).

### Passos para rodar via Docker

1. Copie o arquivo de exemplo e configure seu `.env`:

```bash
cp .env.example .env
# Edite o .env para adicionar suas configurações reais
```

2. Build e start dos containers:

```bash
docker-compose up --build
```

3. Acesse a aplicação em:

[http://localhost:3000](http://localhost:3000)

---

## Estrutura do Docker Compose

- Serviço **api**: container que roda a aplicação NestJS em modo de desenvolvimento (`npm run start:dev`), mapeando a porta 3000.
- Serviço **db**: container com PostgreSQL versão 15, porta exposta `4432` no host, conectada internamente à porta `5432`.
- Volume **postgres-data**: para persistência dos dados do banco.

---

## Dockerfile

- Usa imagem oficial `node:20`.
- Instala dependências com cache via `package*.json`.
- Copia o projeto e expõe a porta 3000.
- Roda o NestJS em modo desenvolvimento.

## Logging com Winston e rastreabilidade
- Neste projeto, foi adicionado o Winston como biblioteca de logging para capturar logs estruturados e detalhados.

- Recursos importantes implementados:
  -Inclusão de traceId em cada log para rastrear requisições distribuídas e identificar o fluxo completo de uma operação em múltiplas instâncias.

  -Captura do endereço IP do cliente para identificar origem da requisição.

  -Configuração para integrar com sistemas de monitoramento e análise de logs.



---

## Desafios e Considerações para Escalabilidade Horizontal

Ao rodar múltiplas instâncias da API para distribuir carga (escalar horizontalmente), alguns desafios surgem:

### 1. Conexões simultâneas ao banco de dados

- O banco deve suportar múltiplas conexões simultâneas.
- Configuração do pool de conexões deve ser otimizada.
- Possível uso de proxy de conexão (PgBouncer) para melhor performance.

### 2. Estado da aplicação

- Evitar armazenar estado em memória local da instância.
- Usar serviços externos para sessões e cache, ex: Redis.

### 3. Consistência e concorrência

- Garantir idempotência em operações.
- Usar transações e locks para evitar conflitos.

### 4. Logs e monitoramento

- Logs precisam ser centralizados para facilitar análise.
- Ferramentas recomendadas: ELK Stack, Loki, Grafana.

### 5. Balanceamento de carga

- Usar load balancers para distribuir requisições.
- Configurar health checks para detectar instâncias não saudáveis.

### 6. Deploy contínuo

- Deploys coordenados para evitar downtime.
- Técnicas: rolling updates, blue-green deploy.

---
