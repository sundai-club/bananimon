const express = require('express');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/generate-pet', async (req, res) => {
    try {
        const { userImage, selectedAnimal } = req.body;
        
        if (!userImage || !selectedAnimal) {
            return res.status(400).json({ error: 'Missing required data' });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image-preview' });
        
        const userImageData = userImage.split(',')[1];
        
        // Get the animal image URL and convert to base64
        const animalImageUrl = getAnimalImageUrl(selectedAnimal.name);
        const animalImageResponse = await fetch(animalImageUrl);
        const animalImageBuffer = await animalImageResponse.arrayBuffer();
        const animalImageBase64 = Buffer.from(animalImageBuffer).toString('base64');
        
        const prompt = `Create a cartoon version of the human from Image A with very subtle ${selectedAnimal.name.toLowerCase()} characteristics from Image B. Output non-photorealistic, cel-shaded render with large readable silhouette, game-ready crop, no logos/IP, consistent likeness, bold color blocks.

IMPORTANT: This should be 95% human, 5% animal - the person should be clearly recognizable as themselves.

Character design:
- MAINTAIN the exact facial structure, features, and likeness of the person from Image A
- Keep their human skin tone, eye color, hair color, and facial proportions
- Add only MINIMAL ${selectedAnimal.name.toLowerCase()} features: subtle ear shape changes, small nose adjustments, or minor markings
- Make them look like a cute, younger cartoon version of themselves
- Keep completely human body proportions and limbs

Visual style requirements:
- Cel-shaded, cartoon anime/manga style rendering
- Bold, flat color blocks with clean outlines
- Large, clear silhouette that reads well at small sizes
- Bright, vibrant colors with good contrast
- Clean, simple shading without complex textures
- Game character/avatar aesthetic

Subtle animal touches only:
- Maybe slightly pointed ear tips (not full animal ears)
- Small whisker marks or gentle facial markings
- Minor color accent from the ${selectedAnimal.name.toLowerCase()} (like hair highlights)
- Keep it so subtle that they still look like the same person

The result should look like the person from the photo as a cute cartoon character with barely noticeable ${selectedAnimal.name.toLowerCase()} touches - they should be immediately recognizable as themselves.`;

        // Log the prompt to console
        console.log('=== GENERATION PROMPT ===');
        console.log(prompt);
        console.log(`=== GENERATING CROSSBREED: Human + ${selectedAnimal.name} ===`);

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

        // Generate 4 images in parallel
        console.log('🎨 Starting generation of 4 variants...');
        const generationPromises = Array(4).fill().map(async (_, index) => {
            try {
                console.log(`🎨 Starting generation ${index + 1}/4...`);
                const result = await model.generateContent([prompt, ...imageParts]);
                const response = await result.response;
                
                // Extract the generated image from the response
                if (response.candidates && response.candidates[0] && response.candidates[0].content) {
                    const parts = response.candidates[0].content.parts;
                    
                    // Find the image part in the response
                    const imagePart = parts.find(part => part.inlineData && part.inlineData.mimeType.startsWith('image/'));
                    
                    if (imagePart && imagePart.inlineData && imagePart.inlineData.data) {
                        const generatedImage = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                        console.log(`✅ Successfully generated image ${index + 1}/4`);
                        return generatedImage;
                    } else {
                        console.log(`❌ No image data in response ${index + 1}/4`);
                        return null;
                    }
                } else {
                    console.log(`❌ Invalid response format for generation ${index + 1}/4`);
                    return null;
                }
            } catch (error) {
                console.error(`❌ Error in generation ${index + 1}/4:`, error.message);
                return null;
            }
        });

        const generatedImages = await Promise.all(generationPromises);
        const validImages = generatedImages.filter(img => img !== null);
        
        if (validImages.length === 0) {
            throw new Error('Failed to generate any images');
        }
        
        console.log(`✅ Successfully generated ${validImages.length}/4 images`);
        
        res.json({ 
            generatedImages: validImages,
            prompt,
            totalGenerated: validImages.length
        });
        
    } catch (error) {
        console.error('❌ Error generating pet:', error);
        res.status(500).json({ 
            error: 'Failed to generate pet',
            details: error.message 
        });
    }
});

function getAnimalImageUrl(animalName) {
    const animalImages = {
        'Cat': 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=400&fit=crop&crop=face',
        'Dog': 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&h=400&fit=crop&crop=face',
        'Rabbit': 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=400&h=400&fit=crop&crop=face',
        'Hamster': 'https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=400&h=400&fit=crop&crop=face',
        'Bird': 'https://images.unsplash.com/photo-1452570053594-1b985d6ea890?w=400&h=400&fit=crop&crop=center',
        'Fish': 'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?w=400&h=400&fit=crop&crop=face',
        'Turtle': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=400&fit=crop&crop=center',
        'Frog': 'https://images.unsplash.com/photo-1459262838948-3e2de6c1ec80?w=400&h=400&fit=crop&crop=face',
        'Fox': 'https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=400&h=400&fit=crop&crop=face',
        'Panda': 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=400&h=400&fit=crop&crop=face',
        'Koala': 'https://images.unsplash.com/photo-1459262838948-3e2de6c1ec80?w=400&h=400&fit=crop&crop=face',
        'Monkey': 'https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?w=400&h=400&fit=crop&crop=face',
        'Lion': 'https://images.unsplash.com/photo-1552410260-0fd9b577afa6?w=400&h=400&fit=crop&crop=face',
        'Tiger': 'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=400&h=400&fit=crop&crop=face',
        'Bear': 'https://images.unsplash.com/photo-1589656966895-2f33e7653819?w=400&h=400&fit=crop&crop=center',
        'Pig': 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=400&h=400&fit=crop&crop=face',
        'Elephant': 'https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=400&h=400&fit=crop&crop=face',
        'Banana': 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=400&fit=crop&crop=center',
        'Octopus': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=400&fit=crop&crop=center',
        'Penguin': 'https://images.unsplash.com/photo-1551986782-d0169b3f8fa7?w=400&h=400&fit=crop&crop=face'
    };
    
    return animalImages[animalName] || animalImages['Cat'];
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Make sure to set your GEMINI_API_KEY in .env file');
});