import { useEffect, useState } from 'react';
import { FiBarChart2, FiDownload, FiTrendingUp, FiUsers } from 'react-icons/fi';
import { AttendanceService } from '../services/attendanceService';

interface TodayStats {
  total_employees: string;
  checked_in: string;
  checked_out: string;
}

const ReportsPage: React.FC = () => {
  const [stats, setStats] = useState<TodayStats | null>(null);

  useEffect(() => {
    AttendanceService.getTodayStats()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  const cards = [
    { label: 'Total Employees', value: stats?.total_employees, icon: FiUsers },
    { label: 'Checked In Today', value: stats?.checked_in, icon: FiTrendingUp },
    { label: 'Checked Out Today', value: stats?.checked_out, icon: FiBarChart2 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="card flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <c.icon size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{c.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{c.value ?? '—'}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card flex flex-col items-center py-16 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
          <FiDownload size={22} />
        </div>
        <h3 className="text-base font-semibold text-gray-900">Detailed reports coming soon</h3>
        <p className="mt-1 max-w-sm text-sm text-gray-500">
          Payroll exports, attendance trends, and department breakdowns will appear here.
        </p>
      </div>
    </div>
  );
};

export default ReportsPage;
