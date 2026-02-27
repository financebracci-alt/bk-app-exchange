import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLang, dateFmt } from '@/i18n';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  Key,
  Wallet,
  Copy,
  CheckCircle,
  Clock,
  XCircle,
  LogOut,
  Eye,
  EyeOff,
} from 'lucide-react';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout, api, refreshUser } = useAuth();
  const { t, lang } = useLang();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success(t.copiedToClipboard);
  };

  const kycStatusConfig = {
    approved: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: t.verified },
    pending: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100', label: t.pendingReview },
    under_review: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100', label: t.underReview },
    rejected: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: t.rejected },
    not_started: { icon: Shield, color: 'text-gray-500', bg: 'bg-gray-100', label: t.notVerified },
  };

  const kycInfo = kycStatusConfig[user?.kyc_status] || kycStatusConfig.not_started;
  const KycIcon = kycInfo.icon;

  const handleChangePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      toast.error(t.passwordsNoMatch);
      return;
    }
    if (passwordForm.new.length < 8) {
      toast.error(t.passwordMinLength);
      return;
    }
    setChangingPassword(true);
    try {
      const res = await api.post('/auth/change-password', {
        current_password: passwordForm.current,
        new_password: passwordForm.new,
      });
      if (res.data.ok) {
        toast.success(t.passwordChanged);
        setShowChangePassword(false);
        setPasswordForm({ current: '', new: '', confirm: '' });
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || t.failedChangePassword);
    } finally {
      setChangingPassword(false);
    }
  };

  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString(dateFmt(lang), { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#121530] text-white">
        <div className="max-w-lg md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center space-x-3">
            <button onClick={() => navigate('/wallet')} className="p-1 hover:bg-white/10 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold">{t.profileTitle}</h1>
          </div>
        </div>
      </div>

      <main className="max-w-lg md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Avatar & Name */}
        <div className="flex flex-col items-center text-center pb-2">
          <div className="w-20 h-20 bg-[#121530] rounded-full flex items-center justify-center mb-3">
            <span className="text-2xl font-bold text-white">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">{user?.first_name} {user?.last_name}</h2>
          <p className="text-gray-500">@{user?.username}</p>
        </div>

        {/* Desktop: Grid layout for cards */}
        <div className="md:grid md:grid-cols-2 md:gap-6 space-y-4 md:space-y-0">
          {/* KYC Status Card */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full ${kycInfo.bg} flex items-center justify-center`}>
                  <KycIcon className={`w-5 h-5 ${kycInfo.color}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t.identityVerification}</p>
                  <p className={`font-semibold ${kycInfo.color}`}>{kycInfo.label}</p>
                </div>
              </div>
              {user?.kyc_status === 'not_started' && (
                <Button size="sm" onClick={() => navigate('/kyc')} data-testid="start-kyc-btn">
                  {t.verifyNow}
                </Button>
              )}
            </div>
          </Card>

          {/* Personal Information */}
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">{t.personalInfo}</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">{t.email}</p>
                  <p className="text-sm text-gray-900 truncate" data-testid="profile-email">{user?.email}</p>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-200 text-[10px]">
                  {user?.email_verified ? t.verified : t.unverified}
                </Badge>
              </div>

              <div className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">{t.phoneNumber}</p>
                  <p className="text-sm text-gray-900" data-testid="profile-phone">{user?.phone || t.notProvided}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">{t.dateOfBirth}</p>
                  <p className="text-sm text-gray-900" data-testid="profile-dob">
                    {user?.date_of_birth ? new Date(user.date_of_birth + 'T00:00:00').toLocaleDateString(dateFmt(lang), { day: 'numeric', month: 'long', year: 'numeric' }) : t.notProvided}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">{t.username}</p>
                  <p className="text-sm text-gray-900" data-testid="profile-username">@{user?.username}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Wallet & Security */}
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">{t.walletAndSecurity}</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Wallet className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">{t.ethWalletAddress}</p>
                  <p className="text-sm text-blue-600 font-mono truncate" data-testid="profile-eth-address">
                    {user?.eth_wallet_address || t.notAssigned}
                  </p>
                </div>
                {user?.eth_wallet_address && (
                  <button
                    onClick={() => copyToClipboard(user.eth_wallet_address)}
                    className="p-1.5 hover:bg-gray-100 rounded"
                    data-testid="copy-eth-address"
                  >
                    <Copy className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <Shield className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">{t.accountStatus}</p>
                  <p className={`text-sm font-medium ${
                    user?.account_status === 'active' ? 'text-green-600' :
                    user?.account_status === 'frozen' ? 'text-red-600' :
                    'text-gray-600'
                  }`} data-testid="profile-account-status">
                    {user?.account_status === 'active' ? t.active : user?.account_status === 'frozen' ? t.frozen : user?.account_status}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">{t.memberSince}</p>
                  <p className="text-sm text-gray-900" data-testid="profile-member-since">{memberSince}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <Card className="p-4 space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setShowChangePassword(true)}
              data-testid="change-password-btn"
            >
              <Key className="w-4 h-4 mr-3" />
              {t.changePassword}
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => { logout(); navigate('/'); }}
              data-testid="profile-signout-btn"
            >
              <LogOut className="w-4 h-4 mr-3" />
              {t.signOut}
            </Button>
          </Card>
        </div>
      </main>

      {/* Change Password Dialog */}
      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.changePassword}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-gray-700">{t.currentPassword}</label>
              <div className="relative mt-1">
                <Input
                  type={showCurrent ? 'text' : 'password'}
                  value={passwordForm.current}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                  placeholder={t.enterCurrentPassword}
                  data-testid="current-password-input"
                />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setShowCurrent(!showCurrent)}>
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t.newPassword}</label>
              <div className="relative mt-1">
                <Input
                  type={showNew ? 'text' : 'password'}
                  value={passwordForm.new}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                  placeholder={t.enterNewPassword}
                  data-testid="new-password-input"
                />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setShowNew(!showNew)}>
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">{t.confirmNewPassword}</label>
              <Input
                type="password"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                placeholder={t.confirmNewPasswordPlaceholder}
                data-testid="confirm-password-input"
                className="mt-1"
              />
              {passwordForm.confirm && passwordForm.new !== passwordForm.confirm && (
                <p className="text-xs text-red-500 mt-1">{t.passwordsNoMatch}</p>
              )}
            </div>
            <Button
              className="w-full"
              disabled={changingPassword || !passwordForm.current || !passwordForm.new || passwordForm.new !== passwordForm.confirm || passwordForm.new.length < 8}
              onClick={handleChangePassword}
              data-testid="submit-change-password"
            >
              {changingPassword ? t.changingPassword : t.changePassword}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilePage;
