const { v4: uuidv4 } = require('uuid');
const db = require('./database');

class Bananimon {
    static async create(userData) {
        const {
            userId,
            name,
            animalType,
            temperament = 'Calm',
            imageUrls = [],
            selectedImageIndex = 0
        } = userData;
        
        const bananimonId = uuidv4();
        
        await db.run(`
            INSERT INTO bananimon (
                id, user_id, name, animal_type, temperament,
                image_urls, selected_image_index
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            bananimonId, userId, name, animalType, temperament,
            JSON.stringify(imageUrls), selectedImageIndex
        ]);
        
        return this.findById(bananimonId);
    }
    
    static async findById(id) {
        const bananimon = await db.get('SELECT * FROM bananimon WHERE id = ?', [id]);
        if (bananimon && bananimon.image_urls) {
            try {
                bananimon.image_urls = JSON.parse(bananimon.image_urls);
            } catch (e) {
                // If parsing fails, wrap the string in an array
                bananimon.image_urls = [bananimon.image_urls];
            }
        }
        return bananimon;
    }
    
    static async findByUserId(userId) {
        const bananimon = await db.get('SELECT * FROM bananimon WHERE user_id = ?', [userId]);
        if (bananimon && bananimon.image_urls) {
            try {
                bananimon.image_urls = JSON.parse(bananimon.image_urls);
            } catch (e) {
                // If parsing fails, wrap the string in an array
                bananimon.image_urls = [bananimon.image_urls];
            }
        }
        return bananimon;
    }
    
    static async updateStats(id, stats) {
        const setParts = [];
        const values = [];
        
        // Clamp stats between 0 and 100
        Object.keys(stats).forEach(key => {
            if (['hunger', 'rest', 'cleanliness', 'mood'].includes(key)) {
                setParts.push(`${key} = ?`);
                values.push(Math.max(0, Math.min(100, stats[key])));
            }
        });
        
        if (setParts.length === 0) return;
        
        values.push(id);
        await db.run(
            `UPDATE bananimon SET ${setParts.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            values
        );
        
        return this.findById(id);
    }
    
    static async updateBond(id, bondChange) {
        const current = await this.findById(id);
        const newBond = Math.max(0, Math.min(100, current.bond + bondChange));
        
        await db.run(
            'UPDATE bananimon SET bond = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newBond, id]
        );
        
        return this.findById(id);
    }
    
    static async updateCareStreak(id, increment = true) {
        const current = await this.findById(id);
        const today = new Date().toDateString();
        const lastCareDate = new Date(current.last_care_at).toDateString();
        
        let newStreak = current.care_streak;
        
        if (increment) {
            if (lastCareDate !== today) {
                // Only increment if we haven't cared today
                newStreak += 1;
                await db.run(
                    'UPDATE bananimon SET care_streak = ?, last_care_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [newStreak, id]
                );
            }
        } else {
            // Streak broken - reduce by half (compassionate)
            newStreak = Math.floor(newStreak / 2);
            await db.run(
                'UPDATE bananimon SET care_streak = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [newStreak, id]
            );
        }
        
        return this.findById(id);
    }
    
    static async checkEvolution(id) {
        const bananimon = await this.findById(id);
        const { bond, care_streak, evolution_stage } = bananimon;
        
        let newStage = evolution_stage;
        
        // Evolution thresholds
        if (evolution_stage === 0 && bond >= 12 && care_streak >= 3) {
            newStage = 1; // Hatchling → Juvenile
        } else if (evolution_stage === 1 && bond >= 35 && care_streak >= 7) {
            newStage = 2; // Juvenile → Adept
        } else if (evolution_stage === 2 && bond >= 70 && care_streak >= 12) {
            newStage = 3; // Adept → Kindred
        }
        
        if (newStage > evolution_stage) {
            await db.run(
                'UPDATE bananimon SET evolution_stage = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [newStage, id]
            );
            return { evolved: true, newStage, bananimon: await this.findById(id) };
        }
        
        return { evolved: false, newStage: evolution_stage, bananimon };
    }
    
    static async applyDecay(id) {
        const bananimon = await this.findById(id);
        const now = new Date();
        const lastUpdate = new Date(bananimon.updated_at);
        const hoursSinceUpdate = Math.floor((now - lastUpdate) / (1000 * 60 * 60));
        
        if (hoursSinceUpdate < 1) return bananimon;
        
        // Apply decay rates per hour
        const newStats = {
            hunger: Math.max(10, bananimon.hunger - (2 * hoursSinceUpdate)),
            rest: Math.max(10, bananimon.rest - (1 * hoursSinceUpdate)),
            cleanliness: Math.max(10, bananimon.cleanliness - (1.5 * hoursSinceUpdate)),
        };
        
        // Mood is average of others
        newStats.mood = Math.max(10, Math.round((newStats.hunger + newStats.rest + newStats.cleanliness) / 3));
        
        return this.updateStats(id, newStats);
    }
    
    static getStageInfo(stage) {
        const stages = {
            0: { name: 'Hatchling', description: 'Small and discovering the world' },
            1: { name: 'Juvenile', description: 'Growing stronger through care' },
            2: { name: 'Adept', description: 'Confident and capable' },
            3: { name: 'Kindred', description: 'Your lifelong companion' }
        };
        return stages[stage] || stages[0];
    }
}

module.exports = Bananimon;