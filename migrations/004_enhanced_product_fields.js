/**
 * Migration 004: Enhanced Product Fields
 * 
 * Adds new fields to products table:
 * - product_image (file path/URL)
 * - allergen_info (text field for allergen warnings)
 * - nutritional_data (JSON field for nutritional information)
 * - storage_temp (enum: frozen/refrigerated/dry/ambient)
 * 
 * Version: v0.7.4c (hotfix - column existence checks)
 */

module.exports = {
    version: 4,
    name: '004_enhanced_product_fields',
    description: 'Add product_image, allergen_info, nutritional_data, and storage_temp fields',

    up: async (db) => {
        console.log('Running migration 004: Enhanced product fields...');

        // Check what columns already exist
        const tableInfo = await new Promise((resolve, reject) => {
            db.all(`PRAGMA table_info(products)`, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        const columnExists = (name) => tableInfo.some(col => col.name === name);

        // Add product_image column if it doesn't exist
        if (!columnExists('product_image')) {
            await db.run(`ALTER TABLE products ADD COLUMN product_image TEXT`);
            console.log('✓ Added product_image column');
        } else {
            console.log('✓ product_image column already exists, skipping');
        }

        // Add allergen_info column if it doesn't exist
        if (!columnExists('allergen_info')) {
            await db.run(`ALTER TABLE products ADD COLUMN allergen_info TEXT`);
            console.log('✓ Added allergen_info column');
        } else {
            console.log('✓ allergen_info column already exists, skipping');
        }

        // Add nutritional_data column (stored as JSON text) if it doesn't exist
        if (!columnExists('nutritional_data')) {
            await db.run(`ALTER TABLE products ADD COLUMN nutritional_data TEXT`);
            console.log('✓ Added nutritional_data column');
        } else {
            console.log('✓ nutritional_data column already exists, skipping');
        }

        // Add storage_temp column with check constraint if it doesn't exist
        if (!columnExists('storage_temp')) {
            await db.run(`
                ALTER TABLE products ADD COLUMN storage_temp TEXT 
                CHECK(storage_temp IN ('frozen', 'refrigerated', 'dry', 'ambient')) 
                DEFAULT 'ambient'
            `);
            console.log('✓ Added storage_temp column');

            // Set default storage temperatures based on category
            // This is a smart guess based on common category storage requirements
            const storageMapping = [
                { category: 'Frozen', temp: 'frozen' },
                { category: 'Dairy', temp: 'refrigerated' },
                { category: 'Meat', temp: 'refrigerated' },
                { category: 'Produce', temp: 'refrigerated' },
                { category: 'Bakery', temp: 'ambient' },
                { category: 'Dry Goods', temp: 'dry' },
                { category: 'Beverages', temp: 'ambient' },
                { category: 'Snacks', temp: 'dry' },
                { category: 'Condiments', temp: 'dry' },
                { category: 'Cleaning', temp: 'ambient' },
                { category: 'Personal Care', temp: 'ambient' }
            ];

            for (const mapping of storageMapping) {
                await db.run(`
                    UPDATE products 
                    SET storage_temp = ? 
                    WHERE category_id = (SELECT id FROM categories WHERE name = ?)
                `, [mapping.temp, mapping.category]);
                console.log(`  Set ${mapping.category} products to ${mapping.temp}`);
            }
        } else {
            console.log('✓ storage_temp column already exists, skipping');
        }

        console.log('Migration 004 completed successfully!');
    },

    down: async (db) => {
        console.log('Rolling back migration 004: Enhanced product fields...');
        
        // SQLite doesn't support DROP COLUMN, so we need to recreate the table
        await db.run(`
            CREATE TABLE products_backup AS SELECT 
                id, name, barcode, brand, supplier, item, in_house_number, 
                cost_per_case, items_per_case, cost_per_item, 
                category_id, supplier_id,
                created_at, updated_at
            FROM products
        `);
        
        await db.run(`DROP TABLE products`);
        await db.run(`ALTER TABLE products_backup RENAME TO products`);
        
        console.log('Migration 004 rolled back successfully!');
    }
};
