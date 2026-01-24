# 🤖 Automatic JWT Secret Management

## Overview

The server automatically generates and manages JWT secrets with zero configuration required.

## How It Works

### First Run
1. Server checks for JWT_SECRET in `.env`
2. If missing, generates a cryptographically secure 128-character secret
3. Saves it to `.env` file automatically
4. Creates `.jwt-meta.json` with creation date and rotation schedule
5. Server starts normally

### Security Features

- **128 characters long** (extremely secure)
- **Cryptographically random** (using Node.js crypto.randomBytes)
- **Unique per installation**
- **Automatically validated** (ensures minimum 32 character length)

## Management Commands

```bash
# Check JWT status
npm run jwt:status

# Generate new secret
npm run jwt:generate

# Rotate secret (invalidates all sessions)
npm run jwt:rotate
```

## Rotation Schedule

**Default:** Every 90 days

**What happens when you rotate:**
1. New secret is generated
2. Old secret is replaced in `.env`
3. All existing user tokens become invalid
4. Users must re-login to get new tokens

## Files

- `.env` - Contains your JWT_SECRET (never commit!)
- `.jwt-meta.json` - Tracks creation date and rotation schedule (never commit!)

---

**Status:** ✅ Implemented in v0.8.1  
**Security:** Auto-rotation reminders every 90 days

_This is a historical record documenting the JWT auto-management feature._