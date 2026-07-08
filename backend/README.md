# Attendance Management System - Backend

Professional Node.js + Express + PostgreSQL backend for attendance management system.

## Features

- **JWT Authentication**: Secure token-based authentication with refresh tokens
- **Geolocation Validation**: Haversine formula for GPS-based geofence checking
- **Facial Recognition**: Integration-ready for face-api.js biometric verification
- **Buddy Sign-in Prevention**: Session caching to prevent multiple check-ins
- **Role-Based Access**: Admin, Manager, Employee roles with different permissions
- **Rate Limiting**: DDoS protection with express-rate-limit
- **Security**: Helmet.js for security headers, bcrypt for password hashing
- **Database**: PostgreSQL with proper indexing and migrations

## Installation

```bash
npm install
```

## Environment Setup

```bash
cp .env.example .env
```

Update `.env` with your configuration:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=attendance_db
DB_USER=postgres
DB_PASSWORD=password

NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000

JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRE=30d

GOOGLE_MAPS_API_KEY=your_key
```

## Database Setup

### PostgreSQL Installation

#### macOS
```bash
brew install postgresql
brew services start postgresql
```

#### Ubuntu/Debian
```bash
sudo apt-get install postgresql
sudo systemctl start postgresql
```

#### Windows
Download and install from https://www.postgresql.org/download/windows/

### Initialize Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE attendance_db;

# Connect to the database
\c attendance_db

# Run migrations
psql -U postgres -d attendance_db -f migrations/001_create_tables.sql
```

## Development

```bash
npm run dev
```

Server will run on `http://localhost:5000`

## Build & Production

```bash
npm run build
npm start
```

## API Endpoints

### Authentication

- **POST** `/api/auth/register` - Register new user
- **POST** `/api/auth/login` - Login user
- **POST** `/api/auth/refresh` - Refresh access token
- **GET** `/api/auth/me` - Get current user (requires auth)
- **POST** `/api/auth/logout` - Logout user

### Attendance

- **POST** `/api/attendance/check-in` - Check in (requires auth, location & biometric)
- **POST** `/api/attendance/check-out` - Check out (requires auth)
- **GET** `/api/attendance/stats/today` - Today's stats (manager/admin only)
- **GET** `/api/attendance/history?startDate=&endDate=` - Personal history
- **GET** `/api/attendance/employee/:employeeId/history` - Employee history (manager/admin)

## Request Examples

### Register
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "john@company.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "companyId": "company-uuid"
}
```

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@company.com",
  "password": "SecurePass123!"
}
```

### Check-in
```bash
POST /api/attendance/check-in
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "accuracy": 25,
  "faceMatchScore": 95,
  "faceImagePath": "data:image/jpeg;base64,..."
}
```

## Architecture

### Directory Structure

```
src/
├── config/        # Configuration files (database, etc)
├── controllers/   # Request handlers
├── middleware/    # Custom middleware (auth, validation, etc)
├── models/        # Data models (if using ORM)
├── routes/        # API routes
├── services/      # Business logic
├── types/         # TypeScript types (if needed)
├── utils/         # Utility functions
└── server.ts      # Main entry point
```

### Key Services

- **AuthService**: JWT tokens, password hashing, token verification
- **GeolocationService**: Distance calculation, geofence validation, geocoding
- **AttendanceService**: Check-in/out logic, buddy sign-in prevention, stats

## Security

- ✓ Password hashing with bcrypt (10 rounds)
- ✓ JWT with signature verification
- ✓ CORS configuration
- ✓ Rate limiting (100 requests per 15 minutes)
- ✓ Helmet.js security headers
- ✓ SQL injection protection via parameterized queries
- ✓ Input validation on all endpoints

## Performance

- Database indexing on frequently queried columns
- Connection pooling for database
- Efficient geofence calculation using Haversine formula
- Caching for session management (prevent buddy sign-in)

## Technologies

- Node.js 18+
- Express.js
- TypeScript
- PostgreSQL
- JWT (jsonwebtoken)
- bcryptjs
- axios
- node-cache

## Deployment

### Environment Variables for Production

```
NODE_ENV=production
DB_HOST=your-db-host
DB_PORT=5432
JWT_SECRET=very-long-random-secret
ALLOWED_ORIGINS=https://your-domain.com
```

### Docker (Optional)

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 5000
CMD ["node", "dist/server.js"]
```

Build and run:

```bash
docker build -t attendance-system .
docker run -p 5000:5000 --env-file .env attendance-system
```

## Testing

```bash
npm run test
```

## Troubleshooting

### Database Connection Error
- Ensure PostgreSQL is running
- Check DB credentials in .env
- Verify database exists

### CORS Error
- Check ALLOWED_ORIGINS in .env
- Ensure frontend URL matches

### Token Expiration
- Implement refresh token endpoint on frontend
- Token auto-refresh on 401 response

## Support

For issues and questions, please check the database and ensure all environment variables are set correctly.
