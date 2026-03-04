import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { X, Plus } from 'lucide-react';

const GENRES = ['Rock', 'Pop', 'Jazz', 'Clásica', 'Flamenco', 'Electrónica', 'Hip-Hop', 'R&B', 'Folk', 'Metal', 'Punk', 'Reggae', 'Blues', 'Country', 'Indie', 'Ambient', 'Techno', 'House'];
const INSTRUMENTS = ['Guitarra', 'Bajo', 'Batería', 'Piano', 'Violín', 'Violonchelo', 'Trompeta', 'Saxofón', 'Flauta', 'Voz', 'Teclados', 'DJ / Controladores', 'Percusión'];
const ART_STYLES = ['Pintura', 'Escultura', 'Fotografía', 'Ilustración', 'Arte digital', 'Instalación', 'Performance', 'Grabado', 'Cerámica', 'Diseño'];
const EVENT_TYPES = ['Festivales', 'Conciertos', 'Clubes nocturnos', 'Bodas', 'Corporativos', 'Teatro', 'Exposiciones'];
const MANAGEMENT = ['Artistas musicales', 'Actores', 'Modelos', 'Deportistas', 'Influencers', 'Bandas'];
const COLLECTION_INTERESTS = ['Guitarras vintage', 'Sintetizadores', 'Amplificadores', 'Discos de vinilo', 'Partituras', 'Instrumentos étnicos', 'Equipos de estudio'];

