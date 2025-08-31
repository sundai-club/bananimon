class PetGenerator {
    constructor() {
        this.camera = document.getElementById('camera');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.startCameraBtn = document.getElementById('startCamera');
        this.captureBtn = document.getElementById('capturePhoto');
        this.retakeBtn = document.getElementById('retakePhoto');
        this.selfiePreview = document.getElementById('selfiePreview');
        this.capturedPhoto = document.getElementById('capturedPhoto');
        this.animalGrid = document.getElementById('animalGrid');
        this.generateBtn = document.getElementById('generatePet');
        this.loading = document.getElementById('loading');
        this.resultSection = document.getElementById('resultSection');
        this.resultGrid = document.getElementById('resultGrid');
        this.generateAnotherBtn = document.getElementById('generateAnother');

        this.stream = null;
        this.capturedImageData = null;
        this.selectedAnimal = null;

        this.animals = [
            { name: 'Cat', image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&h=200&fit=crop&crop=face', description: 'Playful feline' },
            { name: 'Dog', image: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=200&h=200&fit=crop&crop=face', description: 'Loyal companion' },
            { name: 'Rabbit', image: 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=200&h=200&fit=crop&crop=face', description: 'Fluffy hopper' },
            { name: 'Hamster', image: 'https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=200&h=200&fit=crop&crop=face', description: 'Tiny explorer' },
            { name: 'Bird', image: 'https://images.unsplash.com/photo-1452570053594-1b985d6ea890?w=200&h=200&fit=crop&crop=center', description: 'Chirpy friend' },
            { name: 'Fish', image: 'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?w=200&h=200&fit=crop&crop=face', description: 'Swimming buddy' },
            { name: 'Turtle', image: 'https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=200&h=200&fit=crop&crop=center', description: 'Wise crawler' },
            { name: 'Snake', image: 'https://plus.unsplash.com/premium_photo-1667162417224-b6416612d736?w=200&h=200&fit=crop&crop=center', description: 'Slithery friend' },
            { name: 'Fox', image: 'https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=200&h=200&fit=crop&crop=face', description: 'Clever critter' },
            { name: 'Panda', image: 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=200&h=200&fit=crop&crop=face', description: 'Bamboo lover' },
            { name: 'Koala', image: 'https://images.unsplash.com/photo-1459262838948-3e2de6c1ec80?w=200&h=200&fit=crop&crop=face', description: 'Tree hugger' },
            { name: 'Monkey', image: 'https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?w=200&h=200&fit=crop&crop=face', description: 'Playful primate' },
            { name: 'Lion', image: 'https://images.unsplash.com/photo-1552410260-0fd9b577afa6?w=200&h=200&fit=crop&crop=face', description: 'Brave heart' },
            { name: 'Tiger', image: 'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=200&h=200&fit=crop&crop=face', description: 'Striped beauty' },
            { name: 'Bear', image: 'https://images.unsplash.com/photo-1589656966895-2f33e7653819?w=200&h=200&fit=crop&crop=center', description: 'Cuddly giant' },
            { name: 'Pig', image: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=200&h=200&fit=crop&crop=face', description: 'Happy oinkster' },
            { name: 'Elephant', image: 'https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=200&h=200&fit=crop&crop=face', description: 'Gentle giant' },
            { name: 'Banana', image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=200&h=200&fit=crop&crop=center', description: 'Yellow friend' },
            { name: 'Owl', image: 'https://images.unsplash.com/photo-1553264701-d138db4fd5d4?w=200&h=200&fit=crop&crop=face', description: 'Wise watcher' },
            { name: 'Penguin', image: 'https://images.unsplash.com/photo-1551986782-d0169b3f8fa7?w=200&h=200&fit=crop&crop=face', description: 'Tuxedo dancer' }
        ];

        this.init();
    }

    init() {
        this.createAnimalGrid();
        this.bindEvents();
    }

    createAnimalGrid() {
        this.animals.forEach((animal, index) => {
            const animalCard = document.createElement('div');
            animalCard.className = 'animal-card';
            animalCard.dataset.animal = animal.name;
            animalCard.innerHTML = `
                <img src="${animal.image}" alt="${animal.name}" class="animal-image" />
                <div class="animal-name">${animal.name}</div>
            `;
            animalCard.addEventListener('click', () => this.selectAnimal(animal, animalCard));
            this.animalGrid.appendChild(animalCard);
        });
    }

    bindEvents() {
        this.startCameraBtn.addEventListener('click', () => this.startCamera());
        this.captureBtn.addEventListener('click', () => this.capturePhoto());
        this.retakeBtn.addEventListener('click', () => this.retakePhoto());
        this.generateBtn.addEventListener('click', () => this.generatePet());
        this.generateAnotherBtn.addEventListener('click', () => this.reset());
    }

    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'user' } 
            });
            this.camera.srcObject = this.stream;
            this.camera.style.display = 'block';
            this.startCameraBtn.style.display = 'none';
            this.captureBtn.style.display = 'inline-block';
        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Unable to access camera. Please ensure you have granted camera permissions.');
        }
    }

    capturePhoto() {
        this.canvas.width = this.camera.videoWidth;
        this.canvas.height = this.camera.videoHeight;
        this.ctx.drawImage(this.camera, 0, 0);
        
        this.capturedImageData = this.canvas.toDataURL('image/jpeg');
        this.selfiePreview.src = this.capturedImageData;
        
        this.camera.style.display = 'none';
        this.capturedPhoto.style.display = 'block';
        this.captureBtn.style.display = 'none';
        this.retakeBtn.style.display = 'inline-block';
        
        this.stopCamera();
        this.checkIfReadyToGenerate();
    }

    retakePhoto() {
        this.capturedPhoto.style.display = 'none';
        this.retakeBtn.style.display = 'none';
        this.capturedImageData = null;
        this.generateBtn.style.display = 'none';
        this.startCamera();
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
    }

    selectAnimal(animal, cardElement) {
        document.querySelectorAll('.animal-card').forEach(card => {
            card.classList.remove('selected');
        });
        cardElement.classList.add('selected');
        this.selectedAnimal = animal;
        this.checkIfReadyToGenerate();
    }

    checkIfReadyToGenerate() {
        if (this.capturedImageData && this.selectedAnimal) {
            this.generateBtn.style.display = 'inline-block';
        }
    }

    async generatePet() {
        this.generateBtn.style.display = 'none';
        this.loading.style.display = 'block';

        try {
            const response = await fetch('/generate-pet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userImage: this.capturedImageData,
                    selectedAnimal: this.selectedAnimal
                })
            });

            if (!response.ok) {
                throw new Error('Failed to generate pet');
            }

            const result = await response.json();
            
            this.loading.style.display = 'none';
            
            // Display multiple images in a grid for selection
            this.displayImageGrid(result.generatedImages);
            this.resultSection.style.display = 'block';
            
            // Keep camera section and animal section visible, just hide the generate button
            document.querySelector('.generate-section').style.display = 'none';

        } catch (error) {
            console.error('Error generating pet:', error);
            this.loading.style.display = 'none';
            this.generateBtn.style.display = 'inline-block';
            alert('Failed to generate pet. Please try again.');
        }
    }

    displayImageGrid(images) {
        this.resultGrid.innerHTML = '';
        
        images.forEach((imageSrc, index) => {
            const imageCard = document.createElement('div');
            imageCard.className = 'result-card';
            imageCard.innerHTML = `
                <img src="${imageSrc}" alt="Generated pet ${index + 1}" class="result-option">
            `;
            this.resultGrid.appendChild(imageCard);
        });
    }

    reset() {
        this.capturedImageData = null;
        this.selectedAnimal = null;
        
        // Reset to initial state - camera section, animal section, and generate section visible
        document.querySelector('.camera-section').style.display = 'block';
        document.querySelector('.animal-section').style.display = 'block';
        document.querySelector('.generate-section').style.display = 'block';
        this.resultSection.style.display = 'none';
        
        // Reset result grid
        this.resultGrid.innerHTML = '';
        
        this.capturedPhoto.style.display = 'none';
        this.startCameraBtn.style.display = 'inline-block';
        this.retakeBtn.style.display = 'none';
        this.captureBtn.style.display = 'none';
        this.generateBtn.style.display = 'none';
        
        document.querySelectorAll('.animal-card').forEach(card => {
            card.classList.remove('selected');
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PetGenerator();
});