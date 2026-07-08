export interface FaceMatchResult {
  score: number;
  distance: number;
  match: boolean;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'employee' | 'manager';
  faceDescriptor?: Float32Array;
}

export interface AttendanceRecord {
  id: string;
  user_id: string;
  check_in_time: string;
  check_out_time: string | null;
  latitude: number;
  longitude: number;
  accuracy: number;
  address: string | null;
  face_score: number | null;
  face_image_path: string | null;
  status: 'pending' | 'completed' | 'rejected';
  created_at: string;
}