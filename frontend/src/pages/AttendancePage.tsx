import React, { useEffect, useState } from 'react';
import { FiCheckCircle, FiClock, FiLogIn, FiLogOut } from 'react-icons/fi';
import CameraCheckIn from '../components/CameraCheckIn';
import { AttendanceService } from '../services/attendanceService';
import { useAuthStore } from '../stores/auth';

const AttendancePage: React.FC = () => {
  const { user, fetchCurrentUser } = useAuthStore();
  const [activeRecord, setActiveRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<'enroll' | 'checkin' | 'checkout' | null>(null);

  const refresh = async () => {
    setLoading(true);
    await fetchCurrentUser();
    try {
      const active = await AttendanceService.getCurrentStatus();
      setActiveRecord(active);
    } catch {
      setActiveRecord(null);
    }
    setLoading(false);
    setAction(null);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="card flex items-center justify-center py-16 text-sm text-gray-500">Loading…</div>
    );
  }

  if (action) {
    return (
      <div className="mx-auto max-w-md">
        <CameraCheckIn mode={action} onDone={refresh} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      {!user?.faceEnrolled ? (
        <div className="card text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <FiCheckCircle size={22} />
          </div>
          <h3 className="text-base font-semibold text-gray-900">Enroll your face</h3>
          <p className="mt-1 text-sm text-gray-500">
            You need to enroll your face once before you can check in with geofenced facial verification.
          </p>
          <button onClick={() => setAction('enroll')} className="btn-primary mt-5 w-full">
            Enroll Face
          </button>
        </div>
      ) : activeRecord ? (
        <div className="card text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <FiClock size={22} />
          </div>
          <h3 className="text-base font-semibold text-gray-900">You're checked in</h3>
          <p className="mt-1 text-sm text-gray-500">
            Since {new Date(activeRecord.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          <button onClick={() => setAction('checkout')} className="btn-danger mt-5 w-full">
            <FiLogOut size={16} />
            Check Out
          </button>
        </div>
      ) : (
        <div className="card text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500">
            <FiLogIn size={22} />
          </div>
          <h3 className="text-base font-semibold text-gray-900">You're not checked in yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            We'll confirm your location and verify your face before marking you present.
          </p>
          <button onClick={() => setAction('checkin')} className="btn-primary mt-5 w-full">
            <FiLogIn size={16} />
            Check In
          </button>
        </div>
      )}
    </div>
  );
};

export default AttendancePage;
