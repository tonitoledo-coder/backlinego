"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { Drawer } from "vaul"

import { cn } from "@/lib/utils"

// Detect mobile (touch) device
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobile(window.matchMedia('(max-width: 1023px)').matches);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

// ─── Context to pass items from SelectContent down to MobileDrawer ───────────
const SelectContext = React.createContext(null);

// ─── Radix-based Select for desktop ──────────────────────────────────────────
const Select = ({ children, value, onValueChange, defaultValue, ...props }) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <MobileSelect value={value} onValueChange={onValueChange} defaultValue={defaultValue} {...props}>
        {children}
      </MobileSelect>
    );
  }

  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} defaultValue={defaultValue} {...props}>
      {children}
    </SelectPrimitive.Root>
  );
};

// ─── Mobile Select using Drawer ───────────────────────────────────────────────
function MobileSelect({ children, value, onValueChange, defaultValue, disabled, ...props }) {
  const [open, setOpen] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? '');

  const controlled = value !== undefined;
  const currentValue = controlled ? value : internalValue;

  // Collect items from SelectContent → SelectItem children
  const [items, setItems] = React.useState([]);
  const [triggerLabel, setTriggerLabel] = React.useState(null);
  const [placeholder, setPlaceholder] = React.useState('');

  const handleSelect = (val, label) => {
    if (!controlled) setInternalValue(val);
    onValueChange?.(val);
    setOpen(false);
  };

  return (
    <SelectContext.Provider value={{ currentValue, open, setOpen, items, setItems, handleSelect, placeholder, setPlaceholder, triggerLabel, setTriggerLabel, isMobile: true }}>
      {children}
      <Drawer.Root open={open} onOpenChange={setOpen} snapPoints={[0.45, 0.7]} fadeFromIndex={0}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/60" onClick={() => setOpen(false)} />
          <Drawer.Content
            className="fixed bottom-0 left-0 right-0 z-[61] flex flex-col rounded-t-2xl bg-zinc-900 border-t border-zinc-700 outline-none"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-zinc-600" />
            </div>
            {/* Options list */}
            <div className="overflow-y-auto overscroll-contain px-2 py-2 max-h-[60vh]">
              {items.map((item) => (
                <button
                  key={item.value}
                  disabled={item.disabled}
                  onClick={() => !item.disabled && handleSelect(item.value, item.label)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm transition-colors",
                    item.disabled
                      ? "opacity-40 cursor-not-allowed text-zinc-500"
                      : "text-zinc-100 active:bg-zinc-700",
                    currentValue === item.value
                      ? "bg-zinc-700/60 text-white font-medium"
                      : "hover:bg-zinc-800"
                  )}
                >
                  <span>{item.label}</span>
                  {currentValue === item.value && <Check className="w-4 h-4 text-green-400 shrink-0" />}
                </button>
              ))}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </SelectContext.Provider>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────
const SelectGroup = SelectPrimitive.Group;
const SelectValue = React.forwardRef(({ placeholder, children, ...props }, ref) => {
  const ctx = React.useContext(SelectContext);
  // Must call hooks unconditionally before any early return
  React.useEffect(() => {
    if (ctx?.isMobile) ctx.setPlaceholder?.(placeholder || '');
  }, [placeholder, ctx?.isMobile]);
  if (ctx?.isMobile) return null;
  return <SelectPrimitive.Value ref={ref} placeholder={placeholder} {...props}>{children}</SelectPrimitive.Value>;
});
SelectValue.displayName = 'SelectValue';

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => {
  const ctx = React.useContext(SelectContext);

  if (ctx?.isMobile) {
    // Find the label for current value
    const currentItem = ctx.items.find(i => i.value === ctx.currentValue);
    const displayLabel = currentItem ? currentItem.label : ctx.placeholder || '';

    return (
      <button
        ref={ref}
        type="button"
        onClick={() => ctx.setOpen(true)}
        className={cn(
          "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          !currentItem && "text-muted-foreground",
          className
        )}
        {...props}
      >
        <span className="line-clamp-1">{displayLabel}</span>
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
      </button>
    );
  }

  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        className
      )}
      {...props}>
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
});
SelectTrigger.displayName = 'SelectTrigger';

const SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => {
  const ctx = React.useContext(SelectContext);

  // On mobile: harvest items from children and store in context — render nothing visible
  React.useEffect(() => {
    if (!ctx?.isMobile) return;
    const collected = [];
    const traverse = (nodes) => {
      React.Children.forEach(nodes, (child) => {
        if (!child) return;
        if (child.type === SelectItem || (child.type && child.type.displayName === 'SelectItem')) {
          collected.push({
            value: child.props.value,
            label: typeof child.props.children === 'string' ? child.props.children : child.props.value,
            disabled: child.props.disabled || false,
          });
        } else if (child.props?.children) {
          traverse(child.props.children);
        }
      });
    };
    traverse(children);
    ctx.setItems(collected);
  }, [children, ctx?.isMobile]);

  if (ctx?.isMobile) return null;

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border border-zinc-700 bg-zinc-900 text-zinc-100 shadow-xl shadow-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        {...props}>
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn("p-1", position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]")}>
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
});
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef(({ className, ...props }, ref) => {
  const ctx = React.useContext(SelectContext);
  if (ctx?.isMobile) return null;
  return (
    <SelectPrimitive.Label
      ref={ref}
      className={cn("px-2 py-1.5 text-sm font-semibold", className)}
      {...props} />
  );
});
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef(({ className, children, ...props }, ref) => {
  const ctx = React.useContext(SelectContext);
  if (ctx?.isMobile) return null; // items rendered by MobileSelect drawer

  return (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm text-zinc-100 outline-none focus:bg-zinc-700 focus:text-white data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}>
      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
});
SelectItem.displayName = 'SelectItem';

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => {
  const ctx = React.useContext(SelectContext);
  if (ctx?.isMobile) return null;
  return (
    <SelectPrimitive.Separator
      ref={ref}
      className={cn("-mx-1 my-1 h-px bg-muted", className)}
      {...props} />
  );
});
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}