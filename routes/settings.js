/**
 * Settings Routes
 * Phase 2: Modular route structure
 */

const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const UPDATE_CHANNEL_FILE = path.join(__dirname, '..', '.update-channel');

function getCurrentChannel() {
  try {
    if (fs.existsSync(UPDATE_CHANNEL_FILE)) {
      return fs.readFileSync(UPDATE_CHANNEL_FILE, 'utf8').trim();
    }
  } catch (err) {
    console.error('Error reading channel file:', err);
  }
  return 'stable';
}

function getCurrentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch (err) {
    return 'unknown';
  }
}

module.exports = (db, createBackup) => {
  // Get preferences
  router.get('/preferences', asyncHandler(async (req, res) => {
    const prefs = await db.get('SELECT * FROM user_preferences WHERE user_id = 1', []);
    res.json(prefs || { theme: 'auto' });
  }));

  // Save preferences
  router.post('/preferences', asyncHandler(async (req, res) => {
    const { theme } = req.body;
    await db.run(
      `INSERT OR REPLACE INTO user_preferences (user_id, theme, updated_at) VALUES (1, ?, CURRENT_TIMESTAMP)`,
      [theme]
    );
    res.json({ success: true, theme });
  }));

  // Get update channel
  router.get('/update-channel', (req, res) => {
    const currentChannel = getCurrentChannel();
    const currentBranch = getCurrentBranch();

    const availableChannels = [
      {
        id: 'stable',
        name: 'Stable',
        description: 'Production-ready releases. Most reliable and thoroughly tested.',
        branch: 'main'
      },
      {
        id: 'beta',
        name: 'Beta',
        description: 'Latest features and improvements. May have minor bugs.',
        branch: 'beta'
      }
    ];

    res.json({
      channel: currentChannel,
      currentBranch,
      availableChannels
    });
  });

  // Set update channel
  router.post('/update-channel', (req, res) => {
    const { channel } = req.body;

    if (!channel || !['stable', 'beta'].includes(channel)) {
      return res.status(400).json({ error: 'Invalid channel. Must be "stable" or "beta"' });
    }

    try {
      fs.writeFileSync(UPDATE_CHANNEL_FILE, channel, 'utf8');
      res.json({ message: 'Channel preference saved', channel });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save channel preference: ' + error.message });
    }
  });

  // Switch channel
  router.post('/switch-channel', asyncHandler(async (req, res) => {
    const { channel } = req.body;

    if (!channel || !['stable', 'beta'].includes(channel)) {
      return res.status(400).json({ error: 'Invalid channel. Must be "stable" or "beta"' });
    }

    const targetBranch = channel === 'stable' ? 'main' : 'beta';
    const currentBranch = getCurrentBranch();

    if (currentBranch === targetBranch) {
      return res.json({
        message: 'Already on target branch',
        branch: targetBranch,
        channel
      });
    }

    try {
      console.log(`Creating backup before switching to ${channel} channel...`);
      const backup = await createBackup(`pre_channel_switch_${channel}`);
      console.log(`Backup created: ${backup.filename}`);

      console.log('Fetching latest changes...');
      execSync('git fetch origin', { cwd: path.join(__dirname, '..'), encoding: 'utf8' });

      console.log(`Switching to ${targetBranch} branch...`);
      execSync(`git checkout ${targetBranch}`, { cwd: path.join(__dirname, '..'), encoding: 'utf8' });

      console.log('Pulling latest changes...');
      execSync(`git pull origin ${targetBranch}`, { cwd: path.join(__dirname, '..'), encoding: 'utf8' });

      console.log('Updating dependencies...');
      execSync('npm install --production', { cwd: path.join(__dirname, '..'), encoding: 'utf8' });

      fs.writeFileSync(UPDATE_CHANNEL_FILE, channel, 'utf8');

      console.log(`✅ Successfully switched to ${channel} channel (${targetBranch} branch)`);

      res.json({
        message: `Successfully switched to ${channel} channel`,
        channel,
        branch: targetBranch,
        backupFile: backup.filename,
        restartRequired: true
      });
    } catch (error) {
      console.error('Channel switch failed:', error);
      res.status(500).json({
        error: 'Failed to switch channel: ' + error.message,
        hint: 'You can manually revert with: git checkout ' + currentBranch
      });
    }
  }));

  return router;
};
