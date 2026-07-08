import React, { useEffect, useState } from 'react';
import { FiChevronLeft, FiUsers, FiSettings, FiX, FiShield } from 'react-icons/fi';
import { adminService, CompanySummary } from '../services/adminService';
import { Employee } from '../services/employeeService';
import toast from 'react-hot-toast';

const ROLES: Employee['role'][] = ['employee', 'manager', 'admin'];

const SuperAdminPage: React.FC = () => {
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CompanySummary | null>(null);
  const [users, setUsers] = useState<Employee[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ name: '', geofenceRadius: '', lateArrivalCutoff: '' });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const data = await adminService.listCompanies();
      setCompanies(data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error loading companies');
    } finally {
      setLoading(false);
    }
  };

  const openCompany = async (company: CompanySummary) => {
    setSelected(company);
    setUsersLoading(true);
    try {
      const data = await adminService.listCompanyUsers(company.id);
      setUsers(data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error loading users');
    } finally {
      setUsersLoading(false);
    }
  };

  const openSettings = () => {
    if (!selected) return;
    setSettingsForm({
      name: selected.name,
      geofenceRadius: String(selected.geofence_radius),
      lateArrivalCutoff: selected.late_arrival_cutoff.slice(0, 5),
    });
    setShowSettings(true);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSavingSettings(true);
    try {
      const updated = await adminService.updateCompany(selected.id, {
        name: settingsForm.name,
        geofenceRadius: Number(settingsForm.geofenceRadius) || undefined,
        lateArrivalCutoff: settingsForm.lateArrivalCutoff || undefined,
      });
      setSelected({ ...selected, ...updated });
      setCompanies((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
      toast.success('Company updated');
      setShowSettings(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error saving company');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRoleChange = async (userId: string, role: Employee['role']) => {
    try {
      const updated = await adminService.updateUser(userId, { role });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: updated.role } : u)));
      toast.success('Role updated');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error updating role');
    }
  };

  const handleToggleActive = async (user: Employee) => {
    try {
      const updated = await adminService.updateUser(user.id, { isActive: !user.is_active });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_active: updated.is_active } : u)));
      toast.success(updated.is_active ? 'User reactivated' : 'User deactivated');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error updating user');
    }
  };

  if (selected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelected(null)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <FiChevronLeft size={16} />
            All organizations
          </button>
          <button onClick={openSettings} className="btn-secondary">
            <FiSettings size={16} />
            Edit Settings
          </button>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <FiShield size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{selected.name}</h2>
              <p className="text-sm text-gray-500">
                Geofence {selected.geofence_radius}m · Late cutoff {selected.late_arrival_cutoff.slice(0, 5)} ·{' '}
                {selected.employee_count} member{selected.employee_count !== '1' ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 px-4">
            <div className="w-full max-w-md rounded-xl bg-white shadow-popover">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <h2 className="text-base font-semibold text-gray-900">Edit {selected.name}</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <FiX size={18} />
                </button>
              </div>
              <form onSubmit={handleSaveSettings} className="space-y-4 px-6 py-5">
                <div>
                  <label className="label">Company Name</label>
                  <input
                    type="text"
                    value={settingsForm.name}
                    onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Late Arrival Cutoff</label>
                  <input
                    type="time"
                    value={settingsForm.lateArrivalCutoff}
                    onChange={(e) => setSettingsForm({ ...settingsForm, lateArrivalCutoff: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Geofence Radius (meters)</label>
                  <input
                    type="number"
                    min={50}
                    value={settingsForm.geofenceRadius}
                    onChange={(e) => setSettingsForm({ ...settingsForm, geofenceRadius: e.target.value })}
                    className="input"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={savingSettings} className="btn-primary flex-1">
                    {savingSettings ? 'Saving…' : 'Save'}
                  </button>
                  <button type="button" onClick={() => setShowSettings(false)} className="btn-secondary flex-1">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card">
          {usersLoading ? (
            <div className="py-16 text-center text-sm text-gray-500">Loading…</div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center">
              <FiUsers className="mx-auto mb-3 text-gray-300" size={36} />
              <p className="font-medium text-gray-700">No users in this organization</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">Role</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {u.first_name} {u.last_name}
                      </td>
                      <td className="px-5 py-3 text-gray-500">{u.email}</td>
                      <td className="px-5 py-3">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as Employee['role'])}
                          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r === 'manager' ? 'Manager / HR HOD' : r}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`badge ${u.is_active ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-gray-500'}`}>
                          {u.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => handleToggleActive(u)}
                          className="text-sm font-medium text-brand-600 hover:text-brand-700"
                        >
                          {u.is_active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        {companies.length} organization{companies.length !== 1 ? 's' : ''} on the platform
      </p>

      {loading ? (
        <div className="card py-16 text-center text-sm text-gray-500">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => openCompany(c)}
              className="card text-left transition hover:border-brand-300 hover:shadow-popover"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <FiShield size={18} />
              </div>
              <p className="font-medium text-gray-900">{c.name}</p>
              <p className="mt-1 text-sm text-gray-500">
                {c.employee_count} member{c.employee_count !== '1' ? 's' : ''} · {c.geofence_radius}m geofence
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuperAdminPage;
