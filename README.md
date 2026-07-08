# Attendance Management System

A professional, production-ready attendance management system with geofencing, facial recognition, and buddy sign-in prevention.

## Project Overview

This is a full-stack application designed for companies with 20-100 employees. It provides:

- ✅ Geolocation-based attendance tracking
- ✅ Facial recognition (biometrics) for identity verification
- ✅ Prevent buddy sign-in with session management
- ✅ Real-time location monitoring
- ✅ Manager/Admin dashboards
- ✅ Comprehensive attendance reports
- ✅ GPS accuracy validation
- ✅ Advanced analytics and reporting
- ✅ Payroll system integration (CSV export)

## Tech Stack

### Frontend
- **React** 18 with TypeScript
- **Tailwind CSS** for styling
- **Vite** for fast development
- **Zustand** for state management
- **face-api.js** for facial recognition
- **Axios** for API calls

### Backend
- **Node.js** with Express.js
- **TypeScript** for type safety
- **PostgreSQL** for database
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Helmet.js** for security

## Project Structure

```
SAMs/
├── backend/
│   ├── src/
│   │   ├── config/       # Database configuration
│   │   ├── controllers/  # Request handlers (auth, attendance, analytics)
│   │   ├── middleware/   # Auth, validation, error handling
│   │   ├── routes/       # API routes (auth, attendance, analytics)
│   │   ├── services/     # Business logic (auth, attendance, analytics)
│   │   └── server.ts     # Entry point
│   ├── migrations/       # Database migrations
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components (Dashboard, Reports)
│   │   ├── services/     # API client services
│   │   ├── stores/       # Zustand state management
│   │   ├── types/        # TypeScript type definitions
│   │   └── utils/        # Utility functions
│   ├── package.json
│   ├── vite.config.ts
│   └── index.html
```

## Analytics & Reporting Features

The system provides comprehensive analytics for managers and administrators:

### Company Overview
- Total employees and check-in statistics
- Hours worked and productivity metrics
- Late arrival tracking and absence reporting
- Average check-in/check-out times

### Visual Reports
- Daily check-in trends (bar charts)
- Hours worked over time (line charts)
- Employee performance comparisons
- Date range filtering with presets

### Payroll Integration
- CSV export functionality for payroll systems
- Includes employee details, dates, hours worked, and status
- Compatible with standard payroll software

### Access Control
- Analytics features available to managers and admins only
- Secure API endpoints with role-based permissions
│   └── README.md
│
└── frontend/
    ├── src/
    │   ├── pages/        # Page components
    │   ├── components/   # Reusable components
    │   ├── services/     # API & utilities
    │   ├── stores/       # Zustand stores
    │   ├── types/        # TypeScript types
    │   ├── hooks/        # Custom hooks
    │   └── App.tsx       # Main app
    ├── public/           # Static assets
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.ts
    └── README.md
```

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Update .env with your database credentials

# Create database and run migrations
# See backend/README.md for detailed steps

# Start development server
npm run dev
```

Backend runs on: `http://localhost:5000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local

# Start development server
npm run dev
```

Frontend runs on: `http://localhost:3000`

## Key Features

### 1. Geofencing & Location Validation
- Real-time GPS monitoring
- Haversine formula for distance calculation
- Accuracy threshold validation
- Prevent check-in outside office radius

### 2. Facial Recognition
- Client-side face detection using face-api.js
- TensorFlow.js integration
- Face descriptor comparison
- 70% similarity threshold for verification

### 3. Buddy Sign-in Prevention
- Node-cache for session tracking
- One active session per device
- Automatic session cleanup
- Device fingerprinting

### 4. Authentication & Security
- JWT with 7-day expiration
- Refresh tokens with 30-day expiration
- bcrypt password hashing
- Role-based access control (RBAC)
- Rate limiting
- CORS configuration

### 5. Database Design
- Optimized queries with proper indexing
- Referential integrity
- Audit timestamps
- Support for 100+ employees

## API Documentation

### Authentication Endpoints

**Register User**
```
POST /api/auth/register
{
  "email": "user@company.com",
  "password": "Password123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "companyId": "uuid"
}
```

**Login**
```
POST /api/auth/login
{
  "email": "user@company.com",
  "password": "Password123!"
}
```

**Get Current User**
```
GET /api/auth/me
Authorization: Bearer TOKEN
```

### Attendance Endpoints

**Check In**
```
POST /api/attendance/check-in
Authorization: Bearer TOKEN
{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "accuracy": 25,
  "faceMatchScore": 95,
  "faceImagePath": "base64_encoded_image"
}
```

**Check Out**
```
POST /api/attendance/check-out
Authorization: Bearer TOKEN
```

**Get Attendance History**
```
GET /api/attendance/history?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer TOKEN
```

## Deployment

### Backend Deployment (Self-hosted VPS)

1. **VPS Setup**
   ```bash
   # Install Node.js and PostgreSQL
   # Clone repository
   # Setup environment variables
   # Install dependencies: npm install
   # Build: npm run build
   # Start: npm start (use PM2 for process management)
   ```

2. **Using PM2**
   ```bash
   npm install -g pm2
   pm2 start dist/server.js --name "attendance-api"
   pm2 save
   ```

3. **Nginx Reverse Proxy**
   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
       }
   }
   ```

### Frontend Deployment

1. **Build**
   ```bash
   npm run build
   ```

2. **Host on Nginx**
   ```bash
   # Copy dist/ to /var/www/attendance
   # Use nginx to serve static files
   ```

## Future Enhancements

- [ ] Mobile app (React Native)
- [ ] Real-time location tracking using WebSockets
- [ ] Advanced analytics and reporting
- [ ] Integration with payroll systems
- [ ] Email notifications
- [ ] Multi-language support
- [ ] Two-factor authentication
- [ ] Offline mode with sync


## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support & Documentation

- Backend: See [backend/README.md](./backend/README.md)
- Frontend: See [frontend/README.md](./frontend/README.md)

## Contact

For inquiries about implementing this system, please contact the development team.

---

**Built with ❤️ for professional attendance management**
