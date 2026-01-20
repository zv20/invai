# Inventory Management System

A simple, self-hosted inventory management application with persistent data storage across devices.

## Features

✅ **Persistent Storage** - SQLite database keeps your data across devices and restarts  
✅ **Real-time Updates** - Add, edit, delete inventory items instantly  
✅ **Search & Filter** - Find items by name, notes, or category  
✅ **Responsive Design** - Works on desktop, tablet, and mobile  
✅ **Connection Status** - Visual indicator shows backend connectivity  
✅ **Categories & Locations** - Organize items by category and storage location  
✅ **Health Checks** - Monitoring endpoint for service management  

## Quick Start

### Option 1: Docker (Recommended)

```bash
docker-compose up -d
```

Access at: `http://localhost:3000`

### Option 2: Node.js

```bash
# Install dependencies
npm install

# Start server
npm start
```

Access at: `http://localhost:3000`

### Option 3: Automated Setup

```bash
chmod +x setup.sh
./setup.sh
```

## Installation

### Prerequisites

- Node.js 16+ (for Node.js deployment)
- Docker & Docker Compose (for Docker deployment)

### Manual Setup

1. Clone or download this repository

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser to `http://localhost:3000`

## Docker Deployment

### Using Docker Compose (Easiest)

```bash
docker-compose up -d
```

### Using Docker CLI

```bash
# Build image
docker build -t inventory-app .

# Run container
docker run -d \
  --name inventory-app \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  inventory-app
```

## Proxmox Deployment

Since you're using Proxmox with LXC containers:

### 1. Create LXC Container

```bash
# Create Debian 12 container
pct create 200 local:vztmpl/debian-12-standard_12.0-1_amd64.tar.zst \
  --hostname inventory-app \
  --memory 512 \
  --cores 1 \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp

# Start container
pct start 200
```

### 2. Install Node.js in Container

```bash
pct enter 200

# Update and install Node.js
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git

# Clone your repository
git clone https://github.com/zv20/invai.git /opt/inventory-app
cd /opt/inventory-app

# Install dependencies
npm install

# Start service
npm start
```

### 3. Setup with Nginx Proxy Manager

1. Add Proxy Host in Nginx Proxy Manager:
   - Domain: `inventory.yourdomain.com`
   - Forward Hostname/IP: `<container-ip>`
   - Forward Port: `3000`
   - Enable SSL (Let's Encrypt)

2. Access via: `https://inventory.yourdomain.com`

## API Endpoints

### Health Check
```
GET /health
```

### Inventory Management
```
GET    /api/inventory          - Get all items (supports ?search= and ?category=)
GET    /api/inventory/:id      - Get single item
POST   /api/inventory          - Add new item
PUT    /api/inventory/:id      - Update item
DELETE /api/inventory/:id      - Delete item
GET    /api/categories         - Get all categories
```

## Configuration

### Environment Variables

```bash
PORT=3000  # Server port (default: 3000)
```

### Database Location

The SQLite database is stored at `./inventory.db` by default. For Docker deployments, it's mounted to `/app/data/inventory.db` for persistence.

## Development

### Run in Development Mode

```bash
npm run dev
```

This uses nodemon for auto-reload on file changes.

## Backup

### Backup Database

```bash
cp inventory.db inventory.db.backup
```

### Restore Database

```bash
cp inventory.db.backup inventory.db
```

## Troubleshooting

### Database Locked Error

If you see "database is locked" errors:
```bash
# Stop all instances
pkill -f "node server.js"

# Remove lock file
rm inventory.db-journal

# Restart
npm start
```

### Connection Issues

1. Check server is running:
```bash
curl http://localhost:3000/health
```

2. Check firewall allows port 3000

3. Verify correct IP/hostname in frontend

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: SQLite3
- **Frontend**: Vanilla JavaScript + HTML5 + CSS3
- **Deployment**: Docker / LXC / Bare Metal

## License

MIT License - Feel free to use and modify!

## Support

For issues or questions, create an issue on GitHub.