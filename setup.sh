#!/bin/bash

echo "🚀 Inventory Management System - Complete Setup"
echo "================================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  This script needs to be run as root (use sudo)"
    echo "Running: sudo $0"
    exec sudo "$0" "$@"
fi

echo "✓ Running with root privileges"
echo ""

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VERSION=$VERSION_ID
else
    echo "❌ Cannot detect OS. This script supports Debian/Ubuntu."
    exit 1
fi

echo "📋 Detected OS: $OS $VERSION"
echo ""

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

if [ $? -ne 0 ]; then
    echo "❌ Failed to update system packages"
    exit 1
fi

echo "✓ System packages updated"
echo ""

# Install required dependencies
echo "📦 Installing required system packages..."
apt install -y curl git ca-certificates gnupg

if [ $? -ne 0 ]; then
    echo "❌ Failed to install system packages"
    exit 1
fi

echo "✓ System packages installed"
echo ""

# Check if Node.js is already installed
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "ℹ️  Node.js is already installed: $NODE_VERSION"
    
    # Check if version is acceptable (v16+)
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$MAJOR_VERSION" -lt 16 ]; then
        echo "⚠️  Node.js version is too old (need v16+). Installing newer version..."
        INSTALL_NODE=true
    else
        echo "✓ Node.js version is acceptable"
        INSTALL_NODE=false
    fi
else
    echo "📦 Node.js not found. Installing Node.js 20 LTS..."
    INSTALL_NODE=true
fi

echo ""

# Install Node.js if needed
if [ "$INSTALL_NODE" = true ]; then
    echo "📦 Installing Node.js 20 LTS..."
    
    # Remove old Node.js installations
    apt remove -y nodejs npm
    
    # Add NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    
    # Install Node.js
    apt install -y nodejs
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install Node.js"
        exit 1
    fi
    
    echo "✓ Node.js installed: $(node --version)"
    echo "✓ npm installed: $(npm --version)"
else
    echo "✓ Using existing Node.js installation"
fi

echo ""

# Function to verify dependencies
verify_dependencies() {
    echo "🔍 Verifying dependencies..."
    
    # List of critical dependencies to check
    local REQUIRED_MODULES=("express" "sqlite3" "jsonwebtoken" "bcryptjs" "helmet" "json2csv" "web-push")
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

# Install application dependencies
echo "📦 Installing application dependencies..."

if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Are you in the correct directory?"
    exit 1
fi

npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install application dependencies"
    echo ""
    echo "Trying to fix common npm issues..."
    
    # Clean npm cache and retry
    npm cache clean --force
    rm -rf node_modules package-lock.json
    npm install
    
    if [ $? -ne 0 ]; then
        echo "❌ Still failing. Please check npm logs above."
        exit 1
    fi
fi

echo "✓ Application dependencies installed"
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
        echo "❌ Dependency verification failed. Installation may be incomplete."
        echo "Please report this issue with the error messages above."
        exit 1
    fi
fi

echo ""

# Create data directory
echo "📁 Creating data directory..."
mkdir -p data
chmod 755 data

echo "✓ Data directory created"
echo ""

# Create systemd service file
echo "⚙️  Creating systemd service..."

CURRENT_DIR=$(pwd)
CURRENT_USER=$(logname 2>/dev/null || echo $SUDO_USER)

if [ -z "$CURRENT_USER" ]; then
    CURRENT_USER="root"
fi

cat > /etc/systemd/system/inventory-app.service << EOF
[Unit]
Description=Inventory Management Application
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$CURRENT_DIR
ExecStart=/usr/bin/node $CURRENT_DIR/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

echo "✓ Systemd service created"
echo ""

# Reload systemd and enable service
echo "⚙️  Enabling service to start on boot..."
systemctl daemon-reload
systemctl enable inventory-app.service

echo "✓ Service enabled"
echo ""

# Get network information
HOSTNAME=$(hostname)
IP_ADDRESS=$(hostname -I | awk '{print $1}')

echo ""
echo "✅ Setup Complete!"
echo "================================================"
echo ""
echo "📊 Summary:"
echo "  • Node.js: $(node --version)"
echo "  • npm: $(npm --version)"
echo "  • Location: $CURRENT_DIR"
echo "  • Service: inventory-app"
echo "  • Dependencies: Verified ✓"
echo ""
echo "🎯 Next Steps:"
echo ""
echo "1. Start the service:"
echo "   systemctl start inventory-app"
echo ""
echo "2. Check service status:"
echo "   systemctl status inventory-app"
echo ""
echo "3. View logs:"
echo "   journalctl -u inventory-app -f"
echo ""
echo "4. Stop the service:"
echo "   systemctl stop inventory-app"
echo ""
echo "5. Restart the service:"
echo "   systemctl restart inventory-app"
echo ""
echo "📡 Access your app:"
echo "  • Local: http://localhost:3000"
echo "  • Network: http://$IP_ADDRESS:3000"
echo ""
echo "💡 Configure Nginx Proxy Manager:"
echo "  • Forward to: $IP_ADDRESS:3000"
echo "  • Enable SSL for external access"
echo ""
echo "🔧 Manual start (without systemd):"
echo "   npm start"
echo ""
echo "================================================"
echo ""

# Ask if user wants to start now
read -p "Would you like to start the service now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    systemctl start inventory-app
    sleep 2
    
    if systemctl is-active --quiet inventory-app; then
        echo "✅ Service started successfully!"
        echo ""
        echo "🌐 Visit: http://$IP_ADDRESS:3000"
    else
        echo "❌ Failed to start service. Check logs:"
        echo "   journalctl -u inventory-app -n 50"
    fi
else
    echo "ℹ️  Service not started. Start it manually when ready:"
    echo "   systemctl start inventory-app"
fi

echo ""
