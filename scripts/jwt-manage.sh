#!/bin/bash
# JWT Management Script for systemctl-managed installations
# Works with inventory-app.service or similar systemd services

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

# Detect service name (try common patterns)
SERVICE_NAME=""
if systemctl list-units --type=service --all 2>/dev/null | grep -q "inventory-app.service"; then
    SERVICE_NAME="inventory-app.service"
elif systemctl list-units --type=service --all 2>/dev/null | grep -q "invai.service"; then
    SERVICE_NAME="invai.service"
elif systemctl list-units --type=service --all 2>/dev/null | grep -q "inventory.service"; then
    SERVICE_NAME="inventory.service"
elif systemctl list-units --type=service --all 2>/dev/null | grep -q "grocery.service"; then
    SERVICE_NAME="grocery.service"
fi

if [ -z "$SERVICE_NAME" ]; then
    echo "⚠️  Could not detect systemd service name"
    echo "   Please specify manually or use: systemctl restart YOUR_SERVICE_NAME"
    SERVICE_NAME="your-service-name"
fi

show_status() {
    echo ""
    echo "🔐 JWT Secret Status"
    echo "=================================================="
    cd "$PROJECT_DIR"
    node scripts/jwt-status.js
    echo "=================================================="
    echo ""
    echo "Service: $SERVICE_NAME"
    echo ""
}

rotate_secret() {
    echo ""
    echo "🔄 JWT Secret Rotation"
    echo "=================================================="
    echo "⚠️  WARNING: All users will be logged out!"
    echo ""
    read -p "Continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo "❌ Rotation cancelled"
        exit 0
    fi
    
    cd "$PROJECT_DIR"
    node scripts/rotate-jwt.js
    
    echo ""
    echo "♻️  Restarting service: $SERVICE_NAME"
    systemctl restart "$SERVICE_NAME"
    
    echo "✅ Service restarted"
    echo ""
    echo "Check status with: systemctl status $SERVICE_NAME"
    echo "=================================================="
    echo ""
}

generate_secret() {
    echo ""
    echo "🔑 Generating JWT Secret"
    echo "=================================================="
    cd "$PROJECT_DIR"
    node scripts/generate-jwt.js
    
    if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
        echo ""
        echo "♻️  Service is running. Restart required."
        read -p "Restart now? (yes/no): " restart
        
        if [ "$restart" = "yes" ]; then
            systemctl restart "$SERVICE_NAME"
            echo "✅ Service restarted"
        else
            echo "⚠️  Remember to restart: systemctl restart $SERVICE_NAME"
        fi
    fi
    
    echo "=================================================="
    echo ""
}

case "$1" in
    status)
        show_status
        ;;
    rotate)
        rotate_secret
        ;;
    generate)
        generate_secret
        ;;
    *)
        echo ""
        echo "🔐 JWT Secret Management"
        echo ""
        echo "Usage: $0 {status|rotate|generate}"
        echo ""
        echo "Commands:"
        echo "  status     - Show JWT secret status and age"
        echo "  rotate     - Rotate JWT secret (logs out all users)"
        echo "  generate   - Generate new JWT secret"
        echo ""
        echo "Examples:"
        echo "  $0 status"
        echo "  $0 rotate"
        echo ""
        echo "Service detected: $SERVICE_NAME"
        echo ""
        exit 1
        ;;
esac
