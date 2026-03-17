import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from './AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Save, Mail, RefreshCw, Wallet, History, User, Shield, Eye, EyeOff, AlertTriangle, DollarSign, Plus, Edit, Trash2, ArrowDownLeft, ArrowUpRight, CheckCircle, Copy } from 'lucide-react';

const AdminEditUser = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  
  // Transaction modal state
  const [showTxModal, setShowTxModal] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [txForm, setTxForm] = useState({
    type: 'deposit',
    amount: '',
    asset: 'USDC',
    fee: '0.00',
    fee_paid: false,
    transaction_date: new Date().toISOString().slice(0, 16),
    status: 'completed',
    description: '',
    external_wallet: '',
  });
  const [savingTx, setSavingTx] = useState(false);
  const [markingFees, setMarkingFees] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    phone: '',
    date_of_birth: '',
    eth_wallet_address: '',
    freeze_type: 'none',
    account_status: 'active',
    connected_app_name: '',
    connected_app_logo: '',
    total_unpaid_fees: '0.00',
    fees_paid: false,
    role: 'user',
    show_fees_alert: true,
    show_freeze_alert: true,
    password_reset_required: false,
    kyc_status: 'not_started',
    plain_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadUser();
  }, [userId]);

  const loadUser = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/admin/users/${userId}`);
      if (response.data.ok) {
        const userData = response.data.data.user;
        setUser(userData);
        setWallets(response.data.data.wallets || []);
        setFormData({
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          email: userData.email || '',
          username: userData.username || '',
          phone: userData.phone || '',
          date_of_birth: userData.date_of_birth || '',
          eth_wallet_address: userData.eth_wallet_address || '',
          freeze_type: userData.freeze_type || 'none',
          account_status: userData.account_status || 'active',
          connected_app_name: userData.connected_app_name || '',
          connected_app_logo: userData.connected_app_logo || '',
          total_unpaid_fees: userData.total_unpaid_fees || '0.00',
          fees_paid: userData.fees_paid || false,
          role: userData.role || 'user',
          show_fees_alert: userData.show_fees_alert !== false,
          show_freeze_alert: userData.show_freeze_alert !== false,
          password_reset_required: userData.password_reset_required || false,
          kyc_status: userData.kyc_status || 'not_started',
          plain_password: userData.plain_password || '',
        });
        // Load transactions
        loadTransactions();
      }
    } catch (error) {
      toast.error('Failed to load user');
      navigate('/admin/users');
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const response = await api.get('/admin/transactions', {
        params: { user_id: userId, page_size: 50 }
      });
      if (response.data.ok) {
        setTransactions(response.data.data.transactions);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await api.put(`/admin/users/${userId}`, formData);
      if (response.data.ok) {
        toast.success('User updated successfully');
        if (response.data.emails_resent?.length > 0) {
          const types = response.data.emails_resent.map(t => t.replace('_', ' ')).join(', ');
          toast.info(`Email changed — automatically resent: ${types}`);
        }
        loadUser();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateWallet = async (asset, newBalance) => {
    try {
      const response = await api.put(`/admin/wallets/${userId}/${asset}`, null, {
        params: { balance: newBalance }
      });
      if (response.data.ok) {
        toast.success('Balance updated');
        loadUser();
      }
    } catch (error) {
      toast.error('Failed to update balance');
    }
  };

  const handleSendEmail = async (emailType) => {
    try {
      const response = await api.post(`/admin/users/${userId}/send-email`, null, {
        params: { email_type: emailType }
      });
      if (response.data.ok) {
        if (response.data.data.sent) {
          toast.success('Email sent successfully');
        } else {
          toast.warning(`Email not sent: ${response.data.data.error || 'Email service not configured'}`);
        }
      }
    } catch (error) {
      toast.error('Failed to send email');
    }
  };

  // Transaction CRUD functions
  const openAddTransaction = () => {
    setEditingTx(null);
    setTxForm({
      type: 'deposit',
      amount: '',
      asset: 'USDC',
      fee: '0.00',
      fee_paid: false,
      transaction_date: new Date().toISOString().slice(0, 16),
      status: 'completed',
      description: '',
      external_wallet: '',
    });
    setShowTxModal(true);
  };

  const openEditTransaction = (tx) => {
    setEditingTx(tx);
    setTxForm({
      type: tx.type || 'deposit',
      amount: tx.amount || '',
      asset: tx.asset || 'USDC',
      fee: tx.fee || '0.00',
      fee_paid: tx.fee_paid || false,
      transaction_date: tx.transaction_date ? tx.transaction_date.slice(0, 16) : new Date().toISOString().slice(0, 16),
      status: tx.status || 'completed',
      description: tx.description || '',
      external_wallet: tx.external_wallet || '',
    });
    setShowTxModal(true);
  };

  const handleSaveTransaction = async () => {
    if (txForm.amount === '' || txForm.amount === null || txForm.amount === undefined) {
      toast.error('Please enter an amount');
      return;
    }

    setSavingTx(true);
    try {
      if (editingTx) {
        // Update existing transaction
        const response = await api.put(`/admin/transactions/${editingTx.id}`, {
          ...txForm,
          user_id: userId,
        });
        if (response.data.ok) {
          toast.success('Transaction updated');
          setShowTxModal(false);
          loadTransactions();
          loadUser(); // Refresh user data to update freeze status if needed
        }
      } else {
        // Create new transaction
        const response = await api.post('/admin/transactions', {
          ...txForm,
          user_id: userId,
        });
        if (response.data.ok) {
          toast.success('Transaction added');
          setShowTxModal(false);
          loadTransactions();
          loadUser(); // Refresh user data to update freeze status if needed
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save transaction');
    } finally {
      setSavingTx(false);
    }
  };

  const handleDeleteTransaction = async (txId) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    
    try {
      const response = await api.delete(`/admin/transactions/${txId}`);
      if (response.data.ok) {
        toast.success('Transaction deleted');
        loadTransactions();
        loadUser();
      }
    } catch (error) {
      toast.error('Failed to delete transaction');
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Edit User">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Edit User">
      <div className="max-w-4xl mx-auto">
        <Link to="/admin/users" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Users
        </Link>

        {/* User Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-600">
                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {user?.first_name} {user?.last_name}
                  </h2>
                  <p className="text-gray-500">{user?.email}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge className={user?.account_status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {user?.account_status}
                    </Badge>
                    <Badge className={user?.kyc_status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                      KYC: {user?.kyc_status}
                    </Badge>
                  </div>
                </div>
              </div>
              <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="details">
          <TabsList className="mb-4">
            <TabsTrigger value="details"><User className="w-4 h-4 mr-2" />Details</TabsTrigger>
            <TabsTrigger value="wallet"><Wallet className="w-4 h-4 mr-2" />Wallet</TabsTrigger>
            <TabsTrigger value="transactions"><History className="w-4 h-4 mr-2" />Transactions</TabsTrigger>
            <TabsTrigger value="actions"><Shield className="w-4 h-4 mr-2" />Actions</TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>User Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input
                      value={formData.first_name}
                      onChange={(e) => handleChange('first_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input
                      value={formData.last_name}
                      onChange={(e) => handleChange('last_name', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.plain_password}
                      onChange={(e) => handleChange('plain_password', e.target.value)}
                      placeholder="Enter new password or view current"
                      data-testid="admin-user-password-input"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPassword(!showPassword)}
                      data-testid="admin-toggle-password-visibility"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    {formData.plain_password ? 'Visible to admin. Edit to change the user\'s password.' : 'No plain text password stored. Set one here.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input
                    value={formData.username}
                    onChange={(e) => handleChange('username', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => handleChange('date_of_birth', e.target.value)}
                    data-testid="admin-user-dob-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label>ETH Wallet Address</Label>
                  <Input
                    value={formData.eth_wallet_address}
                    onChange={(e) => handleChange('eth_wallet_address', e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>

                {/* Last Send Destination - Read Only (saved when user sends USDC) */}
                {user?.last_send_destination ? (
                  <div className="space-y-2 bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <Label className="text-amber-800 font-semibold">Client's Last Send Destination</Label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 font-mono text-sm bg-white border border-amber-300 rounded px-3 py-2 break-all select-all">
                        {user.last_send_destination}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(user.last_send_destination);
                          toast.success('Wallet address copied!');
                        }}
                        className="shrink-0 p-2 bg-white border border-amber-300 rounded hover:bg-amber-100 transition"
                        title="Copy wallet address"
                      >
                        <Copy className="w-4 h-4 text-amber-700" />
                      </button>
                    </div>
                    <div className="flex gap-4 text-xs text-amber-700">
                      {user.last_send_amount && (
                        <span>Amount: <strong>{user.last_send_amount} USDC</strong></span>
                      )}
                      {user.last_send_date && (
                        <span>Date: <strong>{new Date(user.last_send_date).toLocaleString()}</strong></span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <Label className="text-gray-500 font-semibold">Client's Last Send Destination</Label>
                    <p className="text-sm text-gray-400 italic">No send transactions yet</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Connected App Name</Label>
                    <Input
                      value={formData.connected_app_name}
                      onChange={(e) => handleChange('connected_app_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Connected App Logo URL</Label>
                    <Input
                      value={formData.connected_app_logo}
                      onChange={(e) => handleChange('connected_app_logo', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={formData.role} onValueChange={(v) => handleChange('role', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="superadmin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Wallet Tab */}
          <TabsContent value="wallet">
            <Card>
              <CardHeader>
                <CardTitle>Wallet Balances</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {wallets.map((wallet) => (
                    <div key={wallet.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-semibold">{wallet.asset}</div>
                        <div className="text-2xl font-bold">
                          &euro;{wallet.balance}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          step="0.01"
                          defaultValue={wallet.balance}
                          className="w-32"
                          id={`balance-${wallet.asset}`}
                        />
                        <Button
                          variant="outline"
                          onClick={() => {
                            const input = document.getElementById(`balance-${wallet.asset}`);
                            handleUpdateWallet(wallet.asset, input.value);
                          }}
                        >
                          Update
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-orange-50 rounded-lg">
                  <h4 className="font-semibold text-orange-900 mb-2">Unpaid Fees</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-orange-600">
                        &euro;{formData.total_unpaid_fees}
                      </div>
                      <div className="text-sm text-orange-700">
                        Status: {formData.fees_paid ? 'Paid' : 'Unpaid'}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.total_unpaid_fees}
                        onChange={(e) => handleChange('total_unpaid_fees', e.target.value)}
                        className="w-32"
                      />
                      <Select value={formData.fees_paid ? 'true' : 'false'} onValueChange={(v) => handleChange('fees_paid', v === 'true')}>
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="false">Unpaid</SelectItem>
                          <SelectItem value="true">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Transaction History ({transactions.length})</CardTitle>
                <div className="flex items-center gap-2">
                  {transactions.some(tx => parseFloat(tx.fee) > 0 && !tx.fee_paid) && (
                    <Button
                      variant="outline"
                      className="border-green-500 text-green-600 hover:bg-green-50"
                      data-testid="mark-all-fees-paid-btn"
                      disabled={markingFees}
                      onClick={async () => {
                        setMarkingFees(true);
                        try {
                          const res = await api.post(`/admin/users/${userId}/mark-all-fees-paid`);
                          if (res.data.ok) {
                            toast.success(res.data.message);
                            setTransactions(prev => prev.map(tx => ({ ...tx, fee_paid: true })));
                            setFormData(prev => ({ ...prev, total_unpaid_fees: '0.00', fees_paid: true }));
                          }
                        } catch (err) {
                          toast.error(err.response?.data?.detail || 'Failed to mark fees as paid');
                        } finally {
                          setMarkingFees(false);
                        }
                      }}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {markingFees ? 'Processing...' : 'Mark All Fees as Paid'}
                    </Button>
                  )}
                  <Button onClick={openAddTransaction} className="bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Transaction
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No transactions yet</p>
                    <p className="text-sm">Click "Add Transaction" to create one</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm hover:bg-gray-100">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            tx.type === 'deposit' ? 'bg-green-100' : 
                            tx.type === 'withdrawal' ? 'bg-red-100' : 'bg-blue-100'
                          }`}>
                            {tx.type === 'deposit' ? (
                              <ArrowDownLeft className="w-4 h-4 text-green-600" />
                            ) : tx.type === 'withdrawal' ? (
                              <ArrowUpRight className="w-4 h-4 text-red-600" />
                            ) : (
                              <RefreshCw className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium capitalize">{tx.type}</div>
                            <div className="text-gray-500">{new Date(tx.transaction_date).toLocaleString()}</div>
                            {tx.description && (
                              <div className="text-xs text-gray-400">{tx.description}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className={`font-semibold ${tx.type === 'deposit' ? 'text-green-600' : tx.type === 'withdrawal' ? 'text-red-600' : ''}`}>
                              {tx.type === 'deposit' ? '+' : tx.type === 'withdrawal' ? '-' : ''}&euro;{tx.amount} {tx.asset}
                            </div>
                            {parseFloat(tx.fee) > 0 && (
                              <div className={`text-xs ${tx.fee_paid ? 'text-green-600' : 'text-orange-600'}`}>
                                Fee: &euro;{tx.fee} ({tx.fee_paid ? 'Paid' : 'Unpaid'})
                              </div>
                            )}
                            <Badge variant="outline" className="text-xs mt-1">
                              {tx.status}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button variant="ghost" size="sm" onClick={() => openEditTransaction(tx)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteTransaction(tx.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick Actions */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-3">Quick Actions</h4>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setTxForm({
                          type: 'deposit',
                          amount: '100',
                          asset: 'USDC',
                          fee: '0.00',
                          fee_paid: false,
                          transaction_date: new Date().toISOString().slice(0, 16),
                          status: 'completed',
                          description: 'Reactivation deposit',
                          external_wallet: '',
                        });
                        setEditingTx(null);
                        setShowTxModal(true);
                      }}
                      className="bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add €100 Reactivation Deposit
                    </Button>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    Note: Adding a deposit will automatically unfreeze an "inactivity" frozen account.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions">
            <div className="space-y-4">
              {/* Display Controls - What User Sees */}
              <Card className="border-2 border-blue-200">
                <CardHeader className="bg-blue-50">
                  <CardTitle className="flex items-center">
                    <Eye className="w-5 h-5 mr-2 text-blue-600" />
                    User Display Controls
                  </CardTitle>
                  <CardDescription>
                    Toggle what alerts and prompts this user will see in their dashboard
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="w-6 h-6 text-orange-500" />
                      <div>
                        <h4 className="font-semibold text-gray-900">Freeze Alert</h4>
                        <p className="text-sm text-gray-500">
                          "Unusual Activity" or "Account Inactive" prompt
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`text-sm font-medium ${formData.show_freeze_alert ? 'text-green-600' : 'text-gray-400'}`}>
                        {formData.show_freeze_alert ? 'Visible' : 'Hidden'}
                      </span>
                      <Switch
                        checked={formData.show_freeze_alert}
                        onCheckedChange={(checked) => handleChange('show_freeze_alert', checked)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center space-x-3">
                      <DollarSign className="w-6 h-6 text-red-500" />
                      <div>
                        <h4 className="font-semibold text-gray-900">Outstanding Fees Alert</h4>
                        <p className="text-sm text-gray-500">
                          "You have unpaid fees" warning message
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`text-sm font-medium ${formData.show_fees_alert ? 'text-green-600' : 'text-gray-400'}`}>
                        {formData.show_fees_alert ? 'Visible' : 'Hidden'}
                      </span>
                      <Switch
                        checked={formData.show_fees_alert}
                        onCheckedChange={(checked) => handleChange('show_fees_alert', checked)}
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <p className="text-sm text-gray-600">
                      <strong>Note:</strong> These toggles control what the user sees in their wallet dashboard. 
                      Use them to temporarily hide alerts or to customize the user experience.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Freeze Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Freeze Type</Label>
                    <Select value={formData.freeze_type} onValueChange={(v) => handleChange('freeze_type', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Freeze (Active)</SelectItem>
                        <SelectItem value="unusual_activity">Unusual Activity - Requires KYC</SelectItem>
                        <SelectItem value="inactivity">Inactivity - Requires Deposit</SelectItem>
                        <SelectItem value="both">Both - KYC then Deposit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Account Status</Label>
                    <Select value={formData.account_status} onValueChange={(v) => handleChange('account_status', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="frozen">Frozen</SelectItem>
                        <SelectItem value="pending_kyc">Pending KYC</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* KYC & Security Settings */}
              <Card className="border-2 border-purple-200">
                <CardHeader className="bg-purple-50">
                  <CardTitle className="flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-purple-600" />
                    KYC & Security Settings
                  </CardTitle>
                  <CardDescription>
                    Control KYC status and password reset requirements
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-2">
                    <Label>KYC Status</Label>
                    <Select value={formData.kyc_status} onValueChange={(v) => handleChange('kyc_status', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_started">Not Started</SelectItem>
                        <SelectItem value="pending">Pending Review</SelectItem>
                        <SelectItem value="under_review">Under Review</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Changing to "Approved" will trigger the password reset flow
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-6 h-6 text-blue-500" />
                      <div>
                        <h4 className="font-semibold text-gray-900">Password Reset Required</h4>
                        <p className="text-sm text-gray-500">
                          User must reset password before accessing account
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`text-sm font-medium ${formData.password_reset_required ? 'text-orange-600' : 'text-green-600'}`}>
                        {formData.password_reset_required ? 'Required' : 'Not Required'}
                      </span>
                      <Switch
                        checked={formData.password_reset_required}
                        onCheckedChange={(checked) => handleChange('password_reset_required', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Send Emails</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" onClick={() => handleSendEmail('kyc')}>
                      <Mail className="w-4 h-4 mr-2" />
                      KYC Verification
                    </Button>
                    <Button variant="outline" onClick={() => handleSendEmail('password_reset')}>
                      <Mail className="w-4 h-4 mr-2" />
                      Password Reset
                    </Button>
                    <Button variant="outline" onClick={() => handleSendEmail('reactivation')}>
                      <Mail className="w-4 h-4 mr-2" />
                      Reactivation
                    </Button>
                    <Button variant="outline" onClick={() => handleSendEmail('fee_payment')}>
                      <Mail className="w-4 h-4 mr-2" />
                      Fee Payment
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Transaction Add/Edit Modal */}
      <Dialog open={showTxModal} onOpenChange={setShowTxModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTx ? 'Edit Transaction' : 'Add Transaction'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <Select value={txForm.type} onValueChange={(v) => setTxForm({...txForm, type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="fee">Fee</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={txForm.amount}
                  onChange={(e) => setTxForm({...txForm, amount: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Asset</Label>
                <Select value={txForm.asset} onValueChange={(v) => setTxForm({...txForm, asset: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USDC">USDC (ERC-20)</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="ETH">ETH</SelectItem>
                    <SelectItem value="BTC">BTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date & Time</Label>
              <Input
                type="datetime-local"
                value={txForm.transaction_date}
                onChange={(e) => setTxForm({...txForm, transaction_date: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fee</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={txForm.fee}
                  onChange={(e) => setTxForm({...txForm, fee: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Fee Status</Label>
                <Select value={txForm.fee_paid ? 'true' : 'false'} onValueChange={(v) => setTxForm({...txForm, fee_paid: v === 'true'})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Unpaid</SelectItem>
                    <SelectItem value="true">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={txForm.status} onValueChange={(v) => setTxForm({...txForm, status: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Input
                placeholder="e.g., Reactivation deposit"
                value={txForm.description}
                onChange={(e) => setTxForm({...txForm, description: e.target.value})}
              />
            </div>

            {(txForm.type === 'withdrawal' || txForm.type === 'transfer') && (
              <div className="space-y-2">
                <Label>External Wallet Address</Label>
                <Input
                  placeholder="0x..."
                  value={txForm.external_wallet}
                  onChange={(e) => setTxForm({...txForm, external_wallet: e.target.value})}
                  className="font-mono text-sm"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTxModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTransaction} disabled={savingTx}>
              {savingTx ? 'Saving...' : (editingTx ? 'Update' : 'Add Transaction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminEditUser;
