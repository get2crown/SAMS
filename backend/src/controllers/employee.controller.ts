import { Request, Response } from 'express';
import { query } from '../config/database';
import { AuthService } from '../services/auth.service';

const EMPLOYEE_FIELDS = `id, employee_code, first_name, last_name, email, phone, department, position,
  hire_date, role, is_active, (face_enrolled_at IS NOT NULL) AS "faceEnrolled"`;

export class EmployeeController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const result = await query(
        `SELECT ${EMPLOYEE_FIELDS} FROM users WHERE company_id = $1 AND is_active = true ORDER BY created_at`,
        [req.user!.companyId]
      );
      res.json(result.rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const {
        employeeCode,
        firstName,
        lastName,
        email,
        phone,
        department,
        position,
        hireDate,
        password,
        role,
      } = req.body;

      if (!email || !password || !firstName || !lastName) {
        res.status(400).json({ error: 'email, password, firstName and lastName are required' });
        return;
      }

      if (password.length < 8) {
        res.status(400).json({ error: 'Password must be at least 8 characters' });
        return;
      }

      const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length) {
        res.status(400).json({ error: 'Email already registered' });
        return;
      }

      const assignedRole = role === 'manager' ? 'manager' : 'employee';
      const hashedPassword = await AuthService.hashPassword(password);

      const result = await query(
        `INSERT INTO users
           (email, password, first_name, last_name, phone, company_id, role, employee_code, department, position, hire_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING ${EMPLOYEE_FIELDS}`,
        [
          email,
          hashedPassword,
          firstName,
          lastName,
          phone || null,
          req.user!.companyId,
          assignedRole,
          employeeCode || null,
          department || null,
          position || null,
          hireDate || null,
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { firstName, lastName, phone, department, position, hireDate, employeeCode, password, role } =
        req.body;

      const existing = await query('SELECT id, role FROM users WHERE id = $1 AND company_id = $2', [
        id,
        req.user!.companyId,
      ]);
      if (!existing.rows.length) {
        res.status(404).json({ error: 'Employee not found' });
        return;
      }

      // Changing a role (elevating/demoting privileges) is admin-only —
      // a manager can edit an employee's details but not grant access.
      let nextRole: string | undefined;
      if (role !== undefined) {
        if (req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
          res.status(403).json({ error: 'Only an admin can change a user’s role' });
          return;
        }
        if (!['employee', 'manager', 'admin'].includes(role)) {
          res.status(400).json({ error: 'role must be one of employee, manager, admin' });
          return;
        }
        if (id === req.user!.id && role !== 'admin') {
          res.status(400).json({ error: 'You cannot remove your own admin access' });
          return;
        }
        nextRole = role;
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
           updated_at = NOW()
         WHERE id = $9
         RETURNING ${EMPLOYEE_FIELDS}`,
        [firstName, lastName, phone, department, position, hireDate, employeeCode, nextRole, id]
      );

      res.json(result.rows[0]);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async remove(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const result = await query(
        `UPDATE users SET is_active = false WHERE id = $1 AND company_id = $2 RETURNING id`,
        [id, req.user!.companyId]
      );

      if (!result.rows.length) {
        res.status(404).json({ error: 'Employee not found' });
        return;
      }

      res.json({ message: 'Employee deactivated' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
