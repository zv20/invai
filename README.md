# 🛒 InvAI - Intelligent Grocery Inventory Management

> Professional inventory management system for grocery stores with barcode scanning, expiry tracking, and smart batch suggestions.

[![Version](https://img.shields.io/badge/version-0.8.1a-blue.svg)](https://github.com/zv20/invai/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org/)
[![Status](https://img.shields.io/badge/status-beta-orange.svg)](https://github.com/zv20/invai)

---

## ✨ Features

### Core Functionality
- 📊 **Real-time Dashboard** - Live statistics, low stock alerts, and expiration tracking
- 📦 **Product Management** - Complete CRUD operations with batch tracking
- 🏷️ **Categories & Suppliers** - Organized inventory with color-coded categories
- 📍 **Multi-location Support** - Track inventory across multiple storage locations
- 💰 **Cost Tracking** - FIFO/FEFO batch suggestions with inventory value calculations

### Intelligence & Analytics (v0.8.0+)
- 📈 **Reports & Analytics** - Stock value, expiration, low stock, and turnover reports
- 📝 **Activity Logging** - Complete audit trail with 90-day retention
- 🎯 **Reorder Points** - Automated low stock alerts with min/max levels
- ⭐ **Favorites System** - Quick access to frequently used products
- 🌙 **Dark Mode** - Full theme system with OS preference detection
- ⌨️ **Keyboard Shortcuts** - Navigate faster with Ctrl+K command palette

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
- 📤 **CSV Import/Export** - Bulk data management and report exports
- 📊 **Performance Optimized** - 40% faster dashboard, 60% faster product list

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
- View real-time inventory statistics with trend analysis
- Monitor low stock items and expiration warnings
- Track recent activity and favorite products
- See category breakdown and inventory value

### Inventory Management
- Add products with barcode scanning or manual entry
- Track batches with expiry dates and locations
- Use quick actions for rapid quantity adjustments
- Apply filters to find specific products
- Set reorder points for automated alerts

### Reports & Analytics
- **Stock Value Report** - Inventory worth by category/supplier
- **Expiration Report** - Track expiring products with timeline
- **Low Stock Report** - Items below reorder point
- **Turnover Analysis** - Product movement patterns
- **Export to CSV** - Download any report for analysis

### Settings
- **Categories**: Manage product categories with custom colors
- **Suppliers**: Add supplier contact information
- **Display**: Toggle dark mode and customize interface
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
│       ├── reports.js    # Reports & analytics
│       ├── settings.js   # Settings page
│       └── ...           # Feature modules
├── lib/                   # Backend modules
│   ├── activity-logger.js # Activity tracking
│   ├── cache-manager.js   # Response caching
│   └── csv-export.js      # CSV generation
├── migrations/            # Database schema migrations
│   ├── 001_baseline.js
│   ├── 007_activity_reorder_indexes.js
│   └── migration-runner.js
├── scripts/               # Maintenance tools
│   ├── fixes/            # Database fix scripts
│   └── install/          # Installation scripts
├── logs/                  # Application logs (Winston)
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
sudo systemctl restart inventory-app
```

### Logs & Monitoring

**View live logs**:
```bash
journalctl -u inventory-app -f
```

**Check application logs**:
```bash
tail -f /opt/invai/logs/combined.log
tail -f /opt/invai/logs/error.log
```

**Health check**:
```bash
curl http://localhost:3000/api/health
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
- **[ROADMAP.md](ROADMAP.md)** - Production roadmap and development timeline
- **[scripts/README.md](scripts/README.md)** - Maintenance scripts documentation

---

## 🏗️ Tech Stack

**Backend**:
- Node.js + Express.js
- SQLite3 database (PostgreSQL planned for v0.8.x)
- RESTful API architecture
- Winston logging with daily rotation
- Node-cache for API response caching

**Frontend**:
- Vanilla JavaScript (no framework dependencies)
- Modular architecture (20+ focused modules)
- Responsive CSS with dark mode support
- Purple gradient theme

**Infrastructure**:
- Git-based update system with channels
- Automated database migrations with rollback
- Systemd service integration
- Health monitoring endpoints

---

## 🔐 Security Notes

- Database file (`inventory.db`) is git-ignored
- JWT authentication with RBAC (in development for v0.8.x)
- Run behind reverse proxy (nginx) for HTTPS in production
- Recommended: Firewall port 3000 and use local access only
- Activity logging tracks all database changes

---

## 🗺️ Roadmap to Production

### ✅ Completed (v0.1.0 - v0.8.1a)
- Dashboard with real-time statistics and analytics
- Complete inventory management with batch tracking
- Barcode scanning with webcam support
- Categories & suppliers management
- FIFO/FEFO batch suggestions
- Migration system with rollback support
- Update channels (Stable/Beta)
- Reports & analytics with CSV export
- Activity logging and audit trails
- Dark mode and keyboard shortcuts
- Performance optimization with caching

### 🔄 Phase 1: Production Essentials (v0.8.x - Next 2 Months)
- **Testing Infrastructure** - Unit/integration tests, 60%+ coverage, CI/CD pipeline
- **User Management & Security** - RBAC with Owner/Manager/Staff/View roles, 2FA, session management
- **Database Improvements** - PostgreSQL support, automated backups, connection pooling
- **Stock Take System** - Physical inventory counts with variance reporting

### 📋 Phase 2: Business Intelligence (v0.9.x - Months 3-4)
- **Enhanced Reporting** - Turnover analysis, waste tracking, profit margins, scheduled reports
- **Dashboard Enhancements** - Charts, trends, expiry timelines, comparative analytics
- **Data Import/Export** - Bulk CSV import with validation, template generator

### 🚀 Phase 3: Operational Excellence (v0.10.x - Months 5-6)
- **Mobile PWA** - Offline mode, push notifications, touch-optimized UI
- **Advanced Features** - Reorder automation, product variants, images, custom fields
- **Monitoring** - Application monitoring, email/SMS alerts, error tracking

### 🎯 Phase 4: Scale & Integration (v1.0.0 - Month 7+)
- **API Documentation** - Public REST API, webhooks, versioning
- **Multi-store Support** - Multiple locations, stock transfers, consolidated reporting
- **Integrations** - Accounting software, label printers, external databases

See [ROADMAP.md](ROADMAP.md) for detailed feature breakdown and timeline.

---

## 🧪 Testing (Coming in v0.8.x)

Test infrastructure is planned for Phase 1:
- Unit tests for core business logic
- Integration tests for API endpoints
- GitHub Actions CI pipeline
- Target: 60%+ code coverage

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

**Current Version**: v0.8.1a (Beta)  
**Last Updated**: January 25, 2026  
**Status**: 🟢 Active Development → Production Path

---

<div align="center">
  <sub>Made with ☕ by <a href="https://github.com/zv20">zv20</a></sub>
</div>