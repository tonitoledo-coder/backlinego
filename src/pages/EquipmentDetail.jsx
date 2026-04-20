import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTranslation } from '@/components/i18n/translations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  MapPin, 
  Star, 
  Calendar as CalendarIcon,
  ShieldCheck,
  Zap,
  CreditCard,
  Clock,
  ChevronLeft,
  ChevronRight,
  User,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { format, differenceInDays, addDays, parseISO, isWithinInterval, eachDayOfInterval } from 'date-fns';
import { calcBookingPrice } from '@/components/booking/calcBookingPrice';
import { es, enUS } from 'date-fns/locale';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { createNotification } from '@/components/notifications/createNotification';
import { sendBookingEmail } from '@/utils/sendBookingEmail';
import PaymentModal from '@/components/booking/PaymentModal';
import OwnerRatingBadge from '@/components/reviews/OwnerRatingBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';

// Modal types: null | 'login' | 'pending' | 'complete_profile'
function BookingAccessModal({ type, onClose }) {
  const navigate = useNavigate();
  if (!type) return null;

  if (type === 'login') return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white">Inicia sesión para reservar</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Crea tu cuenta gratis para alquilar equipo profesional.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-2">
          <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => base44.auth.redirectToLogin(window.location.href)}>
            Iniciar sesión
          </Button>
          <Button variant="outline" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800" onClick={() => base44.auth.redirectToLogin(window.location.href)}>
            Registrarse
          </Button>
          <p className="text-xs text-zinc-500 text-center mt-1">Solo necesitarás completar tu perfil la primera vez.</p>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (type === 'pending') return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white">Tu cuenta está en revisión</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Nuestro equipo está verificando tu solicitud. Te avisaremos cuando puedas realizar reservas.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 mt-2">
          <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => navigate(createPageUrl('PendingApproval'))}>Ver estado de cuenta</Button>
          <Button variant="outline" className="w-full border-zinc-700 text-zinc-300" onClick={onClose}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (type === 'complete_profile') return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white">Completa tu perfil para continuar</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Necesitamos algunos datos antes de tu primera reserva.
          </DialogDescription>
        </DialogHeader>
        <Button className="w-full bg-blue-600 hover:bg-blue-700 mt-2" onClick={() => navigate(createPageUrl('CompleteProfile'))}>
          Completar perfil ahora
        </Button>
      </DialogContent>
    </Dialog>
  );

  return null;
}

