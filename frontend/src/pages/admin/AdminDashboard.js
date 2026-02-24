import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  UserCheck,
  UserX,
  FileCheck,
  ArrowLeftRight,
  DollarSign,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';

const AdminDashboard = () => {
  const { api } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await api.get('/admin/stats');
      if (response.data.ok) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.total_users || 0,
      icon: Users,
      color: 'bg-blue-500',
      link: '/admin/users'
    },
    {
      title: 'Active Users',
      value: stats?.active_users || 0,
      icon: UserCheck,
      color: 'bg-green-500',
      link: '/admin/users?status=active'
    },
    {
      title: 'Frozen Accounts',
      value: stats?.frozen_users || 0,
      icon: UserX,
      color: 'bg-red-500',
      link: '/admin/users?status=frozen'
    },
    {
      title: 'Pending KYC',
      value: stats?.pending_kyc || 0,
      icon: FileCheck,
      color: 'bg-yellow-500',
      link: '/admin/kyc'
    },
    {
      title: 'Total Transactions',
      value: stats?.total_transactions || 0,
      icon: ArrowLeftRight,
      color: 'bg-purple-500',
      link: '/admin/transactions'
    },
    {
      title: 'Total USDC Balance',
      value: `$${stats?.total_usdc_balance || '0.00'}`,
      icon: DollarSign,
      color: 'bg-indigo-500',
    },
    {
      title: 'Total EUR Balance',
      value: `€${stats?.total_eur_balance || '0.00'}`,
      icon: TrendingUp,
      color: 'bg-cyan-500',
    },
    {
      title: 'Total Unpaid Fees',
      value: `$${stats?.total_unpaid_fees || '0.00'}`,
      icon: AlertTriangle,
      color: 'bg-orange-500',
    },
  ];

  return (
    <AdminLayout title="Dashboard">
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCards.map((card, index) => (
              <Card key={index} className="hover:shadow-lg transition">
                {card.link ? (
                  <Link to={card.link}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">{card.title}</p>
                          <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                        </div>
                        <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center`}>
                          <card.icon className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Link>
                ) : (
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">{card.title}</p>
                        <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                      </div>
                      <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center`}>
                        <card.icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link 
                  to="/admin/users/create"
                  className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition text-center"
                >
                  <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <span className="font-medium text-blue-900">Create User</span>
                </Link>
                <Link 
                  to="/admin/kyc"
                  className="p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition text-center"
                >
                  <FileCheck className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                  <span className="font-medium text-yellow-900">Review KYC</span>
                </Link>
                <Link 
                  to="/admin/transactions"
                  className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition text-center"
                >
                  <ArrowLeftRight className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <span className="font-medium text-purple-900">Manage Transactions</span>
                </Link>
                <Link 
                  to="/admin/settings"
                  className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-center"
                >
                  <AlertTriangle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <span className="font-medium text-gray-900">System Settings</span>
                </Link>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
