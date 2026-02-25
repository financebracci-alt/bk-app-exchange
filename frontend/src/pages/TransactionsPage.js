import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowLeftRight,
  Filter,
  AlertTriangle
} from 'lucide-react';

const TransactionsPage = () => {
  const { api } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadTransactions();
  }, [page, filter]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const params = { page, page_size: 20 };
      if (filter !== 'all') {
        params.type = filter;
      }
      const response = await api.get('/wallet/transactions', { params });
      if (response.data.ok) {
        setTransactions(response.data.data.transactions);
        setTotalPages(response.data.data.pages);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'deposit':
      case 'receive':
        return <ArrowDownLeft className="w-4 h-4 text-green-600" />;
      case 'withdrawal':
      case 'send':
        return <ArrowUpRight className="w-4 h-4 text-red-600" />;
      case 'swap':
        return <ArrowLeftRight className="w-4 h-4 text-blue-600" />;
      default:
        return <ArrowDownLeft className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      completed: 'bg-green-100 text-green-700',
      processing: 'bg-blue-100 text-blue-700',
      pending: 'bg-yellow-100 text-yellow-700',
      failed: 'bg-red-100 text-red-700',
    };
    return (
      <Badge className={styles[status] || 'bg-gray-100 text-gray-700'}>
        {status}
      </Badge>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/wallet" className="flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span className="font-semibold">Transactions</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Filter */}
        <div className="flex items-center space-x-2 mb-4 overflow-x-auto pb-2">
          {['all', 'deposit', 'receive', 'send', 'swap'].map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>

        {/* Transactions List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : transactions.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">No transactions found</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <Card key={tx.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      {getTransactionIcon(tx.type)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 capitalize">{tx.type}</div>
                      <div className="text-sm text-gray-500">{tx.description || tx.asset}</div>
                      <div className="text-xs text-gray-400 mt-1">{formatDate(tx.transaction_date)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${
                      ['deposit', 'receive'].includes(tx.type) ? 'text-green-600' : 'text-gray-900'
                    }`}>
                      {['deposit', 'receive'].includes(tx.type) ? '+' : '-'}
                      ${parseFloat(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="mt-1">{getStatusBadge(tx.status)}</div>
                  </div>
                </div>
                
                {/* Fee Warning */}
                {parseFloat(tx.fee) > 0 && !tx.fee_paid && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-orange-600">
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        <span>Unpaid Fee</span>
                      </div>
                      <span className="font-semibold text-orange-600">${tx.fee}</span>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center space-x-2 mt-6">
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
      </main>
    </div>
  );
};

export default TransactionsPage;
