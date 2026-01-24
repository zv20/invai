# 🤖 Automatic JWT Secret Management

## 🎉 Zero Configuration Required!

The server now **automatically generates and manages JWT secrets** for you. No manual setup needed!

## How It Works

### First Run

```bash
npm start
```

**What happens automatically:**

1. ✅ Server checks for JWT_SECRET in `.env`
2. ✅ If missing, generates a cryptographically secure 128-character secret
3. ✅ Saves it to `.env` file automatically
4. ✅ Creates `.jwt-meta.json` with creation date and rotation schedule
5. ✅ Server starts normally

**You see this:**
```
🔐 Checking JWT Secret configuration...
🔑 No JWT_SECRET found or using placeholder. Generating secure secret...
✅ JWT_SECRET automatically generated and saved to .env
   Length: 128 characters (very secure!)
   🔒 This secret is unique to your installation

✅ Default admin user created: admin
⚠️  Please change the admin password after first login!
```

### Subsequent Runs

```bash
npm start
```

**What happens:**

1. ✅ Server finds existing JWT_SECRET
2. ✅ Validates it's secure (32+ characters)
3. ✅ Checks if rotation is needed (90 days old)
4. ✅ Server starts normally

**You see this:**
```
🔐 Checking JWT Secret configuration...
✓ JWT_SECRET found and validated
   Age: 5 days old (rotation at 90 days)
```

## 🛠️ Management Commands

### Check JWT Status

```bash
npm run jwt:status
```

**Output:**
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

### Manually Generate New Secret

```bash
npm run jwt:generate
```

Use this if:
- You want to regenerate the secret manually
- Your `.env` file was deleted
- You're setting up a new environment

### Rotate Secret (Security Best Practice)

```bash
npm run jwt:rotate
```

**Interactive prompt:**
```
🔄 JWT Secret Rotation Tool

⚠️  WARNING: This will invalidate all existing user sessions!
   All users will need to log in again.

Are you sure you want to rotate the JWT secret? (yes/no):
```

Type `yes` to confirm rotation.

**After rotation:**
```
✅ JWT_SECRET rotated successfully
   Old secret hash: a4f8d9e2b7c1f5a3
   New secret hash: 7b3e8c1f9a2d4e6b

⚠️  You must restart the server for changes to take effect
   Run: npm start
```

## 📅 Automatic Rotation Reminders

The system tracks JWT secret age and reminds you when rotation is recommended:

**After 90 days:**
```
⏰ JWT_SECRET is due for rotation (90+ days old)
   Run: npm run jwt:rotate
   Note: All users will need to re-login after rotation
```

**This is just a reminder - the secret continues to work!**

## 🔒 Security Features

### Auto-Generated Secrets Are:

- **128 characters long** (extremely secure)
- **Cryptographically random** (using Node.js crypto.randomBytes)
- **Unique per installation** (no two installations have the same secret)
- **Automatically validated** (ensures minimum 32 character length)

### Files Created:

- `.env` - Contains your JWT_SECRET (never commit to Git!)
- `.jwt-meta.json` - Tracks creation date and rotation schedule (never commit to Git!)

**Both files are in `.gitignore` by default.**

## 📊 Rotation Schedule

**Default:** Every 90 days

**Why rotate?**
- Security best practice
- Reduces risk if secret is compromised
- Limits exposure window

**What happens when you rotate:**
1. New secret is generated
2. Old secret is replaced in `.env`
3. All existing user tokens become invalid
4. Users must re-login to get new tokens
5. New tokens are signed with new secret

## 🤔 FAQ

### Do I need to manually set JWT_SECRET?

**No!** It's auto-generated on first run. But you can manually set it in `.env` if you prefer.

### Can I use my own JWT_SECRET?

**Yes!** Just set it in `.env`:

```env
JWT_SECRET=your-custom-secret-here-minimum-32-characters
```

The server will validate it's secure (32+ characters) and use it.

### What if I delete the .env file?

**No problem!** Just start the server:

```bash
npm start
```

