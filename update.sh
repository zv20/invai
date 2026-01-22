#!/bin/bash

echo "🔄 Updating Inventory Management System"
echo "========================================"
echo ""

# Get current directory
CURRENT_DIR=$(pwd)

# Check if we're in the right directory
if [ ! -f "server.js" ]; then
    echo "❌ server.js not found. Are you in the correct directory?"
    exit 1
fi

echo "📍 Location: $CURRENT_DIR"
echo ""

# Determine which branch to use based on channel setting
CHANNEL_FILE=".update-channel"
if [ -f "$CHANNEL_FILE" ]; then
    CHANNEL=$(cat "$CHANNEL_FILE" 2>/dev/null || echo "stable")
else
    CHANNEL="stable"
fi

# Map channel to branch
if [ "$CHANNEL" = "beta" ]; then
    BRANCH="develop"
    echo "🧪 Update channel: Beta (develop branch)"
else
    BRANCH="main"
    echo "✅ Update channel: Stable (main branch)"
fi

echo ""

# Auto-detect systemctl service name
SERVICE_NAME=""
for name in invai inventory-app grocery-inventory node-invai inventory; do
    if systemctl list-units --full --all | grep -q "$name.service"; then
        SERVICE_NAME="$name"
        echo "🔍 Found service: $SERVICE_NAME"
        break
    fi
done

if [ -z "$SERVICE_NAME" ]; then
    echo "⚠️  Could not auto-detect systemd service name"
    echo "Please specify: SERVICE_NAME=your-service ./update.sh"
    if [ -z "$1" ]; then
        exit 1
    fi
    SERVICE_NAME="$1"
fi

echo ""

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  You have uncommitted changes:"
    git status --short
    echo ""
    if [ "$SKIP_PROMPT" != "true" ]; then
        read -p "Continue with update? (y/n) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Update cancelled."
            exit 1
        fi
    fi
fi

echo "📥 Pulling latest changes from GitHub ($BRANCH branch)..."
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

if [ $? -ne 0 ]; then
    echo "❌ Failed to pull changes from GitHub"
    exit 1
fi

echo "✓ Code updated"
echo ""

# Check if package.json changed
if git diff HEAD@{1} HEAD --name-only | grep -q "package.json"; then
    echo "📦 package.json changed, updating dependencies..."
    npm install --production
    echo "✓ Dependencies updated"
    echo ""
fi

# Restart the service
echo "🔄 Restarting application..."

if command -v pm2 &> /dev/null && pm2 list | grep -q "invai\|inventory"; then
    echo "Using PM2..."
    pm2 restart invai || pm2 restart inventory-app || pm2 restart all
    echo "✓ Application restarted with PM2"
elif [ -n "$SERVICE_NAME" ]; then
    echo "Using systemd ($SERVICE_NAME)..."
    sudo systemctl restart "$SERVICE_NAME"
    
    if [ $? -eq 0 ]; then
        echo "✓ Application restarted with systemd"
    else
        echo "❌ Failed to restart service. Check permissions or run:"
        echo "   sudo systemctl restart $SERVICE_NAME"
        exit 1
    fi
else
    echo "⚠️  Could not detect process manager. Please restart manually:"
    echo "   • PM2: pm2 restart invai"
    echo "   • Systemd: sudo systemctl restart invai"
    echo "   • Manual: Stop and run 'node server.js' again"
    exit 0
fi

echo ""
echo "✅ Update Complete!"
echo "========================================"
echo ""
echo "📊 Current status:"

if command -v pm2 &> /dev/null && pm2 list | grep -q "invai\|inventory"; then
    pm2 list | grep -E "invai|inventory"
elif [ -n "$SERVICE_NAME" ]; then
    sudo systemctl status "$SERVICE_NAME" --no-pager -l | head -10
fi

echo ""
echo "🌐 Check your app: https://inv.z101c.duckdns.org"
echo "📦 Channel: $CHANNEL ($BRANCH branch)"
echo ""
