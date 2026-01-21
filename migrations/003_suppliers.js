/**
 * Migration 003: Suppliers System
 * 
 * Creates suppliers table and migrates existing text-based 'supplier' field
 * to use foreign key relationship with suppliers.
 * 
 * Changes:
 * - Create suppliers table
 * - Add supplier_id to products table
 * - Migrate existing supplier text to supplier references
 * - Support for contact info and notes
 */

module.exports = {
    id: '003_suppliers',
    description: 'Create suppliers table and migrate supplier field to supplier_id',
    
    async up(db) {
        console.log('Running migration 003: Suppliers System');
        
        // Create suppliers table
        await db.run(`
            CREATE TABLE IF NOT EXISTS suppliers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                contact_name TEXT,
                phone TEXT,
                email TEXT,
                address TEXT,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('✓ Suppliers table created');
        
        // Get unique suppliers from existing products
        const existingSuppliers = await db.all(`
            SELECT DISTINCT supplier 
            FROM products 
            WHERE supplier IS NOT NULL AND supplier != ''
            ORDER BY supplier
        `);
        
        console.log(`Found ${existingSuppliers.length} unique suppliers in existing data`);
        
        // Insert existing suppliers into new table
        const insertStmt = await db.prepare(
            'INSERT INTO suppliers (name) VALUES (?)'
        );
        
        const supplierMap = {}; // Map supplier name to ID
        
        for (const row of existingSuppliers) {
            const result = await insertStmt.run(row.supplier);
            supplierMap[row.supplier] = result.lastID;
        }
        await insertStmt.finalize();
        
        console.log(`✓ Inserted ${existingSuppliers.length} suppliers`);
        
        // Add supplier_id column to products table
        await db.run('ALTER TABLE products ADD COLUMN supplier_id INTEGER');
        console.log('✓ Added supplier_id column to products table');
        
        // Migrate existing supplier data
        const products = await db.all('SELECT id, supplier FROM products');
        
        for (const product of products) {
            if (product.supplier && supplierMap[product.supplier]) {
                await db.run(
                    'UPDATE products SET supplier_id = ? WHERE id = ?',
                    supplierMap[product.supplier],
                    product.id
                );
            }
        }
        
        console.log(`✓ Migrated ${products.length} products to use supplier_id`);
        
        // Add foreign key index for performance
        await db.run('CREATE INDEX idx_products_supplier_id ON products(supplier_id)');
        console.log('✓ Created index on supplier_id');
        
        console.log('Migration 003 completed successfully!');
    },
    
    async down(db) {
        console.log('Rolling back migration 003: Suppliers System');
        
        // Drop index
        await db.run('DROP INDEX IF EXISTS idx_products_supplier_id');
        
        // Remove supplier_id column (SQLite doesn't support DROP COLUMN directly)
        await db.run('ALTER TABLE products RENAME TO products_temp');
        
        // Recreate products table without supplier_id
        await db.run(`
            CREATE TABLE products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                barcode TEXT,
                brand TEXT,
                supplier TEXT,
                item TEXT,
                category_id INTEGER,
                in_house_number TEXT,
                case_cost REAL,
                items_per_case INTEGER,
                cost_per_item REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Copy data back
        await db.run(`
            INSERT INTO products (id, name, barcode, brand, supplier, item, category_id,
                                 in_house_number, case_cost, items_per_case, cost_per_item, created_at)
            SELECT id, name, barcode, brand, supplier, item, category_id,
                   in_house_number, case_cost, items_per_case, cost_per_item, created_at
            FROM products_temp
        `);
        
        await db.run('DROP TABLE products_temp');
        
        // Drop suppliers table
        await db.run('DROP TABLE IF EXISTS suppliers');
        
        console.log('Migration 003 rolled back successfully!');
    }
};
