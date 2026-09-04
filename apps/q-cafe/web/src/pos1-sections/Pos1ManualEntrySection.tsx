import { useMemo, useRef, type KeyboardEvent } from 'react';
import { Armchair, Barcode, Minus, Plus, PlusCircle, Users } from 'lucide-react';
import { TopologyMarker } from '@codexsun/devkit-ito';
import { money } from '../api';
import { TypeaheadDropUp, type AutocompleteOption } from './TypeaheadDropUp';
import type { Pos1ManualEntrySectionProps } from './types';
import type { CustomMenuItem } from '../mastersStore';

function focusAndSelect(ref: React.RefObject<HTMLInputElement | null>) {
  ref.current?.focus();
  ref.current?.select();
}

export function Pos1ManualEntrySection({
  topology,
  tableName,
  chair,
  itemCode,
  itemName,
  quantity,
  rate,
  tableConfigs,
  menuItems,
  tableChairCount,
  onSelectTable,
  onSelectChair,
  onChangeItemCode,
  onChangeItemName,
  onChangeQuantity,
  onChangeRate,
  onApplyItem,
  onAddToOrder,
  formatChair,
  tableInputRef,
  chairInputRef,
  codeInputRef,
  nameInputRef,
  quantityInputRef,
  rateInputRef,
}: Pos1ManualEntrySectionProps) {
  // Internal refs if not provided from parent
  const internalTableInput = useRef<HTMLInputElement>(null);
  const internalChairInput = useRef<HTMLInputElement>(null);
  const internalCodeInput = useRef<HTMLInputElement>(null);
  const internalNameInput = useRef<HTMLInputElement>(null);
  const internalQuantityInput = useRef<HTMLInputElement>(null);
  const internalRateInput = useRef<HTMLInputElement>(null);

  const tableInput = tableInputRef ?? internalTableInput;
  const chairInput = chairInputRef ?? internalChairInput;
  const codeInput = codeInputRef ?? internalCodeInput;
  const nameInput = nameInputRef ?? internalNameInput;
  const quantityInput = quantityInputRef ?? internalQuantityInput;
  const rateInput = rateInputRef ?? internalRateInput;

  const inputs = [tableInput, chairInput, codeInput, nameInput, quantityInput, rateInput] as const;
  const escapeState = useRef({ index: -1, armed: false });

  // Autocomplete Options
  const tableOptions: AutocompleteOption<string>[] = useMemo(() => {
    return tableConfigs.map((t) => ({
      id: t.tableNo,
      label: t.tableNo,
      sublabel:
        t.type === 'parcel'
          ? 'Takeaway order'
          : `Table ${t.tableNo} (${t.chairCount} seats)`,
      badge: t.type === 'parcel' ? 'Parcel' : `${t.chairCount} Seats`,
      data: t.tableNo,
    }));
  }, [tableConfigs]);

  const chairOptions: AutocompleteOption<number>[] = useMemo(() => {
    return Array.from({ length: tableChairCount }, (_, idx) => {
      const num = idx + 1;
      return {
        id: num,
        label: formatChair(tableName, num),
        sublabel: `Chair ${num}`,
        data: num,
      };
    });
  }, [tableName, tableChairCount, formatChair]);

  const codeOptions: AutocompleteOption<CustomMenuItem>[] = useMemo(() => {
    return menuItems.map((item) => ({
      id: item.id,
      label: item.code,
      sublabel: item.name,
      badge: item.category,
      meta: money(item.price),
      data: item,
    }));
  }, [menuItems]);

  const nameOptions: AutocompleteOption<CustomMenuItem>[] = useMemo(() => {
    return menuItems.map((item) => ({
      id: item.id,
      label: item.name,
      sublabel: item.code,
      badge: item.category,
      meta: money(item.price),
      data: item,
    }));
  }, [menuItems]);

  function handleEscape(index: number) {
    if (escapeState.current.armed && escapeState.current.index === index) {
      const previous = Math.max(0, index - 1);
      escapeState.current = { index: previous, armed: false };
      focusAndSelect(inputs[previous]!);
    } else {
      escapeState.current = { index, armed: true };
      inputs[index]?.current?.select();
    }
  }

  function handleTableEnter() {
    const clean = tableName.trim().toLowerCase();
    const match = tableOptions.find(
      (opt) => opt.label.toLowerCase() === clean || String(opt.id).toLowerCase() === clean
    );
    if (match) {
      onSelectTable(match.data);
    }
    focusAndSelect(chairInput);
  }

  function handleChairEnter() {
    const clean = chair.trim().toLowerCase();
    const match = chairOptions.find(
      (opt) =>
        opt.label.toLowerCase() === clean ||
        String(opt.data) === clean ||
        `chair ${opt.data}` === clean
    );
    if (match) {
      onSelectChair(String(match.data));
    }
    focusAndSelect(codeInput);
  }

  function handleCodeEnter() {
    const item = menuItems.find(
      (candidate) => candidate.code.toLowerCase() === itemCode.trim().toLowerCase()
    );
    if (item) {
      onApplyItem(item);
      focusAndSelect(quantityInput);
    } else if (itemCode.trim()) {
      focusAndSelect(nameInput);
    } else {
      focusAndSelect(codeInput);
    }
  }

  function handleNameEnter() {
    const item = menuItems.find(
      (candidate) => candidate.name.toLowerCase() === itemName.trim().toLowerCase()
    );
    if (item) {
      onApplyItem(item);
    }
    if (!itemName.trim()) {
      focusAndSelect(nameInput);
      return;
    }
    focusAndSelect(quantityInput);
  }

  function handleQuantityKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleEscape(4);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      focusAndSelect(rateInput);
    }
  }

  function handleRateKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleEscape(5);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      onAddToOrder();
      requestAnimationFrame(() => focusAndSelect(codeInput));
    }
  }

  return (
    <div
      className="ito-region shrink-0 border-t border-border bg-accent dark:bg-card p-3 shadow-sm z-20 print:hidden"
      {...topology.regionProps('q12.4')}
    >
      <TopologyMarker id="q12.4" topology={topology} />
      <div className="flex flex-wrap items-start justify-between gap-3 max-w-full">
        {/* Table Field */}
        <div className="w-36 shrink-0">
          <TypeaheadDropUp<string>
            inputRef={tableInput}
            label="Table"
            value={tableName}
            options={tableOptions}
            onChange={onSelectTable}
            onSelect={(opt) => {
              onSelectTable(opt.data);
              focusAndSelect(chairInput);
            }}
            onEnter={handleTableEnter}
            onEscape={() => handleEscape(0)}
            minWidth="w-48"
            showChevron
            shortcut="F3"
            icon={<Armchair className="size-4 text-muted-foreground shrink-0" />}
          />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium mt-0.5 px-1">
            <span>Table</span>
            <kbd className="font-mono text-[9px] font-semibold bg-muted text-muted-foreground px-1 py-0.2 rounded border border-border select-none">
              F3
            </kbd>
          </div>
        </div>

        {/* Guests / Chair Field */}
        <div className="w-28 shrink-0">
          <TypeaheadDropUp<number>
            inputRef={chairInput}
            label="Guests"
            value={formatChair(tableName, chair)}
            options={chairOptions}
            centerText
            onChange={(val) => {
              let num: number | null = null;
              if (val.includes('.')) {
                const parts = val.split('.');
                const lastPart = parts[parts.length - 1]?.replace(/\D/g, '');
                if (lastPart) num = parseInt(lastPart, 10);
              } else {
                const clean = val.replace(/\D/g, '');
                if (clean) num = parseInt(clean, 10);
              }
              if (num !== null && !isNaN(num) && num >= 1 && num <= tableChairCount) {
                onSelectChair(String(num));
              }
            }}
            onSelect={(opt) => {
              onSelectChair(String(opt.data));
              focusAndSelect(codeInput);
            }}
            onEnter={handleChairEnter}
            onEscape={() => handleEscape(1)}
            minWidth="w-36"
            showChevron
            icon={<Users className="size-4 text-muted-foreground shrink-0" />}
          />
          <span className="text-[10px] text-muted-foreground font-medium block mt-0.5 px-1 text-center">
            Guests
          </span>
        </div>

        {/* Item Code Field */}
        <div className="w-36 shrink-0">
          <TypeaheadDropUp<CustomMenuItem>
            inputRef={codeInput}
            label="Item Code"
            value={itemCode}
            options={codeOptions}
            inputClassName="font-mono"
            onChange={onChangeItemCode}
            onSelect={(opt) => {
              onApplyItem(opt.data);
              focusAndSelect(quantityInput);
            }}
            onEnter={handleCodeEnter}
            onEscape={() => handleEscape(2)}
            minWidth="w-72"
            shortcut="F6"
            icon={<Barcode className="size-4 text-muted-foreground shrink-0" />}
          />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium mt-0.5 px-1">
            <span>Item Code</span>
            <kbd className="font-mono text-[9px] font-semibold bg-muted text-muted-foreground px-1 py-0.2 rounded border border-border select-none">
              F6
            </kbd>
          </div>
        </div>

        {/* Item Name Field */}
        <div className="flex-1 min-w-44">
          <TypeaheadDropUp<CustomMenuItem>
            inputRef={nameInput}
            label="Item Name"
            value={itemName}
            options={nameOptions}
            onChange={onChangeItemName}
            onSelect={(opt) => {
              onApplyItem(opt.data);
              focusAndSelect(quantityInput);
            }}
            onEnter={handleNameEnter}
            onEscape={() => handleEscape(3)}
            minWidth="w-full max-w-md"
          />
          <span className="text-[10px] text-muted-foreground font-medium block mt-0.5 px-1">
            Item Name
          </span>
        </div>

        {/* Quantity Field */}
        <div className="w-28 shrink-0 flex flex-col">
          <div className="flex h-10 items-center justify-between rounded-xl border border-border bg-background px-1.5 gap-1 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
            <button
              type="button"
              onClick={() => {
                const cur = Math.max(1, (parseInt(quantity, 10) || 1) - 1);
                onChangeQuantity(String(cur));
              }}
              className="grid size-6 place-items-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Decrease quantity"
            >
              <Minus size={12} />
            </button>
            <input
              ref={quantityInput}
              type="text"
              inputMode="decimal"
              aria-label="Order Quantity"
              value={quantity}
              onChange={(e) => onChangeQuantity(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              onKeyDown={handleQuantityKey}
              className="w-10 text-center font-bold text-xs bg-transparent outline-none"
            />
            <button
              type="button"
              onClick={() => {
                const cur = (parseInt(quantity, 10) || 1) + 1;
                onChangeQuantity(String(cur));
              }}
              className="grid size-6 place-items-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Increase quantity"
            >
              <Plus size={12} />
            </button>
          </div>
          <span className="text-[10px] text-muted-foreground font-medium block mt-0.5 px-1 text-center">
            Quantity
          </span>
        </div>

        {/* Price / Rate Field */}
        <div className="w-28 shrink-0 flex flex-col">
          <div className="flex h-10 items-center rounded-xl border border-border bg-background px-2.5 font-semibold text-xs text-foreground focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
            <span className="text-muted-foreground mr-1 text-xs">₹</span>
            <input
              ref={rateInput}
              type="text"
              inputMode="decimal"
              aria-label="Item Rate"
              value={rate}
              onChange={(e) => onChangeRate(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              onKeyDown={handleRateKey}
              className="w-full bg-transparent font-semibold text-xs outline-none"
            />
          </div>
          <span className="text-[10px] text-muted-foreground font-medium block mt-0.5 px-1">
            Price
          </span>
        </div>

        {/* Add to Order Button */}
        <div className="shrink-0 flex flex-col">
          <button
            type="button"
            onClick={() => {
              onAddToOrder();
              requestAnimationFrame(() => focusAndSelect(codeInput));
            }}
            className="flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 text-xs font-semibold shadow-md transition-all active:scale-[0.98]"
          >
            <PlusCircle size={16} />
            <span>Add to Order</span>
            <kbd className="font-mono text-[10px] font-semibold bg-blue-700 text-white/90 px-1.5 py-0.5 rounded ml-1 select-none">
              Enter
            </kbd>
          </button>
          <span className="text-[10px] opacity-0 select-none block mt-0.5 pointer-events-none" aria-hidden="true">
            &nbsp;
          </span>
        </div>
      </div>
    </div>
  );
}
