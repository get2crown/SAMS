import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiUsers, FiClock, FiBarChart2, FiCalendar, FiArrowRight, FiCheckCircle, FiShield } from 'react-icons/fi';
import { useAuthStore } from '../stores/auth';
import { AttendanceService } from '../services/attendanceService';

interface TodayStats {
  total_employees: string;
  checked_in: string;
  checked_out: string;
}

const StatCard: React.FC<{ label: string; value: React.ReactNode; icon: React.ReactNode; color: string }> = ({
  label,
  value,
  icon,
  color,
}) => (
  <div className="card flex items-center gap-4">
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${color}`}>{icon}</div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  </div>
);

const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const isManager = user?.role === 'manager' || user?.role === 'admin' || user?.role === 'super_admin';

  const [stats, setStats] = useState<TodayStats | null>(null);
  const [activeRecord, setActiveRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [active, todayStats] = await Promise.all([
          AttendanceService.getCurrentStatus().catch(() => null),
          isManager ? AttendanceService.getTodayStats().catch(() => null) : Promise.resolve(null),
        ]);
        setActiveRecord(active);
        setStats(todayStats);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const quickLinks = [
    {
      to: '/attendance',
      label: 'Check In / Out',
      description: 'Verify your face and location',
      icon: FiClock,
      color: 'bg-brand-50 text-brand-600 group-hover:bg-brand-100',
    },
    {
      to: '/history',
      label: 'Attendance History',
      description: 'Review your past records',
      icon: FiCalendar,
      color: 'bg-violet-50 text-violet-600 group-hover:bg-violet-100',
    },
    ...(isManager
      ? [
          {
            to: '/employees',
            label: 'Manage Employees',
            description: 'Add and edit team members',
            icon: FiUsers,
            color: 'bg-amber-50 text-amber-600 group-hover:bg-amber-100',
          },
          {
            to: '/reports',
            label: 'View Reports',
            description: 'Company-wide analytics',
            icon: FiBarChart2,
            color: 'bg-rose-50 text-rose-600 group-hover:bg-rose-100',
          },
        ]
      : []),
    ...(user?.role === 'super_admin'
      ? [
          {
            to: '/admin',
            label: 'Platform Admin',
            description: 'Manage every organization',
            icon: FiShield,
            color: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100',
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Welcome back, {user?.firstName || 'there'} 👋</h2>
        <p className="mt-1 text-sm text-gray-500">Here's what's happening today.</p>
      </div>

      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${isManager ? 'lg:grid-cols-4' : 'lg:grid-cols-2'}`}>
        <div className="card flex items-center gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
              activeRecord ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
            }`}
          >
            <FiCheckCircle size={20} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Your status today</p>
            <p className="text-lg font-semibold text-gray-900">
              {loading ? '—' : activeRecord ? 'Checked in' : 'Not checked in'}
            </p>
          </div>
        </div>

        {isManager && (
          <>
            <StatCard
              label="Total Employees"
              value={loading ? '—' : stats?.total_employees ?? '0'}
              icon={<FiUsers size={20} />}
              color="bg-blue-50 text-blue-600"
            />
            <StatCard
              label="Checked In Today"
              value={loading ? '—' : stats?.checked_in ?? '0'}
              icon={<FiClock size={20} />}
              color="bg-brand-50 text-brand-600"
            />
            <StatCard
              label="Checked Out Today"
              value={loading ? '—' : stats?.checked_out ?? '0'}
              icon={<FiCalendar size={20} />}
              color="bg-violet-50 text-violet-600"
            />
          </>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Quick actions</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="card group flex flex-col justify-between transition hover:border-brand-300 hover:shadow-popover"
            >
              <div>
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg transition ${link.color}`}>
                  <link.icon size={18} />
                </div>
                <p className="font-medium text-gray-900">{link.label}</p>
                <p className="mt-1 text-sm text-gray-500">{link.description}</p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-brand-600">
                Go <FiArrowRight size={14} className="transition group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
