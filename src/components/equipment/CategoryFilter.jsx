import React from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '../i18n/translations';
import CategoryIcon from '../ui/CategoryIcon';
import { cn } from '@/lib/utils';

const categories = [
  'cuerdas', 'teclados', 'percusion', 'dj_gear', 'sonido_pa', 'estudio_podcast'
];

export default function CategoryFilter({ selected, onChange }) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <Button
        variant={!selected ? 'default' : 'outline'}
        size="sm"
        onClick={() => onChange(null)}
        className={cn(
          "rounded-full whitespace-nowrap",
          !selected 
            ? "bg-blue-600 hover:bg-blue-700 text-white" 
            : "bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
        )}
      >
        {t('viewAll')}
      </Button>
      
      {categories.map(cat => (
        <Button
          key={cat}
          variant={selected === cat ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(cat)}
          className={cn(
            "rounded-full whitespace-nowrap",
            selected === cat 
              ? "bg-blue-600 hover:bg-blue-700 text-white" 
              : "bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          )}
        >
          <CategoryIcon category={cat} className="w-4 h-4 mr-2" />
          {cat === 'estudio_podcast' ? 'Estudio/Podcast' : t(cat)}
        </Button>
      ))}
    </div>
  );
}