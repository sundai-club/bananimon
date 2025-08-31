class BananimonHome {
    constructor() {
        this.bananimon = null;
        this.dailyQuests = [];
        this.careNeededToday = true;
        this.currentCareGame = null;
        this.gameState = {};
        
        this.init();
    }

    async init() {
        try {
            this.showLoading('Loading your Bananimon...');
            await this.loadHomeData();
            this.bindEvents();
            this.hideLoading();
            this.showCoachMessage('Hi, I\'m your Keeper. Two minutes a day keeps your Bananimon thriving.');
        } catch (error) {
            console.error('Error initializing home:', error);
            this.hideLoading();
            alert('Failed to load your Bananimon. Please try again.');
        }
    }

    async loadHomeData() {
        const response = await fetch('/api/home');
        if (!response.ok) {
            if (response.status === 404) {
                // No Bananimon found, redirect to onboarding
                window.location.href = '/';
                return;
            }
            throw new Error('Failed to load home data');
        }
        
        const data = await response.json();
        this.bananimon = data.bananimon;
        this.dailyQuests = data.dailyQuests;
        this.careNeededToday = data.careNeededToday;
        this.stageInfo = data.stageInfo;
        
        this.updateUI();
    }

    updateUI() {
        this.updateBananimonDisplay();
        this.updateNeedsPanel();
        this.updateDailyRitual();
        this.updateQuests();
    }

    updateBananimonDisplay() {
        document.getElementById('bananimonName').textContent = this.bananimon.name;
        document.getElementById('temperament').textContent = this.bananimon.temperament;
        document.getElementById('animalType').textContent = this.bananimon.animal_type;
        document.getElementById('bondValue').textContent = this.bananimon.bond;
        
        // Set Bananimon image
        let imageUrls = [];
        if (this.bananimon.image_urls) {
            try {
                // Try to parse as JSON array first
                imageUrls = JSON.parse(this.bananimon.image_urls);
            } catch (e) {
                // If it fails, treat as a single image URL string
                imageUrls = [this.bananimon.image_urls];
            }
        }
        
        if (imageUrls.length > 0) {
            document.getElementById('bananimonImage').src = imageUrls[this.bananimon.selected_image_index || 0];
        }
        
        // Update evolution badge
        const badge = document.getElementById('evolutionBadge');
        const stageName = document.querySelector('.stage-name');
        stageName.textContent = this.stageInfo.name;
        badge.className = `evolution-badge stage-${this.bananimon.evolution_stage}`;
        
        // Update care streak
        this.updateStreakDisplay();
    }

    updateStreakDisplay() {
        const streakDots = document.getElementById('streakDots');
        streakDots.innerHTML = '';
        
        const maxDots = Math.min(this.bananimon.care_streak, 7);
        for (let i = 0; i < maxDots; i++) {
            const dot = document.createElement('span');
            dot.className = 'streak-dot active';
            dot.textContent = '🔥';
            streakDots.appendChild(dot);
        }
        
        // Add empty dots up to 7
        for (let i = maxDots; i < 7; i++) {
            const dot = document.createElement('span');
            dot.className = 'streak-dot';
            dot.textContent = '○';
            streakDots.appendChild(dot);
        }
        
        if (this.bananimon.care_streak >= 7) {
            const flame = document.createElement('span');
            flame.className = 'flame-animation';
            flame.textContent = '🔥';
            streakDots.appendChild(flame);
        }
    }

    updateNeedsPanel() {
        const needs = {
            hunger: this.bananimon.hunger,
            rest: this.bananimon.rest,
            clean: this.bananimon.cleanliness,
            mood: this.bananimon.mood
        };

        Object.keys(needs).forEach(need => {
            const value = needs[need];
            const fillElement = document.getElementById(`${need === 'clean' ? 'clean' : need}Fill`);
            const valueElement = document.getElementById(`${need === 'clean' ? 'clean' : need}Value`);
            
            fillElement.style.width = `${value}%`;
            valueElement.textContent = `${value}%`;
            
            // Update color based on value
            fillElement.className = `need-fill ${need}-fill ${this.getNeedColor(value)}`;
        });
    }

    getNeedColor(value) {
        if (value >= 70) return 'good';
        if (value >= 40) return 'okay';
        return 'low';
    }

    updateDailyRitual() {
        const ritualCard = document.getElementById('dailyRitualCard');
        
        if (!this.careNeededToday) {
            ritualCard.classList.add('completed');
            document.querySelectorAll('.ritual-status').forEach(status => {
                status.textContent = 'Done';
                status.classList.add('completed');
            });
        }
    }

    updateQuests() {
        const questsList = document.getElementById('questsList');
        questsList.innerHTML = '';
        
        this.dailyQuests.forEach(quest => {
            const questElement = document.createElement('div');
            questElement.className = 'quest-item';
            questElement.innerHTML = `
                <div class="quest-icon">${this.getQuestIcon(quest.type)}</div>
                <div class="quest-info">
                    <span class="quest-description">${quest.description}</span>
                    <div class="quest-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${(quest.progress / quest.target) * 100}%"></div>
                        </div>
                        <span class="progress-text">${quest.progress}/${quest.target}</span>
                    </div>
                </div>
                <div class="quest-reward">${quest.reward}</div>
            `;
            
            if (quest.progress >= quest.target) {
                questElement.classList.add('completed');
            }
            
            questsList.appendChild(questElement);
        });
    }

    getQuestIcon(type) {
        const icons = {
            care: '💖',
            training: '💪',
            battle: '⚡'
        };
        return icons[type] || '🎯';
    }

    bindEvents() {
        // Care ritual buttons
        document.querySelectorAll('.ritual-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.startCareGame(action);
            });
        });

        // Action buttons
        document.getElementById('restScheduleBtn').addEventListener('click', () => this.showRestSchedule());
        document.getElementById('playBoutBtn').addEventListener('click', () => this.startBout());

        // Modal controls
        document.getElementById('closeCareModal').addEventListener('click', () => this.closeCareModal());
        document.getElementById('closeRestModal').addEventListener('click', () => this.closeRestModal());
        document.getElementById('continueBtn').addEventListener('click', () => this.closeCareModal());
        document.getElementById('celebrateBtn').addEventListener('click', () => this.closeEvolutionModal());
        
        // Rest schedule
        document.getElementById('saveRestSchedule').addEventListener('click', () => this.saveRestSchedule());
    }

    startCareGame(action) {
        if (!this.careNeededToday && action !== 'train') {
            this.showCoachMessage('We\'ve already completed our daily ritual. Come back tomorrow!');
            return;
        }

        this.currentCareGame = action;
        this.showCareModal(action);
    }

    showCareModal(action) {
        const modal = document.getElementById('careModal');
        const title = document.getElementById('careTitle');
        
        // Hide all games
        document.querySelectorAll('.care-game').forEach(game => game.style.display = 'none');
        
        // Show specific game
        const gameElement = document.getElementById(`${action}Game`);
        gameElement.style.display = 'block';
        
        // Set title
        const titles = {
            feed: 'Feeding Time',
            groom: 'Grooming Session', 
            train: 'Training Time'
        };
        title.textContent = titles[action];
        
        modal.style.display = 'flex';
        
        // Initialize game
        this.initCareGame(action);
    }

    initCareGame(action) {
        this.gameState = {
            action: action,
            score: 0,
            progress: 0,
            maxProgress: action === 'feed' ? 6 : (action === 'groom' ? 2 : 10),
            performance: 0,
            isActive: true
        };

        if (action === 'feed') {
            this.initFeedGame();
        } else if (action === 'groom') {
            this.initGroomGame();
        } else if (action === 'train') {
            this.initTrainGame();
        }
    }

    initFeedGame() {
        const pulseRing = document.getElementById('pulseRing');
        const progressSpan = document.getElementById('feedProgress');
        const scoreSpan = document.getElementById('feedScore');
        
        progressSpan.textContent = '0';
        scoreSpan.textContent = '0';
        
        this.startFeedPulse();
        
        // Add click handler
        document.querySelector('.feed-bowl').addEventListener('click', () => this.handleFeedTap());
    }

    startFeedPulse() {
        if (!this.gameState.isActive) return;
        
        const pulseRing = document.getElementById('pulseRing');
        pulseRing.style.animation = 'none';
        
        setTimeout(() => {
            pulseRing.style.animation = 'pulse 2s ease-out';
            
            // Check for perfect timing window
            setTimeout(() => {
                if (this.gameState.isActive) {
                    this.gameState.waitingForTap = true;
                    setTimeout(() => {
                        this.gameState.waitingForTap = false;
                        if (this.gameState.isActive) {
                            this.nextFeedRound();
                        }
                    }, 400); // Perfect timing window
                }
            }, 1600); // When ring reaches target
        }, 100);
    }

    handleFeedTap() {
        if (!this.gameState.isActive || !this.gameState.waitingForTap) return;
        
        this.gameState.progress++;
        this.gameState.score += 10;
        
        document.getElementById('feedProgress').textContent = this.gameState.progress;
        document.getElementById('feedScore').textContent = this.gameState.score;
        
        // Visual feedback
        this.showFeedingFeedback('Perfect!');
        
        this.nextFeedRound();
    }

    nextFeedRound() {
        if (this.gameState.progress >= this.gameState.maxProgress) {
            this.finishCareGame();
            return;
        }
        
        setTimeout(() => {
            this.startFeedPulse();
        }, 1000);
    }

    initGroomGame() {
        // Simple groom game - just click to complete
        let completed = 0;
        const groomTarget = document.getElementById('groomTarget');
        
        groomTarget.addEventListener('click', () => {
            if (!this.gameState.isActive) return;
            
            completed++;
            this.gameState.progress = completed;
            document.getElementById('groomProgress').textContent = completed;
            
            this.showGroomFeedback('Nice grooming!');
            
            if (completed >= 2) {
                setTimeout(() => this.finishCareGame(), 500);
            }
        });
    }

    initTrainGame() {
        let reps = 0;
        let hits = 0;
        
        const trainTarget = document.getElementById('trainTarget');
        const progressSpan = document.getElementById('trainProgress');
        const hitsSpan = document.getElementById('trainHits');
        
        const runTrainingRound = () => {
            if (reps >= 10) {
                this.gameState.score = hits;
                this.finishCareGame();
                return;
            }
            
            reps++;
            progressSpan.textContent = reps;
            
            // Flash the target
            setTimeout(() => {
                if (!this.gameState.isActive) return;
                
                trainTarget.classList.add('flash');
                let canHit = true;
                
                const hitHandler = () => {
                    if (!canHit || !this.gameState.isActive) return;
                    hits++;
                    canHit = false;
                    hitsSpan.textContent = hits;
                    trainTarget.classList.remove('flash');
                    this.showTrainFeedback('Hit!');
                    
                    setTimeout(runTrainingRound, 800);
                };
                
                trainTarget.addEventListener('click', hitHandler, { once: true });
                
                setTimeout(() => {
                    trainTarget.classList.remove('flash');
                    canHit = false;
                    if (this.gameState.isActive) {
                        setTimeout(runTrainingRound, 800);
                    }
                }, 800); // Flash duration
            }, Math.random() * 2000 + 1000); // Random delay
        };
        
        setTimeout(runTrainingRound, 1000);
    }

    async finishCareGame() {
        this.gameState.isActive = false;
        
        // Calculate performance
        const maxScore = this.gameState.action === 'feed' ? 60 : 
                       (this.gameState.action === 'groom' ? 2 : 10);
        const performance = Math.min(1, this.gameState.score / maxScore);
        
        try {
            const response = await fetch(`/api/care/${this.gameState.action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bananimonId: this.bananimon.id,
                    performance: performance
                })
            });
            
            const result = await response.json();
            
            if (result.evolved) {
                this.showEvolutionCelebration(result.newStage);
            } else {
                this.showGameResult(result.message);
            }
            
            // Update bananimon data
            this.bananimon = result.bananimon;
            
        } catch (error) {
            console.error('Error completing care action:', error);
            this.showGameResult('Something went wrong, but your Bananimon still appreciates your care!');
        }
    }

    showGameResult(message) {
        document.getElementById('resultMessage').textContent = message;
        document.getElementById('gameResult').style.display = 'block';
    }

    showFeedingFeedback(text) {
        // Simple feedback animation
        console.log('Feeding feedback:', text);
    }

    showGroomFeedback(text) {
        console.log('Groom feedback:', text);
    }

    showTrainFeedback(text) {
        console.log('Train feedback:', text);
    }

    closeCareModal() {
        document.getElementById('careModal').style.display = 'none';
        this.gameState.isActive = false;
        this.updateUI(); // Refresh the display
    }

    showRestSchedule() {
        const modal = document.getElementById('restModal');
        const select = document.getElementById('restHourSelect');
        
        // Set current rest window
        select.value = this.bananimon.rest_window_utc;
        
        modal.style.display = 'flex';
    }

    closeRestModal() {
        document.getElementById('restModal').style.display = 'none';
    }

    async saveRestSchedule() {
        const hour = document.getElementById('restHourSelect').value;
        
        try {
            const response = await fetch('/api/rest-schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bananimonId: this.bananimon.id,
                    restHour: parseInt(hour)
                })
            });
            
            if (response.ok) {
                this.bananimon.rest_window_utc = parseInt(hour);
                this.closeRestModal();
                this.showCoachMessage('Rest schedule updated! We\'ll sleep better during your quiet hour.');
            } else {
                throw new Error('Failed to save rest schedule');
            }
        } catch (error) {
            console.error('Error saving rest schedule:', error);
            alert('Failed to save rest schedule. Please try again.');
        }
    }

    startBout() {
        this.showCoachMessage('Battle system coming soon! Focus on caring for now.');
    }

    showEvolutionCelebration(newStage) {
        const modal = document.getElementById('evolutionModal');
        const image = document.getElementById('evolutionImage');
        const title = document.getElementById('evolutionTitle');
        const message = document.getElementById('evolutionMessage');
        const stageName = document.getElementById('newStageName');
        const stageDescription = document.getElementById('stageDescription');
        
        // Set evolution data
        const imageUrls = JSON.parse(this.bananimon.image_urls || '[]');
        if (imageUrls.length > 0) {
            image.src = imageUrls[this.bananimon.selected_image_index || 0];
        }
        
        const stageInfo = this.getStageInfo(newStage);
        stageName.textContent = stageInfo.name;
        stageDescription.textContent = stageInfo.description;
        
        modal.style.display = 'flex';
        
        // Trigger confetti
        this.triggerEvolutionEffects();
    }

    getStageInfo(stage) {
        const stages = {
            0: { name: 'Hatchling', description: 'Small and discovering the world' },
            1: { name: 'Juvenile', description: 'Growing stronger through care' },
            2: { name: 'Adept', description: 'Confident and capable' },
            3: { name: 'Kindred', description: 'Your lifelong companion' }
        };
        return stages[stage] || stages[0];
    }

    triggerEvolutionEffects() {
        // Add sparkle and glow effects
        const glow = document.querySelector('.evolution-glow');
        glow.style.animation = 'evolutionGlow 3s ease-in-out infinite';
    }

    closeEvolutionModal() {
        document.getElementById('evolutionModal').style.display = 'none';
        this.updateUI(); // Refresh to show new evolution stage
    }

    showCoachMessage(message) {
        const bubble = document.getElementById('coachBubble');
        const messageEl = document.getElementById('coachMessage');
        
        messageEl.textContent = message;
        bubble.style.display = 'flex';
        
        setTimeout(() => {
            bubble.style.display = 'none';
        }, 4000);
    }

    showLoading(text) {
        document.getElementById('loadingText').textContent = text;
        document.getElementById('loadingOverlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }
}

// CSS animations for games
const gameStyles = `
@keyframes pulse {
    0% { transform: scale(0.3); opacity: 1; }
    100% { transform: scale(1.2); opacity: 0; }
}

.flash {
    animation: flash 0.8s ease-in-out;
}

@keyframes flash {
    0%, 100% { background-color: transparent; }
    50% { background-color: #FFD700; }
}

@keyframes evolutionGlow {
    0%, 100% { opacity: 0.5; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.1); }
}
`;

// Add styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = gameStyles;
document.head.appendChild(styleSheet);

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new BananimonHome();
});