'use client';

import { useEffect, useState, useCallback } from 'react';
import { Settings as SettingsIcon, Mail, Bell, Slack, Palette, Loader2, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/supabase/auth-context';
import { fetchUserSettings, updateUserSettings } from '@/lib/supabase/data';

export default function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [slackWebhook, setSlackWebhook] = useState('');

  const load = useCallback(async () => {
    try {
      const s = await fetchUserSettings();
      if (s) {
        setTheme(s.theme);
        setEmailNotifications(s.email_notifications);
        setSlackWebhook(s.slack_webhook_url || '');
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUserSettings({
        theme,
        email_notifications: emailNotifications,
        slack_webhook_url: slackWebhook,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight"><SettingsIcon className="h-6 w-6 text-primary" /> Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and notification preferences</p>
      </div>

      {/* Account */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Account</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={user?.email ?? ''} readOnly className="pl-9 bg-muted/50" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Bell className="h-4 w-4" /> Notifications</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <div className="text-sm font-medium">Email notifications</div>
              <div className="text-xs text-muted-foreground">Get notified when scans complete or critical findings are detected</div>
            </div>
            <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
          </div>
          <div className="space-y-2">
            <Label>Slack webhook URL</Label>
            <div className="relative">
              <Slack className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={slackWebhook} onChange={(e) => setSlackWebhook(e.target.value)} placeholder="https://hooks.slack.com/services/..." className="pl-9" />
            </div>
            <p className="text-xs text-muted-foreground">Receive scan alerts in your Slack channel</p>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Palette className="h-4 w-4" /> Appearance</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Theme</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Saving...</> : 'Save changes'}
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-severity-low">
            <CheckCircle2 className="h-4 w-4" /> Settings saved
          </span>
        )}
      </div>
    </div>
  );
}
