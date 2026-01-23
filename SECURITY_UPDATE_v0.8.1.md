# Security Update v0.8.1 - Implementation Guide

## 🔒 Overview

This update adds comprehensive authentication, authorization, and security features to InvAI.

## ⚠️ BREAKING CHANGES

All destructive API endpoints (POST, PUT, DELETE) now require authentication via JWT tokens.

## 📋 Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

New dependencies added:
- `jsonwebtoken` - JWT authentication
- `bcryptjs` - Password hashing
- `express-validator` - Input validation
- `express-rate-limit` - Rate limiting
- `helmet` - Security headers
- `dotenv` - Environment configuration

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set these required values:

```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-minimum-32-characters
ADMIN_PASSWORD=your-secure-admin-password
```

**IMPORTANT**: Use a strong JWT_SECRET (min 32 characters)

### 3. Start Server

```bash
npm start
```

On first run, a default admin user will be created:
- Username: `admin` (or value from `ADMIN_USERNAME` in .env)
- Password: Value from `ADMIN_PASSWORD` in .env (default: `changeme123`)

**⚠️ Change the admin password immediately after first login!**

## 🔐 Authentication Flow

### Login

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
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

### Using Auth Token

Include the token in the Authorization header for all protected endpoints:

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Product"}'
```

## 🛡️ Security Features

### Authentication & Authorization
- ✅ JWT-based authentication with configurable expiration
- ✅ Role-based access control (admin, user, viewer)
- ✅ Password hashing with bcrypt (12 rounds)
- ✅ Secure session management

### Rate Limiting
- ✅ Standard rate limit: 100 requests per 15 minutes
- ✅ Strict rate limit: 5 requests per minute (sensitive operations)
- ✅ Auth rate limit: 5 login attempts per 15 minutes

### Input Validation
- ✅ Comprehensive validation for all endpoints
- ✅ Type checking and sanitization
- ✅ SQL injection prevention
- ✅ XSS protection

### Error Handling
- ✅ Centralized error handling
- ✅ Consistent error response format
- ✅ No sensitive data leakage in production
- ✅ Detailed logging for debugging

### Additional Security
- ✅ Helmet.js security headers
- ✅ CORS configuration
- ✅ Environment-based configuration
- ✅ Secure database reset (admin-only + confirmation)

## 🔒 Protected Endpoints

### Require Authentication (Any Role)
- GET `/api/activity-log`
- GET `/api/reports/*`
- GET `/api/products` (read operations)
- GET `/api/inventory/*` (read operations)

### Require Authentication (Modify Operations)
- POST `/api/products`
- PUT `/api/products/:id`
- POST `/api/inventory/batches`
- PUT `/api/inventory/batches/:id`
- POST `/api/categories`
- PUT `/api/categories/:id`
- POST `/api/suppliers`
- PUT `/api/suppliers/:id`

### Require Admin Role
- DELETE `/api/products/:id`
- DELETE `/api/categories/:id`
- DELETE `/api/suppliers/:id`
- DELETE `/api/inventory/batches/:id`
- POST `/api/database/reset`
- POST `/api/backup/*`
- POST `/api/settings/switch-channel`

### Public Endpoints (No Auth Required)
- POST `/api/auth/login`
- GET `/health`
- GET `/api/health`
- GET `/` (frontend)

## 👥 User Management

### Change Password

```bash
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "old-password",
    "newPassword": "new-secure-password"
  }'
```

### Get Current User

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🚨 Database Reset (Admin Only)

The database reset endpoint now requires:
1. Admin authentication
2. Explicit confirmation string
3. Automatic backup before reset

```bash
curl -X POST http://localhost:3000/api/database/reset \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "confirmation": "DELETE ALL DATA"
  }'
```

## 📝 Response Format

All API responses now follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": [ ... ] // Optional validation errors
  }
}
```

## 🔄 Migration from v0.8.0

### Frontend Changes Required

1. **Add login page/modal** to collect credentials
2. **Store JWT token** (localStorage, sessionStorage, or memory)
3. **Include token in requests**:
   ```javascript
   fetch('/api/products', {
     headers: {
       'Authorization': `Bearer ${token}`,
       'Content-Type': 'application/json'
     }
   })
   ```
4. **Handle 401 errors** (redirect to login)
5. **Handle token expiration** (refresh or re-login)

### Database Schema

New table created automatically on startup:

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🧪 Testing

### Test Authentication
```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}' | jq -r '.token')

# Test protected endpoint
curl -X GET http://localhost:3000/api/products \
  -H "Authorization: Bearer $TOKEN"
```

### Test Rate Limiting
```bash
# Make multiple rapid requests
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"wrong"}'
done
```

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:3000/api/health
```

Returns:
```json
{
  "status": "ok",
  "version": "0.8.1",
  "uptime": 12345,
  "timestamp": "2026-01-23T19:00:00.000Z",
  "cacheStats": { ... }
}
```

## 🔧 Troubleshooting

### "JWT_SECRET not found" error
- Ensure `.env` file exists
- Ensure `JWT_SECRET` is set in `.env`
- Restart the server after creating `.env`

### "Authentication required" on all endpoints
- Check if JWT token is being sent
- Verify token hasn't expired (default: 24 hours)
- Check Authorization header format: `Bearer TOKEN`

### "Too many requests" error
- Wait for rate limit window to reset
- Check if your use case needs higher limits
- Adjust limits in `.env` or `config/constants.js`

## 🛠️ Configuration

All security settings can be customized in:
- `.env` - Runtime configuration
- `config/constants.js` - Application constants
- `config/env.js` - Environment validation

## 📚 Further Reading

- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

## 🆘 Support

If you encounter issues:
1. Check logs in `logs/` directory
2. Review `.env` configuration
3. Verify all dependencies are installed
4. Check GitHub issues: https://github.com/zv20/invai/issues

---

**Version:** 0.8.1  
**Date:** January 23, 2026  
**Type:** Security Update (Breaking Changes)
