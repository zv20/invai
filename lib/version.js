/**
 * Version Utility Module
 * Reads version from git tags (single source of truth)
 * Provides runtime version information for the application
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

let cachedVersion = null;
let cachedBuildInfo = null;

/**
 * Execute git command safely
 */
function execGit(command, fallback = null) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (error) {
    return fallback;
  }
}

/**
 * Get current version from git tags
 * Falls back to package.json if git is not available
 */
function getVersion() {
  if (cachedVersion) {
    return cachedVersion;
  }

  // Try git tags first (single source of truth)
  const gitTag = execGit('git describe --tags --abbrev=0 --match "v[0-9]*.[0-9]*.[0-9]*"');
  if (gitTag) {
    cachedVersion = gitTag.replace(/^v/, '');
    return cachedVersion;
  }

  // Fallback to package.json
  try {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    cachedVersion = packageJson.version;
    return cachedVersion;
  } catch (error) {
    // Last resort fallback
    cachedVersion = '0.0.0';
    return cachedVersion;
  }
}

/**
 * Get current git branch
 */
function getBranch() {
  return execGit('git rev-parse --abbrev-ref HEAD', 'unknown');
}

/**
 * Get current git commit hash (short)
 */
function getCommitHash() {
  return execGit('git rev-parse --short HEAD', 'unknown');
}

/**
 * Get commit count since last tag
 */
function getCommitsSinceTag() {
  const count = execGit('git rev-list $(git describe --tags --abbrev=0)..HEAD --count', '0');
  return parseInt(count) || 0;
}

/**
 * Get latest git tag
 */
function getLatestTag() {
  return execGit('git describe --tags --abbrev=0', 'v0.0.0');
}

/**
 * Check if working directory is clean
 */
function isClean() {
  const status = execGit('git status --porcelain', '');
  return status.length === 0;
}

/**
 * Get build date
 */
function getBuildDate() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Get comprehensive build information
 */
function getBuildInfo() {
  if (cachedBuildInfo) {
    return cachedBuildInfo;
  }

  const version = getVersion();
  const branch = getBranch();
  const commit = getCommitHash();
  const commitsSinceTag = getCommitsSinceTag();
  const tag = getLatestTag();
  const clean = isClean();
  const buildDate = getBuildDate();

  // Determine if this is a development build
  const isDev = commitsSinceTag > 0 || !clean;
  
  // Full version string with metadata
  let fullVersion = version;
  if (isDev) {
    fullVersion = `${version}-dev.${commitsSinceTag}+${commit}`;
  }

  cachedBuildInfo = {
    version,
    fullVersion,
    branch,
    commit,
    commitsSinceTag,
    tag,
    clean,
    isDev,
    buildDate,
    node: process.version,
    platform: process.platform
  };

  return cachedBuildInfo;
}

/**
 * Clear cached version info (for testing)
 */
function clearCache() {
  cachedVersion = null;
  cachedBuildInfo = null;
}

/**
 * Format version info for display
 */
function formatVersionInfo() {
  const info = getBuildInfo();
  
  return [
    `Version:  ${info.fullVersion}`,
    `Branch:   ${info.branch}`,
    `Commit:   ${info.commit}`,
    `Tag:      ${info.tag}`,
    `Built:    ${info.buildDate}`,
    `Status:   ${info.clean ? 'clean' : 'modified'}`,
    `Node:     ${info.node}`,
    `Platform: ${info.platform}`
  ].join('\n');
}

module.exports = {
  getVersion,
  getBranch,
  getCommitHash,
  getCommitsSinceTag,
  getLatestTag,
  isClean,
  getBuildDate,
  getBuildInfo,
  clearCache,
  formatVersionInfo
};
