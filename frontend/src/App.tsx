import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import AttendancePage from './pages/AttendancePage';
import EmployeesPage from './pages/EmployeesPage';
import ReportsPage from './pages/ReportsPage';
import { HistoryPage } from './pages/HistoryPage';
import SuperAdminPage from './pages/SuperAdminPage';
import { PrivateRoute } from './components/PrivateRoute';
import AppShell from './components/layout/AppShell';

const protect = (title: string, element: React.ReactNode, roles?: string[]) => (
  <PrivateRoute requiredRole={roles}>
    <AppShell title={title}>{element}</AppShell>
  </PrivateRoute>
);

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/dashboard" element={protect('Dashboard', <DashboardPage />)} />
        <Route path="/attendance" element={protect('Attendance', <AttendancePage />)} />
        <Route path="/history" element={protect('History', <HistoryPage />)} />
        <Route
          path="/employees"
          element={protect('Employees', <EmployeesPage />, ['manager', 'admin'])}
        />
        <Route path="/reports" element={protect('Reports', <ReportsPage />, ['manager', 'admin'])} />
        <Route path="/admin" element={protect('Platform Admin', <SuperAdminPage />, ['super_admin'])} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
