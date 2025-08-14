# Deployment Guide

## Frontend Deployment (Vercel)

### Prerequisites
- GitHub repository connected to Vercel
- Environment variables configured

### Steps
1. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will automatically detect it's a Next.js project

2. **Configure Environment Variables**:
   In Vercel dashboard, add these environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
   NEXT_PUBLIC_FRONTEND_URL=https://your-frontend-url.vercel.app
   NEXT_PUBLIC_ENABLE_ANALYTICS=false
   NEXT_PUBLIC_ANALYTICS_DOMAIN=your-domain.com
   NEXT_PUBLIC_ANALYTICS_SCRIPT_URL=https://your-analytics-script.js
   ```

3. **Deploy**:
   - Vercel will automatically build and deploy
   - Build command: `npm run build`
   - Output directory: `.next`

### Troubleshooting
- If you get "next: command not found", ensure `package.json` has Next.js as dependency
- If build fails, check environment variables are set correctly

## Backend Deployment (Render)

### Prerequisites
- Render account
- PostgreSQL database (Neon recommended)

### Steps
1. **Create Web Service**:
   - Go to [render.com](https://render.com)
   - Create new Web Service
   - Connect your GitHub repository

2. **Configure Build Settings**:
   ```
   Build Command: pip install -r requirements.txt
   Start Command: gunicorn saas_url.wsgi:application
   ```

3. **Environment Variables**:
   ```
   DATABASE_URL=postgresql://your-neon-connection-string
   SECRET_KEY=your-secret-key
   DEBUG=False
   ALLOWED_HOSTS=your-app.onrender.com
   CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
   FRONTEND_URL=https://your-frontend.vercel.app
   BACKEND_URL=https://your-backend.onrender.com
   ```

4. **Deploy**:
   - Render will automatically build and deploy
   - Run migrations: `python manage.py migrate`

## Environment Variables Reference

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ANALYTICS_DOMAIN=localhost
NEXT_PUBLIC_ANALYTICS_SCRIPT_URL=https://plausible.gonzalochale.dev/js/script.outbound-links.js
```

### Backend (.env)
```bash
DEBUG=True
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgresql://your-database-url
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://127.0.0.1:8000
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Common Issues

1. **CORS Errors**: Ensure `CORS_ALLOWED_ORIGINS` includes your frontend URL
2. **Database Connection**: Verify `DATABASE_URL` is correct and accessible
3. **Build Failures**: Check all dependencies are in `requirements.txt` and `package.json`
4. **Environment Variables**: Ensure all required variables are set in deployment platform
