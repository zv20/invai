#!/usr/bin/env node
/**
 * Security Update Application Script
 * This script integrates v0.8.1 security features into server.js
 * 
 * Run: node scripts/apply-security-update.js
 */

const fs = require('fs');
const path = require('path');

const SERVER_FILE = path.join(__dirname, '..', 'server.js');
const BACKUP_FILE = path.join(__dirname, '..', 'server.pre-security.js');

console.log('\n🔒 InvAI Security Update v0.8.1');
console.log('================================\n');

// Check if server.js exists
if (!fs.existsSync(SERVER_FILE)) {
  console.error('❌ Error: server.js not found!');
  console.error('   Make sure you run this from the project root.\n');
  process.exit(1);
}

// Create backup
console.log('📦 Creating backup: server.pre-security.js');
fs.copyFileSync(SERVER_FILE, BACKUP_FILE);
console.log('✅ Backup created\n');

// Read current server.js
let content = fs.readFileSync(SERVER_FILE, 'utf8');

// Step 1: Add security imports after existing requires
console.log('🔧 Step 1: Adding security imports...');
const securityImports = `
const helmet = require('helmet');
const dotenv = require('dotenv');
const config = require('./config/env');
const constants = require('./config/constants');
const { authenticate, authorize, optionalAuth, hashPassword, comparePassword, generateToken } = require('./middleware/auth');
const { standardLimiter, strictLimiter, authLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const { validate, validators } = require('./middleware/validator');
const { AuthenticationError, AuthorizationError, ValidationError, NotFoundError } = require('./utils/errors');
`;

if (!content.includes("require('./middleware/auth')")) {
  const requireSection = content.indexOf("const packageJson");
  content = content.slice(0, requireSection) + securityImports + content.slice(requireSection);
  console.log('  ✓ Security imports added');
} else {
  console.log('  ⚠️  Security imports already present');
}

// Step 2: Update PORT to use config
console.log('🔧 Step 2: Updating configuration...');
content = content.replace(
  /const PORT = process\.env\.PORT \|\| 3000;/,
  'const PORT = config.PORT;'
);
console.log('  ✓ Configuration updated');

// Step 3: Add security middleware before routes
console.log('🔧 Step 3: Adding security middleware...');
const securityMiddleware = `
// Security middleware
app.use(helmet());
app.use(standardLimiter); // Apply rate limiting to all routes

// Attach logger to requests
app.use((req, res, next) => {
  req.logger = logger;
  next();
});

// Optional: Attach user info if token present (doesn't require auth)
app.use(optionalAuth);
`;

if (!content.includes('app.use(helmet())')) {
  const corsIndex = content.indexOf('app.use(cors());');
  const afterCors = content.indexOf('\n', corsIndex) + 1;
  content = content.slice(0, afterCors) + securityMiddleware + content.slice(afterCors);
  console.log('  ✓ Security middleware added');
} else {
  console.log('  ⚠️  Security middleware already present');
}

// Step 4: Add authentication routes
console.log('🔧 Step 4: Adding authentication routes...');
const authRoutes = `
// ========== AUTHENTICATION ROUTES ==========

// User initialization - creates default admin if no users exist
async function initializeUsers() {
  return new Promise((resolve, reject) => {
    db.run(\`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    \`, (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Check if admin user exists
      db.get('SELECT id FROM users WHERE username = ?', [config.ADMIN_USERNAME], async (err, user) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!user) {
          // Create default admin user
          const adminPassword = config.ADMIN_PASSWORD || 'changeme123';
          const hashedPassword = await hashPassword(adminPassword);
          
          db.run(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            [config.ADMIN_USERNAME, hashedPassword, 'admin'],
            (err) => {
              if (err) {
                reject(err);
              } else {
                console.log(\`✅ Default admin user created: \${config.ADMIN_USERNAME}\`);
                console.log('⚠️  Please change the admin password after first login!');
                resolve();
              }
            }
          );
        } else {
          resolve();
        }
      });
    });
  });
}

// Login endpoint
app.post('/api/auth/login', authLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      throw new ValidationError('Username and password are required');
    }
    
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
      if (err) {
        return next(err);
      }
      
      if (!user) {
        return next(new AuthenticationError('Invalid credentials'));
      }
      
      const isValid = await comparePassword(password, user.password);
      
      if (!isValid) {
        return next(new AuthenticationError('Invalid credentials'));
      }
      
      const token = generateToken(user);
      
      // Log activity
      if (activityLogger) {
        await activityLogger.log('login', 'user', user.id, username, \`User \${username} logged in\`);
      }
      
      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Change password
app.post('/api/auth/change-password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      throw new ValidationError('Current password and new password are required');
    }
    
    if (newPassword.length < 8) {
      throw new ValidationError('New password must be at least 8 characters');
    }
    
    db.get('SELECT * FROM users WHERE id = ?', [req.user.id], async (err, user) => {
      if (err) {
        return next(err);
      }
      
      if (!user) {
        return next(new NotFoundError('User'));
      }
      
      const isValid = await comparePassword(currentPassword, user.password);
      
      if (!isValid) {
        return next(new AuthenticationError('Current password is incorrect'));
      }
      
      const hashedPassword = await hashPassword(newPassword);
      
      db.run(
        'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [hashedPassword, req.user.id],
        async (err) => {
          if (err) {
            return next(err);
          }
          
          // Log activity
          if (activityLogger) {
            await activityLogger.log('update', 'user', req.user.id, req.user.username, 'Password changed');
          }
          
          res.json({
            success: true,
            message: 'Password changed successfully'
          });
        }
      );
    });
  } catch (error) {
    next(error);
  }
});

`;