A new JWT_SECRET will be auto-generated. However, all users will need to re-login since the old tokens won't be valid.

### How do I rotate the secret?

**Option 1: Manual (recommended)**
```bash
npm run jwt:rotate
npm start
```

**Option 2: Delete and regenerate**
```bash
rm .env .jwt-meta.json
npm start
```

### What happens during rotation?

1. ⚠️ All user sessions are invalidated
2. 🚪 Users must log in again
3. ✅ New tokens are issued
4. 🔒 New tokens are signed with new secret

**This is normal and expected!**

### How often should I rotate?

**Recommendations:**
- **Normal use:** Every 90 days (default)
- **High security:** Every 30 days
- **After incident:** Immediately
- **Team member leaves:** Within 24 hours

### Can I change the rotation interval?

Yes! Edit `.jwt-meta.json`:

```json
{
  "createdAt": "2026-01-23T19:00:00.000Z",
  "lastRotated": "2026-01-23T19:00:00.000Z",
  "secretHash": "a4f8d9e2b7c1f5a3",
  "rotationInterval": 30  // Change to desired days
}
```

### What if I use Docker or multiple servers?

**Important:** All servers must use the **same JWT_SECRET**.

**Option 1: Share .env file**
- Copy `.env` to all servers
- Use same JWT_SECRET everywhere

**Option 2: Use environment variables**
```bash
export JWT_SECRET="your-secret-here"
npm start
```

**Option 3: Use secrets management**
- AWS Secrets Manager
- HashiCorp Vault  
- Docker secrets
- Kubernetes secrets

## 📝 Files Reference

### `.env`
Contains your JWT_SECRET:
```env
JWT_SECRET=a4f8d9e2b7c1f5a3d9e8b2c7f1a5d3e9b8c2f7a1...
```

**Status:** Auto-generated if missing
**Backup:** Yes, backup this file!
**Git:** Never commit (in .gitignore)

### `.jwt-meta.json`
Tracks secret metadata:
```json
{
  "createdAt": "2026-01-23T19:00:00.000Z",
  "lastRotated": "2026-01-23T19:00:00.000Z",
  "secretHash": "a4f8d9e2b7c1f5a3",
  "rotationInterval": 90
}
```

**Status:** Auto-generated when secret is created
**Backup:** Optional (can be regenerated)
**Git:** Never commit (in .gitignore)

## 🔄 Migration from Manual Setup

If you previously set JWT_SECRET manually, nothing changes!

**The auto-generation system:**
- ✅ Detects existing JWT_SECRET
- ✅ Validates it's secure
- ✅ Continues using it
- ✅ Creates metadata file for rotation tracking

**No action required!**

## ✅ Benefits of Auto-Generation

1. **🚀 Zero configuration** - Just start the server
2. **🔒 More secure** - 128-char random secrets are stronger than manual ones
3. **📅 Rotation reminders** - Never forget to rotate
4. **🛠️ Easy management** - Simple CLI commands
5. **📊 Tracking** - Know when secret was created and last rotated
6. **👥 Beginner friendly** - No crypto knowledge needed
7. **💡 Best practices** - Follows security recommendations automatically

## 👨‍💻 For Advanced Users

### Programmatic Access

```javascript
const JWTManager = require('./lib/jwt-manager');

const manager = new JWTManager();

// Get current status
const status = manager.status();
console.log(status);

// Check if rotation needed
if (manager.needsRotation()) {
  manager.rotate();
}

// Generate new secret
const newSecret = manager.generateSecret(64);
```

### Environment Variable Override

```bash
# Skip auto-generation, use environment variable
export JWT_SECRET="my-custom-secret-here"
npm start
```

The auto-generation is skipped if JWT_SECRET is already in environment.

## 🔗 Related Documentation

- [Security Update Guide](./SECURITY_UPDATE_v0.8.1.md)
- [Quick Start Guide](./QUICKSTART_SECURITY.md)

---

**Summary:** You don't need to think about JWT_SECRET anymore. Just start the server and it handles everything automatically! 🎉
