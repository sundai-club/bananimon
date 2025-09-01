const express = require('express');
const session = require('express-session');
const path = require('path');
const cron = require('node-cron');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Import models
const db = require('./models/database');
const User = require('./models/User');
const Bananimon = require('./models/Bananimon');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'bananimon-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false, // Set to true in production with HTTPS
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
}));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Initialize database connection
async function initializeServer() {
    try {
        await db.connect();
        console.log('✅ Database connected successfully');
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        process.exit(1);
    }
}

// User API endpoints
app.post('/api/user/create', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.create(email);
        
        // Store user ID in session
        req.session.userId = user.id;
        
        res.json({ 
            success: true, 
            userId: user.id,
            isAnonymous: user.is_anonymous 
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

app.get('/api/user/profile', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Update last active
        await User.updateLastActive(user.id);
        
        res.json({ user });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Bananimon API endpoints
app.post('/api/bananimon/create', async (req, res) => {
    try {
        const { userId, name, animalType, temperament, imageUrls, selectedImageIndex } = req.body;
        
        if (!userId || !name || !animalType) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const bananimon = await Bananimon.create({
            userId,
            name,
            animalType,
            temperament,
            imageUrls,
            selectedImageIndex
        });
        
        res.json({ success: true, bananimon });
    } catch (error) {
        console.error('Error creating Bananimon:', error);
        res.status(500).json({ error: 'Failed to create Bananimon' });
    }
});

app.get('/api/bananimon/:id', async (req, res) => {
    try {
        const bananimon = await Bananimon.findById(req.params.id);
        if (!bananimon) {
            return res.status(404).json({ error: 'Bananimon not found' });
        }
        
        // Apply decay before returning stats
        const updatedBananimon = await Bananimon.applyDecay(bananimon.id);
        
        res.json({ bananimon: updatedBananimon });
    } catch (error) {
        console.error('Error fetching Bananimon:', error);
        res.status(500).json({ error: 'Failed to fetch Bananimon' });
    }
});

app.get('/api/home', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const bananimon = await Bananimon.findByUserId(req.session.userId);
        if (!bananimon) {
            return res.status(404).json({ error: 'No Bananimon found. Please create one first.' });
        }
        
        // Apply decay and get current stats
        const updatedBananimon = await Bananimon.applyDecay(bananimon.id);
        
        // Check if care is needed today
        const today = new Date().toDateString();
        const lastCareDate = new Date(updatedBananimon.last_care_at).toDateString();
        const careNeededToday = lastCareDate !== today;
        
        // Generate daily quests
        const dailyQuests = generateDailyQuests(updatedBananimon, careNeededToday);
        
        res.json({
            bananimon: updatedBananimon,
            careNeededToday,
            dailyQuests,
            stageInfo: Bananimon.getStageInfo(updatedBananimon.evolution_stage)
        });
    } catch (error) {
        console.error('Error fetching home data:', error);
        res.status(500).json({ error: 'Failed to fetch home data' });
    }
});

// Care system endpoints
app.post('/api/care/:action', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const { action } = req.params;
        const { bananimonId, performance } = req.body;
        
        const bananimon = await Bananimon.findById(bananimonId);
        if (!bananimon || bananimon.user_id !== req.session.userId) {
            return res.status(404).json({ error: 'Bananimon not found' });
        }
        
        const result = await performCareAction(bananimon, action, performance);
        
        res.json(result);
    } catch (error) {
        console.error('Error performing care action:', error);
        res.status(500).json({ error: 'Failed to perform care action' });
    }
});

// Rest schedule endpoint
app.post('/api/rest-schedule', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const { bananimonId, restHour } = req.body;
        
        const bananimon = await Bananimon.findById(bananimonId);
        if (!bananimon || bananimon.user_id !== req.session.userId) {
            return res.status(404).json({ error: 'Bananimon not found' });
        }
        
        await db.run(
            'UPDATE bananimon SET rest_window_utc = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [restHour, bananimonId]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating rest schedule:', error);
        res.status(500).json({ error: 'Failed to update rest schedule' });
    }
});

// Legacy endpoints for backwards compatibility
app.post('/generate-pet', (req, res) => {
    const promptType = req.body.promptType || 'bananimon'; // Default to 'bananimon' if not specified
    const serverPromptType = promptType === 'bananimon' ? 'simple' : 'regular';
    generateBananimonImages(req, res, 4, serverPromptType);
});
app.post('/api/generate-bananimon', (req, res) => generateBananimonImages(req, res, 3, 'detailed')); // Generate 3 for onboarding with detailed prompt

