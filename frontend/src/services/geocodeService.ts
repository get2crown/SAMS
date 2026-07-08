import { api } from './api';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

export const geocodeService = {
  async lookup(address: string): Promise<GeocodeResult> {
    const { data } = await api.get('/geocode', { params: { address } });
    return data;
  },
};
