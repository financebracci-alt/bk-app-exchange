import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLang, txTypeLabel, dateFmt } from '@/i18n';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowLeftRight,
  AlertTriangle
} from 'lucide-react';

const TransactionsPage = () => {
  const { api } = useAuth();
  const { t, lang } = useLang();
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
      if (filter !== 'all') params.type = filter;
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
      case 'deposit': case 'receive':
        return <ArrowDownLeft className="w-4 h-4 text-green-600" />;
      case 'withdrawal': case 'send':
        return <ArrowUpRight className="w-4 h-4 text-red-600" />;
      case 'swap':
        return <ArrowLeftRight className="w-4 h-4 text-blue-600" />;
      default:
        return <ArrowDownLeft className="w-4 h-4 text-gray-600" />;
    }
  };

  const statusLabels = {
    completed: t.completed,
    processing: t.processing,
    pending: t.pending,
    failed: t.failed,
  };

  const getStatusBadge = (status) => {
    const styles = {
      completed: 'bg-green-100 text-green-700',
      processing: 'bg-blue-100 text-blue-700',
      pending: 'bg-yellow-100 text-yellow-700',
      failed: 'bg-red-100 text-red-700',
    };
    return <Badge className={styles[status] || 'bg-gray-100 text-gray-700'}>{statusLabels[status] || status}</Badge>;
  };

  const filterLabels = {
    all: t.all,
    deposit: t.deposits,
    receive: t.receives,
    send: t.sends,
    swap: t.swaps,
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(dateFmt(lang), {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/wallet" className="flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span className="font-semibold">{t.transactions}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-lg md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Filter */}
        <div className="flex items-center space-x-2 mb-4 overflow-x-auto pb-2">
          {['all', 'deposit', 'receive', 'send', 'swap'].map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              data-testid={`filter-${f}`}
            >
              {filterLabels[f]}
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
            <p className="text-gray-500">{t.noTransactions}</p>
          </Card>
        ) : (
          <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
            {transactions.map((tx) => (
              <Card key={tx.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      {getTransactionIcon(tx.type)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{txTypeLabel(t, tx.type)}</div>
                      <div className="text-sm text-gray-500">{tx.asset}</div>
                      <div className="text-xs text-gray-400 mt-1">{formatDate(tx.transaction_date)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${
                      ['deposit', 'receive'].includes(tx.type) ? 'text-green-600' : 'text-gray-900'
                    }`}>
                      {['deposit', 'receive'].includes(tx.type) ? '+' : '-'}
                      &euro;{parseFloat(tx.amount).toLocaleString(dateFmt(lang), { minimumFractionDigits: 2 })}
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
                        <span>{t.unpaidFee}</span>
                      </div>
                      <span className="font-semibold text-orange-600">&euro;{tx.fee}</span>
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
              {t.previous}
            </Button>
            <span className="text-sm text-gray-600">
              {t.pageOf.replace('{page}', page).replace('{total}', totalPages)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              {t.next}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default TransactionsPage;
