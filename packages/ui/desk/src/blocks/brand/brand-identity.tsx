export function BrandIdentity() {
  return <a aria-label="Go to home" className="flex h-10 origin-left cursor-pointer items-center gap-2 px-2 text-sm font-semibold tracking-[-0.02em] text-foreground transition-transform duration-200 ease-out hover:scale-[1.02] active:scale-[0.99] focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40" href="/" title="Home">
    <img alt="" className="size-6 dark:hidden" src="/logo/logo.svg" />
    <img alt="" className="hidden size-6 dark:block" src="/logo/logo-dark.svg" />
    <span>CODEXSUN</span>
  </a>;
}
