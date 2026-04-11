import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "../auth/ProtectedRoute";
import { MainLayout } from "../components/layout/MainLayout";
import { CheckpointManagerPage } from "../pages/CheckpointManagerPage";
import { DataManagementPage } from "../pages/DataManagementPage";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { RouteMetricsPage } from "../pages/RouteMetricsPage";
import { RouteTrackingPage } from "../pages/RouteTrackingPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout>
              <HomePage />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/seguimiento-rutas"
        element={
          <ProtectedRoute>
            <MainLayout>
              <RouteTrackingPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/puntos-control"
        element={
          <ProtectedRoute>
            <MainLayout>
              <CheckpointManagerPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/metricas-rutas"
        element={
          <ProtectedRoute>
            <MainLayout>
              <RouteMetricsPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/gestion-datos"
        element={
          <ProtectedRoute>
            <MainLayout>
              <DataManagementPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
