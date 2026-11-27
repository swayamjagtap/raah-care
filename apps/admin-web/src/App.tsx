import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AuthProvider, ProtectedRoute } from '@raah/auth';
import { UserRole } from '@raah/shared-types';
import { AdminLayout } from './layouts/AdminLayout';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route path="/login" element={<AdminLoginPage />} />

            {/* Admin & Dispatcher protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={[UserRole.DISPATCHER, UserRole.SYSTEM_ADMIN]}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/control-centre"
              element={
                <ProtectedRoute allowedRoles={[UserRole.DISPATCHER, UserRole.SYSTEM_ADMIN]}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/emergencies"
              element={
                <ProtectedRoute allowedRoles={[UserRole.DISPATCHER, UserRole.SYSTEM_ADMIN]}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ambulances"
              element={
                <ProtectedRoute allowedRoles={[UserRole.DISPATCHER, UserRole.SYSTEM_ADMIN]}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hospitals"
              element={
                <ProtectedRoute allowedRoles={[UserRole.DISPATCHER, UserRole.SYSTEM_ADMIN]}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={[UserRole.DISPATCHER, UserRole.SYSTEM_ADMIN]}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />

            {/* Root redirects to /dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
