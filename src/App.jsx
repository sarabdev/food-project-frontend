import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { AppLayout } from "./components/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ProductsPage } from "./pages/ProductsPage";
import { PartiesPage } from "./pages/PartiesPage";
import { UsersPage } from "./pages/UsersPage";
import { RolesPage } from "./pages/RolesPage";
import { OrdersPage } from "./pages/OrdersPage";
import { OrderFormPage } from "./pages/OrderFormPage";
import { OrderDetailsPage } from "./pages/OrderDetailsPage";
import { LedgerPage } from "./pages/LedgerPage";
import { ReportsPage } from "./pages/ReportsPage";

function ProtectedApp() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="grid min-h-screen place-items-center text-forest-700">Loading workspace...</div>;
  }
  if (!user) return <Navigate to="/login" replace />;

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/new" element={<OrderFormPage />} />
        <Route path="/orders/:id/edit" element={<OrderFormPage />} />
        <Route path="/orders/:id" element={<OrderDetailsPage />} />
        <Route path="/ledger" element={<LedgerPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/parties" element={<PartiesPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/roles" element={<RolesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

export function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/*" element={<ProtectedApp />} />
    </Routes>
  );
}
