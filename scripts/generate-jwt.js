#!/usr/bin/env node
/**
 * JWT Secret Generator
 * Manually generate a new JWT secret
 */

const JWTManager = require('../lib/jwt-manager');

const manager = new JWTManager();

console.log('\n🔑 Generating JWT Secret...\n');

const secret = manager.initialize();

console.log('✅ Complete!');
console.log('\nYour JWT secret has been saved to .env');
console.log('You can now start the server with: npm start\n');
