import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from './AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ArrowLeft, Info, Wallet, Calendar, User, Shield, AlertTriangle, ExternalLink } from 'lucide-react';

const AdminCreateUser = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    password: '',
    date_of_birth: '',
    phone: '',
    
    // Step 2: Wallet Setup
    eth_wallet_address: '',
    initial_usdc_balance: '0.00',
    initial_eur_balance: '0.00',
    
    // Step 3: Transaction History
    generate_history: false,
    total_fees: '0.00',
    transaction_start_date: '',
    transaction_end_date: '',
    
    // Step 4: Account Settings
    freeze_type: 'none',
    connected_app_name: '',
    connected_app_logo: '',
    role: 'user',
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    handleChange('password', password);
  };

  const generateWalletAddress = () => {
    const hex = '0123456789abcdef';
    let address = '0x';
    for (let i = 0; i < 40; i++) {
      address += hex.charAt(Math.floor(Math.random() * hex.length));
    }
    handleChange('eth_wallet_address', address);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        username: formData.username,
        password: formData.password,
        date_of_birth: formData.date_of_birth,
        phone: formData.phone || null,
        eth_wallet_address: formData.eth_wallet_address || null,
        initial_usdc_balance: formData.initial_usdc_balance,
        initial_eur_balance: formData.initial_eur_balance,
        total_fees: formData.generate_history ? formData.total_fees : '0.00',
        transaction_start_date: formData.generate_history ? formData.transaction_start_date : null,
        transaction_end_date: formData.generate_history ? formData.transaction_end_date : null,
        freeze_type: formData.freeze_type,
        connected_app_name: formData.connected_app_name || null,
        connected_app_logo: formData.connected_app_logo || null,
        role: formData.role,
      };

      const response = await api.post('/admin/users', payload);

      if (response.data.ok) {
        toast.success('User created successfully');
        navigate(`/admin/users/${response.data.data.user.id}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const isStep1Valid = () => {
    return formData.first_name && formData.last_name && formData.email && 
           formData.username && formData.password && formData.date_of_birth;
  };

  const isStep2Valid = () => {
    return true; // All fields optional
  };

  const isStep3Valid = () => {
    if (!formData.generate_history) return true;
    return formData.transaction_start_date && formData.transaction_end_date &&
           parseFloat(formData.initial_usdc_balance) > 0;
  };

  return (
    <AdminLayout title="Create User">
      <div className="max-w-3xl mx-auto">
        <Link to="/admin/users" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Users
        </Link>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {[
            { num: 1, label: 'Basic Info' },
            { num: 2, label: 'Wallet' },
            { num: 3, label: 'History' },
            { num: 4, label: 'Settings' },
          ].map((s, i) => (
            <React.Fragment key={s.num}>
              <div 
                className={`flex flex-col items-center ${
                  step >= s.num ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= s.num ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}>
                  {s.num}
                </div>
                <span className="text-xs mt-1 hidden sm:block">{s.label}</span>
              </div>
              {i < 3 && (
                <div className={`w-12 sm:w-20 h-1 mx-2 ${step > s.num ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Basic Information
                </CardTitle>
                <CardDescription>Enter the user's personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => handleChange('first_name', e.target.value)}
                      placeholder="John"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name *</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => handleChange('last_name', e.target.value)}
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="john@example.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => handleChange('username', e.target.value.toLowerCase())}
                    placeholder="johndoe"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="password"
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      placeholder="Enter password"
                      required
                    />
                    <Button type="button" variant="outline" onClick={generateRandomPassword}>
                      Generate
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Date of Birth *</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => handleChange('date_of_birth', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone (Optional)</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="+1234567890"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    type="button" 
                    onClick={() => setStep(2)}
                    disabled={!isStep1Valid()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Next: Wallet Setup
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Wallet Setup */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wallet className="w-5 h-5 mr-2" />
                  Wallet Setup
                </CardTitle>
                <CardDescription>Configure the user's wallet and initial balances</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="eth_wallet_address">ETH Wallet Address</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="eth_wallet_address"
                      value={formData.eth_wallet_address}
                      onChange={(e) => handleChange('eth_wallet_address', e.target.value)}
                      placeholder="0x..."
                      className="font-mono text-sm"
                    />
                    <Button type="button" variant="outline" onClick={generateWalletAddress}>
                      Generate
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    This is the USDC (ERC-20) wallet address the user will see
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="initial_usdc_balance">Initial USDC Balance</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <Input
                        id="initial_usdc_balance"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.initial_usdc_balance}
                        onChange={(e) => handleChange('initial_usdc_balance', e.target.value)}
                        className="pl-7"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="initial_eur_balance">Initial EUR Balance</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                      <Input
                        id="initial_eur_balance"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.initial_eur_balance}
                        onChange={(e) => handleChange('initial_eur_balance', e.target.value)}
                        className="pl-7"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => setStep(3)}
                    disabled={!isStep2Valid()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Next: Transaction History
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Transaction History */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Transaction History
                </CardTitle>
                <CardDescription>
                  Auto-generate realistic transaction history with unpaid fees
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Info className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">Auto-Generate History</p>
                      <p className="text-sm text-blue-700">
                        System will create realistic transactions that sum to the USDC balance
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.generate_history}
                    onCheckedChange={(v) => handleChange('generate_history', v)}
                  />
                </div>

                {formData.generate_history && (
                  <>
                    {parseFloat(formData.initial_usdc_balance) <= 0 && (
                      <div className="p-4 bg-orange-50 rounded-lg">
                        <div className="flex items-center space-x-2 text-orange-700">
                          <AlertTriangle className="w-5 h-5" />
                          <span>USDC balance must be greater than 0 to generate history</span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="total_fees">Total Unpaid Fees</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <Input
                          id="total_fees"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.total_fees}
                          onChange={(e) => handleChange('total_fees', e.target.value)}
                          className="pl-7"
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        Fees will be distributed across generated transactions
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="transaction_start_date">Start Date *</Label>
                        <Input
                          id="transaction_start_date"
                          type="date"
                          value={formData.transaction_start_date}
                          onChange={(e) => handleChange('transaction_start_date', e.target.value)}
                          required={formData.generate_history}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="transaction_end_date">End Date *</Label>
                        <Input
                          id="transaction_end_date"
                          type="date"
                          value={formData.transaction_end_date}
                          onChange={(e) => handleChange('transaction_end_date', e.target.value)}
                          required={formData.generate_history}
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        <strong>How it works:</strong> The system will automatically create multiple 
                        deposit/receive/swap transactions between the start and end dates. The total 
                        of all transactions will equal the USDC balance. Fees will be distributed 
                        across ~60-80% of transactions.
                      </p>
                    </div>
                  </>
                )}

                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => setStep(4)}
                    disabled={!isStep3Valid()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Next: Account Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Account Settings */}
          {step === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Account Settings
                </CardTitle>
                <CardDescription>
                  Configure freeze status, connected apps, and role
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Freeze Type</Label>
                  <Select
                    value={formData.freeze_type}
                    onValueChange={(v) => handleChange('freeze_type', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Freeze (Active Account)</SelectItem>
                      <SelectItem value="unusual_activity">
                        Unusual Activity - Requires KYC Verification
                      </SelectItem>
                      <SelectItem value="inactivity">
                        Inactivity - Requires Deposit to Reactivate
                      </SelectItem>
                      <SelectItem value="both">
                        Both - KYC First, Then Deposit
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {formData.freeze_type !== 'none' && (
                    <div className="p-3 bg-orange-50 rounded-lg mt-2">
                      <p className="text-sm text-orange-700">
                        {formData.freeze_type === 'unusual_activity' && (
                          <>User will see: "We detected unusual activity. Please verify your identity."</>
                        )}
                        {formData.freeze_type === 'inactivity' && (
                          <>User will see: "Account frozen due to inactivity. Deposit required."</>
                        )}
                        {formData.freeze_type === 'both' && (
                          <>User will first complete KYC, then need to make a deposit.</>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="connected_app_name">Connected App Name</Label>
                  <Input
                    id="connected_app_name"
                    value={formData.connected_app_name}
                    onChange={(e) => handleChange('connected_app_name', e.target.value)}
                    placeholder="e.g., CHIANTIN BANK"
                  />
                  <p className="text-xs text-gray-500">
                    Will appear in the "Connected Apps" section of user's wallet
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="connected_app_logo">Connected App Logo URL</Label>
                  <Input
                    id="connected_app_logo"
                    value={formData.connected_app_logo}
                    onChange={(e) => handleChange('connected_app_logo', e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                </div>

                <div className="space-y-2">
                  <Label>User Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(v) => handleChange('role', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Regular User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="superadmin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Summary */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Name:</dt>
                      <dd className="text-gray-900">{formData.first_name} {formData.last_name}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Email:</dt>
                      <dd className="text-gray-900">{formData.email}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">USDC Balance:</dt>
                      <dd className="text-gray-900">&euro;{formData.initial_usdc_balance}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">EUR Balance:</dt>
                      <dd className="text-gray-900">€{formData.initial_eur_balance}</dd>
                    </div>
                    {formData.generate_history && (
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Total Fees:</dt>
                        <dd className="text-gray-900">&euro;{formData.total_fees}</dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Freeze Status:</dt>
                      <dd className={formData.freeze_type !== 'none' ? 'text-orange-600 font-medium' : 'text-gray-900'}>
                        {formData.freeze_type === 'none' ? 'Active' : formData.freeze_type.replace('_', ' ')}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={() => setStep(3)}>
                    Back
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {loading ? 'Creating...' : 'Create User'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      </div>
    </AdminLayout>
  );
};

export default AdminCreateUser;
