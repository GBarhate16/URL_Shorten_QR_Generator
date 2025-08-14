# Frontend - URL Shortener SaaS

This is the frontend application for the URL Shortener SaaS built with Next.js 14, React, TypeScript, and Tailwind CSS.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
1. Install dependencies:
```bash
npm install
# or
yarn install
```

### Environment Variables

Create a `.env.local` file in the frontend directory with the following variables:

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000

# Frontend URL (optional)
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
```

**Note:** All environment variables must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser.

### Development
```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build
```bash
npm run build
# or
yarn build
```

### Production
```bash
npm start
# or
yarn start
```

## 🏗️ Project Structure

```
frontend/
├── app/                    # Next.js 14 App Router
│   ├── dashboard/         # Protected dashboard page
│   ├── login/            # Login page
│   ├── signup/           # Signup page
│   ├── r/[shortCode]/    # URL redirect page
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page
│   └── providers.tsx     # Context providers
├── components/            # Reusable components
│   ├── navbar.tsx        # Navigation bar
│   ├── hero.tsx          # Hero section
│   └── protected-route.tsx # Route protection
├── contexts/             # React contexts
│   └── auth-context.tsx  # Authentication context
├── config/               # Configuration files
│   └── api.ts           # API configuration
└── public/               # Static assets
```

## 🔧 Configuration

### API Configuration
The API configuration is centralized in `config/api.ts` and uses environment variables:

- `NEXT_PUBLIC_API_URL`: Backend server URL
- Default fallback: `http://127.0.0.1:8000`

### Available Endpoints
- User registration: `/api/users/register/`
- User login: `/api/users/login/`
- URL management: `/api/urls/`
- URL redirect: `/api/urls/{shortCode}/redirect/`

## 🎨 Styling

- **Tailwind CSS**: Utility-first CSS framework
- **HeroUI**: React component library
- **Framer Motion**: Animation library
- **next-themes**: Theme switching support

## 🔐 Authentication

- Token-based authentication
- Protected routes
- Global auth context
- Automatic token management

## 📱 Features

- User registration and login
- Protected dashboard
- URL shortening and management
- Responsive design
- Dark/light theme support
- Real-time URL tracking

## 🚀 Deployment

The application can be deployed to:
- Vercel (recommended for Next.js)
- Netlify
- AWS Amplify
- Any static hosting service

Remember to set the appropriate environment variables in your deployment platform.
