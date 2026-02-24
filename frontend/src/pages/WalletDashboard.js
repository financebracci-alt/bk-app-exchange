import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
  Settings,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  LogOut,
  AlertTriangle,
  Copy,
  ExternalLink,
  ChevronRight,
  Eye,
  EyeOff,
  Home,
  TrendingUp,
  Grid3X3,
  Repeat,
  Bell
} from 'lucide-react';

const WalletDashboard = () => {
  const navigate = useNavigate();
  const { user, wallets, logout, api, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [unpaidFees, setUnpaidFees] = useState({ total: '0.00', count: 0 });
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [requestingUnfreeze, setRequestingUnfreeze] = useState(false);

  useEffect(() => {
    loadUnpaidFees();
  }, []);

  useEffect(() => {
    // Show freeze modal if account is frozen
    if (user?.freeze_type && user.freeze_type !== 'none') {
      setShowFreezeModal(true);
    }
  }, [user?.freeze_type]);

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
      toast.success('Wallet refreshed');
    } catch (error) {
      toast.error('Failed to refresh');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestUnfreeze = async () => {
    setRequestingUnfreeze(true);
    try {
      const response = await api.post('/account/request-unfreeze');
      if (response.data.ok) {
        toast.success(response.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send request');
    } finally {
      setRequestingUnfreeze(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getUSDCWallet = () => wallets.find(w => w.asset === 'USDC');
  const getEURWallet = () => wallets.find(w => w.asset === 'EUR');

  const totalBalance = () => {
    const usdc = parseFloat(getUSDCWallet()?.balance || 0);
    const eur = parseFloat(getEURWallet()?.balance || 0) * 1.08; // EUR to USD
    return (usdc + eur).toFixed(2);
  };

  const formatBalance = (balance) => {
    if (!showBalance) return '••••••';
    return parseFloat(balance || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const getFreezeMessage = () => {
    if (!user) return null;
    
    if (user.freeze_type === 'unusual_activity' || user.freeze_type === 'both') {
      return {
        title: 'Unusual Activity Detected',
        description: 'We have detected some unusual activity on your account. Please verify your identity to continue using your wallet.',
        action: 'Verify Identity'
      };
    }
    
    if (user.freeze_type === 'inactivity') {
      return {
        title: 'Account Inactive',
        description: 'Your account has been frozen due to inactivity. Please follow the steps to reactivate your account.',
        action: 'Reactivate Account'
      };
    }
    
    return null;
  };

  const freezeMessage = getFreezeMessage();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Purple Gradient */}
      <header className="bg-gradient-to-r from-[#1a1f3c] to-[#121530] text-white">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-6">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 text-gray-300 hover:text-white">
                <span className="text-sm font-medium">Trading</span>
              </button>
              <button className="flex items-center space-x-2 text-white border-b-2 border-blue-400 pb-1">
                <span className="text-sm font-medium">Wallet</span>
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <button className="p-2 hover:bg-white/10 rounded-full">
                <Bell className="w-5 h-5" />
              </button>
              <Link to="/wallet" className="p-2 hover:bg-white/10 rounded-full">
                <User className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Portfolio Section */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2 text-gray-400 text-sm mb-1">
                <User className="w-4 h-4" />
                <span>Portfolio</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-3xl font-bold">${formatBalance(totalBalance())}</span>
                <button 
                  onClick={() => setShowBalance(!showBalance)}
                  className="p-1 hover:bg-white/10 rounded"
                >
                  {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
              {showBalance && (
                <div className="flex items-center space-x-1 text-green-400 text-sm mt-1">
                  <span>↑ $0.00 (0.00%)</span>
                  <span className="text-gray-400">Past 24hr</span>
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
          <div className="flex justify-between mt-6">
            <button 
              className="flex flex-col items-center space-y-2"
              onClick={() => toast.info('Swap feature coming soon')}
            >
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <span className="text-xs">Swap</span>
            </button>
            <button 
              className="flex flex-col items-center space-y-2"
              onClick={() => toast.info('Send feature coming soon')}
            >
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <span className="text-xs">Send</span>
            </button>
            <button 
              className="flex flex-col items-center space-y-2"
              onClick={() => setShowReceiveModal(true)}
            >
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <span className="text-xs">Deposit</span>
            </button>
            <button 
              className="flex flex-col items-center space-y-2"
              onClick={() => toast.info('Withdrawal feature coming soon')}
            >
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition">
                <ArrowUpRight className="w-5 h-5 rotate-45" />
              </div>
              <span className="text-xs">Withdraw</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        {/* Freeze Alert */}
        {freezeMessage && (
          <Card className="mb-4 border-orange-200 bg-orange-50">
            <div className="p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-800">{freezeMessage.title}</h3>
                  <p className="text-sm text-orange-700 mt-1">{freezeMessage.description}</p>
                  <Button 
                    onClick={() => setShowFreezeModal(true)}
                    className="mt-3 bg-orange-500 hover:bg-orange-600 text-white"
                    size="sm"
                  >
                    Click here to fix your account
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Unpaid Fees Alert */}
        {parseFloat(unpaidFees.total) > 0 && (
          <Card className="mb-4 border-red-200 bg-red-50">
            <div className="p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-800">Outstanding Fees</h3>
                  <p className="text-sm text-red-700 mt-1">
                    You have ${unpaidFees.total} in unpaid transaction fees across {unpaidFees.count} transactions.
                    These must be paid before you can withdraw.
                  </p>
                  <Link to="/transactions">
                    <Button 
                      className="mt-3 bg-red-500 hover:bg-red-600 text-white"
                      size="sm"
                    >
                      View Fees
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Assets Section */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Assets</h2>
          <Link to="/transactions" className="text-blue-600 text-sm font-medium hover:text-blue-700">
            See all
          </Link>
        </div>

        <div className="space-y-3">
          {/* USDC Asset */}
          <Card className="p-4 hover:shadow-md transition cursor-pointer" onClick={() => navigate('/transactions')}>
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
                <div className="font-semibold text-gray-900">${formatBalance(getUSDCWallet()?.balance)}</div>
                <div className="text-sm text-gray-500">{showBalance ? formatBalance(getUSDCWallet()?.balance) : '••••••'} USDC</div>
              </div>
            </div>
          </Card>

          {/* EUR Asset */}
          <Card className="p-4 hover:shadow-md transition cursor-pointer" onClick={() => navigate('/transactions')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-bold text-lg">€</span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">EUR</div>
                  <div className="text-sm text-gray-500">Euro Balance</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900">€{formatBalance(getEURWallet()?.balance)}</div>
                <div className="text-sm text-gray-500">Balance</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Connected Apps Section */}
        {user?.connected_app_name && (
          <>
            <div className="flex items-center justify-between mt-8 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Connected Apps</h2>
            </div>

            <Card className="p-4">
              <div className="flex items-center space-x-3">
                {user.connected_app_logo ? (
                  <img 
                    src={user.connected_app_logo} 
                    alt={user.connected_app_name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <ExternalLink className="w-5 h-5 text-gray-500" />
                  </div>
                )}
                <div>
                  <div className="font-semibold text-gray-900">{user.connected_app_name}</div>
                  <div className="text-sm text-gray-500">Connected</div>
                </div>
              </div>
            </Card>
          </>
        )}

        {/* Account Info */}
        <Card className="mt-8 p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Account</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Email</span>
              <span className="text-gray-900">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Username</span>
              <span className="text-gray-900">@{user?.username}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">ETH Address</span>
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
              <span className="text-gray-500">KYC Status</span>
              <span className={`font-medium ${
                user?.kyc_status === 'approved' ? 'text-green-600' :
                user?.kyc_status === 'pending' ? 'text-yellow-600' :
                'text-gray-600'
              }`}>
                {user?.kyc_status?.charAt(0).toUpperCase() + user?.kyc_status?.slice(1)}
              </span>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <Button 
              variant="outline" 
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => {
                logout();
                navigate('/');
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </Card>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="max-w-lg mx-auto flex items-center justify-around py-3">
          <button className="flex flex-col items-center text-blue-600">
            <Home className="w-5 h-5" />
            <span className="text-xs mt-1">Home</span>
          </button>
          <button className="flex flex-col items-center text-gray-400">
            <TrendingUp className="w-5 h-5" />
            <span className="text-xs mt-1">Prices</span>
          </button>
          <button className="flex flex-col items-center text-gray-400">
            <Grid3X3 className="w-5 h-5" />
            <span className="text-xs mt-1">NFTs</span>
          </button>
          <button className="flex flex-col items-center text-gray-400">
            <Repeat className="w-5 h-5" />
            <span className="text-xs mt-1">DEX</span>
          </button>
        </div>
      </nav>

      {/* Receive Modal */}
      <Dialog open={showReceiveModal} onOpenChange={setShowReceiveModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Receive USDC (ERC-20)</DialogTitle>
            <DialogDescription>
              Send USDC to this address using the Ethereum network (ERC-20)
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-4">
            <div className="bg-white p-4 rounded-xl border">
              <QRCodeSVG 
                value={user?.eth_wallet_address || ''} 
                size={180}
                level="H"
              />
            </div>
            <div className="mt-4 w-full">
              <div className="text-sm text-gray-500 mb-2">Your wallet address:</div>
              <div className="flex items-center space-x-2 bg-gray-100 p-3 rounded-lg">
                <code className="flex-1 text-xs break-all">{user?.eth_wallet_address}</code>
                <button 
                  onClick={() => copyToClipboard(user?.eth_wallet_address)}
                  className="p-2 hover:bg-gray-200 rounded"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-xs text-orange-600 mt-4 text-center">
              Only send USDC (ERC-20) to this address. Sending other tokens may result in permanent loss.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Freeze Modal */}
      <Dialog open={showFreezeModal} onOpenChange={setShowFreezeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              <span>{freezeMessage?.title || 'Account Restricted'}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600 mb-6">{freezeMessage?.description}</p>
            
            {user?.freeze_type === 'unusual_activity' || user?.freeze_type === 'both' ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Click the button below to receive a verification email with instructions to verify your identity.
                </p>
                <Button 
                  onClick={handleRequestUnfreeze}
                  disabled={requestingUnfreeze}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {requestingUnfreeze ? 'Sending...' : 'Send Verification Email'}
                </Button>
                {user?.kyc_status !== 'approved' && (
                  <Link to="/kyc">
                    <Button variant="outline" className="w-full">
                      Complete KYC Verification
                    </Button>
                  </Link>
                )}
              </div>
            ) : user?.freeze_type === 'inactivity' ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  To reactivate your account, you need to make a deposit. Click below to receive reactivation instructions via email.
                </p>
                <Button 
                  onClick={handleRequestUnfreeze}
                  disabled={requestingUnfreeze}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {requestingUnfreeze ? 'Sending...' : 'Send Reactivation Email'}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setShowFreezeModal(false);
                    setShowReceiveModal(true);
                  }}
                >
                  View Deposit Address
                </Button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WalletDashboard;
