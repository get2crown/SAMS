import { Request, Response, NextFunction } from 'express';
import validator from 'validator';

export interface ValidationRules {
  [key: string]: {
    required?: boolean;
    type?: string;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: any) => boolean | string;
  };
}

export const validateRequest = (rules: ValidationRules) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: { [key: string]: string } = {};
    const data = { ...req.body, ...req.params, ...req.query };

    for (const field in rules) {
      const rule = rules[field];
      const value = data[field];

      // Check required
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors[field] = `${field} is required`;
        continue;
      }

      if (!value) continue;

      // Check type
      if (rule.type) {
        const valueType = Array.isArray(value) ? 'array' : typeof value;
        if (valueType !== rule.type) {
          errors[field] = `${field} must be of type ${rule.type}`;
          continue;
        }
      }

      // Check length
      if (rule.minLength && value.length < rule.minLength) {
        errors[field] = `${field} must be at least ${rule.minLength} characters`;
        continue;
      }

      if (rule.maxLength && value.length > rule.maxLength) {
        errors[field] = `${field} must be at most ${rule.maxLength} characters`;
        continue;
      }

      // Check pattern
      if (rule.pattern && !rule.pattern.test(value)) {
        errors[field] = `${field} format is invalid`;
        continue;
      }

      // Custom validation
      if (rule.custom) {
        const result = rule.custom(value);
        if (result !== true) {
          errors[field] = typeof result === 'string' ? result : `${field} is invalid`;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      res.status(400).json({ errors });
      return;
    }

    next();
  };
};

// Common validators
export const validators = {
  email: (value: string) => validator.isEmail(value) || 'Invalid email',
  password: (value: string) => {
    const hasMinLength = value.length >= 8;
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumbers = /\d/.test(value);

    if (!hasMinLength || !hasUpperCase || !hasLowerCase || !hasNumbers) {
      return 'Password must be at least 8 characters with uppercase, lowercase, and numbers';
    }
    return true;
  },
  phone: (value: string) => validator.isMobilePhone(value) || 'Invalid phone number',
  latitude: (value: any) => {
    const num = parseFloat(value);
    return (num >= -90 && num <= 90) || 'Invalid latitude';
  },
  longitude: (value: any) => {
    const num = parseFloat(value);
    return (num >= -180 && num <= 180) || 'Invalid longitude';
  },
};
