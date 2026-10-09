import { cn } from '../lib/cn';

/** Marca do sistema: um carimbo circular. */
export function BrandMark({ className }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={cn('h-8 w-8 shrink-0', className)}>
      <rect width="32" height="32" rx="8" fill="#0E6B61" />
      <circle cx="16" cy="16" r="10.5" stroke="#fff" strokeWidth="1.6" />
      <circle cx="16" cy="16" r="7.6" stroke="#fff" strokeWidth="0.9" strokeDasharray="1.4 1.6" />
      <path
        d="M19.2 12.9c-.6-.9-1.7-1.4-3.1-1.4-1.8 0-3 .9-3 2.2 0 1.4 1.2 1.9 3 2.3 1.9.4 3.2 1 3.2 2.5 0 1.4-1.3 2.4-3.3 2.4-1.5 0-2.7-.6-3.3-1.6"
        stroke="#fff" strokeWidth="1.7" strokeLinecap="round"
      />
    </svg>
  );
}

export function PageHeader({ title, description, actions, className }) {
  return (
    <header className={cn('flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        <h1 className="text-[1.625rem] font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({ title, icon: Icon, meta, actions, children, className, bodyClassName }) {
  return (
    <section className={cn('panel flex flex-col overflow-hidden', className)}>
      {(title || actions) && (
        <div className="flex min-h-14 items-center gap-3 border-b border-line-soft px-5 py-3">
          {Icon && <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />}
          <h2 className="text-[0.9375rem] font-semibold text-ink">{title}</h2>
          {meta && <span className="text-sm text-slate-400">{meta}</span>}
          {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn('flex-1', bodyClassName)}>{children}</div>
    </section>
  );
}

const BUTTON_VARIANTS = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm',
  secondary: 'bg-white text-slate-700 border border-line hover:bg-slate-50 hover:border-slate-300',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-ink',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

export function Button({ as: Comp = 'button', variant = 'primary', size = 'md', className, children, ...props }) {
  return (
    <Comp
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-[0.8125rem]' : 'h-9 px-4 text-sm',
        BUTTON_VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}

export function Skeleton({ className }) {
  return <div className={cn('skeleton', className)} aria-hidden="true" />;
}

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      {Icon && (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      )}
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description && <p className="mt-1 max-w-xs text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Esqueleto mostrado enquanto uma página carrega sob demanda. */
export function PageSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Carregando página">
      <div className="space-y-2 pb-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}
