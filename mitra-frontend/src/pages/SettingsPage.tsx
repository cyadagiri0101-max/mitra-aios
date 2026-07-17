import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Shield, Database, Bell, Palette } from 'lucide-react';
import toast from 'react-hot-toast';

interface SystemSettings {
  id: string;
  sessionTimeout: number;
  autoSync: boolean;
  backupInterval: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  darkMode: boolean;
  compactView: boolean;
  twoFactorAuth: boolean;
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<SystemSettings | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => api.get('/system/settings').then(r => r.data),
    retry: 2, staleTime: 5 * 60 * 1000,
  });

  useEffect(() => { if (settings) setLocalSettings(settings); }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<SystemSettings>) => api.patch('/system/settings', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['system-settings'] }); toast.success('Settings saved'); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to save settings'),
  });

  const toggleSetting = (key: keyof SystemSettings) => {
    if (!localSettings) return;
    const newValue = !localSettings[key];
    setLocalSettings({ ...localSettings, [key]: newValue });
    updateMutation.mutate({ [key]: newValue });
  };

  const updateValue = (key: keyof SystemSettings, value: any) => {
    if (!localSettings) return;
    setLocalSettings({ ...localSettings, [key]: value });
    updateMutation.mutate({ [key]: value });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-mitra-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const s = localSettings ?? settings ?? {
    sessionTimeout: 30, autoSync: true, backupInterval: 'Daily',
    emailNotifications: true, pushNotifications: false,
    darkMode: false, compactView: false, twoFactorAuth: false,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-mitra-600" />
              <CardTitle>Security</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Two-Factor Authentication</span>
              <button onClick={() => toggleSetting('twoFactorAuth')} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${s.twoFactorAuth ? 'bg-mitra-600' : 'bg-gray-200'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${s.twoFactorAuth ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Session Timeout (mins)</span>
              <input type="number" value={s.sessionTimeout} onChange={e => updateValue('sessionTimeout', parseInt(e.target.value) || 30)} className="w-20 input-field" min={5} max={120} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-mitra-600" />
              <CardTitle>Database</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Auto-sync</span>
              <button onClick={() => toggleSetting('autoSync')} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${s.autoSync ? 'bg-mitra-600' : 'bg-gray-200'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${s.autoSync ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Backup Interval</span>
              <select value={s.backupInterval} onChange={e => updateValue('backupInterval', e.target.value)} className="input-field w-32">
                <option>Hourly</option><option>Daily</option><option>Weekly</option>
              </select>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-mitra-600" />
              <CardTitle>Notifications</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Email Notifications</span>
              <button onClick={() => toggleSetting('emailNotifications')} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${s.emailNotifications ? 'bg-mitra-600' : 'bg-gray-200'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${s.emailNotifications ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Push Notifications</span>
              <button onClick={() => toggleSetting('pushNotifications')} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${s.pushNotifications ? 'bg-mitra-600' : 'bg-gray-200'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${s.pushNotifications ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-mitra-600" />
              <CardTitle>Appearance</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Dark Mode</span>
              <button onClick={() => toggleSetting('darkMode')} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${s.darkMode ? 'bg-mitra-600' : 'bg-gray-200'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${s.darkMode ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Compact View</span>
              <button onClick={() => toggleSetting('compactView')} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${s.compactView ? 'bg-mitra-600' : 'bg-gray-200'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${s.compactView ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
