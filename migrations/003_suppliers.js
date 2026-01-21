/**
 * Migration 003: Suppliers System
 * 
 * Creates suppliers table and migrates existing product 'supplier' text field to supplier_id references
 * Allows user-managed supplier list
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

        // Get all unique supplier names from products
        const existingSuppliers = await db.all(
            `SELECT DISTINCT supplier FROM products WHERE supplier IS NOT NULL AND supplier != '' ORDER BY supplier`
        );

        console.log(`Found ${existingSuppliers.length} unique suppliers to migrate`);

        // Insert each unique supplier
        for (const row of existingSuppliers) {
            const supplierName = row.supplier.trim();
            if (supplierName) {
                await db.run(
                    `INSERT OR IGNORE INTO suppliers (name, notes) VALUES (?, ?)`,
                    [supplierName, 'Migrated from v0.7.0']
                );
                console.log(`  Created supplier: ${supplierName}`);
            }
        }

        // Add a default "Unknown" supplier for products without supplier info
        await db.run(
            `INSERT OR IGNORE INTO suppliers (name, notes) VALUES (?, ?)`,
            ['Unknown', 'Default supplier for unspecified products']
        );

        console.log('✓ Suppliers migrated to table');

        // Add supplier_id column to products table
        await db.run(`ALTER TABLE products ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id)`);
        console.log('✓ Added supplier_id column to products');

        // Update products with supplier_id based on supplier name
        const suppliers = await db.all(`SELECT id, name FROM suppliers`);
        
        for (const supplier of suppliers) {
            await db.run(
                `UPDATE products SET supplier_id = ? WHERE TRIM(supplier) = ?`,
                [supplier.id, supplier.name]
            );
        }

        // Set remaining NULL supplier_ids to 'Unknown'
        const unknownSupplier = await db.get(`SELECT id FROM suppliers WHERE name = 'Unknown'`);
        await db.run(
            `UPDATE products SET supplier_id = ? WHERE supplier_id IS NULL`,
            [unknownSupplier.id]
        );

        console.log('✓ Product suppliers linked');
        console.log('Migration 003 completed successfully!');
    },

    down: async (db) => {
        console.log('Rolling back migration 003: Suppliers system...');
        
        // Remove supplier_id column from products (recreate table without column)
        await db.run(`
            CREATE TABLE products_backup AS SELECT 
                id, name, barcode, brand, supplier, item, in_house_number, 
                cost_per_case, items_per_case, cost_per_item, category_id,
                created_at, updated_at
            FROM products
        `);
        
        await db.run(`DROP TABLE products`);
        await db.run(`ALTER TABLE products_backup RENAME TO products`);
        
        // Drop suppliers table
        await db.run(`DROP TABLE IF EXISTS suppliers`);
        
        console.log('Migration 003 rolled back successfully!');
    }
};
