#!/usr/bin/env node
/**
 * Complete Security Setup Script for InvAI v0.8.1
 * 
 * This script adds comprehensive authentication and authorization to your InvAI installation:
 * - Adds JWT-based authentication
 * - Creates default admin user
 * - Adds authentication routes
 * - Protects sensitive API endpoints
 * 
 * Run: node scripts/complete-security-setup.js
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();

const SERVER_PATH = path.join(__dirname, '..', 'server.js');
const BACKUP_PATH = path.join(__dirname, '..', 'server.pre-complete-security.js');
const ENV_PATH = path.join(__dirname, '..', '.env');
const DB_PATH = path.join(__dirname, '..', 'inventory.db');

console.log('\n🔒 InvAI Complete Security Setup v0.8.1');
console.log('=========================================\n');

// Step 1: Backup server.js
console.log('📦 Step 1: Creating backup...');
if (!fs.existsSync(SERVER_PATH)) {
  console.error('❌ Error: server.js not found!');
  process.exit(1);
}

fs.copyFileSync(SERVER_PATH, BACKUP_PATH);
console.log(`✅ Backup created: ${path.basename(BACKUP_PATH)}\n`);

// Step 2: Check JWT secret
console.log('🔐 Step 2: Checking JWT secret...');
if (!fs.existsSync(ENV_PATH)) {
  console.error('❌ Error: .env file not found! Run: node scripts/generate-jwt.js');
  process.exit(1);
}

const envContent = fs.readFileSync(ENV_PATH, 'utf8');
const jwtMatch = envContent.match(/JWT_SECRET=([^\n]+)/);

if (!jwtMatch || jwtMatch[1] === 'your-secret-key-here-change-this-in-production') {
  console.error('❌ Error: JWT_SECRET not properly configured!');
  console.error('   Run: node scripts/generate-jwt.js');
  process.exit(1);
}

console.log('✅ JWT secret configured\n');

// Step 3: Initialize users table and create default admin
console.log('👤 Step 3: Setting up users table...');

const db = new sqlite3.Database(DB_PATH);

const setupUsers = new Promise((resolve, reject) => {
  // Create users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) return reject(err);
    
    // Check if admin exists
    db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, row) => {
      if (err) return reject(err);
      
      if (row) {
        console.log('ℹ️  Admin user already exists');
        return resolve({ existing: true });
      }
      
      // Create default admin user
      const defaultPassword = 'admin123';
      bcrypt.hash(defaultPassword, 10, (err, hash) => {
        if (err) return reject(err);
        
        db.run(
          'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
          ['admin', hash, 'admin'],
          function(err) {
            if (err) return reject(err);
            console.log('✅ Default admin user created');
            console.log('   Username: admin');
            console.log('   Password: admin123');
            console.log('   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY!');
            resolve({ existing: false, id: this.lastID });
          }
        );
      });
    });
  });
});

setupUsers
  .then(() => {
    db.close();
    
    // Step 4: Update server.js with security code
    console.log('\n🔧 Step 4: Updating server.js with security features...');
    
    let serverCode = fs.readFileSync(SERVER_PATH, 'utf8');
    
    // Check if already secured
    if (serverCode.includes('// ========== v0.8.1: AUTHENTICATION')) {
      console.log('ℹ️  Security features already added to server.js');
      console.log('\n✅ Security setup complete!');
      console.log('\n📝 Next steps:');
      console.log('   1. Restart your server: systemctl restart inventory-app.service');
      console.log('   2. Login at: http://your-server:3000/login.html');
      console.log('   3. Change admin password immediately!');
      return;
    }
    
    // Add security imports after existing requires
    const requireSection = serverCode.indexOf("const DailyRotateFile = require('winston-daily-rotate-file');");
    if (requireSection !== -1) {
      const insertPos = serverCode.indexOf('\n', requireSection) + 1;
      const securityImports = `
// v0.8.1: Security imports
require('dotenv').config();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
`;
      serverCode = serverCode.slice(0, insertPos) + securityImports + serverCode.slice(insertPos);
      console.log('  ✓ Added security imports');
    }
    
    // Add JWT secret validation after app initialization
    const appInitPos = serverCode.indexOf('const app = express();');
    if (appInitPos !== -1) {
      const insertPos = serverCode.indexOf('\n', appInitPos) + 1;
      const jwtValidation = `
// v0.8.1: Validate JWT secret
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key-here-change-this-in-production') {
  console.error('\\n❌ FATAL ERROR: JWT_SECRET not configured!');
  console.error('Run: node scripts/generate-jwt.js');
  process.exit(1);
}
`;
      serverCode = serverCode.slice(0, insertPos) + jwtValidation + serverCode.slice(insertPos);
      console.log('  ✓ Added JWT validation');
    }
    
    // Add security middleware and routes before existing route handlers
    const firstRoutePos = serverCode.indexOf('// ========== v0.8.0: ACTIVITY LOG API ==========');
    if (firstRoutePos !== -1) {
      const securitySection = `
// ========== v0.8.1: AUTHENTICATION & AUTHORIZATION ==========

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Authorization Middleware
 * Checks if user has required role
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

/**
 * Login Route
 * Authenticates user and returns JWT token
 */
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      logger.error('Login error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    bcrypt.compare(password, user.password, (err, match) => {
      if (err) {
        logger.error('Password comparison error:', err);
        return res.status(500).json({ error: 'Authentication error' });
      }
      
      if (!match) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      logger.info(`User logged in: ${username}`);
      
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });
    });
  });
});

