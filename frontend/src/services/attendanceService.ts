import { api } from './api';
import { LocationData } from '../types';

export class AttendanceService {
  static async enrollFace(descriptor: Float32Array): Promise<void> {
    await api.post('/biometric/enroll', { descriptor: Array.from(descriptor) });
  }

  static async checkIn(location: LocationData, descriptor: Float32Array) {
    const { data } = await api.post('/attendance/check-in', {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      faceDescriptor: Array.from(descriptor),
    });
    return data;
  }

  static async checkOut() {
    const { data } = await api.post('/attendance/check-out');
    return data;
  }

  static async getCurrentStatus() {
    const { data } = await api.get('/attendance/current');
    return data.active;
  }

  static async getHistory(startDate: Date, endDate: Date) {
    const { data } = await api.get('/attendance/history', {
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
    return data;
  }

  static async getTodayStats() {
    const { data } = await api.get('/attendance/stats/today');
    return data;
  }
}
