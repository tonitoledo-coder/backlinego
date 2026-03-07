import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTranslation } from '@/components/i18n/translations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Package, 
  Calendar, 
  Settings,
  Plus,
  LogOut,
  Shield,
  ShieldCheck,
  Star,
  MapPin,
  QrCode,
  CheckCircle,
  Clock,
  XCircle,
  Sparkles,
  X
} from 'lucide-react';
import EquipmentCard from '@/components/equipment/EquipmentCard';
import QRDeliveryModal from '@/components/qr/QRDeliveryModal';

export default function Profile() {
  const { t, lang } = useTranslation();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrBooking, setQrBooking] = useState(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        base44.auth.redirectToLogin();
        return;
      }
      const userData = await base44.auth.me();
      setUser(userData);
      const profiles = await base44.entities.UserProfile.filter({ email: userData.email });
      const userProfile = profiles?.[0] || null;
      setUserProfile(userProfile);
    } catch (e) {
      base44.auth.redirectToLogin();
    } finally {
      setLoading(false);
    }
  };

  const { data: myEquipment = [] } = useQuery({
    queryKey: ['equipment', 'mine', user?.email],
    queryFn: () => base44.entities.Equipment.filter({ created_by: user.email }, '-created_date', 50),
    enabled: !!user?.email,
  });

  const { data: myBookings = [] } = useQuery({
    queryKey: ['bookings', 'mine', user?.id],
    queryFn: () => base44.entities.Booking.filter({ renter_id: user.id }, '-created_date', 50),
    enabled: !!user?.id,
  });

  const { data: incomingBookings = [], refetch: refetchIncoming } = useQuery({
    queryKey: ['bookings', 'incoming', user?.id],
    queryFn: () => base44.entities.Booking.filter({ owner_id: user.id }, '-created_date', 50),
    enabled: !!user?.id,
  });

  const { data: allEquipment = [] } = useQuery({
    queryKey: ['equipment', 'all-mine'],
    queryFn: () => base44.entities.Equipment.filter({}, '-created_date', 100),
    enabled: !!user?.id,
  });

  const equipmentMap = useMemo(() => {
    const map = {};
    allEquipment.forEach(eq => { map[eq.id] = eq; });
    return map;
  }, [allEquipment]);

  const queryClient = useQueryClient();

  const confirmReturnMutation = useMutation({
    mutationFn: (bookingId) => base44.entities.Booking.update(bookingId, { status: 'completed', escrow_status: 'released' }),
    onSuccess: () => queryClient.invalidateQueries(['bookings', 'incoming']),
  });


  const handleLogout = () => {
    base44.auth.logout(createPageUrl('Home'));
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-zinc-800" />
            <div className="space-y-2">
              <div className="h-6 w-40 bg-zinc-800 rounded" />
              <div className="h-4 w-32 bg-zinc-800 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusColors = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    confirmed: 'bg-blue-500/20 text-blue-400',
    active: 'bg-green-500/20 text-green-400',
    completed: 'bg-zinc-500/20 text-zinc-400',
    cancelled: 'bg-red-500/20 text-red-400',
  };

  const statusIcons = {
    pending: Clock,
    confirmed: CheckCircle,
    active: CheckCircle,
    completed: CheckCircle,
    cancelled: XCircle,
  };

  const fmtSlot = (h) =>
    h != null ? String(h).padStart(2, '0') + ':00h' : null;

  const showOnboardingBanner = !bannerDismissed && user && !user.onboarding_completed;

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      {/* Onboarding Banner */}
      {showOnboardingBanner && (
        <div
          className="rounded-xl p-4 mb-6 flex items-center gap-4 relative"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
        >
          <Sparkles className="w-8 h-8 text-white flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm">Completa tu perfil</p>
            <p className="text-purple-200 text-sm">Añade tu información profesional para empezar a alquilar y publicar equipo.</p>
          </div>
          <Link to={createPageUrl('CompleteProfile')} className="flex-shrink-0">
            <Button size="sm" className="bg-white text-purple-700 hover:bg-purple-50 font-semibold">
              Completar ahora
            </Button>
          </Link>
          <button
            onClick={() => setBannerDismissed(true)}
            className="absolute top-2 right-2 text-purple-200 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Profile Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-green-500 p-0.5">
            <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-zinc-400" />
              )}
            </div>
          </div>
          
          <div>
            <h1 className="text-2xl font-bold text-white">{user?.display_name || user?.full_name || user?.username || 'Usuario'}</h1>
            <p className="text-zinc-400">{user?.email}</p>
            <div className="flex items-center gap-3 mt-2">
              {(userProfile?.is_verified || user?.id_verified) ? (
                <Badge className="bg-green-500/20 text-green-400 border border-green-500/30">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  {t('idVerified')}
                </Badge>
              ) : (
                <Badge className="bg-zinc-500/20 text-zinc-400 border border-zinc-500/30">
                  <Shield className="w-3 h-3 mr-1" />
                  {lang === 'es' ? 'Sin verificar' : 'Not verified'}
                </Badge>
              )}
              {user?.rating && (
                <div className="flex items-center gap-1 text-sm">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="text-white">{user.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Link to={createPageUrl('AddEquipment')}>
            <Button className="bg-green-500 hover:bg-green-600 text-black font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              {t('addEquipment')}
            </Button>
          </Link>
          <Link to={createPageUrl('Settings')}>
            <Button variant="outline" className="">
              <Settings className="w-4 h-4 mr-2" />
              Editar perfil
            </Button>
          </Link>
          <Button 
            variant="outline" 
            className="border-red-900/50 text-red-400 hover:bg-red-950/60 hover:border-red-800 hover:text-red-300"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t('logout')}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4 text-center">
            <Package className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{myEquipment.length}</p>
            <p className="text-sm text-zinc-500">{t('equipment')}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4 text-center">
            <Calendar className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{myBookings.length}</p>
            <p className="text-sm text-zinc-500">{t('bookings')}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4 text-center">
            <Star className="w-6 h-6 text-amber-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{user?.reviews_count || 0}</p>
            <p className="text-sm text-zinc-500">{t('reviews')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="equipment" className="w-full">
        <TabsList className="bg-zinc-900 border border-zinc-800 w-full justify-start flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="equipment" className="data-[state=active]:bg-blue-600">
            <Package className="w-4 h-4 mr-2" />
            {t('myEquipment')}
          </TabsTrigger>
          <TabsTrigger value="bookings" className="data-[state=active]:bg-blue-600">
            <Calendar className="w-4 h-4 mr-2" />
            {t('bookings')}
          </TabsTrigger>
          <TabsTrigger value="incoming" className="data-[state=active]:bg-green-600">
            <Package className="w-4 h-4 mr-2" />
            Reservas entrantes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="equipment" className="mt-6">
          {myEquipment.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myEquipment.map(eq => (
                <EquipmentCard
                  key={eq.id}
                  equipment={eq}
                  currentUserEmail={user?.email}
                  onDeleted={() => queryClient.invalidateQueries(['equipment', 'mine', user?.email])}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Package className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {lang === 'es' ? 'No tienes equipo publicado' : 'No equipment listed'}
              </h3>
              <p className="text-zinc-500 mb-6">
                {lang === 'es' ? 'Empieza a ganar dinero alquilando tu equipo' : 'Start earning by renting your equipment'}
              </p>
              <Link to={createPageUrl('AddEquipment')}>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('addEquipment')}
                </Button>
              </Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="bookings" className="mt-6">
          {myBookings.length > 0 ? (
            <div className="space-y-4">
              {myBookings.map(booking => {
                const StatusIcon = statusIcons[booking.status] || Clock;
                return (
                  <Card key={booking.id} className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-lg bg-zinc-800 flex items-center justify-center">
                            <Package className="w-6 h-6 text-zinc-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-white">Reserva #{booking.id?.slice(-8)}</p>
                            <div className="flex items-center gap-1.5 text-sm text-zinc-400 mt-0.5">
                              <span>{booking.start_date}</span>
                              {fmtSlot(booking.delivery_slot) && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-mono">
                                  {fmtSlot(booking.delivery_slot)}
                                </span>
                              )}
                              <span className="text-zinc-600">→</span>
                              <span>{booking.end_date}</span>
                              {fmtSlot(booking.return_slot) && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono">
                                  {fmtSlot(booking.return_slot)}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-zinc-500 mt-0.5">
                              {booking.days} días · €{booking.total_price}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <Badge className={statusColors[booking.status]}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {booking.status}
                          </Badge>
                          
                          {(booking.status === 'confirmed' || booking.status === 'active') && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-blue-700 text-blue-400 hover:bg-blue-900/30"
                              onClick={() => setQrBooking(booking)}
                            >
                              <QrCode className="w-4 h-4 mr-2" />
                              {t('scanQR')}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <Calendar className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {lang === 'es' ? 'No tienes reservas' : 'No bookings yet'}
              </h3>
              <p className="text-zinc-500 mb-6">
                {lang === 'es' ? 'Explora equipo cerca de ti' : 'Explore equipment near you'}
              </p>
              <Link to={createPageUrl('Explore')}>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  {t('explore')}
                </Button>
              </Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="incoming" className="mt-6">
          {incomingBookings.length > 0 ? (
            <div className="space-y-4">
              {incomingBookings.map(booking => {
                const eq = equipmentMap[booking.equipment_id];
                const StatusIcon = statusIcons[booking.status] || Clock;
                return (
                  <Card key={booking.id} className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0">
                            {eq?.images?.[0] ? (
                              <img src={eq.images[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-6 h-6 text-zinc-600 m-auto mt-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-white text-sm">
                              {eq?.title || `Equipo #${booking.equipment_id?.slice(-6)}`}
                            </p>
                            <div className="flex flex-wrap items-center gap-1 text-xs text-zinc-400 mt-0.5">
                              <span>{booking.start_date}</span>
                              {fmtSlot(booking.delivery_slot) && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-mono">
                                  {fmtSlot(booking.delivery_slot)}
                                </span>
                              )}
                              <span className="text-zinc-600">→</span>
                              <span>{booking.end_date}</span>
                              {fmtSlot(booking.return_slot) && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono">
                                  {fmtSlot(booking.return_slot)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {booking.days} días · €{booking.total_price?.toFixed(0)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={statusColors[booking.status]}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {booking.status}
                          </Badge>
                          {(booking.status === 'confirmed' || booking.status === 'active') && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-blue-700 text-blue-400 hover:bg-blue-900/30 text-xs"
                              onClick={() => setQrBooking(booking)}
                            >
                              <QrCode className="w-3 h-3 mr-1" />
                              Ver QR
                            </Button>
                          )}
                          {booking.status === 'active' && (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-xs"
                              disabled={confirmReturnMutation.isPending}
                              onClick={() => confirmReturnMutation.mutate(booking.id)}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Confirmar devolución
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <Package className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Sin reservas entrantes</h3>
              <p className="text-zinc-500">Aún no hay reservas de tu equipo</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {qrBooking && (
        <QRDeliveryModal
          booking={qrBooking}
          open={!!qrBooking}
          onClose={() => setQrBooking(null)}
          currentUserId={user?.id}
        />
      )}
    </div>
  );
}