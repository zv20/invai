/**
 * Local Storage Adapter - Sprint 4 Phase 2
 * 
 * Stores backups in local filesystem or NAS mount
 */

const fs = require('fs');
const path = require('path');

class LocalStorageAdapter {
  constructor(logger) {
    this.logger = logger;
    this.backupDir = process.env.BACKUP_LOCAL_PATH || path.join(__dirname, '../../../backups');
    
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async upload(filePath, backupName) {
    const fileName = path.basename(filePath);
    const destination = path.join(this.backupDir, fileName);
    
    fs.copyFileSync(filePath, destination);
    const stats = fs.statSync(destination);
    
    this.logger.info(`Backup uploaded to local storage: ${fileName}`);
    
    return {
      path: destination,
      size: stats.size
    };
  }

  async download(backupName) {
    const backupPath = path.join(this.backupDir, backupName);
    const tempDir = path.join(__dirname, '../../../temp');
    const tempPath = path.join(tempDir, backupName);
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    fs.copyFileSync(backupPath, tempPath);
    return tempPath;
  }

  async listBackups() {
    const files = fs.readdirSync(this.backupDir)
      .filter(file => file.startsWith('backup_'))
      .map(file => {
        const stats = fs.statSync(path.join(this.backupDir, file));
        return {
          name: file,
          date: stats.mtime,
          size: stats.size
        };
      })
      .sort((a, b) => b.date - a.date);
    
    return files;
  }

  async deleteBackup(backupName) {
    const backupPath = path.join(this.backupDir, backupName);
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
      this.logger.info(`Deleted backup: ${backupName}`);
    }
  }
}

module.exports = LocalStorageAdapter;