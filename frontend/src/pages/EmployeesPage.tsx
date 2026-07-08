import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiUsers, FiX, FiSettings } from 'react-icons/fi';
import { employeeService, Employee } from '../services/employeeService';
import { companyService, Company } from '../services/companyService';
import { useAuthStore } from '../stores/auth';
import toast from 'react-hot-toast';

const emptyForm = {
  employeeCode: '',
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
  department: '',
  position: '',
  hireDate: '',
  role: 'employee' as 'employee' | 'manager' | 'admin',
};

const EmployeesPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const [company, setCompany] = useState<Company | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ name: '', geofenceRadius: '', lateArrivalCutoff: '' });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    loadEmployees();
    if (isAdmin) loadCompany();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const data = await employeeService.getEmployees();
      setEmployees(data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error loading employees');
    } finally {
      setLoading(false);
    }
  };

  const loadCompany = async () => {
    try {
      const data = await companyService.getMine();
      setCompany(data);
      setSettingsForm({
        name: data.name,
        geofenceRadius: String(data.geofence_radius),
        lateArrivalCutoff: data.late_arrival_cutoff.slice(0, 5), // "HH:MM:SS" -> "HH:MM"
      });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error loading company settings');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const updated = await companyService.updateMine({
        name: settingsForm.name || undefined,
        geofenceRadius: Number(settingsForm.geofenceRadius) || undefined,
        lateArrivalCutoff: settingsForm.lateArrivalCutoff || undefined,
      });
      setCompany(updated);
      useAuthStore.setState({ companyName: updated.name });
      toast.success('Company settings updated');
      setShowSettings(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error saving settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingEmployee) {
        const { email, role, password, ...rest } = formData;
        const payload: any = password ? { ...rest, password } : rest;
        // Only send `role` when the editor is an admin — sending it at all
        // (even unchanged) makes the backend enforce the admin-only check,
        // which would wrongly block a manager from editing other fields.
        if (isAdmin) payload.role = role;
        await employeeService.updateEmployee(editingEmployee.id, payload);
        toast.success('Employee updated');
      } else {
        await employeeService.createEmployee(formData);
        toast.success('Employee account created');
      }
      closeForm();
      loadEmployees();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error saving employee');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Deactivate this employee? Their attendance history is kept.')) return;
    try {
      await employeeService.deleteEmployee(id);
      toast.success('Employee deactivated');
      loadEmployees();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error deactivating employee');
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      employeeCode: employee.employee_code || '',
      firstName: employee.first_name,
      lastName: employee.last_name,
      email: employee.email,
      password: '',
      phone: employee.phone || '',
      department: employee.department || '',
      position: employee.position || '',
      hireDate: employee.hire_date ? employee.hire_date.split('T')[0] : '',
      role: employee.role,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingEmployee(null);
    setFormData(emptyForm);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{employees.length} team member{employees.length !== 1 ? 's' : ''}</p>
        <div className="flex gap-2">
          {isAdmin && (
            <button onClick={() => setShowSettings(true)} className="btn-secondary">
              <FiSettings size={16} />
              Company Settings
            </button>
          )}
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <FiPlus size={16} />
            Add Employee
          </button>
        </div>
      </div>

      {showSettings && company && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-popover">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">Company Settings</h2>
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
                <p className="mt-1 text-xs text-gray-500">Shown throughout the app, e.g. in the sidebar.</p>
              </div>
              <div>
                <label className="label">Late Arrival Cutoff</label>
                <input
                  type="time"
                  value={settingsForm.lateArrivalCutoff}
                  onChange={(e) => setSettingsForm({ ...settingsForm, lateArrivalCutoff: e.target.value })}
                  className="input"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Check-ins at or after this time count as "late" in reports and exports.
                </p>
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
                <p className="mt-1 text-xs text-gray-500">
                  How far from the office employees can be and still check in. Also sets how lenient GPS accuracy
                  requirements are.
                </p>
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

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 px-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-popover">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">
                {editingEmployee ? 'Edit Employee' : 'Add Employee'}
              </h2>
              <button onClick={closeForm} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <FiX size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Employee Code</label>
                  <input
                    type="text"
                    value={formData.employeeCode}
                    onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                    className="input"
                    placeholder="EMP001"
                  />
                </div>
                <div>
                  <label className="label">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value as 'employee' | 'manager' | 'admin' })
                    }
                    className="input"
                    disabled={!!editingEmployee && !isAdmin}
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager / HR HOD</option>
                    {editingEmployee && isAdmin && <option value="admin">Admin</option>}
                  </select>
                  {editingEmployee && !isAdmin && (
                    <p className="mt-1 text-xs text-gray-500">Only an admin can change roles.</p>
                  )}
                </div>
                <div>
                  <label className="label">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="label">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input"
                    required
                    disabled={!!editingEmployee}
                  />
                </div>
                <div className="col-span-2">
                  <label className="label">
                    {editingEmployee ? 'Reset Password (optional)' : (
                      <>
                        Password <span className="text-red-500">*</span>
                      </>
                    )}
                  </label>
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input"
                    placeholder={editingEmployee ? 'Leave blank to keep current password' : 'Min. 8 characters'}
                    required={!editingEmployee}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    This is what the employee will use to sign in — share it with them directly.
                  </p>
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Position</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Hire Date</label>
                  <input
                    type="date"
                    value={formData.hireDate}
                    onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={closeForm} className="btn-secondary flex-1">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-500">Loading…</div>
        ) : employees.length === 0 ? (
          <div className="py-16 text-center">
            <FiUsers className="mx-auto mb-3 text-gray-300" size={36} />
            <p className="font-medium text-gray-700">No employees found</p>
            <p className="mt-1 text-sm text-gray-500">Click "Add Employee" to add one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-3 font-medium">ID</th>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Department</th>
                  <th className="px-5 py-3 font-medium">Face ID</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-500">{emp.employee_code || '—'}</td>
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {emp.first_name} {emp.last_name}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{emp.email}</td>
                    <td className="px-5 py-3 capitalize text-gray-500">
                      {emp.role === 'manager' ? 'Manager / HR HOD' : emp.role}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{emp.department || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`badge ${emp.faceEnrolled ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-gray-500'}`}>
                        {emp.faceEnrolled ? 'Enrolled' : 'Not enrolled'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleEdit(emp)}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-brand-600"
                        >
                          <FiEdit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(emp.id)}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </div>
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
};

export default EmployeesPage;
