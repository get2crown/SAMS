import { Request, Response } from 'express';
import { query } from '../config/database';
import { AuthService } from '../services/auth.service';

const COMPANY_FIELDS = `id, name, office_latitude, office_longitude, geofence_radius, late_arrival_cutoff, timezone, created_at`;
const USER_FIELDS = `id, employee_code, first_name, last_name, email, phone, department, position,
  hire_date, role, is_active, company_id, (face_enrolled_at IS NOT NULL) AS "faceEnrolled"`;

/**
 * Platform-wide administration — every endpoint here is scoped only to
 * super_admin (see admin.routes.ts) and deliberately ignores the caller's
 * own company_id, unlike CompanyController/EmployeeController which are
 * always scoped to req.user.companyId.
 */
export class AdminController {
  static async listCompanies(_req: Request, res: Response): Promise<void> {
    try {
      const result = await query(
        `SELECT
           c.id, c.name, c.office_latitude, c.office_longitude, c.geofence_radius,
           c.late_arrival_cutoff, c.timezone, c.created_at,
           COUNT(u.id) FILTER (WHERE u.is_active) as employee_count
         FROM companies c
         LEFT JOIN users u ON u.company_id = c.id
         GROUP BY c.id
         ORDER BY c.created_at`
      );
      res.json(result.rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateCompany(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, officeLatitude, officeLongitude, geofenceRadius, lateArrivalCutoff } = req.body;

      if (lateArrivalCutoff && !/^\d{2}:\d{2}(:\d{2})?$/.test(lateArrivalCutoff)) {
        res.status(400).json({ error: 'lateArrivalCutoff must be in HH:MM format' });
        return;
      }

      const result = await query(
        `UPDATE companies SET
           name = COALESCE($1, name),
           office_latitude = COALESCE($2, office_latitude),
           office_longitude = COALESCE($3, office_longitude),
           geofence_radius = COALESCE($4, geofence_radius),
           late_arrival_cutoff = COALESCE($5, late_arrival_cutoff)
         WHERE id = $6
         RETURNING ${COMPANY_FIELDS}`,
        [name, officeLatitude, officeLongitude, geofenceRadius, lateArrivalCutoff, id]
      );

      if (!result.rows.length) {
        res.status(404).json({ error: 'Company not found' });
        return;
      }

      res.json(result.rows[0]);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async listCompanyUsers(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await query(
        `SELECT ${USER_FIELDS} FROM users WHERE company_id = $1 ORDER BY created_at`,
        [id]
      );
      res.json(result.rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { firstName, lastName, phone, department, position, hireDate, employeeCode, password, role, isActive } =
        req.body;

      const existing = await query('SELECT id FROM users WHERE id = $1', [id]);
      if (!existing.rows.length) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      if (role !== undefined && !['employee', 'manager', 'admin', 'super_admin'].includes(role)) {
        res.status(400).json({ error: 'role must be one of employee, manager, admin, super_admin' });
        return;
      }

      if (password) {
        if (password.length < 8) {
          res.status(400).json({ error: 'Password must be at least 8 characters' });
          return;
        }
        const hashedPassword = await AuthService.hashPassword(password);
        await query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, id]);
      }

      const result = await query(
        `UPDATE users SET
           first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           phone = COALESCE($3, phone),
           department = COALESCE($4, department),
           position = COALESCE($5, position),
           hire_date = COALESCE($6, hire_date),
           employee_code = COALESCE($7, employee_code),
           role = COALESCE($8, role),
           is_active = COALESCE($9, is_active),
           updated_at = NOW()
         WHERE id = $10
         RETURNING ${USER_FIELDS}`,
        [firstName, lastName, phone, department, position, hireDate, employeeCode, role, isActive, id]
      );

      res.json(result.rows[0]);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
