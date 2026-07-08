import { Request, Response } from 'express';
import { query, pool } from '../config/database';
import { AuthService } from '../services/auth.service';

export class AuthController {
  /**
   * User registration.
   *
   * Two modes:
   *  - Join an existing company: pass `companyId`. New user becomes an 'employee'.
   *  - Create a new company: pass `companyName` + `officeLatitude`/`officeLongitude`
   *    (optionally `geofenceRadius`). New user becomes that company's 'admin' —
   *    this is how a first deploy gets a company + admin account without touching SQL.
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const {
        email,
        password,
        firstName,
        lastName,
        phone,
        companyId,
        companyName,
        officeLatitude,
        officeLongitude,
        geofenceRadius,
      } = req.body;

      const isCreatingCompany = !companyId;

      if (isCreatingCompany && (!companyName || officeLatitude === undefined || officeLongitude === undefined)) {
        res.status(400).json({
          error: 'Provide a companyId to join an existing company, or companyName + officeLatitude + officeLongitude to create a new one.',
        });
        return;
      }

      // Check if user exists
      const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length) {
        res.status(400).json({ error: 'Email already registered' });
        return;
      }

      const hashedPassword = await AuthService.hashPassword(password);

      const client = await pool.connect();
      let user;
      let resolvedCompanyId = companyId;
      const role = isCreatingCompany ? 'admin' : 'employee';

      try {
        await client.query('BEGIN');

        if (isCreatingCompany) {
          const companyResult = await client.query(
            `INSERT INTO companies (name, office_latitude, office_longitude, geofence_radius)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [companyName, officeLatitude, officeLongitude, geofenceRadius || 500]
          );
          resolvedCompanyId = companyResult.rows[0].id;
        } else {
          const companyCheck = await client.query('SELECT id FROM companies WHERE id = $1', [companyId]);
          if (!companyCheck.rows.length) {
            throw new Error('Company not found');
          }
        }

        const userResult = await client.query(
          `INSERT INTO users (email, password, first_name, last_name, phone, company_id, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, email, first_name, last_name, role`,
          [email, hashedPassword, firstName, lastName, phone, resolvedCompanyId, role]
        );
        user = userResult.rows[0];

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      const accessToken = AuthService.generateAccessToken({
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: resolvedCompanyId,
      });

      const refreshToken = AuthService.generateRefreshToken({
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: resolvedCompanyId,
      });

      res.status(201).json({
        message: 'User registered successfully',
        user,
        accessToken,
        refreshToken,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * User login
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Find user
      const result = await query(
        `SELECT id, email, password, first_name, last_name, company_id, role 
         FROM users WHERE email = $1`,
        [email]
      );

      if (!result.rows.length) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const user = result.rows[0];

      // Verify password
      const isValidPassword = await AuthService.comparePassword(password, user.password);
      if (!isValidPassword) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      // Generate tokens
      const accessToken = AuthService.generateAccessToken({
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: user.company_id,
      });

      const refreshToken = AuthService.generateRefreshToken({
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: user.company_id,
      });

      // Log login
      await query(
        `INSERT INTO user_sessions (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
        [user.id, refreshToken]
      );

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
        },
        accessToken,
        refreshToken,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({ error: 'Refresh token required' });
        return;
      }

      const payload = AuthService.verifyRefreshToken(refreshToken);
      if (!payload) {
        res.status(401).json({ error: 'Invalid refresh token' });
        return;
      }

      const newAccessToken = AuthService.generateAccessToken(payload);

      res.json({
        accessToken: newAccessToken,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get current user
   */
  static async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await query(
        `SELECT id, email, first_name, last_name, phone, role, avatar_path,
                (face_enrolled_at IS NOT NULL) AS "faceEnrolled"
         FROM users WHERE id = $1`,
        [req.user.id]
      );

      if (!result.rows.length) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json(result.rows[0]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Logout
   */
  static async logout(req: Request, res: Response) {
    try {
      if (req.user) {
        await query('DELETE FROM user_sessions WHERE user_id = $1', [req.user.id]);
      }

      res.json({ message: 'Logout successful' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
