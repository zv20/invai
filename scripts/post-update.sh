#!/bin/bash
# Post-update hook - runs after successful git pull
# Handles JWT initialization and dependency installation

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

echo ""
echo "🔧 Running post-update tasks..."
echo ""

# Step 1: Install/update dependencies
echo "📦 Updating dependencies..."
cd "$PROJECT_DIR"
npm install --omit=dev

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies updated"
echo ""

# Step 2: Initialize JWT if needed (non-interactive)
echo "🔐 Checking JWT configuration..."
if [ ! -f "$PROJECT_DIR/.env" ] || ! grep -q "JWT_SECRET" "$PROJECT_DIR/.env" 2>/dev/null; then
    echo "🔑 Initializing JWT secret..."
    node "$PROJECT_DIR/scripts/generate-jwt.js"
    echo "✅ JWT secret initialized"
else
    echo "✅ JWT secret already configured"
fi
echo ""

# Step 3: Check if JWT rotation is needed
if [ -f "$PROJECT_DIR/.jwt-meta.json" ]; then
    # Parse last rotation date (simplified check)
    LAST_ROTATION=$(node -e "try { const m = require('$PROJECT_DIR/.jwt-meta.json'); console.log(m.lastRotated); } catch(e) { }" 2>/dev/null)
    if [ ! -z "$LAST_ROTATION" ]; then
        DAYS_OLD=$(node -e "const d = Math.floor((Date.now() - new Date('$LAST_ROTATION').getTime()) / (1000*60*60*24)); console.log(d);" 2>/dev/null)
        if [ ! -z "$DAYS_OLD" ] && [ "$DAYS_OLD" -ge 90 ]; then
            echo "⏰ JWT secret is $DAYS_OLD days old (rotation recommended at 90 days)"
            echo "   Run: bash scripts/jwt-manage.sh rotate"
            echo ""
        fi
    fi
fi

# Step 4: Run database migrations if needed
if [ -d "$PROJECT_DIR/migrations" ]; then
    echo "🔧 Database migrations will run on next server start"
    echo ""
fi

echo "✅ Post-update tasks complete"
echo ""
