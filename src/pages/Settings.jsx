import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, User, CreditCard, Bell, Lock, Shield, ChevronLeft, Fingerprint } from 'lucide-react';
import SettingsProfile from '@/components/settings/SettingsProfile.jsx';
import SettingsBilling from '@/components/settings/SettingsBilling.jsx';
import SettingsSecurity from '@/components/settings/SettingsSecurity.jsx';
import SettingsNotifications from '@/components/settings/SettingsNotifications.jsx';
import SettingsPrivacy from '@/components/settings/SettingsPrivacy.jsx';
import IdentityVerificationForm from '@/components/identity/IdentityVerificationForm';

const TABS = [
  { id: 'profile',       icon: User,        label: 'Perfil' },
  { id: 'identity',      icon: Fingerprint, label: 'Identidad' },
  { id: 'billing',       icon: CreditCard,  label: 'Facturación' },
  { id: 'security',      icon: Shield,      label: 'Seguridad' },
  { id: 'notifications', icon: Bell,        label: 'Notificaciones' },
  { id: 'privacy',       icon: Lock,        label: 'Privacidad' },
];

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Read active tab from URL
  const urlParams = new URLSearchParams(window.location.search);
  const defaultTab = urlParams.get('tab') || 'profile';
  const paymentResult = urlParams.get('payment');

  useEffect(() => {
    (async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) { base44.auth.redirectToLogin(window.location.href); return; }
      const u = await base44.auth.me();
      setUser(u);
      const profiles = await base44.entities.UserProfile.filter({ email: u.email });
      if (profiles?.[0]) setUserProfile(profiles[0]);
      setLoading(false);
    })();
  }, []);

  const refreshUser = async () => {
    const u = await base44.auth.me();
    setUser(u);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d0d1a' }}>
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#a78bfa' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: '#0d0d1a' }}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-zinc-500 hover:text-white text-sm mb-4 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Volver
          </button>
          <h1 className="text-2xl font-bold text-white">Configuración de cuenta</h1>
          <p className="text-zinc-400 text-sm mt-1">{user?.email}</p>
        </div>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="w-full flex overflow-x-auto mb-8 p-1 rounded-xl gap-1"
            style={{ background: '#161625', border: '1px solid rgba(255,255,255,0.07)' }}>
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.id} value={tab.id}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all min-w-max px-3 data-[state=active]:bg-zinc-700 data-[state=active]:text-white data-[state=inactive]:text-zinc-500 data-[state=inactive]:hover:text-zinc-300">
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="profile">
            <SettingsProfile user={user} onSaved={refreshUser} />
          </TabsContent>
          <TabsContent value="identity">
            <IdentityVerificationForm
              userProfile={userProfile}
              onUpdated={(updated) => setUserProfile(updated)}
            />
          </TabsContent>
          <TabsContent value="billing">
            <SettingsBilling user={user} onSaved={refreshUser} paymentResult={paymentResult} />
          </TabsContent>
          <TabsContent value="security">
            <SettingsSecurity user={user} />
          </TabsContent>
          <TabsContent value="notifications">
            <SettingsNotifications user={user} onSaved={refreshUser} />
          </TabsContent>
          <TabsContent value="privacy">
            <SettingsPrivacy user={user} onSaved={refreshUser} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}