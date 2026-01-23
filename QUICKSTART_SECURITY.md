# 🚀 Quick Start: Security Update v0.8.1

## ⚡ For systemctl/Production Setup (3 minutes)

### Step 1: Pull Latest Changes

**Via built-in updater:** Use your app's update feature in the web UI

**Or manually:**
```bash
cd /path/to/invai
git pull origin beta
```

### Step 2: Run Post-Update Script

```bash
bash scripts/post-update.sh
```

This automatically:
- ✅ Installs dependencies
- ✅ Generates JWT_SECRET if missing
- ✅ Checks rotation status
- ✅ Runs database migrations

### Step 3: Apply Security Updates to server.js

```bash
node scripts/apply-security-update.js
```

This integrates all security middleware into your server.

### Step 4: Restart Service

```bash
sudo systemctl restart invai.service
# Or your service name
```

### Step 5: Verify

```bash
sudo systemctl status invai.service
```

**That's it!** JWT_SECRET auto-generates on first start.

### Step 6: Login

Default admin credentials:
- **Username:** `admin`
- **Password:** `changeme123` (or what you set in `.env`)

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "changeme123"
  }'
```

Response:
```json
{
  "success": true,
  "token": "eyJhbGciOi...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

## 🔐 JWT Management (systemctl)

### Check JWT Status

```bash
bash scripts/jwt-manage.sh status
```

### Rotate Secret (Every 90 Days)

```bash
bash scripts/jwt-manage.sh rotate
```

This automatically restarts your service.

### Generate New Secret

```bash
bash scripts/jwt-manage.sh generate
```

**See full guide:** [systemctl Setup](./SYSTEMCTL_SETUP.md)

## ⚡ For Development (npm)

If you're running with `npm start` (not systemctl):

```bash
# Check status
npm run jwt:status

# Rotate secret
npm run jwt:rotate

# Generate secret
npm run jwt:generate
```

## 🚨 Troubleshooting

### Service Won't Start?

```bash
# Check logs
sudo journalctl -u invai.service -n 50

# Check app logs
tail -f /path/to/invai/logs/app-*.log

# Reinstall dependencies
cd /path/to/invai
npm install --production
sudo systemctl restart invai.service
```

### No JWT_SECRET Generated?

```bash
bash scripts/jwt-manage.sh generate
sudo systemctl restart invai.service
```

### All API Calls Return 401?

You need to authenticate:
1. Login to get token
2. Include token in requests: `Authorization: Bearer TOKEN`

### Frontend Not Working?

Frontend needs updates:
- Add login form
- Store JWT token
- Include token in fetch() headers
- Handle 401 errors

See [SECURITY_UPDATE_v0.8.1.md](./SECURITY_UPDATE_v0.8.1.md) for frontend migration.

## 📚 Resources

- **systemctl Setup:** [SYSTEMCTL_SETUP.md](./SYSTEMCTL_SETUP.md) ⭐ Start here!
- **JWT Auto-Management:** [JWT_AUTO_MANAGEMENT.md](./JWT_AUTO_MANAGEMENT.md)
- **Full Security Docs:** [SECURITY_UPDATE_v0.8.1.md](./SECURITY_UPDATE_v0.8.1.md)

## ✅ Verify Setup

```bash
# Check service
sudo systemctl status invai.service

# Check JWT
bash scripts/jwt-manage.sh status

# Test health endpoint (public)
curl http://localhost:3000/health

# Test protected endpoint (should fail without auth)
curl http://localhost:3000/api/products

# Login and test with token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"changeme123"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Test authenticated request
curl http://localhost:3000/api/products \
  -H "Authorization: Bearer $TOKEN"
```

## 🔒 Security Checklist

- [x] JWT_SECRET auto-generated (128 characters)
- [ ] Changed admin password from default
- [x] `.env` file is in `.gitignore`
- [ ] Tested authentication flow
- [ ] Service restarts successfully
- [ ] Verified protected endpoints require auth
- [ ] Checked logs for errors
- [ ] Frontend updated (if applicable)

## 🔄 Built-in Update Integration

Your app's update system now:
1. Checks GitHub for updates
2. Pulls latest code
3. **Runs post-update.sh** (installs deps, checks JWT)
4. Restarts service automatically
5. JWT auto-generates if needed

**Zero manual intervention required!** 🎉

## 🆘 Need Help?

1. **Production setup:** [SYSTEMCTL_SETUP.md](./SYSTEMCTL_SETUP.md)
2. **JWT issues:** [JWT_AUTO_MANAGEMENT.md](./JWT_AUTO_MANAGEMENT.md)
3. **Security details:** [SECURITY_UPDATE_v0.8.1.md](./SECURITY_UPDATE_v0.8.1.md)
4. **Check logs:** `sudo journalctl -u invai.service -f`
5. **GitHub issues:** https://github.com/zv20/invai/issues

---

**For systemctl users:** Start with [SYSTEMCTL_SETUP.md](./SYSTEMCTL_SETUP.md) for your environment! 🐧
