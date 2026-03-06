import React, { useState, useMemo } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { format, differenceInDays, addDays, parseISO, isWithinInterval, eachDayOfInterval } from 'date-fns';
import { calcBookingPrice } from '@/components/booking/calcBookingPrice';
import { es, enUS } from 'date-fns/locale';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { createNotification } from '@/components/notifications/createNotification';
import PaymentModal from '@/components/booking/PaymentModal';
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
        <Button variant="outline" className="w-full border-zinc-700 text-zinc-300 mt-2" onClick={onClose}>Cerrar</Button>
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
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [isBooking, setIsBooking] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [rangeWarning, setRangeWarning] = useState('');
  const [accessModal, setAccessModal] = useState(null); // null | 'login' | 'pending' | 'complete_profile'

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

  const days = startDate && endDate ? differenceInDays(endDate, startDate) + 1 : 0;
  const basePrice = days * (equipment?.price_per_day || 0);
  const insuranceFee = basePrice * 0.08;
  const totalPrice = basePrice + insuranceFee;

  const minRentalDays = equipment?.min_rental_days || 1;
  const maxRentalDays = equipment?.max_rental_days || 30;
  const advanceNoticeDays = equipment?.advance_notice_days || 0;
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
    setRangeWarning('');
  };

  const handleEndDateSelect = (date) => {
    setEndDate(date);
    setRangeWarning('');
    if (date && startDate) {
      const selectedDays = differenceInDays(date, startDate) + 1;
      if (selectedDays < minRentalDays) {
        setRangeWarning(`Mínimo ${minRentalDays} día${minRentalDays > 1 ? 's' : ''} de alquiler`);
      } else if (selectedDays > maxRentalDays) {
        setRangeWarning(`Máximo ${maxRentalDays} días de alquiler`);
      }
    }
  };

  const canBook = startDate && endDate && days >= minRentalDays && days <= maxRentalDays && !rangeWarning;

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
          body: `${format(startDate, 'dd MMM')} → ${format(endDate, 'dd MMM')} · €${totalPrice.toFixed(0)}`,
          link_page: 'Profile',
        });
      }
      await bookingMutation.mutateAsync({
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
        is_sos: equipment.sos_available
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
                  <span className="text-3xl font-bold text-white">€{equipment.price_per_day}</span>
                  <span className="text-zinc-500 ml-1">{t('perDay')}</span>
                </div>
                {equipment.deposit > 0 && (
                  <span className="text-sm text-zinc-500">{t('deposit')}: €{equipment.deposit}</span>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Date Selection */}
              <div className="grid grid-cols-2 gap-3">
                <Popover>
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
                    />
                  </PopoverContent>
                </Popover>
                
                <Popover>
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
                      onSelect={handleEndDateSelect}
                      disabled={disabledEnd}
                      locale={dateLocale}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Calendar legend */}
              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />Disponible</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />No disponible</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />Seleccionado</span>
              </div>

              {rangeWarning && (
                <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  {rangeWarning}
                </p>
              )}

              {/* Price Breakdown */}
              {days > 0 && (
                <div className="bg-zinc-800/50 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between text-zinc-400">
                    <span>€{equipment.price_per_day} × {days} {days === 1 ? 'día' : 'días'}</span>
                    <span>€{basePrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-blue-500" />
                      {t('insuranceFee')}
                    </span>
                    <span>€{insuranceFee.toFixed(2)}</span>
                  </div>
                  <Separator className="bg-zinc-700" />
                  <div className="flex justify-between text-white font-semibold text-lg">
                    <span>{t('totalPrice')}</span>
                    <span>€{totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Book Button */}
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-12"
                disabled={!canBook || isBooking}
                onClick={handleBooking}
              >
                {isBooking ? t('loading') : t('bookNow')}
              </Button>

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