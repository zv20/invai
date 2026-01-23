# 🚀 Quick Start: Security Update v0.8.1

## ⚡ Fast Setup (5 minutes)

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

### Step 3: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set:

```env
JWT_SECRET=put-a-random-32-character-string-here-change-this
ADMIN_PASSWORD=your-secure-password-here
```

**Generate a strong JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

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

On first start, default admin user is created:
- Username: `admin`
- Password: (from your `.env` file)

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

### "JWT_SECRET not found" Error?

Make sure `.env` file exists:
```bash
ls -la .env
```

Check JWT_SECRET is set:
```bash
grep JWT_SECRET .env
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

- **Full Documentation:** [SECURITY_UPDATE_v0.8.1.md](./SECURITY_UPDATE_v0.8.1.md)
- **API Reference:** See protected endpoints section in docs
- **Frontend Examples:** Check docs for fetch() examples with auth

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

- [ ] JWT_SECRET is 32+ characters and random
- [ ] Admin password is strong and unique
- [ ] `.env` file is in `.gitignore`
- [ ] Changed admin password after first login
- [ ] Tested authentication flow
- [ ] Frontend updated to handle auth
- [ ] Verified protected endpoints require auth
- [ ] Checked logs for any errors

## 🆘 Need Help?

1. Check [SECURITY_UPDATE_v0.8.1.md](./SECURITY_UPDATE_v0.8.1.md) for detailed docs
2. Review logs in `logs/` directory
3. Test with curl commands above
4. Check GitHub issues: https://github.com/zv20/invai/issues

---

**Ready to upgrade?** Run `node scripts/apply-security-update.js` to begin!
