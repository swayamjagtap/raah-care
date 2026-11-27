import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AuthProvider, ProtectedRoute } from '@raah/auth';
import { UserRole } from '@raah/shared-types';
import { HospitalLayout } from './layouts/HospitalLayout';
import { HospitalLoginPage } from './pages/HospitalLoginPage';
import { HospitalDashboardPage } from './pages/HospitalDashboardPage';
import { HospitalScannerPage } from './pages/HospitalScannerPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<HospitalLayout />}>
            <Route path="/login" element={<HospitalLoginPage />} />

            {/* Hospital & Doctor protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={[UserRole.DOCTOR, UserRole.HOSPITAL_ADMIN]}>
                  <HospitalDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/emergencies"
              element={
                <ProtectedRoute allowedRoles={[UserRole.DOCTOR, UserRole.HOSPITAL_ADMIN]}>
                  <HospitalDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/beds"
              element={
                <ProtectedRoute allowedRoles={[UserRole.DOCTOR, UserRole.HOSPITAL_ADMIN]}>
                  <HospitalDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/resources"
              element={
                <ProtectedRoute allowedRoles={[UserRole.DOCTOR, UserRole.HOSPITAL_ADMIN]}>
                  <HospitalDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/handover"
              element={
                <ProtectedRoute allowedRoles={[UserRole.DOCTOR, UserRole.HOSPITAL_ADMIN]}>
                  <HospitalDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cura-card-scan"
              element={
                <ProtectedRoute allowedRoles={[UserRole.DOCTOR]}>
                  <HospitalScannerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff"
              element={
                <ProtectedRoute allowedRoles={[UserRole.DOCTOR, UserRole.HOSPITAL_ADMIN]}>
                  <HospitalDashboardPage />
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
