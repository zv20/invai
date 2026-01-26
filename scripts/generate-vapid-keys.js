#!/usr/bin/env node
/**
 * VAPID Key Generator for InvAI PWA Push Notifications
 * 
 * This script generates VAPID (Voluntary Application Server Identification) keys
 * required for web push notifications in your Progressive Web App.
 * 
 * Usage:
 *   node scripts/generate-vapid-keys.js
 * 
 * The script will:
 * 1. Check if web-push is installed
 * 2. Generate new VAPID keys
 * 3. Display keys for manual .env configuration
 * 4. Optionally update .env file automatically
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔐 VAPID Key Generator for InvAI PWA\n');

// Check if web-push is installed
try {
  require.resolve('web-push');
} catch (e) {
  console.error('❌ Error: web-push package not found!');
  console.error('\n📦 Please install it first:');
  console.error('   npm install web-push\n');
  process.exit(1);
}

const webpush = require('web-push');

// Generate VAPID keys
console.log('⚙️  Generating VAPID keys...\n');
const vapidKeys = webpush.generateVAPIDKeys();

console.log('✅ VAPID keys generated successfully!\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋 Copy these keys to your .env file:\n');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:your-email@example.com`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
const envExists = fs.existsSync(envPath);

if (envExists) {
  console.log('📄 .env file detected\n');
  console.log('Options:');
  console.log('  1. Manually copy the keys above to your .env file');
  console.log('  2. Run: node scripts/update-env-vapid.js (to auto-update)\n');
  
  // Read current .env to check if VAPID keys already exist
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  if (envContent.includes('VAPID_PUBLIC_KEY=') && 
      !envContent.includes('VAPID_PUBLIC_KEY=your_vapid_public_key_here')) {
    console.log('⚠️  WARNING: VAPID keys may already be configured in .env');
    console.log('   Review your .env file before replacing existing keys!\n');
  }
} else {
  console.log('⚠️  .env file not found');
  console.log('   Create a .env file and add the keys above\n');
}

console.log('📚 Documentation:');
console.log('   • VAPID keys are used for web push notifications');
console.log('   • Public key: Shared with the browser client');
console.log('   • Private key: Kept secret on the server');
console.log('   • Subject: Should be mailto: or https: URL identifying your app\n');

console.log('🔒 Security:');
console.log('   • NEVER commit your VAPID_PRIVATE_KEY to version control');
console.log('   • Store it securely in .env (already in .gitignore)');
console.log('   • Generate new keys for each environment (dev, staging, prod)\n');

console.log('✅ Next Steps:');
console.log('   1. Copy the keys to your .env file');
console.log('   2. Update VAPID_SUBJECT with your email');
console.log('   3. Restart your server: npm start');
console.log('   4. Test push notifications in your PWA\n');

process.exit(0);