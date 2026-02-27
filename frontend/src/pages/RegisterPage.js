import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLang } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const t = useMemo(() => getTranslations(), []);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '', username: '', password: '', confirmPassword: '',
    first_name: '', last_name: '', date_of_birth: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error(t.passwordsMustMatch);
      return;
    }
    if (formData.password.length < 8) {
      toast.error(t.passwordMin8);
      return;
    }
    setLoading(true);
    try {
      const result = await register({
        email: formData.email, username: formData.username,
        password: formData.password, first_name: formData.first_name,
        last_name: formData.last_name, date_of_birth: formData.date_of_birth,
      });
      if (result.success) {
        toast.success(t.accountCreated);
        navigate('/wallet');
      } else {
        toast.error(result.error?.message || t.registrationFailed);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || t.registrationFailedRetry);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      <header className="p-4">
        <Link to="/" className="inline-flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t.backToHome}
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center mb-4">
              <span className="text-white font-bold text-xl">B</span>
            </div>
            <CardTitle className="text-2xl">{t.registerTitle}</CardTitle>
            <CardDescription>{t.registerSubtitle}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">{t.firstName}</Label>
                  <Input id="first_name" name="first_name" placeholder="John" value={formData.first_name} onChange={handleChange} required data-testid="register-first-name-input" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">{t.lastName}</Label>
                  <Input id="last_name" name="last_name" placeholder="Doe" value={formData.last_name} onChange={handleChange} required data-testid="register-last-name-input" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t.email}</Label>
                <Input id="email" name="email" type="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} required data-testid="register-email-input" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">{t.username}</Label>
                <Input id="username" name="username" placeholder="johndoe" value={formData.username} onChange={handleChange} required data-testid="register-username-input" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_of_birth">{t.dateOfBirth}</Label>
                <Input id="date_of_birth" name="date_of_birth" type="date" value={formData.date_of_birth} onChange={handleChange} required data-testid="register-dob-input" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t.password}</Label>
                <div className="relative">
                  <Input id="password" name="password" type={showPassword ? 'text' : 'password'} placeholder={t.atLeast8Chars} value={formData.password} onChange={handleChange} required minLength={8} data-testid="register-password-input" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t.confirmPassword}</Label>
                <Input id="confirmPassword" name="confirmPassword" type="password" placeholder={t.confirmYourPassword} value={formData.confirmPassword} onChange={handleChange} required data-testid="register-confirm-password-input" />
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading} data-testid="register-submit-button">
                {loading ? t.creatingAccount : t.registerButton}
              </Button>
            </form>

            <p className="mt-4 text-xs text-gray-500 text-center">{t.termsAgreement}</p>

            <div className="mt-6 text-center text-sm">
              <span className="text-gray-600">{t.alreadyHaveAccount} </span>
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">{t.signIn}</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