/**
 * Get Current User
 * Returns authenticated user's information
 */
app.get('/api/auth/me', authenticate, (req, res) => {
  db.get(
    'SELECT id, username, role, created_at FROM users WHERE id = ?',
    [req.user.id],
    (err, user) => {
      if (err) {
        logger.error('Get user error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(user);
    }
  );
});

/**
 * Change Password
 * Allows authenticated users to change their password
 */
app.post('/api/auth/change-password', authenticate, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password required' });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  
  db.get('SELECT * FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) {
      logger.error('Change password error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    bcrypt.compare(currentPassword, user.password, (err, match) => {
      if (err) {
        logger.error('Password comparison error:', err);
        return res.status(500).json({ error: 'Authentication error' });
      }
      
      if (!match) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      
      bcrypt.hash(newPassword, 10, (err, hash) => {
        if (err) {
          logger.error('Password hashing error:', err);
          return res.status(500).json({ error: 'Failed to hash password' });
        }
        
        db.run(
          'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [hash, req.user.id],
          (err) => {
            if (err) {
              logger.error('Password update error:', err);
              return res.status(500).json({ error: 'Failed to update password' });
            }
            
            logger.info(`Password changed for user: ${user.username}`);
            res.json({ message: 'Password changed successfully' });
          }
        );
      });
    });
  });
});

/**
 * Logout Route
 * Invalidates current session (client should delete token)
 */
app.post('/api/auth/logout', authenticate, (req, res) => {
  logger.info(`User logged out: ${req.user.username}`);
  res.json({ message: 'Logged out successfully' });
});

/**
 * List Users (Admin only)
 */
app.get('/api/users', authenticate, authorize('admin'), (req, res) => {
  db.all(
    'SELECT id, username, role, created_at, updated_at FROM users ORDER BY created_at DESC',
    [],
    (err, users) => {
      if (err) {
        logger.error('List users error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(users);
    }
  );
});

/**
 * Create User (Admin only)
 */
app.post('/api/users', authenticate, authorize('admin'), (req, res) => {
  const { username, password, role } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      logger.error('Password hashing error:', err);
      return res.status(500).json({ error: 'Failed to hash password' });
    }
    
    db.run(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hash, role],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint')) {
            return res.status(409).json({ error: 'Username already exists' });
          }
          logger.error('Create user error:', err);
          return res.status(500).json({ error: 'Failed to create user' });
        }
        
        logger.info(`User created: ${username} (${role}) by ${req.user.username}`);
        res.json({ id: this.lastID, message: 'User created successfully' });
      }
    );
  });
});

