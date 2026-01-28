/**
 * Backup Manager - Sprint 4 Phase 2
 * 
 * Automated backup system with:
 * - Multiple storage backends (S3, B2, Local)
 * - Encryption and compression
 * - Retention policies
 * - Verification and restore
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { exec } = require('child_process');
const execAsync = promisify(exec);
const crypto = require('crypto');
const zlib = require('zlib');
const pipeline = promisify(require('stream').pipeline);

class BackupManager {
  constructor(dbAdapter, logger, config = {}) {
    this.dbAdapter = dbAdapter;
    this.logger = logger;
    this.config = {
      enabled: config.enabled !== false,
      storage: config.storage || process.env.BACKUP_STORAGE || 'local',
      schedule: config.schedule || process.env.BACKUP_SCHEDULE || '0 2 * * *', // 2 AM daily
      retentionDays: parseInt(config.retentionDays || process.env.BACKUP_RETENTION_DAYS || '30'),
      retentionMonthly: parseInt(config.retentionMonthly || process.env.BACKUP_RETENTION_MONTHLY || '12'),
      retentionYearly: parseInt(config.retentionYearly || process.env.BACKUP_RETENTION_YEARLY || '7'),
      encryption: config.encryption !== false,
      compression: config.compression !== false,
      ...config
    };
    
    this.storageAdapter = null;
    this.initializeStorage();
  }

  /**
   * Initialize storage adapter based on configuration
   */
  initializeStorage() {
    const storageType = this.config.storage.toLowerCase();
    
    try {
      if (storageType === 's3') {
        const S3Adapter = require('./storageAdapters/s3');
        this.storageAdapter = new S3Adapter(this.logger);
      } else if (storageType === 'b2') {
        const B2Adapter = require('./storageAdapters/b2');
        this.storageAdapter = new B2Adapter(this.logger);
      } else {
        const LocalAdapter = require('./storageAdapters/local');
        this.storageAdapter = new LocalAdapter(this.logger);
      }
      
      this.logger.info(`Backup storage initialized: ${storageType}`);
    } catch (error) {
      this.logger.error(`Failed to initialize backup storage: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a backup
   */
  async createBackup(type = 'scheduled') {
    if (!this.config.enabled) {
      return { success: false, message: 'Backups are disabled' };
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
    const backupName = `backup_${type}_${timestamp}`;
    
    this.logger.info(`Starting backup: ${backupName}`);

    try {
      // Step 1: Export database
      const dumpFile = await this.exportDatabase(backupName);
      
      // Step 2: Compress (if enabled)
      let finalFile = dumpFile;
      if (this.config.compression) {
        finalFile = await this.compressFile(dumpFile);
        fs.unlinkSync(dumpFile); // Remove uncompressed file
      }
      
      // Step 3: Encrypt (if enabled)
      if (this.config.encryption) {
        const encryptedFile = await this.encryptFile(finalFile);
        fs.unlinkSync(finalFile); // Remove unencrypted file
        finalFile = encryptedFile;
      }
      
      // Step 4: Upload to storage
      const uploadResult = await this.storageAdapter.upload(finalFile, backupName);
      
      // Step 5: Verify backup
      const verified = await this.verifyBackup(uploadResult.path || finalFile);
      
      // Step 6: Cleanup local temp file
      if (fs.existsSync(finalFile)) {
        fs.unlinkSync(finalFile);
      }
      
      // Step 7: Apply retention policy
      await this.applyRetentionPolicy();
      
      this.logger.info(`Backup completed successfully: ${backupName}`);
      
      return {
        success: true,
        backupName,
        size: uploadResult.size,
        verified,
        storage: this.config.storage,
        encrypted: this.config.encryption,
        compressed: this.config.compression
      };
      
    } catch (error) {
      this.logger.error(`Backup failed: ${error.message}`);
      
      // Send alert (if configured)
      await this.sendAlert('Backup Failed', error.message);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Export database to SQL dump
   */
  async exportDatabase(backupName) {
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const dumpFile = path.join(tempDir, `${backupName}.sql`);
    const dbType = this.dbAdapter.getType();

    if (dbType === 'postgres') {
      // PostgreSQL dump
      const dbConfig = this.dbAdapter.config;
      const cmd = `PGPASSWORD="${dbConfig.password}" pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} ${dbConfig.database} > ${dumpFile}`;
      await execAsync(cmd);
    } else {
      // SQLite dump
      const dbPath = this.dbAdapter.dbPath || './data/inventory.db';
      const cmd = `sqlite3 ${dbPath} .dump > ${dumpFile}`;
      await execAsync(cmd);
    }

    return dumpFile;
  }

  /**
   * Compress file with gzip
   */
  async compressFile(inputFile) {
    const outputFile = `${inputFile}.gz`;
    const gzip = zlib.createGzip({ level: 9 });
    const source = fs.createReadStream(inputFile);
    const destination = fs.createWriteStream(outputFile);

    await pipeline(source, gzip, destination);
    return outputFile;
  }

  /**
   * Encrypt file with AES-256-GCM
   */
  async encryptFile(inputFile) {
    const outputFile = `${inputFile}.enc`;
    const algorithm = 'aes-256-gcm';
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    const input = fs.createReadStream(inputFile);
    const output = fs.createWriteStream(outputFile);

    // Write IV at the beginning
    output.write(iv);

    await pipeline(input, cipher, output);

    // Write auth tag at the end
    const authTag = cipher.getAuthTag();
    fs.appendFileSync(outputFile, authTag);

    return outputFile;
  }

  /**
   * Get or generate encryption key
   */
  getEncryptionKey() {
    const keyEnv = process.env.BACKUP_ENCRYPTION_KEY;
    if (keyEnv) {
      return crypto.createHash('sha256').update(keyEnv).digest();
    }
    
    // Generate and save key (first time only)
    const keyFile = path.join(__dirname, '../../.backup-key');
    if (fs.existsSync(keyFile)) {
      const key = fs.readFileSync(keyFile);
      return key;
    }
    
    const key = crypto.randomBytes(32);
    fs.writeFileSync(keyFile, key, { mode: 0o600 });
    this.logger.warn('Generated new backup encryption key: .backup-key');
    return key;
  }

  /**
   * Verify backup integrity
   */
  async verifyBackup(backupPath) {
    try {
      const stats = fs.statSync(backupPath);
      return stats.size > 0;
    } catch (error) {
      this.logger.error(`Backup verification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Apply retention policy
   */
  async applyRetentionPolicy() {
    try {
      const backups = await this.storageAdapter.listBackups();
      const now = new Date();
      const toDelete = [];

      for (const backup of backups) {
        const age = Math.floor((now - backup.date) / (1000 * 60 * 60 * 24));
        
        // Keep daily backups for retention period
        if (age <= this.config.retentionDays) {
          continue;
        }
        
        // Keep monthly backups
        const isMonthly = backup.date.getDate() === 1;
        const monthAge = Math.floor(age / 30);
        if (isMonthly && monthAge <= this.config.retentionMonthly) {
          continue;
        }
        
        // Keep yearly backups
        const isYearly = isMonthly && backup.date.getMonth() === 0;
        const yearAge = Math.floor(age / 365);
        if (isYearly && yearAge <= this.config.retentionYearly) {
          continue;
        }
        
        // Mark for deletion
        toDelete.push(backup);
      }

      // Delete old backups
      for (const backup of toDelete) {
        await this.storageAdapter.deleteBackup(backup.name);
        this.logger.info(`Deleted old backup: ${backup.name}`);
      }

      return { deleted: toDelete.length };
    } catch (error) {
      this.logger.error(`Retention policy failed: ${error.message}`);
      return { deleted: 0, error: error.message };
    }
  }

  /**
   * List available backups
   */
  async listBackups() {
    return await this.storageAdapter.listBackups();
  }

  /**
   * Restore from backup
   */
  async restoreBackup(backupName) {
    this.logger.info(`Starting restore from: ${backupName}`);

    try {
      // Download backup
      const localPath = await this.storageAdapter.download(backupName);
      
      // Decrypt if needed
      let restoredFile = localPath;
      if (localPath.endsWith('.enc')) {
        restoredFile = await this.decryptFile(localPath);
        fs.unlinkSync(localPath);
      }
      
      // Decompress if needed
      if (restoredFile.endsWith('.gz')) {
        const decompressed = await this.decompressFile(restoredFile);
        fs.unlinkSync(restoredFile);
        restoredFile = decompressed;
      }
      
      // Restore database
      await this.restoreDatabase(restoredFile);
      
      // Cleanup
      fs.unlinkSync(restoredFile);
      
      this.logger.info(`Restore completed successfully from: ${backupName}`);
      return { success: true };
      
    } catch (error) {
      this.logger.error(`Restore failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Decrypt file
   */
  async decryptFile(inputFile) {
    const outputFile = inputFile.replace('.enc', '');
    const algorithm = 'aes-256-gcm';
    const key = this.getEncryptionKey();

    const data = fs.readFileSync(inputFile);
    const iv = data.slice(0, 16);
    const authTag = data.slice(data.length - 16);
    const encrypted = data.slice(16, data.length - 16);

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    fs.writeFileSync(outputFile, decrypted);

    return outputFile;
  }

  /**
   * Decompress file
   */
  async decompressFile(inputFile) {
    const outputFile = inputFile.replace('.gz', '');
    const gunzip = zlib.createGunzip();
    const source = fs.createReadStream(inputFile);
    const destination = fs.createWriteStream(outputFile);

    await pipeline(source, gunzip, destination);
    return outputFile;
  }

  /**
   * Restore database from SQL dump
   */
  async restoreDatabase(dumpFile) {
    const dbType = this.dbAdapter.getType();

    if (dbType === 'postgres') {
      const dbConfig = this.dbAdapter.config;
      const cmd = `PGPASSWORD="${dbConfig.password}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} ${dbConfig.database} < ${dumpFile}`;
      await execAsync(cmd);
    } else {
      const dbPath = this.dbAdapter.dbPath || './data/inventory.db';
      const cmd = `sqlite3 ${dbPath} < ${dumpFile}`;
      await execAsync(cmd);
    }
  }

  /**
   * Send alert on backup failure
   */
  async sendAlert(subject, message) {
    // Email alert implementation would go here
    // For now, just log
    this.logger.error(`ALERT: ${subject} - ${message}`);
  }

  /**
   * Get backup status
   */
  async getStatus() {
    const backups = await this.listBackups();
    const latest = backups.length > 0 ? backups[0] : null;

    return {
      enabled: this.config.enabled,
      storage: this.config.storage,
      schedule: this.config.schedule,
      totalBackups: backups.length,
      latestBackup: latest ? {
        name: latest.name,
        date: latest.date,
        size: latest.size
      } : null,
      retention: {
        daily: this.config.retentionDays,
        monthly: this.config.retentionMonthly,
        yearly: this.config.retentionYearly
      },
      features: {
        encryption: this.config.encryption,
        compression: this.config.compression
      }
    };
  }
}

module.exports = BackupManager;