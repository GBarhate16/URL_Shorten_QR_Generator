# SaaS URL Shortener & QR Generator

A modern, production-ready URL shortener SaaS application built with Django REST Framework backend and Next.js frontend, featuring comprehensive analytics, QR code generation, and real-time tracking.

## 🚀 Features

- **URL Shortening**: Create custom short links with branded domains
- **QR Code Generation**: Generate QR codes for easy sharing and offline access
- **Real-time Analytics**: Track clicks, locations, devices, browsers, and referrers
- **Interactive Dashboard**: Modern UI with charts and data visualizations
- **User Management**: JWT authentication, user profiles, and admin panel
- **Dark/Light Mode**: Seamless theme switching
- **Responsive Design**: Works perfectly on all devices
- **WebSocket Support**: Real-time notifications and updates

## 🏗️ Tech Stack

### Backend
- **Django 4.2.7** - Web framework
- **Django REST Framework 3.14.0** - API development
- **PostgreSQL** - Primary database
- **Redis** - Caching and real-time features (optional)
- **Django Channels** - WebSocket support
- **JWT Authentication** - Secure API authentication
- **Gunicorn** - Production WSGI server

### Frontend
- **Next.js 14.2.10** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Recharts** - Data visualization
- **SWR** - Data fetching and caching
- **Next-themes** - Dark/light mode
- **Framer Motion** - Animations

## 📁 Project Structure

```
saas-url/
├── backend/                 # Django backend
│   ├── saas_url/           # Django project settings
│   ├── urls/               # URL shortening app
│   ├── users/              # User management app
│   ├── qr_codes/           # QR code generation app
│   ├── requirements.txt    # Python dependencies
│   ├── settings_production.py # Production settings
│   ├── render.yaml         # Render deployment config
│   └── manage.py          # Django management
├── frontend/               # Next.js frontend
│   ├── app/               # Next.js app directory
│   ├── components/        # React components
│   ├── hooks/            # Custom React hooks
│   ├── config/           # Configuration files
│   └── package.json      # Node.js dependencies
├── preparation.txt        # Complete project documentation
└── README.md             # This file
```

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- PostgreSQL 12+
- Redis 6+ (optional)

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd saas-url/backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your database credentials
   ```

5. **Run migrations**
   ```bash
   python manage.py migrate
   ```

6. **Create superuser**
   ```bash
   python manage.py createsuperuser
   ```

7. **Start development server**
   ```bash
   python manage.py runserver
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   # Edit .env.local with your backend URL
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## 🌐 Deployment

### Render Deployment (Recommended)

The application is fully configured for deployment on Render:

1. **Backend**: Web Service with PostgreSQL database
2. **Frontend**: Static Site with Next.js build

#### Backend Deployment Steps

1. **Connect your repository** to Render
2. **Use the provided `render.yaml`** for automatic configuration
3. **Set environment variables**:
   ```bash
   DJANGO_SETTINGS_MODULE=saas_url.settings_production
   DJANGO_ENV=production
   DEBUG=false
   DATABASE_URL=postgresql://user:password@host/database
   SECRET_KEY=your-production-secret-key
   ```

#### Frontend Deployment Steps

1. **Build and deploy** using Vercel or Netlify
2. **Set environment variables**:
   ```bash
   NEXT_PUBLIC_API_URL=https://your-backend-domain.onrender.com
   ```

### Environment Variables

#### Backend (Production)
```bash
DEBUG=False
SECRET_KEY=your-production-secret-key
DATABASE_URL=postgresql://user:password@host/database
REDIS_URL=redis://localhost:6379  # Optional
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com
```

#### Frontend (Production)
```bash
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
NEXT_PUBLIC_APP_URL=https://your-frontend-domain.com
```

## 📊 Analytics Features

- **Real-time Click Tracking**: Monitor link performance instantly
- **Geographic Data**: See where your clicks come from
- **Device Analytics**: Track mobile vs desktop usage
- **Browser Statistics**: Understand user browser preferences
- **Referrer Analysis**: See which sites drive traffic
- **Time-series Data**: View trends over time
- **QR Code Analytics**: Track QR code usage and performance

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - User login
- `POST /api/auth/refresh/` - Token refresh
- `POST /api/auth/verify-email/` - Email verification
- `POST /api/auth/reset-password/` - Password reset

### URL Management
- `GET /api/urls/` - List user's URLs
- `POST /api/urls/` - Create new short URL
- `GET /api/urls/{id}/` - Get URL details
- `PUT /api/urls/{id}/` - Update URL
- `DELETE /api/urls/{id}/` - Delete URL
- `GET /api/urls/{id}/stats/` - Get URL analytics

### QR Codes
- `GET /api/qr-codes/` - List user's QR codes
- `POST /api/qr-codes/` - Generate new QR code
- `GET /api/qr-codes/{id}/` - Get QR code details
- `DELETE /api/qr-codes/{id}/` - Delete QR code

### URL Redirection
- `GET /r/{short_code}` - Redirect to original URL

## 🔒 Security Features

- JWT-based authentication
- CORS protection
- CSRF protection
- Rate limiting
- Input validation and sanitization
- Security headers
- HTTPS enforcement

## 📈 Performance Features

- Redis caching (optional)
- Database connection pooling
- Static file optimization
- Query optimization
- Background task processing
- WebSocket for real-time updates

## 🚀 Production Features

- **Auto-scaling**: Handles traffic spikes automatically
- **Health monitoring**: Built-in health checks
- **Error handling**: Graceful fallbacks for all services
- **Logging**: Comprehensive logging system
- **Backup systems**: Database and file backups
- **Environment management**: Separate dev/staging/prod configs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests if applicable
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📚 Documentation

- **`preparation.txt`**: Complete project documentation and analysis
- **`backend/DEPLOYMENT.md`**: Detailed deployment guide
- **API Documentation**: Available at `/api/docs/` when running

## 🆘 Support & Troubleshooting

### Common Issues

1. **Redis Connection Errors**: The app automatically falls back to in-memory storage
2. **Database Issues**: Check your `DATABASE_URL` environment variable
3. **Build Failures**: Ensure Python 3.12+ and Node.js 18+

### Getting Help

- **Issues**: Create an issue in the repository
- **Documentation**: Check `preparation.txt` for detailed analysis
- **Deployment**: Refer to `backend/DEPLOYMENT.md`

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 Roadmap

- [ ] Enhanced analytics dashboard
- [ ] Bulk URL operations
- [ ] Advanced QR code customization
- [ ] Mobile app development
- [ ] API rate limit improvements
- [ ] Multi-tenant architecture
- [ ] Advanced AI analytics

---

**Built with ❤️ using Django, Next.js, and modern web technologies**
