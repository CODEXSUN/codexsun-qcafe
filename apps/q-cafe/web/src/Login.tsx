import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Coffee, UserRound, Lock, KeyRound, Database, Power, RotateCcw } from 'lucide-react';
import { Button } from '@codexsun/ui/components/ui/button';
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
import {
  InterfaceTopologyDrawer,
  TopologyInspectionControl,
  TopologyMarker,
  type InterfaceTopologyController,
} from '@codexsun/devkit-ito';
import { signIn, signInWithCredentials, type SignInResult } from './api';
import { ItoRegion } from './ItoRegion';

type Props = {
  topology: InterfaceTopologyController;
  showItoIcon: boolean;
  onSuccess: (session: SignInResult) => void;
};

export function Login({ topology, showItoIcon, onSuccess }: Props) {
  const [authMode, setAuthMode] = useState<'pin' | 'username' | 'setup'>('pin');
  const [pin, setPin] = useState<string[]>(['', '', '', '']);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [username, setUsername] = useState('cashier');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [setupBusy, setSetupBusy] = useState(false);
  const [exitBusy, setExitBusy] = useState(false);
  const [exitConfirmationOpen, setExitConfirmationOpen] = useState(false);
  const [version, setVersion] = useState(__QCAFE_VERSION__);

  const ref0 = useRef<HTMLInputElement>(null);
  const ref1 = useRef<HTMLInputElement>(null);
  const ref2 = useRef<HTMLInputElement>(null);
  const ref3 = useRef<HTMLInputElement>(null);
  const inputRefs = [ref0, ref1, ref2, ref3] as const;

  useEffect(() => {
    if (authMode === 'pin') {
      inputRefs[0].current?.focus();
    }
  }, [authMode]);

  useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window)) return;
    void import('@tauri-apps/api/app').then(({ getVersion }) => getVersion()).then(setVersion).catch(() => undefined);
  }, []);

  useEffect(() => {
    document.documentElement.classList.add('q-cafe-login-active');
    return () => document.documentElement.classList.remove('q-cafe-login-active');
  }, []);

  async function runFirstTimeAction(command: 'qcafe_select_data_directory' | 'qcafe_clear_first_time_data') {
    if (!('__TAURI_INTERNALS__' in window)) return;
    setSetupBusy(true);
    setError('');
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const changed = await invoke<boolean>(command);
      if (changed !== false) window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Q Cafe setup could not be changed.');
    } finally {
      setSetupBusy(false);
    }
  }

  async function exitQCafe() {
    if (!('__TAURI_INTERNALS__' in window) || exitBusy) return;
    setExitBusy(true);
    setError('');
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('qcafe_exit_application');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Q Cafe could not close safely.');
      setExitBusy(false);
    }
  }

  async function submitPin(pinString: string) {
    if (pinString.length !== 4 || busy) return;
    setBusy(true);
    setError('');
    try {
      const session = await signIn(pinString);
      sessionStorage.setItem('q-cafe-session', session.access_token);
      sessionStorage.setItem('q-cafe-session-user', JSON.stringify(session.user));
      onSuccess(session);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Incorrect PIN.';
      setError(message);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPin(['', '', '', '']);
      setTimeout(() => {
        inputRefs[0].current?.focus();
        setFocusedIndex(0);
      }, 60);
    } finally {
      setBusy(false);
    }
  }

  function handlePinChange(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, '');

    // Multi-digit paste or autofill
    if (digits.length > 1) {
      const slice = digits.slice(0, 4);
      const next = ['', '', '', ''];
      for (let i = 0; i < slice.length; i++) {
        next[i] = slice[i] ?? '';
      }
      setPin(next);
      const nextFocus = Math.min(slice.length, 3);
      inputRefs[nextFocus]?.current?.focus();
      setFocusedIndex(nextFocus);
      if (slice.length === 4) {
        void submitPin(slice);
      }
      return;
    }

    const digit = digits.slice(-1);
    const next = [...pin];
    next[index] = digit;
    setPin(next);

    if (digit) {
      if (index < 3) {
        inputRefs[index + 1]?.current?.focus();
        setFocusedIndex(index + 1);
      }
      // Auto login when 4th digit is entered
      if (index === 3 && next.every((d) => d !== '')) {
        void submitPin(next.join(''));
      }
    }
  }

  function handlePinKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (!pin[index] && index > 0) {
        e.preventDefault();
        const next = [...pin];
        next[index - 1] = '';
        setPin(next);
        inputRefs[index - 1]?.current?.focus();
        setFocusedIndex(index - 1);
      } else {
        const next = [...pin];
        next[index] = '';
        setPin(next);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs[index - 1]?.current?.focus();
      setFocusedIndex(index - 1);
    } else if (e.key === 'ArrowRight' && index < 3) {
      e.preventDefault();
      inputRefs[index + 1]?.current?.focus();
      setFocusedIndex(index + 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const full = pin.join('');
      if (full.length === 4) {
        void submitPin(full);
      }
    }
  }

  function handlePinPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;
    const next = ['', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i] ?? '';
    }
    setPin(next);
    const focusTarget = Math.min(pasted.length, 3);
    inputRefs[focusTarget]?.current?.focus();
    setFocusedIndex(focusTarget);
    if (pasted.length === 4) {
      void submitPin(pasted);
    }
  }

  async function handleUsernameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password || busy) return;
    setBusy(true);
    setError('');
    try {
      const session = await signInWithCredentials(username.trim(), password);
      sessionStorage.setItem('q-cafe-session', session.access_token);
      sessionStorage.setItem('q-cafe-session-user', JSON.stringify(session.user));
      onSuccess(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      className="h-[100dvh] w-screen overflow-hidden bg-background text-foreground"
      {...topology.rootAttributes}
    >
      <style>{`
        @keyframes qcafe-shake {
          0%, 100% { transform: translateX(0); }
          15%, 45%, 75% { transform: translateX(-6px); }
          30%, 60%, 90% { transform: translateX(6px); }
        }
        .animate-qcafe-shake {
          animation: qcafe-shake 0.45s ease-in-out both;
        }
      `}</style>

      <div className="fixed inset-0 grid place-items-center overflow-hidden p-4">
        <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-7 shadow-xl sm:p-8">
        <div className="text-center space-y-2 mb-6">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary shadow-xs">
            <Coffee size={32} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Q Cafe
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {authMode === 'pin' ? 'Enter your four-digit access PIN.' : 'Sign in with your username and password.'}
          </p>
        </div>

        {authMode === 'pin' || authMode === 'setup' ? (
          <form
            className="ito-region space-y-5"
            {...topology.regionProps('q1')}
            onSubmit={(e) => {
              e.preventDefault();
              submitPin(pin.join(''));
            }}
          >
            <TopologyMarker id="q1" topology={topology} />

            {/* 4 OTP Input Boxes */}
            <ItoRegion id="q1.1" topology={topology}>
              <div
                className={`flex justify-center items-center gap-3 sm:gap-3.5 py-1 ${
                  shake ? 'animate-qcafe-shake' : ''
                }`}
              >
                {pin.map((digit, index) => {
                  const isFilled = digit !== '';
                  const isFocused = focusedIndex === index;
                  return (
                    <input
                      key={index}
                      ref={inputRefs[index]}
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={index === 0 ? 4 : 1}
                      value={digit}
                      onChange={(e) => handlePinChange(index, e)}
                      onKeyDown={(e) => handlePinKeyDown(index, e)}
                      onFocus={() => setFocusedIndex(index)}
                      onPaste={handlePinPaste}
                      disabled={busy}
                      aria-label={`PIN digit ${index + 1}`}
                      className={`size-13 sm:size-15 rounded-2xl border-2 text-center text-2xl font-bold font-mono outline-none transition-all duration-150 select-none cursor-pointer ${
                        isFocused
                          ? 'border-primary ring-4 ring-primary/20 shadow-md scale-105 bg-background text-foreground'
                          : isFilled
                          ? 'border-foreground/40 bg-accent/40 text-foreground'
                          : 'border-border bg-card text-muted-foreground hover:border-foreground/30'
                      } ${error ? 'border-destructive/60' : ''}`}
                      autoFocus={index === 0}
                    />
                  );
                })}
              </div>
            </ItoRegion>

            {busy && (
              <ItoRegion id="q1.2" topology={topology}>
                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-primary py-1">
                  <span className="size-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <span>Opening workspace…</span>
                </div>
              </ItoRegion>
            )}

            {error && (
              <ItoRegion id="q1.3" topology={topology}>
                <p role="alert" className="text-center text-xs font-medium text-destructive">
                  {error}
                </p>
              </ItoRegion>
            )}

            {/* Fixed local access PINs are the current sign-in method. */}
            <ItoRegion id="q1.4" topology={topology} className="pt-2 text-center border-t border-border/60">
              <p className="text-xs text-muted-foreground">Access is based on the assigned four-digit PIN.</p>
            </ItoRegion>
          </form>
        ) : (
          <form
            className="ito-region space-y-4"
            {...topology.regionProps('q1.5')}
            onSubmit={handleUsernameSubmit}
          >
            <TopologyMarker id="q1.5" topology={topology} />

            <ItoRegion id="q1.5.1" topology={topology} className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Username</label>
              <div className="relative w-full">
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. cashier or admin"
                  className="w-full h-11 rounded-xl border border-input bg-background pl-3.5 pr-10 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all placeholder:text-muted-foreground/60"
                />
                <UserRound
                  size={18}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
              </div>
            </ItoRegion>

            <ItoRegion id="q1.5.2" topology={topology} className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Password / PIN</label>
              <div className="relative w-full">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password or PIN"
                  className="w-full h-11 rounded-xl border border-input bg-background pl-3.5 pr-10 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all placeholder:text-muted-foreground/60"
                />
                <KeyRound
                  size={18}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
              </div>
            </ItoRegion>

            <ItoRegion id="q1.5.3" topology={topology}><Button
              type="submit"
              disabled={busy || !username.trim() || !password}
              className="w-full h-11 cursor-pointer rounded-xl font-semibold shadow-xs mt-2"
            >
              {busy ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                  Signing in…
                </span>
              ) : (
                'Sign in'
              )}
            </Button></ItoRegion>

            {error && (
              <ItoRegion id="q1.5.4" topology={topology}><p role="alert" className="text-center text-xs font-medium text-destructive">
                {error}
              </p></ItoRegion>
            )}

            {/* Switch back to PIN login text */}
            <ItoRegion id="q1.5.5" topology={topology} className="pt-2 text-center border-t border-border/60">
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setAuthMode('pin');
                  setPin(['', '', '', '']);
                }}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors hover:underline"
              >
                <Lock size={14} />
                <span>Sign in with 4-digit cashier PIN</span>
              </button>
            </ItoRegion>
          </form>
        )}
        </div>
      </div>

      {createPortal(
        <ItoRegion id="q1.6" topology={topology} className="fixed bottom-24 right-6 z-[100] flex flex-col items-end gap-3">
          {'__TAURI_INTERNALS__' in window ? (
            <Button
              type="button"
              variant="outline"
              disabled={exitBusy}
              onClick={() => setExitConfirmationOpen(true)}
              className="h-10 cursor-pointer gap-2 px-4 text-sm font-semibold shadow-sm"
            >
              <Power size={16} />
              {exitBusy ? 'Closing…' : 'Exit'}
            </Button>
          ) : null}
          <p className="text-sm font-medium text-muted-foreground">v{version}</p>
        </ItoRegion>,
        document.body,
      )}

      <AlertDialog
        open={exitConfirmationOpen}
        onOpenChange={(open) => {
          if (!exitBusy) setExitConfirmationOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to exit Q Cafe?</AlertDialogTitle>
            <AlertDialogDescription>
              Q Cafe will finish its current work and then close.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={exitBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={exitBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void exitQCafe();
              }}
            >
              {exitBusy ? 'Closing…' : 'Exit Q Cafe'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showItoIcon && <TopologyInspectionControl topology={topology} />}
      {showItoIcon && <InterfaceTopologyDrawer topology={topology} />}
    </main>
  );
}
