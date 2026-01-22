# Branch Rename: develop → beta

## Changes Made

To maintain consistency between the UI channel name and the git branch name, we've renamed the `develop` branch to `beta`.

### What Changed

1. **Git Branch**: `develop` → `beta`
2. **Update Script** (`update.sh`): References to `develop` changed to `beta`
3. **Server.js**: Channel-to-branch mapping updated

### Migration Guide

If you have an existing installation on the `develop` branch:

```bash
# Navigate to your installation
cd /path/to/invai

# Fetch latest branches
git fetch origin

# Switch to beta branch
git checkout beta

# Set upstream
git branch --set-upstream-to=origin/beta beta

# Update channel preference (if you were on beta channel)
echo "beta" > .update-channel

# Restart service
sudo systemctl restart invai
```

### For New Installations

Clone and use the beta branch directly:

```bash
git clone https://github.com/zv20/invai.git
cd invai
git checkout beta
```

### Channels Overview

| Channel | Branch | Description |
|---------|--------|-------------|
| **Stable** | `main` | Production-ready releases |
| **Beta** | `beta` | Latest features, may have minor bugs |

### Why This Change?

Previously, the beta channel pointed to the `develop` branch, which was confusing:
- UI showed: "Beta"
- Git branch: "develop"

Now everything is consistent:
- UI shows: "Beta"
- Git branch: "beta"

This makes it clearer for users and simpler to maintain.
