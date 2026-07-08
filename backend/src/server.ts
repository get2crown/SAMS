import dotenv from 'dotenv';

// Must run before any other local import — several modules (e.g. database.ts)
// read process.env at import time to build their config.
dotenv.config();

import express, { Request, Response, NextFunction, Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes';
import attendanceRoutes from './routes/attendance.routes';
import biometricRoutes from './routes/biometric.routes';
import analyticsRoutes from './routes/analytics.routes';
import employeeRoutes from './routes/employee.routes';
import companyRoutes from './routes/company.routes';
import adminRoutes from './routes/admin.routes';
import geocodeRoutes from './routes/geocode.routes';

const app: Application = express();
const PORT: number = parseInt(process.env.PORT as string, 10) || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (_req: Request, res: Response): void => {
  res.json({
    name: 'Attendance Management System API',
    version: '1.0.0',
    status: 'active'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/biometric', biometricRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/geocode', geocodeRoutes);

// 404 handler
app.use((_req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler (4-arg signature required for Express to recognize it)
app.use((err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Start server
app.listen(PORT, (): void => {
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`📍 API URL: http://localhost:${PORT}/api/health`);
});