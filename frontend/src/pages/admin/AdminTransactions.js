import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from './AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Search, Plus, Edit, Trash2 } from 'lucide-react';

const AdminTransactions = () => {
  const { api } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    user_id: '',
    asset: 'all',
    type: 'all',
    status: 'all'
  });

  useEffect(() => {
    loadTransactions();
  }, [page, filters]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const params = { page, page_size: 30 };
      if (filters.user_id) params.user_id = filters.user_id;
      if (filters.asset !== 'all') params.asset = filters.asset;
      if (filters.type !== 'all') params.type = filters.type;
      if (filters.status !== 'all') params.status = filters.status;

      const response = await api.get('/admin/transactions', { params });
      if (response.data.ok) {
        setTransactions(response.data.data.transactions);
        setTotalPages(response.data.data.pages);
      }
    } catch (error) {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (transactionId) => {
    if (!window.confirm('Delete this transaction?')) return;
    
    try {
      const response = await api.delete(`/admin/transactions/${transactionId}`);
      if (response.data.ok) {
        toast.success('Transaction deleted');
        loadTransactions();
      }
    } catch (error) {
      toast.error('Failed to delete transaction');
    }
  };

  return (
    <AdminLayout title="Transactions">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Input
          placeholder="User ID"
          value={filters.user_id}
          onChange={(e) => setFilters(f => ({ ...f, user_id: e.target.value }))}
          className="w-48"
        />
        <Select value={filters.asset} onValueChange={(v) => setFilters(f => ({ ...f, asset: v }))}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Asset" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assets</SelectItem>
            <SelectItem value="USDC">USDC</SelectItem>
            <SelectItem value="EUR">EUR</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.type} onValueChange={(v) => setFilters(f => ({ ...f, type: v }))}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="deposit">Deposit</SelectItem>
            <SelectItem value="withdrawal">Withdrawal</SelectItem>
            <SelectItem value="send">Send</SelectItem>
            <SelectItem value="receive">Receive</SelectItem>
            <SelectItem value="swap">Swap</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.status} onValueChange={(v) => setFilters(f => ({ ...f, status: v }))}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => { setPage(1); loadTransactions(); }}>
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </div>

      {/* Transactions Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fee</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      {new Date(tx.transaction_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="capitalize font-medium">{tx.type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{tx.asset}</Badge>
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      &euro;{parseFloat(tx.amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {parseFloat(tx.fee) > 0 ? (
                        <span className={tx.fee_paid ? 'text-green-600' : 'text-orange-600'}>
                          &euro;{tx.fee} ({tx.fee_paid ? 'Paid' : 'Unpaid'})
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={{
                        completed: 'bg-green-100 text-green-700',
                        pending: 'bg-yellow-100 text-yellow-700',
                        failed: 'bg-red-100 text-red-700'
                      }[tx.status] || 'bg-gray-100'}>
                        {tx.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteTransaction(tx.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
      </Card>
    </AdminLayout>
  );
};

export default AdminTransactions;
