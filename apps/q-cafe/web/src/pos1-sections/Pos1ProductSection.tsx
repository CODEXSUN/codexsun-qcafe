import { useState } from 'react';
import { ChevronDown, Utensils } from 'lucide-react';
import { TopologyMarker } from '@codexsun/devkit-ito';
import { money } from '../api';
import type { Pos1ProductSectionProps } from './types';

export function Pos1ProductSection({
  topology,
  items,
  selectedItem,
  onSelectItem,
  selectedCategory,
  onSelectCategory,
  standardCategories,
  moreCategories,
  showMoreCategories,
  onToggleShowMoreCategories,
}: Pos1ProductSectionProps) {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto py-0.5 scrollbar-slim shrink-0">
        {standardCategories.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onSelectCategory(cat)}
              className={`shrink-0 cursor-pointer select-none touch-manipulation rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-150 active:scale-95 ${
                isActive
                  ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-xs'
                  : 'border border-border bg-card text-foreground hover:bg-muted/70'
              }`}
            >
              {cat}
            </button>
          );
        })}

        {moreCategories.length > 0 && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => onToggleShowMoreCategories(!showMoreCategories)}
              className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                !standardCategories.includes(selectedCategory)
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-foreground hover:bg-muted/70'
              }`}
            >
              <span>
                {!standardCategories.includes(selectedCategory) ? selectedCategory : 'More'}
              </span>
              <ChevronDown size={14} />
            </button>

            {showMoreCategories && (
              <div
                className="absolute left-0 top-full mt-1.5 z-30 min-w-36 rounded-xl border border-border bg-popover p-1.5 shadow-xl"
                onClick={() => onToggleShowMoreCategories(false)}
              >
                {moreCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => onSelectCategory(cat)}
                    className={`flex w-full cursor-pointer items-center rounded-lg px-3 py-1.5 text-left text-xs font-medium ${
                      selectedCategory === cat
                        ? 'bg-accent text-accent-foreground font-semibold'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Product Cards Grid */}
      <div
        className="ito-region flex-1 min-h-0 overflow-y-auto pt-2.5 pb-2 px-1 scrollbar-slim"
        {...topology.regionProps('q12.2')}
      >
        <TopologyMarker id="q12.2" topology={topology} />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 auto-rows-fr">
          {items.map((item) => {
            const isSelected = selectedItem?.code === item.code;
            const imageFailed = failedImages[item.code] || !item.image;

            return (
              <div
                key={item.code}
                onClick={() => onSelectItem(item)}
                className={`group relative flex flex-col justify-between rounded-2xl border p-2 bg-card text-left cursor-pointer select-none touch-manipulation transition-all duration-150 hover:shadow-md hover:border-primary/50 active:scale-[0.96] active:translate-y-0.5 ${
                  isSelected
                    ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/40 dark:bg-blue-950/25'
                    : 'border-border/80'
                }`}
              >
                {/* Item Image with Fallback */}
                <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-muted mb-2 shadow-2xs">
                  {!imageFailed ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      onError={() => setFailedImages((prev) => ({ ...prev, [item.code]: true }))}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-muted/60 text-muted-foreground p-2">
                      <Utensils className="size-6 opacity-60 mb-1" />
                      <span className="text-[10px] font-medium text-center line-clamp-1 opacity-75">
                        {item.category || 'Item'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Item Information */}
                <div className="flex flex-col w-full px-0.5">
                  <span
                    className="text-xs font-semibold text-foreground truncate leading-tight"
                    title={item.name}
                  >
                    {item.name}
                  </span>
                  <span className="text-xs font-bold text-foreground/90 mt-0.5">
                    {money(item.price)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {items.length === 0 && (
          <div className="grid place-items-center h-48 text-muted-foreground text-sm">
            No menu items match your search or filter.
          </div>
        )}
      </div>
    </div>
  );
}
