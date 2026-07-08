# Attendance Management System - Getting Started Guide

## System Requirements

- **Node.js**: 18.0.0 or higher
- **npm**: 9.0.0 or higher
- **PostgreSQL**: 12.0 or higher
- **Operating System**: Windows, macOS, or Linux

## Installation Steps

### 1. Clone/Setup Project

```bash
cd SAMs
```

### 2. Backend Setup

#### Step 2.1: Install Dependencies

```bash
cd backend
npm install
```

#### Step 2.2: Setup PostgreSQL Database

**On macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**On Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install postgresql
sudo systemctl start postgresql
```

**On Windows:**
Download from https://www.postgresql.org/download/windows/ and install

#### Step 2.3: Create Database

```bash
# Login to PostgreSQL
psql -U postgres

# In psql console:
CREATE DATABASE attendance_db;
CREATE USER attendance_user WITH PASSWORD 'your_secure_password';
ALTER ROLE attendance_user SET client_encoding TO 'utf8';
ALTER ROLE attendance_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE attendance_user SET default_transaction_deferrable TO on;
ALTER ROLE attendance_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE attendance_db TO attendance_user;

# Exit with \q
```

#### Step 2.4: Run Migrations

```bash
psql -U postgres -d attendance_db -f migrations/001_create_tables.sql
```

#### Step 2.5: Setup Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=attendance_db
DB_USER=attendance_user
DB_PASSWORD=your_secure_password

NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000

JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your_super_secret_refresh_key_min_32
JWT_REFRESH_EXPIRE=30d

GOOGLE_MAPS_API_KEY=your_google_api_key

ALLOWED_ORIGINS=http://localhost:3000

BCRYPT_ROUNDS=10
```

#### Step 2.6: Start Backend Server

```bash
npm run dev
```

Expected output:
```
✓ Database connected
🚀 Server is running on port 5000
📍 API URL: http://localhost:5000/api
🔗 Health check: http://localhost:5000/health
```

### 3. Frontend Setup

#### Step 3.1: Install Dependencies

```bash
cd ../frontend
npm install
```

#### Step 3.2: Setup Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_APP_NAME=Attendance Management System
```

#### Step 3.3: Start Frontend Server

```bash
npm run dev
```

The app will automatically open at `http://localhost:3000`

## Testing the Application

### 1. Create a Test Company

```bash
# Connect to PostgreSQL
psql -U attendance_user -d attendance_db

# Insert company
INSERT INTO companies (name, office_latitude, office_longitude, geofence_radius)
VALUES ('Test Company', 40.7128, -74.0060, 500);

# Get the company ID
SELECT id FROM companies WHERE name = 'Test Company';

# Exit
\q
```

### 2. Register a User

1. Open http://localhost:3000
2. Click "Sign up"
3. Fill in the form with:
   - Email: `john@testcompany.com`
   - Password: `SecurePass123!`
   - First Name: `John`
   - Last Name: `Doe`
   - Company ID: (use the UUID from step 1)

### 3. Test Check-in

1. Login with your credentials
2. Allow browser location access
3. Click "Check In"
4. Capture your face when prompted
5. Verify success message

## API Testing with cURL

### Get Health Status

```bash
curl http://localhost:5000/health
```

### Register User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@company.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "companyId": "your-company-uuid"
  }'
```

### Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@company.com",
    "password": "SecurePass123!"
  }'
```

## Development Tools

### Code Formatting

```bash
# Backend
cd backend
npm run lint:fix
npm run format

# Frontend
cd frontend
npm run lint:fix
npm run format
```

### Build for Production

```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

## Troubleshooting

### Issue: "Cannot connect to database"

**Solution:**
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check credentials in `.env`
- Ensure database exists: `psql -U postgres -l`

### Issue: "Port 5000 already in use"

**Solution:**
```bash
# Find process using port
lsof -i :5000

# Kill process
kill -9 <PID>
```

### Issue: "Camera not available"

**Solution:**
- Grant browser permission to access camera
- Check if another app is using the camera
- Restart the browser

### Issue: "Location permission denied"

**Solution:**
- Grant browser permission for location
- Use HTTPS (required for production)
- Ensure geolocation is enabled on device

### Issue: "Face detection fails"

**Solution:**
- Ensure good lighting
- Keep face centered in camera
- Verify face-api models are loaded
- Check browser console for errors

## Project Structure After Setup

```
SAMs/
├── backend/
│   ├── dist/           (generated after build)
│   ├── node_modules/   (generated after npm install)
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── server.ts
│   ├── migrations/
│   ├── .env           (created from .env.example)
│   └── package.json
│
└── frontend/
    ├── dist/          (generated after build)
    ├── node_modules/  (generated after npm install)
    ├── public/
    ├── src/
    │   ├── pages/
    │   ├── components/
    │   ├── services/
    │   ├── stores/
    │   ├── types/
    │   ├── hooks/
    │   ├── utils/
    │   └── App.tsx
    ├── .env.local    (created from .env.example)
    └── package.json
```

## Next Steps

1. ✅ Database setup complete
2. ✅ Backend running at http://localhost:5000
3. ✅ Frontend running at http://localhost:3000
4. 📖 Read [backend/README.md](backend/README.md) for API details
5. 📖 Read [frontend/README.md](frontend/README.md) for component details
6. 🚀 Deploy to production (see Deployment Guide)

## Support & Help

- Backend issues: Check backend logs with `npm run dev`
- Frontend issues: Check browser console (F12)
- Database issues: Use `psql` to debug queries
- API issues: Test with Postman or cURL

## Common Commands

```bash
# Backend
npm run dev          # Development mode with auto-reload
npm run build        # Build for production
npm start           # Start production build
npm run lint        # Check code style
npm test            # Run tests

# Frontend
npm run dev         # Development mode
npm run build       # Build for production
npm run preview     # Preview production build
npm run lint        # Check code style
npm run format      # Format code
```

---

**Setup complete! You're ready to develop. 🎉**
