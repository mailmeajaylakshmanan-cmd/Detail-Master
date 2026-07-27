import { Routes, Route, Link } from 'react-router-dom';
import MasterCustomer from './pages/MasterCustomer.jsx';
import Vehicles from './pages/Vehicles.jsx';
import MasterService from './pages/MasterService.jsx';
import JobOrders from './pages/JobOrders.jsx';
import Invoices from './pages/Invoices.jsx';
import Payments from './pages/Payments.jsx';

function Layout({ children }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <nav className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800">Detailing Masters</h1>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <Link to="/" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">Master Customer</Link>
          <Link to="/vehicles" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">Vehicles</Link>
          <Link to="/services" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">Master Service</Link>
          <Link to="/job-orders" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">Job Orders</Link>
          <Link to="/invoices" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">Invoices</Link>
          <Link to="/payments" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">Payments</Link>
        </div>
      </nav>
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<MasterCustomer />} />
        <Route path="/vehicles" element={<Vehicles />} />
        <Route path="/services" element={<MasterService />} />
        <Route path="/job-orders/*" element={<JobOrders />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/payments" element={<Payments />} />
      </Routes>
    </Layout>
  );
}
