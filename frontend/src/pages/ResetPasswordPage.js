import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useLang } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLang();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });

  useEffect(() => {
    if (!token) {
      toast.error(t.invalidResetLink);
      navigate('/login');
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error(t.passwordsNoMatch);
      return;
    }
    if (formData.password.length < 8) {
      toast.error(t.passwordMinLength);
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/reset-password/${token}`, null, {
        params: { new_password: formData.password }
      });
      if (response.data.ok) {
        setSuccess(true);
        toast.success(t.passwordResetSuccess);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || t.failedResetPassword);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
        <header className="p-4">
          <Link to="/" className="inline-flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4 mr-2" />{t.backToHome}
          </Link>
        </header>
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-6">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{t.resetPasswordComplete}</h2>
              <p className="text-gray-600 mb-6">{t.resetPasswordCompleteDesc}</p>
              <Link to="/login"><Button className="bg-blue-600 hover:bg-blue-700">{t.signIn}</Button></Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      <header className="p-4">
        <Link to="/" className="inline-flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4 mr-2" />{t.backToHome}
        </Link>
      </header>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center mb-4">
              <span className="text-white font-bold text-xl">B</span>
            </div>
            <CardTitle className="text-2xl">{t.resetPasswordTitle}</CardTitle>
            <CardDescription>{t.resetPasswordDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">{t.newPassword}</Label>
                <div className="relative">
                  <Input id="password" name="password" type={showPassword ? 'text' : 'password'} placeholder={t.atLeast8Chars} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required minLength={8} data-testid="reset-password-input" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t.confirmPassword}</Label>
                <Input id="confirmPassword" name="confirmPassword" type="password" placeholder={t.confirmYourPassword} value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} required data-testid="reset-confirm-password-input" />
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading} data-testid="reset-submit-btn">
                {loading ? t.resettingPassword : t.resetPasswordBtn}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
