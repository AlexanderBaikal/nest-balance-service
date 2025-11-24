# Balance Service (NestJS + PostgreSQL)

Small NestJS + TypeScript example that debits a user balance and records history in PostgreSQL. Balance is recalculated from history after each operation.

## Run locally

```bash
npm install
npm run start:dev
```

Env vars (defaults in `src/config/configuration.ts`):

```
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=balances
```

## Docker

1. Create `.env` from example:
   ```bash
   cp .env.example .env
   ```
   Adjust password/port if needed.
2. Start DB and API:
   ```bash
   docker compose up --build
   ```
   API: `http://localhost:3000`, Postgres: `localhost:5432` (creds from `.env`).
3. Apply migrations inside the container (if DB is empty):
   ```bash
   docker compose run --rm api npm run migration:run
   ```

## Migrations

Includes a migration to create the schema and seed user `id=1`.

- Run (Postgres reachable, env vars set):
  ```bash
  npm run migration:run
  ```
- Revert:
  ```bash
  npm run migration:revert
  ```
- Via docker compose (if DB is in a container):
  ```bash
  docker compose run --rm api npm run migration:run
  ```

## DB schema (example)

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  balance NUMERIC(15,2) NOT NULL DEFAULT 0
);

CREATE TABLE payment_history (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(32) NOT NULL, -- debit | credit
  amount NUMERIC(15,2) NOT NULL,
  ts TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO users (id, balance) VALUES (1, 0) ON CONFLICT (id) DO NOTHING;
```

## Endpoints

- `GET /users/:id` — fetch user and balance (cached in memory).
- `POST /users/:id/debit` — debit. Body: `{ "amount": 100 }`.
- `POST /users/:id/credit` — credit. Body: `{ "amount": 100 }`.

Example:

```bash
curl -X POST http://localhost:3000/users/1/debit \
  -H "Content-Type: application/json" \
  -d '{"amount": 100}'
```

Response:

```json
{ "balance": 900 }
```

## Implementation notes

- Transaction + `SELECT ... FOR UPDATE` in `UsersService` serialize debits.
- After writing history, balance is recalculated via aggregate on `payment_history` so `users.balance` always matches history.
- Input validation via `class-validator` and global `ValidationPipe`.
- In-memory cache (`@nestjs/cache-manager`) stores balance and refreshes after successful debit.

## Possible improvements

- Add generated TypeORM migrations, integration tests, and Redis for cache.
