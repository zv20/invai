#!/bin/bash

# System-wide update wrapper for Inventory Management System
# This script respects the update channel configuration

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╭─────────────────────────────────────────────╮${NC}"
echo -e "${BLUE}│   🔄 Inventory App Update Manager    │${NC}"
echo -e "${BLUE}╰─────────────────────────────────────────────╯${NC}"
echo

cd /opt/invai || exit 1

# Determine which branch to use based on channel setting
CHANNEL_FILE=".update-channel"
if [ -f "$CHANNEL_FILE" ]; then
    CHANNEL=$(cat "$CHANNEL_FILE" 2>/dev/null || echo "stable")
    echo -e "${BLUE}📄 Using channel from .update-channel file${NC}"
else
    # Fallback: Auto-detect from current git branch
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
    if [ "$CURRENT_BRANCH" = "beta" ]; then
        CHANNEL="beta"
        echo -e "${BLUE}📍 No .update-channel file, detected beta branch${NC}"
    else
        CHANNEL="stable"
        echo -e "${BLUE}📍 No .update-channel file, detected main branch${NC}"
    fi
fi

# Map channel to branch
if [ "$CHANNEL" = "beta" ]; then
    BRANCH="beta"
    echo -e "${YELLOW}🧪 Update channel: Beta (beta branch)${NC}"
else
    BRANCH="main"
    echo -e "${GREEN}✅ Update channel: Stable (main branch)${NC}"
fi
echo

echo -e "${YELLOW}⏳ Stopping application service...${NC}"
systemctl stop inventory-app

echo -e "${YELLOW}📥 Fetching latest updates from GitHub...${NC}"
git fetch origin

# Get current and remote commit for the correct branch
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse origin/$BRANCH)

if [ "$LOCAL" = "$REMOTE" ]; then
    echo -e "${GREEN}✓ Already up to date!${NC}"
    echo -e "${YELLOW}▶️ Starting application service...${NC}"
    systemctl start inventory-app
    exit 0
fi

echo -e "${BLUE}🔽 Pulling latest changes from $BRANCH branch...${NC}"
git checkout "$BRANCH"
git pull origin "$BRANCH"

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Git pull failed!${NC}"
    echo -e "${YELLOW}▶️ Starting application service anyway...${NC}"
    systemctl start inventory-app
    exit 1
fi

echo -e "${YELLOW}📦 Updating dependencies...${NC}"
npm install --production

echo -e "${YELLOW}▶️ Starting application service...${NC}"
systemctl start inventory-app

echo -e "${YELLOW}⏳ Waiting for service to be ready...${NC}"
sleep 3

if systemctl is-active --quiet inventory-app; then
    echo -e "${GREEN}✓ Update completed successfully!${NC}"
    
    # Show current version
    VERSION=$(jq -r '.version // "unknown"' /opt/invai/package.json 2>/dev/null || echo "unknown")
    IP=$(hostname -I | awk '{print $1}')
    echo -e "${GREEN}Version: ${VERSION}${NC}"
    echo -e "${GREEN}Channel: ${CHANNEL} (${BRANCH} branch)${NC}"
    echo -e "${GREEN}Access at: http://${IP}:3000${NC}"
else
    echo -e "${RED}✗ Service failed to start after update!${NC}"
    echo -e "${YELLOW}Check logs: journalctl -u inventory-app -n 50${NC}"
    exit 1
fi
