import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import UnauthorizedPage from './pages/auth/UnauthorizedPage';
import BusDashboard from './pages/bus/BusDashboard';
import DepotDashboard from './pages/depot/DepotDashboard';
import GuardDashboard from './pages/guard/GuardDashboard';
import NgoDashboard from './pages/ngo/NgoDashboard';
import ControlRoomDashboard from './pages/control-room/ControlRoomDashboard';
import SubmitReportPage from './pages/reports/SubmitReportPage';
import UserManagementPage from './pages/control-room/UserManagementPage';
import { ROLES } from './utils/roleConfig';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/login" replace />} />

              <Route
                element={<ProtectedRoute allowedRoles={[ROLES.BUS_IC, ROLES.ZONAL_IC, ROLES.CONTROL_ROOM]} />}
              >
                <Route path="/dashboard/bus" element={ <BusDashboard />} />
              </Route>

              <Route
                element={<ProtectedRoute allowedRoles={[ROLES.NGO_IC, ROLES.ZONAL_IC, ROLES.CONTROL_ROOM]} />}
              >
                <Route path="/dashboard/ngo" element={<NgoDashboard />} />
              </Route>

              <Route
                element={<ProtectedRoute allowedRoles={[ROLES.DEPOT_IC, ROLES.ZONAL_IC, ROLES.CONTROL_ROOM]} />}
              >
                <Route path="/dashboard/depot" element={<DepotDashboard />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={[ROLES.GUARD]} />}>
                <Route path="/dashboard/guard" element={<GuardDashboard />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={[ROLES.ZONAL_IC, ROLES.CONTROL_ROOM]} />}>
                <Route path="/dashboard/zonal" element={<ControlRoomDashboard isZonalView={true} />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={[ROLES.CONTROL_ROOM]} />}>
                <Route path="/dashboard/control-room" element={<ControlRoomDashboard isZonalView={false} />} />
              </Route>

              <Route
                element={
                  <ProtectedRoute
                    allowedRoles={[ROLES.BUS_IC, ROLES.NGO_IC, ROLES.DEPOT_IC, ROLES.ZONAL_IC, ROLES.CONTROL_ROOM]}
                  />
                }
              >
                <Route path="/reports/submit" element={<SubmitReportPage />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={[ROLES.ZONAL_IC, ROLES.CONTROL_ROOM]} />}>
                <Route path="/management/users" element={<UserManagementPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}


