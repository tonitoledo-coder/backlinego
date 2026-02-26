export const translations = {
  es: {
    // Navigation
    home: 'Inicio',
    explore: 'Explorar',
    map: 'Mapa',
    myEquipment: 'Mi Equipo',
    bookings: 'Reservas',
    partners: 'Partners Pro',
    profile: 'Perfil',
    
    // Categories
    categories: 'Categorías',
    cuerdas: 'Cuerdas',
    teclados: 'Teclados',
    percusion: 'Percusión',
    dj_gear: 'DJ Gear',
    sonido_pa: 'Sonido P.A.',
    
    // SOS Mode
    sosMode: 'Modo SOS 24h',
    sosDescription: 'Equipo disponible para entrega inmediata',
    sosRadius: 'Radio de 20km',
    urgentDelivery: 'Entrega Urgente',
    
    // Equipment
    addEquipment: 'Añadir Equipo',
    editEquipment: 'Editar Equipo',
    equipment: 'Equipo',
    pricePerDay: 'Precio/día',
    deposit: 'Fianza',
    condition: 'Estado',
    available: 'Disponible',
    rented: 'Alquilado',
    specifications: 'Especificaciones',
    history: 'Historia del objeto',
    
    // Booking
    bookNow: 'Reservar Ahora',
    startDate: 'Fecha inicio',
    endDate: 'Fecha fin',
    totalDays: 'Días totales',
    basePrice: 'Precio base',
    insuranceFee: 'Seguro (8%)',
    totalPrice: 'Precio total',
    confirmBooking: 'Confirmar Reserva',
    scanQR: 'Escanear QR',
    deliveryConfirmed: 'Entrega Confirmada',
    
    // Trust & Security
    verified: 'Verificado',
    idVerified: 'ID Verificado',
    escrowPayment: 'Pago Seguro Escrow',
    insuranceIncluded: 'Seguro Incluido',
    
    // Partners
    proPartners: 'Partners Profesionales',
    visitWebsite: 'Visitar Web',
    sosService: 'Servicio SOS 24h',
    
    // User
    login: 'Iniciar Sesión',
    logout: 'Cerrar Sesión',
    welcome: 'Bienvenido',
    
    // Onboarding
    getStarted: 'Comenzar',
    uploadPhotos: 'Subir Fotos',
    setPrice: 'Establecer Precio',
    goLive: '¡Publicar!',
    onboardingTitle: 'Publica tu equipo en 2 minutos',
    onboardingStep1: 'Sube fotos de tu equipo',
    onboardingStep2: 'Añade detalles y precio',
    onboardingStep3: '¡Listo para alquilar!',
    
    // General
    search: 'Buscar',
    filter: 'Filtrar',
    sortBy: 'Ordenar por',
    nearYou: 'Cerca de ti',
    reviews: 'reseñas',
    perDay: '/día',
    viewAll: 'Ver todo',
    loading: 'Cargando...',
    noResults: 'Sin resultados',
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    edit: 'Editar',
    back: 'Volver',
    next: 'Siguiente',
    finish: 'Finalizar',
    
    // Map
    yourLocation: 'Tu ubicación',
    particular: 'Particular',
    professional: 'Profesional',
    
    // Hero
    heroTitle: 'Alquila equipo musical y audiovisual cerca de ti',
    heroSubtitle: 'Conectamos músicos y profesionales. Alquiler seguro con pago escrow y seguro incluido.',
  },
  en: {
    // Navigation
    home: 'Home',
    explore: 'Explore',
    map: 'Map',
    myEquipment: 'My Equipment',
    bookings: 'Bookings',
    partners: 'Pro Partners',
    profile: 'Profile',
    
    // Categories
    categories: 'Categories',
    cuerdas: 'Strings',
    teclados: 'Keyboards',
    percusion: 'Percussion',
    dj_gear: 'DJ Gear',
    sonido_pa: 'P.A. Sound',
    
    // SOS Mode
    sosMode: 'SOS Mode 24h',
    sosDescription: 'Equipment available for immediate delivery',
    sosRadius: '20km radius',
    urgentDelivery: 'Urgent Delivery',
    
    // Equipment
    addEquipment: 'Add Equipment',
    editEquipment: 'Edit Equipment',
    equipment: 'Equipment',
    pricePerDay: 'Price/day',
    deposit: 'Deposit',
    condition: 'Condition',
    available: 'Available',
    rented: 'Rented',
    specifications: 'Specifications',
    history: 'Object History',
    
    // Booking
    bookNow: 'Book Now',
    startDate: 'Start date',
    endDate: 'End date',
    totalDays: 'Total days',
    basePrice: 'Base price',
    insuranceFee: 'Insurance (8%)',
    totalPrice: 'Total price',
    confirmBooking: 'Confirm Booking',
    scanQR: 'Scan QR',
    deliveryConfirmed: 'Delivery Confirmed',
    
    // Trust & Security
    verified: 'Verified',
    idVerified: 'ID Verified',
    escrowPayment: 'Secure Escrow Payment',
    insuranceIncluded: 'Insurance Included',
    
    // Partners
    proPartners: 'Professional Partners',
    visitWebsite: 'Visit Website',
    sosService: 'SOS 24h Service',
    
    // User
    login: 'Login',
    logout: 'Logout',
    welcome: 'Welcome',
    
    // Onboarding
    getStarted: 'Get Started',
    uploadPhotos: 'Upload Photos',
    setPrice: 'Set Price',
    goLive: 'Go Live!',
    onboardingTitle: 'List your equipment in 2 minutes',
    onboardingStep1: 'Upload photos of your equipment',
    onboardingStep2: 'Add details and pricing',
    onboardingStep3: 'Ready to rent!',
    
    // General
    search: 'Search',
    filter: 'Filter',
    sortBy: 'Sort by',
    nearYou: 'Near you',
    reviews: 'reviews',
    perDay: '/day',
    viewAll: 'View all',
    loading: 'Loading...',
    noResults: 'No results',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    back: 'Back',
    next: 'Next',
    finish: 'Finish',
    
    // Map
    yourLocation: 'Your location',
    particular: 'Individual',
    professional: 'Professional',
    
    // Hero
    heroTitle: 'Rent musical & audiovisual equipment near you',
    heroSubtitle: 'Connecting musicians and professionals. Secure rental with escrow payment and insurance included.',
  }
};

export const getLanguage = () => {
  const browserLang = navigator.language?.slice(0, 2) || 'es';
  return ['es', 'en'].includes(browserLang) ? browserLang : 'es';
};

export const useTranslation = () => {
  const lang = getLanguage();
  return {
    t: (key) => translations[lang][key] || translations['es'][key] || key,
    lang
  };
};