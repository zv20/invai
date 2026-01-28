/**
 * Version API Route
 * Uses git tags as single source of truth for versioning
 * Checks current version against latest GitHub release
 * 
 * UPDATED v0.10.6: Uses lib/version.js for git-tag based versioning (PR #33)
 * FIXED: Added cache busting to avoid stale CDN responses
 */

const express = require('express');
const router = express.Router();
const versionLib = require('../lib/version');

// Get latest version from GitHub (for the current branch)
async function getLatestVersion(branch) {
  try {
    // For beta branch, check beta releases
    // For main branch, check stable releases
    const targetBranch = branch === 'beta' ? 'beta' : 'main';
    
    // Use GitHub API to get latest commit on target branch
    const response = await fetch(
      `https://api.github.com/repos/zv20/invai/commits/${targetBranch}`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Grocery-Inventory-App'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}`);
    }
    
    const data = await response.json();
    const latestCommit = data.sha.substring(0, 7);
    
    // Try to get the latest version tag from GitHub
    const tagsResponse = await fetch(
      `https://api.github.com/repos/zv20/invai/git/refs/tags`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Grocery-Inventory-App'
        }
      }
    );
    
    if (tagsResponse.ok) {
      const tags = await tagsResponse.json();
      // Get latest tag (assuming tags are sorted)
      const latestTag = tags
        .map(t => t.ref.replace('refs/tags/', ''))
        .filter(t => t.match(/^v\d+\.\d+\.\d+$/))
        .sort((a, b) => {
          const aVer = a.replace('v', '').split('.').map(Number);
          const bVer = b.replace('v', '').split('.').map(Number);
          for (let i = 0; i < 3; i++) {
            if (bVer[i] !== aVer[i]) return bVer[i] - aVer[i];
          }
          return 0;
        })[0];
      
      if (latestTag) {
        return {
          version: latestTag.replace(/^v/, ''),
          commit: latestCommit,
          branch: targetBranch,
          tag: latestTag
        };
      }
    }
    
    // Fallback to package.json if tags not available
    const cacheBuster = Date.now();
    const packageResponse = await fetch(
      `https://raw.githubusercontent.com/zv20/invai/${targetBranch}/package.json?cb=${cacheBuster}`,
      {
        headers: {
          'User-Agent': 'Grocery-Inventory-App',
          'Cache-Control': 'no-cache'
        }
      }
    );
    
    if (packageResponse.ok) {
      const packageData = await packageResponse.json();
      return {
        version: packageData.version,
        commit: latestCommit,
        branch: targetBranch
      };
    }
    
    return {
      version: 'unknown',
      commit: latestCommit,
      branch: targetBranch
    };
  } catch (error) {
    console.error('Error fetching latest version:', error);
    return null;
  }
}

// Compare versions (semantic versioning)
function compareVersions(current, latest) {
  // Remove any pre-release identifiers for comparison
  const cleanCurrent = current.split('-')[0];
  const cleanLatest = latest.split('-')[0];
  
  const currentParts = cleanCurrent.split('.').map(Number);
  const latestParts = cleanLatest.split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    const curr = currentParts[i] || 0;
    const lat = latestParts[i] || 0;
    
    if (lat > curr) return true;  // Update available
    if (lat < curr) return false; // Current is newer
  }
  
  return false; // Versions are equal
}

router.get('/', async (req, res) => {
  try {
    // Get version information from git tags (single source of truth)
    const buildInfo = versionLib.getBuildInfo();
    const currentVersion = buildInfo.version;
    const currentBranch = buildInfo.branch;
    const currentCommit = buildInfo.commit;
    const fullVersion = buildInfo.fullVersion;
    const isDev = buildInfo.isDev;
    
    // Get latest version from GitHub
    const latest = await getLatestVersion(currentBranch);
    
    if (!latest) {
      return res.json({
        currentVersion,
        fullVersion,
        currentBranch,
        currentCommit,
        isDev,
        latestVersion: currentVersion,
        latestCommit: currentCommit,
        updateAvailable: false,
        buildInfo,
        error: 'Could not check for updates. Using cached version.'
      });
    }
    
    // Compare versions
    const updateAvailable = compareVersions(currentVersion, latest.version) || 
                           (currentCommit !== latest.commit && currentBranch === latest.branch && !isDev);
    
    res.json({
      currentVersion,
      fullVersion,
      currentBranch,
      currentCommit,
      isDev,
      latestVersion: latest.version,
      latestCommit: latest.commit,
      latestBranch: latest.branch,
      latestTag: latest.tag,
      updateAvailable,
      buildInfo,
      message: updateAvailable 
        ? `Update available: ${currentVersion} → ${latest.version}` 
        : 'You are running the latest version'
    });
  } catch (error) {
    console.error('Version check error:', error);
    
    const buildInfo = versionLib.getBuildInfo();
    
    res.status(500).json({
      currentVersion: buildInfo.version,
      fullVersion: buildInfo.fullVersion,
      currentBranch: buildInfo.branch,
      isDev: buildInfo.isDev,
      buildInfo,
      latestVersion: buildInfo.version,
      updateAvailable: false,
      error: 'Failed to check for updates: ' + error.message
    });
  }
});

module.exports = router;
