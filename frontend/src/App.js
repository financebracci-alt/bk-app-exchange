import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";

// Pages
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import WalletDashboard from "@/pages/WalletDashboard";
import TransactionsPage from "@/pages/TransactionsPage";
import KYCPage from "@/pages/KYCPage";
import ProfilePage from "@/pages/ProfilePage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";

// Admin Pages
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminCreateUser from "@/pages/admin/AdminCreateUser";
import AdminEditUser from "@/pages/admin/AdminEditUser";
import AdminKYCQueue from "@/pages/admin/AdminKYCQueue";
import AdminTransactions from "@/pages/admin/AdminTransactions";
import AdminAuditLogs from "@/pages/admin/AdminAuditLogs";
import AdminSettings from "@/pages/admin/AdminSettings";

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/wallet" replace />;
  }

  return children;
};

// Public Route (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={isAdmin ? "/admin" : "/wallet"} replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* User Routes */}
      <Route
        path="/wallet"
        element={
          <ProtectedRoute>
            <WalletDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transactions"
        element={
          <ProtectedRoute>
            <TransactionsPage />
          </ProtectedRoute>
        }
      />
      <Route path="/kyc" element={<KYCPage />} />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute adminOnly>
            <AdminUsers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users/create"
        element={
          <ProtectedRoute adminOnly>
            <AdminCreateUser />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users/:userId"
        element={
          <ProtectedRoute adminOnly>
            <AdminEditUser />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/kyc"
        element={
          <ProtectedRoute adminOnly>
            <AdminKYCQueue />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/transactions"
        element={
          <ProtectedRoute adminOnly>
            <AdminTransactions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/audit-logs"
        element={
          <ProtectedRoute adminOnly>
            <AdminAuditLogs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute adminOnly>
            <AdminSettings />
          </ProtectedRoute>
        }
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
