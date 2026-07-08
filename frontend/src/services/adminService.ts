import { api } from './api';
import { Employee } from './employeeService';

export interface CompanySummary {
  id: string;
  name: string;
  office_latitude: number;
  office_longitude: number;
  geofence_radius: number;
  late_arrival_cutoff: string;
  timezone: string;
  created_at: string;
  employee_count: string;
}

export interface UpdateCompanyPayload {
  name?: string;
  officeLatitude?: number;
  officeLongitude?: number;
  geofenceRadius?: number;
  lateArrivalCutoff?: string;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  department?: string;
  position?: string;
  hireDate?: string;
  employeeCode?: string;
  password?: string;
  role?: 'employee' | 'manager' | 'admin' | 'super_admin';
  isActive?: boolean;
}

export const adminService = {
  async listCompanies(): Promise<CompanySummary[]> {
    const { data } = await api.get('/admin/companies');
    return data;
  },

  async updateCompany(id: string, payload: UpdateCompanyPayload): Promise<CompanySummary> {
    const { data } = await api.put(`/admin/companies/${id}`, payload);
    return data;
  },

  async listCompanyUsers(companyId: string): Promise<Employee[]> {
    const { data } = await api.get(`/admin/companies/${companyId}/users`);
    return data;
  },

  async updateUser(id: string, payload: UpdateUserPayload): Promise<Employee> {
    const { data } = await api.put(`/admin/users/${id}`, payload);
    return data;
  },
};
