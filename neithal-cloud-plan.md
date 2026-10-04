# Neithal Cloud — Implementation Plan

**Project:** Replace Supabase with a self-hosted backend  
**Infrastructure cost:** ₹0 / month  
**Timeline:** 12 weeks  
**Author:** Janeshvara Premnath, Adappt

---

## Table of Contents

1. [Prerequisites & Tools](#1-prerequisites--tools)
2. [Phase 1 — Local Development (Weeks 1–2)](#2-phase-1--local-development-weeks-12)
3. [Phase 2 — Oracle Cloud Deployment (Weeks 3–4)](#3-phase-2--oracle-cloud-deployment-weeks-34)
4. [Phase 3 — Attendance Migration (Weeks 5–6)](#4-phase-3--attendance-migration-weeks-56)
5. [Phase 4 — Full Module Migration (Weeks 7–10)](#5-phase-4--full-module-migration-weeks-710)
6. [Phase 5 — Go-Live & Supabase Retirement (Weeks 11–12)](#6-phase-5--go-live--supabase-retirement-weeks-1112)
7. [Backup Strategy](#7-backup-strategy)
8. [Key Configuration Files](#8-key-configuration-files)
9. [Security Checklist](#9-security-checklist)
10. [Rollback Procedure](#10-rollback-procedure)

---

## 1. Prerequisites & Tools

Install these on your local machine before starting.

| Tool | Version | Install | Verify |
|------|---------|---------|--------|
| Docker Desktop | Latest | docker.com | `docker --version` |
| Node.js | 20 LTS | nodejs.org | `node --version` |
| NestJS CLI | Latest | `npm i -g @nestjs/cli` | `nest --version` |
| Git | Latest | git-scm.com | `git --version` |
| VS Code | Latest | code.visualstudio.com | — |

**VS Code extensions to install:** Docker (Microsoft), ESLint, Prettier, REST Client

---

## 2. Phase 1 — Local Development (Weeks 1–2)

### Day 1 — Project Setup

- [ ] Create private GitHub repository named `neithal-cloud`
- [ ] Run `nest new neithal-cloud` — choose `npm`
- [ ] Push to GitHub: `git push -u origin main`
- [ ] Create `.env` file in project root (add `.env` to `.gitignore`)

`.env` template:
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=neithal
DB_PASSWORD=change_this_password
DB_NAME=neithaldb
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=generate_a_64_char_random_string
NODE_ENV=development
```

### Day 2 — Docker: PostgreSQL + Redis

Create `docker-compose.yml` in the project root:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - '6379:6379'
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build: .
    restart: unless-stopped
    ports:
      - '3000:3000'
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: ${DB_NAME}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - .:/app
      - /app/node_modules

volumes:
  postgres_data:
```

Start it: `docker compose up -d`

Verify:
```bash
docker compose ps              # both containers show (healthy)
docker exec -it neithal-cloud-postgres-1 psql -U neithal -d neithaldb -c "SELECT version();"
docker exec -it neithal-cloud-redis-1 redis-cli ping   # → PONG
```

### Day 3 — Connect NestJS to Database

Install packages:
```bash
npm install @nestjs/typeorm typeorm pg @nestjs/config
npm install @nestjs/cache-manager cache-manager ioredis
```

- [ ] Configure `TypeOrmModule` in `app.module.ts` using env variables
- [ ] Configure `CacheModule` with Redis
- [ ] Verify NestJS starts with no errors: `npm run start:dev`

### Days 4–6 — Authentication (JWT)

```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
npm install class-validator class-transformer
nest generate module auth
nest generate module users
```

Endpoints to build:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Returns JWT token |
| POST | `/auth/register` | Creates new user |
| GET | `/auth/me` | Returns current user (protected) |

- [ ] Create `User` entity: `id`, `email`, `password_hash`, `role`, `created_at`
- [ ] Implement `JwtAuthGuard` — apply `@UseGuards(JwtAuthGuard)` to protect endpoints
- [ ] Store sessions in Redis (faster than DB lookup on every request)
- [ ] Test with Swagger UI at `http://localhost:3000/api`

### Days 7–10 — Attendance Module

```bash
nest generate module attendance
nest generate controller attendance
nest generate service attendance
```

`Attendance` entity fields: `id`, `staff_id`, `date`, `status`, `check_in`, `check_out`, `version`

Endpoints:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/attendance` | List (with date filter) |
| GET | `/attendance/:id` | Single record |
| POST | `/attendance` | Create |
| PATCH | `/attendance/:id` | Update |

- [ ] All endpoints protected with `JwtAuthGuard`
- [ ] Write unit tests: `npm run test`
- [ ] Confirm data persists after `docker compose down && docker compose up -d`

### Days 11–14 — WebSocket Realtime Events

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
nest generate gateway events
```

**The small-event pattern** — emit only 3 fields, never the full record:

```typescript
// In attendance.service.ts, after every save:
this.eventsGateway.emit('attendance.updated', {
  type: 'attendance.updated',
  id: updated.id,
  version: updated.version,   // ~100 bytes total
});

// Frontend receives event, fetches only the one changed record:
socket.on('attendance.updated', async (event) => {
  const record = await api.get(`/attendance/${event.id}`);
  updateAttendanceRow(record);
});
```

> **Why this matters:** Supabase sends the full table (~500 KB × 11 clients) per change. This pattern sends 100 bytes and lets each client fetch 1 record. 99% bandwidth reduction.

- [ ] `Dockerfile.prod` committed to repo (see Section 8)
- [ ] `nginx.conf` committed to repo (see Section 8)

### Phase 1 Completion Checklist

- [ ] `docker compose up -d` starts all services with no errors
- [ ] `docker compose ps` shows all containers as `Up (healthy)`
- [ ] Login returns a JWT; unprotected route returns 401
- [ ] Attendance CRUD works; data survives container restart
- [ ] WebSocket emits small event on attendance change
- [ ] Swagger UI documents all endpoints at `http://localhost:3000/api`
- [ ] All tests pass: `npm run test`
- [ ] `Dockerfile.prod` and `nginx.conf` committed

---

## 3. Phase 2 — Oracle Cloud Deployment (Weeks 3–4)

### Days 15–16 — Provision Oracle VM

1. Sign up at cloud.oracle.com (credit card for identity only — not charged)
2. **Create Instance:** Compute → Instances → Create Instance
   - Shape: `VM.Standard.A1.Flex` (Always Free) — 2 OCPU, 12 GB RAM
   - Image: Ubuntu 22.04 LTS
   - Upload your SSH public key
3. Note the VM's **public IP address**
4. Open firewall: Security List → add ingress rules for ports 22, 80, 443

Open ports on the VM itself:
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

### Day 17 — Install Docker on Oracle VM

```bash
ssh ubuntu@YOUR_VM_IP
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sudo bash
sudo usermod -aG docker ubuntu
# Log out and back in
docker --version
docker compose version
sudo apt install fail2ban -y    # SSH brute-force protection
```

### Day 18 — Configure Cloudflare

1. Register a domain (~₹800–1,500/year) — the only real cost
2. Add domain to Cloudflare (free plan); update registrar nameservers
3. DNS A record: `api.yourdomain.com` → Oracle VM IP (enable orange cloud proxy)

Deploy production stack:
```bash
cd ~/neithal-cloud
cp .env.example .env    # fill in production secrets
docker compose -f docker-compose.prod.yml up -d --build
```

Verify: `curl https://api.yourdomain.com/health` → `{"status":"ok"}`

### Days 19–20 — GitHub Actions Auto-Deploy

Add secrets in GitHub → Settings → Secrets and variables → Actions:
- `ORACLE_HOST` — VM public IP
- `ORACLE_USER` — `ubuntu`
- `ORACLE_SSH_KEY` — your private SSH key

Create `.github/workflows/deploy.yml` (see Section 8)

From now on: **push to `main` → deploys automatically in ~3 minutes.**

### Day 21 — Monitoring Setup

- [ ] Sign up at uptimerobot.com (free) — monitor `https://api.yourdomain.com/health` every 5 minutes
- [ ] Set up email alert for downtime
- [ ] Configure Docker log rotation (see Section 9)
- [ ] Install Prometheus + Grafana containers for self-hosted metrics

### Phase 2 Completion Checklist

- [ ] Oracle VM running, SSH accessible
- [ ] Docker + Docker Compose installed on Oracle VM
- [ ] Domain registered and pointing to VM via Cloudflare
- [ ] HTTPS padlock visible in browser
- [ ] API responding at `https://api.yourdomain.com`
- [ ] GitHub Actions deploys successfully on push to `main`
- [ ] Fail2ban active
- [ ] UptimeRobot monitoring configured
- [ ] Backup script tested (see Section 7)

---

## 4. Phase 3 — Attendance Migration (Weeks 5–6)

> **Rule:** Always migrate one module at a time. Keep Supabase running as a fallback. Only cut over after 5 consecutive days of zero errors.

### Feature Flag Pattern

In your frontend `.env`:
```
NEXT_PUBLIC_USE_NEITHAL_CLOUD=attendance
```

The app reads this and routes listed modules to Neithal Cloud. Add a module name to switch it over; remove it to roll back instantly — **no code deploy required.**

### Week 5 — Migrate Data + Enable for Admin

| Day | Task | Verify |
|-----|------|--------|
| Mon | Write one-time migration script: export Supabase attendance → import to PostgreSQL | Row counts match |
| Tue | Dry run on a copy of data | No errors; spot-check 10 records |
| Wed | Run real migration during off-hours (11 PM) | Row counts and timestamps match |
| Thu | Point Attendance screen at Neithal Cloud API via feature flag | Data loads; realtime events arrive in <200ms |
| Fri | Enable for Admin user only | Zero errors in logs for 24 hours |

### Week 6 — Roll Out to All Users

| Day | Action |
|-----|--------|
| Mon | Enable for Doctor role |
| Tue | Enable for Therapist role |
| Wed | Enable for Nurse role |
| Thu | Enable for remaining roles |
| Fri | Attendance fully on Neithal Cloud; confirm 5 clean days |

### Phase 3 Completion Checklist

- [ ] All attendance records migrated (row count verified)
- [ ] Realtime events arriving in <200ms
- [ ] All user roles using Neithal Cloud attendance
- [ ] 5+ consecutive days with zero errors in logs
- [ ] Supabase attendance still in read-only backup mode (not deleted yet)

---

## 5. Phase 4 — Full Module Migration (Weeks 7–10)

One module per week, in order of increasing data sensitivity.

| Week | Module | Key Tables | Special Care |
|------|--------|-----------|--------------|
| 7 | Appointments | appointments, appointment_types, time_slots | Verify no double-booking logic breaks |
| 8 | Patients | patients, patient_contacts, medical_history | Double-check encryption at rest; treat as sensitive |
| 9 | Treatment & Pharmacy | treatment_plans, prescriptions, pharmacy_stock | Validate drug inventory counts match exactly |
| 10 | Finance & HR | invoices, payments, staff, payroll | Run parallel for 7 days; compare Supabase vs Neithal totals before switching |

**For each module, follow this sequence:**
1. Write and dry-run the migration script
2. Run the real migration off-hours
3. Enable via feature flag for Admin only
4. Wait 24 hours with zero errors
5. Roll out to all user roles over 3–5 days
6. Confirm 5 consecutive clean days before moving to next module

---

## 6. Phase 5 — Go-Live & Supabase Retirement (Weeks 11–12)

| Day | Task |
|-----|------|
| Week 11 Mon | All modules on Neithal Cloud; confirm 2 weeks of clean logs |
| Week 11 Wed | Final full database export from Supabase (archive backup) |
| Week 11 Thu | Remove Supabase URLs and keys from all environment variables |
| Week 11 Fri | Notify all users: Neithal Cloud is now the primary system |
| Week 12 Mon | Pause Supabase free tier (do not delete yet) |
| Week 12 Fri | Archive Supabase export to Google Drive; Supabase retired |

---

## 7. Backup Strategy

**Schedule:** Nightly at 02:00 AM — automatic, no action required.

**Retention:**

| Type | Count Kept |
|------|-----------|
| Daily | 7 |
| Weekly (Sunday) | 4 |
| Monthly (1st) | 3 |

**Setup steps:**

```bash
# 1. Generate encryption key (once — save to password manager immediately)
openssl rand -base64 32 > /home/ubuntu/.backup_key
chmod 600 /home/ubuntu/.backup_key

# 2. Install rclone
curl https://rclone.org/install.sh | sudo bash
rclone config    # follow prompts to add Google Drive as "gdrive"

# 3. Create backup script
nano /home/ubuntu/backup.sh
chmod +x /home/ubuntu/backup.sh

# 4. Add cron job
crontab -e
# Add this line:
0 2 * * * /home/ubuntu/backup.sh >> /home/ubuntu/backup.log 2>&1

# 5. Test immediately
/home/ubuntu/backup.sh
# Check Google Drive: NeithalCloud/Database/Daily/ should have one file
```

**backup.sh:**
```bash
#!/bin/bash
set -euo pipefail
DATE=$(date +%Y-%m-%d)
BACKUP_DIR="/tmp/neithal-backup"
FILENAME="neithal-$DATE.sql.gz.enc"
ENCRYPTION_KEY="/home/ubuntu/.backup_key"

mkdir -p "$BACKUP_DIR"
echo "[$(date)] Starting backup for $DATE"

docker exec neithal-postgres pg_dump -U neithal neithaldb | \
  gzip | \
  openssl enc -aes-256-cbc -salt -pass file:$ENCRYPTION_KEY \
  > "$BACKUP_DIR/$FILENAME"

rclone copy "$BACKUP_DIR/$FILENAME" "gdrive:NeithalCloud/Database/Daily/"
rm -f "$BACKUP_DIR/$FILENAME"
echo "[$(date)] Backup complete"
```

**Restore procedure (if VM is destroyed):**
```bash
# 1. Create new Oracle VM, install Docker
# 2. Download latest backup
rclone copy "gdrive:NeithalCloud/Database/Daily/" /tmp/restore/
# 3. Decrypt
openssl enc -d -aes-256-cbc -pass file:/home/ubuntu/.backup_key \
  -in /tmp/restore/neithal-YYYY-MM-DD.sql.gz.enc | gunzip > /tmp/restore/neithal.sql
# 4. Import
docker exec -i neithal-postgres psql -U neithal neithaldb < /tmp/restore/neithal.sql
# 5. Start stack
docker compose -f docker-compose.prod.yml up -d
```

> **⚠ Critical:** If you lose the `.backup_key` file, your backups cannot be decrypted. Store the key contents in your password manager (Bitwarden, 1Password) the day you generate it.

---

## 8. Key Configuration Files

### Dockerfile.prod

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["node", "dist/main"]
```

### docker-compose.prod.yml

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    # No ports exposed — only api can reach postgres

  redis:
    image: redis:7-alpine
    restart: always
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
    # No ports exposed

  api:
    build:
      context: .
      dockerfile: Dockerfile.prod
    restart: always
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: ${DB_NAME}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      JWT_SECRET: ${JWT_SECRET}
      NODE_ENV: production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - api

volumes:
  postgres_data:
```

### .github/workflows/deploy.yml

```yaml
name: Deploy to Oracle
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.ORACLE_HOST }}
          username: ${{ secrets.ORACLE_USER }}
          key: ${{ secrets.ORACLE_SSH_KEY }}
          script: |
            cd ~/neithal-cloud
            git pull origin main
            docker compose -f docker-compose.prod.yml up -d --build
```

### nginx.conf

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://api:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 9. Security Checklist

### Oracle VM

- [ ] SSH key-based authentication only (no password login)
- [ ] Fail2ban installed and active
- [ ] UFW or iptables: only ports 22, 80, 443 open
- [ ] Automatic security updates: `sudo apt install unattended-upgrades -y`

### Docker (Production)

- [ ] PostgreSQL has **no exposed ports** in `docker-compose.prod.yml`
- [ ] Redis has **no exposed ports** in `docker-compose.prod.yml`
- [ ] `.env` file has `chmod 600` permissions
- [ ] Docker log rotation configured:

```bash
sudo nano /etc/docker/daemon.json
# Add:
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "5"
  }
}
sudo systemctl restart docker
```

### Application

- [ ] All API endpoints protected with `JwtAuthGuard`
- [ ] Passwords hashed with `bcrypt` (never stored plain)
- [ ] JWT secret is a random 64-character string (not a word or phrase)
- [ ] `NODE_ENV=production` set in production environment
- [ ] Swagger UI disabled in production (`if (process.env.NODE_ENV !== 'production')`)
- [ ] Input validation on all endpoints with `class-validator`

### Backups

- [ ] Encryption key stored in password manager
- [ ] Encryption key backed up in a second location
- [ ] Restore procedure tested on a staging database (do this quarterly)

---

## 10. Rollback Procedure

If any module causes errors after migration:

1. Open the frontend `.env`
2. Remove the module name from `NEXT_PUBLIC_USE_NEITHAL_CLOUD`
3. Redeploy the frontend (or restart with new env)

**Result:** The app falls back to Supabase for that module immediately. No data is lost because Supabase was still receiving writes up to the cutover. Investigate the error, fix it, then attempt the migration again.

**Example:**
```bash
# Before (Neithal Cloud handling attendance)
NEXT_PUBLIC_USE_NEITHAL_CLOUD=attendance,appointments

# After rollback (revert to Supabase for appointments)
NEXT_PUBLIC_USE_NEITHAL_CLOUD=attendance
```

---

## Cost Summary

| Service | Monthly Cost |
|---------|-------------|
| Oracle Always Free VM (2 OCPU, 12 GB RAM, 200 GB) | ₹0 |
| Cloudflare DNS + HTTPS + DDoS | ₹0 |
| Cloudflare R2 (up to 10 GB files) | ₹0 |
| GitHub (source + CI/CD) | ₹0 |
| Google Drive backups | ₹0 |
| Self-hosted Prometheus + Grafana | ₹0 |
| **Domain name** | **~₹1,000 / year** |
| **Total** | **₹0/month + ₹1,000/year domain** |

---

*Neithal Cloud — Adappt · September 2026*
