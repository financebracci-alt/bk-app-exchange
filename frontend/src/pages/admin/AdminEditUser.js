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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Save, Mail, RefreshCw, Wallet, History, User, Shield, Eye, EyeOff, AlertTriangle, DollarSign } from 'lucide-react';

const AdminEditUser = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    phone: '',
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
  });

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
                  <Label>ETH Wallet Address</Label>
                  <Input
                    value={formData.eth_wallet_address}
                    onChange={(e) => handleChange('eth_wallet_address', e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>

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
                          {wallet.asset === 'USDC' ? '$' : '€'}{wallet.balance}
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
                        ${formData.total_unpaid_fees}
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
              <CardHeader>
                <CardTitle>Transaction History ({transactions.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                      <div>
                        <div className="font-medium capitalize">{tx.type}</div>
                        <div className="text-gray-500">{new Date(tx.transaction_date).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${tx.amount}</div>
                        {parseFloat(tx.fee) > 0 && (
                          <div className={`text-xs ${tx.fee_paid ? 'text-green-600' : 'text-orange-600'}`}>
                            Fee: ${tx.fee} ({tx.fee_paid ? 'Paid' : 'Unpaid'})
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions">
            <div className="space-y-4">
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
    </AdminLayout>
  );
};

export default AdminEditUser;
