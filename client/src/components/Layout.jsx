import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard, FileText, User, Briefcase, Plus, Bell, Search, LogOut, Activity, Gift, ChevronDown, Database, Globe, Menu, X
} from 'lucide-react';
import brandLogo from '../assets/brand_logo.png';
import api from '../api/axios.js';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  {
    label: 'Masters',
    icon: Database,
    subItems: [
      { to: '/master-customer', label: 'Customers', icon: User },
      { to: '/master-service', label: 'Services', icon: Briefcase },
      { to: '/master-offers', label: 'Offers', icon: Gift },
    ]
  },
  { to: '/invoices', label: 'Billing & Records', icon: FileText },
  { to: '/website-bookings', label: 'Bookings', icon: Globe },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileMastersOpen, setMobileMastersOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error('Logout error:', e);
    }
    localStorage.removeItem('isAuthenticated');
    navigate('/login');
  };

  return (
    <div className="min-h-screen font-sans text-gray-900 flex flex-col">

      {/* ── Mobile Sidebar Backdrop Overlay ── */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[60] lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ── Mobile Sidebar ── */}
      <aside className={`fixed top-0 left-0 h-full w-[280px] bg-white/95 backdrop-blur-2xl border-r border-gray-100 z-[70] transform transition-transform duration-300 ease-in-out lg:hidden flex flex-col shadow-2xl ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <img src={brandLogo} alt="Logo" className="w-10 h-10 object-contain" />
            <h1 className="text-[14px] font-black text-blue-900 tracking-tight leading-tight">DETAILING<br />MASTERS</h1>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:text-rose-500 hover:bg-rose-50 transition-colors shadow-inner">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Nav */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          {navItems.map(item => {
            if (item.subItems) {
              const isActiveGroup = item.subItems.some(sub => location.pathname === sub.to);
              return (
                <div key={item.label} className="flex flex-col">
                  <button
                    onClick={() => setMobileMastersOpen(!mobileMastersOpen)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-[15px] font-black transition-all duration-200 ${isActiveGroup ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={18} />
                      {item.label}
                    </div>
                    <ChevronDown size={16} className={`transition-transform duration-200 ${mobileMastersOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {mobileMastersOpen && (
                    <div className="mt-2 ml-4 pl-4 border-l-2 border-gray-100 flex flex-col gap-1">
                      {item.subItems.map(sub => (
                        <NavLink
                          key={sub.to}
                          to={sub.to}
                          className={({ isActive }) => `
                            flex items-center gap-3 px-4 py-2.5 rounded-xl text-[14px] font-bold transition-all duration-200
                            ${isActive
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}
                          `}
                        >
                          <sub.icon size={16} />
                          {sub.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-black transition-all duration-200
                  ${isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
                `}
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 space-y-3">
          <Link to="/invoices/new" className="bg-blue-600 hover:bg-blue-700 text-white w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black shadow-lg shadow-blue-500/30 transition-all">
            <Plus size={18} />Add New
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-transparent border-2 border-gray-200 text-gray-600 font-black hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Top Navigation Bar ── */}
      <header className={`sticky top-0 z-50 transition-all duration-200 bg-white/40 backdrop-blur-xl border-b border-white/40 ${scrolled ? 'shadow-md' : ''}`}>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">

          {/* Mobile Hamburger */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-white/50 backdrop-blur-md border border-white/50 text-gray-700 hover:bg-white/80 transition-colors shadow-sm mr-2"
          >
            <Menu size={20} />
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1">
            <img src={brandLogo} alt="Logo" className="w-10 h-10 sm:w-14 sm:h-14 object-contain" />
            <div>
              <h1 className="text-[14px] sm:text-[18px] font-black text-blue-900 tracking-tight leading-tight whitespace-nowrap">DETAILING MASTERS</h1>
            </div>
          </div>

          {/* Center Navigation (Desktop Only) */}
          <nav className="hidden lg:flex items-center justify-center gap-2">
            {navItems.map(item => {
              if (item.subItems) {
                const isActiveGroup = item.subItems.some(sub => location.pathname === sub.to);
                return (
                  <div key={item.label} className="relative group">
                    <button className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${isActiveGroup ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}>
                      <item.icon size={16} />
                      {item.label}
                      <ChevronDown size={14} className="group-hover:rotate-180 transition-transform" />
                    </button>
                    {/* Dropdown panel */}
                    <div className="absolute top-full left-0 mt-2 w-48 bg-white/90 backdrop-blur-xl border border-white/40 shadow-xl rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden transform origin-top scale-95 group-hover:scale-100">
                      <div className="p-2 space-y-1">
                        {item.subItems.map(sub => (
                          <NavLink
                            key={sub.to}
                            to={sub.to}
                            className={({ isActive }) => `
                              flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200
                              ${isActive
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                            `}
                          >
                            <sub.icon size={14} />
                            {sub.label}
                          </NavLink>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `
                    flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200
                    ${isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}
                  `}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon size={16} className={isActive ? 'text-white' : ''} />
                      {item.label}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Right Actions (Desktop Only) */}
          <div className="hidden lg:flex items-center justify-end gap-3 flex-1">
            <div className="relative hidden xl:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search..."
                className="pl-9 pr-4 py-2 bg-white/50 backdrop-blur-md border border-white/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all w-[200px] text-gray-900 placeholder-gray-500"
              />
            </div>

            <button className="w-10 h-10 rounded-full flex items-center justify-center bg-white/50 backdrop-blur-md border border-white/50 text-gray-500 hover:bg-white/70 transition-colors relative">
              <Bell size={18} />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            <Link to="/invoices/new" className="btn-primary flex items-center gap-2 py-2 px-4 shadow-sm text-sm whitespace-nowrap">
              <Plus size={16} />Add New
            </Link>

            <button onClick={handleLogout} className="w-10 h-10 rounded-full bg-white/50 backdrop-blur-md border border-white/50 flex items-center justify-center text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Sign Out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-20">
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer className="mt-auto border-t border-white/40 bg-white/40 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-[11px] sm:text-xs font-bold text-gray-400 gap-2">
          <p>© {new Date().getFullYear()} Detailing Masters. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="flex items-center gap-1.5"><Activity size={12} className="text-green-500" /> All systems operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}