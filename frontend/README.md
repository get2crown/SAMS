# Frontend - Attendance Management System

Professional React + TypeScript frontend for attendance management system.

## Features

- **User Authentication**: Secure login and registration with JWT tokens
- **Check-in/Check-out**: Geolocation-based attendance tracking
- **Facial Recognition**: Face verification using face-api.js
- **Real-time Location**: GPS accuracy monitoring and geofence validation
- **Responsive Design**: Mobile-friendly UI with Tailwind CSS
- **State Management**: Zustand for global state
- **API Integration**: Axios with automatic token refresh

## Installation

```bash
npm install
```

## Environment Setup

```bash
cp .env.example .env.local
```

Update `.env.local` with your configuration:

```
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_MAPS_API_KEY=your_key
```

## Development

```bash
npm run dev
```

The app will open at `http://localhost:3000`

## Build

```bash
npm run build
```

## Key Components

- **LoginPage**: User authentication
- **RegisterPage**: User registration
- **DashboardPage**: Main attendance interface
- **CameraCheckIn**: Facial recognition modal
- **LocationStatus**: GPS status display
- **Header**: Navigation and user menu

## Services

- **apiClient**: REST API communication
- **BiometricService**: Face detection and verification
- **GeolocationService**: GPS location tracking

## State Management

- **useAuthStore**: Authentication state (Zustand)

## Technologies

- React 18
- TypeScript
- Tailwind CSS
- Vite
- Zustand
- face-api.js
- Axios
