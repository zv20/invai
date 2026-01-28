#!/usr/bin/env node
/**
 * Automated Version Bump Script
 * Uses git tags as single source of truth for versioning
 * 
 * Usage:
 *   npm run version:bump patch   # 0.10.5 -> 0.10.6
 *   npm run version:bump minor   # 0.10.5 -> 0.11.0
 *   npm run version:bump major   # 0.10.5 -> 1.0.0
 *   npm run version:current      # Show current version
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, silent = false) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: silent ? 'pipe' : 'inherit' }).trim();
  } catch (error) {
    if (!silent) {
      log(`Error executing: ${command}`, 'red');
      log(error.message, 'red');
    }
    throw error;
  }
}

/**
 * Get current version from git tags
 */
function getCurrentVersion() {
  try {
    // Get the latest tag that matches semantic versioning pattern
    const tag = exec('git describe --tags --abbrev=0 --match "v[0-9]*.[0-9]*.[0-9]*" 2>/dev/null || echo "v0.10.5"', true);
    return tag.replace(/^v/, '');
  } catch (error) {
    log('No version tags found, using v0.10.5', 'yellow');
    return '0.10.5';
  }
}

/**
 * Parse semantic version
 */
function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid version format: ${version}`);
  }
  return {
    major: parseInt(match[1]),
    minor: parseInt(match[2]),
    patch: parseInt(match[3])
  };
}

/**
 * Bump version based on type
 */
function bumpVersion(current, type) {
  const v = parseVersion(current);
  
  switch (type) {
    case 'major':
      return `${v.major + 1}.0.0`;
    case 'minor':
      return `${v.major}.${v.minor + 1}.0`;
    case 'patch':
      return `${v.major}.${v.minor}.${v.patch + 1}`;
    default:
      throw new Error(`Invalid bump type: ${type}. Use: patch, minor, or major`);
  }
}

/**
 * Check if git working directory is clean
 */
function isGitClean() {
  try {
    const status = exec('git status --porcelain', true);
    return status.length === 0;
  } catch (error) {
    return false;
  }
}

/**
 * Update package.json version
 */
function updatePackageJson(newVersion) {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  const oldVersion = packageJson.version;
  packageJson.version = newVersion;
  
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
  
  log(`📦 Updated package.json: ${oldVersion} → ${newVersion}`, 'green');
}

/**
 * Generate changelog from git commits since last tag
 */
function generateChangelog(currentVersion, newVersion) {
  try {
    const commits = exec(`git log v${currentVersion}..HEAD --pretty=format:"- %s (%h)" --no-merges`, true);
    
    if (!commits) {
      return `## v${newVersion}\n\nNo changes recorded.`;
    }
    
    return `## v${newVersion}\n\n${commits}`;
  } catch (error) {
    return `## v${newVersion}\n\nChangelog generation failed.`;
  }
}

/**
 * Create git tag and commit
 */
function createTagAndCommit(newVersion) {
  const tag = `v${newVersion}`;
  
  // Stage package.json
  exec('git add package.json');
  
  // Commit version bump
  exec(`git commit -m "chore: bump version to ${newVersion}"`);
  
  // Create annotated tag with changelog
  const changelog = generateChangelog(getCurrentVersion(), newVersion);
  exec(`git tag -a ${tag} -m "${changelog}"`);
  
  log(`\n✅ Created tag: ${tag}`, 'green');
  log(`📝 Committed version bump`, 'green');
}

/**
 * Display current version info
 */
function showCurrentVersion() {
  const version = getCurrentVersion();
  const branch = exec('git rev-parse --abbrev-ref HEAD', true);
  const commit = exec('git rev-parse --short HEAD', true);
  
  log('\n📊 Current Version Info:', 'cyan');
  log('━'.repeat(50), 'cyan');
  log(`Version:  v${version}`, 'blue');
  log(`Branch:   ${branch}`, 'blue');
  log(`Commit:   ${commit}`, 'blue');
  log('━'.repeat(50), 'cyan');
  log('\n💡 To bump version:', 'yellow');
  log('   npm run version:bump patch   # Bug fixes', 'yellow');
  log('   npm run version:bump minor   # New features', 'yellow');
  log('   npm run version:bump major   # Breaking changes', 'yellow');
  console.log('');
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  
  // Show current version if no arguments
  if (args.length === 0) {
    showCurrentVersion();
    return;
  }
  
  const bumpType = args[0];
  
  // Validate bump type
  if (!['patch', 'minor', 'major'].includes(bumpType)) {
    log(`\n❌ Invalid bump type: ${bumpType}`, 'red');
    log('   Use: patch, minor, or major\n', 'yellow');
    process.exit(1);
  }
  
  log('\n🚀 Starting Version Bump...', 'cyan');
  log('━'.repeat(50), 'cyan');
  
  // Check git status
  if (!isGitClean()) {
    log('\n❌ Git working directory is not clean!', 'red');
    log('   Commit or stash your changes before bumping version.\n', 'yellow');
    process.exit(1);
  }
  
  // Get current version
  const currentVersion = getCurrentVersion();
  log(`Current version: v${currentVersion}`, 'blue');
  
  // Calculate new version
  const newVersion = bumpVersion(currentVersion, bumpType);
  log(`New version:     v${newVersion}`, 'green');
  log(`Bump type:       ${bumpType}`, 'yellow');
  
  // Confirm
  log('\n⚠️  This will:', 'yellow');
  log(`   1. Update package.json to v${newVersion}`, 'yellow');
  log(`   2. Commit the changes`, 'yellow');
  log(`   3. Create git tag v${newVersion}`, 'yellow');
  log(`   4. Generate changelog from commits\n`, 'yellow');
  
  // Update files
  updatePackageJson(newVersion);
  
  // Create tag and commit
  createTagAndCommit(newVersion);
  
  // Success message
  log('\n━'.repeat(50), 'green');
  log('✅ Version bump complete!', 'green');
  log('━'.repeat(50), 'green');
  log(`\n📌 Next steps:`, 'cyan');
  log(`   git push origin $(git rev-parse --abbrev-ref HEAD)`, 'blue');
  log(`   git push origin v${newVersion}`, 'blue');
  log(`\n🎉 Version v${newVersion} is ready!\n`, 'green');
}

// Run
try {
  main();
} catch (error) {
  log(`\n❌ Error: ${error.message}\n`, 'red');
  process.exit(1);
}
