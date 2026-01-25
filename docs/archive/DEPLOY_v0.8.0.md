# Deployment Guide v0.8.0

## Quick Deploy

```bash
cd /opt/invai
git pull origin main
npm install
npm run migrate
systemctl restart inventory-app
```

## Migration Notes

- Database migrations run automatically
- Backup created before migrations
- No breaking changes to API

---

**Version:** v0.8.0  
**Status:** Archived (superseded by current deployment process)

_This is a historical deployment guide. Current deployment is documented in update.sh script._