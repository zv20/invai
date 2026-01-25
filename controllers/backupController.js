/**
 * Backup Controller
 * Business logic for database backup operations
 */

const fs = require('fs');
const path = require('path');

class BackupController {
  constructor(createBackupFn, backupDir) {
    this.createBackup = createBackupFn;
    this.backupDir = backupDir;
  }

  async create() {
    const backup = await this.createBackup();
    const stats = fs.statSync(backup.path);
    
    return {
      filename: backup.filename,
      size: stats.size,
      created: stats.mtime
    };
  }

  listAll() {
    const files = fs.readdirSync(this.backupDir)
      .filter(file => file.startsWith('backup_') && file.endsWith('.db'))
      .map(file => {
        const stats = fs.statSync(path.join(this.backupDir, file));
        return {
          filename: file,
          size: stats.size,
          created: stats.mtime,
          age: Date.now() - stats.mtime.getTime()
        };
      })
      .sort((a, b) => b.created - a.created);
    
    return files;
  }

  getFilePath(filename) {
    if (!this.isValidFilename(filename)) {
      throw new Error('Invalid backup filename');
    }
    
    const filePath = path.join(this.backupDir, filename);
    if (!fs.existsSync(filePath)) {
      throw new Error('Backup file not found');
    }
    
    return filePath;
  }

  delete(filename) {
    const filePath = this.getFilePath(filename);
    fs.unlinkSync(filePath);
    return { success: true, filename };
  }

  async restore(filename, sqliteDb, Database) {
    const backupPath = this.getFilePath(filename);
    
    // Create safety backup before restore
    const safetyBackup = await this.createBackup();
    
    // Close current database connection
    await new Promise((resolve, reject) => {
      sqliteDb.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Copy backup file to main database
    const dbPath = path.join(__dirname, '..', 'inventory.db');
    fs.copyFileSync(backupPath, dbPath);
    
    // Reopen database
    const sqlite3 = require('sqlite3').verbose();
    const newDb = new sqlite3.Database(dbPath, (err) => {
      if (err) throw new Error('Failed to reopen database after restore');
    });
    
    return {
      newDbConnection: newDb,
      dbWrapper: new Database(newDb),
      safetyBackup: safetyBackup.filename,
      restoredFrom: filename
    };
  }

  async uploadAndRestore(uploadedFile, sqliteDb, Database) {
    // Create safety backup
    const safetyBackup = await this.createBackup();
    
    // Close current database
    await new Promise((resolve, reject) => {
      sqliteDb.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Copy uploaded file to main database
    const dbPath = path.join(__dirname, '..', 'inventory.db');
    fs.copyFileSync(uploadedFile.path, dbPath);
    
    // Clean up uploaded file
    fs.unlinkSync(uploadedFile.path);
    
    // Reopen database
    const sqlite3 = require('sqlite3').verbose();
    const newDb = new sqlite3.Database(dbPath, (err) => {
      if (err) throw new Error('Failed to reopen database after restore');
    });
    
    return {
      newDbConnection: newDb,
      dbWrapper: new Database(newDb),
      safetyBackup: safetyBackup.filename,
      originalFilename: uploadedFile.originalname
    };
  }

  isValidFilename(filename) {
    return filename.startsWith('backup_') && filename.endsWith('.db');
  }
}

module.exports = BackupController;
