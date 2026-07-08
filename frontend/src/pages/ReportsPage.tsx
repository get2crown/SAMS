import { useEffect, useMemo, useState } from 'react';
import { subDays, startOfMonth, format } from 'date-fns';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { FiUsers, FiClock, FiTrendingUp, FiAlertTriangle, FiUserX, FiDownload, FiLoader } from 'react-icons/fi';
import { analyticsService, CompanyStats, EmployeeStats, DailyStats } from '../services/analyticsService';
import toast from 'react-hot-toast';

type PresetKey = '7d' | '30d' | 'month';

const PRESETS: { key: PresetKey; label: string; range: () => { start: Date; end: Date } }[] = [
  { key: '7d', label: 'Last 7 days', range: () => ({ start: subDays(new Date(), 6), end: new Date() }) },
  { key: '30d', label: 'Last 30 days', range: () => ({ start: subDays(new Date(), 29), end: new Date() }) },
  { key: 'month', label: 'This month', range: () => ({ start: startOfMonth(new Date()), end: new Date() }) },
];

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

// Brand teal — a single-series chart carries no legend, so the color just
// needs to match the app's identity, not distinguish it from anything.
const CHART_COLOR = '#0d9488';

const ReportsPage: React.FC = () => {
  const [preset, setPreset] = useState<PresetKey>('30d');
  const [range, setRange] = useState(() => PRESETS.find((p) => p.key === '30d')!.range());
  const [companyStats, setCompanyStats] = useState<CompanyStats | null>(null);
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [company, employees, daily] = await Promise.all([
          analyticsService.getCompanyStats(range.start, range.end),
          analyticsService.getEmployeeStats(range.start, range.end),
          analyticsService.getDailyStats(range.start, range.end),
        ]);
        if (cancelled) return;
        setCompanyStats(company);
        setEmployeeStats(employees);
        setDailyStats(daily);
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Error loading reports');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [range]);

  const chartData = useMemo(
    () => dailyStats.map((d) => ({ ...d, label: format(new Date(d.date), 'MMM d') })),
    [dailyStats]
  );

  const handlePreset = (key: PresetKey) => {
    setPreset(key);
    setRange(PRESETS.find((p) => p.key === key)!.range());
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await analyticsService.downloadPayrollCsv(range.start, range.end);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error exporting payroll data');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-lg bg-gray-100 p-1">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => handlePreset(p.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                preset === p.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button onClick={handleExport} disabled={exporting} className="btn-secondary">
          {exporting ? <FiLoader className="animate-spin" size={16} /> : <FiDownload size={16} />}
          Download Payroll CSV
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total Employees"
          value={loading ? '—' : companyStats?.totalEmployees ?? 0}
          icon={<FiUsers size={20} />}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="Total Check-ins"
          value={loading ? '—' : companyStats?.totalCheckIns ?? 0}
          icon={<FiTrendingUp size={20} />}
          color="bg-brand-50 text-brand-600"
        />
        <StatCard
          label="Total Hours Worked"
          value={loading ? '—' : (companyStats?.totalHoursWorked ?? 0).toFixed(1)}
          icon={<FiClock size={20} />}
          color="bg-violet-50 text-violet-600"
        />
        <StatCard
          label="Late Arrivals"
          value={loading ? '—' : companyStats?.lateArrivals ?? 0}
          icon={<FiAlertTriangle size={20} />}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Absences"
          value={loading ? '—' : companyStats?.absences ?? 0}
          icon={<FiUserX size={20} />}
          color="bg-rose-50 text-rose-600"
        />
      </div>

      <div className="card">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Daily check-ins</h3>
        {loading ? (
          <div className="flex h-64 items-center justify-center text-sm text-gray-500">Loading…</div>
        ) : chartData.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-gray-500">
            No attendance records in this range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} barCategoryGap={4}>
              <CartesianGrid vertical={false} stroke="#e1e0d9" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: '#898781' }}
                axisLine={{ stroke: '#c3c2b7' }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: '#898781' }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip
                cursor={{ fill: 'rgba(13,148,136,0.06)' }}
                contentStyle={{ borderRadius: 8, borderColor: '#e1e0d9', fontSize: 13 }}
                labelStyle={{ color: '#0b0b0b', fontWeight: 600 }}
              />
              <Bar dataKey="totalCheckIns" name="Check-ins" fill={CHART_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card">
        <div className="border-b border-gray-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900">By employee</h3>
        </div>
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-500">Loading…</div>
        ) : employeeStats.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500">No employees found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium text-right">Check-ins</th>
                  <th className="px-5 py-3 font-medium text-right">Total Hours</th>
                  <th className="px-5 py-3 font-medium text-right">Avg Hours/Day</th>
                  <th className="px-5 py-3 font-medium text-right">Late</th>
                  <th className="px-5 py-3 font-medium text-right">Absences</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employeeStats.map((e) => (
                  <tr key={e.userId} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {e.firstName} {e.lastName}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-gray-600">{e.checkInCount}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-gray-600">{e.totalHours.toFixed(1)}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-gray-600">{e.averageHoursPerDay.toFixed(1)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {e.lateCount > 0 ? (
                        <span className="badge bg-amber-50 text-amber-700">{e.lateCount}</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-gray-600">{e.absenceCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
