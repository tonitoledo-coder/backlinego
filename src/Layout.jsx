import * as Sentry from "@sentry/react";
import React, { useState, useEffect, Suspense, lazy } from 'react';
import LegalAcceptanceModal from '@/components/legal/LegalAcceptanceModal';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

const TabHome        = lazy(() => import('./pages/Home'));
const TabExplore     = lazy(() => import('./pages/Explore'));
const TabMapView     = lazy(() => import('./pages/MapView'));
const TabSpecialists = lazy(() => import('./pages/Specialists'));
const TabProfile     = lazy(() => import('./pages/Profile'));

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[BacklineGo] ErrorBoundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, background: '#0a0a0f' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 28 }}>⚠️</span>
          </div>
          <h2 style={{ color: 'white', fontWeight: 700, fontSize: '1.25rem', margin: 0 }}>Algo ha ido mal</h2>
          <p style={{ color: '#71717a', fontSize: '0.875rem', textAlign: 'center', maxWidth: 320, margin: 0 }}>
            {this.state.error?.message || 'Error inesperado'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer' }}
          >
            Recargar página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const MOBILE_TABS = ['Home', 'Explore', 'Specialists', 'Profile'];
const TAB_COMPONENTS = { Home: TabHome, Explore: TabExplore, Specialists: TabSpecialists, Profile: TabProfile };
import { useTranslation } from '@/components/i18n/translations';
import {
  Home,
  Search,
  Map,
  User,
  Plus,
  Wrench,
  LogIn,
  Trophy,
  Crown,
  Ban,
  ChevronLeft,
  MessageSquare
} from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';
import IOSInstallBanner from '@/components/pwa/IOSInstallBanner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PROTECTED_PAGES = ['Profile', 'Settings', 'AddEquipment', 'Chat', 'Rewards'];
const ROOT_PAGES = new Set(['Home', 'Explore', 'MapView', 'Specialists', 'Profile', 'Rewards', 'Onboarding', 'PendingApproval', 'BulletinBoard']);

function BannedScreen() {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4" style={{ background: '#0d0d1a' }}>
      <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
        <Ban className="w-10 h-10 text-red-500" />
      </div>
      <h1 className="text-2xl font-bold text-white">Cuenta suspendida</h1>
      <p className="text-zinc-400 text-center max-w-sm">Tu cuenta ha sido suspendida temporalmente. Contacta con nosotros en hola@backlinego.com</p>
      <Button variant="ghost" className="text-zinc-400" onClick={() => logout()}>Cerrar sesión</Button>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isLoadingAuth, navigateToLogin } = useAuth();
  const routePageName = location.pathname.replace('/', '') || 'Home';

  // Derive state directly from AuthContext user (which already includes profile)
  const isAdmin = user?.role === 'admin';
  const isBanned = user?.is_banned === true || user?.account_status === 'suspended';
  const profileComplete = user?.profile_complete || false;

  const [showLegalModal, setShowLegalModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoadingAuth) return;

    // Redirect unauthenticated users away from protected pages
    if (!isAuthenticated && PROTECTED_PAGES.includes(currentPageName)) {
      navigateToLogin();
      return;
    }

    // Check legal acceptance for authenticated users with completed onboarding
    if (isAuthenticated && user?.onboarding_completed) {
      checkLegalAcceptance();
    }

    setLoading(false);
  }, [isLoadingAuth, isAuthenticated, user?.id]);

  const checkLegalAcceptance = async () => {
    if (!user || user.role === 'admin') return;
    try {
      const [termsRes, privacyRes] = await Promise.all([
        supabase.from('legal_document').select('version').eq('doc_type', 'terms').eq('is_published', true).limit(1),
        supabase.from('legal_document').select('version').eq('doc_type', 'privacy').eq('is_published', true).limit(1),
      ]);
      const activeTerms = termsRes.data?.[0] ?? null;
      const activePrivacy = privacyRes.data?.[0] ?? null;
      if (activeTerms && activePrivacy) {
        const needsAcceptance =
          !user.terms_version_accepted ||
          !user.privacy_version_accepted ||
          user.terms_version_accepted !== activeTerms.version ||
          user.privacy_version_accepted !== activePrivacy.version;
        if (needsAcceptance) setShowLegalModal(true);
      }
    } catch (err) {
      console.warn('Legal doc check failed, skipping:', err?.message);
    }
  };

  const handleAddEquipmentClick = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigateToLogin();
      return;
    }
    if (!profileComplete) {
      navigate(createPageUrl('CompleteProfile') + '?next=AddEquipment');
      return;
    }
    navigate(createPageUrl('AddEquipment'));
  };

  const isActive = (pageName) => routePageName === pageName;
  const isSubPage = !ROOT_PAGES.has(routePageName);

  const navItems = [
    { name: 'Home', icon: Home, label: t('home') },
    { name: 'Explore', icon: Search, label: t('explore') },
    { name: 'MapView', icon: Map, label: t('map') },
    { name: 'Specialists', icon: Wrench, label: 'Técnicos' },
    { name: 'BulletinBoard', icon: MessageSquare, label: 'Tablón' },
    { name: 'Rewards', icon: Trophy, label: 'Rewards' },
    { name: 'Profile', icon: User, label: t('profile') },
  ];

  const mobileNavItems = [
    { name: 'Home', icon: Home, label: t('home') },
    { name: 'Explore', icon: Search, label: t('explore') },
    { name: 'MapView', icon: Map, label: t('map') },
    { name: 'Specialists', icon: Wrench, label: 'Técnicos' },
    { name: 'Rewards', icon: Trophy, label: 'Rewards' },
    { name: 'Profile', icon: User, label: t('profile') },
  ];

  if (routePageName === 'Onboarding' || routePageName === 'PendingApproval') {
    return <>{children}</>;
  }

  if (!loading && user && isBanned) {
    return <BannedScreen />;
  }

  return (
    <Sentry.ErrorBoundary fallback={<p>Ha ocurrido un error inesperado.</p>} showDialog>
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      {showLegalModal && user && (
        <LegalAcceptanceModal
          userProfile={user}
          onAccepted={(accepted) => {
            setShowLegalModal(false);
          }}
        />
      )}

      {/* Desktop Header */}
      <header className="hidden lg:block fixed top-0 left-0 right-0 z-50 border-b" style={{ background: '#1a1a2e', borderColor: 'rgba(255,255,255,0.08)', paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to={createPageUrl('Home')} className="flex items-center">
            <span className="text-xl font-bold text-white tracking-tight">Backline<span style={{ color: '#1DDF7A' }}>Go</span></span>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={createPageUrl(item.name)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive(item.name) ? "text-white" : "text-zinc-400 hover:text-white"
                )}
                style={isActive(item.name) ? { background: 'rgba(255,255,255,0.07)' } : {}}
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
                style={isActive('Admin') ? { background: 'rgba(251,191,36,0.1)' } : {}}
              >
                <Crown className="w-3.5 h-3.5" />
                Admin
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleAddEquipmentClick}
              className="font-semibold"
              style={{ background: '#1DDF7A', color: '#060E18' }}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('addEquipment')}
            </Button>
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
              <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800" onClick={() => navigateToLogin()}>
                <LogIn className="w-4 h-4 mr-2" />
                {t('login')}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 border-b" style={{ background: '#1a1a2e', borderColor: 'rgba(255,255,255,0.08)', paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="px-4 h-14 flex items-center justify-between">
          {isSubPage ? (
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-zinc-300 hover:text-white transition-colors -ml-1 pr-2"
              aria-label="Volver"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Volver</span>
            </button>
          ) : (
            <Link to={createPageUrl('Home')} className="flex items-center">
              <span className="text-lg font-bold text-white tracking-tight">Backline<span style={{ color: '#1DDF7A' }}>Go</span></span>
            </Link>
          )}
          <div className="flex items-center gap-2">
            {user && <NotificationBell userEmail={user.email} />}
            {!isSubPage && (
              <Button size="sm" onClick={handleAddEquipmentClick} className="font-semibold" style={{ background: '#1DDF7A', color: '#060E18' }}>
                <Plus className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="hidden lg:block pt-16 pb-8">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>

      <div className="lg:hidden pb-20" style={{ paddingTop: 'calc(3.5rem + env(safe-area-inset-top))', overscrollBehavior: 'none' }}>
        {MOBILE_TABS.map((tabName) => {
          const TabPage = TAB_COMPONENTS[tabName];
          const isTabActive = routePageName === tabName;
          if (!user && PROTECTED_PAGES.includes(tabName) && !isTabActive) {
            return <div key={tabName} style={{ display: 'none' }} />;
          }
          return (
            <div key={tabName} style={{ display: isTabActive ? 'block' : 'none' }}>
              <ErrorBoundary>
                <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
                  <TabPage />
                </Suspense>
              </ErrorBoundary>
            </div>
          );
        })}
        {!MOBILE_TABS.includes(routePageName) && (
          <>{children}</>
        )}
      </div>

      <IOSInstallBanner />

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t" style={{ background: '#1a1a2e', borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-around h-16 px-1" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {mobileNavItems.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() => { if (!isActive(item.name)) navigate(createPageUrl(item.name)); }}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 min-w-0 bg-transparent border-0",
                isActive(item.name) ? "text-white" : "text-zinc-500"
              )}
              style={isActive(item.name) ? { color: '#1DDF7A' } : {}}
            >
              <item.icon className={cn("w-5 h-5 mb-0.5 shrink-0", isActive(item.name) && "scale-110")} />
              <span className="text-[9px] font-medium truncate w-full text-center px-0.5">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
    </Sentry.ErrorBoundary>
  );
}
