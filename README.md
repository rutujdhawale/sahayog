# Sahayog

A modern crowdfunding platform built with React and Node.js that enables creators to launch campaigns and receive contributions from supporters.

## Features

- **Campaign Management**: Create, edit, and manage fundraising campaigns
- **Secure Contributions**: Support campaigns with secure donation processing
- **Progress Tracking**: Real-time progress bars and funding analytics
- **User Dashboard**: Track your campaigns and contributions
- **Email Notifications**: Automated invoice delivery via email
- **Responsive Design**: Beautiful UI that works on all devices

## Tech Stack

### Frontend
- **React 19** - Modern UI library
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Lucide React** - Beautiful icons
- **React Hot Toast** - Elegant notifications

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **Passport.js** - Google OAuth 2.0 authentication
- **JWT** - Authentication tokens
- **Cloudinary** - Image upload and management
- **Nodemailer** - Email service
- **bcrypt** - Password hashing

## System Architecture

```mermaid
flowchart TD
    %% Styling Classes
    classDef clientStyle fill:#e6fffa,stroke:#008080,stroke-width:2px,color:#004d40;
    classDef apiStyle fill:#f0fdf4,stroke:#16a34a,stroke-width:2px,color:#14532d;
    classDef dbStyle fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#78350f;
    classDef extStyle fill:#eff6ff,stroke:#2563eb,stroke-width:2px,color:#1e3a8a;
    classDef ciStyle fill:#faf5ff,stroke:#9333ea,stroke-width:2px,color:#581c87;

    %% Users
    User["👤 Contributor / Backer"]
    Creator["👤 Campaign Creator"]

    %% Frontend Subgraph
    subgraph Frontend["🖥️ Client Container (React 19 + Vite @ :5173)"]
        UI["Landing & Discovery Page<br/>(Live MongoDB Campaigns)"]:::clientStyle
        EventsView["Campaigns Catalog & Search<br/>(/events)"]:::clientStyle
        ContributeView["Campaign Details & Tiers<br/>(/contribute/:id)"]:::clientStyle
        CheckoutView["Checkout & Invoice Screen<br/>(/checkout/:id)"]:::clientStyle
        CreatorStudio["Campaign Studio & Management<br/>(/create-event, /my-campaigns)"]:::clientStyle
        UserDashboard["Contributions Dashboard & Stats<br/>(/my-contributions)"]:::clientStyle
        AuthUI["Auth Views & Google Sign-In<br/>(/login, /register)"]:::clientStyle
        UserContext["UserContext<br/>(JWT Token & Session State)"]:::clientStyle
    end

    %% Backend Subgraph
    subgraph Backend["⚙️ Backend Container (Express.js REST API @ :5000)"]
        Middlewares["Security & Logging Pipeline<br/>• CORS Origin Guard<br/>• Request Logger<br/>• Validation Middleware<br/>• Centralized Error Handler"]:::apiStyle
        Passport["Passport.js & GoogleStrategy<br/>(/api/auth/google/callback)"]:::apiStyle
        AuthRoutes["Auth API<br/>(/api/auth, /api/login, /api/register)"]:::apiStyle
        EventRoutes["Campaign API<br/>(/api/events - CRUD, Live Pledges)"]:::apiStyle
        ContributionRoutes["Contribution & Invoice API<br/>(/api/contributions, /stats, /invoice)"]:::apiStyle
        HealthRoutes["Health Diagnostics<br/>(/api/health, /api/test)"]:::apiStyle
    end

    %% Storage & External Subgraph
    subgraph Storage["🗄️ Persistence & External Services"]
        MongoDB[("MongoDB Atlas Database<br/>• Users Collection<br/>• Events Collection<br/>• Contributions Collection")]:::dbStyle
        GoogleOAuth["🔐 Google Identity Services<br/>(OAuth 2.0 Auth Server)"]:::extStyle
        Cloudinary["☁️ Cloudinary Storage<br/>(Campaign Media & Photos)"]:::extStyle
    end

    %% CI/CD Subgraph
    subgraph DevOps["🚀 CI/CD Automation"]
        GitHubActions["GitHub Actions Pipeline<br/>• Node 20 Native Tests (24 Tests)<br/>• Vite Production Asset Build"]:::ciStyle
    end

    %% Flow Connections
    User -->|Browse & Pledge| UI
    User -->|Search & Filter| EventsView
    User -->|Select Amount| ContributeView
    User -->|Complete Pledge| CheckoutView
    User -->|View Invoices| UserDashboard
    Creator -->|Publish & Manage| CreatorStudio
    Creator -->|Sign In / Register| AuthUI

    UI & EventsView & ContributeView & CheckoutView & CreatorStudio & UserDashboard -->|HTTPS / JSON / JWT| Middlewares
    AuthUI -->|OAuth Handshake| Passport

    Middlewares --> AuthRoutes
    Middlewares --> EventRoutes
    Middlewares --> ContributionRoutes
    Middlewares --> HealthRoutes
    Passport --> AuthRoutes

    AuthRoutes -->|Verify Token| GoogleOAuth
    EventRoutes -->|Upload Media| Cloudinary
    AuthRoutes & EventRoutes & ContributionRoutes -->|Mongoose Queries| MongoDB

    GitHubActions -.->|Validates PR & Push| Backend
    GitHubActions -.->|Validates Production Build| Frontend
```