async function generateBananimonImages(req, res, numImages = 3, promptType = 'detailed') {
    try {
        const { userImage, selectedAnimal, selectedAge } = req.body;
        
        if (!userImage || !selectedAnimal) {
            return res.status(400).json({ error: 'Missing required data' });
        }

        const age = selectedAge !== undefined ? selectedAge : 10;
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image-preview' });
        
        const userImageData = userImage.split(',')[1];
        const animalImageUrl = getAnimalImageUrl(selectedAnimal.name);
        const animalImageResponse = await fetch(animalImageUrl);
        const animalImageBuffer = await animalImageResponse.arrayBuffer();
        const animalImageBase64 = Buffer.from(animalImageBuffer).toString('base64');
        
        const prompt = promptType === 'detailed' 
            ? createBananimonPrompt(selectedAnimal.name.toLowerCase(), age)
            : promptType === 'simple'
            ? createSimpleBananimonPrompt(selectedAnimal.name.toLowerCase(), age)
            : createRegularPrompt(selectedAnimal.name.toLowerCase(), age);

        console.log('🍌 Starting Bananimon generation...');
        console.log(`Creating ${selectedAnimal.name} character for ${age}-year-old`);

        const imageParts = [
            {
                inlineData: {
                    data: userImageData,
                    mimeType: 'image/jpeg'
                }
            },
            {
                inlineData: {
                    data: animalImageBase64,
                    mimeType: 'image/jpeg'
                }
            }
        ];

        // Generate images for selection
        const generationPromises = Array(numImages).fill().map(async (_, index) => {
            try {
                console.log(`🎨 Generating variant ${index + 1}/${numImages}...`);
                const result = await model.generateContent([prompt, ...imageParts]);
                const response = await result.response;
                
                if (response.candidates && response.candidates[0] && response.candidates[0].content) {
                    const parts = response.candidates[0].content.parts;
                    const imagePart = parts.find(part => part.inlineData && part.inlineData.mimeType.startsWith('image/'));
                    
                    if (imagePart && imagePart.inlineData && imagePart.inlineData.data) {
                        const generatedImage = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                        console.log(`✅ Successfully generated variant ${index + 1}/${numImages}`);
                        return generatedImage;
                    }
                }
                
                console.log(`❌ Failed to generate variant ${index + 1}/${numImages}`);
                return null;
            } catch (error) {
                console.error(`❌ Error in generation ${index + 1}/${numImages}:`, error.message);
                return null;
            }
        });

        const generatedImages = await Promise.all(generationPromises);
        const validImages = generatedImages.filter(img => img !== null);
        
        if (validImages.length === 0) {
            throw new Error('Failed to generate any images');
        }
        
        console.log(`✅ Successfully generated ${validImages.length}/${numImages} Bananimon variants`);
        
        res.json({ 
            generatedImages: validImages,
            totalGenerated: validImages.length
        });
        
    } catch (error) {
        console.error('❌ Error generating Bananimon:', error);
        res.status(500).json({ 
            error: 'Failed to generate Bananimon',
            details: error.message 
        });
    }
}

function createBananimonPrompt(animalType, age) {
    return `Create a full-body semi-furry anthropomorphic ${animalType} character of THIS SPECIFIC PERSON from Image A as a ${age}-year-old child.

Style: Cel-shaded cartoon with bold colors, clean outlines, and balanced anthro design optimized for a caring game called Bananimon.

Critical Requirements:
- Transform THIS PERSON into a ${age}-year-old semi-furry ${animalType} while keeping their face clearly recognizable
- Show full body (head to feet) in upright bipedal standing pose with a friendly, caring expression
- MUST preserve THIS PERSON'S unique facial features, eye shape, eye color, and bone structure but make them look younger
- MUST maintain the same gender as the person in the photo

FACE/HEAD (${age}-year-old version):
- Keep THIS PERSON'S recognizable facial features but make them look like a ${age}-year-old child
- Maintain the same gender characteristics as the original person
- Softer, more youthful facial features with larger eyes and rounder face
- Add small ${animalType} muzzle/snout (subtle, not pronounced)  
- Replace human ears with functional ${animalType} ears
- Maintain human-like eye placement and expression with childlike characteristics
- Friendly, caring expression that invites nurturing

BODY (child proportions):
- Child body proportions - smaller and more petite than adult with larger head relative to body
- Body shape should reflect the same gender as the person in the photo
- Mostly human torso with subtle ${animalType} modifications
- Slight digitigrade leg stance (hint of animal posture)
- Paw-like hands and feet with visible paw pads
- Patchy fur coverage on forearms, lower legs, and cheeks
- Full expressive ${animalType} tail that's anatomically integrated

COLORING & STYLE:
- ${animalType} fur colors and basic markings where fur appears
- Human skin tone on non-furred areas  
- Bright, vibrant cartoon colors with simple shading
- Design should evoke care and nurturing - this is a companion that needs daily attention
- Include subtle magical elements that suggest growth potential through care

The result should be a balanced semi-furry child character - clearly THIS PERSON as a ${age}-year-old of the same gender but with integrated ${animalType} features that feel natural and invite caring interaction.`;
}

