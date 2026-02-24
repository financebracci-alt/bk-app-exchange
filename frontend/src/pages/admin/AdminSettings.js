import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from './AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Save, Mail, Shield, Info } from 'lucide-react';

const AdminSettings = () => {
  const { api, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    maintenance_mode: false,
    maintenance_message: '',
    allow_registration: true,
    resend_api_key: '',
    sender_email: 'noreply@blockchain.com',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get('/admin/settings');
      if (response.data.ok) {
        setSettings(response.data.data.settings);
      }
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (user?.role !== 'superadmin') {
      toast.error('Only superadmins can modify settings');
      return;
    }

    setSaving(true);
    try {
      const params = {};
      if (settings.maintenance_mode !== undefined) params.maintenance_mode = settings.maintenance_mode;
      if (settings.maintenance_message) params.maintenance_message = settings.maintenance_message;
      if (settings.allow_registration !== undefined) params.allow_registration = settings.allow_registration;
      if (settings.resend_api_key && settings.resend_api_key !== '***configured***') {
        params.resend_api_key = settings.resend_api_key;
      }
      if (settings.sender_email) params.sender_email = settings.sender_email;

      const response = await api.put('/admin/settings', null, { params });
      if (response.data.ok) {
        toast.success('Settings saved successfully');
        loadSettings();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Settings">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Settings">
      <div className="max-w-2xl space-y-6">
        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              System Status
            </CardTitle>
            <CardDescription>Control system availability and registration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Maintenance Mode</Label>
                <p className="text-sm text-gray-500">Disable access for all users</p>
              </div>
              <Switch
                checked={settings.maintenance_mode}
                onCheckedChange={(v) => setSettings(s => ({ ...s, maintenance_mode: v }))}
              />
            </div>

            {settings.maintenance_mode && (
              <div className="space-y-2">
                <Label>Maintenance Message</Label>
                <Input
                  value={settings.maintenance_message}
                  onChange={(e) => setSettings(s => ({ ...s, maintenance_message: e.target.value }))}
                  placeholder="System is under maintenance..."
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label>Allow Public Registration</Label>
                <p className="text-sm text-gray-500">Let users sign up themselves</p>
              </div>
              <Switch
                checked={settings.allow_registration}
                onCheckedChange={(v) => setSettings(s => ({ ...s, allow_registration: v }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="w-5 h-5 mr-2" />
              Email Settings (Resend)
            </CardTitle>
            <CardDescription>Configure email service for automated notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start space-x-2">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700">
                  Get your Resend API key from <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">resend.com/api-keys</a>. 
                  You'll also need to verify a domain for sending emails.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Resend API Key</Label>
              <Input
                type="password"
                value={settings.resend_api_key}
                onChange={(e) => setSettings(s => ({ ...s, resend_api_key: e.target.value }))}
                placeholder="re_xxxxxxxxxxxxx"
              />
              {settings.resend_api_key === '***configured***' && (
                <p className="text-xs text-green-600">API key is configured</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Sender Email</Label>
              <Input
                type="email"
                value={settings.sender_email}
                onChange={(e) => setSettings(s => ({ ...s, sender_email: e.target.value }))}
                placeholder="noreply@yourdomain.com"
              />
              <p className="text-xs text-gray-500">Must be from a verified domain in Resend</p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={saving || user?.role !== 'superadmin'}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>

        {user?.role !== 'superadmin' && (
          <p className="text-sm text-orange-600 text-center">
            Only superadmins can modify system settings
          </p>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
