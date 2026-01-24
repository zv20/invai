# 🐧 systemctl Setup for InvAI Security

## For Production Deployments Using systemd

This guide is for systems running InvAI as a systemd service (like your production setup).

## 🚀 Quick Setup

### 1. Pull Latest Beta

Your app's built-in updater handles this, or manually:
```bash
cd /path/to/invai
git pull origin beta
```

### 2. Run Post-Update Script

```bash
bash scripts/post-update.sh
```

This automatically:
- ✅ Installs new dependencies
- ✅ Generates JWT_SECRET if missing
- ✅ Checks if rotation is needed
- ✅ Prepares for service restart

### 3. Restart Service

```bash
sudo systemctl restart invai.service
# Or whatever your service name is
```

### 4. Verify

```bash
sudo systemctl status invai.service
```

**That's it!** JWT_SECRET auto-generates on first start.

## 🛠️ JWT Management Commands

### Check JWT Status

```bash
bash scripts/jwt-manage.sh status
```

Output:
```
🔐 JWT Secret Status
==================================================
✓ JWT_SECRET exists
   Length: 128 characters
   Secure: ✅ Yes
   Age: 45 days
   Last Rotated: 2025-12-15

✓ No rotation needed (45 days remaining)
==================================================
```

### Rotate JWT Secret (Every 90 Days)

```bash
bash scripts/jwt-manage.sh rotate
```

Interactive prompt:
```
🔄 JWT Secret Rotation
==================================================
⚠️  WARNING: All users will be logged out!

Continue? (yes/no): yes
✅ JWT_SECRET rotated successfully
♻️  Restarting service: invai.service
✅ Service restarted
==================================================
```

### Manually Generate New Secret

```bash
bash scripts/jwt-manage.sh generate
```

## 🔄 Integration with Built-in Updater

### How Updates Work Now

**Before (your current system):**
1. App checks GitHub for updates
2. Pulls latest code
3. Restarts service

**After (with security):**
1. App checks GitHub for updates
2. Pulls latest code
3. **Runs post-update.sh** (new step)
4. Restarts service

The post-update script handles:
- Installing new npm packages
- Auto-generating JWT_SECRET if missing
- Checking for JWT rotation needs

### Integrating Post-Update Hook

Update your app's update endpoint to call the post-update script.

In your current update code, after `git pull`, add:

```javascript
// After git pull succeeds
execSync('bash scripts/post-update.sh', { 
  cwd: __dirname, 
  encoding: 'utf8' 
});
```

Or let the systemd service ExecStartPre handle it (see below).

## 🐧 systemd Service Configuration

### Option 1: Add Pre-Start JWT Check

Update your `invai.service` file:

```ini
[Unit]
Description=InvAI Grocery Inventory System
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/invai
# Check JWT before starting
ExecStartPre=/usr/bin/node /path/to/invai/scripts/check-jwt-on-start.js
ExecStart=/usr/bin/node /path/to/invai/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

The `ExecStartPre` line ensures JWT_SECRET exists before server starts.

### Option 2: Let Server Handle It

No changes needed! The server auto-generates JWT_SECRET on first run.

## 📅 Automatic Rotation Reminders

### Check JWT Age on Login

When you SSH into your server:

```bash
# Add to ~/.bashrc or create /etc/motd.d/jwt-status
cd /path/to/invai && bash scripts/jwt-manage.sh status 2>/dev/null || true
```

You'll see JWT status every time you log in.

### Set Up Cron for Notifications (Optional)

Create a weekly check:

```bash
crontab -e
```

Add:
```
# Check JWT status every Monday at 9 AM
0 9 * * 1 cd /path/to/invai && bash scripts/jwt-manage.sh status > /tmp/jwt-status.log
```

## 🔒 Security Best Practices

### File Permissions

Ensure JWT files are secure:

```bash
cd /path/to/invai
chmod 600 .env
chmod 600 .jwt-meta.json
chown your-service-user:your-service-user .env .jwt-meta.json
```

### Backup .env File

**Before rotating:**
```bash
cp .env .env.backup.$(date +%Y%m%d)
```

**Store backups securely:**
```bash
mv .env.backup.* ~/backups/
chmod 600 ~/backups/.env.*
```

## 🔄 Update Workflow

### Via Built-in Updater (Recommended)

1. **Check for updates** (via web UI or API)
2. **Click update button**
3. **App pulls from GitHub**
4. **Post-update.sh runs automatically** (if integrated)
5. **Service restarts**
6. **JWT auto-generates if needed**

### Manual Update

```bash
# Stop service
sudo systemctl stop invai.service

# Pull updates
cd /path/to/invai
git pull origin beta

# Run post-update
bash scripts/post-update.sh

# Start service
sudo systemctl start invai.service

# Check status
sudo systemctl status invai.service
```

## 🤔 FAQ

### Q: Does JWT_SECRET survive updates?

**Yes!** It's stored in `.env` which is not tracked by git.

Updates won't touch:
- `.env` (your config)
- `.jwt-meta.json` (rotation tracking)
- `inventory.db` (your data)

### Q: What happens on first boot after update?

```
🔐 Checking JWT Secret configuration...
🔑 No JWT_SECRET found. Generating secure secret...
✅ JWT_SECRET automatically generated and saved to .env
   Length: 128 characters (very secure!)

Server running on port 3000
```

### Q: How do I check logs?

```bash
# Service logs
sudo journalctl -u invai.service -f

# Application logs
tail -f /path/to/invai/logs/app-*.log
```

### Q: Service won't start after update?

```bash
# Check service status
sudo systemctl status invai.service

# Check logs
sudo journalctl -u invai.service -n 50

# Common fix: Reinstall dependencies
cd /path/to/invai
npm install --production
sudo systemctl restart invai.service
```

### Q: Need to revert JWT secret?

If you backed up `.env`:

```bash
cd /path/to/invai
cp .env.backup.20260123 .env
sudo systemctl restart invai.service
```

## 📊 Monitoring JWT Health

### Simple Health Check Script

Create `/usr/local/bin/check-invai-jwt`:

```bash
#!/bin/bash
cd /path/to/invai
bash scripts/jwt-manage.sh status | grep -q "No rotation needed"
if [ $? -eq 0 ]; then
    echo "OK: JWT secret healthy"
    exit 0
else
    echo "WARNING: JWT rotation needed"
    exit 1
fi
```

Make executable:
```bash
sudo chmod +x /usr/local/bin/check-invai-jwt
```

Run periodically or integrate with monitoring.

## 🔗 Related Documentation

- [JWT Auto-Management](./JWT_AUTO_MANAGEMENT.md) - How auto-generation works
- [Security Update Guide](./SECURITY_UPDATE_v0.8.1.md) - Complete security docs
- [Quick Start](./QUICKSTART_SECURITY.md) - Fast setup guide

## 💡 Pro Tips

### 1. Test Updates in Staging First

If you have a staging server:
```bash
# Staging
git pull origin beta
bash scripts/post-update.sh
sudo systemctl restart invai-staging.service

# If good, deploy to production
```

### 2. Rotate JWT After Team Changes

When someone leaves the team:
```bash
bash scripts/jwt-manage.sh rotate
```

### 3. Document Your Service Name

The script tries to auto-detect, but note it down:
```bash
# Find your service name
systemctl list-units --type=service | grep -i invai

# Add to your notes
echo "SERVICE_NAME=invai.service" > /path/to/invai/.service-name
```

---

**Summary:** Your systemctl setup works perfectly with the new security system. JWT auto-generates, updates work as before, and management is simple with bash scripts! 🚀