function createSimpleBananimonPrompt(animalType, age) {
    return `Create a full-body semi-furry anthropomorphic ${animalType} character of THIS SPECIFIC PERSON from Image A as a ${age}-year-old child.

Style: Cel-shaded cartoon with bold colors, clean outlines, and balanced anthro design.

Critical Requirements:
- Transform THIS PERSON into a ${age}-year-old semi-furry ${animalType} while keeping their face clearly recognizable
- Show full body (head to feet) in upright bipedal standing pose
- MUST preserve THIS PERSON'S unique facial features, eye shape, eye color, and bone structure but make them look younger
- MUST maintain the same gender as the person in the photo - analyze the person's gender and keep it consistent in the character

FACE/HEAD (${age}-year-old version):
- Keep THIS PERSON'S recognizable facial features but make them look like a ${age}-year-old child
- Maintain the same gender characteristics as the original person (masculine or feminine features)
- Softer, more youthful facial features with larger eyes and rounder face
- Add small ${animalType} muzzle/snout (subtle, not pronounced)
- Replace human ears with functional ${animalType} ears
- Maintain human-like eye placement and expression but with childlike characteristics

BODY (child proportions):
- Child body proportions - smaller and more petite than adult with larger head relative to body
- Body shape should reflect the same gender as the person in the photo
- Mostly human torso with subtle ${animalType} modifications
- Slight digitigrade leg stance (hint of animal posture)
- Paw-like hands and feet with visible paw pads
- Patchy fur coverage on forearms, lower legs, and cheeks
- Full expressive ${animalType} tail that's anatomically integrated

COLORING:
- ${animalType} fur colors and basic markings where fur appears
- Human skin tone on non-furred areas
- Bright, vibrant cartoon colors with simple shading

The result should be a balanced semi-furry child character - clearly THIS PERSON as a ${age}-year-old of the same gender but with integrated ${animalType} features that feel natural, not costume-like.`;
}

function createRegularPrompt(animalType, age) {
    return `Create a character that combines the person from Image A with ${animalType} characteristics, aged ${age} years old.

Style: Cartoon-style illustration with clean lines and bright colors.

Requirements:
- Maintain the person's recognizable facial features 
- Keep the same gender as the original person
- Age the person to ${age} years old with appropriate proportions
- Add ${animalType} elements (ears, tail, maybe paws)
- Full body standing pose
- Fun and colorful cartoon aesthetic

Make it look like a fusion between the person and the ${animalType}, suitable for a character creator or avatar system.`;
}

function getAnimalImageUrl(animalName) {
    const animalImages = {
        'Cat': 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=400&fit=crop&crop=face',
        'Dog': 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&h=400&fit=crop&crop=face',
        'Fox': 'https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=400&h=400&fit=crop&crop=face',
        'Rabbit': 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=400&h=400&fit=crop&crop=face',
        'Owl': 'https://images.unsplash.com/photo-1553264701-d138db4fd5d4?w=400&h=400&fit=crop&crop=face',
        'Panda': 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=400&h=400&fit=crop&crop=face',
        'Lion': 'https://images.unsplash.com/photo-1552410260-0fd9b577afa6?w=400&h=400&fit=crop&crop=face',
        'Tiger': 'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=400&h=400&fit=crop&crop=face',
        'Bear': 'https://images.unsplash.com/photo-1589656966895-2f33e7653819?w=400&h=400&fit=crop&crop=center',
        'Penguin': 'https://images.unsplash.com/photo-1551986782-d0169b3f8fa7?w=400&h=400&fit=crop&crop=face',
        'Elephant': 'https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=400&h=400&fit=crop&crop=face',
        'Monkey': 'https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?w=400&h=400&fit=crop&crop=face'
    };
    
    return animalImages[animalName] || animalImages['Cat'];
}

