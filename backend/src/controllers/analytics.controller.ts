import { Request, Response } from 'express';
import { AnalyticsService, AnalyticsFilters } from '../services/analytics.service';
import { ApiResponse } from '../utils/response';

export class AnalyticsController {
  /**
   * Get company-wide attendance statistics
   */
  static async getCompanyStats(req: Request, res: Response) {
    try {
      const { companyId } = req.user as any; // From auth middleware
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return ApiResponse.badRequest(res, 'Start date and end date are required');
      }

      const filters: AnalyticsFilters = {
        companyId,
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      };

      const stats = await AnalyticsService.getCompanyStats(filters);
      return ApiResponse.success(res, stats, 'Company statistics retrieved successfully');
    } catch (error) {
      console.error('Error getting company stats:', error);
      return ApiResponse.serverError(res, 'Failed to retrieve company statistics');
    }
  }

  /**
   * Get employee-specific attendance statistics
   */
  static async getEmployeeStats(req: Request, res: Response) {
    try {
      const { companyId } = req.user as any;
      const { startDate, endDate, userId } = req.query;

      if (!startDate || !endDate) {
        return ApiResponse.badRequest(res, 'Start date and end date are required');
      }

      const filters: AnalyticsFilters = {
        companyId,
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
        userId: userId as string,
      };

      const stats = await AnalyticsService.getEmployeeStats(filters);
      return ApiResponse.success(res, stats, 'Employee statistics retrieved successfully');
    } catch (error) {
      console.error('Error getting employee stats:', error);
      return ApiResponse.serverError(res, 'Failed to retrieve employee statistics');
    }
  }

  /**
   * Get daily attendance statistics
   */
  static async getDailyStats(req: Request, res: Response) {
    try {
      const { companyId } = req.user as any;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return ApiResponse.badRequest(res, 'Start date and end date are required');
      }

      const filters: AnalyticsFilters = {
        companyId,
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      };

      const stats = await AnalyticsService.getDailyStats(filters);
      return ApiResponse.success(res, stats, 'Daily statistics retrieved successfully');
    } catch (error) {
      console.error('Error getting daily stats:', error);
      return ApiResponse.serverError(res, 'Failed to retrieve daily statistics');
    }
  }

  /**
   * Export attendance data for payroll systems
   */
  static async exportPayrollData(req: Request, res: Response) {
    try {
      const { companyId } = req.user as any;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return ApiResponse.badRequest(res, 'Start date and end date are required');
      }

      const filters: AnalyticsFilters = {
        companyId,
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      };

      const csvData = await AnalyticsService.exportPayrollData(filters);

      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="payroll_export_${filters.startDate.toISOString().split('T')[0]}_to_${filters.endDate.toISOString().split('T')[0]}.csv"`);

      return res.send(csvData);
    } catch (error) {
      console.error('Error exporting payroll data:', error);
      return ApiResponse.serverError(res, 'Failed to export payroll data');
    }
  }
}