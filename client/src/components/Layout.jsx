import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Users, Briefcase, Plus, Search, LogOut, Activity, Gift, ChevronDown, Database, Globe, Menu, X, Sparkles, Shield, Car
} from 'lucide-react';
import brandLogo from '../assets/brand-logo-for-invoice.png';
import api from '../api/axios.js';
import NotificationBell from './NotificationBell.jsx';

const iconMap = {
  'layout-dashboard': LayoutDashboard,
  'database': Database,
  'file-text': FileText,
  'globe': Globe,
  'users': Users,
  'gift': Gift,
  'sparkle': Sparkles,
  'briefcase': Briefcase,
  'shield': Shield,
  'car': Car,
};

function buildNavItems(menus) {
  if (!menus || !Array.isArray(menus)) return [];

  return menus.map((menu) => {
    const item = {
      id: menu.id,
      label: menu.menu_name,
      to: menu.route_path,
      icon: iconMap[menu.icon] || LayoutDashboard,
      end: menu.route_path === '/',
    };

    if (menu.subItems && menu.subItems.length > 0) {
      item.subItems = buildNavItems(menu.subItems);
    }

    return item;
  });
}

function readNavItemsFromStorage() {
  try {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    return buildNavItems(user?.menus);
  } catch {
    return [];
  }
}

function initialOpenGroups(items, pathname) {
  const open = {};
  for (const item of items) {
    if (!item.subItems?.length) continue;
    const active = item.subItems.some(
      (sub) => pathname === sub.to || (sub.to && pathname.startsWith(sub.to + '/'))
    );
    // Keep group open if route matches — avoids expand blink after paint
    if (active) open[item.label] = true;
  }
  return open;
}

