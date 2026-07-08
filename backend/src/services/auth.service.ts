import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export interface TokenPayload {
  id: string;
  email: string;
  role: 'super_admin' | 'admin' | 'manager' | 'employee';
  companyId: string;
}

export class AuthService {
  static generateAccessToken(payload: TokenPayload): string {
    const options: SignOptions = { expiresIn: (process.env.JWT_EXPIRE || '7d') as SignOptions['expiresIn'] };
    return jwt.sign(payload, process.env.JWT_SECRET || 'secret', options);
  }

  static generateRefreshToken(payload: TokenPayload): string {
    const options: SignOptions = {
      expiresIn: (process.env.JWT_REFRESH_EXPIRE || '30d') as SignOptions['expiresIn'],
    };
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'refresh_secret', options);
  }

  static verifyAccessToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, process.env.JWT_SECRET || 'secret') as TokenPayload;
    } catch (error) {
      return null;
    }
  }

  static verifyRefreshToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'refresh_secret') as TokenPayload;
    } catch (error) {
      return null;
    }
  }

  static async hashPassword(password: string): Promise<string> {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
    return bcrypt.hash(password, rounds);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
