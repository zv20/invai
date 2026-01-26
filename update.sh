#!/bin/bash

# Enhanced Update Script for Inventory Management System
# Features:
# - Fetches updates first without applying
# - Shows compact changelog
# - Asks for permission with data loss warning
# - Creates automatic backup
# - Safe rollback capability
# - Dependency verification
# - Works with both root and non-root users

set -e  # Exit on error

echo "🔄 Inventory Management System - Update Check"
echo "==============================================="
echo ""

# Get current directory
CURRENT_DIR=$(pwd)

# Check if we're in the right directory
if [ ! -f "server.js" ]; then
    echo "❌ server.js not found. Are you in the correct directory?"
    exit 1
fi

echo "📍 Location: $CURRENT_DIR"

# Determine channel and branch
CHANNEL_FILE=".update-channel"
if [ -f "$CHANNEL_FILE" ]; then
    CHANNEL=$(cat "$CHANNEL_FILE" 2>/dev/null || echo "stable")
else
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
    if [ "$CURRENT_BRANCH" = "beta" ]; then
        CHANNEL="beta"
    else
        CHANNEL="stable"
    fi
fi

# Map channel to branch
if [ "$CHANNEL" = "beta" ]; then
    BRANCH="beta"
    echo "🧪 Channel: Beta (testing latest features)"
else
    BRANCH="main"
    echo "✅ Channel: Stable (production-ready)"
fi

echo ""

# Get current version from package.json
if command -v node &> /dev/null; then
    CURRENT_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")
    echo "📊 Current Version: v$CURRENT_VERSION"
fi

echo ""
echo "========================================"
echo "🔍 Step 1: Checking for updates..."
echo "========================================"
echo ""

# Fetch latest changes without applying
echo "📡 Fetching latest changes from GitHub..."
git fetch origin $BRANCH

if [ $? -ne 0 ]; then
    echo "❌ Failed to fetch updates from GitHub"
    exit 1
fi

# Check if updates are available
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse @{u})

if [ "$LOCAL" = "$REMOTE" ]; then
    echo ""
    echo "✅ You're already up to date! (v$CURRENT_VERSION)"
    echo ""
    exit 0
fi

echo "✅ Updates available!"
echo ""

# Get new version from remote
NEW_VERSION=$(git show origin/$BRANCH:package.json | grep -m1 '"version"' | sed 's/.*"version": "\(.*\)".*/\1/' || echo "unknown")
echo "🎉 New Version: v$NEW_VERSION"
echo ""

echo "========================================"
echo "📋 Step 2: What's New in v$NEW_VERSION"
echo "========================================"
echo ""

# Show compact changelog from CHANGELOG.md
if git show origin/$BRANCH:CHANGELOG.md > /dev/null 2>&1; then
    # Extract the latest version's changes
    git show origin/$BRANCH:CHANGELOG.md | awk -v ver="$NEW_VERSION" '
        /^## \[/ { 
            if (found) exit;
            if (index($0, ver)) found=1; 
            next;
        }
        found && /^###/ { 
            category = $0; 
            gsub(/^### /, "", category);
            print "\n" category ":";
            next;
        }
        found && /^- / { 
            gsub(/^- /, "  • ", $0);
            print $0;
        }
        found && /^## \[/ { exit; }
    '
else
    # Fallback: Show commit messages
    echo "Recent changes:"
    git log --oneline --no-merges HEAD..origin/$BRANCH | head -10 | sed 's/^/  • /'
fi

echo ""
echo "========================================"
echo "⚠️  Step 3: Safety Check"
echo "========================================"
echo ""

# Show uncommitted changes warning
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  WARNING: You have uncommitted local changes:"
    git status --short | head -5
    echo ""
    echo "These may be overwritten during the update."
    echo ""
fi

# Data loss warning
echo "🚨 IMPORTANT NOTICES:"
echo ""
echo "  1. A backup of your database will be created automatically"
echo "  2. The application will restart (brief downtime)"
echo "  3. Database migrations will run if needed"
echo "  4. Dependencies will be verified and updated"
echo "  5. You can rollback if issues occur"
echo ""
echo "  Backup location: ./backups/"
echo ""

# Check if running as root (not recommended)
if [ "$EUID" -eq 0 ]; then
    echo "⚠️  Running as root - sudo will be skipped"
    SUDO_CMD=""
else
    SUDO_CMD="sudo"
fi
echo ""

echo "========================================"
echo "❓ Step 4: Confirm Update"
echo "========================================"
echo ""
echo "Do you want to proceed with the update?"
echo ""
echo "  Current:  v$CURRENT_VERSION"
echo "  Update:   v$NEW_VERSION"
echo "  Channel:  $CHANNEL"
echo ""

read -p "Continue? [y/N] " -n 1 -r
echo ""
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Update cancelled by user"
    echo ""
    echo "To update later, run: ./update.sh"
    echo ""
    exit 0
fi

echo "========================================"
echo "🚀 Step 5: Applying Update"
echo "========================================"
echo ""

# Create backup
echo "💾 Creating database backup..."
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="$BACKUP_DIR/backup_pre_v${NEW_VERSION}_${TIMESTAMP}.db"

if [ -f "inventory.db" ]; then
    cp inventory.db "$BACKUP_FILE"
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup created: $(basename $BACKUP_FILE) ($BACKUP_SIZE)"
    echo ""
else
    echo "⚠️  No database file found (first run?)"
    echo ""
fi

# Pull changes
echo "📥 Pulling code updates..."
git checkout $BRANCH
git pull origin $BRANCH

if [ $? -ne 0 ]; then
    echo "❌ Failed to pull changes"
    exit 1
