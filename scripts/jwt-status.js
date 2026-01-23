#!/usr/bin/env node
/**
 * JWT Secret Status Check
 * Display current JWT secret configuration
 */

const JWTManager = require('../lib/jwt-manager');

const manager = new JWTManager();
const status = manager.status();

console.log('\n🔐 JWT Secret Status\n');
console.log('='.repeat(50));

if (!status.exists) {
  console.log('❌ No JWT_SECRET found');
  console.log('\n💡 Run the server to auto-generate one');
  console.log('   Or run: npm run generate-jwt\n');
} else {
  console.log(`✓ JWT_SECRET exists`);
  console.log(`   Length: ${status.length} characters`);
  console.log(`   Secure: ${status.secure ? '✅ Yes' : '❌ No (too short)'}`);
  
  if (status.daysOld !== 'unknown') {
    console.log(`   Age: ${status.daysOld} days`);
    console.log(`   Last Rotated: ${new Date(status.lastRotated).toLocaleDateString()}`);
    
    if (status.needsRotation) {
      console.log('\n⚠️  ROTATION RECOMMENDED');
      console.log('   Secret is 90+ days old');
      console.log('   Run: npm run rotate-jwt\n');
    } else {
      const daysUntilRotation = 90 - status.daysOld;
      console.log(`\n✓ No rotation needed (${daysUntilRotation} days remaining)\n`);
    }
  } else {
    console.log('   Age: Unknown (no metadata file)');
    console.log('\n💡 Metadata will be created on next server start\n');
  }
}

console.log('='.repeat(50));
console.log();
