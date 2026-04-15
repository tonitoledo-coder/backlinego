import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTranslation } from '@/components/i18n/translations';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  Package,
  PackageCheck,
  Calendar,
  Settings,
  Plus,
  LogOut,
  Shield,
  ShieldCheck,
  Star,
  QrCode,
  CheckCircle,
  Clock,
  XCircle,
  Sparkles,
  X,
  AlertTriangle,
  MessageSquare
} from 'lucide-react';
import EquipmentCard from '@/components/equipment/EquipmentCard';
import QRDeliveryModal from '@/components/qr/QRDeliveryModal';
import CancelBookingModal from '@/components/booking/CancelBookingModal';
import PullToRefresh from '@/components/mobile/PullToRefresh';
import DisputeModal from '@/components/disputes/DisputeModal';
import DisputeResponseModal from '@/components/disputes/DisputeResponseModal';
import { sendBookingEmail } from '@/utils/sendBookingEmail';

// Returns ms remaining in the 48h dispute window after a booking completes
function disputeWindowMs(booking) {
  const ref = booking.updated_date || booking.created_date;
  if (!ref) return 0;
  const completedAt = new Date(ref).getTime();
  const windowEnd = completedAt + 48 * 60 * 60 * 1000;
  return Math.max(0, windowEnd - Date.now());
}

