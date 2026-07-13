import React, { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { ArrowRight, GraduationCap, Menu, X } from 'lucide-react';
import { ButtonLink, cx } from '../components/ui';

const links = [
    ['/', 'Home'],
    ['/about', 'About'],
    ['/how-it-works', 'How it works'],
    ['/faq', 'FAQ'],
    ['/contact', 'Contact'],
];

export function Logo({ dark = false, name = 'ScaleCampusLab', logoUrl = null, primaryColor = '#075f56' }) {
    return (
        <Link to="/" className="inline-flex items-center gap-3" aria-label={`${name} home`}>
            <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl text-white shadow-sm" style={{ backgroundColor: primaryColor }}>{logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-cover" /> : <GraduationCap size={21} />}</span>
            <span className={cx('text-lg font-black tracking-tight', dark ? 'text-white' : 'text-slate-950')}>{name}</span>
        </Link>
    );
}

export default function PublicLayout() {
    const [open, setOpen] = useState(false);

    return (
        <div className="min-h-screen bg-white text-slate-950">
            <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
                <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <Logo />
                    <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
                        {links.map(([to, label]) => (
                            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => cx('rounded-lg px-3 py-2 text-sm font-bold transition', isActive ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950')}>{label}</NavLink>
                        ))}
                    </nav>
                    <div className="hidden items-center gap-2 lg:flex">
                        <ButtonLink to="/login" variant="ghost">Log in</ButtonLink>
                        <ButtonLink to="/register">Get started <ArrowRight size={15} /></ButtonLink>
                    </div>
                    <button type="button" onClick={() => setOpen((value) => !value)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 lg:hidden" aria-expanded={open} aria-label="Toggle navigation">{open ? <X size={19} /> : <Menu size={19} />}</button>
                </div>
                {open && (
                    <div className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
                        <nav className="grid gap-1">
                            {links.map(([to, label]) => <NavLink key={to} to={to} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">{label}</NavLink>)}
                            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                                <ButtonLink to="/login" onClick={() => setOpen(false)} variant="secondary" className="w-full">Log in</ButtonLink>
                                <ButtonLink to="/register" onClick={() => setOpen(false)} className="w-full">Get started</ButtonLink>
                            </div>
                        </nav>
                    </div>
                )}
            </header>

            <Outlet />

            <footer className="border-t border-slate-200 bg-slate-950 text-white">
                <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
                    <div>
                        <Logo dark />
                        <p className="mt-4 max-w-md text-sm font-semibold leading-6 text-slate-400">One shared workspace for universities, schools, and students to plan visits, make decisions, and measure engagement.</p>
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Platform</p>
                        <div className="mt-4 grid gap-3 text-sm font-bold text-slate-300">
                            <Link to="/how-it-works">How it works</Link>
                            <Link to="/register?role=university">For universities</Link>
                            <Link to="/register?role=school">For schools</Link>
                        </div>
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Company</p>
                        <div className="mt-4 grid gap-3 text-sm font-bold text-slate-300">
                            <Link to="/about">About</Link>
                            <Link to="/faq">FAQ</Link>
                            <Link to="/contact">Contact</Link>
                        </div>
                    </div>
                </div>
                <div className="border-t border-white/10 px-4 py-5 text-center text-xs font-semibold text-slate-500">© {new Date().getFullYear()} ScaleCampusLab. Campus visits, coordinated.</div>
            </footer>
        </div>
    );
}