/**
 * Delete User (Admin only)
 */
app.delete('/api/users/:id', authenticate, authorize('admin'), (req, res) => {
  const userId = parseInt(req.params.id);
  
  if (userId === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  
  db.get('SELECT username FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      logger.error('Delete user error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
      if (err) {
        logger.error('Delete user error:', err);
        return res.status(500).json({ error: 'Failed to delete user' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      logger.info(`User deleted: ${user.username} by ${req.user.username}`);
      res.json({ message: 'User deleted successfully' });
    });
  });
});

`;
      serverCode = serverCode.slice(0, firstRoutePos) + securitySection + serverCode.slice(firstRoutePos);
      console.log('  ✓ Added authentication routes');
      console.log('  ✓ Added user management routes');
    }
    
    // Add protection to sensitive routes (POST/PUT/DELETE)
    const routesToProtect = [
      { pattern: /app\.post\('\/api\/products',/, replacement: "app.post('/api/products', authenticate," },
      { pattern: /app\.put\('\/api\/products\/:id',/, replacement: "app.put('/api/products/:id', authenticate," },
      { pattern: /app\.delete\('\/api\/products\/:id',/, replacement: "app.delete('/api/products/:id', authenticate, authorize('admin')," },
      { pattern: /app\.post\('\/api\/categories',/, replacement: "app.post('/api/categories', authenticate," },
      { pattern: /app\.put\('\/api\/categories\/:id',/, replacement: "app.put('/api/categories/:id', authenticate," },
      { pattern: /app\.delete\('\/api\/categories\/:id',/, replacement: "app.delete('/api/categories/:id', authenticate, authorize('admin')," },
      { pattern: /app\.post\('\/api\/suppliers',/, replacement: "app.post('/api/suppliers', authenticate," },
      { pattern: /app\.put\('\/api\/suppliers\/:id',/, replacement: "app.put('/api/suppliers/:id', authenticate," },
      { pattern: /app\.delete\('\/api\/suppliers\/:id',/, replacement: "app.delete('/api/suppliers/:id', authenticate, authorize('admin')," },
      { pattern: /app\.post\('\/api\/inventory\/batches',/, replacement: "app.post('/api/inventory/batches', authenticate," },
      { pattern: /app\.put\('\/api\/inventory\/batches\/:id',/, replacement: "app.put('/api/inventory/batches/:id', authenticate," },
      { pattern: /app\.delete\('\/api\/inventory\/batches\/:id',/, replacement: "app.delete('/api/inventory/batches/:id', authenticate, authorize('admin')," },
    ];
    
    let protectedCount = 0;
    routesToProtect.forEach(({ pattern, replacement }) => {
      if (pattern.test(serverCode)) {
        serverCode = serverCode.replace(pattern, replacement);
        protectedCount++;
      }
    });
    
    console.log(`  ✓ Protected ${protectedCount} sensitive routes`);
    
    // Write updated server.js
    fs.writeFileSync(SERVER_PATH, serverCode);
    console.log('✅ server.js updated successfully\n');
    
    // Final instructions
    console.log('🎉 Security setup complete!\n');
    console.log('📝 Next steps:');
    console.log('   1. Restart your server: systemctl restart inventory-app.service');
    console.log('   2. Login credentials:');
    console.log('      Username: admin');
    console.log('      Password: admin123');
    console.log('   3. ⚠️  CHANGE THE ADMIN PASSWORD IMMEDIATELY!');
    console.log('   4. Access login page: http://your-server:3000/login.html');
    console.log('\n🔐 Security features enabled:');
    console.log('   ✓ JWT-based authentication');
    console.log('   ✓ Password hashing with bcrypt');
    console.log('   ✓ Role-based authorization');
    console.log('   ✓ Protected API endpoints');
    console.log('   ✓ User management for admins');
    console.log('');
  })
  .catch(err => {
    console.error('\n❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
