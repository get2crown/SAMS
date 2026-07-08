import axios from 'axios';

export interface GeofenceLocation {
  latitude: number;
  longitude: number;
  radius: number; // in meters
}

export interface AttendanceLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
}

export class GeolocationService {
  private static EARTH_RADIUS_KM = 6371;

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return this.EARTH_RADIUS_KM * c * 1000; // return in meters
  }

  private static toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Check if user is within geofence
   */
  static isWithinGeofence(
    userLocation: AttendanceLocation,
    geofence: GeofenceLocation
  ): boolean {
    const distance = this.calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      geofence.latitude,
      geofence.longitude
    );
    return distance <= geofence.radius;
  }

  /**
   * Validate GPS accuracy and prevent spoofing
   */
  static isAccuracyAcceptable(accuracy: number, threshold: number = 50): boolean {
    return accuracy <= threshold; // accuracy in meters
  }

  /**
   * Get address from coordinates using reverse geocoding
   */
  static async getAddressFromCoordinates(
    latitude: number,
    longitude: number
  ): Promise<string | null> {
    try {
      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/geocode/json',
        {
          params: {
            latlng: `${latitude},${longitude}`,
            key: process.env.GOOGLE_MAPS_API_KEY,
          },
        }
      );

      if (response.data.results && response.data.results.length > 0) {
        return response.data.results[0].formatted_address;
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
    return null;
  }

  /**
   * Forward geocoding: turn a typed address into coordinates, so a company
   * can be set up by address instead of requiring "use my current location".
   * Uses OpenStreetMap's Nominatim — no API key/signup required, keeping
   * deployment simple. Nominatim's usage policy caps this at ~1 req/sec and
   * requires an identifying User-Agent; the route calling this is rate
   * limited accordingly (see geocode.routes.ts).
   */
  static async getCoordinatesFromAddress(
    address: string
  ): Promise<{ latitude: number; longitude: number; displayName: string } | null> {
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: { q: address, format: 'json', limit: 1 },
        headers: { 'User-Agent': 'AttendanceOS (office geofence setup)' },
      });

      const result = response.data?.[0];
      if (!result) return null;

      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        displayName: result.display_name,
      };
    } catch (error) {
      console.error('Forward geocoding error:', error);
      return null;
    }
  }
}
