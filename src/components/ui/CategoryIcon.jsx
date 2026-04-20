import React from 'react';
import { Guitar, Piano, Drum, Disc3, Speaker, Mic2 } from 'lucide-react';

const icons = {
  cuerdas: Guitar,
  teclados: Piano,
  percusion: Drum,
  dj_gear: Disc3,
  sonido_pa: Speaker,
  estudio_podcast: Mic2,
};

export default function CategoryIcon({ category, className = "w-5 h-5" }) {
  const Icon = icons[category] || Guitar;
  return <Icon className={className} />;
}