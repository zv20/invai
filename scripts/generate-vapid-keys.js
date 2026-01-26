/**
 * Generate VAPID Keys for Push Notifications
 * 
 * VAPID (Voluntary Application Server Identification) keys are required
 * for sending push notifications in PWAs.
 * 
 * Usage:
 *   node scripts/generate-vapid-keys.js
 * 
 * The script will generate a new pair of public and private keys.
 * Add these to your .env file to enable push notifications.
 */

const webPush = require('web-push');
const fs = require('fs');
const path = require('path');

console.log('\n🔐 VAPID Key Generator\n');
console.log('Generating new VAPID key pair for push notifications...\n');

try {
  // Generate VAPID keys
  const vapidKeys = webPush.generateVAPIDKeys();
  
  console.log('✅ Keys generated successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 VAPID Keys (Add these to your .env file)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('Public Key:');
  console.log(vapidKeys.publicKey);
  console.log('\nPrivate Key:');
  console.log(vapidKeys.privateKey);
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 Add to your .env file:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const envContent = `# PWA Push Notifications (Sprint 6)
VAPID_PUBLIC_KEY=${vapidKeys.publicKey}
VAPID_PRIVATE_KEY=${vapidKeys.privateKey}
VAPID_SUBJECT=mailto:your-email@example.com
`;
  
  console.log(envContent);
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚠️  SECURITY WARNING');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('• Keep your PRIVATE KEY secret!');
  console.log('• Never commit .env file to version control');
  console.log('• Never share your private key publicly');
  console.log('• The public key can be shared with clients\n');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📖 Next Steps');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('1. Copy the keys above to your .env file');
  console.log('2. Update VAPID_SUBJECT with your email');
  console.log('3. Restart your server: npm start');
  console.log('4. Test push notifications in your app\n');
  
  // Optional: Offer to save to file
  const envPath = path.join(__dirname, '..', '.env.vapid');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💾 Auto-save Option');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  fs.writeFileSync(envPath, envContent);
  console.log(`✅ Keys saved to: .env.vapid`);
  console.log(`   You can copy these to your .env file\n`);
  
  // Check if .env exists
  const mainEnvPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(mainEnvPath)) {
    console.log('ℹ️  .env file exists. Please add the keys manually.');
  } else {
    console.log('⚠️  .env file not found. Create it from .env.example first.');
  }
  
  console.log('\n✅ Key generation complete!\n');
  
} catch (error) {
  console.error('\n❌ Error generating VAPID keys:', error.message);
  
  if (error.code === 'MODULE_NOT_FOUND') {
    console.error('\n⚠️  web-push module not found!');
    console.error('Install it with: npm install web-push\n');
  } else {
    console.error(error.stack);
  }
  
  process.exit(1);
}
