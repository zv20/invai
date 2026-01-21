/**
 * Migration 002: Categories System
 * 
 * Creates categories table and migrates existing text-based 'item' field
 * to use foreign key relationship with categories.
 * 
 * Changes:
 * - Create categories table with default categories
 * - Add category_id to products table
 * - Migrate existing item text to category references
 * - Add display_order, color, and icon support
 */

module.exports = {
    id: '002_categories',
    description: 'Create categories table and migrate item field to category_id',
    
    async up(db) {
        console.log('Running migration 002: Categories System');
        
        // Create categories table
        await db.run(`
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                color TEXT DEFAULT '#9333ea',
                icon TEXT,
                display_order INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('✓ Categories table created');
        
        // Insert default categories
        const defaultCategories = [
            { name: 'Dairy', description: 'Milk, cheese, yogurt, butter', color: '#fbbf24', icon: '🥛', order: 1 },
            { name: 'Produce', description: 'Fruits and vegetables', color: '#22c55e', icon: '🥬', order: 2 },
            { name: 'Meat', description: 'Beef, pork, chicken, fish', color: '#ef4444', icon: '🥩', order: 3 },
            { name: 'Bakery', description: 'Bread, pastries, baked goods', color: '#f97316', icon: '🍞', order: 4 },
            { name: 'Frozen', description: 'Frozen foods and ice cream', color: '#3b82f6', icon: '❄️', order: 5 },
            { name: 'Dry Goods', description: 'Pasta, rice, flour, grains', color: '#a16207', icon: '🌾', order: 6 },
            { name: 'Beverages', description: 'Drinks, juices, sodas', color: '#06b6d4', icon: '🥤', order: 7 },
            { name: 'Snacks', description: 'Chips, cookies, candy', color: '#ec4899', icon: '🍪', order: 8 },
            { name: 'Condiments', description: 'Sauces, dressings, spices', color: '#eab308', icon: '🧂', order: 9 },
            { name: 'Cleaning', description: 'Cleaning supplies', color: '#14b8a6', icon: '🧹', order: 10 },
            { name: 'Personal Care', description: 'Toiletries and hygiene', color: '#8b5cf6', icon: '🧴', order: 11 },
            { name: 'Other', description: 'Miscellaneous items', color: '#6b7280', icon: '📦', order: 12 }
        ];
        
        const insertStmt = await db.prepare(
            'INSERT INTO categories (name, description, color, icon, display_order) VALUES (?, ?, ?, ?, ?)'
        );
        
        for (const cat of defaultCategories) {
            await insertStmt.run(cat.name, cat.description, cat.color, cat.icon, cat.order);
        }
        await insertStmt.finalize();
        
        console.log(`✓ Inserted ${defaultCategories.length} default categories`);
        
        // Add category_id column to products table
        await db.run('ALTER TABLE products ADD COLUMN category_id INTEGER');
        console.log('✓ Added category_id column to products table');
        
        // Migrate existing 'item' data to categories
        // Map common item names to category IDs
        const itemMapping = {
            'dairy': 1, 'milk': 1, 'cheese': 1, 'yogurt': 1,
            'produce': 2, 'fruit': 2, 'vegetable': 2, 'fruits': 2, 'vegetables': 2,
            'meat': 3, 'beef': 3, 'pork': 3, 'chicken': 3, 'fish': 3,
            'bakery': 4, 'bread': 4, 'pastry': 4,
            'frozen': 5, 'ice cream': 5,
            'dry goods': 6, 'pasta': 6, 'rice': 6, 'flour': 6, 'grain': 6,
            'beverage': 7, 'drink': 7, 'juice': 7, 'soda': 7,
            'snack': 8, 'chips': 8, 'cookie': 8, 'candy': 8,
            'condiment': 9, 'sauce': 9, 'spice': 9,
            'cleaning': 10,
            'personal care': 11, 'toiletries': 11
        };
        
        // Get all products
        const products = await db.all('SELECT id, item FROM products');
        
        for (const product of products) {
            if (!product.item) {
                // Default to 'Other' if no item specified
                await db.run('UPDATE products SET category_id = 12 WHERE id = ?', product.id);
                continue;
            }
            
            const itemLower = product.item.toLowerCase().trim();
            let categoryId = itemMapping[itemLower] || 12; // Default to 'Other'
            
            // Check for partial matches if exact match not found
            if (categoryId === 12) {
                for (const [key, value] of Object.entries(itemMapping)) {
                    if (itemLower.includes(key)) {
                        categoryId = value;
                        break;
                    }
                }
            }
            
            await db.run('UPDATE products SET category_id = ? WHERE id = ?', categoryId, product.id);
        }
        
        console.log(`✓ Migrated ${products.length} products to use category_id`);
        
        // Add foreign key index for performance
        await db.run('CREATE INDEX idx_products_category_id ON products(category_id)');
        console.log('✓ Created index on category_id');
        
        console.log('Migration 002 completed successfully!');
    },
    
    async down(db) {
        console.log('Rolling back migration 002: Categories System');
        
        // Drop index
        await db.run('DROP INDEX IF EXISTS idx_products_category_id');
        
        // Remove category_id column (SQLite doesn't support DROP COLUMN directly)
        // We'll need to recreate the table without the column
        await db.run('ALTER TABLE products RENAME TO products_old');
        
        // Recreate products table without category_id
        await db.run(`
            CREATE TABLE products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                barcode TEXT,
                brand TEXT,
                supplier TEXT,
                item TEXT,
                in_house_number TEXT,
                case_cost REAL,
                items_per_case INTEGER,
                cost_per_item REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Copy data back
        await db.run(`
            INSERT INTO products (id, name, barcode, brand, supplier, item, in_house_number, 
                                 case_cost, items_per_case, cost_per_item, created_at)
            SELECT id, name, barcode, brand, supplier, item, in_house_number, 
                   case_cost, items_per_case, cost_per_item, created_at
            FROM products_old
        `);
        
        await db.run('DROP TABLE products_old');
        
        // Drop categories table
        await db.run('DROP TABLE IF EXISTS categories');
        
        console.log('Migration 002 rolled back successfully!');
    }
};
