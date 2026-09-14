import { useMemo, useState } from 'react';
import { Coffee, KeyRound, MonitorCheck, Power, RefreshCw } from 'lucide-react';
import { Button } from '@codexsun/ui/components/ui/button';
import { LicenseStateBadge } from './LicenseStateBadge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@codexsun/ui/components/ui/alert-dialog';

export type LicenseStatus = {
  licensed: boolean;
  activationRequired: boolean;
  machineId: string;
  machineLabel: string;
  licenseId?: string;
  activatedAt?: string;
  serialUuid?: string;
  lastValidatedAt?: string;
  offline: boolean;
  message: string;
  activationResponse?: {
    httpStatus: number;
    status: string;
    licenseId: string;
    appId: string;
    activatedAt: string;
    machineLimit: number;
    tokenStored: boolean;
  };
};

type Props = { status: LicenseStatus; onActivated: () => void; onClose?: () => void };

export function LicenseActivation({ status, onActivated, onClose }: Props) {
  const [licenseKey, setLicenseKey] = useState('');
  const [machineLabel, setMachineLabel] = useState(status.machineLabel);
  const [message, setMessage] = useState(status.message);
  const [busy, setBusy] = useState(false);
  const [exitBusy, setExitBusy] = useState(false);
  const [exitConfirmationOpen, setExitConfirmationOpen] = useState(false);
  const [activationResponse, setActivationResponse] = useState<LicenseStatus['activationResponse']>();
  const displayKey = useMemo(() => licenseKey.replace(/(\d{4})(?=\d)/g, '$1-'), [licenseKey]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage('');
    setActivationResponse(undefined);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke<LicenseStatus>('qcafe_activate_license', { activation: { licenseKey, machineLabel } });
      if (!result.licensed) throw new Error(result.message);
      setActivationResponse(result.activationResponse);
      setMessage(result.message);
    } catch (error) {
      setMessage(activationErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function exitQCafe() {
    if (exitBusy) return;
    setExitBusy(true);
    if (!('__TAURI_INTERNALS__' in window)) {
      window.close();
      setExitBusy(false);
      return;
    }
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('qcafe_exit_application');
    } catch (error) {
      setMessage(activationErrorMessage(error, 'Q Cafe could not close safely.'));
      setExitBusy(false);
    }
  }

  async function skipActivation() {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke<LicenseStatus>('qcafe_skip_activation');
      onActivated();
    } catch (error) {
      setMessage(activationErrorMessage(error, 'Q Cafe could not start trial mode.'));
    } finally {
      setBusy(false);
    }
  }

  return <main className="grid min-h-screen place-items-center bg-background p-6">
    <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-xl">
      <div className="mb-6 text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary"><Coffee size={27}/></span><h1 className="mt-4 text-2xl font-bold">Activate Q Cafe</h1><p className="mt-2 text-sm text-muted-foreground">Activate this desktop before signing in.</p></div>
      <label className="grid gap-2 text-sm font-medium">License key<div className="relative"><KeyRound className="absolute left-3 top-3 size-4 text-muted-foreground"/><input required inputMode="numeric" autoComplete="off" value={displayKey} onChange={event => setLicenseKey(event.target.value.replace(/\D/g, '').slice(0, 16))} placeholder="0000-0000-0000-0000" className="h-10 w-full rounded-md border bg-background pl-10 pr-3 font-mono tracking-wider"/></div></label>
      <label className="mt-4 grid gap-2 text-sm font-medium">Machine label<input required maxLength={120} value={machineLabel} onChange={event => setMachineLabel(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3"/></label>
      <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground"><MonitorCheck className="mr-2 inline size-4"/>This installation has a private machine identity. It remains the same after updates. Generate the license key in Tech Media Secure for <span className="font-mono font-semibold text-foreground">qcafe-desktop</span>.</div>
      {status.serialUuid && <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground"><p className="font-semibold text-foreground">Manual registration reference</p><p className="mt-1">Secure serial UUID: <span className="font-mono text-foreground">{status.serialUuid}</span></p><p className="mt-1">Use this server-issued UUID when matching the Q Cafe installation to a Tech Media Secure row.</p></div>}
      {message && <p className={`mt-4 rounded-lg border p-3 text-sm ${activationResponse ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-destructive/30 bg-destructive/10 text-destructive'}`}>{message}</p>}
      {activationResponse && <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground">Tech Media Secure response</p>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[11px]">
          <dt>HTTP</dt><dd>{activationResponse.httpStatus}</dd>
          <dt>status</dt><dd>{activationResponse.status}</dd>
          <dt>appId</dt><dd>{activationResponse.appId}</dd>
          <dt>licenseId</dt><dd>{activationResponse.licenseId}</dd>
          <dt>activatedAt</dt><dd>{activationResponse.activatedAt}</dd>
          <dt>machineLimit</dt><dd>{activationResponse.machineLimit}</dd>
          <dt>token</dt><dd>{activationResponse.tokenStored ? 'Stored in Windows Credential Manager' : 'Not stored'}</dd>
        </dl>
      </div>}
      {activationResponse ? <Button type="button" className="mt-5 w-full cursor-pointer" onClick={onActivated}>Continue to Q Cafe</Button> : <Button type="submit" className="mt-5 w-full cursor-pointer" disabled={busy}>{busy ? <><RefreshCw className="animate-spin"/> Verifying…</> : 'Activate and verify'}</Button>}
      {message && !activationResponse && <Button type="button" variant="outline" className="mt-3 w-full cursor-pointer" onClick={() => window.location.reload()} disabled={busy}>Retry connection</Button>}
    </form>
    <Button type="button" variant="outline" className="-mt-2 w-full max-w-md cursor-pointer" onClick={() => void skipActivation()} disabled={busy}>
      Skip activation and continue with trial
    </Button>
    {onClose && <Button type="button" variant="ghost" className="-mt-1 w-full max-w-md cursor-pointer" onClick={onClose} disabled={busy}>Back to Q Cafe</Button>}
    <LicenseStateBadge licensed={status.licensed} />
    <div className="fixed bottom-24 right-6 z-10 flex flex-col items-end gap-3">
      <Button type="button" variant="outline" disabled={exitBusy} onClick={() => setExitConfirmationOpen(true)} className="h-10 cursor-pointer gap-2 px-4 text-sm font-semibold shadow-sm">
        <Power size={16}/>
        {exitBusy ? 'Closing…' : 'Exit'}
      </Button>
      <p className="text-sm font-medium text-muted-foreground">v{__QCAFE_VERSION__}</p>
    </div>
    <AlertDialog open={exitConfirmationOpen} onOpenChange={(open) => { if (!exitBusy) setExitConfirmationOpen(open); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to exit Q Cafe?</AlertDialogTitle>
          <AlertDialogDescription>Q Cafe will finish its current work and then close.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={exitBusy}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={exitBusy} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(event) => { event.preventDefault(); void exitQCafe(); }}>
            {exitBusy ? 'Closing…' : 'Exit Q Cafe'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </main>;
}

function activationErrorMessage(error: unknown, fallback = 'Q Cafe could not activate this license.') {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return fallback;
}
