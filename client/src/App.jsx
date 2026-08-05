import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', background: '#fee2e2', color: '#991b1b', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>React Runtime Crash!</h1>
          <h2 style={{ fontSize: '1.5rem', marginTop: '1rem' }}>{this.state.error && this.state.error.toString()}</h2>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '1rem', background: '#fef2f2', padding: '1rem', borderRadius: '8px' }}>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

const Login = lazy(() => import('./pages/Login.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const InvoiceList = lazy(() => import('./pages/InvoiceList.jsx'));
const NewInvoice = lazy(() => import('./pages/NewInvoice.jsx'));
const EditInvoice = lazy(() => import('./pages/EditInvoice.jsx'));
const InvoiceView = lazy(() => import('./pages/InvoiceView.jsx'));
const MasterService = lazy(() => import('./pages/MasterService.jsx'));
const MasterCustomer = lazy(() => import('./pages/MasterCustomer.jsx'));
const CustomerProfile = lazy(() => import('./pages/CustomerProfile.jsx'));
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

function LazyPage({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
      <Route
        path="/login"
        element={(
          <LazyPage>
            <Login />
          </LazyPage>
        )}
      />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<LazyPage><Dashboard /></LazyPage>} />
        <Route path="invoices" element={<LazyPage><InvoiceList /></LazyPage>} />
        <Route path="invoices/new" element={<LazyPage><NewInvoice /></LazyPage>} />
        <Route path="invoices/:id/edit" element={<LazyPage><EditInvoice /></LazyPage>} />
        <Route path="invoices/:id" element={<LazyPage><InvoiceView /></LazyPage>} />
        <Route path="master-service" element={<LazyPage><MasterService /></LazyPage>} />
        <Route path="master-customer" element={<LazyPage><MasterCustomer /></LazyPage>} />
        <Route path="master-customer/:phone" element={<LazyPage><CustomerProfile /></LazyPage>} />
        <Route path="master-offers" element={<LazyPage><MasterOffers /></LazyPage>} />
        <Route path="offers/new" element={<LazyPage><AssignOffer /></LazyPage>} />
        <Route path="offers/:id" element={<LazyPage><OfferView /></LazyPage>} />
        <Route path="quotations/:id" element={<LazyPage><QuotationView /></LazyPage>} />
        <Route path="update-credentials" element={<LazyPage><UpdateCredentials /></LazyPage>} />
        <Route path="website-bookings" element={<LazyPage><WebsiteBookings /></LazyPage>} />
        <Route path="menu-assignment" element={<LazyPage><MenuAssignment /></LazyPage>} />
        <Route path="user-menu-assignment" element={<LazyPage><UserMenuAssignment /></LazyPage>} />
      </Route>
    </Routes>
    </ErrorBoundary>
  );
}
