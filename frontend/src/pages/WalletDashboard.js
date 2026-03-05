import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLang, dateFmt } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import {
  User,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  LogOut,
  AlertTriangle,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Home,
  Repeat,
  Bell,
  CheckCircle,
  Lock,
  Info,
  X
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const WalletDashboard = () => {
  const navigate = useNavigate();
  const { user, wallets, logout, api, refreshUser, isAdmin } = useAuth();
  const { t, lang, toggleLang } = useLang();

  // Translate backend API error messages to current UI language
  const apiError = (err, fallback) => {
    const detail = err?.response?.data?.detail || '';
    if (/frozen|congelato/i.test(detail)) return t.accountFrozen;
    if (/exceeds.*balance|supera.*saldo/i.test(detail)) return t.insufficientBalance;
    if (/IBAN|iban/i.test(detail)) return t.invalidIban;
    return detail || fallback;
  };
  const [loading, setLoading] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [unpaidFees, setUnpaidFees] = useState({ total: '0.00', count: 0 });
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const [availableBalance, setAvailableBalance] = useState({});
  const [eligibility, setEligibility] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [sendForm, setSendForm] = useState({ amount: '', address: '' });
  const [swapForm, setSwapForm] = useState({ amount: '', direction: 'USDC_EUR' });
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', iban: '', firstName: '', lastName: '' });
  const [fixNowLoading, setFixNowLoading] = useState(false);
  const [showFixNowSuccess, setShowFixNowSuccess] = useState(false);
  const [sendingTx, setSendingTx] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [swapResult, setSwapResult] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const sseRef = useRef(null);

  // SSE real-time connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const url = `${API}/api/events/stream?token=${token}`;
    const es = new EventSource(url);
    sseRef.current = es;
    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'connected') return;
        if (refreshUser) refreshUser();
        loadUnpaidFees();
        loadAvailableBalance();
        loadEligibility();
        loadNotifications();
      } catch (e) { /* ignore parse errors from keepalive */ }
    };
    es.onerror = () => {};
    return () => { es.close(); sseRef.current = null; };
  }, []);

  // Fallback: poll every 60s
  useEffect(() => {
    const interval = setInterval(() => {
      if (refreshUser) {
        refreshUser();
        loadAvailableBalance();
        loadEligibility();
        loadNotifications();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [refreshUser]);

  const handleManualRefresh = useCallback(async () => {
    setLoading(true);
    try {
      if (refreshUser) {
        await refreshUser();
        setLastRefresh(Date.now());
        loadUnpaidFees();
        loadAvailableBalance();
        loadEligibility();
        loadNotifications();
      }
    } finally {
      setLoading(false);
    }
  }, [refreshUser]);

  const loadAvailableBalance = async () => {
    try {
      const res = await api.get('/wallet/available-balance');
      if (res.data.ok) setAvailableBalance(res.data.data);
    } catch (e) { console.error('Failed to load available balance:', e); }
  };

  const loadEligibility = async () => {
    try {
      const res = await api.get('/wallet/action-eligibility');
      if (res.data.ok) setEligibility(res.data.data);
    } catch (e) { console.error('Failed to load eligibility:', e); }
  };

  const loadNotifications = async () => {
    try {
      const [nRes, cRes] = await Promise.all([
        api.get('/notifications?page_size=10'),
        api.get('/notifications/unread-count')
      ]);
      if (nRes.data.ok) setNotifications(nRes.data.data.notifications);
      if (cRes.data.ok) setUnreadCount(cRes.data.data.unread_count);
    } catch (e) { console.error('Failed to load notifications:', e); }
  };

  useEffect(() => {
    loadUnpaidFees();
    loadAvailableBalance();
    loadEligibility();
    loadNotifications();
  }, []);

  useEffect(() => {
    if (!showFreezeModal) setEmailSent(false);
  }, [showFreezeModal]);

  const loadUnpaidFees = async () => {
    try {
      const response = await api.get('/wallet/unpaid-fees');
      if (response.data.ok) {
        setUnpaidFees({
          total: response.data.data.total_unpaid_fees,
          count: response.data.data.transactions_with_fees
        });
      }
    } catch (error) {
      console.error('Failed to load fees:', error);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await refreshUser();
      await loadUnpaidFees();
      toast.success(t.walletRefreshed);
    } catch (error) {
      toast.error(t.failedRefresh);
    } finally {
      setLoading(false);
    }
  };

  const handleFixAccount = async () => {
    setSendingEmail(true);
    try {
      const response = await api.post('/account/request-unfreeze');
      if (response.data.ok) {
        setShowFreezeModal(true);
        setEmailSent(true);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || t.failedSendEmailGeneric);
    } finally {
      setSendingEmail(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success(t.copiedToClipboard);
  };

  const getUSDCWallet = () => wallets.find(w => w.asset === 'USDC');
  const getEURWallet = () => wallets.find(w => w.asset === 'EUR');

  // Live exchange rate
  const [exchangeRate, setExchangeRate] = useState(() => {
    try {
      const cached = localStorage.getItem('exchange_rate');
      if (cached) return JSON.parse(cached);
    } catch (e) { /* ignore */ }
    return { usdc_eur: 0.92, eur_usdc: 1.087, change_24h_pct: 0.0 };
  });

  useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await api.get('/exchange-rate');
        if (res.data.ok) {
          setExchangeRate(res.data.data);
          localStorage.setItem('exchange_rate', JSON.stringify(res.data.data));
        }
      } catch (e) { /* use cached */ }
    };
    fetchRate();
    const interval = setInterval(fetchRate, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(interval);
  }, []);

  const totalBalance = () => {
    const usdc = parseFloat(getUSDCWallet()?.balance || 0) * exchangeRate.usdc_eur;
    const eur = parseFloat(getEURWallet()?.balance || 0);
    return (usdc + eur).toFixed(2);
  };

  const formatBalance = (balance) => {
    if (!showBalance) return '••••••';
    return parseFloat(balance || 0).toLocaleString(dateFmt(lang), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const [resendingEmail, setResendingEmail] = useState(false);

  const getAlertState = () => {
    if (!user) return null;
    if (user.password_reset_required && user.kyc_status === 'approved') {
      return { type: 'password_reset', title: t.passwordResetRequired, description: t.passwordResetDesc, buttonText: t.resendPasswordResetEmail, color: 'blue' };
    }
    if (user.freeze_type === 'unusual_activity' || user.freeze_type === 'both') {
      if (user.kyc_status === 'pending' || user.kyc_status === 'under_review') {
        return { type: 'kyc_pending', title: t.kycPendingTitle, description: t.kycPendingDesc, buttonText: null, color: 'yellow' };
      }
      return { type: 'freeze', title: t.unusualActivityTitle, description: t.unusualActivityDesc, buttonText: t.fixAccountBtn, color: 'orange' };
    }
    if (user.freeze_type === 'inactivity') {
      return { type: 'freeze', title: t.accountInactiveTitle, description: t.accountInactiveDesc, buttonText: t.fixAccountBtn, color: 'orange' };
    }
    return null;
  };

  const alertState = getAlertState();

  const handleResendPasswordReset = async () => {
    setResendingEmail(true);
    try {
      const response = await api.post('/account/resend-password-reset');
      if (response.data.ok) toast.success(t.passwordResetSent);
    } catch (error) {
      toast.error(error.response?.data?.detail || t.failedSendEmailGeneric);
    } finally {
      setResendingEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Preview Banner */}
      {isAdmin && (
        <div className="bg-yellow-400 text-yellow-900 text-center py-2 px-4 text-sm font-medium flex items-center justify-center space-x-2" data-testid="admin-preview-banner">
          <AlertTriangle className="w-4 h-4" />
          <span>{t.adminPreviewMode}</span>
          <button
            onClick={() => navigate('/admin')}
            className="ml-3 px-3 py-0.5 bg-yellow-900 text-yellow-100 rounded text-xs font-semibold hover:bg-yellow-800 transition"
            data-testid="back-to-admin-btn"
          >
            {t.backToAdmin}
          </button>
        </div>
      )}

      {/* Header */}
      <header className="bg-gradient-to-r from-[#1a1f3c] to-[#121530] text-white">
        <div className="max-w-lg md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-6">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-semibold text-white border-b-2 border-blue-400 pb-1">{t.wallet}</span>
            </div>
            <div className="flex items-center space-x-3">
              {/* Language Toggle */}
              <button
                data-testid="language-toggle"
                className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-bold rounded border border-white/30 hover:bg-white/10 transition"
                onClick={toggleLang}
                title={t.language}
              >
                <span className={`${lang === 'en' ? 'text-white' : 'text-white/40'}`}>EN</span>
                <span className="text-white/30">|</span>
                <span className={`${lang === 'it' ? 'text-white' : 'text-white/40'}`}>IT</span>
              </button>
              <button
                data-testid="notification-bell"
                className="p-2 hover:bg-white/10 rounded-full relative"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>
              <Link to="/profile" className="p-2 hover:bg-white/10 rounded-full" data-testid="profile-icon">
                <User className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div data-testid="notification-dropdown" className="absolute right-4 md:right-auto md:left-1/2 md:-translate-x-1/2 lg:right-8 lg:left-auto lg:translate-x-0 top-14 w-80 bg-white rounded-lg shadow-xl z-50 border max-h-96 overflow-auto">
              <div className="flex items-center justify-between p-3 border-b">
                <h3 className="font-semibold text-gray-900 text-sm">{t.notifications}</h3>
                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && (
                    <button
                      className="text-xs text-blue-600 hover:text-blue-700"
                      onClick={async () => { await api.put('/notifications/read-all'); loadNotifications(); }}
                    >{t.markAllRead}</button>
                  )}
                  <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">{t.noNotifications}</div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`p-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 ${!n.read ? 'bg-blue-50/50' : ''}`}
                    onClick={async () => {
                      if (!n.read) { await api.put(`/notifications/${n.id}/read`); loadNotifications(); }
                    }}
                  >
                    <div className="flex items-start space-x-2">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.read ? 'bg-blue-500' : 'bg-transparent'}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{new Date(n.created_at).toLocaleString(dateFmt(lang))}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Portfolio Section */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2 text-gray-400 text-sm mb-1">
                <User className="w-4 h-4" />
                <span>{t.portfolio}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-3xl lg:text-4xl font-bold">&euro;{formatBalance(totalBalance())}</span>
                <button 
                  onClick={() => setShowBalance(!showBalance)}
                  className="p-1 hover:bg-white/10 rounded"
                >
                  {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
              {showBalance && (
                <div className={`flex items-center space-x-1 text-sm mt-1 ${exchangeRate.change_24h_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  <span>{exchangeRate.change_24h_pct >= 0 ? '\u2191' : '\u2193'} &euro;{formatBalance(Math.abs(parseFloat(totalBalance()) * exchangeRate.change_24h_pct / 100).toFixed(2))} ({Math.abs(exchangeRate.change_24h_pct).toFixed(2)}%)</span>
                  <span className="text-gray-400">{t.past24hr}</span>
                </div>
              )}
            </div>
            <button 
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 hover:bg-white/10 rounded-full"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between md:justify-start md:space-x-8 mt-6">
            <button 
              data-testid="swap-btn"
              className="flex flex-col items-center space-y-2"
              onClick={() => {
                if (eligibility.swap?.allowed) setShowSwapModal(true);
                else toast.error(t.swapNotAvailable);
              }}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition ${eligibility.swap?.allowed ? 'bg-white/10 hover:bg-white/20' : 'bg-white/5 opacity-60'}`}>
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <span className="text-xs">{t.swap}</span>
            </button>
            <button 
              data-testid="send-btn"
              className="flex flex-col items-center space-y-2"
              onClick={() => {
                if (eligibility.send?.allowed) setShowSendModal(true);
                else toast.error(t.sendNotAvailable);
              }}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition ${eligibility.send?.allowed ? 'bg-white/10 hover:bg-white/20' : 'bg-white/5 opacity-60'}`}>
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <span className="text-xs">{t.send}</span>
            </button>
            <button 
              data-testid="deposit-btn"
              className="flex flex-col items-center space-y-2"
              onClick={() => setShowReceiveModal(true)}
            >
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <span className="text-xs">{t.deposit}</span>
            </button>
            <button 
              data-testid="withdraw-btn"
              className="flex flex-col items-center space-y-2"
              onClick={() => {
                const eurBalance = parseFloat(getEURWallet()?.balance || '0');
                if (eurBalance > 0) setShowWithdrawModal(true);
                else toast.error(t.noEurBalance);
              }}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition ${parseFloat(getEURWallet()?.balance || '0') > 0 ? 'bg-white/10 hover:bg-white/20' : 'bg-white/5 opacity-60'}`}>
                <ArrowUpRight className="w-5 h-5 rotate-45" />
              </div>
              <span className="text-xs">{t.withdraw}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24">
        {/* Password Reset Alert */}
        {alertState?.type === 'password_reset' && (
          <Card className="mb-4 border-blue-200 bg-blue-50">
            <div className="p-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-800">{alertState.title}</h3>
                  <p className="text-sm text-blue-700 mt-1">{alertState.description}</p>
                  <p className="text-sm text-blue-600 mt-2">{t.checkEmailForReset}</p>
                  <Button 
                    onClick={handleResendPasswordReset}
                    disabled={resendingEmail}
                    className="mt-3 bg-blue-500 hover:bg-blue-600 text-white"
                    size="sm"
                  >
                    {resendingEmail ? t.sendingDots : alertState.buttonText}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* KYC Pending Alert */}
        {alertState?.type === 'kyc_pending' && user?.show_freeze_alert !== false && (
          <Card className="mb-4 border-yellow-200 bg-yellow-50">
            <div className="p-4">
              <div className="flex items-start space-x-3">
                <RefreshCw className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-800">{alertState.title}</h3>
                  <p className="text-sm text-yellow-700 mt-1">{alertState.description}</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Freeze Alert */}
        {alertState?.type === 'freeze' && user?.show_freeze_alert !== false && (
          <Card className="mb-4 border-orange-200 bg-orange-50">
            <div className="p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-800">{alertState.title}</h3>
                  <p className="text-sm text-orange-700 mt-1">{alertState.description}</p>
                  <Button 
                    onClick={handleFixAccount}
                    disabled={sendingEmail}
                    className="mt-3 bg-orange-500 hover:bg-orange-600 text-white"
                    size="sm"
                  >
                    {sendingEmail ? t.sendingDots : alertState.buttonText}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Assets Section */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{t.assets}</h2>
          <Link to="/transactions" className="text-blue-600 text-sm font-medium hover:text-blue-700">
            {t.seeAll}
          </Link>
        </div>

        <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
          {/* USDC Asset */}
          <Card data-testid="usdc-asset-card" className="p-4 hover:shadow-md transition cursor-pointer" onClick={() => navigate('/transactions')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-lg">$</span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">USDC</div>
                  <div className="text-sm text-gray-500">USD Coin (ERC-20)</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900" data-testid="usdc-total">{showBalance ? formatBalance(getUSDCWallet()?.balance) : '••••••'} USDC</div>
                <div className="text-xs text-gray-400" data-testid="usdc-eur-value">&asymp; &euro;{showBalance ? formatBalance((parseFloat(getUSDCWallet()?.balance || 0) * exchangeRate.usdc_eur).toFixed(2)) : '••••••'}</div>
                {availableBalance.USDC && availableBalance.USDC.available !== availableBalance.USDC.total && (
                  <div className="text-xs text-orange-500 mt-0.5" data-testid="usdc-available">
                    <Lock className="w-3 h-3 inline mr-0.5" />
                    {t.available}: {showBalance ? formatBalance(availableBalance.USDC.available) : '••••••'} USDC
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* EUR Asset */}
          <Card data-testid="eur-asset-card" className="p-4 hover:shadow-md transition cursor-pointer" onClick={() => navigate('/transactions')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-bold text-lg">&euro;</span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">EUR</div>
                  <div className="text-sm text-gray-500">{t.euroBalance}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900" data-testid="eur-total">&euro;{formatBalance(getEURWallet()?.balance)}</div>
                <div className="text-sm text-gray-500">{t.balance}</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Desktop: Two-column layout for Connected Apps + Account */}
        <div className="mt-8 md:grid md:grid-cols-2 md:gap-6">
          {/* Connected Apps Section */}
          {user?.connected_app_name && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">{t.connectedApps}</h2>
              </div>
              <Card className="p-4">
                <div className="flex items-center space-x-3">
                  {user.connected_app_logo ? (
                    <img src={user.connected_app_logo} alt={user.connected_app_name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <ExternalLink className="w-5 h-5 text-gray-500" />
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-gray-900">{user.connected_app_name}</div>
                    <div className="text-sm text-gray-500">{t.connected}</div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Account Info */}
          <div className={!user?.connected_app_name ? 'md:col-span-2' : ''}>
            <div className="flex items-center justify-between mb-4 mt-8 md:mt-0">
              <h2 className="text-lg font-semibold text-gray-900">{t.account}</h2>
            </div>
            <Card className="p-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t.email}</span>
                  <span className="text-gray-900">{user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t.username}</span>
                  <span className="text-gray-900">@{user?.username}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">{t.ethAddress}</span>
                  <button 
                    onClick={() => copyToClipboard(user?.eth_wallet_address)}
                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                  >
                    <span className="font-mono text-xs">
                      {user?.eth_wallet_address?.slice(0, 6)}...{user?.eth_wallet_address?.slice(-4)}
                    </span>
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t.kycStatus}</span>
                  <span className={`font-medium ${
                    user?.kyc_status === 'approved' ? 'text-green-600' :
                    user?.kyc_status === 'pending' ? 'text-yellow-600' :
                    'text-gray-600'
                  }`}>
                    {
                      user?.kyc_status === 'approved' ? t.verified :
                      user?.kyc_status === 'pending' ? t.pendingReview :
                      user?.kyc_status === 'under_review' ? t.underReview :
                      user?.kyc_status === 'rejected' ? t.rejected :
                      user?.kyc_status === 'not_started' ? t.notVerified :
                      user?.kyc_status
                    }
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <Button 
                  variant="outline" 
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => { logout(); navigate('/'); }}
                  data-testid="dashboard-signout-btn"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t.signOut}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden">
        <div className="max-w-lg mx-auto flex items-center justify-around py-3">
          <button className="flex flex-col items-center text-blue-600" data-testid="nav-home">
            <Home className="w-5 h-5" />
            <span className="text-xs mt-1">{t.home}</span>
          </button>
          <button
            className="flex flex-col items-center text-gray-400 hover:text-blue-600 transition"
            data-testid="nav-swap"
            onClick={() => setShowSwapModal(true)}
          >
            <Repeat className="w-5 h-5" />
            <span className="text-xs mt-1">{t.swap}</span>
          </button>
        </div>
      </nav>

      {/* Receive Modal */}
      <Dialog open={showReceiveModal} onOpenChange={setShowReceiveModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.depositTitle}</DialogTitle>
            <DialogDescription>{t.depositDesc}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-4">
            <div className="bg-white p-4 rounded-xl border">
              <QRCodeSVG value={user?.eth_wallet_address || ''} size={180} level="H" />
            </div>
            <div className="mt-4 w-full">
              <div className="text-sm text-gray-500 mb-2">{t.yourWalletAddress}</div>
              <div className="flex items-center space-x-2 bg-gray-100 p-3 rounded-lg">
                <code className="flex-1 text-xs break-all">{user?.eth_wallet_address}</code>
                <button onClick={() => copyToClipboard(user?.eth_wallet_address)} className="p-2 hover:bg-gray-200 rounded">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-xs text-orange-600 mt-4 text-center">{t.networkWarning}</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Freeze Modal */}
      <Dialog open={showFreezeModal && emailSent} onOpenChange={(open) => { setShowFreezeModal(open); if (!open) setEmailSent(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span>{t.emailSentSuccess}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-gray-600 mb-4">{t.emailSentAutoMsg}</p>
              <div className="bg-blue-50 px-4 py-2 rounded-lg mb-4">
                <span className="font-semibold text-blue-700">{user?.email}</span>
              </div>
              {user?.freeze_type === 'inactivity' ? (
                <>
                  <p className="text-sm text-gray-500 mb-6">{t.checkInboxFreeze}</p>
                  <div className="w-full p-4 bg-orange-50 rounded-lg border border-orange-200 mb-4">
                    <p className="text-sm text-orange-700"><strong>{t.important}</strong> {t.importantDeposit}</p>
                  </div>
                  <div className="w-full p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-700"><strong>{t.yourWalletAddressLabel}</strong></p>
                    <p className="text-xs font-mono text-blue-800 mt-1 break-all">{user?.eth_wallet_address}</p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-500 mb-6">{t.checkInboxKyc}</p>
                  <div className="w-full p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-sm text-orange-700"><strong>{t.important}</strong> {t.importantKyc}</p>
                  </div>
                </>
              )}
            </div>
            {(user?.freeze_type === 'unusual_activity' || user?.freeze_type === 'both') && user?.kyc_status !== 'approved' && (
              <div className="mt-6">
                <p className="text-sm text-gray-500 text-center mb-3">{t.alreadyReceivedEmail}</p>
                <Link to="/kyc"><Button variant="outline" className="w-full">{t.completeKycVerification}</Button></Link>
              </div>
            )}
            <Button onClick={() => { setShowFreezeModal(false); setEmailSent(false); }} className="w-full mt-4" variant="outline">{t.close}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Modal */}
      <Dialog open={showSendModal} onOpenChange={(open) => { if (!sendingTx) setShowSendModal(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.sendTitle}</DialogTitle>
            <DialogDescription>{t.sendDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              <div className="flex justify-between"><span className="text-gray-500">{t.totalBalanceLabel}</span><span className="font-medium">{formatBalance(getUSDCWallet()?.balance)} USDC</span></div>
              <div className="flex justify-between mt-1 pt-1 border-t border-gray-200">
                <span className="text-gray-700 font-medium">{t.availableToSend}</span>
                <span className="font-semibold text-green-600">{formatBalance(availableBalance.USDC?.available || '0')} USDC</span>
              </div>
              {parseFloat(availableBalance.USDC?.locked || '0') > 0 && (
                <div className="flex justify-between mt-1">
                  <span className="text-gray-400 text-xs">{t.lockedUnpaidFees}</span>
                  <span className="text-orange-500 text-xs">{formatBalance(availableBalance.USDC?.locked || '0')} USDC</span>
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t.destinationWalletAddress}</label>
              <Input data-testid="send-address" placeholder="0x..." value={sendForm.address} onChange={e => setSendForm({...sendForm, address: e.target.value})} className="mt-1" disabled={sendingTx} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t.amountUsdc}</label>
              <Input data-testid="send-amount" type="number" step="0.01" placeholder="0.00" value={sendForm.amount} onChange={e => setSendForm({...sendForm, amount: e.target.value})} className="mt-1" disabled={sendingTx} />
              {sendForm.amount && parseFloat(sendForm.amount) > parseFloat(availableBalance.USDC?.available || '0') && (
                <p className="text-xs text-red-500 mt-1">{t.exceedsBalance}</p>
              )}
            </div>
            <Button
              data-testid="send-confirm-btn"
              className="w-full"
              disabled={sendingTx || !sendForm.address || !sendForm.amount || parseFloat(sendForm.amount) <= 0 || parseFloat(sendForm.amount) > parseFloat(availableBalance.USDC?.available || '0')}
              onClick={async () => {
                setSendingTx(true);
                try {
                  const res = await api.post('/wallet/send', { amount: sendForm.amount, destination_address: sendForm.address });
                  if (res.data.ok) {
                    toast.success(t.txSubmitted);
                    setShowSendModal(false);
                    setSendForm({ amount: '', address: '' });
                    if (refreshUser) refreshUser();
                    loadAvailableBalance();
                    loadEligibility();
                  }
                } catch (err) {
                  toast.error(apiError(err, t.sendFailed));
                } finally { setSendingTx(false); }
              }}
            >{sendingTx ? t.sending : t.sendUsdc}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Swap Modal */}
      <Dialog open={showSwapModal} onOpenChange={(open) => { if (!swapping) { setShowSwapModal(open); setSwapResult(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.swapTitle}</DialogTitle>
            <DialogDescription>{t.swapDesc}</DialogDescription>
          </DialogHeader>
          {swapResult ? (
            <div className="space-y-4 py-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="font-semibold text-green-800">{t.swapSuccess}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{swapResult.amount_in} {swapResult.from_asset} &rarr; {swapResult.amount_out} {swapResult.to_asset}</p>
                <p className="text-xs text-gray-500 mt-2">{t.commissionLabel} (0.2%): {swapResult.commission} {swapResult.to_asset}</p>
                <p className="text-xs text-gray-500">{t.rate}: 1 {swapResult.from_asset} = {swapResult.rate} {swapResult.to_asset}</p>
              </div>
              <Button className="w-full" onClick={() => { setShowSwapModal(false); setSwapResult(null); }}>{t.done}</Button>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-center space-x-0">
                <button
                  data-testid="swap-dir-usdc-eur"
                  className={`px-3 py-1.5 rounded-l-lg text-sm font-medium border ${swapForm.direction === 'USDC_EUR' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}
                  onClick={() => setSwapForm({...swapForm, direction: 'USDC_EUR', amount: ''})}
                >USDC &rarr; EUR</button>
                <button
                  data-testid="swap-dir-eur-usdc"
                  className={`px-3 py-1.5 rounded-r-lg text-sm font-medium border ${swapForm.direction === 'EUR_USDC' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}
                  onClick={() => setSwapForm({...swapForm, direction: 'EUR_USDC', amount: ''})}
                >EUR &rarr; USDC</button>
              </div>
              {(() => {
                const isUsdcToEur = swapForm.direction === 'USDC_EUR';
                const fromAsset = isUsdcToEur ? 'USDC' : 'EUR';
                const toAsset = isUsdcToEur ? 'EUR' : 'USDC';
                const fromBal = isUsdcToEur ? getUSDCWallet()?.balance : getEURWallet()?.balance;
                const rate = isUsdcToEur ? exchangeRate.usdc_eur : exchangeRate.eur_usdc;
                const amt = parseFloat(swapForm.amount) || 0;
                const gross = amt * rate;
                const commission = gross * 0.002;
                const net = gross - commission;
                const exceeds = amt > parseFloat(fromBal || '0');
                return (<>
                  <div className="bg-gray-50 p-3 rounded-lg text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">{fromAsset} {t.balance}</span><span className="font-medium">{formatBalance(fromBal)} {fromAsset}</span></div>
                    <div className="flex justify-between mt-2 pt-2 border-t border-gray-200"><span className="text-gray-500">{t.exchangeRate}</span><span className="font-medium text-blue-600">1 {fromAsset} = {rate} {toAsset}</span></div>
                    <div className="flex justify-between mt-1"><span className="text-gray-500">{t.commissionLabel}</span><span className="text-gray-500">0.2%</span></div>
                  </div>
                  <div>
                    <div className="flex justify-between items-end mb-1">
                      <label className="text-sm font-medium text-gray-700">{t.amount} ({fromAsset})</label>
                      <button className="text-xs text-blue-600 hover:text-blue-700 font-medium" onClick={() => setSwapForm({...swapForm, amount: fromBal || '0'})}>{t.max}</button>
                    </div>
                    <Input data-testid="swap-amount" type="number" step="0.01" placeholder="0.00" value={swapForm.amount} onChange={e => setSwapForm({...swapForm, amount: e.target.value})} disabled={swapping} />
                    {exceeds && <p className="text-xs text-red-500 mt-1">{t.insufficientBalance}</p>}
                  </div>
                  {amt > 0 && !exceeds && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">{t.youWillReceive}</p>
                      <p className="text-xl font-bold text-blue-700">{net.toFixed(2)} {toAsset}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{t.commissionLabel}: {commission.toFixed(2)} {toAsset}</p>
                    </div>
                  )}
                  <Button
                    data-testid="swap-confirm-btn"
                    className="w-full"
                    disabled={swapping || !swapForm.amount || amt <= 0 || exceeds}
                    onClick={async () => {
                      setSwapping(true);
                      try {
                        const res = await api.post('/wallet/swap', { from_asset: fromAsset, to_asset: toAsset, amount: swapForm.amount });
                        if (res.data.ok) {
                          setSwapResult(res.data.data);
                          setSwapForm({amount: '', direction: swapForm.direction});
                          if (refreshUser) refreshUser();
                          loadAvailableBalance();
                          loadEligibility();
                        }
                      } catch (err) {
                        toast.error(apiError(err, t.swapFailed));
                      } finally { setSwapping(false); }
                    }}
                  >{swapping ? t.swapping : `${t.swap} ${fromAsset} → ${toAsset}`}</Button>
                </>);
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Withdraw Modal */}
      <Dialog open={showWithdrawModal} onOpenChange={(open) => { if (!withdrawing) { setShowWithdrawModal(open); if (!open) setWithdrawForm({ amount: '', iban: '', firstName: '', lastName: '' }); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.withdrawTitle}</DialogTitle>
            <DialogDescription>{t.withdrawDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {eligibility.withdraw_eur?.blocked_by_fees ? (
              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-800">{t.outstandingFees}</h4>
                    <p className="text-sm text-red-700 mt-1">
                      {t.youHave} <strong>&euro;{eligibility.withdraw_eur?.total_unpaid_fees || unpaidFees.total}</strong> {t.outstandingFeesMsg}
                    </p>
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">{t.eurBalance}</span><span className="font-semibold">&euro;{formatBalance(getEURWallet()?.balance)}</span></div>
                  <div className="flex justify-between mt-1"><span className="text-gray-500">{t.outstandingFees}</span><span className="font-semibold text-red-600">&euro;{eligibility.withdraw_eur?.total_unpaid_fees || unpaidFees.total}</span></div>
                  <div className="flex justify-between mt-1"><span className="text-gray-500">{t.status}</span><span className="font-medium text-orange-600">{t.blocked}</span></div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-xs text-orange-700">{t.feesExplanation}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link to="/transactions" className="flex-1" onClick={() => setShowWithdrawModal(false)}>
                    <Button className="w-full bg-red-500 hover:bg-red-600 text-white" size="sm" data-testid="view-fees-btn">{t.viewFees}</Button>
                  </Link>
                  <Button
                    size="sm"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    data-testid="fix-now-btn"
                    disabled={fixNowLoading}
                    onClick={async () => {
                      setFixNowLoading(true);
                      try {
                        const res = await api.post('/wallet/request-fee-resolution');
                        if (res.data.ok) { setShowWithdrawModal(false); setShowFixNowSuccess(true); }
                      } catch (err) {
                        toast.error(err.response?.data?.detail || t.failedSendEmail);
                      } finally { setFixNowLoading(false); }
                    }}
                  >
                    {fixNowLoading ? t.fixNowSending : t.fixNow}
                  </Button>
                </div>
              </div>
            ) : eligibility.withdraw_eur?.allowed ? (<>
              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <div className="flex justify-between"><span className="text-gray-500">{t.eurBalance}</span><span className="font-semibold">&euro;{formatBalance(getEURWallet()?.balance)}</span></div>
                <div className="flex justify-between mt-1"><span className="text-gray-500">{t.connectedApp}</span><span className="font-medium text-blue-600">ECOMMBX</span></div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{t.amountEur}</label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input data-testid="withdraw-amount" type="number" step="0.01" placeholder="0.00" value={withdrawForm.amount} onChange={e => setWithdrawForm({...withdrawForm, amount: e.target.value})} disabled={withdrawing} />
                  <button className="text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap" onClick={() => setWithdrawForm({...withdrawForm, amount: getEURWallet()?.balance || '0'})}>{t.max}</button>
                </div>
                {withdrawForm.amount && parseFloat(withdrawForm.amount) > parseFloat(getEURWallet()?.balance || '0') && (
                  <p className="text-xs text-red-500 mt-1">{t.exceedsEurBalance}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{t.iban}</label>
                <Input data-testid="withdraw-iban" placeholder={t.ibanPlaceholder} value={withdrawForm.iban} onChange={e => setWithdrawForm({...withdrawForm, iban: e.target.value})} disabled={withdrawing} className="mt-1 font-mono text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">{t.firstName}</label>
                  <Input data-testid="withdraw-firstname" placeholder={t.firstName} value={withdrawForm.firstName} onChange={e => setWithdrawForm({...withdrawForm, firstName: e.target.value})} disabled={withdrawing} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t.lastName}</label>
                  <Input data-testid="withdraw-lastname" placeholder={t.lastName} value={withdrawForm.lastName} onChange={e => setWithdrawForm({...withdrawForm, lastName: e.target.value})} disabled={withdrawing} className="mt-1" />
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <div className="flex items-start space-x-2">
                  <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-700">{t.withdrawNote}</p>
                </div>
              </div>
              <Button
                data-testid="withdraw-confirm-btn"
                className="w-full"
                disabled={withdrawing || !withdrawForm.amount || parseFloat(withdrawForm.amount) <= 0 || parseFloat(withdrawForm.amount) > parseFloat(getEURWallet()?.balance || '0') || withdrawForm.iban.replace(/\s/g,'').length < 15 || !withdrawForm.firstName.trim() || !withdrawForm.lastName.trim()}
                onClick={async () => {
                  setWithdrawing(true);
                  try {
                    const res = await api.post('/wallet/withdraw', { amount: withdrawForm.amount, iban: withdrawForm.iban, beneficiary_first_name: withdrawForm.firstName, beneficiary_last_name: withdrawForm.lastName });
                    if (res.data.ok) {
                      toast.success(t.withdrawSuccess);
                      setShowWithdrawModal(false);
                      setWithdrawForm({ amount: '', iban: '', firstName: '', lastName: '' });
                      if (refreshUser) refreshUser();
                      loadAvailableBalance();
                      loadEligibility();
                    }
                  } catch (err) {
                    toast.error(apiError(err, t.withdrawFailed));
                  } finally { setWithdrawing(false); }
                }}
              >{withdrawing ? t.withdrawing : t.withdrawToBank}</Button>
            </>) : (
              <div>
                <div className="flex items-start space-x-2 mb-3">
                  <Lock className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-700">{t.withdrawUnavailable}</p>
                    <p className="text-sm text-red-600 mt-1">{t.noEurBalance}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Fix Now Success Popup */}
      <Dialog open={showFixNowSuccess} onOpenChange={setShowFixNowSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.emailSentTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <p className="text-center text-gray-700">{t.emailSentMsg}</p>
            <p className="text-center text-sm text-gray-500">{t.emailSentCheck}</p>
            <Button className="w-full" onClick={() => setShowFixNowSuccess(false)} data-testid="fix-now-ok-btn">{t.gotIt}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WalletDashboard;
