/**
 * Version API Route
 * Checks current version against latest GitHub release
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read current version from package.json
function getCurrentVersion() {
  try {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return packageJson.version;
  } catch (error) {
    console.error('Error reading package.json:', error);
    return 'unknown';
  }
}

// Get current git branch
function getCurrentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch (error) {
    return 'unknown';
  }
}

// Get current commit SHA
function getCurrentCommit() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim().substring(0, 7);
  } catch (error) {
    return 'unknown';
  }
}

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
    
    // Also try to get the version from package.json on GitHub
    const packageResponse = await fetch(
      `https://raw.githubusercontent.com/zv20/invai/${targetBranch}/package.json`,
      {
        headers: {
          'User-Agent': 'Grocery-Inventory-App'
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
  // Remove '-beta' suffix for comparison
  const cleanCurrent = current.replace('-beta', '');
  const cleanLatest = latest.replace('-beta', '');
  
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
    const currentVersion = getCurrentVersion();
    const currentBranch = getCurrentBranch();
    const currentCommit = getCurrentCommit();
    
    // Get latest version from GitHub
    const latest = await getLatestVersion(currentBranch);
    
    if (!latest) {
      return res.json({
        currentVersion,
        currentBranch,
        currentCommit,
        latestVersion: currentVersion,
        latestCommit: currentCommit,
        updateAvailable: false,
        error: 'Could not check for updates. Using cached version.'
      });
    }
    
    // Compare versions
    const updateAvailable = compareVersions(currentVersion, latest.version) || 
                           (currentCommit !== latest.commit && currentBranch === latest.branch);
    
    res.json({
      currentVersion,
      currentBranch,
      currentCommit,
      latestVersion: latest.version,
      latestCommit: latest.commit,
      latestBranch: latest.branch,
      updateAvailable,
      message: updateAvailable 
        ? `Update available: ${currentVersion} → ${latest.version}` 
        : 'You are running the latest version'
    });
  } catch (error) {
    console.error('Version check error:', error);
    
    const currentVersion = getCurrentVersion();
    const currentBranch = getCurrentBranch();
    
    res.status(500).json({
      currentVersion,
      currentBranch,
      latestVersion: currentVersion,
      updateAvailable: false,
      error: 'Failed to check for updates: ' + error.message
    });
  }
});

module.exports = router;
