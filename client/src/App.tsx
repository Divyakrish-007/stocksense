import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ToastContainer } from './components/common/ToastContainer';
import { AppLayout } from './components/layout/AppLayout';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { SignUpPage } from './pages/auth/SignUpPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';

// Main Application Pages
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { ReceiptsPage } from './pages/ReceiptsPage';
import { DeliveryOrdersPage } from './pages/DeliveryOrdersPage';
import { InternalTransfersPage } from './pages/InternalTransfersPage';
import { PlaceholderPage } from './pages/PlaceholderPage';

// Loading Spinner for session initialization
const AuthLoadingScreen = () => (
  <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
    <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
    <p className="text-sm font-semibold tracking-wide text-slate-300">
      Loading StockSense...
    </p>
  </div>
);

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public Route Guard (Redirects to dashboard if already logged in)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <SignUpPage />
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPasswordPage />
          </PublicRoute>
        }
      />

      {/* Protected Enterprise Routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Core Inventory Modules */}
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/receipts" element={<ReceiptsPage />} />
        <Route path="/delivery-orders" element={<DeliveryOrdersPage />} />

        <Route path="/internal-transfers" element={<InternalTransfersPage />} />

        <Route
          path="/inventory-adjustments"
          element={
            <PlaceholderPage
              title="Inventory Adjustments & Audits"
              description="Cycle counts, annual physical inventory reconciliation, and scrap write-offs"
              moduleKey="inventory-adjustments"
              features={[
                'ABC cycle counting schedule generation',
                'Blind counts vs expected system quantities with variance thresholds',
                'Manager approval workflows for stock write-offs and scrap',
                'Root cause categorization for loss prevention analytics',
              ]}
            />
          }
        />

        <Route
          path="/move-history"
          element={
            <PlaceholderPage
              title="Move History & Stock Ledger"
              description="Immutable audit trail of all warehouse physical stock changes"
              moduleKey="move-history"
              features={[
                'Timestamped ledger of every item scanned, moved, or updated',
                'Operator attribution and device identifier logging',
                'Exportable compliance audit reports (CSV, Excel, PDF)',
                'Granular search by serial number, lot, and time range',
              ]}
            />
          }
        />

        <Route
          path="/settings"
          element={
            <PlaceholderPage
              title="System Configuration & Warehouses"
              description="Facilities setup, zones, aisles, and operational thresholds"
              moduleKey="settings"
              features={[
                'Warehouse, zone, aisle, and rack coordinate modeling',
                'Units of measure (UOM) conversions and currency standards',
                'ERP integration webhooks and automated alert triggers',
                'Role-based permissions matrix and access control',
              ]}
            />
          }
        />

        <Route
          path="/profile"
          element={
            <PlaceholderPage
              title="Operator Profile & Preferences"
              description="Manage user information, assigned facilities, and session security"
              moduleKey="profile"
              features={[
                'Assigned home warehouse and default staging bays',
                'Notification preferences for low stock and pending receipts',
                'Hardware scanner pairing and shortcut bindings',
                'Two-factor authentication (2FA) security settings',
              ]}
            />
          }
        />
      </Route>

      {/* Root Redirection */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
          <ToastContainer />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
