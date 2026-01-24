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

console.log('🔧 Step 4: Adding authentication routes...');
// Check if auth routes already exist
if (!content.includes('/api/auth/login')) {
  console.log('  ℹ️  Auth routes need to be added manually');
  console.log('  📝 See SECURITY_UPDATE_v0.8.1.md for auth route examples');
} else {
  console.log('  ✓ Authentication routes already present');
}

console.log('🔧 Step 5: Protecting routes...');
console.log('  ℹ️  Route protection should be added manually for precision');
console.log('  📝 Add authenticate middleware to POST/PUT/DELETE routes');
console.log('  📝 Add authorize(\'admin\') to DELETE routes');

// Step 6: Add error handler at the end
console.log('🔧 Step 6: Adding error handler...');
if (!content.includes('app.use(errorHandler)')) {
  const listenIndex = content.indexOf('app.listen(PORT');
  content = content.slice(0, listenIndex) + '\n// Error handling middleware (must be last)\napp.use(errorHandler);\n\n' + content.slice(listenIndex);
  console.log('  ✓ Error handler added');
} else {
  console.log('  ⚠️  Error handler already present');
}

// Write updated server.js
console.log('\n💾 Writing updated server.js...');
fs.writeFileSync(SERVER_FILE, content, 'utf8');
console.log('✅ server.js updated successfully\n');

console.log('🎉 Security infrastructure added!\n');
console.log('⚠️  IMPORTANT: Manual steps required:\n');
console.log('1. Add authentication routes (login/logout)');
console.log('2. Add authenticate middleware to protected routes');
console.log('3. Initialize users table and default admin');
console.log('\n📚 See SECURITY_UPDATE_v0.8.1.md for complete code examples\n');
console.log('Next steps:');
console.log('  1. Generate JWT: node scripts/generate-jwt.js');
console.log('  2. Review changes: git diff server.js');
console.log('  3. Restart service: systemctl restart inventory-app.service');
console.log('  4. Test: curl http://localhost:3000/health\n');
