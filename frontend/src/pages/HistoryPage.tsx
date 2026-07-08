import { useState, useEffect } from 'react';
import { AttendanceService } from '../services/attendanceService';
import { AttendanceRecord } from '../types';
import { format, subDays } from 'date-fns';
import { FiCalendar, FiClock, FiMap, FiCheckCircle } from 'react-icons/fi';

export const HistoryPage = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const data = await AttendanceService.getHistory(dateRange.startDate, dateRange.endDate);
        setRecords(data);
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [dateRange]);

  const calculateByDate = (records: AttendanceRecord[]) => {
    const byDate: { [key: string]: AttendanceRecord[] } = {};
    records.forEach((record) => {
      const date = format(new Date(record.check_in_time), 'yyyy-MM-dd');
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(record);
    });
    return byDate;
  };

  const groupedRecords = calculateByDate(records);
  const dates = Object.keys(groupedRecords).sort().reverse();

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Start Date</label>
            <input
              type="date"
              value={format(dateRange.startDate, 'yyyy-MM-dd')}
              onChange={(e) => setDateRange({ ...dateRange, startDate: new Date(e.target.value) })}
              className="input"
            />
          </div>
          <div>
            <label className="label">End Date</label>
            <input
              type="date"
              value={format(dateRange.endDate, 'yyyy-MM-dd')}
              onChange={(e) => setDateRange({ ...dateRange, endDate: new Date(e.target.value) })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Total Records</label>
            <div className="rounded-lg bg-brand-50 px-3.5 py-2.5 font-semibold text-brand-700">
              {records.length}
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="card py-16 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-b-brand-600" />
          <p className="mt-4 text-sm text-gray-500">Loading records…</p>
        </div>
      ) : dates.length === 0 ? (
        <div className="card py-16 text-center">
          <FiCalendar className="mx-auto mb-4 text-gray-300" size={40} />
          <p className="font-medium text-gray-700">No records found</p>
          <p className="mt-1 text-sm text-gray-500">Try adjusting the date range</p>
        </div>
      ) : (
        <div className="space-y-5">
          {dates.map((date) => (
            <div key={date} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card">
              <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  {format(new Date(date), 'EEEE, MMMM dd, yyyy')}
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {groupedRecords[date].map((record) => (
                  <div key={record.id} className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <FiClock className="text-brand-600" size={16} />
                      <span className="font-medium text-gray-900">
                        {format(new Date(record.check_in_time), 'HH:mm')}
                        {record.check_out_time
                          ? ` – ${format(new Date(record.check_out_time), 'HH:mm')}`
                          : ' (Active)'}
                      </span>
                      {record.status === 'completed' && <FiCheckCircle className="text-green-600" size={15} />}
                    </div>
                    {record.address && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                        <FiMap size={14} />
                        <span>{record.address}</span>
                      </div>
                    )}
                    {record.face_score && (
                      <span className="badge mt-2 bg-green-100 text-green-800">
                        Face Match: {record.face_score}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
