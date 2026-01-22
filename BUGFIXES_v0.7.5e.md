# Bug Fixes v0.7.5e (BETA/DEVELOP)

## Bugs Fixed:

### 1. Category menu empty on load  
**Problem:** Categories not loading initially
**Fix:** Added `loadCategories()` and `loadSuppliers()` calls to page initialization

### 2. Color picker not working
**Problem:** Categories stored as text, no color metadata  
**Fix:** Created migration 002 with dedicated `categories` table including `color` column

### 3. Categories only appear after adding one
**Problem:** UI not refreshing data on load  
**Fix:** Added proper initialization in settings.js

### 4. Supplier phone column error
**Problem:** Code trying to use non-existent `suppliers` table with `phone` column  
**Fix:** Created migration 002 with `suppliers` table including `phone`, `email`, `address` columns

### 5. Update page not showing channel selection on load  
**Problem:** `loadChannelSettings()` not called during initialization  
**Fix:** Add initialization call in update-settings.js

### 6. Backup menu not loading existing backups  
**Problem:** `loadBackups()` not called on settings tab open  
**Fix:** Already handled by switchSettingsTab() function

## Files Modified:

1. **migrations/002_categories_suppliers.js** - NEW migration file
2. **server.js** - Add Category & Supplier CRUD APIs  
3. **public/js/settings.js** - Add initialization and loading functions
4. **public/js/update-settings.js** - Add initialization call
5. **package.json** - Bump version to 0.7.5e

## Deployment Steps (BETA CHANNEL):

1. **Pull latest from develop:**
   ```bash
   git pull origin develop
   ```

2. **Restart server** (migration will run automatically):
   ```bash
   pm2 restart invai
   # OR
   npm start
   ```

3. **Verify migration:**
   - Check console logs for "Migration 002" success message
   - New tables `categories` and `suppliers` should be created
   - Existing data migrated automatically

4. **Test fixes:**
   - Category menu shows existing categories on load
   - Color picker works and displays in categories
   - Supplier form accepts phone/email/address
   - Update page shows channel selector on load
   - Backup list populates on tab open

## API Changes:

### New Endpoints:

#### Categories:
- `GET /api/categories/list` - Get all categories with metadata
- `POST /api/categories` - Create new category (name, description, color)
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

#### Suppliers:
- `GET /api/suppliers/list` - Get all suppliers with metadata  
- `POST /api/suppliers` - Create new supplier (name, contact, email, phone, address)
- `PUT /api/suppliers/:id` - Update supplier
- `DELETE /api/suppliers/:id` - Delete supplier

### Legacy Endpoints (still working):
- `GET /api/categories` - Returns simple string array (backwards compatible)
- `GET /api/suppliers` - Returns simple string array (backwards compatible)
