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
        
        const prompt = `Create a full-body semi-furry anthropomorphic ${selectedAnimal.name.toLowerCase()} character of THIS SPECIFIC PERSON from Image A as a 10-year-old child.

Style: Cel-shaded cartoon with bold colors, clean outlines, and balanced anthro design.

Critical Requirements:
- Transform THIS PERSON into a 10-year-old semi-furry ${selectedAnimal.name.toLowerCase()} while keeping their face clearly recognizable
- Show full body (head to feet) in upright bipedal standing pose
- MUST preserve THIS PERSON'S unique facial features, eye shape, eye color, and bone structure but make them look younger
- MUST maintain the same gender as the person in the photo - analyze the person's gender and keep it consistent in the character

FACE/HEAD (10-year-old version):
- Keep THIS PERSON'S recognizable facial features but make them look like a 10-year-old child
- Maintain the same gender characteristics as the original person (masculine or feminine features)
- Softer, more youthful facial features with larger eyes and rounder face
- Add small ${selectedAnimal.name.toLowerCase()} muzzle/snout (subtle, not pronounced)
- Replace human ears with functional ${selectedAnimal.name.toLowerCase()} ears
- Maintain human-like eye placement and expression but with childlike characteristics

BODY (child proportions):
- Child body proportions - smaller and more petite than adult with larger head relative to body
- Body shape should reflect the same gender as the person in the photo
- Mostly human torso with subtle ${selectedAnimal.name.toLowerCase()} modifications
- Slight digitigrade leg stance (hint of animal posture)
- Paw-like hands and feet with visible paw pads
- Patchy fur coverage on forearms, lower legs, and cheeks
- Full expressive ${selectedAnimal.name.toLowerCase()} tail that's anatomically integrated

COLORING:
- ${selectedAnimal.name.toLowerCase()} fur colors and basic markings where fur appears
- Human skin tone on non-furred areas
- Bright, vibrant cartoon colors with simple shading

The result should be a balanced semi-furry child character - clearly THIS PERSON as a 10-year-old of the same gender but with integrated ${selectedAnimal.name.toLowerCase()} features that feel natural, not costume-like.`;

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
        'Turtle': 'https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=400&h=400&fit=crop&crop=center',
        'Snake': 'https://plus.unsplash.com/premium_photo-1667162417224-b6416612d736?w=400&h=400&fit=crop&crop=center',
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
        'Owl': 'https://images.unsplash.com/photo-1553264701-d138db4fd5d4?w=400&h=400&fit=crop&crop=face',
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