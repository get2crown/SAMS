import { api } from './api';

export interface CompanyStats {
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

const toISO = (d: Date) => d.toISOString();

export const analyticsService = {
  async getCompanyStats(startDate: Date, endDate: Date): Promise<CompanyStats> {
    const { data } = await api.get('/analytics/company-stats', {
      params: { startDate: toISO(startDate), endDate: toISO(endDate) },
    });
    return data.data;
  },

  async getEmployeeStats(startDate: Date, endDate: Date): Promise<EmployeeStats[]> {
    const { data } = await api.get('/analytics/employee-stats', {
      params: { startDate: toISO(startDate), endDate: toISO(endDate) },
    });
    return data.data;
  },

  async getDailyStats(startDate: Date, endDate: Date): Promise<DailyStats[]> {
    const { data } = await api.get('/analytics/daily-stats', {
      params: { startDate: toISO(startDate), endDate: toISO(endDate) },
    });
    return data.data;
  },

  async downloadPayrollCsv(startDate: Date, endDate: Date): Promise<void> {
    const response = await api.get('/analytics/export/payroll', {
      params: { startDate: toISO(startDate), endDate: toISO(endDate) },
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    link.download = `payroll_${start}_to_${end}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
