/**
 * Migration 003: Suppliers System
 * 
 * Creates suppliers table and migrates existing product 'supplier' text field to supplier_id references
 * Allows user-managed supplier list
 * 
 * Version: v0.7.4b (hotfix - Promise wrapping and column checks)
 */

module.exports = {
    version: 3,
    name: '003_suppliers',
    description: 'Create suppliers table and migrate product supplier field to supplier references',

    up: async (db) => {
        console.log('Running migration 003: Suppliers system...');

        // Create suppliers table
        await db.run(`
            CREATE TABLE IF NOT EXISTS suppliers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                contact_name TEXT,
                contact_email TEXT,
                contact_phone TEXT,
                address TEXT,
                notes TEXT,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('✓ Suppliers table created');

        // Check if supplier column exists in products table
        const tableInfo = await new Promise((resolve, reject) => {
            db.all(`PRAGMA table_info(products)`, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        const supplierColumnExists = tableInfo.some(col => col.name === 'supplier');
        const supplierIdExists = tableInfo.some(col => col.name === 'supplier_id');

        if (supplierColumnExists) {
            // Get all unique supplier names from products - wrap in Promise
            const existingSuppliersRaw = await new Promise((resolve, reject) => {
                db.all(
                    `SELECT DISTINCT supplier FROM products WHERE supplier IS NOT NULL AND supplier != '' ORDER BY supplier`,
                    [],
                    (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows || []);
                    }
                );
            });

            const existingSuppliers = existingSuppliersRaw || [];

            console.log(`Found ${existingSuppliers.length} unique suppliers to migrate`);

            // Insert each unique supplier
            for (const row of existingSuppliers) {
                if (!row || !row.supplier) continue;
                const supplierName = row.supplier.trim();
                if (supplierName) {
                    await db.run(
                        `INSERT OR IGNORE INTO suppliers (name, notes) VALUES (?, ?)`,
                        [supplierName, 'Migrated from v0.7.0']
                    );
                    console.log(`  Created supplier: ${supplierName}`);
                }
            }
        } else {
            console.log('✓ No supplier column found, skipping data migration');
        }

        // Add a default "Unknown" supplier
        await db.run(
            `INSERT OR IGNORE INTO suppliers (name, notes) VALUES (?, ?)`,
            ['Unknown', 'Default supplier for unspecified products']
        );

        console.log('✓ Suppliers migrated to table');

        if (!supplierIdExists) {
            // Add supplier_id column
            await db.run(`ALTER TABLE products ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id)`);
            console.log('✓ Added supplier_id column to products');
        } else {
            console.log('✓ supplier_id column already exists, skipping');
        }

        // Update products with supplier_id
        if (supplierColumnExists) {
            const suppliersRaw = await new Promise((resolve, reject) => {
                db.all(`SELECT id, name FROM suppliers`, [], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });
            
            const suppliers = suppliersRaw || [];
            
            for (const supplier of suppliers) {
                await db.run(
                    `UPDATE products SET supplier_id = ? WHERE TRIM(supplier) = ?`,
                    [supplier.id, supplier.name]
                );
            }
        }

        // Set remaining NULL supplier_ids to 'Unknown'
        const unknownSupplier = await new Promise((resolve, reject) => {
            db.get(`SELECT id FROM suppliers WHERE name = 'Unknown'`, [], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (unknownSupplier) {
            await db.run(
                `UPDATE products SET supplier_id = ? WHERE supplier_id IS NULL`,
                [unknownSupplier.id]
            );
        }

        console.log('✓ Product suppliers linked');
        console.log('Migration 003 completed successfully!');
    },

    down: async (db) => {
        console.log('Rolling back migration 003: Suppliers system...');
        
        await db.run(`
            CREATE TABLE products_backup AS SELECT 
                id, name, barcode, brand, supplier, item, in_house_number, 
                cost_per_case, items_per_case, cost_per_item, category_id,
                created_at, updated_at
            FROM products
        `);
        
        await db.run(`DROP TABLE products`);
        await db.run(`ALTER TABLE products_backup RENAME TO products`);
        await db.run(`DROP TABLE IF EXISTS suppliers`);
        
        console.log('Migration 003 rolled back successfully!');
    }
};
