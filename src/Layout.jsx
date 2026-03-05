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
  Trophy,
  Crown,
  Clock,
  XCircle
} from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';
import IOSInstallBanner from '@/components/pwa/IOSInstallBanner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PROTECTED_PAGES = ['Profile', 'Settings', 'AddEquipment', 'Chat', 'Rewards'];

function PendingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4" style={{ background: '#0d0d1a' }}>
      <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.15)' }}>
        <Clock className="w-10 h-10 text-amber-400" />
      </div>
      <h1 className="text-2xl font-bold text-white">Cuenta pendiente de aprobación</h1>
      <p className="text-zinc-400 text-center max-w-sm">Tu cuenta está siendo revisada. Te avisaremos por email en cuanto sea aprobada.</p>
      <Button variant="ghost" className="text-zinc-400" onClick={() => base44.auth.logout()}>Cerrar sesión</Button>
    </div>
  );
}

function RejectedScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4" style={{ background: '#0d0d1a' }}>
      <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
        <XCircle className="w-10 h-10 text-red-500" />
      </div>
      <h1 className="text-2xl font-bold text-white">Cuenta rechazada</h1>
      <p className="text-zinc-400 text-center max-w-sm">Tu solicitud de acceso ha sido rechazada. Contacta con soporte si crees que es un error.</p>
      <Button variant="ghost" className="text-zinc-400" onClick={() => base44.auth.logout()}>Cerrar sesión</Button>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  const { t } = useTranslation();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accountStatus, setAccountStatus] = useState(null); // null | 'pending' | 'approved' | 'rejected'

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        // Redirect only if trying to access a protected page
        if (PROTECTED_PAGES.includes(currentPageName)) {
          base44.auth.redirectToLogin(window.location.href);
          return;
        }
        setLoading(false);
        return;
      }
      const userData = await base44.auth.me();
      setUser(userData);
      try {
        const profiles = await base44.entities.UserProfile.filter({ email: userData.email });
        const profile = profiles?.[0];
        if (profile) {
          setAccountStatus(profile.account_status || 'approved');
          if (profile.role === 'admin') setIsAdmin(true);
        }
      } catch (_) {}
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
            <span className="text-xl font-bold text-white tracking-tight">Backline<span style={{color:'#1DDF7A'}}>Go</span></span>
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
            {isAdmin && (
              <Link
                to={createPageUrl('Admin')}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5",
                  isActive('Admin') ? "text-white" : "text-amber-400 hover:text-amber-300"
                )}
                style={isActive('Admin') ? { background: 'rgba(251,191,36,0.1)', borderRadius: '8px' } : {}}>
                <Crown className="w-3.5 h-3.5" />
                Admin
              </Link>
            )}
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
            <span className="text-lg font-bold text-white tracking-tight">Backline<span style={{color:'#1DDF7A'}}>Go</span></span>
          </Link>

          <div className="flex items-center gap-2">
            {user && <NotificationBell userEmail={user.email} />}
            <Link to={createPageUrl('AddEquipment')}>
              <Button size="sm" className="font-semibold" style={{background:'#1DDF7A', color:'#060E18'}}>
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
              style={isActive(item.name) ? {color:'#1DDF7A'} : {}}
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