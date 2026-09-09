import { useMemo, type KeyboardEvent, type RefObject } from 'react';
import { Barcode, Minus, Plus, PlusCircle } from 'lucide-react';
import { TopologyMarker } from '@codexsun/devkit-ito';
import { TypeaheadDropUp, type AutocompleteOption } from './TypeaheadDropUp';
import type { Pos1ManualEntrySectionProps } from './types';
import type { CustomMenuItem } from '../mastersStore';

function focusAndSelect(ref: RefObject<HTMLInputElement | null>) {
  ref.current?.focus();
  ref.current?.select();
}

export function Pos1ManualEntrySection({
  topology,
  itemCode,
  itemName,
  quantity,
  menuItems,
  onChangeItemCode,
  onChangeQuantity,
  onApplyItem,
  onAddToOrder,
  codeInputRef,
  quantityInputRef,
}: Pos1ManualEntrySectionProps) {
  const codeOptions: AutocompleteOption<CustomMenuItem>[] = useMemo(
    () => menuItems.map((item) => ({
      id: item.code,
      label: item.code,
      sublabel: item.name,
      badge: item.category,
      data: item,
    })),
    [menuItems]
  );

  function handleCodeEnter() {
    const item = menuItems.find((candidate) => candidate.code.toLowerCase() === itemCode.trim().toLowerCase());
    if (item) {
      onApplyItem(item);
      focusAndSelect(quantityInputRef);
    }
  }

  function handleQuantityKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    onAddToOrder();
    requestAnimationFrame(() => focusAndSelect(codeInputRef));
  }

  function addAndFocusCode() {
    onAddToOrder();
    requestAnimationFrame(() => focusAndSelect(codeInputRef));
  }

  return (
    <div
      className="ito-region shrink-0 border-t border-border bg-accent p-3 shadow-sm print:hidden dark:bg-card"
      {...topology.regionProps('q12.4')}
    >
      <TopologyMarker id="q12.4" topology={topology} />
      <div className="flex items-stretch gap-3">
        <section className="min-h-16 min-w-0 flex-1 rounded-xl border border-border bg-background/60" aria-label="Reserved waiting list area" />

        <section className="w-[410px] shrink-0 rounded-xl border border-border bg-background p-2.5 lg:w-[440px]" aria-label="Fast item entry">
          <div className="grid grid-cols-[minmax(0,1fr)_7rem_auto] items-end gap-2">
            <div className="min-w-0">
              <p className="mb-1 min-h-4 truncate px-1 text-xs font-semibold text-foreground">
                {itemName || 'Enter item code'}
              </p>
              <TypeaheadDropUp<CustomMenuItem>
                inputRef={codeInputRef}
                label="Item code"
                value={itemCode}
                options={codeOptions}
                inputClassName="font-mono"
                onChange={onChangeItemCode}
                onSelect={(option) => {
                  onApplyItem(option.data);
                  focusAndSelect(quantityInputRef);
                }}
                onEnter={handleCodeEnter}
                minWidth="w-72"
                shortcut="F3"
                icon={<Barcode className="size-4 shrink-0 text-muted-foreground" />}
              />
            </div>

            <div>
              <p className="mb-1 px-1 text-xs font-medium text-muted-foreground">Qty</p>
              <div className="flex h-10 items-center justify-between gap-1 rounded-xl border border-border bg-background px-1.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => onChangeQuantity(String(Math.max(1, (parseInt(quantity, 10) || 1) - 1)))}
                  className="grid size-6 cursor-pointer place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Decrease quantity"
                >
                  <Minus size={12} />
                </button>
                <input
                  ref={quantityInputRef}
                  type="text"
                  inputMode="decimal"
                  aria-label="Order quantity"
                  value={quantity}
                  onChange={(event) => onChangeQuantity(event.target.value)}
                  onFocus={(event) => event.currentTarget.select()}
                  onKeyDown={handleQuantityKey}
                  className="w-8 bg-transparent text-center text-xs font-bold outline-none"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => onChangeQuantity(String((parseInt(quantity, 10) || 1) + 1))}
                  className="grid size-6 cursor-pointer place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Increase quantity"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={addAndFocusCode}
              className="flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-md transition-all hover:bg-blue-700 active:scale-[0.98]"
            >
              <PlusCircle size={16} />
              <span>Add</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