export default function Profile() {
  const { t, lang } = useTranslation();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrBooking, setQrBooking] = useState(null);
  const [cancelBooking, setCancelBooking] = useState(null);
  const [cancelledBy, setCancelledByRole] = useState(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [disputeBooking, setDisputeBooking] = useState(null);       // booking to open dispute
  const [respondDispute, setRespondDispute] = useState(null);       // dispute to respond to

  useEffect(() => { loadUser(); }, []);

  const loadUser = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) { base44.auth.redirectToLogin(); return; }
      const userData = await base44.auth.me();
      setUser(userData);
      const profiles = await base44.entities.UserProfile.filter({ email: userData.email });
      setUserProfile(profiles?.[0] || null);
    } catch (e) {
      base44.auth.redirectToLogin();
    } finally {
      setLoading(false);
    }
  };

  const queryClient = useQueryClient();

  const { data: myEquipment = [] } = useQuery({
    queryKey: ['equipment', 'mine', user?.email],
    queryFn: () => base44.entities.Equipment.filter({ created_by: user.email }, '-created_date', 50),
    enabled: !!user?.email,
  });

  const { data: myBookings = [], refetch: refetchMyBookings } = useQuery({
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
    queryKey: ['equipment', 'all-mine', user?.email],
    queryFn: () => base44.entities.Equipment.filter({ created_by: user.email }, '-created_date', 100),
    enabled: !!user?.email,
  });

  const equipmentMap = useMemo(() => {
    const map = {};
    allEquipment.forEach(eq => { map[eq.id] = eq; });
    return map;
  }, [allEquipment]);

  const renterEquipmentIds = useMemo(() => [...new Set(myBookings.map(b => b.equipment_id).filter(Boolean))], [myBookings]);

  const { data: renterEquipmentList = [] } = useQuery({
    queryKey: ['equipment', 'renter-bookings', renterEquipmentIds],
    queryFn: () => base44.entities.Equipment.filter({ id__in: renterEquipmentIds }),
    enabled: renterEquipmentIds.length > 0,
  });

  const renterEquipmentMap = useMemo(() => {
    const map = {};
    renterEquipmentList.forEach(eq => { map[eq.id] = eq; });
    return map;
  }, [renterEquipmentList]);

  // Fetch disputes for completed bookings (to know if a dispute exists and enable respond)
  const completedBookingIds = useMemo(() => {
    const all = [...myBookings, ...incomingBookings].filter(b => b.status === 'disputed' || b.status === 'completed');
    return [...new Set(all.map(b => b.id))];
  }, [myBookings, incomingBookings]);

  const { data: bookingDisputes = [] } = useQuery({
    queryKey: ['disputes', 'my-bookings', completedBookingIds],
    queryFn: async () => {
      if (!completedBookingIds.length) return [];
      const results = await Promise.all(
        completedBookingIds.map(id => base44.entities.Dispute.filter({ booking_id: id }))
      );
      return results.flat();
    },
    enabled: completedBookingIds.length > 0,
  });

  const disputeByBookingId = useMemo(() => {
    const map = {};
    bookingDisputes.forEach(d => { map[d.booking_id] = d; });
    return map;
  }, [bookingDisputes]);

  const confirmReturnMutation = useMutation({
    mutationFn: (bookingId) => base44.entities.Booking.update(bookingId, { status: 'completed', escrow_status: 'released' }),
    onMutate: async (bookingId) => {
      await queryClient.cancelQueries(['bookings', 'incoming', user?.id]);
      const prev = queryClient.getQueryData(['bookings', 'incoming', user?.id]);
      queryClient.setQueryData(['bookings', 'incoming', user?.id], (old = []) =>
        old.map(b => b.id === bookingId ? { ...b, status: 'completed', escrow_status: 'released' } : b)
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['bookings', 'incoming', user?.id], ctx.prev);
    },
    onSuccess: (_data, bookingId) => {
      const booking = incomingBookings.find(b => b.id === bookingId);
      if (booking) {
        sendBookingEmail('return_confirmed', booking, {
          equipmentTitle: equipmentMap[booking.equipment_id]?.title,
          renterEmail:    booking.renter_email || booking.renter_id,
          ownerEmail:     booking.owner_email  || user?.email,
        });
      }
    },
    onSettled: () => queryClient.invalidateQueries(['bookings', 'incoming']),
  });

  const handleLogout = () => base44.auth.logout(createPageUrl('Home'));

  const refreshMyBookings = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['bookings', 'mine', user?.id] });
  }, [queryClient, user?.id]);

  const refreshIncoming = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['bookings', 'incoming', user?.id] });
  }, [queryClient, user?.id]);

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
    pending:   'bg-yellow-500/20 text-yellow-400',
    confirmed: 'bg-blue-500/20 text-blue-400',
    active:    'bg-green-500/20 text-green-400',
    returning: 'bg-emerald-500/20 text-emerald-400',
    completed: 'bg-zinc-500/20 text-zinc-400',
    cancelled: 'bg-red-500/20 text-red-400',
    disputed:  'bg-amber-500/20 text-amber-400',
  };

  const statusIcons = {
    pending:   Clock,
    confirmed: CheckCircle,
    active:    CheckCircle,
    returning: PackageCheck,
    completed: CheckCircle,
    cancelled: XCircle,
    disputed:  AlertTriangle,
  };

  const fmtSlot = (h) => h != null ? String(h).padStart(2, '0') + ':00h' : null;

  const showOnboardingBanner = !bannerDismissed && user && !user.onboarding_completed;

  // Dispute button logic: visible if booking is completed AND within 48h AND no dispute opened yet
  const canOpenDispute = (booking) => {
    if (booking.status !== 'completed') return false;
    if (disputeByBookingId[booking.id]) return false;
    return disputeWindowMs(booking) > 0;
  };

  // Respond logic: visible if booking is disputed AND this user is NOT the opener AND respondent_response is empty
  const canRespondToDispute = (booking) => {
    const dispute = disputeByBookingId[booking.id];
    if (!dispute) return false;
    if (dispute.opened_by === user?.email) return false;
    if (dispute.respondent_response) return false;
    return ['open', 'awaiting_response'].includes(dispute.status);
  };

  const renderBookingCard = (booking, role) => {
    const StatusIcon = statusIcons[booking.status] || Clock;
    const eq = role === 'renter' ? renterEquipmentMap[booking.equipment_id] : equipmentMap[booking.equipment_id];
    const dispute = disputeByBookingId[booking.id];
    const otherPartyEmail = role === 'renter' ? booking.owner_id : booking.renter_id;

    return (
      <Card key={booking.id} className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                {eq?.images?.[0] ? (
                  <img src={eq.images[0]} alt={eq.title} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-6 h-6 text-zinc-600" />
                )}
              </div>
              <div>
                <p className="font-semibold text-white truncate max-w-[180px] sm:max-w-xs text-sm">
                  {eq?.title ? (eq.title.length > 30 ? eq.title.slice(0, 30) + '…' : eq.title) : `Equipo #${booking.equipment_id?.slice(-6)}`}
                </p>
                <p className="text-xs mt-0.5 text-zinc-500">Reserva #{booking.id?.slice(-8)}</p>
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-0.5">
                  <span>{booking.start_date}</span>
                  {fmtSlot(booking.delivery_slot) && (
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-mono">{fmtSlot(booking.delivery_slot)}</span>
                  )}
                  <span className="text-zinc-600">→</span>
                  <span>{booking.end_date}</span>
                  {fmtSlot(booking.return_slot) && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono">{fmtSlot(booking.return_slot)}</span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">{booking.days} días · €{booking.total_price?.toFixed ? booking.total_price.toFixed(0) : booking.total_price}</p>

                {/* Dispute info banner */}
                {dispute && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-amber-400">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>Disputa {dispute.status === 'awaiting_response' ? '· esperando respuesta' : `· ${dispute.status}`}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              <Badge className={statusColors[booking.status] || 'bg-zinc-500/20 text-zinc-400'}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {booking.status}
              </Badge>

              {/* QR button */}
              {(booking.status === 'confirmed' || booking.status === 'active') && (
                <Button size="sm" variant="outline" className="border-blue-700 text-blue-400 hover:bg-blue-900/30 text-xs"
                  onClick={() => setQrBooking(booking)}>
                  <QrCode className="w-3 h-3 mr-1" />
                  {role === 'renter' ? t('scanQR') : 'Ver QR'}
                </Button>
              )}

              {/* Confirm return (owner only) */}
              {role === 'owner' && booking.status === 'active' && (
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs"
                  disabled={confirmReturnMutation.isPending}
                  onClick={() => confirmReturnMutation.mutate(booking.id)}>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Confirmar devolución
                </Button>
              )}

              {/* Cancel */}
              {['pending', 'confirmed'].includes(booking.status) && (
                <Button size="sm" variant="outline" className="border-red-800 text-red-400 hover:bg-red-950/40 text-xs"
                  onClick={() => { setCancelBooking(booking); setCancelledByRole(role); }}>
                  <XCircle className="w-3 h-3 mr-1" />
                  Cancelar
                </Button>
              )}

              {/* Open dispute (48h window after completion) */}
              {canOpenDispute(booking) && (
                <Button size="sm" variant="outline" className="border-amber-700 text-amber-400 hover:bg-amber-950/30 text-xs"
                  onClick={() => setDisputeBooking({ booking, otherPartyEmail })}>
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Abrir disputa
                </Button>
              )}

              {/* Respond to dispute */}
              {canRespondToDispute(booking) && (
                <Button size="sm" variant="outline" className="border-blue-700 text-blue-400 hover:bg-blue-900/30 text-xs"
                  onClick={() => setRespondDispute(dispute)}>
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Responder disputa
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      {/* Onboarding Banner */}
      {showOnboardingBanner && (
        <div className="rounded-xl p-4 mb-6 flex items-center gap-4 relative"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
          <Sparkles className="w-8 h-8 text-white flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm">Completa tu perfil</p>
            <p className="text-purple-200 text-sm">Añade tu información profesional para empezar a alquilar y publicar equipo.</p>
          </div>
          <Link to={createPageUrl('CompleteProfile')} className="flex-shrink-0">
            <Button size="sm" className="bg-white text-purple-700 hover:bg-purple-50 font-semibold">Completar ahora</Button>
          </Link>
          <button onClick={() => setBannerDismissed(true)} className="absolute top-2 right-2 text-purple-200 hover:text-white transition-colors">
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
                  <ShieldCheck className="w-3 h-3 mr-1" />{t('idVerified')}
                </Badge>
              ) : (
                <Badge className="bg-zinc-500/20 text-zinc-400 border border-zinc-500/30">
                  <Shield className="w-3 h-3 mr-1" />{lang === 'es' ? 'Sin verificar' : 'Not verified'}
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

        <div className="flex flex-wrap gap-2">
          <Link to={createPageUrl('AddEquipment')}>
            <Button className="bg-green-500 hover:bg-green-600 text-black font-semibold">
              <Plus className="w-4 h-4 mr-2" />{t('addEquipment')}
            </Button>
          </Link>
          <Link to={createPageUrl('Settings')}>
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />Editar perfil
            </Button>
          </Link>
          <Button variant="outline" className="border-red-900/50 text-red-400 hover:bg-red-950/60 hover:border-red-800 hover:text-red-300" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />{t('logout')}
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
            <Package className="w-4 h-4 mr-2" />{t('myEquipment')}
          </TabsTrigger>
          <TabsTrigger value="bookings" className="data-[state=active]:bg-blue-600">
            <Calendar className="w-4 h-4 mr-2" />{t('bookings')}
          </TabsTrigger>
          <TabsTrigger value="incoming" className="data-[state=active]:bg-green-600">
            <Package className="w-4 h-4 mr-2" />Reservas entrantes
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
                  <Plus className="w-4 h-4 mr-2" />{t('addEquipment')}
                </Button>
              </Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="bookings" className="mt-6">
          <PullToRefresh onRefresh={refreshMyBookings}>
            {myBookings.length > 0 ? (
              <div className="space-y-4">
                {myBookings.map(booking => renderBookingCard(booking, 'renter'))}
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
                  <Button className="bg-blue-600 hover:bg-blue-700">{t('explore')}</Button>
                </Link>
              </div>
            )}
          </PullToRefresh>
        </TabsContent>

        <TabsContent value="incoming" className="mt-6">
          <PullToRefresh onRefresh={refreshIncoming}>
            {incomingBookings.length > 0 ? (
              <div className="space-y-4">
                {incomingBookings.map(booking => renderBookingCard(booking, 'owner'))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Package className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Sin reservas entrantes</h3>
                <p className="text-zinc-500">Aún no hay reservas de tu equipo</p>
              </div>
            )}
          </PullToRefresh>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {qrBooking && (
        <QRDeliveryModal booking={qrBooking} open={!!qrBooking} onClose={() => setQrBooking(null)} currentUserId={user?.id} />
      )}
      {cancelBooking && (
        <CancelBookingModal
          booking={cancelBooking}
          cancelledBy={cancelledBy}
          open={!!cancelBooking}
          onClose={() => { setCancelBooking(null); setCancelledByRole(null); }}
        />
      )}
      {disputeBooking && (
        <DisputeModal
          booking={disputeBooking.booking}
          currentUserEmail={user?.email}
          otherPartyEmail={disputeBooking.otherPartyEmail}
          open={!!disputeBooking}
          onClose={() => setDisputeBooking(null)}
          onDisputeOpened={() => {
            setDisputeBooking(null);
            queryClient.invalidateQueries(['bookings', 'mine', user?.id]);
            queryClient.invalidateQueries(['bookings', 'incoming', user?.id]);
            queryClient.invalidateQueries(['disputes', 'my-bookings']);
          }}
        />
      )}
      {respondDispute && (
        <DisputeResponseModal
          dispute={respondDispute}
          open={!!respondDispute}
          onClose={() => setRespondDispute(null)}
          onResponded={() => {
            setRespondDispute(null);
            queryClient.invalidateQueries(['disputes', 'my-bookings']);
          }}
        />
      )}
    </div>
  );
}