function MultiSelect({ options, selected = [], onChange, color = '#a78bfa' }) {
  const toggle = (opt) => {
    onChange(selected.includes(opt) ? selected.filter(o => o !== opt) : [...selected, opt]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const active = selected.includes(opt);
        return (
          <button key={opt} type="button" onClick={() => toggle(opt)}
            className="px-3 py-1 rounded-full text-xs font-medium border transition-all"
            style={{
              borderColor: active ? color : 'rgba(255,255,255,0.1)',
              background: active ? `${color}20` : '#161625',
              color: active ? color : '#71717a',
            }}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function TagInput({ tags = [], onChange }) {
  const [input, setInput] = useState('');
  const add = () => {
    const val = input.trim().toLowerCase();
    if (val && !tags.includes(val)) onChange([...tags, val]);
    setInput('');
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Añadir etiqueta y pulsar Enter"
          className="text-white border-zinc-700 text-sm" style={{ background: '#161625' }} />
        <button type="button" onClick={add}
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa' }}>
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag, i) => (
          <span key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs"
            style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa' }}>
            {tag}
            <button onClick={() => onChange(tags.filter((_, idx) => idx !== i))}>
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function StepProfessional({ formData, updateField }) {
  const type = formData.user_type || 'musico';
  const tags = formData.professional_tags || [];

  // Parse tags into genres/instruments subsets for musico
  const updateTagSubset = (subset, current, newVals) => {
    const otherTags = tags.filter(t => !current.includes(t));
    updateField('professional_tags', [...otherTags, ...newVals]);
  };

  const genreTags = tags.filter(t => GENRES.map(g => g.toLowerCase()).includes(t.toLowerCase()));
  const instrumentTags = tags.filter(t => INSTRUMENTS.map(i => i.toLowerCase()).includes(t.toLowerCase()));
  const artTags = tags.filter(t => ART_STYLES.map(a => a.toLowerCase()).includes(t.toLowerCase()));

  return (
    <div className="space-y-6 pt-4">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Perfil profesional</h2>
        <p className="text-zinc-400 text-sm">Cuéntanos más sobre tu actividad.</p>
      </div>

      {/* Musico */}
      {type === 'musico' && (
        <>
          <div>
            <Label className="text-zinc-300 text-sm mb-2 block">Géneros musicales</Label>
            <MultiSelect options={GENRES} selected={genreTags}
              onChange={v => updateTagSubset('genres', genreTags, v)} />
          </div>
          <div>
            <Label className="text-zinc-300 text-sm mb-2 block">Instrumentos</Label>
            <MultiSelect options={INSTRUMENTS} selected={instrumentTags}
              onChange={v => updateTagSubset('instruments', instrumentTags, v)} />
          </div>
          <div>
            <Label className="text-zinc-300 text-sm">Enlace a Spotify / Bandcamp / SoundCloud</Label>
            <Input value={formData.portfolio_url || ''} onChange={e => updateField('portfolio_url', e.target.value)}
              placeholder="https://open.spotify.com/artist/..." className="mt-1.5 text-white border-zinc-700" style={{ background: '#161625' }} />
          </div>
        </>
      )}

      {/* Artista */}
      {type === 'artista' && (
        <>
          <div>
            <Label className="text-zinc-300 text-sm mb-2 block">Estilos artísticos</Label>
            <MultiSelect options={ART_STYLES} selected={artTags}
              onChange={v => updateTagSubset('art', artTags, v)} color="#f472b6" />
          </div>
          <div>
            <Label className="text-zinc-300 text-sm">Portfolio o web</Label>
            <Input value={formData.portfolio_url || ''} onChange={e => updateField('portfolio_url', e.target.value)}
              placeholder="https://miweb.com/portfolio" className="mt-1.5 text-white border-zinc-700" style={{ background: '#161625' }} />
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl border"
            style={{ background: 'rgba(167,139,250,0.07)', borderColor: 'rgba(167,139,250,0.2)' }}>
            <div>
              <p className="text-white text-sm font-medium">Acepto encargos</p>
              <p className="text-xs text-zinc-500">Muestra en tu perfil que estás disponible para proyectos</p>
            </div>
            <Switch checked={formData.commission_open || false} onCheckedChange={v => updateField('commission_open', v)} />
          </div>
        </>
      )}

      {/* Promotor */}
      {type === 'promotor' && (
        <>
          <div>
            <Label className="text-zinc-300 text-sm">Nombre del venue o empresa</Label>
            <Input value={formData.agency_or_company_name || ''} onChange={e => updateField('agency_or_company_name', e.target.value)}
              placeholder="Sala Razzmatazz" className="mt-1.5 text-white border-zinc-700" style={{ background: '#161625' }} />
          </div>
          <div>
            <Label className="text-zinc-300 text-sm mb-2 block">Tipo de eventos</Label>
            <MultiSelect options={EVENT_TYPES} selected={tags.filter(t => EVENT_TYPES.map(e => e.toLowerCase()).includes(t.toLowerCase()))}
              onChange={v => { const other = tags.filter(t => !EVENT_TYPES.map(e => e.toLowerCase()).includes(t.toLowerCase())); updateField('professional_tags', [...other, ...v]); }}
              color="#34d399" />
          </div>
        </>
      )}

      {/* Manager */}
      {type === 'manager' && (
        <>
          <div>
            <Label className="text-zinc-300 text-sm">Nombre de la agencia</Label>
            <Input value={formData.agency_or_company_name || ''} onChange={e => updateField('agency_or_company_name', e.target.value)}
              placeholder="Management XYZ" className="mt-1.5 text-white border-zinc-700" style={{ background: '#161625' }} />
          </div>
          <div>
            <Label className="text-zinc-300 text-sm mb-2 block">Especialidades de gestión</Label>
            <MultiSelect options={MANAGEMENT} selected={tags.filter(t => MANAGEMENT.map(m => m.toLowerCase()).includes(t.toLowerCase()))}
              onChange={v => { const other = tags.filter(t => !MANAGEMENT.map(m => m.toLowerCase()).includes(t.toLowerCase())); updateField('professional_tags', [...other, ...v]); }}
              color="#fbbf24" />
          </div>
        </>
      )}

      {/* Empresa */}
      {type === 'empresa' && (
        <>
          <div>
            <Label className="text-zinc-300 text-sm">Nombre de la empresa</Label>
            <Input value={formData.agency_or_company_name || ''} onChange={e => updateField('agency_or_company_name', e.target.value)}
              placeholder="Mi Empresa S.L." className="mt-1.5 text-white border-zinc-700" style={{ background: '#161625' }} />
          </div>
          <div>
            <Label className="text-zinc-300 text-sm">CIF / NIF</Label>
            <Input value={formData.tax_id || ''} onChange={e => updateField('tax_id', e.target.value)}
              placeholder="B12345678" className="mt-1.5 text-white border-zinc-700" style={{ background: '#161625' }} />
          </div>
        </>
      )}

      {/* Coleccionista */}
      {type === 'coleccionista' && (
        <div>
          <Label className="text-zinc-300 text-sm mb-2 block">Intereses de colección</Label>
          <MultiSelect options={COLLECTION_INTERESTS}
            selected={tags.filter(t => COLLECTION_INTERESTS.map(c => c.toLowerCase()).includes(t.toLowerCase()))}
            onChange={v => { const other = tags.filter(t => !COLLECTION_INTERESTS.map(c => c.toLowerCase()).includes(t.toLowerCase())); updateField('professional_tags', [...other, ...v]); }}
            color="#fb923c" />
        </div>
      )}

      {/* Free tags for all */}
      <div>
        <Label className="text-zinc-300 text-sm mb-2 block">Etiquetas libres</Label>
        <TagInput tags={tags.filter(t => {
          const all = [...GENRES, ...INSTRUMENTS, ...ART_STYLES, ...EVENT_TYPES, ...MANAGEMENT, ...COLLECTION_INTERESTS];
          return !all.map(a => a.toLowerCase()).includes(t.toLowerCase());
        })}
          onChange={freeTags => {
            const all = [...GENRES, ...INSTRUMENTS, ...ART_STYLES, ...EVENT_TYPES, ...MANAGEMENT, ...COLLECTION_INTERESTS];
            const structured = tags.filter(t => all.map(a => a.toLowerCase()).includes(t.toLowerCase()));
            updateField('professional_tags', [...structured, ...freeTags]);
          }} />
      </div>
    </div>
  );
}