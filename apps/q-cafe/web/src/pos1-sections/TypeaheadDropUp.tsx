import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { ChevronDown } from 'lucide-react';

export type AutocompleteOption<T = unknown> = {
  id: string | number;
  label: string;
  sublabel?: string;
  badge?: string;
  meta?: string;
  data: T;
};

export interface TypeaheadDropUpProps<T> {
  inputRef: RefObject<HTMLInputElement | null>;
  label: string;
  value: string;
  options: AutocompleteOption<T>[];
  onChange: (value: string) => void;
  onSelect: (option: AutocompleteOption<T>) => void;
  onEnter?: () => void;
  onEscape?: () => void;
  onBlur?: () => void;
  autoFocus?: boolean;
  inputMode?: 'text' | 'decimal' | 'numeric';
  className?: string;
  inputClassName?: string;
  align?: 'left' | 'right';
  minWidth?: string;
  placeholder?: string;
  centerText?: boolean;
  icon?: ReactNode;
  showChevron?: boolean;
  shortcut?: string;
}

export function TypeaheadDropUp<T>({
  inputRef,
  label,
  value,
  options,
  onChange,
  onSelect,
  onEnter,
  onEscape,
  onBlur,
  autoFocus,
  inputMode = 'text',
  className = '',
  inputClassName = '',
  align = 'left',
  minWidth,
  placeholder,
  centerText = false,
  icon,
  showChevron = false,
  shortcut,
}: TypeaheadDropUpProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);

  const filteredOptions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options;
    const matches = options.filter((opt) => {
      return (
        opt.label.toLowerCase().includes(q) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(q)) ||
        (opt.badge && opt.badge.toLowerCase().includes(q)) ||
        String(opt.id).toLowerCase().includes(q)
      );
    });
    const exact = options.find(
      (opt) => opt.label.toLowerCase() === q || String(opt.id).toLowerCase() === q
    );
    if (exact && matches.length === 1 && options.length > 1) {
      return options;
    }
    return matches;
  }, [options, value]);

  useEffect(() => {
    if (!isOpen) {
      setActiveIndex(-1);
      return;
    }
    const idx = filteredOptions.findIndex(
      (opt) =>
        opt.label.toLowerCase() === value.trim().toLowerCase() ||
        String(opt.id).toLowerCase() === value.trim().toLowerCase()
    );
    setActiveIndex(idx >= 0 ? idx : filteredOptions.length > 0 ? 0 : -1);
  }, [isOpen, value, filteredOptions]);

  useEffect(() => {
    if (isOpen && activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[activeIndex] as HTMLElement | undefined;
      activeEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [isOpen, activeIndex]);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      if (filteredOptions.length > 0) {
        setActiveIndex((prev) => (prev + 1) % filteredOptions.length);
      }
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      if (filteredOptions.length > 0) {
        setActiveIndex((prev) => (prev <= 0 ? filteredOptions.length - 1 : prev - 1));
      }
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (isOpen && activeIndex >= 0 && filteredOptions[activeIndex]) {
        const selected = filteredOptions[activeIndex]!;
        setIsOpen(false);
        onSelect(selected);
        return;
      }
      if (isOpen && filteredOptions.length > 0) {
        const selected = filteredOptions[0]!;
        setIsOpen(false);
        onSelect(selected);
        return;
      }
      setIsOpen(false);
      onEnter?.();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      if (isOpen) {
        setIsOpen(false);
      } else {
        onEscape?.();
      }
      return;
    }
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex h-10 items-center gap-1.5 rounded-xl border border-border bg-background px-2.5 transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
        {icon}
        <input
          ref={inputRef}
          aria-label={shortcut ? `${label} (${shortcut})` : label}
          title={shortcut ? `${label} (${shortcut})` : undefined}
          aria-expanded={isOpen}
          aria-autocomplete="list"
          autoComplete="off"
          autoFocus={autoFocus}
          className={`w-full min-w-0 bg-transparent text-xs font-semibold outline-none placeholder:text-muted-foreground ${
            centerText ? 'text-center' : ''
          } ${inputClassName}`}
          inputMode={inputMode}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={(e) => {
            e.currentTarget.select();
            setIsOpen(true);
          }}
          onBlur={() => {
            setIsOpen(false);
            onBlur?.();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? label}
          type="text"
          value={value}
        />
        {showChevron && (
          <ChevronDown className="size-3.5 text-muted-foreground shrink-0 pointer-events-none" />
        )}
      </div>

      {isOpen && (
        <div
          className={`absolute bottom-[calc(100%+8px)] z-50 max-h-60 overflow-y-auto scrollbar-slim rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${minWidth ?? 'min-w-full w-max max-w-sm'}`}
        >
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">No matches found</div>
          ) : (
            <ul ref={listRef} className="py-1" role="listbox">
              {filteredOptions.map((opt, idx) => {
                const isSelected = idx === activeIndex;
                const itemData = opt.data as { image?: string; chairCount?: number } | undefined;
                return (
                  <li
                    key={opt.id}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setIsOpen(false);
                      onSelect(opt);
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-xs transition-colors ${
                      isSelected
                        ? 'bg-accent text-accent-foreground font-semibold'
                        : 'hover:bg-accent/50 text-foreground'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {itemData?.image && (
                        <img
                          src={itemData.image}
                          alt=""
                          className="size-6 shrink-0 rounded-md object-cover border border-border"
                        />
                      )}
                      <div className="min-w-0 flex items-baseline gap-1.5 truncate">
                        <span className="font-semibold">{opt.label}</span>
                        {opt.sublabel && (
                          <span className="truncate text-[11px] text-muted-foreground">
                            {opt.sublabel}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {opt.badge && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {opt.badge}
                        </span>
                      )}
                      {opt.meta && (
                        <span className="font-bold text-primary">{opt.meta}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
