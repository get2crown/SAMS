import { query } from '../config/database';

export interface AnalyticsFilters {
  companyId: string;
  startDate: Date;
  endDate: Date;
  userId?: string;
}

export interface AttendanceStats {
  totalEmployees: number;
  totalCheckIns: number;
  totalHoursWorked: number;
  averageHoursPerDay: number;
  lateArrivals: number;
  absences: number;
  averageCheckInTime: string;
  averageCheckOutTime: string;
}

export interface EmployeeStats {
  userId: string;
  firstName: string;
  lastName: string;
  totalHours: number;
  averageHoursPerDay: number;
  lateCount: number;
  absenceCount: number;
  checkInCount: number;
}

export interface DailyStats {
  date: string;
  totalCheckIns: number;
  totalHours: number;
  lateArrivals: number;
  absences: number;
}

export class AnalyticsService {
  /**
   * Get comprehensive attendance statistics for a company
   */
  static async getCompanyStats(filters: AnalyticsFilters): Promise<AttendanceStats> {
    const { companyId, startDate, endDate } = filters;
    const lateCutoff = await this.getLateCutoff(companyId);

    // Get total employees in company
    const employeesResult = await query(
      'SELECT COUNT(*) as count FROM users WHERE company_id = $1 AND is_active = true',
      [companyId]
    );
    const totalEmployees = parseInt(employeesResult.rows[0].count);

    // Get attendance data
    const attendanceResult = await query(
      `SELECT
        COUNT(ar.id) as total_checkins,
        SUM(EXTRACT(EPOCH FROM (ar.check_out_time - ar.check_in_time))/3600) as total_hours,
        AVG(EXTRACT(EPOCH FROM (ar.check_out_time - ar.check_in_time))/3600) as avg_hours_per_day,
        COUNT(CASE WHEN ar.check_in_time::time >= $4::time THEN 1 END) as late_arrivals,
        AVG(EXTRACT(HOUR FROM ar.check_in_time) * 60 + EXTRACT(MINUTE FROM ar.check_in_time)) as avg_checkin_minutes,
        AVG(EXTRACT(HOUR FROM ar.check_out_time) * 60 + EXTRACT(MINUTE FROM ar.check_out_time)) as avg_checkout_minutes
       FROM attendance_records ar
       JOIN users u ON ar.user_id = u.id
       WHERE u.company_id = $1
       AND ar.check_in_time >= $2
       AND ar.check_in_time <= $3
       AND ar.check_out_time IS NOT NULL`,
      [companyId, startDate, endDate, lateCutoff]
    );

    const data = attendanceResult.rows[0];

    // Calculate absences (working days without check-in)
    const workingDays = this.calculateWorkingDays(startDate, endDate);
    const absences = Math.max(0, totalEmployees * workingDays - parseInt(data.total_checkins || 0));

    // Convert average minutes to time format
    const avgCheckInTime = this.minutesToTimeString(data.avg_checkin_minutes);
    const avgCheckOutTime = this.minutesToTimeString(data.avg_checkout_minutes);

    return {
      totalEmployees,
      totalCheckIns: parseInt(data.total_checkins || 0),
      totalHoursWorked: parseFloat(data.total_hours || 0),
      averageHoursPerDay: parseFloat(data.avg_hours_per_day || 0),
      lateArrivals: parseInt(data.late_arrivals || 0),
      absences,
      averageCheckInTime: avgCheckInTime,
      averageCheckOutTime: avgCheckOutTime,
    };
  }

  /**
   * Get statistics for each employee
   */
  static async getEmployeeStats(filters: AnalyticsFilters): Promise<EmployeeStats[]> {
    const { companyId, startDate, endDate } = filters;
    const lateCutoff = await this.getLateCutoff(companyId);

    const result = await query(
      `SELECT
        u.id as user_id,
        u.first_name,
        u.last_name,
        COUNT(ar.id) as checkin_count,
        SUM(EXTRACT(EPOCH FROM (ar.check_out_time - ar.check_in_time))/3600) as total_hours,
        AVG(EXTRACT(EPOCH FROM (ar.check_out_time - ar.check_in_time))/3600) as avg_hours_per_day,
        COUNT(CASE WHEN ar.check_in_time::time >= $4::time THEN 1 END) as late_count
       FROM users u
       LEFT JOIN attendance_records ar ON u.id = ar.user_id
         AND ar.check_in_time >= $2
         AND ar.check_in_time <= $3
         AND ar.check_out_time IS NOT NULL
       WHERE u.company_id = $1
       AND u.is_active = true
       GROUP BY u.id, u.first_name, u.last_name
       ORDER BY u.first_name, u.last_name`,
      [companyId, startDate, endDate, lateCutoff]
    );

    const workingDays = this.calculateWorkingDays(startDate, endDate);
    const employeeStats: EmployeeStats[] = [];

    for (const row of result.rows) {
      const checkInCount = parseInt(row.checkin_count);
      const absenceCount = Math.max(0, workingDays - checkInCount);

      employeeStats.push({
        userId: row.user_id,
        firstName: row.first_name,
        lastName: row.last_name,
        totalHours: parseFloat(row.total_hours || 0),
        averageHoursPerDay: parseFloat(row.avg_hours_per_day || 0),
        lateCount: parseInt(row.late_count || 0),
        absenceCount,
        checkInCount,
      });
    }

    return employeeStats;
  }

