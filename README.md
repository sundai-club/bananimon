# 🍌 Bananimon - Your Caring Digital Companion

**Bananimon** is a caring-focused digital pet game where consistency drives evolution. Create a unique Bananimon from your selfie and a spirit animal, then nurture it through daily care rituals.

## ✨ Core Features

### Onboarding Flow
- **Age & Consent**: 13+ age gate with transparent privacy policy
- **Fast Account Creation**: Play instantly without email (optional linking)
- **Selfie Capture**: AI-guided photo capture with helpful tips
- **Spirit Animal Selection**: Choose from 12 curated animals
- **Banana Fusion**: AI generates 3 unique character variants
- **Name & Temperament**: Personalize with name and personality traits

### Daily Care Loop (2-4 minutes)
- **Feed**: Timing-based rhythm game (6 pulses, perfect timing rewards)
- **Groom**: Simple arc-tracing interaction (2 areas to clean)
- **Train**: Rotating daily mini-games (timing, reflex, rhythm)
- **Rest Schedule**: Set quiet hours for efficiency bonuses

### Evolution System
- **4 Stages**: Hatchling → Juvenile → Adept → Kindred
- **Bond-Based**: Progression through caring consistency, not time spent
- **Care Streaks**: Daily ritual completion builds streaks (compassionate decay)
- **Visual Evolution**: Each stage unlocks new appearance elements

### Stats & Needs
- **4 Core Needs**: Hunger, Rest, Cleanliness, Mood (0-100%)
- **Hourly Decay**: Gradual stat reduction with grace periods
- **Bond System**: Grows through perfect care actions and consistency
- **Focus Points**: Training builds skills for future battle system

## 🎮 Getting Started

### Prerequisites
- Node.js 16+
- A Gemini API key from Google AI Studio

### Installation

1. **Clone and Install**
   ```bash
   git clone <your-repo>
   cd bananimon
   npm install
   ```

2. **Environment Setup**
   Create a `.env` file:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   SESSION_SECRET=your_secure_session_secret
   ```

3. **Database Setup**
   ```bash
   npm run setup-db
   ```

4. **Start the Server**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

5. **Visit the App**
   Open http://localhost:3000 in your browser

## 🏗️ Architecture

### Tech Stack
- **Backend**: Node.js + Express
- **Database**: SQLite with custom ORM models
- **AI Generation**: Google Gemini 2.5 Flash
- **Frontend**: Vanilla HTML/CSS/JS (mobile-optimized)
- **Sessions**: Express-session with secure cookies
- **Scheduling**: Node-cron for decay/streak management

### Database Schema
- **Users**: Account management (anonymous + email linking)
- **Bananimon**: Core pet data, stats, evolution stage
- **Care Activities**: Activity logging for analytics
- **Battles**: Future PvE/PvP system foundation
- **Quests**: Daily goals and achievements

### Key Design Principles
- **Short, Certain, Satisfying**: <6 minutes to first interaction
- **One-handed, Glanceable**: Mobile-first design, big touch targets
- **Caring = Power**: Consistency beats time investment
- **No Pay-to-Win**: Premium features enhance experience, never provide advantages

## 🎯 User Flow

### First Time Experience (5-6 minutes)
1. Splash screen with value proposition
2. Age verification and privacy consent
3. Fast account creation (anonymous or email)
4. Selfie capture with guidance
5. Animal selection from curated grid
6. AI generation with 3 preview variants
7. Naming and temperament selection
8. Welcome celebration and first care tutorial

### Daily Ritual (2-4 minutes)
1. Check current needs and care streak
2. Complete 3-action ritual: Feed → Groom → Train
3. Optional: Adjust rest schedule or play practice bout
4. Track daily quests and evolution progress

### Long-term Progression
- **Days 1-7**: Learn care mechanics, build first streak
- **Week 2**: First evolution (Hatchling → Juvenile)
- **Month 1**: Develop care habits, reach Adept stage
- **Month 3+**: Master-level care, achieve Kindred bond

## 🔧 Development

### Available Scripts
- `npm start`: Production server
- `npm run dev`: Development with nodemon
- `npm run setup-db`: Initialize database
- `npm test`: Run test suite (when implemented)

### API Endpoints
```
# User Management
POST /api/user/create
GET  /api/user/profile

# Bananimon Management  
POST /api/bananimon/create
GET  /api/bananimon/:id
GET  /api/home

# Care System
POST /api/care/:action (feed|groom|train)
POST /api/rest-schedule

# AI Generation
POST /api/generate-bananimon
POST /generate-pet (legacy)
```

## 🎨 Design System

### Color Palette
- **Primary**: Teal gradient (#11998e → #38ef7d)
- **Secondary**: Purple gradient (#667eea → #764ba2)
- **Evolution Stages**: 
  - Stage 0: Green gradient (Hatchling)
  - Stage 1: Purple gradient (Juvenile)  
  - Stage 2: Pink gradient (Adept)
  - Stage 3: Gold gradient (Kindred)

### Typography
- **Headers**: Segoe UI, clean and friendly
- **Body**: System fonts for optimal legibility
- **Sizes**: Responsive scaling, mobile-optimized

### Animation Philosophy
- **Subtle and Purposeful**: No gratuitous effects
- **Performance First**: 60fps on mobile devices
- **Accessibility**: Respects motion reduction preferences

## 📱 Mobile Optimization

- **Responsive Design**: Fluid layouts, no horizontal scrolling
- **Touch Targets**: Minimum 44px for accessibility
- **Offline Graceful**: Basic functionality without connection
- **Performance**: <3s initial load, smooth interactions

## 🔒 Privacy & Security

### Data Handling
- **Selfies**: Processed server-side, deleted immediately after generation
- **Account Data**: Minimal collection, anonymous by default
- **Sessions**: Secure HTTP-only cookies, 30-day expiry
- **Analytics**: Usage patterns only, no personal data

### GDPR Compliance
- **Consent**: Clear opt-in for all data collection
- **Deletion**: Full account deletion available
- **Portability**: Export user data on request
- **Transparency**: Plain-language privacy policy

## 🚀 Deployment

### Production Checklist
- [ ] Set secure SESSION_SECRET
- [ ] Configure HTTPS (set cookie.secure = true)
- [ ] Set up proper logging (Winston/similar)
- [ ] Configure rate limiting
- [ ] Set up monitoring (health checks)
- [ ] Configure backup strategy for user data

### Scaling Considerations
- **Database**: SQLite → PostgreSQL for >1000 concurrent users
- **File Storage**: Local → S3/CloudFlare for generated images
- **Caching**: Redis for session storage and API responses
- **CDN**: Static asset delivery optimization

## 🎯 Future Roadmap

### Phase 2: Battle System (Days 7-12)
- PvE training bouts with AI opponents
- Ghost PvP using battle replays
- Move sets based on animal + evolution stage
- Simple 4-action combat with AP management

### Phase 3: Social Features (Days 13-18)
- Friend systems and visiting
- Care streak competitions
- Community challenges and events
- User-generated content sharing

### Phase 4: Advanced Caring (Days 19-24)
- Seasonal events and special items
- Advanced training mini-games
- Personality development through choices
- Environmental interaction systems

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- **Google Gemini**: AI generation capabilities
- **Unsplash**: Animal reference imagery
- **Design Inspiration**: Tamagotchi, Animal Crossing, Neko Atsume
- **Community**: Early testers and feedback providers

---

**Built with ❤️ for the joy of digital companionship**

*"Make a Bananimon that's part you, part spirit-animal."*
