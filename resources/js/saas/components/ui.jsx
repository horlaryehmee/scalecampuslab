import React from 'react';
import { Link } from 'react-router-dom';
import { Inbox, LoaderCircle, RefreshCcw } from 'lucide-react';

export function cx(...classes) {
    return classes.filter(Boolean).join(' ');
}

const buttonTones = {
    primary: 'bg-[#075f56] text-white hover:bg-[#054b45] shadow-sm shadow-emerald-950/15',
    secondary: 'border border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
};

function buttonClasses(variant, className) {
    return cx('inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-55', buttonTones[variant], className);
}

export function Button({ children, type = 'button', variant = 'primary', loading = false, className = '', ...props }) {
    return (
        <button type={type} className={buttonClasses(variant, className)} {...props} disabled={loading || props.disabled}>
            {loading && <LoaderCircle className="animate-spin" size={16} />}
            {children}
        </button>
    );
}

export function ButtonLink({ children, to, variant = 'primary', className = '', ...props }) {
    return <Link to={to} className={buttonClasses(variant, className)} {...props}>{children}</Link>;
}

export function Card({ children, className = '' }) {
    return <section className={cx('rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.035]', className)}>{children}</section>;
}

export function Field({ label, error, as = 'input', options = [], className = '', ...props }) {
    const Element = as;
    return (
        <label className={cx('grid gap-1.5 text-sm font-bold text-slate-700', className)}>
            <span>{label}</span>
            {as === 'select' ? (
                <select className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50" {...props}>
                    {options.map((option) => {
                        const value = typeof option === 'string' ? option : option.value;
                        const text = typeof option === 'string' ? option : option.label;
                        return <option key={value} value={value}>{text}</option>;
                    })}
                </select>
            ) : (
                <Element className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50" {...props} />
            )}
            {error && <span className="text-xs font-semibold text-rose-600">{error}</span>}
        </label>
    );
}

export function PageState({ loading, error, empty, onRetry, children }) {
    if (loading) {
        return <div className="grid min-h-52 place-items-center"><LoaderCircle className="animate-spin text-emerald-700" size={30} aria-label="Loading" /></div>;
    }
    if (error) {
        return (
            <Card className="grid place-items-center py-10 text-center">
                <p className="font-black text-slate-950">We could not load this data.</p>
                <p className="mt-2 max-w-md text-sm font-semibold text-slate-500">{error}</p>
                {onRetry && <Button className="mt-4" variant="secondary" onClick={onRetry}><RefreshCcw size={15} /> Try again</Button>}
            </Card>
        );
    }
    if (empty) return <EmptyState />;
    return children;
}

export function EmptyState({ title = 'Nothing here yet', message = 'New records will appear here as soon as they are available.', action = null }) {
    return (
        <div className="grid place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-emerald-700 shadow-sm"><Inbox size={21} /></span>
            <p className="mt-3 font-black text-slate-950">{title}</p>
            <p className="mt-1 max-w-md text-sm font-semibold leading-6 text-slate-500">{message}</p>
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

export function StatusBadge({ status = 'unknown' }) {
    const value = String(status).toLowerCase();
    const tone = ['approved', 'published', 'confirmed', 'attended', 'active', 'sent', 'completed'].includes(value)
        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
        : ['rejected', 'declined', 'cancelled', 'failed', 'suspended'].includes(value)
            ? 'bg-rose-50 text-rose-700 ring-rose-200'
            : ['requested', 'pending', 'waitlisted', 'queued', 'draft'].includes(value)
                ? 'bg-amber-50 text-amber-700 ring-amber-200'
                : 'bg-slate-100 text-slate-700 ring-slate-200';
    return <span className={cx('inline-flex rounded-full px-2.5 py-1 text-[11px] font-black capitalize ring-1 ring-inset', tone)}>{value.replaceAll('_', ' ')}</span>;
}

export function MetricCard({ label, value, detail, icon: Icon }) {
    return (
        <Card className="p-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
                    <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{value ?? 0}</p>
                    {detail && <p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p>}
                </div>
                {Icon && <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Icon size={19} /></span>}
            </div>
        </Card>
    );
}

export function formatDate(value, options = {}) {
    if (!value) return 'Not scheduled';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString([], { dateStyle: 'medium', timeStyle: options.dateOnly ? undefined : 'short' });
}
