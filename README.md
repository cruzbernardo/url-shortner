# URL Shortener - Encurtador de URLs com NestJS

Aplicação moderna de encurtamento de URLs construída com NestJS, TypeORM, PostgreSQL, Redis e RabbitMQ, com arquitetura modular e resiliente.

## 📋 Índice

- [Características](#características)
- [Arquitetura](#arquitetura)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Como Executar](#como-executar)
- [Testes](#testes)

---

## ✨ Características

- ✅ **Encurtamento de URLs** com geração de códigos únicos (MD5 hash)
- ✅ **Autenticação JWT** com guards globais
- ✅ **Rate Limiting e Throttling** para proteção contra abuso
- ✅ **Cache Redis** com estratégias Cache-Aside e Write-Through
- ✅ **Analytics Assíncrono** com RabbitMQ e triple-fallback resilience
- ✅ **Logs Estruturados** com Winston e rastreamento distribuído (traceId)
- ✅ **Health Checks** para monitoramento
- ✅ **Soft Deletes** para recuperação de dados
- ✅ **Arquitetura Modular** pronta para escalabilidade horizontal

---

## 🏗️ Arquitetura

### Estrutura de Módulos

```
src/
├── modules/
│   ├── urls/           # Domínio de URLs (encurtamento, redirecionamento)
│   ├── users/          # Domínio de Usuários
│   ├── authentication/ # Autenticação JWT
│   └── health/         # Health checks
├── shared/             # Guards, Interceptors, Pipes, Utils
├── database/           # Migrações TypeORM
└── config/             # Configurações (Winston, TypeORM, Swagger, Redis, RabbitMQ)
```

### Performance: Cache + Message Queue

```
GET /r/:code (Redirecionamento)
        ↓
   ┌─────────────┐
   │ Redis Cache │ → Cache HIT (~5ms) ✅
   └─────────────┘
        ↓ MISS
   ┌─────────────┐
   │ PostgreSQL  │ → Busca origem (~50ms)
   └─────────────┘
        ↓
   ┌─────────────┐
   │  RabbitMQ   │ → Publica evento analytics (assíncrono)
   └─────────────┘
        ↓ Fallback se falhar
   ┌─────────────┐
   │ Redis Queue │ → Enfileira para retry
   └─────────────┘
        ↓ Fallback se falhar
   ┌─────────────┐
   │ Direct DB   │ → Incremento direto (garantia)
   └─────────────┘
```

**Triple-Fallback Resilience:**
1. **Nível 1:** RabbitMQ (melhor performance, distribuído)
2. **Nível 2:** Redis Queue (fallback temporário)
3. **Nível 3:** Escrita Direta no BD (garantia de zero perda)

---

## 🔐 Variáveis de Ambiente

### Desenvolvimento Local (Docker Compose)

Copie `.env.local.example` para `.env`:

```bash
cp .env.local.example .env
```

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| **App** |
| `PORT` | Porta da API | `3000` |
| `NODE_ENV` | Ambiente de execução | `local` |
| `SHORT_URL_CHAR_SIZE` | Tamanho dos códigos curtos | `6` |
| **Database** |
| `DATABASE_CONNECTION` | Tipo de banco | `postgres` |
| `DATABASE_HOST` | Host do PostgreSQL | `db` (Docker) |
| `DATABASE_PORT` | Porta do PostgreSQL | `5432` |
| `DATABASE_USERNAME` | Usuário do banco | `postgres` |
| `DATABASE_PASSWORD` | Senha do banco | `postgres` |
| `DATABASE_NAME` | Nome do banco | `myapp` |
| `DATABASE_SCHEMA` | Schema do banco | `public` |
| **TypeORM** |
| `TYPEORM_SYNCHRONIZE` | Sincronização automática do schema | `true` (dev) / `false` (prod) |
| `TYPEORM_MIGRATIONS_RUN` | Executar migrações automaticamente | `true` |
| `TYPEORM_MIGRATIONS` | Caminho das migrações | `dist/database/migrations/*.js` |
| **Encryption** |
| `ALGORITHM` | Algoritmo de criptografia | `aes-256-cbc` |
| `ENCRYPT_SECRET_KEY` | Chave secreta (64 hex chars) | `3e8bf28781e2982f...` |
| `ENCRYPT_IV` | Vetor de inicialização (32 hex chars) | `69c8e8c9f3cac123...` |
| **JWT** |
| `JWT_SECRET` | Chave secreta JWT | `5dfbe3e018d1b2ab0...` |
| `JWT_EXPIRATION_TIME` | Tempo de expiração do token | `3h` ou `7d` |

### Produção (Railway, Leapcell, etc.)

Copie `.env.production.example` e configure:

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| **Redis** (Cache) |
| `REDIS_URL` | Connection string Redis | `redis://default:pass@host:6379` |
| `REDIS_TTL` | TTL do cache (segundos) | `3600` (1 hora) |
| **RabbitMQ** (Analytics) |
| `RABBITMQ_URL` | Connection string RabbitMQ | `amqps://user:pass@host/vhost` |
| `RABBITMQ_EXCHANGE_ANALYTICS` | Nome do exchange | `analytics` |
| `RABBITMQ_QUEUE_URL_ANALYTICS` | Nome da fila | `url-analytics` |

### Gerar Secrets Seguros

```bash
# ENCRYPT_SECRET_KEY (64 hex chars = 32 bytes)
openssl rand -hex 32

# ENCRYPT_IV (32 hex chars = 16 bytes)
openssl rand -hex 16

# JWT_SECRET (base64)
openssl rand -base64 48
```

> ⚠️ **IMPORTANTE:** Nunca compartilhe seu `.env` com secrets reais! Use os arquivos `.example` como template.

---

## 🚀 Como Executar

### Pré-requisitos

- [Docker](https://www.docker.com/) e Docker Compose instalados
- Node.js 20+ (opcional, para rodar localmente sem Docker)

### Opção 1: Docker Compose (Recomendado)

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/url-shortner.git
cd url-shortner

# 2. Configure variáveis de ambiente
cp .env.local.example .env

# 3. Inicie todos os serviços (API + PostgreSQL + Redis + RabbitMQ)
docker-compose up --build

# 4. Acesse a aplicação
# API: http://localhost:3000
# Swagger: http://localhost:3000/api
# RabbitMQ Management: http://localhost:15672 (user: guest, pass: guest)
```

### Opção 2: Local (sem Docker)

```bash
# 1. Instalar dependências
npm install --legacy-peer-deps

# 2. Configure .env para apontar para serviços locais
DATABASE_HOST=localhost
DATABASE_PORT=5432
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# 3. Certifique-se de que PostgreSQL, Redis e RabbitMQ estão rodando

# 4. Executar migrações
npm run migration:run

# 5. Iniciar aplicação
npm run start:dev
```

### Serviços no Docker Compose

| Serviço | Porta Host | Porta Container | Descrição |
|---------|-----------|----------------|-----------|
| `api` | 3000 | 3000 | API NestJS |
| `db` | 4432 | 5432 | PostgreSQL 15 |
| `redis` | 6379 | 6379 | Redis 7-alpine |
| `rabbitmq` | 5672, 15672 | 5672, 15672 | RabbitMQ 3 + Management UI |

---

## 🧪 Testes

### Executar Testes Unitários

```bash
# Rodar todos os testes
npm test

# Rodar com watch mode
npm run test:watch

# Rodar com coverage
npm run test:cov
```

### Executar Testes E2E

```bash
npm run test:e2e
```

### Executar Testes no Docker

```bash
# Testes unitários
npm run docker:test

# Testes com coverage
npm run docker:test:cov

# Testes E2E
npm run docker:test:e2e
```

### Cobertura de Testes

```
Test Suites: 13 passed, 13 total
Tests:       112 passed, 112 total
Snapshots:   0 total
Time:        6.276 s
```

---

## 🔧 Comandos Úteis

### Desenvolvimento

```bash
# Rodar em modo desenvolvimento (hot reload)
npm run start:dev

# Rodar em modo debug
npm run start:debug

# Build para produção
npm run build

# Rodar produção localmente
npm run start:prod
```

### Migrações do Banco

```bash
# Criar nova migração
npm run migration:create --name=NomeDaMigracao

# Executar migrações pendentes
npm run migration:run

# Reverter última migração
npm run migration:revert
```

### Docker

```bash
# Reiniciar API
npm run docker:restart

# Ver logs em tempo real
npm run docker:logs

# Abrir shell no container
npm run docker:shell

# Executar comando customizado
npm run docker:exec -- <comando>
```

### Code Quality

```bash
# Lint e auto-fix
npm run lint

# Formatar código com Prettier
npm run format
```

---

## 🏗️ Logging e Rastreabilidade

### Winston Logger

O projeto utiliza **Winston** para logs estruturados com os seguintes recursos:

- **Trace ID:** Cada requisição recebe um `traceId` único (UUID v4) para rastreamento distribuído
- **IP do Cliente:** Captura automática do endereço IP de origem
- **Níveis de Log:** info, warn, error, debug
- **Formato Estruturado:** Logs em JSON para fácil parsing
- **Persistência:** Logs salvos em `/var/log/nest` (configurável)

**Exemplo de log:**
```json
{
  "level": "info",
  "message": "URL created",
  "context": "UrlsService",
  "traceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "ip": "192.168.1.100",
  "timestamp": "2025-01-29T10:15:32.123Z",
  "shortCode": "abc123",
  "userId": "user-uuid"
}
```

### Trace Interceptor

O `TraceInterceptor` captura automaticamente:
- Header `x-trace-id` (se fornecido pelo cliente)
- Gera novo UUID se não houver trace ID
- Injeta no contexto via `nestjs-cls`
- Disponível em todos os services via `ClsService`

---

## 🔒 Segurança

### Camadas de Proteção

1. **Rate Limiting Global:** 100 requisições/minuto por IP
2. **Throttling por Endpoint:** 5 tentativas/minuto para login
3. **Autenticação JWT:** Guards globais com decorator `@Public()` para rotas públicas
4. **Input Validation:** class-validator + class-transformer
5. **Input Sanitization:** class-sanitizer para prevenção de XSS
6. **SQL Injection:** TypeORM com queries parametrizadas
7. **Encryption:** AES-256-CBC para dados sensíveis

---

## 🚀 Escalabilidade Horizontal

### Desafios e Soluções

| Desafio | Solução Implementada |
|---------|---------------------|
| **Conexões ao Banco** | Connection pooling configurado (max: 20) |
| **Estado da Aplicação** | Stateless: usa Redis para cache, sem memória local |
| **Consistência de Cache** | Redis compartilhado entre instâncias |
| **Analytics** | RabbitMQ distribuído com triple-fallback |
| **Logs Distribuídos** | Trace ID para correlação entre instâncias |
| **Health Checks** | Endpoint `/health` para load balancers |

### Escalando com Docker

```bash
# Subir múltiplas instâncias da API
docker-compose up --scale api=3

# Load balancer (Nginx, Traefik, etc.) distribui requisições
```

### Considerações

- **PostgreSQL:** Usar PgBouncer para proxy de conexões em alta escala
- **Redis:** Usar Redis Cluster para sharding automático
- **RabbitMQ:** Cluster com múltiplos nós para alta disponibilidade
- **Monitoring:** ELK Stack, Grafana, Prometheus para observabilidade

---

## 📊 Swagger API Documentation

Acesse a documentação interativa da API:

**Local:** http://localhost:3000/api

**Produção:** `https://seu-dominio.com/api`

A documentação inclui:
- Todos os endpoints disponíveis
- Schemas de request/response
- Autenticação JWT (Bearer token)
- Try it out para testar endpoints

