# Versioning Guide

## Overview

This project uses **git tags** as the single source of truth for versioning, following industry-standard semantic versioning (semver) practices.

## Semantic Versioning

Version format: `MAJOR.MINOR.PATCH` (e.g., `1.2.3`)

- **MAJOR**: Breaking changes (incompatible API changes)
- **MINOR**: New features (backwards-compatible)
- **PATCH**: Bug fixes (backwards-compatible)

## Quick Start

### Check Current Version

```bash
npm run version:current
```

Outputs:
```
📊 Current Version Info:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Version:  v0.10.6
Branch:   beta
Commit:   a1b2c3d
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Bump Version

**Patch (Bug Fixes):**
```bash
npm run version:patch
# 0.10.6 → 0.10.7
```

**Minor (New Features):**
```bash
npm run version:minor
# 0.10.6 → 0.11.0
```

**Major (Breaking Changes):**
```bash
npm run version:major
# 0.10.6 → 1.0.0
```

### Push Changes

After bumping version, push both the commit and tag:

```bash
git push origin beta
git push origin v0.10.7
```

## How It Works

### 1. Git Tags as Source of Truth

- Version is determined by git tags (`v1.2.3`)
- `package.json` is automatically updated to match
- No manual version editing needed

### 2. Automated Version Script

The `scripts/bump-version.js` script:

1. ✅ Checks git working directory is clean
2. ✅ Reads current version from git tags
3. ✅ Calculates new version based on bump type
4. ✅ Updates `package.json`
5. ✅ Commits the changes
6. ✅ Creates an annotated git tag with changelog
7. ✅ Generates changelog from commits since last tag

### 3. Runtime Version Detection

The `lib/version.js` module:

- Reads version from git tags at runtime
- Falls back to `package.json` if git unavailable
- Provides comprehensive build information
- Caches results for performance

### 4. Development Builds

If you have uncommitted changes or commits since last tag:

```
v0.10.6-dev.5+a1b2c3d
  │      │    └─ commit hash
  │      └────── commits since tag
  └─────────── base version
```

This helps distinguish production builds from development builds.

## Workflow

### Creating a New Release

```bash
# 1. Ensure working directory is clean
git status

# 2. Commit all changes
git add .
git commit -m "feat: add new feature"

# 3. Bump version (choose appropriate type)
npm run version:patch   # For bug fixes
npm run version:minor   # For new features
npm run version:major   # For breaking changes

# 4. Push commit and tag
git push origin beta
git push origin v0.10.7
```

### Version Bump Script Output

```bash
$ npm run version:patch

🚀 Starting Version Bump...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Current version: v0.10.6
New version:     v0.10.7
Bump type:       patch

⚠️  This will:
   1. Update package.json to v0.10.7
   2. Commit the changes
   3. Create git tag v0.10.7
   4. Generate changelog from commits

📦 Updated package.json: 0.10.6 → 0.10.7
✅ Created tag: v0.10.7
📝 Committed version bump

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Version bump complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 Next steps:
   git push origin beta
   git push origin v0.10.7

🎉 Version v0.10.7 is ready!
```

## API Version Information

### GET /api/version

Returns comprehensive version information:

```json
{
  "currentVersion": "0.10.6",
  "fullVersion": "0.10.6-dev.3+a1b2c3d",
  "currentBranch": "beta",
  "currentCommit": "a1b2c3d",
  "isDev": true,
  "latestVersion": "0.10.6",
  "latestCommit": "a1b2c3d",
  "latestTag": "v0.10.6",
  "updateAvailable": false,
  "buildInfo": {
    "version": "0.10.6",
    "fullVersion": "0.10.6-dev.3+a1b2c3d",
    "branch": "beta",
    "commit": "a1b2c3d",
    "commitsSinceTag": 3,
    "tag": "v0.10.6",
    "clean": false,
    "isDev": true,
    "buildDate": "2026-01-28",
    "node": "v20.10.0",
    "platform": "linux"
  },
  "message": "You are running the latest version"
}
```

## Programmatic Usage

### In Your Code

```javascript
const version = require('./lib/version');

// Get version string
const v = version.getVersion();
console.log(`Running version ${v}`);

// Get full build info
const info = version.getBuildInfo();
console.log(`Version: ${info.fullVersion}`);
console.log(`Branch: ${info.branch}`);
console.log(`Commit: ${info.commit}`);
console.log(`Is Dev: ${info.isDev}`);

// Format version info for display
console.log(version.formatVersionInfo());
```

## Benefits

### ✅ Single Source of Truth
- Git tags are the **only** place version is defined
- No manual editing of version numbers
- Eliminates version drift between files

### ✅ Automated Workflow
- One command to bump version
- Automatic changelog generation
- Consistent tagging format

### ✅ Development Builds
- Clear distinction between releases and dev builds
- Easy to identify exact commit of running code
- Helps with debugging and support

### ✅ Industry Standard
- Follows semantic versioning (semver)
- Compatible with npm/yarn
- Integrates with CI/CD pipelines

## Troubleshooting

### Error: Git working directory not clean

```bash
# Commit or stash your changes first
git add .
git commit -m "your message"

# Or stash temporarily
git stash
npm run version:patch
git stash pop
```

### Error: No version tags found

```bash
# Create initial tag manually
git tag -a v0.10.6 -m "Initial version"
git push origin v0.10.6
```

### Version not updating in app

```bash
# Clear version cache and restart
rm -rf node_modules/.cache
npm start
```

## Migration from Manual Versioning

If you're migrating from manual version management:

1. **Find current version** in `package.json`
2. **Create initial tag**:
   ```bash
   git tag -a v0.10.6 -m "Baseline version for git-tag versioning"
   git push origin v0.10.6
   ```
3. **Use automated script** for all future versions

## FAQ

**Q: What if I forget to push the tag?**

A: The version will only be available locally. Push with:
```bash
git push origin v0.10.7
```

**Q: Can I manually create tags?**

A: Yes, but use the script for consistency. Manual tags should follow the format `v{major}.{minor}.{patch}`

**Q: What happens in CI/CD without git history?**

A: The system falls back to `package.json` version, which is kept in sync by the bump script.

**Q: How do I see all version tags?**

```bash
git tag -l "v*"
```

**Q: How do I delete a tag?**

```bash
# Delete locally
git tag -d v0.10.7

# Delete remotely
git push origin :refs/tags/v0.10.7
```

## References

- [Semantic Versioning 2.0.0](https://semver.org/)
- [Git Tagging](https://git-scm.com/book/en/v2/Git-Basics-Tagging)
- [npm version](https://docs.npmjs.com/cli/v9/commands/npm-version)
