import { api } from './api';

export interface Company {
  id: string;
  name: string;
  office_latitude: number;
  office_longitude: number;
  geofence_radius: number;
  late_arrival_cutoff: string; // "HH:MM:SS"
  timezone: string;
}

export interface UpdateCompanyPayload {
  name?: string;
  officeLatitude?: number;
  officeLongitude?: number;
  geofenceRadius?: number;
  lateArrivalCutoff?: string; // "HH:MM"
}

export const companyService = {
  async getMine(): Promise<Company> {
    const { data } = await api.get('/companies/me');
    return data;
  },

  async updateMine(payload: UpdateCompanyPayload): Promise<Company> {
    const { data } = await api.put('/companies/me', payload);
    return data;
  },
};
