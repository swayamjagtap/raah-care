import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AuthProvider, ProtectedRoute } from '@raah/auth';
import { UserRole } from '@raah/shared-types';
import { AmbulanceLayout } from './layouts/AmbulanceLayout';
import { AmbulanceLoginPage } from './pages/AmbulanceLoginPage';
import { AmbulanceDashboardPage } from './pages/AmbulanceDashboardPage';
import { AmbulanceScannerPage } from './pages/AmbulanceScannerPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AmbulanceLayout />}>
            <Route path="/login" element={<AmbulanceLoginPage />} />

            {/* Crew protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute
                  allowedRoles={[UserRole.AMBULANCE_DRIVER, UserRole.PARAMEDIC]}
                >
                  <AmbulanceDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/missions"
              element={
                <ProtectedRoute
                  allowedRoles={[UserRole.AMBULANCE_DRIVER, UserRole.PARAMEDIC]}
                >
                  <AmbulanceDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/navigation"
              element={
                <ProtectedRoute
                  allowedRoles={[UserRole.AMBULANCE_DRIVER, UserRole.PARAMEDIC]}
                >
                  <AmbulanceDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/handover"
              element={
                <ProtectedRoute
                  allowedRoles={[UserRole.AMBULANCE_DRIVER, UserRole.PARAMEDIC]}
                >
                  <AmbulanceDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cura-card-scan"
              element={
                <ProtectedRoute
                  allowedRoles={[UserRole.PARAMEDIC, UserRole.AMBULANCE_DRIVER]}
                >
                  <AmbulanceScannerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute
                  allowedRoles={[UserRole.AMBULANCE_DRIVER, UserRole.PARAMEDIC]}
                >
                  <AmbulanceDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vehicle"
              element={
                <ProtectedRoute
                  allowedRoles={[UserRole.AMBULANCE_DRIVER, UserRole.PARAMEDIC]}
                >
                  <AmbulanceDashboardPage />
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
