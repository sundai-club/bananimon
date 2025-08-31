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
        
        const prompt = `Fuse subject from Image A (the human selfie) with animal traits from Image B (${selectedAnimal.name.toLowerCase()}). Output non-photorealistic, cel-shaded render with large readable silhouette, game-ready crop, no logos/IP, consistent likeness, bold color blocks.

Create a stylized cartoon pet character that combines:
- The facial structure, features, and likeness of the person from Image A
- Key animal characteristics from the ${selectedAnimal.name.toLowerCase()} in Image B
- Make it look like a cute, baby/toddler version of the person as a ${selectedAnimal.name.toLowerCase()}

Visual style requirements:
- Cel-shaded, non-photorealistic cartoon rendering
- Bold, flat color blocks with clean edges
- Large, clear silhouette that reads well at small sizes
- Game-ready character design aesthetic
- Bright, saturated colors
- Simple but expressive features

Character design:
- Maintain the person's core facial features and eye color
- Add prominent ${selectedAnimal.name.toLowerCase()} traits (ears, nose, markings, fur patterns)
- Cute, chibi-style proportions (large head, small body)
- Expressive, friendly cartoon eyes
- No realistic textures - use flat cartoon shading
- Clean, simple design suitable for mobile games

The result should be a charming cartoon pet character that clearly resembles the person but as a stylized ${selectedAnimal.name.toLowerCase()}.`;

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
        
        // Debug: Log the full response structure
        console.log('=== GEMINI RESPONSE DEBUG ===');
        console.log('Response structure:', JSON.stringify({
            candidates: response.candidates?.length || 0,
            hasContent: response.candidates?.[0]?.content ? true : false,
            partsCount: response.candidates?.[0]?.content?.parts?.length || 0,
            parts: response.candidates?.[0]?.content?.parts?.map(part => Object.keys(part)) || []
        }, null, 2));
        
        // Extract the generated image from the response
        if (response.candidates && response.candidates[0] && response.candidates[0].content) {
            const parts = response.candidates[0].content.parts;
            
            // Debug: Log what's actually in the parts
            console.log('=== RESPONSE PARTS DEBUG ===');
            parts.forEach((part, index) => {
                console.log(`Part ${index}:`, {
                    hasText: !!part.text,
                    textPreview: part.text ? part.text.substring(0, 100) + '...' : null,
                    hasInlineData: !!part.inlineData,
                    inlineDataType: part.inlineData?.mimeType || null
                });
            });
            
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