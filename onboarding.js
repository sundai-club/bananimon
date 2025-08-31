class BananimonOnboarding {
    constructor() {
        this.currentScreen = 'splash';
        this.userData = {
            age: null,
            consent: false,
            userId: null,
            email: null,
            selfieData: null,
            selectedAnimal: null,
            selectedPreview: null,
            selectedPreviewIndex: 0,
            name: '',
            temperament: 'Calm'
        };
        
        this.animals = [
            { name: 'Cat', image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&h=200&fit=crop&crop=face', description: 'Playful feline' },
            { name: 'Dog', image: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=200&h=200&fit=crop&crop=face', description: 'Loyal companion' },
            { name: 'Fox', image: 'https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=200&h=200&fit=crop&crop=face', description: 'Clever critter' },
            { name: 'Rabbit', image: 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=200&h=200&fit=crop&crop=face', description: 'Fluffy hopper' },
            { name: 'Owl', image: 'https://images.unsplash.com/photo-1553264701-d138db4fd5d4?w=200&h=200&fit=crop&crop=face', description: 'Wise watcher' },
            { name: 'Panda', image: 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=200&h=200&fit=crop&crop=face', description: 'Bamboo lover' },
            { name: 'Lion', image: 'https://images.unsplash.com/photo-1552410260-0fd9b577afa6?w=200&h=200&fit=crop&crop=face', description: 'Brave heart' },
            { name: 'Tiger', image: 'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=200&h=200&fit=crop&crop=face', description: 'Striped beauty' },
            { name: 'Bear', image: 'https://images.unsplash.com/photo-1589656966895-2f33e7653819?w=200&h=200&fit=crop&crop=center', description: 'Cuddly giant' },
            { name: 'Penguin', image: 'https://images.unsplash.com/photo-1551986782-d0169b3f8fa7?w=200&h=200&fit=crop&crop=face', description: 'Tuxedo dancer' },
            { name: 'Elephant', image: 'https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=200&h=200&fit=crop&crop=face', description: 'Gentle giant' },
            { name: 'Monkey', image: 'https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?w=200&h=200&fit=crop&crop=face', description: 'Playful primate' }
        ];
        
        this.namesSuggestions = [
            'Sunny', 'Luna', 'Pixel', 'Dash', 'Nova', 'Echo', 'Zen', 'Spark',
            'Willow', 'Storm', 'Sage', 'River', 'Phoenix', 'Atlas', 'Iris', 'Cosmo'
        ];
        
        this.camera = null;
        this.stream = null;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.createAnimalGrid();
    }

    bindEvents() {
        // Splash screen
        document.getElementById('beginBtn').addEventListener('click', () => this.goToScreen('ageGate'));
        document.getElementById('privacyLink').addEventListener('click', () => this.showPrivacyInfo());

        // Age gate
        document.getElementById('over13Btn').addEventListener('click', () => this.setAge('over13'));
        document.getElementById('under13Btn').addEventListener('click', () => this.setAge('under13'));

        // Consent
        document.getElementById('agreeCheckbox').addEventListener('change', (e) => this.toggleConsent(e.target.checked));
        document.getElementById('continueBtn').addEventListener('click', () => this.goToScreen('fastAccount'));
        document.getElementById('learnMoreLink').addEventListener('click', () => this.showPrivacyInfo());

        // Fast account
        document.getElementById('createAnonymousBtn').addEventListener('click', () => this.createAccount(false));
        document.getElementById('linkEmailBtn').addEventListener('click', () => this.goToScreen('emailLink'));

        // Email link
        document.getElementById('saveEmailBtn').addEventListener('click', () => this.saveEmail());
        document.getElementById('skipEmailBtn').addEventListener('click', () => this.createAccount(false));

        // Selfie capture
        document.getElementById('startCameraBtn').addEventListener('click', () => this.startCamera());
        document.getElementById('captureBtn').addEventListener('click', () => this.capturePhoto());
        document.getElementById('retakeBtn').addEventListener('click', () => this.retakePhoto());

        // Banana fusion
        document.getElementById('remixBtn').addEventListener('click', () => this.remixPreviews());

        // Name & temperament
        document.getElementById('nameInput').addEventListener('input', (e) => this.updateName(e.target.value));
        document.getElementById('diceBtn').addEventListener('click', () => this.suggestRandomName());
        document.getElementById('confirmCreationBtn').addEventListener('click', () => this.createBananimon());

        // Temperament selector
        document.querySelectorAll('.temperament-option').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectTemperament(e.currentTarget.dataset.temperament));
        });

        // Final step
        document.getElementById('startCaringBtn').addEventListener('click', () => this.goToHome());
    }

    goToScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.onboarding-screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Show target screen
        document.getElementById(screenName).classList.add('active');
        this.currentScreen = screenName;

        // Special handling for certain screens
        if (screenName === 'animalSelection') {
            this.focusAnimalGrid();
        } else if (screenName === 'bananaFusion') {
            this.startFusion();
        }
    }

    setAge(age) {
        if (age === 'under13') {
            this.goToScreen('under13Exit');
            return;
        }
        this.userData.age = 'over13';
        this.goToScreen('consent');
    }

    toggleConsent(checked) {
        this.userData.consent = checked;
        document.getElementById('continueBtn').disabled = !checked;
    }

    async createAccount(withEmail = false) {
        try {
            this.showLoading('Setting up your account...');
            
            const response = await fetch('/api/user/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: withEmail ? this.userData.email : null
                })
            });
            
            const result = await response.json();
            this.userData.userId = result.userId;
            
            this.hideLoading();
            this.goToScreen('selfieCapture');
        } catch (error) {
            console.error('Error creating account:', error);
            this.hideLoading();
            alert('Failed to create account. Please try again.');
        }
    }

    async saveEmail() {
        const email = document.getElementById('emailInput').value;
        if (!email || !email.includes('@')) {
            alert('Please enter a valid email address');
            return;
        }
        this.userData.email = email;
        await this.createAccount(true);
    }

    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'user' } 
            });
            
            this.camera = document.getElementById('camera');
            this.camera.srcObject = this.stream;
            this.camera.style.display = 'block';
            
            document.getElementById('startCameraBtn').style.display = 'none';
            document.getElementById('captureBtn').style.display = 'inline-block';
        } catch (error) {
            console.error('Camera access error:', error);
            alert('Unable to access camera. Please ensure you have granted camera permissions.');
        }
    }

    capturePhoto() {
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = this.camera.videoWidth;
        canvas.height = this.camera.videoHeight;
        ctx.drawImage(this.camera, 0, 0);
        
        this.userData.selfieData = canvas.toDataURL('image/jpeg');
        document.getElementById('selfiePreview').src = this.userData.selfieData;
        
        this.camera.style.display = 'none';
        document.getElementById('capturedPhoto').style.display = 'block';
        document.getElementById('captureBtn').style.display = 'none';
        document.getElementById('retakeBtn').style.display = 'inline-block';
        
        this.stopCamera();
        
        // Auto-advance after successful capture
        setTimeout(() => this.goToScreen('animalSelection'), 1500);
    }

    retakePhoto() {
        document.getElementById('capturedPhoto').style.display = 'none';
        document.getElementById('retakeBtn').style.display = 'none';
        this.userData.selfieData = null;
        this.startCamera();
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
    }

    createAnimalGrid() {
        const grid = document.getElementById('animalGrid');
        
        this.animals.forEach((animal, index) => {
            const card = document.createElement('div');
            card.className = 'animal-card';
            card.innerHTML = `
                <img src="${animal.image}" alt="${animal.name}" class="animal-image" />
                <div class="animal-info">
                    <div class="animal-name">${animal.name}</div>
                    <div class="animal-description">${animal.description}</div>
                </div>
            `;
            card.addEventListener('click', () => this.selectAnimal(animal, card));
            grid.appendChild(card);
        });
    }

    selectAnimal(animal, cardElement) {
        document.querySelectorAll('.animal-card').forEach(card => {
            card.classList.remove('selected');
        });
        cardElement.classList.add('selected');
        this.userData.selectedAnimal = animal;
        
        // Auto-advance after selection
        setTimeout(() => this.goToScreen('bananaFusion'), 800);
    }

    async startFusion() {
        if (!this.userData.selfieData || !this.userData.selectedAnimal) {
            console.error('Missing selfie or animal data');
            return;
        }

        try {
            this.showFusionProgress();
            
            const response = await fetch('/api/generate-bananimon', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userImage: this.userData.selfieData,
                    selectedAnimal: this.userData.selectedAnimal,
                    selectedAge: 10 // Default young age for onboarding
                })
            });

            const result = await response.json();
            this.displayPreviews(result.generatedImages);
        } catch (error) {
            console.error('Error generating previews:', error);
            alert('Failed to generate previews. Please try again.');
        }
    }

    showFusionProgress() {
        const progress = document.getElementById('fusionProgress');
        const dots = progress.querySelectorAll('.dot');
        let currentDot = 0;
        
        const interval = setInterval(() => {
            dots[currentDot].classList.remove('active');
            currentDot = (currentDot + 1) % dots.length;
            dots[currentDot].classList.add('active');
        }, 500);
        
        // Store interval to clear it later
        this.fusionInterval = interval;
    }

    displayPreviews(images) {
        clearInterval(this.fusionInterval);
        
        const progress = document.getElementById('fusionProgress');
        const grid = document.getElementById('previewGrid');
        
        progress.style.display = 'none';
        grid.style.display = 'grid';
        
        grid.innerHTML = '';
        
        images.forEach((imageSrc, index) => {
            const card = document.createElement('div');
            card.className = 'preview-card';
            card.innerHTML = `
                <img src="${imageSrc}" alt="Preview ${index + 1}" class="preview-image">
                <div class="style-tag">${this.getStyleTag(index)}</div>
            `;
            card.addEventListener('click', () => this.selectPreview(imageSrc, index, card));
            grid.appendChild(card);
        });
        
        document.getElementById('remixBtn').style.display = 'inline-block';
    }

    getStyleTag(index) {
        const tags = ['Bold', 'Sleek', 'Whimsical', 'Classic'];
        return tags[index] || 'Unique';
    }

    selectPreview(imageSrc, index, cardElement) {
        document.querySelectorAll('.preview-card').forEach(card => {
            card.classList.remove('selected');
        });
        cardElement.classList.add('selected');
        
        this.userData.selectedPreview = imageSrc;
        this.userData.selectedPreviewIndex = index;
        
        // Auto-advance after selection
        setTimeout(() => this.goToScreen('nameTemperament'), 800);
    }

    async remixPreviews() {
        // Re-run the fusion process
        await this.startFusion();
    }

    updateName(name) {
        this.userData.name = name;
        document.getElementById('confirmCreationBtn').disabled = !name.trim();
    }

    suggestRandomName() {
        const randomName = this.namesSuggestions[Math.floor(Math.random() * this.namesSuggestions.length)];
        document.getElementById('nameInput').value = randomName;
        this.updateName(randomName);
    }

    selectTemperament(temperament) {
        document.querySelectorAll('.temperament-option').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.querySelector(`[data-temperament="${temperament}"]`).classList.add('selected');
        this.userData.temperament = temperament;
    }

    async createBananimon() {
        if (!this.userData.name.trim()) {
            alert('Please enter a name for your Bananimon');
            return;
        }

        try {
            this.showLoading('Creating your Bananimon...');
            
            const response = await fetch('/api/bananimon/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userData.userId,
                    name: this.userData.name.trim(),
                    animalType: this.userData.selectedAnimal.name,
                    temperament: this.userData.temperament,
                    imageUrls: [this.userData.selectedPreview], // For now, just the selected one
                    selectedImageIndex: 0
                })
            });

            const result = await response.json();
            
            this.hideLoading();
            this.showCreationSuccess(result.bananimon);
        } catch (error) {
            console.error('Error creating Bananimon:', error);
            this.hideLoading();
            alert('Failed to create your Bananimon. Please try again.');
        }
    }

    showCreationSuccess(bananimon) {
        document.getElementById('welcomeMessage').textContent = `Welcome, ${bananimon.name}!`;
        document.getElementById('yourBananimon').innerHTML = `
            <img src="${this.userData.selectedPreview}" alt="${bananimon.name}" class="final-bananimon">
            <div class="bananimon-info">
                <div class="name">${bananimon.name}</div>
                <div class="type">${bananimon.temperament} ${bananimon.animal_type}</div>
            </div>
        `;
        
        this.goToScreen('creationSuccess');
        this.triggerConfetti();
    }

    triggerConfetti() {
        // Simple confetti animation
        const confetti = document.querySelector('.confetti');
        confetti.style.animation = 'confetti 2s ease-out';
        
        setTimeout(() => {
            confetti.style.animation = '';
        }, 2000);
    }

    goToHome() {
        // Redirect to main game
        window.location.href = '/home';
    }

    showLoading(text) {
        document.getElementById('loadingText').textContent = text;
        document.getElementById('loadingOverlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    showPrivacyInfo() {
        alert('Privacy Policy:\n\n• We only use your selfie to generate your Bananimon\n• Your original photo is deleted immediately after processing\n• No personal data is shared with third parties\n• You can delete your account at any time');
    }

    focusAnimalGrid() {
        // Add search functionality
        const searchInput = document.getElementById('animalSearch');
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            document.querySelectorAll('.animal-card').forEach(card => {
                const animalName = card.querySelector('.animal-name').textContent.toLowerCase();
                const animalDesc = card.querySelector('.animal-description').textContent.toLowerCase();
                const matches = animalName.includes(query) || animalDesc.includes(query);
                card.style.display = matches ? 'block' : 'none';
            });
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new BananimonOnboarding();
});