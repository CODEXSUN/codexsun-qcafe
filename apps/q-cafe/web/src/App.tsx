import { useEffect, useState } from 'react';
import { Armchair, Coffee, LayoutDashboard, CookingPot, Package, CalendarDays, ReceiptText, RefreshCw, Menu, PanelLeftClose, PanelLeftOpen, Search, Bell, X, UserRound, Sun, LogOut, Settings as SettingsIcon, UtensilsCrossed, LayoutGrid, TrendingUp } from 'lucide-react';
import { Button } from '@codexsun/ui/components/ui/button';
import { InterfaceTopologyDrawer, TopologyInspectionControl, TopologyMarker } from '@codexsun/devkit-ito';
import { useInterfaceTopologyOverlay } from '@codexsun/devkit-ito/use-interface-topology-overlay';
import { request, signIn, type ActionResult, type CafeUser, type Snapshot } from './api';
import { Dashboard } from './Dashboard';
import { Kitchen, Inventory, Bookings, field } from './Workspaces';
import { Pos } from './Pos';
import { Pos1 } from './Pos1';
import { Overview } from './Overview';
import { Tables } from './Tables';
import { Settings, loadSettings, applyTheme, type CafeSettings } from './Settings';
import { Masters } from './Masters';
import { Login } from './Login';
import { ItoRegion } from './ItoRegion';
import { qCafeTopology } from './topology';
const pages = [
  { name: 'POS', icon: LayoutGrid },
  { name: 'Tables', icon: Armchair },
  { name: 'Overview', icon: TrendingUp },
  { name: 'Kitchen', icon: CookingPot },
  { name: 'Inventory', icon: Package },
  { name: 'Bookings', icon: CalendarDays },
  { name: 'Masters', icon: UtensilsCrossed },
  { name: 'Dashboard', icon: LayoutDashboard },
  { name: 'Settings', icon: SettingsIcon },
];

function loadCachedUser(): CafeUser | null {
  try {
    const raw = sessionStorage.getItem('q-cafe-session-user');
    return raw ? JSON.parse(raw) as CafeUser : null;
  } catch {
    return null;
  }
}

