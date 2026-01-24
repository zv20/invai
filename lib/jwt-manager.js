const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * JWT Secret Manager
 * Automatically generates, stores, and rotates JWT secrets
 */
class JWTManager {
  constructor() {
    this.envPath = path.join(__dirname, '..', '.env');
    this.envExamplePath = path.join(__dirname, '..', '.env.example');
    this.secretMetaPath = path.join(__dirname, '..', '.jwt-meta.json');
  }

  /**
   * Generate a cryptographically secure random secret
   */
  generateSecret(length = 64) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Check if .env file exists, create from example if not
   */
  ensureEnvFile() {
    if (!fs.existsSync(this.envPath)) {
      console.log('\n📝 No .env file found, creating from .env.example...');
      
      if (fs.existsSync(this.envExamplePath)) {
        fs.copyFileSync(this.envExamplePath, this.envPath);
        console.log('✓ Created .env file from template');
      } else {
        // Create minimal .env if example doesn't exist
        const minimalEnv = `# Auto-generated .env file\nPORT=3000\nNODE_ENV=development\n`;
        fs.writeFileSync(this.envPath, minimalEnv, 'utf8');
        console.log('✓ Created minimal .env file');
      }
    }
  }

  /**
   * Read current .env file contents
   */
  readEnv() {
    if (!fs.existsSync(this.envPath)) {
      return '';
    }
    return fs.readFileSync(this.envPath, 'utf8');
  }

  /**
   * Write updated .env file contents
   */
  writeEnv(content) {
    fs.writeFileSync(this.envPath, content, 'utf8');
  }

  /**
   * Update or add a key-value pair in .env file
   */
  updateEnvVar(key, value) {
    let envContent = this.readEnv();
    const regex = new RegExp(`^${key}=.*$`, 'm');
    
    if (regex.test(envContent)) {
      // Update existing key
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      // Add new key
      envContent += `\n${key}=${value}\n`;
    }
    
    this.writeEnv(envContent);
  }

  /**
   * Get current JWT secret from .env
   */
  getCurrentSecret() {
    const envContent = this.readEnv();
    const match = envContent.match(/^JWT_SECRET=(.*)$/m);
    return match ? match[1].trim() : null;
  }

  /**
   * Save secret metadata (creation date, rotation info)
   */
  saveSecretMeta(secret) {
    const meta = {
      createdAt: new Date().toISOString(),
      lastRotated: new Date().toISOString(),
      secretHash: crypto.createHash('sha256').update(secret).digest('hex').substring(0, 16),
      rotationInterval: 90 // days
    };
    fs.writeFileSync(this.secretMetaPath, JSON.stringify(meta, null, 2), 'utf8');
  }

  /**
   * Load secret metadata
   */
  loadSecretMeta() {
    if (!fs.existsSync(this.secretMetaPath)) {
      return null;
    }
    try {
      return JSON.parse(fs.readFileSync(this.secretMetaPath, 'utf8'));
    } catch (err) {
      return null;
    }
  }

  /**
   * Check if secret needs rotation
   */
  needsRotation() {
    const meta = this.loadSecretMeta();
    if (!meta) return false;
    
    const daysSinceRotation = (Date.now() - new Date(meta.lastRotated).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceRotation >= meta.rotationInterval;
  }

  /**
   * Initialize JWT secret - auto-generate if missing
   */
  initialize() {
    console.log('\n🔐 Checking JWT Secret configuration...');
    
    // Ensure .env file exists
    this.ensureEnvFile();
    
    // Check for existing secret
    let secret = this.getCurrentSecret();
    
    if (!secret || secret === 'your-super-secret-jwt-key-change-this-in-production-minimum-32-characters') {
      // No secret or placeholder secret - generate new one
      console.log('🔑 No JWT_SECRET found or using placeholder. Generating secure secret...');
      
      secret = this.generateSecret(64); // 64 bytes = 128 hex characters
      this.updateEnvVar('JWT_SECRET', secret);
      this.saveSecretMeta(secret);
      
      console.log('✅ JWT_SECRET automatically generated and saved to .env');
      console.log(`   Length: ${secret.length} characters (very secure!)`);
      console.log('   🔒 This secret is unique to your installation\n');
      
      return secret;
    } else {
      // Secret exists - validate length
      if (secret.length < 32) {
        console.log('⚠️  WARNING: JWT_SECRET is too short (< 32 characters)');
        console.log('   Generating new secure secret...');
        
        secret = this.generateSecret(64);
        this.updateEnvVar('JWT_SECRET', secret);
        this.saveSecretMeta(secret);
        
        console.log('✅ JWT_SECRET regenerated with secure length\n');
        return secret;
      }
      
      console.log('✓ JWT_SECRET found and validated');
      
      // Check if rotation is needed
      if (this.needsRotation()) {
        console.log('⏰ JWT_SECRET is due for rotation (90+ days old)');
        console.log('   Run: npm run rotate-jwt');
        console.log('   Note: All users will need to re-login after rotation\n');
      } else {
        const meta = this.loadSecretMeta();
        if (meta) {
          const daysOld = Math.floor((Date.now() - new Date(meta.lastRotated).getTime()) / (1000 * 60 * 60 * 24));
          console.log(`   Age: ${daysOld} days old (rotation at 90 days)\n`);
        } else {
          console.log();
        }
      }
      
      return secret;
    }
  }

  /**
   * Manually rotate JWT secret
   */
  rotate() {
    console.log('\n🔄 Rotating JWT_SECRET...');
    console.log('⚠️  WARNING: All users will be logged out and need to re-authenticate\n');
    
    const oldSecret = this.getCurrentSecret();
    const oldHash = oldSecret ? crypto.createHash('sha256').update(oldSecret).digest('hex').substring(0, 16) : 'none';
    
    const newSecret = this.generateSecret(64);
    this.updateEnvVar('JWT_SECRET', newSecret);
    this.saveSecretMeta(newSecret);
    
    console.log('✅ JWT_SECRET rotated successfully');
    console.log(`   Old secret hash: ${oldHash}`);
    console.log(`   New secret hash: ${crypto.createHash('sha256').update(newSecret).digest('hex').substring(0, 16)}`);
    console.log('\n⚠️  You must restart the server for changes to take effect');
    console.log('   Run: npm start\n');
    
    return newSecret;
  }

  /**
   * Get status of JWT secret
   */
  status() {
    const secret = this.getCurrentSecret();
    const meta = this.loadSecretMeta();
    
    if (!secret) {
      return {
        exists: false,
        message: 'No JWT_SECRET configured'
      };
    }
    
    const daysOld = meta 
      ? Math.floor((Date.now() - new Date(meta.lastRotated).getTime()) / (1000 * 60 * 60 * 24))
      : 'unknown';
    
    return {
      exists: true,
      length: secret.length,
      secure: secret.length >= 32,
      daysOld,
      needsRotation: this.needsRotation(),
      createdAt: meta?.createdAt || 'unknown',
      lastRotated: meta?.lastRotated || 'unknown'
    };
  }
}

module.exports = JWTManager;
