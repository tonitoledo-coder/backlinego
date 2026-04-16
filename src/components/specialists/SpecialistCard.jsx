import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, Star, CheckCircle, Wrench, Clock, Home } from 'lucide-react';

const specialtyLabels = {
  luthier_cuerda: 'Luthier de Cuerda',
  tecnico_valvulas: 'Técnico Válvulas',
  reparacion_dj: 'Reparación DJ',
  mantenimiento_pianos: 'Pianos'
};

const specialtyColors = {
  luthier_cuerda: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  tecnico_valvulas: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  reparacion_dj: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  mantenimiento_pianos: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
};

export default function SpecialistCard({ specialist, onRequestQuote }) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800 hover:border-purple-500/50 transition-all duration-300 overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {specialist.logo_url ? (
            <img
              src={specialist.logo_url}
              alt={specialist.name}
              className="w-16 h-16 rounded-xl object-cover bg-zinc-800"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center flex-shrink-0">
              <Wrench className="w-7 h-7 text-white" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-white truncate">{specialist.name}</h3>
              {specialist.verified && (
                <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
              )}
            </div>

            {specialist.rating && (
              <div className="flex items-center gap-1 mb-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-sm text-white">{specialist.rating.toFixed(1)}</span>
                <span className="text-sm text-zinc-500">({specialist.reviews_count} reseñas)</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-3">
              <Badge className={`border ${specialtyColors[specialist.specialty]}`}>
                {specialtyLabels[specialist.specialty]}
              </Badge>
              {specialist.workshop && (
                <Badge className="bg-zinc-700/50 text-zinc-300 border-zinc-600">
                  <Home className="w-3 h-3 mr-1" /> Taller físico
                </Badge>
              )}
              {specialist.remote_service && (
                <Badge className="bg-zinc-700/50 text-zinc-300 border-zinc-600">
                  A domicilio
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3 text-sm text-zinc-500">
              {specialist.location?.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {specialist.location.city}
                </span>
              )}
              {specialist.avg_response_hours && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  ~{specialist.avg_response_hours}h respuesta
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          {specialist.phone && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              onClick={() => window.open(`tel:${specialist.phone}`)}
            >
              <Phone className="w-4 h-4 mr-2" />
              Llamar
            </Button>
          )}
          <Button
            size="sm"
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            onClick={() => onRequestQuote(specialist)}
          >
            <Wrench className="w-4 h-4 mr-2" />
            Pedir Presupuesto
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}