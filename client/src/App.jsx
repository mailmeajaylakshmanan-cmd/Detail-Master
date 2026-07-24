import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import InvoiceList from './pages/InvoiceList.jsx';
import NewInvoice from './pages/NewInvoice.jsx';
import EditInvoice from './pages/EditInvoice.jsx';
import InvoiceView from './pages/InvoiceView.jsx';
import MasterService from './pages/MasterService.jsx';
import MasterCustomer from './pages/MasterCustomer.jsx';
import QuotationView from './pages/QuotationView.jsx';
import UpdateCredentials from './pages/UpdateCredentials.jsx';
import MasterOffers from './pages/MasterOffers.jsx';
import AssignOffer from './pages/AssignOffer.jsx';
import OfferView from './pages/OfferView.jsx';
import WebsiteBookings from './pages/WebsiteBookings.jsx';

function PrivateRoute({ children }) {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
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
      </Route>
    </Routes>
  );
}
