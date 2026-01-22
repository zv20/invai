# System Update Endpoint - Installation Instructions

This patch adds the `/api/system/update` endpoint to enable one-click updates from the web interface.

## Installation Steps

### 1. Open server.js

Find line **545** (right after the `/api/settings/switch-channel` endpoint closes with `});`)

### 2. Add the following code

Insert this code block after line 545:

```javascript
// ========== SYSTEM UPDATE API ==========

app.post('/api/system/update', async (req, res) => {
  try {
    console.log('📥 Triggering system update via API...');
    
    // Step 1: Create backup before update
    const backup = await createBackup('pre_update');
    console.log(`Backup created: ${backup.filename}`);
    
    // Step 2: Run update script
    const updateScript = path.join(__dirname, 'update.sh');
    
    if (!fs.existsSync(updateScript)) {
      return res.status(500).json({ 
        error: 'Update script not found',
        hint: 'update.sh file is missing from the application directory'
      });
    }
    
    // Step 3: Make script executable
    execSync(`chmod +x "${updateScript}"`, { cwd: __dirname });
    
    // Step 4: Run update script with SKIP_PROMPT=true for non-interactive mode
    console.log('Running update script...');
    const output = execSync(`SKIP_PROMPT=true bash "${updateScript}"`, {
      cwd: __dirname,
      encoding: 'utf8',
      env: { ...process.env, SKIP_PROMPT: 'true' }
    });
    
    console.log('Update script output:', output);
    
    res.json({
      message: 'Update completed successfully',
      backupFile: backup.filename,
      output: output,
      restartRequired: true
    });
    
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({
      error: 'Update failed: ' + error.message,
      hint: 'Check server logs for details. You can manually run: ./update.sh'
    });
  }
});
```

### 3. Save the file

### 4. Restart the service

```bash
sudo systemctl restart invai
```

## What This Adds

✅ **One-click updates** from Settings → Updates tab
✅ **Automatic backup** before each update
✅ **Auto-detects systemctl service** for restart
✅ **Non-interactive mode** - no prompts needed
✅ **Error handling** with helpful messages

## Testing

1. Go to Settings → Updates tab in the web interface
2. If an update is available, click "Update Now"
3. System will:
   - Create backup
   - Pull latest code
   - Update dependencies
   - Restart automatically

## Verification

After adding this code, the update system should work without needing to type commands manually!
