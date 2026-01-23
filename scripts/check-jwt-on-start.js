#!/usr/bin/env node
/**
 * Pre-startup JWT check
 * Ensures JWT_SECRET is ready before server starts
 * Silent operation for systemd compatibility
 */

const JWTManager = require('../lib/jwt-manager');
const fs = require('fs');
const path = require('path');

try {
  const manager = new JWTManager();
  
  // Check if .env exists, create from example if not
  const envPath = path.join(__dirname, '..', '.env');
  const envExamplePath = path.join(__dirname, '..', '.env.example');
  
  if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
  }
  
  // Initialize JWT (auto-generates if needed)
  const secret = manager.initialize();
  
  // Exit successfully
  process.exit(0);
} catch (error) {
  console.error('❌ JWT initialization failed:', error.message);
  process.exit(1);
}
