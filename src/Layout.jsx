import React, { useState, useEffect, Suspense, lazy } from 'react';
import LegalAcceptanceModal from '@/components/legal/LegalAcceptanceModal';
import PageTransition from '@/components/mobile/PageTransition';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';

// Eagerly keep the 5 mobile tab pages mounted to preserve scroll & state
const TabHome        = lazy(() => import('./pages/Home'));
const TabExplore     = lazy(() => import('./pages/Explore'));
const TabMapView     = lazy(() => import('./pages/MapView'));
const TabSpecialists = lazy(() => import('./pages/Specialists'));
const TabProfile     = lazy(() => import('./pages/Profile'));

const MOBILE_TABS = ['Home', 'Explore', 'MapView', 'Specialists', 'Profile'];
const TAB_COMPONENTS = { Home: TabHome, Explore: TabExplore, MapView: TabMapView, Specialists: TabSpecialists, Profile: TabProfile };
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
  ChevronLeft
} from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';
import IOSInstallBanner from '@/components/pwa/IOSInstallBanner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PROTECTED_PAGES = ['Profile', 'Settings', 'AddEquipment', 'Chat', 'Rewards'];
const ROOT_PAGES = new Set(['Home', 'Explore', 'MapView', 'Specialists', 'Profile', 'Rewards', 'Onboarding', 'PendingApproval']);

function RejectedScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4" style={{ background: '#0d0d1a' }}>
      <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
        <Ban className="w-10 h-10 text-red-500" />
      </div>
      <h1 className="text-2xl font-bold text-white">Cuenta suspendida</h1>
      <p className="text-zinc-400 text-center max-w-sm">Tu cuenta ha sido suspendida temporalmente. Contacta con nosotros en hola@backlinego.com</p>
      <Button variant="ghost" className="text-zinc-400" onClick={() => base44.auth.logout()}>Cerrar sesión</Button>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
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
        if (profiles.length === 0) {
          base44.entities.UserProfile.create({
            user_id: userData.id,
            email: userData.email,
            display_name: userData.full_name || userData.username || userData.email,
            role: 'user',
            account_status: 'approved',
            is_verified: false,
            is_banned: false,
            profile_complete: !!userData.onboarding_completed,
            onboarding_completed: !!userData.onboarding_completed,
            subscription_plan: 'free',
          }).catch(() => {});
        }
        const profile = profiles?.[0];
        if (profile) {
          setIsBanned(profile.is_banned || false);
          setProfileComplete(profile.profile_complete || false);
          if (profile.role === 'admin') setIsAdmin(true);
          setCurrentUserProfile(profile);

          if (profile.onboarding_completed) {
            const [termsDocs, privacyDocs] = await Promise.all([
              base44.entities.LegalDocument.filter({ type: 'terms', is_active: true }),
              base44.entities.LegalDocument.filter({ type: 'privacy', is_active: true }),
            ]);
            const activeTerms = termsDocs?.[0];
            const activePrivacy = privacyDocs?.[0];
            const needsLegalAcceptance =
              profile.role !== 'admin' &&
              activeTerms && activePrivacy && (
                !profile.terms_version_accepted ||
                !profile.privacy_version_accepted ||
                profile.terms_version_accepted !== activeTerms.version ||
                profile.privacy_version_accepted !== activePrivacy.version
              );
            if (needsLegalAcceptance) setShowLegalModal(true);
          }
        }
      } catch (_) {}
    } catch (e) {
      console.log('Not authenticated');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEquipmentClick = async (e) => {
    e.preventDefault();
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }
    if (!profileComplete) {
      navigate(createPageUrl('CompleteProfile') + '?next=AddEquipment');
      return;
    }
    navigate(createPageUrl('AddEquipment'));
  };

  const isActive = (pageName) => currentPageName === pageName;
  const isSubPage = !ROOT_PAGES.has(currentPageName);

  const navItems = [
    { name: 'Home', icon: Home, label: t('home') },
    { name: 'Explore', icon: Search, label: t('explore') },
    { name: 'MapView', icon: Map, label: t('map') },
    { name: 'Specialists', icon: Wrench, label: 'Técnicos' },
    { name: 'Rewards', icon: Trophy, label: 'Rewards' },
    { name: 'Profile', icon: User, label: t('profile') },
  ];

  const mobileNavItems = [
    { name: 'Home', icon: Home, label: t('home') },
    { name: 'Explore', icon: Search, label: t('explore') },
    { name: 'MapView', icon: Map, label: t('map') },
    { name: 'Specialists', icon: Wrench, label: 'Técnicos' },
    { name: 'Profile', icon: User, label: t('profile') },
  ];

  if (currentPageName === 'Onboarding' || currentPageName === 'PendingApproval') {
    return <>{children}</>;
  }

  if (!loading && user && isBanned) {
    return <RejectedScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      {showLegalModal && currentUserProfile && (
        <LegalAcceptanceModal
          userProfile={currentUserProfile}
          onAccepted={(accepted) => {
            setCurrentUserProfile(p => p ? { ...p, ...accepted } : p);
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
              <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800" onClick={() => base44.auth.redirectToLogin()}>
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
      {/* Desktop: normal render */}
      <main className="hidden lg:block pt-16 pb-8">
        <PageTransition>
          {children}
        </PageTransition>
      </main>

      {/* Mobile: keep all 5 tab pages mounted; show/hide via CSS to preserve scroll & state */}
      <div className="lg:hidden pt-14 pb-20" style={{ overscrollBehavior: 'none' }}>
        {MOBILE_TABS.map((tabName) => {
          const TabPage = TAB_COMPONENTS[tabName];
          const isTabActive = currentPageName === tabName;
          return (
            <div
              key={tabName}
              style={{ display: isTabActive ? 'block' : 'none' }}
            >
              <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
                <TabPage />
              </Suspense>
            </div>
          );
        })}
        {/* Sub-pages (non-tab) render normally */}
        {!MOBILE_TABS.includes(currentPageName) && (
          <PageTransition>
            {children}
          </PageTransition>
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
  );
}