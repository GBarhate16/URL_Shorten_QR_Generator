# SaaS URL - URL Shortener with Analytics

A modern URL shortener SaaS application built with Django REST Framework backend and Next.js frontend, featuring comprehensive analytics and real-time tracking.

## 🚀 Features

- **URL Shortening**: Create custom short links with branded domains
- **Real-time Analytics**: Track clicks, locations, devices, browsers, and referrers
- **Interactive Dashboard**: Modern UI with charts and data visualizations
- **User Management**: Authentication, user profiles, and admin panel
- **QR Code Generation**: Generate QR codes for your shortened links
- **Dark/Light Mode**: Seamless theme switching
- **Responsive Design**: Works perfectly on all devices

## 🏗️ Tech Stack

### Backend
- **Django 4.2.7** - Web framework
- **Django REST Framework** - API development
- **PostgreSQL** - Database
- **Redis** - Caching and real-time features
- **Django Channels** - WebSocket support
- **JWT Authentication** - Secure API authentication

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
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
│   ├── requirements.txt    # Python dependencies
│   └── manage.py          # Django management
├── frontend/               # Next.js frontend
│   ├── app/               # Next.js app directory
│   ├── components/        # React components
│   ├── hooks/            # Custom React hooks
│   ├── config/           # Configuration files
│   └── package.json      # Node.js dependencies
└── README.md             # This file
```

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 18+
- PostgreSQL
- Redis

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

### Render Deployment

The application is configured for deployment on Render:

1. **Backend**: Web Service with PostgreSQL database
2. **Frontend**: Static Site with Next.js build

### Environment Variables

#### Backend (Render)
```bash
DEBUG=False
SECRET_KEY=your-production-secret-key
DATABASE_URL=postgresql://user:password@host/database
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.onrender.com
FRONTEND_URL=https://your-frontend-domain.onrender.com
```

#### Frontend (Render)
```bash
NEXT_PUBLIC_API_URL=https://your-backend-domain.onrender.com
```

## 📊 Analytics Features

- **Real-time Click Tracking**: Monitor link performance instantly
- **Geographic Data**: See where your clicks come from
- **Device Analytics**: Track mobile vs desktop usage
- **Browser Statistics**: Understand user browser preferences
- **Referrer Analysis**: See which sites drive traffic
- **Time-series Data**: View trends over time

## 🔧 API Endpoints

- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - User login
- `GET /api/urls/` - List user's URLs
- `POST /api/urls/` - Create new short URL
- `GET /api/urls/analytics/` - Get analytics data
- `GET /r/{short_code}` - Redirect to original URL

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@saasurl.com or create an issue in the repository.
