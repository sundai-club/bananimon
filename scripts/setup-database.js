const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'bananimon.db');

console.log('🗄️  Setting up Bananimon database...');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        return;
    }
    console.log('✅ Connected to SQLite database');
});

// Create tables
db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_anonymous BOOLEAN DEFAULT 1
    )`);

    // Bananimon table
    db.run(`CREATE TABLE IF NOT EXISTS bananimon (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        animal_type TEXT NOT NULL,
        temperament TEXT DEFAULT 'Calm',
        evolution_stage INTEGER DEFAULT 0,
        
        -- Core stats (0-100)
        hunger INTEGER DEFAULT 85,
        rest INTEGER DEFAULT 85, 
        cleanliness INTEGER DEFAULT 85,
        mood INTEGER DEFAULT 85,
        
        -- Progression
        bond INTEGER DEFAULT 3,
        focus INTEGER DEFAULT 0,
        care_streak INTEGER DEFAULT 0,
        last_care_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        -- Rest scheduling
        rest_window_utc INTEGER DEFAULT 22,
        consistency_tokens INTEGER DEFAULT 0,
        
        -- Images and appearance
        image_urls TEXT, -- JSON array of generated images
        selected_image_index INTEGER DEFAULT 0,
        
        -- Timestamps
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Care activities log
    db.run(`CREATE TABLE IF NOT EXISTS care_activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bananimon_id TEXT NOT NULL,
        activity_type TEXT NOT NULL, -- 'feed', 'groom', 'train', 'rest'
        performance_score REAL, -- 0.0 to 1.0 for mini-game performance
        bond_gained REAL DEFAULT 0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (bananimon_id) REFERENCES bananimon (id)
    )`);

    // Battle system
    db.run(`CREATE TABLE IF NOT EXISTS battles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bananimon_id TEXT NOT NULL,
        opponent_type TEXT NOT NULL, -- 'pve', 'ghost'
        opponent_data TEXT, -- JSON data about opponent
        result TEXT NOT NULL, -- 'win', 'loss', 'draw'
        moves_used TEXT, -- JSON array of moves used
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (bananimon_id) REFERENCES bananimon (id)
    )`);

    // Quests/achievements
    db.run(`CREATE TABLE IF NOT EXISTS quests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bananimon_id TEXT NOT NULL,
        quest_type TEXT NOT NULL,
        description TEXT NOT NULL,
        progress INTEGER DEFAULT 0,
        target INTEGER NOT NULL,
        completed BOOLEAN DEFAULT 0,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (bananimon_id) REFERENCES bananimon (id)
    )`);

    console.log('✅ Database tables created successfully');
});

db.close((err) => {
    if (err) {
        console.error('❌ Error closing database:', err.message);
    } else {
        console.log('✅ Database setup complete!');
    }
});