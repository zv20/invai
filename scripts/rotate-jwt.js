#!/usr/bin/env node
/**
 * JWT Secret Rotation Script
 * Manually rotate JWT_SECRET for security
 */

const JWTManager = require('../lib/jwt-manager');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🔄 JWT Secret Rotation Tool\n');
console.log('⚠️  WARNING: This will invalidate all existing user sessions!');
console.log('   All users will need to log in again.\n');

rl.question('Are you sure you want to rotate the JWT secret? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes') {
    const manager = new JWTManager();
    manager.rotate();
    console.log('\n🎉 Rotation complete!\n');
  } else {
    console.log('\n❌ Rotation cancelled\n');
  }
  rl.close();
});
