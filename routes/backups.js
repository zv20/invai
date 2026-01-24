/**
 * Backup Routes
 * Database backup management (admin only)
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const asyncHandler = require('../middleware/asyncHandler');
const { authorize } = require('../middleware/auth');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');

// Configure multer for file uploads
const upload = multer({
  dest: path.join(__dirname, '..', 'temp'),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.db')) {
      cb(null, true);
    } else {
      cb(new Error('Only .db files are allowed'));
    }
  }
});

module.exports = (createBackup, sqliteDb, Database) => {
  const router = express.Router();

  // All backup routes require admin access
  router.use(authorize('admin'));

  // Create backup
  router.post('/create', asyncHandler(async (req, res) => {
    const backup = await createBackup();
    const stats = fs.statSync(backup.path);
    res.json({ 
      message: 'Backup created successfully', 
      filename: backup.filename,
      size: stats.size,
      created: stats.mtime
    });
  }));

  // List backups
  router.get('/list', (req, res) => {
    try {
      const files = fs.readdirSync(BACKUP_DIR)
        .filter(file => file.startsWith('backup_') && file.endsWith('.db'))
        .map(file => {
          const stats = fs.statSync(path.join(BACKUP_DIR, file));
          return {
            filename: file,
            size: stats.size,
            created: stats.mtime,
            age: Date.now() - stats.mtime.getTime()
          };
        })
        .sort((a, b) => b.created - a.created);
      res.json(files);
    } catch (error) {
      console.error('Error listing backups:', error);
      res.status(500).json({ error: 'Failed to list backups: ' + error.message });
    }
  });

  // Download backup
  router.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    if (!filename.startsWith('backup_') || !filename.endsWith('.db')) {
      return res.status(400).json({ error: 'Invalid backup filename' });
    }
    const filePath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }
    res.download(filePath, filename);
  });

  // Delete backup
  router.delete('/delete/:filename', (req, res) => {
    const filename = req.params.filename;
    if (!filename.startsWith('backup_') || !filename.endsWith('.db')) {
      return res.status(400).json({ error: 'Invalid backup filename' });
    }
    const filePath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }
    try {
      fs.unlinkSync(filePath);
      res.json({ message: 'Backup deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete backup: ' + error.message });
    }
  });

  // Restore backup
  router.post('/restore/:filename', asyncHandler(async (req, res) => {
    const filename = req.params.filename;
    
    if (!filename.startsWith('backup_') || !filename.endsWith('.db')) {
      return res.status(400).json({ error: 'Invalid backup filename' });
    }
    
    const backupPath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }
    
    const safetyBackup = await createBackup();
    console.log(`Safety backup created: ${safetyBackup.filename}`);
    
    await new Promise((resolve, reject) => {
      sqliteDb.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    const dbPath = path.join(__dirname, '..', 'inventory.db');
    fs.copyFileSync(backupPath, dbPath);
    console.log(`Database restored from: ${filename}`);
    
    const sqlite3 = require('sqlite3').verbose();
    sqliteDb = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error reopening database:', err);
      } else {
        console.log('Database reconnected after restore');
        global.db = new Database(sqliteDb);
      }
    });
    
    res.json({ 
      message: 'Database restored successfully', 
      restoredFrom: filename,
      safetyBackup: safetyBackup.filename
    });
  }));

  // Upload and restore backup
  router.post('/upload', upload.single('backup'), asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const safetyBackup = await createBackup();
    console.log(`Safety backup created: ${safetyBackup.filename}`);
    
    await new Promise((resolve, reject) => {
      sqliteDb.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    const dbPath = path.join(__dirname, '..', 'inventory.db');
    fs.copyFileSync(req.file.path, dbPath);
    console.log(`Database restored from uploaded file: ${req.file.originalname}`);
    
    fs.unlinkSync(req.file.path);
    
    const sqlite3 = require('sqlite3').verbose();
    sqliteDb = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error reopening database:', err);
      } else {
        console.log('Database reconnected after restore');
        global.db = new Database(sqliteDb);
      }
    });
    
    res.json({ 
      message: 'Database restored from upload successfully', 
      originalFilename: req.file.originalname,
      safetyBackup: safetyBackup.filename
    });
  }));

  return router;
};
