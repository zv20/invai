# PostgreSQL Setup Guide

**Sprint 4 Phase 1: PostgreSQL Migration**

This guide walks you through setting up InvAI with PostgreSQL for production deployment.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [PostgreSQL Installation](#postgresql-installation)
3. [Database Setup](#database-setup)
4. [Environment Configuration](#environment-configuration)
5. [Data Migration](#data-migration)
6. [Testing](#testing)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Node.js 16+ installed
- PostgreSQL 12+ (recommended: 14+)
- InvAI v0.9.0-beta or later
- Existing SQLite database (if migrating data)

---

## PostgreSQL Installation

### Ubuntu/Debian

```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Check status
sudo systemctl status postgresql
```

### macOS (Homebrew)

```bash
# Install PostgreSQL
brew install postgresql@14

# Start service
brew services start postgresql@14
```

### Windows

Download and install from [postgresql.org/download](https://www.postgresql.org/download/windows/)

---

## Database Setup

### 1. Access PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql
```

### 2. Create Database and User

```sql
-- Create user
CREATE USER invai_user WITH PASSWORD 'your_secure_password_here';

-- Create database
CREATE DATABASE invai_production OWNER invai_user;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE invai_production TO invai_user;

-- Exit psql
\q
```

### 3. Test Connection

```bash
psql -U invai_user -d invai_production -h localhost
```

---

## Environment Configuration

### 1. Copy Environment Template

```bash
cp .env.example .env
```

### 2. Configure PostgreSQL in `.env`

```bash
# Database Configuration
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=invai_production
DATABASE_USER=invai_user
DATABASE_PASSWORD=your_secure_password_here

# Connection Pool (optional - defaults shown)
DATABASE_POOL_MAX=20
DATABASE_POOL_IDLE_TIMEOUT=30000
DATABASE_POOL_CONNECTION_TIMEOUT=2000

# Security (REQUIRED)
JWT_SECRET=generate_a_secure_random_string_here
```

### 3. Generate JWT Secret

```bash
# Linux/macOS
openssl rand -base64 64

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

### 4. Install Dependencies

```bash
npm install
```

This will install the `pg` (node-postgres) driver automatically.

---

## Data Migration

### Option A: Fresh Installation

If starting fresh, just run:

```bash
npm start
```

The migration system will automatically:
- Create all tables
- Set up indexes
- Initialize schema

### Option B: Migrate from SQLite

#### 1. Export Data from SQLite

```bash
# Use the built-in export tool (coming in Phase 2)
# For now, manual migration required
```

#### 2. Manual Migration Script

Create `scripts/migrate-to-postgres.js`:

```javascript
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');

async function migrate() {
  // SQLite connection
  const sqliteDb = new sqlite3.Database('./data/inventory.db');
  
  // PostgreSQL connection
  const pgPool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'invai_production',
    user: 'invai_user',
    password: 'your_password'
  });
  
  // Example: Migrate users table
  sqliteDb.all('SELECT * FROM users', async (err, rows) => {
    if (err) throw err;
    
    for (const row of rows) {
      await pgPool.query(
        'INSERT INTO users (id, username, password, role, email) VALUES ($1, $2, $3, $4, $5)',
        [row.id, row.username, row.password, row.role, row.email]
      );
    }
    
    console.log(`Migrated ${rows.length} users`);
  });
  
  // Repeat for other tables: products, batches, etc.
}

migrate();
```

#### 3. Run Migration

```bash
node scripts/migrate-to-postgres.js
```

---

## Testing

### 1. Test Database Connection

```bash
npm start
```

Look for:
```
✓ Connected to POSTGRES database
✓ Database is up to date (v11)
🎉 InvAI v0.9.0-beta
💾 Database: POSTGRES
```

### 2. Health Check

```bash
curl http://localhost:3000/health
```

Should return:
```json
{
  "status": "ok",
  "version": "0.9.0-beta",
  "database": "postgres",
  "timestamp": "2026-01-25T..."
}
```

### 3. Run Test Suite

```bash
# Run with PostgreSQL
DATABASE_TYPE=postgres npm test
```

---

## Production Deployment

### 1. Production Environment Variables

```bash
# Production .env
NODE_ENV=production
DATABASE_TYPE=postgres
DATABASE_HOST=your-postgres-host.com
DATABASE_PORT=5432
DATABASE_NAME=invai_production
DATABASE_USER=invai_user
DATABASE_PASSWORD=<strong_password>

# SSL/TLS (recommended for production)
DATABASE_SSL=true

# Connection pool for production load
DATABASE_POOL_MAX=50
DATABASE_POOL_IDLE_TIMEOUT=10000
DATABASE_POOL_CONNECTION_TIMEOUT=5000

# Security
JWT_SECRET=<production_secret>
JWT_EXPIRATION=8h
```

### 2. PostgreSQL Production Tuning

```sql
-- Increase connection limit
ALTER SYSTEM SET max_connections = 200;

-- Optimize memory
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';

-- Enable query logging (optional)
ALTER SYSTEM SET log_statement = 'all';

-- Reload configuration
SELECT pg_reload_conf();
```

### 3. Automated Backups

```bash
# Create backup script
cat > /usr/local/bin/backup-invai.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/invai"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U invai_user invai_production > "$BACKUP_DIR/invai_$DATE.sql"

# Keep only last 30 days
find $BACKUP_DIR -name "invai_*.sql" -mtime +30 -delete
EOF

chmod +x /usr/local/bin/backup-invai.sh

# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /usr/local/bin/backup-invai.sh
```

### 4. Process Manager (PM2)

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start server.js --name invai

# Auto-restart on reboot
pm2 startup
pm2 save

# Monitor
pm2 monit
```

---

## Troubleshooting

### Connection Refused

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check PostgreSQL is listening
sudo netstat -plnt | grep 5432

# Edit postgresql.conf
sudo nano /etc/postgresql/14/main/postgresql.conf
# Set: listen_addresses = '*'

# Edit pg_hba.conf for access
sudo nano /etc/postgresql/14/main/pg_hba.conf
# Add: host all all 0.0.0.0/0 md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Authentication Failed

```bash
# Reset password
sudo -u postgres psql
ALTER USER invai_user WITH PASSWORD 'new_password';
\q
```

### Migration Errors

```bash
# Check migration status
psql -U invai_user invai_production
SELECT * FROM schema_migrations ORDER BY version;
\q

# If stuck, manually fix and re-run
npm start
```

### Performance Issues

```sql
-- Check slow queries
SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;

-- Analyze tables
ANALYZE;

-- Vacuum database
VACUUM ANALYZE;
```

---

## Switching Back to SQLite

If needed, you can switch back to SQLite:

```bash
# In .env
DATABASE_TYPE=sqlite
DATABASE_FILENAME=./data/inventory.db

# Restart
npm start
```

---

## Performance Comparison

| Metric | SQLite | PostgreSQL |
|--------|--------|------------|
| Concurrent Users | 1-5 | 100+ |
| Max Connections | 1 | 50+ (pooled) |
| Backup Method | File copy | pg_dump |
| Replication | No | Yes |
| Best For | Dev/Testing | Production |

---

## Next Steps

- **Sprint 4 Phase 2**: Automated backup system
- **Sprint 4 Phase 3**: Stock take feature
- **Sprint 4 Phase 4**: Performance optimization

---

## Support

- **GitHub Issues**: [https://github.com/zv20/invai/issues](https://github.com/zv20/invai/issues)
- **Documentation**: [ROADMAP.md](../ROADMAP.md)
- **PostgreSQL Docs**: [https://www.postgresql.org/docs/](https://www.postgresql.org/docs/)

---

**Last Updated**: January 25, 2026  
**Version**: v0.9.0-beta  
**Sprint**: 4 Phase 1 - PostgreSQL Migration