export default function EquipmentDetail() {
  const { t, lang } = useTranslation();
  const dateLocale = lang === 'es' ? es : enUS;
  const params = new URLSearchParams(window.location.search);
  const equipmentId = params.get('id');
  
  const [currentImage, setCurrentImage] = useState(0);
  const [startDate, setStartDate] = useState(() => {
    const v = params.get('from');
    return v ? parseISO(v) : null;
  });
  const [endDate, setEndDate] = useState(() => {
    const v = params.get('to');
    return v ? parseISO(v) : null;
  });
  const [isBooking, setIsBooking] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [rangeWarning, setRangeWarning] = useState('');
  const [accessModal, setAccessModal] = useState(null); // null | 'login' | 'pending' | 'complete_profile'
  const [openStart, setOpenStart] = useState(false);
  const [openEnd,   setOpenEnd]   = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then(setIsAuthed).catch(() => setIsAuthed(false));
  }, []);
  const [deliverySlot, setDeliverySlot] = useState(null); // hora entrega en startDate
  const [returnSlot,   setReturnSlot]   = useState(null); // hora devolución en endDate

  const queryClient = useQueryClient();

  // Load existing bookings to block occupied dates
  const { data: existingBookings = [] } = useQuery({
    queryKey: ['bookings', 'equipment', equipmentId],
    queryFn: () => base44.entities.Booking.filter({ equipment_id: equipmentId }, '-created_date', 100),
    enabled: !!equipmentId,
  });

  // Build a Set of blocked date strings
  const bookedDatesSet = useMemo(() => {
    const set = new Set();
    existingBookings
      .filter(b => ['pending', 'confirmed', 'active'].includes(b.status))
      .forEach(b => {
        try {
          const start = parseISO(b.start_date);
          const end = parseISO(b.end_date);
          eachDayOfInterval({ start, end }).forEach(d => {
            set.add(format(d, 'yyyy-MM-dd'));
          });
        } catch {}
      });
    return set;
  }, [existingBookings]);

  const { data: equipment, isLoading } = useQuery({
    queryKey: ['equipment', equipmentId],
    queryFn: async () => {
      const items = await base44.entities.Equipment.filter({ id: equipmentId });
      return items[0];
    },
    enabled: !!equipmentId,
  });

  const bookingMutation = useMutation({
    mutationFn: async (bookingData) => {
      return base44.entities.Booking.create(bookingData);
    },
    onSuccess: () => {
      alert(lang === 'es' ? '¡Reserva creada! Te contactaremos pronto.' : 'Booking created! We will contact you soon.');
      queryClient.invalidateQueries(['equipment']);
    }
  });

  const pricing = startDate && endDate && equipment
    ? calcBookingPrice(equipment, startDate, endDate)
    : null;

  const days         = pricing?.days         ?? 0;
  const basePrice    = pricing?.basePrice    ?? 0;
  const insuranceFee = pricing?.insuranceFee ?? 0;
  const totalPrice   = pricing?.totalPrice   ?? 0;

  const minRentalDays = equipment?.min_rental_days || 1;
  const maxRentalDays = equipment?.max_rental_days || 30;
  const advanceNoticeDays = equipment?.advance_notice_days || 0;

  // Slots ocupados en las fechas seleccionadas
  const occupiedDeliverySlots = useMemo(() => {
    if (!startDate) return new Set();
    const key = format(startDate, 'yyyy-MM-dd');
    return new Set(
      existingBookings
        .filter(b => ['confirmed', 'active'].includes(b.status) && b.start_date === key && b.delivery_slot != null)
        .map(b => b.delivery_slot)
    );
  }, [startDate, existingBookings]);

  const occupiedReturnSlots = useMemo(() => {
    if (!endDate) return new Set();
    const key = format(endDate, 'yyyy-MM-dd');
    return new Set(
      existingBookings
        .filter(b => ['confirmed', 'active'].includes(b.status) && b.end_date === key && b.return_slot != null)
        .map(b => b.return_slot)
    );
  }, [endDate, existingBookings]);

  const ownerSlots = useMemo(() =>
    equipment?.pricing_config?.slots
      ? equipment.pricing_config.slots.map((on, i) => (on ? i : null)).filter(i => i !== null)
      : Array.from({ length: 24 }, (_, i) => i),
    [equipment]
  );

  const availableDeliverySlots = ownerSlots.filter(h => !occupiedDeliverySlots.has(h));
  const availableReturnSlots   = ownerSlots.filter(h => !occupiedReturnSlots.has(h));
  const blockedByOwner = new Set(equipment?.blocked_dates || []);

  const isDateBlocked = (date) => {
    const key = format(date, 'yyyy-MM-dd');
    return bookedDatesSet.has(key) || blockedByOwner.has(key);
  };

  const disabledStart = (date) => {
    const minDate = addDays(new Date(), advanceNoticeDays);
    minDate.setHours(0,0,0,0);
    if (date < minDate) return true;
    return isDateBlocked(date);
  };

  const disabledEnd = (date) => {
    const base = startDate || new Date();
    if (date < base) return true;
    if (isDateBlocked(date)) return true;
    // Block if any booked date exists between startDate and this date
    if (startDate) {
      try {
        const interval = eachDayOfInterval({ start: addDays(startDate, 1), end: date });
        if (interval.some(d => isDateBlocked(d))) return true;
      } catch {}
    }
    return false;
  };

  const handleStartDateSelect = (date) => {
    setStartDate(date);
    setEndDate(null);
    setOpenStart(false);
    setOpenEnd(true);
    setRangeWarning('');
    setDeliverySlot(null);
    setReturnSlot(null);
  };

  const handleEndDateSelect = (date) => {
    setEndDate(date);
    setRangeWarning('');
    setReturnSlot(null);
    if (date && startDate) {
      const selectedDays = differenceInDays(date, startDate) + 1;
      if (selectedDays < minRentalDays) {
        setRangeWarning(`Mínimo ${minRentalDays} día${minRentalDays > 1 ? 's' : ''} de alquiler`);
      } else if (selectedDays > maxRentalDays) {
        setRangeWarning(`Máximo ${maxRentalDays} días de alquiler`);
      }
    }
  };

  const needsSlots = availableDeliverySlots.length > 0;
  const canBook =
    startDate && endDate &&
    days >= minRentalDays && days <= maxRentalDays &&
    !rangeWarning &&
    (!needsSlots || (deliverySlot !== null && returnSlot !== null));

  const checkBookingAccess = async () => {
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) { setAccessModal('login'); return false; }

    try {
      const user = await base44.auth.me();
      const profiles = await base44.entities.UserProfile.filter({ email: user.email });
      const profile = profiles?.[0];
      if (profile?.account_status === 'pending') { setAccessModal('pending'); return false; }
      if (!profile?.profile_complete) { setAccessModal('complete_profile'); return false; }
    } catch (_) {}

    return true;
  };

  const handleBooking = async () => {
    if (!startDate || !endDate) return;
    const allowed = await checkBookingAccess();
    if (!allowed) return;
    setShowPayment(true);
  };

  const handlePaymentConfirm = async () => {
    setShowPayment(false);
    setIsBooking(true);
    try {
      const user = await base44.auth.me();
      if (equipment.created_by) {
        await createNotification({
          user_email: equipment.created_by,
          type: 'booking_confirmed',
          title: `Nueva reserva: ${equipment.title}`,
          body: `${format(startDate, 'dd MMM')} ${deliverySlot !== null ? String(deliverySlot).padStart(2,'0')+'h' : ''} → ${format(endDate, 'dd MMM')} ${returnSlot !== null ? String(returnSlot).padStart(2,'0')+'h' : ''} · €${pricing?.totalPrice?.toFixed(0) || totalPrice.toFixed(0)}`,
          link_page: 'Profile',
        });
      }
      const newBooking = await bookingMutation.mutateAsync({
        equipment_id: equipmentId,
        renter_id: user.id,
        owner_id: equipment.created_by,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        days,
        base_price: basePrice,
        insurance_fee: insuranceFee,
        deposit: equipment.deposit || 0,
        total_price: totalPrice,
        status: 'confirmed',
        escrow_status: 'held',
        delivery_qr: `BLG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        is_sos: equipment.sos_available,
        delivery_slot: deliverySlot,
        return_slot: returnSlot,
      });
      // Email al owner: nueva reserva
      sendBookingEmail('booking_created', newBooking || {
        id: 'new', start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'), total_price: totalPrice,
      }, {
        equipmentTitle: equipment.title,
        ownerEmail:     equipment.created_by,
        renterEmail:    user.email,
      });
      // Email al renter: confirmación (el booking ya se crea confirmed)
      sendBookingEmail('booking_confirmed', newBooking || {
        id: 'new', start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'), total_price: totalPrice,
      }, {
        equipmentTitle: equipment.title,
        renterEmail:    user.email,
        ownerEmail:     equipment.created_by,
      });
    } finally {
      setIsBooking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        <div className="animate-pulse space-y-6">
          <div className="aspect-video bg-zinc-800 rounded-2xl" />
          <div className="h-8 bg-zinc-800 rounded w-1/2" />
          <div className="h-4 bg-zinc-800 rounded w-1/3" />
        </div>
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-20 text-center">
        <AlertCircle className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Equipo no encontrado</h2>
        <Link to={createPageUrl('Explore')}>
          <Button variant="outline" className="border-zinc-700 text-zinc-300">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('back')}
          </Button>
        </Link>
      </div>
    );
  }

  const images = equipment.images?.length > 0 ? equipment.images : [null];
  const conditionColor = equipment.condition >= 8 ? 'text-green-400' : 
                         equipment.condition >= 5 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      <PaymentModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        onConfirm={handlePaymentConfirm}
        equipment={equipment}
        days={days}
        basePrice={basePrice}
        insuranceFee={insuranceFee}
        totalPrice={totalPrice}
      />
      <BookingAccessModal type={accessModal} onClose={() => setAccessModal(null)} />
      {/* Back Button */}
      <Link to={createPageUrl('Explore')} className="inline-flex items-center text-zinc-400 hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t('back')}
      </Link>

      <div className="grid lg:grid-cols-5 gap-8">
        {/* Left Column - Images & Details */}
        <div className="lg:col-span-3 space-y-6">
          {/* Image Gallery */}
          <div className="relative rounded-2xl overflow-hidden bg-zinc-900">
            <div className="aspect-[4/3]">
              {images[currentImage] ? (
                <img 
                  src={images[currentImage]} 
                  alt={equipment.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                  <CategoryIcon category={equipment.category} className="w-20 h-20 text-zinc-600" />
                </div>
              )}
            </div>
            
            {/* Image Navigation */}
            {images.length > 1 && (
              <>
                <button 
                  onClick={() => setCurrentImage(i => i === 0 ? images.length - 1 : i - 1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button 
                  onClick={() => setCurrentImage(i => i === images.length - 1 ? 0 : i + 1)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImage(i)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        i === currentImage ? 'bg-white w-6' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {equipment.sos_available && (
                <Badge className="bg-green-500/90 text-black font-semibold">
                  <Zap className="w-3 h-3 mr-1" />
                  SOS 24h
                </Badge>
              )}
              {equipment.owner_type === 'professional' && (
                <Badge className="bg-amber-500/90 text-black font-semibold">PRO</Badge>
              )}
            </div>
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentImage(i)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                    i === currentImage ? 'border-blue-500' : 'border-transparent'
                  }`}
                >
                  {img ? (
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-zinc-800" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Title & Meta */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CategoryIcon category={equipment.category} className="w-5 h-5 text-blue-500" />
              <span className="text-blue-500 font-medium">{t(equipment.category)}</span>
            </div>
            
            <h1 className="text-3xl font-bold text-white mb-3">{equipment.title}</h1>
            
            <div className="flex flex-wrap items-center gap-4 text-zinc-400">
              {equipment.brand && <span>{equipment.brand} {equipment.model}</span>}
              {equipment.year && <span>• {equipment.year}</span>}
              <span className={`flex items-center gap-1 ${conditionColor}`}>
                • {t('condition')}: {equipment.condition}/10
              </span>
            </div>
            
            {equipment.location?.city && (
              <div className="flex items-center gap-2 mt-3 text-zinc-500">
                <MapPin className="w-4 h-4" />
                <span>{equipment.location.address || equipment.location.city}</span>
              </div>
            )}

            {/* Owner rating + verified badge */}
            {equipment.created_by && (
              <div className="mt-3">
                <Link to={createPageUrl('PublicProfile') + '?email=' + encodeURIComponent(equipment.created_by)}>
                <OwnerRatingBadge
                  ownerEmail={equipment.created_by}
                  identityStatus={equipment.owner_identity_status}
                />
                </Link>
              </div>
            )}
          </div>

          <Separator className="bg-zinc-800" />

          {/* Description */}
          {equipment.description && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Descripción</h3>
              <p className="text-zinc-400 leading-relaxed">{equipment.description}</p>
            </div>
          )}

          {/* Specifications */}
          {equipment.specs && Object.keys(equipment.specs).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">{t('specifications')}</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(equipment.specs).map(([key, value]) => (
                  <div key={key} className="bg-zinc-900/50 rounded-lg p-3">
                    <p className="text-xs text-zinc-500 uppercase">{key}</p>
                    <p className="text-white font-medium">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Booking Card */}
        <div className="lg:col-span-2">
          <Card className="bg-zinc-900/80 border-zinc-800 sticky top-20">
            <CardHeader>
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-bold text-white">
                    {days > 0 && pricing
                      ? `€${pricing.totalPrice.toFixed(0)} total`
                      : `desde €${equipment.price_per_day}/día`}
                  </span>
                </div>
                {equipment.deposit > 0 && (
                  <span className="text-sm text-zinc-500">{t('deposit')}: €{equipment.deposit}</span>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Date Selection */}
              <div className="grid grid-cols-2 gap-3">
                <Popover open={openStart} onOpenChange={setOpenStart}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                      <CalendarIcon className="w-4 h-4 mr-2 text-zinc-500" />
                      {startDate ? format(startDate, 'dd MMM', { locale: dateLocale }) : t('startDate')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-800">
                    <Calendar
    mode="single"
    selected={startDate}
    onSelect={handleStartDateSelect}
    disabled={disabledStart}
    locale={dateLocale}
    modifiers={{
      booked: (date) => {
        const key = format(date, 'yyyy-MM-dd');
        return bookedDatesSet.has(key) || blockedByOwner.has(key);
      }
    }}
    modifiersClassNames={{
      booked: 'text-red-400/70 line-through opacity-60'
    }}
  />
                  </PopoverContent>
                </Popover>
                
                <Popover open={openEnd} onOpenChange={setOpenEnd}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                      <CalendarIcon className="w-4 h-4 mr-2 text-zinc-500" />
                      {endDate ? format(endDate, 'dd MMM', { locale: dateLocale }) : t('endDate')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-800">
                    <Calendar
    mode="single"
    selected={endDate}
    onSelect={(d) => { handleEndDateSelect(d); setOpenEnd(false); }}
    disabled={disabledEnd}
    locale={dateLocale}
    modifiers={{
      booked: (date) => {
        const key = format(date, 'yyyy-MM-dd');
        return bookedDatesSet.has(key) || blockedByOwner.has(key);
      }
    }}
    modifiersClassNames={{
      booked: 'text-red-400/70 line-through opacity-60'
    }}
  />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Calendar legend */}
              <div className="flex items-center gap-4 text-xs text-zinc-500">
<span className="flex items-center gap-1">
    <span className="w-2.5 h-2.5 rounded-full bg-zinc-100 inline-block" />Disponible
  </span>
  <span className="flex items-center gap-1">
    <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />Ocupado
  </span>
  <span className="flex items-center gap-1">
    <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />Seleccionado
  </span>
              </div>

              {rangeWarning && (
                <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  {rangeWarning}
                </p>
              )}

              {/* ── Slot de entrega (startDate) ── */}
              {startDate && availableDeliverySlots.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-white mb-1">
                    Hora de entrega
                    <span className="text-zinc-500 font-normal ml-2 text-xs">{format(startDate, 'dd MMM')}</span>
                  </p>
                  <p className="text-xs text-zinc-500 mb-2">El owner te entrega el equipo en esta franja</p>
                  <div className="grid grid-cols-6 gap-1.5">
                    {availableDeliverySlots.map(h => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setDeliverySlot(h === deliverySlot ? null : h)}
                        className={`py-1.5 rounded-md text-center text-xs font-mono transition-colors ${
                          deliverySlot === h
                            ? 'bg-blue-600 text-white border border-blue-500'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-500 hover:text-white'
                        }`}
                      >
                        {String(h).padStart(2, '0')}h
                      </button>
                    ))}
                  </div>
                  {deliverySlot === null && endDate && (
                    <p className="text-xs text-amber-400/70 mt-1.5">Elige hora de entrega para continuar</p>
                  )}
                </div>
              )}

              {/* ── Slot de devolución (endDate) ── */}
              {endDate && deliverySlot !== null && availableReturnSlots.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-white mb-1">
                    Hora de devolución
                    <span className="text-zinc-500 font-normal ml-2 text-xs">{format(endDate, 'dd MMM')}</span>
                  </p>
                  <p className="text-xs text-zinc-500 mb-2">Devuelves el equipo al owner en esta franja</p>
                  <div className="grid grid-cols-6 gap-1.5">
                    {availableReturnSlots.map(h => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setReturnSlot(h === returnSlot ? null : h)}
                        className={`py-1.5 rounded-md text-center text-xs font-mono transition-colors ${
                          returnSlot === h
                            ? 'bg-emerald-600 text-white border border-emerald-500'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-500 hover:text-white'
                        }`}
                      >
                        {String(h).padStart(2, '0')}h
                      </button>
                    ))}
                  </div>
                  {returnSlot === null && (
                    <p className="text-xs text-amber-400/70 mt-1.5">Elige hora de devolución para continuar</p>
                  )}
                </div>
              )}

              {/* Price Breakdown */}
              {days > 0 && pricing && (
                <div className="bg-zinc-800/50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between text-zinc-400">
                    <span>€{equipment.price_per_day}/día × {days} días</span>
                    <span>€{pricing.basePrice.toFixed(2)}</span>
                  </div>

                  {pricing.weekendMultiplier > 1 && (
                    <div className="flex justify-between text-amber-400">
                      <span>Fin de semana ×{pricing.weekendMultiplier.toFixed(2)}</span>
                      <span>+€{(pricing.basePrice * (pricing.weekendMultiplier - 1)).toFixed(2)}</span>
                    </div>
                  )}

                  {pricing.summerMultiplier > 1 && (
                    <div className="flex justify-between text-amber-400">
                      <span>Temporada alta ×{pricing.summerMultiplier.toFixed(2)}</span>
                      <span>+€{(pricing.basePrice * pricing.weekendMultiplier * (pricing.summerMultiplier - 1)).toFixed(2)}</span>
                    </div>
                  )}

                  {pricing.discountPct > 0 && (
                    <div className="flex justify-between text-green-400">
                      <span>Descuento reserva larga −{pricing.discountPct}%</span>
                      <span>−€{pricing.discountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-zinc-400">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-blue-500" />
                      {t('insuranceFee')}
                    </span>
                    <span>€{pricing.insuranceFee.toFixed(2)}</span>
                  </div>

                  <Separator className="bg-zinc-700" />

                  <div className="flex justify-between font-semibold text-white text-base">
                    <span>{t('totalPrice')}</span>
                    <span>€{pricing.totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Book Button */}
              {(() => {
                // Sin fechas: invita a seleccionar
                if (!startDate || !endDate) return (
                  <div className="space-y-2">
                    <Button
                      className="w-full bg-zinc-700 hover:bg-zinc-600 text-zinc-300 font-semibold h-12 cursor-default"
                      disabled
                    >
                      <CalendarIcon className="w-4 h-4 mr-2 opacity-60" />
                      Selecciona las fechas
                    </Button>
                    {!isAuthed && (
                      <p className="text-center text-xs text-zinc-500">
                        ¿Primera vez?{' '}
                        <button
                          className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
                          onClick={() => base44.auth.redirectToLogin(window.location.href)}
                        >
                          Regístrate gratis
                        </button>
                      </p>
                    )}
                  </div>
                );

                // Con fechas pero slots pendientes
                if (canBook === false && (deliverySlot === null || returnSlot === null)) return (
                  <Button
                    className="w-full bg-zinc-700 hover:bg-zinc-600 text-zinc-300 font-semibold h-12 cursor-default"
                    disabled
                  >
                    <Clock className="w-4 h-4 mr-2 opacity-60" />
                    Elige un horario de entrega
                  </Button>
                );

                // Listo para reservar
                return (
                  <div className="space-y-2">
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-12"
                      disabled={isBooking}
                      onClick={handleBooking}
                    >
                      {isBooking
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('loading')}</>
                        : t('bookNow')
                      }
                    </Button>
                    {!isAuthed && (
                      <p className="text-center text-xs text-zinc-500">
                        ¿Primera vez?{' '}
                        <button
                          className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
                          onClick={() => base44.auth.redirectToLogin(window.location.href)}
                        >
                          Regístrate gratis
                        </button>{' '}
                        · Solo 2 minutos
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Trust Features */}
              <div className="space-y-3 pt-4">
                <div className="flex items-center gap-3 text-sm text-zinc-400">
                  <CreditCard className="w-5 h-5 text-green-500" />
                  <span>{t('escrowPayment')}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-zinc-400">
                  <ShieldCheck className="w-5 h-5 text-blue-500" />
                  <span>{t('insuranceIncluded')}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-zinc-400">
                  <CheckCircle className="w-5 h-5 text-amber-500" />
                  <span>{t('idVerified')}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}