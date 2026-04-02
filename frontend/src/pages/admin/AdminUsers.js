import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from './AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  MoreVertical,
  Mail,
  UserCheck,
  UserX,
  RefreshCw,
  Clock,
  Lock,
  Unlock,
  AlertTriangle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const AdminUsers = () => {
  const { api } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [lockUserId, setLockUserId] = useState(null);
  const [lockReason, setLockReason] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, page_size: 20 };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      
      const response = await api.get('/admin/users', { params });
      if (response.data.ok) {
        setUsers(response.data.data.users || []);
        setTotalPages(response.data.data.pages || 1);
      } else {
        setError('Failed to load users');
      }
    } catch (err) {
      console.error('Error loading users:', err);
      setError(err.response?.data?.detail || 'Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;
    
    try {
      const response = await api.delete(`/admin/users/${deleteUserId}`);
      if (response.data.ok) {
        toast.success('User deleted successfully');
        loadUsers();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    } finally {
      setDeleteUserId(null);
    }
  };

  const handleSendEmail = async (userId, emailType) => {
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
      toast.error(error.response?.data?.detail || 'Failed to send email');
    }
  };

  const handleLockAccount = async () => {
    if (!lockUserId || !lockReason.trim()) return;
    try {
      const response = await api.post(`/admin/users/${lockUserId}/lock`, {
        reason: lockReason.trim()
      });
      if (response.data.ok) {
        toast.success('Account locked successfully');
        loadUsers();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to lock account');
    } finally {
      setLockUserId(null);
      setLockReason('');
    }
  };

  const handleUnlockAccount = async (userId) => {
    try {
      const response = await api.post(`/admin/users/${userId}/unlock`);
      if (response.data.ok) {
        toast.success('Account unlocked successfully');
        loadUsers();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to unlock account');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-700',
      frozen: 'bg-red-100 text-red-700',
      pending_kyc: 'bg-yellow-100 text-yellow-700',
      closed: 'bg-gray-100 text-gray-700',
      locked: 'bg-red-200 text-red-800',
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{status}</Badge>;
  };

  const getKYCBadge = (status) => {
    const styles = {
      approved: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      rejected: 'bg-red-100 text-red-700',
      not_started: 'bg-gray-100 text-gray-700',
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{status}</Badge>;
  };

  return (
    <AdminLayout title="Users">
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" variant="outline">Search</Button>
        </form>
        
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="frozen">Frozen</SelectItem>
              <SelectItem value="pending_kyc">Pending KYC</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          
          <Link to="/admin/users/create">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Create User
            </Button>
          </Link>
        </div>
      </div>

      {/* Users Table */}
      <Card>
        {error ? (
          <div className="p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadUsers} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : (
        <>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registered</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">KYC</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Freeze</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unpaid Fees</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-sm text-gray-500">@{user.username}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                    <td className="px-4 py-3 text-sm" data-testid={`user-registered-${user.id}`}>
                      {user.created_at ? (
                        <>
                          <div>{new Date(user.created_at).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-400">{new Date(user.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(user.account_status)}</td>
                    <td className="px-4 py-3">{getKYCBadge(user.kyc_status)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${user.freeze_type !== 'none' ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        {user.freeze_type === 'none' ? '-' : user.freeze_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${parseFloat(user.total_unpaid_fees) > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                        &euro;{user.total_unpaid_fees}
                      </span>
                    </td>
                    <td className="px-4 py-3" data-testid={`user-timer-${user.id}`}>
                      {user.timer_duration_hours ? (() => {
                        if (!user.timer_started_at) {
                          return <span className="text-xs text-gray-400">Not started</span>;
                        }
                        const started = new Date(user.timer_started_at);
                        const expires = new Date(started.getTime() + user.timer_duration_hours * 3600000);
                        const now = new Date();
                        const remaining = expires - now;
                        const isExpired = remaining <= 0;
                        if (isExpired) {
                          return (
                            <Badge className="bg-red-100 text-red-700 flex items-center gap-1 w-fit" data-testid={`timer-expired-${user.id}`}>
                              <Clock className="w-3 h-3" />
                              Expired
                            </Badge>
                          );
                        }
                        const hrs = Math.floor(remaining / 3600000);
                        const mins = Math.floor((remaining % 3600000) / 60000);
                        const days = Math.floor(hrs / 24);
                        const leftoverHrs = hrs % 24;
                        return (
                          <span className="text-xs text-yellow-700 font-medium">
                            {days > 0 ? `${days}d ${leftoverHrs}h` : `${leftoverHrs}h ${mins}m`}
                          </span>
                        );
                      })() : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Link to={`/admin/users/${user.id}`}>
                            <DropdownMenuItem>
                              <Eye className="w-4 h-4 mr-2" />
                              View / Edit
                            </DropdownMenuItem>
                          </Link>
                          <DropdownMenuItem onClick={() => handleSendEmail(user.id, 'kyc')}>
                            <Mail className="w-4 h-4 mr-2" />
                            Send KYC Email
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendEmail(user.id, 'password_reset')}>
                            <Mail className="w-4 h-4 mr-2" />
                            Send Password Reset
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendEmail(user.id, 'reactivation')}>
                            <Mail className="w-4 h-4 mr-2" />
                            Send Reactivation Email
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendEmail(user.id, 'fee_payment')}>
                            <Mail className="w-4 h-4 mr-2" />
                            Send Fee Payment Email
                          </DropdownMenuItem>
                          {user.timer_duration_hours && (
                            <DropdownMenuItem onClick={() => handleSendEmail(user.id, 'timer_warning')} data-testid={`send-timer-warning-${user.id}`}>
                              <AlertTriangle className="w-4 h-4 mr-2 text-orange-500" />
                              Send Timer Warning
                            </DropdownMenuItem>
                          )}
                          {user.account_status !== 'locked' && (
                            <DropdownMenuItem 
                              onClick={() => setLockUserId(user.id)}
                              className="text-red-600"
                              data-testid={`lock-account-${user.id}`}
                            >
                              <Lock className="w-4 h-4 mr-2" />
                              Lock Account
                            </DropdownMenuItem>
                          )}
                          {user.account_status === 'locked' && (
                            <DropdownMenuItem 
                              onClick={() => handleUnlockAccount(user.id)}
                              className="text-green-600"
                              data-testid={`unlock-account-${user.id}`}
                            >
                              <Unlock className="w-4 h-4 mr-2" />
                              Unlock Account
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => setDeleteUserId(user.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center space-x-2 p-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        )}
        </>
        )}
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
              All associated data (wallets, transactions) will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lock Account Dialog */}
      <AlertDialog open={!!lockUserId} onOpenChange={() => { setLockUserId(null); setLockReason(''); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-red-600" />
              Lock Account
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately lock the user's account and send them a notification email. They will not be able to log in until unlocked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Reason for locking (will be shown to user)</label>
            <Textarea
              value={lockReason}
              onChange={(e) => setLockReason(e.target.value)}
              placeholder="e.g. Failure to resolve outstanding fees within the given timeframe..."
              rows={3}
              data-testid="lock-reason-input"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleLockAccount}
              className="bg-red-600 hover:bg-red-700"
              disabled={!lockReason.trim()}
              data-testid="confirm-lock-btn"
            >
              Lock Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminUsers;