async function performCareAction(bananimon, action, performance = 0.7) {
    const actionEffects = {
        feed: {
            statChanges: { hunger: 15 },
            bondGain: performance > 0.8 ? 0.3 : (performance > 0.5 ? 0.1 : 0.05),
            message: performance > 0.8 ? 'Perfect feeding! +15 Hunger' : 'Fed! +15 Hunger'
        },
        groom: {
            statChanges: { cleanliness: 15 },
            bondGain: performance > 0.8 ? 0.3 : (performance > 0.5 ? 0.1 : 0.05),
            message: performance > 0.8 ? 'Perfectly groomed! +15 Clean' : 'Groomed! +15 Clean'
        },
        train: {
            statChanges: { mood: 3 },
            focusGain: 1,
            bondGain: performance > 0.8 ? 0.3 : (performance > 0.5 ? 0.1 : 0.05),
            message: performance > 0.8 ? 'Great training! +3 Mood, +1 Focus' : 'Trained! +3 Mood, +1 Focus'
        }
    };

    const effect = actionEffects[action];
    if (!effect) {
        throw new Error('Invalid care action');
    }

    // Apply stat changes
    if (effect.statChanges) {
        await Bananimon.updateStats(bananimon.id, effect.statChanges);
    }

    // Apply bond gain
    if (effect.bondGain > 0) {
        await Bananimon.updateBond(bananimon.id, effect.bondGain);
    }

    // Update care streak
    await Bananimon.updateCareStreak(bananimon.id, true);

    // Log the activity
    await db.run(
        'INSERT INTO care_activities (bananimon_id, activity_type, performance_score, bond_gained) VALUES (?, ?, ?, ?)',
        [bananimon.id, action, performance, effect.bondGain]
    );

    // Check for evolution
    const evolutionResult = await Bananimon.checkEvolution(bananimon.id);
    
    return {
        success: true,
        message: effect.message,
        bananimon: evolutionResult.bananimon,
        evolved: evolutionResult.evolved,
        newStage: evolutionResult.evolved ? evolutionResult.newStage : null
    };
}

function generateDailyQuests(bananimon, careNeededToday) {
    const quests = [];
    
    if (careNeededToday) {
        quests.push({
            id: 'daily_care',
            type: 'care',
            description: 'Complete daily ritual (Feed • Groom • Train)',
            progress: 0,
            target: 3,
            reward: 'Bond +2'
        });
    }
    
    quests.push({
        id: 'training_practice',
        type: 'training', 
        description: 'Practice timing training 3 times',
        progress: 0,
        target: 3,
        reward: 'Focus +1'
    });

    if (bananimon.evolution_stage > 0) {
        quests.push({
            id: 'battle_ready',
            type: 'battle',
            description: 'Win 1 practice bout',
            progress: 0,
            target: 1,
            reward: 'Bond +1'
        });
    }
    
    return quests;
}

// Route handlers
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'onboarding.html'));
});

app.get('/home', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'home.html'));
});

app.get('/legacy', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Hourly decay cron job
cron.schedule('0 * * * *', async () => {
    try {
        console.log('🕐 Running hourly decay process...');
        
        const allBananimon = await db.all('SELECT id FROM bananimon');
        
        for (const { id } of allBananimon) {
            await Bananimon.applyDecay(id);
        }
        
        console.log(`✅ Applied decay to ${allBananimon.length} Bananimon`);
    } catch (error) {
        console.error('❌ Error in decay cron job:', error);
    }
});

// Streak cleanup cron job (daily at midnight)
cron.schedule('0 0 * * *', async () => {
    try {
        console.log('🌙 Running daily streak check...');
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const inactiveBananimon = await db.all(
            'SELECT id FROM bananimon WHERE last_care_at < ?',
            [yesterday.toISOString()]
        );
        
        for (const { id } of inactiveBananimon) {
            await Bananimon.updateCareStreak(id, false); // Break streak
        }
        
        console.log(`✅ Updated streaks for ${inactiveBananimon.length} inactive Bananimon`);
    } catch (error) {
        console.error('❌ Error in streak cleanup:', error);
    }
});

// Initialize and start server
initializeServer().then(() => {
    app.listen(PORT, () => {
        console.log(`🍌 Bananimon server running at http://localhost:${PORT}`);
        console.log('Make sure to set your GEMINI_API_KEY in .env file');
    });
});