  /**
   * Get daily attendance statistics
   */
  static async getDailyStats(filters: AnalyticsFilters): Promise<DailyStats[]> {
    const { companyId, startDate, endDate } = filters;
    const lateCutoff = await this.getLateCutoff(companyId);

    const result = await query(
      `SELECT
        DATE(ar.check_in_time) as date,
        COUNT(ar.id) as total_checkins,
        SUM(EXTRACT(EPOCH FROM (ar.check_out_time - ar.check_in_time))/3600) as total_hours,
        COUNT(CASE WHEN ar.check_in_time::time >= $4::time THEN 1 END) as late_arrivals
       FROM attendance_records ar
       JOIN users u ON ar.user_id = u.id
       WHERE u.company_id = $1
       AND ar.check_in_time >= $2
       AND ar.check_in_time <= $3
       AND ar.check_out_time IS NOT NULL
       GROUP BY DATE(ar.check_in_time)
       ORDER BY DATE(ar.check_in_time)`,
      [companyId, startDate, endDate, lateCutoff]
    );

    const dailyStats: DailyStats[] = [];

    // Create a map of dates to stats
    const statsMap = new Map<string, DailyStats>();
    for (const row of result.rows) {
      statsMap.set(row.date, {
        date: row.date,
        totalCheckIns: parseInt(row.total_checkins),
        totalHours: parseFloat(row.total_hours || 0),
        lateArrivals: parseInt(row.late_arrivals || 0),
        absences: 0, // Will calculate below
      });
    }

    // Calculate absences for each day
    const totalEmployees = await this.getTotalEmployees(companyId);
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const existing = statsMap.get(dateStr);

      if (existing) {
        existing.absences = Math.max(0, totalEmployees - existing.totalCheckIns);
        dailyStats.push(existing);
      } else {
        // No check-ins on this day
        dailyStats.push({
          date: dateStr,
          totalCheckIns: 0,
          totalHours: 0,
          lateArrivals: 0,
          absences: totalEmployees,
        });
      }
    }

    return dailyStats;
  }

  /**
   * Export attendance data for payroll systems (CSV format)
   */
  static async exportPayrollData(filters: AnalyticsFilters): Promise<string> {
    const { companyId, startDate, endDate } = filters;
    const lateCutoff = await this.getLateCutoff(companyId);

    const result = await query(
      `SELECT
        u.first_name,
        u.last_name,
        u.email,
        DATE(ar.check_in_time) as date,
        ar.check_in_time,
        ar.check_out_time,
        EXTRACT(EPOCH FROM (ar.check_out_time - ar.check_in_time))/3600 as hours_worked,
        CASE WHEN ar.check_in_time::time >= $4::time THEN 'Late' ELSE 'On Time' END as status
       FROM attendance_records ar
       JOIN users u ON ar.user_id = u.id
       WHERE u.company_id = $1
       AND ar.check_in_time >= $2
       AND ar.check_in_time <= $3
       AND ar.check_out_time IS NOT NULL
       ORDER BY u.first_name, u.last_name, ar.check_in_time`,
      [companyId, startDate, endDate, lateCutoff]
    );

    // Create CSV header
    let csv = 'First Name,Last Name,Email,Date,Check In,Check Out,Hours Worked,Status\n';

    // Add data rows
    for (const row of result.rows) {
      csv += `${row.first_name},${row.last_name},${row.email},${row.date},${row.check_in_time},${row.check_out_time},${row.hours_worked.toFixed(2)},${row.status}\n`;
    }

    return csv;
  }

  /**
   * Helper: Calculate working days between two dates (excluding weekends)
   */
  private static calculateWorkingDays(startDate: Date, endDate: Date): number {
    let workingDays = 0;
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
        workingDays++;
      }
    }
    return workingDays;
  }

  /**
   * Helper: Convert minutes since midnight to HH:MM format
   */
  private static minutesToTimeString(minutes: number): string {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Helper: Get total active employees in company
   */
  private static async getTotalEmployees(companyId: string): Promise<number> {
    const result = await query(
      'SELECT COUNT(*) as count FROM users WHERE company_id = $1 AND is_active = true',
      [companyId]
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Helper: Get the company's configured late-arrival cutoff (HH:MM:SS),
   * falling back to 09:00:00 if unset.
   */
  private static async getLateCutoff(companyId: string): Promise<string> {
    const result = await query('SELECT late_arrival_cutoff FROM companies WHERE id = $1', [companyId]);
    return result.rows[0]?.late_arrival_cutoff || '09:00:00';
  }
}