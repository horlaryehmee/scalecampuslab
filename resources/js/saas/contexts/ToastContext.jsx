import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const dismiss = useCallback((id) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const push = useCallback((message, type = 'success', title = null) => {
        const id = `${Date.now()}-${Math.random()}`;
        setToasts((current) => [...current.slice(-3), { id, message, type, title }]);
        window.setTimeout(() => dismiss(id), 5000);
        return id;
    }, [dismiss]);

    const value = useMemo(() => ({ push, dismiss }), [push, dismiss]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="pointer-events-none fixed right-4 top-4 z-[100] grid w-[min(24rem,calc(100vw-2rem))] gap-3" aria-live="polite">
                {toasts.map((toast) => {
                    const Icon = toast.type === 'error' ? CircleAlert : toast.type === 'info' ? Info : CheckCircle2;
                    return (
                        <article key={toast.id} className="pointer-events-auto flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10">
                            <Icon className={toast.type === 'error' ? 'text-rose-600' : toast.type === 'info' ? 'text-blue-600' : 'text-emerald-600'} size={20} />
                            <div className="min-w-0 flex-1">
                                {toast.title && <p className="font-black text-slate-950">{toast.title}</p>}
                                <p className="text-sm font-semibold leading-5 text-slate-600">{toast.message}</p>
                            </div>
                            <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification" className="text-slate-400 hover:text-slate-700"><X size={17} /></button>
                        </article>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const value = useContext(ToastContext);
    if (!value) throw new Error('useToast must be used inside ToastProvider.');
    return value;
}
