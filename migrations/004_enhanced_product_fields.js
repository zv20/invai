/**
 * Migration 004: Enhanced Product Fields
 * 
 * Adds additional fields to products for better inventory management:
 * - product_image: Path or URL to product image
 * - allergen_info: Allergen information
 * - nutritional_data: JSON field for nutritional information
 * - storage_temp: Storage temperature requirement
 */

module.exports = {
    id: '004_enhanced_product_fields',
    description: 'Add product_image, allergen_info, nutritional_data, and storage_temp fields',
    
    async up(db) {
        console.log('Running migration 004: Enhanced Product Fields');
        
        // Add product_image field
        await db.run('ALTER TABLE products ADD COLUMN product_image TEXT');
        console.log('✓ Added product_image column');
        
        // Add allergen_info field
        await db.run('ALTER TABLE products ADD COLUMN allergen_info TEXT');
        console.log('✓ Added allergen_info column');
        
        // Add nutritional_data field (JSON)
        await db.run('ALTER TABLE products ADD COLUMN nutritional_data TEXT');
        console.log('✓ Added nutritional_data column');
        
        // Add storage_temp field with CHECK constraint
        await db.run(`
            ALTER TABLE products ADD COLUMN storage_temp TEXT 
            CHECK(storage_temp IN ('frozen', 'refrigerated', 'dry', 'ambient', NULL))
            DEFAULT NULL
        `);
        console.log('✓ Added storage_temp column with constraints');
        
        // Set default storage temperatures based on categories
        const categoryStorageMap = {
            1: 'refrigerated',  // Dairy
            2: 'refrigerated',  // Produce (most)
            3: 'refrigerated',  // Meat
            4: 'ambient',       // Bakery
            5: 'frozen',        // Frozen
            6: 'dry',           // Dry Goods
            7: 'ambient',       // Beverages (most)
            8: 'dry',           // Snacks
            9: 'ambient',       // Condiments
            10: 'ambient',      // Cleaning
            11: 'ambient',      // Personal Care
            12: 'ambient'       // Other
        };
        
        for (const [categoryId, storageTemp] of Object.entries(categoryStorageMap)) {
            await db.run(
                'UPDATE products SET storage_temp = ? WHERE category_id = ? AND storage_temp IS NULL',
                storageTemp,
                categoryId
            );
        }
        
        console.log('✓ Set default storage temperatures based on categories');
        
        console.log('Migration 004 completed successfully!');
    },
    
    async down(db) {
        console.log('Rolling back migration 004: Enhanced Product Fields');
        
        // SQLite doesn't support DROP COLUMN, so we need to recreate the table
        await db.run('ALTER TABLE products RENAME TO products_temp');
        
        // Recreate products table without new fields
        await db.run(`
            CREATE TABLE products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                barcode TEXT,
                brand TEXT,
                supplier TEXT,
                item TEXT,
                category_id INTEGER,
                supplier_id INTEGER,
                in_house_number TEXT,
                case_cost REAL,
                items_per_case INTEGER,
                cost_per_item REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Copy data back (excluding new columns)
        await db.run(`
            INSERT INTO products (id, name, barcode, brand, supplier, item, category_id, supplier_id,
                                 in_house_number, case_cost, items_per_case, cost_per_item, created_at)
            SELECT id, name, barcode, brand, supplier, item, category_id, supplier_id,
                   in_house_number, case_cost, items_per_case, cost_per_item, created_at
            FROM products_temp
        `);
        
        await db.run('DROP TABLE products_temp');
        
        console.log('Migration 004 rolled back successfully!');
    }
};
