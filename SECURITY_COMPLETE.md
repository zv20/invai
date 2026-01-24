# 🔒 Complete Security Setup Guide - InvAI v0.8.1

## What's Been Done So Far ✅

You've successfully completed the initial security setup:

1. ✅ Pulled latest fixes from beta branch
2. ✅ Generated JWT secret (128 characters, secure)
3. ✅ Ran security update script (added infrastructure)
4. ✅ Service restarted and running
5. ✅ JWT validation passing

## What Needs to Be Done 🔧

### Step 1: Complete Security Integration

Run the complete security setup script:

```bash
cd /opt/invai
node scripts/complete-security-setup.js
```

**What this script does:**
- ✓ Creates backup of current server.js
- ✓ Validates JWT secret exists
- ✓ Creates users table in database
- ✓ Creates default admin user (username: admin, password: admin123)
- ✓ Adds authentication routes to server.js
- ✓ Adds authorization middleware
- ✓ Protects sensitive API endpoints (POST/PUT/DELETE)
- ✓ Adds user management endpoints

### Step 2: Restart Service

```bash
systemctl restart inventory-app.service
systemctl status inventory-app.service
```

### Step 3: Test Authentication

**Test login endpoint:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

You should get a response with a JWT token:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

**Test protected endpoint (without token - should fail):**
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Product"}'
```

Should return:
```json
{"error": "Authentication required"}
```

**Test protected endpoint (with token - should work):**
```bash
# Save the token from login response
TOKEN="your_token_here"

curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Test Product","items_per_case":12}'
```

### Step 4: Access the Login Page

Open your browser and navigate to:
```
http://your-server-ip:3000/login.html
```

**Default Credentials:**
- Username: `admin`
- Password: `admin123`

### Step 5: ⚠️ CHANGE DEFAULT PASSWORD IMMEDIATELY

After logging in, change the default password using the API:

```bash
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "currentPassword": "admin123",
    "newPassword": "your-new-secure-password"
  }'
```

## Security Features Enabled 🛡️

### Authentication
- ✅ JWT-based authentication (24-hour token expiry)
- ✅ Password hashing with bcrypt (10 rounds)
- ✅ Secure session management
- ✅ Login/logout endpoints

### Authorization
- ✅ Role-based access control (user, admin)
- ✅ Protected API endpoints
- ✅ Admin-only operations (deletes, user management)

### Protected Endpoints

The following endpoints now require authentication:

**Products:**
- `POST /api/products` - Create product (authenticated)
- `PUT /api/products/:id` - Update product (authenticated)
- `DELETE /api/products/:id` - Delete product (admin only)

**Categories:**
- `POST /api/categories` - Create category (authenticated)
- `PUT /api/categories/:id` - Update category (authenticated)
- `DELETE /api/categories/:id` - Delete category (admin only)

**Suppliers:**
- `POST /api/suppliers` - Create supplier (authenticated)
- `PUT /api/suppliers/:id` - Update supplier (authenticated)
- `DELETE /api/suppliers/:id` - Delete supplier (admin only)

**Inventory:**
- `POST /api/inventory/batches` - Create batch (authenticated)
- `PUT /api/inventory/batches/:id` - Update batch (authenticated)
- `DELETE /api/inventory/batches/:id` - Delete batch (admin only)

**User Management (Admin Only):**
- `GET /api/users` - List all users
- `POST /api/users` - Create new user
- `DELETE /api/users/:id` - Delete user

### Public Endpoints (No Auth Required)

These endpoints remain public:
- `GET /api/products` - List products
- `GET /api/products/:id` - Get product details
- `GET /api/categories` - List categories
- `GET /api/suppliers` - List suppliers
- `GET /api/inventory/summary` - View inventory
- `GET /api/health` - Health check
- `GET /api/version` - Version info
- All dashboard and report viewing endpoints

## User Management 👥

### Creating Additional Users

As an admin, you can create additional users:

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "username": "newuser",
    "password": "secure-password",
    "role": "user"
  }'
```

**Roles:**
- `user` - Can view and modify inventory, products, etc. Cannot delete or manage users.
- `admin` - Full access including delete operations and user management.

### Listing Users

```bash
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Deleting Users

```bash
curl -X DELETE http://localhost:3000/api/users/2 \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Frontend Integration 🖥️

### Login Page

A beautiful login page is now available at `/login.html`

Features:
- Modern, gradient design
- Responsive layout
- Token storage in localStorage
- Automatic redirect after login
- Warning for default password

### Integrating Auth in Your Frontend

When making API calls from your frontend, include the token:

```javascript
// Get token from localStorage
const token = localStorage.getItem('auth_token');

// Make authenticated request
fetch('/api/products', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ name: 'New Product', items_per_case: 12 })
});
```

### Logout

```javascript
// Clear token and redirect to login
localStorage.removeItem('auth_token');
localStorage.removeItem('user');
window.location.href = '/login.html';
```

## Troubleshooting 🔍

### "Cannot POST /api/auth/login"

The complete security setup script hasn't been run yet. Run:
```bash
node scripts/complete-security-setup.js
```

### "JWT_SECRET not configured"

Generate JWT secret:
```bash
node scripts/generate-jwt.js
```

### "Invalid or expired token"

Token has expired (24 hour limit) or is invalid. Log in again.

### "Authentication required" on public endpoints

Check that GET endpoints weren't accidentally protected. Review server.js.

### Service won't start after security update

Check logs:
```bash
journalctl -u inventory-app.service -f
```

Restore from backup if needed:
```bash
cp server.pre-complete-security.js server.js
systemctl restart inventory-app.service
```

## Security Best Practices ✨

1. **Change Default Password** - Immediately after first login
2. **Use Strong Passwords** - Minimum 12 characters with mix of letters, numbers, symbols
3. **Limit Admin Users** - Only create admin accounts when necessary
4. **Regular Backups** - Keep database backups in secure location
5. **HTTPS** - Use reverse proxy (nginx/caddy) with SSL certificate
6. **Firewall** - Only expose necessary ports
7. **Monitor Logs** - Check logs regularly for suspicious activity
8. **Update Regularly** - Keep InvAI updated to latest version
9. **JWT Secret Rotation** - Rotate JWT secret periodically using jwt-manage.sh

## Next Steps 🚀

1. ✅ Run complete security setup script
2. ✅ Restart service
3. ✅ Test authentication
4. ✅ Login and change default password
5. ✅ Create additional users as needed
6. ✅ Update frontend to use authentication
7. ✅ Set up HTTPS with reverse proxy
8. ✅ Configure backups
9. ✅ Monitor and enjoy secure inventory management!

## Support 💬

If you encounter issues:
1. Check logs: `journalctl -u inventory-app.service -f`
2. Review backups: `ls -lah /opt/invai/backups/`
3. Check GitHub issues: https://github.com/zv20/invai/issues

---

**Version:** v0.8.1  
**Security Level:** Enterprise-grade  
**Status:** Ready for Production 🎉
