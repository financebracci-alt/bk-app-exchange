import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  FileCheck,
  ArrowLeftRight,
  ScrollText,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

const BADGE_SECTIONS = {
  '/admin/users': 'users',
  '/admin/kyc': 'kyc',
  '/admin/transactions': 'transactions',
};

const AdminLayout = ({ children, title }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, api } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [badges, setBadges] = useState({ users: 0, kyc: 0, transactions: 0 });

  const menuItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/users', icon: Users, label: 'Users', badgeKey: 'users' },
    { path: '/admin/kyc', icon: FileCheck, label: 'KYC Queue', badgeKey: 'kyc' },
    { path: '/admin/transactions', icon: ArrowLeftRight, label: 'Transactions', badgeKey: 'transactions' },
    { path: '/admin/audit-logs', icon: ScrollText, label: 'Audit Logs' },
    { path: '/admin/settings', icon: Settings, label: 'Settings' },
  ];

  const loadBadges = useCallback(async () => {
    try {
      const res = await api.get('/admin/badges');
      if (res.data.ok) setBadges(res.data.data);
    } catch (e) { /* ignore */ }
  }, [api]);

  // Load badges on mount + poll every 15s
  useEffect(() => {
    loadBadges();
    const interval = setInterval(loadBadges, 15000);
    return () => clearInterval(interval);
  }, [loadBadges]);

  // Mark section as read only when navigating to it (not on poll updates)
  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    if (location.pathname !== prevPathRef.current) {
      prevPathRef.current = location.pathname;
      const section = BADGE_SECTIONS[location.pathname];
      if (section && badges[section] > 0) {
        api.put(`/admin/badges/${section}/mark-read`).then(() => {
          setBadges(prev => ({ ...prev, [section]: 0 }));
        }).catch(() => {});
      }
    }
  }, [location.pathname, api, badges]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleNavClick = async (path) => {
    setSidebarOpen(false);
    const section = BADGE_SECTIONS[path];
    if (section && badges[section] > 0) {
      try {
        await api.put(`/admin/badges/${section}/mark-read`);
        setBadges(prev => ({ ...prev, [section]: 0 }));
      } catch (e) { /* ignore */ }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-gray-900 transform transition-transform duration-300 lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">Z</span>
              </div>
              <span className="text-white font-bold">Admin Panel</span>
            </div>
            <button 
              className="lg:hidden text-gray-400 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              const badgeCount = item.badgeKey ? badges[item.badgeKey] || 0 : 0;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  data-testid={`admin-nav-${item.badgeKey || item.label.toLowerCase().replace(/\s/g, '-')}`}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg transition ${
                    isActive 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                  onClick={() => handleNavClick(item.path)}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </div>
                  {badgeCount > 0 && (
                    <span
                      data-testid={`badge-${item.badgeKey}`}
                      className="bg-red-500 text-white text-[11px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5"
                    >
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User & Logout */}
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-gray-400 text-xs truncate">{user?.email}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full text-gray-300 border-gray-700 hover:bg-gray-800"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center space-x-4">
              <button 
                className="lg:hidden text-gray-600 hover:text-gray-900"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/wallet" className="text-sm text-blue-600 hover:text-blue-700">
                View User Dashboard
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
