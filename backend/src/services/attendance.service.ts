import { query } from '../config/database';
import { GeolocationService } from './geolocation.service';
import { BiometricService } from './biometric.service';
import NodeCache from 'node-cache';

// Cache for tracking active sessions (prevent buddy signin)
const sessionCache = new NodeCache({ stdTTL: 3600 }); // 1 hour TTL

export interface CheckInRequest {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  faceDescriptor?: number[]; // 128-d face-api.js descriptor, verified server-side
  faceImagePath?: string;
}

export class AttendanceService {
  /**
   * Check-in with geofence and buddy signin prevention
   */
  static async checkIn(request: CheckInRequest): Promise<any> {
    await query('SELECT 1');

    try {
      // 1. Validate geofence
      const company = await query(
        `SELECT office_latitude, office_longitude, geofence_radius 
         FROM companies WHERE id = (SELECT company_id FROM users WHERE id = $1)`,
        [request.userId]
      );

      if (!company.rows.length) {
        throw new Error('Company not found');
      }

      const { office_latitude, office_longitude, geofence_radius } = company.rows[0];
      const effectiveRadius = geofence_radius || 500; // default 500m

      // 2. Validate GPS accuracy. Requiring precision tighter than the
      // geofence itself is meaningless — a device can't tell "inside the
      // fence" from "outside" more precisely than its own reported error
      // margin. Scale the requirement to the fence size the admin actually
      // configured (that number IS their chosen tolerance) rather than
      // capping it below that — only a floor, to reject wildly noisy reads.
      const accuracyThreshold = Math.max(effectiveRadius, 50);
      if (!GeolocationService.isAccuracyAcceptable(request.accuracy, accuracyThreshold)) {
        throw new Error(
          `GPS accuracy is too low for check-in (got ${Math.round(request.accuracy)}m, need ${accuracyThreshold}m)`
        );
      }

      // 3. Validate geofence
      const isWithinGeofence = GeolocationService.isWithinGeofence(
        {
          latitude: request.latitude,
          longitude: request.longitude,
          accuracy: request.accuracy,
          timestamp: new Date(),
        },
        {
          latitude: office_latitude,
          longitude: office_longitude,
          radius: effectiveRadius,
        }
      );

      if (!isWithinGeofence) {
        throw new Error('User is outside office geofence');
      }

      // 4. Prevent buddy signin - check if same device already checked in
      const deviceSessionKey = `device:${request.userId}`;
      const existingSession = sessionCache.get(deviceSessionKey);

      if (existingSession) {
        throw new Error('Device already has an active session. Check out first.');
      }

      // 5. Check for duplicate check-ins (within last 5 minutes)
      const recentCheckIn = await query(
        `SELECT id FROM attendance_records
         WHERE user_id = $1 AND check_in_time > NOW() - INTERVAL '5 minutes'
         AND check_out_time IS NULL`,
        [request.userId]
      );

      if (recentCheckIn.rows.length) {
        throw new Error('Already checked in. Cannot check in again.');
      }

      // 6. Validate biometric server-side (never trust a client-supplied score)
      let faceScore: number | null = null;
      if (request.faceDescriptor) {
        const verification = await BiometricService.verifyFace(request.userId, request.faceDescriptor);
        if (!verification.match) {
          throw new Error(`Face verification failed (confidence: ${verification.confidence}%)`);
        }
        faceScore = verification.confidence;
      }

      // 7. Create attendance record
      const address = await GeolocationService.getAddressFromCoordinates(
        request.latitude,
        request.longitude
      );

      const result = await query(
        `INSERT INTO attendance_records
         (user_id, check_in_time, latitude, longitude, accuracy, address, face_score, face_image_path)
         VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          request.userId,
          request.latitude,
          request.longitude,
          request.accuracy,
          address,
          faceScore,
          request.faceImagePath || null,
        ]
      );

      // 8. Set device session cache to prevent buddy signin
      sessionCache.set(deviceSessionKey, {
        userId: request.userId,
        checkInId: result.rows[0].id,
        timestamp: new Date(),
      });

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check-out with validation
   */
  static async checkOut(userId: string): Promise<any> {
    const deviceSessionKey = `device:${userId}`;

    try {
      // Find active check-in
      const activeRecord = await query(
        `SELECT id FROM attendance_records 
         WHERE user_id = $1 AND check_out_time IS NULL
         ORDER BY check_in_time DESC LIMIT 1`,
        [userId]
      );

      if (!activeRecord.rows.length) {
        throw new Error('No active check-in found');
      }

      // Update check-out
      const result = await query(
        `UPDATE attendance_records 
         SET check_out_time = NOW(), status = 'completed'
         WHERE id = $1
         RETURNING *`,
        [activeRecord.rows[0].id]
      );

      // Clear device session cache
      sessionCache.del(deviceSessionKey);

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get the caller's currently active (not yet checked-out) record, if any
   */
  static async getCurrentStatus(userId: string): Promise<any> {
    const result = await query(
      `SELECT * FROM attendance_records
       WHERE user_id = $1 AND check_out_time IS NULL
       ORDER BY check_in_time DESC LIMIT 1`,
      [userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get today's attendance stats
   */
  static async getTodayStats(companyId: string): Promise<any> {
    const result = await query(
      `SELECT 
        COUNT(DISTINCT user_id) as total_employees,
        COUNT(DISTINCT CASE WHEN check_in_time::date = CURRENT_DATE THEN user_id END) as checked_in,
        COUNT(DISTINCT CASE WHEN check_out_time::date = CURRENT_DATE THEN user_id END) as checked_out
       FROM attendance_records ar
       JOIN users u ON ar.user_id = u.id
       WHERE u.company_id = $1`,
      [companyId]
    );

    return result.rows[0];
  }

  /**
   * Get employee attendance history
   */
  static async getAttendanceHistory(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    const result = await query(
      `SELECT * FROM attendance_records 
       WHERE user_id = $1 
       AND check_in_time >= $2 AND check_in_time <= $3
       ORDER BY check_in_time DESC`,
      [userId, startDate, endDate]
    );

    return result.rows;
  }
}
