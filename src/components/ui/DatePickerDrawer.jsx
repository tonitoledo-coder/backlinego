import React from 'react';
import { Drawer } from 'vaul';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

/**
 * A date picker that uses a bottom-sheet Drawer on mobile and
 * a Popover-style inline calendar on desktop.
 *
 * Props:
 *  - value: Date | null
 *  - onChange: (date: Date) => void
 *  - label: string  (e.g. "Desde" / "Hasta")
 *  - disabled: (date: Date) => boolean
 *  - open: boolean
 *  - onOpenChange: (open: boolean) => void
 */
export default function DatePickerDrawer({ value, onChange, label, disabled, open, onOpenChange }) {
  const displayLabel = value ? format(value, 'dd MMM') : label;

  const trigger = (
    <button
      type="button"
      onClick={() => onOpenChange(true)}
      className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
    >
      <CalendarIcon className="w-3.5 h-3.5" />
      {displayLabel}
    </button>
  );

  return (
    <>
      {/* Mobile: Vaul Drawer bottom sheet */}
      <div className="sm:hidden">
        <Drawer.Root open={open} onOpenChange={onOpenChange}>
          <Drawer.Trigger asChild>{trigger}</Drawer.Trigger>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/60" />
            <Drawer.Content
              className="fixed bottom-0 left-0 right-0 z-[61] rounded-t-2xl outline-none"
              style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-zinc-600" />
              </div>
              <div className="px-4 pb-2">
                <p className="text-center text-sm font-semibold text-zinc-300 mb-2">{label}</p>
              </div>
              <div className="flex justify-center pb-8">
                <Calendar
                  mode="single"
                  selected={value}
                  onSelect={(d) => { onChange(d); onOpenChange(false); }}
                  disabled={disabled}
                  className="text-white"
                />
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </div>

      {/* Desktop: inline trigger + absolute calendar panel */}
      <div className="hidden sm:block relative">
        {trigger}
        {open && (
          <>
            {/* Click-away overlay */}
            <div className="fixed inset-0 z-40" onClick={() => onOpenChange(false)} />
            <div
              className="absolute top-full left-0 mt-1 z-50 rounded-xl border border-zinc-700 shadow-2xl"
              style={{ background: '#18181b' }}
            >
              <Calendar
                mode="single"
                selected={value}
                onSelect={(d) => { onChange(d); onOpenChange(false); }}
                disabled={disabled}
                className="text-white"
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}