export function App() {
  const [user, setUser] = useState<CafeUser | null>(() => loadCachedUser());
  const [page, setPage] = useState(() => {
    if (user?.access === 'cashier') return 'POS';
    const hash = location.hash.replace('#', '');
    if (hash === 'POS-1' || hash === 'POS') return 'POS';
    if (hash === 'Tables' || hash === 'Guests' || hash === 'Floor') return 'Tables';
    return pages.find(p => `#${p.name}` === location.hash)?.name ?? 'POS';
  });
  const [token, setToken] = useState(() => sessionStorage.getItem('q-cafe-session') ?? '');
  const [data, setData] = useState<Snapshot>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sideCarOpen, setSideCarOpen] = useState(false);
  const [commandPanel, setCommandPanel] = useState<'search' | 'notifications' | 'user' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showItoIcon, setShowItoIcon] = useState(() => loadSettings().showItoIcon);
  const [settings, setSettings] = useState<CafeSettings>(() => loadSettings());
  const topology = useInterfaceTopologyOverlay(qCafeTopology);

  useEffect(() => {
    applyTheme(loadSettings().theme);
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      if (loadSettings().theme === 'system') {
        applyTheme('system');
      }
    };
    media.addEventListener('change', handleMediaChange);
    return () => media.removeEventListener('change', handleMediaChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('hide-ito-icon', !showItoIcon);
  }, [showItoIcon]);

  useEffect(() => {
    const handleSettingsUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<CafeSettings>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
      }
      if (customEvent.detail?.showItoIcon !== undefined) {
        setShowItoIcon(customEvent.detail.showItoIcon);
      }
      if (customEvent.detail?.theme !== undefined) {
        applyTheme(customEvent.detail.theme);
      }
    };
    window.addEventListener('q-cafe-settings-updated', handleSettingsUpdate);
    return () => window.removeEventListener('q-cafe-settings-updated', handleSettingsUpdate);
  }, []);

  function navigate(next: string) {
    const destination = user?.access === 'cashier' ? 'POS' : next;
    location.hash = destination;
    setPage(destination);
  }

  function signOut() {
    sessionStorage.removeItem('q-cafe-session');
    sessionStorage.removeItem('q-cafe-session-user');
    setToken('');
    setUser(null);
    setData(undefined);
    setCommandPanel(null);
  }
  async function refresh() {
    try {
      const snapshot = await request<Snapshot>(token);
      setData(snapshot);
      if (snapshot.user) {
        setUser(snapshot.user);
        sessionStorage.setItem('q-cafe-session-user', JSON.stringify(snapshot.user));
      }
      setError('');
    } catch (error) {
      setError(String(error));
    }
  }
  useEffect(() => { if (token) void refresh(); }, [token]);
  useEffect(() => {
    const handle = () => {
      const hash = location.hash.replace('#', '');
      if (hash === 'POS-1') {
        location.hash = 'POS';
        setPage('POS');
        return;
      }
      if (hash === 'Tables' || hash === 'Guests' || hash === 'Floor') {
        setPage('Tables');
        return;
      }
      setPage(user?.access === 'cashier' ? 'POS' : pages.find(page => `#${page.name}` === location.hash)?.name ?? 'POS');
    };
    window.addEventListener('hashchange', handle);
    return () => window.removeEventListener('hashchange', handle);
  }, [user?.access]);
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.key === 'F12') {
        event.preventDefault();
        signOut();
        return;
      }
      if (user?.access !== 'cashier' && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandPanel('search');
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [user?.access]);
  async function mutate(path: string, body: unknown) { setBusy(true); try { const response = await request<ActionResult<unknown>>(token,path,body); await refresh(); return response.result; } catch (error) { setError(String(error)); return false; } finally { setBusy(false); } }
  if (!data) {
    return (
      <Login
        topology={topology}
        showItoIcon={showItoIcon}
        onSuccess={session => {
          setToken(session.access_token);
          setUser(session.user);
          navigate('POS');
          setError('');
        }}
      />
    );
  }
  const props = { data, busy, mutate };
  const posWorkspace = page === 'POS';

  return <div className="min-h-screen bg-background text-foreground print:min-h-0 print:bg-white print:text-black" {...topology.rootAttributes}><header className="ito-region flex h-14 items-center justify-between border-b border-border bg-white px-3 dark:bg-card [&_button]:cursor-pointer print:hidden" {...topology.regionProps('q2')}><TopologyMarker id="q2" topology={topology}/>    <div className="flex h-full items-center gap-1">{!posWorkspace && <><ItoRegion id="q2.1" topology={topology}><button type="button" onClick={() => setSideCarOpen(open => !open)} aria-label={sideCarOpen ? 'Collapse side car' : 'Expand side car'} title={sideCarOpen ? 'Collapse side car' : 'Expand side car'} className="grid size-9 cursor-pointer place-items-center rounded-md text-foreground/65 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"><Menu size={18}/></button></ItoRegion><span className="mx-1 h-6 w-px bg-foreground/15"/></>}<ItoRegion id="q2.2" topology={topology}><a href="#Dashboard" className="flex h-10 origin-left cursor-pointer items-center gap-2 px-2 text-sm font-semibold tracking-[-0.02em] text-foreground transition-transform duration-200 ease-out hover:scale-[1.02] active:scale-[0.99] focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40" onClick={() => navigate('Dashboard')} title="Q Cafe"><span className="grid size-6 place-items-center rounded border border-foreground/70"><Coffee size={15}/></span><span className="text-sm font-semibold tracking-tight">Q CAFE</span></a></ItoRegion><span className="mx-1 h-6 w-px bg-foreground/15"/>{page === 'POS' ? <ItoRegion id="q4" topology={topology} className="flex items-center"><h1 className="px-1 text-sm font-semibold tracking-tight text-foreground">Point of sale</h1></ItoRegion> : page === 'Tables' ? <ItoRegion id="q4" topology={topology} className="flex items-center"><h1 className="px-1 text-sm font-semibold tracking-tight text-foreground">Floor & guest tables</h1></ItoRegion> : <span className="px-1 text-sm font-medium text-foreground/80">{page === 'Dashboard' ? 'Service overview' : page}</span>}</div><div aria-label="Account and application controls" className="flex h-full items-center gap-2">{!posWorkspace && <ItoRegion className="flex items-center [&>.technical-label]:!left-1/2 [&>.technical-label]:!top-full [&>.technical-label]:-translate-x-1/2 [&>.technical-label]:translate-y-1" id="q2.3" topology={topology}><button type="button" onClick={() => setCommandPanel('search')} aria-label="Global search" className="group relative grid size-11 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"><span className="grid size-9 place-items-center rounded-full transition-colors duration-150 group-hover:bg-accent group-hover:text-accent-foreground"><Search aria-hidden="true" className="size-[18px] stroke-[2.25]"/></span><span className="pointer-events-none absolute left-1/2 top-[calc(100%+0.25rem)] z-50 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs font-medium text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">Search <kbd className="pl-1 font-sans text-muted-foreground">Ctrl + K</kbd></span></button></ItoRegion>}<ItoRegion className="flex items-center [&>.technical-label]:!left-1/2 [&>.technical-label]:!top-full [&>.technical-label]:-translate-x-1/2 [&>.technical-label]:translate-y-1" id="q2.4" topology={topology}><button type="button" onClick={() => setCommandPanel('notifications')} aria-label="Notifications, unread activity" title="Notifications" className="group relative grid size-11 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-[#171717] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#737373] dark:text-foreground"><span className="grid size-9 place-items-center rounded-full transition-colors duration-150 group-hover:bg-accent group-hover:text-accent-foreground"><Bell aria-hidden="true" className="size-[18px] stroke-[2.25]"/></span><span aria-hidden="true" className="absolute right-2 top-[7px] grid size-2 place-items-center"><span className="notification-ripple absolute inset-0 origin-center rounded-full border-[1.5px] border-[#b80f2c] motion-reduce:hidden" style={{ animationDelay: '0s' }}/><span className="notification-ripple absolute inset-0 origin-center rounded-full border-[1.5px] border-[#b80f2c] motion-reduce:hidden" style={{ animationDelay: '0.8s' }}/><span className="notification-ripple absolute inset-0 origin-center rounded-full border-[1.5px] border-[#b80f2c] motion-reduce:hidden" style={{ animationDelay: '1.6s' }}/><span className="relative z-10 size-1.5 rounded-full bg-[#d5102f] ring-2 ring-white dark:ring-card"/></span></button></ItoRegion><ItoRegion className="flex items-center [&>.technical-label]:!left-1/2 [&>.technical-label]:!top-full [&>.technical-label]:-translate-x-1/2 [&>.technical-label]:translate-y-1" id="q2.5" topology={topology}><button type="button" onClick={() => setCommandPanel('user')} aria-label="User menu" title="User menu" className="group grid size-11 cursor-pointer place-items-center rounded-full border border-border bg-card p-[3px] text-sm font-medium text-foreground transition-colors hover:border-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"><span className="grid size-full place-items-center rounded-full bg-muted ring-1 ring-card transition-colors duration-150 group-hover:bg-accent group-hover:text-accent-foreground">C</span></button></ItoRegion></div></header>
    {commandPanel && <div className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] print:hidden" onClick={() => setCommandPanel(null)} />}
{commandPanel === 'search' && <section role="dialog" aria-label="Global search" className="fixed left-1/2 top-[18vh] z-50 w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl print:hidden"><div className="flex items-center gap-3 border-b border-border px-4 py-3"><Search size={20} className="shrink-0 text-muted-foreground"/><input autoFocus aria-label="Search applications and commands" className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground" placeholder="Search applications and commands" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') setCommandPanel(null); }}/><button type="button" onClick={() => setCommandPanel(null)} aria-label="Close global search" className="grid size-8 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"><X size={16}/></button></div><div className="space-y-1 p-2"><button type="button" onClick={() => { navigate('POS'); setCommandPanel(null); }} className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left text-sm hover:bg-accent hover:text-accent-foreground"><LayoutGrid className="size-4 text-muted-foreground"/>Open Point of Sale (Visual)</button><button type="button" onClick={() => { navigate('Tables'); setCommandPanel(null); }} className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left text-sm hover:bg-accent hover:text-accent-foreground"><Armchair className="size-4 text-muted-foreground"/>Open Tables (Floor & Touch Desk)</button><button type="button" onClick={() => { navigate('Overview'); setCommandPanel(null); }} className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left text-sm hover:bg-accent hover:text-accent-foreground"><TrendingUp className="size-4 text-muted-foreground"/>Open Overview (Bills & Settlements)</button><button type="button" onClick={() => { navigate('Masters'); setCommandPanel(null); }} className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left text-sm hover:bg-accent hover:text-accent-foreground"><UtensilsCrossed className="size-4 text-muted-foreground"/>Open Masters (Items & Tables)</button><button type="button" onClick={() => { navigate('Settings'); setCommandPanel(null); }} className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left text-sm hover:bg-accent hover:text-accent-foreground"><SettingsIcon className="size-4 text-muted-foreground"/>Open Settings</button><button type="button" onClick={() => setCommandPanel('notifications')} className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left text-sm hover:bg-accent hover:text-accent-foreground"><Bell className="size-4 text-muted-foreground"/>Open Notifications</button><button type="button" onClick={() => setCommandPanel('user')} className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left text-sm hover:bg-accent hover:text-accent-foreground"><UserRound className="size-4 text-muted-foreground"/>Open User Menu</button></div></section>}
{commandPanel === 'notifications' && <section role="dialog" aria-label="Notifications" className="fixed right-4 top-16 z-50 w-72 rounded-2xl border border-border bg-popover p-3 text-popover-foreground shadow-xl print:hidden"><div className="flex items-center justify-between px-2 py-2"><span className="text-sm font-semibold">Notifications</span><button type="button" aria-label="Close notifications" onClick={() => setCommandPanel(null)} className="grid size-7 cursor-pointer place-items-center rounded-md hover:bg-accent"><X size={15}/></button></div><div className="rounded-xl bg-muted px-3 py-5 text-sm text-muted-foreground">No new restaurant activity.</div></section>}
{commandPanel === 'user' && (
  <section role="dialog" aria-label="User menu" className="fixed right-4 top-16 z-50 w-64 rounded-3xl border border-border bg-popover p-3 text-popover-foreground shadow-xl print:hidden">
    <div className="flex flex-col items-center gap-2 px-3 py-3">
      <span className="grid size-14 place-items-center rounded-full border border-border bg-muted text-lg font-medium">{user?.name.slice(0, 1).toUpperCase() ?? 'C'}</span>
      <span className="text-sm font-semibold">{user?.name ?? 'Q Cafe cashier'}</span>
      <span className="text-xs text-muted-foreground">{user?.access === 'cashier' ? 'POS billing access' : 'Administrator access'}</span>
    </div>
    {user?.access !== 'cashier' && <>
      <div className="my-2 h-px bg-border"/>
      <button type="button" onClick={() => { navigate('Masters'); setCommandPanel(null); }} className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"><UtensilsCrossed size={16}/>Restaurant masters</button>
      <button type="button" onClick={() => { navigate('Settings'); setCommandPanel(null); }} className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"><SettingsIcon size={16}/>Restaurant settings</button>
      <button type="button" onClick={() => { navigate('Settings'); setCommandPanel(null); }} className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"><Sun size={16}/>Appearance</button>
    </>}
    <div className="my-2 h-px bg-border"/>
    <button type="button" onClick={signOut} className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"><LogOut size={16}/>Sign out</button>
  </section>
)}<div className={`grid min-h-[calc(100vh-56px)] ${page === 'POS' || page === 'Overview' || page === 'Tables' ? 'lg:h-[calc(100vh-56px)] lg:max-h-[calc(100vh-56px)]' : ''} transition-[grid-template-columns] duration-200 ${posWorkspace ? 'grid-cols-1' : sideCarOpen ? 'lg:grid-cols-[228px_1fr]' : 'lg:grid-cols-[56px_1fr]'} print:block print:min-h-0`}>{!posWorkspace && <aside className="ito-region group relative border-b border-border bg-card lg:min-h-[calc(100vh-56px)] lg:border-r print:hidden" {...topology.regionProps('q3')}><TopologyMarker id="q3" topology={topology}/><div className={`flex flex-col h-full overflow-hidden ${sideCarOpen ? 'p-3' : 'py-3 px-1.5 items-center'}`}>{sideCarOpen && <p className="px-3 pb-3 pt-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Restaurant</p>}<ItoRegion id="q3.1" topology={topology} tag="section" className={sideCarOpen ? 'w-full' : ''}><nav className={`flex flex-wrap gap-1 lg:flex-col ${sideCarOpen ? 'w-full' : 'items-center'}`}>{pages.filter(p => p.name !== 'Settings').filter(p => {
  if (p.name === 'Kitchen') return Boolean(settings.showNavKitchen);
  if (p.name === 'Inventory') return Boolean(settings.showNavInventory);
  if (p.name === 'Bookings') return Boolean(settings.showNavBookings);
  if (p.name === 'Dashboard') return Boolean(settings.showNavDashboard);
  if (p.name === 'Masters') return Boolean(settings.showNavMasters);
  return true;
}).map(({name,icon: Icon}, index) => <ItoRegion id={`q3.1.${index + 1}`} topology={topology} key={name}><button key={name} onClick={() => navigate(name)} aria-current={page === name ? 'page' : undefined} title={name} aria-label={name} className={`flex cursor-pointer items-center rounded-lg text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring ${sideCarOpen ? 'w-full gap-3 px-3 py-2.5' : 'size-10 justify-center'} ${page === name ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}><Icon size={19} className="shrink-0"/>{sideCarOpen && <span className="truncate">{name}</span>}</button></ItoRegion>)}</nav></ItoRegion><div className={`mt-auto w-full pt-2 ${sideCarOpen ? '' : 'flex flex-col items-center'}`}><div className="my-2 h-px w-full bg-border" /><ItoRegion id="q3.1.6" topology={topology} className={sideCarOpen ? 'w-full' : ''}><button type="button" onClick={() => navigate('Settings')} aria-current={page === 'Settings' ? 'page' : undefined} title="Settings" aria-label="Settings" className={`flex cursor-pointer items-center rounded-lg text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring ${sideCarOpen ? 'w-full gap-3 px-3 py-2.5' : 'size-10 justify-center'} ${page === 'Settings' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}><SettingsIcon size={19} className="shrink-0"/>{sideCarOpen && <span className="truncate">Settings</span>}</button></ItoRegion></div></div><div style={{ position: 'absolute', bottom: '8.5rem', right: '-14px', zIndex: 20 }} className="hidden lg:block opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"><ItoRegion id="q3.3" topology={topology}><button type="button" onClick={() => setSideCarOpen(open => !open)} aria-label={sideCarOpen ? 'Collapse Q Cafe navigation' : 'Expand Q Cafe navigation'} title={sideCarOpen ? 'Collapse navigation' : 'Expand navigation'} className="grid size-7 cursor-pointer place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-md transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{sideCarOpen ? <PanelLeftClose size={14}/> : <PanelLeftOpen size={14}/>}</button></ItoRegion></div></aside>}
    <main className={`min-w-0 flex flex-col ${page === 'POS' ? 'h-full min-h-0 flex-1 overflow-hidden' : page === 'Overview' || page === 'Tables' ? 'h-full min-h-0 p-2.5 flex-1 overflow-hidden' : 'space-y-5 p-6 lg:px-10 lg:py-8'} print:block print:p-0 print:m-0 print:overflow-visible`}>{page !== 'POS' && page !== 'Overview' && page !== 'Tables' && page !== 'Masters' && <div className="ito-region flex items-center justify-between gap-4 print:hidden" {...topology.regionProps('q4')}><TopologyMarker id="q4" topology={topology}/><h1 className="text-3xl font-semibold tracking-tight">{page === 'Dashboard' ? 'Service overview' : page}</h1><div className="flex gap-3"><ItoRegion id="q4.1" topology={topology}><Button aria-label="Refresh workspace" title="Refresh workspace" variant="outline" className="cursor-pointer" onClick={() => void refresh()}><RefreshCw size={16}/></Button></ItoRegion><ItoRegion id="q4.2" topology={topology}><Button className="cursor-pointer" onClick={() => navigate('POS')}>+ New order</Button></ItoRegion></div></div>}
    {error && <ItoRegion id="q4.3" topology={topology}><p role="alert" className="rounded-lg border border-destructive p-4 text-destructive print:hidden">{error}</p></ItoRegion>}<div className={`ito-region ${page === 'POS' || page === 'Overview' || page === 'Tables' ? 'flex-1 flex flex-col min-h-0' : ''} print:block print:min-h-0 print:overflow-visible`} {...topology.regionProps('q5')}><TopologyMarker id="q5" topology={topology}/>{page === 'Dashboard' && <Dashboard data={data} navigate={navigate} topology={topology}/>} {page === 'POS' && <Pos1 {...props} topology={topology}/>} {page === 'Tables' && <Tables data={data} navigate={navigate} topology={topology}/>} {page === 'Overview' && <Overview {...props} topology={topology} navigate={navigate} />} {page === 'Kitchen' && <Kitchen {...props} topology={topology}/>} {page === 'Inventory' && <Inventory {...props} topology={topology}/>} {page === 'Bookings' && <Bookings {...props} topology={topology}/>} {page === 'Masters' && <Masters data={data} topology={topology} navigate={navigate}/>} {page === 'Settings' && <Settings data={data} topology={topology} showItoIcon={showItoIcon} onToggleItoIcon={setShowItoIcon}/>}</div></main></div>{showItoIcon && <TopologyInspectionControl topology={topology}/>}{showItoIcon && <InterfaceTopologyDrawer topology={topology}/>}</div>;

}
