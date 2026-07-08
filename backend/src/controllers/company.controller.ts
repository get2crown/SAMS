import { Request, Response } from 'express';
import { query } from '../config/database';

const COMPANY_FIELDS = `id, name, office_latitude, office_longitude, geofence_radius, late_arrival_cutoff, timezone`;

export class CompanyController {
  static async getMine(req: Request, res: Response): Promise<void> {
    try {
      const result = await query(`SELECT ${COMPANY_FIELDS} FROM companies WHERE id = $1`, [
        req.user!.companyId,
      ]);
      if (!result.rows.length) {
        res.status(404).json({ error: 'Company not found' });
        return;
      }
      res.json(result.rows[0]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateMine(req: Request, res: Response): Promise<void> {
    try {
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
        [name, officeLatitude, officeLongitude, geofenceRadius, lateArrivalCutoff, req.user!.companyId]
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
}
