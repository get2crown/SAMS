# System Architecture

## Overview

Professional Attendance Management System built with modern web technologies, focusing on security, scalability, and user experience.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ • Login/Register Pages                                 │ │
│  │ • Dashboard (Check-in/Check-out)                       │ │
│  │ • Attendance History                                   │ │
│  │ • Real-time Location Status                            │ │
│  │ • Facial Recognition Modal (Camera)                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                             ↓ HTTPS                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Backend (Express.js)                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Authentication Routes                                  │ │
│  │  • /auth/register                                      │ │
│  │  • /auth/login                                         │ │
│  │  • /auth/refresh                                       │ │
│  │  • /auth/me                                            │ │
│  └────────────────────────────────────────────────────────┘ │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Attendance Routes (Requires Auth)                      │ │
│  │  • /attendance/check-in                                │ │
│  │  • /attendance/check-out                               │ │
│  │  • /attendance/history                                 │ │
│  │  • /attendance/stats/today                             │ │
│  └────────────────────────────────────────────────────────┘ │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Services Layer                                         │ │
│  │  • AuthService (JWT, password hashing)                │ │
│  │  • AttendanceService (check-in logic)                 │ │
│  │  • GeolocationService (distance calc)                 │ │
│  │  • BiometricService (face verification)              │ │
│  └────────────────────────────────────────────────────────┘ │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Middleware                                             │ │
│  │  • JWT Authentication                                 │ │
│  │  • Role-based Access Control                          │ │
│  │  • Input Validation                                   │ │
│  │  • Error Handling                                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                          ↓                                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  PostgreSQL Database                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Tables:                                                │ │
│  │  • users                                               │ │
│  │  • companies                                           │ │
│  │  • attendance_records                                  │ │
│  │  • user_sessions                                       │ │
│  │  • geofence_exceptions                                │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Indexes on:                                                │
│  • users.company_id, users.email                            │
│  • attendance_records.user_id, check_in_time, status       │
│  • user_sessions.user_id, expires_at                        │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow - Check-in Process

```
1. User Opens Browser
        ↓
2. Frontend Requests Location Permission
        ↓
3. Browser Provides GPS Coordinates
        ↓
4. Frontend Validates GPS Accuracy (< 50m)
        ↓
5. User Clicks "Check In"
        ↓
6. Frontend Opens Camera Modal
        ↓
7. Browser Accesses Camera
        ↓
8. face-api.js Detects Face
        ↓
9. Frontend Captures Face Image & Descriptor
        ↓
10. Frontend Sends Check-in Request (JWT Auth)
        ↓
11. Backend Validates Geofence (Haversine Formula)
        ↓
12. Backend Validates GPS Accuracy
        ↓
13. Backend Checks for Duplicate Check-ins
        ↓
14. Backend Prevents Buddy Sign-in (Session Cache)
        ↓
15. Backend Validates Face Score (> 70%)
        ↓
16. Backend Inserts Attendance Record
        ↓
17. Backend Caches Session (Prevent Buddy Check-in)
        ↓
18. Backend Returns Success Response
        ↓
19. Frontend Updates UI (Shows Check-out Button)
        ↓
20. User Sees Success Message
```

## Security Layers

### Frontend Security
- JWT token storage in localStorage
- Automatic token refresh on 401
- CORS validation
- GPS accuracy validation
- Face recognition validation

### Backend Security
- bcrypt password hashing (10 rounds)
- JWT signature verification
- Rate limiting (100 req/15min)
- Input validation & sanitization
- SQL injection prevention (parameterized queries)
- CORS headers
- Helmet.js security headers

### Database Security
- Referential integrity (Foreign Keys)
- User isolation per company
- Encrypted password storage
- Session token hashing
- Indexed queries for performance

## Scalability Considerations

### Horizontal Scaling
- Database: PostgreSQL connection pooling
- Backend: Multiple instance support with load balancer
- Frontend: Static file distribution (CDN)

### Performance
- Database indexing on frequently queried columns
- Session caching (node-cache) for buddy sign-in prevention
- Lazy loading of components
- API response caching

### Monitoring
- PM2 process management
- Database slow query logging
- Nginx access/error logs
- Application error tracking

## Integration Points

### Google Maps API
- Reverse geocoding (lat/long → address)
- Geographic distance calculation
- Map display (future enhancement)

### Face-api.js
- Face detection
- Face descriptor generation
- Face comparison/verification
- Runs client-side (privacy-focused)

## Deployment Architecture

```
Internet
    ↓
Firewall (Port 80, 443)
    ↓
Nginx (Reverse Proxy + Load Balancer)
    ├── SSL/TLS Termination
    └── Static File Serving
    ↓
Node.js App Instances (PM2 Manager)
    ├── Instance 1 (Port 5001)
    ├── Instance 2 (Port 5002)
    └── Instance N (Port 500N)
    ↓
PostgreSQL Database (Connection Pooling)
    └── Automatic Backups
```

---

**System Architecture Complete**
