#!/bin/bash

# Generate PWA Icons from SVG
# Requires: rsvg-convert (librsvg2-bin package)

set -e

echo "🎨 Generating PWA Icons from SVG..."
echo ""

# Check if rsvg-convert is installed
if ! command -v rsvg-convert &> /dev/null; then
    echo "❌ rsvg-convert not found. Installing librsvg2-bin..."
    apt-get update -qq
    apt-get install -y librsvg2-bin
fi

echo "✓ rsvg-convert found"
echo ""

# Source SVG
SVG_SOURCE="public/icons/icon.svg"

if [ ! -f "$SVG_SOURCE" ]; then
    echo "❌ Source SVG not found: $SVG_SOURCE"
    exit 1
fi

echo "📄 Source: $SVG_SOURCE"
echo ""

# Generate 192x192 icon
echo "🔨 Generating 192x192 icon..."
rsvg-convert -w 192 -h 192 "$SVG_SOURCE" -o public/icons/icon-192x192.png

if [ -f "public/icons/icon-192x192.png" ]; then
    SIZE=$(du -h public/icons/icon-192x192.png | cut -f1)
    echo "✅ Created: icon-192x192.png ($SIZE)"
else
    echo "❌ Failed to create icon-192x192.png"
    exit 1
fi

echo ""

# Generate 512x512 icon
echo "🔨 Generating 512x512 icon..."
rsvg-convert -w 512 -h 512 "$SVG_SOURCE" -o public/icons/icon-512x512.png

if [ -f "public/icons/icon-512x512.png" ]; then
    SIZE=$(du -h public/icons/icon-512x512.png | cut -f1)
    echo "✅ Created: icon-512x512.png ($SIZE)"
else
    echo "❌ Failed to create icon-512x512.png"
    exit 1
fi

echo ""
echo "========================================"
echo "✅ PWA Icons Generated Successfully!"
echo "========================================"
echo ""
echo "📋 Generated files:"
ls -lh public/icons/icon-*.png
echo ""
echo "🔍 Verify they're valid PNGs:"
file public/icons/icon-192x192.png
file public/icons/icon-512x512.png
echo ""
echo "🎉 Done! Your PWA icons are ready."
echo ""
