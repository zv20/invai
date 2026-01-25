/**
 * System Routes
 * Health checks, version info, changelog, migrations, and database management
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const asyncHandler = require('../middleware/asyncHandler');
const { authorize } = require('../middleware/auth');

module.exports = (db, logger, VERSION, MigrationRunner, sqliteDb, checkGitHubVersion, getCurrentChannel) => {
  const router = express.Router();

  // Health check (public)
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', version: VERSION, timestamp: new Date().toISOString() });
  });

  // Detailed health (public)
  router.get('/api/health', (req, res) => {
    const cache = require('../lib/cache-manager');
    res.json({
      status: 'ok',
      version: VERSION,
      phase: 'Phase 2.1 Complete - Modular + Auth',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      cacheStats: cache.getStats ? cache.getStats() : {},
      authentication: 'enabled'
    });
  });

  // Version check (public)
  router.get('/version', asyncHandler(async (req, res) => {
    try {
      const currentChannel = getCurrentChannel();
      const targetBranch = currentChannel === 'stable' ? 'main' : 'beta';
      const updateInfo = await checkGitHubVersion(targetBranch);
      res.json({ ...updateInfo, channel: currentChannel, branch: targetBranch });
    } catch (error) {
      console.error('Error checking GitHub version:', error.message);
      res.json({
        latestVersion: VERSION,
        currentVersion: VERSION,
        updateAvailable: false,
        error: 'Could not check for updates',
        channel: getCurrentChannel()
      });
    }
  }));

  // Changelog (public)
  router.get('/changelog', (req, res) => {
    try {
      const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
      
      if (!fs.existsSync(changelogPath)) {
        return res.json({
          version: VERSION,
          changes: [],
          error: 'CHANGELOG.md not found'
        });
      }
      
      const changelogContent = fs.readFileSync(changelogPath, 'utf8');
      const lines = changelogContent.split('\n');
      
      const versions = [];
      let currentVersion = null;
      let currentChanges = [];
      let currentDate = null;
      
      lines.forEach(line => {
        const versionMatch = line.match(/^##\s*\[([\d.]+)\]\s*-\s*(.+)/);
        if (versionMatch) {
          if (currentVersion) {
            versions.push({
              version: currentVersion,
              date: currentDate,
              changes: currentChanges
            });
          }
          currentVersion = versionMatch[1];
          currentDate = versionMatch[2].trim();
          currentChanges = [];
        } else if (line.startsWith('###')) {
          const category = line.replace(/^###\s*/, '').trim();
          currentChanges.push({ type: 'category', text: category });
        } else if (line.startsWith('- ')) {
          const change = line.replace(/^-\s*/, '').trim();
          if (change) {
            currentChanges.push({ type: 'item', text: change });
          }
        }
      });
      
      if (currentVersion) {
        versions.push({
          version: currentVersion,
          date: currentDate,
          changes: currentChanges
        });
      }
      
      res.json({
        currentVersion: VERSION,
        versions: versions.slice(0, 5)
      });
    } catch (error) {
      console.error('Error reading changelog:', error);
      res.status(500).json({ error: 'Failed to read changelog' });
    }
  });

  // Migrations status (admin only)
  router.get('/migrations/status', authorize('admin'), asyncHandler(async (req, res) => {
    const migrator = new MigrationRunner(sqliteDb);
    const currentVersion = await migrator.getCurrentVersion();
    const history = await migrator.getHistory();
    
    res.json({
      currentVersion,
      totalMigrations: history.length,
      history: history.slice(0, 10)
    });
  }));

  // Database reset (admin only)
  router.post('/database/reset', authorize('admin'), asyncHandler(async (req, res) => {
    await db.run('DELETE FROM inventory_batches', []);
    await db.run('DELETE FROM products', []);
    await db.run('DELETE FROM sqlite_sequence WHERE name="products" OR name="inventory_batches"', []);
    
    logger.warn(`Database reset by user: ${req.user.username}`);
    console.log('Database reset completed');
    res.json({ 
      message: 'Database reset successful. All data has been deleted.', 
      timestamp: new Date().toISOString() 
    });
  }));

  return router;
};
