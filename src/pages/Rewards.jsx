import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Star, Zap, Trophy, Shield, Gift, ArrowRight, Crown,
  Package, Calendar, MessageSquare, TrendingUp, CheckCircle
} from 'lucide-react';

const LEVELS = {
  bronze:   { label: 'Bronce',   min: 0,    max: 500,  color: 'from-amber-700 to-amber-600',  textColor: 'text-amber-600', discount: 0,  priority: false },
  silver:   { label: 'Plata',    min: 500,  max: 1500, color: 'from-zinc-400 to-zinc-300',    textColor: 'text-zinc-300',  discount: 5,  priority: false },
  gold:     { label: 'Oro',      min: 1500, max: 3500, color: 'from-yellow-500 to-amber-400', textColor: 'text-yellow-400', discount: 10, priority: true  },
  platinum: { label: 'Platinum', min: 3500, max: 9999, color: 'from-blue-400 to-cyan-300',   textColor: 'text-cyan-300',  discount: 15, priority: true  },
};

const PARTNER_BADGES = {
  none:          { label: '', icon: null },
  rising_star:   { label: 'Rising Star',    icon: Star,   color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' },
  top_lender:    { label: 'Top Lender',     icon: Package, color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
  community_hero:{ label: 'Community Hero', icon: Trophy, color: 'text-purple-400 bg-purple-400/10 border-purple-400/30' },
};

const HOW_TO_EARN = [
  { icon: Calendar, label: 'Reserva confirmada',  points: '+50 pts', color: 'text-green-400' },
  { icon: Package,  label: 'Publicar equipo',      points: '+30 pts', color: 'text-blue-400' },
  { icon: Star,     label: 'Dejar una reseña',     points: '+20 pts', color: 'text-yellow-400' },
  { icon: MessageSquare, label: 'Solicitar presupuesto', points: '+10 pts', color: 'text-purple-400' },
];

export default function Rewards() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    (async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) { base44.auth.redirectToLogin(); return; }
        setUser(await base44.auth.me());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const { data: pointsData } = useQuery({
    queryKey: ['userpoints', user?.email],
    queryFn: async () => {
      const records = await base44.entities.UserPoints.filter({ user_email: user.email }, '-created_date', 1);
      if (records.length > 0) return records[0];
      // Auto-create record on first visit
      return base44.entities.UserPoints.create({ user_email: user.email, total_points: 0, level: 'bronze' });
    },
    enabled: !!user?.email,
  });

  if (loading || !pointsData) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 animate-pulse space-y-4">
        <div className="h-40 rounded-2xl bg-zinc-800/50" />
        <div className="h-32 rounded-2xl bg-zinc-800/50" />
        <div className="h-48 rounded-2xl bg-zinc-800/50" />
      </div>
    );
  }

  const level = LEVELS[pointsData.level] || LEVELS.bronze;
  const nextLevelKey = Object.keys(LEVELS).find(k => LEVELS[k].min > pointsData.total_points);
  const nextLevel = nextLevelKey ? LEVELS[nextLevelKey] : null;
  const progressPct = nextLevel
    ? Math.min(100, ((pointsData.total_points - level.min) / (nextLevel.min - level.min)) * 100)
    : 100;
  const badge = PARTNER_BADGES[pointsData.partner_badge] || PARTNER_BADGES.none;

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-6 py-8 space-y-6">
      {/* Header Level Card */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${level.color} p-0.5`}>
        <div className="rounded-2xl bg-zinc-950 p-6 lg:p-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-zinc-400 text-sm mb-1">Tu nivel</p>
              <h1 className={`text-3xl font-bold ${level.textColor}`}>{level.label}</h1>
            </div>
            <div className="text-right">
              <p className="text-zinc-400 text-sm mb-1">Puntos totales</p>
              <p className="text-4xl font-bold text-white">{pointsData.total_points.toLocaleString()}</p>
            </div>
          </div>

          {nextLevel && (
            <div>
              <div className="flex justify-between text-xs text-zinc-500 mb-1">
                <span>{level.label}</span>
                <span>{nextLevel.label} ({nextLevel.min} pts)</span>
              </div>
              <Progress value={progressPct} className="h-2 bg-zinc-800" />
              <p className="text-xs text-zinc-500 mt-2">
                {nextLevel.min - pointsData.total_points} puntos para el siguiente nivel
              </p>
            </div>
          )}

          {/* Badge */}
          {badge.icon && (
            <div className={`inline-flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full border text-xs font-semibold ${badge.color}`}>
              <badge.icon className="w-3.5 h-3.5" />
              {badge.label}
            </div>
          )}
        </div>
      </div>

      {/* Benefits */}
      <Card className="bg-zinc-900/60 border-zinc-800">
        <CardContent className="p-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-400" />
            Tus beneficios actuales
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-zinc-800">
              <span className="text-zinc-300 text-sm">Descuento en alquileres</span>
              <Badge className={level.discount > 0 ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-zinc-700 text-zinc-400'}>
                {level.discount > 0 ? `-${level.discount}%` : 'Sin descuento'}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-800">
              <span className="text-zinc-300 text-sm">Acceso prioritario a equipo SOS</span>
              <Badge className={level.priority ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-zinc-700 text-zinc-400'}>
                {level.priority ? <><CheckCircle className="w-3 h-3 mr-1 inline" />Activo</> : 'No disponible'}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-zinc-300 text-sm">Insignia de partner destacado</span>
              <Badge className={pointsData.is_partner ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-zinc-700 text-zinc-400'}>
                {pointsData.is_partner ? <><Crown className="w-3 h-3 mr-1 inline" />Partner</> : 'Nivel Oro+'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How to earn */}
      <Card className="bg-zinc-900/60 border-zinc-800">
        <CardContent className="p-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            Cómo ganar puntos
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {HOW_TO_EARN.map(item => (
              <div key={item.label} className="flex items-center gap-3 bg-zinc-800/50 rounded-xl p-3">
                <item.icon className={`w-5 h-5 ${item.color} shrink-0`} />
                <div>
                  <p className="text-sm text-white leading-tight">{item.label}</p>
                  <p className={`text-xs font-bold ${item.color}`}>{item.points}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Level ladder */}
      <Card className="bg-zinc-900/60 border-zinc-800">
        <CardContent className="p-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Niveles de fidelidad
          </h2>
          <div className="space-y-3">
            {Object.entries(LEVELS).map(([key, lvl]) => {
              const isCurrentLevel = key === pointsData.level;
              return (
                <div key={key} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  isCurrentLevel ? 'border-blue-500/50 bg-blue-500/10' : 'border-zinc-800 bg-zinc-800/30'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${lvl.color} flex items-center justify-center`}>
                      <Star className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className={`font-semibold text-sm ${isCurrentLevel ? lvl.textColor : 'text-zinc-300'}`}>
                        {lvl.label}
                        {isCurrentLevel && <span className="ml-2 text-xs text-blue-400">← Tu nivel</span>}
                      </p>
                      <p className="text-xs text-zinc-500">{lvl.min.toLocaleString()}+ puntos</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {lvl.discount > 0 && <p className="text-xs text-green-400 font-semibold">-{lvl.discount}% descuento</p>}
                    {lvl.priority && <p className="text-xs text-blue-400">Prioridad SOS</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <Link to={createPageUrl('Explore')}>
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 p-6 flex items-center justify-between group cursor-pointer hover:from-blue-500 hover:to-blue-600 transition-all">
          <div>
            <p className="text-white font-bold text-lg">¡Empieza a acumular puntos!</p>
            <p className="text-blue-100/80 text-sm">Alquila, publica y deja reseñas para subir de nivel</p>
          </div>
          <ArrowRight className="w-6 h-6 text-white group-hover:translate-x-1 transition-transform" />
        </div>
      </Link>
    </div>
  );
}