## Automated Testing & CI/CD

Sahayog includes a native Node.js test suite with zero external test runner overhead:

```bash
cd api
npm test
```

- **Authentication Suite**: bcrypt hashing, JWT claim verification, token tamper detection.
- **Business Logic Suite**: Real-time progress capping (100%), sequential invoice generation (`INV-<timestamp>-<padded sequence>`), pledge tier parsing.
- **Security & Authorization Suite**: 401 unauthenticated guardrails on mutations, MongoDB ObjectId validation.
- **Request Validation Suite**: Schema guards on `/api/register`, `/api/login`, `/api/auth/google`.
- **Infrastructure Suite**: Diagnostics on `/api/health` and `/api/test`.
- **GitHub Actions**: Configured at `.github/workflows/ci.yml` running all 24 automated tests on push and pull requests.

## Prerequisites

Before running this project, make sure you have:

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **MongoDB** (local installation or MongoDB Atlas)
- **Cloudinary Account** (for image uploads)

## 🔧 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/rutujdhawale/sahayog.git
cd sahayog
```

### 2. Backend Setup
```bash
cd api
npm install
```

Create a `.env` file in the `api` directory:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/sahayog
# or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sahayog

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Email Configuration (Gmail example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Server Configuration
PORT=5000
NODE_ENV=development
```

### 3. Frontend Setup
```bash
cd ../client
npm install
```

### 4. Start the Application

