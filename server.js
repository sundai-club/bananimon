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
        
        const prompt = `Create a photorealistic baby version of the person in the first image with very subtle ${selectedAnimal.name.toLowerCase()} features mixed in. The result should look 90% human and only 10% animal.

The result should be:
- STRONGLY maintain the person's facial structure, bone structure, eye shape, eye color, hair color, and overall human appearance
- Make them look like a baby/toddler version of themselves (younger, cuter, more innocent)
- Add only MINIMAL and SUBTLE ${selectedAnimal.name.toLowerCase()} features: slightly pointed ears, very subtle nose changes, or soft fur-like hair texture
- Keep normal human skin tone and texture - no full fur coverage
- Maintain completely human hands, human body proportions
- NO tail, NO animal muzzle, NO dramatic animal transformations
- Photorealistic style like a high-quality baby photograph
- Soft, natural lighting with realistic skin tones and textures
- Should look like this person as a real baby with just tiny adorable animal touches

The goal is to make it look like this specific person as a real baby with barely noticeable ${selectedAnimal.name.toLowerCase()} characteristics - not a cartoon or fantasy creature.`;

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

        const result = await model.generateContent([prompt, ...imageParts]);
        const response = await result.response;
        
        // Extract the generated image from the response
        if (response.candidates && response.candidates[0] && response.candidates[0].content) {
            const parts = response.candidates[0].content.parts;
            
            // Find the image part in the response
            const imagePart = parts.find(part => part.inlineData && part.inlineData.mimeType.startsWith('image/'));
            
            if (imagePart && imagePart.inlineData && imagePart.inlineData.data) {
                const generatedImage = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                
                console.log('✅ Successfully generated pet crossbreed image');
                
                res.json({ 
                    generatedImage,
                    prompt
                });
            } else {
                throw new Error('No image data found in Gemini response');
            }
        } else {
            throw new Error('Invalid response format from Gemini');
        }
        
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
        'Pig': 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=400&h=400&fit=crop&crop=face'
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