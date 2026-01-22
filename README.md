# 🛒 InvAI - Intelligent Grocery Inventory Management

> Professional inventory management system for grocery stores with barcode scanning, expiry tracking, and smart batch suggestions.

[![Version](https://img.shields.io/badge/version-0.7.8-blue.svg)](https://github.com/zv20/invai/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org/)

---

## ✨ Features

### Core Functionality
- 📊 **Real-time Dashboard** - Live statistics, low stock alerts, and expiration tracking
- 📦 **Product Management** - Complete CRUD operations with batch tracking
- 🏷️ **Categories & Suppliers** - Organized inventory with color-coded categories
- 📍 **Multi-location Support** - Track inventory across multiple storage locations
- 💰 **Cost Tracking** - FIFO/FEFO batch suggestions with inventory value calculations

### Smart Features
- 📷 **Barcode Scanning** - Quick product lookup via webcam
- 🔔 **Browser Notifications** - Low stock alerts and expiry warnings
- ⚡ **Quick Actions** - Rapid quantity adjustments (+1, +5, -1, -5, mark empty)
- 📋 **Bulk Operations** - Multi-item deletions, location updates, and quantity adjustments
- 🎯 **FIFO/FEFO Suggestions** - Smart batch recommendations based on expiry dates
- 🔍 **Advanced Filtering** - Filter by category, supplier, location, stock status, and expiry

### Infrastructure
- 🔄 **Database Migrations** - Automated schema versioning with rollback support
- 📦 **Update Channels** - Choose between Stable and Beta releases
- 💾 **Automatic Backups** - Safety backups before updates and migrations
- 🛠️ **Recovery Scripts** - Database fix tools for edge cases
- 📤 **CSV Import/Export** - Bulk data management

---

## 🚀 Quick Start

### Prerequisites

- Node.js 14.x or higher
- npm or yarn
- Git (for updates)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/zv20/invai.git
   cd invai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Access the application**
   ```
   Open http://localhost:3000 in your browser
   ```

### Production Deployment

For systemd service setup:

```bash
# Run setup script
bash setup.sh

# Service will be available at http://your-server:3000
# Updates can be triggered with: update
```

---

## 📖 Usage

### Dashboard
- View real-time inventory statistics
- Monitor low stock items and expiration warnings
- See category breakdown and recent activity

### Inventory Management
- Add products with barcode scanning or manual entry
- Track batches with expiry dates and locations
- Use quick actions for rapid quantity adjustments
- Apply filters to find specific products

### Settings
- **Categories**: Manage product categories with custom colors
- **Suppliers**: Add supplier contact information
- **Backups**: Create and restore database backups
- **Updates**: Switch between Stable/Beta channels

---

## 🗂️ Project Structure

```
invai/
├── server.js              # Express.js backend server
├── package.json           # Dependencies and scripts
├── public/                # Frontend files
│   ├── index.html        # Main HTML page
│   ├── css/              # Stylesheets
│   └── js/               # Modular JavaScript files
│       ├── core.js       # Shared utilities
│       ├── dashboard.js  # Dashboard controller
│       ├── inventory.js  # Inventory management
│       ├── settings.js   # Settings page
│       └── ...           # Feature modules
├── migrations/            # Database schema migrations
│   ├── 001_baseline.js
│   ├── 002_categories_suppliers.js
│   └── migration-runner.js
├── scripts/               # Maintenance tools
│   ├── fixes/            # Database fix scripts
│   └── install/          # Installation scripts
├── update.sh             # Update script
└── setup.sh              # Production setup script
```

---

## 🔄 Update System

### Update Channels

- **Stable** (main branch): Production-ready releases
- **Beta** (beta branch): Latest features, may have minor bugs

### Updating Your Installation

**Using system command**:
```bash
update
```

**Manual update**:
```bash
cd /opt/invai
bash update.sh
```

The update system automatically:
- Creates a backup before updating
- Pulls latest changes from your selected channel
- Runs database migrations if needed
- Restarts the service

### Switching Channels

1. Go to **Settings → Updates**
2. Select your desired channel (Stable or Beta)
3. Click "Switch Channel"
4. System will backup and switch automatically

---

## 🛠️ Maintenance

### Database Backups

**Create backup**:
```bash
cd /opt/invai
node -e "require('./server.js')"
# Use Settings → Backups in web UI
```

**Restore backup**:
```bash
cp backups/inventory_backup_YYYYMMDD_HHMMSS.db inventory.db
sudo systemctl restart invai
```

### Fix Scripts

If you encounter database issues after an update:

```bash
cd /opt/invai
node scripts/fixes/fix_suppliers_table.js
```

See [scripts/README.md](scripts/README.md) for detailed troubleshooting.

---

## 📚 Documentation

- **[CHANGELOG.md](CHANGELOG.md)** - Complete version history and release notes
- **[ROADMAP.md](ROADMAP.md)** - Planned features and development timeline
- **[scripts/README.md](scripts/README.md)** - Maintenance scripts documentation

---

## 🏗️ Tech Stack

**Backend**:
- Node.js + Express.js
- SQLite3 database
- RESTful API architecture

**Frontend**:
- Vanilla JavaScript (no framework)
- Modular architecture (14 focused modules)
- Responsive CSS with purple gradient theme

**Infrastructure**:
- Git-based update system
- Automated database migrations
- Systemd service integration

---

## 🔐 Security Notes

- Database file (`inventory.db`) is git-ignored
- No authentication system yet (v0.10.0 planned)
- Run behind reverse proxy (nginx) for HTTPS in production
- Recommended: Firewall port 3000 and use local access only

---

## 🗺️ Roadmap

### ✅ Completed (v0.1.0 - v0.7.8)
- Dashboard with real-time statistics
- Barcode scanning
- Categories & suppliers management
- FIFO/FEFO batch suggestions
- Migration system
- Update channels

### 🔄 In Progress
- See [ROADMAP.md](ROADMAP.md) for detailed planning

### 📋 Upcoming Features
- **v0.8.0**: Inventory audits & change tracking
- **v0.9.0**: Reporting & analytics
- **v0.10.0**: User management & security
- **v0.11.0**: Mobile PWA & API integration

---

## 🤝 Contributing

This is currently a personal project, but feedback and bug reports are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- Built with ❤️ for efficient grocery inventory management
- Inspired by real-world grocery store needs
- Community feedback and testing

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/zv20/invai/issues)
- **Discussions**: [GitHub Discussions](https://github.com/zv20/invai/discussions)

---

**Current Version**: v0.7.8 (Beta)  
**Last Updated**: January 22, 2026  
**Status**: 🟢 Active Development

---

<div align="center">
  <sub>Made with ☕ by <a href="https://github.com/zv20">zv20</a></sub>
</div>