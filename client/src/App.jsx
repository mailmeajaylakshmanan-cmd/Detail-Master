import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';

const Login = lazy(() => import('./pages/Login.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const InvoiceList = lazy(() => import('./pages/InvoiceList.jsx'));
const NewInvoice = lazy(() => import('./pages/NewInvoice.jsx'));
const EditInvoice = lazy(() => import('./pages/EditInvoice.jsx'));
const InvoiceView = lazy(() => import('./pages/InvoiceView.jsx'));
const MasterService = lazy(() => import('./pages/MasterService.jsx'));
const MasterCustomer = lazy(() => import('./pages/MasterCustomer.jsx'));
const QuotationView = lazy(() => import('./pages/QuotationView.jsx'));
const UpdateCredentials = lazy(() => import('./pages/UpdateCredentials.jsx'));
const MasterOffers = lazy(() => import('./pages/MasterOffers.jsx'));
const AssignOffer = lazy(() => import('./pages/AssignOffer.jsx'));
const OfferView = lazy(() => import('./pages/OfferView.jsx'));
const WebsiteBookings = lazy(() => import('./pages/WebsiteBookings.jsx'));
const MenuAssignment = lazy(() => import('./pages/MenuAssignment.jsx'));
const UserMenuAssignment = lazy(() => import('./pages/UserMenuAssignment.jsx'));

function PrivateRoute({ children }) {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
      Loading…
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="invoices" element={<InvoiceList />} />
          <Route path="invoices/new" element={<NewInvoice />} />
          <Route path="invoices/:id/edit" element={<EditInvoice />} />
          <Route path="invoices/:id" element={<InvoiceView />} />
          <Route path="master-service" element={<MasterService />} />
          <Route path="master-customer" element={<MasterCustomer />} />
          <Route path="master-offers" element={<MasterOffers />} />
          <Route path="offers/new" element={<AssignOffer />} />
          <Route path="offers/:id" element={<OfferView />} />
          <Route path="quotations/:id" element={<QuotationView />} />
          <Route path="update-credentials" element={<UpdateCredentials />} />
          <Route path="website-bookings" element={<WebsiteBookings />} />
          <Route path="menu-assignment" element={<MenuAssignment />} />
          <Route path="user-menu-assignment" element={<UserMenuAssignment />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
