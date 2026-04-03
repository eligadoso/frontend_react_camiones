import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "../auth/ProtectedRoute";
import { MainLayout } from "../components/layout/MainLayout";
import { DataManagementPage } from "../pages/DataManagementPage";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { PythonApiPage } from "../pages/PythonApiPage";
import { WebhookPage } from "../pages/WebhookPage";

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
        path="/gestion-datos"
        element={
          <ProtectedRoute>
            <MainLayout>
              <DataManagementPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/webhook"
        element={
          <ProtectedRoute>
            <MainLayout>
              <WebhookPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/backend"
        element={
          <ProtectedRoute>
            <MainLayout>
              <PythonApiPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
