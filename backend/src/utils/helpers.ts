import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';

// UUID generation
export const generateId = (): string => {
  return uuidv4();
};

// File upload configuration
const uploadDir = process.env.UPLOAD_DIR || './uploads';

export const uploadConfig = multer({
  dest: uploadDir,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB default
  },
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

// Date utilities
export const getStartOfDay = (date: Date = new Date()): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const getEndOfDay = (date: Date = new Date()): Date => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

export const getWeekRange = (date: Date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  
  const startDate = new Date(d.setDate(diff));
  const endDate = new Date(d.setDate(diff + 6));
  
  return { startDate: getStartOfDay(startDate), endDate: getEndOfDay(endDate) };
};

export const getMonthRange = (date: Date = new Date()) => {
  const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
  const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  
  return { startDate: getStartOfDay(startDate), endDate: getEndOfDay(endDate) };
};

// Email validation (simple)
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone validation
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
  return phoneRegex.test(phone);
};
