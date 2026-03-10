import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle, Mail } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ForgotPasswordPage = () => {
  const { t, lang, toggleLang } = useLang();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, { email });
      setSent(true);
      toast.success(t.resetLinkSent);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
        <header className="p-4 flex items-center justify-between">
          <Link to="/login" className="inline-flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4 mr-2" />{t.backToLogin}
          </Link>
          <button data-testid="forgot-language-toggle" className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-bold rounded border border-gray-300 hover:bg-gray-100 transition text-gray-700" onClick={toggleLang}>
            <span className={lang === 'en' ? 'text-gray-900' : 'text-gray-400'}>EN</span>
            <span className="text-gray-300">|</span>
            <span className={lang === 'it' ? 'text-gray-900' : 'text-gray-400'}>IT</span>
          </button>
        </header>
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-6">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{t.resetLinkSent}</h2>
              <p className="text-gray-600 mb-6">Check your email inbox for the reset link.</p>
              <Link to="/login"><Button data-testid="forgot-back-to-login-btn" className="bg-blue-600 hover:bg-blue-700">{t.backToLogin}</Button></Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      <header className="p-4 flex items-center justify-between">
        <Link to="/login" className="inline-flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4 mr-2" />{t.backToLogin}
        </Link>
        <button data-testid="forgot-language-toggle-form" className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-bold rounded border border-gray-300 hover:bg-gray-100 transition text-gray-700" onClick={toggleLang}>
          <span className={lang === 'en' ? 'text-gray-900' : 'text-gray-400'}>EN</span>
          <span className="text-gray-300">|</span>
          <span className={lang === 'it' ? 'text-gray-900' : 'text-gray-400'}>IT</span>
        </button>
      </header>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-2xl">{t.forgotPasswordTitle}</CardTitle>
            <CardDescription>{t.forgotPasswordDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t.loginEmail}</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" data-testid="forgot-email-input" />
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading} data-testid="forgot-submit-btn">
                {loading ? t.sendingResetLink : t.sendResetLink}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm">
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">{t.backToLogin}</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
