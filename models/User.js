const { v4: uuidv4 } = require('uuid');
const db = require('./database');

class User {
    static async create(email = null) {
        const userId = uuidv4();
        const isAnonymous = !email;
        
        await db.run(
            'INSERT INTO users (id, email, is_anonymous) VALUES (?, ?, ?)',
            [userId, email, isAnonymous]
        );
        
        return this.findById(userId);
    }
    
    static async findById(id) {
        const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
        return user;
    }
    
    static async findByEmail(email) {
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        return user;
    }
    
    static async updateLastActive(id) {
        await db.run(
            'UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
        );
    }
    
    static async linkEmail(id, email) {
        await db.run(
            'UPDATE users SET email = ?, is_anonymous = 0 WHERE id = ?',
            [email, id]
        );
        return this.findById(id);
    }
}

module.exports = User;