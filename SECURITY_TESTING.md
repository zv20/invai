# Security Testing Guide

**Version:** v0.9.0-beta  
**Last Updated:** January 25, 2026  
**Purpose:** Comprehensive security testing procedures  

---

## 📋 Overview

This guide provides step-by-step testing procedures for all 12 critical security patches implemented in InvAI.

**Testing Environment:**
- Development server (http://localhost:3001)
- Test user accounts
- Command-line tools (curl, node)

**Prerequisites:**
- Server running (`npm start`)
- curl installed
- Node.js installed
- Test user credentials

---

## 🔴 CRITICAL PATCH TESTING

### Test 1: JWT_SECRET Validation

**Objective:** Verify application rejects invalid JWT_SECRET

**Steps:**
```bash
# Test 1.1: No JWT_SECRET
cp .env .env.backup
rm .env
npm start
# Expected: Error message + exit(1)

# Test 1.2: Short JWT_SECRET
echo "JWT_SECRET=short" > .env
npm start
# Expected: Error message + exit(1)

# Test 1.3: Default JWT_SECRET
echo "JWT_SECRET=your-secret-key-here-change-this-in-production" > .env
npm start
# Expected: Error message + exit(1)

# Test 1.4: Valid JWT_SECRET (64+ chars)
echo "JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")" > .env
npm start
# Expected: Server starts successfully

# Restore
mv .env.backup .env
```

**Expected Results:**
- ❌ Server should FAIL to start with invalid JWT_SECRET
- ✅ Server should START with valid JWT_SECRET
- ✅ Clear error message with generation command

---

### Test 2: bcrypt Salt Rounds

**Objective:** Verify password hashing uses 12 rounds

**Steps:**
```bash
# Test 2.1: Create test user (registers with bcrypt 12)
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'

# Test 2.2: Check password hash in database
sqlite3 data/inventory.db "SELECT password FROM users WHERE username='testuser';"
# Hash should start with $2a$12$ (rounds=12)

# Test 2.3: Performance test
node -e '
const bcrypt = require("bcryptjs");
const password = "TestPassword123!";

console.time("bcrypt-12");
bcrypt.hash(password, 12).then(() => console.timeEnd("bcrypt-12"));
'
# Should take ~200-400ms (acceptable)
```

**Expected Results:**
- ✅ Password hash starts with `$2a$12$`
- ✅ Hashing takes 200-400ms
- ✅ Login works with bcrypt 12 hash

---

### Test 3: JWT Token Expiration

**Objective:** Verify tokens expire after 2 hours

**Steps:**
```bash
# Test 3.1: Login and get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' \
  | jq -r '.token')

echo "Token: $TOKEN"

# Test 3.2: Decode token to check expiration
node -e "
const jwt = require('jsonwebtoken');
const token = process.argv[1];
const decoded = jwt.decode(token);
const now = Math.floor(Date.now() / 1000);
const expiresIn = decoded.exp - now;
console.log('Token expires in:', Math.floor(expiresIn / 60), 'minutes');
console.log('Expected: ~120 minutes (2 hours)');
" "$TOKEN"

# Test 3.3: Use token immediately (should work)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/products
# Expected: 200 OK

# Test 3.4: Wait 2+ hours and try again
# (For faster testing, set JWT_EXPIRATION=1m in .env)
echo "JWT_EXPIRATION=1m" >> .env
# Restart server, login, wait 2 minutes, then:
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/products
# Expected: 401 Unauthorized
```

**Expected Results:**
- ✅ Token valid for ~2 hours (or configured duration)
- ✅ Token rejected after expiration
- ✅ Clear error message on expired token

---

### Test 4: CORS Configuration

**Objective:** Verify CORS restricts unauthorized origins

**Steps:**
```bash
# Test 4.1: Request from evil origin (should be blocked)
curl -v -H "Origin: http://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS http://localhost:3001/api/products \
  2>&1 | grep -i "access-control"
# Expected: NO Access-Control-Allow-Origin header

# Test 4.2: Request from allowed origin (should work)
curl -v -H "Origin: http://localhost:3001" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS http://localhost:3001/api/products \
  2>&1 | grep -i "access-control-allow-origin"
# Expected: Access-Control-Allow-Origin: http://localhost:3001

# Test 4.3: Check allowed methods
curl -v -H "Origin: http://localhost:3001" \
  -X OPTIONS http://localhost:3001/api/products \
  2>&1 | grep -i "access-control-allow-methods"
# Expected: GET, POST, PUT, DELETE, PATCH

# Test 4.4: Check credentials
curl -v -H "Origin: http://localhost:3001" \
  -X OPTIONS http://localhost:3001/api/products \
  2>&1 | grep -i "access-control-allow-credentials"
# Expected: true
```

**Expected Results:**
- ❌ Evil origins rejected (no CORS headers)
- ✅ Allowed origins accepted
- ✅ Credentials enabled
- ✅ Only specified methods allowed

---

### Test 5: Input Sanitization

**Objective:** Verify XSS and injection prevention

**Steps:**
```bash
# Get authentication token first
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' \
  | jq -r '.token')

# Test 5.1: XSS attempt (script tags)
curl -X POST http://localhost:3001/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "<script>alert(\"XSS\")</script>",
    "sku": "TEST-001",
    "category": "Test"
  }' | jq

# Check if script tag was sanitized
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/products?search=script" | jq
# Expected: Script tags removed or escaped

# Test 5.2: NoSQL injection attempt
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": {"$ne": null},
    "password": {"$ne": null}
  }' | jq
# Expected: Login fails ($ symbols removed)

# Test 5.3: SQL injection attempt
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin\" OR \"1\"=\"1",
    "password": "anything"
  }' | jq
# Expected: Login fails (parameterized queries)

# Test 5.4: HTML injection
curl -X POST http://localhost:3001/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "<img src=x onerror=alert(1)>",
    "sku": "TEST-002",
    "category": "Test"
  }' | jq
# Expected: HTML tags sanitized
```

**Expected Results:**
- ✅ Script tags removed/sanitized
- ✅ NoSQL operators ($, .) removed
- ✅ SQL injection prevented
- ✅ HTML injection prevented

---

## 🟠 HIGH PRIORITY TESTING

### Test 6: Request Size Limits

**Objective:** Verify oversized requests are rejected

**Steps:**
```bash
# Test 6.1: Generate large JSON (>1MB)
node -e "
const data = { data: 'A'.repeat(2000000) };
console.log(JSON.stringify(data));
" > large.json

# Test 6.2: Send large JSON
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' \
  | jq -r '.token')

curl -X POST http://localhost:3001/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @large.json
# Expected: 413 Payload Too Large

# Test 6.3: Large CSV (should work up to 5MB)
node -e "
for(let i=0; i<100000; i++) console.log('SKU-'+i+',Product '+i+',10');
" > large.csv

curl -X POST http://localhost:3001/api/import \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: text/csv" \
  --data-binary @large.csv
# Expected: 200 OK (if <5MB)

# Cleanup
rm large.json large.csv
```

**Expected Results:**
- ❌ JSON >1MB rejected (413)
- ❌ URL-encoded >1MB rejected (413)
- ✅ CSV <5MB accepted
- ❌ CSV >5MB rejected (413)

---

### Test 7: Helmet CSP

**Objective:** Verify Content Security Policy headers

**Steps:**
```bash
# Test 7.1: Check CSP header
curl -v http://localhost:3001/ 2>&1 | grep -i "content-security-policy"
# Expected: default-src 'self'; script-src 'self'; ...

# Test 7.2: Check HSTS header
curl -v http://localhost:3001/ 2>&1 | grep -i "strict-transport-security"
# Expected: max-age=31536000; includeSubDomains; preload

# Test 7.3: Check X-Content-Type-Options
curl -v http://localhost:3001/ 2>&1 | grep -i "x-content-type-options"
# Expected: nosniff

# Test 7.4: Check Referrer-Policy
curl -v http://localhost:3001/ 2>&1 | grep -i "referrer-policy"
# Expected: strict-origin-when-cross-origin
```

**Expected Results:**
- ✅ CSP header present (no unsafe-inline)
- ✅ HSTS header present (31536000 seconds)
- ✅ noSniff enabled
- ✅ Strict referrer policy

---

### Test 8: Rate Limiting

**Objective:** Verify rate limits prevent brute force

**Steps:**
```bash
# Test 8.1: Auth endpoint rate limit (5 per 15 min)
for i in {1..10}; do
  echo "Attempt $i:"
  curl -s -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"wrong"}' \
    | jq -r '.error.message'
  sleep 1
done
# Expected: Rate limited after 5 attempts

# Test 8.2: API endpoint rate limit (100 per 15 min)
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' \
  | jq -r '.token')

for i in {1..150}; do
  curl -s -H "Authorization: Bearer $TOKEN" \
    http://localhost:3001/api/products > /dev/null
  if [ $((i % 10)) -eq 0 ]; then
    echo "Request $i"
  fi
done
# Expected: Rate limited after 100 requests

# Test 8.3: Check rate limit headers
curl -v -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}' \
  2>&1 | grep -i "x-ratelimit"
# Expected: X-RateLimit-Limit, X-RateLimit-Remaining headers
```

**Expected Results:**
- ✅ Auth endpoints: 5 requests per 15 min
- ✅ API endpoints: 100 requests per 15 min
- ✅ Strict endpoints: 5 requests per min
- ✅ Clear error message when limited
- ✅ Rate limit headers present

---

### Test 9: Session Encryption

**Objective:** Verify session data is encrypted

**Steps:**
```bash
# Test 9.1: Check ENCRYPTION_KEY validation
unset ENCRYPTION_KEY
node -e "
const crypto = require('crypto');
const { encrypt, decrypt } = require('./utils/encryption');

const text = 'Sensitive session data';
const { encrypted, iv, authTag } = encrypt(text);
console.log('Encrypted:', encrypted.substring(0, 20) + '...');

const decrypted = decrypt(encrypted, iv, authTag);
console.log('Decrypted:', decrypted);
console.log('Match:', text === decrypted ? '✅' : '❌');
"

# Test 9.2: Test with custom key
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
export ENCRYPTION_KEY
node -e "
const { encrypt, decrypt } = require('./utils/encryption');
const text = 'Test';
const { encrypted, iv, authTag } = encrypt(text);
const decrypted = decrypt(encrypted, iv, authTag);
console.log('Encryption works:', text === decrypted ? '✅' : '❌');
"

# Test 9.3: Test tamper detection
node -e "
const { encrypt, decrypt } = require('./utils/encryption');
const text = 'Sensitive data';
const { encrypted, iv, authTag } = encrypt(text);

// Tamper with encrypted data
const tampered = encrypted.substring(0, encrypted.length - 2) + 'XX';

try {
  decrypt(tampered, iv, authTag);
  console.log('❌ Tamper detection failed');
} catch (err) {
  console.log('✅ Tamper detected:', err.message);
}
"
```

**Expected Results:**
- ✅ Encryption/decryption works
- ✅ Tampered data detected
- ✅ AuthTag validation prevents tampering
- ⚠️ Warning if no ENCRYPTION_KEY set

---

## 🟡 MEDIUM PRIORITY TESTING

### Test 10: HTTPS Enforcement

**Objective:** Verify HTTPS redirect in production

**Steps:**
```bash
# Test 10.1: Development (should NOT redirect)
NODE_ENV=development npm start &
sleep 2
curl -v http://localhost:3001/ 2>&1 | grep -i "location:"
# Expected: No redirect
kill %1

# Test 10.2: Production (should redirect)
# Note: Need HTTPS setup for full test
NODE_ENV=production npm start &
sleep 2
curl -v -H "X-Forwarded-Proto: http" \
  http://localhost:3001/ 2>&1 | grep -i "location:"
# Expected: Location: https://...
kill %1

# Test 10.3: Check HSTS header (production)
NODE_ENV=production npm start &
sleep 2
curl -v http://localhost:3001/ 2>&1 | grep -i "strict-transport-security"
# Expected: max-age=31536000; includeSubDomains; preload
kill %1
```

**Expected Results:**
- ✅ No redirect in development
- ✅ HTTP→HTTPS redirect in production
- ✅ HSTS header in production
- ✅ HSTS includes subdomains

---

### Test 11: Password Validation

**Objective:** Verify password complexity requirements

**Steps:**
```bash
# Test 11.1: Too short (<12 chars)
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test1",
    "email": "test1@example.com",
    "password": "Short1!"
  }' | jq
# Expected: Error - must be 12+ characters

# Test 11.2: No uppercase
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test2",
    "email": "test2@example.com",
    "password": "lowercase123!"
  }' | jq
# Expected: Error - must contain uppercase

# Test 11.3: No numbers
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test3",
    "email": "test3@example.com",
    "password": "NoNumbers!"
  }' | jq
# Expected: Error - must contain numbers

# Test 11.4: No special characters
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test4",
    "email": "test4@example.com",
    "password": "NoSpecial123"
  }' | jq
# Expected: Error - must contain special chars

# Test 11.5: Common pattern
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test5",
    "email": "test5@example.com",
    "password": "Password123!"
  }' | jq
# Expected: Error - contains common pattern

# Test 11.6: Valid password
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test6",
    "email": "test6@example.com",
    "password": "SecureP@ssw0rd2024"
  }' | jq
# Expected: Success
```

**Expected Results:**
- ❌ Short passwords rejected
- ❌ Passwords without complexity rejected
- ❌ Common patterns rejected
- ✅ Strong passwords accepted
- ✅ Clear error messages with requirements

---

### Test 12: Security Validation

**Objective:** Verify additional security checks

**Steps:**
```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' \
  | jq -r '.token')

# Test 12.1: Invalid Content-Type
curl -X POST http://localhost:3001/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: text/plain" \
  -d "Not JSON"
# Expected: 415 Unsupported Media Type

# Test 12.2: Prototype pollution attempt
curl -X POST http://localhost:3001/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "__proto__": {"isAdmin": true},
    "name": "Test"
  }' | jq
# Expected: 400 Bad Request - invalid parameter

# Test 12.3: Path traversal attempt
curl "http://localhost:3001/api/products/../../../etc/passwd"
# Expected: 400 Bad Request

# Test 12.4: Constructor pollution
curl -X POST http://localhost:3001/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"constructor": {"prototype": {"isAdmin": true}}}' | jq
# Expected: 400 Bad Request
```

**Expected Results:**
- ✅ Invalid Content-Type rejected
- ✅ Prototype pollution prevented
- ✅ Path traversal blocked
- ✅ Constructor pollution prevented
- ✅ Clear error messages

---

## ✅ Complete Security Test Checklist

**Before Production Deployment:**

- [ ] **Patch 1:** JWT_SECRET validation tested
- [ ] **Patch 2:** bcrypt rounds verified (12)
- [ ] **Patch 3:** JWT expiration tested (2h)
- [ ] **Patch 4:** CORS configuration tested
- [ ] **Patch 5:** Input sanitization tested
- [ ] **Patch 6:** Request size limits tested
- [ ] **Patch 7:** Helmet CSP verified
- [ ] **Patch 8:** Rate limiting tested
- [ ] **Patch 9:** Session encryption tested
- [ ] **Patch 10:** HTTPS enforcement tested
- [ ] **Patch 11:** Password validation tested
- [ ] **Patch 12:** Security validation tested

**Additional Tests:**

- [ ] Penetration testing (if required)
- [ ] Vulnerability scanning
- [ ] Security audit by third party
- [ ] Load testing under attack scenarios

---

## 📊 Test Results Template

```markdown
### Security Test Results
**Date:** [Date]
**Tester:** [Name]
**Environment:** [Dev/Staging/Prod]
**Version:** v0.9.0-beta

| Patch | Test | Result | Notes |
|-------|------|--------|-------|
| 1 | JWT_SECRET | ✅ PASS | Rejects invalid keys |
| 2 | bcrypt | ✅ PASS | Uses rounds=12 |
| 3 | JWT exp | ✅ PASS | Expires in 2h |
| 4 | CORS | ✅ PASS | Blocks evil origins |
| 5 | Sanitization | ✅ PASS | XSS prevented |
| 6 | Size limits | ✅ PASS | >1MB rejected |
| 7 | Helmet CSP | ✅ PASS | Headers present |
| 8 | Rate limit | ✅ PASS | Limits enforced |
| 9 | Encryption | ✅ PASS | Data encrypted |
| 10 | HTTPS | ✅ PASS | Redirects in prod |
| 11 | Passwords | ✅ PASS | Complexity enforced |
| 12 | Validation | ✅ PASS | Pollution prevented |

**Overall:** ✅ ALL TESTS PASSED

**Sign-off:** [Name] - [Date]
```

---

**Last Updated:** January 25, 2026  
**Next Review:** Before v1.0.0 release  
**Status:** Ready for production testing  
