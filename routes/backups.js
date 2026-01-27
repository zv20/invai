/**
 * Backup Routes
 * HTTP layer for database backup operations (admin only)
 * FIXED: Added no-cache headers to list endpoint
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const asyncHandler = require('../middleware/asyncHandler');
const { authorize } = require('../middleware/auth');
const BackupController = require('../controllers/backupController');

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
  const controller = new BackupController(createBackup, BACKUP_DIR);

  // All backup routes require admin access
  router.use(authorize('admin'));

  // Create backup
  router.post('/create', asyncHandler(async (req, res) => {
    const backup = await controller.create();
    res.json({ message: 'Backup created successfully', ...backup });
  }));

  // List backups - FIXED: Added no-cache headers
  router.get('/list', asyncHandler(async (req, res) => {
    const backups = controller.listAll();
    
    // Prevent browser caching of backup list
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.json(backups);
  }));

  // Download backup
  router.get('/download/:filename', asyncHandler(async (req, res) => {
    try {
      const filePath = controller.getFilePath(req.params.filename);
      res.download(filePath, req.params.filename);
    } catch (error) {
      res.status(error.message.includes('not found') ? 404 : 400).json({ error: error.message });
    }
  }));

  // Delete backup
  router.delete('/delete/:filename', asyncHandler(async (req, res) => {
    try {
      const result = controller.delete(req.params.filename);
      res.json({ message: 'Backup deleted successfully', ...result });
    } catch (error) {
      res.status(error.message.includes('not found') ? 404 : 400).json({ error: error.message });
    }
  }));

  // Restore backup
  router.post('/restore/:filename', asyncHandler(async (req, res) => {
    try {
      const result = await controller.restore(req.params.filename, sqliteDb, Database);
      
      // Update global database references
      global.sqliteDb = result.newDbConnection;
      global.db = result.dbWrapper;
      
      res.json({ 
        message: 'Database restored successfully', 
        restoredFrom: result.restoredFrom,
        safetyBackup: result.safetyBackup
      });
    } catch (error) {
      res.status(error.message.includes('not found') ? 404 : 500).json({ error: error.message });
    }
  }));

  // Upload and restore backup
  router.post('/upload', upload.single('backup'), asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const result = await controller.uploadAndRestore(req.file, sqliteDb, Database);
      
      // Update global database references
      global.sqliteDb = result.newDbConnection;
      global.db = result.dbWrapper;
      
      res.json({ 
        message: 'Database restored from upload successfully', 
        originalFilename: result.originalFilename,
        safetyBackup: result.safetyBackup
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }));

  return router;
};
