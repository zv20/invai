# 🚀 Quick Start: Security Update v0.8.1

## ⚡ Super Fast Setup (3 minutes)

### Step 1: Pull Latest Changes

```bash
cd /path/to/invai
git pull origin beta
```

### Step 2: Run Auto-Update Script

```bash
node scripts/apply-security-update.js
```

This script will:
- ✅ Backup your current server.js
- ✅ Add all security imports
- ✅ Integrate authentication middleware
- ✅ Protect all sensitive endpoints
- ✅ Add user management system
- ✅ Secure the database reset endpoint

### Step 3: Configure Admin Password (Optional)

```bash
cp .env.example .env
```

Edit `.env` and set your admin password:

```env
ADMIN_PASSWORD=your-secure-password-here
```

**Note:** JWT_SECRET is now **auto-generated**! No need to set it manually.

### Step 4: Install Dependencies

```bash
npm install
```

New packages:
- jsonwebtoken
- bcryptjs
- express-validator
- express-rate-limit
- helmet
- dotenv

### Step 5: Start Server

```bash
npm start
```

**What happens automatically on first run:**

```
🔐 Checking JWT Secret configuration...
🔑 No JWT_SECRET found. Generating secure secret...
✅ JWT_SECRET automatically generated and saved to .env
   Length: 128 characters (very secure!)
   🔒 This secret is unique to your installation

✅ Default admin user created: admin
⚠️  Please change the admin password after first login!

Server running on port 3000
```

**That's it! No manual JWT configuration needed.** 🎉

### Step 6: Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your-password"
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

### Step 7: Use Token for API Calls

```bash
curl -X GET http://localhost:3000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 🔐 JWT Secret Management

### Check JWT Status

```bash
npm run jwt:status
```

### Manually Rotate Secret (Every 90 Days Recommended)

```bash
npm run jwt:rotate
```

**See full details:** [JWT Auto-Management Guide](./JWT_AUTO_MANAGEMENT.md)

## 🚨 Troubleshooting

### Script Doesn't Apply Changes?

Manually check what the script did:
```bash
git diff server.js
```

If needed, restore backup:
```bash
mv server.pre-security.js server.js
```

### No JWT_SECRET Generated?

Manually generate it:
```bash
npm run jwt:generate
```

### All API Calls Return 401?

You need to authenticate first:
1. Call `/api/auth/login` to get token
2. Include token in all subsequent requests

### Frontend Not Working?

The frontend needs updates to handle authentication:
- Add login form/modal
- Store JWT token
- Include token in fetch() headers
- Handle 401 errors

See [SECURITY_UPDATE_v0.8.1.md](./SECURITY_UPDATE_v0.8.1.md) for frontend migration guide.

## 📚 Resources

- **JWT Auto-Management:** [JWT_AUTO_MANAGEMENT.md](./JWT_AUTO_MANAGEMENT.md)
- **Full Security Docs:** [SECURITY_UPDATE_v0.8.1.md](./SECURITY_UPDATE_v0.8.1.md)
- **API Reference:** See protected endpoints section in docs

## ✅ Verify Setup

Run this test:

```bash
# Should work (public endpoint)
curl http://localhost:3000/health

# Should fail with 401 (protected endpoint, no auth)
curl http://localhost:3000/api/products

# Should work (with valid token)
curl http://localhost:3000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔒 Security Checklist

- [x] JWT_SECRET auto-generated (128 characters)
- [ ] Admin password is strong and unique
- [x] `.env` file is in `.gitignore`
- [ ] Changed admin password after first login
- [ ] Tested authentication flow
- [ ] Frontend updated to handle auth
- [ ] Verified protected endpoints require auth
- [ ] Checked logs for any errors

## 🆘 Need Help?

1. Check [JWT_AUTO_MANAGEMENT.md](./JWT_AUTO_MANAGEMENT.md) for JWT details
2. Check [SECURITY_UPDATE_v0.8.1.md](./SECURITY_UPDATE_v0.8.1.md) for detailed docs
3. Review logs in `logs/` directory
4. Test with curl commands above
5. Check GitHub issues: https://github.com/zv20/invai/issues

---

**Ready to upgrade?** Run `node scripts/apply-security-update.js` to begin!