**Terminal 1 - Backend:**
```bash
cd api
npm start
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

## Project Structure

```
sahayog/
├── api/                          # Backend application
│   ├── config/                   # Configuration files
│   │   ├── db.js                # Database connection
│   │   └── cloudinary.js        # Cloudinary setup
│   ├── controllers/              # Route controllers
│   │   ├── auth.controller.js   # Authentication logic
│   │   ├── event.controller.js  # Campaign management
│   │   └── contribution.controller.js # Contribution handling
│   ├── middlewares/              # Custom middleware
│   │   └── auth.middleware.js   # JWT authentication
│   ├── models/                   # Database models
│   │   ├── User.js              # User schema
│   │   ├── Event.js             # Campaign schema
│   │   └── Contribution.js      # Contribution schema
│   ├── routes/                   # API routes
│   │   ├── auth.routes.js       # Authentication routes
│   │   ├── event.routes.js      # Campaign routes
│   │   └── contribution.routes.js # Contribution routes
│   ├── services/                 # Business logic services
│   │   └── emailService.js      # Email functionality
│   ├── uploads/                  # Temporary file uploads
│   ├── package.json             # Backend dependencies
│   └── index.js                 # Server entry point
├── client/                       # Frontend application
│   ├── public/                   # Static assets
│   ├── src/                      # Source code
│   │   ├── assets/              # Images and static files
│   │   ├── context/             # React context providers
│   │   │   └── UserContext.jsx  # User authentication context
│   │   ├── pages/               # Page components
│   │   │   ├── LandingPage.jsx  # Home page
│   │   │   ├── EventsPage.jsx   # Browse campaigns
│   │   │   ├── ContributionPage.jsx # Contribution flow
│   │   │   ├── CheckoutPage.jsx # Checkout and invoice
│   │   │   ├── MyContributionsPage.jsx # User contributions
│   │   │   └── ...              # Other pages
│   │   ├── App.jsx              # Main app component
│   │   ├── Header.jsx           # Navigation header
│   │   ├── Footer.jsx           # Site footer
│   │   ├── Layout.jsx           # Page layout wrapper
│   │   └── main.jsx             # App entry point
│   ├── package.json             # Frontend dependencies
│   └── vite.config.js           # Vite configuration
└── README.md                     # This file
```

## Key Features

### Campaign Creation
Users can create fundraising campaigns with:
- Title and detailed description
- Funding goal and timeline
- Image uploads via Cloudinary
- Category tags for discoverability

### Contribution System
- Multiple contribution amounts (₹100, ₹500, ₹1000, ₹2000, or custom)
- Real-time progress tracking with gradient progress bars
- Secure contribution processing
- Automated invoice generation and email delivery

### User Dashboard
- **My Campaigns**: Manage created campaigns
- **My Contributions**: Track donation history
- **Settings**: Profile information

## UI/UX Features

- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Modern Aesthetics**: Clean, professional interface with Tailwind CSS
- **Interactive Elements**: Smooth animations and hover effects
- **Accessibility**: ARIA labels and keyboard navigation support
- **Toast Notifications**: Real-time feedback for user actions

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **Input Validation**: Server-side validation for all inputs
- **CORS Protection**: Configured for secure cross-origin requests
- **File Upload Security**: Cloudinary integration with file type validation

## Deployment

### Environment Variables for Production
```env
NODE_ENV=production
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=your-production-jwt-secret
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
EMAIL_HOST=your-email-host
EMAIL_PORT=587
EMAIL_USER=your-email
EMAIL_PASS=your-email-password
```

### Build Commands
```bash
# Build frontend for production
cd client
npm run build

# Start production server
cd ../api
npm start
```

## API Docs

### Authentication Endpoints
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/profile` - Get user profile

### Campaign Endpoints
- `GET /api/events` - Get all campaigns
- `POST /api/events` - Create new campaign
- `GET /api/events/:id` - Get campaign by ID
- `PUT /api/events/:id` - Update campaign
- `DELETE /api/events/:id` - Delete campaign
- `GET /api/my-events` - Get user's campaigns

### Contribution Endpoints
- `POST /api/contributions` - Create contribution
- `GET /api/contributions/user/:userId` - Get user contributions
- `GET /api/contributions/:id/invoice` - Get contribution invoice
- `POST /api/contributions/:id/email-invoice` - Email invoice

## Troubleshooting

### Common Issues

**MongoDB Connection Error:**
- Ensure MongoDB is running locally or check Atlas connection string
- Verify network access and credentials

**Cloudinary Upload Fails:**
- Check Cloudinary credentials in `.env`
- Ensure upload folder permissions are correct

**Email Not Sending:**
- Verify email service credentials
- Check spam folder for test emails
- Ensure app passwords are used for Gmail

**Frontend Build Errors:**
- Clear node_modules and reinstall dependencies
- Check for version conflicts in package.json

## License

MIT