fi

echo "✅ Code updated"
echo ""

# Function to verify dependencies
verify_dependencies() {
    echo "🔍 Verifying dependencies..."
    
    # List of critical dependencies to check
    local REQUIRED_MODULES=("express" "sqlite3" "jsonwebtoken" "bcryptjs" "helmet" "json2csv")
    local MISSING=()
    
    for module in "${REQUIRED_MODULES[@]}"; do
        if ! node -e "require('$module')" 2>/dev/null; then
            MISSING+=("$module")
        fi
    done
    
    if [ ${#MISSING[@]} -gt 0 ]; then
        echo "❌ Missing required modules:"
        for module in "${MISSING[@]}"; do
            echo "   • $module"
        done
        return 1
    fi
    
    echo "✓ All required dependencies verified"
    return 0
}

# Update dependencies if package.json changed
if git diff HEAD@{1} HEAD --name-only | grep -q "package.json"; then
    echo "📦 package.json changed - Installing dependencies..."
    npm install
    
    if [ $? -ne 0 ]; then
        echo "❌ Dependency installation failed"
        echo ""
        echo "Rollback command:"
        echo "  git reset --hard HEAD@{1}"
        exit 1
    fi
    
    echo "✓ Dependencies installed"
    echo ""
    
    # Verify dependencies
    verify_dependencies
    
    if [ $? -ne 0 ]; then
        echo ""
        echo "⚠️  Some dependencies are missing. Attempting to fix..."
        echo "Running: npm install --force"
        npm install --force
        
        echo ""
        echo "🔍 Verifying again..."
        verify_dependencies
        
        if [ $? -ne 0 ]; then
            echo ""
            echo "❌ Dependency verification failed!"
            echo ""
            echo "Rollback command:"
            echo "  git reset --hard $LOCAL"
            echo "  npm install"
            exit 1
        fi
    fi
else
    echo "✓ No dependency updates needed"
    echo ""
fi

# Create logs directory if needed
if [ ! -d "logs" ]; then
    mkdir -p logs
    echo "✓ Created logs directory"
    echo ""
fi

# Detect and restart service
echo "🔄 Restarting application..."
echo ""

SERVICE_NAME=""
for name in invai inventory-app grocery-inventory node-invai inventory; do
    if systemctl list-units --full --all 2>/dev/null | grep -q "$name.service"; then
        SERVICE_NAME="$name"
        break
    fi
done

RESTART_SUCCESS=false

if command -v pm2 &> /dev/null && pm2 list 2>/dev/null | grep -q "invai\|inventory"; then
    echo "Using PM2..."
    pm2 restart invai || pm2 restart inventory-app || pm2 restart all
    RESTART_SUCCESS=true
    echo "✅ Restarted with PM2"
elif [ -n "$SERVICE_NAME" ]; then
    echo "Using systemd ($SERVICE_NAME)..."
    
    # Use sudo only if not root
    if [ -n "$SUDO_CMD" ]; then
        $SUDO_CMD systemctl restart "$SERVICE_NAME"
    else
        systemctl restart "$SERVICE_NAME"
    fi
    
    if [ $? -eq 0 ]; then
        RESTART_SUCCESS=true
        echo "✅ Restarted with systemd"
    else
        echo "❌ Failed to restart. Try manually:"
        if [ -n "$SUDO_CMD" ]; then
            echo "   sudo systemctl restart $SERVICE_NAME"
        else
            echo "   systemctl restart $SERVICE_NAME"
        fi
    fi
else
    echo "⚠️  Could not auto-restart. Please restart manually:"
    echo "   PM2: pm2 restart invai"
    if [ -n "$SUDO_CMD" ]; then
        echo "   systemd: sudo systemctl restart [service-name]"
    else
        echo "   systemd: systemctl restart [service-name]"
    fi
fi

echo ""

# Wait a moment for service to start
if [ "$RESTART_SUCCESS" = true ]; then
    echo "Waiting for service to start..."
    sleep 3
    echo ""
fi

echo "========================================"
echo "✅ Update Complete!"
echo "========================================"
echo ""
echo "🎉 Successfully updated to v$NEW_VERSION"
echo ""

# Show service status
if [ -n "$SERVICE_NAME" ]; then
    echo "📊 Service Status:"
    if [ -n "$SUDO_CMD" ]; then
        $SUDO_CMD systemctl status "$SERVICE_NAME" --no-pager -l | head -15
    else
        systemctl status "$SERVICE_NAME" --no-pager -l | head -15
    fi
    echo ""
elif command -v pm2 &> /dev/null; then
    echo "📊 PM2 Status:"
    pm2 list | grep -E "invai|inventory" || pm2 list
    echo ""
fi

# Show what was backed up
if [ -f "$BACKUP_FILE" ]; then
    echo "💾 Backup saved: $(basename $BACKUP_FILE)"
    echo ""
fi

echo "🔗 Quick Actions:"
if [ -n "$SERVICE_NAME" ]; then
    echo "  • Check logs: journalctl -u $SERVICE_NAME -n 50 -f"
    echo "  • View app: http://localhost:3000"
    if [ -n "$SUDO_CMD" ]; then
        echo "  • Rollback: git reset --hard $LOCAL && npm install && sudo systemctl restart $SERVICE_NAME"
    else
        echo "  • Rollback: git reset --hard $LOCAL && npm install && systemctl restart $SERVICE_NAME"
    fi
fi
echo ""
echo "📚 Documentation:"
echo "  • What's New: v${NEW_VERSION}_QUICKSTART.md"
echo "  • Changelog: CHANGELOG.md"
echo ""
echo "Enjoy the new features! 🚀"
echo ""
