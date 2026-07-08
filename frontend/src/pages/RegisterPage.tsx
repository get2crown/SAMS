import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FiMail,
  FiLock,
  FiUser,
  FiPhone,
  FiEye,
  FiEyeOff,
  FiAlertCircle,
  FiLoader,
  FiMapPin,
  FiCheckCircle,
} from 'react-icons/fi';
import { useAuthStore } from '../stores/auth';
import { GeolocationService } from '../services/geolocation';
import toast from 'react-hot-toast';

type CompanyMode = 'create' | 'join';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, isLoading, error } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [companyMode, setCompanyMode] = useState<CompanyMode>('create');
  const [locating, setLocating] = useState(false);
  const [officeLocation, setOfficeLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    companyId: '',
    companyName: '',
    geofenceRadius: '500',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const loc = await GeolocationService.getCurrentPosition();
      setOfficeLocation({ lat: loc.latitude, lng: loc.longitude });
      toast.success('Location captured');
    } catch (err: any) {
      toast.error(err.message || 'Could not get your location');
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (companyMode === 'join' && !formData.companyId) {
      toast.error('Enter the Company ID you were given');
      return;
    }

    if (companyMode === 'create' && (!formData.companyName || !officeLocation)) {
      toast.error('Enter a company name and set the office location');
      return;
    }

    const payload =
      companyMode === 'join'
        ? {
            email: formData.email,
            password: formData.password,
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            companyId: formData.companyId,
          }
        : {
            email: formData.email,
            password: formData.password,
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            companyName: formData.companyName,
            officeLatitude: officeLocation!.lat,
            officeLongitude: officeLocation!.lng,
            geofenceRadius: Number(formData.geofenceRadius) || 500,
          };

    const success = await register(payload);
    if (success) {
      toast.success('Registration successful');
      navigate('/dashboard');
    } else {
      toast.error(useAuthStore.getState().error || 'Registration failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-sm">
            <span className="text-2xl font-bold text-white">A</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Create your account</h1>
          <p className="mt-1 text-sm text-gray-500">Join AttendanceOS</p>
        </div>

        <div className="card">
          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3.5">
              <FiAlertCircle className="shrink-0 text-red-600" size={18} />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First Name</label>
                <div className="relative">
                  <FiUser className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="input pl-10"
                    placeholder="John"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div>
                <label className="label">Last Name</label>
                <div className="relative">
                  <FiUser className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="input pl-10"
                    placeholder="Doe"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <FiMail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input pl-10"
                  placeholder="your@email.com"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="label">Phone Number</label>
              <div className="relative">
                <FiPhone className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input pl-10"
                  placeholder="+1 (555) 000-0000"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <FiLock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">Min. 8 characters</p>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <div className="mb-3 flex rounded-lg bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => setCompanyMode('create')}
                  className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${
                    companyMode === 'create' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  Create new company
                </button>
                <button
                  type="button"
                  onClick={() => setCompanyMode('join')}
                  className={`flex-1 rounded-md py-1.5 text-sm font-medium transition ${
                    companyMode === 'join' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  Join existing company
                </button>
              </div>

              {companyMode === 'create' ? (
                <div className="space-y-3">
                  <div>
                    <label className="label">Company Name</label>
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      className="input"
                      placeholder="Acme Inc."
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <label className="label">Office Location</label>
                    <button
                      type="button"
                      onClick={useCurrentLocation}
                      disabled={locating || isLoading}
                      className="btn-secondary w-full"
                    >
                      {locating ? (
                        <FiLoader className="animate-spin" size={16} />
                      ) : officeLocation ? (
                        <FiCheckCircle className="text-brand-600" size={16} />
                      ) : (
                        <FiMapPin size={16} />
                      )}
                      {officeLocation
                        ? `Captured (${officeLocation.lat.toFixed(4)}, ${officeLocation.lng.toFixed(4)})`
                        : 'Use my current location'}
                    </button>
                    <p className="mt-1 text-xs text-gray-500">
                      Stand at your workplace and tap this — it becomes the center of the geofence.
                    </p>
                  </div>
                  <div>
                    <label className="label">Geofence Radius (meters)</label>
                    <input
                      type="number"
                      name="geofenceRadius"
                      value={formData.geofenceRadius}
                      onChange={handleChange}
                      className="input"
                      min={50}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="label">Company ID</label>
                  <input
                    type="text"
                    name="companyId"
                    value={formData.companyId}
                    onChange={handleChange}
                    className="input"
                    placeholder="Ask your admin for this"
                    disabled={isLoading}
                  />
                </div>
              )}
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary mt-2 w-full">
              {isLoading && <FiLoader className="animate-spin" size={16} />}
              {isLoading ? 'Creating Account…' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
