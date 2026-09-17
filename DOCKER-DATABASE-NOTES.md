# Docker Database Notes — ContainerGuard

## 1. Current Architecture (Neon PostgreSQL)

Right now, your backend connects to a cloud-hosted PostgreSQL database on Neon.

```
Your Machine
┌─────────────────────────────────────────┐
│                                         │
│  BackEnd (Express)                      │
│    ↓                                    │
│    Prisma ORM                           │
│    ↓                                    │
│    DATABASE_URL ─── Internet ──→ Neon   │
│                                  Cloud  │
│                                  ┌────┐ │
│                                  │ PG │ │
│                                  └────┘ │
│                                         │
│  FrontEnd (Vite)                        │
│    ↓                                    │
│    Axios → http://localhost:5000        │
│                                         │
└─────────────────────────────────────────┘
```

The `DATABASE_URL` in your `.env` file looks like:

```
postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require
```

The hostname (`ep-xxx.neon.tech`) is the Neon cloud server. Your backend
reaches it over the public internet.

---

## 2. Future Architecture (Docker PostgreSQL)

When you Dockerize, PostgreSQL runs as a container alongside your backend.

```
Your Machine — Docker Engine
┌──────────────────────────────────────────────────┐
│  Docker Internal Network (containerguard_default) │
│                                                   │
│  ┌─────────────┐      ┌─────────────┐            │
│  │  backend     │      │  postgres   │            │
│  │  (Express)   │─────→│  (PG 5432)  │            │
│  │  Port 5000   │      │             │            │
│  └─────────────┘      └──────┬──────┘            │
│                              │                    │
│  ┌─────────────┐        Volume                    │
│  │  frontend   │     (pgdata — persists data)     │
│  │  (Vite/Nginx)│                                 │
│  │  Port 5173  │                                  │
│  └─────────────┘                                  │
│                                                   │
└──────────────────────────────────────────────────┘
```

The `DATABASE_URL` changes to:

```
postgresql://containerguard:your_password@postgres:5432/containerguard
```

The hostname is now `postgres` — the Docker Compose service name.

---

## 3. Why Prisma Doesn't Need to Know the Difference

Your Prisma schema says:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Prisma reads `DATABASE_URL` from the environment at runtime. It does not
care whether the PostgreSQL instance is:

- Neon (cloud, with SSL)
- A Docker container (local, without SSL)
- A bare-metal server in a data center

The connection string format is identical. Only the hostname, credentials,
and options (like `sslmode`) change. The Prisma schema file itself stays
exactly the same.

---

## 4. Why DATABASE_URL Changes Between Environments

| Environment          | DATABASE_URL hostname         | Why                                  |
|----------------------|-------------------------------|--------------------------------------|
| Local + Neon         | `ep-xxx.neon.tech`            | Neon's cloud endpoint                |
| Local + Docker PG    | `postgres`                    | Docker Compose service name          |
| Local + native PG    | `localhost`                   | PG installed directly on your machine|
| Production (EC2)     | `postgres`                    | Same Docker Compose network on EC2   |

The hostname is NOT part of the application code. It is an environment
variable. This is why environment configuration exists — so the same code
can run in different environments without modification.

---

## 5. Why "localhost" Does NOT Work from Inside a Docker Container

This is the single most common Docker networking mistake.

When your backend runs **outside Docker** (directly on your machine):

```
backend (your machine) → localhost:5432 → PostgreSQL (your machine)
```

`localhost` means "this machine." Since both are on the same machine, it works.

When your backend runs **inside a Docker container**:

```
backend container → localhost:5432 → ??? (nothing)
```

`localhost` inside the backend container means "the backend container itself."
The PostgreSQL container is a **separate container** with its own network
namespace. It is NOT running inside the backend container.

```
Wrong:  backend container → localhost → ❌ (backend container has no PG)
Right:  backend container → postgres  → ✅ (Docker resolves to PG container)
```

---

## 6. Why the Docker Compose Service Name "postgres" Works as a Hostname

