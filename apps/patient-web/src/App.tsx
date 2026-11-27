import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AuthProvider, ProtectedRoute } from '@raah/auth';
import { UserRole } from '@raah/shared-types';
import { PatientLayout } from './layouts/PatientLayout';
import { PatientPortalPage } from './pages/PatientPortalPage';
import { PatientLoginPage } from './pages/PatientLoginPage';
import { PatientRegisterPage } from './pages/PatientRegisterPage';
import { MedicalProfilePage } from './pages/MedicalProfilePage';
import { CuraCardPage } from './pages/CuraCardPage';
import { PatientSettingsPage } from './pages/PatientSettingsPage';
import { InfoPages } from './pages/InfoPages';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<PatientLayout />}>
            {/* Public routes */}
            <Route path="/about" element={<InfoPages type="about" />} />
            <Route path="/how-it-works" element={<InfoPages type="how-it-works" />} />
            <Route path="/contact" element={<InfoPages type="contact" />} />
            <Route path="/login" element={<PatientLoginPage />} />
            <Route path="/register" element={<PatientRegisterPage />} />

            {/* Public guest & authenticated patient root */}
            <Route path="/" element={<PatientPortalPage />} />
            <Route path="/dashboard" element={<PatientPortalPage />} />
            <Route path="/emergency" element={<PatientPortalPage />} />

            {/* Authenticated-only Patient Phase 2 & 3 features */}
            <Route
              path="/history"
              element={
                <ProtectedRoute allowedRoles={[UserRole.PATIENT]}>
                  <PatientPortalPage />
                </ProtectedRoute>
              }
            />
            <Route path="/emergency-history" element={<Navigate to="/history" replace />} />
            <Route
              path="/medical-profile"
              element={
                <ProtectedRoute allowedRoles={[UserRole.PATIENT]}>
                  <MedicalProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute allowedRoles={[UserRole.PATIENT]}>
                  <MedicalProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cura-card"
              element={
                <ProtectedRoute allowedRoles={[UserRole.PATIENT]}>
                  <CuraCardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute allowedRoles={[UserRole.PATIENT]}>
                  <PatientSettingsPage />
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
