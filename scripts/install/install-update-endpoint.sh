#!/bin/bash
# Install Update Endpoint to server.js
# This adds the /api/system/update endpoint for one-click updates from web UI
# NOTE: This feature is planned but not yet implemented in the UI

set -e

echo "===================================================="
echo "  Installing System Update Endpoint"
echo "===================================================="
echo ""

# Check if server.js exists
if [ ! -f "server.js" ]; then
    echo "❌ Error: server.js not found in current directory"
    echo "Please run this script from the invai root directory"
    exit 1
fi

# Create backup
echo "💾 Creating backup of server.js..."
cp server.js server.js.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Backup created"
echo ""

# Check if endpoint already exists
if grep -q "/api/system/update" server.js; then
    echo "ℹ️  Update endpoint already exists in server.js"
    echo "No changes needed."
    exit 0
fi

# Find the line number where we need to insert
LINE_NUM=$(grep -n "app.post('/api/settings/switch-channel'" server.js | tail -1 | cut -d: -f1)

if [ -z "$LINE_NUM" ]; then
    echo "❌ Error: Could not find /api/settings/switch-channel endpoint"
    echo "Please manually add the code from SYSTEM_UPDATE_PATCH.md"
    exit 1
fi

# Find the closing of that endpoint (look for });)
CLOSE_LINE=$(awk -v start="$LINE_NUM" 'NR > start && /^});/ {print NR; exit}' server.js)

if [ -z "$CLOSE_LINE" ]; then
    echo "❌ Error: Could not find end of switch-channel endpoint"
    exit 1
fi

echo "🔍 Found insertion point at line $CLOSE_LINE"
echo ""

# Create the endpoint code
cat > /tmp/update-endpoint.tmp << 'ENDPOINT'

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
ENDPOINT

# Insert the code
echo "➕ Adding update endpoint to server.js..."
head -n "$CLOSE_LINE" server.js > server.js.new
cat /tmp/update-endpoint.tmp >> server.js.new
tail -n +$((CLOSE_LINE + 1)) server.js >> server.js.new
mv server.js.new server.js
rm /tmp/update-endpoint.tmp

echo "✅ Update endpoint added successfully!"
echo ""
echo "===================================================="
echo "  Installation Complete!"
echo "===================================================="
echo ""
echo "🔄 Next steps:"
echo "  1. Restart your service: sudo systemctl restart invai"
echo "  2. Go to Settings → Updates in the web interface"
echo "  3. Click 'Update Now' button to test (UI feature not yet implemented)"
echo ""
echo "💾 Backup saved as: server.js.backup.*"
echo ""
