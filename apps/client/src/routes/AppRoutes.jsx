import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import SignupPage from '../pages/SignupPage.jsx';
import DashboardHomePage from '../pages/DashboardHomePage.jsx';
import CashflowPage from '../pages/CashflowPage.jsx';
import InventoryPage from '../pages/InventoryPage.jsx';
import SalesCopilotPage from '../pages/SalesCopilotPage.jsx';
import IntegrationsPage from '../pages/IntegrationsPage.jsx';
import TeamPage from '../pages/TeamPage.jsx';
import BillingPage from '../pages/BillingPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardHomePage />} />
          <Route path="/cashflow" element={<CashflowPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/sales" element={<SalesCopilotPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/billing" element={<BillingPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
