import { Request, Response } from 'express';
import { AttendanceService } from '../services/attendance.service';

export class AttendanceController {
  /**
   * Check-in
   */
  static async checkIn(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { latitude, longitude, accuracy, faceDescriptor, faceImagePath } = req.body;

      const record = await AttendanceService.checkIn({
        userId: req.user.id,
        latitude,
        longitude,
        accuracy,
        faceDescriptor,
        faceImagePath,
      });

      res.status(201).json({
        message: 'Check-in successful',
        record,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Check-out
   */
  static async checkOut(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const record = await AttendanceService.checkOut(req.user.id);

      res.json({
        message: 'Check-out successful',
        record,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Get the caller's current (active) check-in status
   */
  static async getCurrentStatus(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const record = await AttendanceService.getCurrentStatus(req.user.id);
      res.json({ active: record });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get today's attendance stats
   */
  static async getTodayStats(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const stats = await AttendanceService.getTodayStats(req.user.companyId);

      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get attendance history
   */
  static async getHistory(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { startDate, endDate } = req.query;
      const history = await AttendanceService.getAttendanceHistory(
        req.user.id,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get employee attendance (manager view)
   */
  static async getEmployeeAttendance(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || !['manager', 'admin'].includes(req.user.role)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      const { employeeId, startDate, endDate } = req.query;
      const attendance = await AttendanceService.getAttendanceHistory(
        employeeId as string,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json(attendance);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
