#!/bin/bash

echo "🚀 Setting up Inventory Management System..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

echo "✓ Node.js detected: $(node --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✓ Dependencies installed"

# Create data directory
mkdir -p data

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the server:"
echo "  npm start"
echo ""
echo "Or for development with auto-reload:"
echo "  npm run dev"
echo ""
echo "Server will be available at: http://localhost:3000"
echo ""
echo "For Docker deployment:"
echo "  docker-compose up -d"
echo ""