import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  Armchair,
  Check,
  Coffee,
  Edit3,
  Filter,
  FolderCheck,
  Image as ImageIcon,
  LayoutGrid,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Table2,
  Trash2,
  Upload,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { Button } from '@codexsun/ui/components/ui/button';
import { TopologyMarker, type InterfaceTopologyController } from '@codexsun/devkit-ito';
import { money, type Snapshot } from './api';
import { field } from './Workspaces';
import {
  deleteCustomMenuItem,
  getMergedMenu,
  getMergedTables,
  PRESET_FOOD_IMAGES,
  saveCustomMenuItem,
  saveTableConfig,
  DEMO_10_ITEMS,
  getImageStorageSettings,
  installDemoItemsAndImages,
  type CustomMenuItem,
  type TableMasterConfig,
} from './mastersStore';

type Props = {
  data?: Snapshot;
  topology: InterfaceTopologyController;
  navigate?: (page: string) => void;
};

export function Masters({ data, topology, navigate }: Props) {
  const [activeTab, setActiveTab] = useState<'items' | 'tables'>('items');
  const [menuItems, setMenuItems] = useState<CustomMenuItem[]>(() => getMergedMenu(data?.menu));
  const [tables, setTables] = useState<TableMasterConfig[]>(() => getMergedTables(data?.restaurant_tables));

  useEffect(() => {
    const handleMenuUpdate = () => setMenuItems(getMergedMenu(data?.menu));
    const handleTablesUpdate = () => setTables(getMergedTables(data?.restaurant_tables));

    window.addEventListener('q-cafe-menu-updated', handleMenuUpdate);
    window.addEventListener('q-cafe-tables-updated', handleTablesUpdate);
    return () => {
      window.removeEventListener('q-cafe-menu-updated', handleMenuUpdate);
      window.removeEventListener('q-cafe-tables-updated', handleTablesUpdate);
    };
  }, [data?.menu, data?.restaurant_tables]);

  return (
    <div className="space-y-6" {...topology.regionProps('q8')}>
      <TopologyMarker id="q8" topology={topology} />

      {/* Top Header & Tabs Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <UtensilsCrossed size={20} />
            </span>
            Restaurant Masters
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your menu item catalog with photos and visual table seating configurations.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center rounded-xl border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('items')}
            className={`flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === 'items'
                ? 'bg-card text-foreground shadow-xs border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Coffee size={15} />
            <span>Item Master</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                activeTab === 'items'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {menuItems.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tables')}
            className={`flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === 'tables'
                ? 'bg-card text-foreground shadow-xs border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Armchair size={15} />
            <span>Table Master</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                activeTab === 'tables'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {tables.length}
            </span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'items' ? (
        <ItemMasterSection menuItems={menuItems} onRefresh={() => setMenuItems(getMergedMenu(data?.menu))} />
      ) : (
        <TableMasterSection tables={tables} onRefresh={() => setTables(getMergedTables(data?.restaurant_tables))} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. ITEM MASTER SECTION
// ---------------------------------------------------------------------------
function ItemMasterSection({
  menuItems,
  onRefresh,
}: {
  menuItems: CustomMenuItem[];
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<CustomMenuItem | null>(null);
  const [storageSettings, setStorageSettings] = useState(() => getImageStorageSettings());
  const [demoNotice, setDemoNotice] = useState('');

  // Form states
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Beverages');
  const [formPrice, setFormPrice] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formError, setFormError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleSettingsUpdate = () => {
      setStorageSettings(getImageStorageSettings());
    };
    window.addEventListener('q-cafe-settings-updated', handleSettingsUpdate);
    return () => window.removeEventListener('q-cafe-settings-updated', handleSettingsUpdate);
  }, []);

  function handleInstall10Demo() {
    const res = installDemoItemsAndImages();
    setDemoNotice(`Installed ${res.count} demo items with offline images!`);
    onRefresh();
    setTimeout(() => setDemoNotice(''), 4000);
  }

  const categories = useMemo(() => {
    const set = new Set(menuItems.map((i) => i.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menuItems.filter((item) => {
      const matchesQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
      return matchesQuery && matchesCategory;
    });
  }, [menuItems, search, categoryFilter]);

  function suggestNextCode() {
    const nums = menuItems
      .map((i) => {
        const m = i.code.match(/\d+/);
        return m ? parseInt(m[0], 10) : 0;
      })
      .filter(Boolean);
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `ITM-${String(max + 1).padStart(3, '0')}`;
  }

  function openAddForm() {
    setEditingItem(null);
    setFormCode(suggestNextCode());
    setFormName('');
    setFormCategory('Beverages');
    setFormPrice('');
    setFormImage('');
    setFormError('');
    setShowForm(true);
  }

  function openEditForm(item: CustomMenuItem) {
    setEditingItem(item);
    setFormCode(item.code);
    setFormName(item.name);
    setFormCategory(item.category || 'Beverages');
    setFormPrice(String(item.price / 100));
    setFormImage(item.image || '');
    setFormError('');
    setShowForm(true);
  }

  function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file.');
      return;
    }
    if (storageSettings.imageWriteProtection && editingItem?.image) {
      if (!window.confirm('Write protection is active in Settings. Do you want to proceed and overwrite the current image for this item?')) {
        event.target.value = '';
        return;
      }
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const img = new Image();
        img.onload = () => {
          const maxDim = 400;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.82);
            setFormImage(compressed);
          } else {
            setFormImage(reader.result as string);
          }
        };
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!formCode.trim()) {
      setFormError('Item code is required.');
      return;
    }
    if (!formName.trim()) {
      setFormError('Item name is required.');
      return;
    }
    const parsedRate = parseFloat(formPrice.trim());
    if (isNaN(parsedRate) || parsedRate <= 0) {
      setFormError('Please enter a valid rate in ₹.');
      return;
    }

    const priceInPaise = Math.round(parsedRate * 100);
    const id = editingItem?.id ?? Date.now();

    const result = saveCustomMenuItem(
      {
        id,
        code: formCode.trim().toUpperCase(),
        name: formName.trim(),
        category: formCategory.trim() || 'General',
        price: priceInPaise,
        image: formImage || undefined,
        isCustom: true,
      },
      { bypassWriteProtection: true }
    );

    if (!result.success && result.error) {
      setFormError(result.error);
      return;
    }

    setShowForm(false);
    onRefresh();
  }

  function handleDelete(item: CustomMenuItem) {
    if (window.confirm(`Delete item "${item.name}" (${item.code})?`)) {
      const result = deleteCustomMenuItem(item.code);
      if (!result.success && result.error) {
        alert(result.error);
        return;
      }
      onRefresh();
    }
  }

  return (
    <div className="space-y-5">
      {/* Image Storage Folder & Write Protection Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <FolderCheck size={15} className="text-primary" />
            Image Storage Folder:
          </span>
          <code className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground border border-border">
            {storageSettings.imageFolderPath}
          </code>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              storageSettings.imageWriteProtection
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {storageSettings.imageWriteProtection ? 'Write Protected (Locked)' : 'Writable (Read/Write)'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {demoNotice && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              ✓ {demoNotice}
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={handleInstall10Demo}
            className="cursor-pointer gap-1.5 text-xs h-8 px-3 border-primary/30 text-primary hover:bg-primary/5 font-semibold"
            title="Populate catalog with 10 bundled offline demo food items and images"
          >
            <Sparkles size={13} />
            <span>Install 10 Demo Items</span>
          </Button>
        </div>
      </div>

      {/* Action Strip: Search, Filters, Stats & Add Button */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-xl border border-border bg-card p-3 shadow-2xs">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              className={`${field} w-full pl-9 pr-3 text-xs`}
              placeholder="Search code, name, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  categoryFilter === cat
                    ? 'border border-primary bg-primary/10 text-primary'
                    : 'border border-transparent bg-muted/40 text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            onClick={openAddForm}
            className="inline-flex cursor-pointer items-center gap-1.5"
          >
            <Plus size={16} />
            <span>Add Item</span>
          </Button>
        </div>
      </div>

      {/* Add / Edit Drawer Modal or Card */}
      {showForm && (
        <div className="rounded-2xl border border-primary/30 bg-card p-5 shadow-lg animate-in fade-in-0 zoom-in-98 duration-150">
          <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
                  {editingItem ? <Edit3 size={16} /> : <Plus size={16} />}
                </span>
                {editingItem ? `Edit Item (${editingItem.code})` : 'Add New Menu Item'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Set item code, name, category, price, and upload an enticing photo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Item Code */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Item Code <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  className={`${field} w-full font-mono text-xs uppercase font-semibold`}
                  placeholder="e.g. ITM-009"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  required
                />
              </div>

              {/* Item Name */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Item Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  className={`${field} w-full text-xs font-medium`}
                  placeholder="e.g. Blueberry Muffin"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Price / Rate (₹) <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={`${field} w-full pl-7 text-xs font-bold`}
                    placeholder="120.00"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Category <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  list="category-suggestions"
                  className={`${field} w-full text-xs`}
                  placeholder="e.g. Bakery, Beverages"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  required
                />
                <datalist id="category-suggestions">
                  <option value="Beverages" />
                  <option value="Kitchen" />
                  <option value="Bakery" />
                  <option value="Food" />
                  <option value="Dessert" />
                  <option value="Snacks" />
                </datalist>
              </div>

              {/* Image Upload Area */}
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Item Image (Upload File or Select Preset)
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  {/* Image Preview / Fallback Box */}
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/40 shadow-xs">
                    {formImage ? (
                      <img src={formImage} alt="Preview" className="size-full object-cover" />
                    ) : (
                      <div className="grid size-full place-items-center text-muted-foreground/60">
                        <ImageIcon size={22} />
                      </div>
                    )}
                    {formImage && (
                      <button
                        type="button"
                        onClick={() => setFormImage('')}
                        title="Remove image"
                        className="absolute right-0.5 top-0.5 grid size-5 cursor-pointer place-items-center rounded-full bg-black/60 text-white hover:bg-destructive"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer gap-1.5 text-xs h-9"
                  >
                    <Upload size={14} />
                    <span>Upload photo</span>
                  </Button>

                  <span className="text-xs text-muted-foreground">or select a bundled demo photo:</span>

                  {/* Preset quick buttons */}
                  <div className="flex flex-wrap items-center gap-1 max-w-lg">
                    {DEMO_10_ITEMS.map((demo) => (
                      <button
                        key={demo.code}
                        type="button"
                        onClick={() => setFormImage(demo.image)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground hover:border-primary hover:bg-accent hover:text-foreground"
                      >
                        <Sparkles size={10} className="text-primary" />
                        {demo.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                className="cursor-pointer text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" className="cursor-pointer text-xs">
                {editingItem ? 'Save Changes' : 'Create Item'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Items Grid Catalog */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
        {filteredItems.map((item) => (
          <div
            key={item.code}
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-2xs transition-all hover:border-primary/50 hover:shadow-md"
          >
            <div>
              {/* Item Image */}
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted/40 border border-border mb-3">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="grid size-full place-items-center bg-linear-to-br from-primary/5 to-primary/15 text-primary">
                    <Coffee size={32} />
                  </div>
                )}
                <span className="absolute top-2 left-2 rounded-md bg-black/65 px-2 py-0.5 font-mono text-[10px] font-bold text-white backdrop-blur-xs">
                  {item.code}
                </span>
                <span className="absolute top-2 right-2 rounded-md bg-card/85 border border-border px-2 py-0.5 text-[10px] font-semibold text-foreground backdrop-blur-xs">
                  {item.category}
                </span>
              </div>

              {/* Title and details */}
              <h4 className="font-semibold text-sm text-foreground truncate" title={item.name}>
                {item.name}
              </h4>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">Code: {item.code}</p>
            </div>

            {/* Price and Actions */}
            <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5">
              <span className="text-base font-bold text-primary">{money(item.price)}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => openEditForm(item)}
                  title="Edit item & image"
                  className="grid size-7 cursor-pointer place-items-center rounded-md border border-border bg-muted/40 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <Edit3 size={13} />
                </button>
                {item.isCustom && (
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    title="Delete item"
                    className="grid size-7 cursor-pointer place-items-center rounded-md border border-border bg-muted/40 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="col-span-full py-16 text-center text-muted-foreground rounded-2xl border border-dashed border-border p-8">
            <Coffee size={36} className="mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm font-semibold">No items found matching your criteria.</p>
            <p className="text-xs text-muted-foreground mt-1">Try another search or click &quot;Add Item&quot; to create one.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. TABLE MASTER SECTION (Visual Tables & Seating Diagrams)
// ---------------------------------------------------------------------------
function TableMasterSection({
  tables,
  onRefresh,
}: {
  tables: TableMasterConfig[];
  onRefresh: () => void;
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTableNo, setNewTableNo] = useState('');
  const [newChairCount, setNewChairCount] = useState('4');

  const totalSeats = useMemo(() => {
    return tables.reduce((sum, t) => sum + (t.chairCount || 4), 0);
  }, [tables]);

  function handleChairChange(tableNo: string, delta: number) {
    const table = tables.find((t) => t.tableNo === tableNo);
    if (!table) return;
    const nextCount = Math.max(1, Math.min(12, table.chairCount + delta));
    saveTableConfig(tableNo, { chairCount: nextCount });
    onRefresh();
  }

  function handleAddTable(event: FormEvent) {
    event.preventDefault();
    if (!newTableNo.trim()) return;
    const count = parseInt(newChairCount, 10) || 4;
    saveTableConfig(newTableNo.trim().toUpperCase(), {
      tableNo: newTableNo.trim().toUpperCase(),
      chairCount: count,
      type: 'dine-in',
      shape: count > 4 ? 'rectangle' : 'square',
      isActive: true,
    });
    setNewTableNo('');
    setNewChairCount('4');
    setShowAddModal(false);
    onRefresh();
  }

  return (
    <div className="space-y-5">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Tables</span>
          <p className="text-2xl font-bold text-foreground mt-1">{tables.length}</p>
          <span className="text-xs text-muted-foreground">12 Dine-in + 1 Parcel</span>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Seating Capacity</span>
          <p className="text-2xl font-bold text-primary mt-1">{totalSeats} Chairs</p>
          <span className="text-xs text-muted-foreground">Dynamic seats across all tables</span>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-2xs">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add New Table</span>
            <p className="text-xs text-muted-foreground mt-1">Configure additional tables & seating</p>
          </div>
          <Button type="button" onClick={() => setShowAddModal(true)} className="cursor-pointer gap-1.5">
            <Plus size={16} />
            <span>Add Table</span>
          </Button>
        </div>
      </div>

      {/* Add Table Modal */}
      {showAddModal && (
        <div className="rounded-2xl border border-primary/30 bg-card p-5 shadow-lg animate-in fade-in-0 zoom-in-98 duration-150">
          <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Table2 size={18} className="text-primary" />
              Add Restaurant Table
            </h3>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleAddTable} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Table Number / Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  className={`${field} w-full font-mono text-xs font-semibold uppercase`}
                  placeholder="e.g. T13, OUTDOOR-1"
                  value={newTableNo}
                  onChange={(e) => setNewTableNo(e.target.value.toUpperCase())}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Chair Count (Seats) <span className="text-destructive">*</span>
                </label>
                <select
                  className={`${field} w-full text-xs font-semibold`}
                  value={newChairCount}
                  onChange={(e) => setNewChairCount(e.target.value)}
                >
                  {[2, 3, 4, 5, 6, 8, 10, 12].map((cnt) => (
                    <option key={cnt} value={cnt}>
                      {cnt} Chairs / Seats
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Table</Button>
            </div>
          </form>
        </div>
      )}

      {/* Visual Floor Plan Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
        {tables.map((table) => (
          <TableVisualCard
            key={table.tableNo}
            table={table}
            onChairDelta={(delta) => handleChairChange(table.tableNo, delta)}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. TABLE VISUAL CARD (Interactive Seating Diagram)
// ---------------------------------------------------------------------------
function TableVisualCard({
  table,
  onChairDelta,
}: {
  table: TableMasterConfig;
  onChairDelta: (delta: number) => void;
}) {
  const isParcel = table.tableNo.toLowerCase() === 'parcel';
  const tableNum = parseInt(table.tableNo.replace(/\D/g, '') || '0', 10);
  const chairCount = table.chairCount || 4;

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-2xs transition-all hover:border-primary/40 hover:shadow-md">
      <div>
        {/* Table Header */}
        <div className="flex items-center justify-between border-b border-border pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-primary/10 font-mono text-xs font-bold text-primary">
              {table.tableNo}
            </span>
            <span className="font-semibold text-sm text-foreground">
              {isParcel ? 'Takeaway Parcel' : `Table ${tableNum || table.tableNo}`}
            </span>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              isParcel
                ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
            }`}
          >
            {isParcel ? 'Takeaway' : 'Dine-in'}
          </span>
        </div>

        {/* Visual Seating Diagram */}
        <div className="my-2 flex flex-col items-center justify-center p-3 bg-muted/25 rounded-xl border border-border/50">
          <div className="relative flex flex-col items-center justify-center min-w-[130px] min-h-[110px]">
            {/* Top Chairs */}
            <div className="flex items-center gap-2 mb-1.5">
              {Array.from({ length: Math.ceil(chairCount / (chairCount > 4 ? 3 : 2)) }, (_, idx) => (
                <span
                  key={`top-${idx}`}
                  className="grid size-6 place-items-center rounded-md border border-border bg-card text-[10px] font-mono font-bold text-muted-foreground shadow-xs"
                  title={`Seat ${idx + 1}`}
                >
                  {isParcel ? `P.${idx + 1}` : `${tableNum}.${idx + 1}`}
                </span>
              ))}
            </div>

            {/* Middle: Dining Table Shape */}
            <div
              className={`grid place-items-center rounded-xl border-2 border-primary/40 bg-card p-3 shadow-xs ${
                isParcel ? 'w-24 h-16 rounded-full' : chairCount > 4 ? 'w-28 h-14' : 'size-20'
              }`}
            >
              <div className="text-center">
                <span className="font-mono text-xs font-bold text-foreground block">{table.tableNo}</span>
                <span className="text-[10px] text-muted-foreground font-semibold">
                  {chairCount} {chairCount === 1 ? 'chair' : 'chairs'}
                </span>
              </div>
            </div>

            {/* Bottom Chairs */}
            <div className="flex items-center gap-2 mt-1.5">
              {Array.from({ length: Math.floor(chairCount / (chairCount > 4 ? 3 : 2)) }, (_, idx) => {
                const seatNo = Math.ceil(chairCount / (chairCount > 4 ? 3 : 2)) + idx + 1;
                return (
                  <span
                    key={`bot-${idx}`}
                    className="grid size-6 place-items-center rounded-md border border-border bg-card text-[10px] font-mono font-bold text-muted-foreground shadow-xs"
                    title={`Seat ${seatNo}`}
                  >
                    {isParcel ? `P.${seatNo}` : `${tableNum}.${seatNo}`}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Chair Count Controls */}
      <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
        <span className="text-xs text-muted-foreground font-medium">Chair capacity:</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onChairDelta(-1)}
            disabled={chairCount <= 1}
            title="Decrease chairs"
            className="grid size-7 cursor-pointer place-items-center rounded-md border border-border bg-muted/40 font-bold text-xs text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
          >
            -
          </button>
          <span className="min-w-8 text-center font-mono text-xs font-bold text-foreground">
            {chairCount}
          </span>
          <button
            type="button"
            onClick={() => onChairDelta(1)}
            disabled={chairCount >= 12}
            title="Increase chairs"
            className="grid size-7 cursor-pointer place-items-center rounded-md border border-border bg-muted/40 font-bold text-xs text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
