#!/bin/bash

# Installer for improved system-wide update command
# Run this once to fix the 'update' command to respect channel settings

set -e

echo "╭────────────────────────────────────────────────────╮"
echo "│  🔧 System Update Command Installer         │"
echo "╰────────────────────────────────────────────────────╯"
echo

if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root"
    echo "   Run: sudo bash scripts/install/install-system-update.sh"
    exit 1
fi

if [ ! -f "system-update-wrapper.sh" ]; then
    echo "❌ system-update-wrapper.sh not found in current directory"
    echo "   Make sure you're in /opt/invai"
    exit 1
fi

echo "📍 Current directory: $(pwd)"
echo

# Backup old script
if [ -f "/usr/local/bin/update-inventory" ]; then
    echo "💾 Backing up old update-inventory script..."
    cp /usr/local/bin/update-inventory /usr/local/bin/update-inventory.backup-$(date +%Y%m%d-%H%M%S)
    echo "   ✓ Backup saved"
fi

# Install new script
echo "📦 Installing improved update-inventory script..."
cp system-update-wrapper.sh /usr/local/bin/update-inventory
chmod +x /usr/local/bin/update-inventory
echo "   ✓ Installed to /usr/local/bin/update-inventory"
echo

# Verify installation
if [ -x "/usr/local/bin/update-inventory" ]; then
    echo "✅ Installation successful!"
    echo
    echo "📋 What changed:"
    echo "   • Old script: Hardcoded to pull from 'main' branch"
    echo "   • New script: Respects .update-channel file"
    echo "   • Fallback: Auto-detects current git branch"
    echo
    echo "🎯 Your 'update' command will now:"
    
    if [ -f "/opt/invai/.update-channel" ]; then
        CHANNEL=$(cat /opt/invai/.update-channel 2>/dev/null || echo "stable")
        if [ "$CHANNEL" = "beta" ]; then
            echo "   ✓ Pull from beta branch (based on .update-channel file)"
        else
            echo "   ✓ Pull from main branch (based on .update-channel file)"
        fi
    else
        CURRENT_BRANCH=$(cd /opt/invai && git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
        if [ "$CURRENT_BRANCH" = "beta" ]; then
            echo "   ✓ Pull from beta branch (auto-detected from git)"
        else
            echo "   ✓ Pull from main branch (auto-detected from git)"
        fi
    fi
    echo
    echo "🧪 Test it now:"
    echo "   update"
    echo
else
    echo "❌ Installation failed!"
    echo "   Check permissions and try again"
    exit 1
fi