if (!content.includes('/api/auth/login')) {
  const healthIndex = content.indexOf('app.get(\'/health\'');
  content = content.slice(0, healthIndex) + authRoutes + '\n' + content.slice(healthIndex);
  console.log('  ✓ Authentication routes added');
} else {
  console.log('  ⚠️  Authentication routes already present');
}

// Step 5: Protect routes
console.log('🔧 Step 5: Protecting routes...');

// Protect DELETE endpoints with admin authorization
const deleteEndpoints = [
  "app.delete('/api/products/:id'",
  "app.delete('/api/categories/:id'",
  "app.delete('/api/suppliers/:id'",
  "app.delete('/api/inventory/batches/:id'"
];

deleteEndpoints.forEach(endpoint => {
  const regex = new RegExp(endpoint + ',', 'g');
  if (content.match(regex)) {
    content = content.replace(regex, endpoint + ', authenticate, authorize(\'admin\'),');
  }
});

// Protect POST/PUT endpoints with authentication
const protectedEndpoints = [
  { route: "app.post('/api/products',", protection: 'authenticate,' },
  { route: "app.put('/api/products/:id',", protection: 'authenticate,' },
  { route: "app.post('/api/inventory/batches',", protection: 'authenticate,' },
  { route: "app.put('/api/inventory/batches/:id',", protection: 'authenticate,' },
  { route: "app.post('/api/categories',", protection: 'authenticate,' },
  { route: "app.put('/api/categories/:id',", protection: 'authenticate,' },
  { route: "app.post('/api/suppliers',", protection: 'authenticate,' },
  { route: "app.put('/api/suppliers/:id',", protection: 'authenticate,' },
];

protectedEndpoints.forEach(({ route, protection }) => {
  const regex = new RegExp(route + ' async \\(req,', 'g');
  if (content.match(regex)) {
    content = content.replace(regex, route + ' ' + protection + ' async (req,');
  } else {
    const regex2 = new RegExp(route + ' \\(req,', 'g');
    if (content.match(regex2)) {
      content = content.replace(regex2, route + ' ' + protection + ' (req,');
    }
  }
});

console.log('  ✓ Routes protected');

// Step 6: Update database reset endpoint
console.log('🔧 Step 6: Securing database reset...');
const secureReset = `
app.post('/api/database/reset', authenticate, authorize('admin'), strictLimiter, async (req, res, next) => {
  try {
    const { confirmation } = req.body;
    
    if (confirmation !== 'DELETE ALL DATA') {
      throw new ValidationError('Invalid confirmation. Please send "DELETE ALL DATA" to confirm.');
    }
    
    // Create backup before reset
    const backup = await createBackup('pre_reset');
    logger.info(\`Database reset initiated by \${req.user.username}. Backup: \${backup.filename}\`);
    
    db.run('DELETE FROM inventory_batches', (err) => {
      if (err) return next(err);
      
      db.run('DELETE FROM products', (err) => {
        if (err) return next(err);
        
        db.run('DELETE FROM sqlite_sequence WHERE name="products" OR name="inventory_batches"', (err) => {
          if (err) logger.error('Failed to reset autoincrement:', err);
          
          // Log activity
          if (activityLogger) {
            activityLogger.log('delete', 'database', 0, 'Database', 'Database reset - all data deleted', null, { backup: backup.filename });
          }
          
          logger.warn(\`Database reset completed by \${req.user.username}\`);
          
          res.json({ 
            success: true,
            message: 'Database reset successful. All data has been deleted.',
            backup: backup.filename,
            timestamp: new Date().toISOString()
          });
        });
      });
    });
  } catch (error) {
    next(error);
  }
});
`;

const resetRegex = /app\.post\('\/api\/database\/reset'[\s\S]*?\}\);\s*\}\);\s*\}\);/;
if (content.match(resetRegex)) {
  content = content.replace(resetRegex, secureReset.trim());
  console.log('  ✓ Database reset secured');
} else {
  console.log('  ⚠️  Could not find database reset endpoint');
}

// Step 7: Add error handler at the end
console.log('🔧 Step 7: Adding error handler...');
if (!content.includes('app.use(errorHandler)')) {
  const listenIndex = content.indexOf('app.listen(PORT');
  content = content.slice(0, listenIndex) + '\n// Error handling middleware (must be last)\napp.use(errorHandler);\n\n' + content.slice(listenIndex);
  console.log('  ✓ Error handler added');
} else {
  console.log('  ⚠️  Error handler already present');
}

// Step 8: Update initializeDatabase to include user initialization
console.log('🔧 Step 8: Adding user initialization...');
const userInit = `    // Initialize users
    await initializeUsers();`;

if (!content.includes('initializeUsers()')) {
  const migrateIndex = content.indexOf('await migrateLegacyData();');
  if (migrateIndex > -1) {
    const afterMigrate = content.indexOf('\n', migrateIndex) + 1;
    content = content.slice(0, afterMigrate) + '\n' + userInit + '\n' + content.slice(afterMigrate);
    console.log('  ✓ User initialization added');
  }
} else {
  console.log('  ⚠️  User initialization already present');
}

// Write updated server.js
console.log('\n💾 Writing updated server.js...');
fs.writeFileSync(SERVER_FILE, content, 'utf8');
console.log('✅ server.js updated successfully\n');

console.log('🎉 Security update applied!\n');
console.log('Next steps:');
console.log('  1. Review the changes: git diff server.js');
console.log('  2. Copy .env.example to .env and configure');
console.log('  3. Install dependencies: npm install');
console.log('  4. Test the server: npm start');
console.log('  5. If issues occur, restore backup: mv server.pre-security.js server.js\n');
console.log('⚠️  IMPORTANT: Set a strong JWT_SECRET in .env before starting!\n');
