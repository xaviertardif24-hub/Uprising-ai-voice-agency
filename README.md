# 🤖 Uprising AI Voice Agency — AI Receptionist

> Système de réceptionniste IA vocale basé sur Bland AI, Twilio et ElevenLabs. Automatise les appels entrants et sortants, la gestion des leads et la prise de rendez-vous.

---

## ✨ Fonctionnalités

- 📞 **Appels entrants & sortants** — Gère les appels via Bland AI avec des agents IA (Sophie, Julie, Marc)
- 🎙️ **Voix ultra-réalistes** — Intégration ElevenLabs pour des voix humanisées et naturelles
- 🗓️ **Prise de rendez-vous** — Connexion à Google Calendar pour réserver des créneaux automatiquement
- 📋 **Gestion des leads** — Export CSV des leads + intégration CRM (Twenty CRM)
- 📧 **Notifications email** — Envoi automatique de confirmations via Nodemailer
- 💬 **SMS de suivi** — Envoi de SMS après les appels via Twilio
- 🌐 **Web Scraper** — Scraping de sites web pour entraîner les agents IA selon le contexte business du client
- 📊 **Dashboard** — Interface web pour gérer agents, leads et appels en temps réel

---

## 🏗️ Architecture

```
uprising-ai-voice-agency/
├── server.js                  # Point d'entrée Express
├── config/                    # Configuration & variables d'environnement
├── routes/
│   ├── webhookRoutes.js       # Webhook Bland AI / Twilio
│   └── dashboardRoutes.js     # API Dashboard
├── services/
│   ├── blandService.js        # Intégration Bland AI
│   ├── inboundService.js      # Gestion appels entrants
│   ├── crmService.js          # Intégration CRM
│   ├── twentyService.js       # Intégration Twenty CRM
│   ├── calendarService.js     # Google Calendar
│   ├── emailService.js        # Envoi d'emails
│   ├── smsService.js          # Envoi de SMS
│   ├── promptService.js       # Gestion des prompts agents
│   ├── webScraperService.js   # Scraping de sites clients
│   ├── fonosterService.js     # Intégration Fonoster
│   └── dograhService.js       # Intégration Dograh
├── utils/
│   ├── csvLogger.js           # Export CSV des leads
│   └── logger.js              # Logging système
└── public/                    # Interface web (Dashboard HTML/CSS/JS)
```

---

## 🚀 Installation

### Prérequis

- Node.js v18+
- Comptes : Bland AI, Twilio, ElevenLabs, Google Cloud

### 1. Cloner le repo

```bash
git clone https://github.com/xaviertardif24-hub/Uprising-ai-voice-agency.git
cd Uprising-ai-voice-agency
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer les variables d'environnement

Crear un fichier `.env` à la racine :

```env
PORT=3000

# Bland AI
BLAND_API_KEY=your_bland_api_key

# Twilio
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx

# ElevenLabs
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Google Calendar
GOOGLE_CALENDAR_ID=your_calendar_id

# Email
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Twenty CRM
TWENTY_API_KEY=your_twenty_api_key
TWENTY_API_URL=https://api.twenty.com
```

### 4. Lancer le serveur

```bash
# Mode développement
npm run dev

# Mode production
npm start
```

### 5. Exposer avec ngrok (dev)

```bash
ngrok http 3000
```

Puis configurer l'URL ngrok comme webhook dans Bland AI / Twilio.

---

## 🔗 Endpoints principaux

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/webhook` | Webhook principal Bland AI |
| `GET` | `/api/dashboard/agents` | Liste tous les agents |
| `POST` | `/api/dashboard/agents` | Créer un agent |
| `GET` | `/api/dashboard/leads` | Liste des leads |
| `GET` | `/api/dashboard/calls` | Historique des appels |

---

## 🤖 Agents IA disponibles

| Agent | Voix | Spécialité |
|-------|------|------------|
| **Sophie** | ElevenLabs - Française | Réceptionniste généraliste |
| **Julie** | ElevenLabs - Québécoise | Suivi clients & prise de RDV |
| **Marc** | ElevenLabs - Masculin | Appels de prospection |

---

## 📄 License

ISC © [Uprising AI Voice Agency](https://github.com/xaviertardif24-hub)