function SidebarNav({ navItems, openGroups, setOpenGroups, onNavigate }) {
  const location = useLocation();

  return (
    <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
      {navItems.map((item) => {
        if (item.subItems) {
          const isActiveGroup = item.subItems.some(
            (sub) => location.pathname === sub.to || (sub.to && location.pathname.startsWith(sub.to + '/'))
          );
          const isOpen = openGroups[item.label] ?? isActiveGroup;

          return (
            <div key={item.label} className="flex flex-col">
              <button
                type="button"
                onClick={() =>
                  setOpenGroups((prev) => ({
                    ...prev,
                    [item.label]: !(prev[item.label] ?? isActiveGroup),
                  }))
                }
                className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-[13px] font-extrabold transition-colors ${
                  isActiveGroup
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-800 hover:bg-white/50 hover:text-gray-900'
                }`}
              >
                <span className="flex items-center gap-3">
                  <item.icon size={17} />
                  {item.label}
                </span>
                <ChevronDown size={15} className={`transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && (
                <div className="mt-1 ml-3 pl-3 border-l border-gray-200 flex flex-col gap-0.5">
                  {item.subItems.map((sub) => (
                    <NavLink
                      key={sub.to || sub.label}
                      to={sub.to || '#'}
                      onClick={onNavigate}
                      className={({ isActive }) => `
                        flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-bold transition-colors
                        ${isActive
                          ? 'bg-black text-[#FFD700] shadow-md border border-[#FFD700]/30'
                          : 'text-gray-800 hover:text-gray-900 hover:bg-white/50'}
                      `}
                    >
                      <sub.icon size={15} />
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
            key={item.to || item.label}
            to={item.to || '#'}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-extrabold transition-colors
              ${isActive
                ? 'bg-black text-[#FFD700] shadow-md border border-[#FFD700]/30'
                : 'text-gray-800 hover:bg-white/50 hover:text-gray-900'}
            `}
          >
            <item.icon size={17} />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  // Load menus synchronously so first paint already has full sidebar (no blink)
  const [navItems, setNavItems] = useState(() => readNavItemsFromStorage());
  const [openGroups, setOpenGroups] = useState(() =>
    initialOpenGroups(
      readNavItemsFromStorage(),
      typeof window !== 'undefined' ? window.location.pathname : '/'
    )
  );

  // Quiet refresh from /auth/me — never clear menus first (avoids empty→full flash)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/auth/me');
        const menus = res.data?.user?.menus;
        if (cancelled || !menus) return;
        localStorage.setItem('user', JSON.stringify(res.data.user));
        const next = buildNavItems(menus);
        setNavItems(next);
        setOpenGroups((prev) => ({
          ...initialOpenGroups(next, window.location.pathname),
          ...prev,
        }));
      } catch {
        // keep localStorage menus if /me fails
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="min-h-screen font-sans text-theme-brown flex overflow-hidden" style={{ background: 'linear-gradient(135deg, #FFFFFF 0%, #EBEBED 50%, #E5E5E0 100%)' }}>
      
      {/* ── Background Aesthetic (Glassmorphism Warm Gradient) ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Soft warm glows */}
        <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-[#F6CB59] rounded-full blur-[140px] opacity-25"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#F6CB59] rounded-full blur-[120px] opacity-20"></div>
      </div>

      {/* Mobile backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[60] lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar — mobile drawer + desktop fixed */}
      <aside
        className={`
          print:hidden
          fixed top-0 left-0 z-[70] h-full w-[260px]
          bg-white/70 backdrop-blur-2xl border-r border-white/60
          flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.1)]
          transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isDesktopSidebarOpen ? 'lg:translate-x-0' : 'lg:-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between px-3 py-4 border-b border-white/40 shrink-0 gap-2">
            <Link to="/" className="flex items-center gap-2.5 min-w-0 flex-1" onClick={() => setIsMobileMenuOpen(false)}>
              <img src={brandLogo} alt="Logo" className="h-12 w-auto object-contain shrink-0 bg-white rounded p-1" />
              <span className="text-[14px] font-black tracking-tight leading-tight uppercase whitespace-nowrap drop-shadow-sm">
                <span className="text-[#F6CB59]">DETAILING</span> <span className="text-black">MASTERS</span>
              </span>
            </Link>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-full bg-white/60 text-gray-500 hover:text-rose-500 hover:bg-rose-50 shrink-0"
          >
            <X size={18} />
          </button>
          <button
            type="button"
            onClick={() => setIsDesktopSidebarOpen(false)}
            className="hidden lg:flex w-8 h-8 items-center justify-center rounded-full bg-white/60 text-gray-500 hover:text-blue-600 hover:bg-blue-50 shrink-0"
          >
            <Menu size={18} />
          </button>
        </div>

        <SidebarNav
          navItems={navItems}
          openGroups={openGroups}
          setOpenGroups={setOpenGroups}
          onNavigate={() => setIsMobileMenuOpen(false)}
        />

        <div className="p-3 border-t border-white/40 shrink-0">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/60 bg-white/40 text-gray-900 text-[13px] font-extrabold hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isDesktopSidebarOpen ? 'lg:pl-[260px]' : 'lg:pl-0'} bg-transparent`}>
        <header
          className={`print:hidden sticky top-0 z-50 transition-all duration-200 bg-transparent ${
            scrolled ? 'bg-white/40 backdrop-blur-xl border-b border-white/50 shadow-sm' : 'border-b border-transparent'
          }`}
        >
          <div className="px-4 sm:px-6 h-[64px] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200 shrink-0"
              >
                <Menu size={20} />
              </button>
              
              {!isDesktopSidebarOpen && (
                <button
                  type="button"
                  onClick={() => setIsDesktopSidebarOpen(true)}
                  className="hidden lg:flex w-10 h-10 items-center justify-center rounded-xl bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200 shrink-0"
                >
                  <Menu size={20} />
                </button>
              )}

                <div className="lg:hidden flex items-center gap-2 min-w-0">
                  <img src={brandLogo} alt="Logo" className="h-10 w-auto object-contain shrink-0 bg-white rounded p-1" />
                  <span className="text-[13px] font-black tracking-tight leading-tight uppercase truncate">
                    <span className="text-[#F6CB59]">DETAILING</span> <span className="text-black">MASTERS</span>
                  </span>
                </div>
              <p className="hidden lg:block text-sm font-bold text-gray-900 truncate ml-1">
                Dashboard
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input
                  type="text"
                  placeholder="Search…"
                  className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 w-[180px] lg:w-[220px] text-gray-900 placeholder-gray-400 shadow-sm"
                />
              </div>

              <NotificationBell />

              <Link
                to="/invoices/new"
                className="hidden lg:inline-flex btn-primary items-center gap-2 py-2 px-3.5 shadow-sm text-sm whitespace-nowrap"
              >
                <Plus size={15} /> Add New
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-8 max-w-[1600px] bg-transparent print:p-0 print:max-w-none print:mx-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
