import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useTranslation } from '@/components/i18n/translations';
import { 
  Home, 
  Search, 
  Map, 
  Package, 
  User, 
  Plus,
  Building2,
  Wrench,
  Menu,
  X,
  Zap,
  LogOut,
  LogIn,
  Trophy
} from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';
import IOSInstallBanner from '@/components/pwa/IOSInstallBanner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function Layout({ children, currentPageName }) {
  const { t } = useTranslation();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        const userData = await base44.auth.me();
        setUser(userData);
      }
    } catch (e) {
      console.log('Not authenticated');
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { name: 'Home', icon: Home, label: t('home') },
    { name: 'Explore', icon: Search, label: t('explore') },
    { name: 'MapView', icon: Map, label: t('map') },
    { name: 'Specialists', icon: Wrench, label: 'Técnicos' },
    { name: 'Rewards', icon: Trophy, label: 'Rewards' },
    { name: 'Profile', icon: User, label: t('profile') },
  ];

  // Bottom nav items (only show 5 on mobile to avoid overflow)
  const mobileNavItems = [
    { name: 'Home', icon: Home, label: t('home') },
    { name: 'Explore', icon: Search, label: t('explore') },
    { name: 'MapView', icon: Map, label: t('map') },
    { name: 'Specialists', icon: Wrench, label: 'Técnicos' },
    { name: 'Profile', icon: User, label: t('profile') },
  ];

  const isActive = (pageName) => currentPageName === pageName;

  // Hide layout on onboarding
  if (currentPageName === 'Onboarding') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Desktop Header */}
      <header className="hidden lg:block fixed top-0 left-0 right-0 z-50 border-b" style={{background:'#1a1a2e', borderColor:'rgba(255,255,255,0.08)'}}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to={createPageUrl('Home')} className="flex items-center">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a08f2a394db4f3cafbc46f/0a293e3b0_Puedeshacerlaconcalidadmxima_1.png"
              alt="BacklineGo"
              className="h-10 w-auto object-contain"
            />
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={createPageUrl(item.name)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive(item.name)
                    ? "text-white"
                    : "text-zinc-400 hover:text-white"
                )}
                style={isActive(item.name) ? {background:'rgba(255,255,255,0.07)', borderRadius:'8px'} : {}}
                onMouseEnter={e => { if (!isActive(item.name)) e.currentTarget.style.background='rgba(255,255,255,0.05)'; }}
                onMouseLeave={e => { if (!isActive(item.name)) e.currentTarget.style.background=''; }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link to={createPageUrl('AddEquipment')}>
              <Button className="font-semibold" style={{background:'#1DDF7A', color:'#060E18'}} onMouseEnter={e=>e.currentTarget.style.background='#17c96e'} onMouseLeave={e=>e.currentTarget.style.background='#1DDF7A'}>
                <Plus className="w-4 h-4 mr-2" />
                {t('addEquipment')}
              </Button>
            </Link>
            
            {loading ? null : user ? (
              <div className="flex items-center gap-3">
                <NotificationBell userEmail={user.email} />
                <Link to={createPageUrl('Profile')}>
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-zinc-400" />
                    )}
                  </div>
                </Link>
              </div>
            ) : (
              <Button 
                variant="outline" 
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                onClick={() => base44.auth.redirectToLogin()}
              >
                <LogIn className="w-4 h-4 mr-2" />
                {t('login')}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 border-b" style={{background:'#1a1a2e', borderColor:'rgba(255,255,255,0.08)'}}>
        <div className="px-4 h-14 flex items-center justify-between">
          <Link to={createPageUrl('Home')} className="flex items-center">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a08f2a394db4f3cafbc46f/0a293e3b0_Puedeshacerlaconcalidadmxima_1.png"
              alt="BacklineGo"
              className="h-8 w-auto object-contain"
            />
          </Link>

          <div className="flex items-center gap-2">
            {user && <NotificationBell userEmail={user.email} />}
            <Link to={createPageUrl('AddEquipment')}>
              <Button size="sm" className="text-black font-semibold" style={{background:'#00c853'}}>
                <Plus className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-14 lg:pt-16 pb-20 lg:pb-8">
        {children}
      </main>

      <IOSInstallBanner />

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t" style={{background:'#1a1a2e', borderColor:'rgba(255,255,255,0.08)'}}>
        <div className="flex items-center justify-around h-16 px-1" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {mobileNavItems.map((item) => (
            <Link
              key={item.name}
              to={createPageUrl(item.name)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 min-w-0",
                isActive(item.name)
                  ? "text-white"
                  : "text-zinc-500"
              )}
              style={isActive(item.name) ? {color:'#7c3aed'} : {}}
            >
              <item.icon className={cn(
                "w-5 h-5 mb-0.5 shrink-0",
                isActive(item.name) && "scale-110"
              )} />
              <span className="text-[9px] font-medium truncate w-full text-center px-0.5">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}