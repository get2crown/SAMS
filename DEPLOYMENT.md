# Deployment Guide

## Production Checklist

- [ ] Database credentials changed
- [ ] JWT secrets updated with secure random values
- [ ] CORS origins configured
- [ ] Environment variables set correctly
- [ ] SSL/TLS certificates configured
- [ ] Database backed up
- [ ] Logging configured
- [ ] Error monitoring setup

## Backend Deployment (Self-Hosted VPS)

### Prerequisites

- Ubuntu 20.04 LTS server
- Domain name
- SSH access

### Initial Server Setup

```bash
# SSH into server
ssh root@your_server_ip

# Update system
apt-get update && apt-get upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PostgreSQL
apt-get install -y postgresql postgresql-contrib

# Install Nginx
apt-get install -y nginx

# Install PM2
npm install -g pm2
```

### PostgreSQL Setup

```bash
# Start PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Create database
sudo -u postgres psql << EOF
CREATE DATABASE attendance_db;
CREATE USER attendance_user WITH PASSWORD 'your_strong_password';
ALTER ROLE attendance_user CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE attendance_db TO attendance_user;
\c attendance_db
GRANT ALL ON SCHEMA public TO attendance_user;
EOF

# Restore schema (if migrating)
sudo -u postgres psql attendance_db < migrations/001_create_tables.sql
```

### Deploy Backend

```bash
# Create app directory
mkdir -p /var/www/attendance-api
cd /var/www/attendance-api

# Clone repository
git clone https://github.com/yourusername/attendance-system.git .
cd backend

# Install dependencies
npm install --production

# Create .env file
nano .env
# Add production environment variables

# Build
npm run build

# Start with PM2
pm2 start dist/server.js --name "attendance-api"
pm2 startup
pm2 save
```

### Nginx Configuration

Create `/etc/nginx/sites-available/attendance-api`:

```nginx
upstream attendance_backend {
    server 127.0.0.1:5000;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://attendance_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Logging
    access_log /var/log/nginx/attendance_access.log;
    error_log /var/log/nginx/attendance_error.log;
}
```

Enable site:
```bash
ln -s /etc/nginx/sites-available/attendance-api /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### SSL Certificate (Let's Encrypt)

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d api.yourdomain.com
certbot renew --dry-run
```

## Frontend Deployment

### Option 1: Nginx (Recommended)

```bash
# Build frontend
cd frontend
npm run build

# Copy to web directory
sudo mkdir -p /var/www/attendance-app
sudo cp -r dist/* /var/www/attendance-app/
```

Create `/etc/nginx/sites-available/attendance-app`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/attendance-app;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable and reload:
```bash
ln -s /etc/nginx/sites-available/attendance-app /etc/nginx/sites-enabled/
systemctl reload nginx
```

### Option 2: Docker

Create `Dockerfile` for backend:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 5000
CMD ["node", "dist/server.js"]
```

Build and run:
```bash
docker build -t attendance-api .
docker run -d \
  --name attendance-api \
  -p 5000:5000 \
  --env-file .env \
  attendance-api
```

## Monitoring & Logging

### PM2 Monitoring

```bash
# View logs
pm2 logs attendance-api

# Monitoring dashboard
pm2 monit

# Save log file
pm2 save
pm2 startup
```

### Database Backups

```bash
# Daily backup script (backup.sh)
#!/bin/bash
BACKUP_DIR="/var/backups/postgresql"
mkdir -p $BACKUP_DIR
pg_dump -U attendance_user attendance_db | \
  gzip > $BACKUP_DIR/attendance_db_$(date +%Y%m%d_%H%M%S).sql.gz

# Keep only last 7 days
find $BACKUP_DIR -mtime +7 -delete
```

Add to crontab:
```bash
0 2 * * * /path/to/backup.sh
```

## Security

### Firewall Rules

```bash
ufw allow 22/tcp     # SSH
ufw allow 80/tcp     # HTTP
ufw allow 443/tcp    # HTTPS
ufw enable
```

### Rate Limiting

Already configured in backend. For Nginx:

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

location /api {
    limit_req zone=api_limit burst=20;
    proxy_pass http://attendance_backend;
}
```

### Environment Variables (Production)

```bash
NODE_ENV=production
DB_HOST=localhost
DB_NAME=attendance_db
DB_USER=attendance_user
DB_PASSWORD=VERY_STRONG_PASSWORD

JWT_SECRET=random_string_at_least_32_characters_long
JWT_REFRESH_SECRET=another_random_string_32_chars_minimum

ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

GOOGLE_MAPS_API_KEY=your_production_key
```

## Performance Optimization

### Database Optimization

```sql
-- Analyze and vacuum
ANALYZE attendance_records;
VACUUM ANALYZE;

-- Monitor slow queries
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();
```

### Nginx Caching

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m;

location /api {
    proxy_cache api_cache;
    proxy_cache_valid 200 10m;
    proxy_cache_key "$scheme$request_method$host$request_uri";
}
```

## Scaling

### Horizontal Scaling

1. Run multiple backend instances
2. Use load balancer (Nginx, HAProxy)
3. Use Postgres connection pooling (PgBouncer)

```bash
# Install PgBouncer
apt-get install -y pgbouncer

# Configure /etc/pgbouncer/pgbouncer.ini
[databases]
attendance_db = host=localhost port=5432 dbname=attendance_db

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
```

## Monitoring URLs

- API Health: https://api.yourdomain.com/health
- Database: postgresql://user@localhost/attendance_db
- Logs: `/var/log/nginx/attendance_*.log`

## Troubleshooting

### Application won't start

```bash
pm2 logs attendance-api
# Check for errors in output
```

### Database connection failed

```bash
# Test connection
psql -U attendance_user -h localhost -d attendance_db -c "SELECT 1;"
```

### High CPU usage

```bash
# Check running processes
pm2 monit

# Analyze slow queries
sudo -u postgres psql attendance_db -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

---

**Deployment Complete! 🚀**
