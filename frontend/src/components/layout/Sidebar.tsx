import { NavLink } from 'react-router-dom';
import {
  FiGrid,
  FiClock,
  FiUsers,
  FiBarChart2,
  FiCalendar,
  FiX,
  FiShield,
} from 'react-icons/fi';
import { useAuthStore } from '../../stores/auth';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  roles?: string[];
  // Each section gets its own hue so the sidebar reads as colorful rather
  // than one flat accent repeated everywhere — active/hover states pick up
  // this color instead of a single universal brand tint.
  activeBg: string;
  activeText: string;
  iconIdle: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: FiGrid,
    activeBg: 'bg-blue-50',
    activeText: 'text-blue-700',
    iconIdle: 'text-blue-500',
  },
  {
    to: '/attendance',
    label: 'Attendance',
    icon: FiClock,
    activeBg: 'bg-brand-50',
    activeText: 'text-brand-700',
    iconIdle: 'text-brand-500',
  },
  {
    to: '/history',
    label: 'History',
    icon: FiCalendar,
    activeBg: 'bg-violet-50',
    activeText: 'text-violet-700',
    iconIdle: 'text-violet-500',
  },
  {
    to: '/employees',
    label: 'Employees',
    icon: FiUsers,
    roles: ['manager', 'admin'],
    activeBg: 'bg-amber-50',
    activeText: 'text-amber-700',
    iconIdle: 'text-amber-500',
  },
  {
    to: '/reports',
    label: 'Reports',
    icon: FiBarChart2,
    roles: ['manager', 'admin'],
    activeBg: 'bg-rose-50',
    activeText: 'text-rose-700',
    iconIdle: 'text-rose-500',
  },
  {
    to: '/admin',
    label: 'Platform Admin',
    icon: FiShield,
    roles: ['super_admin'],
    activeBg: 'bg-indigo-50',
    activeText: 'text-indigo-700',
    iconIdle: 'text-indigo-500',
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const { user, companyName } = useAuthStore();
  const role = user?.role || 'employee';

  // super_admin sees everything — same universal bypass as the backend's
  // roleMiddleware and PrivateRoute.
  const items = NAV_ITEMS.filter(
    (item) => !item.roles || role === 'super_admin' || item.roles.includes(role)
  );

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-gray-900/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between gap-2 px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-sm">
              {(companyName || 'A')[0].toUpperCase()}
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[15px] font-bold text-gray-900" title={companyName || undefined}>
                {companyName || 'AttendanceOS'}
              </p>
              {companyName && <span className="truncate text-[11px] font-medium text-gray-400">AttendanceOS</span>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 lg:hidden"
          >
            <FiX size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? `${item.activeBg} ${item.activeText}`
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={18} className={isActive ? '' : item.iconIdle} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-100 px-5 py-4 text-xs text-gray-400">
          Signed in as{' '}
          <span className="font-medium text-gray-500 capitalize">{role}</span>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
