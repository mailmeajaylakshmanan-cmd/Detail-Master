import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Users, Briefcase, Plus, Bell, Search, LogOut, Activity, Gift, ChevronDown, Database, Globe, Menu, X, Sparkles, Shield
} from 'lucide-react';
import brandLogo from '../assets/brand_logo.png';
import api from '../api/axios.js';

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
};

function buildNavItems(menus) {
  if (!menus || !Array.isArray(menus)) return [];

  return menus.map((menu) => {
    const item = {
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

function SidebarNav({ navItems, openGroups, toggleGroup, onNavigate }) {
  const location = useLocation();

  return (
    <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
      {navItems.map((item) => {
        if (item.subItems) {
          const isActiveGroup = item.subItems.some((sub) => location.pathname === sub.to || location.pathname.startsWith(sub.to + '/'));
          const isOpen = openGroups[item.label] ?? isActiveGroup;

          return (
            <div key={item.label} className="flex flex-col">
              <button
                type="button"
                onClick={() => toggleGroup(item.label)}
                className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                  isActiveGroup
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className="flex items-center gap-3">
                  <item.icon size={17} />
                  {item.label}
                </span>
                <ChevronDown size={15} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && (
                <div className="mt-1 ml-3 pl-3 border-l border-gray-200 flex flex-col gap-0.5">
                  {item.subItems.map((sub) => (
                    <NavLink
                      key={sub.to}
                      to={sub.to}
                      onClick={onNavigate}
                      className={({ isActive }) => `
                        flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all
                        ${isActive
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}
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
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all
              ${isActive
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
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
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState({});
  const [navItems, setNavItems] = useState([]);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (user && user.menus) {
        setNavItems(buildNavItems(user.menus));
      } else {
        setNavItems([]);
      }
    } catch (e) {
      setNavItems([]);
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleGroup = (label) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

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
    <div className="min-h-screen font-sans text-gray-900 flex bg-transparent">

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
          fixed top-0 left-0 z-[70] h-full w-[260px]
          bg-white/70 backdrop-blur-2xl border-r border-white/50
          flex flex-col shadow-xl lg:shadow-none
          transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/40 shrink-0">
          <Link to="/" className="flex items-center gap-2.5 min-w-0" onClick={() => setIsMobileMenuOpen(false)}>
            <img src={brandLogo} alt="Detailing Masters" className="h-11 w-auto object-contain shrink-0" />
          </Link>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-full bg-white/60 text-gray-500 hover:text-rose-500 hover:bg-rose-50"
          >
            <X size={18} />
          </button>
        </div>

        <SidebarNav
          navItems={navItems}
          openGroups={openGroups}
          toggleGroup={toggleGroup}
          onNavigate={() => setIsMobileMenuOpen(false)}
        />

        <div className="p-3 border-t border-white/40 shrink-0">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/60 bg-white/40 text-gray-600 text-[13px] font-bold hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-[260px] bg-transparent">
        <header
          className={`sticky top-0 z-50 transition-all duration-200 bg-white/45 backdrop-blur-xl border-b border-white/40 ${
            scrolled ? 'shadow-md' : ''
          }`}
        >
          <div className="px-4 sm:px-6 h-[64px] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-white/50 border border-white/50 text-gray-700 hover:bg-white/80 shrink-0"
              >
                <Menu size={20} />
              </button>
              <div className="lg:hidden flex items-center gap-2 min-w-0">
                <img src={brandLogo} alt="Detailing Masters" className="h-9 w-auto object-contain" />
              </div>
              <p className="hidden lg:block text-sm font-semibold text-gray-600/80 truncate">
                Billing & Operations
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input
                  type="text"
                  placeholder="Search…"
                  className="pl-9 pr-4 py-2 bg-white/50 backdrop-blur-md border border-white/50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 w-[180px] lg:w-[220px] text-gray-900 placeholder-gray-400"
                />
              </div>

              <button
                type="button"
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white/50 backdrop-blur-md border border-white/50 text-gray-500 hover:bg-white/80 relative"
              >
                <Bell size={17} />
                <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
              </button>

              <Link
                to="/invoices/new"
                className="inline-flex btn-primary items-center gap-2 py-2 px-3.5 shadow-sm text-sm whitespace-nowrap"
              >
                <Plus size={15} /> Add New
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-20 max-w-[1600px] bg-transparent">
          <Outlet />
        </main>

        <footer className="mt-auto border-t border-white/40 bg-white/40 backdrop-blur-xl">
          <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-[11px] sm:text-xs font-bold text-gray-500 gap-2">
            <p>© {new Date().getFullYear()} Detailing Masters. All rights reserved.</p>
            <span className="flex items-center gap-1.5">
              <Activity size={12} className="text-green-500" /> All systems operational
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
