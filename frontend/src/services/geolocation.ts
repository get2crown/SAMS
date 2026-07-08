import { LocationData } from '../types';

export class GeolocationService {
  static async getCurrentPosition(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp)
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  private static toLocationData(position: GeolocationPosition): LocationData {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: new Date(position.timestamp),
    };
  }

  /**
   * Gets a location fix fast. Tries a cheap fix first — the browser will
   * often hand back a cached/WiFi-based reading almost instantly — and
   * only falls back to the slower high-accuracy GPS loop if that first
   * fix isn't good enough yet. Resolves early the moment a reading meets
   * targetAccuracy rather than always waiting out the full budget.
   */
  static async getBestPosition(
    targetAccuracy = 100,
    maxWaitMs = 8000,
    onUpdate?: (accuracy: number) => void
  ): Promise<LocationData> {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by your browser');
    }

    // Fast pass: accept a cached fix up to 30s old, don't force a GPS lock.
    const quick = await new Promise<LocationData | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(this.toLocationData(position)),
        () => resolve(null),
        { enableHighAccuracy: false, maximumAge: 30000, timeout: 3000 }
      );
    });

    if (quick) {
      onUpdate?.(quick.accuracy);
      if (quick.accuracy <= targetAccuracy) {
        return quick;
      }
    }

    // Slower pass: keep sampling with high accuracy, tracking the best
    // reading seen, until it's good enough or the remaining budget runs out.
    return new Promise((resolve, reject) => {
      let best = quick;
      let watchId: number;
      const remainingMs = quick ? Math.max(maxWaitMs - 3000, 3000) : maxWaitMs;

      const finish = () => {
        navigator.geolocation.clearWatch(watchId);
        clearTimeout(timer);
        if (best) {
          resolve(best);
        } else {
          reject(new Error('Unable to get your location'));
        }
      };

      const timer = setTimeout(finish, remainingMs);

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const reading = this.toLocationData(position);
          if (!best || reading.accuracy < best.accuracy) {
            best = reading;
            onUpdate?.(reading.accuracy);
          }
          if (reading.accuracy <= targetAccuracy) {
            finish();
          }
        },
        (error) => {
          if (!best) {
            navigator.geolocation.clearWatch(watchId);
            clearTimeout(timer);
            reject(error);
          }
          // otherwise keep the best reading we already have and let the timer finish
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: remainingMs }
      );
    });
  }

  static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  static isWithinRange(lat1: number, lon1: number, lat2: number, lon2: number, rangeKm: number): boolean {
    const distance = this.calculateDistance(lat1, lon1, lat2, lon2);
    return distance <= rangeKm;
  }
}