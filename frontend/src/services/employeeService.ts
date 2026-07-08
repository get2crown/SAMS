import { api } from './api';

export interface Employee {
  id: string;
  employee_code: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  position: string | null;
  hire_date: string | null;
  role: 'employee' | 'manager' | 'admin';
  is_active: boolean;
  faceEnrolled: boolean;
}

export interface CreateEmployeePayload {
  employeeCode?: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  department?: string;
  position?: string;
  hireDate?: string;
  // 'admin' is accepted here only so the create/edit form can share one
  // state shape; the backend ignores 'admin' at creation time regardless.
  role?: 'employee' | 'manager' | 'admin';
}

export type UpdateEmployeePayload = Partial<Omit<CreateEmployeePayload, 'email'>>;

export const employeeService = {
  async getEmployees(): Promise<Employee[]> {
    const { data } = await api.get('/employees');
    return data;
  },

  async createEmployee(employee: CreateEmployeePayload): Promise<Employee> {
    const { data } = await api.post('/employees', employee);
    return data;
  },

  async updateEmployee(id: string, employee: UpdateEmployeePayload): Promise<Employee> {
    const { data } = await api.put(`/employees/${id}`, employee);
    return data;
  },

  async deleteEmployee(id: string): Promise<void> {
    await api.delete(`/employees/${id}`);
  },
};
