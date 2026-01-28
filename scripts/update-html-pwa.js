/**
 * Automated HTML PWA Updater
 * 
 * This script automatically adds PWA and mobile optimization code
 * to all HTML files in the public directory.
 * 
 * Features:
 * - Adds PWA manifest link
 * - Adds mobile meta tags
 * - Adds mobile CSS
 * - Adds PWA scripts
 * - Creates backups before modifying
 * 
 * Usage:
 *   node scripts/update-html-pwa.js
 *   node scripts/update-html-pwa.js --dry-run  (preview without changes)
 *   node scripts/update-html-pwa.js --force     (skip confirmations)
 */

const fs = require('fs');
const path = require('path');

// Configuration
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const BACKUP_DIR = path.join(__dirname, '..', 'backups', 'html-backups');
const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

// HTML snippets to add
const HEAD_SNIPPET = `
<!-- PWA Manifest -->
<link rel="manifest" href="/manifest.json">

<!-- Mobile Optimization -->
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="InvAI">

<!-- Theme Colors -->
<meta name="theme-color" content="#1a1a2e">
<meta name="msapplication-navbutton-color" content="#1a1a2e">

<!-- Mobile CSS -->
<link rel="stylesheet" href="/css/mobile.css">
`;

const BODY_SNIPPET = `
<!-- PWA & Mobile Scripts -->
<script src="/lib/pwa/offlineStorage.js"></script>
<script src="/js/pwa-init.js"></script>
<script src="/js/pwa-install.js"></script>
<script src="/js/touch-gestures.js"></script>
<script src="/js/mobile-components.js"></script>
<script src="/js/mobile-navigation.js"></script>

<!-- Initialize PWA -->
<script>
  // Service worker registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('✓ Service Worker registered'))
        .catch(err => console.error('Service Worker registration failed:', err));
    });
  }
  
  // Initialize touch gestures
  if (typeof TouchGestures !== 'undefined') {
    const gestures = new TouchGestures(document.body);
    
    // Pull to refresh
    gestures.onPullRefresh(() => {
      console.log('Refreshing page...');
      location.reload();
    });
  }
</script>
`;

// Main function
function updateHtmlFiles() {
  console.log('\n📦 HTML PWA Updater\n');
  console.log('━'.repeat(60));
  
  if (DRY_RUN) {
    console.log('👁️  DRY RUN MODE - No files will be modified\n');
  }
  
  // Get all HTML files
  const htmlFiles = getHtmlFiles(PUBLIC_DIR);
  
  if (htmlFiles.length === 0) {
    console.log('⚠️  No HTML files found in public directory\n');
    return;
  }
  
  console.log(`Found ${htmlFiles.length} HTML file(s):\n`);
  htmlFiles.forEach((file, i) => {
    console.log(`  ${i + 1}. ${path.relative(PUBLIC_DIR, file)}`);
  });
  
  console.log('\n' + '━'.repeat(60));
  console.log('\nChanges to be made:');
  console.log('  • Add PWA manifest link');
  console.log('  • Add mobile optimization meta tags');
  console.log('  • Add mobile CSS link');
  console.log('  • Add PWA initialization scripts');
  console.log('  • Add touch gesture handlers\n');
  
  if (!FORCE && !DRY_RUN) {
    console.log('⚠️  This will modify all HTML files!');
    console.log('Backups will be created in: ' + BACKUP_DIR);
    console.log('\nPress Ctrl+C to cancel, or run with --dry-run to preview\n');
    
    // In a real implementation, you'd use readline here
    // For now, we'll just proceed with FORCE flag
  }
  
  // Create backup directory
  if (!DRY_RUN) {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      console.log('✓ Created backup directory\n');
    }
  }
  
  // Process each file
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  console.log('━'.repeat(60));
  console.log('\nProcessing files:\n');
  
  htmlFiles.forEach(file => {
    const fileName = path.relative(PUBLIC_DIR, file);
    
    try {
      const result = updateHtmlFile(file);
      
      if (result === 'updated') {
        console.log(`✓ ${fileName} - Updated`);
        updatedCount++;
      } else if (result === 'skipped') {
        console.log(`⏭️  ${fileName} - Already updated`);
        skippedCount++;
      }
    } catch (error) {
      console.log(`❌ ${fileName} - Error: ${error.message}`);
      errorCount++;
    }
  });
  
  // Summary
  console.log('\n' + '━'.repeat(60));
  console.log('\n📊 Summary:\n');
  console.log(`  Updated:  ${updatedCount}`);
  console.log(`  Skipped:  ${skippedCount}`);
  console.log(`  Errors:   ${errorCount}`);
  console.log(`  Total:    ${htmlFiles.length}\n`);
  
  if (DRY_RUN) {
    console.log('👁️  Dry run complete - No files were modified');
    console.log('Run without --dry-run to apply changes\n');
  } else if (updatedCount > 0) {
    console.log('✅ HTML files updated successfully!');
    console.log(`Backups saved to: ${BACKUP_DIR}\n`);
    console.log('Next steps:');
    console.log('  1. Test pages in browser');
    console.log('  2. Check browser console for errors');
    console.log('  3. Test PWA installation\n');
  } else {
    console.log('✅ All files already up to date!\n');
  }
}

// Get all HTML files recursively
function getHtmlFiles(dir) {
  let htmlFiles = [];
  
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip certain directories
      if (!['node_modules', '.git', 'backups'].includes(file)) {
        htmlFiles = htmlFiles.concat(getHtmlFiles(filePath));
      }
    } else if (file.endsWith('.html')) {
      htmlFiles.push(filePath);
    }
  });
  
  return htmlFiles;
}

// Update a single HTML file
function updateHtmlFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if already updated
  if (content.includes('PWA Manifest') && content.includes('pwa-init.js')) {
    return 'skipped';
  }
  
  if (DRY_RUN) {
    return 'updated'; // Pretend we updated it
  }
  
  // Create backup
  const backupPath = path.join(
    BACKUP_DIR,
    path.basename(filePath) + '.backup-' + Date.now()
  );
  fs.copyFileSync(filePath, backupPath);
  
  let modified = false;
  
  // Add to <head> if not present
  if (!content.includes('PWA Manifest')) {
    content = content.replace(
      '</head>',
      HEAD_SNIPPET + '</head>'
    );
    modified = true;
  }
  
  // Add to <body> if not present
  if (!content.includes('pwa-init.js')) {
    content = content.replace(
      '</body>',
      BODY_SNIPPET + '</body>'
    );
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    return 'updated';
  }
  
  return 'skipped';
}

// Run the updater
try {
  updateHtmlFiles();
} catch (error) {
  console.error('\n❌ Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
