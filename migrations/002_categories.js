/**
 * Migration 002: Categories System
 * 
 * Creates categories table and migrates existing product 'item' text field to category_id references
 * Adds default grocery categories with colors for UI display
 */

module.exports = {
    version: 2,
    name: '002_categories',
    description: 'Create categories table and migrate product item field to category references',

    up: async (db) => {
        console.log('Running migration 002: Categories system...');

        // Create categories table
        await db.run(`
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                color TEXT NOT NULL,
                icon TEXT,
                display_order INTEGER NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('✓ Categories table created');

        // Check if categories already exist to avoid duplicates
        const existingCategories = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(*) as count FROM categories`, [], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (existingCategories && existingCategories.count === 0) {
            // Insert default categories with colors only if table is empty
            const defaultCategories = [
                { name: 'Dairy', description: 'Milk, cheese, yogurt, butter', color: '#FFF9C4', icon: '🥛', order: 1 },
                { name: 'Produce', description: 'Fruits and vegetables', color: '#C8E6C9', icon: '🥬', order: 2 },
                { name: 'Meat', description: 'Beef, pork, poultry, seafood', color: '#FFCDD2', icon: '🥩', order: 3 },
                { name: 'Bakery', description: 'Bread, pastries, baked goods', color: '#FFE0B2', icon: '🍞', order: 4 },
                { name: 'Frozen', description: 'Frozen foods and ice cream', color: '#B3E5FC', icon: '❄️', order: 5 },
                { name: 'Dry Goods', description: 'Pasta, rice, canned goods', color: '#D7CCC8', icon: '📦', order: 6 },
                { name: 'Beverages', description: 'Drinks, juices, sodas', color: '#F8BBD0', icon: '🥤', order: 7 },
                { name: 'Snacks', description: 'Chips, cookies, crackers', color: '#FFECB3', icon: '🍿', order: 8 },
                { name: 'Condiments', description: 'Sauces, dressings, spices', color: '#FFCCBC', icon: '🧂', order: 9 },
                { name: 'Cleaning', description: 'Household cleaning products', color: '#E1BEE7', icon: '🧹', order: 10 },
                { name: 'Personal Care', description: 'Toiletries and hygiene', color: '#BBDEFB', icon: '🧴', order: 11 },
                { name: 'Other', description: 'Miscellaneous items', color: '#CFD8DC', icon: '📋', order: 12 }
            ];

            for (const cat of defaultCategories) {
                await db.run(
                    `INSERT INTO categories (name, description, color, icon, display_order) VALUES (?, ?, ?, ?, ?)`,
                    [cat.name, cat.description, cat.color, cat.icon, cat.order]
                );
            }
            console.log('✓ Default categories inserted');
        } else {
            console.log('✓ Categories already exist, skipping insert');
        }

        // Check if category_id column already exists
        const tableInfo = await new Promise((resolve, reject) => {
            db.all(`PRAGMA table_info(products)`, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        const categoryIdExists = tableInfo.some(col => col.name === 'category_id');

        if (!categoryIdExists) {
            // Add category_id column to products table
            await db.run(`ALTER TABLE products ADD COLUMN category_id INTEGER REFERENCES categories(id)`);
            console.log('✓ Added category_id column to products');
        } else {
            console.log('✓ category_id column already exists, skipping');
        }

        // Migrate existing 'item' data to categories
        // Get all unique item values from products - wrap in Promise to ensure proper async
        const existingItemsRaw = await new Promise((resolve, reject) => {
            db.all(`SELECT DISTINCT item FROM products WHERE item IS NOT NULL AND item != ''`, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
        
        const existingItems = existingItemsRaw || [];
        
        console.log(`Found ${existingItems.length} unique item types to migrate`);

        // Map common item names to category IDs
        const categoryMapping = {
            // Dairy variations
            'dairy': 'Dairy', 'milk': 'Dairy', 'cheese': 'Dairy', 'yogurt': 'Dairy',
            // Produce variations
            'produce': 'Produce', 'fruit': 'Produce', 'vegetable': 'Produce', 'fruits': 'Produce', 'vegetables': 'Produce',
            // Meat variations
            'meat': 'Meat', 'beef': 'Meat', 'chicken': 'Meat', 'pork': 'Meat', 'fish': 'Meat', 'seafood': 'Meat',
            // Bakery variations
            'bakery': 'Bakery', 'bread': 'Bakery', 'pastry': 'Bakery',
            // Frozen variations
            'frozen': 'Frozen', 'ice cream': 'Frozen',
            // Dry goods variations
            'dry goods': 'Dry Goods', 'canned': 'Dry Goods', 'pasta': 'Dry Goods', 'rice': 'Dry Goods',
            // Beverages
            'beverage': 'Beverages', 'beverages': 'Beverages', 'drink': 'Beverages', 'juice': 'Beverages', 'soda': 'Beverages',
            // Snacks
            'snack': 'Snacks', 'snacks': 'Snacks', 'chips': 'Snacks', 'cookies': 'Snacks',
            // Condiments
            'condiment': 'Condiments', 'condiments': 'Condiments', 'sauce': 'Condiments', 'spice': 'Condiments',
            // Cleaning
            'cleaning': 'Cleaning', 'cleaner': 'Cleaning',
            // Personal care
            'personal care': 'Personal Care', 'toiletries': 'Personal Care'
        };

        // Update products with matching categories
        for (const row of existingItems) {
            if (!row || !row.item) continue; // Safety check
            
            const itemName = row.item.toLowerCase().trim();
            const categoryName = categoryMapping[itemName] || 'Other';
            
            // Get category ID
            const category = await new Promise((resolve, reject) => {
                db.get(`SELECT id FROM categories WHERE name = ?`, [categoryName], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            
            if (category) {
                await db.run(
                    `UPDATE products SET category_id = ? WHERE LOWER(TRIM(item)) = ?`,
                    [category.id, itemName]
                );
                console.log(`  Migrated "${row.item}" → ${categoryName}`);
            }
        }

        // Set remaining NULL category_ids to 'Other'
        const otherCategory = await new Promise((resolve, reject) => {
            db.get(`SELECT id FROM categories WHERE name = 'Other'`, [], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (otherCategory) {
            await db.run(`UPDATE products SET category_id = ? WHERE category_id IS NULL`, [otherCategory.id]);
        }

        console.log('✓ Product categories migrated');
        console.log('Migration 002 completed successfully!');
    },

    down: async (db) => {
        console.log('Rolling back migration 002: Categories system...');
        
        // Remove category_id column from products
        // SQLite doesn't support DROP COLUMN directly, need to recreate table
        await db.run(`
            CREATE TABLE products_backup AS SELECT 
                id, name, barcode, brand, supplier, item, in_house_number, 
                cost_per_case, items_per_case, cost_per_item, created_at, updated_at
            FROM products
        `);
        
        await db.run(`DROP TABLE products`);
        await db.run(`ALTER TABLE products_backup RENAME TO products`);
        
        // Drop categories table
        await db.run(`DROP TABLE IF EXISTS categories`);
        
        console.log('Migration 002 rolled back successfully!');
    }
};