Docker Compose creates an internal DNS system. Every service defined in
`docker-compose.yml` gets a DNS entry matching its service name.

If your `docker-compose.yml` has:

```yaml
services:
  backend:
    # ...
  postgres:
    image: postgres:16-alpine
    # ...
```

Then inside the `backend` container:

- `postgres` resolves to the IP address of the PostgreSQL container
- `backend` resolves to the IP address of the backend container

This is Docker's built-in **service discovery**. No manual IP configuration
needed.

```
backend container
  ↓ DNS lookup: "postgres"
  ↓ Docker resolves to: 172.18.0.3 (example)
  ↓ TCP connection to port 5432
PostgreSQL container (listening on 5432)
```

---

## 7. What Port 5432 Means

`5432` is the **default PostgreSQL port**.

Inside Docker, the PostgreSQL container listens on port 5432.

```yaml
postgres:
  image: postgres:16-alpine
  ports:
    - "5433:5432"   # host:container
```

- `5432` (right side) = the port inside the container. This is what other
  containers use to reach PostgreSQL. The backend uses this.

- `5433` (left side) = the port on your host machine. This lets you connect
  from tools like pgAdmin or `psql` running directly on your machine.

The backend container uses `postgres:5432` (the internal port).
Your local tools use `localhost:5433` (the host-mapped port).

---

## 8. What a Docker Volume Is Used For

Containers are **ephemeral**. When you stop and remove a container, its
filesystem is destroyed. If PostgreSQL stores data inside the container
filesystem, that data disappears.

A Docker **volume** is persistent storage that exists outside the container:

```
PostgreSQL container
  ↓ writes data to /var/lib/postgresql/data
  ↓ which is mapped to
Docker volume: pgdata (on your host disk)
```

When you destroy and recreate the PostgreSQL container, the volume survives.
Your data persists.

---

## 9. Why PostgreSQL Data Should Persist Through a Docker Volume

Without a volume:

```
docker compose down → container removed → DATA LOST
docker compose up   → fresh empty database → tables gone
```

With a volume:

```
docker compose down → container removed → volume preserved
docker compose up   → new container → mounts volume → DATA INTACT
```

Your Prisma migration history, your `container_metrics` table, all stored
metrics — everything survives container restarts.

In `docker-compose.yml`, this looks like:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

---

## 10. How Prisma Migrations Work with a Fresh Docker PostgreSQL

When you start a Docker PostgreSQL container for the first time, the database
is completely empty — no tables, no data.

Your backend's `npm run dev` script runs:

```
npx prisma migrate deploy
```

This command:

1. Reads the migration files in `prisma/migrations/`
2. Connects to the database using `DATABASE_URL`
3. Checks which migrations have already been applied
4. Applies any pending migrations

For a fresh database, it applies `20260917055147_init`, which creates the
`container_metrics` table with all its columns and indexes.

```
Fresh Docker PostgreSQL
  ↓ prisma migrate deploy
  ↓ applies: 20260917055147_init/migration.sql
  ↓ creates: container_metrics table
  ↓ records migration in _prisma_migrations table
  ↓
Database ready ✅
```

This is the same migration that already ran against your Neon database.
The SQL is identical. Prisma doesn't care which PostgreSQL instance it's
talking to — it applies the same schema.

---

## Summary

| Concept                  | Neon (current)              | Docker (next)                        |
|--------------------------|-----------------------------|--------------------------------------|
| PostgreSQL location      | Cloud (Neon)                | Local container                      |
| Hostname in DATABASE_URL | `ep-xxx.neon.tech`          | `postgres` (Compose service name)    |
| Port                     | Default (Neon manages)      | `5432` (container internal)          |
| SSL                      | `sslmode=require`           | Not needed (internal network)        |
| Data persistence         | Managed by Neon             | Docker named volume (`pgdata`)       |
| Schema creation          | Prisma migration            | Same Prisma migration                |
| Application code change  | None                        | None                                 |
| Configuration change     | `.env` DATABASE_URL         | `.env` or Compose env: DATABASE_URL  |
