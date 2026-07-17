import React, { Component, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import {
    Activity,
    ArrowRight,
    Archive,
    BarChart3,
    Bell,
    Blocks,
    Brain,
    CalendarDays,
    CheckCircle2,
    CheckSquare,
    ChevronDown,
    ChevronRight,
    Circle,
    Clock,
    Command,
    Download,
    Filter,
    FolderKanban,
    Grid2X2,
    GraduationCap,
    Hash,
    Edit3,
    Inbox,
    List,
    LayoutDashboard,
    LogOut,
    MailCheck,
    Map as MapIcon,
    MapPin,
    Monitor,
    MoreVertical,
    PanelLeftClose,
    PanelLeftOpen,
    Paperclip,
    Plus,
    RefreshCcw,
    Route as RouteIcon,
    Search,
    Send,
    School,
    ShieldCheck,
    Smartphone,
    Sparkles,
    Star,
    Target,
    Terminal,
    Trash2,
    Upload,
    UserPlus,
    UsersRound,
    X,
} from 'lucide-react';
import '../css/app.css';

const roleLabels = {
    admin: 'Admin',
    university: 'University',
    school: 'School',
    high_school: 'High School',
    student: 'Student',
};

function cx(...classes) {
    return classes.filter(Boolean).join(' ');
}

function clearStoredSpaAuth() {
    window.localStorage.removeItem('scalecampuslab.auth.token');
    window.localStorage.removeItem('scalecampuslab.auth.user');
}

async function apiRequest(url, options = {}) {
    const storedToken = typeof window !== 'undefined'
        ? window.localStorage.getItem('scalecampuslab.auth.token')
        : null;
    const headers = {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
        ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
        ...(options.headers || {}),
    };
    const response = await fetch(url, { credentials: 'same-origin', ...options, headers });
    const payload = response.status === 204 ? null : await response.json().catch(() => null);

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error('Your dashboard session needs to be refreshed. Please sign out, then open the demo dashboard again.');
        }
        const validationMessage = payload?.errors ? Object.values(payload.errors).flat().find(Boolean) : null;
        const message = validationMessage || payload?.message || `Request failed with status ${response.status}.`;
        throw new Error(message === 'Unauthenticated.' ? 'Your dashboard session needs to be refreshed. Please sign out, then open the demo dashboard again.' : message);
    }

    return payload;
}

function exportRowsToCsv(filename, rows = []) {
    if (typeof window === 'undefined' || !Array.isArray(rows) || rows.length === 0) return;

    const escapeCell = (value) => {
        if (value === null || value === undefined) return '';
        let content = String(value);
        if (typeof value === 'string' && /^[=+\-@]/.test(content)) content = `'${content}`;
        return `"${content.replaceAll('"', '""')}"`;
    };
    const csv = rows.map((row) => (Array.isArray(row) ? row : [row]).map(escapeCell).join(',')).join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'export.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

class AppErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    render() {
        if (this.state.error) {
            const resetWorkspace = (event) => {
                event.preventDefault();
                if (typeof window !== 'undefined') {
                    Object.keys(window.sessionStorage || {})
                        .filter((key) => key.startsWith('scalecampus.activeTab.'))
                        .forEach((key) => window.sessionStorage.removeItem(key));
                    window.location.assign(window.location.pathname || '/login');
                }
            };

            return (
                <CenteredShell>
                    <section className="w-full max-w-lg rounded-3xl border border-red-300/30 bg-black/55 p-7 text-center shadow-2xl backdrop-blur">
                        <ShieldCheck className="mx-auto text-red-300" size={30} />
                        <h1 className="mt-4 text-2xl font-black text-white">We could not load this workspace</h1>
                        <p className="mt-2 text-sm leading-6 text-white/60">Please reload the workspace. If this continues, sign out and sign in again.</p>
                        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                            <a href="/dashboard" onClick={resetWorkspace} className="inline-flex rounded-xl bg-lime-300 px-4 py-2.5 text-sm font-black text-black">Reload workspace</a>
                            <a href="/logout" onClick={(event) => { event.preventDefault(); clearStoredSpaAuth(); document.getElementById('fallback-logout')?.submit(); }} className="inline-flex rounded-xl border border-white/15 px-4 py-2.5 text-sm font-black text-white">Sign out</a>
                        </div>
                        <form id="fallback-logout" action="/logout" method="POST" className="hidden"><input type="hidden" name="_token" value={document.querySelector('meta[name=csrf-token]')?.content || ''} /></form>
                    </section>
                </CenteredShell>
            );
        }

        return this.props.children;
    }
}

class DashboardSectionBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        console.error('Dashboard section failed:', error, info);
    }

    render() {
        if (this.state.error) {
            return (
                <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Section recovery</p>
                            <h2 className="mt-1 text-xl font-black text-slate-950">This section could not render safely.</h2>
                            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-amber-900">The workspace is still active. Go back to Overview and continue working while the section error is reviewed.</p>
                        </div>
                        <button type="button" onClick={this.props.onReset} className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Back to Overview</button>
                    </div>
                </section>
            );
        }

        return this.props.children;
    }
}

function App() {
    const mount = document.getElementById('app');
    const page = mount.dataset.page;
    const props = JSON.parse(mount.dataset.props || '{}');
    const errors = JSON.parse(mount.dataset.errors || '{}');
    const old = JSON.parse(mount.dataset.old || '{}');
    const csrf = mount.dataset.csrf;
    const flash = JSON.parse(mount.dataset.flash || '{}');

    if (page === 'success') {
        return <SuccessPage email={props.email} />;
    }

    if (page === 'admin-login') {
        return <AdminLogin csrf={csrf} errors={errors} />;
    }

    if (page === 'admin') {
        return <AdminDashboard csrf={csrf} {...props} />;
    }

    if (page === 'login') {
        return <LoginPage csrf={csrf} errors={errors} old={old} {...props} />;
    }

    if (page === 'mfa-challenge') {
        return <MfaChallengePage csrf={csrf} errors={errors} flash={flash} {...props} />;
    }

    if (page === 'forgot-password') {
        return <ForgotPasswordPage csrf={csrf} errors={errors} old={old} flash={JSON.parse(mount.dataset.flash || '{}')} {...props} />;
    }

    if (page === 'dashboard') {
        return <RoleDashboard csrf={csrf} errors={errors} old={old} flash={flash} {...props} />;
    }

    return <LandingPage csrf={csrf} errors={errors} old={old} signupCount={props.signupCount} />;
}

function EmptyState({ message, title = 'No records yet', action }) {
    return (
        <div className="grid place-items-center rounded-2xl border border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-white px-4 py-8 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e5eeff] text-[#006a61]">
                <Inbox size={20} />
            </span>
            <p className="mt-3 text-sm font-black text-slate-950">{title}</p>
            <p className="mt-1 max-w-sm text-sm font-semibold leading-6 text-slate-500">{message}</p>
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

function BrandMark() {
    return (
        <a href="/" className="flex items-center gap-3" aria-label="ScaleCampusLab home">
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-white/10 text-white shadow-lg shadow-emerald-500/10 backdrop-blur">
                <GraduationCap size={23} strokeWidth={2.4} />
            </span>
            <span className="leading-tight">
                <span className="block text-lg font-bold tracking-normal text-white">ScaleCampusLab</span>
                <span className="block text-xs font-medium uppercase tracking-wider text-white/50">Campus visits simplified</span>
            </span>
        </a>
    );
}

function LandingPage({ csrf, errors, old, signupCount }) {
    const moveGridSpotlight = (event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty('--grid-x', `${event.clientX - rect.left}px`);
        event.currentTarget.style.setProperty('--grid-y', `${event.clientY - rect.top}px`);
    };

    return (
        <main className="min-h-screen bg-[#f8f4f2] p-2 text-slate-950 sm:p-3">
            <section
                className="infinite-grid-bg relative mx-auto min-h-[min(760px,calc(100vh-1rem))] max-w-[430px] overflow-hidden rounded-[2rem] bg-[#fbf8f7] sm:min-h-[calc(100vh-1.5rem)] sm:max-w-none sm:rounded-[1.6rem]"
                onMouseMove={moveGridSpotlight}
            >
                <div className="infinite-grid-wash" aria-hidden="true" />
                <div className="infinite-grid-layer infinite-grid-layer-soft" aria-hidden="true" />
                <div className="infinite-grid-layer infinite-grid-layer-focus" aria-hidden="true" />

                <section className="relative z-10 mx-auto flex min-h-[min(760px,calc(100vh-1rem))] max-w-3xl flex-col items-center justify-center px-5 py-10 text-center sm:min-h-[calc(100vh-1.5rem)] sm:py-12">
                    <img
                        src="/images/scalecampus-labs-logo.png"
                        alt="ScaleCampus Labs"
                        className="h-auto w-28 rounded-lg object-contain sm:w-36"
                    />

                    <h1 className="mt-7 max-w-[39rem] font-serif text-[2.35rem] font-normal leading-[1.04] tracking-normal text-[#262323] sm:text-[3.45rem]">
                        Campus visit planning, finally coordinated
                    </h1>
                    <p className="mt-3 max-w-[42rem] text-sm font-normal leading-6 text-[#555151] sm:text-[17px] sm:leading-7">
                        ScaleCampusLab gives universities and schools one organized workspace for outreach visits, approvals, schedules, student participation, and follow-up. Join the waitlist to be notified when early access opens.
                    </p>

                    <WaitlistForm csrf={csrf} errors={errors} old={old} />

                </section>
            </section>
            <WaitlistFaqs />
        </main>
    );
}

function WaitlistFaqs() {
    const faqs = [
        ['What is ScaleCampusLab?', 'ScaleCampusLab is a coordination platform for university outreach teams and school partners. It keeps visit requests, approvals, itineraries, student attendance, and follow-up in one place.'],
        ['Who is it built for?', 'It is built for university recruitment and outreach teams, school administrators, guidance counselors, and education partners who coordinate student-facing visits.'],
        ['Does joining create an account?', 'No. The waitlist only records your email so we can notify you when early access opens. It does not create a dashboard account, password, payment, or application.'],
        ['What happens after I join?', 'You will receive launch updates and setup instructions when early access is ready. University and school workspaces will be onboarded separately.'],
    ];

    return (
        <section className="mx-auto w-full max-w-4xl px-5 py-16 text-left sm:py-20 lg:py-24">
            <div className="mx-auto mb-8 max-w-2xl text-center">
                <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-500">FAQ</p>
                <h2 className="mt-3 font-serif text-3xl font-normal tracking-normal text-[#262323] sm:text-[2.75rem]">Before you join the waitlist</h2>
                <p className="mt-3 text-[15px] font-normal leading-7 text-slate-600">
                    Clear answers for teams evaluating ScaleCampusLab before launch.
                </p>
            </div>
            <div className="mx-auto grid max-w-2xl gap-2.5">
                {faqs.map(([question, answer]) => (
                    <details key={question} className="group rounded-2xl border border-slate-200/80 bg-white/80 px-5 py-4 shadow-[0_10px_28px_rgba(15,23,42,.045)] backdrop-blur">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-[15px] font-medium text-slate-900 marker:hidden sm:text-base">
                            <span>{question}</span>
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-base font-normal leading-none text-slate-600 transition group-open:rotate-45">+</span>
                        </summary>
                        <p className="mt-3 max-w-[38rem] text-sm font-normal leading-7 text-slate-600">{answer}</p>
                    </details>
                ))}
            </div>
        </section>
    );
}

function WaitlistForm({ csrf, errors, old }) {
    return (
        <section id="waitlist" className="mt-8 w-full max-w-[31rem]">
            <form action="/waitlist" method="POST">
                <input type="hidden" name="_token" value={csrf} />
                <input type="hidden" name="consent" value="1" />
                <div className="flex flex-col gap-2.5 rounded-[1.8rem] border border-[#dedcda] bg-[#efefee] p-1.5 shadow-[0_14px_32px_rgba(15,23,42,.06)] sm:h-[4.25rem] sm:flex-row sm:items-center sm:gap-2 sm:rounded-full">
                    <label htmlFor="email" className="sr-only">Your email address</label>
                    <div className="min-w-0 flex-1 px-4 py-3 text-left sm:px-6 sm:py-0">
                        <input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="Your email address"
                            defaultValue={old.email || ''}
                            autoComplete="email"
                            required
                            className="w-full min-w-0 bg-transparent text-base font-normal text-[#262323] outline-none placeholder:text-[#5a5757] sm:text-lg"
                        />
                    </div>
                    <button className="h-12 shrink-0 rounded-[1.45rem] bg-[#242222] px-6 text-base font-medium text-white transition hover:bg-black sm:h-14 sm:min-w-[10rem] sm:rounded-full">
                        Join waitlist
                    </button>
                </div>
                {errors.email?.[0] && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{errors.email[0]}</p>}
                {(errors.full_name?.[0] || errors.role?.[0] || errors.consent?.[0]) && (
                    <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">Please refresh and try again.</p>
                )}
            </form>
        </section>
    );
}

function Field({ label, name, type = 'text', error, ...props }) {
    return (
        <div>
            <label htmlFor={name} className="text-sm font-bold text-white/85">{label}</label>
            <input
                id={name}
                name={name}
                type={type}
                className={cx(
                    'mt-2 w-full rounded-xl border bg-black/35 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-white/35 focus:ring-4 focus:ring-white/10',
                    error ? 'border-red-300/80' : 'border-white/12'
                )}
                {...props}
            />
            {error && <p className="mt-2 text-sm font-semibold text-red-300">{error}</p>}
        </div>
    );
}

function Signal({ label, value }) {
    return (
        <article className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-xl shadow-black/10 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">{label}</p>
            <p className="mt-2 text-lg font-light text-white">{value}</p>
        </article>
    );
}

function EarlyAccessLogo() {
    return (
        <a
            href="/"
            aria-label="ScaleCampusLab home"
            className="grid h-11 w-11 place-items-center rounded-2xl bg-lime-300 text-black shadow-[0_0_36px_rgba(217,255,0,.22)]"
        >
            <GraduationCap size={23} strokeWidth={2.5} />
        </a>
    );
}

function AudienceStrip({ signupCount }) {
    const people = [
        ['A', 'from-sky-300 to-blue-700'],
        ['M', 'from-stone-200 to-stone-700'],
        ['K', 'from-orange-200 to-rose-700'],
        ['T', 'from-emerald-200 to-teal-800'],
        ['S', 'from-fuchsia-200 to-purple-800'],
    ];

    return (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <div className="flex -space-x-2">
                {people.map(([initial, gradient]) => (
                    <span
                        key={initial}
                        className={cx(
                            'grid h-7 w-7 place-items-center rounded-full border-2 border-[#101010] bg-gradient-to-br text-[11px] font-black text-white shadow-lg',
                            gradient
                        )}
                    >
                        {initial}
                    </span>
                ))}
            </div>
            <p className="text-sm font-semibold text-white/34">
                Join {Number(signupCount).toLocaleString()}+ others waiting for launch news
            </p>
        </div>
    );
}

function Countdown({ timeLeft }) {
    const items = [
        ['Days', timeLeft.days],
        ['Hours', timeLeft.hours],
        ['Minutes', timeLeft.minutes],
        ['Seconds', timeLeft.seconds],
    ];

    return (
        <div className="mt-6 flex items-center justify-center gap-4 sm:gap-7">
            {items.map(([label, value], index) => (
                <React.Fragment key={label}>
                    {index > 0 && <span className="text-white/14">:</span>}
                    <div className="min-w-12 text-center">
                        <div className="text-xl font-medium text-white tabular-nums">{String(value).padStart(2, '0')}</div>
                        <div className="mt-1 text-[10px] font-bold uppercase tracking-normal text-white/35">{label}</div>
                    </div>
                </React.Fragment>
            ))}
        </div>
    );
}

function useCountdown(targetDate) {
    const calculate = () => {
        const diff = Math.max(0, new Date(targetDate).getTime() - Date.now());
        const totalSeconds = Math.floor(diff / 1000);

        return {
            days: Math.floor(totalSeconds / 86400),
            hours: Math.floor((totalSeconds % 86400) / 3600),
            minutes: Math.floor((totalSeconds % 3600) / 60),
            seconds: totalSeconds % 60,
        };
    };

    const [timeLeft, setTimeLeft] = useState(calculate);

    useEffect(() => {
        const timer = setInterval(() => setTimeLeft(calculate()), 1000);
        return () => clearInterval(timer);
    }, [targetDate]);

    return timeLeft;
}

function SuccessPage({ email }) {
    return (
        <CenteredShell>
            <div className="mx-auto max-w-xl rounded-[2rem] border border-white/15 bg-black/55 p-8 text-center shadow-2xl shadow-black/40 backdrop-blur-2xl">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-emerald-300/30 bg-emerald-400/15 text-emerald-200">
                    <MailCheck size={32} />
                </div>
                <h1 className="mt-6 text-4xl font-light tracking-normal text-white">You will hear from us at launch</h1>
                <p className="mt-4 text-white/65">
                    {email ? `We will notify ${email} when ScaleCampusLab officially launches.` : 'We will notify you when ScaleCampusLab officially launches.'} No account has been created, and you do not need to set a password.
                </p>
                <a href="/" className="mt-7 inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-red-500/25 hover:bg-red-700">
                    Back to Home
                    <ArrowRight size={18} />
                </a>
            </div>
        </CenteredShell>
    );
}

function AdminLogin({ csrf, errors }) {
    return (
        <CenteredShell>
            <div className="mx-auto max-w-md rounded-[2rem] border border-white/15 bg-black/55 p-7 shadow-2xl shadow-black/40 backdrop-blur-2xl">
                <BrandMark />
                <div className="mt-8">
                    <div className="grid h-12 w-12 place-items-center rounded-xl border border-white/15 bg-white/10 text-white">
                        <ShieldCheck size={24} />
                    </div>
                    <h1 className="mt-5 text-3xl font-light tracking-normal text-white">Waitlist admin</h1>
                    <p className="mt-2 text-sm leading-6 text-white/60">Enter the MVP admin password to view and export signups.</p>
                </div>
                <form action="/admin/waitlist/login" method="POST" className="mt-7 space-y-5">
                    <input type="hidden" name="_token" value={csrf} />
                    <Field label="Password" name="password" type="password" error={errors.password?.[0]} autoComplete="current-password" />
                    <button className="w-full rounded-2xl bg-red-600 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-red-500/25 hover:bg-red-700">
                        Open Dashboard
                    </button>
                </form>
            </div>
        </CenteredShell>
    );
}

function LoginPage({ csrf, errors, old, title, subtitle, action, mode }) {
    return (
        <CenteredShell>
            <div className="mx-auto w-full max-w-md rounded-[2rem] border border-white/15 bg-black/55 p-7 shadow-2xl shadow-black/40 backdrop-blur-2xl">
                <div className="flex items-center justify-between">
                    <BrandMark />
                    <span className="rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-xs font-black uppercase tracking-normal text-lime-200">
                        {mode === 'admin' ? 'Admin' : 'Portal'}
                    </span>
                </div>

                <div className="mt-8">
                    <h1 className="text-3xl font-semibold tracking-normal text-white">{title}</h1>
                    <p className="mt-2 text-sm leading-6 text-white/55">{subtitle}</p>
                </div>

                <form action={action} method="POST" className="mt-7 space-y-5">
                    <input type="hidden" name="_token" value={csrf} />
                    <Field label="Email address" name="email" type="email" defaultValue={old.email || ''} error={errors.email?.[0]} autoComplete="email" />
                    <Field label="Password" name="password" type="password" error={errors.password?.[0]} autoComplete="current-password" />
                    <div className="flex items-center justify-between gap-3 text-sm">
                        <label className="flex items-center gap-2 text-white/55">
                            <input name="remember" value="1" type="checkbox" className="h-4 w-4 rounded border-white/20 bg-black text-lime-300" />
                            Remember me
                        </label>
                        <a href="/forgot-password" className="font-bold text-lime-200 hover:text-lime-100">Forgot password?</a>
                    </div>
                    <button className="w-full rounded-2xl bg-lime-300 px-5 py-3.5 text-sm font-black text-black shadow-[0_0_24px_rgba(217,255,0,.18)] hover:bg-lime-200">
                        Sign in
                    </button>
                </form>

                <div className="mt-6 text-center text-xs leading-6 text-white/45">
                    {mode === 'admin' ? (
                        <a href="/login" className="mt-3 inline-flex font-bold text-lime-200 hover:text-lime-100">Use university, school, or student login</a>
                    ) : (
                        <a href="/admin/login" className="mt-3 inline-flex font-bold text-lime-200 hover:text-lime-100">Use admin login</a>
                    )}
                </div>
            </div>
        </CenteredShell>
    );
}

function ForgotPasswordPage({ csrf, errors, old, action, flash }) {
    return (
        <CenteredShell>
            <div className="mx-auto w-full max-w-md rounded-[2rem] border border-white/15 bg-black/55 p-7 shadow-2xl shadow-black/40 backdrop-blur-2xl">
                <BrandMark />
                <h1 className="mt-8 text-3xl font-semibold tracking-normal text-white">Reset password</h1>
                <p className="mt-2 text-sm leading-6 text-white/55">Enter your email and we will send a password reset link when mail is configured.</p>
                {flash?.status && <p className="mt-4 rounded-xl border border-lime-300/20 bg-lime-300/10 p-3 text-sm font-semibold text-lime-100">{flash.status}</p>}
                <form action={action} method="POST" className="mt-7 space-y-5">
                    <input type="hidden" name="_token" value={csrf} />
                    <Field label="Email address" name="email" type="email" defaultValue={old.email || ''} error={errors.email?.[0]} autoComplete="email" />
                    <button className="w-full rounded-2xl bg-lime-300 px-5 py-3.5 text-sm font-black text-black shadow-[0_0_24px_rgba(217,255,0,.18)] hover:bg-lime-200">
                        Send reset link
                    </button>
                </form>
            </div>
        </CenteredShell>
    );
}

function RoleDashboard({ csrf, role, title, subtitle, metrics, actions, roadmap = {}, events = [], scheduleEvents = [], registrations = [], users = [], schools = [], schoolAccounts = [], students = [], visitRequests = [], itineraryItems = [], archives = [], tasks = [], analytics = {}, messages = [], schoolProfile = {}, securityProfile = {}, universityOverview = {}, universitySettings = {}, universityCompliance = {}, systemHealth = {}, platformSettings = {}, waitlist = {}, programs = [], admissionApplications = [], studentPortfolio = {}, notifications = {}, contentManagement = {}, errors = {}, old = {}, flash = {} }) {
    const navGroups = dashboardNavGroups(role);
    const navItems = flatNavItems(navGroups);
    const defaultActiveId = navItems[0]?.id || 'overview';
    const storageKey = `scalecampus.activeTab.${role}`;
    const [dashboardData, setDashboardData] = useState({ metrics, roadmap, events, scheduleEvents, registrations, users, schools, schoolAccounts, students, visitRequests, itineraryItems, archives, tasks, analytics, messages, schoolProfile, securityProfile, universityOverview, universitySettings, universityCompliance, systemHealth, platformSettings, waitlist, programs, admissionApplications, studentPortfolio, notifications, contentManagement });
    const [formErrors, setFormErrors] = useState(errors);
    const [formOld, setFormOld] = useState(old);
    const [localFlash, setLocalFlash] = useState(flash);
    const [submitting, setSubmitting] = useState(false);
    const [activeId, setActiveId] = useState(() => {
        const hash = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : null;
        if (navItems.some((item) => item.id === hash)) {
            return hash;
        }
        const saved = typeof window !== 'undefined' ? window.sessionStorage.getItem(storageKey) : null;
        return navItems.some((item) => item.id === saved) ? saved : defaultActiveId;
    });
    const selectTab = (id) => {
        setActiveId(id);
        if (typeof window !== 'undefined') {
            window.sessionStorage.setItem(storageKey, id);
            window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${id}`);
        }
    };
    useEffect(() => {
        if (!navItems.some((item) => item.id === activeId)) {
            selectTab(defaultActiveId);
        }
    }, [activeId, navGroups, defaultActiveId]);
    useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const handleDashboardSubmit = async (event) => {
            const form = event.target;
            if (event.defaultPrevented) return;
            if (!(form instanceof HTMLFormElement) || !form.closest('[data-dashboard-app]')) return;
            const action = form.getAttribute('action') || '';
            if (action.includes('/logout') || form.dataset.nativeSubmit === 'true') return;

            event.preventDefault();
            window.sessionStorage.setItem(storageKey, activeId);
            const submitter = event.submitter instanceof HTMLButtonElement ? event.submitter : null;
            const originalText = submitter?.textContent || '';
            if (submitter) {
                submitter.disabled = true;
                submitter.classList.add('cursor-wait', 'opacity-70');
                submitter.textContent = submitter.dataset.loadingText || 'Working...';
            }
            setSubmitting(true);

            try {
                const method = (form.method || 'POST').toUpperCase();
                const formData = new FormData(form);
                const requestUrl = new URL(form.action || window.location.href, window.location.origin);
                if (method === 'GET') {
                    requestUrl.search = new URLSearchParams(formData).toString();
                }
                const response = await fetch(requestUrl, {
                    method,
                    body: method === 'GET' || method === 'HEAD' ? undefined : formData,
                    headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'text/html,application/xhtml+xml' },
                    credentials: 'same-origin',
                    redirect: 'follow',
                });
                const html = await response.text();
                if (!response.ok) {
                    throw new Error(`Action failed with status ${response.status}.`);
                }
                const parsed = new DOMParser().parseFromString(html, 'text/html');
                const nextApp = parsed.getElementById('app');

                if (nextApp?.dataset.props) {
                    const nextProps = JSON.parse(nextApp.dataset.props || '{}');
                    const nextErrors = JSON.parse(nextApp.dataset.errors || '{}');
                    const nextOld = JSON.parse(nextApp.dataset.old || '{}');
                    const nextFlash = JSON.parse(nextApp.dataset.flash || '{}');
                    const hasErrors = Object.values(nextErrors || {}).flat().filter(Boolean).length > 0;
                    setDashboardData((current) => ({
                        ...current,
                        metrics: nextProps.metrics ?? current.metrics,
                        roadmap: nextProps.roadmap ?? current.roadmap,
                        events: nextProps.events ?? current.events,
                        scheduleEvents: nextProps.scheduleEvents ?? current.scheduleEvents,
                        registrations: nextProps.registrations ?? current.registrations,
                        users: nextProps.users ?? current.users,
                        schools: nextProps.schools ?? current.schools,
                        schoolAccounts: nextProps.schoolAccounts ?? current.schoolAccounts,
                        students: nextProps.students ?? current.students,
                        visitRequests: nextProps.visitRequests ?? current.visitRequests,
                        itineraryItems: nextProps.itineraryItems ?? current.itineraryItems,
                        archives: nextProps.archives ?? current.archives,
                        tasks: nextProps.tasks ?? current.tasks,
                        analytics: nextProps.analytics ?? current.analytics,
                        messages: nextProps.messages ?? current.messages,
                        schoolProfile: nextProps.schoolProfile ?? current.schoolProfile,
                        securityProfile: nextProps.securityProfile ?? current.securityProfile,
                        universityOverview: nextProps.universityOverview ?? current.universityOverview,
                        universitySettings: nextProps.universitySettings ?? current.universitySettings,
                        universityCompliance: nextProps.universityCompliance ?? current.universityCompliance,
                        systemHealth: nextProps.systemHealth ?? current.systemHealth,
                        platformSettings: nextProps.platformSettings ?? current.platformSettings,
                        waitlist: nextProps.waitlist ?? current.waitlist,
                        programs: nextProps.programs ?? current.programs,
                        admissionApplications: nextProps.admissionApplications ?? current.admissionApplications,
                        studentPortfolio: nextProps.studentPortfolio ?? current.studentPortfolio,
                        notifications: nextProps.notifications ?? current.notifications,
                        contentManagement: nextProps.contentManagement ?? current.contentManagement,
                    }));
                    setFormErrors(nextErrors);
                    setFormOld(nextOld);
                    setLocalFlash(hasErrors ? { status: 'Please fix the highlighted fields before continuing.', type: 'warning' } : nextFlash);
                    if (!hasErrors) {
                        form.reset();
                    }
                } else throw new Error('The server did not return updated workspace data.');
            } catch (error) {
                setLocalFlash({ status: 'Action could not complete. Please try again.', type: 'error' });
            } finally {
                if (submitter?.isConnected) {
                    submitter.disabled = false;
                    submitter.classList.remove('cursor-wait', 'opacity-70');
                    submitter.textContent = originalText || submitter.textContent || 'Submit';
                }
                setSubmitting(false);
            }
        };

        document.addEventListener('submit', handleDashboardSubmit);
        return () => document.removeEventListener('submit', handleDashboardSubmit);
    }, [activeId, storageKey]);
    const activeTitle = navItems.find((item) => item.id === activeId)?.title || 'Overview';
    const content = dashboardContent(role, activeId, dashboardData.metrics, actions, { csrf, ...dashboardData, errors: formErrors, old: formOld, flash: localFlash, setActiveId: selectTab });
    const showMetrics = !content.custom && Array.isArray(content.metrics) && content.metrics.length > 0;

    return (
        <DashboardFrame
            csrf={csrf}
            role={role}
            title={title}
            subtitle={subtitle}
            activeId={activeId}
            activeTitle={activeTitle}
            navGroups={navGroups}
            onSelect={selectTab}
            notifications={dashboardData.notifications}
        >
            <div className="flex flex-col gap-6" data-dashboard-app>
                {submitting && <p className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">Saving...</p>}
                {localFlash?.status && <p className={cx('rounded-lg border px-4 py-3 text-sm font-semibold', localFlash.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : localFlash.type === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800')}>{localFlash.status}</p>}
                {showMetrics && <MetricGrid metrics={content.metrics} />}
                <DashboardSectionBoundary key={`${role}-${activeId}`} onReset={() => selectTab(defaultActiveId)}>
                    {content.custom || (
                        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
                            <DataPanel title={content.primary.title} description={content.primary.description} rows={content.primary.rows} columns={content.primary.columns} empty={content.primary.empty} />
                            <ActionPanel title={content.secondary.title} items={content.secondary.items} />
                        </div>
                    )}
                </DashboardSectionBoundary>
            </div>
        </DashboardFrame>
    );
}

function MfaChallengePage({ csrf, errors, flash, maskedEmail, expiresAt, action, resendAction }) {
    const challengeError = errors.challenge_token?.[0];

    return (
        <CenteredShell>
            <div className="mx-auto w-full max-w-md rounded-[2rem] border border-white/15 bg-black/55 p-7 shadow-2xl shadow-black/40 backdrop-blur-2xl">
                <div className="flex items-center justify-between">
                    <BrandMark />
                    <span className="rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-xs font-black uppercase tracking-normal text-lime-200">Secure sign in</span>
                </div>
                <div className="mt-8">
                    <div className="grid h-12 w-12 place-items-center rounded-xl border border-white/15 bg-white/10 text-white"><ShieldCheck size={24} /></div>
                    <h1 className="mt-5 text-3xl font-semibold tracking-normal text-white">Enter your sign-in code</h1>
                    <p className="mt-2 text-sm leading-6 text-white/55">We sent a six-digit, one-time code to {maskedEmail || 'your email address'}.</p>
                    {expiresAt && <p className="mt-1 text-xs font-semibold text-white/40">The code expires shortly and can only be used once.</p>}
                </div>
                {flash?.status && <p className="mt-4 rounded-xl border border-lime-300/20 bg-lime-300/10 p-3 text-sm font-semibold text-lime-100">{flash.status}</p>}
                {challengeError && <p className="mt-4 rounded-xl border border-red-300/25 bg-red-400/10 p-3 text-sm font-semibold text-red-100">{challengeError}</p>}
                <form action={action} method="POST" className="mt-7 space-y-5">
                    <input type="hidden" name="_token" value={csrf} />
                    <Field label="Verification code" name="code" type="text" error={errors.code?.[0]} inputMode="numeric" pattern="[0-9]{6}" maxLength="6" autoComplete="one-time-code" autoFocus />
                    <button className="w-full rounded-2xl bg-lime-300 px-5 py-3.5 text-sm font-black text-black shadow-[0_0_24px_rgba(217,255,0,.18)] hover:bg-lime-200">Verify and sign in</button>
                </form>
                <form action={resendAction} method="POST" className="mt-3 text-center">
                    <input type="hidden" name="_token" value={csrf} />
                    <button className="text-sm font-bold text-lime-200 hover:text-lime-100">Send a new code</button>
                </form>
                <p className="mt-5 text-center"><a href="/login" className="text-xs font-semibold text-white/45 hover:text-white">Cancel and return to sign in</a></p>
            </div>
        </CenteredShell>
    );
}

function AdminDashboard({ csrf, signups, pagination, stats }) {
    const metrics = [
        { label: 'Total signups', value: stats.total, trend: 'Captured leads' },
        { label: 'Current page', value: pagination.currentPage, trend: `Page ${pagination.currentPage} of ${pagination.lastPage || 1}` },
        { label: 'Per page', value: signups.length, trend: 'Visible records' },
    ];
    const firstItem = pagination.firstItem || 1;
    const pages = pagination.pages || [];

    return (
        <DashboardFrame
            csrf={csrf}
            role="admin"
            title="Waitlist Operations"
            subtitle="Review notification subscribers and export the launch contact list."
            activeId="waitlist"
            activeTitle="Waitlist"
            navGroups={dashboardNavGroups('admin')}
            onSelect={() => {}}
            logoutAction="/admin/waitlist/logout"
        >
            <div className="flex flex-col gap-6">
                <DashboardHero
                    title="Launch notification signups"
                    subtitle={`${pagination.total} people to notify when ScaleCampusLab launches.`}
                    action={<a href="/admin/waitlist/export" className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 sm:w-auto"><Download size={16} /> Export CSV</a>}
                />
                <MetricGrid metrics={metrics} />
                <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-4 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between md:p-5">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-950">Notification list</h2>
                            <p className="mt-1 text-sm text-gray-500">Public waitlist leads only. These records are not user accounts and have no dashboard role.</p>
                        </div>
                    </div>
                    <div className="space-y-3 p-4 sm:hidden">
                        {signups.length === 0 ? (
                            <p className="rounded-lg bg-gray-50 px-4 py-8 text-center text-sm font-medium text-gray-500">No signups yet.</p>
                        ) : signups.map((signup, index) => (
                            <article key={signup.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <span className="shrink-0 rounded-full bg-gray-950 px-2.5 py-1 text-xs font-semibold text-white">{firstItem + index}</span>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-gray-950">{signup.full_name}</p>
                                        <p className="mt-1 break-all text-sm text-gray-600">{signup.email}</p>
                                    </div>
                                </div>
                                <p className="mt-3 text-xs font-medium text-gray-400">{new Date(signup.created_at).toLocaleString()}</p>
                            </article>
                        ))}
                    </div>
                    <div className="hidden overflow-x-auto sm:block">
                        <table className="w-full min-w-[760px] text-left">
                            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                                <tr>
                                    <th className="px-5 py-3">#</th>
                                    <th className="px-5 py-3">Name</th>
                                    <th className="px-5 py-3">Email</th>
                                    <th className="px-5 py-3">Joined</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {signups.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-5 py-10 text-center font-medium text-gray-500">No signups yet.</td>
                                    </tr>
                                ) : signups.map((signup, index) => (
                                    <tr key={signup.id} className="hover:bg-gray-50">
                                        <td className="px-5 py-4 font-semibold text-gray-500">{firstItem + index}</td>
                                        <td className="px-5 py-4 font-semibold text-gray-950">{signup.full_name}</td>
                                        <td className="px-5 py-4 text-gray-600">{signup.email}</td>
                                        <td className="px-5 py-4 text-gray-500">{new Date(signup.created_at).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 p-4 text-sm sm:p-5">
                        <a href={pagination.previousPageUrl || '#'} className={cx('font-semibold', pagination.previousPageUrl ? 'text-gray-700 hover:text-gray-950' : 'pointer-events-none text-gray-300')}>Previous</a>
                        <div className="flex flex-wrap items-center justify-center gap-1">
                            {pages.map(({ page, url }) => (
                                <a
                                    key={page}
                                    href={url}
                                    className={cx('inline-flex h-9 min-w-9 items-center justify-center rounded-md px-3 text-sm font-semibold', page === pagination.currentPage ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
                                >
                                    {page}
                                </a>
                            ))}
                        </div>
                        <a href={pagination.nextPageUrl || '#'} className={cx('font-semibold', pagination.nextPageUrl ? 'text-gray-700 hover:text-gray-950' : 'pointer-events-none text-gray-300')}>Next</a>
                    </div>
                </section>
            </div>
        </DashboardFrame>
    );
}

function DashboardFrame({ csrf, children, role, title, subtitle, activeId, activeTitle, navGroups, onSelect, notifications = {}, logoutAction = '/logout' }) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [toast, setToast] = useState(null);
    const workspace = role === 'admin' ? 'ScaleCampusLab HQ' : (role === 'university' ? 'CampusConnect' : `${roleLabels[role]} Workspace`);
    const darkSidebar = true;
    const navItems = flatNavItems(navGroups);
    const compactMobilePage = ['school', 'high_school'].includes(role) && activeId === 'bookings';
    const customHeaderPages = {
        university: ['overview', 'events', 'visit-requests', 'schools', 'attendees', 'calendar', 'insights', 'messages', 'settings'],
        school: ['overview', 'events', 'bookings', 'itinerary', 'students', 'calendar', 'messages', 'reports', 'settings'],
        high_school: ['overview', 'events', 'bookings', 'itinerary', 'students', 'calendar', 'messages', 'reports', 'settings'],
        admin: ['overview', 'universities', 'schools', 'messages', 'content', 'waitlist', 'events', 'users-access', 'analytics', 'system-health', 'settings'],
        student: ['my-visits', 'messages', 'itinerary', 'notifications', 'profile', 'settings'],
    };
    const hideMobilePageHeader = compactMobilePage || (customHeaderPages[role] || []).includes(activeId);

    useEffect(() => {
        if (!toast) return undefined;
        const timeout = window.setTimeout(() => setToast(null), 3200);
        return () => window.clearTimeout(timeout);
    }, [toast]);

    useEffect(() => {
        const lockSubmit = (event) => {
            const form = event.target;
            if (!(form instanceof HTMLFormElement) || form.dataset.noSubmitLock === 'true' || form.closest('[data-dashboard-app]')) {
                return;
            }

            const submitter = event.submitter;
            if (!(submitter instanceof HTMLButtonElement)) {
                return;
            }

            submitter.dataset.originalText = submitter.textContent || '';
            submitter.disabled = true;
            submitter.classList.add('cursor-wait', 'opacity-70');
            submitter.textContent = submitter.dataset.loadingText || 'Working...';

            window.setTimeout(() => {
                if (!submitter.isConnected) return;
                submitter.disabled = false;
                submitter.classList.remove('cursor-wait', 'opacity-70');
                submitter.textContent = submitter.dataset.originalText || submitter.textContent || 'Submit';
            }, 8000);
        };

        document.addEventListener('submit', lockSubmit, true);
        return () => document.removeEventListener('submit', lockSubmit, true);
    }, []);

    const handleSelect = (id) => {
        if (id === 'search') {
            setSearchOpen(true);
            setMobileNavOpen(false);
            return;
        }
        onSelect(id);
        setMobileNavOpen(false);
    };
    const notificationItems = Array.isArray(notifications?.items) ? notifications.items : [];
    const unreadCount = Number(notifications?.unreadCount || 0);
    const openNotifications = () => {
        if (navItems.some((item) => item.id === 'notifications')) {
            handleSelect('notifications');
            return;
        }
        const latest = notificationItems.find((item) => item.unread) || notificationItems[0];
        setToast({
            title: unreadCount ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'Notifications',
            message: latest?.subject || 'You are all caught up.',
        });
    };

    return (
        <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
            <div className="flex min-h-screen w-full overflow-hidden">
                <aside className={cx('fixed inset-y-0 left-0 z-40 hidden shrink-0 transition-all duration-300 md:block', sidebarOpen ? 'w-[276px]' : 'w-0 overflow-hidden')}>
                    <SidebarNav
                        groups={navGroups}
                        activeId={activeId}
                        onSelect={handleSelect}
                        workspace={workspace}
                        role={role}
                        csrf={csrf}
                        logoutAction={logoutAction}
                        dark={darkSidebar}
                    />
                </aside>

                <section className={cx('flex min-w-0 flex-1 flex-col transition-all duration-300', sidebarOpen ? 'md:pl-[276px]' : 'md:pl-0')}>
                    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 shadow-sm shadow-slate-950/[0.02] backdrop-blur-xl md:hidden">
                        <div className="flex min-w-0 items-center gap-3">
                            <a href="/" className="flex min-w-0 items-center gap-2.5" aria-label="ScaleCampus Labs home">
                                <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-slate-200 bg-white">
                                    <img src="/images/brand/scalecampus-logo-light-bg.png" alt="" className="h-9 w-9 object-contain" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block truncate text-base font-black text-slate-950">ScaleCampusLab</span>
                                    <span className="block truncate text-[11px] font-bold text-slate-500">{roleLabels[role]} portal</span>
                                </span>
                            </a>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setSearchOpen(true)}
                                className="grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                                aria-label="Search"
                            >
                                <Search size={18} />
                            </button>
                            <button type="button" onClick={openNotifications} className="relative grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-950" aria-label={`${unreadCount} unread notifications`}>
                                <Bell size={18} />
                                {unreadCount > 0 && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-rose-500" />}
                            </button>
                        </div>
                    </header>

                    <header className="sticky top-0 z-30 hidden h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 shadow-sm shadow-slate-950/[0.02] backdrop-blur-xl md:flex md:px-6">
                        <div className="flex min-w-0 items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="hidden rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-950 md:block"
                                aria-label="Toggle sidebar"
                            >
                                {sidebarOpen ? <PanelLeftClose size={18} strokeWidth={1.6} /> : <PanelLeftOpen size={18} strokeWidth={1.6} />}
                            </button>
                            <div className="min-w-0 text-sm">
                                <p className="truncate text-slate-500">{workspace}</p>
                                <p className="truncate font-black text-slate-950">{activeTitle}</p>
                            </div>
                        </div>
                        <div className="flex flex-1 items-center justify-end gap-3 md:justify-between md:pl-8">
                            <button
                                type="button"
                                onClick={() => setSearchOpen(true)}
                                className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:border-indigo-200 hover:bg-white hover:text-indigo-600 md:flex md:w-[360px] md:items-center md:gap-2 md:px-3 md:text-left md:text-sm md:text-slate-400"
                                aria-label="Search actions"
                            >
                                <Search size={16} />
                                <span className="hidden md:inline">Search pages, records, or actions...</span>
                            </button>
                            <div className="flex items-center gap-3">
                                <button type="button" onClick={openNotifications} className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:text-indigo-600" aria-label={`${unreadCount} unread notifications`}>
                                    <Bell size={17} />
                                    {unreadCount > 0 && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-indigo-500" />}
                                </button>
                                <div className="hidden text-right md:block">
                                    <p className="text-sm font-black text-slate-950">{roleLabels[role]} User</p>
                                    <p className="text-xs font-semibold text-slate-400">{roleLabels[role]} portal</p>
                                </div>
                                <div className="grid h-10 w-10 place-items-center rounded-full bg-indigo-600 text-sm font-black text-white shadow-sm shadow-indigo-600/25">
                                    {roleLabels[role]?.charAt(0) || 'A'}
                                </div>
                            </div>
                        </div>
                    </header>

                    {!hideMobilePageHeader && (
                        <div className="border-b border-slate-200 bg-white px-4 py-4 md:hidden">
                            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{workspace}</p>
                            <h1 className="mt-1 truncate text-2xl font-black text-slate-950">{activeTitle}</h1>
                            <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">{subtitle || title}</p>
                        </div>
                    )}

                    <div className={cx('flex-1 overflow-y-auto pb-28 md:p-8', hideMobilePageHeader ? 'p-3 sm:p-4' : 'p-4 sm:p-5')}>
                        {children}
                    </div>
                </section>
            </div>

            {mobileNavOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <button type="button" className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} aria-label="Close dashboard menu" />
                    <aside className="relative h-dvh w-[86vw] max-w-[340px] shadow-2xl">
                        <SidebarNav
                            groups={navGroups}
                            activeId={activeId}
                            onSelect={handleSelect}
                            workspace={workspace}
                            role={role}
                            csrf={csrf}
                            logoutAction={logoutAction}
                            onClose={() => setMobileNavOpen(false)}
                            dark={darkSidebar}
                        />
                    </aside>
                </div>
            )}

            {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} navGroups={navGroups} onSelect={(id) => { setSearchOpen(false); handleSelect(id); }} />}
            <MobileBottomDock items={navItems} role={role} activeId={activeId} onSelect={handleSelect} onOpenMore={() => setMobileNavOpen(true)} />
            <Toast toast={toast} onClose={() => setToast(null)} />
        </main>
    );
}

function MobileBottomDock({ items, role, activeId, onSelect, onOpenMore }) {
    const preferred = {
        university: ['overview', 'events', 'visit-requests', 'calendar'],
        school: ['overview', 'events', 'students', 'messages'],
        high_school: ['overview', 'events', 'students', 'messages'],
        student: ['my-visits', 'itinerary', 'notifications', 'profile'],
        admin: ['overview', 'universities', 'events', 'analytics'],
    };
    const ids = preferred[role] || preferred.student;
    const dockItems = ids
        .map((id) => items.find((item) => item.id === id))
        .filter(Boolean);

    return (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl md:hidden" aria-label="Mobile dashboard navigation">
            <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
                {dockItems.map((item) => {
                    const Icon = item.icon;
                    const active = item.id === activeId;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => onSelect(item.id)}
                            className={cx(
                                'flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-2 text-[10px] font-black transition-colors',
                                active ? 'bg-cyan-50 text-[#006a61]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-950'
                            )}
                        >
                            <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
                            <span className="max-w-full truncate">{mobileDockLabel(item.title)}</span>
                        </button>
                    );
                })}
                <button
                    type="button"
                    onClick={onOpenMore}
                    className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-2 text-[10px] font-black text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-950"
                >
                    <PanelLeftOpen size={20} strokeWidth={1.8} />
                    <span>More</span>
                </button>
            </div>
        </nav>
    );
}

function mobileDockLabel(title) {
    const labels = {
        'Platform Overview': 'Overview',
        'Visit Programs': 'Programs',
        'Visit Requests': 'Requests',
        'Partner Schools': 'Schools',
        'Discover Visits': 'Discover',
        'My Requests': 'Requests',
        'My Students': 'Students',
        'My Schedule': 'Schedule',
        'Explore Visits': 'Explore',
        'My Visits': 'Visits',
        'Notifications': 'Alerts',
        'Institutions': 'Institutions',
        'Visit Activity': 'Activity',
    };

    return labels[title] || title;
}

function LightBrandMark() {
    return (
        <a href="/" className="inline-flex" aria-label="ScaleCampus Labs home">
            <img
                src="/images/brand/scalecampus-logo-light-bg.png"
                alt="ScaleCampus Labs"
                className="h-14 w-auto object-contain object-left"
            />
        </a>
    );
}

function SidebarNav({ groups, activeId, onSelect, workspace, role, csrf, logoutAction, onClose, dark = false }) {
    return (
        <div className={cx(
            'flex h-dvh flex-col border-r p-4 shadow-xl backdrop-blur-xl',
            dark ? 'border-white/10 bg-[#061a36] shadow-slate-950/20' : 'border-slate-200 bg-white/95 shadow-slate-950/[0.03]'
        )}>
            <div className={cx('mb-6 border-b pb-5', dark ? 'border-white/10' : 'border-slate-200')}>
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <a href="/" className="block" aria-label="ScaleCampus Labs home">
                            <img
                                src={dark ? '/images/brand/scalecampus-logo-dark-bg.png' : '/images/brand/scalecampus-logo-light-bg.png'}
                                alt="ScaleCampus Labs"
                                className="h-auto w-[205px] object-contain object-left"
                            />
                        </a>
                        <div className={cx('mt-3 inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]', dark ? 'bg-white/10 text-cyan-100' : 'bg-indigo-50 text-indigo-700')}>
                            <span className="truncate">{role === 'university' ? 'University Recruitment OS' : `${roleLabels[role]} portal`}</span>
                        </div>
                    </div>
                    {onClose ? (
                        <button type="button" onClick={onClose} className={cx('rounded-lg p-1', dark ? 'text-white/50 hover:bg-white/10 hover:text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-950')} aria-label="Close menu">
                            <X size={17} />
                        </button>
                    ) : null}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {groups.map((group) => (
                    <div key={group.heading || 'top'} className="mb-5">
                        {group.heading && <p className={cx('mb-2 px-2.5 text-[11px] font-black uppercase tracking-wider', dark ? 'text-white/35' : 'text-slate-400')}>{group.heading}</p>}
                        <div className="space-y-1">
                            {group.items.map((item) => (
                                <SidebarItem key={item.id} item={item} activeId={activeId} onSelect={onSelect} dark={dark} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className={cx('border-t pt-3', dark ? 'border-white/10' : 'border-slate-200')}>
                <div className={cx('mb-2 rounded-xl px-3 py-2.5', dark ? 'bg-white/[0.06]' : 'bg-slate-50')}>
                    <p className={cx('truncate text-xs font-black', dark ? 'text-white' : 'text-slate-950')}>{workspace}</p>
                    <p className={cx('mt-0.5 text-[10px] font-semibold', dark ? 'text-white/40' : 'text-slate-400')}>Signed in workspace</p>
                </div>
                <form action={logoutAction} method="POST" onSubmit={clearStoredSpaAuth}>
                    <input type="hidden" name="_token" value={csrf} />
                    <button className={cx('mt-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-bold', dark ? 'text-white/55 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950')}>
                        <LogOut size={16} strokeWidth={1.6} />
                        Log out
                    </button>
                </form>
            </div>
        </div>
    );
}

function SidebarItem({ item, activeId, onSelect, level = 0, dark = false }) {
    const [open, setOpen] = useState(false);
    const Icon = item.icon;
    const active = activeId === item.id;
    const hasChildren = item.children?.length > 0;

    return (
        <div>
            <button
                type="button"
                onClick={() => hasChildren ? setOpen(!open) : onSelect(item.id)}
                className={cx(
                    'flex w-full items-center justify-between rounded-xl py-2.5 pr-3 text-left text-[13px] font-bold transition-colors',
                    active
                        ? (dark ? 'bg-white text-[#061a36] shadow-lg shadow-black/10' : 'bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-950/[0.02]')
                        : (dark ? 'text-white/60 hover:bg-white/[0.08] hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950')
                )}
                style={{ paddingLeft: `${level * 14 + 10}px` }}
            >
                <span className="flex min-w-0 items-center gap-2.5">
                    <Icon size={16} strokeWidth={1.8} className={active ? (dark ? 'text-[#079ca3]' : 'text-indigo-600') : (dark ? 'text-white/45' : 'text-slate-400')} />
                    <span className="truncate">{item.title}</span>
                </span>
                <span className="flex items-center gap-2">
                    {item.badge && <span className={cx('rounded-full px-1.5 py-0.5 text-[10px] font-black', dark ? 'bg-cyan-400/15 text-cyan-200' : 'bg-indigo-100 text-indigo-700')}>{item.badge}</span>}
                    {hasChildren && <ChevronRight size={14} className={cx(dark ? 'text-white/40' : 'text-slate-400', 'transition-transform', open && 'rotate-90')} />}
                </span>
            </button>
            {hasChildren && open && (
                <div className="mt-0.5 space-y-0.5">
                    {item.children.map((child) => (
                        <SidebarItem key={child.id} item={child} activeId={activeId} onSelect={onSelect} level={level + 1} dark={dark} />
                    ))}
                </div>
            )}
        </div>
    );
}

function SearchOverlay({ onClose, navGroups, onSelect }) {
    const items = flatNavItems(navGroups).filter((item) => item.id !== 'search');

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/25 px-4 pt-[14vh] backdrop-blur-sm">
            <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close search" />
            <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/15">
                <div className="flex items-center border-b border-slate-200 px-4">
                    <Search size={18} className="mr-3 text-slate-400" />
                    <input autoFocus className="flex-1 bg-transparent py-4 text-sm outline-none placeholder:text-slate-400" placeholder="Search dashboard actions..." />
                    <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-950">
                        <X size={18} />
                    </button>
                </div>
                <div className="max-h-80 overflow-y-auto p-2">
                    {items.map((item) => (
                        <button key={item.id} type="button" onClick={() => onSelect(item.id)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-700">
                            <item.icon size={16} className="text-slate-400" />
                            {item.title}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

function SaaSCard({ title, description, action, children, className = '' }) {
    return (
        <section className={cx('rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-950/[0.03]', className)}>
            {(title || description || action) && (
                <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        {title && <h2 className="text-lg font-black text-slate-950">{title}</h2>}
                        {description && <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>}
                    </div>
                    {action && <div className="shrink-0">{action}</div>}
                </div>
            )}
            <div>{children}</div>
        </section>
    );
}

function SaaSTable({ columns = [], rows = [], empty = 'No records yet.' }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                    <tr>{columns.map((column) => <th key={column} className="px-5 py-3">{column}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                    {rows.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length || 1}>
                                <SaaSEmptyState title={empty} description="Create or import records to populate this table." />
                            </td>
                        </tr>
                    ) : rows.map((row, index) => (
                        <tr key={index} className="hover:bg-slate-50">
                            {row.map((cell, cellIndex) => <td key={cellIndex} className="px-5 py-4 font-semibold text-slate-600">{cell}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function SaaSEmptyState({ title = 'Nothing here yet', description, message, action }) {
    const body = description || message || 'New records will appear here when available.';

    return (
        <div className="grid place-items-center px-5 py-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Inbox size={22} />
            </div>
            <p className="mt-4 text-sm font-black text-slate-950">{title}</p>
            <p className="mt-1 max-w-sm text-sm font-semibold leading-6 text-slate-500">{body}</p>
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

function LoadingState({ label = 'Loading workspace...' }) {
    return (
        <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-black text-indigo-700">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
            {label}
        </div>
    );
}

function Toast({ toast, onClose }) {
    if (!toast) return null;

    return (
        <div className="fixed bottom-4 left-1/2 z-[100] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-950/15 md:bottom-5 md:left-auto md:right-5 md:translate-x-0">
            <div className="flex gap-3">
                <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-xl', toast.type === 'error' ? 'bg-rose-50 text-rose-600' : toast.type === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600')}><Bell size={17} /></span>
                <div className="min-w-0 flex-1">
                    <p className="font-black text-slate-950">{toast.title}</p>
                    <p className="mt-1 text-sm leading-5 text-slate-500">{toast.message}</p>
                </div>
                <button type="button" onClick={onClose} className="h-8 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={16} /></button>
            </div>
        </div>
    );
}

function DashboardHero({ title, subtitle, action }) {
    return (
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/[0.03] md:flex-row md:items-center md:justify-between md:p-6">
            <div>
                <h1 className="text-2xl font-black tracking-normal text-slate-950 sm:text-3xl">{title}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{subtitle}</p>
            </div>
            {action && <div className="shrink-0">{typeof action === 'string' ? <button className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-sm shadow-indigo-600/25 hover:bg-indigo-700 sm:w-auto">{action}</button> : action}</div>}
        </div>
    );
}

function MetricGrid({ metrics }) {
    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
                <article key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/[0.03] sm:p-5">
                    <p className="text-sm font-semibold text-slate-500">{metric.label}</p>
                    <p className="mt-3 text-3xl font-black tracking-normal text-slate-950 sm:mt-4">{metric.value}</p>
                    {metric.trend && <p className="mt-2 text-xs font-black text-emerald-600">{metric.trend}</p>}
                </article>
            ))}
        </div>
    );
}

function DataPanel({ title, description, columns, rows, empty }) {
    return (
        <SaaSCard title={title} description={description}>
            <div className="p-4 sm:hidden">
                {rows.length === 0 ? (
                    <SaaSEmptyState title={empty} description="Records will appear here when this workflow has data." />
                ) : rows.map((row, index) => (
                    <article key={index} className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-black text-slate-950">{row[0]}</p>
                        <div className="mt-3 space-y-2">
                            {row.slice(1).map((cell, cellIndex) => (
                                <div key={columns[cellIndex + 1]} className="flex items-start justify-between gap-4 text-sm">
                                    <span className="text-xs font-black uppercase text-slate-400">{columns[cellIndex + 1]}</span>
                                    <span className="text-right font-semibold text-slate-600">{cell}</span>
                                </div>
                            ))}
                        </div>
                    </article>
                ))}
            </div>
            <div className="hidden overflow-x-auto sm:block">
                <SaaSTable columns={columns} rows={rows} empty={empty} />
            </div>
        </SaaSCard>
    );
}

function ActionPanel({ title, items }) {
    return (
        <SaaSCard title={title}>
            <div className="space-y-3 p-5">
                {items.length === 0 ? (
                    <SaaSEmptyState title="No actions available" description="Contextual actions will appear here when available." />
                ) : items.map((item) => (
                    <button key={item} type="button" className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-black text-slate-700 hover:border-indigo-200 hover:bg-white hover:text-indigo-700">
                        <span>{item}</span>
                        <ArrowRight size={15} className="text-slate-400" />
                    </button>
                ))}
            </div>
        </SaaSCard>
    );
}

function RoadmapTracker({ roadmap }) {
    const groups = Object.entries(roadmap || {});
    const items = groups.flatMap(([, milestones]) => milestones);
    const completed = items.filter((item) => item.status === 'completed').length;
    const inProgress = items.filter((item) => item.status === 'in_progress').length;
    const remaining = items.filter((item) => item.status !== 'completed').length;
    const progress = items.length ? Math.round((completed / items.length) * 100) : 0;

    return (
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-950">Visual PRD tracker</h2>
                        <p className="mt-1 text-sm text-gray-500">Feature delivery checklist for the full VisitCampus platform.</p>
                    </div>
                    <div className="min-w-44">
                        <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
                            <span>{completed} of {items.length} completed</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-gray-100">
                            <div className="h-2 rounded-full bg-gray-950" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <MiniStat label="Done" value={completed} />
                    <MiniStat label="In progress" value={inProgress} />
                    <MiniStat label="Remaining" value={remaining} />
                </div>
            </div>
            <div className="grid gap-4 p-4 lg:grid-cols-2">
                {groups.map(([category, milestones]) => (
                    <article key={category} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <h3 className="text-sm font-semibold uppercase tracking-normal text-gray-500">{category}</h3>
                        <div className="mt-3 space-y-3">
                            {milestones.map((milestone) => (
                                <div key={milestone.id} className="flex gap-3 rounded-lg bg-white p-3 shadow-sm">
                                    <RoadmapIcon status={milestone.status} />
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-950">{milestone.title}</p>
                                        <p className="mt-1 text-xs leading-5 text-gray-500">{milestone.description}</p>
                                        <span className={cx('mt-2 inline-flex rounded-full px-2 py-1 text-[11px] font-bold uppercase tracking-normal', milestone.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : milestone.status === 'in_progress' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500')}>
                                            {milestone.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}

function RoadmapIcon({ status }) {
    if (status === 'completed') {
        return <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" />;
    }

    if (status === 'in_progress') {
        return <Activity size={20} className="mt-0.5 shrink-0 text-amber-600" />;
    }

    return <Circle size={20} className="mt-0.5 shrink-0 text-gray-300" />;
}

function EventBuilder({ csrf, errors, old }) {
    return (
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 p-5">
                <h2 className="text-lg font-semibold text-gray-950">Create campus visit</h2>
                <p className="mt-1 text-sm text-gray-500">Publish visits with capacity controls and venue conflict checks.</p>
            </div>
            <form action="/campus-events" method="POST" className="grid gap-4 p-5 md:grid-cols-2">
                <input type="hidden" name="_token" value={csrf} />
                <LightField label="Title" name="title" defaultValue={old.title || ''} error={errors.title?.[0]} />
                <LightField label="Start date and time" name="starts_at" type="datetime-local" defaultValue={old.starts_at || ''} error={errors.starts_at?.[0]} />
                <LightField label="End date and time" name="ends_at" type="datetime-local" defaultValue={old.ends_at || ''} error={errors.ends_at?.[0]} />
                <LightField label="Venue" name="venue" defaultValue={old.venue || ''} error={errors.venue?.[0]} />
                <LightField label="Location" name="location" defaultValue={old.location || ''} error={errors.location?.[0]} />
                <LightField label="Capacity" name="capacity" type="number" min="1" defaultValue={old.capacity || '50'} error={errors.capacity?.[0]} />
                <div className="md:col-span-2">
                    <LightTextarea label="Description" name="description" defaultValue={old.description || ''} error={errors.description?.[0]} />
                </div>
                <div className="flex flex-col gap-3 md:col-span-2 md:flex-row md:items-end md:justify-between">
                    <div>
                        <label htmlFor="status" className="text-sm font-semibold text-gray-700">Publication status</label>
                        <select id="status" name="status" defaultValue={old.status || 'draft'} className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-950 outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-100">
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                        </select>
                    </div>
                    <button className="rounded-md bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800">Save event</button>
                </div>
            </form>
        </section>
    );
}

function UniversityRecruitmentOverview({ csrf, events = [], overview = {}, setSection }) {
    const upcoming = events
        .filter((event) => {
            const startsAt = new Date(event.startsAt || '').getTime();
            return event.status === 'published' && Number.isFinite(startsAt) && startsAt >= Date.now();
        })
        .sort((left, right) => new Date(left.startsAt) - new Date(right.startsAt))
        .slice(0, 4);
    const trend = overview.trend || [];
    const trendMax = Math.max(...trend.map((item) => Number(item.value || 0)), 1);
    const nextVisit = upcoming[0];
    const cycle = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date());
    const cards = [
        ['Visits', overview.totalVisits || 0, 'Live', CalendarDays, 'bg-[#e5eeff] text-[#006a61]'],
        ['Pending', events.filter((event) => event.status === 'draft').length, 'Review', Clock, 'bg-amber-50 text-amber-700'],
        ['Attendance', `${overview.attendanceRate || 0}%`, 'Live', CheckCircle2, 'bg-emerald-50 text-emerald-700'],
        ['Capacity', `${overview.capacityUsage || 0}%`, 'Usage', Activity, 'bg-slate-950 text-white'],
    ];

    return (
        <div className="grid gap-4">
            <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">Administrative Overview</h1>
                    <p className="mt-1 text-sm font-semibold text-slate-500">Recruitment performance summary · {cycle}</p>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                    <button type="button" onClick={() => window.print()} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white md:px-4 md:py-2.5 md:text-sm">Generate Report</button>
                </div>
            </section>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
                {cards.map(([label, value, detail, Icon, tone]) => (
                    <article key={label} className={cx('rounded-xl border border-slate-200 p-3 shadow-sm md:p-4', label === 'Capacity' ? 'bg-slate-950 text-white' : 'bg-white text-slate-950')}>
                        <div className="flex items-start justify-between gap-2">
                            <span className={cx('grid h-7 w-7 place-items-center rounded-lg md:h-8 md:w-8', tone)}><Icon size={16} /></span>
                            <span className={cx('rounded-full px-2 py-0.5 text-[9px] font-black', label === 'Pending' && Number(value) > 0 ? 'bg-amber-100 text-amber-700' : label === 'Capacity' ? 'bg-white/10 text-emerald-200' : 'bg-emerald-50 text-emerald-700')}>{detail}</span>
                        </div>
                        <div className="mt-3">
                            <p className={cx('text-[10px] font-black uppercase tracking-wide', label === 'Capacity' ? 'text-slate-300' : 'text-slate-500')}>{label}</p>
                            <p className="mt-1 text-xl font-black md:text-2xl">{value}</p>
                            {label === 'Capacity' && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-emerald-300" style={{ width: `${Math.min(Number(overview.capacityUsage || 0), 100)}%` }} /></div>}
                        </div>
                    </article>
                ))}
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
                <div className="grid gap-3">
                    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-base font-black text-slate-950">Upcoming Schedule</h2>
                                <p className="mt-0.5 text-xs font-semibold text-slate-500">Published visits and next program activity</p>
                            </div>
                            <button type="button" onClick={() => setSection('calendar')} className="inline-flex items-center gap-1 text-xs font-black text-[#006a61]">Calendar <ChevronRight size={14} /></button>
                        </div>
                        <div className="mt-3 overflow-hidden rounded-lg border border-slate-100">
                            {upcoming.map((event, index) => {
                                const date = event.startsAt ? new Date(event.startsAt) : null;
                                const time = date && !Number.isNaN(date.getTime()) ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBA';
                                const period = date && !Number.isNaN(date.getTime()) ? date.toLocaleTimeString([], { hour: 'numeric', hour12: true }).split(' ')[1] : '';

                                return (
                                    <button key={event.id || index} type="button" onClick={() => setSection('events')} className="flex w-full gap-3 border-b border-slate-100 p-2.5 text-left last:border-b-0 hover:bg-slate-50">
                                        <span className="w-12 shrink-0 pt-0.5 text-center">
                                            <span className="block text-[11px] font-black text-slate-700">{time}</span>
                                            <span className="block text-[9px] font-black uppercase text-slate-400">{period}</span>
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-start justify-between gap-2">
                                                <span className="truncate text-[13px] font-black text-slate-950">{event.title}</span>
                                                <span className={cx('shrink-0 rounded px-1.5 py-0.5 text-[8px] font-black uppercase', event.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>{event.status === 'published' ? 'CONF' : 'PEND'}</span>
                                            </span>
                                            <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-semibold text-slate-500"><MapPin size={12} /> {event.location || event.venue || 'Location pending'}</span>
                                        </span>
                                    </button>
                                );
                            })}
                            {!upcoming.length && <div className="p-8 text-center text-sm font-semibold text-slate-500">No future published visits are scheduled.</div>}
                        </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-base font-black text-slate-950">Insights</h2>
                            <div className="flex gap-1">
                                <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">W</span>
                                <span className="rounded bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-700">M</span>
                            </div>
                        </div>
                        {trend.some((item) => Number(item.value) > 0) ? (
                            <div className="mt-4 flex h-28 items-end gap-1.5 px-1 md:h-40 md:gap-2">
                                {trend.map((item, index) => (
                                    <div key={item.label} className="group flex h-full min-w-0 flex-1 flex-col justify-end gap-1">
                                        <div className={cx('w-full rounded-t-md transition', index === trend.length - 1 ? 'bg-[#006a61]' : 'bg-[#dce9ff]')} style={{ height: `${Math.max(10, (Number(item.value) / trendMax) * 100)}%` }} />
                                        <span className={cx('truncate text-center text-[8px] font-black', index === trend.length - 1 ? 'text-[#006a61]' : 'text-slate-400')}>{index === trend.length - 1 ? 'CUR' : item.label}</span>
                                    </div>
                                ))}
                            </div>
                        ) : <SaaSEmptyState title="No engagement yet" message="Registration activity will build this chart automatically." />}
                    </section>
                </div>

                <aside className="grid content-start gap-3">
                    <section className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-3 shadow-sm md:p-4">
                        <div className="flex items-center gap-2 text-emerald-800"><Sparkles size={16} /><h2 className="font-black">Action Required</h2></div>
                        <div className="mt-3 grid gap-2">
                            <article className="rounded-lg border border-amber-100 border-l-4 border-l-amber-500 bg-white p-2.5">
                                <div className="flex gap-2">
                                    <ShieldCheck size={18} className="mt-0.5 text-amber-600" />
                                    <div className="min-w-0">
                                        <h3 className="truncate text-xs font-black text-slate-950">{events.filter((event) => event.status === 'draft').length} programs need review</h3>
                                        <p className="mt-0.5 text-[11px] font-semibold leading-4 text-slate-500">Publish drafts or update visit capacity before schools request seats.</p>
                                        <button type="button" onClick={() => setSection('events')} className="mt-2 rounded-md border border-[#006a61]/30 px-2 py-1 text-[10px] font-black text-[#006a61]">Review</button>
                                    </div>
                                </div>
                            </article>
                            <button type="button" onClick={() => setSection('visit-requests')} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2.5 text-left hover:bg-slate-50">
                                <span className="flex items-center gap-2 text-xs font-bold text-slate-700"><UserPlus size={17} className="text-slate-400" /> {Number(overview.bookedStudents || 0).toLocaleString()} booked students</span>
                                <ChevronRight size={15} className="text-slate-400" />
                            </button>
                            <button type="button" onClick={() => setSection('messages')} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2.5 text-left hover:bg-slate-50">
                                <span className="flex items-center gap-2 text-xs font-bold text-slate-700"><Send size={17} className="text-slate-400" /> Review communications</span>
                                <ChevronRight size={15} className="text-slate-400" />
                            </button>
                        </div>
                    </section>

                    <section className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-3 shadow-sm md:p-4">
                        <div className="flex items-center gap-2 text-emerald-800"><Sparkles size={16} /><h2 className="font-black">Guide Next</h2></div>
                        <div className="mt-4 rounded-xl border border-emerald-100 bg-white/80 p-4">
                            <p className="text-xs font-black text-emerald-700">Next Program Checklist</p>
                            <p className="mt-2 text-xs leading-5 text-slate-600">{nextVisit ? `Your next hosted program is ${nextVisit.title} at ${nextVisit.location || nextVisit.venue}. Review capacity and attendee communications before arrival.` : 'Create or populate a visit program to receive database-driven planning guidance.'}</p>
                        </div>
                        <button type="button" onClick={() => setSection('calendar')} className="mt-3 w-full rounded-lg border border-[#006a61]/30 bg-white px-3 py-2 text-xs font-black text-[#006a61]">Review Schedule</button>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
                        <div className="flex items-center justify-between"><h2 className="font-black text-slate-950">Upcoming Visits</h2><button type="button" onClick={() => setSection('events')} className="text-xs font-black text-blue-700">View All</button></div>
                        <div className="mt-3 divide-y divide-slate-100">
                            {upcoming.length === 0 ? <p className="py-6 text-sm text-slate-500">No upcoming visits.</p> : upcoming.map((event) => (
                                <button key={event.id} type="button" onClick={() => setSection('events')} className="flex w-full items-start gap-3 py-2.5 text-left">
                                    <span className="w-11 shrink-0 text-center text-[10px] font-black uppercase text-slate-500">{formatShortDate(event.startsAt)}</span>
                                    <span className="min-w-0"><span className="block truncate text-xs font-black text-slate-900">{event.title}</span><span className="mt-1 block truncate text-[10px] text-slate-500">{event.location || event.venue} · {event.confirmedSeats || 0} attendees</span></span>
                                </button>
                            ))}
                        </div>
                    </section>
                </aside>
            </div>
        </div>
    );
}

function UniversityOverviewSection({ events, registrations, schools, analytics, metrics, setSection }) {
    const published = events.filter((event) => event.status === 'published').length;
    const completed = events.filter((event) => event.status === 'completed').length;
    const totalCapacity = events.reduce((sum, event) => sum + Number(event.capacity || 0), 0);
    const bookedSeats = events.reduce((sum, event) => sum + Number(event.confirmedSeats || 0), 0);
    const fillRate = totalCapacity ? Math.round((bookedSeats / totalCapacity) * 100) : 0;
    const upcoming = events.filter((event) => event.status !== 'cancelled').slice(0, 3);
    const recentRegistrations = registrations.slice(0, 5);

    return (
        <div className="grid gap-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Recruitment command center</p>
                        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">University Recruitment Dashboard</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Manage discovery, campus visits, attendee flow, and itinerary planning from database-backed demo records.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => setSection('events')} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white">Create Visit</button>
                        <button onClick={() => setSection('discovery')} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700">Open Discovery</button>
                    </div>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-4">
                    {[
                        ['Published visits', published, '+12%'],
                        ['Registered seats', bookedSeats, `${fillRate}% filled`],
                        ['Target schools', schools.length, '+5%'],
                        ['Projected ROI', `${Math.max(1, Math.round((analytics.engagementAverage || 84) / 24))}.4x`, '+18.4%'],
                    ].map(([label, value, trend]) => (
                        <article key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
                            <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
                            <p className="mt-2 text-xs font-bold text-emerald-600">{trend}</p>
                        </article>
                    ))}
                </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
                <section className="rounded-3xl border border-violet-200 bg-violet-600 p-6 text-white shadow-sm">
                    <p className="text-sm font-black uppercase tracking-wide text-white/80">AI recruitment intelligence</p>
                    <h2 className="mt-3 max-w-2xl text-2xl font-black leading-tight">High-propensity clusters identified in your active school pipeline.</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">Demo data suggests reallocating attention to the strongest target schools and upcoming published visits could increase registration yield.</p>
                    <div className="mt-6 flex gap-3">
                        <button onClick={() => setSection('discovery')} className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-violet-700">View Analysis</button>
                        <button className="rounded-xl bg-white/15 px-4 py-2.5 text-sm font-black text-white">Dismiss</button>
                    </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <h2 className="font-black text-slate-950">Team Activity</h2>
                        <button className="text-xs font-bold text-blue-700">View All</button>
                    </div>
                    <div className="mt-4 space-y-4">
                        {recentRegistrations.length === 0 ? <EmptyState message="No recent activity yet." /> : recentRegistrations.map((registration) => (
                            <div key={registration.id} className="flex gap-3">
                                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-black text-blue-700">{registration.name?.charAt(0) || 'S'}</span>
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">{registration.name} registered for <span className="text-blue-700">{registration.event}</span></p>
                                    <p className="mt-1 text-xs text-slate-400">{registration.status} · {registration.partySize} seat(s)</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-black text-slate-950">Upcoming Visits</h2>
                    <button onClick={() => setSection('events')} className="text-sm font-bold text-blue-700">Manage visits</button>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    {upcoming.length === 0 ? <p className="text-sm text-slate-500">No visits created yet.</p> : upcoming.map((event) => (
                        <article key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-black uppercase text-blue-700">{formatShortDate(event.startsAt)}</p>
                            <h3 className="mt-3 font-black text-slate-950">{event.title}</h3>
                            <p className="mt-1 text-sm text-slate-500">{event.location || event.venue}</p>
                            <p className="mt-3 text-xs font-bold text-slate-500">{event.confirmedSeats}/{event.capacity} registered</p>
                        </article>
                    ))}
                </div>
            </section>
        </div>
    );
}

function UniversityVisitsSection({ csrf, events, registrations, schools = [], settings = {}, errors, old }) {
    const hasEventFormErrors = Boolean((old?.title || old?.venue || old?.starts_at) && Object.keys(errors || {}).length);
    const [editor, setEditor] = useState(hasEventFormErrors ? {} : null);
    const [detail, setDetail] = useState(null);
    const [inviteProgram, setInviteProgram] = useState(null);
    const [status, setStatus] = useState('active');
    const [query, setQuery] = useState('');
    const [date, setDate] = useState('');
    const activeEvents = events.filter((event) => event.status === 'published');
    const draftEvents = events.filter((event) => event.status === 'draft');
    const archivedEvents = events.filter((event) => ['cancelled', 'completed'].includes(event.status));
    const filteredEvents = events.filter((event) => {
        const matchesStatus = status === 'all'
            || (status === 'active' && event.status === 'published')
            || (status === 'draft' && event.status === 'draft')
            || (status === 'archived' && ['cancelled', 'completed'].includes(event.status));
        const matchesQuery = !query || `${event.title} ${event.location} ${event.venue}`.toLowerCase().includes(query.toLowerCase());
        const matchesDate = !date || (event.startsAt || '').slice(0, 10) === date;

        return matchesStatus && matchesQuery && matchesDate;
    });
    const totalRegistrations = events.reduce((total, event) => total + Number(event.confirmedSeats || 0), 0);
    const totalCapacity = events.reduce((total, event) => total + Number(event.capacity || 0), 0);
    const averageFill = totalCapacity ? Math.round((totalRegistrations / totalCapacity) * 100) : 0;
    const published = events.filter((event) => event.status === 'published').length;
    const tabs = [
        ['active', `Active Programs (${activeEvents.length})`],
        ['draft', `Drafts (${draftEvents.length})`],
        ['archived', `Archived (${archivedEvents.length})`],
        ['all', `All (${events.length})`],
    ];

    return (
        <div className="grid gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-950 md:text-3xl">Visit Programs</h1>
                    <p className="mt-1 text-sm font-semibold text-slate-500">Manage recruitment cycles, capacity, and school-facing visit programs.</p>
                </div>
                <button type="button" onClick={() => setEditor({})} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#006a61] px-4 py-2.5 text-sm font-black text-white shadow-sm hover:opacity-90"><Plus size={16} /> Create Program</button>
            </div>

            {editor && <UniversityEventEditor csrf={csrf} event={editor.id ? editor : null} events={events} settings={settings} errors={errors} old={old} onClose={() => setEditor(null)} />}
            {detail && <UniversityProgramDetailModal event={detail} registrations={registrations} schools={schools} onClose={() => setDetail(null)} onEdit={() => { setEditor(detail); setDetail(null); }} onInvite={() => { setInviteProgram(detail); setDetail(null); }} />}
            {inviteProgram && <InviteSchoolsModal csrf={csrf} event={inviteProgram} schools={schools} onClose={() => setInviteProgram(null)} />}

            <div className="grid gap-3 md:grid-cols-2">
                <button type="button" onClick={() => setStatus('archived')} className="flex items-center justify-between rounded-xl bg-slate-950 p-3 text-left text-white shadow-sm">
                    <span className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-emerald-200"><Archive size={18} /></span>
                        <span><span className="block text-sm font-black">Archive Vault</span><span className="text-[11px] font-semibold text-white/60">{archivedEvents.length} historical programs</span></span>
                    </span>
                    <span className="rounded-lg bg-white/10 px-3 py-1 text-xs font-black">View</span>
                </button>
                <div className="grid grid-cols-3 rounded-xl border border-slate-200 bg-[#e5eeff] p-3 shadow-sm">
                    <div className="text-center"><p className="text-xl font-black text-[#006a61]">{published}</p><p className="text-[10px] font-black uppercase text-slate-500">Visits</p></div>
                    <div className="text-center"><p className="text-xl font-black text-blue-700">{totalRegistrations.toLocaleString()}</p><p className="text-[10px] font-black uppercase text-slate-500">Leads</p></div>
                    <div className="text-center"><p className="text-xl font-black text-slate-950">{averageFill || 0}</p><p className="text-[10px] font-black uppercase text-slate-500">Engage</p></div>
                </div>
            </div>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="grid gap-2 border-b border-slate-100 p-3 md:grid-cols-[1fr_180px_160px_auto] md:p-4">
                    <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500"><Search size={15} className="text-[#006a61]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search programs, schools, locations..." className="min-w-0 flex-1 bg-transparent font-semibold outline-none" /></label>
                    <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-500"><CalendarDays size={15} className="text-[#006a61]" /><input value={date} onChange={(event) => setDate(event.target.value)} type="date" className="min-w-0 flex-1 bg-transparent font-semibold outline-none" /></label>
                    <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-500"><Filter size={15} className="text-[#006a61]" /><select value={status} onChange={(event) => setStatus(event.target.value)} className="min-w-0 flex-1 bg-transparent font-semibold outline-none"><option value="active">Active</option><option value="draft">Drafts</option><option value="archived">Archived</option><option value="all">All</option></select></label>
                    <button type="button" onClick={() => { setDate(''); setQuery(''); setStatus('active'); }} className="h-10 px-3 text-xs font-black text-[#006a61]">Clear Filters</button>
                </div>

                <div className="flex gap-6 overflow-x-auto border-b border-slate-200 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {tabs.map(([value, label]) => (
                        <button key={value} type="button" onClick={() => setStatus(value)} className={cx('shrink-0 border-b-2 py-3 text-xs font-black', status === value ? 'border-[#006a61] text-[#006a61]' : 'border-transparent text-slate-400 hover:text-slate-700')}>
                            {label}
                        </button>
                    ))}
                </div>

                <div className="grid gap-2 p-3">
                    {filteredEvents.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm font-semibold text-slate-500">No visit programs match your filters.</div>
                    ) : filteredEvents.map((event) => {
                        const percent = eventCapacityPercent(event);
                        const isDraft = event.status === 'draft';
                        const schoolsLabel = event.location || event.venue || 'No schools assigned yet';

                        return (
                            <article key={event.id} className={cx('rounded-xl border border-slate-200 bg-white px-3 py-3 transition hover:bg-slate-50 md:px-4', isDraft && 'opacity-85')}>
                                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px] md:items-center">
                                    <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center md:gap-4">
                                        <span className={cx('w-fit rounded px-2 py-1 text-[10px] font-black uppercase', event.status === 'published' ? 'bg-emerald-50 text-emerald-700' : event.status === 'draft' ? 'bg-slate-100 text-slate-600' : 'bg-rose-50 text-rose-700')}>{event.status === 'published' ? 'Active' : event.status}</span>
                                        <div className="min-w-0">
                                            <h3 className="truncate text-sm font-black text-slate-950">{event.title}</h3>
                                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-500">
                                                <span className="inline-flex items-center gap-1"><CalendarDays size={13} /> {formatShortDate(event.startsAt)} {event.endsAt ? `- ${formatShortDate(event.endsAt)}` : ''}</span>
                                                <span className="inline-flex min-w-0 items-center gap-1"><School size={13} /> <span className="truncate">{schoolsLabel}</span></span>
                                                <span className="inline-flex items-center gap-1"><MapPin size={13} /> {event.venue || 'Venue pending'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                                        {event.status === 'draft' ? (
                                            <UniversityEventStatusForm csrf={csrf} event={event} status="published" label="Publish" />
                                        ) : event.status === 'published' ? (
                                            <UniversityEventStatusForm csrf={csrf} event={event} status="cancelled" label="Archive" tone="muted" />
                                        ) : (
                                            <UniversityEventStatusForm csrf={csrf} event={event} status="published" label="Restore" />
                                        )}
                                        <div className="flex min-w-[116px] flex-1 items-center gap-2 md:w-44 md:flex-none">
                                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e5eeff]"><div className={cx('h-full rounded-full', percent >= 100 ? 'bg-red-500' : 'bg-[#006a61]')} style={{ width: `${percent}%` }} /></div>
                                            <span className="w-9 text-right text-[11px] font-black text-[#006a61]">{percent}%</span>
                                        </div>
                                        <button type="button" onClick={() => setDetail(event)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm hover:border-[#006a61]/40 hover:bg-emerald-50 hover:text-[#006a61]">Details</button>
                                        <form action={`/campus-events/${event.id}/duplicate`} method="POST">
                                            <input type="hidden" name="_token" value={csrf} />
                                            <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">Copy</button>
                                        </form>
                                        <button type="button" onClick={() => setInviteProgram(event)} className="rounded-xl border border-[#006a61]/25 bg-white px-3 py-2 text-xs font-black text-[#006a61] shadow-sm hover:bg-emerald-50">Invite</button>
                                        <button type="button" onClick={() => setEditor(event)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-[#006a61]/40 hover:bg-emerald-50 hover:text-[#006a61]" aria-label={`Edit ${event.title}`} title={`Edit ${event.title}`}><Edit3 size={16} /></button>
                                        <ConfirmForm csrf={csrf} action={`/campus-events/${event.id}`} method="DELETE" title="Delete visit program?" message={`Delete ${event.title}? This cannot be undone.`} confirmLabel="Delete" className="grid h-8 w-8 place-items-center rounded-lg border border-red-100 text-red-600 hover:bg-red-50" aria-label={`Delete ${event.title}`}>
                                            <Trash2 size={15} />
                                        </ConfirmForm>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>

                <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 text-xs font-semibold text-slate-500 md:flex-row md:items-center md:justify-between">
                    <span>Showing {filteredEvents.length} of {events.length} visit programs</span>
                    <span>Program actions update directly in your database.</span>
                </div>
            </section>
        </div>
    );
}

function ConfirmForm({ csrf, action, method = 'POST', title = 'Confirm action', message = 'This action cannot be undone.', confirmLabel = 'Confirm', tone = 'danger', className = '', children, ...buttonProps }) {
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    return (
        <>
            <button type="button" onClick={() => setOpen(true)} className={className} {...buttonProps}>
                {children || confirmLabel}
            </button>
            {open && (
                <section className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-3xl border border-white/70 bg-white p-5 shadow-2xl">
                        <div className={cx('grid h-11 w-11 place-items-center rounded-2xl', tone === 'danger' ? 'bg-rose-50 text-rose-700' : 'bg-[#e5eeff] text-[#006a61]')}>
                            {tone === 'danger' ? <Trash2 size={20} /> : <CheckCircle2 size={20} />}
                        </div>
                        <h2 className="mt-4 text-lg font-black text-slate-950">{title}</h2>
                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{message}</p>
                        <form action={action} method="POST" onSubmit={() => setSubmitting(true)} className="mt-5 grid grid-cols-2 gap-2">
                            <input type="hidden" name="_token" value={csrf} />
                            {method.toUpperCase() !== 'POST' && <input type="hidden" name="_method" value={method.toUpperCase()} />}
                            <button type="button" onClick={() => setOpen(false)} disabled={submitting} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 disabled:opacity-50">Cancel</button>
                            <button disabled={submitting} className={cx('rounded-xl px-4 py-3 text-sm font-black text-white disabled:opacity-60', tone === 'danger' ? 'bg-rose-600' : 'bg-[#006a61]')}>
                                {submitting ? 'Working...' : confirmLabel}
                            </button>
                        </form>
                    </div>
                </section>
            )}
        </>
    );
}

function FormErrorSummary({ errors = {} }) {
    const messages = Object.values(errors || {}).flat().filter(Boolean);
    if (!messages.length) return null;

    return (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
            <p className="font-black">Please fix the highlighted fields.</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
                {messages.slice(0, 4).map((message, index) => <li key={`${message}-${index}`}>{message}</li>)}
            </ul>
        </div>
    );
}

function UniversityEventStatusForm({ csrf, event, status, label, tone = 'primary' }) {
    return (
        <form action={`/campus-events/${event.id}/status`} method="POST">
            <input type="hidden" name="_token" value={csrf} />
            <input type="hidden" name="_method" value="PATCH" />
            <input type="hidden" name="status" value={status} />
            <button className={cx('rounded-lg px-3 py-1.5 text-xs font-black', tone === 'primary' ? 'border border-[#006a61]/30 text-[#006a61] hover:bg-emerald-50' : 'border border-slate-200 text-slate-500 hover:bg-slate-50')}>{label}</button>
        </form>
    );
}

function UniversityEventEditor({ csrf, event, events = [], settings = {}, errors, old, onClose }) {
    const isEdit = Boolean(event);
    const defaults = settings.defaults || {};
    const value = (key, fallback = '') => old[key] || event?.[key] || fallback;
    const selectedVenue = value('venue');
    const selectedStart = value('startsAt') || value('starts_at');
    const conflict = selectedVenue && selectedStart
        ? events.find((item) => item.id !== event?.id && item.status !== 'cancelled' && String(item.venue || '').toLowerCase() === String(selectedVenue).toLowerCase() && toInputDateTime(item.startsAt) === toInputDateTime(selectedStart))
        : null;
    return (
        <section className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/55 px-3 py-5 backdrop-blur-sm">
            <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-4 md:p-5">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#006a61]">{isEdit ? 'Edit program' : 'New program'}</p>
                        <h2 className="mt-1 text-xl font-black text-slate-950 md:text-2xl">{isEdit ? event.title : 'Create Visit Program'}</h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500">{isEdit ? 'Update schedule, capacity, venue, and status.' : 'Add a school-facing visit program to the database.'}</p>
                    </div>
                    <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50" aria-label="Close editor"><X size={18} /></button>
                </div>
                <form action={isEdit ? `/campus-events/${event.id}` : '/campus-events'} method="POST" className="grid gap-4 overflow-y-auto p-4 md:grid-cols-2 md:p-5">
                    <input type="hidden" name="_token" value={csrf} />
                    {isEdit && <input type="hidden" name="_method" value="PUT" />}
                    <div className="md:col-span-2"><FormErrorSummary errors={errors} /></div>
                    <LightField label="Program title" name="title" defaultValue={value('title')} error={errors.title?.[0]} />
                    <LightField label="Venue" name="venue" defaultValue={value('venue')} error={errors.venue?.[0]} />
                    {conflict && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800 md:col-span-2">Conflict warning: {conflict.title} already uses this venue and start time. The backend will block overlapping schedules.</div>}
                    <LightField label="Start date and time" name="starts_at" type="datetime-local" defaultValue={toInputDateTime(value('startsAt') || value('starts_at'))} error={errors.starts_at?.[0]} />
                    <LightField label="End date and time" name="ends_at" type="datetime-local" defaultValue={toInputDateTime(value('endsAt') || value('ends_at'))} error={errors.ends_at?.[0]} />
                    <LightField label="Registration opens" name="registration_opens_at" type="datetime-local" defaultValue={toInputDateTime(value('registrationOpensAt') || value('registration_opens_at'))} error={errors.registration_opens_at?.[0]} />
                    <LightField label="Registration closes" name="registration_closes_at" type="datetime-local" defaultValue={toInputDateTime(value('registrationClosesAt') || value('registration_closes_at'))} error={errors.registration_closes_at?.[0]} />
                    <LightField label="Location" name="location" defaultValue={value('location')} error={errors.location?.[0]} />
                    <LightField label="Capacity" name="capacity" type="number" min="1" defaultValue={value('capacity', defaults.capacity || '50')} error={errors.capacity?.[0]} />
                    <LightField label="Per-school capacity" name="per_school_capacity" type="number" min="1" defaultValue={value('perSchoolCapacity') || value('per_school_capacity') || defaults.per_school_capacity || ''} error={errors.per_school_capacity?.[0]} />
                    <LightField label="Per-group capacity" name="per_group_capacity" type="number" min="1" defaultValue={value('perGroupCapacity') || value('per_group_capacity') || defaults.per_group_capacity || ''} error={errors.per_group_capacity?.[0]} />
                    <div className="md:col-span-2"><LightTextarea label="Description" name="description" defaultValue={value('description')} error={errors.description?.[0]} /></div>
                    <label className="text-sm font-semibold text-slate-700">Status<select name="status" defaultValue={value('status', 'published')} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-[#006a61] focus:ring-4 focus:ring-emerald-50"><option value="published">Active</option><option value="draft">Draft</option><option value="cancelled">Archived</option></select></label>
                    <label className="text-sm font-semibold text-slate-700">Visibility<select name="visibility" defaultValue={value('visibility', defaults.visibility || 'public')} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-[#006a61] focus:ring-4 focus:ring-emerald-50"><option value="public">Public</option><option value="invite_only">Invite only</option><option value="private">Private</option></select></label>
                    <label className="text-sm font-semibold text-slate-700">Lifecycle stage<select name="lifecycle_stage" defaultValue={value('lifecycleStage') || value('lifecycle_stage', defaults.lifecycle_stage || 'planning')} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-[#006a61] focus:ring-4 focus:ring-emerald-50"><option value="planning">Planning</option><option value="inviting">Inviting</option><option value="open">Open</option><option value="full">Full</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="archived">Archived</option></select></label>
                    <label className="text-sm font-semibold text-slate-700">Recurring visit<select name="recurrence_rule" defaultValue={value('recurrenceRule') || value('recurrence_rule', 'none')} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-[#006a61] focus:ring-4 focus:ring-emerald-50"><option value="none">Does not repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label>
                    <LightField label="Occurrences" name="recurrence_count" type="number" min="1" max="24" defaultValue={value('recurrenceCount') || value('recurrence_count', '1')} error={errors.recurrence_count?.[0]} />
                    <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700"><span>Enable reminders</span><input type="checkbox" name="reminders_enabled" value="1" defaultChecked={event?.remindersEnabled !== false} className="h-4 w-4 rounded border-slate-300 text-[#006a61]" /></label>
                    <LightField label="Reminder days before" name="reminder_days_before" type="number" min="0" max="60" defaultValue={value('reminderDaysBefore') || value('reminder_days_before', '7')} error={errors.reminder_days_before?.[0]} />
                    <LightField label="Reminder time" name="reminder_time" type="time" defaultValue={value('reminderTime') || value('reminder_time', '09:00')} error={errors.reminder_time?.[0]} />
                    <div className="grid grid-cols-2 gap-2 md:items-end">
                        <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">Cancel</button>
                        <button className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">{isEdit ? 'Save Changes' : 'Create Program'}</button>
                    </div>
                </form>
            </div>
        </section>
    );
}

function UniversityProgramDetailModal({ event, registrations = [], schools = [], onClose, onEdit, onInvite }) {
    const roster = registrations.filter((registration) => Number(registration.eventId) === Number(event.id) || registration.event === event.title);
    const confirmed = roster.filter((registration) => registration.status === 'confirmed');
    const waitlisted = roster.filter((registration) => registration.status === 'waitlisted');
    const percent = eventCapacityPercent(event);
    const invitedCount = (event.invitedSchoolIds || []).length;
    const lifecycle = event.lifecycleLog || [];

    return (
        <section className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/55 px-3 py-5 backdrop-blur-sm">
            <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-4 md:p-5">
                    <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#006a61]">Program detail</p>
                        <h2 className="mt-1 truncate text-2xl font-black text-slate-950">{event.title}</h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500">{formatDateTime(event.startsAt)} - {event.venue || 'Venue TBA'}</p>
                    </div>
                    <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm"><X size={18} /></button>
                </div>
                <div className="grid gap-4 overflow-y-auto p-4 lg:grid-cols-[1.25fr_0.75fr] md:p-5">
                    <div className="space-y-4">
                        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            <MiniStat label="Confirmed" value={confirmed.reduce((sum, row) => sum + Number(row.partySize || 0), 0)} />
                            <MiniStat label="Waitlisted" value={waitlisted.length} />
                            <MiniStat label="Capacity" value={`${percent}%`} />
                            <MiniStat label="Invited schools" value={invitedCount} />
                        </section>
                        <section className="rounded-2xl border border-slate-200 bg-white p-4">
                            <h3 className="text-sm font-black text-slate-950">Logistics & controls</h3>
                            <div className="mt-3 grid gap-3 text-sm font-semibold text-slate-600 md:grid-cols-2">
                                <p>Visibility: <span className="font-black capitalize text-slate-950">{String(event.visibility || 'public').replace('_', ' ')}</span></p>
                                <p>Lifecycle: <span className="font-black capitalize text-slate-950">{String(event.lifecycleStage || 'planning').replace('_', ' ')}</span></p>
                                <p>Registration opens: <span className="font-black text-slate-950">{formatDateTime(event.registrationOpensAt)}</span></p>
                                <p>Registration closes: <span className="font-black text-slate-950">{formatDateTime(event.registrationClosesAt)}</span></p>
                                <p>Per-school cap: <span className="font-black text-slate-950">{event.perSchoolCapacity || 'No rule'}</span></p>
                                <p>Per-group cap: <span className="font-black text-slate-950">{event.perGroupCapacity || 'No rule'}</span></p>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-2">
                                <button type="button" onClick={onEdit} className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Edit Program</button>
                                <button type="button" onClick={onInvite} className="rounded-xl border border-[#006a61]/25 bg-emerald-50 px-4 py-3 text-sm font-black text-[#006a61]">Invite Schools</button>
                            </div>
                        </section>
                        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                            <div className="border-b border-slate-100 p-4">
                                <h3 className="text-sm font-black text-slate-950">Roster</h3>
                                <p className="mt-1 text-xs font-semibold text-slate-500">Confirmed and waitlisted attendees connected to this program.</p>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {roster.length === 0 ? <p className="p-5 text-sm font-semibold text-slate-500">No roster records yet.</p> : roster.slice(0, 10).map((row) => (
                                    <div key={row.id} className="flex items-center justify-between gap-3 p-4">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-black text-slate-950">{row.name}</p>
                                            <p className="mt-1 truncate text-xs font-semibold text-slate-500">{row.school || row.email}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-slate-950">{row.partySize} seat(s)</p>
                                            <p className="mt-1 text-[10px] font-black uppercase text-slate-500">{row.status}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                    <aside className="space-y-4">
                        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <h3 className="text-sm font-black text-slate-950">Lifecycle tracking</h3>
                            <div className="mt-3 space-y-3">
                                {lifecycle.length === 0 ? <p className="text-sm font-semibold text-slate-500">Lifecycle events will appear after actions are taken.</p> : lifecycle.slice().reverse().map((item, index) => (
                                    <div key={`${item.at}-${index}`} className="rounded-xl bg-white p-3 text-xs font-semibold text-slate-600">
                                        <p className="font-black capitalize text-slate-950">{item.action}</p>
                                        <p className="mt-1">{item.actor || 'System'} - {formatRelativeTime(item.at)}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                            <h3 className="text-sm font-black text-emerald-900">Scheduling intelligence</h3>
                            <p className="mt-2 text-sm font-semibold leading-6 text-emerald-800">{percent >= 90 ? 'Capacity pressure is high. Consider a second session or stricter per-school caps.' : 'Capacity remains available. Invite relevant partner schools when the program fits their students.'}</p>
                        </section>
                    </aside>
                </div>
            </div>
        </section>
    );
}

function InviteSchoolsModal({ csrf, event, schools = [], onClose }) {
    const topSchools = [...schools].sort((a, b) => Number(b.matchScore || 0) - Number(a.matchScore || 0)).slice(0, 12);

    return (
        <section className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/55 px-3 py-5 backdrop-blur-sm">
            <form action={`/campus-events/${event.id}/invite-schools`} method="POST" className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl">
                <input type="hidden" name="_token" value={csrf} />
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-4 md:p-5">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#006a61]">Invite schools</p>
                        <h2 className="mt-1 text-xl font-black text-slate-950">Invite schools to {event.title}</h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500">Creates database-backed visit requests for selected schools.</p>
                    </div>
                    <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm"><X size={18} /></button>
                </div>
                <div className="grid gap-3 overflow-y-auto p-4 md:p-5">
                    {topSchools.length === 0 ? <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm font-semibold text-slate-500">No partner schools available yet.</p> : topSchools.map((school) => (
                        <label key={school.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 hover:bg-slate-50">
                            <input type="checkbox" name="school_ids[]" value={school.id} className="h-4 w-4 rounded border-slate-300 text-[#006a61]" defaultChecked={(event.invitedSchoolIds || []).includes(school.id)} />
                            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e5eeff] text-xs font-black text-[#006a61]">{school.name?.slice(0, 1)}</span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-black text-slate-950">{school.name}</span>
                                <span className="mt-1 block truncate text-xs font-semibold text-slate-500">{school.city}, {school.country} - {school.matchScore || 0}/100 saved priority</span>
                            </span>
                        </label>
                    ))}
                    <label className="grid gap-1.5 text-sm font-bold text-slate-700">Invite message<textarea name="message" rows="3" className="rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-[#006a61] focus:ring-4 focus:ring-emerald-50" placeholder="Add context for counselors..." /></label>
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-4">
                    <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">Cancel</button>
                    <button className="rounded-xl bg-[#006a61] px-4 py-3 text-sm font-black text-white">Send Invites</button>
                </div>
            </form>
        </section>
    );
}

function UniversityPrdTracker({ events = [], registrations = [], schools = [], visitRequests = [], analytics = {}, settings = {}, compliance = {}, messages = [] }) {
    const hasAdvancedFields = events.some((event) => event.visibility || event.registrationOpensAt || event.perSchoolCapacity || event.lifecycleStage);
    const universitySettingsReady = Boolean(settings.profile?.institutionName && settings.branding?.brandColor && settings.defaults?.capacity);
    const categories = [
        ['Visit Program Workflow', [
            ['Duplicate/copy programs', 'done', 'Copy action creates draft programs from existing records.'],
            ['Dedicated program detail page', 'done', 'Detail modal shows roster, logistics, lifecycle, and actions.'],
            ['Conflict detection before saving', 'midway', 'UI warning and backend venue/time protection exist; richer time overlap UX can improve.'],
            ['Capacity rules per school/group', hasAdvancedFields ? 'done' : 'midway', 'Per-school and per-group caps are stored and enforced for registration limits.'],
            ['Custom registration windows', hasAdvancedFields ? 'done' : 'midway', 'Open/close windows are stored and checked during registration.'],
            ['Visibility control', hasAdvancedFields ? 'done' : 'midway', 'Public, invite-only, and private program visibility is stored.'],
            ['Invite schools workflow', visitRequests.length > 0 ? 'done' : 'midway', 'Invite action creates visit requests for selected schools.'],
            ['Program lifecycle tracking', events.some((event) => (event.lifecycleLog || []).length) ? 'done' : 'midway', 'Lifecycle stage and action log are stored on each program.'],
        ]],
        ['Partner School Management', [
            ['Add and remove partner schools', 'done', 'University users can add schools and remove schools without shared history.'],
            ['Manual priority or tier assignment', 'done', 'Relationship tier and match score are editable and persisted.'],
            ['Persistent internal notes', 'done', 'Internal notes are saved on the partner-school database record.'],
            ['Direct contact actions', 'done', 'Contact actions queue a deliverable email notification and create a follow-up task.'],
            ['Engagement history tracking', schools.some((school) => Number(school.archiveVisits || 0) > 0 || Number(school.visitRequests || 0) > 0) ? 'done' : 'midway', 'Profile combines archived visits, requests, and visits count.'],
            ['Partner follow-up tasks', schools.some((school) => Number(school.taskCount || 0) > 0) ? 'done' : 'midway', 'University users can store and complete real partner-school follow-up tasks.'],
        ]],
        ['Attendee Management', [
            ['Check-in and check-out system', registrations.some((item) => item.checkedIn || item.checkedOut) ? 'done' : 'midway', 'Attendee records store check-in/check-out timestamps and support direct actions.'],
            ['Bulk status updates', 'done', 'Selected attendees can be confirmed, waitlisted, cancelled, checked in/out, or marked consent received.'],
            ['Export attendees by program', 'done', 'Server-backed CSV export supports all attendees or the selected visit program.'],
            ['Import attendee lists', 'done', 'CSV import creates or updates attendees and automatically waitlists capacity overflow.'],
            ['Waitlist promotion visibility', registrations.some((item) => item.waitlistPromotedAt || item.status === 'waitlisted') ? 'done' : 'midway', 'Waitlisted and promoted attendees are visible in roster and profile data.'],
            ['Dedicated attendee profiles', 'done', 'Profile panel shows program, school, consent, emergency, and attendance operations.'],
            ['Consent and emergency handling', registrations.some((item) => item.isMinor || item.consentStatus) ? 'done' : 'midway', 'Minor, guardian, emergency contact, and medical/access notes are stored per attendee.'],
            ['Group booking student roster visibility', registrations.some((item) => (item.students || []).length > 0) ? 'done' : 'midway', 'School group bookings remain one booking record but expose individual student profiles grouped by school.'],
        ]],
        ['Calendar and Scheduling', [
            ['Editable time slots', 'done', 'Calendar supports visible start/end time blocks instead of date-only movement.'],
            ['Conflict detection before confirmation', 'done', 'Client preview and backend schedule endpoint block overlapping venue/time conflicts.'],
            ['Drag and drop scheduling with time blocks', 'done', 'Desktop drag/drop and mobile move flow both support time-block selection.'],
            ['Recurring visit support', events.some((event) => event.recurrenceRule && event.recurrenceRule !== 'none') ? 'done' : 'midway', 'Create/edit forms store recurrence rules and create recurring occurrences.'],
            ['External calendar sync and export', 'done', 'University users can export visit programs as an ICS calendar file.'],
            ['Automated schedule-change reminders', events.some((event) => event.lastScheduleChangeAt) ? 'done' : 'midway', 'Schedule changes queue attendee notifications tied to the updated program.'],
        ]],
        ['Insights and Analytics', [
            ['Configurable date ranges', analytics.dateRange ? 'done' : 'midway', 'Insights can be scoped by preset or custom start/end date ranges.'],
            ['Conversion funnel by school and program', (analytics.schoolProgramFunnel || []).length ? 'done' : 'midway', 'Funnel rows are grouped from live registrations by school and visit program.'],
            ['Trend comparisons across cycles', (analytics.cycleComparisons || []).length ? 'done' : 'midway', 'Current cycle is compared with the previous equivalent date window.'],
            ['Downloadable reports', 'done', 'University insights export uses the server-side report endpoint.'],
            ['Saved insights and recommendations', (analytics.savedInsights || []).length ? 'done' : 'midway', 'Generated insights can be saved, completed, or dismissed in the database.'],
            ['Transparent operational indicators', analytics.predictiveScore ? 'done' : 'midway', 'Indicators are derived from recorded attendance, capacity, and application signals and include their data coverage.'],
        ]],
        ['Settings and Configuration', [
            ['University profile management', settings.profile?.institutionName ? 'done' : 'midway', 'Profile values are stored on the university settings record.'],
            ['Logo and branding customization', settings.branding?.brandColor ? 'done' : 'midway', 'Logo URL and brand color are persisted and previewed.'],
            ['Recruiter contact directory', (settings.team || []).length ? 'done' : 'midway', 'Recruiter contact records support add, edit, delete, and status tracking; they do not grant portal access.'],
            ['Default visit configuration', settings.defaults?.capacity ? 'done' : 'midway', 'Saved defaults are used by the create-program workflow.'],
            ['Email notification preference', settings.notifications ? 'done' : 'midway', 'The saved email preference controls whether university notifications are queued for email or delivered in-app.'],
            ['Calendar export', 'done', 'The supported calendar integration exports real visit programs as an ICS feed.'],
            ['Timezone and calendar preferences', settings.calendar?.timezone ? 'done' : 'midway', 'Timezone and week-start preferences are stored per university.'],
        ]],
        ['Notifications and Reminders', [
            ['Reminder scheduling per visit program', events.some((event) => event.reminderDaysBefore !== undefined) ? 'done' : 'midway', 'Each visit program stores reminder enabled state, days-before timing, and reminder time.'],
            ['Notification history tracking', 'done', 'University communications show notification records tied to owned visit programs.'],
            ['Failed notification retry system', 'done', 'Failed notification records can be moved back to queued with retry metadata.'],
            ['Preview cancellation or update notices', 'done', 'Communications screen previews update, cancellation, and reminder templates before queueing.'],
            ['Target specific schools or students', 'done', 'Targeting supports all, confirmed, waitlisted, schools only, and students only for the selected program.'],
        ]],
        ['Enterprise Readiness Upgrade', [
            ['Real-time SPA behavior', 'done', 'Dashboard forms submit through the in-place workspace handler, preserve the active tab, show loading state, and refresh database-backed props without a full page navigation.'],
            ['Complete communication system', messages.length > 0 ? 'done' : 'midway', 'Communications include threaded UI, targeted program notices, reminder rules, delivery history, and retryable failed notifications.'],
            ['Advanced visit program logistics', events.some((event) => event.venue && event.endsAt && event.visibility && event.lifecycleStage) ? 'done' : 'midway', 'Programs carry venue, time block, capacity, lifecycle, visibility, registration windows, invitations, reminders, and export metadata.'],
            ['Full partner school relationship management', schools.some((school) => school.notes || school.taskCount || school.tier) ? 'done' : 'midway', 'Partner schools support tiering, notes, contact actions, engagement history, scheduling, and actionable recommendation tasks.'],
            ['Robust attendee workflows', registrations.some((item) => item.checkedIn || item.consentStatus || (item.students || []).length) ? 'done' : 'midway', 'Attendee workflows cover grouped rosters, check-in/out, bulk updates, import/export, waitlist visibility, consent, emergency, and profile views.'],
            ['Intelligent scheduling and calendar logic', events.some((event) => event.lastScheduleChangeAt || event.externalCalendarUid || event.recurrenceRule) ? 'done' : 'midway', 'Scheduling includes editable time slots, conflict blocking, drag/move flows, recurrence fields, ICS export, and schedule-change notices.'],
            ['Deep analytics and reporting', analytics.predictiveScore && (analytics.schoolProgramFunnel || []).length ? 'done' : 'midway', 'Insights use database registrations, attendance, schools, visit trends, date ranges, saved recommendations, predictive score, and export endpoint.'],
            ['Notification visibility and automation', messages.some((message) => message.notificationType || message.scheduledFor || message.status === 'failed') ? 'done' : 'midway', 'University users can see automation state, notification history, queued/sent/failed counts, preview notices, queue reminders, and retry failures.'],
        ]],
        ['Security, Compliance, and Permissions', [
            ['Audit log accessible to university users', (compliance.logs || []).length ? 'done' : 'midway', 'University Settings includes searchable audit activity for university-owned operations.'],
            ['Role and permission management for teams', (settings.team || []).length ? 'done' : 'midway', 'Team members have editable status and scoped permission flags.'],
            ['Data export and deletion requests', (compliance.requests || []).length ? 'done' : 'midway', 'Compliance requests support data export and deletion workflows.'],
            ['Consent tracking for student groups', registrations.some((item) => item.consentStatus || (item.students || []).some((student) => student.consentStatus)) ? 'done' : 'midway', 'Group bookings expose individual student consent status and pending consent counts.'],
            ['Privacy notices for attendee data', compliance.privacyNotice ? 'done' : 'midway', 'University Compliance tab displays attendee data usage notice.'],
            ['Activity logs for edits, deletes, and messages', (compliance.logs || []).some((log) => /updated|deleted|message|imported|exported/.test(log.action || '')) ? 'done' : 'midway', 'Key attendee and communication operations write SystemLog audit entries.'],
        ]],
        ['Production Readiness', [
            ['End-to-end readiness', events.length && schools.length && registrations.length && universitySettingsReady && messages.length ? 'midway' : 'issue', 'Core structure is in place; final enterprise readiness still requires full live QA, real provider delivery credentials, and production monitoring validation.'],
        ]],
    ];
    const items = categories.flatMap(([, rows]) => rows);
    const counts = items.reduce((acc, [, status]) => ({ ...acc, [status]: (acc[status] || 0) + 1 }), {});
    const score = Math.round(((counts.done || 0) / items.length) * 100);

    return (
        <section className="grid gap-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#006a61]">Temporary University PRD</p>
                        <h1 className="mt-2 text-2xl font-black text-slate-950 md:text-3xl">Visit Program Workflow Readiness</h1>
                        <p className="mt-2 text-sm font-semibold text-slate-500">Tracks only University Portal production requirements.</p>
                    </div>
                    <div className="rounded-2xl bg-slate-950 px-5 py-4 text-white">
                        <p className="text-xs font-black uppercase text-white/50">Production score</p>
                        <p className="mt-1 text-3xl font-black">{score}%</p>
                    </div>
                </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
                <MiniStat label="Done" value={counts.done || 0} />
                <MiniStat label="Midway" value={counts.midway || 0} />
                <MiniStat label="Issues" value={counts.issue || 0} />
            </div>
            <div className="grid gap-5">
                {categories.map(([category, rows]) => (
                    <section key={category} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                        <h2 className="text-lg font-black text-slate-950">{category}</h2>
                        <div className="mt-3 grid gap-3">
                            {rows.map(([title, status, note]) => (
                                <article key={title} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h3 className="font-black text-slate-950">{title}</h3>
                                            <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{note}</p>
                                        </div>
                                        <span className={cx('shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase', status === 'done' ? 'bg-emerald-50 text-emerald-700' : status === 'midway' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700')}>{status === 'done' ? 'Done' : status === 'midway' ? 'Midway' : 'Issue'}</span>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </section>
    );
}

function UniversityCreateEventWizard({ csrf, errors, old }) {
    return (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="grid lg:grid-cols-[260px_1fr]">
                <aside className="border-b border-slate-200 bg-slate-50 p-5 lg:border-b-0 lg:border-r">
                    {['Basic info', 'Schedule', 'Location', 'Capacity', 'Review'].map((label, index) => (
                        <div key={label} className="mb-4 flex items-center gap-3">
                            <span className={cx('grid h-8 w-8 place-items-center rounded-full text-sm font-black', index === 0 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500')}>{index + 1}</span>
                            <div>
                                <p className="text-sm font-black text-slate-800">{label}</p>
                                <p className="text-xs text-slate-400">{index === 0 ? 'Name & purpose' : 'Upcoming step'}</p>
                            </div>
                        </div>
                    ))}
                    <div className="mt-8 rounded-2xl bg-emerald-950 p-4 text-white">
                        <p className="text-xs font-black uppercase text-emerald-300">AI optimizer</p>
                        <p className="mt-2 text-xs leading-5 text-white/75">Demo intelligence will recommend timing and regions as data grows.</p>
                    </div>
                </aside>
                <form action="/campus-events" method="POST" className="grid gap-4 p-6 md:grid-cols-2">
                    <input type="hidden" name="_token" value={csrf} />
                    <div className="md:col-span-2">
                        <h2 className="text-2xl font-black text-slate-950">Create New Event</h2>
                        <p className="mt-1 text-sm text-slate-500">Fill in the details to launch a new recruitment session.</p>
                    </div>
                    <LightField label="Event title" name="title" placeholder="e.g. Fall Engineering Mixer 2024" defaultValue={old.title || ''} error={errors.title?.[0]} />
                    <LightField label="Venue" name="venue" placeholder="Memorial Hall" defaultValue={old.venue || ''} error={errors.venue?.[0]} />
                    <LightField label="Start date and time" name="starts_at" type="datetime-local" defaultValue={old.starts_at || ''} error={errors.starts_at?.[0]} />
                    <LightField label="End date and time" name="ends_at" type="datetime-local" defaultValue={old.ends_at || ''} error={errors.ends_at?.[0]} />
                    <LightField label="Location" name="location" placeholder="Stanford, CA" defaultValue={old.location || ''} error={errors.location?.[0]} />
                    <LightField label="Capacity" name="capacity" type="number" min="1" defaultValue={old.capacity || '50'} error={errors.capacity?.[0]} />
                    <div className="md:col-span-2">
                        <LightTextarea label="Description" name="description" placeholder="Describe the goals, target audience, and student experience..." defaultValue={old.description || ''} error={errors.description?.[0]} />
                    </div>
                    <label className="text-sm font-semibold text-gray-700">
                        Publication status
                        <select name="status" defaultValue={old.status || 'published'} className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-950 outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-100">
                            <option value="published">Published</option>
                            <option value="draft">Draft</option>
                        </select>
                    </label>
                    <div className="flex items-end justify-end">
                        <button className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Save Event</button>
                    </div>
                </form>
            </div>
        </section>
    );
}

function UniversityEventDetail({ event, registrations, onCreate }) {
    if (!event) {
        return (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <EmptyState message="Create an event to view event management details." />
                <button onClick={onCreate} className="mt-4 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Create Event</button>
            </section>
        );
    }

    const roster = registrations.filter((registration) => registration.event === event.title);
    const percent = eventCapacityPercent(event);
    const waitlisted = roster.filter((registration) => registration.status === 'waitlisted').length;

    return (
        <aside className="space-y-4">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <UniversityStatusPill status={event.status} />
                        <h2 className="mt-3 text-2xl font-black text-slate-950">{event.title}</h2>
                        <p className="mt-2 text-sm text-slate-500">{formatDateTime(event.startsAt)}</p>
                        <p className="mt-1 text-sm text-slate-500">{event.venue} · {event.location || 'Location TBA'}</p>
                    </div>
                    <button onClick={onCreate} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700">Edit / Create</button>
                </div>
                <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-xs font-black uppercase text-slate-500">Event Capacity</p>
                            <p className="mt-2 text-3xl font-black text-blue-700">{event.confirmedSeats}<span className="text-base text-slate-400">/{event.capacity}</span></p>
                        </div>
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-600">{waitlisted} waitlisted</span>
                    </div>
                    <div className="mt-4 h-3 rounded-full bg-slate-200"><div className="h-3 rounded-full bg-blue-600" style={{ width: `${percent}%` }} /></div>
                    <p className="mt-2 text-xs text-slate-500">{percent}% filled</p>
                </div>
            </section>

            <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wide text-emerald-700">AI insights</p>
                <p className="mt-2 text-sm leading-6 text-emerald-950">{event.title} quality score is <span className="font-black">8.4/10</span>. Demo data shows strongest conversion from confirmed attendees.</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                    <MiniStat label="Top tier" value={roster.length || event.confirmedSeats} />
                    <MiniStat label="Waitlist rate" value={`${Math.round((waitlisted / Math.max(1, roster.length)) * 100)}%`} />
                </div>
            </section>

            <DataPanel
                title="Attendee roster"
                description="Database demo registrations for this event."
                columns={['Candidate', 'Type', 'Seats', 'Status']}
                rows={roster.slice(0, 6).map((registration) => [registration.name, registration.type, registration.partySize, registration.status])}
                empty="No attendees yet."
            />
        </aside>
    );
}

function EventCards({ csrf, events, role, old, errors }) {
    const [locationFilter, setLocationFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [openDetails, setOpenDetails] = useState(null);
    const filteredEvents = events.filter((event) => {
        const locationMatches = !locationFilter || `${event.location || ''} ${event.venue || ''}`.toLowerCase().includes(locationFilter.toLowerCase());
        const dateMatches = !dateFilter || (event.startsAt || '').slice(0, 10) >= dateFilter;

        return locationMatches && dateMatches;
    });

    return (
        <section className="grid gap-4 lg:grid-cols-2">
            {['student', 'school', 'high_school'].includes(role) && (
                <div className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 lg:col-span-2 md:grid-cols-2">
                    <LightField label="Filter by location" name="event_location_filter" defaultValue={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} />
                    <LightField label="From date" name="event_date_filter" type="date" defaultValue={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
                </div>
            )}
            {filteredEvents.length === 0 ? (
                <p className="rounded-xl border border-gray-200 bg-white px-5 py-10 text-center text-sm font-medium text-gray-500 lg:col-span-2">No campus events yet.</p>
            ) : filteredEvents.map((event) => {
                const isFull = Number(event.confirmedSeats || 0) >= Number(event.capacity || 0);

                return (
                <article key={event.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-normal text-gray-400">{event.university || 'University event'}</p>
                            <h3 className="mt-1 text-lg font-semibold text-gray-950">{event.title}</h3>
                            <p className="mt-2 text-sm text-gray-500">{formatDateTime(event.startsAt)} · {event.venue}</p>
                        </div>
                        <span className={cx('rounded-full px-2.5 py-1 text-xs font-bold uppercase', event.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
                            {event.status}
                        </span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                        <MiniStat label="Capacity" value={event.capacity} />
                        <MiniStat label="Booked" value={event.confirmedSeats} />
                        <MiniStat label="Open" value={Math.max(0, event.capacity - event.confirmedSeats)} />
                    </div>
                    {isFull && <p className="mt-3 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold uppercase text-amber-700">Full - waitlist available</p>}
                    <button type="button" onClick={() => setOpenDetails(openDetails === event.id ? null : event.id)} className="mt-4 text-sm font-semibold text-blue-700">
                        {openDetails === event.id ? 'Hide details' : 'View event details'}
                    </button>
                    {openDetails === event.id && (
                        <div className="mt-3 rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-600">
                            <p>{event.description || 'Campus visit details will be shared by the university.'}</p>
                            <p className="mt-2 font-semibold text-gray-800">{event.location || event.venue || 'Location TBA'}</p>
                        </div>
                    )}
                    {['school', 'high_school'].includes(role) && event.status === 'published' && (
                        <form action={`/campus-events/${event.id}/registrations`} method="POST" className="mt-5 grid gap-3 border-t border-gray-100 pt-4">
                            <input type="hidden" name="_token" value={csrf} />
                            <LightField label="Group name" name="registrant_name" defaultValue={old.registrant_name || ''} error={errors.registrant_name?.[0]} />
                            <LightField label="Email" name="registrant_email" type="email" defaultValue={old.registrant_email || ''} error={errors.registrant_email?.[0]} />
                            <LightField label="Number of students" name="party_size" type="number" min="1" defaultValue="10" error={errors.party_size?.[0]} />
                            <button className="rounded-md bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800">Register</button>
                        </form>
                    )}
                    {role === 'student' && <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">Your school assigns students to visits. Assigned visits will appear in My Visits.</p>}
                </article>
            ); })}
        </section>
    );
}

function SchoolAvailableVisitsSection({ csrf, events = [], visitRequests = [], old = {}, errors = {}, setSection }) {
    const [query, setQuery] = useState('');
    const [region, setRegion] = useState('all');
    const [universityFilter, setUniversityFilter] = useState('all');
    const [focusFilters, setFocusFilters] = useState([]);
    const [availability, setAvailability] = useState('all');
    const [dateFilter, setDateFilter] = useState('');
    const [sortBy, setSortBy] = useState('date');
    const [selectedIds, setSelectedIds] = useState([]);
    const [previewId, setPreviewId] = useState(null);
    const [mobileVisibleCount, setMobileVisibleCount] = useState(6);

    const rows = useMemo(() => events.map((event) => enrichDiscoverVisit(event, visitRequests)), [events, visitRequests]);
    const universities = [...new Set(rows.map((row) => row.university).filter(Boolean))].sort();
    const regions = [...new Set(rows.map((row) => row.filterLocation).filter(Boolean))].sort();
    const focusOptions = [...new Set(rows.map((row) => row.focus).filter(Boolean))].sort();
    const savedHubs = focusOptions.slice(0, 3).map((focus) => ({ focus, count: rows.filter((row) => row.focus === focus).length }));
    const filteredRows = rows
        .filter((row) => {
            const haystack = `${row.university} ${row.title} ${row.description} ${row.location} ${row.venue} ${row.focus}`.toLowerCase();
            const matchesQuery = !query || haystack.includes(query.toLowerCase());
            const matchesRegion = region === 'all' || row.filterLocation === region;
            const matchesUniversity = universityFilter === 'all' || row.university === universityFilter;
            const matchesFocus = focusFilters.length === 0 || focusFilters.includes(row.focus);
            const matchesAvailability = availability === 'all'
                || (availability === 'open' && row.seatsLeft > 0)
                || (availability === 'limited' && row.seatsLeft > 0 && row.seatsLeft <= row.limitedThreshold)
                || (availability === 'waitlist' && row.seatsLeft === 0);
            const matchesDate = !dateFilter || (row.startsAt || '').slice(0, 10) >= dateFilter;

            return matchesQuery && matchesRegion && matchesUniversity && matchesFocus && matchesAvailability && matchesDate;
        })
        .sort((left, right) => {
            if (sortBy === 'date') return new Date(left.startsAt || 0) - new Date(right.startsAt || 0);
            if (sortBy === 'availability') return right.seatsLeft - left.seatsLeft;
            if (sortBy === 'university') return left.university.localeCompare(right.university);
            return new Date(left.startsAt || '9999-12-31') - new Date(right.startsAt || '9999-12-31');
        });
    const preview = rows.find((row) => row.id === previewId) || null;
    const selectedRows = rows.filter((row) => selectedIds.includes(String(row.id)));
    const requestedCount = rows.filter((row) => row.existingRequest).length;
    const openCount = rows.filter((row) => row.seatsLeft > 0).length;
    const mobileRows = filteredRows.slice(0, mobileVisibleCount);
    const mobileChips = [
        { label: 'All Visits', active: availability === 'all' && focusFilters.length === 0 && region === 'all', onClick: () => resetFilters() },
        ...focusOptions.slice(0, 3).map((focus) => ({ label: focus, active: focusFilters.includes(focus), onClick: () => toggleFocus(focus) })),
        { label: 'Open Seats', active: availability === 'open', onClick: () => setAvailability((current) => current === 'open' ? 'all' : 'open') },
    ];

    const toggleFocus = (focus) => {
        setFocusFilters((current) => current.includes(focus) ? current.filter((item) => item !== focus) : [...current, focus]);
    };
    const toggleSelected = (id) => {
        const value = String(id);
        setSelectedIds((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
    };
    const toggleVisible = () => {
        const visibleIds = filteredRows.map((row) => String(row.id));
        const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
        setSelectedIds((current) => allSelected ? current.filter((id) => !visibleIds.includes(id)) : [...new Set([...current, ...visibleIds])]);
    };
    const resetFilters = () => {
        setQuery('');
        setRegion('all');
        setUniversityFilter('all');
        setFocusFilters([]);
        setAvailability('all');
        setDateFilter('');
        setSortBy('date');
        setMobileVisibleCount(6);
    };

    useEffect(() => {
        setMobileVisibleCount(6);
    }, [query, region, universityFilter, focusFilters, availability, dateFilter, sortBy]);

    return (
        <>
        <div className="space-y-5 md:hidden">
            <section className="space-y-4">
                <label className="relative block">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:border-[#006a61] focus:ring-4 focus:ring-emerald-50"
                        placeholder="Search programs, universities..."
                    />
                </label>
                <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {mobileChips.map((chip) => (
                        <button
                            key={chip.label}
                            type="button"
                            onClick={chip.onClick}
                            className={cx(
                                'shrink-0 rounded-full px-4 py-2 text-xs font-black transition',
                                chip.active ? 'bg-[#131b2e] text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            )}
                        >
                            {chip.label}
                        </button>
                    ))}
                </div>
            </section>

            <section className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-slate-950">Available Programs <span className="text-sm font-semibold text-slate-400">({filteredRows.length})</span></h2>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-[#006a61] outline-none">
                    <option value="date">Sort: Date</option>
                    <option value="availability">Sort: Seats</option>
                    <option value="university">Sort: University</option>
                </select>
            </section>

            <section className="grid gap-2.5">
                {mobileRows.map((row) => (
                    <article key={row.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                        <button type="button" onClick={() => setPreviewId(row.id)} className="grid w-full grid-cols-[44px_minmax(0,1fr)] gap-3 text-left">
                            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-slate-200 bg-[#e5eeff] text-[11px] font-black text-slate-950">
                                {row.initials}
                            </span>
                            <span className="min-w-0">
                                <span className="flex min-w-0 items-start justify-between gap-2">
                                    <span className="line-clamp-2 text-[15px] font-black leading-[1.18] text-slate-950">{row.title}</span>
                                    <span className="max-w-[92px] shrink-0 truncate rounded-full bg-[#dce9ff] px-2 py-0.5 text-[9px] font-black leading-4 text-blue-700">{row.focus}</span>
                                </span>
                                <span className="mt-1 block truncate text-[12px] font-bold text-slate-500">{row.university}</span>
                            </span>
                        </button>

                        <div className="my-3 grid grid-cols-2 gap-2 border-y border-slate-100 py-2.5 text-[11px] font-bold text-slate-500">
                            <span className="inline-flex min-w-0 items-center gap-1.5"><CalendarDays size={14} className="shrink-0" /> <span className="truncate">{formatShortDate(row.startsAt)}{row.endsAt ? ` - ${formatShortDate(row.endsAt)}` : ''}</span></span>
                            <span className="inline-flex min-w-0 items-center gap-1.5"><MapPin size={14} className="shrink-0" /> <span className="truncate">{row.location || row.venue || 'Location TBA'}</span></span>
                        </div>

                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                            <div className="min-w-0">
                                {row.seatsLeft > 0 ? (
                                    <p className={cx('truncate text-[12px] font-black', row.seatsLeft <= row.limitedThreshold ? 'text-rose-600' : 'text-slate-600')}>{row.availabilityLabel}</p>
                                ) : (
                                    <p className="truncate text-[12px] font-black text-rose-600">Waitlist only</p>
                                )}
                                <p className="mt-0.5 text-[10px] font-bold text-slate-400">{row.confirmedSeats.toLocaleString()} confirmed registration(s)</p>
                            </div>
                            {row.existingRequest ? (
                                <button type="button" onClick={() => setSection?.('bookings')} className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-black text-slate-700">View Request</button>
                            ) : (
                                <RequestVisitForm csrf={csrf} row={row} old={old} compact onReview={() => setPreviewId(row.id)} />
                            )}
                        </div>
                    </article>
                ))}

                {filteredRows.length === 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
                        <Search className="mx-auto text-slate-300" size={40} />
                        <p className="mt-3 font-black text-slate-950">No programs match your filters</p>
                        <p className="mt-1 text-sm text-slate-500">Adjust search or filters to see more published visits.</p>
                    </div>
                )}
            </section>

            {mobileVisibleCount < filteredRows.length && (
                <div className="flex justify-center py-3">
                    <button type="button" onClick={() => setMobileVisibleCount((count) => count + 6)} className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-700">
                        Load more programs
                    </button>
                </div>
            )}
        </div>

        <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <div className="grid min-h-[720px] xl:grid-cols-[280px_minmax(0,1fr)]">
                <aside className="border-b border-slate-200 bg-slate-50/80 p-4 xl:border-b-0 xl:border-r">
                    <div className="flex items-center justify-between gap-3">
                        <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500"><Filter size={15} /> Advanced Discovery</p>
                        <button type="button" onClick={resetFilters} className="text-xs font-black text-blue-700">Reset</button>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 xl:grid-cols-1">
                        <SchoolDiscoveryStat label="Published Visits" value={rows.length} />
                        <SchoolDiscoveryStat label="Open Capacity" value={openCount} />
                        <SchoolDiscoveryStat label="Existing Requests" value={requestedCount} />
                    </div>

                    {savedHubs.length > 0 && (
                        <section className="mt-6">
                            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Program Focus</p>
                            <div className="mt-2 space-y-1.5">
                                {savedHubs.map((hub) => (
                                    <button key={hub.focus} type="button" onClick={() => setFocusFilters([hub.focus])} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-white">
                                        <span>{hub.focus}</span>
                                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px]">{hub.count}</span>
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}

                    <section className="mt-6 space-y-4">
                        <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.1em] text-slate-500">From Date<input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-900" /></label>
                        <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.1em] text-slate-500">Location<select value={region} onChange={(event) => setRegion(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-900"><option value="all">All Locations</option>{regions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                        <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.1em] text-slate-500">University<select value={universityFilter} onChange={(event) => setUniversityFilter(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-900"><option value="all">All Universities</option>{universities.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                        <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.1em] text-slate-500">Availability<select value={availability} onChange={(event) => setAvailability(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-900"><option value="all">All Statuses</option><option value="open">Open Seats</option><option value="limited">Limited Seats</option><option value="waitlist">Waitlist Only</option></select></label>
                    </section>

                    <section className="mt-6">
                        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Academic Focus</p>
                        <div className="mt-2 space-y-2">
                            {focusOptions.map((focus) => (
                                <label key={focus} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-700 hover:bg-white">
                                    <input type="checkbox" checked={focusFilters.includes(focus)} onChange={() => toggleFocus(focus)} className="rounded border-slate-300 text-blue-600" />
                                    {focus}
                                </label>
                            ))}
                            {focusOptions.length === 0 && <p className="text-sm text-slate-500">Focus filters appear after universities publish visits.</p>}
                        </div>
                    </section>
                </aside>

                <main className="min-w-0">
                    <header className="border-b border-slate-200 bg-white p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h1 className="text-3xl font-black text-slate-950">Discover Visits</h1>
                                <p className="mt-1 text-sm text-slate-500">Find university visit programs your school can request. Every action creates a shared request record.</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={() => setSection?.('bookings')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">{requestedCount} Existing Requests</button>
                                <button type="button" disabled={selectedRows.length === 0} onClick={() => selectedRows[0] && setPreviewId(selectedRows[0].id)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50">Review Selected ({selectedRows.length})</button>
                            </div>
                        </div>
                        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_180px]">
                            <label className="relative">
                                <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-semibold outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50" placeholder="Global search: institutions, programs, locations..." />
                            </label>
                            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50">
                                <option value="date">Sort by Date</option>
                                <option value="availability">Sort by Availability</option>
                                <option value="university">Sort by University</option>
                            </select>
                        </div>
                    </header>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] table-fixed text-left text-sm">
                            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
                                <tr>
                                    <th className="w-12 px-4 py-3 text-center"><input type="checkbox" checked={filteredRows.length > 0 && filteredRows.every((row) => selectedIds.includes(String(row.id)))} onChange={toggleVisible} className="rounded border-slate-300 text-blue-600" /></th>
                                    <th className="w-[34%] px-4 py-3">Institution & Program</th>
                                    <th className="w-24 px-4 py-3 text-center">Starts</th>
                                    <th className="w-32 px-4 py-3">Program Focus</th>
                                    <th className="w-32 px-4 py-3">Status</th>
                                    <th className="w-36 px-4 py-3">Availability</th>
                                    <th className="w-32 px-4 py-3 text-right">Command</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredRows.map((row) => (
                                    <tr key={row.id} onClick={() => setPreviewId(row.id)} className={cx('cursor-pointer transition hover:bg-blue-50/40', preview?.id === row.id && 'bg-blue-50/60')}>
                                        <td className="px-4 py-3 text-center" onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={selectedIds.includes(String(row.id))} onChange={() => toggleSelected(row.id)} className="rounded border-slate-300 text-blue-600" /></td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-950 text-[10px] font-black text-white">{row.initials}</span>
                                                <span className="min-w-0">
                                                    <span className="block truncate font-black text-slate-950">{row.university}</span>
                                                    <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-500">{row.title}</span>
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center"><span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-black text-blue-700">{formatShortDate(row.startsAt)}</span></td>
                                        <td className="px-4 py-3 text-xs font-bold text-slate-600">{row.focus}</td>
                                        <td className="px-4 py-3"><span className={cx('rounded border px-2 py-1 text-[10px] font-black uppercase', row.statusTone)}>{row.statusLabel}</span></td>
                                        <td className="px-4 py-3"><span className={cx('text-[11px] font-black', row.seatsLeft > 0 ? 'text-emerald-700' : 'text-slate-400')}>{row.availabilityLabel}</span></td>
                                        <td className="px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                                            {row.existingRequest ? (
                                                <button type="button" onClick={() => setSection?.('bookings')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">View Request</button>
                                            ) : (
                                                <RequestVisitForm csrf={csrf} row={row} old={old} compact onReview={() => setPreviewId(row.id)} />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filteredRows.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="px-5 py-16 text-center">
                                            <Search className="mx-auto text-slate-300" size={42} />
                                            <p className="mt-3 font-black text-slate-950">No visits match this discovery configuration</p>
                                            <p className="mt-1 text-sm text-slate-500">Adjust filters or wait for universities to publish more visit programs.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <footer className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3 text-[11px] font-black uppercase tracking-[0.08em] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap gap-5">
                            <span>Total: <b className="text-slate-950">{rows.length}</b></span>
                            <span>Filtered: <b className="text-slate-950">{filteredRows.length}</b></span>
                            <span>Selected: <b className="text-blue-700">{selectedRows.length}</b></span>
                        </div>
                        <span>Database-backed published visit programs</span>
                    </footer>
                </main>

            </div>
        </div>
        <SchoolVisitPreview csrf={csrf} row={preview} old={old} setSection={setSection} onClose={() => setPreviewId(null)} />
        </>
    );
}

function SchoolDiscoveryStat({ label, value }) {
    return <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">{label}</p><p className="mt-1 text-xl font-black text-slate-950">{value}</p></div>;
}

function RequestVisitForm({ csrf, row, old = {}, compact = false, onReview }) {
    if (compact) {
        return <button type="button" onClick={onReview} className="rounded-lg bg-slate-950 px-3 py-2 text-[11px] font-black text-white hover:bg-slate-800">Review Request</button>;
    }

    return (
        <form action="/visit-requests" method="POST" className="grid gap-3">
            <input type="hidden" name="_token" value={csrf} />
            <input type="hidden" name="campus_event_id" value={row.id} />
            <input type="hidden" name="requested_window" value={row.startsAt && new Date(row.startsAt) > new Date() ? new Date(row.startsAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)} />
            <input type="hidden" name="priority" value="2" />
            <input type="hidden" name="notes" value={`Requested from School Discover Visits. Program focus: ${row.focus}.`} />
            <label className="text-sm font-bold text-slate-700">Students in group<input name="group_size" type="number" min="1" max="5000" required defaultValue={old.party_size || old.group_size || '1'} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400" /></label>
            <button className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700">{row.seatsLeft > 0 ? 'Request Visit' : 'Join Waitlist'}</button>
        </form>
    );
}

function SchoolVisitPreview({ csrf, row, old, setSection, onClose }) {
    if (!row) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/20 backdrop-blur-[1px]" onClick={onClose}>
        <aside className="absolute right-0 top-0 h-full w-full max-w-[420px] overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="grid h-16 w-16 place-items-center rounded-xl bg-slate-950 text-lg font-black text-white">{row.initials}</span>
                    <div>
                        <h2 className="text-xl font-black leading-tight text-slate-950">{row.university}</h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500">{row.location || 'Location TBA'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700">{row.focus}</span>
                    <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="Close university preview"><X size={16} /></button>
                </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
                <MiniStat label="Open Seats" value={row.seatsLeft} />
                <MiniStat label="Capacity" value={row.capacity} />
            </div>

            <section className="mt-5">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Visit Program</p>
                <h3 className="mt-2 font-black text-slate-950">{row.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{row.description || 'The university has published this visit program for school coordination.'}</p>
                <p className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-slate-600"><CalendarDays size={15} /> {formatDateTime(row.startsAt)}</p>
                <p className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-slate-600"><MapPin size={15} /> {row.venue || row.location || 'Venue TBA'}</p>
            </section>

            <section className="mt-5">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Published Availability</p>
                <div className="mt-3 rounded-xl bg-slate-50 p-4">
                    <p className="text-sm font-black text-slate-950">{row.confirmedSeats.toLocaleString()} confirmed · {row.seatsLeft.toLocaleString()} seats open</p>
                    <p className="mt-2 text-xs text-slate-500">Calculated directly from the published capacity and confirmed registration count.</p>
                </div>
            </section>

            <section className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm font-black text-slate-950">Coordinator command</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{row.existingRequest ? 'A request already exists for this visit. Review it from My Requests.' : 'Create one shared request record. The university will see it as a Visit Request.'}</p>
                <div className="mt-4">
                    {row.existingRequest ? <button type="button" onClick={() => setSection?.('bookings')} className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">View My Request</button> : <RequestVisitForm csrf={csrf} row={row} old={old} />}
                </div>
            </section>
        </aside>
        </div>
    );
}

function SchoolBookingsSection({ csrf = '', visitRequests = [], registrations = [], events = [], currentUserId = null, setSection }) {
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedId, setSelectedId] = useState(null);
    const [createOpen, setCreateOpen] = useState(false);
    const publishedEvents = events.filter((event) => event.status === 'published');
    const selected = visitRequests.find((request) => request.id === selectedId) || null;
    const filteredRequests = visitRequests.filter((request) => {
        const haystack = `${request.university || ''} ${request.event || ''} ${request.school || ''} ${request.window || ''}`.toLowerCase();
        const matchesSearch = !query || haystack.includes(query.toLowerCase());
        const matchesStatus = statusFilter === 'all' || request.status === statusFilter;

        return matchesSearch && matchesStatus;
    });
    const confirmedRegistrations = registrations.filter((registration) => registration.status === 'confirmed');
    const pendingCount = visitRequests.filter((request) => request.status === 'requested').length;
    const approvedCount = visitRequests.filter((request) => ['approved', 'scheduled'].includes(request.status)).length;
    const totalStudents = visitRequests.reduce((total, request) => total + Number(request.groupSize || 0), 0);
    const statusTabs = [
        ['all', 'All Requests'],
        ['requested', 'Pending'],
        ['approved', 'Approved'],
        ['scheduled', 'Past Visits'],
    ];

    const statusMeta = {
        requested: ['Pending', 'bg-amber-50 text-amber-700 ring-amber-200'],
        approved: ['Approved', 'bg-emerald-50 text-emerald-700 ring-emerald-200'],
        scheduled: ['Scheduled', 'bg-blue-50 text-blue-700 ring-blue-200'],
        declined: ['Declined', 'bg-rose-50 text-rose-700 ring-rose-200'],
    };
    const currentProgress = selected?.status === 'scheduled' ? 'w-full' : selected?.status === 'approved' ? 'w-2/3' : selected?.status === 'declined' ? 'w-1/3 bg-rose-500' : 'w-1/3';
    const handleMobileRequestAction = (request) => {
        if (request.status === 'scheduled') {
            setSection?.('calendar');
            return;
        }

        if (request.status === 'approved') {
            setSection?.('itinerary');
            return;
        }

        setSelectedId(request.id);
    };
    const mobileRequestActionLabel = (request) => {
        if (request.status === 'scheduled') return 'Open Schedule';
        if (request.status === 'approved') return 'Plan Itinerary';
        if (request.status === 'declined') return 'View Decision';
        return 'View Details';
    };
    const isIncomingRequest = (request) => request.requesterRole === 'university';
    const canReviewRequest = (request) => request.status === 'requested' && isIncomingRequest(request);
    const canCancelRequest = (request) => request.status === 'requested' && Number(request.requesterId) === Number(currentUserId);

    return (
        <div className="grid gap-6">
            <div className="md:hidden">
                <div className="sticky top-16 z-20 -mx-3 flex gap-2 overflow-x-auto border-b border-slate-200 bg-[#f6f8fb]/95 px-3 py-2 backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {statusTabs.map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setStatusFilter(value)}
                            className={cx(
                                'shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-black',
                                statusFilter === value ? 'bg-slate-950 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600'
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Active Requests ({filteredRequests.length})</span>
                    <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-1 text-xs font-black text-[#006a61]">
                        <Plus size={15} /> New
                    </button>
                </div>

                <label className="relative mt-2 block">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold outline-none focus:border-[#006a61] focus:ring-4 focus:ring-emerald-50" placeholder="Search requests..." />
                </label>

                <div className="mt-3 grid gap-2.5">
                    {filteredRequests.map((request) => {
                        const [label, tone] = statusMeta[request.status] || [request.status || 'Pending', 'bg-slate-50 text-slate-700 ring-slate-200'];
                        const accent = request.status === 'requested' ? 'border-l-amber-500' : request.status === 'approved' || request.status === 'scheduled' ? 'border-l-emerald-500' : request.status === 'declined' ? 'border-l-rose-500' : 'border-l-blue-500';
                        const Icon = request.status === 'scheduled' ? CalendarDays : request.status === 'approved' ? CheckCircle2 : request.status === 'declined' ? X : Clock;

                        return (
                            <article key={request.id} className={cx('rounded-xl border border-l-4 border-slate-200 bg-white p-3 shadow-sm', accent)}>
                                <div className="grid grid-cols-[38px_minmax(0,1fr)_auto] gap-2.5">
                                    <span className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-[#e5eeff] text-slate-950">
                                        <Icon size={18} />
                                    </span>
                                    <div className="min-w-0">
                                        <h3 className="truncate text-[15px] font-black leading-5 text-slate-950">{request.university || 'University Partner'}</h3>
                                        <p className="mt-0.5 line-clamp-1 text-[12px] font-semibold text-slate-500">{request.event || 'General campus visit request'}</p>
                                        <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-slate-400">{isIncomingRequest(request) ? 'Incoming invitation' : 'Sent by your school'}</p>
                                    </div>
                                    <span className={cx('h-fit max-w-[94px] truncate rounded-full px-2 py-1 text-[9px] font-black uppercase ring-1', tone)}>{label}</span>
                                </div>

                                <div className="mt-2.5 grid grid-cols-2 gap-3 border-y border-slate-100 py-2">
                                    <div>
                                        <span className="block text-[9px] font-black uppercase tracking-[0.08em] text-slate-400">{request.status === 'scheduled' ? 'Scheduled Date' : 'Requested Date'}</span>
                                        <span className="mt-0.5 block truncate text-[12px] font-black text-slate-800">{request.window || formatShortDate(request.eventDate)}</span>
                                    </div>
                                    <div>
                                        <span className="block text-[9px] font-black uppercase tracking-[0.08em] text-slate-400">Participants</span>
                                        <span className="mt-0.5 block truncate text-[12px] font-black text-slate-800">{Number(request.groupSize || 0).toLocaleString()} Students</span>
                                    </div>
                                </div>

                                <div className="mt-2.5 flex gap-2">
                                    {canReviewRequest(request) ? (
                                        <>
                                            <DecisionTextButton csrf={csrf} id={request.id} decision="approved" label="Approve" tone="approve" />
                                            <DecisionTextButton csrf={csrf} id={request.id} decision="declined" label="Decline" tone="deny" />
                                        </>
                                    ) : canCancelRequest(request) ? (
                                        <DecisionTextButton csrf={csrf} id={request.id} decision="declined" label="Cancel request" tone="deny" />
                                    ) : (
                                        <button type="button" onClick={() => handleMobileRequestAction(request)} className="flex-1 rounded-lg bg-[#006a61] px-3 py-2 text-[12px] font-black text-white">
                                            {mobileRequestActionLabel(request)}
                                        </button>
                                    )}
                                    <button type="button" onClick={() => setSelectedId(request.id)} className="grid h-8 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600" aria-label="Open request details">
                                        <MoreVertical size={17} />
                                    </button>
                                </div>
                            </article>
                        );
                    })}

                    {filteredRequests.length === 0 && (
                        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
                            <Inbox className="mx-auto text-slate-300" size={38} />
                            <p className="mt-3 font-black text-slate-950">No requests found</p>
                            <p className="mt-1 text-sm text-slate-500">Create a request or change your filters.</p>
                        </div>
                    )}
                </div>

                <button type="button" onClick={() => setCreateOpen(true)} className="fixed bottom-24 right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-[#006a61] text-white shadow-xl shadow-slate-950/20">
                    <Plus size={27} />
                </button>
            </div>

            <div className="hidden flex-col gap-4 lg:flex-row lg:items-end lg:justify-between md:flex">
                <div>
                    <h1 className="text-3xl font-black text-slate-950">My Requests Tracking</h1>
                    <p className="mt-1 max-w-3xl text-sm text-slate-500">Review university invitations and track requests sent by your school. Status updates, student counts, and itinerary readiness stay tied to database records.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setSection?.('events')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
                        Discover Visits
                    </button>
                    <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-800">
                        <Plus size={16} /> New Request
                    </button>
                </div>
            </div>

            <div className="hidden gap-4 md:grid md:grid-cols-4">
                <SchoolRequestMetric label="Total Requests" value={visitRequests.length} helper={`${totalStudents.toLocaleString()} requested students`} icon={Send} tone="blue" />
                <SchoolRequestMetric label="Pending" value={pendingCount} helper={`${visitRequests.filter(canReviewRequest).length} need your decision`} icon={Clock} tone="amber" />
                <SchoolRequestMetric label="Approved" value={approvedCount} helper="Ready for itinerary planning" icon={CheckCircle2} tone="emerald" />
                <SchoolRequestMetric label="Scheduled Visits" value={confirmedRegistrations.length} helper="Confirmed attendance records" icon={CalendarDays} tone="slate" />
            </div>

            <div className="hidden gap-6 md:grid">
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 p-5">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h2 className="text-xl font-black text-slate-950">Request Queue</h2>
                                <p className="mt-1 text-sm text-slate-500">Every row is the same shared request record the university reviews from its Visit Requests workspace.</p>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <label className="relative">
                                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 sm:w-72" placeholder="Search requests, universities, or students..." />
                                </label>
                                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50">
                                    <option value="all">All Statuses</option>
                                    <option value="requested">Pending</option>
                                    <option value="approved">Approved</option>
                                    <option value="scheduled">Scheduled</option>
                                    <option value="declined">Declined</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[860px] text-left text-sm">
                            <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
                                <tr>
                                    <th className="px-5 py-4">University</th>
                                    <th className="px-5 py-4">Requested Date</th>
                                    <th className="px-5 py-4">Students</th>
                                    <th className="px-5 py-4">Status</th>
                                    <th className="px-5 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredRequests.map((request) => {
                                    const [label, tone] = statusMeta[request.status] || [request.status || 'Pending', 'bg-slate-50 text-slate-700 ring-slate-200'];

                                    return (
                                        <tr key={request.id} className={cx('transition hover:bg-slate-50', selected?.id === request.id && 'bg-blue-50/50')}>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-950 text-xs font-black text-white">{(request.university || request.event || 'U').slice(0, 2).toUpperCase()}</span>
                                                    <div>
                                                        <p className="font-black text-slate-950">{request.university || 'University Partner'}</p>
                                                        <p className="mt-1 text-xs font-semibold text-slate-500">{request.event || 'General campus visit request'}</p>
                                                        <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-slate-400">{isIncomingRequest(request) ? 'Incoming invitation' : 'Sent by your school'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 font-bold text-slate-700">{request.window || formatShortDate(request.eventDate)}</td>
                                            <td className="px-5 py-4 font-bold text-slate-700">{Number(request.groupSize || 0).toLocaleString()}</td>
                                            <td className="px-5 py-4"><span className={cx('rounded-full px-2.5 py-1 text-[11px] font-black uppercase ring-1', tone)}>{label}</span></td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex justify-end gap-1">
                                                    {canReviewRequest(request) && <><DecisionIconButton csrf={csrf} id={request.id} decision="approved" label="Approve" icon={CheckCircle2} tone="green" /><DecisionIconButton csrf={csrf} id={request.id} decision="declined" label="Decline" icon={X} tone="red" /></>}
                                                    {canCancelRequest(request) && <DecisionIconButton csrf={csrf} id={request.id} decision="declined" label="Cancel request" icon={X} tone="red" />}
                                                    <button type="button" onClick={() => setSelectedId(request.id)} className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-50">View Details</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredRequests.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-5 py-14 text-center">
                                            <div className="mx-auto max-w-sm">
                                                <Inbox className="mx-auto text-slate-300" size={42} />
                                                <p className="mt-3 font-black text-slate-900">No requests found</p>
                                                <p className="mt-1 text-sm text-slate-500">Create a request from a published visit program, or adjust your filters.</p>
                                                <button type="button" onClick={() => setCreateOpen(true)} className="mt-4 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">Create Request</button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <aside className="hidden">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        {selected ? (
                            <>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">REQ-{String(selected.id).padStart(4, '0')}</p>
                                        <h2 className="mt-2 text-2xl font-black text-slate-950">{selected.event || 'Visit Request'}</h2>
                                        <p className="mt-1 text-sm font-semibold text-slate-500">{selected.university || 'University Partner'} • {selected.eventLocation || 'Location TBA'}</p>
                                    </div>
                                    <span className={cx('rounded-full px-2.5 py-1 text-[11px] font-black uppercase ring-1', statusMeta[selected.status]?.[1] || 'bg-slate-50 text-slate-700 ring-slate-200')}>{statusMeta[selected.status]?.[0] || selected.status}</span>
                                </div>
                                <div className="mt-5 grid grid-cols-2 gap-3">
                                    <MiniStat label="Requested window" value={selected.window || formatShortDate(selected.eventDate)} />
                                    <MiniStat label="Students" value={Number(selected.groupSize || 0).toLocaleString()} />
                                </div>
                                <div className="mt-5 rounded-xl bg-slate-50 p-4">
                                    <div className="grid grid-cols-3 text-[10px] font-black uppercase text-slate-400">
                                        <span>Submitted</span>
                                        <span>Reviewing</span>
                                        <span>{selected.status === 'declined' ? 'Closed' : 'Approved'}</span>
                                    </div>
                                    <div className="mt-2 h-2 rounded-full bg-slate-200">
                                        <div className={cx('h-2 rounded-full bg-blue-600', currentProgress)} />
                                    </div>
                                </div>
                                <div className="mt-5">
                                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Request notes</p>
                                    <p className="mt-2 rounded-xl border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-600">{selected.notes || 'No additional notes were added to this request.'}</p>
                                </div>
                                <div className="mt-5 flex flex-col gap-2">
                                    <button type="button" onClick={() => setSection?.('events')} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">View Visit Program</button>
                                    {selected.status !== 'declined' && (
                                        <form action={`/visit-requests/${selected.id}/decision`} method="POST">
                                            <input type="hidden" name="_token" value={csrf} />
                                            <input type="hidden" name="decision" value="declined" />
                                            <button className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 hover:bg-rose-100">Cancel Request</button>
                                        </form>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="py-8 text-center">
                                <Inbox className="mx-auto text-slate-300" size={42} />
                                <p className="mt-3 font-black text-slate-900">Select a request</p>
                                <p className="mt-1 text-sm text-slate-500">Request details and actions will appear here.</p>
                            </div>
                        )}
                    </section>

                    <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                        <div className="flex items-start gap-3">
                            <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white"><Sparkles size={18} /></span>
                            <div>
                                <h3 className="font-black text-slate-950">Request intelligence</h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">Approved requests can move into itinerary planning. Pending requests stay visible to the university dashboard until reviewed.</p>
                            </div>
                        </div>
                    </section>
                </aside>
            </div>

            <SchoolRequestPreview csrf={csrf} request={selected} statusMeta={statusMeta} currentUserId={currentUserId} setSection={setSection} onClose={() => setSelectedId(null)} />

            {createOpen && (
                <ModalShell title="New Visit Request" onClose={() => setCreateOpen(false)}>
                    <form action="/visit-requests" method="POST" className="grid gap-4" onSubmit={() => window.setTimeout(() => setCreateOpen(false), 0)}>
                        <input type="hidden" name="_token" value={csrf} />
                        <label className="grid gap-1.5 text-sm font-bold text-slate-700">
                            University visit program
                            <select name="campus_event_id" required className="rounded-xl border border-slate-200 px-3 py-2.5 font-normal">
                                <option value="">Select a published visit</option>
                                {publishedEvents.map((event) => <option key={event.id} value={event.id}>{event.university || 'University'} - {event.title}</option>)}
                            </select>
                        </label>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="grid gap-1.5 text-sm font-bold text-slate-700">Requested date<input type="date" name="requested_window" required min={new Date().toISOString().slice(0, 10)} className="rounded-xl border border-slate-200 px-3 py-2.5 font-normal" /></label>
                            <label className="grid gap-1.5 text-sm font-bold text-slate-700">Students<input type="number" name="group_size" required min="1" max="10000" defaultValue="30" className="rounded-xl border border-slate-200 px-3 py-2.5 font-normal" /></label>
                        </div>
                        <label className="grid gap-1.5 text-sm font-bold text-slate-700">Priority<select name="priority" defaultValue="2" className="rounded-xl border border-slate-200 px-3 py-2.5 font-normal"><option value="1">Low</option><option value="2">Normal</option><option value="3">High</option><option value="4">Urgent</option><option value="5">Critical</option></select></label>
                        <label className="grid gap-1.5 text-sm font-bold text-slate-700">Notes<textarea name="notes" rows="3" className="rounded-xl border border-slate-200 px-3 py-2.5 font-normal" placeholder="Preferred time, cohort details, accessibility needs, or counselor notes..." /></label>
                        {publishedEvents.length === 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">No published university visits are available yet.</p>}
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setCreateOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">Cancel</button>
                            <button disabled={publishedEvents.length === 0} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Submit Request</button>
                        </div>
                    </form>
                </ModalShell>
            )}
        </div>
    );
}

function SchoolItinerarySection({ csrf, visitRequests = [], registrations = [], events = [], students = [], itineraryItems = [], setSection }) {
    const eventRows = Array.isArray(events) ? events : [];
    const requestRows = Array.isArray(visitRequests) ? visitRequests : [];
    const registrationRows = Array.isArray(registrations) ? registrations : [];
    const studentRows = Array.isArray(students) ? students : [];
    const itineraryRows = Array.isArray(itineraryItems) ? itineraryItems : [];
    const liveEvents = eventRows.filter((event) => event && event.status === 'published');
    const eventById = new Map(liveEvents.map((event) => [Number(event.id), event]));
    const requestedEventIds = new Set(requestRows.filter((request) => request && !['declined', 'cancelled'].includes(request.status)).map((request) => Number(request.eventId)).filter(Boolean));
    const registeredEventIds = new Set(registrationRows.filter((registration) => registration && ['confirmed', 'waitlisted'].includes(registration.status)).map((registration) => Number(registration.eventId)).filter(Boolean));
    const plannedEventIds = new Set([...requestedEventIds, ...registeredEventIds, ...itineraryRows.map((item) => Number(item.eventId))]);
    const requestStops = requestRows
        .filter((request) => request && ['approved', 'scheduled'].includes(request.status) && request.eventId)
        .map((request) => {
            const event = eventById.get(Number(request.eventId)) || {};
            return liveEventItineraryStop({
                id: `request-${request.id}`,
                source: 'Visit Request',
                status: request.status,
                students: Number(request.groupSize || 0),
                notes: request.notes,
                event: { ...event, id: request.eventId, title: request.event || event.title, university: request.university || event.university, startsAt: request.eventDate || event.startsAt, location: request.eventLocation || event.location, venue: request.venue || event.venue, latitude: request.latitude ?? event.latitude, longitude: request.longitude ?? event.longitude, capacity: request.eventCapacity ?? event.capacity },
            });
        });
    const registrationStops = registrationRows
        .filter((registration) => registration && ['confirmed', 'waitlisted'].includes(registration.status) && registration.eventId)
        .map((registration) => {
            const event = eventById.get(Number(registration.eventId)) || {};
            return liveEventItineraryStop({
                id: `registration-${registration.id}`,
                source: 'Registration',
                status: registration.status,
                students: Number(registration.partySize || 0),
                notes: registration.interest || '',
                event: { ...event, id: registration.eventId, title: registration.event || event.title, university: registration.university || event.university, startsAt: registration.eventDate || event.startsAt, location: registration.eventLocation || event.location, venue: registration.venue || event.venue, latitude: registration.latitude ?? event.latitude, longitude: registration.longitude ?? event.longitude, capacity: registration.eventCapacity ?? event.capacity },
            });
        });
    const persistedStops = itineraryRows.map((item) => ({
        ...liveEventItineraryStop({
            id: `itinerary-${item.id}`,
            source: 'Itinerary',
            status: item.requestStatus || 'planned',
            students: Number(item.students || 0),
            notes: item.notes,
            event: { id: item.eventId, title: item.event, university: item.university, startsAt: item.plannedStartAt || item.startsAt, endsAt: item.endsAt, location: item.location, venue: item.venue, latitude: item.latitude, longitude: item.longitude, capacity: item.capacity },
        }),
        itineraryItemId: item.id,
        position: item.position,
    }));
    const stops = (persistedStops.length ? persistedStops : [...requestStops, ...registrationStops])
        .filter((stop, index, list) => list.findIndex((candidate) => Number(candidate.eventId) === Number(stop.eventId)) === index)
        .sort((left, right) => persistedStops.length ? Number(left.position || 0) - Number(right.position || 0) : new Date(left.date || '2999-12-31') - new Date(right.date || '2999-12-31'));
    const itinerarySignature = itineraryRows.map((item) => `${item.id}:${item.position}`).join('|');
    const [orderedIds, setOrderedIds] = useState(() => persistedStops.map((stop) => stop.itineraryItemId));
    const [draggedId, setDraggedId] = useState(null);
    useEffect(() => setOrderedIds(persistedStops.map((stop) => stop.itineraryItemId)), [itinerarySignature]);
    const upcoming = (orderedIds.length ? orderedIds.map((id) => stops.find((stop) => Number(stop.itineraryItemId) === Number(id))).filter(Boolean) : stops).slice(0, 20);
    const moveStop = (id, direction) => {
        setOrderedIds((current) => {
            const index = current.indexOf(id);
            const target = index + direction;
            if (index < 0 || target < 0 || target >= current.length) return current;
            const next = [...current];
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
    };
    const dropStop = (targetId) => {
        if (!draggedId || draggedId === targetId) return;
        setOrderedIds((current) => {
            const next = current.filter((id) => id !== draggedId);
            next.splice(Math.max(0, next.indexOf(targetId)), 0, draggedId);
            return next;
        });
        setDraggedId(null);
    };
    const availableDestinations = liveEvents
        .filter((event) => !plannedEventIds.has(Number(event.id)))
        .sort((left, right) => new Date(left.startsAt || '2999-12-31') - new Date(right.startsAt || '2999-12-31'))
        .slice(0, 4);
    const routeSegments = upcoming.map((stop, index) => index === 0 ? null : routeSegment(upcoming[index - 1], stop));
    const knownSegments = routeSegments.filter(Boolean).filter((segment) => segment.distanceMiles !== null);
    const totalMiles = knownSegments.reduce((sum, segment) => sum + Number(segment.distanceMiles || 0), 0);
    const totalStudents = upcoming.reduce((sum, stop) => sum + Number(stop.students || 0), 0);
    const confirmedStops = upcoming.filter((stop) => ['confirmed', 'scheduled', 'approved'].includes(stop.status)).length;
    const routePoints = upcoming.map((stop) => ({ label: stop.title, location: stop.location, latitude: stop.latitude, longitude: stop.longitude, meta: `${stop.university} • ${stop.students} student(s)` }));
    const routeSegmentCount = Math.max(0, upcoming.length - 1);
    const hasCompleteCoordinates = upcoming.length > 0 && upcoming.every((stop) => stop.latitude !== null && stop.longitude !== null);

    return (
        <div className="grid gap-6">
            <section className="grid gap-4 md:grid-cols-4">
                <SchoolRequestMetric label="Live Destinations" value={upcoming.length} helper={`${confirmedStops} approved / confirmed`} icon={RouteIcon} tone="blue" />
                <SchoolRequestMetric label="Students Covered" value={totalStudents.toLocaleString()} helper={`${studentRows.length.toLocaleString()} student records available`} icon={UsersRound} tone="emerald" />
                <SchoolRequestMetric label="Confirmed Stops" value={confirmedStops.toLocaleString()} helper="Approved, scheduled, or confirmed" icon={CheckCircle2} tone="amber" />
                <SchoolRequestMetric label="Straight-line Distance" value={knownSegments.length ? `${totalMiles.toFixed(1)}mi` : 'Set coords'} helper={knownSegments.length ? `${knownSegments.length}/${routeSegmentCount} segment(s) with coordinates` : 'Add event coordinates to calculate'} icon={MapPin} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
                <aside className="space-y-5">
                    <div className="rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-600 p-5 text-white shadow-lg">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-white/70">Database itinerary</p>
                                <h2 className="mt-2 text-2xl font-black">Live Route Builder</h2>
                                <p className="mt-2 text-sm leading-6 text-white/80">{upcoming.length ? `Itinerary is built from ${upcoming.length} live event destination(s) in the database.` : 'Approved requests and confirmed registrations will generate the route automatically.'}</p>
                            </div>
                            <Sparkles size={24} className="shrink-0" />
                        </div>
                        <button type="button" onClick={() => setSection?.('events')} className="mt-5 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-black text-white hover:bg-white/25">Discover More Visits</button>
                    </div>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-black text-slate-950">Visit Sequence</h2>
                                <p className="mt-1 text-xs font-semibold text-slate-500">Live event destinations from approved requests and registrations.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={() => setSection?.('bookings')} className="text-xs font-black text-blue-700">Requests</button>
                                {orderedIds.length > 1 && (
                                    <form action="/school-itinerary/reorder" method="POST">
                                        <input type="hidden" name="_token" value={csrf} />
                                        {orderedIds.map((id) => <input key={id} type="hidden" name="item_ids[]" value={id} />)}
                                        <button className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white">Save order</button>
                                    </form>
                                )}
                            </div>
                        </div>
                        <div className="mt-4 space-y-3">
                            {upcoming.length === 0 ? (
                                <EmptyState message="No live itinerary yet. Request a published visit or confirm a registration to add destinations." />
                            ) : upcoming.map((stop, index) => (
                                <article key={stop.id} draggable={Boolean(stop.itineraryItemId)} onDragStart={() => setDraggedId(stop.itineraryItemId)} onDragOver={(event) => event.preventDefault()} onDrop={() => dropStop(stop.itineraryItemId)} className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <span className="grid h-9 w-9 shrink-0 cursor-grab place-items-center rounded-xl bg-slate-950 text-xs font-black text-white" title="Drag to rearrange"><MoreVertical size={16} /></span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="truncate font-black text-slate-950">{stop.title}</p>
                                                <ItineraryStatusBadge status={stop.status} />
                                            </div>
                                            <p className="mt-1 text-sm font-semibold text-blue-700">{stop.university}</p>
                                            <p className="mt-1 text-xs leading-5 text-slate-500">{formatShortDate(stop.date)} • {stop.time}</p>
                                            <p className="mt-1 text-xs leading-5 text-slate-500">{stop.venue ? `${stop.venue} • ` : ''}{stop.location}</p>
                                            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">{stop.source} • Capacity {Number(stop.capacity || 0).toLocaleString()}</p>
                                            {stop.notes && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs leading-5 text-slate-600">{stop.notes}</p>}
                                            {stop.itineraryItemId && (
                                                <div className="mt-3">
                                                    <div className="flex flex-wrap gap-2">
                                                        <button type="button" disabled={index === 0} onClick={() => moveStop(stop.itineraryItemId, -1)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-black text-slate-600 disabled:opacity-30">Move up</button>
                                                        <button type="button" disabled={index === upcoming.length - 1} onClick={() => moveStop(stop.itineraryItemId, 1)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-black text-slate-600 disabled:opacity-30">Move down</button>
                                                        <details className="group">
                                                            <summary className="cursor-pointer list-none rounded-lg border border-blue-200 px-2.5 py-1.5 text-[11px] font-black text-blue-700">Edit stop</summary>
                                                            <form action={`/school-itinerary/${stop.itineraryItemId}`} method="POST" className="mt-2 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                                                <input type="hidden" name="_token" value={csrf} /><input type="hidden" name="_method" value="PUT" />
                                                                <label className="grid gap-1 text-[11px] font-black text-slate-600">Planned date and time<input type="datetime-local" name="planned_start_at" defaultValue={stop.date ? String(stop.date).slice(0, 16) : ''} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-medium" /></label>
                                                                <label className="grid gap-1 text-[11px] font-black text-slate-600">Coordinator notes<textarea name="notes" rows="2" defaultValue={stop.notes || ''} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-medium" /></label>
                                                                <button className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white">Save changes</button>
                                                            </form>
                                                        </details>
                                                        <ConfirmForm csrf={csrf} action={`/school-itinerary/${stop.itineraryItemId}`} method="DELETE" title="Remove itinerary stop?" message="Remove this destination from your itinerary?" confirmLabel="Remove" className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-[11px] font-black text-rose-700">
                                                            Remove
                                                        </ConfirmForm>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {index < upcoming.length - 1 && (
                                        <div className="ml-4 mt-3 border-l-2 border-dashed border-blue-200 py-2 pl-6 text-xs font-bold text-slate-500">
                                            <RouteIcon size={14} className="inline text-blue-600" /> {routeSegments[index + 1]?.label || 'Set event coordinates to calculate distance'}
                                        </div>
                                    )}
                                </article>
                            ))}
                        </div>
                    </section>
                </aside>

                <div className="space-y-6">
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-5">
                            <div>
                                <h2 className="text-xl font-black text-slate-950">Route Map</h2>
                                <p className="mt-1 text-sm text-slate-500">OpenStreetMap markers are driven by event locations and coordinates from the database.</p>
                            </div>
                            {upcoming[0] && <OpenStreetMapLink location={upcoming[0].location} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-blue-700">Open Map</OpenStreetMapLink>}
                        </div>
                        {upcoming.length > 0 ? <OpenStreetMapEmbed location={upcoming[0].location} points={routePoints} title="School itinerary route map" className="h-[460px] rounded-none border-0" /> : <EmptyState message="Add an approved visit destination to display the route map." />}
                        {!hasCompleteCoordinates && upcoming.length > 0 && <p className="border-t border-slate-200 bg-amber-50 px-5 py-3 text-xs font-bold text-amber-800">Add latitude/longitude to every visit program for precise markers and complete straight-line distance calculations.</p>}
                    </section>

                    <section className="grid gap-6 lg:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h2 className="text-lg font-black text-slate-950">Student Allocation</h2>
                            <div className="mt-5 space-y-4">
                                {upcoming.slice(0, 4).map((stop, index) => (
                                    <div key={`${stop.id}-time`}>
                                        <div className="flex items-center justify-between text-sm"><span className="font-black text-slate-700">{stop.title}</span><span className="font-bold text-slate-500">{formatShortDate(stop.date)}</span></div>
                                        <div className="mt-2 h-3 rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, Math.max(12, (Number(stop.students || 1) / Math.max(1, totalStudents)) * 100))}%` }} /></div>
                                        <p className="mt-1 text-xs font-semibold text-slate-500">{stop.students} student(s) allocated to this destination</p>
                                    </div>
                                ))}
                                {upcoming.length === 0 && <p className="text-sm font-semibold text-slate-500">Student allocation will appear when live event destinations exist.</p>}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                            <Sparkles size={18} className="text-emerald-700" />
                            <h2 className="mt-3 text-lg font-black text-slate-950">Coordinator Guidance</h2>
                            <p className="mt-2 text-sm leading-6 text-slate-700">{upcoming.length ? `Next destination is ${upcoming[0].title} at ${upcoming[0].location}. Confirm roster, transport, and counselor contact against the live event record.` : 'Submit or confirm a visit request to activate itinerary guidance.'}</p>
                            <button type="button" onClick={() => setSection?.('students')} className="mt-4 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">Review Student Roster</button>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-black text-slate-950">Available Live Event Destinations</h2>
                                <p className="mt-1 text-sm text-slate-500">Published events not yet in this school itinerary.</p>
                            </div>
                            <button type="button" onClick={() => setSection?.('events')} className="text-xs font-black text-blue-700">View all</button>
                        </div>
                        <div className="mt-4 divide-y divide-slate-100">
                            {availableDestinations.length === 0 ? <p className="py-5 text-sm font-semibold text-slate-500">Every available published event is already requested or registered.</p> : availableDestinations.map((event) => (
                                <div key={event.id} className="grid gap-3 py-4 md:grid-cols-[1fr_auto] md:items-center">
                                    <div>
                                        <p className="font-black text-slate-950">{event.title}</p>
                                        <p className="mt-1 text-sm font-semibold text-slate-500">{event.university || 'University partner'} • {event.location || event.venue || 'Location TBA'}</p>
                                        <p className="mt-1 text-xs font-semibold text-slate-400">{formatShortDate(event.startsAt)} • {Number(event.confirmedSeats || 0)}/{Number(event.capacity || 0)} seats</p>
                                    </div>
                                    <form action="/school-itinerary" method="POST">
                                        <input type="hidden" name="_token" value={csrf} />
                                        <input type="hidden" name="campus_event_id" value={event.id} />
                                        <input type="hidden" name="notes" value="Requested from School Itinerary live event destinations." />
                                        <button className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">Add to Itinerary</button>
                                    </form>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </section>
        </div>
    );
}

function liveEventItineraryStop({ id, source, status, students, notes, event }) {
    const latitude = safeCoordinate(event.latitude);
    const longitude = safeCoordinate(event.longitude);

    return {
        id,
        source,
        eventId: event.id,
        title: event.title || 'Campus visit',
        university: event.university || 'University partner',
        location: event.location || event.venue || 'Location TBA',
        venue: event.venue,
        date: event.startsAt,
        time: event.startsAt ? formatTimeRange(event.startsAt, event.endsAt) : 'Date TBA',
        students,
        status,
        notes,
        latitude,
        longitude,
        capacity: event.capacity,
    };
}

function routeSegment(from, to) {
    const fromLatitude = safeCoordinate(from?.latitude);
    const fromLongitude = safeCoordinate(from?.longitude);
    const toLatitude = safeCoordinate(to?.latitude);
    const toLongitude = safeCoordinate(to?.longitude);

    if (fromLatitude === null || fromLongitude === null || toLatitude === null || toLongitude === null) {
        return { distanceMiles: null, label: null };
    }
    const miles = haversineMiles(fromLatitude, fromLongitude, toLatitude, toLongitude);
    if (!Number.isFinite(miles)) {
        return { distanceMiles: null, label: null };
    }
    return { distanceMiles: miles, label: `${miles.toFixed(1)} miles straight-line` };
}

function haversineMiles(lat1, lon1, lat2, lon2) {
    const radius = 3958.8;
    const toRad = (value) => (Number(value) * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function ItineraryStatusBadge({ status }) {
    const styles = {
        scheduled: 'bg-blue-50 text-blue-700',
        approved: 'bg-emerald-50 text-emerald-700',
        confirmed: 'bg-emerald-50 text-emerald-700',
        waitlisted: 'bg-amber-50 text-amber-700',
    };
    return <span className={cx('shrink-0 rounded-full px-2 py-1 text-[10px] font-black uppercase', styles[status] || 'bg-slate-100 text-slate-600')}>{status || 'planned'}</span>;
}

function SchoolRequestMetric({ label, value, helper, icon: Icon, tone = 'slate' }) {
    const tones = {
        blue: 'bg-blue-50 text-blue-700',
        amber: 'bg-amber-50 text-amber-700',
        emerald: 'bg-emerald-50 text-emerald-700',
        slate: 'bg-slate-100 text-slate-700',
    };

    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
                <span className={cx('grid h-10 w-10 place-items-center rounded-xl', tones[tone])}><Icon size={18} /></span>
                <span className="text-xs font-black uppercase text-emerald-600">Live data</span>
            </div>
            <p className="mt-5 text-sm font-semibold text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
            <p className="mt-2 text-xs font-semibold text-slate-500">{helper}</p>
        </article>
    );
}

function SchoolRequestPreview({ csrf, request, statusMeta = {}, currentUserId = null, setSection, onClose }) {
    if (!request) {
        return null;
    }

    const currentProgress = request.status === 'scheduled' ? 'w-full' : request.status === 'approved' ? 'w-2/3' : request.status === 'declined' ? 'w-1/3 bg-rose-500' : 'w-1/3';
    const canReview = request.status === 'requested' && request.requesterRole === 'university';
    const canCancel = request.status === 'requested' && Number(request.requesterId) === Number(currentUserId);

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/20 backdrop-blur-[1px]" onClick={onClose}>
            <aside className="absolute right-0 top-0 h-full w-full max-w-[420px] overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">REQ-{String(request.id).padStart(4, '0')}</p>
                        <h2 className="mt-2 text-2xl font-black text-slate-950">{request.event || 'Visit Request'}</h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500">{request.university || 'University Partner'} • {request.eventLocation || 'Location TBA'}</p>
                        <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-slate-400">{request.requesterRole === 'university' ? 'Incoming invitation' : 'Sent by your school'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={cx('rounded-full px-2.5 py-1 text-[11px] font-black uppercase ring-1', statusMeta[request.status]?.[1] || 'bg-slate-50 text-slate-700 ring-slate-200')}>{statusMeta[request.status]?.[0] || request.status}</span>
                        <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="Close request preview"><X size={16} /></button>
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                    <MiniStat label="Requested window" value={request.window || formatShortDate(request.eventDate)} />
                    <MiniStat label="Students" value={Number(request.groupSize || 0).toLocaleString()} />
                </div>

                <div className="mt-5 rounded-xl bg-slate-50 p-4">
                    <div className="grid grid-cols-3 text-[10px] font-black uppercase text-slate-400">
                        <span>Submitted</span>
                        <span>Reviewing</span>
                        <span>{request.status === 'declined' ? 'Closed' : 'Approved'}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-200">
                        <div className={cx('h-2 rounded-full bg-blue-600', currentProgress)} />
                    </div>
                </div>

                <section className="mt-5">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Request notes</p>
                    <p className="mt-2 rounded-xl border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-600">{request.notes || 'No additional notes were added to this request.'}</p>
                </section>

                <section className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <div className="flex items-start gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-white"><Sparkles size={18} /></span>
                        <div>
                            <h3 className="font-black text-slate-950">Request intelligence</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">This is the same shared record the university reviews as a Visit Request. Your school sees it as My Request.</p>
                        </div>
                    </div>
                </section>

                <div className="mt-5 flex flex-col gap-2">
                    <button type="button" onClick={() => { onClose?.(); setSection?.('events'); }} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">View Visit Program</button>
                    {canReview && <div className="grid grid-cols-2 gap-2"><DecisionTextButton csrf={csrf} id={request.id} decision="approved" label="Approve" tone="approve" /><DecisionTextButton csrf={csrf} id={request.id} decision="declined" label="Decline" tone="deny" /></div>}
                    {canCancel && (
                        <form action={`/visit-requests/${request.id}/decision`} method="POST">
                            <input type="hidden" name="_token" value={csrf} />
                            <input type="hidden" name="decision" value="declined" />
                            <button className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 hover:bg-rose-100">Cancel Request</button>
                        </form>
                    )}
                </div>
            </aside>
        </div>
    );
}

function AdminUniversitiesSection({ csrf, users = [], events = [], registrations = [], errors = {} }) {
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('all');
    const [region, setRegion] = useState('all');
    const [modal, setModal] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const universities = users.filter((user) => user.role === 'university').map((user) => enrichAdminUniversity(user, events, registrations));
    const regions = [...new Set(universities.map((item) => item.region).filter(Boolean))].sort();
    const mappedRegions = regions.filter((item) => item !== 'Not assigned');
    const filtered = universities.filter((item) => {
        const text = `${item.name} ${item.email} ${item.region} ${item.contact}`.toLowerCase();
        return (!query || text.includes(query.toLowerCase()))
            && (status === 'all' || item.verificationStatus === status)
            && (region === 'all' || item.region === region);
    });
    const selected = universities.find((item) => item.id === selectedId);
    const activeInstitutions = universities.filter((item) => item.accountStatus === 'active').length;
    const pendingVerification = universities.filter((item) => item.verificationStatus === 'unverified').length;
    const totalBookings = universities.reduce((total, item) => total + item.bookings, 0);
    const activePrograms = universities.reduce((total, item) => total + item.activePrograms, 0);
    const institutionMapPoints = filtered.filter((item) => item.region !== 'Not assigned').slice(0, 30).map((item) => ({
        label: item.name,
        location: item.region,
        meta: `${item.activePrograms} programs • ${item.bookings} bookings`,
    }));
    const mapLocation = region !== 'all' && region !== 'Not assigned' ? region : mappedRegions[0];
    const reset = () => { setQuery(''); setStatus('all'); setRegion('all'); };

    return (
        <div className="grid gap-6">
            <section className="grid gap-4 md:grid-cols-4">
                <AdminInstitutionMetric label="Active Institutions" value={activeInstitutions} detail={`${universities.length} total accounts`} icon={GraduationCap} />
                <AdminInstitutionMetric label="Verification Queue" value={pendingVerification} detail="Email/account review" icon={ShieldCheck} tone="amber" />
                <AdminInstitutionMetric label="Active Programs" value={activePrograms} detail="Published visit programs" icon={CalendarDays} tone="blue" />
                <AdminInstitutionMetric label="Total Bookings" value={totalBookings.toLocaleString()} detail="Seats processed" icon={UsersRound} tone="emerald" />
            </section>

            <section className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
                <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between"><h2 className="text-lg font-black text-slate-950">Filters</h2><button type="button" onClick={reset} className="text-xs font-black text-blue-700">Reset All</button></div>
                    <div className="mt-5 space-y-5">
                        <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.1em] text-slate-500">Search<input value={query} onChange={(event) => setQuery(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold normal-case tracking-normal text-slate-900" placeholder="Name, email, region..." /></label>
                        <div><p className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">Verification Status</p><div className="mt-2 flex flex-wrap gap-2">{['all', 'verified', 'unverified'].map((item) => <button key={item} type="button" onClick={() => setStatus(item)} className={cx('rounded-full px-3 py-1.5 text-xs font-black capitalize', status === item ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>{item}</button>)}</div></div>
                        <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.1em] text-slate-500">Region<select value={region} onChange={(event) => setRegion(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold normal-case tracking-normal text-slate-900"><option value="all">All Regions</option>{regions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4"><MapIcon size={20} className="text-blue-700" /><p className="mt-2 text-xs font-black uppercase text-blue-700">Recorded Locations</p><p className="mt-1 text-xs leading-5 text-slate-600">{mappedRegions.length} persisted institution location(s) are available for mapping.</p>{mapLocation ? <><div className="mt-3"><OpenStreetMapEmbed location={mapLocation} points={institutionMapPoints} title="Recorded institution locations on OpenStreetMap" className="h-28" /></div><OpenStreetMapLink location={mapLocation} className="mt-2 inline-flex text-xs font-black text-blue-700">OpenStreetMap</OpenStreetMapLink></> : <p className="mt-3 text-xs font-semibold text-slate-500">No institution locations have been saved yet.</p>}</div>
                    </div>
                </aside>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between"><div><h2 className="text-xl font-black text-slate-950">University Directory</h2><p className="mt-1 text-sm text-slate-500">{filtered.length} result(s), database-backed institution accounts.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => exportRowsToCsv('universities.csv', [['Name', 'Email', 'Location', 'Programs', 'Bookings', 'Account Status', 'Verification'], ...filtered.map((item) => [item.name, item.email, item.region, item.activePrograms, item.bookings, item.accountStatus, item.verificationStatus])])} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"><Download size={14} className="inline" /> Export</button><button type="button" onClick={() => setModal({ type: 'create' })} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-slate-800"><Plus size={14} className="inline" /> New University</button></div></div>
                    <div className="overflow-x-auto"><table className="w-full min-w-[1020px] text-left text-sm"><thead className="bg-slate-50 text-[11px] font-black uppercase tracking-[0.08em] text-slate-500"><tr><th className="px-5 py-4">University Name</th><th className="px-5 py-4">Primary Contact</th><th className="px-5 py-4 text-center">Active Programs</th><th className="px-5 py-4 text-center">Total Bookings</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Verification</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((item) => <tr key={item.id} className="group hover:bg-slate-50"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-950 text-xs font-black text-white">{item.initials}</span><span><span className="block font-black text-slate-950">{item.name}</span><span className="mt-0.5 block text-xs font-semibold text-slate-500">{item.region}</span></span></div></td><td className="px-5 py-4"><p className="font-bold text-slate-800">{item.contact}</p><p className="mt-1 text-xs text-slate-500">{item.email}</p></td><td className="px-5 py-4 text-center"><button type="button" onClick={() => setSelectedId(item.id)} className="font-black text-blue-700 hover:underline">{item.activePrograms}</button></td><td className="px-5 py-4 text-center font-black text-slate-800">{item.bookings.toLocaleString()}</td><td className="px-5 py-4"><span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase', item.accountStatus === 'active' ? 'bg-emerald-50 text-emerald-700' : item.accountStatus === 'suspended' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700')}><span className={cx('h-1.5 w-1.5 rounded-full', item.accountStatus === 'active' ? 'bg-emerald-500' : item.accountStatus === 'suspended' ? 'bg-rose-500' : 'bg-amber-500')} />{item.accountStatus}</span></td><td className="px-5 py-4"><span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase', item.verificationStatus === 'verified' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700')}><span className={cx('h-1.5 w-1.5 rounded-full', item.verificationStatus === 'verified' ? 'bg-blue-500' : 'bg-amber-500')} />{item.verificationStatus}</span></td><td className="px-5 py-4 text-right"><div className="flex justify-end gap-1"><button type="button" onClick={() => setSelectedId(item.id)} className="rounded-lg p-2 text-blue-700 hover:bg-blue-50" title="View Profile"><Search size={17} /></button><button type="button" onClick={() => setModal({ type: 'edit', item })} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" title="Edit Institution"><Edit3 size={17} /></button><form action={`/dashboard/admin/universities/${item.id}/verification`} method="POST"><input type="hidden" name="_token" value={csrf} /><input type="hidden" name="verified" value={item.verificationStatus === 'verified' ? '0' : '1'} /><button className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50" title="Toggle Verification"><ShieldCheck size={17} /></button></form><button type="button" onClick={() => setModal({ type: 'delete', item })} className="rounded-lg p-2 text-rose-700 hover:bg-rose-50" title="Delete Institution"><Trash2 size={17} /></button></div></td></tr>)}{filtered.length === 0 && <tr><td colSpan="7" className="px-5 py-14 text-center"><EmptyState message="No institution accounts match these filters." /></td></tr>}</tbody></table></div>
                </section>
            </section>

            <AdminUniversityDrawer item={selected} onClose={() => setSelectedId(null)} setModal={setModal} />
            {modal?.type === 'create' && <AdminUniversityForm csrf={csrf} title="New University" action="/dashboard/admin/universities" errors={errors} onClose={() => setModal(null)} />}
            {modal?.type === 'edit' && <AdminUniversityForm csrf={csrf} title="Edit University" action={`/dashboard/admin/universities/${modal.item.id}`} method="PUT" item={modal.item} errors={errors} onClose={() => setModal(null)} />}
            {modal?.type === 'delete' && <ModalShell title="Delete Institution" onClose={() => setModal(null)}><form action={`/dashboard/admin/universities/${modal.item.id}`} method="POST" className="space-y-4"><input type="hidden" name="_token" value={csrf} /><input type="hidden" name="_method" value="DELETE" /><p className="text-sm leading-6 text-slate-600">Delete <span className="font-black text-slate-950">{modal.item.name}</span>? This is only allowed when the institution has no visit programs.</p><div className="flex justify-end gap-2"><button type="button" onClick={() => setModal(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black">Cancel</button><button className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-black text-white">Delete</button></div></form></ModalShell>}
        </div>
    );
}

function AdminInstitutionMetric({ label, value, detail, icon: Icon, tone = 'slate' }) {
    const tones = { slate: 'bg-slate-100 text-slate-700', amber: 'bg-amber-50 text-amber-700', blue: 'bg-blue-50 text-blue-700', emerald: 'bg-emerald-50 text-emerald-700' };
    return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className={cx('grid h-10 w-10 place-items-center rounded-xl', tones[tone])}><Icon size={18} /></span><p className="mt-5 text-sm font-semibold text-slate-500">{label}</p><p className="mt-2 text-3xl font-black text-slate-950">{value}</p><p className="mt-2 text-xs font-bold text-slate-500">{detail}</p></article>;
}

function AdminUniversityForm({ csrf, title, action, method = 'POST', item = {}, errors = {}, onClose }) {
    return (
        <ModalShell title={title} onClose={onClose}>
            <form action={action} method="POST" className="grid gap-4" onSubmit={() => window.setTimeout(onClose, 0)}>
                <input type="hidden" name="_token" value={csrf} />
                {method !== 'POST' && <input type="hidden" name="_method" value={method} />}
                <LightField label="University Name" name="name" defaultValue={item.name || ''} error={errors.name?.[0]} required />
                <LightField label="Primary Email" name="email" type="email" defaultValue={item.email || ''} error={errors.email?.[0]} required />
                <LightField label={item.id ? 'New Password (optional)' : 'Password (optional)'} name="password" type="password" error={errors.password?.[0]} autoComplete="new-password" />
                <input type="hidden" name="verified" value="0" />
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-bold text-slate-700"><input type="checkbox" name="verified" value="1" defaultChecked={item.id ? item.verificationStatus === 'verified' : true} className="rounded border-slate-300 text-blue-600" /> Verified institution account</label>
                <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black">Cancel</button><button className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">Save Institution</button></div>
            </form>
        </ModalShell>
    );
}

function AdminUniversityDrawer({ item, onClose, setModal }) {
    if (!item) return null;
    return (
        <div className="fixed inset-0 z-50 bg-slate-950/20 backdrop-blur-[1px]" onClick={onClose}>
            <aside className="absolute right-0 top-0 h-full w-full max-w-[620px] overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-14 w-14 place-items-center rounded-xl bg-slate-950 font-black text-white">{item.initials}</span><div><h2 className="text-xl font-black text-slate-950">{item.name}</h2><p className="mt-1 text-sm text-slate-500">{item.region}</p></div></div><button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"><X size={16} /></button></div>
                <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4"><MiniStat label="Programs" value={item.programs.length} /><MiniStat label="Published" value={item.activePrograms} /><MiniStat label="Bookings" value={item.bookings.toLocaleString()} /><MiniStat label="Capacity" value={item.capacity.toLocaleString()} /></div>
                <div className="mt-3 grid grid-cols-3 gap-3"><MiniStat label="Confirmed Seats" value={item.confirmedSeats.toLocaleString()} /><MiniStat label="Waitlisted Seats" value={item.waitlistedSeats.toLocaleString()} /><MiniStat label="Account" value={item.accountStatus} /></div>
                <section className="mt-5 rounded-xl border border-slate-200 p-4"><p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Primary Contact</p><p className="mt-2 font-black text-slate-950">{item.contact}</p><p className="mt-1 text-sm text-slate-500">{item.email}</p><p className="mt-3 text-xs font-black uppercase text-slate-400">Verification</p><p className="mt-1 text-sm font-bold text-slate-700">{item.verificationStatus}</p></section>
                <section className="mt-5 rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Active Programs</p><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-600">{item.programs.length} total</span></div><div className="mt-3 divide-y divide-slate-100">{item.programs.map((program) => (<div key={program.id} className="py-3"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-slate-950">{program.title}</p><p className="mt-1 text-xs font-semibold text-slate-500">{formatShortDate(program.startsAt)} • {program.location || program.venue || 'Location TBA'}</p></div><span className={cx('rounded-full px-2 py-1 text-[10px] font-black uppercase', program.status === 'published' ? 'bg-emerald-50 text-emerald-700' : program.status === 'cancelled' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600')}>{program.status}</span></div><div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, Math.round((Number(program.confirmedSeats || 0) / Math.max(1, Number(program.capacity || 1))) * 100))}%` }} /></div><p className="mt-1 text-xs font-semibold text-slate-500">{Number(program.confirmedSeats || 0).toLocaleString()} / {Number(program.capacity || 0).toLocaleString()} confirmed seats</p></div>))}{item.programs.length === 0 && <p className="py-5 text-sm font-semibold text-slate-500">No visit programs have been created by this institution yet.</p>}</div></section>
                <section className="mt-5 rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Recent Bookings</p><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-600">{item.registrationRows.length} rows</span></div><div className="mt-3 divide-y divide-slate-100">{item.registrationRows.slice(0, 8).map((registration) => (<div key={registration.id} className="flex items-center justify-between gap-3 py-3"><div><p className="font-black text-slate-950">{registration.name}</p><p className="mt-1 text-xs font-semibold text-slate-500">{registration.event} • {registration.school}</p></div><div className="text-right"><p className="font-black text-slate-900">{Number(registration.partySize || 0).toLocaleString()}</p><p className="mt-1 text-[10px] font-black uppercase text-slate-500">{registration.status}</p></div></div>))}{item.registrationRows.length === 0 && <p className="py-5 text-sm font-semibold text-slate-500">No bookings or attendees are connected to this institution yet.</p>}</div></section>
                <section className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4"><p className="font-black text-slate-950">Admin controls</p><p className="mt-1 text-sm leading-6 text-slate-600">Edit account access, verification state, and lifecycle from this master portal. Visit programs remain shared records.</p><button type="button" onClick={() => setModal({ type: 'edit', item })} className="mt-4 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Edit Institution</button></section>
            </aside>
        </div>
    );
}

function enrichAdminUniversity(user, events = [], registrations = []) {
    const ownedEvents = events.filter((event) => Number(event.universityId) === Number(user.id) || event.university === user.name);
    const eventTitles = new Set(ownedEvents.map((event) => event.title));
    const eventIds = new Set(ownedEvents.map((event) => Number(event.id)));
    const bookingRows = registrations.filter((registration) => eventIds.has(Number(registration.eventId)) || eventTitles.has(registration.event));
    const bookings = bookingRows.reduce((total, registration) => total + Number(registration.partySize || 0), 0);
    const capacity = ownedEvents.reduce((total, event) => total + Number(event.capacity || 0), 0);
    const activePrograms = ownedEvents.filter((event) => event.status === 'published').length;
    const confirmedSeats = bookingRows.filter((registration) => registration.status === 'confirmed').reduce((total, registration) => total + Number(registration.partySize || 0), 0);
    const waitlistedSeats = bookingRows.filter((registration) => registration.status === 'waitlisted').reduce((total, registration) => total + Number(registration.partySize || 0), 0);
    const region = user.institutionLocation || user.profileLocation || user.location || 'Not assigned';
    const accountStatus = user.accessStatus || (user.verified ? 'active' : 'pending');
    return { ...user, contact: user.name, initials: (user.name || user.email || 'U').split(' ').map((word) => word[0]).slice(0, 3).join('').toUpperCase(), programs: ownedEvents, registrationRows: bookingRows, activePrograms, bookings, confirmedSeats, waitlistedSeats, capacity, region, accountStatus, verificationStatus: user.verified ? 'verified' : 'unverified', status: accountStatus };
}

function AdminSchoolsSection({ csrf, schools = [], schoolAccounts = [], visitRequests = [], archives = [], errors = {} }) {
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('all');
    const [region, setRegion] = useState('all');
    const [volume, setVolume] = useState('all');
    const [modal, setModal] = useState(null);
    const [accountModal, setAccountModal] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const rows = schools.map((school) => enrichAdminSchool(school, visitRequests, archives));
    const regions = [...new Set(rows.map((school) => school.region).filter(Boolean))].sort();
    const filtered = rows.filter((school) => {
        const haystack = `${school.name} ${school.code} ${school.district} ${school.coordinatorName} ${school.city} ${school.region}`.toLowerCase();
        const highVolume = school.activeApplicants >= 500;
        return (!query || haystack.includes(query.toLowerCase()))
            && (status === 'all' || school.status === status)
            && (region === 'all' || school.region === region)
            && (volume === 'all' || (volume === 'high' ? highVolume : !highVolume));
    });
    const selected = rows.find((school) => school.id === selectedId);
    const verified = rows.filter((school) => school.status === 'verified').length;
    const pending = rows.filter((school) => school.status === 'pending').length;
    const suspended = rows.filter((school) => school.status === 'suspended').length;
    const activeStudents = rows.reduce((total, school) => total + Number(school.activeApplicants || 0), 0);
    const topRegion = regions.map((item) => ({ name: item, count: rows.filter((school) => school.region === item).length })).sort((left, right) => right.count - left.count)[0];
    const schoolMapPoints = filtered.slice(0, 30).map((school) => ({
        label: school.name,
        location: `${school.city}, ${school.country}`,
        latitude: school.latitude,
        longitude: school.longitude,
        meta: `${school.activeApplicants || 0} students • ${school.status}`,
    }));
    const activeSchoolAccounts = schoolAccounts.filter((account) => account.status === 'active').length;
    const registeredStudentCount = schoolAccounts.reduce((total, account) => total + Number(account.studentCount || 0), 0);
    const registeredCoordinatorCount = schoolAccounts.reduce((total, account) => total + Number(account.coordinatorCount || 0), 0);

    return (
        <div className="grid gap-6">
            <section className="grid gap-4 md:grid-cols-4">
                <AdminInstitutionMetric label="Verified Outreach Records" value={verified} detail={`${rows.length} total outreach rows`} icon={School} tone="emerald" />
                <AdminInstitutionMetric label="Pending Outreach Review" value={pending} detail="Need admin verification" icon={Clock} tone="amber" />
                <AdminInstitutionMetric label="Active Applicants" value={activeStudents.toLocaleString()} detail="Saved outreach volume" icon={UsersRound} tone="blue" />
                <AdminInstitutionMetric label="Suspended Outreach" value={suspended} detail="Restricted outreach records" icon={ShieldCheck} />
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-xl font-black text-slate-950">Registered School Accounts</h2>
                        <p className="mt-1 text-sm text-slate-500">{schoolAccounts.length} school record(s) · {activeSchoolAccounts} active · {registeredCoordinatorCount} coordinator account(s) · {registeredStudentCount} student account(s)</p>
                    </div>
                    <button type="button" onClick={() => setAccountModal({ type: 'create' })} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white"><Plus size={14} className="inline" /> Add School Account</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[960px] text-left text-sm">
                        <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-[0.08em] text-slate-500"><tr><th className="px-5 py-3">School Account</th><th className="px-5 py-3">Primary Coordinator</th><th className="px-5 py-3">Linked Users</th><th className="px-5 py-3">Platform Activity</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {schoolAccounts.map((account) => (
                                <tr key={account.id} className="hover:bg-slate-50">
                                    <td className="px-5 py-4"><p className="font-black text-slate-950">{account.name}</p><p className="mt-1 text-xs font-semibold text-slate-500">{account.location || 'Location not recorded'}</p></td>
                                    <td className="px-5 py-4"><p className="font-bold text-slate-800">{account.coordinatorName || 'Not assigned'}</p><p className="mt-1 text-xs text-slate-500">{account.coordinatorEmail || 'No coordinator email'}{account.coordinatorPhone ? ` · ${account.coordinatorPhone}` : ''}</p>{(account.coordinators || []).length > 0 && <p className="mt-1 max-w-[260px] truncate text-[10px] font-bold text-slate-400" title={(account.coordinators || []).map((coordinator) => `${coordinator.name} (${coordinator.accessStatus}${coordinator.verified ? ', verified' : ', unverified'})`).join(', ')}>Linked: {(account.coordinators || []).slice(0, 2).map((coordinator) => `${coordinator.name} · ${coordinator.accessStatus}`).join(', ')}</p>}</td>
                                    <td className="px-5 py-4"><p className="font-black text-slate-900">{Number(account.userCount || 0).toLocaleString()} total</p><p className="mt-1 text-xs text-slate-500">{Number(account.studentCount || 0).toLocaleString()} students · {Number(account.coordinatorCount || 0).toLocaleString()} coordinators</p></td>
                                    <td className="px-5 py-4"><p className="font-black text-slate-900">{Number(account.programCount || 0).toLocaleString()} programs</p><p className="mt-1 text-xs text-slate-500">{Number(account.visitRequestCount || 0).toLocaleString()} requests · {Number(account.registrationCount || 0).toLocaleString()} registrations</p></td>
                                    <td className="px-5 py-4"><AdminSchoolAccountStatusBadge status={account.status} /><p className="mt-2 text-[10px] font-black uppercase text-slate-400">Email alerts {account.emailNotifications ? 'on' : 'off'}</p></td>
                                    <td className="px-5 py-4 text-right"><div className="flex justify-end gap-1"><button type="button" onClick={() => setAccountModal({ type: 'edit', item: account })} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" title="Edit registered school account"><Edit3 size={17} /></button>{account.canDelete ? <button type="button" onClick={() => setAccountModal({ type: 'delete', item: account })} className="rounded-lg p-2 text-rose-700 hover:bg-rose-50" title="Delete registered school account"><Trash2 size={17} /></button> : <button type="button" disabled className="rounded-lg p-2 text-slate-300" title="Cannot delete while users, programs, requests, or registrations are linked"><Trash2 size={17} /></button>}</div></td>
                                </tr>
                            ))}
                            {schoolAccounts.length === 0 && <tr><td colSpan="6" className="px-5 py-10 text-center"><EmptyState title="No registered school accounts" message="Add a school account before linking coordinators and students." /></td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
                        <div><h2 className="text-xl font-black text-slate-950">Outreach Directory</h2><p className="mt-1 text-sm text-slate-500">Shared target-school outreach records used for university relationship planning.</p></div>
                        <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => exportRowsToCsv('admin-schools.csv', [['Code', 'Name', 'District', 'Coordinator', 'Students', 'Status'], ...filtered.map((school) => [school.code, school.name, school.district, school.coordinatorName, school.activeApplicants, school.status])])} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"><Download size={14} className="inline" /> Export</button>
                            <button type="button" onClick={() => setModal({ type: 'create' })} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white"><Plus size={14} className="inline" /> New Outreach Entry</button>
                        </div>
                    </div>
                    <div className="grid gap-3 border-b border-slate-200 bg-slate-50/70 p-4 md:grid-cols-4">
                        <label className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-500"><Search size={15} className="inline text-slate-400" /> <input value={query} onChange={(event) => setQuery(event.target.value)} className="ml-2 w-[80%] bg-transparent outline-none" placeholder="Name, code, coordinator..." /></label>
                        <select value={region} onChange={(event) => setRegion(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"><option value="all">Region: All Territories</option>{regions.map((item) => <option key={item} value={item}>{item}</option>)}</select>
                        <select value={volume} onChange={(event) => setVolume(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"><option value="all">Student Volume: All</option><option value="high">High Volume</option><option value="standard">Standard Volume</option></select>
                        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"><option value="all">All Statuses</option><option value="verified">Verified</option><option value="pending">Pending</option><option value="suspended">Suspended</option></select>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px] text-left text-sm">
                            <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-[0.08em] text-slate-500"><tr><th className="px-5 py-4">School Name & Code</th><th className="px-5 py-4">District</th><th className="px-5 py-4">Coordinator</th><th className="px-5 py-4 text-center">Active Students</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map((school) => (
                                    <tr key={school.id} className="group hover:bg-slate-50">
                                        <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-xs font-black text-blue-700">{school.initials}</span><span><span className="block font-black text-slate-950">{school.name}</span><span className="mt-0.5 block text-xs font-semibold text-slate-500">CODE: {school.code}</span></span></div></td>
                                        <td className="px-5 py-4"><p className="font-bold text-slate-800">{school.district}</p><p className="mt-1 text-xs text-slate-500">{school.city}, {school.country}</p></td>
                                        <td className="px-5 py-4"><p className="font-bold text-slate-800">{school.coordinatorName}</p><p className="mt-1 text-xs text-slate-500">{school.coordinatorEmail || 'No email on file'}</p></td>
                                        <td className="px-5 py-4 text-center font-black text-slate-900">{Number(school.activeApplicants || 0).toLocaleString()}</td>
                                        <td className="px-5 py-4"><AdminSchoolStatusBadge status={school.status} /></td>
                                        <td className="px-5 py-4 text-right"><div className="flex justify-end gap-1"><button type="button" onClick={() => setSelectedId(school.id)} className="rounded-lg p-2 text-blue-700 hover:bg-blue-50" title="View details"><Search size={17} /></button><button type="button" onClick={() => setModal({ type: 'edit', item: school })} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" title="Edit school"><Edit3 size={17} /></button>{school.status !== 'verified' && <AdminSchoolStatusForm csrf={csrf} school={school} status="verified" label="Verify" />}{school.status !== 'suspended' && <AdminSchoolStatusForm csrf={csrf} school={school} status="suspended" label="Suspend" />}{school.status === 'suspended' && <AdminSchoolStatusForm csrf={csrf} school={school} status="pending" label="Review" />}<button type="button" onClick={() => setModal({ type: 'delete', item: school })} className="rounded-lg p-2 text-rose-700 hover:bg-rose-50" title="Delete school"><Trash2 size={17} /></button></div></td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && <tr><td colSpan="6" className="px-5 py-14 text-center"><EmptyState message="No outreach records match these filters." /></td></tr>}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-4 text-xs font-bold text-slate-500"><span>Showing {filtered.length} of {rows.length} outreach records</span><span>Outreach directory is database-backed</span></div>
                </div>

                <aside className="space-y-4">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-4"><h3 className="font-black text-slate-950">Regional Clusters</h3><OpenStreetMapLink location={topRegion?.name || 'United States'} className="text-xs font-black text-blue-700">Open map</OpenStreetMapLink></div>
                        <div className="h-48"><OpenStreetMapEmbed location={topRegion?.name || 'United States'} points={schoolMapPoints} title="Admin school locations on OpenStreetMap" className="h-48 rounded-none border-0" /></div>
                        <div className="p-4"><p className="text-xs font-black uppercase text-slate-400">Top Region</p><p className="mt-1 font-black text-slate-950">{topRegion?.name || 'No region yet'}</p><div className="mt-3 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${topRegion ? Math.min(100, (topRegion.count / Math.max(1, rows.length)) * 100) : 0}%` }} /></div></div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-black text-slate-950">Directory Analytics</h3><div className="mt-4 space-y-3"><MiniStat label="Saved Priority Avg." value={`${rows.length ? Math.round(rows.reduce((sum, school) => sum + Number(school.matchScore || 0), 0) / rows.length) : 0}/100`} /><MiniStat label="Visit Requests" value={rows.reduce((sum, school) => sum + Number(school.visitRequests || 0), 0)} /><MiniStat label="Archive Visits" value={rows.reduce((sum, school) => sum + Number(school.archiveVisits || 0), 0)} /></div></div>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm"><Sparkles size={18} className="text-emerald-700" /><h3 className="mt-3 font-black text-slate-950">Admin Insight</h3><p className="mt-2 text-sm leading-6 text-slate-600">{pending > 0 ? `${pending} outreach record(s) need verification.` : 'The outreach directory is verified. Monitor suspended and high-volume records weekly.'}</p></div>
                </aside>
            </section>

            <AdminSchoolDrawer school={selected} onClose={() => setSelectedId(null)} setModal={setModal} />
            {modal?.type === 'create' && <AdminSchoolForm csrf={csrf} title="New Outreach Entry" action="/dashboard/admin/schools" errors={errors} onClose={() => setModal(null)} />}
            {modal?.type === 'edit' && <AdminSchoolForm csrf={csrf} title="Edit Outreach Entry" action={`/dashboard/admin/schools/${modal.item.id}`} method="PUT" item={modal.item} errors={errors} onClose={() => setModal(null)} />}
            {modal?.type === 'delete' && <ModalShell title="Delete Outreach Entry" onClose={() => setModal(null)}><form action={`/dashboard/admin/schools/${modal.item.id}`} method="POST" className="space-y-4"><input type="hidden" name="_token" value={csrf} /><input type="hidden" name="_method" value="DELETE" /><p className="text-sm leading-6 text-slate-600">Delete <span className="font-black text-slate-950">{modal.item.name}</span>? Outreach records with shared visit activity cannot be deleted.</p><div className="flex justify-end gap-2"><button type="button" onClick={() => setModal(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black">Cancel</button><button className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-black text-white">Delete</button></div></form></ModalShell>}
            {accountModal?.type === 'create' && <AdminSchoolAccountForm csrf={csrf} title="Add Registered School Account" action="/dashboard/admin/school-accounts" errors={errors} onClose={() => setAccountModal(null)} />}
            {accountModal?.type === 'edit' && <AdminSchoolAccountForm csrf={csrf} title="Edit Registered School Account" action={`/dashboard/admin/school-accounts/${accountModal.item.id}`} method="PUT" item={accountModal.item} errors={errors} onClose={() => setAccountModal(null)} />}
            {accountModal?.type === 'delete' && <ModalShell title="Delete Registered School Account" onClose={() => setAccountModal(null)}><form action={`/dashboard/admin/school-accounts/${accountModal.item.id}`} method="POST" className="space-y-4"><input type="hidden" name="_token" value={csrf} /><input type="hidden" name="_method" value="DELETE" /><p className="text-sm leading-6 text-slate-600">Delete <span className="font-black text-slate-950">{accountModal.item.name}</span>? This is available only because the account has no linked users, programs, visit requests, or registrations.</p><div className="flex justify-end gap-2"><button type="button" onClick={() => setAccountModal(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black">Cancel</button><button className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-black text-white">Delete Account</button></div></form></ModalShell>}
        </div>
    );
}

function AdminSchoolAccountStatusBadge({ status }) {
    const styles = {
        active: 'bg-emerald-50 text-emerald-700',
        pending: 'bg-amber-50 text-amber-700',
        suspended: 'bg-rose-50 text-rose-700',
    };
    return <span className={cx('inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase', styles[status] || styles.pending)}>{status || 'pending'}</span>;
}

function AdminSchoolAccountForm({ csrf, title, action, method = 'POST', item = {}, errors = {}, onClose }) {
    return (
        <ModalShell title={title} onClose={onClose}>
            <form action={action} method="POST" className="grid gap-4" onSubmit={() => window.setTimeout(onClose, 0)}>
                <input type="hidden" name="_token" value={csrf} />
                {method !== 'POST' && <input type="hidden" name="_method" value={method} />}
                <LightField label="School Name" name="name" defaultValue={item.name || ''} error={errors.name?.[0]} required />
                <LightField label="Location" name="location" defaultValue={item.location || ''} error={errors.location?.[0]} required />
                <div className="grid gap-4 md:grid-cols-2">
                    <LightField label="Coordinator Name" name="coordinator_name" defaultValue={item.coordinatorName || ''} error={errors.coordinator_name?.[0]} />
                    <LightField label="Coordinator Email" name="coordinator_email" type="email" defaultValue={item.coordinatorEmail || ''} error={errors.coordinator_email?.[0]} />
                </div>
                <LightField label="Coordinator Phone" name="coordinator_phone" type="tel" defaultValue={item.coordinatorPhone || ''} error={errors.coordinator_phone?.[0]} />
                <input type="hidden" name="email_notifications" value="0" />
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-bold text-slate-700"><input type="checkbox" name="email_notifications" value="1" defaultChecked={item.id ? !!item.emailNotifications : true} className="rounded border-slate-300 text-blue-600" /> Send platform email notifications for this school</label>
                {item.id && <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3"><MiniStat label="Users" value={Number(item.userCount || 0)} /><MiniStat label="Programs" value={Number(item.programCount || 0)} /><MiniStat label="Requests" value={Number(item.visitRequestCount || 0)} /></div>}
                <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black">Cancel</button><button className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">Save School Account</button></div>
            </form>
        </ModalShell>
    );
}

function AdminSchoolStatusBadge({ status }) {
    const styles = {
        verified: 'bg-emerald-50 text-emerald-700',
        pending: 'bg-amber-50 text-amber-700',
        suspended: 'bg-rose-50 text-rose-700',
    };
    return <span className={cx('inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase', styles[status] || styles.pending)}>{status}</span>;
}

function AdminSchoolStatusForm({ csrf, school, status, label }) {
    return <form action={`/dashboard/admin/schools/${school.id}/status`} method="POST"><input type="hidden" name="_token" value={csrf} /><input type="hidden" name="status" value={status} /><button className="rounded-lg px-2 py-2 text-xs font-black text-slate-700 hover:bg-slate-100">{label}</button></form>;
}

function AdminSchoolForm({ csrf, title, action, method = 'POST', item = {}, errors = {}, onClose }) {
    return (
        <ModalShell title={title} onClose={onClose}>
            <form action={action} method="POST" className="grid gap-4" onSubmit={() => window.setTimeout(onClose, 0)}>
                <input type="hidden" name="_token" value={csrf} />
                {method !== 'POST' && <input type="hidden" name="_method" value={method} />}
                <div className="grid gap-4 md:grid-cols-2">
                    <LightField label="School Name" name="name" defaultValue={item.name || ''} error={errors.name?.[0]} required />
                    <LightField label="School Code" name="school_code" defaultValue={item.code || ''} error={errors.school_code?.[0]} />
                    <LightField label="City" name="city" defaultValue={item.city || ''} error={errors.city?.[0]} required />
                    <LightField label="Region" name="region" defaultValue={item.region || ''} error={errors.region?.[0]} required />
                    <LightField label="Country" name="country" defaultValue={item.country || 'United States'} error={errors.country?.[0]} required />
                    <LightField label="District" name="district" defaultValue={item.district || ''} error={errors.district?.[0]} />
                    <LightField label="Latitude" name="latitude" type="number" step="0.0000001" defaultValue={item.latitude ?? ''} error={errors.latitude?.[0]} />
                    <LightField label="Longitude" name="longitude" type="number" step="0.0000001" defaultValue={item.longitude ?? ''} error={errors.longitude?.[0]} />
                    <LightField label="Coordinator Name" name="coordinator_name" defaultValue={item.coordinatorName || ''} error={errors.coordinator_name?.[0]} />
                    <LightField label="Coordinator Email" name="coordinator_email" type="email" defaultValue={item.coordinatorEmail || ''} error={errors.coordinator_email?.[0]} />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    <AdminSelect label="Status" name="status" value={item.status || 'verified'} options={[['verified', 'Verified'], ['pending', 'Pending'], ['suspended', 'Suspended']]} />
                    <AdminSelect label="School Type" name="school_type" value={item.type || 'private'} options={[['public', 'Public'], ['private', 'Private'], ['ib_school', 'IB School'], ['charter', 'Charter']]} />
                    <AdminSelect label="Tier" name="performance_tier" value={item.tier || 'stable'} options={[['elite', 'Elite'], ['high', 'High'], ['emerging', 'Emerging'], ['stable', 'Stable']]} />
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                    <LightField label="Average SAT" name="average_sat" type="number" defaultValue={item.sat || ''} error={errors.average_sat?.[0]} />
                    <LightField label="Yield Rate" name="yield_rate" type="number" step="0.01" defaultValue={item.yieldRate ?? 0} error={errors.yield_rate?.[0]} required />
                    <LightField label="Saved Priority Score" name="match_score" type="number" defaultValue={item.matchScore ?? 0} error={errors.match_score?.[0]} required />
                    <LightField label="Active Students" name="active_applicants" type="number" defaultValue={item.activeApplicants ?? 0} error={errors.active_applicants?.[0]} required />
                </div>
                <label className="grid gap-1 text-sm font-bold text-slate-700">Notes<textarea name="notes" defaultValue={item.notes || ''} className="min-h-24 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium" /></label>
                <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black">Cancel</button><button className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">Save School</button></div>
            </form>
        </ModalShell>
    );
}

function AdminSelect({ label, name, value, options }) {
    return <label className="grid gap-1 text-sm font-bold text-slate-700">{label}<select name={name} defaultValue={value} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>;
}

function AdminSchoolDrawer({ school, onClose, setModal }) {
    if (!school) return null;
    return (
        <div className="fixed inset-0 z-50 bg-slate-950/20 backdrop-blur-[1px]" onClick={onClose}>
            <aside className="absolute right-0 top-0 h-full w-full max-w-[520px] overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-14 w-14 place-items-center rounded-xl bg-blue-50 font-black text-blue-700">{school.initials}</span><div><h2 className="text-xl font-black text-slate-950">{school.name}</h2><p className="mt-1 text-sm text-slate-500">CODE: {school.code} • {school.city}, {school.country}</p></div></div><button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"><X size={16} /></button></div>
                <div className="mt-5 grid grid-cols-2 gap-3"><MiniStat label="Active Students" value={Number(school.activeApplicants || 0).toLocaleString()} /><MiniStat label="Saved Priority" value={`${school.matchScore}/100`} /><MiniStat label="Requests" value={school.visitRequests} /><MiniStat label="Archives" value={school.archiveVisits} /></div>
                <section className="mt-5 rounded-xl border border-slate-200 p-4"><p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Coordinator</p><p className="mt-2 font-black text-slate-950">{school.coordinatorName}</p><p className="mt-1 text-sm text-slate-500">{school.coordinatorEmail || 'No email on file'}</p><div className="mt-4"><AdminSchoolStatusBadge status={school.status} /></div></section>
                <section className="mt-5 rounded-xl border border-slate-200 p-4"><p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Engagement Profile</p><p className="mt-2 text-sm leading-6 text-slate-600">Tier: <span className="font-black capitalize">{school.tier}</span>. Type: <span className="font-black capitalize">{String(school.type || '').replace('_', ' ')}</span>. Yield rate: <span className="font-black">{school.yieldRate}%</span>.</p><p className="mt-3 text-sm leading-6 text-slate-600">{school.notes || 'No internal notes yet.'}</p></section>
                <section className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4"><p className="font-black text-slate-950">Admin controls</p><p className="mt-1 text-sm leading-6 text-slate-600">Edit directory fields, coordinator data, verification status, and engagement signals from this master portal.</p><button type="button" onClick={() => setModal({ type: 'edit', item: school })} className="mt-4 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Edit School</button></section>
            </aside>
        </div>
    );
}

function enrichAdminSchool(school, visitRequests = [], archives = []) {
    const requestCount = Number(school.visitRequests ?? visitRequests.filter((request) => Number(request.schoolId) === Number(school.id) || request.school === school.name).length);
    const archiveCount = Number(school.archiveVisits ?? archives.filter((archive) => Number(archive.schoolId) === Number(school.id) || archive.school === school.name).length);
    return { ...school, initials: (school.name || 'S').split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase(), code: school.code || `SCH-${String(school.id).padStart(4, '0')}`, district: school.district || school.region || 'Unassigned territory', coordinatorName: school.coordinatorName || 'Coordinator pending', status: school.status || 'verified', visitRequests: requestCount, archiveVisits: archiveCount };
}

function AdminVisitActivitySection({ csrf, events = [], visitRequests = [], registrations = [], archives = [] }) {
    const [tab, setTab] = useState('active');
    const [query, setQuery] = useState('');
    const [selectedId, setSelectedId] = useState(null);
    const rows = adminVisitRows(events, visitRequests, registrations, archives);
    const filtered = rows.filter((row) => {
        const haystack = `${row.idLabel} ${row.university} ${row.school} ${row.title} ${row.location} ${row.status}`.toLowerCase();
        const matchesTab = tab === 'active'
            ? ['confirmed', 'approved', 'scheduled', 'in_progress', 'action_required'].includes(row.status)
            : tab === 'pending'
                ? ['requested', 'waitlisted'].includes(row.status)
                : ['archived', 'completed', 'cancelled', 'declined'].includes(row.status);

        return matchesTab && (!query || haystack.includes(query.toLowerCase()));
    });
    const selected = rows.find((row) => row.id === selectedId);
    const urgentRows = rows.filter((row) => row.severity === 'urgent');
    const warningRows = rows.filter((row) => row.severity === 'warning');
    const activeRows = rows.filter((row) => ['confirmed', 'approved', 'scheduled', 'in_progress', 'action_required'].includes(row.status));
    const bookedSeats = registrations.reduce((sum, registration) => sum + Number(registration.partySize || 0), 0);
    const zonePoints = filtered.slice(0, 20).map((row) => ({
        label: `${row.idLabel} ${row.university}`,
        location: row.location || row.region || row.school,
        latitude: row.latitude,
        longitude: row.longitude,
        meta: `${row.school} • ${row.attendees} attendee(s) • ${row.status}`,
    }));
    const exportActivity = () => exportRowsToCsv('visit-activity.csv', [
        ['ID', 'University', 'School', 'Visit Date', 'Attendees', 'Status', 'Location'],
        ...filtered.map((row) => [row.idLabel, row.university, row.school, row.dateLabel, row.attendees, row.status, row.location]),
    ]);
    const topRegion = filtered.find((row) => row.location)?.location || rows.find((row) => row.location)?.location || 'United States';

    return (
        <div className="grid gap-6">
            <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-950">Visit Activity & Logistics</h1>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Current oversight of recruitment operations, shared visit requests, event capacity, and campus outreach across all recorded locations.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={exportActivity} className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-black text-blue-700"><Download size={16} className="inline" /> Export Report</button>
                    <button type="button" onClick={() => setTab('pending')} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"><Plus size={16} className="inline" /> Review Requests</button>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-4">
                <AdminInstitutionMetric label="Active Visits" value={activeRows.length} detail="Live and scheduled operations" icon={CalendarDays} tone="blue" />
                <AdminInstitutionMetric label="Pending Requests" value={rows.filter((row) => row.status === 'requested').length} detail="Need decision" icon={Clock} tone="amber" />
                <AdminInstitutionMetric label="Booked Seats" value={bookedSeats.toLocaleString()} detail="Across registration records" icon={UsersRound} tone="emerald" />
                <AdminInstitutionMetric label="Alerts" value={urgentRows.length + warningRows.length} detail="Capacity and request review" icon={ShieldCheck} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
                <aside className="space-y-5">
                    <div className="rounded-2xl border-l-4 border-rose-600 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-rose-700"><ShieldCheck size={18} /><h3 className="text-xs font-black uppercase tracking-[0.16em]">Activity Warnings</h3></div>
                        <div className="mt-4 space-y-3">
                            {[...urgentRows, ...warningRows].slice(0, 3).map((row) => (
                                <button key={row.id} type="button" onClick={() => setSelectedId(row.id)} className={cx('w-full rounded-xl border p-3 text-left', row.severity === 'urgent' ? 'border-rose-100 bg-rose-50' : 'border-slate-200 bg-slate-50')}>
                                    <div className="flex items-start justify-between gap-3"><p className={cx('font-black', row.severity === 'urgent' ? 'text-rose-800' : 'text-slate-950')}>{row.alertTitle}</p><span className={cx('rounded-full px-2 py-0.5 text-[9px] font-black uppercase', row.severity === 'urgent' ? 'bg-rose-600 text-white' : 'bg-amber-100 text-amber-700')}>{row.severity}</span></div>
                                    <p className="mt-1 text-xs leading-5 text-slate-600">{row.alertBody}</p>
                                </button>
                            ))}
                            {urgentRows.length + warningRows.length === 0 && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">No activity warnings detected.</p>}
                        </div>
                        <button type="button" onClick={() => setTab('pending')} className="mt-4 w-full border-t border-slate-100 pt-4 text-center text-sm font-black text-blue-700">Resolve pending issues</button>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-4"><h3 className="font-black text-slate-950">Recorded Visit Locations</h3><span className="text-[10px] font-black text-emerald-600">CURRENT DATA</span></div>
                        <div className="relative h-56"><OpenStreetMapEmbed location={topRegion} points={zonePoints} title="Visit activity tagged on OpenStreetMap" className="h-56 rounded-none border-0" /><div className="absolute left-4 top-4 max-w-[220px] rounded-xl border border-white bg-white/95 p-3 shadow-lg"><p className="text-sm font-black text-slate-950">Activity Map</p><p className="mt-1 text-xs leading-5 text-slate-500">{activeRows.length} active records • {topRegion}</p></div></div>
                    </div>
                </aside>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
                        <div><h2 className="text-xl font-black text-slate-950">Master Booking List</h2><p className="mt-1 text-sm text-slate-500">Shared records shown as visit requests, school requests, and admin visit activity.</p></div>
                        <div className="flex flex-wrap items-center gap-2">
                            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search visits, IDs, institutions..." className="w-56 bg-transparent outline-none" /></label>
                            <div className="rounded-xl bg-slate-100 p-1">
                                {['active', 'pending', 'archived'].map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={cx('rounded-lg px-4 py-2 text-xs font-black capitalize', tab === item ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500')}>{item}</button>)}
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[920px] text-left text-sm">
                            <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-[0.08em] text-slate-500"><tr><th className="px-5 py-4">ID & University</th><th className="px-5 py-4">School</th><th className="px-5 py-4">Visit Date</th><th className="px-5 py-4">Attendees</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map((row) => (
                                    <tr key={row.id} className={cx('group hover:bg-slate-50', row.severity === 'urgent' && 'border-l-4 border-rose-600')}>
                                        <td className="px-5 py-4"><p className={cx('font-black', row.severity === 'urgent' ? 'text-rose-700' : 'text-blue-700')}>{row.idLabel}</p><p className="mt-1 text-sm font-semibold text-slate-700">{row.university}</p></td>
                                        <td className="px-5 py-4 text-slate-600">{row.school}</td>
                                        <td className="px-5 py-4"><p className={cx('font-black', row.severity === 'urgent' ? 'text-rose-700' : 'text-slate-900')}>{row.dateLabel}</p><p className="mt-1 text-[10px] font-bold uppercase text-slate-400">{row.timeLabel}</p></td>
                                        <td className="px-5 py-4 font-black text-slate-800">{Number(row.attendees || 0).toLocaleString()}</td>
                                        <td className="px-5 py-4"><AdminVisitStatusBadge status={row.status} /></td>
                                        <td className="px-5 py-4 text-right"><div className="flex justify-end gap-1"><button type="button" onClick={() => setSelectedId(row.id)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><MoreVertical size={17} /></button>{row.requestId && row.status === 'requested' && <><AdminVisitDecisionForm csrf={csrf} requestId={row.requestId} decision="approved" label="Approve" /><AdminVisitDecisionForm csrf={csrf} requestId={row.requestId} decision="declined" label="Decline" /></>}</div></td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && <tr><td colSpan="6" className="px-5 py-14 text-center"><EmptyState message="No visit activity matches this view." /></td></tr>}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-4 text-xs font-bold text-slate-500"><span>Showing {filtered.length} of {rows.length} records</span><span>Live database records</span></div>
                </section>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-slate-950 p-5 text-white shadow-sm"><p className="text-xs font-black uppercase tracking-[0.16em] text-white/60">Tracked Activity</p><p className="mt-4 text-4xl font-black">{rows.length.toLocaleString()}</p><p className="mt-2 text-sm text-white/70">Visit programs, requests, and archive records in this activity view.</p></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Visit Programs</p><p className="mt-4 text-2xl font-black text-slate-950">{events.length.toLocaleString()}</p><p className="mt-2 text-sm text-slate-500">Current campus event records included in admin oversight.</p></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Archived Visits</p><p className="mt-4 text-2xl font-black text-slate-950">{archives.length.toLocaleString()}</p><p className="mt-2 text-sm text-slate-500">Saved visit archive records, with no inferred health score.</p></div>
            </section>

            <AdminVisitActivityDrawer row={selected} onClose={() => setSelectedId(null)} csrf={csrf} />
        </div>
    );
}

function AdminVisitDecisionForm({ csrf, requestId, decision, label }) {
    return <form action={`/visit-requests/${requestId}/decision`} method="POST"><input type="hidden" name="_token" value={csrf} /><input type="hidden" name="decision" value={decision} /><button className={cx('rounded-lg px-2 py-2 text-xs font-black', decision === 'declined' ? 'text-rose-700 hover:bg-rose-50' : 'text-emerald-700 hover:bg-emerald-50')}>{label}</button></form>;
}

function AdminVisitStatusBadge({ status }) {
    const styles = {
        confirmed: 'bg-emerald-50 text-emerald-700',
        approved: 'bg-emerald-50 text-emerald-700',
        scheduled: 'bg-blue-50 text-blue-700',
        in_progress: 'bg-blue-50 text-blue-700',
        requested: 'bg-amber-50 text-amber-700',
        waitlisted: 'bg-amber-50 text-amber-700',
        action_required: 'bg-rose-50 text-rose-700',
        declined: 'bg-rose-50 text-rose-700',
        archived: 'bg-slate-100 text-slate-600',
        completed: 'bg-slate-100 text-slate-600',
        cancelled: 'bg-rose-50 text-rose-700',
    };
    return <span className={cx('inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase', styles[status] || styles.archived)}>{String(status || 'active').replace('_', ' ')}</span>;
}

function AdminVisitActivityDrawer({ row, onClose, csrf }) {
    if (!row) return null;
    return (
        <div className="fixed inset-0 z-50 bg-slate-950/20 backdrop-blur-[1px]" onClick={onClose}>
            <aside className="absolute right-0 top-0 h-full w-full max-w-[460px] overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">{row.idLabel}</p><h2 className="mt-1 text-2xl font-black text-slate-950">{row.title}</h2><p className="mt-1 text-sm font-semibold text-slate-500">{row.university} • {row.school}</p></div><button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-500"><X size={16} /></button></div>
                <div className="mt-5 grid grid-cols-2 gap-3"><MiniStat label="Attendees" value={row.attendees} /><MiniStat label="Priority" value={row.priority} /><MiniStat label="Status" value={row.status} /><MiniStat label="Source" value={row.source} /></div>
                <section className="mt-5 rounded-xl border border-slate-200 p-4"><p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Location</p><p className="mt-2 font-black text-slate-950">{row.location || 'Location TBA'}</p><div className="mt-3"><OpenStreetMapEmbed location={row.location || row.school || row.university} points={[{ label: row.title, location: row.location || row.school, latitude: row.latitude, longitude: row.longitude, meta: `${row.dateLabel} • ${row.attendees} attendee(s)` }]} title={`${row.title} visit activity location`} className="h-40" /></div></section>
                <section className="mt-5 rounded-xl border border-slate-200 p-4"><p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Logistics Notes</p><p className="mt-2 text-sm leading-6 text-slate-600">{row.notes || row.alertBody || 'No additional logistics notes on this record.'}</p></section>
                {row.requestId && row.status === 'requested' && <section className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="font-black text-slate-950">Pending request decision</p><div className="mt-4 flex gap-2"><AdminVisitDecisionForm csrf={csrf} requestId={row.requestId} decision="approved" label="Approve" /><AdminVisitDecisionForm csrf={csrf} requestId={row.requestId} decision="declined" label="Decline" /></div></section>}
            </aside>
        </div>
    );
}

function adminVisitRows(events = [], visitRequests = [], registrations = [], archives = []) {
    const requestRows = visitRequests.map((request) => {
        const severity = request.status === 'requested' && Number(request.priority || 0) >= 4 ? 'urgent' : request.status === 'requested' ? 'warning' : 'normal';
        return {
            id: `request-${request.id}`,
            requestId: request.id,
            idLabel: `#BK-${String(request.id).padStart(4, '0')}`,
            title: request.event || 'Visit request',
            university: request.university || 'Institution pending',
            school: request.school || 'School pending',
            dateLabel: request.window || formatShortDate(request.eventDate),
            timeLabel: request.eventDate ? formatTimeRange(request.eventDate, null) : 'Requested window',
            attendees: Number(request.groupSize || 0),
            status: request.status === 'approved' ? 'approved' : request.status === 'scheduled' ? 'scheduled' : request.status === 'declined' ? 'declined' : 'requested',
            location: request.eventLocation || request.location || request.region,
            region: request.region,
            priority: request.priority || 1,
            notes: request.notes,
            source: 'Visit Request',
            severity,
            alertTitle: severity === 'urgent' ? `High priority: ${request.school}` : `Pending request: ${request.school}`,
            alertBody: `${request.school || 'School'} requested ${request.groupSize || 0} attendee(s) for ${request.event || 'a visit program'}.`,
        };
    });

    const eventRows = events.map((event) => {
        const relatedRegistrations = registrations.filter((registration) => Number(registration.eventId) === Number(event.id) || registration.event === event.title);
        const attendees = relatedRegistrations.reduce((sum, registration) => sum + Number(registration.partySize || 0), 0) || Number(event.confirmedSeats || 0);
        const capacity = Number(event.capacity || 0);
        const severity = capacity > 0 && attendees > capacity ? 'urgent' : capacity > 0 && attendees / capacity > 0.9 ? 'warning' : 'normal';
        return {
            id: `event-${event.id}`,
            idLabel: `#EV-${String(event.id).padStart(4, '0')}`,
            title: event.title,
            university: event.university || 'Institution',
            school: relatedRegistrations[0]?.school || 'Multiple schools',
            dateLabel: formatShortDate(event.startsAt),
            timeLabel: formatTimeRange(event.startsAt, event.endsAt),
            attendees,
            status: event.status === 'published' ? 'confirmed' : event.status === 'cancelled' ? 'cancelled' : event.status || 'scheduled',
            location: event.location || event.venue,
            latitude: event.latitude,
            longitude: event.longitude,
            priority: severity === 'urgent' ? 5 : severity === 'warning' ? 3 : 1,
            source: 'Visit Program',
            severity,
            notes: event.description,
            alertTitle: severity === 'urgent' ? `Capacity conflict: ${event.title}` : `Capacity watch: ${event.title}`,
            alertBody: `${attendees}/${capacity || 'open'} attendee seats currently allocated.`,
        };
    });

    const archiveRows = archives.map((archive) => ({
        id: `archive-${archive.id}`,
        idLabel: `#AR-${String(archive.id).padStart(4, '0')}`,
        title: archive.type || 'Archived visit',
        university: 'Archive',
        school: archive.school || 'School',
        dateLabel: formatShortDate(archive.visitedOn),
        timeLabel: 'Completed visit',
        attendees: Number(archive.leads || 0),
        status: archive.status === 'pending_sync' ? 'action_required' : 'archived',
        location: archive.location || archive.school,
        priority: archive.status === 'pending_sync' ? 4 : 1,
        source: 'Visit Archive',
        severity: archive.status === 'pending_sync' ? 'warning' : 'normal',
        notes: archive.summary,
        alertTitle: `Archive sync: ${archive.school}`,
        alertBody: `${archive.leads || 0} leads captured. ${archive.status?.replace('_', ' ') || 'archived'}.`,
    }));

    return [...requestRows, ...eventRows, ...archiveRows].sort((left, right) => {
        const severityRank = { urgent: 0, warning: 1, normal: 2 };
        return (severityRank[left.severity] ?? 2) - (severityRank[right.severity] ?? 2);
    });
}

function AdminUsersAccessSection({ csrf, users = [], schoolAccounts = [], errors = {} }) {
    const [query, setQuery] = useState('');
    const [role, setRole] = useState('all');
    const [status, setStatus] = useState('all');
    const [modal, setModal] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const rows = users.map(enrichAdminUserAccess);
    const filtered = rows.filter((user) => {
        const text = `${user.name} ${user.email} ${user.role} ${user.organization} ${user.accessStatus}`.toLowerCase();
        return (!query || text.includes(query.toLowerCase()))
            && (role === 'all' || user.role === role)
            && (status === 'all' || user.accessStatus === status);
    });
    const selected = rows.find((user) => Number(user.id) === Number(selectedId));
    const roleCounts = rows.reduce((counts, user) => ({ ...counts, [user.role]: (counts[user.role] || 0) + 1 }), {});
    const activeCount = rows.filter((user) => user.accessStatus === 'active').length;
    const suspendedCount = rows.filter((user) => user.accessStatus === 'suspended').length;
    const pendingCount = rows.filter((user) => user.accessStatus === 'pending').length;
    const verifiedCount = rows.filter((user) => user.verified).length;
    const riskCount = rows.filter((user) => user.securityRisk !== 'low').length;
    const reset = () => { setQuery(''); setRole('all'); setStatus('all'); };

    return (
        <div className="grid gap-6">
            <section className="grid gap-4 md:grid-cols-4">
                <AdminInstitutionMetric label="Total Users" value={rows.length.toLocaleString()} detail={`${activeCount} active accounts`} icon={UsersRound} tone="blue" />
                <AdminInstitutionMetric label="Pending Access" value={pendingCount} detail="Invited or awaiting review" icon={Clock} tone="amber" />
                <AdminInstitutionMetric label="Verified Accounts" value={verifiedCount} detail="Email/account verified" icon={ShieldCheck} tone="emerald" />
                <AdminInstitutionMetric label="Security Watch" value={riskCount + suspendedCount} detail={`${suspendedCount} suspended`} icon={Activity} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-xl font-black text-slate-950">Global User Directory</h2>
                            <p className="mt-1 text-sm text-slate-500">Manage portal access, role assignments, and security posture from live user records.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => exportRowsToCsv('users-access.csv', [['Name', 'Email', 'Role', 'Access Status', 'Verified', 'Security Risk'], ...filtered.map((user) => [user.name, user.email, user.role, user.accessStatus, user.verified ? 'Yes' : 'No', user.securityRisk])])} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"><Download size={14} className="inline" /> Export</button>
                            <button type="button" onClick={() => setModal({ type: 'create' })} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-slate-800"><UserPlus size={14} className="inline" /> Create User</button>
                        </div>
                    </div>
                    <div className="grid gap-3 border-b border-slate-200 bg-slate-50/70 p-4 md:grid-cols-4">
                        <label className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-500 md:col-span-2"><Search size={15} className="inline text-slate-400" /> <input value={query} onChange={(event) => setQuery(event.target.value)} className="ml-2 w-[85%] bg-transparent outline-none" placeholder="Search name, email, role, organization..." /></label>
                        <select value={role} onChange={(event) => setRole(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"><option value="all">All Roles</option><option value="admin">Admin</option><option value="university">University</option><option value="school">School</option><option value="student">Student</option></select>
                        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"><option value="all">All Access</option><option value="active">Active</option><option value="pending">Pending</option><option value="suspended">Suspended</option></select>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1040px] text-left text-sm">
                            <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
                                <tr><th className="px-5 py-4">User</th><th className="px-5 py-4">Role</th><th className="px-5 py-4">Institution / School</th><th className="px-5 py-4">Security</th><th className="px-5 py-4">Access</th><th className="px-5 py-4 text-right">Actions</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map((user) => (
                                    <tr key={user.id} className="group hover:bg-slate-50">
                                        <td className="px-5 py-4"><div className="flex items-center gap-3"><span className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xs font-black', user.role === 'admin' ? 'bg-slate-950 text-white' : 'bg-blue-50 text-blue-700')}>{user.initials}</span><span><span className="block font-black text-slate-950">{user.name}</span><span className="mt-0.5 block text-xs font-semibold text-slate-500">{user.email}</span></span></div></td>
                                        <td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-600">{user.roleLabel}</span></td>
                                        <td className="px-5 py-4"><p className="font-bold text-slate-800">{user.organization}</p><p className="mt-1 text-xs text-slate-500">{user.organizationMeta}</p></td>
                                        <td className="px-5 py-4"><div className="flex flex-col gap-1"><span className={cx('w-fit rounded-full px-2.5 py-1 text-[10px] font-black uppercase', user.securityRisk === 'low' ? 'bg-emerald-50 text-emerald-700' : user.securityRisk === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700')}>{user.securityRisk} risk</span><span className="text-xs font-semibold text-slate-500">{user.verified ? 'Verified' : 'Unverified'} • {user.twoFactorEnabled ? '2FA on' : '2FA off'}</span></div></td>
                                        <td className="px-5 py-4"><AdminUserAccessBadge status={user.accessStatus} /></td>
                                        <td className="px-5 py-4 text-right"><div className="flex justify-end gap-1"><button type="button" onClick={() => setSelectedId(user.id)} className="rounded-lg p-2 text-blue-700 hover:bg-blue-50" title="View profile"><Search size={17} /></button><button type="button" onClick={() => setModal({ type: 'edit', item: user })} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" title="Edit user"><Edit3 size={17} /></button>{user.accessStatus !== 'active' && <AdminUserAccessForm csrf={csrf} user={user} status="active" label="Activate" />}{user.accessStatus !== 'suspended' && <AdminUserAccessForm csrf={csrf} user={user} status="suspended" label="Suspend" />}{user.accessStatus === 'active' && <AdminUserAccessForm csrf={csrf} user={user} status="pending" label="Review" />}<button type="button" onClick={() => setModal({ type: 'delete', item: user })} className="rounded-lg p-2 text-rose-700 hover:bg-rose-50" title="Delete user"><Trash2 size={17} /></button></div></td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && <tr><td colSpan="6" className="px-5 py-14 text-center"><EmptyState message="No user accounts match these filters." /></td></tr>}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-4 text-xs font-bold text-slate-500"><span>Showing {filtered.length} of {rows.length} users</span><button type="button" onClick={reset} className="font-black text-blue-700">Reset filters</button></div>
                </div>

                <aside className="space-y-4">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h3 className="font-black text-slate-950">Role Distribution</h3>
                        <div className="mt-4 space-y-3">{['admin', 'university', 'school', 'student'].map((item) => <RoleMeter key={item} label={item} value={roleCounts[item] || 0} total={rows.length} />)}</div>
                    </section>
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h3 className="font-black text-slate-950">Access Health</h3>
                        <div className="mt-4 grid grid-cols-3 gap-2"><MiniStat label="Active" value={activeCount} /><MiniStat label="Pending" value={pendingCount} /><MiniStat label="Suspended" value={suspendedCount} /></div>
                        <p className="mt-4 text-sm leading-6 text-slate-600">{suspendedCount ? `${suspendedCount} suspended account(s) are blocked from login.` : 'No suspended accounts. Keep monitoring pending access and security posture.'}</p>
                    </section>
                    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                        <ShieldCheck size={18} className="text-amber-700" />
                        <h3 className="mt-3 font-black text-slate-950">Security Rules</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-700">Suspended users cannot log in. Admins cannot delete or suspend their own account. Users with visit records should be suspended instead of deleted.</p>
                    </section>
                </aside>
            </section>

            <AdminUserDrawer user={selected} csrf={csrf} onClose={() => setSelectedId(null)} setModal={setModal} />
            {modal?.type === 'create' && <AdminUserForm csrf={csrf} title="Create User" action="/dashboard/admin/users" schoolAccounts={schoolAccounts} errors={errors} onClose={() => setModal(null)} />}
            {modal?.type === 'edit' && <AdminUserForm csrf={csrf} title="Edit User" action={`/dashboard/admin/users/${modal.item.id}`} method="PUT" item={modal.item} schoolAccounts={schoolAccounts} errors={errors} onClose={() => setModal(null)} />}
            {modal?.type === 'delete' && <ModalShell title="Delete User" onClose={() => setModal(null)}><form action={`/dashboard/admin/users/${modal.item.id}`} method="POST" className="space-y-4"><input type="hidden" name="_token" value={csrf} /><input type="hidden" name="_method" value="DELETE" /><p className="text-sm leading-6 text-slate-600">Delete <span className="font-black text-slate-950">{modal.item.name}</span>? Accounts with visit programs or registrations must be suspended instead.</p><div className="flex justify-end gap-2"><button type="button" onClick={() => setModal(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black">Cancel</button><button className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-black text-white">Delete</button></div></form></ModalShell>}
        </div>
    );
}

function AdminUserAccessBadge({ status }) {
    const styles = { active: 'bg-emerald-50 text-emerald-700', pending: 'bg-amber-50 text-amber-700', suspended: 'bg-rose-50 text-rose-700' };
    return <span className={cx('inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase', styles[status] || styles.pending)}>{status || 'pending'}</span>;
}

function AdminUserAccessForm({ csrf, user, status, label }) {
    return <form action={`/dashboard/admin/users/${user.id}/access`} method="POST"><input type="hidden" name="_token" value={csrf} /><input type="hidden" name="access_status" value={status} /><button className="rounded-lg px-2 py-2 text-xs font-black text-slate-700 hover:bg-slate-100">{label}</button></form>;
}

function AdminUserForm({ csrf, title, action, method = 'POST', item = {}, schoolAccounts = [], errors = {}, onClose }) {
    return (
        <ModalShell title={title} onClose={onClose}>
            <form action={action} method="POST" className="grid gap-4" onSubmit={() => window.setTimeout(onClose, 0)}>
                <input type="hidden" name="_token" value={csrf} />
                {method !== 'POST' && <input type="hidden" name="_method" value={method} />}
                <div className="grid gap-4 md:grid-cols-2">
                    <LightField label="Full Name" name="name" defaultValue={item.name || ''} error={errors.name?.[0]} required />
                    <LightField label="Email Address" name="email" type="email" defaultValue={item.email || ''} error={errors.email?.[0]} required />
                    <LightField label={item.id ? 'New Password (optional)' : 'Password (optional)'} name="password" type="password" error={errors.password?.[0]} autoComplete="new-password" />
                    <LightField label="Recovery Email" name="recovery_email" type="email" defaultValue={item.recoveryEmail || ''} error={errors.recovery_email?.[0]} />
                    <AdminSelect label="Portal Role" name="role" value={item.role || 'student'} options={[['admin', 'Admin'], ['university', 'University'], ['school', 'School'], ['student', 'Student']]} />
                    <AdminSelect label="Access Status" name="access_status" value={item.accessStatus || 'active'} options={[['active', 'Active'], ['pending', 'Pending Review'], ['suspended', 'Suspended']]} />
                    <label className="grid gap-1 text-sm font-bold text-slate-700">School tenant<select name="school_id" defaultValue={item.schoolId || ''} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"><option value="">Not linked to a school</option>{schoolAccounts.map((school) => <option key={school.id} value={school.id}>{school.name}{school.location ? ' · ' + school.location : ''}</option>)}</select><span className="text-[11px] font-semibold text-slate-400">Required for school and student roles.</span></label>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                    <ToggleBox name="verified" label="Email verified" defaultChecked={item.id ? !!item.verified : true} />
                    <ToggleBox name="two_factor_enabled" label="Require 2FA" defaultChecked={!!item.twoFactorEnabled} />
                    <ToggleBox name="security_alerts" label="Security alerts" defaultChecked={item.securityAlerts !== false} />
                </div>
                <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black">Cancel</button><button className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">Save User</button></div>
            </form>
        </ModalShell>
    );
}

function ToggleBox({ name, label, defaultChecked, disabled = false }) {
    return <label className={cx('flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-bold text-slate-700', disabled && 'cursor-not-allowed bg-slate-50 opacity-60')}>
        {disabled ? <input type="hidden" name={name} value={defaultChecked ? '1' : '0'} /> : <input type="hidden" name={name} value="0" />}
        <input type="checkbox" name={disabled ? undefined : name} value="1" defaultChecked={defaultChecked} disabled={disabled} className="rounded border-slate-300 text-blue-600" /> {label}
    </label>;
}

function AdminUserDrawer({ user, csrf, onClose, setModal }) {
    if (!user) return null;
    return (
        <div className="fixed inset-0 z-50 bg-slate-950/20 backdrop-blur-[1px]" onClick={onClose}>
            <aside className="absolute right-0 top-0 h-full w-full max-w-[520px] overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-14 w-14 place-items-center rounded-xl bg-slate-950 font-black text-white">{user.initials}</span><div><h2 className="text-xl font-black text-slate-950">{user.name}</h2><p className="mt-1 text-sm text-slate-500">{user.email}</p></div></div><button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"><X size={16} /></button></div>
                <div className="mt-5 grid grid-cols-2 gap-3"><MiniStat label="Role" value={user.roleLabel} /><MiniStat label="Access" value={user.accessStatus} /><MiniStat label="Verified" value={user.verified ? 'Yes' : 'No'} /><MiniStat label="Security" value={`${user.securityRisk} risk`} /></div>
                <section className="mt-5 rounded-xl border border-slate-200 p-4"><p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Organization</p><p className="mt-2 font-black text-slate-950">{user.organization}</p><p className="mt-1 text-sm text-slate-500">{user.organizationMeta}</p></section>
                <section className="mt-5 rounded-xl border border-slate-200 p-4"><p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Security Posture</p><div className="mt-3 grid gap-2 text-sm font-semibold text-slate-600"><p>Email verification: <span className="font-black text-slate-950">{user.verified ? 'Verified' : 'Unverified'}</span></p><p>Two-factor: <span className="font-black text-slate-950">{user.twoFactorEnabled ? 'Required' : 'Not required'}</span></p><p>Security alerts: <span className="font-black text-slate-950">{user.securityAlerts ? 'Enabled' : 'Disabled'}</span></p><p>Recovery email: <span className="font-black text-slate-950">{user.recoveryEmail || 'Not set'}</span></p></div></section>
                <section className="mt-5 rounded-xl border border-slate-200 p-4"><p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Lifecycle</p><div className="mt-3 grid gap-2 text-sm font-semibold text-slate-600"><p>Created: <span className="font-black text-slate-950">{formatShortDate(user.createdAt)}</span></p><p>Last updated: <span className="font-black text-slate-950">{formatShortDate(user.lastActive)}</span></p></div></section>
                <section className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4"><p className="font-black text-slate-950">Admin controls</p><p className="mt-1 text-sm leading-6 text-slate-600">Edit role, verification, 2FA, and account status. Suspended users are blocked at login.</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => setModal({ type: 'edit', item: user })} className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Edit User</button><AdminUserAccessForm csrf={csrf} user={user} status={user.accessStatus === 'active' ? 'suspended' : 'active'} label={user.accessStatus === 'active' ? 'Suspend' : 'Activate'} /></div></section>
            </aside>
        </div>
    );
}

function RoleMeter({ label, value, total }) {
    const width = total ? Math.round((Number(value || 0) / total) * 100) : 0;
    return <div><div className="flex items-center justify-between text-xs font-black uppercase text-slate-500"><span>{label}</span><span>{value}</span></div><div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${width}%` }} /></div></div>;
}

function enrichAdminUserAccess(user) {
    const roleLabel = String(user.role || 'student').replace('_', ' ');
    const organization = user.school || (user.role === 'university' ? 'University account' : user.role === 'admin' ? 'ScaleCampusLab Admin' : 'Direct student');
    const missingControls = [!user.verified, !user.twoFactorEnabled, user.securityAlerts === false].filter(Boolean).length;
    const securityRisk = user.accessStatus === 'suspended' ? 'high' : missingControls >= 2 ? 'high' : missingControls === 1 ? 'medium' : 'low';
    return {
        ...user,
        accessStatus: user.accessStatus || (user.verified ? 'active' : 'pending'),
        initials: initials(user.name || user.email || 'User'),
        roleLabel,
        organization,
        organizationMeta: user.schoolLocation || (user.role === 'admin' ? 'Global platform access' : user.role === 'university' ? 'Institution portal' : user.role === 'school' ? 'School portal' : 'Student portal'),
        securityRisk,
    };
}

function AdminAnalyticsSection({ analytics = {}, users = [], events = [], registrations = [], schools = [], visitRequests = [], messages = [] }) {
    const kpis = analytics.adminKpis?.length ? analytics.adminKpis : [
        { label: 'Conversion Funnel', value: `${percentage(registrations.filter((item) => item.status === 'confirmed').length, registrations.length)}%`, detail: 'Confirmed registration records' },
        { label: 'Capacity Usage', value: `${percentage(registrations.reduce((sum, item) => sum + Number(item.partySize || 0), 0), events.reduce((sum, item) => sum + Number(item.capacity || 0), 0))}%`, detail: 'Booked seats versus capacity' },
        { label: 'Published Programs', value: events.filter((item) => item.status === 'published').length, detail: `${events.length} total visit programs` },
        { label: 'Platform Users', value: users.length, detail: `${users.filter((item) => item.accessStatus === 'suspended').length} suspended` },
    ];
    const funnel = analytics.funnel || [];
    const trend = analytics.trend || [];
    const maxTrend = Math.max(1, ...trend.map((item) => Number(item.value || 0)));
    const roleBreakdown = analytics.roleBreakdown?.length ? analytics.roleBreakdown : roleBreakdownFromUsers(users);
    const statusBreakdown = analytics.statusBreakdown?.length ? analytics.statusBreakdown : statusBreakdownFromEvents(events);
    const requestPipeline = analytics.requestPipeline?.length ? analytics.requestPipeline : requestPipelineFromRequests(visitRequests);
    const topInstitutions = analytics.topInstitutions?.length ? analytics.topInstitutions : topInstitutionsFromEvents(users, events, registrations);
    const notifications = analytics.notificationStats?.length ? analytics.notificationStats : statusBreakdownFromMessages(messages);
    const hotspots = analytics.hotspots || [];
    const insights = (analytics.insights || []).filter((item) => item.type !== 'prediction');
    const totalRole = Math.max(1, roleBreakdown.reduce((sum, row) => sum + Number(row.value || 0), 0));
    const totalRequests = Math.max(1, requestPipeline.reduce((sum, row) => sum + Number(row.value || 0), 0));

    const exportAnalytics = () => exportRowsToCsv('admin-analytics.csv', [
        ['Section', 'Metric', 'Value', 'Detail'],
        ...kpis.map((item) => ['KPI', item.label, item.value, item.detail || '']),
        ...funnel.map((item) => ['Funnel', item.label, item.value, `${item.rate}%`]),
        ...roleBreakdown.map((item) => ['Role Breakdown', item.label, item.value, 'users']),
        ...requestPipeline.map((item) => ['Request Pipeline', item.label, item.value, item.detail || '']),
        ...topInstitutions.map((item) => ['Institution', item.name, item.seats || item.registrations || 0, `${item.programs || 0} programs`]),
    ]);

    return (
        <div className="grid gap-6">
            <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Master admin analytics</p>
                    <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Platform Intelligence</h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Deep-dive analytics across conversion funnels, visit activity, access, communication, and market engagement using live database records.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <span className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700">All Available Records</span>
                    <button type="button" onClick={exportAnalytics} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"><Download size={16} /> Export Report</button>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {kpis.map((item, index) => (
                    <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
                            <span className={cx('grid h-9 w-9 place-items-center rounded-xl', index === 0 ? 'bg-blue-50 text-blue-700' : index === 1 ? 'bg-emerald-50 text-emerald-700' : index === 2 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700')}><Activity size={16} /></span>
                        </div>
                        <p className="mt-4 text-3xl font-black text-slate-950">{item.value}</p>
                        <p className="mt-2 text-xs font-bold text-slate-500">{item.detail || item.trend || 'Database connected'}</p>
                    </article>
                ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
                <div className="space-y-6">
                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-xl font-black text-slate-950">Main Conversion Funnel</h2>
                                <p className="mt-1 text-sm text-slate-500">Registered seats to confirmed visits, attendance, and engagement.</p>
                            </div>
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{funnel.length} tracked stage(s)</span>
                        </div>
                        <div className="mt-6 space-y-4">
                            {funnel.length === 0 ? <EmptyState message="Funnel data will appear after registrations are recorded." /> : funnel.map((step, index) => (
                                <div key={step.label}>
                                    <div className="mb-2 flex items-end justify-between gap-3">
                                        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{step.label}</p>
                                        <p className="text-xl font-black text-slate-950">{formatCompact(Number(step.value || 0))}</p>
                                    </div>
                                    <div className="h-10 overflow-hidden rounded-xl bg-slate-100">
                                        <div className={cx('h-full rounded-xl', index === funnel.length - 1 ? 'bg-emerald-600' : 'bg-blue-600')} style={{ width: `${Math.max(4, Math.min(100, Number(step.rate || 0)))}%` }} />
                                    </div>
                                    <p className="mt-1 text-right text-xs font-black text-slate-500">{step.rate || 0}%</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-black text-slate-950">Engagement Trend</h2>
                                <p className="mt-1 text-sm text-slate-500">Six-month booked-seat trend from registration records.</p>
                            </div>
                            <span className="text-xs font-black uppercase tracking-wide text-slate-400">Monthly</span>
                        </div>
                        <div className="mt-6 flex h-64 items-end gap-3 border-b border-slate-200 px-2">
                            {trend.length === 0 ? <div className="grid h-full w-full place-items-center text-sm font-semibold text-slate-500">No trend data yet.</div> : trend.map((item) => (
                                <div key={item.label} className="flex h-full flex-1 flex-col justify-end gap-2">
                                    <div className="rounded-t-xl bg-blue-600" style={{ height: `${Math.max(6, (Number(item.value || 0) / maxTrend) * 100)}%` }} title={`${item.label}: ${item.value}`} />
                                    <p className="text-center text-xs font-bold text-slate-500">{item.label}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="grid gap-6 lg:grid-cols-2">
                        <AnalyticsBreakdownCard title="Visit Program Status" rows={statusBreakdown} empty="No visit program records yet." />
                        <AnalyticsBreakdownCard title="Request Pipeline" rows={requestPipeline} total={totalRequests} empty="No visit requests yet." />
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-black text-slate-950">Top Institution Performance</h2>
                                <p className="mt-1 text-sm text-slate-500">Ranked by visit-program volume and booked seats.</p>
                            </div>
                            <button type="button" onClick={() => exportRowsToCsv('top-institutions.csv', [['Institution', 'Email', 'Programs', 'Registrations', 'Seats'], ...topInstitutions.map((item) => [item.name, item.email || '', item.programs || 0, item.registrations || 0, item.seats || 0])])} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">Export</button>
                        </div>
                        <div className="mt-4 divide-y divide-slate-100">
                            {topInstitutions.length === 0 ? <EmptyState message="Institution rankings will appear after university accounts create visit programs." /> : topInstitutions.map((item) => (
                                <div key={item.name} className="grid gap-3 py-4 md:grid-cols-[1fr_90px_110px_110px] md:items-center">
                                    <div><p className="font-black text-slate-950">{item.name}</p><p className="mt-1 text-xs font-semibold text-slate-500">{item.email || 'Institution account'}</p></div>
                                    <p className="text-sm font-black text-slate-700">{item.programs || 0} programs</p>
                                    <p className="text-sm font-black text-blue-700">{item.registrations || 0} bookings</p>
                                    <p className="text-right text-sm font-black text-emerald-700">{formatCompact(item.seats || 0)} seats</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <aside className="space-y-6">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-black text-slate-950">User Role Mix</h2>
                        <div className="mt-4 space-y-3">{roleBreakdown.map((item) => <RoleMeter key={item.label} label={item.label} value={item.value} total={totalRole} />)}</div>
                    </section>
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-black text-slate-950">Communication Delivery</h2>
                        <div className="mt-4 grid grid-cols-2 gap-3">{notifications.length ? notifications.map((item) => <MiniStat key={item.label} label={item.label} value={item.value} />) : <p className="col-span-2 text-sm text-slate-500">No platform notifications yet.</p>}</div>
                    </section>
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-black text-slate-950">Regional Saved Priorities</h2>
                        <p className="mt-1 text-xs font-semibold text-slate-500">Approximate average saved school priority score by region.</p>
                        <div className="mt-4 space-y-3">{hotspots.length ? hotspots.map((hotspot) => <div key={hotspot.region} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"><span><span className="block font-bold text-slate-700">{hotspot.region}</span><span className="text-xs font-semibold text-slate-400">{Number(hotspot.total || 0)} school(s)</span></span><span className="font-black text-emerald-600">{Math.round(Number(hotspot.growth || 0) * 40) / 10}/100</span></div>) : <p className="text-sm text-slate-500">Regional priorities will appear when school records include regions.</p>}</div>
                    </section>
                    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                        <Sparkles size={18} className="text-emerald-700" />
                        <h2 className="mt-3 text-lg font-black text-slate-950">Operational Signals</h2>
                        <div className="mt-4 space-y-3">{insights.map((item) => <article key={item.title} className="rounded-xl bg-white/70 p-4"><p className="text-sm font-black text-slate-950">{item.title}</p><p className="mt-1 text-sm leading-6 text-slate-600">{item.body}</p></article>)}{insights.length === 0 && <p className="text-sm text-slate-600">Insights will appear when the platform has enough activity.</p>}</div>
                    </section>
                </aside>
            </section>
        </div>
    );
}

function AnalyticsBreakdownCard({ title, rows = [], total, empty }) {
    const computedTotal = total || Math.max(1, rows.reduce((sum, item) => sum + Number(item.value || 0), 0));
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">{title}</h2>
            <div className="mt-4 space-y-4">
                {rows.length === 0 ? <EmptyState message={empty} /> : rows.map((item) => (
                    <div key={item.label}>
                        <div className="flex items-center justify-between text-sm"><span className="font-black text-slate-700">{item.label}</span><span className="font-black text-slate-950">{item.value}</span></div>
                        <div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(4, Math.min(100, (Number(item.value || 0) / computedTotal) * 100))}%` }} /></div>
                        {item.detail && <p className="mt-1 text-xs font-semibold text-slate-500">{item.detail}</p>}
                    </div>
                ))}
            </div>
        </section>
    );
}

function roleBreakdownFromUsers(users = []) {
    const counts = users.reduce((items, user) => ({ ...items, [user.role || 'student']: (items[user.role || 'student'] || 0) + 1 }), {});
    return Object.entries(counts).map(([label, value]) => ({ label: label.replace('_', ' '), value }));
}

function statusBreakdownFromEvents(events = []) {
    const counts = events.reduce((items, event) => ({ ...items, [event.status || 'draft']: { value: (items[event.status || 'draft']?.value || 0) + 1, capacity: (items[event.status || 'draft']?.capacity || 0) + Number(event.capacity || 0) } }), {});
    return Object.entries(counts).map(([label, row]) => ({ label, value: row.value, detail: `${row.capacity} seats` }));
}

function requestPipelineFromRequests(requests = []) {
    const counts = requests.reduce((items, request) => ({ ...items, [request.status || 'requested']: { value: (items[request.status || 'requested']?.value || 0) + 1, seats: (items[request.status || 'requested']?.seats || 0) + Number(request.groupSize || 0) } }), {});
    return Object.entries(counts).map(([label, row]) => ({ label, value: row.value, detail: `${row.seats} requested seats` }));
}

function topInstitutionsFromEvents(users = [], events = [], registrations = []) {
    return users.filter((user) => user.role === 'university').map((user) => {
        const ownedEvents = events.filter((event) => Number(event.universityId) === Number(user.id) || event.university === user.name);
        const titles = new Set(ownedEvents.map((event) => event.title));
        const rows = registrations.filter((registration) => titles.has(registration.event));
        return { name: user.name, email: user.email, programs: ownedEvents.length, registrations: rows.length, seats: rows.reduce((sum, row) => sum + Number(row.partySize || 0), 0) };
    }).sort((left, right) => (right.seats + right.programs) - (left.seats + left.programs)).slice(0, 6);
}

function statusBreakdownFromMessages(messages = []) {
    const counts = messages.reduce((items, message) => ({ ...items, [message.status || 'pending']: (items[message.status || 'pending'] || 0) + 1 }), {});
    return Object.entries(counts).map(([label, value]) => ({ label, value }));
}

function AdminSystemHealthSection({ health = {} }) {
    const checks = health.checks || [];
    const services = health.services || [];
    const auditEvents = health.auditEvents || [];
    const server = health.server || {};
    const score = Number(health.score || 0);
    const status = health.status || 'warning';
    const criticalCount = checks.filter((item) => item.status === 'critical').length;
    const warningCount = checks.filter((item) => item.status === 'warning').length;

    const exportAudit = () => exportRowsToCsv('system-health-audit.csv', [
        ['Generated At', health.generatedAt || new Date().toISOString()],
        ['Readiness Score', score],
        ['Readiness Status', status],
        [],
        ['Check', 'Status', 'Latency Ms', 'Detail'],
        ...checks.map((item) => [item.name, item.status, item.latencyMs ?? '', item.detail || '']),
        [],
        ['Audit Type', 'Title', 'Status', 'Created At', 'Detail'],
        ...auditEvents.map((item) => [item.type, item.title, item.status, item.createdAt, item.body || '']),
    ]);

    return (
        <div className="grid gap-6">
            <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Operational readiness</p>
                    <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Readiness & Audit Hub</h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Configuration and runtime checks are generated by Laravel from the current database, storage, queue, mail, session, log, and server settings.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <form action="/dashboard/admin" method="GET"><button className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"><RefreshCcw size={16} /> Refresh Checks</button></form>
                    <button type="button" onClick={exportAudit} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700"><Download size={16} /> Export Audit</button>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between"><p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Readiness Score</p><SystemStatusBadge status={status} /></div>
                    <p className="mt-5 text-4xl font-black text-slate-950">{score}%</p>
                    <div className="mt-4 h-2 rounded-full bg-slate-100"><div className={cx('h-full rounded-full', score >= 90 ? 'bg-emerald-600' : score >= 70 ? 'bg-amber-500' : 'bg-rose-600')} style={{ width: `${Math.min(100, Math.max(0, score))}%` }} /></div>
                    <p className="mt-2 text-xs font-bold text-slate-500">{criticalCount} critical • {warningCount} warning</p>
                </article>
                <HealthMetricCard label="Response Time" value={`${server.responseMs ?? 0}ms`} detail="Laravel health generation time" tone="blue" />
                <HealthMetricCard label="Disk Usage" value={`${server.diskUsedPercent ?? 0}%`} detail={`${server.diskFree || '0 B'} free of ${server.diskTotal || '0 B'}`} tone={(server.diskUsedPercent || 0) >= 90 ? 'rose' : 'emerald'} />
                <HealthMetricCard label="Memory" value={server.memoryUsed || '0 B'} detail={`Limit: ${server.memoryLimit || 'unknown'}`} tone="slate" />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
                <div className="space-y-6">
                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-black text-slate-950">Configuration and Runtime Checks</h2>
                                <p className="mt-1 text-sm text-slate-500">Generated at {formatDateTime(health.generatedAt)} from current application configuration and direct runtime checks.</p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-600">{checks.length} checks</span>
                        </div>
                        <div className="mt-5 overflow-x-auto">
                            <table className="w-full min-w-[760px] text-left text-sm">
                                <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-[0.08em] text-slate-500"><tr><th className="px-4 py-3">Service</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Latency</th><th className="px-4 py-3">Server Detail</th></tr></thead>
                                <tbody className="divide-y divide-slate-100">
                                    {checks.map((item) => <tr key={item.name} className="hover:bg-slate-50"><td className="px-4 py-4 font-black text-slate-950">{item.name}</td><td className="px-4 py-4"><SystemStatusBadge status={item.status} /></td><td className="px-4 py-4 font-bold text-slate-700">{item.latencyMs !== null && item.latencyMs !== undefined ? `${item.latencyMs}ms` : '—'}</td><td className="px-4 py-4 text-slate-600">{item.detail}</td></tr>)}
                                    {checks.length === 0 && <tr><td colSpan="4" className="px-4 py-12 text-center"><EmptyState message="No readiness checks are available." /></td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-black text-slate-950">Audit Activity</h2>
                                <p className="mt-1 text-sm text-slate-500">Recent users, visit programs, requests, and notifications from the database.</p>
                            </div>
                            <button type="button" onClick={exportAudit} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">Export</button>
                        </div>
                        <div className="mt-5 divide-y divide-slate-100">
                            {auditEvents.length === 0 ? <EmptyState message="Audit signals will appear after platform activity is recorded." /> : auditEvents.map((item, index) => (
                                <article key={`${item.type}-${item.title}-${index}`} className="grid gap-3 py-4 md:grid-cols-[140px_1fr_120px] md:items-center">
                                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{item.type}</p>
                                    <div><p className="font-black text-slate-950">{item.title}</p><p className="mt-1 text-sm text-slate-500">{item.body}</p></div>
                                    <div className="md:text-right"><p className="text-xs font-black uppercase text-slate-500">{item.status}</p><p className="mt-1 text-xs font-semibold text-slate-400">{formatShortDate(item.createdAt)}</p></div>
                                </article>
                            ))}
                        </div>
                    </section>
                </div>

                <aside className="space-y-6">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-black text-slate-950">Server Environment</h2>
                        <div className="mt-4 space-y-3">
                            <ServerFact label="Environment" value={server.environment || 'unknown'} />
                            <ServerFact label="Debug Mode" value={server.debug ? 'Enabled' : 'Disabled'} warning={!!server.debug} />
                            <ServerFact label="PHP" value={server.phpVersion || 'unknown'} />
                            <ServerFact label="Laravel" value={server.laravelVersion || 'unknown'} />
                            <ServerFact label="Timezone" value={server.timezone || 'unknown'} />
                            <ServerFact label="Server" value={server.serverSoftware || 'unknown'} />
                        </div>
                    </section>
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-black text-slate-950">Service Matrix</h2>
                        <div className="mt-4 grid gap-3">
                            {services.map((item) => <div key={item.label} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3"><div><p className="text-sm font-black text-slate-950">{item.label}</p><p className="text-xs font-semibold text-slate-500">{item.value}</p></div><SystemStatusDot status={item.status} /></div>)}
                            {services.length === 0 && <p className="text-sm text-slate-500">No service matrix available.</p>}
                        </div>
                    </section>
                    <section className={cx('rounded-2xl border p-5 shadow-sm', server.debug ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50')}>
                        <ShieldCheck size={18} className={server.debug ? 'text-amber-700' : 'text-emerald-700'} />
                        <h2 className="mt-3 text-lg font-black text-slate-950">Production Readiness</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-700">{server.debug ? 'APP_DEBUG is enabled. Disable debug mode before production deployment on cPanel.' : 'Debug mode is disabled. Continue monitoring queue, mail, and storage configuration before launch.'}</p>
                    </section>
                </aside>
            </section>
        </div>
    );
}

function HealthMetricCard({ label, value, detail, tone = 'slate' }) {
    const tones = { blue: 'bg-blue-50 text-blue-700', emerald: 'bg-emerald-50 text-emerald-700', rose: 'bg-rose-50 text-rose-700', slate: 'bg-slate-100 text-slate-700' };
    return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className={cx('grid h-10 w-10 place-items-center rounded-xl', tones[tone])}><Terminal size={18} /></span><p className="mt-5 text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</p><p className="mt-2 text-3xl font-black text-slate-950">{value}</p><p className="mt-2 text-xs font-bold text-slate-500">{detail}</p></article>;
}

function SystemStatusBadge({ status }) {
    const styles = { operational: 'bg-emerald-50 text-emerald-700', warning: 'bg-amber-50 text-amber-700', critical: 'bg-rose-50 text-rose-700' };
    return <span className={cx('inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase', styles[status] || styles.warning)}>{status || 'warning'}</span>;
}

function SystemStatusDot({ status }) {
    const styles = { operational: 'bg-emerald-500', warning: 'bg-amber-500', critical: 'bg-rose-500' };
    return <span className={cx('h-3 w-3 rounded-full', styles[status] || styles.warning)} title={status} />;
}

function ServerFact({ label, value, warning = false }) {
    return <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-3 py-3"><p className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">{label}</p><p className={cx('text-right text-sm font-black', warning ? 'text-amber-700' : 'text-slate-950')}>{String(value)}</p></div>;
}

function AdminWaitlistSection({ waitlist = {} }) {
    const rows = waitlist.recent || [];
    const stats = [
        ['Total signups', waitlist.total || 0, 'All launch-interest records'],
        ['Latest records', rows.length, 'Visible in this dashboard'],
    ];

    return (
        <div className="grid gap-6">
            <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Launch interest</p>
                    <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Waitlist Records</h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">People who submitted the public waitlist form. These are notification leads only; no account, password, payment, or application is created.</p>
                </div>
                <a href="/admin/waitlist/export" className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-800">
                    <Download size={16} /> Export CSV
                </a>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map(([label, value, detail]) => (
                    <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
                        <p className="mt-3 text-3xl font-black text-slate-950">{Number(value || 0).toLocaleString()}</p>
                        <p className="mt-2 text-xs font-semibold text-slate-500">{detail}</p>
                    </article>
                ))}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-5">
                    <div>
                        <h2 className="text-lg font-black text-slate-950">Recent signups</h2>
                        <p className="mt-1 text-sm text-slate-500">Latest 50 waitlist records from the database.</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                        <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                            <tr>
                                <th className="px-5 py-3">#</th>
                                <th className="px-5 py-3">Name</th>
                                <th className="px-5 py-3">Email</th>
                                <th className="px-5 py-3">Joined</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {rows.map((row) => (
                                <tr key={row.id} className="hover:bg-slate-50/80">
                                    <td className="px-5 py-4 font-black text-slate-500">{row.position}</td>
                                    <td className="px-5 py-4 font-black text-slate-950">{row.fullName || 'Launch Subscriber'}</td>
                                    <td className="px-5 py-4 font-semibold text-slate-600">{row.email}</td>
                                    <td className="px-5 py-4 font-semibold text-slate-500">{formatDateTime(row.createdAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {!rows.length && <EmptyState title="No waitlist signups yet" message="Public waitlist records will appear here after visitors submit their email." />}
            </section>
        </div>
    );
}

function AdminSettingsSection({ csrf, settings = {}, profile = {}, errors = {} }) {
    const branding = settings.branding || {};
    const localization = settings.localization || {};
    const features = settings.features || {};
    const launch = settings.launch || {};
    const security = settings.security || {};
    const integrations = settings.integrations || {};
    const system = settings.system || {};
    const updatedBy = settings.updatedBy || {};
    const supportedLanguages = (localization.supportedLanguages || ['English']).join(', ');

    return (
        <div className="grid gap-6">
            <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Master configuration</p>
                    <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Global Platform Settings</h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Configure enforced branding, localization, administrator MFA, and integration metadata. Stored-only policy values are clearly identified below.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Last updated</p>
                    <p className="mt-1 font-black text-slate-950">{updatedBy.name || 'System defaults'}</p>
                    <p className="text-xs font-semibold text-slate-500">{updatedBy.updatedAt ? formatDateTime(updatedBy.updatedAt) : 'Not saved yet'}</p>
                </div>
            </section>

            <form action="/dashboard/admin/settings" method="POST" className="grid gap-6">
                <input type="hidden" name="_token" value={csrf} />
                <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="space-y-6">
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-3">
                                <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><Sparkles size={18} /></span>
                                <div>
                                    <h2 className="text-xl font-black text-slate-950">Branding & Localization</h2>
                                    <p className="mt-1 text-sm text-slate-500">Controls visible platform identity and default language choices.</p>
                                </div>
                            </div>
                            <div className="mt-6 grid gap-4 md:grid-cols-2">
                                <LightField label="Platform Name" name="platform_name" defaultValue={branding.platformName || 'ScaleCampusLab'} error={errors.platform_name?.[0]} required />
                                <LightField label="Support Email" name="support_email" type="email" defaultValue={branding.supportEmail || 'support@scalecampuslab.com'} error={errors.support_email?.[0]} required />
                                <LightField label="Primary Brand Color" name="primary_color" defaultValue={branding.primaryColor || '#005EB2'} error={errors.primary_color?.[0]} required />
                                <LightField label="Logo URL" name="logo_url" type="url" defaultValue={branding.logoUrl || ''} error={errors.logo_url?.[0]} placeholder="https://..." />
                                <AdminSelect label="Default Language" name="default_language" value={localization.defaultLanguage || 'English'} options={[['English', 'English'], ['Spanish', 'Spanish'], ['French', 'French'], ['Portuguese', 'Portuguese'], ['Arabic', 'Arabic']]} />
                                <LightField label="Supported Languages" name="supported_languages" defaultValue={supportedLanguages} error={errors.supported_languages?.[0]} placeholder="English, Spanish, French" />
                            </div>
                        </section>

                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-3">
                                <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-700"><ShieldCheck size={18} /></span>
                                <div>
                                    <h2 className="text-xl font-black text-slate-950">Security Policies</h2>
                                    <p className="mt-1 text-sm text-slate-500">Administrator MFA is enforced. The remaining policy values are stored for planning but are not yet enforced by runtime jobs or middleware.</p>
                                </div>
                            </div>
                            <div className="mt-6 space-y-5">
                                <ToggleBox name="admin_mfa_required" label="Require MFA for all admin users" defaultChecked={security.adminMfaRequired !== false} />
                                <div className="grid gap-4 md:grid-cols-3">
                                    <LightField label="Session Timeout Minutes · stored only" name="session_timeout_minutes" type="number" min="15" max="240" defaultValue={security.sessionTimeoutMinutes || 30} error={errors.session_timeout_minutes?.[0]} readOnly aria-disabled="true" required />
                                    <LightField label="Password Rotation Days · stored only" name="password_rotation_days" type="number" min="30" max="365" defaultValue={security.passwordRotationDays || 90} error={errors.password_rotation_days?.[0]} readOnly aria-disabled="true" required />
                                    <LightField label="Data Retention Days · stored only" name="data_retention_days" type="number" min="30" max="3650" defaultValue={security.dataRetentionDays || 365} error={errors.data_retention_days?.[0]} readOnly aria-disabled="true" required />
                                </div>
                            </div>
                        </section>

                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-3">
                                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Blocks size={18} /></span>
                                <div>
                                    <h2 className="text-xl font-black text-slate-950">API & Integrations</h2>
                                    <p className="mt-1 text-sm text-slate-500">Store integration metadata and operational labels. Secrets should remain in environment variables.</p>
                                </div>
                            </div>
                            <div className="mt-6 grid gap-4 md:grid-cols-2">
                                <LightField label="API Key Label" name="api_key_label" defaultValue={integrations.apiKeyLabel || 'Master API Key'} error={errors.api_key_label?.[0]} />
                                <LightField label="LMS Provider" name="lms_provider" defaultValue={integrations.lmsProvider || 'Canvas'} error={errors.lms_provider?.[0]} />
                                <div className="md:col-span-2"><LightField label="Webhook URL" name="webhook_url" type="url" defaultValue={integrations.webhookUrl || ''} error={errors.webhook_url?.[0]} placeholder="https://example.com/webhooks/scalecampuslab" /></div>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Masked API Reference</p>
                                    <code className="mt-2 block rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-700">{integrations.apiKeyMasked || 'Stored in .env'}</code>
                                </div>
                            </div>
                        </section>
                    </div>

                    <aside className="space-y-6">
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center gap-3">
                                <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-700"><UserPlus size={18} /></span>
                                <div>
                                    <h2 className="text-lg font-black text-slate-950">Public Launch Page</h2>
                                    <p className="mt-1 text-sm text-slate-500">Control whether visitors see the waitlist page before the marketing landing page.</p>
                                </div>
                            </div>
                            <div className="mt-5 space-y-4">
                                <ToggleBox name="waitlist_mode" label="Hide landing page and show waitlist first" defaultChecked={!!launch.waitlistMode} />
                                <p className="rounded-xl bg-slate-50 px-3 py-3 text-xs font-semibold leading-5 text-slate-600">When enabled, the root URL shows the waitlist page. Login, dashboards, and direct marketing routes remain available.</p>
                            </div>
                        </section>

                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="text-lg font-black text-slate-950">Feature Flags</h2>
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-500">Stored only</span>
                            </div>
                            <div className="mt-5 space-y-4">
                                <ToggleBox name="ai_matchmaking" label="AI Matchmaking · not enforced" defaultChecked={!!features.aiMatchmaking} disabled />
                                <ToggleBox name="beta_messaging" label="Beta Messaging · not enforced" defaultChecked={!!features.betaMessaging} disabled />
                                <ToggleBox name="advanced_analytics" label="Advanced Analytics · not enforced" defaultChecked={features.advancedAnalytics !== false} disabled />
                                <ToggleBox name="maintenance_mode" label="Maintenance Mode · not enforced" defaultChecked={!!features.maintenanceMode} disabled />
                            </div>
                        </section>

                        <section className="rounded-2xl bg-slate-950 p-5 text-white shadow-sm">
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-white/60">Readiness Score</p>
                            <p className="mt-4 text-4xl font-black">{system.healthScore ?? 0}%</p>
                            <p className="mt-2 text-sm text-white/60">{system.environment || 'local'} environment • debug {system.debug ? 'on' : 'off'}</p>
                            <div className="mt-4 h-2 rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min(100, Number(system.healthScore || 0))}%` }} /></div>
                        </section>

                        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
                            <h2 className="text-lg font-black text-slate-950">Configuration Rules</h2>
                            <p className="mt-2 text-sm leading-6 text-slate-700">Global settings are shared by all portals. Do not create separate portal records for the same configuration; permissions and labels decide how each portal sees shared data.</p>
                        </section>
                    </aside>
                </section>

                <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur md:flex-row md:items-center md:justify-between">
                    <p className="text-sm font-semibold text-slate-600">Saving updates enforced settings and preserves the displayed stored-only values.</p>
                    <div className="flex gap-2"><button type="reset" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700">Discard Changes</button><button className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-800">Save Global Configuration</button></div>
                </div>
            </form>

            <SecurityAccessSection csrf={csrf} profile={profile || {}} errors={errors || {}} role="admin" />
        </div>
    );
}

function AdminPlatformOverviewSection({ users = [], events = [], registrations = [], schools = [], visitRequests = [], messages = [], analytics = {}, setSection }) {
    const roleCounts = users.reduce((counts, user) => ({ ...counts, [user.role]: (counts[user.role] || 0) + 1 }), {});
    const publishedEvents = events.filter((event) => event.status === 'published');
    const pendingRequests = visitRequests.filter((request) => request.status === 'requested');
    const approvedRequests = visitRequests.filter((request) => ['approved', 'scheduled'].includes(request.status));
    const confirmedSeats = registrations.filter((registration) => registration.status === 'confirmed').reduce((total, registration) => total + Number(registration.partySize || 0), 0);
    const waitlistedSeats = registrations.filter((registration) => registration.status === 'waitlisted').reduce((total, registration) => total + Number(registration.partySize || 0), 0);
    const activeSchools = new Set([
        ...registrations.map((registration) => registration.school).filter(Boolean),
        ...visitRequests.map((request) => request.school).filter(Boolean),
    ]).size;
    const institutionRows = [...new Set(events.map((event) => event.university).filter(Boolean))]
        .map((name) => {
            const institutionEvents = events.filter((event) => event.university === name);
            return {
                name,
                programs: institutionEvents.length,
                published: institutionEvents.filter((event) => event.status === 'published').length,
                seats: institutionEvents.reduce((total, event) => total + Number(event.capacity || 0), 0),
            };
        })
        .sort((left, right) => right.programs - left.programs)
        .slice(0, 5);
    const activityRows = [
        ...visitRequests.slice(0, 4).map((request) => ({
            title: request.event || 'Visit request',
            meta: `${request.school || 'School'} to ${request.university || 'University'}`,
            status: request.status,
            type: 'Request',
        })),
        ...events.slice(0, 4).map((event) => ({
            title: event.title,
            meta: `${event.university || 'Institution'} • ${formatShortDate(event.startsAt)}`,
            status: event.status,
            type: 'Program',
        })),
    ].slice(0, 6);
    const operationalReviewRows = [
        ['Pending visit requests', pendingRequests.length, 'Request records awaiting a decision'],
        ['Failed notifications', messages.filter((message) => message.status === 'failed').length, `${messages.length} notification record(s) loaded`],
        ['Unverified accounts', users.filter((user) => !user.verified).length, `${users.length} user account(s) loaded`],
    ];

    return (
        <div className="grid gap-6">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <AdminKpiCard label="Total Users" value={users.length} detail={`${roleCounts.university || 0} institutions • ${roleCounts.school || 0} schools`} icon={UsersRound} tone="blue" onClick={() => setSection?.('users-access')} />
                <AdminKpiCard label="Visit Programs" value={events.length} detail={`${publishedEvents.length} published`} icon={CalendarDays} tone="indigo" onClick={() => setSection?.('events')} />
                <AdminKpiCard label="Visit Requests" value={visitRequests.length} detail={`${pendingRequests.length} pending review`} icon={FolderKanban} tone="amber" onClick={() => setSection?.('events')} />
                <AdminKpiCard label="Confirmed Seats" value={confirmedSeats.toLocaleString()} detail={`${waitlistedSeats.toLocaleString()} waitlisted`} icon={CheckCircle2} tone="emerald" onClick={() => setSection?.('analytics')} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="grid gap-6">
                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h2 className="text-xl font-black text-slate-950">Portal Mix</h2>
                                <p className="mt-1 text-sm text-slate-500">Role distribution across the master platform.</p>
                            </div>
                            <button type="button" onClick={() => setSection?.('users-access')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-50">Manage Access</button>
                        </div>
                        <div className="mt-5 grid gap-3 md:grid-cols-4">
                            {[
                                ['Admins', roleCounts.admin || 0, 'bg-slate-950'],
                                ['Universities', roleCounts.university || 0, 'bg-blue-600'],
                                ['Schools', (roleCounts.school || 0) + (roleCounts.high_school || 0), 'bg-emerald-500'],
                                ['Students', roleCounts.student || 0, 'bg-indigo-500'],
                            ].map(([label, value, color]) => (
                                <div key={label} className="rounded-xl bg-slate-50 p-4">
                                    <div className="mb-3 h-2 rounded-full bg-slate-200"><div className={cx('h-2 rounded-full', color)} style={{ width: `${users.length ? Math.max(8, (Number(value) / users.length) * 100) : 0}%` }} /></div>
                                    <p className="text-sm font-black text-slate-950">{value}</p>
                                    <p className="text-xs font-semibold text-slate-500">{label}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-200 p-5">
                            <div>
                                <h2 className="text-xl font-black text-slate-950">Visit Activity Stream</h2>
                                <p className="mt-1 text-sm text-slate-500">Global programs and requests, shown with Admin language.</p>
                            </div>
                            <button type="button" onClick={() => setSection?.('events')} className="text-xs font-black text-blue-700">Open Visit Activity</button>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {activityRows.length === 0 ? <EmptyState message="Visit activity will appear after institutions publish programs or schools submit requests." /> : activityRows.map((item, index) => (
                                <div key={`${item.type}-${item.title}-${index}`} className="grid gap-3 p-5 md:grid-cols-[110px_1fr_120px] md:items-center">
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black uppercase text-slate-600">{item.type}</span>
                                    <div>
                                        <p className="font-black text-slate-950">{item.title}</p>
                                        <p className="mt-1 text-sm text-slate-500">{item.meta}</p>
                                    </div>
                                    <span className="text-right text-xs font-black uppercase text-slate-500">{item.status}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <aside className="grid gap-6">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-black text-slate-950">Operational Data Review</h2>
                            <button type="button" onClick={() => setSection?.('system-health')} className="text-xs font-black text-blue-700">Readiness checks</button>
                        </div>
                        <div className="mt-4 space-y-3">
                            {operationalReviewRows.map(([label, count, detail]) => (
                                <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-black text-slate-950">{label}</p>
                                        <span className={cx('rounded-full px-2 py-0.5 text-[10px] font-black uppercase', Number(count) === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>{Number(count).toLocaleString()}</span>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500">{detail}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-black text-slate-950">Institution Coverage</h2>
                        <div className="mt-4 space-y-3">
                            {institutionRows.length === 0 ? <p className="text-sm text-slate-500">No institution programs yet.</p> : institutionRows.map((row) => (
                                <div key={row.name} className="rounded-xl bg-slate-50 p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="truncate text-sm font-black text-slate-950">{row.name}</p>
                                        <span className="text-xs font-black text-blue-700">{row.programs}</span>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500">{row.published} published • {row.seats} capacity</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                        <h2 className="text-lg font-black text-slate-950">Platform Intelligence</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{analytics?.insights?.[0]?.body || `${activeSchools} school(s) and ${institutionRows.length} institution(s) are currently represented in platform activity.`}</p>
                        <button type="button" onClick={() => setSection?.('analytics')} className="mt-4 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Open Analytics</button>
                    </section>
                </aside>
            </section>
        </div>
    );
}

function AdminKpiCard({ label, value, detail, icon: Icon, tone = 'blue', onClick }) {
    const tones = {
        blue: 'bg-blue-50 text-blue-700',
        indigo: 'bg-indigo-50 text-indigo-700',
        amber: 'bg-amber-50 text-amber-700',
        emerald: 'bg-emerald-50 text-emerald-700',
    };

    return (
        <button type="button" onClick={onClick} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between">
                <span className={cx('grid h-11 w-11 place-items-center rounded-xl', tones[tone])}><Icon size={20} /></span>
                <ArrowRight size={16} className="text-slate-300" />
            </div>
            <p className="mt-5 text-sm font-semibold text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
            <p className="mt-2 text-xs font-bold text-slate-500">{detail}</p>
        </button>
    );
}

function SchoolCoordinatorOverviewSection({ events = [], registrations = [], schools = [], students = [], visitRequests = [], analytics = {}, messages = [], profile = {}, setSection }) {
    const publishedEvents = events.filter((event) => event.status === 'published');
    const confirmedVisits = registrations.filter((registration) => registration.status === 'confirmed');
    const activeRequests = visitRequests.filter((request) => request.status !== 'declined');
    const pendingRequests = visitRequests.filter((request) => request.status === 'requested');
    const scheduledRequests = visitRequests.filter((request) => ['approved', 'scheduled'].includes(request.status));
    const studentRows = normalizeSchoolStudents(students, events);
    const confirmedStudents = confirmedVisits.reduce((total, registration) => total + Number(registration.partySize || 0), 0);
    const studentTotal = studentRows.length;
    const registrationPct = studentTotal > 0 ? Math.min(100, Math.round((confirmedStudents / studentTotal) * 100)) : 0;
    const universityCards = schoolUniversityCards(events, schools);
    const recommended = universityCards.slice(0, 3);
    const interestRows = schoolInterestDistribution(studentRows);
    const attendanceRate = Math.min(100, Math.max(0, Number(analytics.engagementAverage || 0)));
    const upcomingVisits = schoolOverviewUpcomingVisits(confirmedVisits, visitRequests, publishedEvents).slice(0, 5);
    const nextDate = upcomingVisits[0]?.date || null;
    const latestMessage = messages[0];
    const schedulePreview = upcomingVisits.slice(0, 3);
    const firstName = String(profile.coordinatorName || 'Coordinator').trim().split(' ')[0] || 'Coordinator';
    const activityItems = [
        latestMessage && {
            id: 'message',
            icon: MailCheck,
            tone: 'text-[#006a61]',
            title: latestMessage.subject || 'New message received',
            detail: latestMessage.preview || latestMessage.content || 'A university partner sent an update.',
            time: latestMessage.createdAt ? formatRelativeTime(latestMessage.createdAt) : 'Recently',
        },
        pendingRequests[0] && {
            id: 'request',
            icon: Inbox,
            tone: 'text-amber-600',
            title: `${pendingRequests[0].university || 'University partner'} request is pending`,
            detail: pendingRequests[0].event || pendingRequests[0].notes || 'Review the latest visit request details.',
            time: pendingRequests[0].createdAt ? formatRelativeTime(pendingRequests[0].createdAt) : 'Today',
        },
        confirmedVisits[0] && {
            id: 'confirmed',
            icon: CheckCircle2,
            tone: 'text-emerald-600',
            title: `${confirmedVisits[0].event || 'Visit'} confirmed`,
            detail: `${Number(confirmedVisits[0].partySize || 0).toLocaleString()} student seat(s) confirmed.`,
            time: confirmedVisits[0].createdAt ? formatRelativeTime(confirmedVisits[0].createdAt) : 'Recently',
        },
    ].filter(Boolean);

    return (
        <>
        <div className="grid gap-5 md:hidden">
            <section className="space-y-2">
                <div>
                    <h1 className="text-[30px] font-black leading-tight text-slate-950">Welcome back, {firstName}</h1>
                    <p className="mt-1 text-sm leading-5 text-slate-500">Here is what is happening today across your students and visit requests.</p>
                </div>
                <div className="mt-4 flex items-start gap-4 rounded-xl bg-[#131b2e] p-5 text-white shadow-lg shadow-slate-950/10">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#006a61] text-white">
                        <Sparkles size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-300">Activity Summary</p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-slate-100">
                            <p><span className="font-black text-[#89f5e7]">{pendingRequests.length}</span> new visit invites</p>
                            <p><span className="font-black text-[#89f5e7]">{studentRows.length}</span> student profiles</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setSection?.('students')} className="col-span-2 flex items-center justify-between rounded-xl border border-slate-200 bg-[#eff4ff] p-5 text-left">
                    <span>
                        <span className="block text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">Active Students</span>
                        <span className="mt-1 block text-3xl font-black text-slate-950">{studentTotal.toLocaleString()}</span>
                    </span>
                    <span className="flex flex-col items-end text-[#006a61]">
                        <span className="text-xs font-black">{confirmedStudents.toLocaleString()} booked</span>
                        <Activity size={28} />
                    </span>
                </button>
                <button type="button" onClick={() => setSection?.('calendar')} className="rounded-xl border border-slate-200 bg-white p-5 text-left">
                    <CalendarDays className="text-[#006a61]" size={23} />
                    <p className="mt-4 text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">Visits</p>
                    <p className="mt-1 text-2xl font-black text-slate-950">{String(confirmedVisits.length || scheduledRequests.length).padStart(2, '0')}</p>
                </button>
                <button type="button" onClick={() => setSection?.('bookings')} className="rounded-xl border border-slate-200 bg-white p-5 text-left">
                    <Inbox className="text-rose-600" size={23} />
                    <p className="mt-4 text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">Pending</p>
                    <p className="mt-1 text-2xl font-black text-slate-950">{String(pendingRequests.length).padStart(2, '0')}</p>
                </button>
            </section>

            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-slate-950">Upcoming Schedule</h2>
                    <button type="button" onClick={() => setSection?.('calendar')} className="text-xs font-black text-[#006a61]">View Calendar</button>
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="relative space-y-6 p-5">
                        <div className="absolute bottom-8 left-9 top-8 w-px bg-slate-200" />
                        {schedulePreview.length ? schedulePreview.map((visit, index) => (
                            <button key={visit.id} type="button" onClick={() => setSection?.(visit.status === 'confirmed' ? 'calendar' : 'bookings')} className="relative z-10 flex w-full gap-4 text-left">
                                <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-full', index === 0 ? 'bg-[#86f2e4] text-[#006a61]' : index === 1 ? 'bg-[#131b2e] text-white' : 'bg-[#e5eeff] text-slate-600')}>
                                    {index === 1 ? <UsersRound size={15} /> : <School size={15} />}
                                </span>
                                <span className="min-w-0 flex-1 pb-1">
                                    <span className="flex items-start justify-between gap-2">
                                        <span className="truncate text-sm font-black text-slate-950">{visit.university}</span>
                                        <span className="shrink-0 text-[11px] font-bold text-slate-500">{formatTimeOnly(visit.date)}</span>
                                    </span>
                                    <span className="mt-1 block text-sm text-slate-500">{visit.program}</span>
                                    <span className="mt-2 flex flex-wrap gap-2">
                                        <span className="rounded bg-[#dce9ff] px-2 py-0.5 text-[10px] font-black uppercase text-slate-600">{visit.venue}</span>
                                        <span className={cx('rounded px-2 py-0.5 text-[10px] font-black uppercase', visit.status === 'confirmed' ? 'bg-[#86f2e4]/40 text-[#006a61]' : 'bg-amber-50 text-amber-700')}>{visit.statusLabel}</span>
                                    </span>
                                </span>
                            </button>
                        )) : (
                            <div className="relative z-10 rounded-lg bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">No scheduled visits yet. Discover visits to request one.</div>
                        )}
                    </div>
                </div>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-black text-slate-950">Recent Activity</h2>
                <div className="space-y-2">
                    {activityItems.length ? activityItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <article key={item.id} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4">
                                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-50">
                                    <Icon className={item.tone} size={19} />
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-sm leading-5 text-slate-700"><span className="font-black text-slate-950">{item.title}</span> {item.detail}</span>
                                    <span className="mt-1 block text-[11px] font-bold text-slate-400">{item.time}</span>
                                </span>
                            </article>
                        );
                    }) : (
                        <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500">Activity will appear after visit requests, messages, or student updates.</div>
                    )}
                </div>
            </section>

            <button type="button" onClick={() => setSection?.('events')} className="fixed bottom-24 right-5 z-30 grid h-14 w-14 place-items-center rounded-2xl bg-[#006a61] text-white shadow-xl shadow-slate-950/20">
                <Plus size={26} />
            </button>
        </div>

        <div className="hidden gap-6 md:grid">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-950">Overview Dashboard</h1>
                    <p className="mt-1 text-sm text-slate-500">Welcome back. Here is what is happening with your students, visit requests, and confirmed university visits.</p>
                </div>
                <button type="button" onClick={() => setSection?.('events')} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-800">
                    <Plus size={16} /> Schedule New Visit
                </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <SchoolOverviewMetric icon={FolderKanban} label="Active Requests" value={activeRequests.length} trend={`${pendingRequests.length} pending review`} tone="blue" />
                <SchoolOverviewMetric icon={CalendarDays} label="Confirmed Visits" value={confirmedVisits.length || scheduledRequests.length} trend={nextDate ? `Next: ${formatShortDate(nextDate)}` : 'No confirmed date'} tone="indigo" />
                <SchoolOverviewMetric icon={GraduationCap} label="Registered Students" value={confirmedStudents.toLocaleString()} trend={studentTotal > 0 ? `${registrationPct}% of ${studentTotal.toLocaleString()} student profiles` : 'No student profiles recorded'} tone="emerald" progress={registrationPct} />
            </div>

            <div className="grid gap-6 xl:grid-cols-12">
                <section className="xl:col-span-4">
                    <div className="relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
                        <div className="absolute -right-14 -top-14 h-36 w-36 rounded-full bg-lime-200/40 blur-3xl" />
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-emerald-700">
                            <CalendarDays size={13} /> Published visits
                        </span>
                        <h2 className="mt-4 text-2xl font-black text-slate-950">Available universities</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            Universities below currently have published campus visit opportunities in the platform.
                        </p>
                        <div className="mt-5 space-y-3">
                            {recommended.map((university) => (
                                <button key={university.name} type="button" onClick={() => setSection?.('events')} className="flex w-full items-center gap-3 rounded-xl border border-transparent p-3 text-left transition hover:border-slate-200 hover:bg-slate-50">
                                    <span className={cx('grid h-12 w-12 shrink-0 place-items-center rounded-xl text-xs font-black text-white', university.image || 'bg-slate-950')}>{university.name.split(' ').map((word) => word[0]).slice(0, 2).join('')}</span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-black text-slate-950">{university.name}</span>
                                        <span className="mt-0.5 block text-xs font-semibold text-slate-500">{university.upcomingVisits} published visit{university.upcomingVisits === 1 ? '' : 's'} · {university.focus}</span>
                                    </span>
                                    <ArrowRight size={16} className="text-blue-700" />
                                </button>
                            ))}
                            {recommended.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Published visit data will create school recommendations here.</p>}
                        </div>
                        <button type="button" onClick={() => setSection?.('reports')} className="mt-5 w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-black text-blue-700 hover:bg-blue-50">View Detailed Insights</button>
                    </div>
                </section>

                <section className="xl:col-span-8">
                    <div className="h-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-slate-950">Upcoming Visits</h2>
                                <p className="mt-1 text-sm text-slate-500">Confirmed attendance and active requests share one scheduling pipeline.</p>
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setSection?.('bookings')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">My Requests</button>
                                <button type="button" onClick={() => setSection?.('calendar')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-50">Calendar</button>
                            </div>
                        </div>
                        <div className="mt-5 overflow-x-auto">
                            <table className="w-full min-w-[760px] text-left text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
                                        <th className="pb-4">University & Program</th>
                                        <th className="pb-4">Date & Time</th>
                                        <th className="pb-4">Location</th>
                                        <th className="pb-4">RSVP Status</th>
                                        <th className="pb-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {upcomingVisits.map((visit) => (
                                        <tr key={visit.id} className="group hover:bg-slate-50">
                                            <td className="py-5">
                                                <div className="flex items-center gap-3">
                                                    <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-950 text-xs font-black text-white">{visit.initials}</span>
                                                    <span>
                                                        <span className="block font-black text-slate-950">{visit.university}</span>
                                                        <span className="mt-0.5 block text-xs font-semibold text-slate-500">{visit.program}</span>
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-5">
                                                <p className="font-bold text-slate-800">{formatShortDate(visit.date)}</p>
                                                <p className="mt-0.5 text-xs font-semibold text-slate-500">{formatTimeRange(visit.date, visit.endsAt)}</p>
                                            </td>
                                            <td className="py-5">
                                                <p className="font-bold text-slate-800">{visit.location}</p>
                                                <p className="mt-0.5 text-xs font-semibold text-slate-500">{visit.venue}</p>
                                            </td>
                                            <td className="py-5">
                                                <span className={cx('inline-flex items-center gap-2 text-sm font-bold', visit.status === 'confirmed' ? 'text-emerald-700' : visit.status === 'requested' ? 'text-amber-700' : 'text-blue-700')}>
                                                    <span className={cx('h-2 w-2 rounded-full', visit.status === 'confirmed' ? 'bg-emerald-500' : visit.status === 'requested' ? 'bg-amber-500' : 'bg-blue-500')} />
                                                    {visit.statusLabel}
                                                </span>
                                            </td>
                                            <td className="py-5 text-right">
                                                <button type="button" onClick={() => setSection?.(visit.status === 'confirmed' ? 'calendar' : 'bookings')} className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-black text-slate-800 transition group-hover:bg-slate-950 group-hover:text-white">Manage</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {upcomingVisits.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="py-12 text-center">
                                                <CalendarDays className="mx-auto text-slate-300" size={40} />
                                                <p className="mt-3 font-black text-slate-950">No visits scheduled yet</p>
                                                <p className="mt-1 text-sm text-slate-500">Use Discover Visits to submit your first request.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-black text-slate-950">Interests by Department</h2>
                        <button type="button" onClick={() => setSection?.('students')} className="text-xs font-black text-blue-700">Manage Students</button>
                    </div>
                    <div className="mt-5 space-y-4">
                        {interestRows.map((row, index) => (
                            <div key={row.label}>
                                <div className="mb-1 flex justify-between text-sm">
                                    <span className="font-bold text-slate-700">{row.label}</span>
                                    <span className="font-black text-slate-950">{row.percent}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-slate-100">
                                    <div className={cx('h-2 rounded-full', ['bg-slate-950', 'bg-blue-600', 'bg-emerald-500'][index % 3])} style={{ width: `${row.percent}%` }} />
                                </div>
                            </div>
                        ))}
                        {interestRows.length === 0 && <EmptyState message="Add student interests to build the department distribution." />}
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-black text-slate-950">Attendance Rate</h2>
                            <p className="mt-1 text-sm text-slate-500">Attended seats against confirmed seats</p>
                            <div className="mt-4 flex items-end gap-2">
                                <span className="text-5xl font-black text-slate-950">{Math.round(attendanceRate)}%</span>
                                <span className="pb-1 text-sm font-black text-emerald-600">{confirmedStudents > 0 ? 'Recorded' : 'No attendance'}</span>
                            </div>
                        </div>
                        <div className="relative h-28 w-28">
                            <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                                <path className="text-slate-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="100, 100" strokeWidth="3" />
                                <path className="text-lime-500" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${Math.round(attendanceRate)}, 100`} strokeLinecap="round" strokeWidth="3" />
                            </svg>
                            <Sparkles className="absolute inset-0 m-auto text-lime-600" size={24} />
                        </div>
                    </div>
                    {latestMessage && <p className="mt-5 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Latest update: <span className="font-bold text-slate-950">{latestMessage.subject}</span></p>}
                </section>
            </div>
        </div>
        </>
    );
}

function SchoolOverviewMetric({ icon: Icon, label, value, trend, progress, tone = 'blue' }) {
    const tones = {
        blue: 'bg-blue-50 text-blue-700',
        indigo: 'bg-indigo-50 text-indigo-700',
        emerald: 'bg-emerald-50 text-emerald-700',
    };

    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="flex items-start justify-between">
                <span className={cx('grid h-11 w-11 place-items-center rounded-xl', tones[tone] || tones.blue)}><Icon size={20} /></span>
                {trend && <span className="max-w-[150px] text-right text-[11px] font-black text-emerald-600">{trend}</span>}
            </div>
            <p className="mt-5 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
            <p className="mt-2 text-4xl font-black text-slate-950">{value}</p>
            {typeof progress === 'number' && <div className="mt-3 h-1.5 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-blue-600" style={{ width: `${progress}%` }} /></div>}
        </article>
    );
}

function schoolOverviewUpcomingVisits(registrations, visitRequests, events) {
    const fromRegistrations = registrations.map((registration) => {
        const event = events.find((item) => Number(item.id) === Number(registration.eventId)) || {};
        const university = event.university || registration.name || 'University Partner';

        return {
            id: `registration-${registration.id}`,
            university,
            program: registration.event || event.title || 'Confirmed visit',
            date: event.startsAt || registration.eventDate || null,
            endsAt: event.endsAt,
            location: event.location || registration.eventLocation || 'Location not recorded',
            venue: event.venue || 'Venue not recorded',
            status: 'confirmed',
            statusLabel: `${Number(registration.partySize || 0).toLocaleString()} Registered`,
            initials: university.split(' ').map((word) => word[0]).slice(0, 3).join(''),
        };
    });
    const fromRequests = visitRequests.filter((request) => !['declined', 'cancelled'].includes(request.status)).map((request) => {
        const university = request.university || 'University Partner';

        return {
            id: `request-${request.id}`,
            university,
            program: request.event || 'Visit request',
            date: request.eventDate || request.window,
            endsAt: null,
            location: request.eventLocation || 'Location pending',
            venue: request.status === 'requested' ? 'Awaiting approval' : 'Itinerary pending',
            status: request.status,
            statusLabel: request.status === 'requested' ? 'Pending approval' : `${Number(request.groupSize || 0).toLocaleString()} Requested`,
            initials: university.split(' ').map((word) => word[0]).slice(0, 3).join(''),
        };
    });

    return [...fromRegistrations, ...fromRequests]
        .filter((visit) => {
            if (!visit.date) return false;
            const rawBoundary = visit.endsAt || visit.date;
            const boundary = new Date(rawBoundary);
            if (/^\d{4}-\d{2}-\d{2}$/.test(String(rawBoundary))) boundary.setHours(23, 59, 59, 999);
            return !Number.isNaN(boundary.getTime()) && boundary.getTime() >= Date.now();
        })
        .sort((left, right) => new Date(left.date) - new Date(right.date));
}

function schoolInterestDistribution(students) {
    const buckets = [
        ['STEM / Engineering', /stem|engineer|computer|robot|tech|data|science|ai/i],
        ['Arts & Humanities', /art|human|design|creative|media|history|literature/i],
        ['Business & Finance', /business|finance|management|economics|leadership/i],
    ];
    const source = students
        .map((student) => String(student.interest || '').trim())
        .filter((interest) => interest && !/^undecided|not set$/i.test(interest));

    if (source.length === 0) return [];

    const counts = new Map(buckets.map(([label]) => [label, 0]));
    let undeclared = 0;
    source.forEach((interest) => {
        const bucket = buckets.find(([, regex]) => regex.test(interest));
        if (bucket) counts.set(bucket[0], counts.get(bucket[0]) + 1);
        else undeclared += 1;
    });

    const rows = buckets
        .map(([label]) => ({ label, count: counts.get(label) }))
        .filter((row) => row.count > 0);
    if (undeclared > 0) rows.push({ label: 'Exploratory / Undeclared', count: undeclared });

    return rows.map((row) => ({ ...row, percent: Math.round((row.count / source.length) * 100) }));
}

function SchoolStudentsSection({ csrf, events = [], students = [], visitRequests = [], errors = {} }) {
    const [query, setQuery] = useState('');
    const [grade, setGrade] = useState('all');
    const [interest, setInterest] = useState('all');
    const [selected, setSelected] = useState([]);
    const [page, setPage] = useState(1);
    const [modal, setModal] = useState(null);
    const pageSize = 8;
    const eventOptions = useMemo(() => {
        return visitRequests
            .filter((visit) => ['approved', 'scheduled'].includes(visit.status) && visit.eventId)
            .map((visit) => ({ id: visit.id, label: `${visit.event || 'Campus visit'} · ${visit.university || 'University'}` }));
    }, [visitRequests]);
    const rows = useMemo(() => normalizeSchoolStudents(students, events), [students, events]);
    const filtered = rows.filter((student) => {
        const normalizedQuery = query.trim().toLowerCase();
        const queryMatch = !normalizedQuery || `${student.name} ${student.email} ${student.studentIdentifier} ${student.grade} ${student.interest}`.toLowerCase().includes(normalizedQuery);
        const gradeMatch = grade === 'all' || student.grade === grade;
        const interestMatch = interest === 'all' || student.interest.toLowerCase().includes(interest);
        return queryMatch && gradeMatch && interestMatch;
    });
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
    const allVisibleSelected = visible.length > 0 && visible.every((student) => selected.includes(String(student.id)));
    const actionRequiredCount = rows.filter((student) => !student.assignedEvents.length).length;
    const trackedCount = rows.length - actionRequiredCount;
    const gradeOptions = [...new Set(rows.map((student) => student.grade).filter(Boolean))].slice(0, 8);
    const interestOptions = [...new Set(rows.map((student) => student.interest).filter(Boolean))].slice(0, 10);
    const studentStatus = (student) => {
        if (!student.assignedEvents.length) {
            return ['Action Required', 'bg-amber-50 text-amber-700 ring-amber-200'];
        }

        if (student.assignedEvents.length > 1) {
            return ['Fully Tracked', 'bg-emerald-50 text-emerald-700 ring-emerald-200'];
        }

        return ['On Track', 'bg-blue-50 text-blue-700 ring-blue-200'];
    };

    useEffect(() => {
        setPage(1);
    }, [query, grade, interest]);

    const toggleStudent = (id) => {
        const value = String(id);
        setSelected((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
    };

    const toggleVisible = () => {
        setSelected((current) => {
            if (allVisibleSelected) {
                return current.filter((id) => !visible.some((student) => String(student.id) === id));
            }

            return [...new Set([...current, ...visible.map((student) => String(student.id))])];
        });
    };

    return (
        <div className="space-y-4 md:space-y-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-950 md:text-3xl">Student Directory</h1>
                    <p className="mt-1 text-sm text-slate-500">Manage and assign {rows.length.toLocaleString()} active student profiles.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
                    <button type="button" onClick={() => setModal({ type: 'bulk' })} className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-black text-blue-700 shadow-sm hover:bg-blue-50 md:px-4 md:py-2.5 md:text-sm">
                        <Upload size={15} /> Bulk Upload (CSV)
                    </button>
                    <button type="button" onClick={() => setModal({ type: 'add' })} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-slate-800 md:px-4 md:py-2.5 md:text-sm">
                        <Plus size={15} /> Add Student Manually
                    </button>
                </div>
            </div>

            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="grid gap-2 border-b border-slate-200 bg-white p-3 md:p-4 lg:grid-cols-[1fr_140px_170px_auto_auto] lg:items-center">
                    <label className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search students by name, ID, email..."
                            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#006a61] focus:ring-4 focus:ring-emerald-50"
                        />
                    </label>
                    <select value={grade} onChange={(event) => setGrade(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#006a61]">
                        <option value="all">All Grades</option>
                        {(gradeOptions.length ? gradeOptions : ['12th', '11th', '10th']).map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                    <select value={interest} onChange={(event) => setInterest(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#006a61]">
                        <option value="all">All Interests</option>
                        {(interestOptions.length ? interestOptions : ['Computer Science', 'Business Admin', 'Pre-Med', 'Engineering']).map((option) => <option key={option} value={option.toLowerCase()}>{option}</option>)}
                    </select>
                    <span className="rounded-full bg-slate-50 px-3 py-2 text-center text-xs font-black text-slate-500">{selected.length} selected</span>
                    <button type="button" onClick={() => setModal({ type: 'assign' })} disabled={!selected.length} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#006a61] px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-200">
                        <CheckSquare size={14} /> Assign to Event
                    </button>
                </div>

                <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-3 py-2 [scrollbar-width:none] md:px-4 [&::-webkit-scrollbar]:hidden">
                    <button type="button" onClick={toggleVisible} className={cx('shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black ring-1', allVisibleSelected ? 'bg-[#006a61] text-white ring-[#006a61]' : 'bg-white text-slate-600 ring-slate-200')}>
                        {allVisibleSelected ? 'Clear Visible' : `Select Visible (${visible.length})`}
                    </button>
                    <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-black text-amber-700 ring-1 ring-amber-200">{actionRequiredCount} Action Required</span>
                    <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-200">{trackedCount} Tracked</span>
                    <button type="button" onClick={() => { setQuery(''); setGrade('all'); setInterest('all'); }} className="ml-auto shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black text-slate-500 hover:bg-slate-50">Clear Filters</button>
                </div>

                <div className="hidden overflow-x-auto md:block">
                    <table className="min-w-full text-left">
                        <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="w-10 px-3 py-3">
                                    <input type="checkbox" checked={allVisibleSelected} onChange={toggleVisible} className="h-4 w-4 rounded border-slate-300" aria-label="Select visible students" />
                                </th>
                                <th className="px-3 py-3">Student Name</th>
                                <th className="px-4 py-3">Grade</th>
                                <th className="px-4 py-3">Interest / Major</th>
                                <th className="px-4 py-3">Assigned Events</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {visible.map((student) => {
                                const [statusLabel, statusTone] = studentStatus(student);

                                return (
                                <tr key={student.id} className="hover:bg-slate-50">
                                    <td className="px-3 py-3">
                                        <input type="checkbox" checked={selected.includes(String(student.id))} onChange={() => toggleStudent(student.id)} className="h-4 w-4 rounded border-slate-300" aria-label={`Select ${student.name}`} />
                                    </td>
                                    <td className="px-3 py-3">
                                        <div className="flex items-center gap-3">
                                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e5eeff] text-xs font-black text-[#0b1c30]">{student.initials}</span>
                                            <div>
                                                <p className="max-w-[220px] truncate font-black text-slate-950">{student.name}</p>
                                                <p className="text-xs font-semibold text-slate-500">ID: {student.studentIdentifier}</p>
                                                <p className="text-xs font-semibold text-slate-400">{student.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm font-semibold text-slate-700">{student.grade}</td>
                                    <td className="px-4 py-4">
                                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">{student.interest}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-2">
                                            {student.assignedEvents.length ? student.assignedEvents.map((event) => (
                                                <span key={event} className="rounded bg-blue-50 px-2 py-1 text-xs font-black text-blue-700">{event}</span>
                                            )) : <span className="text-sm italic text-slate-500">None</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={cx('rounded-full px-2 py-1 text-[10px] font-black uppercase ring-1', statusTone)}>{statusLabel}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button type="button" onClick={() => setModal({ type: 'edit', student })} className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-600 hover:border-blue-200 hover:text-blue-700">Edit</button>
                                            <form action={`/dashboard/school/students/${student.id}`} method="POST" onSubmit={() => setSelected((current) => current.filter((id) => id !== String(student.id)))}>
                                                <input type="hidden" name="_token" value={csrf} />
                                                <input type="hidden" name="_method" value="DELETE" />
                                                <button className="rounded-md border border-red-100 px-3 py-1.5 text-xs font-black text-red-600 hover:bg-red-50">Delete</button>
                                            </form>
                                        </div>
                                    </td>
                                </tr>
                                );
                            })}
                            {!visible.length && (
                                <tr>
                                    <td colSpan="7" className="px-4 py-10 text-center text-sm font-semibold text-slate-500">No students match your filters.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="grid gap-2 p-3 md:hidden">
                    {visible.map((student) => {
                        const [statusLabel, statusTone] = studentStatus(student);

                        return (
                            <article key={student.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                                <div className="grid grid-cols-[auto_38px_minmax(0,1fr)_auto] items-center gap-2.5">
                                    <input type="checkbox" checked={selected.includes(String(student.id))} onChange={() => toggleStudent(student.id)} className="h-4 w-4 rounded border-slate-300" aria-label={`Select ${student.name}`} />
                                    <span className="grid h-9 w-9 place-items-center rounded-full bg-[#e5eeff] text-[11px] font-black text-[#0b1c30]">{student.initials}</span>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-black text-slate-950">{student.name}</p>
                                        <p className="truncate text-[11px] font-semibold text-slate-500">ID: {student.studentIdentifier} • {student.grade}</p>
                                    </div>
                                    <span className={cx('max-w-[96px] truncate rounded-full px-2 py-1 text-[9px] font-black uppercase ring-1', statusTone)}>{statusLabel}</span>
                                </div>

                                <div className="mt-2 grid grid-cols-2 gap-2 border-y border-slate-100 py-2">
                                    <div>
                                        <span className="block text-[9px] font-black uppercase tracking-[0.08em] text-slate-400">Interest</span>
                                        <span className="mt-0.5 block truncate text-[12px] font-black text-slate-700">{student.interest}</span>
                                    </div>
                                    <div>
                                        <span className="block text-[9px] font-black uppercase tracking-[0.08em] text-slate-400">Assigned</span>
                                        <span className="mt-0.5 block truncate text-[12px] font-black text-slate-700">{student.assignedEvents.length ? student.assignedEvents.slice(0, 2).join(', ') : 'None'}</span>
                                    </div>
                                </div>

                                <div className="mt-2 flex gap-2">
                                    <button type="button" onClick={() => setModal({ type: 'edit', student })} className="flex-1 rounded-lg bg-slate-950 px-3 py-2 text-[12px] font-black text-white">Edit</button>
                                    <button type="button" onClick={() => { setSelected((current) => current.includes(String(student.id)) ? current : [...current, String(student.id)]); setModal({ type: 'assign' }); }} className="flex-1 rounded-lg border border-[#006a61]/30 px-3 py-2 text-[12px] font-black text-[#006a61]">Assign</button>
                                    <form action={`/dashboard/school/students/${student.id}`} method="POST" onSubmit={() => setSelected((current) => current.filter((id) => id !== String(student.id)))}>
                                        <input type="hidden" name="_token" value={csrf} />
                                        <input type="hidden" name="_method" value="DELETE" />
                                        <button className="grid h-8 w-9 place-items-center rounded-lg border border-red-100 text-red-600" aria-label={`Delete ${student.name}`}>
                                            <Trash2 size={15} />
                                        </button>
                                    </form>
                                </div>
                            </article>
                        );
                    })}
                    {!visible.length && <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm font-semibold text-slate-500">No students match your filters.</div>}
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-3 py-3 md:flex-row md:items-center md:justify-between md:px-4 md:py-4">
                    <p className="text-xs font-semibold text-slate-600">Showing {filtered.length ? ((page - 1) * pageSize) + 1 : 0}-{Math.min(page * pageSize, filtered.length)} of {filtered.length} students</p>
                    <div className="flex items-center gap-3">
                        <button type="button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-500 hover:border-blue-200 hover:text-blue-700 disabled:opacity-40" aria-label="Previous page">
                            <ChevronDown size={16} className="rotate-90" />
                        </button>
                        <span className="text-xs font-black text-slate-700">Page {page} of {totalPages}</span>
                        <button type="button" disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-500 hover:border-blue-200 hover:text-blue-700 disabled:opacity-40" aria-label="Next page">
                            <ChevronDown size={16} className="-rotate-90" />
                        </button>
                    </div>
                </div>
            </section>

            {modal?.type === 'add' && (
                <StudentModal title="Add Student Manually" onClose={() => setModal(null)}>
                    <StudentForm csrf={csrf} action="/dashboard/school/students" errors={errors} onSubmit={() => window.setTimeout(() => setModal(null), 500)} />
                </StudentModal>
            )}
            {modal?.type === 'edit' && (
                <StudentModal title={`Edit ${modal.student.name}`} onClose={() => setModal(null)}>
                    <StudentForm csrf={csrf} action={`/dashboard/school/students/${modal.student.id}`} method="PUT" student={modal.student} errors={errors} onSubmit={() => window.setTimeout(() => { setQuery(''); setModal(null); }, 500)} />
                </StudentModal>
            )}
            {modal?.type === 'bulk' && (
                <StudentModal title="Bulk Upload Students" onClose={() => setModal(null)}>
                    <form action="/dashboard/school/students/bulk" method="POST" onSubmit={() => window.setTimeout(() => setModal(null), 500)} className="space-y-4">
                        <input type="hidden" name="_token" value={csrf} />
                        <label className="block">
                            <span className="text-xs font-black uppercase tracking-wide text-slate-500">CSV rows</span>
                            <textarea name="csv" rows="7" placeholder="Name, email, grade, interest&#10;Jane Doe, jane@example.com, 12th, Computer Science" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:border-blue-400" />
                        </label>
                        {errors.csv?.[0] && <p className="text-xs font-bold text-red-600">{errors.csv[0]}</p>}
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => setModal(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-black text-slate-600">Cancel</button>
                            <button className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white">Upload Students</button>
                        </div>
                    </form>
                </StudentModal>
            )}
            {modal?.type === 'assign' && (
                <StudentModal title="Assign Students to Event" onClose={() => setModal(null)}>
                    <form action="/dashboard/school/students/assign" method="POST" onSubmit={() => window.setTimeout(() => { setSelected([]); setModal(null); }, 500)} className="space-y-4">
                        <input type="hidden" name="_token" value={csrf} />
                        {selected.map((id) => <input key={id} type="hidden" name="student_ids[]" value={id} />)}
                        <p className="rounded-lg bg-blue-50 p-3 text-sm font-semibold text-blue-900">{selected.length} selected student(s) will be assigned.</p>
                        <label className="block">
                            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Event</span>
                            <select name="visit_request_id" required className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-blue-400">
                                <option value="">Select an approved visit</option>
                                {eventOptions.map((visit) => <option key={visit.id} value={visit.id}>{visit.label}</option>)}
                            </select>
                        </label>
                        {!eventOptions.length && <p className="rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-800">A visit must be approved before students can be assigned.</p>}
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => setModal(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-black text-slate-600">Cancel</button>
                            <button disabled={!eventOptions.length} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white disabled:bg-slate-300">Assign to Event</button>
                        </div>
                    </form>
                </StudentModal>
            )}
        </div>
    );
}

function StudentModal({ title, onClose, children }) {
    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <h2 className="text-xl font-black text-slate-950">{title}</h2>
                    <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close modal"><X size={18} /></button>
                </div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
}

function StudentForm({ csrf, action, method = 'POST', student = {}, errors = {}, onSubmit }) {
    return (
        <form action={action} method="POST" onSubmit={onSubmit} className="space-y-4">
            <input type="hidden" name="_token" value={csrf} />
            {method !== 'POST' && <input type="hidden" name="_method" value={method} />}
            <div className="grid gap-4 md:grid-cols-2">
                <LightField label="Full Name" name="name" defaultValue={student.name || ''} error={errors.name?.[0]} />
                <LightField label="Email" name="email" type="email" defaultValue={student.email || ''} error={errors.email?.[0]} />
                <LightField label="Student ID" name="student_identifier" defaultValue={student.studentIdentifier || ''} error={errors.student_identifier?.[0]} />
                <label className="block">
                    <span className="text-xs font-black uppercase tracking-wide text-slate-500">Grade</span>
                    <select name="grade_level" defaultValue={student.grade || '12th'} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-blue-400">
                        <option value="12th">12th</option>
                        <option value="11th">11th</option>
                        <option value="10th">10th</option>
                        <option value="9th">9th</option>
                    </select>
                    {errors.grade_level?.[0] && <p className="mt-1 text-xs font-bold text-red-600">{errors.grade_level[0]}</p>}
                </label>
                <div className="md:col-span-2">
                    <label className="block">
                        <span className="text-xs font-black uppercase tracking-wide text-slate-500">Interest / Major</span>
                        <select name="interest_major" defaultValue={student.interest || 'Computer Science'} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-blue-400">
                            <option value="Computer Science">Computer Science</option>
                            <option value="Business Admin">Business Admin</option>
                            <option value="Pre-Med">Pre-Med</option>
                            <option value="Engineering">Engineering</option>
                            <option value="Liberal Arts">Liberal Arts</option>
                            <option value="Undecided">Undecided</option>
                        </select>
                        {errors.interest_major?.[0] && <p className="mt-1 text-xs font-bold text-red-600">{errors.interest_major[0]}</p>}
                    </label>
                </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))} className="hidden">Cancel</button>
                <button className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white">{method === 'POST' ? 'Add Student' : 'Save Changes'}</button>
            </div>
        </form>
    );
}

function SchoolExploreUniversitiesSection({ events = [], setSection }) {
    const [query, setQuery] = useState('');
    const [location, setLocation] = useState('all');
    const [program, setProgram] = useState('all');
    const [sortBy, setSortBy] = useState('date');
    const [profileUniversity, setProfileUniversity] = useState(null);
    const [page, setPage] = useState(1);
    const pageSize = 8;
    const directoryCards = useMemo(() => schoolUniversityCards(events), [events]);
    const availableLocations = useMemo(() => [...new Set(directoryCards.map((card) => card.location).filter(Boolean))].sort(), [directoryCards]);
    const availablePrograms = useMemo(() => [...new Set(directoryCards.map((card) => card.focus).filter(Boolean))].sort(), [directoryCards]);
    const universities = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        return directoryCards
            .filter((card) => {
                const searchable = `${card.name} ${card.location} ${card.type} ${card.focus} ${card.tags.join(' ')}`.toLowerCase();
                const queryMatch = !normalizedQuery || searchable.includes(normalizedQuery);
                const locationMatch = location === 'all' || card.location === location;
                const programMatch = program === 'all' || card.focus === program;
                return queryMatch && locationMatch && programMatch;
            })
            .sort((left, right) => {
                if (sortBy === 'visits') return Number(right.upcomingVisits || 0) - Number(left.upcomingVisits || 0);
                if (sortBy === 'location') return String(left.location || '').localeCompare(String(right.location || ''));
                if (sortBy === 'name') return left.name.localeCompare(right.name);
                return new Date(left.nextVisit || '9999-12-31') - new Date(right.nextVisit || '9999-12-31');
            });
    }, [directoryCards, query, location, program, sortBy]);
    const totalPages = Math.max(1, Math.ceil(universities.length / pageSize));
    const visibleUniversities = universities.slice((page - 1) * pageSize, page * pageSize);
    const nextUniversity = universities.find((card) => card.nextVisit);
    const publishedVisitCount = directoryCards.reduce((total, card) => total + card.upcomingVisits, 0);
    const locationCount = availableLocations.length;

    useEffect(() => {
        setPage(1);
    }, [query, location, program, sortBy]);

    const resetFilters = () => {
        setQuery('');
        setLocation('all');
        setProgram('all');
        setSortBy('date');
    };

    if (profileUniversity) {
        return (
            <UniversityProfileSection
                university={profileUniversity}
                events={events}
                onBack={() => setProfileUniversity(null)}
                onOpenVisits={() => setSection?.('events')}
            />
        );
    }

    return (
        <div className="space-y-6">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="grid gap-6 p-6 xl:grid-cols-[1fr_auto] xl:items-center">
                    <div>
                        <h1 className="text-3xl font-black text-slate-950">Explore Universities</h1>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                            Search universities with currently published visit programs, then open the real program schedule for your student cohort.
                        </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3 xl:w-[520px]">
                        <DiscoveryStat label="Results" value={universities.length.toLocaleString()} />
                        <DiscoveryStat label="Published Visits" value={publishedVisitCount.toLocaleString()} />
                        <DiscoveryStat label="Locations" value={locationCount.toLocaleString()} />
                    </div>
                </div>

                <div className="grid gap-4 border-t border-slate-200 bg-slate-50 p-4 lg:grid-cols-[1.3fr_repeat(4,minmax(0,1fr))]">
                    <label className="relative lg:col-span-2">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search universities, locations, programs, or tags..."
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400"
                        />
                    </label>
                    <DiscoverySelect value={location} onChange={setLocation} options={[
                        ['all', 'All Locations'],
                        ...availableLocations.map((item) => [item, item]),
                    ]} />
                    <DiscoverySelect value={program} onChange={setProgram} options={[
                        ['all', 'All Programs'],
                        ...availablePrograms.map((item) => [item, item]),
                    ]} />
                    <DiscoverySelect value={sortBy} onChange={setSortBy} options={[
                        ['date', 'Sort: next visit'],
                        ['visits', 'Sort: visits'],
                        ['location', 'Sort: location'],
                        ['name', 'Sort: name'],
                    ]} />
                    <button type="button" onClick={resetFilters} className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 hover:border-blue-200 hover:text-blue-700">
                        Reset
                    </button>
                </div>
            </section>

            <div className="grid gap-6 2xl:grid-cols-[1fr_360px]">
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-4 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black uppercase text-emerald-700">
                                <CalendarDays size={14} /> Published Visit Directory
                            </span>
                            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">{publishedVisitCount} published program(s)</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-500">Every row is built from a current published campus event.</p>
                    </div>

                    <div className="hidden bg-slate-50 px-5 py-3 text-[11px] font-black uppercase tracking-wide text-slate-400 lg:grid lg:grid-cols-[1.6fr_1fr_1fr_120px_1.2fr_150px]">
                        <span>University</span>
                        <span>Location</span>
                        <span>Program focus</span>
                        <span>Published visits</span>
                        <span>Next visit</span>
                        <span>Actions</span>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {visibleUniversities.map((card) => (
                            <article key={card.name} className="grid gap-4 p-5 transition hover:bg-blue-50/40 lg:grid-cols-[1.6fr_1fr_1fr_120px_1.2fr_150px] lg:items-center">
                                <div className="flex min-w-0 items-center gap-3">
                                    <span className={cx('grid h-12 w-12 shrink-0 place-items-center rounded-xl text-sm font-black text-white shadow-sm', card.image)}>{card.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
                                    <div className="min-w-0">
                                        <h2 className="truncate text-base font-black text-slate-950">{card.name}</h2>
                                        <p className="mt-1 text-xs font-semibold text-slate-500">{card.type}</p>
                                    </div>
                                </div>
                                <p className="flex items-center gap-1 text-sm font-semibold text-slate-600"><MapPin size={14} className="text-slate-400" /> {card.location}</p>
                                <div>
                                    <p className="text-sm font-black text-slate-800">{card.focus}</p>
                                    <p className="mt-1 text-xs font-semibold text-slate-400">{card.upcomingVisits} published program(s)</p>
                                </div>
                                <p className="text-sm font-black text-slate-800">{card.upcomingVisits}</p>
                                <p className="text-sm font-semibold text-slate-600">{card.nextVisit ? formatShortDate(card.nextVisit) : 'No future date'}</p>
                                <div className="flex items-center gap-2">
                                    <button type="button" onClick={() => setProfileUniversity(card)} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-slate-800">View Profile</button>
                                </div>
                            </article>
                        ))}
                        {!visibleUniversities.length && (
                            <div className="p-10 text-center">
                                <p className="text-lg font-black text-slate-950">No universities match these filters.</p>
                                <button type="button" onClick={resetFilters} className="mt-3 rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">Reset discovery filters</button>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 md:flex-row md:items-center md:justify-between">
                        <p className="text-sm font-semibold text-slate-500">
                            Showing {universities.length ? ((page - 1) * pageSize) + 1 : 0}-{Math.min(page * pageSize, universities.length)} of {universities.length.toLocaleString()} universities
                        </p>
                        <div className="flex items-center gap-2">
                            <button type="button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-600 disabled:opacity-40">Previous</button>
                            <span className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-black text-white">{page} / {totalPages}</span>
                            <button type="button" disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-600 disabled:opacity-40">Next</button>
                        </div>
                    </div>
                </section>

                <aside className="space-y-5">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                            <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Activity size={20} /></span>
                            <div>
                                <h2 className="text-xl font-black text-slate-950">Next Published Visit</h2>
                                <p className="text-xs font-bold text-slate-400">Based on current event dates</p>
                            </div>
                        </div>
                        {nextUniversity ? (
                            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                                <p className="text-[11px] font-black uppercase text-emerald-700">Upcoming Publisher</p>
                                <p className="mt-2 text-lg font-black text-slate-950">{nextUniversity.name}</p>
                                <p className="mt-2 text-sm leading-6 text-slate-600">{nextUniversity.nextVisit ? `${formatShortDate(nextUniversity.nextVisit)} · ` : ''}{nextUniversity.location}. {nextUniversity.upcomingVisits} published visit program(s).</p>
                            </div>
                        ) : <EmptyState message="No university has a published visit program yet." />}
                        <div className="mt-5 space-y-4">
                            <MiniStat label="Published visits" value={publishedVisitCount} />
                            <MiniStat label="University locations" value={locationCount} />
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-black text-slate-950">Published Directory</h2>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-500">{universities.length}</span>
                        </div>
                        <div className="mt-4 space-y-3">
                            {universities.slice(0, 3).map((card) => (
                                <div key={card.name} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="font-black text-slate-900">{card.name}</p>
                                        <span className="text-xs font-black text-emerald-700">{card.upcomingVisits} visit(s)</span>
                                    </div>
                                    <p className="mt-1 text-xs font-semibold text-slate-500">{card.focus} - {card.location}</p>
                                </div>
                            ))}
                            {universities.length === 0 && <p className="text-sm font-semibold text-slate-500">No published university visits are available.</p>}
                        </div>
                    </section>

                    <section className="rounded-2xl bg-slate-950 p-5 text-white shadow-sm">
                        <div className="flex items-center gap-2 text-emerald-300"><Sparkles size={18} /><span className="text-xs font-black uppercase">Suggested Next Action</span></div>
                        <p className="mt-3 text-sm font-semibold leading-6">Build a visit request around the top shortlisted institutions, then invite students by program interest.</p>
                        <button type="button" onClick={() => setSection?.('events')} className="mt-4 rounded-lg bg-white px-4 py-2 text-xs font-black text-slate-950">Open Available Visits</button>
                    </section>
                </aside>
            </div>
        </div>
    );
}

function DiscoveryStat({ label, value }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
        </div>
    );
}

function UniversityProfileSection({ university, events = [], onBack, onOpenVisits }) {
    const publishedEvents = (university.publishedVisits?.length
        ? university.publishedVisits
        : events.filter((event) => event.status === 'published' && event.university === university.name))
        .slice()
        .sort((left, right) => new Date(left.startsAt || '9999-12-31') - new Date(right.startsAt || '9999-12-31'));
    const campusEvents = publishedEvents.slice(0, 3);
    const totalCapacity = publishedEvents.reduce((total, event) => total + Number(event.capacity || 0), 0);
    const registeredSeats = publishedEvents.reduce((total, event) => total + Number(event.confirmedSeats || 0), 0);
    const openSeats = publishedEvents.reduce((total, event) => total + Math.max(0, Number(event.capacity || 0) - Number(event.confirmedSeats || 0)), 0);
    const nextVisit = publishedEvents.find((event) => {
        const startsAt = new Date(event.startsAt || '').getTime();
        return Number.isFinite(startsAt) && startsAt >= Date.now();
    }) || null;

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-xs font-black text-slate-500">
                <button type="button" onClick={onBack} className="text-blue-700 hover:text-blue-900">Explore Universities</button>
                <ChevronRight size={14} />
                <span className="text-slate-950">{university.name}</span>
            </div>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex gap-5">
                        <div className="grid h-24 w-24 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-50">
                            <span className={cx('grid h-14 w-14 place-items-center rounded-full text-sm font-black text-white', university.image)}>
                                {university.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
                            </span>
                        </div>
                        <div>
                            <div className="flex flex-wrap gap-2">
                                <span className="rounded bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">University publisher</span>
                                <span className="rounded bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">{publishedEvents.length} published visit{publishedEvents.length === 1 ? '' : 's'}</span>
                            </div>
                            <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">{university.name}</h1>
                            <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-slate-500"><MapPin size={15} /> {university.location}</p>
                        </div>
                    </div>
                    <button type="button" onClick={onOpenVisits} className="rounded-lg bg-blue-700 px-6 py-3 text-sm font-black text-white hover:bg-blue-800">View Visits</button>
                </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
                <section className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-3">
                        <UniversityProfileMetric label="Published Visits" value={publishedEvents.length} detail={`${registeredSeats.toLocaleString()} registered`} />
                        <UniversityProfileMetric label="Open Seats" value={openSeats.toLocaleString()} detail={`${totalCapacity.toLocaleString()} total capacity`} tone="green" />
                        <UniversityProfileMetric label="Next Visit" value={nextVisit ? formatShortDate(nextVisit.startsAt) : 'Not scheduled'} detail={nextVisit ? (nextVisit.location || nextVisit.venue || 'Location TBA') : 'No future date posted'} />
                    </div>

                    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-black text-slate-950">Campus Events</h2>
                            <button type="button" onClick={onOpenVisits} className="text-sm font-black text-blue-700">View All</button>
                        </div>
                        <div className="mt-4 divide-y divide-slate-100">
                            {campusEvents.map((event, index) => (
                                <div key={`${event.title}-${index}`} className="grid gap-4 py-4 sm:grid-cols-[56px_1fr_auto] sm:items-center">
                                    <div className="text-center">
                                        <p className="text-[10px] font-black uppercase text-blue-700">{formatShortMonth(event.startsAt)}</p>
                                        <p className="text-xl font-black text-slate-950">{formatShortDay(event.startsAt)}</p>
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-950">{event.title}</p>
                                        <p className="mt-1 text-xs font-semibold text-slate-500">{event.location || event.venue || 'Location TBA'} - {formatTimeRange(event.startsAt, event.endsAt || event.event_date)}</p>
                                    </div>
                                    <button type="button" onClick={onOpenVisits} className="text-sm font-black text-blue-700">View</button>
                                </div>
                            ))}
                            {campusEvents.length === 0 && <EmptyState message="This university has no published visit programs." />}
                        </div>
                    </section>
                </section>

                <aside className="space-y-5">
                    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-black text-slate-950">Published Visit Summary</h2>
                            <CalendarDays size={18} className="text-blue-700" />
                        </div>
                        <div className="mt-5 space-y-4">
                            <MiniStat label="Published programs" value={publishedEvents.length.toLocaleString()} />
                            <MiniStat label="Total capacity" value={totalCapacity.toLocaleString()} />
                            <MiniStat label="Registered seats" value={registeredSeats.toLocaleString()} />
                        </div>
                        <p className="mt-5 rounded-lg bg-emerald-50 p-3 text-xs font-semibold leading-5 text-emerald-900">
                            Capacity and registration totals come directly from this university&apos;s published visit programs.
                        </p>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-black text-slate-950">Available Programs</h2>
                            <Grid2X2 size={17} className="text-blue-700" />
                        </div>
                        <div className="mt-4 space-y-3">
                            {publishedEvents.slice(0, 4).map((event) => (
                                <div key={event.id || `${event.title}-${event.startsAt}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-sm font-black text-slate-950">{event.title}</p>
                                    <p className="mt-1 text-xs font-semibold text-slate-500">{formatShortDate(event.startsAt)} - {event.location || event.venue || 'Location TBA'}</p>
                                </div>
                            ))}
                            {publishedEvents.length === 0 && <p className="text-sm font-semibold text-slate-500">No published programs are available.</p>}
                        </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2">
                            <GraduationCap size={18} className="text-blue-700" />
                            <h2 className="text-lg font-black text-slate-950">Visit Access</h2>
                        </div>
                        <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">Open the visit directory to review schedules, seat availability, and any request already associated with your school.</p>
                        <button type="button" onClick={onOpenVisits} className="mt-4 w-full rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-black text-white">Open Available Visits</button>
                    </section>
                </aside>
            </div>
        </div>
    );
}

function UniversityProfileMetric({ label, value, detail, tone }) {
    return (
        <article className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
            <p className={cx('mt-1 text-xs font-bold', tone === 'green' ? 'text-emerald-600' : tone === 'red' ? 'text-red-600' : 'text-slate-500')}>{detail}</p>
        </article>
    );
}

function formatShortMonth(value) {
    if (!value) return 'TBA';
    return new Date(value).toLocaleDateString([], { month: 'short' }).toUpperCase();
}

function formatShortDay(value) {
    if (!value) return '--';
    return new Date(value).toLocaleDateString([], { day: '2-digit' });
}

function DiscoverySelect({ value, onChange, options }) {
    return (
        <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 outline-none focus:border-blue-400">
            {options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}
        </select>
    );
}

function UniversitySettingsSection({ csrf, settings = {}, securityProfile = {}, compliance = {}, errors = {}, old = {} }) {
    const profile = settings.profile || {};
    const branding = settings.branding || {};
    const defaults = settings.defaults || {};
    const notifications = settings.notifications || {};
    const integrations = settings.integrations || {};
    const calendar = settings.calendar || {};
    const team = settings.team || [];
    const [teamEditor, setTeamEditor] = useState(null);
    const [activeTab, setActiveTab] = useState('profile');
    const tabs = [
        ['profile', 'Profile', GraduationCap],
        ['branding', 'Branding', Sparkles],
        ['defaults', 'Visit Defaults', CalendarDays],
        ['notifications', 'Notifications', Bell],
        ['integrations', 'Integrations', Blocks],
        ['calendar', 'Calendar', Clock],
        ['team', 'Team Contacts', UsersRound],
        ['security', 'Security', ShieldCheck],
        ['compliance', 'Compliance', CheckSquare],
    ];

    return (
        <section className="grid gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#006a61]">University operations</p>
                    <h1 className="mt-1 text-2xl font-black text-slate-950">Settings</h1>
                    <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-slate-500">Compact controls for profile, branding, team contacts, defaults, notifications, integrations, timezone, and security.</p>
                </div>
                <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {tabs.map(([id, label, Icon]) => (
                        <button key={id} type="button" onClick={() => setActiveTab(id)} className={cx('inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-black transition', activeTab === id ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>
                            <Icon size={14} />
                            {label}
                            {id === 'team' && <span className={cx('rounded-full px-1.5 py-0.5 text-[10px]', activeTab === id ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500')}>{team.length}</span>}
                        </button>
                    ))}
                </div>
            </div>

            {!['team', 'security', 'compliance'].includes(activeTab) && <form action="/dashboard/university/settings" method="POST" className="grid gap-4">
                <input type="hidden" name="_token" value={csrf} />
                <FormErrorSummary errors={errors} />
                <div className="grid gap-4">
                    <section className={cx('rounded-2xl border border-slate-200 bg-white p-4 shadow-sm', activeTab !== 'profile' && 'hidden')}>
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#e5eeff] text-[#006a61]"><GraduationCap size={20} /></span>
                            <div>
                                <h2 className="text-lg font-black text-slate-950">University Profile</h2>
                                <p className="text-sm font-semibold text-slate-500">Controls institution identity across the portal.</p>
                            </div>
                        </div>
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <LightField label="Institution name" name="institution_name" defaultValue={old.institution_name || profile.institutionName || ''} error={errors.institution_name?.[0]} />
                            <LightField label="Website" name="website" type="url" placeholder="https://university.edu" defaultValue={old.website || profile.website || ''} error={errors.website?.[0]} />
                            <LightField label="Primary contact name" name="primary_contact_name" defaultValue={old.primary_contact_name || profile.primaryContactName || ''} error={errors.primary_contact_name?.[0]} />
                            <LightField label="Primary contact email" name="primary_contact_email" type="email" defaultValue={old.primary_contact_email || profile.primaryContactEmail || ''} error={errors.primary_contact_email?.[0]} />
                            <LightField label="Primary contact phone" name="primary_contact_phone" defaultValue={old.primary_contact_phone || profile.primaryContactPhone || ''} error={errors.primary_contact_phone?.[0]} />
                            <LightField label="Recruitment region" name="region" defaultValue={old.region || profile.region || ''} error={errors.region?.[0]} />
                            <div className="md:col-span-2"><LightField label="Campus address" name="address" defaultValue={old.address || profile.address || ''} error={errors.address?.[0]} /></div>
                        </div>
                    </section>

                    <section className={cx('rounded-2xl border border-slate-200 bg-white p-4 shadow-sm', activeTab !== 'branding' && 'hidden')}>
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-teal-50 text-[#006a61]"><Sparkles size={20} /></span>
                            <div>
                                <h2 className="text-lg font-black text-slate-950">Logo & Branding</h2>
                                <p className="text-sm font-semibold text-slate-500">Use a public logo URL or upload an image directly.</p>
                            </div>
                        </div>
                        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_140px]">
                            <LightField label="Logo URL" name="logo_url" type="url" placeholder="https://..." defaultValue={old.logo_url || branding.logoUrl || ''} error={errors.logo_url?.[0]} />
                            <LightField label="Brand color" name="brand_color" type="color" defaultValue={old.brand_color || branding.brandColor || '#006a61'} error={errors.brand_color?.[0]} />
                        </div>
                        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Preview</p>
                            <div className="mt-3 flex items-center gap-3">
                                <span className="grid h-12 w-12 place-items-center rounded-2xl text-white" style={{ backgroundColor: old.brand_color || branding.brandColor || '#006a61' }}>{branding.logoUrl ? <img src={branding.logoUrl} alt="" className="h-full w-full rounded-2xl object-cover" /> : 'SC'}</span>
                                <div>
                                    <p className="font-black text-slate-950">{old.institution_name || profile.institutionName || 'University name'}</p>
                                    <p className="text-xs font-semibold text-slate-500">{profile.region || 'Recruitment region'}</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className={cx('rounded-2xl border border-slate-200 bg-white p-4 shadow-sm', activeTab !== 'defaults' && 'hidden')}>
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-blue-700"><CalendarDays size={20} /></span>
                            <div>
                                <h2 className="text-lg font-black text-slate-950">Default Visit Configuration</h2>
                                <p className="text-sm font-semibold text-slate-500">Used by the Create Program popup as operational defaults.</p>
                            </div>
                        </div>
                        <div className="mt-4 grid gap-4 md:grid-cols-3">
                            <LightField label="Default capacity" name="default_capacity" type="number" min="1" defaultValue={old.default_capacity || defaults.capacity || 80} error={errors.default_capacity?.[0]} />
                            <LightField label="Per-school cap" name="default_per_school_capacity" type="number" min="1" defaultValue={old.default_per_school_capacity || defaults.per_school_capacity || ''} error={errors.default_per_school_capacity?.[0]} />
                            <LightField label="Per-group cap" name="default_per_group_capacity" type="number" min="1" defaultValue={old.default_per_group_capacity || defaults.per_group_capacity || ''} error={errors.default_per_group_capacity?.[0]} />
                            <LightField label="Visit duration minutes" name="default_visit_duration_minutes" type="number" min="30" defaultValue={old.default_visit_duration_minutes || defaults.duration_minutes || 180} error={errors.default_visit_duration_minutes?.[0]} />
                            <label className="text-sm font-semibold text-slate-700">Default visibility<select name="default_visibility" defaultValue={old.default_visibility || defaults.visibility || 'public'} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-[#006a61] focus:ring-4 focus:ring-emerald-50"><option value="public">Public</option><option value="invite_only">Invite only</option><option value="private">Private</option></select></label>
                            <label className="text-sm font-semibold text-slate-700">Default lifecycle<select name="default_lifecycle_stage" defaultValue={old.default_lifecycle_stage || defaults.lifecycle_stage || 'planning'} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-[#006a61] focus:ring-4 focus:ring-emerald-50"><option value="planning">Planning</option><option value="inviting">Inviting</option><option value="open">Open</option></select></label>
                        </div>
                    </section>
                </div>

                <aside className="grid content-start gap-4">
                    <section className={cx('rounded-2xl border border-slate-200 bg-white p-4 shadow-sm', activeTab !== 'notifications' && 'hidden')}>
                        <h2 className="text-lg font-black text-slate-950">Notification Preferences</h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500">Global email delivery is enforced. Event-type preferences are preserved as stored settings until fine-grained routing is connected.</p>
                        <div className="mt-4 grid gap-3">
                            <SettingsCheckbox name="notify_request_created" label="New visit request · stored only" defaultChecked={notifications.request_created !== false} disabled />
                            <SettingsCheckbox name="notify_request_updated" label="Request status changes · stored only" defaultChecked={notifications.request_updated !== false} disabled />
                            <SettingsCheckbox name="notify_registration_confirmed" label="Registration confirmations · stored only" defaultChecked={notifications.registration_confirmed !== false} disabled />
                            <SettingsCheckbox name="notify_waitlist_promoted" label="Waitlist promotions · stored only" defaultChecked={notifications.waitlist_promoted !== false} disabled />
                            <SettingsCheckbox name="notify_schedule_changed" label="Schedule changes · stored only" defaultChecked={notifications.schedule_changed !== false} disabled />
                            <SettingsCheckbox name="email_enabled" label="Email notifications" defaultChecked={notifications.email_enabled !== false} />
                            <LightField label="Stored reminder default · not automatically applied" name="reminder_days_before" type="number" min="0" defaultValue={old.reminder_days_before || notifications.reminder_days_before || 7} error={errors.reminder_days_before?.[0]} readOnly />
                        </div>
                    </section>

                    <section className={cx('rounded-2xl border border-slate-200 bg-white p-4 shadow-sm', activeTab !== 'integrations' && 'hidden')}>
                        <h2 className="text-lg font-black text-slate-950">Integrations</h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500">iCal export is available now. Provider, CRM, webhook, and API sync settings are preserved but are not connected to delivery services.</p>
                        <input type="hidden" name="calendar_provider" value={old.calendar_provider || integrations.calendar_provider || 'ical'} />
                        <input type="hidden" name="crm_provider" value={old.crm_provider || integrations.crm_provider || 'none'} />
                        <input type="hidden" name="webhook_url" value={old.webhook_url || integrations.webhook_url || ''} />
                        <input type="hidden" name="api_sync_enabled" value={integrations.api_sync_enabled ? '1' : '0'} />
                        <div className="mt-4 grid gap-4">
                            <a href="/campus-events/calendar/export" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#006a61] px-4 py-3 text-sm font-black text-white hover:bg-[#005b54]"><Download size={16} /> Export iCal Calendar</a>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-600">External calendar provider sync is unavailable. CRM, webhook, and API sync controls will become available only after a delivery provider is connected.</div>
                        </div>
                    </section>

                    <section className={cx('rounded-2xl border border-slate-200 bg-white p-4 shadow-sm', activeTab !== 'calendar' && 'hidden')}>
                        <h2 className="text-lg font-black text-slate-950">Timezone & Calendar</h2>
                        <div className="mt-4 grid gap-4">
                            <label className="text-sm font-semibold text-slate-700">Timezone<input name="timezone" defaultValue={old.timezone || calendar.timezone || 'UTC'} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-[#006a61] focus:ring-4 focus:ring-emerald-50" list="timezone-options" /><datalist id="timezone-options"><option value="Africa/Lagos" /><option value="UTC" /><option value="America/New_York" /><option value="America/Chicago" /><option value="America/Los_Angeles" /><option value="Europe/London" /></datalist></label>
                            <label className="text-sm font-semibold text-slate-700">Week starts on<select name="calendar_week_start" defaultValue={old.calendar_week_start || calendar.weekStart || 'monday'} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-[#006a61] focus:ring-4 focus:ring-emerald-50"><option value="monday">Monday</option><option value="sunday">Sunday</option></select></label>
                        </div>
                    </section>

                    <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-800">Save Settings</button>
                </aside>
            </form>}

            {activeTab === 'branding' && <form id="university-logo-upload" action="/university/branding/logo" method="POST" encType="multipart/form-data" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <input type="hidden" name="_token" value={csrf} />
                <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                    <label className="grid gap-2 text-sm font-black text-slate-700">Upload institution logo<input type="file" name="logo" accept="image/png,image/jpeg,image/webp,image/gif" required className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold file:mr-3 file:rounded-lg file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:text-xs file:font-black file:text-white" /><span className="text-xs font-semibold text-slate-400">PNG, JPG, WebP, or GIF up to 5 MB.</span></label>
                    <button className="rounded-xl bg-[#006a61] px-5 py-3 text-sm font-black text-white">Upload Logo</button>
                </div>
            </form>}

            {activeTab === 'team' && <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-lg font-black text-slate-950">Team Contacts</h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500">Maintain an internal contact directory. These records do not create user accounts, send invitations, or grant portal access.</p>
                    </div>
                    <button type="button" onClick={() => setTeamEditor({})} className="rounded-xl bg-[#006a61] px-4 py-2 text-sm font-black text-white"><Plus size={15} className="inline" /> Add contact</button>
                </div>
                <div className="mt-4 grid gap-3">
                    {team.length === 0 ? (
                        <EmptyState message="No team contacts have been recorded yet." />
                    ) : team.map((member) => (
                        <article key={member.id} className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-[1fr_auto] md:items-center">
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="font-black text-slate-950">{member.name}</h3>
                                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-500">Contact record</span>
                                </div>
                                <p className="mt-1 text-sm font-semibold text-slate-500">{member.title || 'Recruiter'} · {member.email} {member.phone ? `· ${member.phone}` : ''}</p>
                            </div>
                            <div className="flex gap-2 md:justify-end">
                                <button type="button" onClick={() => setTeamEditor(member)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">Edit</button>
                                <ConfirmForm csrf={csrf} action={`/dashboard/university/team-members/${member.id}`} method="DELETE" title="Remove team contact?" message={`Remove ${member.name} from the saved contact directory?`} confirmLabel="Remove" className="rounded-xl border border-rose-100 bg-white px-3 py-2 text-xs font-black text-rose-700">
                                    Remove
                                </ConfirmForm>
                            </div>
                        </article>
                    ))}
                </div>
            </section>}

            {activeTab === 'security' && <SecurityAccessSection csrf={csrf} profile={securityProfile || {}} errors={errors || {}} role="university" />}
            {activeTab === 'compliance' && <UniversityComplianceSection csrf={csrf} compliance={compliance || {}} registrations={[]} />}

            {teamEditor && <UniversityTeamModal csrf={csrf} member={teamEditor.id ? teamEditor : null} errors={errors || {}} onClose={() => setTeamEditor(null)} />}
        </section>
    );
}

function UniversityComplianceSection({ csrf, compliance = {} }) {
    const metrics = compliance.metrics || {};
    const logs = compliance.logs || [];
    const requests = compliance.requests || [];
    const [logFilter, setLogFilter] = useState('');
    const visibleLogs = logs.filter((log) => !logFilter || `${log.action} ${log.actor} ${log.subjectType}`.toLowerCase().includes(logFilter.toLowerCase()));

    return (
        <section className="grid gap-4">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <MiniStat label="Audit Logs" value={metrics.auditLogs || 0} />
                <MiniStat label="Open Requests" value={metrics.openRequests || 0} />
                <MiniStat label="Minor Records" value={metrics.minorRecords || 0} />
                <MiniStat label="Pending Consent" value={metrics.pendingConsent || 0} />
            </div>

            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 text-amber-700" size={20} />
                    <div>
                        <h2 className="font-black text-slate-950">Attendee Data Privacy Notice</h2>
                        <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">{compliance.privacyNotice || 'Use attendee data only for authorized visit coordination and compliance operations.'}</p>
                        <p className="mt-2 text-xs font-bold leading-5 text-amber-800">This page records internal requests only. Submitting a request does not execute an export, deletion, or privacy decision; an authorized processor must complete that work.</p>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
                <form action="/dashboard/university/compliance-requests" method="POST" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <input type="hidden" name="_token" value={csrf} />
                    <h2 className="text-lg font-black text-slate-950">Log Compliance Request</h2>
                    <div className="mt-4 grid gap-3">
                        <label className="text-sm font-bold text-slate-700">Request type<select name="type" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="data_export">Data export</option><option value="data_deletion">Data deletion</option><option value="consent_review">Consent review</option><option value="privacy_review">Privacy review</option></select></label>
                        <label className="text-sm font-bold text-slate-700">Subject type<select name="subject_type" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">General</option><option value="attendee">Attendee</option><option value="student_group">Student group</option><option value="program">Program</option><option value="school">School</option><option value="message">Message</option></select></label>
                        <LightField label="Subject ID" name="subject_id" type="number" min="1" />
                        <LightField label="Subject label" name="subject_label" placeholder="Student, group, program, or school name" />
                        <label className="text-sm font-bold text-slate-700">Reason<textarea name="reason" rows="4" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#006a61]" placeholder="Why is this export/deletion/review required?" /></label>
                        <button className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Log Request</button>
                    </div>
                </form>

                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h2 className="text-lg font-black text-slate-950">Compliance Requests</h2>
                            <p className="mt-1 text-sm font-semibold text-slate-500">Track requests awaiting an authorized processor. University users can cancel an open request but cannot mark processing complete.</p>
                        </div>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {requests.length === 0 ? <EmptyState message="No compliance requests yet." /> : requests.map((request) => (
                            <article key={request.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-black text-slate-950">{titleCase((request.type || '').replaceAll('_', ' '))}</p>
                                        <span className={cx('rounded-full px-2 py-1 text-[10px] font-black uppercase', request.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : request.status === 'rejected' ? 'bg-rose-50 text-rose-700' : request.status === 'cancelled' ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-700')}>{request.status}</span>
                                    </div>
                                    <p className="mt-1 text-xs font-semibold text-slate-500">{request.subjectLabel || request.subjectType || 'General request'} · {formatShortDate(request.createdAt)}</p>
                                    {request.reason && <p className="mt-2 text-sm leading-6 text-slate-600">{request.reason}</p>}
                                </div>
                                {request.status === 'open' ? (
                                    <form action={`/dashboard/university/compliance-requests/${request.id}/status`} method="POST">
                                        <input type="hidden" name="_token" value={csrf} />
                                        <input type="hidden" name="status" value="cancelled" />
                                        <button className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-black text-rose-700">Cancel request</button>
                                    </form>
                                ) : <span className="text-xs font-bold text-slate-400">Processor status is read-only</span>}
                            </article>
                        ))}
                    </div>
                </section>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-lg font-black text-slate-950">University Audit Log</h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500">Edits, deletes, messages, attendance, consent, and compliance activity.</p>
                    </div>
                    <input value={logFilter} onChange={(event) => setLogFilter(event.target.value)} placeholder="Search audit logs..." className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-[#006a61]" />
                </div>
                <div className="max-h-[440px] divide-y divide-slate-100 overflow-y-auto">
                    {visibleLogs.length === 0 ? <EmptyState message="Audit activity will appear after university actions are recorded." /> : visibleLogs.map((log) => (
                        <article key={log.id} className="grid gap-2 p-4 md:grid-cols-[1fr_auto] md:items-center">
                            <div>
                                <p className="text-sm font-black text-slate-950">{log.action}</p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">{log.actor} · {log.subjectType || 'Record'} #{log.subjectId || 'N/A'} · {formatShortDate(log.createdAt)}</p>
                                {log.metadata && <p className="mt-1 line-clamp-1 text-xs text-slate-400">{Object.entries(log.metadata).filter(([, value]) => value !== null && value !== '').map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join('|') : value}`).join(' · ')}</p>}
                            </div>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase text-slate-500">{log.actorRole || 'system'}</span>
                        </article>
                    ))}
                </div>
            </section>
        </section>
    );
}

function SettingsCheckbox({ name, label, defaultChecked = false, disabled = false }) {
    return (
        <label className={cx('flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700', disabled && 'cursor-not-allowed opacity-60')}>
            <span>{label}</span>
            {disabled && <input type="hidden" name={name} value={defaultChecked ? '1' : '0'} />}
            <input type="checkbox" name={name} value="1" defaultChecked={defaultChecked} disabled={disabled} className="h-4 w-4 rounded border-slate-300 text-[#006a61] focus:ring-[#006a61]" />
        </label>
    );
}

function UniversityTeamModal({ csrf, member, errors = {}, onClose }) {
    const permissions = member?.permissions || {};
    const isEdit = Boolean(member);

    return (
        <section className="fixed inset-0 z-[95] grid place-items-center bg-slate-950/55 px-3 py-5 backdrop-blur-sm">
            <form action={isEdit ? `/dashboard/university/team-members/${member.id}` : '/dashboard/university/team-members'} method="POST" className="w-full max-w-2xl rounded-3xl border border-white/70 bg-white p-5 shadow-2xl">
                <input type="hidden" name="_token" value={csrf} />
                {isEdit && <input type="hidden" name="_method" value="PUT" />}
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#006a61]">Team contact</p>
                        <h2 className="mt-1 text-xl font-black text-slate-950">{isEdit ? `Edit ${member.name}` : 'Add team contact'}</h2>
                    </div>
                    <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 text-slate-500"><X size={18} /></button>
                </div>
                <div className="mt-4"><FormErrorSummary errors={errors} /></div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <LightField label="Name" name="name" defaultValue={member?.name || ''} error={errors.name?.[0]} />
                    <LightField label="Email" name="email" type="email" defaultValue={member?.email || ''} error={errors.email?.[0]} />
                    <LightField label="Title" name="title" defaultValue={member?.title || ''} error={errors.title?.[0]} />
                    <LightField label="Phone" name="phone" defaultValue={member?.phone || ''} error={errors.phone?.[0]} />
                </div>
                <input type="hidden" name="status" value={member?.status || 'active'} />
                {['manage_programs', 'manage_requests', 'manage_attendees', 'send_messages', 'view_insights'].map((permission) => (
                    <input key={permission} type="hidden" name={`permission_${permission}`} value={permissions[permission] ? '1' : '0'} />
                ))}
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-600">
                    This saves contact information only. It does not send an invitation or authorize this person to use the university portal.
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2">
                    <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">Cancel</button>
                    <button className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">{isEdit ? 'Save Contact' : 'Add Contact'}</button>
                </div>
            </form>
        </section>
    );
}

function SchoolSettingsSection({ csrf, profile, errors, old }) {
    const value = (key, fallback = '') => old[key] ?? profile[key] ?? fallback;
    const boolValue = (key, fallback = false) => {
        if (old[key] !== undefined) return old[key] === '1' || old[key] === 1 || old[key] === true;
        return profile[key] ?? fallback;
    };

    return (
        <div className="grid gap-6">
            <div>
                <h1 className="text-3xl font-black text-slate-950">Settings</h1>
                <p className="mt-1 text-sm text-slate-500">Manage your school profile and notification preferences.</p>
            </div>

            <form action="/dashboard/school/settings" method="POST" className="grid gap-6 xl:grid-cols-[1fr_320px]">
                <input type="hidden" name="_token" value={csrf} />
                <section className="space-y-5">
                    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-black text-slate-950">School Profile</h2>
                        <div className="mt-4 border-t border-slate-100 pt-4">
                            <div className="mb-5 flex items-center gap-4">
                                <div className="grid h-16 w-16 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-blue-700">
                                    {profile.logoUrl ? <img src={profile.logoUrl} alt="" className="h-full w-full rounded-lg object-cover" /> : <School size={28} />}
                                </div>
                                <label className="inline-flex cursor-pointer items-center rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-50">
                                    Choose Logo
                                    <input type="file" name="logo" form="school-logo-upload" accept="image/png,image/jpeg,image/webp,image/gif" required className="sr-only" />
                                </label>
                                <button type="submit" form="school-logo-upload" className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white">Upload</button>
                            </div>
                            <div className="grid gap-4">
                                <LightField label="School Name" name="name" defaultValue={value('name')} error={errors.name?.[0]} />
                                <LightField label="Website" name="website" type="url" placeholder="https://school.edu" defaultValue={value('website', profile.website || '')} error={errors.website?.[0]} />
                                <LightTextarea label="Public location" name="location" defaultValue={value('location')} error={errors.location?.[0]} />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-black text-slate-950">Campus Details</h2>
                        <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 md:grid-cols-2">
                            <div className="md:col-span-2">
                                <LightField label="Street Address" name="address" defaultValue={value('address', profile.address || '')} error={errors.address?.[0]} />
                            </div>
                            <LightField label="City" name="city" defaultValue={value('city', profile.city || '')} error={errors.city?.[0]} />
                            <LightField label="State / Province" name="state" defaultValue={value('state', profile.state || '')} error={errors.state?.[0]} />
                            <LightField label="Country" name="country" defaultValue={value('country', profile.country || '')} error={errors.country?.[0]} />
                            <LightField label="Grade Range" name="grade_range" defaultValue={value('grade_range', profile.gradeRange || '')} error={errors.grade_range?.[0]} />
                            <LightField label="Student Count" name="student_count" type="number" min="0" defaultValue={value('student_count', profile.studentCount || '')} error={errors.student_count?.[0]} />
                            <div className="md:col-span-2">
                                <LightTextarea label="Visit Notes" name="visit_notes" defaultValue={value('visit_notes', profile.visitNotes || '')} error={errors.visit_notes?.[0]} />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-black text-slate-950">Contact Details</h2>
                        <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 md:grid-cols-2">
                            <div className="md:col-span-2">
                                <LightField label="Primary Coordinator Name" name="coordinator_name" defaultValue={value('coordinator_name', profile.coordinatorName || '')} error={errors.coordinator_name?.[0]} />
                            </div>
                            <LightField label="Email Address" name="coordinator_email" type="email" defaultValue={value('coordinator_email', profile.coordinatorEmail || '')} error={errors.coordinator_email?.[0]} />
                            <LightField label="Phone Number" name="coordinator_phone" defaultValue={value('coordinator_phone', profile.coordinatorPhone || '')} error={errors.coordinator_phone?.[0]} />
                            <LightField label="Principal Name" name="principal_name" defaultValue={value('principal_name', profile.principalName || '')} error={errors.principal_name?.[0]} />
                            <LightField label="Counselor Name" name="counselor_name" defaultValue={value('counselor_name', profile.counselorName || '')} error={errors.counselor_name?.[0]} />
                            <div className="md:col-span-2">
                                <LightField label="Counselor Email" name="counselor_email" type="email" defaultValue={value('counselor_email', profile.counselorEmail || '')} error={errors.counselor_email?.[0]} />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">Save Changes</button>
                    </div>
                </section>

                <aside className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-black text-slate-950">Preferences</h2>
                    <div className="mt-5 space-y-5">
                        <SettingToggle
                            name="email_notifications"
                            title="Email Notifications"
                            description="Receive request and visit updates via email."
                            defaultChecked={boolValue('email_notifications', true)}
                        />
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                            <div className="flex gap-2">
                                <Sparkles size={17} className="mt-0.5 shrink-0 text-emerald-600" />
                                <p className="text-xs font-semibold leading-5 text-emerald-800">Email preferences are saved with this school profile.</p>
                            </div>
                        </div>
                    </div>
                </aside>
            </form>
            <form id="school-logo-upload" action="/school/branding/logo" method="POST" encType="multipart/form-data" className="hidden"><input type="hidden" name="_token" value={csrf} /></form>
        </div>
    );
}

function SecurityAccessSection({ csrf, profile = {}, errors = {}, role = 'user' }) {
    const sessions = profile.sessions || [];
    const user = profile.user || {};
    const score = Number(profile.securityScore || 0);
    const scoreTone = score >= 85 ? 'emerald' : score >= 65 ? 'blue' : 'amber';

    return (
        <div className="grid gap-4 md:gap-6">
            <section>
                <h1 className="text-2xl font-black text-slate-950 md:text-3xl">Settings</h1>
                <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-slate-500 md:mt-2">Manage authentication, recovery settings, and database-backed sessions for {user.email || 'this account'}.</p>
            </section>

            <section className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-4">
                <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:p-5">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">Security score</p>
                    <p className="mt-2 text-2xl font-black text-slate-950 md:mt-3 md:text-4xl">{score}/100</p>
                    <div className="mt-3 h-1.5 rounded-full bg-slate-100 md:mt-4 md:h-2"><div className={cx('h-full rounded-full', scoreTone === 'emerald' ? 'bg-emerald-500' : scoreTone === 'amber' ? 'bg-amber-500' : 'bg-blue-600')} style={{ width: `${Math.min(100, score)}%` }} /></div>
                </article>
                <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:p-5">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">Active sessions</p>
                    <p className="mt-2 text-2xl font-black text-slate-950 md:mt-3 md:text-4xl">{profile.sessionCount || sessions.length}</p>
                    <p className="mt-2 text-xs font-bold text-slate-500">Stored in the sessions table</p>
                </article>
                <article className="col-span-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:col-span-1 md:p-5">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">Account role</p>
                    <p className="mt-2 text-xl font-black capitalize text-slate-950 md:mt-3 md:text-2xl">{String(user.role || role).replace('_', ' ')}</p>
                    <p className={cx('mt-2 text-xs font-bold', user.emailVerified ? 'text-emerald-700' : 'text-amber-700')}>{user.emailVerified ? 'Email verified' : 'Email not verified'}</p>
                </article>
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.25fr_0.85fr] md:gap-6">
                <div className="space-y-4 md:space-y-6">
                    <form action="/dashboard/security/password" method="POST" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
                        <input type="hidden" name="_token" value={csrf} />
                        <div className="flex items-center gap-3">
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e5eeff] text-blue-700"><ShieldCheck size={20} /></span>
                            <div>
                                <h2 className="text-lg font-black text-slate-950 md:text-xl">Password Management</h2>
                                <p className="mt-1 text-sm text-slate-500">Require at least 12 characters, mixed case, numbers, and symbols.</p>
                            </div>
                        </div>
                        <div className="mt-4 grid gap-3 md:mt-5 md:gap-4">
                            <LightField label="Current Password" name="current_password" type="password" autoComplete="current-password" error={errors.current_password?.[0]} />
                            <div className="grid gap-4 md:grid-cols-2">
                                <LightField label="New Password" name="password" type="password" autoComplete="new-password" placeholder="Minimum 12 chars" error={errors.password?.[0]} />
                                <LightField label="Confirm New Password" name="password_confirmation" type="password" autoComplete="new-password" placeholder="Match new password" />
                            </div>
                            <div className="rounded-lg bg-slate-50 p-4 text-sm font-semibold text-slate-600">Last account update: {profile.passwordUpdatedAt || 'Not available'}</div>
                        </div>
                        <div className="mt-4 flex justify-end md:mt-5">
                            <button className="w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 md:w-auto">Update Password</button>
                        </div>
                    </form>

                    <form action="/dashboard/security/preferences" method="POST" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
                        <input type="hidden" name="_token" value={csrf} />
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><CheckCircle2 size={20} /></span>
                                <div>
                                    <h2 className="text-lg font-black text-slate-950 md:text-xl">Two-Factor Authentication</h2>
                                    <p className="mt-1 text-sm text-slate-500">When enabled, every sign-in requires an expiring one-time code delivered to the account email address.</p>
                                </div>
                            </div>
                            <span className={cx('rounded-full px-3 py-1 text-xs font-black', profile.twoFactorEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>{profile.twoFactorEnabled ? 'Enabled' : 'Not enabled'}</span>
                        </div>
                        <div className="mt-6 space-y-5">
                            <SettingToggle name="two_factor_enabled" title="Require two-factor verification" description="Require an emailed one-time code after the password is accepted." defaultChecked={!!profile.twoFactorEnabled} />
                            <SettingToggle name="security_alerts" title="Security alerts" description="Queue security notifications after sensitive account changes." defaultChecked={profile.securityAlerts !== false} />
                            <LightField label="Recovery Email" name="recovery_email" type="email" defaultValue={profile.recoveryEmail || ''} placeholder={user.email || 'recovery@example.com'} error={errors.recovery_email?.[0]} />
                        </div>
                        <div className="mt-5 flex justify-end">
                            <button className="w-full rounded-xl bg-[#006a61] px-5 py-3 text-sm font-black text-white hover:opacity-90 md:w-auto">Save Security Preferences</button>
                        </div>
                    </form>
                </div>

                <aside className="space-y-4 md:space-y-6">
                    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4 md:p-5">
                            <div>
                                <h2 className="text-lg font-black text-slate-950">Active Sessions</h2>
                                <p className="mt-1 text-xs font-semibold text-slate-500">Database session records for this account.</p>
                            </div>
                            <form action="/dashboard/security/sessions" method="POST">
                                <input type="hidden" name="_token" value={csrf} />
                                <input type="hidden" name="_method" value="DELETE" />
                                <button className="rounded-lg border border-red-200 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-50">Log out all</button>
                            </form>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {sessions.length === 0 ? (
                                <p className="p-5 text-sm font-semibold text-slate-500">No active database sessions found.</p>
                            ) : sessions.map((session) => (
                                <article key={session.id} className="flex gap-3 p-4 md:gap-4 md:p-5">
                                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 md:h-11 md:w-11">
                                        {/iphone|android/i.test(session.device) ? <Smartphone size={20} /> : <Monitor size={20} />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="truncate text-sm font-black text-slate-950">{session.device}</p>
                                            {session.isCurrent && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-700">Current</span>}
                                        </div>
                                        <p className="mt-1 text-xs font-semibold text-slate-500">{session.ip}</p>
                                        <p className="mt-1 text-xs text-slate-400">{session.lastActivity}</p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm md:p-5">
                        <div className="flex items-start gap-3">
                            <Sparkles size={20} className="mt-0.5 shrink-0 text-emerald-700" />
                            <div>
                                <p className="text-xs font-black uppercase tracking-wide text-emerald-800">Security Advisor</p>
                                <p className="mt-2 text-sm leading-6 text-emerald-900">{securityAdvisorText(profile)}</p>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                        <h2 className="text-lg font-black text-slate-950">Recent Security Notifications</h2>
                        <div className="mt-4 space-y-3">
                            {(profile.recentNotifications || []).length === 0 ? (
                                <p className="text-sm font-semibold text-slate-500">No security notifications yet.</p>
                            ) : profile.recentNotifications.map((notification) => (
                                <div key={`${notification.subject}-${notification.createdAt}`} className="rounded-lg bg-slate-50 p-3">
                                    <p className="text-sm font-black text-slate-800">{notification.subject}</p>
                                    <p className="mt-1 text-xs text-slate-500">{notification.createdAt} · {notification.status}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </aside>
            </section>
        </div>
    );
}

function securityAdvisorText(profile) {
    if (!profile.twoFactorEnabled) {
        return 'Enable two-factor verification to raise this account security score and reduce credential risk.';
    }
    if ((profile.sessionCount || 0) > 2) {
        return 'Multiple active sessions are present. Revoke older sessions if any device is no longer in use.';
    }
    if (!profile.recoveryEmail) {
        return 'Add a recovery email so account recovery can be handled without administrator intervention.';
    }
    return `Your account security is rated ${profile.securityScore || 0}/100 based on password posture, 2FA, alerts, recovery email, and active sessions.`;
}

function SettingToggle({ name, title, description, defaultChecked, disabled = false }) {
    return (
        <label className={cx('flex items-center justify-between gap-4', disabled && 'cursor-not-allowed opacity-60')}>
            <span>
                <span className="block text-sm font-black text-slate-800">{title}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
            </span>
            <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
                <input type="hidden" name={name} value={disabled && defaultChecked ? '1' : '0'} />
                <input type="checkbox" name={name} value="1" defaultChecked={defaultChecked} disabled={disabled} className="peer sr-only" />
                <span className="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-blue-600" />
                <span className="absolute left-1 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
            </span>
        </label>
    );
}

function RegistrationTable({ registrations }) {
    return (
        <DataPanel
            title="My bookings"
            description="Confirmed and waitlisted campus visit registrations."
            columns={['Name', 'Event', 'Seats', 'Status']}
            rows={registrations.map((registration) => [registration.name, registration.event, registration.partySize, registration.status])}
            empty="No registrations yet."
        />
    );
}

function UniversityAttendeesSection({ csrf, registrations = [], events = [] }) {
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('all');
    const [program, setProgram] = useState('all');
    const [interest, setInterest] = useState('all');
    const [selected, setSelected] = useState([]);
    const [editing, setEditing] = useState(null);
    const [profile, setProfile] = useState(null);
    const [messageOpen, setMessageOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [bulkAction, setBulkAction] = useState('check_in');
    const [page, setPage] = useState(1);
    const perPage = 10;
    const programs = [...new Set(registrations.map((item) => item.event).filter(Boolean))].sort();
    const interests = [...new Set(registrations.map((item) => item.interest).filter(Boolean))].sort();
    const filtered = registrations.filter((item) => {
        const studentText = (item.students || []).map((student) => `${student.name} ${student.email} ${student.grade} ${student.interest}`).join(' ');
        const haystack = `${item.name} ${item.email} ${item.school} ${item.schoolLocation} ${item.event} ${item.interest} ${studentText}`.toLowerCase();
        return haystack.includes(query.toLowerCase())
            && (status === 'all' || item.status === status)
            && (program === 'all' || item.event === program)
            && (interest === 'all' || item.interest === interest);
    });
    const schoolGroups = attendeeSchoolGroups(filtered);
    const pages = Math.max(1, Math.ceil(schoolGroups.length / perPage));
    const visibleGroups = schoolGroups.slice((page - 1) * perPage, page * perPage);
    const visible = visibleGroups.flatMap((group) => group.registrations);
    const selectedVisible = visible.length > 0 && visible.every((item) => selected.includes(item.id));
    const totalSeats = filtered.reduce((sum, item) => sum + Number(item.partySize || 0), 0);
    const confirmedSeats = filtered.filter((item) => item.status === 'confirmed').reduce((sum, item) => sum + Number(item.partySize || 0), 0);
    const attendedSeats = filtered.filter((item) => item.attended).reduce((sum, item) => sum + Number(item.partySize || 0), 0);
    const checkedInSeats = filtered.filter((item) => item.checkedIn).reduce((sum, item) => sum + Number(item.partySize || 0), 0);
    const waitlistedSeats = filtered.filter((item) => item.status === 'waitlisted').reduce((sum, item) => sum + Number(item.partySize || 0), 0);
    const consentPending = filtered.filter((item) => item.isMinor && item.consentStatus !== 'received' && item.consentStatus !== 'not_required').length;
    const topInterest = topByCount(filtered.map((item) => item.interest).filter(Boolean)) || 'Mixed interests';

    useEffect(() => {
        setPage(1);
        setSelected((current) => current.filter((id) => filtered.some((item) => item.id === id)));
    }, [query, status, program, interest, registrations]);

    const toggleOne = (id) => {
        setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    };
    const toggleVisible = () => {
        setSelected((current) => selectedVisible
            ? current.filter((id) => !visible.some((item) => item.id === id))
            : [...new Set([...current, ...visible.map((item) => item.id)])]);
    };
    const exportCsv = () => {
        const event = events.find((item) => item.title === program || String(item.id) === String(program));
        const params = event ? `?campus_event_id=${encodeURIComponent(event.id)}` : '';
        window.location.href = `/dashboard/university/attendees/export${params}`;
    };

    return (
        <div className="grid gap-4 md:gap-5">
            <section className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">Attendees</h1>
                    <p className="mt-1 text-sm font-semibold text-slate-500">Review and manage registered students and school groups for upcoming visits.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                    <button type="button" onClick={() => setImportOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 md:px-4 md:py-2.5 md:text-sm"><Upload size={15} /> Import</button>
                    <button type="button" onClick={exportCsv} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#006a61]/30 bg-white px-3 py-2 text-xs font-black text-[#006a61] md:px-4 md:py-2.5 md:text-sm"><Download size={15} /> Export</button>
                    <button type="button" onClick={() => setMessageOpen(true)} disabled={selected.length === 0} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300 md:px-4 md:py-2.5 md:text-sm"><MailCheck size={15} /> Message</button>
                </div>
            </section>

            <section className="grid gap-3 lg:grid-cols-[1.7fr_1fr] md:gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:p-5">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">Quick Filters</p>
                    <div className="mt-3 grid gap-2 md:mt-4 md:grid-cols-2 md:gap-3 xl:grid-cols-4">
                        <div className="relative md:col-span-2 xl:col-span-1">
                            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                            <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-semibold outline-none focus:border-[#006a61] focus:ring-4 focus:ring-emerald-50 md:h-11" placeholder="Search attendees, schools..." />
                        </div>
                        <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold md:h-11">
                            <option value="all">All Statuses</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="waitlisted">Waitlisted</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                        <select value={program} onChange={(event) => setProgram(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold md:h-11">
                            <option value="all">All Programs</option>
                            {programs.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                        <select value={interest} onChange={(event) => setInterest(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold md:h-11">
                            <option value="all">All Interests</option>
                            {interests.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 md:mt-4 md:gap-3">
                        <MiniStat label="Filtered seats" value={totalSeats.toLocaleString()} />
                        <MiniStat label="Checked in" value={checkedInSeats.toLocaleString()} />
                        <MiniStat label="Consent pending" value={consentPending.toLocaleString()} />
                    </div>
                    {selected.length > 0 && (
                        <form action="/dashboard/university/attendees/bulk" method="POST" className="mt-3 flex flex-col gap-2 rounded-xl border border-[#006a61]/20 bg-emerald-50 p-3 sm:flex-row sm:items-center">
                            <input type="hidden" name="_token" value={csrf} />
                            {selected.map((id) => <input key={id} type="hidden" name="registration_ids[]" value={id} />)}
                            <p className="text-xs font-black text-[#006a61] sm:flex-1">{selected.length} selected</p>
                            <select name="action" value={bulkAction} onChange={(event) => setBulkAction(event.target.value)} className="h-10 rounded-xl border border-emerald-200 bg-white px-3 text-sm font-black text-slate-700">
                                <option value="check_in">Check in</option>
                                <option value="check_out">Check out</option>
                                <option value="consent_received">Mark consent received</option>
                                <option value="confirm">Move to confirmed</option>
                                <option value="waitlist">Move to waitlist</option>
                                <option value="cancel">Cancel</option>
                            </select>
                            <button className="rounded-xl bg-[#006a61] px-4 py-2.5 text-sm font-black text-white">Apply Bulk Action</button>
                        </form>
                    )}
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm md:p-5">
                    <div className="flex items-center gap-2">
                        <Sparkles size={18} className="text-emerald-700" />
                        <p className="text-xs font-black uppercase tracking-wide text-emerald-800">Roster Insight</p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-emerald-900">Highest attendee concentration is <span className="font-black">{topInterest}</span>. Use this to plan faculty coverage, lab guides, and follow-up messaging.</p>
                    <p className="mt-2 text-xs font-bold text-emerald-800">{waitlistedSeats.toLocaleString()} waitlisted seat(s) visible for promotion tracking. Attendance marked: {Math.round((attendedSeats / Math.max(1, confirmedSeats)) * 100)}%.</p>
                    <button type="button" onClick={() => setProgram('all')} className="mt-4 inline-flex items-center gap-2 text-sm font-black text-emerald-800">Review full roster <ArrowRight size={15} /></button>
                </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="grid gap-2 p-3 md:hidden">
                    {visibleGroups.map((group) => (
                        <article key={group.key} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-black text-slate-950">{group.school}</p>
                                    <p className="mt-1 text-[11px] font-semibold text-slate-500">{group.registrations.length} booking record(s) • {group.seats} seat(s) • {group.studentCount} student profile(s)</p>
                                </div>
                                <span className="rounded-full bg-[#e5eeff] px-2.5 py-1 text-[10px] font-black text-[#0b1c30]">{group.confirmedSeats} confirmed</span>
                            </div>
                            <div className="mt-3 space-y-2">
                                {group.registrations.map((item) => (
                                    <details key={item.id} className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                                        <summary className="cursor-pointer list-none">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="min-w-0">
                                                    <span className="block truncate text-[12px] font-black text-slate-800">{item.event || 'Program TBA'}</span>
                                                    <span className="block truncate text-[11px] font-semibold text-slate-500">{item.name} • {item.partySize} seat(s)</span>
                                                </span>
                                                <AttendeeStatusBadge status={item.status} attended={item.attended} />
                                            </div>
                                        </summary>
                                        <AttendeeRosterList registration={item} onProfile={setProfile} />
                                        <div className="mt-2 flex gap-2">
                                            <button type="button" onClick={() => setProfile(item)} className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-black text-slate-700">Group Profile</button>
                                            <button type="button" onClick={() => setEditing(item)} className="flex-1 rounded-lg bg-slate-950 px-3 py-2 text-[12px] font-black text-white">Edit</button>
                                        </div>
                                    </details>
                                ))}
                            </div>
                        </article>
                    ))}
                    {visibleGroups.length === 0 && <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm font-semibold text-slate-500">No attendees match the current filters.</div>}
                </div>
                <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[980px] text-left">
                        <thead className="border-b border-slate-200 bg-slate-50">
                            <tr>
                                <th className="w-12 px-5 py-4"><input type="checkbox" checked={selectedVisible} onChange={toggleVisible} className="rounded border-slate-300 text-blue-600" /></th>
                                <th className="px-5 py-4 text-[11px] font-black uppercase tracking-wide text-slate-500">Student / Group</th>
                                <th className="px-5 py-4 text-[11px] font-black uppercase tracking-wide text-slate-500">School / Location</th>
                                <th className="px-5 py-4 text-[11px] font-black uppercase tracking-wide text-slate-500">Interest Area</th>
                                <th className="px-5 py-4 text-[11px] font-black uppercase tracking-wide text-slate-500">Visit Program</th>
                                <th className="px-5 py-4 text-center text-[11px] font-black uppercase tracking-wide text-slate-500">Status</th>
                                <th className="px-5 py-4 text-right text-[11px] font-black uppercase tracking-wide text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {visibleGroups.map((group) => (
                                <React.Fragment key={group.key}>
                                    <tr className="bg-slate-100/80">
                                        <td colSpan="7" className="px-5 py-3">
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <p className="text-sm font-black text-slate-950">{group.school}</p>
                                                    <p className="mt-0.5 text-xs font-semibold text-slate-500">{group.location || 'Location TBA'} • {group.registrations.length} booking(s) • {group.studentCount} individual student profile(s)</p>
                                                </div>
                                                <div className="flex gap-2 text-xs font-black">
                                                    <span className="rounded-full bg-white px-3 py-1 text-slate-700">{group.seats} seats</span>
                                                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{group.confirmedSeats} confirmed</span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                    {group.registrations.map((item) => (
                                        <React.Fragment key={item.id}>
                                            <tr className="group hover:bg-slate-50">
                                                <td className="px-5 py-4"><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggleOne(item.id)} className="rounded border-slate-300 text-blue-600" /></td>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-black text-blue-800">{initials(item.name)}</span>
                                                        <span className="min-w-0">
                                                            <span className="block truncate text-sm font-black text-slate-950">{item.name}</span>
                                                            <span className="mt-1 block truncate text-xs text-slate-500">{item.email}</span>
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <p className="text-sm font-semibold text-slate-800">{item.school || 'Direct student'}</p>
                                                    <p className="mt-1 text-xs text-slate-500">{item.schoolLocation || item.eventLocation || 'Location TBA'}</p>
                                                </td>
                                                <td className="px-5 py-4"><span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{item.interest || 'Mixed interests'}</span></td>
                                                <td className="px-5 py-4">
                                                    <p className="text-sm font-semibold text-slate-800">{item.event || 'Program TBA'}</p>
                                                    <p className="mt-1 text-xs text-slate-500">{formatDateTime(item.eventDate)} · {item.partySize} seat{Number(item.partySize) === 1 ? '' : 's'}</p>
                                                </td>
                                                <td className="px-5 py-4 text-center"><AttendeeStatusBadge status={item.status} attended={item.attended} /></td>
                                                <td className="px-5 py-4">
                                                    <div className="flex justify-end gap-2">
                                                        <button type="button" onClick={() => setProfile(item)} title="View group profile" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"><UsersRound size={16} /></button>
                                                        <form action={`/dashboard/university/attendees/${item.id}/${item.checkedIn ? 'check-out' : 'check-in'}`} method="POST">
                                                            <input type="hidden" name="_token" value={csrf} />
                                                            <button title={item.checkedIn ? 'Check out group' : 'Check in group'} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:border-[#006a61]/30 hover:bg-emerald-50 hover:text-[#006a61]">{item.checkedIn ? <Clock size={16} /> : <CheckCircle2 size={16} />}</button>
                                                        </form>
                                                        <button type="button" onClick={() => setEditing(item)} title="Edit group booking" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"><Edit3 size={16} /></button>
                                                        <form action={`/dashboard/university/attendees/${item.id}`} method="POST">
                                                            <input type="hidden" name="_token" value={csrf} />
                                                            <input type="hidden" name="_method" value="DELETE" />
                                                            <button title="Remove group booking" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"><Trash2 size={16} /></button>
                                                        </form>
                                                    </div>
                                                </td>
                                            </tr>
                                            {(item.students || []).length > 0 && (
                                                <tr>
                                                    <td />
                                                    <td colSpan="6" className="px-5 pb-4">
                                                        <AttendeeRosterList registration={item} onProfile={setProfile} compact />
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </React.Fragment>
                            ))}
                            {visibleGroups.length === 0 && (
                                <tr><td colSpan="7" className="px-5 py-12 text-center text-sm font-semibold text-slate-500">No attendees match the current filters.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between md:px-5 md:py-4">
                    <p className="text-sm text-slate-500">Showing {visible.length ? (page - 1) * perPage + 1 : 0} to {Math.min(page * perPage, filtered.length)} of {filtered.length} attendees</p>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-600 disabled:opacity-40">Prev</button>
                        <span className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-black text-white">{page}</span>
                        <button type="button" onClick={() => setPage(Math.min(pages, page + 1))} disabled={page === pages} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-600 disabled:opacity-40">Next</button>
                    </div>
                </div>
            </section>

            {editing && (
                <StudentModal title="Edit Attendee" onClose={() => setEditing(null)}>
                    <form action={`/dashboard/university/attendees/${editing.id}`} method="POST" className="space-y-4">
                        <input type="hidden" name="_token" value={csrf} />
                        <input type="hidden" name="_method" value="PUT" />
                        <LightField label="Name" name="registrant_name" defaultValue={editing.name || ''} />
                        <LightField label="Email" name="registrant_email" type="email" defaultValue={editing.email || ''} />
                        <div className="grid gap-4 md:grid-cols-2">
                            <label className="block">
                                <span className="text-xs font-black uppercase tracking-wide text-slate-500">Type</span>
                                <select name="registrant_type" defaultValue={editing.type || 'student'} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold">
                                    <option value="student">Student</option>
                                    <option value="school_group">School Group</option>
                                </select>
                            </label>
                            <LightField label="Seats" name="party_size" type="number" min="1" defaultValue={editing.partySize || 1} />
                            <label className="block">
                                <span className="text-xs font-black uppercase tracking-wide text-slate-500">Status</span>
                                <select name="status" defaultValue={editing.status || 'confirmed'} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold">
                                    <option value="confirmed">Confirmed</option>
                                    <option value="waitlisted">Waitlisted</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </label>
                            <label className="flex items-center gap-3 pt-7 text-sm font-black text-slate-700">
                                <input type="checkbox" name="attended" value="1" defaultChecked={editing.attended} className="rounded border-slate-300 text-blue-600" />
                                Mark attended
                            </label>
                            <label className="flex items-center gap-3 text-sm font-black text-slate-700 md:col-span-2">
                                <input type="checkbox" name="checked_in" value="1" defaultChecked={editing.checkedIn} className="rounded border-slate-300 text-blue-600" />
                                Checked in
                            </label>
                            <label className="flex items-center gap-3 text-sm font-black text-slate-700 md:col-span-2">
                                <input type="checkbox" name="checked_out" value="1" defaultChecked={editing.checkedOut} className="rounded border-slate-300 text-blue-600" />
                                Checked out
                            </label>
                            <label className="flex items-center gap-3 text-sm font-black text-slate-700 md:col-span-2">
                                <input type="checkbox" name="is_minor" value="1" defaultChecked={editing.isMinor} className="rounded border-slate-300 text-blue-600" />
                                Minor attendee / student group requires guardian handling
                            </label>
                            <label className="block">
                                <span className="text-xs font-black uppercase tracking-wide text-slate-500">Consent</span>
                                <select name="consent_status" defaultValue={editing.consentStatus || 'not_required'} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold">
                                    <option value="not_required">Not required</option>
                                    <option value="pending">Pending</option>
                                    <option value="received">Received</option>
                                    <option value="expired">Expired</option>
                                </select>
                            </label>
                            <LightField label="Guardian name" name="guardian_name" defaultValue={editing.guardianName || ''} />
                            <LightField label="Guardian email" name="guardian_email" type="email" defaultValue={editing.guardianEmail || ''} />
                            <LightField label="Guardian phone" name="guardian_phone" defaultValue={editing.guardianPhone || ''} />
                            <LightField label="Emergency contact" name="emergency_contact_name" defaultValue={editing.emergencyContactName || ''} />
                            <LightField label="Emergency phone" name="emergency_contact_phone" defaultValue={editing.emergencyContactPhone || ''} />
                            <div className="md:col-span-2">
                                <LightTextarea label="Medical / access notes" name="medical_notes" defaultValue={editing.medicalNotes || ''} placeholder="Allergies, accessibility, medication, or support notes..." />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-black text-slate-600">Cancel</button>
                            <button className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white">Save Changes</button>
                        </div>
                    </form>
                </StudentModal>
            )}

            {profile && (
                <StudentModal title="Attendee Profile" onClose={() => setProfile(null)}>
                    <div className="space-y-4">
                        <div className="rounded-2xl bg-slate-950 p-5 text-white">
                            <div className="flex items-start gap-3">
                                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-sm font-black">{initials(profile.name)}</span>
                                <div className="min-w-0">
                                    <h3 className="truncate text-xl font-black">{profile.name}</h3>
                                    <p className="mt-1 text-sm text-white/60">{profile.isStudentProfile ? `${profile.school || profile.parentName || 'School group'} student` : profile.email}</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <AttendeeStatusBadge status={profile.status} attended={profile.attended} />
                                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black">{profile.partySize} seat{Number(profile.partySize) === 1 ? '' : 's'}</span>
                                        {profile.isStudentProfile && <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black">{profile.grade || 'Grade N/A'}</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                            <ProfileFact label="Program" value={profile.event || 'Program TBA'} />
                            <ProfileFact label="Program date" value={formatDateTime(profile.eventDate)} />
                            <ProfileFact label="School" value={profile.school || 'Direct student'} />
                            <ProfileFact label="Interest" value={profile.interest || 'Undeclared'} />
                            {profile.isStudentProfile && <ProfileFact label="Student ID" value={profile.studentIdentifier || 'Not provided'} />}
                            {profile.isStudentProfile && <ProfileFact label="Student email" value={profile.email || 'Not provided'} />}
                            <ProfileFact label="Check-in" value={profile.checkedInAt ? formatDateTime(profile.checkedInAt) : 'Not checked in'} />
                            <ProfileFact label="Check-out" value={profile.checkedOutAt ? formatDateTime(profile.checkedOutAt) : 'Not checked out'} />
                            <ProfileFact label="Consent" value={profile.consentStatus || 'not_required'} />
                            <ProfileFact label="Waitlist promotion" value={profile.waitlistPromotedAt ? formatDateTime(profile.waitlistPromotedAt) : 'Not promoted'} />
                            <ProfileFact label="Guardian" value={profile.guardianName || 'Not provided'} />
                            <ProfileFact label="Guardian contact" value={[profile.guardianEmail, profile.guardianPhone].filter(Boolean).join(' / ') || 'Not provided'} />
                            <ProfileFact label="Emergency contact" value={profile.emergencyContactName || 'Not provided'} />
                            <ProfileFact label="Emergency phone" value={profile.emergencyContactPhone || 'Not provided'} />
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Medical / access notes</p>
                            <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{profile.medicalNotes || 'No medical or access notes recorded.'}</p>
                        </div>
                        {!profile.isStudentProfile && <AttendeeRosterList registration={profile} onProfile={setProfile} />}
                        <div className="grid grid-cols-2 gap-2">
                            {!profile.isStudentProfile && <form action={`/dashboard/university/attendees/${profile.id}/${profile.checkedIn ? 'check-out' : 'check-in'}`} method="POST">
                                <input type="hidden" name="_token" value={csrf} />
                                <button className="w-full rounded-xl bg-[#006a61] px-4 py-3 text-sm font-black text-white">{profile.checkedIn ? 'Check Out' : 'Check In'}</button>
                            </form>}
                            {!profile.isStudentProfile && <button type="button" onClick={() => { setEditing(profile); setProfile(null); }} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700">Edit Group</button>}
                        </div>
                    </div>
                </StudentModal>
            )}

            {importOpen && (
                <StudentModal title="Import Attendees" onClose={() => setImportOpen(false)}>
                    <form action="/dashboard/university/attendees/import" method="POST" encType="multipart/form-data" className="space-y-4">
                        <input type="hidden" name="_token" value={csrf} />
                        <label className="block">
                            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Visit program</span>
                            <select name="campus_event_id" className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold" required>
                                {events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
                            </select>
                        </label>
                        <label className="block">
                            <span className="text-xs font-black uppercase tracking-wide text-slate-500">CSV file</span>
                            <input name="attendee_file" type="file" accept=".csv,text/csv" required className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-semibold" />
                        </label>
                        <div className="rounded-xl bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-600">
                            Supported group columns: name, email, type, party_size, status. Optional student columns: student_name, student_email, student_id, grade, interest, student_consent_status, guardian_name, guardian_email, emergency_contact_name, emergency_contact_phone, medical_notes. Capacity overflow is automatically waitlisted.
                        </div>
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => setImportOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-black text-slate-600">Cancel</button>
                            <button className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white">Import CSV</button>
                        </div>
                    </form>
                </StudentModal>
            )}

            {messageOpen && (
                <StudentModal title="Message Selected Attendees" onClose={() => setMessageOpen(false)}>
                    <form action="/dashboard/university/attendees/message" method="POST" className="space-y-4">
                        <input type="hidden" name="_token" value={csrf} />
                        {selected.map((id) => <input key={id} type="hidden" name="registration_ids[]" value={id} />)}
                        <p className="rounded-lg bg-blue-50 p-3 text-sm font-semibold text-blue-900">{selected.length} attendee record(s) selected.</p>
                        <label className="block">
                            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Channel</span>
                            <select name="channel" defaultValue="email" className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold">
                                <option value="email">Email</option>
                            </select>
                        </label>
                        <LightTextarea label="Message" name="content" placeholder="Type the update attendees should receive..." />
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => setMessageOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-black text-slate-600">Cancel</button>
                            <button className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white">Queue Message</button>
                        </div>
                    </form>
                </StudentModal>
            )}
        </div>
    );
}

function AttendeeStatusBadge({ status, attended }) {
    const styles = {
        confirmed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        waitlisted: 'border-amber-200 bg-amber-50 text-amber-700',
        cancelled: 'border-red-200 bg-red-50 text-red-700',
    };

    return (
        <span className={cx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black capitalize', styles[status] || 'border-slate-200 bg-slate-50 text-slate-600')}>
            <span className={cx('h-1.5 w-1.5 rounded-full', attended ? 'bg-blue-600' : status === 'confirmed' ? 'bg-emerald-500' : status === 'waitlisted' ? 'bg-amber-500' : 'bg-red-500')} />
            {attended ? 'Attended' : status}
        </span>
    );
}

function AttendeeRosterList({ registration, onProfile, compact = false }) {
    const students = registration.students || [];

    if (students.length === 0) {
        return (
            <div className={cx('rounded-lg border border-dashed border-slate-200 bg-white text-center text-xs font-semibold text-slate-500', compact ? 'p-3' : 'mt-3 p-4')}>
                No individual student roster has been attached yet. Import a roster CSV or book selected students from the school portal.
            </div>
        );
    }

    return (
        <div className={cx('grid gap-2', compact ? 'rounded-xl bg-white p-3' : 'mt-3')}>
            <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Individual students</p>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">{students.length} visible</span>
            </div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {students.map((student) => {
                    const profile = {
                        ...student,
                        isStudentProfile: true,
                        parentName: registration.name,
                        parentEmail: registration.email,
                        school: registration.school,
                        schoolLocation: registration.schoolLocation,
                        event: registration.event,
                        eventDate: registration.eventDate,
                        partySize: 1,
                        attended: student.checkedIn,
                        waitlistPromotedAt: registration.waitlistPromotedAt,
                    };

                    return (
                        <button key={student.id || student.email || student.name} type="button" onClick={() => onProfile(profile)} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-2 text-left hover:border-[#006a61]/30 hover:bg-emerald-50/40">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#e5eeff] text-[10px] font-black text-[#0b1c30]">{initials(student.name)}</span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-xs font-black text-slate-900">{student.name}</span>
                                <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-500">{student.grade || 'Grade N/A'} • {student.interest || 'Interest N/A'}</span>
                                <span className="mt-1 flex flex-wrap gap-1">
                                    <span className={cx('rounded-full px-2 py-0.5 text-[9px] font-black uppercase', student.consentStatus === 'received' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>{student.consentStatus || 'not_required'}</span>
                                    <span className={cx('rounded-full px-2 py-0.5 text-[9px] font-black uppercase', student.checkedIn ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500')}>{student.checkedIn ? 'Checked in' : 'Not in'}</span>
                                </span>
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function ProfileFact({ label, value }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-2 break-words text-sm font-black text-slate-800">{value || 'Not provided'}</p>
        </div>
    );
}

function attendeeSchoolGroups(items = []) {
    const grouped = items.reduce((groups, item) => {
        const school = item.school || item.name || 'Direct students';
        const key = school.toLowerCase();
        if (!groups[key]) {
            groups[key] = {
                key,
                school,
                location: item.schoolLocation || item.eventLocation || '',
                registrations: [],
                seats: 0,
                confirmedSeats: 0,
                studentCount: 0,
            };
        }

        groups[key].registrations.push(item);
        groups[key].seats += Number(item.partySize || 0);
        groups[key].confirmedSeats += item.status === 'confirmed' ? Number(item.partySize || 0) : 0;
        groups[key].studentCount += (item.students || []).length;

        return groups;
    }, {});

    return Object.values(grouped).sort((left, right) => right.seats - left.seats || left.school.localeCompare(right.school));
}

function topByCount(values) {
    const counts = values.reduce((map, value) => map.set(value, (map.get(value) || 0) + 1), new globalThis.Map());
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function StudentCalendarSection({ registrations }) {
    return (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {registrations.length === 0 ? (
                <p className="rounded-xl border border-gray-200 bg-white px-5 py-10 text-center text-sm font-medium text-gray-500 md:col-span-2 xl:col-span-3">No scheduled visits yet.</p>
            ) : registrations.map((registration) => (
                <article key={registration.id || `${registration.event}-${registration.name}`} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Upcoming visit</p>
                    <h3 className="mt-2 text-lg font-semibold text-gray-950">{registration.event}</h3>
                    <p className="mt-2 text-sm text-gray-500">Status: {registration.status}</p>
                    <p className="mt-1 text-sm text-gray-500">Seats: {registration.partySize}</p>
                </article>
            ))}
        </section>
    );
}

function StudentNotificationsSection({ registrations = [], messages = [] }) {
    const messageNotifications = messages.slice(0, 8).map((message) => ({
        id: `message-${message.id}`,
        title: message.subject || titleCase(message.notificationType || message.type || 'Visit update'),
        body: message.body || message.content || 'You have a new campus visit update.',
        status: message.status,
        time: message.createdAt || message.created_at || message.scheduledFor,
        category: message.notificationType?.includes('reminder') ? 'visits' : 'messages',
        channel: message.channel || message.type || 'email',
    }));
    const visitNotifications = registrations.slice(0, 8).map((registration) => ({
        id: `registration-${registration.id || `${registration.event}-${registration.status}`}`,
        title: registration.status === 'waitlisted' ? 'Waitlist update' : 'Visit status update',
        body: `${registration.event} is currently ${registration.status}.`,
        status: registration.status,
        time: registration.createdAt || registration.date,
        category: 'visits',
        channel: 'system',
    }));
    const notifications = [...messageNotifications, ...visitNotifications]
        .filter((notification, index, rows) => rows.findIndex((row) => row.id === notification.id) === index)
        .sort((left, right) => new Date(right.time || 0) - new Date(left.time || 0));
    const [filter, setFilter] = useState('all');
    const [readIds, setReadIds] = useState([]);
    const filtered = filter === 'all' ? notifications : notifications.filter((notification) => notification.category === filter);
    const unreadCount = filtered.filter((notification) => !readIds.includes(notification.id)).length;
    const grouped = groupNotificationsByDay(filtered);
    const categories = [
        ['all', 'All', Inbox, notifications.length],
        ['visits', 'Visits', CalendarDays, notifications.filter((notification) => notification.category === 'visits').length],
        ['messages', 'Messages', MailCheck, notifications.filter((notification) => notification.category === 'messages').length],
        ['system', 'System', Bell, notifications.filter((notification) => notification.category === 'system').length],
    ];

    return (
        <section className="grid gap-4">
            <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-end md:justify-between md:p-6">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#006a61]">Student alerts</p>
                    <h1 className="mt-1 text-2xl font-black text-slate-950">Notifications</h1>
                    <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">Visit reminders, schedule updates, and platform messages tied to your account.</p>
                </div>
                <button type="button" onClick={() => setReadIds(notifications.map((notification) => notification.id))} disabled={notifications.length === 0 || unreadCount === 0} className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">
                    {unreadCount === 0 ? 'All read' : 'Mark all as read'}
                </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-24">
                    <p className="px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">Categories</p>
                    <div className="grid gap-1">
                        {categories.map(([id, label, Icon, count]) => (
                            <button key={id} type="button" onClick={() => setFilter(id)} className={cx('flex items-center justify-between rounded-2xl px-3 py-3 text-sm font-black transition', filter === id ? 'bg-[#e5eeff] text-[#006a61]' : 'text-slate-600 hover:bg-slate-50')}>
                                <span className="inline-flex items-center gap-2"><Icon size={17} /> {label}</span>
                                <span className={cx('rounded-full px-2 py-0.5 text-[10px] font-black', filter === id ? 'bg-[#006a61] text-white' : 'bg-slate-100 text-slate-500')}>{count}</span>
                            </button>
                        ))}
                    </div>
                    <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">Summary</p>
                        <p className="mt-1 text-sm font-semibold text-slate-600">{unreadCount} unread item(s) in this view.</p>
                    </div>
                </aside>

                <section className="grid gap-4">
                    {filtered.length === 0 ? (
                        <EmptyState title="No notifications yet" message="Visit reminders, confirmations, and schedule updates will appear here." />
                    ) : Object.entries(grouped).map(([group, rows]) => (
                        <div key={group} className="grid gap-2">
                            <h2 className="px-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">{group}</h2>
                            {rows.map((notification) => {
                                const read = readIds.includes(notification.id);
                                const Icon = notification.category === 'visits' ? CalendarDays : notification.category === 'messages' ? MailCheck : Bell;
                                return (
                                    <button key={notification.id} type="button" onClick={() => setReadIds((current) => current.includes(notification.id) ? current : [...current, notification.id])} className={cx('group w-full rounded-3xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:p-5', read ? 'border-slate-200 opacity-70' : notification.category === 'visits' ? 'border-l-4 border-l-[#006a61]' : 'border-l-4 border-l-blue-600')}>
                                        <div className="flex gap-3">
                                            <span className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-2xl', notification.category === 'visits' ? 'bg-[#e5eeff] text-[#006a61]' : notification.category === 'messages' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600')}><Icon size={18} /></span>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                                                    <h3 className="text-sm font-black text-slate-950 md:text-base">{notification.title}</h3>
                                                    <span className="shrink-0 text-xs font-bold text-slate-400">{formatRelativeTime(notification.time)}</span>
                                                </div>
                                                <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{notification.body}</p>
                                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-500">{notification.category}</span>
                                                    {notification.status && <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase text-slate-500 ring-1 ring-slate-200">{notification.status}</span>}
                                                    {!read && <span className="h-2 w-2 rounded-full bg-[#006a61]" />}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </section>
            </div>
        </section>
    );
}

function groupNotificationsByDay(notifications = []) {
    return notifications.reduce((groups, notification) => {
        const date = notification.time ? new Date(notification.time) : null;
        let label = 'Older';
        if (date && !Number.isNaN(date.getTime())) {
            const today = new Date();
            const yesterday = addDays(today, -1);
            if (isSameCalendarDay(date, today)) label = 'Today';
            else if (isSameCalendarDay(date, yesterday)) label = 'Yesterday';
            else label = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
        }
        return { ...groups, [label]: [...(groups[label] || []), notification] };
    }, {});
}

function normalizeCanonicalStudentVisit(record, bucket) {
    const event = record?.event || {};
    const checkedIn = Boolean(record?.checked_in_at);
    return {
        id: `${record?.participation_type || 'participation'}-${record?.participation_id || event.id || 'unknown'}`,
        participationId: record?.participation_id,
        eventId: event.id,
        title: event.title || 'Campus visit',
        description: event.description || '',
        starts_at: event.starts_at || null,
        ends_at: event.ends_at || null,
        date: event.starts_at || null,
        location: event.location || null,
        venue: event.venue || null,
        university: event.university?.name || event.university_name || null,
        capacity: Number(event.capacity || 0),
        eventStatus: event.status || null,
        status: checkedIn ? 'attended' : (record?.status || 'confirmed'),
        checked_in_at: record?.checked_in_at || null,
        checked_out_at: record?.checked_out_at || null,
        participationType: record?.participation_type || null,
        school_group: record?.participation_type === 'school_assignment' ? 'School assignment' : null,
        bucket,
        itinerary: (record?.itinerary || []).map((item) => ({
            ...item,
            start_time: item.starts_at || null,
            end_time: item.ends_at || null,
        })),
    };
}

function isUpcomingStudentVisit(visit) {
    if (!visit || ['cancelled', 'declined', 'rejected', 'attended'].includes(visit.status) || visit.eventStatus === 'cancelled') return false;
    const boundary = new Date(visit.ends_at || visit.starts_at || visit.date || '').getTime();
    return Number.isFinite(boundary) && boundary >= Date.now();
}

async function loadCanonicalStudentVisits() {
    const [upcomingPayload, historyPayload] = await Promise.all([
        apiRequest('/api/v1/student/visits/upcoming'),
        apiRequest('/api/v1/student/visits/history'),
    ]);
    const upcoming = (Array.isArray(upcomingPayload?.data) ? upcomingPayload.data : [])
        .map((record) => normalizeCanonicalStudentVisit(record, 'upcoming'))
        .filter(isUpcomingStudentVisit)
        .sort((left, right) => new Date(left.starts_at) - new Date(right.starts_at));
    const history = (Array.isArray(historyPayload?.data) ? historyPayload.data : [])
        .map((record) => normalizeCanonicalStudentVisit(record, 'history'))
        .sort((left, right) => new Date(right.starts_at || 0) - new Date(left.starts_at || 0));
    return [...upcoming, ...history];
}

function StudentVisitsSection({ csrf, compact = false, userId }) {
    const cacheKey = `scalecampus.student.visits.v1.${userId || 'anonymous'}`;
    const [visits, setVisits] = useState(() => {
        if (typeof window === 'undefined') return [];
        try {
            return JSON.parse(window.sessionStorage.getItem(cacheKey) || '[]');
        } catch (_) {
            return [];
        }
    });
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(visits.length === 0);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const persistVisits = (rows) => {
        setVisits(rows);
        if (typeof window !== 'undefined') {
            window.sessionStorage.setItem(cacheKey, JSON.stringify(rows));
        }
    };

    const loadVisits = async () => {
        setLoading(true);
        setError('');
        try {
            persistVisits(await loadCanonicalStudentVisits());
        } catch (fetchError) {
            setError(fetchError.message || 'Unable to load assigned visits.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadVisits();
    }, []);

    const openVisit = (visit) => {
        setSelected(visit);
        setMessage('');
        setError('');
    };

    const attended = visits.filter((visit) => visit.status === 'attended').length;
    const confirmed = visits.filter((visit) => visit.status === 'confirmed').length;
    const nextVisit = [...visits]
        .filter(isUpcomingStudentVisit)
        .sort((left, right) => new Date(left.starts_at || left.date) - new Date(right.starts_at || right.date))[0];

    if (selected) {
        return (
            <StudentVisitDetails
                visit={selected}
                loading={false}
                message={message}
                error={error}
                onBack={() => setSelected(null)}
            />
        );
    }

    return (
        <section className="grid gap-3 md:gap-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:rounded-3xl md:p-5">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#006a61]">Student portal</p>
                        <h1 className="mt-0.5 text-xl font-black text-slate-950 md:text-2xl">{compact ? 'Dashboard' : 'My Visits'}</h1>
                        <p className="mt-1 hidden max-w-2xl text-sm font-semibold leading-6 text-slate-500 sm:block">Assigned university visits, attendance status, and shared itinerary details.</p>
                    </div>
                    <button type="button" onClick={loadVisits} disabled={loading} className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-60 md:px-4 md:py-2.5 md:text-sm">
                        {loading ? '...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</p>}

            <div className="grid grid-cols-3 gap-2 md:gap-3">
                <MiniStat label="Assigned" value={visits.length} />
                <MiniStat label="Confirmed" value={confirmed} />
                <MiniStat label="Attended" value={attended} />
            </div>

            {nextVisit && (
                <button type="button" onClick={() => openVisit(nextVisit)} className="grid gap-3 rounded-2xl border border-[#006a61]/15 bg-[#006a61] p-3 text-left text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg md:grid-cols-[1fr_auto] md:items-center md:rounded-3xl md:p-5">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/70">Next scheduled visit</p>
                        <h2 className="mt-1 truncate text-base font-black md:text-xl">{nextVisit.title || 'Campus visit'}</h2>
                        <p className="mt-1 truncate text-xs font-semibold text-white/80 md:text-sm">{formatDateTime(nextVisit.starts_at || nextVisit.date)} · {nextVisit.location || nextVisit.venue || 'Location TBA'}</p>
                    </div>
                    <span className="inline-flex w-fit rounded-xl bg-white px-3 py-2 text-xs font-black text-[#006a61]">View itinerary</span>
                </button>
            )}

            {loading && visits.length === 0 ? (
                <div className="grid gap-2 md:gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {[1, 2, 3].map((item) => <div key={item} className="h-44 animate-pulse rounded-3xl border border-slate-200 bg-white shadow-sm" />)}
                </div>
            ) : visits.length === 0 ? (
                <EmptyState title="No visits assigned yet" message="Your school will assign visits when a university program is ready for your group." />
            ) : (
                <div className="grid gap-2 md:gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {visits.slice(0, compact ? 4 : visits.length).map((visit) => (
                        <StudentVisitCard key={visit.id} visit={visit} onClick={() => openVisit(visit)} />
                    ))}
                </div>
            )}
        </section>
    );
}

function StudentItineraryDashboardSection({ userId }) {
    const cacheKey = `scalecampus.student.visits.v1.${userId || 'anonymous'}`;
    const [visits, setVisits] = useState(() => {
        if (typeof window === 'undefined') return [];
        try {
            return JSON.parse(window.sessionStorage.getItem(cacheKey) || '[]');
        } catch (_) {
            return [];
        }
    });
    const [loading, setLoading] = useState(visits.length === 0);
    const [error, setError] = useState('');
    const [selectedVisitId, setSelectedVisitId] = useState('');
    const [weekCursor, setWeekCursor] = useState(new Date());

    const loadVisits = async () => {
        setLoading(true);
        setError('');
        try {
            const rows = await loadCanonicalStudentVisits();
            setVisits(rows);
            if (typeof window !== 'undefined') {
                window.sessionStorage.setItem(cacheKey, JSON.stringify(rows));
            }
        } catch (fetchError) {
            setError(fetchError.message || 'Unable to load your itinerary.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadVisits();
    }, []);

    const visitsWithItinerary = useMemo(() => visits
        .filter(isUpcomingStudentVisit)
        .map((visit) => ({ ...visit, itinerary: [...(visit.itinerary || [])].sort((left, right) => new Date(left.start_time || 0) - new Date(right.start_time || 0)) }))
        .filter((visit) => visit.itinerary.length > 0), [visits]);
    useEffect(() => {
        if (!visitsWithItinerary.length) return;
        const current = visitsWithItinerary.find((visit) => visit.id === selectedVisitId);
        if (current) return;
        const firstVisit = visitsWithItinerary[0];
        setSelectedVisitId(firstVisit.id);
        setWeekCursor(new Date(firstVisit.starts_at || firstVisit.date || firstVisit.itinerary?.[0]?.start_time || new Date()));
    }, [visitsWithItinerary, selectedVisitId]);
    const selectedVisit = visitsWithItinerary.find((visit) => visit.id === selectedVisitId) || visitsWithItinerary[0] || null;
    const selectedItems = selectedVisit?.itinerary || [];
    const nextItem = selectedItems.find((item) => itineraryItemState(item) !== 'completed') || selectedItems[selectedItems.length - 1] || null;
    const visitDates = visitsWithItinerary.map((visit) => ({
        id: visit.id,
        date: visit.starts_at || visit.date || visit.itinerary?.[0]?.start_time,
        title: visit.title || 'Visit',
        status: visit.status,
    }));
    const selectedDate = selectedVisit ? new Date(selectedVisit.starts_at || selectedVisit.date || selectedVisit.itinerary?.[0]?.start_time || new Date()) : new Date();
    const weekStart = addDays(weekCursor, -((weekCursor.getDay() + 6) % 7));
    const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
    const visitsForDate = (date) => visitDates.filter((visit) => visit.date && isSameCalendarDay(new Date(visit.date), date));
    const selectedDayVisits = selectedVisit ? visitsForDate(selectedDate) : [];
    const selectVisitFromCalendar = (visitId) => {
        const visit = visitDates.find((row) => row.id === visitId);
        setSelectedVisitId(visitId);
        if (visit?.date) {
            setWeekCursor(new Date(visit.date));
        }
    };
    const jumpToNearestVisit = () => {
        const today = new Date();
        const sortedVisits = [...visitDates].filter((visit) => visit.date).sort((left, right) => new Date(left.date) - new Date(right.date));
        const nextVisit = sortedVisits.find((visit) => new Date(visit.date) >= today);
        if (nextVisit) {
            selectVisitFromCalendar(nextVisit.id);
        } else {
            setWeekCursor(today);
        }
    };

    return (
        <section className="grid gap-3 md:gap-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:rounded-3xl md:p-5">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#006a61]">Student portal</p>
                        <h1 className="mt-0.5 text-xl font-black text-slate-950 md:text-2xl">Daily Itinerary</h1>
                        <p className="mt-1 hidden max-w-2xl text-sm font-semibold leading-6 text-slate-500 sm:block">Shared schedules from your assigned campus visits. This uses the same database records seen by your school and university.</p>
                    </div>
                    <button type="button" onClick={loadVisits} disabled={loading} className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-60 md:px-4 md:py-2.5 md:text-sm">
                        {loading ? '...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</p>}

            {loading && visits.length === 0 ? (
                <div className="grid gap-3">
                    {[1, 2].map((item) => <div key={item} className="h-44 animate-pulse rounded-3xl border border-slate-200 bg-white shadow-sm" />)}
                </div>
            ) : visitsWithItinerary.length === 0 ? (
                <EmptyState title="No itinerary shared yet" message="When your school or university publishes itinerary items, they will appear here automatically." />
            ) : (
                <>
                    <section className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#006a61]">Week calendar</p>
                                <h2 className="text-base font-black text-slate-950">{weekStart.toLocaleDateString([], { month: 'short', day: 'numeric' })} - {addDays(weekStart, 6).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</h2>
                            </div>
                            <div className="flex items-center gap-1">
                                <button type="button" onClick={() => setWeekCursor((current) => addDays(current, -7))} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-700">‹</button>
                                <button type="button" onClick={jumpToNearestVisit} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">Nearest</button>
                                <button type="button" onClick={() => setWeekCursor((current) => addDays(current, 7))} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-700">›</button>
                            </div>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                        {weekDays.map((date) => {
                            const dayVisits = visitsForDate(date);
                            const primaryVisit = dayVisits[0];
                            const active = selectedVisit && isSameCalendarDay(date, selectedDate);
                            return (
                                <button
                                    key={date.toISOString()}
                                    type="button"
                                    onClick={() => primaryVisit && selectVisitFromCalendar(primaryVisit.id)}
                                    disabled={!primaryVisit}
                                    className={cx(
                                        'min-w-[4.25rem] rounded-2xl border px-3 py-2 text-center shadow-sm transition md:min-w-[5rem]',
                                        active ? 'border-[#006a61] bg-[#006a61] text-white' : primaryVisit ? 'border-slate-200 bg-white text-slate-600 hover:border-[#006a61]/40' : 'border-slate-100 bg-slate-50 text-slate-300'
                                    )}
                                >
                                    <p className="text-[10px] font-black uppercase opacity-70">{date.toLocaleDateString([], { weekday: 'short' })}</p>
                                    <p className="text-xl font-black leading-none">{date.getDate()}</p>
                                    <div className="mt-1 flex justify-center gap-1">
                                        {dayVisits.slice(0, 3).map((visit) => <span key={visit.id} className={cx('h-1.5 w-1.5 rounded-full', active ? 'bg-white' : 'bg-[#006a61]')} />)}
                                        {dayVisits.length > 3 && <span className={cx('text-[9px] font-black leading-none', active ? 'text-white' : 'text-[#006a61]')}>+{dayVisits.length - 3}</span>}
                                    </div>
                                    <p className="mt-1 max-w-16 truncate text-[10px] font-bold opacity-80">{primaryVisit?.title || 'No visit'}</p>
                                </button>
                            );
                        })}
                        </div>
                        {selectedDayVisits.length > 1 && (
                            <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-3">
                                {selectedDayVisits.map((visit) => (
                                    <button
                                        key={visit.id}
                                        type="button"
                                        onClick={() => selectVisitFromCalendar(visit.id)}
                                        className={cx(
                                            'rounded-2xl border px-3 py-2 text-left text-xs font-bold transition',
                                            selectedVisit?.id === visit.id ? 'border-[#006a61] bg-[#006a61]/10 text-[#006a61]' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-[#006a61]/40'
                                        )}
                                    >
                                        <span className="block truncate font-black">{visit.title}</span>
                                        <span className="mt-1 block text-[10px] uppercase tracking-wide opacity-70">{formatShortTime(visit.date)}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>

                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                        <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
                            <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#006a61]">Selected visit</p>
                                    <h2 className="mt-1 text-lg font-black text-slate-950 md:text-xl">{selectedVisit.title || 'Campus visit'}</h2>
                                    <p className="mt-1 text-sm font-semibold text-slate-500">{formatDateTime(selectedVisit.starts_at || selectedVisit.date)} · {selectedVisit.location || selectedVisit.venue || 'Location TBA'}</p>
                                </div>
                                <StudentVisitStatusBadge status={selectedVisit.status} />
                            </div>

                            <StudentItineraryTimeline items={selectedItems} enhanced />
                        </article>

                        <aside className="grid gap-3 lg:sticky lg:top-24 lg:self-start">
                            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Up next</p>
                                <h3 className="mt-2 text-base font-black text-slate-950">{nextItem?.title || 'No upcoming item'}</h3>
                                <p className="mt-1 text-sm font-semibold text-slate-500">{nextItem ? formatTimeRange(nextItem.start_time, nextItem.end_time) : 'Schedule complete'}</p>
                                {nextItem?.location && <p className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#006a61]"><MapPin size={16} /> {nextItem.location}</p>}
                            </section>

                            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Visit details</p>
                                <div className="mt-3 grid gap-3 text-sm font-semibold text-slate-600">
                                    <div className="rounded-2xl bg-slate-50 px-3 py-3">
                                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Location</p>
                                        <p className="mt-1 font-black text-slate-950">{selectedVisit.location || selectedVisit.venue || 'Location TBA'}</p>
                                    </div>
                                    <div className="rounded-2xl bg-slate-50 px-3 py-3">
                                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Group</p>
                                        <p className="mt-1 font-black text-slate-950">{selectedVisit.school_group || selectedVisit.student?.name || 'Direct assignment'}</p>
                                    </div>
                                    <div className="rounded-2xl bg-slate-50 px-3 py-3">
                                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Schedule items</p>
                                        <p className="mt-1 font-black text-slate-950">{selectedItems.length}</p>
                                    </div>
                                </div>
                            </section>
                        </aside>
                    </div>
                </>
            )}
        </section>
    );
}

function StudentProfileSection({ csrf, profile = {}, registrations = [], errors = {}, old = {} }) {
    const user = profile.user || {};
    const cacheKey = `scalecampus.student.visits.v1.${user.id || 'anonymous'}`;
    const [visits, setVisits] = useState(() => {
        if (typeof window === 'undefined') return [];
        try {
            return JSON.parse(window.sessionStorage.getItem(cacheKey) || '[]');
        } catch (_) {
            return [];
        }
    });
    const [loading, setLoading] = useState(visits.length === 0);
    const [error, setError] = useState('');

    const loadVisits = async () => {
        setLoading(true);
        setError('');
        try {
            const rows = await loadCanonicalStudentVisits();
            setVisits(rows);
            if (typeof window !== 'undefined') {
                window.sessionStorage.setItem(cacheKey, JSON.stringify(rows));
            }
        } catch (fetchError) {
            setError(fetchError.message || 'Unable to load profile visit data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadVisits();
    }, []);

    const participationRows = visits.length ? visits : registrations;
    const confirmed = participationRows.filter((row) => row.status === 'confirmed').length;
    const invited = participationRows.filter((row) => row.status === 'invited').length;
    const attended = participationRows.filter((row) => row.status === 'attended').length;
    const upcomingVisits = [...visits]
        .filter(isUpcomingStudentVisit)
        .sort((left, right) => new Date(left.starts_at || left.date) - new Date(right.starts_at || right.date))
        .slice(0, 4);
    const value = (field, fallback = '') => old[field] ?? fallback ?? '';

    return (
        <section className="grid gap-4">
            <form action="/dashboard/student/profile" method="POST" className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
                <input type="hidden" name="_token" value={csrf} />
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <span className="grid h-20 w-20 overflow-hidden place-items-center rounded-full border-4 border-slate-100 bg-[#e5eeff] text-2xl font-black text-[#006a61] shadow-sm md:h-24 md:w-24">{user.profilePhotoUrl ? <img src={user.profilePhotoUrl} alt={`${user.name || 'Student'} profile`} className="h-full w-full object-cover" /> : initials(user.name || 'Student')}</span>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#006a61]">Student profile</p>
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700">Read-only participant</span>
                        </div>
                        <h1 className="mt-1 truncate text-2xl font-black text-slate-950 md:text-3xl">{user.name || 'Student'}</h1>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-500">{user.email || 'Email not available'}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1 rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600"><ShieldCheck size={14} /> {user.emailVerified ? 'Email verified' : 'Email pending'}</span>
                            <span className="inline-flex items-center gap-1 rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600"><UsersRound size={14} /> {titleCase(user.role || 'student')}</span>
                        </div>
                    </div>
                    <button type="button" onClick={loadVisits} disabled={loading} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 disabled:opacity-60">
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>

                {error && <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</p>}

                <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
                    <MiniStat label="Assigned" value={participationRows.length} />
                    <MiniStat label="Invited" value={invited} />
                    <MiniStat label="Confirmed" value={confirmed} />
                    <MiniStat label="Attended" value={attended} />
                </div>

                <div className="mt-6 grid gap-5 border-t border-slate-100 pt-5">
                    <section>
                        <h2 className="text-lg font-black text-slate-950">Personal details</h2>
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <LightField label="Full name" name="name" defaultValue={value('name', user.name)} error={errors.name?.[0]} />
                            <LightField label="Email address" name="email" type="email" defaultValue={user.email || ''} disabled />
                            <LightField label="Phone number" name="phone" defaultValue={value('phone', user.phone)} error={errors.phone?.[0]} />
                            <LightField label="Date of birth" name="date_of_birth" type="date" defaultValue={value('date_of_birth', user.dateOfBirth)} error={errors.date_of_birth?.[0]} />
                        </div>
                    </section>

                    <section>
                        <h2 className="text-lg font-black text-slate-950">School profile</h2>
                        <div className="mt-4 grid gap-4 md:grid-cols-3">
                            <LightField label="Student ID" name="student_identifier" defaultValue={value('student_identifier', user.studentIdentifier)} error={errors.student_identifier?.[0]} />
                            <LightField label="Grade level" name="grade_level" defaultValue={value('grade_level', user.gradeLevel)} error={errors.grade_level?.[0]} />
                            <LightField label="Interest / intended major" name="interest_major" defaultValue={value('interest_major', user.interestMajor)} error={errors.interest_major?.[0]} />
                        </div>
                    </section>

                    <section>
                        <h2 className="text-lg font-black text-slate-950">Address</h2>
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <div className="md:col-span-2"><LightField label="Street address" name="address" defaultValue={value('address', user.address)} error={errors.address?.[0]} /></div>
                            <LightField label="City" name="city" defaultValue={value('city', user.city)} error={errors.city?.[0]} />
                            <LightField label="State / province" name="state" defaultValue={value('state', user.state)} error={errors.state?.[0]} />
                            <LightField label="Country" name="country" defaultValue={value('country', user.country)} error={errors.country?.[0]} />
                        </div>
                    </section>

                    <section>
                        <h2 className="text-lg font-black text-slate-950">Guardian information</h2>
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <LightField label="Guardian name" name="guardian_name" defaultValue={value('guardian_name', user.guardianName)} error={errors.guardian_name?.[0]} />
                            <LightField label="Relationship" name="guardian_relationship" defaultValue={value('guardian_relationship', user.guardianRelationship)} error={errors.guardian_relationship?.[0]} />
                            <LightField label="Guardian email" name="guardian_email" type="email" defaultValue={value('guardian_email', user.guardianEmail)} error={errors.guardian_email?.[0]} />
                            <LightField label="Guardian phone" name="guardian_phone" defaultValue={value('guardian_phone', user.guardianPhone)} error={errors.guardian_phone?.[0]} />
                        </div>
                    </section>

                    <section>
                        <h2 className="text-lg font-black text-slate-950">Emergency and visit needs</h2>
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <LightField label="Emergency contact name" name="emergency_contact_name" defaultValue={value('emergency_contact_name', user.emergencyContactName)} error={errors.emergency_contact_name?.[0]} />
                            <LightField label="Emergency relationship" name="emergency_contact_relationship" defaultValue={value('emergency_contact_relationship', user.emergencyContactRelationship)} error={errors.emergency_contact_relationship?.[0]} />
                            <LightField label="Emergency phone" name="emergency_contact_phone" defaultValue={value('emergency_contact_phone', user.emergencyContactPhone)} error={errors.emergency_contact_phone?.[0]} />
                            <LightField label="Dietary restrictions" name="dietary_restrictions" defaultValue={value('dietary_restrictions', user.dietaryRestrictions)} error={errors.dietary_restrictions?.[0]} />
                            <div className="md:col-span-2"><LightTextarea label="Medical notes" name="medical_notes" defaultValue={value('medical_notes', user.medicalNotes)} placeholder="Allergies, medication, medical notes, or care instructions..." error={errors.medical_notes?.[0]} /></div>
                            <div className="md:col-span-2"><LightTextarea label="Accessibility needs" name="accessibility_needs" defaultValue={value('accessibility_needs', user.accessibilityNeeds)} placeholder="Mobility, sensory, language, or other visit support needs..." error={errors.accessibility_needs?.[0]} /></div>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <label className="flex items-start gap-3 text-sm font-semibold text-emerald-950">
                            <input type="checkbox" name="consent_to_share" value="1" defaultChecked={Boolean(old.consent_to_share ?? user.consentToShare)} className="mt-1 rounded border-emerald-300 text-[#006a61] focus:ring-[#006a61]" />
                            <span>
                                Allow my school and visit hosts to use these details for visit coordination, safety, accessibility, and emergency handling.
                                <span className="mt-1 block text-xs font-bold text-emerald-700">This does not give students control over attendance. Schools and universities still manage visit attendance.</span>
                            </span>
                        </label>
                    </section>

                    <div className="flex justify-end">
                        <button className="w-full rounded-xl bg-[#006a61] px-5 py-3 text-sm font-black text-white hover:opacity-90 md:w-auto">Save Profile</button>
                    </div>
                </div>
            </form>

            <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-black text-slate-950">Assigned visits</h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500">Upcoming, non-cancelled visits tied to this student account.</p>
                    </div>
                    <CalendarDays className="text-[#006a61]" size={22} />
                </div>
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                    {loading && visits.length === 0 ? (
                        [1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-2xl bg-slate-50" />)
                    ) : upcomingVisits.length === 0 ? (
                        <EmptyState title="No assigned visits" message="Assigned campus visits will appear here when your school adds you to a visit." />
                    ) : upcomingVisits.map((visit) => (
                        <div key={visit.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-black text-slate-950">{visit.title || 'Campus visit'}</p>
                                <p className="mt-1 truncate text-xs font-bold text-slate-500">{formatDateTime(visit.starts_at || visit.date)} · {visit.location || visit.venue || 'Location TBA'}</p>
                            </div>
                            <StudentVisitStatusBadge status={visit.status} />
                        </div>
                    ))}
                </div>
            </article>
        </section>
    );
}

function StudentVisitCard({ visit, onClick }) {
    const status = visit.status || 'invited';
    const primaryAction = status === 'attended' ? 'Review' : 'Details';

    return (
        <button type="button" onClick={onClick} className="group w-full rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#006a61]/30 hover:shadow-lg md:rounded-3xl md:p-5">
            <div className="grid grid-cols-[44px_1fr_auto] items-start gap-3 md:grid-cols-[52px_1fr]">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e5eeff] text-xs font-black text-[#006a61] md:h-12 md:w-12 md:text-sm">{initials(visit.title || 'Visit')}</span>
                <div className="min-w-0">
                    <div className="flex min-w-0 items-start justify-between gap-2">
                        <h3 className="line-clamp-2 text-base font-black leading-tight text-slate-950 group-hover:text-[#006a61] md:text-lg">{visit.title || 'Campus visit'}</h3>
                        <div className="hidden shrink-0 md:block"><StudentVisitStatusBadge status={status} /></div>
                    </div>
                    <p className="mt-0.5 truncate text-xs font-bold text-slate-500 md:text-sm">{visit.university || visit.host || 'University visit'}</p>
                </div>
                <div className="md:hidden"><StudentVisitStatusBadge status={status} /></div>
            </div>

            <div className="mt-3 grid gap-1.5 border-t border-slate-100 pt-3 text-xs font-bold text-slate-500 md:mt-4 md:gap-2 md:text-sm">
                <span className="inline-flex min-w-0 items-center gap-2"><CalendarDays size={14} className="shrink-0 text-slate-400" /> <span className="truncate">{formatDateTime(visit.starts_at || visit.date)}</span></span>
                <span className="inline-flex min-w-0 items-center gap-2"><MapPin size={14} className="shrink-0 text-slate-400" /> <span className="truncate">{visit.location || visit.venue || 'Location TBA'}</span></span>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <span className="text-xs font-black text-[#006a61]">{primaryAction}</span>
                <span className="rounded-full bg-slate-50 p-1.5 text-slate-400 transition group-hover:bg-[#e5eeff] group-hover:text-[#006a61]"><ChevronRight size={16} /></span>
            </div>
        </button>
    );
}

function StudentVisitDetails({ visit, loading, message, error, onBack }) {
    return (
        <section className="grid gap-4 md:gap-5">
            <button type="button" onClick={onBack} className="w-fit rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700">Back to visits</button>

            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
                <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#006a61]">Visit details</p>
                        <h1 className="mt-2 text-2xl font-black leading-tight text-slate-950 md:text-3xl">{visit.title || 'Campus visit'}</h1>
                        <div className="mt-4 flex flex-col gap-2 text-sm font-semibold text-slate-500 sm:flex-row sm:flex-wrap">
                            <span className="inline-flex items-center gap-2"><CalendarDays size={16} /> {formatDateTime(visit.starts_at || visit.date)}</span>
                            <span className="inline-flex items-center gap-2"><MapPin size={16} /> {visit.location || visit.venue || 'Location TBA'}</span>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">Current status</p>
                        <div className="mt-3"><StudentVisitStatusBadge status={visit.status} /></div>
                        <p className="mt-3 text-xs font-bold leading-5 text-slate-500">Attendance is managed by your school and the visit host.</p>
                    </div>
                </div>
                {loading && <p className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">Loading visit details...</p>}
                {message && <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{message}</p>}
                {error && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">{error}</p>}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-black text-slate-950">Itinerary</h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500">Shared schedule for this visit.</p>
                    </div>
                    <RouteIcon className="text-[#006a61]" size={20} />
                </div>
                <StudentItineraryTimeline items={visit.itinerary || []} />
            </section>
        </section>
    );
}

function StudentItineraryTimeline({ items = [], enhanced = false }) {
    const sorted = [...items].sort((left, right) => new Date(left.start_time || 0) - new Date(right.start_time || 0));

    if (!sorted.length) {
        return <EmptyState title="No itinerary shared yet" message="Your school or university will share the visit itinerary when it is ready." />;
    }

    return (
        <div className={cx('mt-5 grid', enhanced ? 'gap-0' : 'gap-3')}>
            {sorted.map((item, index) => {
                const state = itineraryItemState(item);
                const isLast = index === sorted.length - 1;
                const stateLabel = state === 'completed' ? 'Completed' : state === 'current' ? 'Happening now' : 'Upcoming';
                return enhanced ? (
                    <article key={item.id || `${item.title}-${index}`} className="relative ml-3 grid grid-cols-[22px_1fr] gap-3">
                        <div className="relative flex justify-center">
                            <span className={cx(
                                'z-10 mt-1 grid h-5 w-5 place-items-center rounded-full border-4 border-white',
                                state === 'completed' ? 'bg-emerald-500 text-white' : state === 'current' ? 'bg-slate-950 ring-4 ring-[#006a61]/15' : 'bg-slate-300'
                            )}>
                                {state === 'completed' && <CheckCircle2 size={11} />}
                            </span>
                            {!isLast && <span className={cx('absolute top-6 h-full w-0.5', state === 'current' ? 'bg-slate-950' : 'bg-slate-200')} />}
                        </div>
                        <div className={cx(
                            'mb-3 rounded-2xl border p-3 shadow-sm transition md:p-4',
                            state === 'current' ? 'border-[#006a61]/30 bg-white shadow-md' : 'border-slate-100 bg-slate-50'
                        )}>
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <p className={cx('text-xs font-black', state === 'current' ? 'text-[#006a61]' : 'text-slate-500')}>{formatTimeRange(item.start_time, item.end_time)}</p>
                                <span className={cx(
                                    'w-fit rounded-full px-2 py-1 text-[10px] font-black uppercase',
                                    state === 'completed' ? 'bg-emerald-50 text-emerald-700' : state === 'current' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'
                                )}>{stateLabel}</span>
                            </div>
                            <h3 className="mt-2 text-base font-black text-slate-950 md:text-lg">{item.title}</h3>
                            {item.description && <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{item.description}</p>}
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                <p className="inline-flex min-w-0 items-center gap-2 text-sm font-bold text-[#006a61]"><MapPin size={15} /> <span className="truncate">{item.location || 'Location TBA'}</span></p>
                                {item.location && <a className="text-xs font-black text-slate-950 underline-offset-4 hover:underline" href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(item.location)}`} target="_blank" rel="noreferrer">Directions</a>}
                            </div>
                        </div>
                    </article>
                ) : (
                    <article key={item.id || `${item.title}-${index}`} className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 md:grid-cols-[130px_1fr] md:gap-4 md:p-4">
                        <div className="text-sm font-black text-[#006a61] md:border-r md:border-slate-200 md:pr-4">
                            {formatTimeRange(item.start_time, item.end_time)}
                        </div>
                        <div className="rounded-2xl bg-white p-4 shadow-sm">
                            <div className="flex items-start gap-3">
                                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e5eeff] text-[#006a61]"><Clock size={16} /></span>
                                <div>
                                    <h3 className="font-black text-slate-950">{item.title}</h3>
                                    <p className="mt-1 text-sm font-semibold text-slate-500">{item.location || 'Location TBA'}</p>
                                    {item.description && <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>}
                                </div>
                            </div>
                        </div>
                    </article>
                );
            })}
        </div>
    );
}

function itineraryItemState(item) {
    const now = new Date();
    const start = item.start_time ? new Date(item.start_time) : null;
    const end = item.end_time ? new Date(item.end_time) : start;

    if (end && end < now) return 'completed';
    if (start && start <= now && (!end || end >= now)) return 'current';
    return 'upcoming';
}

function StudentVisitStatusBadge({ status }) {
    const labels = {
        invited: 'Invited',
        confirmed: 'Confirmed',
        attended: 'Attended',
        waitlisted: 'Waitlisted',
        cancelled: 'Cancelled',
    };
    const classes = {
        invited: 'bg-slate-100 text-slate-600',
        confirmed: 'bg-emerald-50 text-emerald-700',
        attended: 'bg-green-100 text-green-800',
        waitlisted: 'bg-amber-50 text-amber-700',
        cancelled: 'bg-rose-50 text-rose-700',
    };

    return <span className={cx('inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase', classes[status] || classes.invited)}>{labels[status] || titleCase(status || 'invited')}</span>;
}

function EventCalendarSection({ csrf, events, registrations = [], title = 'Calendar', canManage = false }) {
    const [localEvents, setLocalEvents] = useState(events || []);
    const timeSlots = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];

    useEffect(() => {
        setLocalEvents(events || []);
    }, [events]);

    const datedEvents = useMemo(
        () => [...localEvents].filter((event) => event.startsAt).sort((left, right) => new Date(left.startsAt) - new Date(right.startsAt)),
        [localEvents],
    );
    const firstDate = datedEvents[0]?.startsAt ? new Date(datedEvents[0].startsAt) : new Date();
    const [cursor, setCursor] = useState(new Date(firstDate.getFullYear(), firstDate.getMonth(), 1));
    const [selectedDate, setSelectedDate] = useState(firstDate);
    const [selectedId, setSelectedId] = useState(datedEvents[0]?.id || localEvents[0]?.id || null);
    const [pendingDate, setPendingDate] = useState(null);
    const [savingMove, setSavingMove] = useState(false);
    const [moveMessage, setMoveMessage] = useState('');
    const [draggingId, setDraggingId] = useState(null);
    const [movingEventId, setMovingEventId] = useState(null);
    const [pendingTime, setPendingTime] = useState('');
    const [pendingEndTime, setPendingEndTime] = useState('');
    const selectedEvent = localEvents.find((event) => String(event.id) === String(selectedId)) || datedEvents[0] || localEvents[0] || null;
    const selectedRoster = selectedEvent ? registrations.filter((registration) => Number(registration.eventId) === Number(selectedEvent.id)) : [];
    const nextDatedEvent = datedEvents.find((event) => {
        const startsAt = new Date(event.startsAt || '').getTime();
        return Number.isFinite(startsAt) && startsAt >= Date.now();
    }) || datedEvents[0] || null;
    const monthCells = calendarMonthCells(cursor);
    const weekStart = addDays(selectedDate, -((selectedDate.getDay() + 6) % 7));
    const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
    const eventsForDay = (date) => datedEvents.filter((event) => isSameCalendarDay(new Date(event.startsAt), date));
    const dayEvents = eventsForDay(selectedDate);
    const weekEvents = datedEvents.filter((event) => {
        const eventDate = new Date(event.startsAt);
        const weekEnd = addDays(weekStart, 7);
        return eventDate >= weekStart && eventDate < weekEnd;
    }).length;
    const expectedStudents = localEvents.reduce((total, event) => total + Number(event.confirmedSeats || 0), 0);
    const busiestDay = busiestCalendarDay(localEvents);
    const pendingStart = pendingDate && selectedEvent ? moveEventToDateTime(selectedEvent.startsAt, pendingDate, pendingTime) : null;
    const pendingEnd = pendingDate && selectedEvent ? moveEventToDateTime(selectedEvent.endsAt || selectedEvent.startsAt, pendingDate, pendingEndTime) : null;
    const pendingConflict = pendingStart && selectedEvent ? hasLocalScheduleConflict(localEvents, selectedEvent.id, selectedEvent.venue, pendingStart, pendingEnd) : null;

    const selectEvent = (event) => {
        setSelectedId(event.id);
        setPendingDate(null);
        setMovingEventId(null);
        setPendingTime('');
        setPendingEndTime('');
        if (event.startsAt) setSelectedDate(new Date(event.startsAt));
    };

    const jumpToToday = () => {
        const today = new Date();
        setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
        setSelectedDate(today);
    };

    const prepareMove = (eventId, date) => {
        if (!canManage || !eventId || !date) return;
        setSelectedId(eventId);
        setSelectedDate(date);
        setPendingDate(date);
        const eventRecord = localEvents.find((item) => item.id === eventId);
        setPendingTime(timeValue(eventRecord?.startsAt));
        setPendingEndTime(timeValue(eventRecord?.endsAt || addHoursToIso(eventRecord?.startsAt, 2)));
        setMovingEventId(null);
        setMoveMessage('');
    };

    const startMove = (eventId) => {
        if (!canManage || !eventId) return;
        setSelectedId(eventId);
        setPendingDate(null);
        const eventRecord = localEvents.find((item) => item.id === eventId);
        setPendingTime(timeValue(eventRecord?.startsAt));
        setPendingEndTime(timeValue(eventRecord?.endsAt || addHoursToIso(eventRecord?.startsAt, 2)));
        setMovingEventId(eventId);
        setMoveMessage('');
    };

    const chooseDate = (date) => {
        if (movingEventId) {
            prepareMove(movingEventId, date);
            return;
        }
        setSelectedDate(date);
    };

    const handleDropOnDate = (date) => {
        if (!draggingId) return;
        prepareMove(draggingId, date);
        setDraggingId(null);
    };

    const handleMoveSubmit = async (event) => {
        event.preventDefault();
        if (!selectedEvent || !pendingStart) return;
        if (pendingConflict) {
            setMoveMessage('Unable to reschedule visit. The selected venue and time conflicts with another program.');
            return;
        }

        const form = event.currentTarget;
        const formData = new FormData(form);
        setSavingMove(true);
        setMoveMessage('');

        try {
            const response = await fetch(form.action, {
                method: 'POST',
                body: formData,
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
            });

            if (!response.ok) throw new Error('Unable to reschedule visit.');

            setLocalEvents((items) => items.map((item) => (
                item.id === selectedEvent.id
                    ? { ...item, startsAt: pendingStart, endsAt: pendingEnd, venue: formData.get('venue') || item.venue, lastScheduleChangeAt: new Date().toISOString() }
                    : item
            )));
            setSelectedDate(new Date(pendingStart));
            setCursor(new Date(new Date(pendingStart).getFullYear(), new Date(pendingStart).getMonth(), 1));
            setPendingDate(null);
            setMovingEventId(null);
            setMoveMessage('Visit rescheduled.');
        } catch (error) {
            setMoveMessage(error.message || 'Unable to reschedule visit.');
        } finally {
            setSavingMove(false);
        }
    };

    return (
        <div className="relative grid gap-4 md:gap-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-950 md:text-3xl">{title}</h1>
                    <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">Plan visits, inspect capacity, and move schedule dates without leaving the page.</p>
                    {canManage && <p className="mt-2 hidden text-xs font-black text-[#006a61] md:block">Use Move, then choose the new day. Dragging still works on desktop.</p>}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                    <button type="button" onClick={jumpToToday} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm">Today</button>
                    {canManage && <a href="/campus-events/calendar/export" className="rounded-xl border border-[#006a61]/30 bg-white px-3 py-2 text-center text-xs font-black text-[#006a61] shadow-sm">Export ICS</a>}
                    {canManage ? (
                        <button type="button" onClick={() => selectedEvent && startMove(selectedEvent.id)} disabled={!selectedEvent} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white shadow-sm disabled:opacity-40">Move Visit</button>
                    ) : (
                        <button type="button" onClick={() => nextDatedEvent && selectEvent(nextDatedEvent)} disabled={!nextDatedEvent} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white shadow-sm disabled:opacity-40">Next Visit</button>
                    )}
                </div>
            </div>

            {canManage && movingEventId && (
                <section className="rounded-2xl border border-[#006a61]/25 bg-emerald-50 p-3 shadow-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-black text-[#005049]">Moving: {localEvents.find((event) => event.id === movingEventId)?.title || 'selected visit'}. Choose the new day below.</p>
                        <button type="button" onClick={() => setMovingEventId(null)} className="rounded-xl border border-[#006a61]/25 bg-white px-3 py-2 text-xs font-black text-[#006a61]">Cancel move</button>
                    </div>
                </section>
            )}

            <div className="grid grid-cols-3 gap-2 md:gap-4">
                <ScheduleMetric label="This week" value={weekEvents} detail="scheduled visits" tone="green" />
                <ScheduleMetric label="Expected" value={expectedStudents.toLocaleString()} detail="students" tone="blue" />
                <ScheduleMetric label="Busiest" value={busiestDay.label} detail={busiestDay.detail} tone="slate" />
            </div>

            {canManage && selectedEvent && (
                <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#006a61]">Editable Time Blocks</p>
                            <p className="mt-1 text-sm font-bold text-slate-600">Pick a day, then choose a time slot. Conflict detection runs before confirmation.</p>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {timeSlots.map((slot) => (
                                <button key={slot} type="button" onClick={() => { setPendingDate(selectedDate); setPendingTime(slot); setPendingEndTime(addMinutesToTime(slot, 120)); }} onDragOver={(event) => canManage && event.preventDefault()} onDrop={() => { if (draggingId) { prepareMove(draggingId, selectedDate); setPendingTime(slot); setPendingEndTime(addMinutesToTime(slot, 120)); setDraggingId(null); } }} className={cx('shrink-0 rounded-xl border px-3 py-2 text-xs font-black', pendingTime === slot ? 'border-[#006a61] bg-[#006a61] text-white' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white')}>
                                    {formatSlotLabel(slot)}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:hidden">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#006a61]">My Schedule</p>
                        <h2 className="mt-1 text-lg font-black text-slate-950">{selectedDate.toLocaleDateString([], { month: 'long', year: 'numeric' })}</h2>
                    </div>
                    <div className="flex gap-1.5">
                        <button type="button" onClick={() => setSelectedDate(addDays(selectedDate, -7))} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white"><ChevronRight size={16} className="rotate-180" /></button>
                        <button type="button" onClick={() => setSelectedDate(addDays(selectedDate, 7))} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white"><ChevronRight size={16} /></button>
                    </div>
                </div>

                <div className="mt-3 grid grid-cols-7 gap-1 rounded-2xl bg-[#f8f9ff] p-2">
                    {weekDays.map((date) => {
                        const active = isSameCalendarDay(date, selectedDate);
                        const count = eventsForDay(date).length;
                        return (
                            <button key={date.toISOString()} type="button" onClick={() => chooseDate(date)} onDragOver={(event) => canManage && event.preventDefault()} onDrop={() => handleDropOnDate(date)} className={cx('relative rounded-xl px-1 py-2 text-center transition', active ? 'bg-[#006a61] text-white shadow-sm' : 'text-slate-500', (draggingId || movingEventId) && canManage && 'ring-2 ring-[#006a61]/30')}>
                                <span className="block text-[9px] font-black uppercase">{date.toLocaleDateString([], { weekday: 'short' })}</span>
                                <span className="mt-1 block text-sm font-black">{date.getDate()}</span>
                                {count > 0 && <span className={cx('mx-auto mt-1 block h-1.5 w-1.5 rounded-full', active ? 'bg-white' : 'bg-[#006a61]')} />}
                            </button>
                        );
                    })}
                </div>

                <div className="relative mt-4 space-y-3 before:absolute before:bottom-2 before:left-5 before:top-2 before:w-px before:bg-slate-200">
                    {dayEvents.length === 0 ? (
                        <div className="relative z-10 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm font-black text-slate-500">
                            {canManage ? (
                                <button type="button" onClick={() => selectedEvent && setPendingDate(selectedDate)} className="w-full">Free slot - tap to move selected visit here</button>
                            ) : 'No visits scheduled for this day.'}
                        </div>
                    ) : dayEvents.map((event) => (
                        <MobileScheduleCard key={event.id} event={event} active={selectedId === event.id} canManage={canManage} onSelect={() => selectEvent(event)} onMove={() => startMove(event.id)} />
                    ))}
                </div>
            </section>

            <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
                <section className="hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:block">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{cursor.getFullYear()}</p>
                            <h2 className="text-xl font-black text-slate-950">{cursor.toLocaleDateString([], { month: 'long' })}</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="rounded-xl bg-[#e5eeff] px-3 py-2 text-xs font-black text-[#006a61]">Agenda</span>
                            <button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600"><ChevronRight size={16} className="rotate-180" /></button>
                            <button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600"><ChevronRight size={16} /></button>
                        </div>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-[260px_1fr]">
                        <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Upcoming</p>
                                <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-500">{datedEvents.length}</span>
                            </div>
                            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                                {datedEvents.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-xs font-bold text-slate-500">No scheduled visits yet.</div>
                                ) : datedEvents.map((event) => {
                                    const active = selectedId === event.id;
                                    return (
                                        <button key={event.id} type="button" draggable={canManage} onDragStart={() => { setDraggingId(event.id); setSelectedId(event.id); }} onDragEnd={() => setDraggingId(null)} onClick={() => selectEvent(event)} className={cx('w-full cursor-grab rounded-xl border p-3 text-left transition active:cursor-grabbing', active ? 'border-[#006a61] bg-white shadow-sm' : 'border-transparent bg-white/70 hover:bg-white', draggingId === event.id && 'opacity-60 ring-2 ring-[#006a61]/30', movingEventId === event.id && 'ring-2 ring-[#006a61]/40')}>
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="min-w-0 truncate text-xs font-black text-slate-950">{event.title}</span>
                                                <span className="shrink-0 text-[10px] font-black text-[#006a61]">{formatShortDate(event.startsAt)}</span>
                                            </div>
                                            <p className="mt-1 truncate text-[11px] font-semibold text-slate-500">{formatTimeRange(event.startsAt, event.endsAt)} - {event.venue || 'Venue TBA'}</p>
                                            {canManage && <span onClick={(click) => { click.stopPropagation(); startMove(event.id); }} className="mt-2 inline-flex rounded-lg bg-slate-950 px-3 py-1.5 text-[11px] font-black text-white">Move</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </aside>

                        <div className="grid gap-3">
                            <div className="grid grid-cols-7 gap-2">
                                {weekDays.map((date) => {
                                    const active = isSameCalendarDay(date, selectedDate);
                                    const count = eventsForDay(date).length;
                                    return (
                                        <button key={date.toISOString()} type="button" onClick={() => chooseDate(date)} onDragOver={(event) => canManage && event.preventDefault()} onDrop={() => handleDropOnDate(date)} className={cx('rounded-2xl border p-3 text-center transition', active ? 'border-[#006a61] bg-[#006a61] text-white shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white', (draggingId || movingEventId) && canManage && 'border-dashed ring-2 ring-[#006a61]/20')}>
                                            <span className="block text-[10px] font-black uppercase">{date.toLocaleDateString([], { weekday: 'short' })}</span>
                                            <span className="mt-1 block text-lg font-black">{date.getDate()}</span>
                                            <span className={cx('mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black', active ? 'bg-white/15 text-white' : 'bg-white text-slate-500')}>{count}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-3">
                                <div className="mb-3 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Selected day</p>
                                        <h3 className="text-base font-black text-slate-950">{selectedDate.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
                                    </div>
                                    {canManage && selectedEvent && <button type="button" onClick={() => movingEventId ? prepareMove(movingEventId, selectedDate) : startMove(selectedEvent.id)} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white">{movingEventId ? 'Use this day' : 'Move selected'}</button>}
                                </div>
                                <div className="grid gap-2">
                                    {dayEvents.length === 0 ? (
                                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">No visits on this day.</div>
                                    ) : dayEvents.map((event) => {
                                        const full = Number(event.confirmedSeats || 0) >= Number(event.capacity || 1);
                                        return (
                                            <button key={event.id} type="button" draggable={canManage} onDragStart={() => { setDraggingId(event.id); setSelectedId(event.id); }} onDragEnd={() => setDraggingId(null)} onClick={() => selectEvent(event)} className={cx('grid cursor-grab gap-3 rounded-xl border p-3 text-left transition active:cursor-grabbing sm:grid-cols-[92px_minmax(0,1fr)_120px]', selectedId === event.id ? 'border-[#006a61] bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300', draggingId === event.id && 'opacity-60 ring-2 ring-[#006a61]/30')}>
                                                <div>
                                                    <p className="text-sm font-black text-slate-950">{formatTimeRange(event.startsAt, event.endsAt).split(' - ')[0]}</p>
                                                    <p className="mt-1 text-[10px] font-black uppercase text-slate-400">{event.status || 'published'}</p>
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="truncate text-sm font-black text-slate-950">{event.title}</h4>
                                                    <p className="mt-1 truncate text-xs font-semibold text-slate-500">{event.venue || 'Venue TBA'} {event.location ? `- ${event.location}` : ''}</p>
                                                </div>
                                                <div className="flex items-center justify-between gap-2 sm:justify-end">
                                                    <span className={cx('rounded-full px-2 py-1 text-[10px] font-black', full ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700')}>{event.confirmedSeats}/{event.capacity}</span>
                                                    {canManage && <span onClick={(click) => { click.stopPropagation(); startMove(event.id); }} className="rounded-lg bg-slate-950 px-3 py-1.5 text-[11px] font-black text-white">Move</span>}
                                                    <ChevronRight size={16} className="text-slate-400" />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <CalendarEventDrawer event={selectedEvent} roster={selectedRoster} />
            </div>

            {moveMessage && (
                <div className="fixed left-3 right-3 top-20 z-[80] md:left-auto md:right-6 md:top-6 md:w-full md:max-w-sm">
                    <div className={cx('flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-black shadow-2xl backdrop-blur', moveMessage.includes('Unable') ? 'border-red-200 bg-red-50/95 text-red-800' : 'border-emerald-200 bg-emerald-50/95 text-emerald-800')}>
                        {moveMessage.includes('Unable') ? <X size={18} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}
                        <span className="min-w-0 flex-1">{moveMessage}</span>
                        <button type="button" onClick={() => setMoveMessage('')} className="rounded-full p-1 opacity-70 hover:bg-black/5 hover:opacity-100" aria-label="Dismiss notification">
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}

            {pendingDate && selectedEvent && (
                <section className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
                    <form action={`/campus-events/${selectedEvent.id}/schedule`} method="POST" onSubmit={handleMoveSubmit} className="w-full max-w-md rounded-3xl border border-white/70 bg-white p-5 text-slate-950 shadow-2xl md:p-6">
                        <input type="hidden" name="_token" value={csrf} />
                        <input type="hidden" name="venue" value={selectedEvent.venue || ''} />
                        <input type="hidden" name="location" value={selectedEvent.location || ''} />
                        <input type="hidden" name="starts_at" value={toInputDateTime(pendingStart)} />
                        <input type="hidden" name="ends_at" value={toInputDateTime(pendingEnd)} />
                        <div className="flex items-start gap-3">
                            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-[#006a61]"><CalendarDays size={20} /></span>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#006a61]">Confirm move</p>
                                <h2 className="mt-1 text-xl font-black leading-6 text-slate-950">Move this visit?</h2>
                                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                                    Move <span className="font-black text-slate-950">"{selectedEvent.title}"</span> to <span className="font-black text-slate-950">{formatShortDate(pendingStart)}</span>.
                                </p>
                            </div>
                        </div>
                        <div className="mt-5 rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-600">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <label>Start time<input type="time" value={pendingTime} onChange={(event) => setPendingTime(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-900" /></label>
                                <label>End time<input type="time" value={pendingEndTime} onChange={(event) => setPendingEndTime(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-900" /></label>
                            </div>
                            <p className="mt-3">Time block: {formatTimeRange(pendingStart, pendingEnd)}</p>
                            <p className="mt-1">Venue: {selectedEvent.venue || 'Venue TBA'}</p>
                            {pendingConflict && <p className="mt-3 rounded-xl bg-red-50 p-3 text-red-700">Conflict detected with “{pendingConflict.title}” at this venue/time. Choose another slot before confirming.</p>}
                        </div>
                        <div className="mt-5 grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => setPendingDate(null)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">Cancel</button>
                            <button disabled={savingMove} className="rounded-2xl bg-[#006a61] px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-900/15 hover:opacity-90 disabled:opacity-50">{savingMove ? 'Saving...' : 'Confirm Move'}</button>
                        </div>
                    </form>
                </section>
            )}
        </div>
    );
}

function ScheduleMetric({ label, value, detail, tone = 'blue' }) {
    const toneClass = tone === 'green' ? 'text-emerald-700 bg-emerald-50' : tone === 'slate' ? 'text-slate-700 bg-slate-50' : 'text-blue-700 bg-blue-50';
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-1 text-lg font-black text-slate-950 md:text-2xl">{value}</p>
            <p className={cx('mt-2 rounded-full px-2 py-1 text-[10px] font-black md:inline-block', toneClass)}>{detail}</p>
        </article>
    );
}

function MobileScheduleCard({ event, active, canManage = false, onSelect, onMove }) {
    const full = Number(event.confirmedSeats || 0) >= Number(event.capacity || 1);
    return (
        <article className="relative z-10 grid grid-cols-[40px_minmax(0,1fr)] gap-3">
            <span className={cx('grid h-10 w-10 place-items-center rounded-full border-2 bg-white', active ? 'border-[#006a61] text-[#006a61]' : full ? 'border-red-400 text-red-600' : 'border-blue-500 text-blue-600')}>
                {full ? <UsersRound size={18} /> : <School size={18} />}
            </span>
            <button type="button" onClick={onSelect} className={cx('rounded-2xl border p-3 text-left shadow-sm transition', active ? 'border-[#006a61] bg-emerald-50' : 'border-slate-200 bg-white')}>
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <span className={cx('inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide', full ? 'bg-red-50 text-red-700' : 'bg-[#e5eeff] text-[#006a61]')}>{full ? 'Full' : eventFocus(event)}</span>
                        <h3 className="mt-1.5 line-clamp-2 text-sm font-black leading-5 text-slate-950">{event.title}</h3>
                    </div>
                    <span className="shrink-0 text-[11px] font-black text-slate-500">{formatTimeRange(event.startsAt, event.endsAt).split(' - ')[0]}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-slate-500">
                    <span className="inline-flex items-center gap-1"><MapPin size={12} /> {event.venue || event.location || 'Location TBA'}</span>
                    <span className="inline-flex items-center gap-1"><UsersRound size={12} /> {event.confirmedSeats}/{event.capacity}</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
                    <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">{event.status || 'published'}</span>
                    {canManage ? (
                        <span onClick={(click) => { click.stopPropagation(); onMove(); }} className="rounded-lg bg-slate-950 px-3 py-1.5 text-[11px] font-black text-white">Move</span>
                    ) : (
                        <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-black text-slate-600">View</span>
                    )}
                </div>
            </button>
        </article>
    );
}

function CalendarEventDrawer({ event, roster }) {
    if (!event) {
        return (
            <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                <EmptyState message="Select an event to inspect capacity, registrations, and scheduling notes." />
            </aside>
        );
    }

    const percent = eventCapacityPercent(event);
    const registeredParties = [...new Set(roster.map((registration) => registration.name).filter(Boolean))];
    const isFull = Number(event.confirmedSeats || 0) >= Number(event.capacity || 1);
    const openSeats = Math.max(0, Number(event.capacity || 0) - Number(event.confirmedSeats || 0));

    return (
        <aside className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4 md:p-5">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className={cx('h-2.5 w-2.5 rounded-full', isFull ? 'bg-red-500' : 'bg-emerald-500')} />
                        <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">{isFull ? 'Full' : 'Seats available'}</span>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-500">{event.status || 'published'}</span>
                </div>
                <h2 className="mt-3 text-xl font-black leading-tight text-slate-950 md:mt-4 md:text-2xl">{event.title}</h2>
                <div className="mt-3 grid gap-2 text-xs font-bold text-slate-500">
                    <p className="inline-flex items-center gap-2"><CalendarDays size={14} /> {formatDateTime(event.startsAt)} - {event.endsAt ? new Date(event.endsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'End TBA'}</p>
                    <p className="inline-flex items-center gap-2"><MapPin size={14} /> {event.venue || 'Venue TBA'} {event.location ? `- ${event.location}` : ''}</p>
                </div>
            </div>

            <div className="space-y-4 p-4 md:p-5">
                <div className="rounded-2xl bg-slate-50 p-3 md:p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-black uppercase text-slate-500">Capacity Reach</p>
                        <p className="text-sm font-black text-slate-950">{event.confirmedSeats}/{event.capacity}</p>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-slate-200">
                        <div className={cx('h-2 rounded-full', isFull ? 'bg-red-500' : 'bg-blue-600')} style={{ width: `${percent}%` }} />
                    </div>
                </div>

                <div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">Registered Parties</p>
                    <div className="mt-2 flex flex-wrap gap-2 md:mt-3">
                        {registeredParties.slice(0, 4).map((party) => <span key={party} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{party}</span>)}
                        {registeredParties.length > 4 && <span className="rounded-md bg-slate-200 px-2.5 py-1 text-xs font-black text-slate-600">+{registeredParties.length - 4} more</span>}
                        {registeredParties.length === 0 && <span className="text-xs font-semibold text-slate-500">No registration records for this event.</span>}
                    </div>
                </div>

                <div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">Capacity Note</p>
                    <p className={cx('mt-2 rounded-xl border-l-4 p-3 text-xs font-semibold leading-5 md:mt-3', isFull ? 'border-red-300 bg-red-50 text-red-800' : 'border-emerald-300 bg-emerald-50 text-emerald-800')}>
                        {isFull ? 'No seats remain based on the current capacity and confirmed registration count.' : `${openSeats.toLocaleString()} seat${openSeats === 1 ? '' : 's'} remain based on the current capacity and confirmed registration count.`}
                    </p>
                </div>
            </div>
        </aside>
    );
}

function MessageCenterSection({ csrf, registrations = [], messages = [], events = [], role }) {
    const threads = messageThreadsForRole(role, messages, registrations);
    const [activeId, setActiveId] = useState(threads[0]?.id || 'general');
    const [filter, setFilter] = useState('active');
    const [mobileChatOpen, setMobileChatOpen] = useState(false);
    const [mobileCategory, setMobileCategory] = useState('all');
    const [draft, setDraft] = useState('');
    const [recipientScope, setRecipientScope] = useState('');
    const [localMessages, setLocalMessages] = useState({});
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState('');
    const activeThread = threads.find((thread) => thread.id === activeId) || threads[0];
    const activeMessages = [...(activeThread?.messages || []), ...(localMessages[activeThread?.id] || [])];
    const visibleThreads = threads.filter((thread) => {
        const archiveMatch = filter === 'archived' ? thread.archived : !thread.archived;
        const categoryMatch = mobileCategory === 'all' || thread.category === mobileCategory;
        return archiveMatch && categoryMatch;
    });
    const scopeOptions = role === 'admin'
        ? [['all', 'All parties'], ['universities', 'Universities'], ['schools', 'Schools'], ['students', 'Students']]
        : role === 'university'
            ? [['schools', 'Schools'], ['students', 'Students']]
            : role === 'school'
                ? [['universities', 'Universities'], ['students', 'Students']]
                : [['universities', 'Universities'], ['schools', 'Schools']];
    const mobileCategories = [['all', 'All'], ['admissions', 'Admissions'], ['students', 'Students'], ['parents', 'Parents']].filter(([value]) => value === 'all' || threads.some((thread) => thread.category === value));
    const currentScope = recipientScope || scopeOptions[0][0];
    const handleThreadOpen = (thread) => {
        setActiveId(thread.id);
        setMobileChatOpen(true);
        setSendError('');
    };
    const submitMessage = async (event) => {
        event.preventDefault();
        const body = draft.trim();
        if (!body || sending || !activeThread) return;

        setSending(true);
        setSendError('');

        try {
            const payload = new URLSearchParams();
            payload.set('_token', csrf);
            payload.set('recipient_scope', currentScope);
            payload.set('channel', 'email');
            payload.set('content', body);

            const response = await fetch('/dashboard/messages', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Accept': 'text/html, application/xhtml+xml',
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: payload.toString(),
            });

            if (!response.ok) {
                throw new Error('Message could not be sent.');
            }

            const optimistic = {
                id: `local-${Date.now()}`,
                author: 'You',
                time: 'Now',
                body,
                mine: true,
            };
            setLocalMessages((current) => ({
                ...current,
                [activeThread.id]: [...(current[activeThread.id] || []), optimistic],
            }));
            setDraft('');
        } catch (error) {
            setSendError(error.message || 'Message could not be sent.');
        } finally {
            setSending(false);
        }
    };

    return (
        <section className="grid gap-4">
            {role === 'university' && <UniversityNotificationAutomation csrf={csrf} events={events} registrations={registrations} messages={messages} />}
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:min-h-[680px]">
            <div className="grid min-h-[calc(100dvh-9rem)] md:min-h-[680px] lg:grid-cols-[340px_1fr]">
                <aside className={cx('border-b border-slate-200 bg-slate-50 lg:border-b-0 lg:border-r', mobileChatOpen && 'hidden lg:block')}>
                    <div className="border-b border-slate-200 p-3 md:p-4">
                        <label className="relative mb-3 block lg:hidden">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="search"
                                placeholder="Search conversations..."
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold outline-none focus:border-[#006a61] focus:ring-4 focus:ring-emerald-50"
                                onChange={(event) => {
                                    const value = event.target.value.trim().toLowerCase();
                                    if (!value) return;
                                    const found = threads.find((thread) => `${thread.name} ${thread.subtitle} ${thread.preview}`.toLowerCase().includes(value));
                                    if (found) setActiveId(found.id);
                                }}
                            />
                        </label>
                        <div className="flex items-center justify-between">
                        <div className="flex rounded-lg bg-slate-200/70 p-1">
                            {['active', 'archived'].map((item) => (
                                <button key={item} type="button" onClick={() => setFilter(item)} className={cx('rounded-md px-3 py-1.5 text-xs font-black capitalize', filter === item ? 'bg-slate-950 text-white' : 'text-slate-500')}>
                                    {item}
                                </button>
                            ))}
                        </div>
                        <button type="button" className="grid h-8 w-8 place-items-center rounded-lg text-blue-700 hover:bg-white" aria-label="Filter messages"><Filter size={15} /></button>
                        </div>
                        <div className="mt-3 flex gap-2 overflow-x-auto [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
                            {mobileCategories.map(([value, label]) => (
                                <button key={value} type="button" onClick={() => setMobileCategory(value)} className={cx('shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-black', mobileCategory === value ? 'bg-[#006a61] text-white' : 'border border-slate-200 bg-white text-slate-600')}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="divide-y divide-slate-100 p-2 md:p-0">
                        {visibleThreads.map((thread) => (
                            <button key={thread.id} type="button" onClick={() => handleThreadOpen(thread)} className={cx('flex w-full gap-3 rounded-xl px-3 py-3 text-left transition md:rounded-none md:px-4 md:py-4', activeThread?.id === thread.id ? 'bg-white shadow-sm md:shadow-none' : 'hover:bg-white/70')}>
                                <span className={cx('relative grid h-11 w-11 shrink-0 place-items-center rounded-full text-xs font-black text-white md:rounded-lg', thread.color)}>
                                    {thread.initials}
                                    {thread.online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-[#006a61]" />}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center justify-between gap-2">
                                        <span className="truncate text-[15px] font-black text-slate-950 md:text-sm">{thread.name}</span>
                                        <span className="shrink-0 text-[11px] font-bold text-blue-700">{thread.time}</span>
                                    </span>
                                    <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">{thread.subtitle}</span>
                                    <span className={cx('mt-1 block truncate text-sm md:text-xs', thread.unread ? 'font-bold text-slate-800' : 'text-slate-400')}>{thread.preview}</span>
                                    <span className="mt-2 inline-flex rounded bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-500 md:hidden">{thread.categoryLabel}</span>
                                </span>
                                {thread.unread && <span className="mt-6 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#006a61] text-[10px] font-black text-white">{thread.unreadCount || 1}</span>}
                            </button>
                        ))}
                        {!visibleThreads.length && <div className="p-8 text-center text-sm font-semibold text-slate-500">No conversations match this filter.</div>}
                    </div>
                </aside>

                <main className={cx('min-h-[calc(100dvh-9rem)] flex-col bg-slate-100/60 md:min-h-[680px] lg:flex', mobileChatOpen ? 'flex' : 'hidden lg:flex')}>
                    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-3 py-3 md:px-5 md:py-4">
                        <div className="flex items-center gap-3">
                            <button type="button" onClick={() => setMobileChatOpen(false)} className="grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Back to conversations">
                                <ChevronRight size={18} className="rotate-180" />
                            </button>
                            <span className={cx('grid h-10 w-10 place-items-center rounded-full text-xs font-black text-white md:rounded-lg', activeThread.color)}>{activeThread.initials}</span>
                            <div className="min-w-0">
                                <h2 className="truncate font-black text-slate-950">{activeThread.name}</h2>
                                <p className="truncate text-xs font-semibold text-slate-500">{activeThread.subtitle}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-blue-700">
                            <button type="button" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-blue-50" aria-label="View contact"><UsersRound size={16} /></button>
                            <button type="button" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-blue-50" aria-label="More message actions"><MoreVertical size={16} /></button>
                        </div>
                    </header>

                    <div className="flex-1 space-y-4 overflow-y-auto p-3 md:space-y-5 md:p-5">
                        <div className="mx-auto w-fit rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-400 shadow-sm">Today</div>
                        {activeMessages.map((message) => (
                            <div key={message.id} className={cx('flex gap-3', message.mine && 'justify-end')}>
                                {!message.mine && <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-black text-white md:rounded-lg', activeThread.color)}>{activeThread.initials}</span>}
                                <div className={cx('max-w-[78%] md:max-w-[72%]', message.mine && 'text-right')}>
                                    <p className="mb-1 text-[11px] font-bold text-slate-400">{message.author} · {message.time}</p>
                                    <div className={cx('rounded-2xl px-3.5 py-2.5 text-sm leading-6 shadow-sm md:rounded-xl md:px-4 md:py-3', message.mine ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-700')}>
                                        {message.body}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <span className="inline-flex rounded bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700">Sentiment: Positive</span>
                    </div>

                    <form action="/dashboard/messages" method="POST" data-no-submit-lock="true" onSubmit={submitMessage} className="sticky bottom-0 border-t border-slate-200 bg-white p-3 md:p-4">
                        <input type="hidden" name="_token" value={csrf} />
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 md:mb-3 md:gap-3">
                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                                <input type="checkbox" className="rounded border-slate-300 text-blue-600" />
                                Broadcast to selected group
                            </label>
                            <div className="flex items-center gap-2">
                                <select name="recipient_scope" value={currentScope} onChange={(event) => setRecipientScope(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs font-bold text-slate-600 outline-none md:px-3">
                                    {scopeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                </select>
                                <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs font-bold text-slate-600 md:px-3">Email</span>
                                <button type="button" className="hidden h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-50 md:grid" aria-label="Attach file"><Paperclip size={16} /></button>
                            </div>
                        </div>
                        {sendError && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{sendError}</p>}
                        <div className="flex gap-2 md:gap-3">
                            <textarea name="content" value={draft} onChange={(event) => setDraft(event.target.value)} required rows="1" placeholder="Type your message here..." className="min-h-11 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#006a61] focus:ring-4 focus:ring-emerald-50 md:min-h-16 md:rounded-lg" />
                            <button disabled={!draft.trim() || sending} className="grid h-11 w-12 shrink-0 place-items-center rounded-xl bg-slate-950 text-white hover:bg-[#006a61] disabled:cursor-not-allowed disabled:bg-slate-300 md:h-16 md:w-14 md:rounded-lg" aria-label="Send message">
                                {sending ? <RefreshCcw size={18} className="animate-spin" /> : <Send size={20} />}
                            </button>
                        </div>
                    </form>
                </main>
            </div>
            </section>
        </section>
    );
}

function UniversityNotificationAutomation({ csrf, events = [], registrations = [], messages = [] }) {
    const universityEvents = events.filter((event) => event.status !== 'cancelled');
    const [selectedEventId, setSelectedEventId] = useState(universityEvents[0]?.id || '');
    const [noticeType, setNoticeType] = useState('update');
    const selectedEvent = universityEvents.find((event) => String(event.id) === String(selectedEventId)) || universityEvents[0];
    const eventRegistrations = registrations.filter((item) => Number(item.eventId) === Number(selectedEvent?.id));
    const schools = [...new Set(eventRegistrations.filter((item) => item.type === 'school_group').map((item) => item.name).filter(Boolean))];
    const students = eventRegistrations.filter((item) => item.type !== 'school_group');
    const history = messages.filter((message) => !selectedEvent || Number(message.eventId) === Number(selectedEvent.id));
    const failed = history.filter((message) => message.status === 'failed');
    const queued = history.filter((message) => message.status === 'queued');
    const sent = history.filter((message) => message.status === 'sent');
    const noticeTemplates = {
        update: {
            subject: selectedEvent ? `Update: ${selectedEvent.title}` : 'Visit update',
            body: selectedEvent ? `There is an update for ${selectedEvent.title}. The visit is scheduled for ${formatDateTime(selectedEvent.startsAt)} at ${selectedEvent.venue || selectedEvent.location || 'campus'}. Please review your visit details.` : '',
        },
        cancellation: {
            subject: selectedEvent ? `Cancelled: ${selectedEvent.title}` : 'Visit cancelled',
            body: selectedEvent ? `${selectedEvent.title} has been cancelled. We will share a replacement visit option once confirmed.` : '',
        },
        reminder: {
            subject: selectedEvent ? `Reminder: ${selectedEvent.title}` : 'Visit reminder',
            body: selectedEvent ? `Reminder: ${selectedEvent.title} is scheduled for ${formatDateTime(selectedEvent.startsAt)} at ${selectedEvent.venue || selectedEvent.location || 'campus'}. Please confirm logistics before arrival.` : '',
        },
    };
    const template = noticeTemplates[noticeType];

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#006a61]">Automation</p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">Notifications & Reminders</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">Schedule reminders, preview notices, target recipients, track delivery, and retry failed messages.</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <MiniStat label="Queued" value={queued.length} />
                    <MiniStat label="Sent" value={sent.length} />
                    <MiniStat label="Failed" value={failed.length} />
                </div>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
                <section className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <div className="grid gap-3 md:grid-cols-[1fr_150px_130px_auto] md:items-end">
                        <label className="text-sm font-bold text-slate-700">Visit program<select value={selectedEventId} onChange={(event) => setSelectedEventId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#006a61]">
                            {universityEvents.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
                        </select></label>
                        <form action={selectedEvent ? `/dashboard/university/programs/${selectedEvent.id}/reminder-settings` : '#'} method="POST" className="contents">
                            <input type="hidden" name="_token" value={csrf} />
                            <label className="text-sm font-bold text-slate-700">Days before<input name="reminder_days_before" type="number" min="0" max="60" defaultValue={selectedEvent?.reminderDaysBefore || 7} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#006a61]" /></label>
                            <label className="text-sm font-bold text-slate-700">Time<input name="reminder_time" type="time" defaultValue={selectedEvent?.reminderTime || '09:00'} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#006a61]" /></label>
                            <div className="grid gap-2">
                                <label className="flex items-center gap-2 text-xs font-black text-slate-600"><input type="checkbox" name="reminders_enabled" value="1" defaultChecked={selectedEvent?.remindersEnabled !== false} className="rounded border-slate-300 text-[#006a61]" /> Enabled</label>
                                <button disabled={!selectedEvent} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white disabled:bg-slate-300">Save rule</button>
                            </div>
                        </form>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <form action={selectedEvent ? `/dashboard/university/programs/${selectedEvent.id}/queue-reminders` : '#'} method="POST">
                            <input type="hidden" name="_token" value={csrf} />
                            <button disabled={!selectedEvent} className="rounded-xl border border-[#006a61]/30 bg-white px-3 py-2 text-xs font-black text-[#006a61] disabled:text-slate-300">Queue reminders now</button>
                        </form>
                        <span className="text-xs font-semibold text-slate-500">{eventRegistrations.length} recipient record(s) · {schools.length} school group(s) · {students.length} student(s)</span>
                    </div>
                </section>

                <form action="/dashboard/university/notices" method="POST" className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <input type="hidden" name="_token" value={csrf} />
                    <input type="hidden" name="campus_event_id" value={selectedEvent?.id || ''} />
                    <div className="grid gap-3 md:grid-cols-3">
                        <label className="text-sm font-bold text-slate-700">Notice type<select name="notice_type" value={noticeType} onChange={(event) => setNoticeType(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#006a61]"><option value="update">Update</option><option value="cancellation">Cancellation</option><option value="reminder">Reminder</option></select></label>
                        <label className="text-sm font-bold text-slate-700">Target<select name="target_scope" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#006a61]"><option value="all">All attendees</option><option value="confirmed">Confirmed only</option><option value="waitlisted">Waitlisted only</option><option value="schools">Schools only</option><option value="students">Students only</option></select></label>
                        <label className="text-sm font-bold text-slate-700">Channel<input type="hidden" name="channel" value="email" /><span className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600">Email</span></label>
                    </div>
                    <div className="mt-3 grid gap-3">
                        <LightField label="Subject preview" name="subject" defaultValue={template.subject} />
                        <label className="text-sm font-bold text-slate-700">Notice body<textarea name="body" rows="4" defaultValue={template.body} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#006a61]" /></label>
                        <button disabled={!selectedEvent} className="rounded-xl bg-[#006a61] px-4 py-2.5 text-sm font-black text-white disabled:bg-slate-300">Queue Targeted Notice</button>
                    </div>
                </form>
            </div>

            <section className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
                <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
                    <h3 className="text-sm font-black text-slate-950">Notification history</h3>
                    <span className="text-xs font-bold text-slate-500">{history.length} record(s)</span>
                </div>
                <div className="divide-y divide-slate-100">
                    {history.length === 0 ? <EmptyState message="No notification history yet for this program." /> : history.slice(0, 10).map((message) => (
                        <article key={message.id} className="grid gap-3 p-3 md:grid-cols-[1fr_auto] md:items-center">
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-black text-slate-950">{message.subject}</p>
                                    <span className={cx('rounded-full px-2 py-1 text-[10px] font-black uppercase', message.status === 'sent' ? 'bg-emerald-50 text-emerald-700' : message.status === 'failed' ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700')}>{message.status}</span>
                                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-500">{message.notificationType || 'general'}</span>
                                </div>
                                <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">{message.recipient || message.metadata?.registrant_email || 'Recipient pending'} · {message.channel?.toUpperCase()} · Scheduled {formatShortDate(message.scheduledFor || message.createdAt)}</p>
                                {message.failureReason && <p className="mt-1 text-xs font-bold text-rose-700">{message.failureReason}</p>}
                            </div>
                            {message.status === 'failed' && (
                                <form action={`/dashboard/university/notifications/${message.id}/retry`} method="POST">
                                    <input type="hidden" name="_token" value={csrf} />
                                    <button className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-black text-rose-700">Retry</button>
                                </form>
                            )}
                        </article>
                    ))}
                </div>
            </section>
        </section>
    );
}

function messageThreadsForRole(role, dbMessages, registrations) {
    const queuedMessages = dbMessages.slice(0, 4).map((message, index) => ({
        id: `db-${message.id}`,
        name: message.recipient || 'Platform recipient',
        subtitle: `${message.channel?.toUpperCase() || 'EMAIL'} · ${message.status}`,
        preview: message.body || message.subject,
        time: formatShortTime(message.createdAt),
        initials: initials(message.recipient || 'PR'),
        color: 'bg-blue-700',
        category: message.recipientType || 'admissions',
        categoryLabel: titleCase(message.recipientType || 'Admissions'),
        online: index === 0,
        unread: index === 0,
        unreadCount: index === 0 ? 1 : 0,
        archived: false,
        messages: [
            { id: `db-${message.id}-a`, author: 'Platform', time: formatShortTime(message.createdAt), body: message.subject || 'New campus visit message', mine: false },
            { id: `db-${message.id}-b`, author: 'You', time: formatShortTime(message.createdAt), body: message.body || 'Message queued for delivery.', mine: true },
        ],
    }));
    return queuedMessages;
}

function initials(value) {
    return String(value || 'NA').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function titleCase(value) {
    return String(value || '')
        .replace(/[-_]/g, ' ')
        .replace(/\w\S*/g, (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());
}

function formatShortTime(value) {
    if (!value) return 'Now';
    return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function openStreetMapUrl(location) {
    return `https://www.openstreetmap.org/search?query=${encodeURIComponent(location || 'United States')}`;
}

function openStreetMapEmbedUrl(location) {
    return `https://www.openstreetmap.org/export/embed.html?layer=mapnik&query=${encodeURIComponent(location || 'United States')}`;
}

const knownMapCoordinates = {
    'United States': [39.8283, -98.5795],
    'Pacific Northwest': [45.5152, -122.6784],
    Northeast: [42.3601, -71.0589],
    South: [30.2672, -97.7431],
    Midwest: [41.8781, -87.6298],
    Europe: [50.1109, 8.6821],
    'West Africa': [6.5244, 3.3792],
    Boston: [42.3601, -71.0589],
    Cambridge: [42.3736, -71.1097],
    Providence: [41.824, -71.4128],
    Seattle: [47.6062, -122.3321],
    Portland: [45.5152, -122.6784],
    Stanford: [37.4275, -122.1697],
    'Palo Alto': [37.4419, -122.143],
};

function coordinatesForLocation(location, index = 0) {
    const label = String(location || '').toLowerCase();
    const exact = Object.entries(knownMapCoordinates).find(([key]) => label.includes(key.toLowerCase()));
    const base = exact ? exact[1] : knownMapCoordinates['United States'];
    return [base[0] + index * 0.025, base[1] + index * 0.025];
}

function safeCoordinate(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function normalizeMapPoints({ points = [], location, title }) {
    const rows = points.length ? points : [{ label: title || location || 'Location', location }];
    return rows.map((point, index) => {
        const fallbackLocation = point.location || point.address || point.region || point.city || location;
        const latitude = safeCoordinate(point.latitude);
        const longitude = safeCoordinate(point.longitude);
        const coords = latitude !== null && longitude !== null
            ? [latitude, longitude]
            : coordinatesForLocation(fallbackLocation, index);

        return {
            ...point,
            label: point.label || point.name || point.title || fallbackLocation || `Marker ${index + 1}`,
            location: fallbackLocation,
            latitude: coords[0],
            longitude: coords[1],
        };
    });
}

function OpenStreetMapEmbed({ location, points = [], title = 'OpenStreetMap location', className = 'h-48' }) {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const [mapError, setMapError] = useState(false);
    const pointRows = Array.isArray(points) ? points : [];
    const pointSignature = JSON.stringify(pointRows.map((point) => [point?.label, point?.location, point?.latitude, point?.longitude, point?.meta]));
    const markerPoints = useMemo(() => normalizeMapPoints({ points: pointRows, location, title }), [pointSignature, location, title]);

    useEffect(() => {
        if (!containerRef.current || markerPoints.length === 0) return undefined;

        let cancelled = false;
        let map = null;
        void (async () => {
            try {
                const { default: L } = await import('leaflet');
                if (cancelled || !containerRef.current) return;

                if (mapRef.current) {
                    mapRef.current.remove();
                    mapRef.current = null;
                }

                map = L.map(containerRef.current, {
                    scrollWheelZoom: false,
                    attributionControl: true,
                });
                mapRef.current = map;

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '&copy; OpenStreetMap contributors',
                }).addTo(map);

                const bounds = [];
                markerPoints.forEach((point, index) => {
                    const latLng = [point.latitude, point.longitude];
                    bounds.push(latLng);
                    const marker = L.marker(latLng, {
                        icon: L.divIcon({
                            className: '',
                            html: `<span style="display:grid;place-items:center;width:30px;height:30px;border-radius:999px;background:#0f172a;color:#fff;border:3px solid #fff;box-shadow:0 10px 25px rgba(15,23,42,.25);font-size:11px;font-weight:900;">${index + 1}</span>`,
                            iconSize: [30, 30],
                            iconAnchor: [15, 15],
                        }),
                    }).addTo(map);
                    const popup = document.createElement('div');
                    const heading = document.createElement('strong');
                    heading.textContent = point.label;
                    popup.appendChild(heading);
                    [point.location, point.meta].filter(Boolean).forEach((value) => {
                        popup.appendChild(document.createElement('br'));
                        popup.appendChild(document.createTextNode(String(value)));
                    });
                    marker.bindPopup(popup);
                });

                if (bounds.length === 1) {
                    map.setView(bounds[0], 11);
                } else {
                    map.fitBounds(bounds, { padding: [26, 26], maxZoom: 11 });
                }
                setMapError(false);
            } catch (error) {
                console.error('OpenStreetMap failed to initialize', error);
                setMapError(true);
                if (map) {
                    try { map.remove(); } catch (_) { /* Map was only partially initialized. */ }
                }
                mapRef.current = null;
            }
        })();

        return () => {
            cancelled = true;
            if (mapRef.current === map && map) {
                try { map.remove(); } catch (_) { /* Map may already be detached. */ }
            }
            mapRef.current = null;
        };
    }, [markerPoints]);

    return (
        <div className={cx('overflow-hidden rounded-xl border border-slate-200 bg-slate-100', className)}>
            <div ref={containerRef} role="img" aria-label={title} className={cx('h-full w-full', mapError && 'hidden')} />
            {mapError && (
                <div className="grid h-full min-h-48 place-items-center p-6 text-center">
                    <div>
                        <MapPin className="mx-auto text-blue-600" size={24} />
                        <p className="mt-3 text-sm font-black text-slate-900">Route map is temporarily unavailable</p>
                        <a href={openStreetMapUrl(location)} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs font-black text-blue-700">Open this route in OpenStreetMap</a>
                    </div>
                </div>
            )}
        </div>
    );
}

function OpenStreetMapLink({ location, children, className }) {
    return <a href={openStreetMapUrl(location)} target="_blank" rel="noreferrer" className={className}>{children || 'Open in OpenStreetMap'}</a>;
}

function PartnerSchoolsSection({ csrf, schools, visitRequests, archives = [] }) {
    const [tab, setTab] = useState('all');
    const [query, setQuery] = useState('');
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [editor, setEditor] = useState(null);
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const visibleSchools = schools.filter((school) => {
        const matchesQuery = !query || `${school.name} ${school.city} ${school.region}`.toLowerCase().includes(query.toLowerCase());
        const matchesTab = tab === 'all'
            || (tab === 'ivy' && school.tier === 'elite')
            || (tab === 'tech' && /science|tech|engineering/i.test(school.name));

        return matchesQuery && matchesTab;
    });
    const engagementTotal = schools.reduce((total, school) => total + Number(school.activeApplicants || 0), 0);
    const scheduledVisits = visitRequests.filter((request) => ['approved', 'scheduled', 'requested'].includes(request.status)).length;
    const relationshipTasks = schools.reduce((total, school) => total + Number(school.taskCount || 0), 0);
    const schoolVisits = (school) => {
        const requested = visitRequests.filter((request) => request.schoolId === school.id).length;
        const completed = archives.filter((archive) => archive.schoolId === school.id || archive.school === school.name).length;

        return requested + completed;
    };
    const openSchoolDetail = (school) => {
        setSelectedSchool(school);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (selectedSchool) {
        return (
            <PartnerSchoolDetail
                csrf={csrf}
                school={selectedSchool}
                archives={archives.filter((archive) => archive.schoolId === selectedSchool.id || archive.school === selectedSchool.name)}
                visitsCount={schoolVisits(selectedSchool)}
                onBack={() => setSelectedSchool(null)}
                onEdit={() => { setEditor(selectedSchool); setSelectedSchool(null); }}
            />
        );
    }

    return (
        <div className="grid gap-4 md:gap-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div><h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">Partner Schools</h1><p className="mt-1 text-sm font-semibold text-slate-500">Manage institutional relationships and student engagement analytics.</p></div>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                    <button type="button" onClick={() => setEditor({})} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#006a61] px-4 py-2.5 text-sm font-black text-white"><Plus size={16} /> Add School</button>
                    <button type="button" onClick={() => document.getElementById('partner-school-search')?.focus()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"><Search size={16} /> Find Schools</button>
                </div>
            </div>
            {editor && <PartnerSchoolEditor csrf={csrf} school={editor.id ? editor : null} onClose={() => setEditor(null)} />}

            <div className="grid grid-cols-2 gap-2 md:grid-cols-2 md:gap-4 xl:grid-cols-4">
                <PartnerMetric label="Total Partnerships" value={schools.length} detail="Stored partner records" />
                <PartnerMetric label="Active Engagements" value={engagementTotal.toLocaleString()} detail="Active applicant records" tone="green" />
                <PartnerMetric label="Open Visit Activity" value={scheduledVisits} detail="Requested, approved, or scheduled" />
                <section className="rounded-xl bg-emerald-600 p-3 text-white shadow-sm md:p-4"><p className="text-[10px] font-black uppercase tracking-wide text-white/70 md:text-xs">Relationship Tasks</p><p className="mt-2 text-xl font-black">{relationshipTasks.toLocaleString()}</p><p className="mt-1 text-xs text-white/80">Saved follow-up actions</p></section>
            </div>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-200 px-3 py-3 md:flex-row md:items-center md:justify-between md:px-4">
                    <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {[['all', 'All Schools'], ['ivy', 'Elite'], ['tech', 'Tech']].map(([id, label]) => <button key={id} type="button" onClick={() => setTab(id)} className={cx('shrink-0 rounded-full px-3 py-1.5 text-[12px] font-black md:rounded-lg md:px-3 md:py-2 md:text-xs', tab === id ? 'bg-[#006a61] text-white md:bg-blue-600' : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 md:border-0')}>{label}</button>)}
                    </div>
                    <button type="button" onClick={() => setAdvancedOpen(!advancedOpen)} className="inline-flex items-center gap-2 text-xs font-bold text-slate-500"><Filter size={14} /> Advanced Filters</button>
                </div>
                <div className="grid gap-3 border-b border-slate-100 p-3 md:grid-cols-[1fr_auto] md:p-4">
                    <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500"><Search size={15} /><input id="partner-school-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search schools, cities, or states..." className="min-w-0 flex-1 bg-transparent font-semibold outline-none" /></label>
                    {advancedOpen && <button type="button" onClick={() => { setTab('all'); setQuery(''); }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Clear filters</button>}
                </div>
                <div className="grid gap-2 p-3 md:hidden">
                    {visibleSchools.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm font-semibold text-slate-500">No partner schools match these filters.</div> : visibleSchools.map((school) => (
                        <article key={school.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                            <div className="grid grid-cols-[42px_minmax(0,1fr)_auto] gap-3">
                                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e5eeff] text-xs font-black text-blue-700">{school.name.slice(0, 1)}</span>
                                <div className="min-w-0">
                                    <h3 className="truncate text-sm font-black text-slate-950">{school.name}</h3>
                                    <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">{school.city}, {school.country}</p>
                                </div>
                                <span className="h-fit rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">{school.matchScore}/100</span>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-2 border-y border-slate-100 py-2">
                                <div><span className="block text-[9px] font-black uppercase text-slate-400">Type</span><span className="mt-0.5 block truncate text-[12px] font-black text-slate-700">{school.type?.replace('_', ' ') || 'Partner school'}</span></div>
                                <div><span className="block text-[9px] font-black uppercase text-slate-400">Visits</span><span className="mt-0.5 block text-[12px] font-black text-slate-700">{schoolVisits(school)}</span></div>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-2">
                                <button type="button" onClick={() => openSchoolDetail(school)} className="rounded-lg bg-slate-950 px-3 py-2 text-[12px] font-black text-white">View Profile</button>
                                {school.canManage ? <button type="button" onClick={() => setEditor(school)} className="rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-black text-slate-700">Edit</button> : <button type="button" onClick={() => openSchoolDetail(school)} className="rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-black text-slate-700">Details</button>}
                            </div>
                        </article>
                    ))}
                </div>
                <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">School Name</th><th className="px-5 py-4">Location</th><th className="px-5 py-4">Saved Priority</th><th className="px-5 py-4">Visits</th><th className="px-5 py-4">Tasks</th><th className="px-5 py-4 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-200">{visibleSchools.length === 0 ? <tr><td colSpan="6" className="px-5 py-12 text-center text-slate-500">No partner schools match these filters.</td></tr> : visibleSchools.map((school) => <tr key={school.id} className="hover:bg-blue-50/30"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded bg-blue-100 text-xs font-black text-blue-700">{school.name.slice(0, 1)}</span><div><p className="font-black text-slate-950">{school.name}</p><p className="text-xs text-slate-400">{school.type?.replace('_', ' ') || 'Partner school'} - {school.tier}</p></div></div></td><td className="px-5 py-4 text-slate-600"><span className="inline-flex items-center gap-1"><MapPin size={13} /> {school.city}, {school.country}</span></td><td className="px-5 py-4"><PartnerScore school={school} /></td><td className="px-5 py-4 font-bold text-slate-700">{schoolVisits(school)}</td><td className="px-5 py-4 font-bold text-slate-700">{school.taskCount || 0}</td><td className="px-5 py-4 text-right"><div className="flex justify-end gap-2"><button type="button" onClick={() => openSchoolDetail(school)} className="rounded-lg border border-blue-100 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-50">View</button>{school.canManage && <button type="button" onClick={() => setEditor(school)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">Edit</button>}</div></td></tr>)}</tbody></table></div>
                <div className="flex items-center justify-between border-t border-slate-200 px-3 py-3 text-xs text-slate-500 md:px-5 md:py-4"><span>Showing {visibleSchools.length} of {schools.length} partner schools</span><span className="hidden md:inline">Live partner records</span></div>
            </section>

            <section className="rounded-xl border border-blue-200 bg-blue-50 p-4 md:p-6"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2 text-sm font-black text-slate-950"><Sparkles size={18} className="text-blue-600" /> School Priorities</div><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 md:mt-3">Relationship scores, applicant counts, visit history, and tasks come from the saved partner-school records above.</p></div><div className="grid grid-cols-2 gap-2 md:flex"><button type="button" onClick={() => setTab('ivy')} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white md:px-4 md:py-2.5 md:text-sm">Review Elite</button><button type="button" onClick={() => setTab('all')} className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-black text-blue-700 md:px-4 md:py-2.5 md:text-sm">Show All</button></div></div></section>
        </div>
    );
}

function PartnerMetric({ label, value, detail, tone = 'blue' }) {
    return <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:p-4"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400 md:text-[11px]">{label}</p><p className="mt-2 text-xl font-black text-slate-950 md:text-2xl">{value}</p><p className={cx('mt-1 text-[11px] font-bold md:text-xs', tone === 'green' ? 'text-emerald-600' : 'text-blue-600')}>{detail}</p></section>;
}

function PartnerSchoolEditor({ csrf, school, onClose }) {
    const isEdit = Boolean(school);
    const value = (key, fallback = '') => school?.[key] ?? fallback;

    return (
        <section className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/55 px-3 py-5 backdrop-blur-sm">
            <form action={isEdit ? `/dashboard/university/partner-schools/${school.id}` : '/dashboard/university/partner-schools'} method="POST" className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl">
                <input type="hidden" name="_token" value={csrf} />
                {isEdit && <input type="hidden" name="_method" value="PUT" />}
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-4 md:p-5">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#006a61]">{isEdit ? 'Edit partner school' : 'Add partner school'}</p>
                        <h2 className="mt-1 text-xl font-black text-slate-950 md:text-2xl">{isEdit ? school.name : 'New School Relationship'}</h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500">Manage tier, priority signals, contact details, and internal notes.</p>
                    </div>
                    <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm"><X size={18} /></button>
                </div>
                <div className="grid gap-4 overflow-y-auto p-4 md:grid-cols-2 md:p-5">
                    <LightField label="School code" name="school_code" defaultValue={value('code')} />
                    <LightField label="School name" name="name" defaultValue={value('name')} />
                    <LightField label="City" name="city" defaultValue={value('city')} />
                    <LightField label="Region / State" name="region" defaultValue={value('region')} />
                    <LightField label="Country" name="country" defaultValue={value('country', 'United States')} />
                    <LightField label="District" name="district" defaultValue={value('district')} />
                    <LightField label="Coordinator name" name="coordinator_name" defaultValue={value('coordinatorName')} />
                    <LightField label="Coordinator email" name="coordinator_email" type="email" defaultValue={value('coordinatorEmail')} />
                    <label className="text-sm font-semibold text-slate-700">Status<select name="status" defaultValue={value('status', 'verified')} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="verified">Verified</option><option value="pending">Pending</option><option value="suspended">Suspended</option></select></label>
                    <label className="text-sm font-semibold text-slate-700">School type<select name="school_type" defaultValue={value('type', 'private')} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="public">Public</option><option value="private">Private</option><option value="ib_school">IB School</option><option value="charter">Charter</option></select></label>
                    <label className="text-sm font-semibold text-slate-700">Relationship tier<select name="performance_tier" defaultValue={value('tier', 'stable')} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="elite">Elite</option><option value="high">High</option><option value="emerging">Emerging</option><option value="stable">Stable</option></select></label>
                    <LightField label="Average SAT" name="average_sat" type="number" min="400" max="1600" defaultValue={value('sat')} />
                    <LightField label="Yield rate" name="yield_rate" type="number" min="0" max="100" step="0.01" defaultValue={value('yieldRate', 0)} />
                    <LightField label="Saved priority score" name="match_score" type="number" min="0" max="100" defaultValue={value('matchScore', 75)} />
                    <LightField label="Active applicants" name="active_applicants" type="number" min="0" defaultValue={value('activeApplicants', 0)} />
                    <div className="md:col-span-2"><LightTextarea label="Persistent internal notes" name="notes" defaultValue={value('notes')} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-4">
                    <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">Cancel</button>
                    <button className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">{isEdit ? 'Save Changes' : 'Add School'}</button>
                </div>
            </form>
        </section>
    );
}

function PartnerSchoolDetail({ csrf, school, archives, visitsCount, onBack, onEdit }) {
    const [trendPeriod, setTrendPeriod] = useState('yearly');
    const [showAllHistory, setShowAllHistory] = useState(false);
    const leadsCaptured = archives.reduce((total, archive) => total + Number(archive.leads || 0), 0);
    const relationshipYear = school.createdAt && !Number.isNaN(new Date(school.createdAt).getTime())
        ? new Date(school.createdAt).getFullYear()
        : null;
    const historyRows = showAllHistory ? archives : archives.slice(0, 4);
    const relationshipScore = Number(school.matchScore || 0);
    const recordedSignals = [
        `${Number(school.activeApplicants || 0).toLocaleString()} active applicant record(s)`,
        `${archives.length.toLocaleString()} archived campus engagement(s)`,
        `${Number(school.taskCount || 0).toLocaleString()} saved relationship task(s)`,
    ];
    const coordinatorName = school.coordinatorName && school.coordinatorName !== 'Coordinator pending'
        ? school.coordinatorName
        : 'Coordinator pending';
    const hasExactCoordinates = school.latitude !== null && school.latitude !== undefined && school.latitude !== ''
        && school.longitude !== null && school.longitude !== undefined && school.longitude !== ''
        && Number.isFinite(Number(school.latitude)) && Number.isFinite(Number(school.longitude));

    return (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm lg:p-5">
            <button type="button" onClick={onBack} className="mb-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-sm hover:border-blue-200 hover:text-blue-700">
                <ChevronRight size={14} className="rotate-180" /> Back to Schools
            </button>
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-sm font-black text-blue-700 shadow-sm">{school.name.slice(0, 1)}</span>
                    <div>
                        <h2 className="text-2xl font-black tracking-tight text-slate-950">{school.name}</h2>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
                            <span className="inline-flex items-center gap-1"><MapPin size={13} /> {school.city}, {school.country}</span>
                            <span>{school.type?.replace('_', ' ') || 'Partner school'}</span>
                            <span>{school.region}</span>
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
                        <Sparkles size={14} /> {relationshipScore}/100 priority score
                    </span>
                    <button type="button" onClick={() => document.getElementById('partner-contact-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-black text-blue-700">
                        <MailCheck size={14} /> Message Counselor
                    </button>
                    {school.canManage && <button type="button" onClick={onEdit} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">
                        <Edit3 size={14} /> Edit Relationship
                    </button>}
                    {school.canScheduleVisit ? (
                        <form action={`/partner-schools/${school.id}/schedule-visit`} method="POST">
                            <input type="hidden" name="_token" value={csrf} />
                            <button className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white">
                                <CalendarDays size={14} /> Schedule New Visit
                            </button>
                        </form>
                    ) : (
                        <span className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-800" title="Create or link a registered School account with an active coordinator before scheduling a visit.">
                            <CalendarDays size={14} /> Link School Account
                        </span>
                    )}
                    <button type="button" onClick={onBack} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500" aria-label="Back to schools"><X size={15} /></button>
                </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
                <PartnerMetric label="Partnership Since" value={relationshipYear || 'Not recorded'} detail="Relationship record created" tone="green" />
                <PartnerMetric label="Leads Captured" value={leadsCaptured.toLocaleString()} detail={`Across ${archives.length} archived engagement(s)`} tone="green" />
                <PartnerMetric label="Visit Activity" value={visitsCount} detail={`${Number(school.visitRequests || 0)} request(s) · ${archives.length} archived`} />
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[310px_1fr]">
                <section className="rounded-lg bg-slate-950 p-5 text-white shadow-sm">
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-black uppercase text-emerald-200">
                        <Brain size={14} /> Relationship Snapshot
                    </div>
                    <p className="mt-5 text-xs font-black uppercase tracking-wide text-white/50">Saved Priority Score</p>
                    <div className="mt-2 flex items-end gap-2">
                        <span className="text-4xl font-black">{relationshipScore}</span>
                        <span className="mb-1 rounded-full bg-emerald-400 px-2 py-1 text-[10px] font-black text-slate-950">{titleCase(school.tier || 'unrated')}</span>
                    </div>
                    <p className="mt-5 text-xs font-black uppercase tracking-wide text-white/50">Recorded Signals</p>
                    <div className="mt-3 space-y-3">
                        {recordedSignals.map((signal) => (
                            <div key={signal} className="flex gap-2 text-xs leading-5 text-white/80">
                                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-300" />
                                <span>{signal}</span>
                            </div>
                        ))}
                    </div>
                    <button type="button" onClick={() => document.getElementById('partner-task-title')?.focus()} className="mt-5 w-full rounded-lg border border-white/15 bg-white px-3 py-2 text-xs font-black text-slate-950">Add Relationship Task</button>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h3 className="font-black text-slate-950">Engagement Trends</h3>
                            <p className="mt-1 text-xs font-semibold text-slate-500">Leads captured and engagement from archived visit records.</p>
                        </div>
                        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                            <button type="button" onClick={() => setTrendPeriod('yearly')} className={cx('rounded-md px-3 py-1.5 text-xs font-black', trendPeriod === 'yearly' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400')}>Yearly</button>
                            <button type="button" onClick={() => setTrendPeriod('quarterly')} className={cx('rounded-md px-3 py-1.5 text-xs font-black', trendPeriod === 'quarterly' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400')}>Quarterly</button>
                        </div>
                    </div>
                    <PartnerTrendChart archives={archives} period={trendPeriod} />
                </section>
            </div>

            <section className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <h3 className="font-black text-slate-950">Recent Campus Engagements</h3>
                    {archives.length > 4 ? <button type="button" onClick={() => setShowAllHistory((current) => !current)} className="text-xs font-black text-blue-700">{showAllHistory ? 'Show Recent' : 'View All History'}</button> : <span className="text-xs font-black text-slate-400">{archives.length} record(s)</span>}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wide text-slate-500">
                            <tr><th className="px-5 py-3">Event Name</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Engagement</th><th className="px-5 py-3">Quality</th><th className="px-5 py-3">Status</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {historyRows.map((archive) => (
                                <tr key={archive.id}>
                                    <td className="px-5 py-4"><p className="font-black text-slate-950">{archive.type}</p><p className="text-xs text-slate-400">{archive.summary}</p></td>
                                    <td className="px-5 py-4 font-semibold text-slate-600">{formatShortDate(archive.visitedOn)}</td>
                                    <td className="px-5 py-4"><div className="h-1.5 w-28 rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, Math.max(0, Number(archive.engagement || 0)))}%` }} /></div><p className="mt-1 text-xs font-bold text-slate-500">{Number(archive.engagement || 0)}% · {Number(archive.leads || 0)} lead(s)</p></td>
                                    <td className="px-5 py-4 font-semibold text-slate-600">{Number(archive.quality || 0).toFixed(1)}/5</td>
                                    <td className="px-5 py-4"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700">{archive.status?.replace('_', ' ') || 'completed'}</span></td>
                                </tr>
                            ))}
                            {historyRows.length === 0 && <tr><td colSpan="5" className="px-5 py-12 text-center text-sm font-semibold text-slate-500">No archived campus engagements have been recorded for this school.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>

            <div className="mt-5 grid gap-4 lg:grid-cols-[320px_1fr]">
                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="font-black text-slate-950">Key Contacts</h3>
                    <div className="mt-4 space-y-4">
                        <div className="flex items-center gap-3">
                            <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-xs font-black text-slate-700">{coordinatorName.split(' ').map((part) => part[0]).join('').slice(0, 2) || 'CP'}</span>
                            <div className="min-w-0 flex-1"><p className="text-sm font-black text-slate-950">{coordinatorName}</p><p className="text-xs text-slate-500">Primary Coordinator</p></div>
                            {school.coordinatorEmail ? <a href={`mailto:${school.coordinatorEmail}`} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-blue-700" aria-label={`Email ${coordinatorName}`}><MailCheck size={14} /></a> : <span className="text-[10px] font-black uppercase text-slate-400">Email pending</span>}
                        </div>
                    </div>
                    <div className="mt-5 border-t border-slate-100 pt-4">
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Location Info</p>
                        {hasExactCoordinates ? <div className="mt-3"><OpenStreetMapEmbed location={`${school.name}, ${school.city}, ${school.country}`} points={[{ label: school.name, location: `${school.city}, ${school.country}`, latitude: school.latitude, longitude: school.longitude, meta: `${visitsCount} visit record(s) • ${relationshipScore}/100 priority` }]} title={`${school.name} location on OpenStreetMap`} className="h-36" /></div> : <div className="mt-3 grid h-36 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs font-semibold text-slate-500">Exact map coordinates have not been recorded for this school.</div>}
                        <OpenStreetMapLink location={`${school.name}, ${school.city}, ${school.country}`} className="mt-2 inline-flex items-center gap-1 text-xs font-black text-blue-700"><MapIcon size={13} /> Open in OpenStreetMap</OpenStreetMapLink>
                    </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <h3 className="font-black text-slate-950">Internal Strategic Notes</h3>
                        {school.canManage && <button type="button" onClick={() => document.getElementById('partner-notes-input')?.focus()} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500" aria-label="Edit notes"><Command size={14} /></button>}
                    </div>
                    {school.canManage && <form action={`/dashboard/university/partner-schools/${school.id}`} method="POST" className="mt-4 grid gap-3">
                        <input type="hidden" name="_token" value={csrf} />
                        <input type="hidden" name="_method" value="PUT" />
                        <input type="hidden" name="school_code" value={school.code || ''} />
                        <input type="hidden" name="name" value={school.name || ''} />
                        <input type="hidden" name="city" value={school.city || ''} />
                        <input type="hidden" name="region" value={school.region || ''} />
                        <input type="hidden" name="country" value={school.country || 'United States'} />
                        <input type="hidden" name="district" value={school.district || ''} />
                        <input type="hidden" name="coordinator_name" value={school.coordinatorName || ''} />
                        <input type="hidden" name="coordinator_email" value={school.coordinatorEmail || ''} />
                        <input type="hidden" name="status" value={school.status || 'verified'} />
                        <input type="hidden" name="school_type" value={school.type || 'private'} />
                        <input type="hidden" name="average_sat" value={school.sat || ''} />
                        <input type="hidden" name="yield_rate" value={school.yieldRate || 0} />
                        <input type="hidden" name="match_score" value={school.matchScore || 0} />
                        <input type="hidden" name="active_applicants" value={school.activeApplicants || 0} />
                        <label className="grid gap-1.5 text-sm font-bold text-slate-700">Relationship tier<select name="performance_tier" defaultValue={school.tier || 'stable'} className="rounded-xl border border-slate-200 px-3 py-2.5 font-normal"><option value="elite">Elite</option><option value="high">High</option><option value="emerging">Emerging</option><option value="stable">Stable</option></select></label>
                        <label className="grid gap-1.5 text-sm font-bold text-slate-700">Persistent internal notes<textarea id="partner-notes-input" name="notes" rows="4" defaultValue={school.notes || ''} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-normal outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50" placeholder="Add internal notes..." /></label>
                        <button className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Save Relationship Notes</button>
                    </form>}
                    {!school.canManage && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-600">This shared directory record is read-only. Contact and visit coordination remain available.</p>}
                    <form id="partner-contact-form" action={`/dashboard/university/partner-schools/${school.id}/contact`} method="POST" className="mt-5 grid gap-3 rounded-xl border border-slate-200 p-4">
                        <input type="hidden" name="_token" value={csrf} />
                        <h4 className="font-black text-slate-950">Direct Contact Action</h4>
                        <input name="subject" required defaultValue={`Follow-up with ${school.name}`} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold" />
                        <textarea name="message" required rows="3" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" defaultValue={`Hi ${school.coordinatorName || 'Counselor'}, we'd like to coordinate the next visit opportunity.`} />
                        <button className="rounded-xl bg-[#006a61] px-4 py-3 text-sm font-black text-white">Queue Contact</button>
                    </form>
                    <div className="mt-5 space-y-3">
                        {school.notes && <StrategicNote body={school.notes} author="Saved relationship note" />}
                        {(school.tasks || []).map((task) => <StrategicNote key={task.id} body={task.description || task.title} author={task.aiSuggested ? 'Saved recommendation' : 'Relationship task'} date={task.createdAt} />)}
                        {!school.notes && !(school.tasks || []).length && <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">No relationship notes or tasks have been recorded yet.</p>}
                    </div>
                    <form action={`/dashboard/university/partner-schools/${school.id}/tasks`} method="POST" className="mt-4 grid gap-2">
                        <input type="hidden" name="_token" value={csrf} />
                        <input id="partner-task-title" name="title" required placeholder="Add action task..." className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold" />
                        <textarea name="description" rows="2" placeholder="Task details..." className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                        <button className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700">Save Task</button>
                    </form>
                    {school.canManage && <div className="mt-5">
                        <ConfirmForm csrf={csrf} action={`/dashboard/university/partner-schools/${school.id}`} method="DELETE" title="Remove partner school?" message={`Remove ${school.name} if no visit history exists?`} confirmLabel="Remove school" className="text-xs font-black text-rose-700">
                            Remove school if no history exists
                        </ConfirmForm>
                    </div>}
                </section>
            </div>
        </section>
    );
}

function PartnerTrendChart({ archives, period }) {
    const groups = archives.reduce((result, archive) => {
        const date = archive.visitedOn ? new Date(`${archive.visitedOn}T00:00:00`) : null;
        const validDate = date && !Number.isNaN(date.getTime());
        const label = validDate
            ? (period === 'quarterly' ? `${date.getFullYear()} Q${Math.floor(date.getMonth() / 3) + 1}` : String(date.getFullYear()))
            : 'Undated';
        const current = result.get(label) || { label, leads: 0, engagementTotal: 0, count: 0, timestamp: validDate ? date.getTime() : 0 };
        current.leads += Number(archive.leads || 0);
        current.engagementTotal += Number(archive.engagement || 0);
        current.count += 1;
        current.timestamp = Math.max(current.timestamp, validDate ? date.getTime() : 0);
        result.set(label, current);
        return result;
    }, new Map());
    const points = [...groups.values()]
        .sort((left, right) => left.timestamp - right.timestamp)
        .slice(period === 'quarterly' ? -8 : -5)
        .map((point) => ({ ...point, engagement: point.count ? Math.round(point.engagementTotal / point.count) : 0 }));
    const maxLeads = Math.max(...points.map((point) => point.leads), 1);

    if (points.length === 0) {
        return <div className="mt-8 grid h-72 place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">Trend data will appear after this school has an archived campus engagement.</div>;
    }

    return (
        <div className="mt-8">
            <div className="mb-3 flex flex-wrap gap-4 text-[10px] font-black uppercase text-slate-400"><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded bg-blue-600" /> Leads captured</span><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded bg-emerald-400" /> Avg. engagement</span></div>
            <div className="flex h-64 items-end gap-4 border-b border-l border-slate-200 px-4 pb-4">
                {points.map((point) => (
                    <div key={point.label} className="flex flex-1 flex-col items-center justify-end gap-2">
                        <div className="flex h-44 w-full items-end justify-center gap-2">
                            <span className="w-4 rounded-t bg-blue-600" style={{ height: `${Math.min(100, (point.leads / maxLeads) * 100)}%` }} title={`${point.leads} leads captured`} />
                            <span className="w-4 rounded-t bg-emerald-400" style={{ height: `${Math.min(100, Math.max(0, point.engagement))}%` }} title={`${point.engagement}% average engagement`} />
                        </div>
                        <span className="text-center text-xs font-bold text-slate-400">{point.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function StrategicNote({ body, author, date }) {
    return (
        <article className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <p className="text-sm leading-6 text-slate-600">{body}</p>
            <p className="mt-2 text-[11px] font-black uppercase text-slate-400">{author}{date ? ` - ${formatShortDate(date)}` : ''}</p>
        </article>
    );
}

function PartnerScore({ school }) {
    return <div><span className={cx('rounded-full px-2.5 py-1 text-[10px] font-black uppercase', school.matchScore >= 94 ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700')}>{school.tier}</span><p className="mt-1 text-[10px] font-bold uppercase text-emerald-600">Saved priority · {school.matchScore}/100</p></div>;
}

function DiscoverySection({ schools }) {
    const topRegions = [...new Set(schools.map((school) => school.region))].slice(0, 4);

    return (
        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
            <aside className="space-y-6">
                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-gray-600">Discovery filters</h2>
                    <div className="mt-5 space-y-5">
                        <LightField label="Region" name="region_display" value={topRegions[0] || 'All regions'} readOnly />
                        <div>
                            <p className="text-sm font-semibold text-gray-700">Curriculum</p>
                            {['Advanced Placement', 'International Baccalaureate', 'National Curriculum'].map((item, index) => (
                                <label key={item} className="mt-3 flex items-center gap-3 text-sm text-gray-700">
                                    <input type="checkbox" defaultChecked={index === 0} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                                    {item}
                                </label>
                            ))}
                        </div>
                        <div>
                            <div className="flex items-center justify-between text-sm font-semibold text-gray-700">
                                <span>Enrollment size</span>
                                <span className="text-gray-400">5,000+</span>
                            </div>
                            <input type="range" min="100" max="5000" defaultValue="2500" className="mt-3 w-full accent-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-700">Performance tier</p>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                {['Elite', 'High', 'Emerging', 'Stable'].map((tier, index) => (
                                    <button key={tier} type="button" className={cx('rounded-lg border px-3 py-2 text-sm font-semibold', index === 0 ? 'border-gray-950 bg-gray-950 text-white' : 'border-gray-200 text-gray-700 hover:bg-gray-50')}>
                                        {tier}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
                <section className="rounded-xl bg-[#071a33] p-5 text-white shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-bold">
                        <Sparkles size={18} className="text-indigo-300" />
                        AI opportunity radar
                    </div>
                    <p className="mt-5 text-sm leading-6 text-white/70">3 schools in Massachusetts show a 12% spike in engineering interest this quarter.</p>
                    <button className="mt-5 w-full rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-400">View forecast</button>
                </section>
            </aside>
            <section>
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h2 className="text-3xl font-semibold text-gray-950">Discovery results</h2>
                        <p className="mt-1 text-sm text-gray-500">Showing {schools.length} target institutions matching your criteria.</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="grid h-10 w-10 place-items-center rounded-lg border border-gray-200 bg-white"><Grid2X2 size={18} /></button>
                        <button className="grid h-10 w-10 place-items-center rounded-lg border border-gray-200 bg-white"><List size={18} /></button>
                    </div>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                    {schools.map((school) => (
                        <article key={school.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                            <div className="flex gap-4 p-5">
                                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-gray-100 text-2xl font-black text-gray-950">{school.name.charAt(0)}</div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-3">
                                        <h3 className="text-xl font-semibold leading-tight text-gray-950">{school.name}</h3>
                                        <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-black uppercase text-blue-700">{school.tier}</span>
                                    </div>
                                    <p className="mt-2 flex items-center gap-1 text-sm text-gray-500"><MapPin size={15} /> {school.city}, {school.country}</p>
                                    <div className="mt-4 grid grid-cols-3 gap-2">
                                        <MiniStat label="Avg SAT" value={school.sat || '-'} />
                                        <MiniStat label="Yield" value={`${school.yieldRate}%`} />
                                        <MiniStat label="Score" value={`${school.matchScore}/100`} />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-5 py-3 text-sm">
                                <span className="font-medium text-gray-600">{school.activeApplicants} active applicants</span>
                                <button className="inline-flex items-center gap-2 font-semibold text-blue-700">View profile <ArrowRight size={16} /></button>
                            </div>
                        </article>
                    ))}
                </div>
                <section className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-[#061827] text-white shadow-sm">
                    <div className="grid min-h-72 place-items-center bg-[radial-gradient(circle_at_55%_45%,rgba(20,184,166,.35),transparent_30%),linear-gradient(135deg,#04111f,#0b263a)] p-8">
                        <div className="rounded-xl bg-white/90 p-4 text-gray-950 shadow-xl">
                            <p className="text-lg font-semibold">Northeast coverage</p>
                            <p className="text-sm text-gray-600">84% engagement rate</p>
                        </div>
                    </div>
                </section>
            </section>
        </div>
    );
}

function UniversityVisitRequestsSection({ csrf, visitRequests = [], schools = [], events = [], currentUserId = null }) {
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('all');
    const [region, setRegion] = useState('all');
    const [date, setDate] = useState('');
    const [advanced, setAdvanced] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [page, setPage] = useState(1);
    const perPage = 10;
    const regions = [...new Set(visitRequests.map((item) => item.region).filter(Boolean))].sort();
    const filtered = visitRequests.filter((item) => {
        const haystack = `${item.school} ${item.location} ${item.window} REQ-${String(item.id).padStart(4, '0')}`.toLowerCase();
        const matchesDate = !date || String(item.window || '').toLowerCase().includes(new Date(`${date}T12:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }).toLowerCase());
        return haystack.includes(query.toLowerCase()) && (status === 'all' || item.status === status) && (region === 'all' || item.region === region) && matchesDate;
    });
    const pages = Math.max(1, Math.ceil(filtered.length / perPage));
    const visible = filtered.slice((page - 1) * perPage, page * perPage);
    const isOutboundRequest = (item) => item.requesterRole === 'university' || Number(item.requesterId) === Number(currentUserId);
    const pendingCount = visitRequests.filter((item) => item.status === 'requested').length;
    const incomingPendingCount = visitRequests.filter((item) => item.status === 'requested' && !isOutboundRequest(item)).length;
    const approvedCount = visitRequests.filter((item) => ['approved', 'scheduled'].includes(item.status)).length;
    const reviewCount = visitRequests.filter((item) => item.status === 'approved').length;
    const capacityPct = Math.min(100, Math.max(0, Math.round((approvedCount / Math.max(1, visitRequests.length)) * 100)));

    useEffect(() => setPage(1), [query, status, region, date]);

    const exportCsv = () => {
        const rows = [['Request ID', 'School', 'Requested date', 'Group size', 'Region', 'Status'], ...filtered.map((item) => [`REQ-${String(item.id).padStart(4, '0')}`, item.school, item.window, item.groupSize, item.region || '', item.status])];
        const csv = rows.map((row) => row.map((cell) => {
            const value = String(cell ?? '');
            const safeValue = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
            return `"${safeValue.replaceAll('"', '""')}"`;
        }).join(',')).join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'visit-requests.csv';
        link.click();
        URL.revokeObjectURL(url);
    };

    const statusStyle = {
        requested: 'border-amber-200 bg-amber-50 text-amber-700',
        approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        scheduled: 'border-blue-200 bg-blue-50 text-blue-700',
        declined: 'border-rose-200 bg-rose-50 text-rose-700',
    };

    return (
        <div className="grid gap-4 md:gap-5">
            <section className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div><h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">Visit Requests</h1><p className="mt-1 text-sm font-semibold text-slate-500">Review school inquiries and track invitations sent to school accounts.</p></div>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                    <button type="button" onClick={exportCsv} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#006a61]/30 bg-white px-3 py-2 text-xs font-black text-[#006a61] md:px-4 md:py-2.5 md:text-sm"><Download size={15} /> Export</button>
                    <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white md:px-4 md:py-2.5 md:text-sm"><Plus size={15} /> New Request</button>
                </div>
            </section>

            <section className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
                <MobileRequestMetric label="Total Pending" value={pendingCount} helper={`${incomingPendingCount} need your decision`} tone="emerald" icon={Activity} />
                <MobileRequestMetric label="Under Review" value={reviewCount} helper="Approved database records" tone="blue" icon={Clock} />
                <MobileRequestMetric label="Confirmed" value={approvedCount} helper="Approved or scheduled" tone="emerald" icon={CheckCircle2} />
                <article className="hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex md:flex-col">
                    <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Capacity</span>
                    <span className="mt-1 text-3xl font-black text-slate-950">{capacityPct}%</span>
                    <div className="mt-3 h-1.5 rounded-full bg-[#e5eeff]"><div className="h-full rounded-full bg-[#006a61]" style={{ width: `${capacityPct}%` }} /></div>
                </article>
            </section>

            <section className="hidden items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 md:flex">
                <Sparkles size={18} className="mt-0.5 shrink-0 text-emerald-700" />
                <div><h2 className="text-xs font-black uppercase tracking-wide text-emerald-800">Insight Driven Pipeline</h2><p className="mt-1 text-sm text-emerald-800/80">{visitRequests.length > 0 ? `${visitRequests.filter((item) => item.status === 'requested').length} requests currently need review. Prioritize high-volume groups before opening additional visit slots.` : 'Incoming request insights will appear as partner schools submit visit inquiries.'}</p></div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:rounded-2xl md:p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-1 flex-col gap-3 md:flex-row">
                        <div className="relative flex-1 md:max-w-xs"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm font-semibold outline-none focus:border-[#006a61] focus:ring-4 focus:ring-emerald-50" placeholder="Search requests or schools..." /></div>
                        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold"><option value="all">All Statuses</option><option value="requested">Pending</option><option value="approved">Approved</option><option value="scheduled">Scheduled</option><option value="declined">Rejected</option></select>
                        <select value={region} onChange={(event) => setRegion(event.target.value)} className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold md:block"><option value="all">All Regions</option>{regions.map((item) => <option key={item}>{item}</option>)}</select>
                        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold md:block" />
                    </div>
                    <button type="button" onClick={() => setAdvanced(!advanced)} className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600"><Filter size={16} /> Filter</button>
                </div>
                {advanced && <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4"><span className="text-xs font-bold text-slate-500">Quick filters:</span><button type="button" onClick={() => setStatus('requested')} className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">Needs review</button><button type="button" onClick={() => { setQuery(''); setStatus('all'); setRegion('all'); setDate(''); }} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">Clear all</button></div>}
            </section>

            <div className="flex items-center justify-between md:hidden">
                <h2 className="text-xl font-black text-slate-950">Incoming Visit Requests</h2>
                <button type="button" onClick={() => setStatus(status === 'requested' ? 'all' : 'requested')} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600">Sort</button>
            </div>

            <section className="grid gap-3 md:hidden">
                {visible.length === 0 ? <SaaSEmptyState title="No visit requests found" message="Adjust the filters or add a new request." /> : visible.map((request) => (
                    <MobileVisitRequestCard key={request.id} csrf={csrf} request={request} currentUserId={currentUserId} statusStyle={statusStyle} onDetails={() => setSelected(request)} />
                ))}
                <div className="flex items-center justify-center gap-3 pb-3 pt-1 text-sm font-semibold text-slate-500">
                    <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)} className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white disabled:opacity-40"><ChevronRight size={16} className="rotate-180" /></button>
                    <span>Page {page} of {pages}</span>
                    <button type="button" disabled={page === pages} onClick={() => setPage(page + 1)} className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white disabled:opacity-40"><ChevronRight size={16} /></button>
                </div>
            </section>

            <section className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
                <div className="hidden grid-cols-12 gap-4 bg-slate-50 px-6 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 md:grid"><span className="col-span-3">School Name</span><span className="col-span-2">Requested Date</span><span className="col-span-2">Group Size</span><span className="col-span-2">Region</span><span className="col-span-2">Status</span><span className="text-right">Actions</span></div>
                <div className="divide-y divide-slate-100">
                    {visible.length === 0 ? <SaaSEmptyState title="No visit requests found" message="Adjust the filters or add a new request." /> : visible.map((request) => (
                        <article key={request.id} className="group grid grid-cols-1 items-center gap-4 px-5 py-4 hover:bg-slate-50/70 md:grid-cols-12 md:px-6">
                            <div className="flex items-center gap-3 md:col-span-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600"><School size={18} /></span><span className="min-w-0"><span className="block truncate text-sm font-black text-slate-900">{request.school}</span><span className="mt-0.5 block text-xs text-slate-500">ID: REQ-{String(request.id).padStart(4, '0')}</span><span className="mt-1 block text-[10px] font-black uppercase tracking-wide text-slate-400">{isOutboundRequest(request) ? 'Sent by your university' : 'Incoming from school'}</span></span></div>
                            <p className="text-sm text-slate-700 md:col-span-2">{request.window}</p>
                            <p className="text-sm font-semibold text-slate-700 md:col-span-2">{request.groupSize} Students</p>
                            <p className="text-sm text-slate-700 md:col-span-2">{request.region || request.location || 'Unassigned'}</p>
                            <div className="md:col-span-2"><span className={cx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold capitalize', statusStyle[request.status] || 'border-slate-200 bg-slate-50 text-slate-600')}><span className="h-1.5 w-1.5 rounded-full bg-current" />{request.status === 'requested' ? 'Pending' : request.status}</span></div>
                            <div className="flex justify-end gap-1 md:opacity-0 md:group-hover:opacity-100">
                                {request.status === 'requested' && !isOutboundRequest(request) && <><DecisionIconButton csrf={csrf} id={request.id} decision="approved" label="Approve" icon={CheckCircle2} tone="green" /><DecisionIconButton csrf={csrf} id={request.id} decision="declined" label="Reject" icon={X} tone="red" /></>}
                                {request.status === 'requested' && isOutboundRequest(request) && <DecisionIconButton csrf={csrf} id={request.id} decision="declined" label="Cancel request" icon={X} tone="red" />}
                                {request.status === 'approved' && <DecisionIconButton csrf={csrf} id={request.id} decision="scheduled" label="Schedule" icon={CalendarDays} tone="blue" />}
                                <button type="button" onClick={() => setSelected(request)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-200" title="View details"><MoreVertical size={18} /></button>
                            </div>
                        </article>
                    ))}
                </div>
                <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between"><p className="text-slate-500">Showing <strong className="text-slate-900">{filtered.length ? (page - 1) * perPage + 1 : 0}</strong> to <strong className="text-slate-900">{Math.min(page * perPage, filtered.length)}</strong> of <strong className="text-slate-900">{filtered.length}</strong> results</p><div className="flex gap-2"><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-bold disabled:opacity-40">Previous</button><span className="rounded-lg bg-blue-600 px-3 py-1.5 font-bold text-white">{page}</span><button type="button" disabled={page === pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-bold disabled:opacity-40">Next</button></div></div>
            </section>

            {createOpen && <ModalShell title="New Visit Request" onClose={() => setCreateOpen(false)}><form action="/visit-requests" method="POST" className="grid gap-4" onSubmit={() => window.setTimeout(() => setCreateOpen(false), 0)}><input type="hidden" name="_token" value={csrf} /><label className="grid gap-1.5 text-sm font-bold text-slate-700">Recipient school<select name="school_id" required className="rounded-lg border border-slate-200 px-3 py-2.5 font-normal"><option value="">Select a school account</option>{schools.map((school) => <option key={school.id} value={school.id}>{school.name}{school.location ? ` · ${school.location}` : ''}</option>)}</select></label><label className="grid gap-1.5 text-sm font-bold text-slate-700">Visit program<select name="campus_event_id" required className="rounded-lg border border-slate-200 px-3 py-2.5 font-normal"><option value="">Select a published event</option>{events.filter((event) => event.status === 'published').map((event) => <option key={event.id} value={event.id}>{event.title} · {formatDateTime(event.startsAt)}</option>)}</select></label><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-bold text-slate-700">Requested date<input type="date" name="requested_window" required min={new Date().toISOString().slice(0, 10)} className="rounded-lg border border-slate-200 px-3 py-2.5 font-normal" /></label><label className="grid gap-1.5 text-sm font-bold text-slate-700">Group size<input type="number" name="group_size" required min="1" max="10000" defaultValue="30" className="rounded-lg border border-slate-200 px-3 py-2.5 font-normal" /></label></div><label className="grid gap-1.5 text-sm font-bold text-slate-700">Priority<select name="priority" defaultValue="2" className="rounded-lg border border-slate-200 px-3 py-2.5 font-normal"><option value="1">Low</option><option value="2">Normal</option><option value="3">High</option><option value="4">Urgent</option><option value="5">Critical</option></select></label><label className="grid gap-1.5 text-sm font-bold text-slate-700">Notes<textarea name="notes" rows="3" className="rounded-lg border border-slate-200 px-3 py-2.5 font-normal" placeholder="Request context or accessibility needs..." /></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setCreateOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold">Cancel</button><button disabled={!schools.length || !events.some((event) => event.status === 'published')} className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white disabled:bg-slate-300">Send Request</button></div></form></ModalShell>}
            {selected && <ModalShell title={selected.school} onClose={() => setSelected(null)}><div className="grid gap-3 text-sm"><RequestDetail label="Request ID" value={`REQ-${String(selected.id).padStart(4, '0')}`} /><RequestDetail label="Direction" value={isOutboundRequest(selected) ? 'Sent to school' : 'Received from school'} /><RequestDetail label="Requested date" value={selected.window} /><RequestDetail label="Group size" value={`${selected.groupSize} students`} /><RequestDetail label="Region" value={selected.region || selected.location} /><RequestDetail label="Status" value={selected.status} /></div></ModalShell>}
        </div>
    );
}

function ModalShell(props) {
    return <StudentModal {...props} />;
}

function DecisionIconButton({ csrf, id, decision, label, icon: Icon, tone }) {
    const tones = { green: 'text-emerald-700 hover:bg-emerald-50', red: 'text-rose-700 hover:bg-rose-50', blue: 'text-blue-700 hover:bg-blue-50' };
    return <form action={`/visit-requests/${id}/decision`} method="POST"><input type="hidden" name="_token" value={csrf} /><input type="hidden" name="decision" value={decision} /><button className={cx('rounded-lg p-2', tones[tone])} title={label} aria-label={label}><Icon size={18} /></button></form>;
}

function MobileRequestMetric({ label, value, helper, tone = 'emerald', icon: Icon }) {
    const tones = {
        emerald: 'text-[#006a61] bg-emerald-50',
        blue: 'text-blue-700 bg-blue-50',
    };

    return (
        <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <span className="block text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</span>
            <span className="mt-1 block text-2xl font-black text-slate-950">{value}</span>
            <span className={cx('mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black', tones[tone] || tones.emerald)}>
                <Icon size={12} /> {helper}
            </span>
        </article>
    );
}

function MobileVisitRequestCard({ csrf, request, currentUserId = null, onDetails }) {
    const isPending = request.status === 'requested';
    const isOutbound = request.requesterRole === 'university' || Number(request.requesterId) === Number(currentUserId);
    const statusTone = {
        requested: 'bg-emerald-50 text-[#006a61]',
        approved: 'bg-blue-50 text-blue-700',
        scheduled: 'bg-emerald-50 text-emerald-700',
        declined: 'bg-rose-50 text-rose-700',
    };
    const statusLabel = request.status === 'requested' ? 'New' : request.status === 'approved' ? 'Reviewing' : request.status;

    return (
        <article className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e5eeff] text-blue-700">
                    <School size={19} />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-black text-slate-950">{request.school}</h3>
                        <span className={cx('shrink-0 rounded px-2 py-0.5 text-[9px] font-black uppercase', statusTone[request.status] || 'bg-slate-100 text-slate-600')}>{statusLabel}</span>
                    </div>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-slate-400">{isOutbound ? 'Sent by your university' : 'Incoming from school'}</p>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-500">
                        <span className="inline-flex items-center gap-1"><CalendarDays size={13} /> {request.window || 'Date pending'}</span>
                        <span className="inline-flex items-center gap-1"><MapPin size={13} /> {request.region || request.location || 'Region pending'}</span>
                        <span className="inline-flex items-center gap-1 font-black text-slate-800"><UsersRound size={13} /> {request.groupSize || 0} Students</span>
                    </div>
                </div>
            </div>
            <div className="mt-3 flex gap-2">
                {isPending && !isOutbound ? (
                    <>
                        <DecisionTextButton csrf={csrf} id={request.id} decision="approved" label="Approve" tone="approve" />
                        <DecisionTextButton csrf={csrf} id={request.id} decision="declined" label="Deny" tone="deny" />
                    </>
                ) : isPending ? (
                    <DecisionTextButton csrf={csrf} id={request.id} decision="declined" label="Cancel request" tone="deny" />
                ) : request.status === 'approved' ? (
                    <DecisionTextButton csrf={csrf} id={request.id} decision="scheduled" label="Schedule" tone="approve" />
                ) : (
                    <button type="button" onClick={onDetails} className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-600">View Status</button>
                )}
                <button type="button" onClick={onDetails} className="grid h-9 w-10 place-items-center rounded-full border border-slate-200 text-slate-500" aria-label="View request details">
                    <MoreVertical size={17} />
                </button>
            </div>
        </article>
    );
}

function DecisionTextButton({ csrf, id, decision, label, tone }) {
    return (
        <form action={`/visit-requests/${id}/decision`} method="POST" className="flex-1">
            <input type="hidden" name="_token" value={csrf} />
            <input type="hidden" name="decision" value={decision} />
            <button className={cx('w-full rounded-full px-4 py-2 text-xs font-black', tone === 'deny' ? 'border border-rose-200 text-rose-700 hover:bg-rose-50' : 'bg-[#006a61] text-white hover:opacity-90')}>
                {label}
            </button>
        </form>
    );
}

function RequestDetail({ label, value }) {
    return <div className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-3 py-2.5"><span className="font-semibold text-slate-500">{label}</span><span className="text-right font-black capitalize text-slate-900">{value || 'Not provided'}</span></div>;
}

function RequestInboxSection({ csrf, visitRequests }) {
    const groups = ['requested', 'approved', 'scheduled'];

    return (
        <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
            <section>
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-3xl font-semibold text-gray-950">Request inbox</h2>
                        <p className="mt-1 text-sm text-gray-500">Manage and approve university visit requests for target schools.</p>
                    </div>
                    <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold"><Filter size={16} /> Filters</button>
                </div>
                <div className="grid gap-4 lg:grid-cols-3">
                    {groups.map((status) => (
                        <div key={status}>
                            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">{status} ({visitRequests.filter((item) => item.status === status).length})</p>
                            <div className="space-y-3">
                                {visitRequests.filter((item) => item.status === status).map((request) => (
                                    <article key={request.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <h3 className="text-sm font-semibold text-gray-950">{request.school}</h3>
                                                <p className="mt-1 text-xs text-gray-500">{request.window}</p>
                                                <p className="mt-1 text-xs text-gray-400">{request.location}</p>
                                            </div>
                                            <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black uppercase text-blue-700">P{request.priority}</span>
                                        </div>
                                        {request.status === 'requested' && (
                                            <div className="mt-4 grid grid-cols-2 gap-2">
                                                <DecisionButton csrf={csrf} id={request.id} decision="approved" label="Accept" dark />
                                                <DecisionButton csrf={csrf} id={request.id} decision="declined" label="Decline" />
                                            </div>
                                        )}
                                        {request.status === 'approved' && <DecisionButton csrf={csrf} id={request.id} decision="scheduled" label="Schedule visit" full />}
                                    </article>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>
            <aside className="space-y-4">
                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h3 className="font-semibold text-gray-950">Regional intelligence</h3>
                    <InsightCard title="Peak visit season" body="West Africa peak recruitment window starts in November." />
                    <InsightCard title="Holiday alert" body="Independence Day creates limited logistics availability." tone="red" />
                    <button className="mt-4 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold">View full report</button>
                </section>
            </aside>
        </div>
    );
}

function DecisionButton({ csrf, id, decision, label, dark = false, full = false }) {
    return (
        <form action={`/visit-requests/${id}/decision`} method="POST" className={full ? 'mt-4' : ''}>
            <input type="hidden" name="_token" value={csrf} />
            <input type="hidden" name="decision" value={decision} />
            <button className={cx('w-full rounded-lg px-3 py-2 text-xs font-bold', dark ? 'bg-gray-950 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50')}>
                {label}
            </button>
        </form>
    );
}

function VisitArchiveSection({ csrf, archives, analytics }) {
    return (
        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
            <section>
                <div className="mb-5 flex items-end justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-semibold text-gray-950">Visit archive</h2>
                        <p className="mt-1 text-sm text-gray-500">Access and analyze historical recruitment visits.</p>
                    </div>
                    <button className="inline-flex items-center gap-2 rounded-lg bg-gray-950 px-4 py-2 text-sm font-semibold text-white"><Download size={16} /> Export data</button>
                </div>
                <DataPanel
                    title="School and location"
                    description="Archived visit outcomes and CRM sync status."
                    columns={['School', 'Date', 'Leads', 'Status']}
                    rows={archives.map((archive) => [archive.school, archive.visitedOn, `${archive.leads} leads`, archive.status])}
                    empty="No visit archive yet."
                />
            </section>
            <aside className="space-y-4">
                <MetricGrid metrics={[
                    { label: 'Total visits', value: analytics.totalVisits || 0 },
                    { label: 'Leads captured', value: formatCompact(analytics.leadsCaptured || 0) },
                    { label: 'Avg quality', value: `${analytics.averageQuality || 0}/5` },
                    { label: 'Engagement', value: `${analytics.engagementAverage || 0}%` },
                ]} />
                <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
                    <p className="text-sm font-bold uppercase text-indigo-700">AI recruitment insight</p>
                    <p className="mt-3 text-sm leading-6 text-indigo-950">Schools visited twice show a 24% higher conversion rate when scheduled during October cycles.</p>
                    {archives[0] && (
                        <form action={`/visit-archives/${archives[0].id}/sync`} method="POST" className="mt-4">
                            <input type="hidden" name="_token" value={csrf} />
                            <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Sync latest archive</button>
                        </form>
                    )}
                </section>
            </aside>
        </div>
    );
}

function AnalyticsForecastSection({ csrf = '', analytics = {}, schools = [] }) {
    const kpis = analytics.kpis?.length ? analytics.kpis : [
        { label: 'Total visits', value: analytics.totalVisits || 0, trend: 'Database connected' },
        { label: 'Leads captured', value: formatCompact(analytics.leadsCaptured || 0), trend: 'Archived visits' },
        { label: 'Engagement', value: `${analytics.engagementAverage || 0}%`, trend: 'Current average' },
        { label: 'Quality', value: `${analytics.averageQuality || 0}/5`, trend: 'Archived quality' },
    ];
    const funnel = analytics.funnel || [];
    const trend = analytics.trend || [];
    const maxTrend = Math.max(1, ...trend.map((item) => Number(item.value || 0)));
    const opportunities = analytics.opportunities?.length ? analytics.opportunities : schools.slice(0, 5).map((school) => ({
        name: school.name,
        meta: `${school.city || ''}, ${school.country || ''}`,
        score: school.matchScore || 0,
        detail: `${school.activeApplicants || 0} active applicants`,
    }));
    const opportunitiesUseCapacityTransform = ['school', 'student'].includes(analytics.role);
    const opportunityHeading = opportunitiesUseCapacityTransform ? 'Upcoming Visit Capacity' : 'Saved School Priorities';
    const opportunityMeasure = opportunitiesUseCapacityTransform ? 'Derived capacity indicator' : 'Saved priority score';
    const insights = analytics.insights || [];
    const schoolProgramFunnel = analytics.schoolProgramFunnel || [];
    const cycleComparisons = analytics.cycleComparisons || [];
    const savedInsights = analytics.savedInsights || [];
    const dateRange = analytics.dateRange || {};
    const exportParams = new URLSearchParams();
    if (dateRange.range) exportParams.set('range', dateRange.range);
    if (dateRange.start) exportParams.set('start_date', dateRange.start);
    if (dateRange.end) exportParams.set('end_date', dateRange.end);
    const universityExportUrl = `/dashboard/university/insights/export${exportParams.toString() ? `?${exportParams}` : ''}`;

    const exportReport = () => {
        if (analytics.role === 'university') {
            window.location.href = universityExportUrl;
            return;
        }

        const rows = [
            ['Metric', 'Value', 'Detail'],
            ...kpis.map((item) => [item.label, item.value, item.trend || '']),
            [],
            ['Funnel Step', 'Count', 'Rate'],
            ...funnel.map((item) => [item.label, item.value, `${item.rate}%`]),
            [],
            ['Opportunity', opportunityMeasure, 'Detail'],
            ...opportunities.map((item) => [item.name, item.score, item.detail || item.meta || '']),
        ];
        const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `${analytics.role || 'platform'}-insights.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="grid gap-4 md:gap-6">
            <section className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-wide text-blue-700">Database intelligence</p>
                    <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 md:mt-2 md:text-3xl">{analytics.title || 'Recruitment Intelligence'}</h1>
                    <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-slate-500 md:mt-2">{analytics.subtitle || 'Analytics will update as live records are added to the platform.'}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                    <button type="button" onClick={exportReport} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#006a61]/30 bg-white px-3 py-2 text-xs font-black text-[#006a61] md:px-4 md:py-2.5 md:text-sm"><Download size={15} /> Export</button>
                    <span className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 md:px-4 md:py-2.5 md:text-sm">{analytics.cycle || 'Current cycle'}</span>
                </div>
            </section>

            {analytics.role === 'university' && (
                <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Date range</p>
                            <p className="mt-1 text-sm font-bold text-slate-700">{dateRange.start || 'Start'} to {dateRange.end || 'Today'}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {['30', '90', '180', '365'].map((range) => (
                                <form key={range} action="/dashboard/university" method="GET">
                                    <input type="hidden" name="range" value={range} />
                                    <button className={cx('rounded-xl px-3 py-2 text-xs font-black', String(dateRange.range || '90') === range ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-600')}>{range} days</button>
                                </form>
                            ))}
                        </div>
                        <form action="/dashboard/university" method="GET" className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                            <input type="date" name="start_date" defaultValue={dateRange.start || ''} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-[#006a61]" />
                            <input type="date" name="end_date" defaultValue={dateRange.end || ''} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-[#006a61]" />
                            <button className="rounded-xl bg-[#006a61] px-4 py-2 text-sm font-black text-white">Apply</button>
                        </form>
                    </div>
                </section>
            )}

            <section className="grid grid-cols-2 gap-2 md:grid-cols-2 md:gap-4 xl:grid-cols-4">
                {kpis.map((item) => (
                    <article key={item.label} className="overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:p-5">
                        <div className="flex items-start justify-between gap-3">
                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 md:text-[11px]">{item.label}</p>
                            <Sparkles size={15} className="text-blue-600 md:size-[17px]" />
                        </div>
                        <p className="mt-3 text-2xl font-black tracking-tight text-slate-950 md:mt-4 md:text-3xl">{item.value}</p>
                        <p className="mt-2 text-xs font-bold text-emerald-700">{item.trend || 'Live data'}</p>
                    </article>
                ))}
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr] md:gap-6">
                <div className="space-y-4 md:space-y-6">
                    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
                        <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-lg font-black text-slate-950 md:text-xl">Conversion Funnel Analysis</h2>
                                <p className="mt-1 text-sm text-slate-500">Built from current records scoped to this account.</p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{funnel.length} tracked stage(s)</span>
                        </div>
                        <div className="mt-6 space-y-3">
                            {funnel.length === 0 ? (
                                <EmptyState message="Funnel data will appear after registrations are recorded." />
                            ) : funnel.map((step, index) => (
                                <div key={step.label} className="grid gap-2 sm:grid-cols-[110px_1fr_86px] sm:items-center md:gap-3">
                                    <p className="text-sm font-black text-slate-600">{step.label}</p>
                                    <div className="h-9 overflow-hidden rounded-r-lg bg-slate-100 md:h-11">
                                        <div className={cx('flex h-9 min-w-[3rem] items-center px-3 text-xs font-black text-white md:h-11 md:px-4 md:text-sm', index === funnel.length - 1 ? 'bg-emerald-600' : 'bg-blue-600')} style={{ width: `${Math.max(5, Math.min(100, Number(step.rate || 0)))}%` }}>
                                            {formatCompact(step.value || 0)}
                                        </div>
                                    </div>
                                    <p className="text-right text-sm font-black text-slate-700">{step.rate || 0}%</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {analytics.role === 'university' && (
                        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
                            <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-lg font-black text-slate-950 md:text-xl">School × Program Funnel</h2>
                                    <p className="mt-1 text-sm text-slate-500">Same registration records, grouped by partner school and visit program.</p>
                                </div>
                                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{schoolProgramFunnel.length} rows</span>
                            </div>
                            <div className="mt-4 overflow-x-auto">
                                {schoolProgramFunnel.length === 0 ? (
                                    <EmptyState message="School/program funnel appears after schools register for visit programs." />
                                ) : (
                                    <table className="min-w-full text-left text-sm">
                                        <thead className="text-xs uppercase tracking-wide text-slate-400">
                                            <tr>
                                                <th className="px-3 py-2">School</th>
                                                <th className="px-3 py-2">Program</th>
                                                <th className="px-3 py-2">Stage</th>
                                                <th className="px-3 py-2 text-right">Count</th>
                                                <th className="px-3 py-2 text-right">Rate</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {schoolProgramFunnel.slice(0, 24).map((row, index) => (
                                                <tr key={`${row.school}-${row.program}-${row.stage}-${index}`}>
                                                    <td className="px-3 py-3 font-black text-slate-800">{row.school}</td>
                                                    <td className="px-3 py-3 text-slate-600">{row.program}</td>
                                                    <td className="px-3 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">{row.stage}</span></td>
                                                    <td className="px-3 py-3 text-right font-black text-slate-950">{row.value}</td>
                                                    <td className="px-3 py-3 text-right font-black text-blue-700">{row.rate}%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </section>
                    )}

                    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-black text-slate-950 md:text-xl">Engagement Trend</h2>
                                <p className="mt-1 text-sm text-slate-500">Six-month activity based on registration creation dates.</p>
                            </div>
                            <span className="text-xs font-black uppercase tracking-wide text-slate-400">Monthly</span>
                        </div>
                        <div className="mt-4 flex h-36 items-end gap-2 border-b border-slate-200 px-1 md:mt-6 md:h-64 md:gap-3 md:px-2">
                            {trend.length === 0 ? (
                                <div className="grid h-full w-full place-items-center text-sm font-semibold text-slate-500">No trend data yet.</div>
                            ) : trend.map((item) => (
                                <div key={item.label} className="flex h-full flex-1 flex-col justify-end gap-2">
                                    <div className="rounded-t bg-blue-600" style={{ height: `${Math.max(6, (Number(item.value || 0) / maxTrend) * 100)}%` }} title={`${item.label}: ${item.value}`} />
                                    <p className="text-center text-[10px] font-bold text-slate-500 md:text-xs">{item.label}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {analytics.role === 'university' && (
                        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-black text-slate-950 md:text-xl">Cycle Comparison</h2>
                                    <p className="mt-1 text-sm text-slate-500">Current range against the previous equivalent cycle.</p>
                                </div>
                                <span className="text-xs font-black uppercase tracking-wide text-slate-400">Trend</span>
                            </div>
                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                {cycleComparisons.length === 0 ? (
                                    <EmptyState message="Cycle comparison will appear after date-scoped records exist." />
                                ) : cycleComparisons.map((cycle) => (
                                    <article key={cycle.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="text-sm font-black text-slate-950">{cycle.label}</p>
                                                <p className="mt-1 text-xs font-semibold text-slate-500">{cycle.period}</p>
                                            </div>
                                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-emerald-700">{cycle.conversion}% conv.</span>
                                        </div>
                                        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                                            <MiniStat label="Registered" value={cycle.registered} />
                                            <MiniStat label="Attended" value={cycle.attended} />
                                            <MiniStat label="Engagement" value={cycle.applications} />
                                            <MiniStat label="Attendance" value={`${cycle.attendanceRate}%`} />
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>
                    )}

                    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
                        <h2 className="text-lg font-black text-slate-950 md:text-xl">{opportunityHeading}</h2>
                        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{opportunitiesUseCapacityTransform ? 'The indicator is a display transform of the remaining-seat count shown on each row; it is not a match score.' : 'Scores are saved school-priority values, not predicted matches.'}</p>
                        <div className="mt-4 divide-y divide-slate-100">
                            {opportunities.length === 0 ? (
                                <EmptyState message="Opportunity ranking will appear after schools or visits are available." />
                            ) : opportunities.map((item) => (
                                <div key={`${item.name}-${item.score}`} className="grid gap-3 py-4 md:grid-cols-[1fr_160px_80px] md:items-center">
                                    <div>
                                        <p className="text-sm font-black text-slate-950">{item.name}</p>
                                        <p className="mt-1 text-xs text-slate-500">{item.meta}</p>
                                        {item.detail && <p className="mt-1 text-xs font-semibold text-slate-600">{item.detail}</p>}
                                    </div>
                                    <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.min(100, Number(item.score || 0))}%` }} /></div>
                                    <p className="text-right text-sm font-black text-blue-700">{item.score}/100<span className="mt-0.5 block text-[9px] font-bold uppercase text-slate-400">{opportunitiesUseCapacityTransform ? 'Capacity transform' : 'Saved priority'}</span></p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <aside className="space-y-4 md:space-y-6">
                    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                            <Sparkles size={18} className="text-emerald-600" />
                            <h2 className="text-lg font-black text-slate-950">Operational Insights</h2>
                        </div>
                        <div className="mt-4 space-y-3">
                            {insights.length === 0 ? (
                                <p className="text-sm text-slate-500">Insights will appear when enough records exist.</p>
                            ) : insights.map((item) => (
                                <article key={item.title} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                                    <div className="flex gap-3">
                                        <span className={cx('mt-1 h-2 w-2 shrink-0 rounded-full', item.tone === 'warning' ? 'bg-amber-500' : item.tone === 'success' ? 'bg-emerald-500' : 'bg-blue-500')} />
                                        <div>
                                            <h3 className="text-sm font-black text-slate-950">{item.title}</h3>
                                            <p className="mt-1 text-sm leading-6 text-slate-600">{item.body}</p>
                                            {analytics.role === 'university' && csrf && (
                                                <form action="/dashboard/university/insights" method="POST" className="mt-3">
                                                    <input type="hidden" name="_token" value={csrf} />
                                                    <input type="hidden" name="title" value={item.title} />
                                                    <input type="hidden" name="body" value={item.body} />
                                                    <input type="hidden" name="type" value={item.type || 'recommendation'} />
                                                    <input type="hidden" name="score" value={item.score || 0} />
                                                    <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">Save insight</button>
                                                </form>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>

                    {analytics.role === 'university' && (
                        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm md:p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Current Activity</p>
                                    <h2 className="mt-1 text-2xl font-black text-slate-950">{analytics.engagementAverage || 0}%</h2>
                                </div>
                                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-700">Recorded attendance</span>
                            </div>
                            <p className="mt-3 text-sm font-semibold leading-6 text-slate-700">Calculated from confirmed seats and recorded attendance in the selected date range.</p>
                            <div className="mt-4 grid grid-cols-2 gap-2">
                                <MiniStat label="Funnel stages" value={funnel.length} />
                                <MiniStat label="Archived quality" value={`${analytics.averageQuality || 0}/5`} />
                            </div>
                        </section>
                    )}

                    {analytics.role === 'university' && (
                        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                            <h2 className="text-lg font-black text-slate-950">Saved Recommendations</h2>
                            <div className="mt-4 space-y-3">
                                {savedInsights.length === 0 ? (
                                    <p className="text-sm font-semibold text-slate-500">Saved insights will appear here after you save a recommendation.</p>
                                ) : savedInsights.map((item) => (
                                    <article key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-black text-slate-950">{item.title}</p>
                                                <p className="mt-1 text-xs font-semibold uppercase text-slate-400">{item.type} - {item.status}</p>
                                                <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                                            </div>
                                            <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-blue-700">{item.score}</span>
                                        </div>
                                        {csrf && (
                                            <div className="mt-3 grid grid-cols-2 gap-2">
                                                <form action={`/dashboard/university/insights/${item.id}/status`} method="POST">
                                                    <input type="hidden" name="_token" value={csrf} />
                                                    <input type="hidden" name="status" value="done" />
                                                    <button className="w-full rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white">Mark done</button>
                                                </form>
                                                <form action={`/dashboard/university/insights/${item.id}/status`} method="POST">
                                                    <input type="hidden" name="_token" value={csrf} />
                                                    <input type="hidden" name="status" value="dismissed" />
                                                    <button className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">Dismiss</button>
                                                </form>
                                            </div>
                                        )}
                                    </article>
                                ))}
                            </div>
                        </section>
                    )}

                    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                        <h2 className="text-lg font-black text-slate-950">Tracked Records</h2>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <MiniStat label="Funnel stages" value={funnel.length} />
                            <MiniStat label="Opportunity rows" value={opportunities.length} />
                        </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                        <h2 className="text-lg font-black text-slate-950">Activity Hotspots</h2>
                        <div className="mt-4 space-y-3">
                            {(analytics.hotspots || []).length === 0 ? (
                                <p className="text-sm text-slate-500">Hotspots will appear when regional data exists.</p>
                            ) : (analytics.hotspots || []).map((hotspot) => (
                                <div key={hotspot.region} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                                    <span className="font-bold text-slate-700">{hotspot.region}</span>
                                    <span className="font-black text-emerald-600">{hotspot.growth}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                </aside>
            </section>
        </div>
    );
}

function ItinerarySection() {
    const stops = [
        ['09:00 AM - Day 1', 'Harvard University', 'Cambridge, MA - 2.5h Session', 'done', 42.377, -71.1167],
        ['01:30 PM - Day 1', 'MIT Innovation Hub', 'Cambridge, MA - 1.5h Workshop', 'gap', 42.3601, -71.0942],
        ['09:00 AM - Day 2', 'Brown University', 'Providence, RI - 3.0h Interview', 'open', 41.8268, -71.4025],
    ];
    const routePoints = stops.map(([time, title, body, status, latitude, longitude]) => ({ label: title, location: body, latitude, longitude, meta: `${time} • ${status}` }));

    return (
        <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
            <aside className="space-y-5">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-950">Northeast loop</h2>
                    <p className="mt-1 text-sm text-gray-500">Oct 12 - Oct 15, 2026</p>
                </div>
                <section className="rounded-xl bg-indigo-600 p-5 text-white shadow-sm">
                    <p className="font-semibold">Route optimized</p>
                    <p className="mt-1 text-sm text-white/80">Saved 4.2 hours and $145 in fuel costs.</p>
                </section>
                <section className="space-y-3">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-600">Visit sequence</p>
                    {stops.map(([time, title, body, status]) => (
                        <article key={title} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                            <p className="text-sm font-semibold text-blue-700">{time}</p>
                            <p className="mt-1 font-semibold text-gray-950">{title}</p>
                            <p className="text-sm text-gray-500">{body}</p>
                            {status === 'gap' && <span className="mt-3 inline-flex rounded-md bg-orange-50 px-2 py-1 text-xs font-bold text-orange-700">Lunch gap</span>}
                        </article>
                    ))}
                    <button className="w-full rounded-xl border border-dashed border-gray-300 bg-white px-4 py-5 text-sm font-semibold text-gray-700">Add destination</button>
                </section>
            </aside>
            <section className="space-y-5">
                <div className="relative min-h-[460px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <OpenStreetMapEmbed location="Boston Cambridge Providence Northeast United States" points={routePoints} title="Northeast loop route on OpenStreetMap" className="absolute inset-0 h-full rounded-none border-0" />
                    <div className="absolute left-6 top-6 rounded-xl bg-white/90 p-4 shadow">
                        <p className="font-semibold text-gray-950">OpenStreetMap route area</p>
                        <OpenStreetMapLink location="Boston Cambridge Providence Northeast United States" className="text-sm font-bold text-blue-700">Open full map</OpenStreetMapLink>
                    </div>
                    <div className="absolute bottom-6 right-6 rounded-xl bg-white p-5 shadow">
                        <p className="font-semibold text-gray-950">Live logistics</p>
                        <p className="mt-3 text-sm text-gray-600">I-95 heavy traffic: +12 min expected</p>
                        <p className="mt-2 text-sm text-gray-600">Rain forecast: Providence, 2:00 PM</p>
                    </div>
                </div>
                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h3 className="font-semibold text-gray-950">Time allocation</h3>
                    <div className="mt-8 h-16 rounded-lg bg-gray-50 p-3">
                        <div className="relative h-6">
                            <div className="absolute left-[4%] top-0 h-6 w-[24%] rounded-md bg-blue-200" />
                            <div className="absolute left-[32%] top-2 h-2 w-[16%] rounded-md bg-gray-200" />
                            <div className="absolute left-[50%] top-0 h-6 w-[18%] rounded-md bg-indigo-200" />
                        </div>
                    </div>
                </section>
            </section>
        </div>
    );
}

function CheckoutSection({ csrf, archives, tasks }) {
    const archive = archives.find((item) => item.status === 'pending_sync') || archives[0];
    const visibleTasks = tasks.filter((task) => !archive || task.archiveId === archive.id).slice(0, 4);

    return (
        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <section className="space-y-6">
                <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-gray-500">Check-out visit</p>
                    <h2 className="mt-2 text-4xl font-semibold text-gray-950">{archive?.school || 'Current visit'}</h2>
                    <p className="mt-2 text-gray-500">Visit duration: 3h 45m - Started at 09:00 AM</p>
                </div>
                <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-700"><Upload size={22} /></div>
                        <div>
                            <h3 className="text-xl font-semibold text-gray-950">Sync leads</h3>
                            <p className="mt-2"><span className="text-4xl font-black text-gray-950">{archive?.leads || 0}</span> <span className="text-gray-600">new student leads captured</span></p>
                        </div>
                    </div>
                    <div className="mt-5 h-3 rounded-full bg-gray-100"><div className="h-3 rounded-full bg-emerald-600" style={{ width: '84%' }} /></div>
                    {archive && (
                        <form action={`/visit-archives/${archive.id}/sync`} method="POST" className="mt-5">
                            <input type="hidden" name="_token" value={csrf} />
                            <button className="rounded-lg bg-gray-950 px-4 py-2 text-sm font-bold text-white">Sync all leads</button>
                        </form>
                    )}
                </section>
                <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-600">Outcome summary</h3>
                    <p className="mt-6 text-gray-700">How would you rate the overall visit quality?</p>
                    <div className="mt-4 flex items-center gap-2 text-orange-500">
                        {[1, 2, 3, 4].map((item) => <Star key={item} fill="currentColor" />)}
                        <Star className="text-gray-300" />
                        <span className="ml-4 text-xl font-semibold text-gray-950">{archive?.quality || 0}</span>
                    </div>
                    <textarea className="mt-6 min-h-40 w-full rounded-xl border border-gray-200 p-4 text-sm outline-none focus:border-gray-400" placeholder="Enter qualitative notes about student engagement, counselor feedback, or campus atmosphere..." />
                </section>
            </section>
            <aside className="space-y-6">
                <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-600">Next actions</h3>
                        <span className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-bold uppercase text-indigo-700">AI suggested</span>
                    </div>
                    <div className="mt-5 space-y-4">
                        {visibleTasks.map((task) => (
                            <form key={task.id} action={`/visit-tasks/${task.id}`} method="POST" className="flex gap-3 rounded-lg p-2 hover:bg-gray-50">
                                <input type="hidden" name="_token" value={csrf} />
                                <input type="hidden" name="status" value={task.status === 'done' ? 'open' : 'done'} />
                                <button className={cx('mt-1 grid h-5 w-5 shrink-0 place-items-center rounded border', task.status === 'done' ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white')}>
                                    {task.status === 'done' && <CheckCircle2 size={14} />}
                                </button>
                                <div>
                                    <p className="font-semibold text-gray-950">{task.title}</p>
                                    <p className="mt-1 text-sm text-gray-500">{task.description}</p>
                                </div>
                            </form>
                        ))}
                    </div>
                </section>
                <section className="overflow-hidden rounded-xl bg-[#071a33] text-white shadow-sm">
                    <div className="h-44 bg-[radial-gradient(circle_at_35%_35%,rgba(125,211,252,.45),transparent_24%),linear-gradient(135deg,#0f766e,#0f172a)]" />
                    <div className="p-5">
                        <p className="text-sm text-white/70">{archive?.location || 'Visit location'}</p>
                        <h3 className="mt-2 text-2xl font-semibold">Visit Archive #{archive?.id || '001'}</h3>
                        <p className="mt-2 text-sm text-white/60">Archived data will be available once synced.</p>
                    </div>
                </section>
            </aside>
        </div>
    );
}

function InsightCard({ title, body, tone = 'blue' }) {
    return (
        <div className={cx('mt-4 rounded-lg border p-3', tone === 'red' ? 'border-red-100 bg-red-50' : 'border-blue-100 bg-blue-50')}>
            <p className={cx('text-xs font-bold uppercase', tone === 'red' ? 'text-red-700' : 'text-blue-700')}>{title}</p>
            <p className="mt-2 text-xs leading-5 text-gray-600">{body}</p>
        </div>
    );
}

function formatCompact(value) {
    return Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function formatCurrency(value, currency = 'NGN') {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value || 0));
}

function percentage(value, total) {
    return total > 0 ? Math.round((Number(value || 0) / Number(total || 0)) * 1000) / 10 : 0;
}

function LightField({ label, name, type = 'text', error, ...props }) {
    return (
        <div>
            <label htmlFor={name} className="text-sm font-semibold text-gray-700">{label}</label>
            <input id={name} name={name} type={type} className={cx('mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-gray-950 outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-100', error ? 'border-red-300' : 'border-gray-200')} {...props} />
            {error && <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>}
        </div>
    );
}

function LightTextarea({ label, name, error, ...props }) {
    return (
        <div>
            <label htmlFor={name} className="text-sm font-semibold text-gray-700">{label}</label>
            <textarea id={name} name={name} rows="4" className={cx('mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-gray-950 outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-100', error ? 'border-red-300' : 'border-gray-200')} {...props} />
            {error && <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>}
        </div>
    );
}

function MiniStat({ label, value }) {
    return (
        <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-gray-400">{label}</p>
            <p className="mt-1 text-lg font-semibold text-gray-950">{value}</p>
        </div>
    );
}

function formatDateTime(value) {
    if (!value) {
        return 'TBA';
    }

    return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function formatShortDate(value) {
    if (!value) {
        return 'TBA';
    }

    return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatTimeRange(start, end) {
    if (!start) return 'Time TBA';

    const options = { hour: 'numeric', minute: '2-digit' };
    const startTime = new Date(start).toLocaleTimeString([], options);
    const endTime = end ? new Date(end).toLocaleTimeString([], options) : null;

    return endTime ? `${startTime} - ${endTime}` : startTime;
}

function formatTimeOnly(value) {
    if (!value) return 'TBA';

    return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatRelativeTime(value) {
    if (!value) return 'Recently';

    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) return 'Recently';

    const diff = Date.now() - timestamp;
    const minutes = Math.max(0, Math.round(diff / 60000));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;

    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.round(hours / 24);
    return days === 1 ? 'Yesterday' : `${days}d ago`;
}

function calendarMonthCells(cursor) {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startOffset = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - startOffset);

    return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

function isSameCalendarDay(left, right) {
    return left.getFullYear() === right.getFullYear()
        && left.getMonth() === right.getMonth()
        && left.getDate() === right.getDate();
}

function moveEventToDate(value, targetDate) {
    const source = value ? new Date(value) : new Date();
    const moved = new Date(targetDate);
    moved.setHours(source.getHours(), source.getMinutes(), 0, 0);
    return moved.toISOString();
}

function moveEventToDateTime(value, targetDate, time) {
    const source = value ? new Date(value) : new Date();
    const moved = new Date(targetDate);
    const [hours, minutes] = (time || timeValue(value) || '09:00').split(':').map((item) => Number(item));
    moved.setHours(Number.isFinite(hours) ? hours : source.getHours(), Number.isFinite(minutes) ? minutes : source.getMinutes(), 0, 0);
    return moved.toISOString();
}

function timeValue(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function addHoursToIso(value, hours) {
    const date = value ? new Date(value) : new Date();
    date.setHours(date.getHours() + hours);
    return date.toISOString();
}

function addMinutesToTime(value, minutesToAdd) {
    const [hours, minutes] = (value || '09:00').split(':').map((item) => Number(item));
    const date = new Date();
    date.setHours(hours || 0, minutes || 0, 0, 0);
    date.setMinutes(date.getMinutes() + minutesToAdd);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatSlotLabel(value) {
    const [hours, minutes] = value.split(':').map((item) => Number(item));
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function hasLocalScheduleConflict(events = [], ignoreId, venue, startsAt, endsAt) {
    const start = new Date(startsAt);
    const end = new Date(endsAt || startsAt);
    if (!venue || Number.isNaN(start.getTime())) return null;

    return events.find((event) => {
        if (Number(event.id) === Number(ignoreId) || event.status === 'cancelled' || event.venue !== venue) return false;
        const eventStart = new Date(event.startsAt);
        const eventEnd = new Date(event.endsAt || event.startsAt);
        return eventStart < end && eventEnd > start;
    }) || null;
}

function busiestCalendarDay(events) {
    const grouped = events.reduce((days, event) => {
        if (!event.startsAt) return days;
        const key = new Date(event.startsAt).toDateString();
        days[key] = (days[key] || 0) + Number(event.confirmedSeats || 0);
        return days;
    }, {});
    const [date, seats] = Object.entries(grouped).sort((left, right) => right[1] - left[1])[0] || [];

    if (!date) {
        return { label: 'No events', detail: 'Create an event to populate calendar load' };
    }

    return { label: new Date(date).toLocaleDateString([], { weekday: 'short', day: 'numeric' }), detail: `${seats} students expected` };
}

function eventFocus(event) {
    const text = `${event.title || ''} ${event.description || ''}`.toLowerCase();
    if (/engineering|tech|robot|stem|ai|innovation/.test(text)) return 'Engineering & Tech';
    if (/business|leadership|finance|management/.test(text)) return 'Business';
    return 'Liberal Arts';
}

function eventImageTone(event) {
    const focus = eventFocus(event);
    if (focus === 'Engineering & Tech') return 'bg-gradient-to-br from-sky-500 to-slate-900';
    if (focus === 'Business') return 'bg-gradient-to-br from-emerald-500 to-slate-900';
    return 'bg-gradient-to-br from-amber-500 to-slate-900';
}

function enrichDiscoverVisit(event, visitRequests = []) {
    const capacity = Number(event.capacity || 0);
    const confirmedSeats = Number(event.confirmedSeats || 0);
    const seatsLeft = Math.max(0, capacity - confirmedSeats);
    const focus = eventFocus(event);
    const limitedThreshold = Math.max(5, Math.ceil(Math.max(1, capacity) * 0.15));
    const existingRequest = visitRequests.find((request) => Number(request.eventId) === Number(event.id));
    const statusLabel = existingRequest
        ? existingRequest.status
        : event.status || 'published';

    return {
        ...event,
        initials: (event.university || event.title || 'UV').split(' ').map((word) => word[0]).slice(0, 3).join('').toUpperCase(),
        university: event.university || 'University Partner',
        focus,
        filterLocation: event.location || event.venue || 'Location TBA',
        capacity,
        confirmedSeats,
        seatsLeft,
        limitedThreshold,
        existingRequest,
        statusLabel,
        statusTone: existingRequest
            ? 'border-blue-200 bg-blue-50 text-blue-700'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700',
        availabilityLabel: seatsLeft > 0
            ? `${seatsLeft}/${capacity || seatsLeft} seats open`
            : 'No seats left',
    };
}

function schoolUniversityCards(events) {
    const palette = [
        'bg-gradient-to-br from-amber-300 via-sky-500 to-slate-900',
        'bg-gradient-to-br from-emerald-200 via-green-600 to-slate-900',
        'bg-gradient-to-br from-blue-200 via-slate-500 to-slate-900',
        'bg-gradient-to-br from-lime-200 via-emerald-600 to-slate-900',
        'bg-gradient-to-br from-violet-300 via-indigo-600 to-slate-950',
        'bg-gradient-to-br from-rose-200 via-orange-500 to-slate-900',
    ];
    const publishedEvents = events.filter((event) => event.status === 'published' && event.university);
    const eventUniversities = [...new Set(publishedEvents.map((event) => event.university))].map((name, index) => {
        const universityEvents = publishedEvents.filter((item) => item.university === name);
        const event = universityEvents[0] || {};
        const publishedVisits = universityEvents
            .sort((left, right) => new Date(left.startsAt || '9999-12-31') - new Date(right.startsAt || '9999-12-31'));
        const nextPublishedVisit = publishedVisits.find((item) => {
            const startsAt = new Date(item.startsAt || '').getTime();
            return Number.isFinite(startsAt) && startsAt >= Date.now();
        });
        const focus = eventFocus(event);
        const location = event.location || 'Location TBA';
        return {
            name,
            location,
            type: 'University',
            focus,
            upcomingVisits: publishedVisits.length,
            nextVisit: nextPublishedVisit?.startsAt || null,
            tags: [],
            publishedVisits,
            image: palette[index % palette.length],
        };
    });

    return eventUniversities;
}

function normalizeSchoolStudents(students = []) {
    return students.map((student) => ({
        id: student.id,
        name: student.name,
        email: student.email || '',
        studentIdentifier: student.studentIdentifier || `ST-${student.id}`,
        grade: student.grade || 'Not set',
        interest: student.interest || 'Undecided',
        assignedEvents: student.assignedEvents || [],
        initials: (student.name || 'Student').split(' ').map((part) => part[0]).slice(0, 2).join(''),
    }));
}

function toInputDateTime(value) {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value.slice(0, 16);

    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function eventCapacityPercent(event) {
    return Math.min(100, Math.round((Number(event.confirmedSeats || 0) / Math.max(1, Number(event.capacity || 1))) * 100));
}

function UniversityStatusPill({ status }) {
    const classes = {
        published: 'bg-emerald-50 text-emerald-700',
        draft: 'bg-slate-100 text-slate-600',
        cancelled: 'bg-red-50 text-red-700',
        completed: 'bg-slate-100 text-slate-600',
    };

    return <span className={cx('inline-flex rounded-full px-2.5 py-1 text-xs font-black uppercase', classes[status] || 'bg-slate-100 text-slate-600')}>{status}</span>;
}

function AcademicProgramsSection({ csrf, programs = [], role }) {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');
    const filtered = programs.filter((program) => {
        const matchesSearch = !search || `${program.name} ${program.code} ${program.level || ''}`.toLowerCase().includes(search.toLowerCase());
        return matchesSearch && (status === 'all' || program.status === status);
    });

    return (
        <section className="grid gap-5">
            <SaaSCard title={role === 'university' ? 'Create academic program' : 'Create program or class'} description="Publish real requirements, deadlines, fees, and capacity for student applications.">
                <form action="/institution-programs" method="POST" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <input type="hidden" name="_token" value={csrf} />
                    <input type="hidden" name="institution_type" value={role === 'university' ? 'university' : 'school'} />
                    <LightField label="Program name" name="name" required />
                    <LightField label="Program code" name="code" required />
                    <LightField label="Level or class" name="level" placeholder="Undergraduate, Grade 10..." />
                    <LightField label="Location" name="location" />
                    <LightField label="Application deadline" name="application_deadline" type="datetime-local" />
                    <LightField label="Capacity" name="capacity" type="number" min="1" />
                    <LightField label="Application fee" name="application_fee" type="number" min="0" step="0.01" defaultValue="0" required />
                    <LightField label="Currency" name="currency" defaultValue="NGN" maxLength="3" required />
                    <label className="text-sm font-semibold text-gray-700">Status<select name="status" defaultValue="draft" className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm"><option value="draft">Draft</option><option value="published">Published</option><option value="closed">Closed</option></select></label>
                    <div className="md:col-span-2 xl:col-span-3"><LightTextarea label="Description" name="description" /></div>
                    <div className="md:col-span-2 xl:col-span-3"><LightTextarea label="Entry requirements" name="requirements" /></div>
                    <button className="rounded-xl bg-[#006a61] px-5 py-3 text-sm font-black text-white md:col-span-2 xl:col-span-3">Create program</button>
                </form>
            </SaaSCard>

            <SaaSCard title="Programs" description={`${filtered.length} program${filtered.length === 1 ? '' : 's'} in this workspace.`}>
                <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_180px]">
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search programs..." className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-[#006a61]" />
                    <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="all">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="closed">Closed</option></select>
                </div>
                <div className="grid gap-3">
                    {filtered.map((program) => (
                        <details key={program.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                            <summary className="cursor-pointer list-none">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div><p className="font-black text-slate-950">{program.name}</p><p className="mt-1 text-xs font-semibold text-slate-500">{program.code} · {program.level || 'Level not set'} · {program.applicationsCount} applications</p></div>
                                    <div className="text-right"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-600">{program.status}</span><p className="mt-2 text-sm font-black text-[#006a61]">{formatCurrency(program.fee, program.currency)}</p></div>
                                </div>
                            </summary>
                            <form action={`/institution-programs/${program.id}`} method="POST" className="mt-4 grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-2 xl:grid-cols-3">
                                <input type="hidden" name="_token" value={csrf} /><input type="hidden" name="_method" value="PUT" />
                                <LightField label="Program name" name="name" defaultValue={program.name} required />
                                <LightField label="Program code" name="code" defaultValue={program.code} required />
                                <LightField label="Level or class" name="level" defaultValue={program.level || ''} />
                                <LightField label="Location" name="location" defaultValue={program.location || ''} />
                                <LightField label="Deadline" name="application_deadline" type="datetime-local" defaultValue={toInputDateTime(program.deadline)} />
                                <LightField label="Capacity" name="capacity" type="number" min="1" defaultValue={program.capacity || ''} />
                                <LightField label="Application fee" name="application_fee" type="number" min="0" step="0.01" defaultValue={program.fee} required />
                                <LightField label="Currency" name="currency" defaultValue={program.currency} maxLength="3" required />
                                <label className="text-sm font-semibold text-gray-700">Status<select name="status" defaultValue={program.status} className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm"><option value="draft">Draft</option><option value="published">Published</option><option value="closed">Closed</option></select></label>
                                <div className="md:col-span-2 xl:col-span-3"><LightTextarea label="Description" name="description" defaultValue={program.description || ''} /></div>
                                <div className="md:col-span-2 xl:col-span-3"><LightTextarea label="Entry requirements" name="requirements" defaultValue={program.requirements || ''} /></div>
                                <button className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">Save changes</button>
                            </form>
                            <form action={`/institution-programs/${program.id}`} method="POST" className="mt-3" onSubmit={(event) => { if (!window.confirm('Delete this program?')) event.preventDefault(); }}>
                                <input type="hidden" name="_token" value={csrf} /><input type="hidden" name="_method" value="DELETE" />
                                <button className="text-xs font-black text-rose-600">Delete program</button>
                            </form>
                        </details>
                    ))}
                    {!filtered.length && <EmptyState title="No programs found" message="Create the first program or change the current filters." />}
                </div>
            </SaaSCard>
        </section>
    );
}

function AdmissionApplicationsSection({ csrf, applications = [], role }) {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');
    const filtered = applications.filter((application) => {
        const haystack = `${application.reference} ${application.student?.name || ''} ${application.student?.email || ''} ${application.program?.name || ''}`.toLowerCase();
        return (!search || haystack.includes(search.toLowerCase())) && (status === 'all' || application.status === status);
    });
    const canDecide = role !== 'student';

    return (
        <SaaSCard title="Applications" description="Review real application records, documents, payments, and decisions.">
            <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_190px]">
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reference, student, or program..." className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-[#006a61]" />
                <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="all">All statuses</option>{['draft', 'submitted', 'under_review', 'waitlisted', 'accepted', 'rejected', 'withdrawn'].map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select>
            </div>
            <div className="grid gap-3">
                {filtered.map((application) => {
                    const paid = application.payments?.find((payment) => payment.status === 'paid');
                    return (
                        <details key={application.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                            <summary className="cursor-pointer list-none">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div><p className="font-black text-slate-950">{application.program?.name}</p><p className="mt-1 text-xs font-semibold text-slate-500">{application.reference} · {role === 'student' ? application.program?.institutionName : `${application.student?.name} · ${application.student?.email}`}</p></div>
                                    <div className="flex items-center gap-2"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase text-blue-700">{titleCase(application.status)}</span>{paid && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700">Paid</span>}</div>
                                </div>
                            </summary>
                            <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 lg:grid-cols-2">
                                <div className="space-y-3 text-sm text-slate-600"><p><span className="font-black text-slate-950">Submitted:</span> {formatDateTime(application.submittedAt)}</p><p><span className="font-black text-slate-950">Statement:</span> {application.personalStatement || 'Not provided'}</p><p><span className="font-black text-slate-950">Academic summary:</span> {application.academicSummary || 'Not provided'}</p>{application.decisionNote && <p><span className="font-black text-slate-950">Decision note:</span> {application.decisionNote}</p>}</div>
                                <div><p className="text-xs font-black uppercase tracking-wide text-slate-400">Documents</p><div className="mt-2 flex flex-wrap gap-2">{application.documents?.map((document) => <a key={document.id} href={document.previewUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-[#006a61]">{document.name} · {titleCase(document.status)}</a>)}{!application.documents?.length && <span className="text-sm text-slate-500">No documents attached.</span>}</div></div>
                            </div>
                            {canDecide && !['draft', 'withdrawn'].includes(application.status) && <form action={`/admission-applications/${application.id}/decision`} method="POST" className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-3 md:grid-cols-[190px_1fr_auto] md:items-end"><input type="hidden" name="_token" value={csrf} /><label className="text-xs font-black text-slate-600">Decision<select name="status" defaultValue={application.status === 'submitted' ? 'under_review' : application.status} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"><option value="under_review">Under review</option><option value="waitlisted">Waitlist</option><option value="accepted">Accept</option><option value="rejected">Reject</option></select></label><LightField label="Decision note" name="decision_note" defaultValue={application.decisionNote || ''} /><button className="rounded-xl bg-[#006a61] px-4 py-2.5 text-sm font-black text-white">Save decision</button></form>}
                            {role === 'student' && !['accepted', 'rejected', 'withdrawn'].includes(application.status) && <form action={`/admission-applications/${application.id}/withdraw`} method="POST" className="mt-4" onSubmit={(event) => { if (!window.confirm('Withdraw this application?')) event.preventDefault(); }}><input type="hidden" name="_token" value={csrf} /><button className="text-xs font-black text-rose-600">Withdraw application</button></form>}
                        </details>
                    );
                })}
                {!filtered.length && <EmptyState title="No applications found" message="No application records match the current filters." />}
            </div>
        </SaaSCard>
    );
}

function StudentSearchApplySection({ csrf, programs = [], applications = [] }) {
    const [search, setSearch] = useState('');
    const [location, setLocation] = useState('all');
    const applied = new Set(applications.map((application) => application.program?.id));
    const locations = [...new Set(programs.map((program) => program.location).filter(Boolean))].sort();
    const filtered = programs.filter((program) => (!search || `${program.name} ${program.institutionName} ${program.level || ''}`.toLowerCase().includes(search.toLowerCase())) && (location === 'all' || program.location === location));

    return (
        <section className="grid gap-4">
            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_220px]">
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search institution, program, or level..." className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#006a61]" />
                <select value={location} onChange={(event) => setLocation(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"><option value="all">All locations</option>{locations.map((value) => <option key={value}>{value}</option>)}</select>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
                {filtered.map((program) => (
                    <article key={program.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-[#006a61]">{program.institutionName}</p><h2 className="mt-1 text-xl font-black text-slate-950">{program.name}</h2><p className="mt-1 text-sm font-semibold text-slate-500">{program.level || 'Program'} · {program.location || 'Location TBA'}</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700">Open</span></div>
                        <p className="mt-4 text-sm leading-6 text-slate-600">{program.description || 'The institution has not added a description yet.'}</p>
                        <div className="mt-4 grid grid-cols-2 gap-2"><MiniStat label="Deadline" value={program.deadline ? formatShortDate(program.deadline) : 'Open'} /><MiniStat label="Fee" value={formatCurrency(program.fee, program.currency)} /></div>
                        <details className="mt-4 rounded-2xl bg-slate-50 p-3"><summary className="cursor-pointer text-sm font-black text-[#006a61]">Requirements and application</summary><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{program.requirements || 'No additional requirements provided.'}</p>{applied.has(program.id) ? <p className="mt-4 rounded-xl bg-blue-50 px-3 py-2 text-sm font-black text-blue-700">Application already started</p> : <form action="/admission-applications" method="POST" className="mt-4 grid gap-3"><input type="hidden" name="_token" value={csrf} /><input type="hidden" name="institution_program_id" value={program.id} /><input type="hidden" name="submit" value="1" /><LightTextarea label="Personal statement" name="personal_statement" required /><LightTextarea label="Academic summary" name="academic_summary" required /><button className="rounded-xl bg-[#006a61] px-4 py-3 text-sm font-black text-white">Submit application</button></form>}</details>
                    </article>
                ))}
                {!filtered.length && <div className="lg:col-span-2"><EmptyState title="No open programs found" message="Try a different search or location filter." /></div>}
            </div>
        </section>
    );
}

function StudentDocumentsSection({ csrf, portfolio = {}, applications = [], profile = {} }) {
    const records = portfolio.academicRecords || [];
    const documents = portfolio.documents || [];
    const user = profile.user || {};

    return (
        <section className="grid gap-5 lg:grid-cols-2">
            <div className="grid content-start gap-5">
                <SaaSCard title="Profile image" description="Upload the image used for your student profile.">
                    <form action="/profile/photo" method="POST" encType="multipart/form-data" className="flex flex-wrap items-end gap-3">
                        <input type="hidden" name="_token" value={csrf} />
                        {user.profilePhotoUrl ? <img src={user.profilePhotoUrl} alt="Profile" className="h-16 w-16 rounded-full object-cover" /> : <span className="grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-lg font-black text-slate-600">{initials(user.name || 'Student')}</span>}
                        <label className="min-w-[220px] flex-1 text-sm font-semibold text-slate-700">Image<input type="file" name="profile_photo" accept="image/png,image/jpeg,image/webp" required className="mt-2 block w-full text-sm" /></label>
                        <button className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">Upload image</button>
                    </form>
                </SaaSCard>
                <SaaSCard title="Academic history" description="Add verified education and qualification details.">
                    <form action="/student/academic-records" method="POST" className="grid gap-3 sm:grid-cols-2">
                        <input type="hidden" name="_token" value={csrf} />
                        <LightField label="Institution" name="institution_name" required />
                        <LightField label="Qualification" name="qualification" required />
                        <LightField label="Graduation year" name="graduation_year" type="number" min="1950" max={new Date().getFullYear() + 10} />
                        <LightField label="GPA or score" name="gpa" type="number" min="0" max="100" step="0.01" />
                        <div className="sm:col-span-2"><LightTextarea label="Result summary" name="result_summary" /></div>
                        <button className="rounded-xl bg-[#006a61] px-4 py-2.5 text-sm font-black text-white sm:col-span-2">Add record</button>
                    </form>
                    <div className="mt-4 divide-y divide-slate-100">
                        {records.map((record) => <div key={record.id} className="flex items-start justify-between gap-3 py-3"><div><p className="font-black text-slate-950">{record.qualification}</p><p className="text-sm text-slate-500">{record.institutionName} · {record.graduationYear || 'Year not set'}{record.gpa ? ` · ${record.gpa}` : ''}</p></div><form action={`/student/academic-records/${record.id}`} method="POST" onSubmit={(event) => { if (!window.confirm('Remove this academic record?')) event.preventDefault(); }}><input type="hidden" name="_token" value={csrf} /><input type="hidden" name="_method" value="DELETE" /><button className="text-xs font-black text-rose-600">Remove</button></form></div>)}
                        {!records.length && <p className="py-4 text-sm text-slate-500">No academic records added yet.</p>}
                    </div>
                </SaaSCard>
            </div>
            <SaaSCard title="Documents" description="PDF certificates and images are stored privately and downloaded through authorized links.">
                <form action="/student/documents" method="POST" encType="multipart/form-data" className="grid gap-3 rounded-2xl bg-slate-50 p-4">
                    <input type="hidden" name="_token" value={csrf} />
                    <label className="text-sm font-semibold text-slate-700">Category<select name="category" className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5"><option value="certificate">Certificate</option><option value="transcript">Transcript</option><option value="identity">Identity</option><option value="recommendation">Recommendation</option><option value="other">Other</option></select></label>
                    <label className="text-sm font-semibold text-slate-700">Attach to application<select name="admission_application_id" className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5"><option value="">General profile document</option>{applications.map((application) => <option key={application.id} value={application.id}>{application.reference} · {application.program?.name}</option>)}</select></label>
                    <label className="text-sm font-semibold text-slate-700">File<input type="file" name="document" accept="application/pdf,image/png,image/jpeg" required className="mt-2 block w-full text-sm" /></label>
                    <button className="rounded-xl bg-[#006a61] px-4 py-2.5 text-sm font-black text-white">Upload securely</button>
                </form>
                <div className="mt-4 grid gap-3">
                    {documents.map((document) => <article key={document.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-black text-slate-950">{document.name}</p><p className="mt-1 text-xs font-semibold text-slate-500">{titleCase(document.category)} · {(document.size / 1024).toFixed(1)} KB · {titleCase(document.status)}</p>{document.applicationReference && <p className="mt-1 text-xs font-black text-[#006a61]">{document.applicationReference}</p>}</div><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-600">{document.status}</span></div><div className="mt-3 flex flex-wrap gap-2"><a href={document.previewUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700">Preview</a><a href={document.downloadUrl} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-[#006a61]">Download</a>{document.status !== 'verified' && <form action={`/student/documents/${document.id}`} method="POST" onSubmit={(event) => { if (!window.confirm('Delete this document?')) event.preventDefault(); }}><input type="hidden" name="_token" value={csrf} /><input type="hidden" name="_method" value="DELETE" /><button className="rounded-lg border border-rose-100 px-3 py-2 text-xs font-black text-rose-600">Delete</button></form>}</div></article>)}
                    {!documents.length && <EmptyState title="No documents uploaded" message="Upload a PDF certificate, transcript, identity document, recommendation, or image." />}
                </div>
            </SaaSCard>
        </section>
    );
}

function StudentPaymentsSection({ csrf, applications = [] }) {
    const payments = applications.flatMap((application) => (application.payments || []).map((payment) => ({ ...payment, application })));
    const payable = applications.filter((application) => Number(application.program?.fee || 0) > 0 && ['submitted', 'under_review', 'waitlisted', 'accepted'].includes(application.status) && !(application.payments || []).some((payment) => payment.status === 'paid'));

    return (
        <section className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
            <SaaSCard title="Application fees" description="Start payment only for a submitted application with a configured fee.">
                <div className="grid gap-3">
                    {payable.map((application) => <article key={application.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black text-slate-950">{application.program?.name}</p><p className="mt-1 text-xs font-semibold text-slate-500">{application.reference} · {application.program?.institutionName}</p></div><p className="text-lg font-black text-[#006a61]">{formatCurrency(application.program?.fee, application.program?.currency)}</p></div><form action={`/admission-applications/${application.id}/payments/paystack`} method="POST" data-native-submit="true" className="mt-4"><input type="hidden" name="_token" value={csrf} /><button className="w-full rounded-xl bg-[#006a61] px-4 py-3 text-sm font-black text-white">Pay securely with Paystack</button></form></article>)}
                    {!payable.length && <EmptyState title="No fees due" message="A payable application fee will appear here after an application is submitted." />}
                </div>
            </SaaSCard>
            <SaaSCard title="Payment history" description="Verified transactions and downloadable receipts.">
                <div className="grid gap-3">
                    {payments.map((payment) => <article key={payment.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-slate-950">{payment.application.program?.name}</p><p className="mt-1 text-xs font-semibold text-slate-500">{payment.reference}</p></div><span className={cx('rounded-full px-2.5 py-1 text-[10px] font-black uppercase', payment.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : payment.status === 'failed' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700')}>{payment.status}</span></div><p className="mt-3 text-lg font-black text-slate-950">{formatCurrency(payment.amount, payment.currency)}</p>{payment.receiptUrl && <div className="mt-3 flex gap-2"><a href={payment.receiptUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700">View receipt</a><a href={payment.receiptDownloadUrl} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-[#006a61]">Download</a></div>}</article>)}
                    {!payments.length && <p className="py-8 text-center text-sm font-semibold text-slate-500">No payment attempts yet.</p>}
                </div>
            </SaaSCard>
        </section>
    );
}

function PlatformNotificationsSection({ initial = {} }) {
    const [items, setItems] = useState(initial.items || []);
    const [error, setError] = useState('');
    const markRead = async (id) => {
        setError('');
        try {
            await apiRequest(`/api/v1/notifications/${id}/read`, { method: 'PATCH' });
            setItems((current) => current.map((item) => item.id === id ? { ...item, unread: false, readAt: new Date().toISOString() } : item));
        } catch (requestError) { setError(requestError.message); }
    };
    const markAllRead = async () => {
        setError('');
        try {
            await apiRequest('/api/v1/notifications/read-all', { method: 'PATCH' });
            setItems((current) => current.map((item) => ({ ...item, unread: false, readAt: item.readAt || new Date().toISOString() })));
        } catch (requestError) { setError(requestError.message); }
    };
    return <SaaSCard title="Notifications" description="Messages, visit requests, attendance reminders, and visit updates are stored here."><div className="mb-4 flex justify-end"><button type="button" onClick={markAllRead} disabled={!items.some((item) => item.unread)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-40">Mark all read</button></div>{error && <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}<div className="divide-y divide-slate-100">{items.map((item) => <article key={item.id} className={cx('py-4', item.unread && 'rounded-xl bg-blue-50/60 px-3')}><div className="flex items-start justify-between gap-3"><div><p className="font-black text-slate-950">{item.subject}</p><p className="mt-1 text-sm leading-6 text-slate-600">{item.body}</p><p className="mt-2 text-xs font-semibold text-slate-400">{formatDateTime(item.createdAt)}</p></div>{item.unread && <button type="button" onClick={() => markRead(item.id)} className="shrink-0 text-xs font-black text-[#006a61]">Mark read</button>}</div></article>)}{!items.length && <EmptyState title="No notifications" message="Messages, reminders, and visit alerts will appear here." />}</div></SaaSCard>;
}

function AdminContentSection({ csrf, content = {} }) {
    const [tab, setTab] = useState('announcements');
    const tabs = [['announcements', 'Announcements'], ['faqs', 'FAQs'], ['templates', 'Email templates']];
    return (
        <section className="grid gap-4">
            <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2">{tabs.map(([id, label]) => <button key={id} type="button" onClick={() => setTab(id)} className={cx('shrink-0 rounded-xl px-4 py-2 text-sm font-black', tab === id ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-50')}>{label}</button>)}</div>
            {tab === 'announcements' && <SaaSCard title="Announcements" description="Publishing sends a notification broadcast to the selected active account audience."><form action="/admin/content/announcements" method="POST" className="grid gap-3 md:grid-cols-2"><input type="hidden" name="_token" value={csrf} /><LightField label="Title" name="title" required /><label className="text-sm font-semibold text-slate-700">Audience<select name="audience" className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5"><option value="all">All users</option><option value="university">Universities</option><option value="school">Schools</option><option value="student">Students</option><option value="admin">Admins</option></select></label><label className="text-sm font-semibold text-slate-700">Status<select name="status" className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5"><option value="draft">Draft</option><option value="published">Published</option></select></label><LightField label="Expires at" name="expires_at" type="datetime-local" /><div className="md:col-span-2"><LightTextarea label="Announcement" name="body" required /></div><button className="rounded-xl bg-[#006a61] px-4 py-2.5 text-sm font-black text-white md:col-span-2">Save announcement</button></form><div className="mt-5 grid gap-3">{(content.announcements || []).map((item) => <details key={item.id} className="rounded-2xl border border-slate-200 p-4"><summary className="cursor-pointer list-none"><div className="flex justify-between gap-3"><div><p className="font-black text-slate-950">{item.title}</p><p className="mt-1 text-xs font-semibold text-slate-500">{titleCase(item.audience)} · {titleCase(item.status)}</p></div><span className="text-xs font-black text-[#006a61]">Edit</span></div></summary><form action={`/admin/content/announcements/${item.id}`} method="POST" className="mt-4 grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-2"><input type="hidden" name="_token" value={csrf} /><input type="hidden" name="_method" value="PUT" /><LightField label="Title" name="title" defaultValue={item.title} required /><label className="text-sm font-semibold text-slate-700">Audience<select name="audience" defaultValue={item.audience} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5"><option value="all">All users</option><option value="university">Universities</option><option value="school">Schools</option><option value="student">Students</option><option value="admin">Admins</option></select></label><label className="text-sm font-semibold text-slate-700">Status<select name="status" defaultValue={item.status} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label><LightField label="Expires at" name="expires_at" type="datetime-local" defaultValue={toInputDateTime(item.expiresAt)} /><div className="md:col-span-2"><LightTextarea label="Announcement" name="body" defaultValue={item.body} required /></div><button className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">Update</button></form><form action={`/admin/content/announcements/${item.id}`} method="POST" className="mt-2"><input type="hidden" name="_token" value={csrf} /><input type="hidden" name="_method" value="DELETE" /><button className="text-xs font-black text-rose-600">Delete</button></form></details>)}{!(content.announcements || []).length && <EmptyState title="No announcements" message="Create the first platform announcement." />}</div></SaaSCard>}
            {tab === 'faqs' && <SaaSCard title="FAQs" description="Store and organize audience-scoped FAQ entries in the managed content library."><form action="/admin/content/faqs" method="POST" className="grid gap-3 md:grid-cols-2"><input type="hidden" name="_token" value={csrf} /><LightField label="Question" name="question" required /><label className="text-sm font-semibold text-slate-700">Audience<select name="audience" className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5"><option value="all">All users</option><option value="university">Universities</option><option value="school">Schools</option><option value="student">Students</option></select></label><LightField label="Sort order" name="sort_order" type="number" min="0" defaultValue="0" /><label className="flex items-center gap-2 pt-7 text-sm font-black text-slate-700"><input type="checkbox" name="is_published" value="1" /> Published in library</label><div className="md:col-span-2"><LightTextarea label="Answer" name="answer" required /></div><button className="rounded-xl bg-[#006a61] px-4 py-2.5 text-sm font-black text-white md:col-span-2">Add FAQ</button></form><div className="mt-5 divide-y divide-slate-100">{(content.faqs || []).map((faq) => <details key={faq.id} className="py-4"><summary className="cursor-pointer font-black text-slate-950">{faq.question}</summary><p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{faq.answer}</p><form action={`/admin/content/faqs/${faq.id}`} method="POST" className="mt-3 grid gap-3 rounded-xl bg-slate-50 p-3 md:grid-cols-2"><input type="hidden" name="_token" value={csrf} /><input type="hidden" name="_method" value="PUT" /><LightField label="Question" name="question" defaultValue={faq.question} required /><label className="text-sm font-semibold text-slate-700">Audience<select name="audience" defaultValue={faq.audience} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5"><option value="all">All users</option><option value="university">Universities</option><option value="school">Schools</option><option value="student">Students</option></select></label><LightField label="Sort order" name="sort_order" type="number" min="0" defaultValue={faq.sortOrder} /><label className="flex items-center gap-2 pt-7 text-sm font-black text-slate-700"><input type="checkbox" name="is_published" value="1" defaultChecked={faq.isPublished} /> Published in library</label><div className="md:col-span-2"><LightTextarea label="Answer" name="answer" defaultValue={faq.answer} required /></div><button className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">Update</button></form><form action={`/admin/content/faqs/${faq.id}`} method="POST" className="mt-2"><input type="hidden" name="_token" value={csrf} /><input type="hidden" name="_method" value="DELETE" /><button className="text-xs font-black text-rose-600">Delete</button></form></details>)}{!(content.faqs || []).length && <EmptyState title="No FAQs" message="Create the first managed FAQ entry." />}</div></SaaSCard>}
            {tab === 'templates' && <SaaSCard title="Email templates" description="Enabled templates supply notification copy when the template key matches a notification type; disabled templates fall back to built-in copy."><form action="/admin/content/email-templates" method="POST" className="grid gap-3 md:grid-cols-2"><input type="hidden" name="_token" value={csrf} /><LightField label="Template key" name="key" placeholder="application.accepted" required /><LightField label="Display name" name="name" required /><div className="md:col-span-2"><LightField label="Subject" name="subject" required /></div><div className="md:col-span-2"><LightTextarea label="Body" name="body" required /></div><label className="flex items-center gap-2 text-sm font-black text-slate-700"><input type="checkbox" name="enabled" value="1" defaultChecked /> Enabled for matching notifications</label><button className="rounded-xl bg-[#006a61] px-4 py-2.5 text-sm font-black text-white">Create template</button></form><div className="mt-5 grid gap-3">{(content.emailTemplates || []).map((template) => <details key={template.id} className="rounded-2xl border border-slate-200 p-4"><summary className="cursor-pointer font-black text-slate-950">{template.name} <span className="ml-2 text-xs text-slate-400">{template.key}</span></summary><form action={`/admin/content/email-templates/${template.id}`} method="POST" className="mt-4 grid gap-3 md:grid-cols-2"><input type="hidden" name="_token" value={csrf} /><input type="hidden" name="_method" value="PUT" /><LightField label="Template key" name="key" defaultValue={template.key} required /><LightField label="Display name" name="name" defaultValue={template.name} required /><div className="md:col-span-2"><LightField label="Subject" name="subject" defaultValue={template.subject} required /></div><div className="md:col-span-2"><LightTextarea label="Body" name="body" defaultValue={template.body} required /></div><label className="flex items-center gap-2 text-sm font-black text-slate-700"><input type="checkbox" name="enabled" value="1" defaultChecked={template.enabled} /> Enabled for matching notifications</label><button className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">Update</button></form><form action={`/admin/content/email-templates/${template.id}`} method="POST" className="mt-2"><input type="hidden" name="_token" value={csrf} /><input type="hidden" name="_method" value="DELETE" /><button className="text-xs font-black text-rose-600">Delete</button></form></details>)}{!(content.emailTemplates || []).length && <EmptyState title="No email templates" message="Create the first managed email template." />}</div></SaaSCard>}
        </section>
    );
}

function ConversationCenterSection({ currentUserId }) {
    const [threads, setThreads] = useState([]);
    const [recipients, setRecipients] = useState([]);
    const [active, setActive] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const loadThreads = async () => {
        try {
            const payload = await apiRequest('/api/v1/conversations?per_page=100');
            setThreads(payload?.data || []);
            return payload?.data || [];
        } catch (requestError) { setError(requestError.message); return []; }
    };
    const openThread = async (thread) => {
        setError('');
        try {
            const payload = await apiRequest(`/api/v1/conversations/${thread.id}?per_page=100`);
            setActive(payload.data.conversation);
            setMessages([...(payload.data.messages || [])].reverse());
            await apiRequest(`/api/v1/conversations/${thread.id}/read`, { method: 'PATCH' });
            setThreads((current) => current.map((item) => item.id === thread.id ? { ...item, unread_count: 0 } : item));
        } catch (requestError) { setError(requestError.message); }
    };
    useEffect(() => {
        let mounted = true;
        Promise.all([apiRequest('/api/v1/conversations?per_page=100'), apiRequest('/api/v1/conversations/recipients?per_page=100')]).then(([threadPayload, recipientPayload]) => {
            if (!mounted) return;
            setThreads(threadPayload?.data || []); setRecipients(recipientPayload?.data || []);
        }).catch((requestError) => mounted && setError(requestError.message)).finally(() => mounted && setLoading(false));
        return () => { mounted = false; };
    }, []);
    const startConversation = async (event) => {
        event.preventDefault(); setError('');
        const form = event.currentTarget; const formData = new FormData(form);
        try {
            const payload = await apiRequest('/api/v1/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(formData)) });
            form.reset(); await loadThreads(); await openThread(payload.data);
        } catch (requestError) { setError(requestError.message); }
    };
    const reply = async (event) => {
        event.preventDefault(); if (!active) return;
        const form = event.currentTarget; const body = new FormData(form).get('body');
        try {
            const payload = await apiRequest(`/api/v1/conversations/${active.id}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }) });
            setMessages((current) => [...current, payload.data]); form.reset(); await loadThreads();
        } catch (requestError) { setError(requestError.message); }
    };
    const otherParticipant = active?.participants?.find((participant) => Number(participant.id) !== Number(currentUserId));
    return (
        <section className="grid gap-4">
            <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><summary className="cursor-pointer font-black text-slate-950">Start a new conversation</summary><form onSubmit={startConversation} className="mt-4 grid gap-3"><label className="text-sm font-semibold text-slate-700">Recipient<select name="recipient_user_id" required className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"><option value="">Select a recipient</option>{recipients.map((recipient) => <option key={recipient.id} value={recipient.id}>{recipient.name} · {titleCase(recipient.role)}{recipient.institution_name ? ` · ${recipient.institution_name}` : ''}</option>)}</select></label><LightField label="Subject" name="subject" required /><LightTextarea label="Message" name="body" required /><button className="rounded-xl bg-[#006a61] px-4 py-3 text-sm font-black text-white">Send message</button></form></details>
            {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}
            <div className="grid min-h-[520px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[320px_1fr]">
                <aside className="border-b border-slate-200 lg:border-b-0 lg:border-r"><div className="border-b border-slate-100 p-4"><p className="font-black text-slate-950">Conversations</p><p className="text-xs font-semibold text-slate-500">Direct, authorized messages only</p></div><div className="max-h-[520px] overflow-y-auto">{threads.map((thread) => { const recipient = thread.participants?.find((participant) => Number(participant.id) !== Number(currentUserId)); return <button key={thread.id} type="button" onClick={() => openThread(thread)} className={cx('w-full border-b border-slate-100 p-4 text-left hover:bg-slate-50', active?.id === thread.id && 'bg-blue-50')}><div className="flex items-start justify-between gap-2"><p className="truncate font-black text-slate-950">{recipient?.name || thread.subject}</p>{thread.unread_count > 0 && <span className="rounded-full bg-[#006a61] px-2 py-0.5 text-[10px] font-black text-white">{thread.unread_count}</span>}</div><p className="mt-1 truncate text-xs font-semibold text-slate-500">{thread.subject}</p><p className="mt-1 truncate text-xs text-slate-400">{thread.latest_message?.body}</p></button>; })}{!threads.length && !loading && <p className="p-6 text-center text-sm text-slate-500">No conversations yet.</p>}{loading && <p className="p-6 text-center text-sm text-slate-500">Loading conversations...</p>}</div></aside>
                <div className="flex min-h-[420px] flex-col">{active ? <><header className="border-b border-slate-100 p-4"><p className="font-black text-slate-950">{otherParticipant?.name || active.subject}</p><p className="text-xs font-semibold text-slate-500">{active.subject}</p></header><div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 p-4">{messages.map((message) => { const mine = Number(message.sender?.id) === Number(currentUserId); return <div key={message.id} className={cx('flex', mine ? 'justify-end' : 'justify-start')}><article className={cx('max-w-[82%] rounded-2xl px-4 py-3 text-sm shadow-sm', mine ? 'bg-[#006a61] text-white' : 'border border-slate-200 bg-white text-slate-700')}><p className="whitespace-pre-wrap leading-6">{message.body}</p><p className={cx('mt-1 text-[10px] font-semibold', mine ? 'text-white/60' : 'text-slate-400')}>{formatDateTime(message.created_at)}</p></article></div>; })}</div><form onSubmit={reply} className="flex gap-2 border-t border-slate-100 p-4"><input name="body" required maxLength="5000" placeholder="Write a message..." className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#006a61]" /><button className="rounded-xl bg-[#006a61] px-4 py-3 text-sm font-black text-white">Send</button></form></> : <div className="grid flex-1 place-items-center p-8 text-center"><div><Inbox className="mx-auto text-slate-300" size={32} /><p className="mt-3 font-black text-slate-950">Select a conversation</p><p className="mt-1 text-sm text-slate-500">Choose a real thread or start a new message.</p></div></div>}</div>
            </div>
        </section>
    );
}

function dashboardNavGroups(role) {
    const itemsByRole = {
        university: [
            { id: 'overview', title: 'Overview', icon: LayoutDashboard },
            { id: 'events', title: 'Visit Programs', icon: CalendarDays },
            { id: 'visit-requests', title: 'Visit Requests', icon: Inbox },
            { id: 'schools', title: 'Partner Schools', icon: School },
            { id: 'attendees', title: 'Attendees', icon: UsersRound },
            { id: 'calendar', title: 'Schedule', icon: CalendarDays },
            { id: 'insights', title: 'Insights', icon: Brain },
            { id: 'messages', title: 'Communications', icon: Send },
            { id: 'settings', title: 'Settings', icon: Command },
        ],
        school: [
            { id: 'overview', title: 'Overview', icon: LayoutDashboard },
            { id: 'events', title: 'Discover Visits', icon: Search },
            { id: 'bookings', title: 'My Requests', icon: FolderKanban },
            { id: 'itinerary', title: 'Itinerary', icon: RouteIcon },
            { id: 'students', title: 'My Students', icon: UsersRound },
            { id: 'calendar', title: 'My Schedule', icon: CalendarDays },
            { id: 'messages', title: 'Messages', icon: Inbox },
            { id: 'reports', title: 'Activity Summary', icon: BarChart3 },
            { id: 'settings', title: 'Settings', icon: Command },
        ],
        high_school: [
            { id: 'overview', title: 'Overview', icon: LayoutDashboard },
            { id: 'events', title: 'Discover Visits', icon: Search },
            { id: 'bookings', title: 'My Requests', icon: FolderKanban },
            { id: 'itinerary', title: 'Itinerary', icon: RouteIcon },
            { id: 'students', title: 'My Students', icon: UsersRound },
            { id: 'calendar', title: 'My Schedule', icon: CalendarDays },
            { id: 'messages', title: 'Messages', icon: Inbox },
            { id: 'reports', title: 'Activity Summary', icon: BarChart3 },
            { id: 'settings', title: 'Settings', icon: Command },
        ],
        student: [
            { id: 'my-visits', title: 'My Visits', icon: FolderKanban },
            { id: 'messages', title: 'Messages', icon: Inbox },
            { id: 'itinerary', title: 'Itinerary', icon: RouteIcon },
            { id: 'notifications', title: 'Notifications', icon: Bell },
            { id: 'profile', title: 'Profile', icon: UsersRound },
            { id: 'settings', title: 'Settings', icon: Command },
        ],
        admin: [
            { id: 'overview', title: 'Platform Overview', icon: LayoutDashboard },
            { id: 'universities', title: 'Institutions', icon: GraduationCap },
            { id: 'schools', title: 'Schools', icon: School },
            { id: 'messages', title: 'Messages', icon: Inbox },
            { id: 'content', title: 'Content', icon: Blocks },
            { id: 'waitlist', title: 'Waitlist', icon: UserPlus },
            { id: 'events', title: 'Visit Activity', icon: CalendarDays },
            { id: 'users-access', title: 'Users & Access', icon: ShieldCheck },
            { id: 'analytics', title: 'Analytics', icon: Activity },
            { id: 'system-health', title: 'Operational Readiness', icon: Terminal },
            { id: 'settings', title: 'Settings', icon: Command },
        ],
    };

    return [{ items: itemsByRole[role] || itemsByRole.student }];
}

function flatNavItems(groups) {
    const flatten = (items) => items.flatMap((item) => [item, ...(item.children ? flatten(item.children) : [])]);
    return groups.flatMap((group) => flatten(group.items));
}

function dashboardContent(role, activeId, metrics, actions, context = {}) {
    const { csrf, roadmap, events, scheduleEvents, registrations, users, schools, schoolAccounts, students, visitRequests, itineraryItems, archives, tasks, analytics, messages, schoolProfile, securityProfile, universityOverview, universitySettings, universityCompliance, systemHealth, platformSettings, waitlist, programs, admissionApplications, studentPortfolio, notifications, contentManagement, errors, old, setActiveId } = context;
    const baseMetrics = metrics.map((metric) => ({ ...metric, trend: metric.trend || 'Ready for live data' }));
    const removedAdmissionsSections = ['programs', 'applications', 'search-apply', 'documents', 'payments'];
    if (removedAdmissionsSections.includes(activeId)) {
        activeId = role === 'student' ? 'my-visits' : role === 'admin' ? 'overview' : ['school', 'high_school'].includes(role) ? 'events' : 'events';
    }

    const adminOnlySections = ['roadmap', 'request-inbox', 'checkout'];
    if (role !== 'admin' && adminOnlySections.includes(activeId)) {
        activeId = 'overview';
    }

    if (role === 'admin' && activeId === 'overview') {
        return {
            title: 'Platform Overview',
            subtitle: 'Master oversight for institutions, schools, users, visit activity, messages, and system readiness.',
            action: 'Review platform',
            metrics: baseMetrics,
            custom: <AdminPlatformOverviewSection users={users || []} events={events || []} registrations={registrations || []} schools={schools || []} visitRequests={visitRequests || []} messages={messages || []} analytics={analytics || {}} setSection={setActiveId || (() => {})} />,
        };
    }

    if (role === 'university' && activeId === 'overview') {
        return {
            title: 'Recruitment Dashboard',
            subtitle: 'Welcome back. Here is your campaign performance and upcoming visit activity.',
            action: 'Create Visit',
            metrics: baseMetrics,
            custom: <UniversityRecruitmentOverview csrf={csrf} events={events || []} overview={universityOverview || {}} setSection={setActiveId || (() => {})} />,
        };
    }

    if (role === 'university' && activeId === 'events') {
        return {
            title: 'Visit Programs',
            subtitle: 'Create, publish, and manage the visit experiences your institution hosts.',
            action: 'Create program',
            metrics: baseMetrics,
            custom: <UniversityVisitsSection csrf={csrf} events={events || []} registrations={registrations || []} schools={schools || []} settings={universitySettings || {}} errors={errors || {}} old={old || {}} />,
        };
    }

    if (role === 'university' && activeId === 'programs') {
        return { title: 'Academic Programs', subtitle: 'Manage application requirements, deadlines, fees, and capacity.', action: 'Create program', metrics: baseMetrics, custom: <AcademicProgramsSection csrf={csrf} programs={programs || []} role="university" /> };
    }

    if (role === 'university' && activeId === 'applications') {
        return { title: 'Applications', subtitle: 'Review applicants and record admission decisions.', action: 'Review applications', metrics: baseMetrics, custom: <AdmissionApplicationsSection csrf={csrf} applications={admissionApplications || []} role="university" /> };
    }

    if (role === 'university' && activeId === 'university-prd') {
        return {
            title: 'University PRD',
            subtitle: 'Temporary production-readiness checklist for the University Portal.',
            action: 'Review readiness',
            metrics: baseMetrics,
            custom: <UniversityPrdTracker events={events || []} registrations={registrations || []} schools={schools || []} visitRequests={visitRequests || []} analytics={analytics || {}} settings={universitySettings || {}} compliance={universityCompliance || {}} messages={messages || []} />,
        };
    }

    if (role === 'university' && activeId === 'visit-requests') {
        return { title: 'Visit Requests', subtitle: 'Send requests to school accounts and review requests submitted by schools.', action: 'Review requests', metrics: baseMetrics, custom: <UniversityVisitRequestsSection csrf={csrf} visitRequests={visitRequests || []} schools={schoolAccounts || []} events={events || []} currentUserId={securityProfile?.user?.id} /> };
    }

    if (role === 'university' && activeId === 'schools') {
        return {
            title: 'Partner Schools',
            subtitle: 'Manage school relationships and prioritize recruitment opportunities.',
            action: 'Explore schools',
            metrics: baseMetrics,
            custom: <PartnerSchoolsSection csrf={csrf} schools={schools || []} visitRequests={visitRequests || []} archives={archives || []} />,
        };
    }

    if (role === 'university' && activeId === 'attendees') {
        return {
            title: 'Attendees',
            subtitle: 'View confirmed and waitlisted participants across your visit programs.',
            action: 'Export attendees',
            metrics: baseMetrics,
            custom: <UniversityAttendeesSection csrf={csrf} registrations={registrations || []} events={events || []} />,
        };
    }

    if (role === 'university' && activeId === 'calendar') {
        return {
            title: 'Schedule',
            subtitle: 'View upcoming visit programs and important hosting dates.',
            action: 'Create program',
            metrics: baseMetrics,
            custom: <EventCalendarSection csrf={csrf} events={events || []} registrations={registrations || []} title="University Calendar" canManage />,
        };
    }

    if (role === 'university' && activeId === 'insights') {
        return {
            title: 'Recruitment insights',
            subtitle: 'Review recorded engagement, funnel activity, and saved school priorities.',
            action: 'Refresh insights',
            metrics: baseMetrics,
            custom: <AnalyticsForecastSection csrf={csrf} analytics={analytics || {}} schools={schools || []} />,
        };
    }

    if (role === 'university' && activeId === 'messages') {
        return { title: 'Communications', subtitle: 'Send and review direct student communications.', action: 'New message', metrics: baseMetrics, custom: <ConversationCenterSection currentUserId={securityProfile?.user?.id} /> };
    }

    if (role === 'university' && activeId === 'settings') {
        return {
            title: 'Settings',
            subtitle: 'Manage university profile, branding, team contacts, defaults, notifications, integrations, and security.',
            action: 'Save changes',
            metrics: baseMetrics,
            custom: <UniversitySettingsSection csrf={csrf} settings={universitySettings || {}} securityProfile={securityProfile || {}} compliance={universityCompliance || {}} errors={errors || {}} old={old || {}} />,
        };
    }

    if (['school', 'high_school'].includes(role) && activeId === 'overview') {
        return { title: 'Coordinator Overview', subtitle: 'Monitor campus visits and student engagement metrics.', action: 'New request', metrics: baseMetrics, custom: <SchoolCoordinatorOverviewSection events={events || []} registrations={registrations || []} schools={schools || []} students={students || []} visitRequests={visitRequests || []} analytics={analytics || {}} messages={messages || []} profile={schoolProfile || {}} setSection={setActiveId || (() => {})} /> };
    }

    if (['school', 'high_school'].includes(role) && activeId === 'students') {
        return { title: 'My Students', subtitle: 'Manage and assign students to upcoming university visits.', action: 'Add student', metrics: baseMetrics, custom: <SchoolStudentsSection csrf={csrf} events={events || []} students={students || []} visitRequests={visitRequests || []} errors={errors || {}} /> };
    }

    if (['school', 'high_school'].includes(role) && activeId === 'explore-universities') {
        return { title: 'Explore Universities', subtitle: 'Discover available university opportunities and suitable visit partners.', action: 'Explore', metrics: baseMetrics, custom: <SchoolExploreUniversitiesSection events={events || []} schools={schools || []} setSection={setActiveId || (() => {})} /> };
    }

    if (['school', 'high_school'].includes(role) && activeId === 'events') {
        return { title: 'Discover Visits', subtitle: 'Find and request upcoming university visit programs for your students.', action: 'Request visit', metrics: baseMetrics, custom: <SchoolAvailableVisitsSection csrf={csrf} events={(events || []).filter((event) => event.status === 'published')} visitRequests={visitRequests || []} old={old || {}} errors={errors || {}} setSection={setActiveId || (() => {})} /> };
    }

    if (['school', 'high_school'].includes(role) && activeId === 'bookings') {
        return { title: 'My Requests', subtitle: 'Track pending, approved, and completed visit requests.', action: 'New visit request', metrics: baseMetrics, custom: <SchoolBookingsSection csrf={csrf} visitRequests={visitRequests || []} registrations={registrations || []} events={events || []} currentUserId={securityProfile?.user?.id} setSection={setActiveId || (() => {})} /> };
    }

    if (['school', 'high_school'].includes(role) && activeId === 'programs') {
        return { title: 'Programs & Classes', subtitle: 'Manage entry requirements, deadlines, fees, and capacity.', action: 'Create program', metrics: baseMetrics, custom: <AcademicProgramsSection csrf={csrf} programs={programs || []} role="school" /> };
    }

    if (['school', 'high_school'].includes(role) && activeId === 'applications') {
        return { title: 'Applications', subtitle: 'Review applicants and record school admission decisions.', action: 'Review applications', metrics: baseMetrics, custom: <AdmissionApplicationsSection csrf={csrf} applications={admissionApplications || []} role="school" /> };
    }

    if (['school', 'high_school'].includes(role) && activeId === 'itinerary') {
        return { title: 'Itinerary', subtitle: 'Build, arrange, and manage a route from approved visit destinations.', action: 'Manage route', metrics: baseMetrics, custom: <SchoolItinerarySection csrf={csrf} visitRequests={visitRequests || []} registrations={registrations || []} events={scheduleEvents || []} students={students || []} itineraryItems={itineraryItems || []} setSection={setActiveId || (() => {})} /> };
    }

    if (['school', 'high_school'].includes(role) && activeId === 'calendar') {
        return { title: 'My Schedule', subtitle: 'View approved visits and student attendance dates.', action: 'Discover visits', metrics: baseMetrics, custom: <EventCalendarSection csrf={csrf} events={scheduleEvents || []} registrations={registrations || []} title="School Schedule" canManage={false} /> };
    }

    if (['school', 'high_school'].includes(role) && activeId === 'reports') {
        return {
            title: 'Activity Summary',
            subtitle: 'Review visit participation, attendance, and student engagement intelligence.',
            action: 'Export summary',
            metrics: baseMetrics,
            custom: <AnalyticsForecastSection analytics={analytics || {}} schools={schools || []} />,
        };
    }

    if (['school', 'high_school'].includes(role) && activeId === 'messages') {
        return { title: 'Messages', subtitle: 'Review direct student and administrator communications.', action: 'New message', metrics: baseMetrics, custom: <ConversationCenterSection currentUserId={securityProfile?.user?.id} /> };
    }

    if (['school', 'high_school'].includes(role) && activeId === 'settings') {
        return {
            title: 'Settings',
            subtitle: 'Manage your school profile, notification preferences, and account security.',
            action: 'Save changes',
            metrics: baseMetrics,
            custom: <div className="space-y-8"><SchoolSettingsSection csrf={csrf} profile={schoolProfile || {}} errors={errors || {}} old={old || {}} /><SecurityAccessSection csrf={csrf} profile={securityProfile || {}} errors={errors || {}} role={role} /></div>,
        };
    }

    if (role === 'student' && activeId === 'my-visits') {
        return { title: 'My Visits', subtitle: 'Track your assigned campus visits and current attendance status.', action: 'Refresh', metrics: baseMetrics, custom: <StudentVisitsSection csrf={csrf} userId={securityProfile?.user?.id} /> };
    }

    if (role === 'student' && activeId === 'search-apply') {
        return { title: 'Search & Apply', subtitle: 'Find real university and school programs and submit an application.', action: 'Search programs', metrics: baseMetrics, custom: <StudentSearchApplySection csrf={csrf} programs={programs || []} applications={admissionApplications || []} /> };
    }

    if (role === 'student' && activeId === 'applications') {
        return { title: 'Applications', subtitle: 'Track submitted, reviewed, waitlisted, accepted, or rejected applications.', action: 'Track applications', metrics: baseMetrics, custom: <AdmissionApplicationsSection csrf={csrf} applications={admissionApplications || []} role="student" /> };
    }

    if (role === 'student' && activeId === 'documents') {
        return { title: 'Documents', subtitle: 'Manage your academic history and private application documents.', action: 'Upload document', metrics: baseMetrics, custom: <StudentDocumentsSection csrf={csrf} portfolio={studentPortfolio || {}} applications={admissionApplications || []} profile={securityProfile || {}} /> };
    }

    if (role === 'student' && activeId === 'payments') {
        return { title: 'Payments', subtitle: 'Pay application fees and view verified receipts.', action: 'Review fees', metrics: baseMetrics, custom: <StudentPaymentsSection csrf={csrf} applications={admissionApplications || []} /> };
    }

    if (role === 'student' && activeId === 'messages') {
        return { title: 'Messages', subtitle: 'Message schools, universities, and platform administrators directly.', action: 'New message', metrics: baseMetrics, custom: <ConversationCenterSection currentUserId={securityProfile?.user?.id} /> };
    }

    if (role === 'student' && activeId === 'itinerary') {
        return { title: 'Itinerary', subtitle: 'View the shared itinerary for your assigned campus visits.', action: 'Refresh', metrics: baseMetrics, custom: <StudentItineraryDashboardSection userId={securityProfile?.user?.id} /> };
    }

    if (role === 'student' && activeId === 'notifications') {
        return { title: 'Notifications', subtitle: 'Read application, payment, message, and visit updates.', action: 'Review alerts', metrics: baseMetrics, custom: <PlatformNotificationsSection initial={notifications || {}} /> };
    }

    if (role === 'student' && activeId === 'profile') {
        return { title: 'Profile', subtitle: 'Manage student details, guardian information, and visit support needs.', action: 'Save profile', metrics: baseMetrics, custom: <StudentProfileSection csrf={csrf} profile={securityProfile || {}} registrations={registrations || []} errors={errors || {}} old={old || {}} /> };
    }

    if (role === 'student' && activeId === 'settings') {
        return { title: 'Settings', subtitle: 'Manage student account security and sessions.', action: 'Save settings', metrics: baseMetrics, custom: <SecurityAccessSection csrf={csrf} profile={securityProfile || {}} errors={errors || {}} role="student" /> };
    }

    if (role === 'admin' && activeId === 'universities') {
        return { title: 'Institutions', subtitle: 'Manage university accounts, verification state, and visit-program activity.', action: 'New institution', metrics: baseMetrics, custom: <AdminUniversitiesSection csrf={csrf} users={users || []} events={events || []} registrations={registrations || []} errors={errors || {}} /> };
    }

    if (role === 'admin' && activeId === 'schools') {
        return { title: 'Schools', subtitle: 'Manage registered school accounts and the separate outreach directory.', action: 'Add school account', metrics: baseMetrics, custom: <AdminSchoolsSection csrf={csrf} schools={schools || []} schoolAccounts={schoolAccounts || []} visitRequests={visitRequests || []} archives={archives || []} errors={errors || {}} /> };
    }

    if (role === 'admin' && activeId === 'events') {
        return { title: 'Visit Activity', subtitle: 'Monitor visit programs, requests, logistics warnings, and archived visit operations.', action: 'Review activity', metrics: baseMetrics, custom: <AdminVisitActivitySection csrf={csrf} events={events || []} visitRequests={visitRequests || []} registrations={registrations || []} archives={archives || []} /> };
    }

    if (role === 'admin' && activeId === 'applications') {
        return { title: 'Application Oversight', subtitle: 'Review all platform applications and intervene in decisions when needed.', action: 'Review applications', metrics: baseMetrics, custom: <AdmissionApplicationsSection csrf={csrf} applications={admissionApplications || []} role="admin" /> };
    }

    if (role === 'admin' && activeId === 'messages') {
        return { title: 'Messages', subtitle: 'Message any active verified platform user directly.', action: 'New message', metrics: baseMetrics, custom: <ConversationCenterSection currentUserId={securityProfile?.user?.id} /> };
    }

    if (role === 'admin' && activeId === 'content') {
        return { title: 'Content', subtitle: 'Manage notification broadcasts, the FAQ library, and active notification delivery templates.', action: 'Manage content', metrics: baseMetrics, custom: <AdminContentSection csrf={csrf} content={contentManagement || {}} /> };
    }

    if (role === 'admin' && activeId === 'waitlist') {
        return { title: 'Waitlist', subtitle: 'Review launch-interest records captured from the public waitlist page.', action: 'Export CSV', metrics: baseMetrics, custom: <AdminWaitlistSection waitlist={waitlist || {}} /> };
    }

    if (role === 'admin' && activeId === 'users-access') {
        return { title: 'Users & Access', subtitle: 'Manage platform users, portal roles, security posture, and access status.', action: 'Create user', metrics: baseMetrics, custom: <AdminUsersAccessSection csrf={csrf} users={users || []} schoolAccounts={schoolAccounts || []} errors={errors || {}} /> };
    }

    if (role === 'admin' && activeId === 'analytics') {
        return { title: 'Analytics', subtitle: 'Track platform-wide conversion, engagement, communication, and demand signals.', action: 'Export report', metrics: baseMetrics, custom: <AdminAnalyticsSection analytics={analytics || {}} users={users || []} events={events || []} registrations={registrations || []} schools={schools || []} visitRequests={visitRequests || []} messages={messages || []} /> };
    }

    if (role === 'admin' && activeId === 'system-health') {
        return { title: 'Operational Readiness', subtitle: 'Review configuration, runtime checks, server facts, and audit activity.', action: 'Refresh checks', metrics: baseMetrics, custom: <AdminSystemHealthSection health={systemHealth || {}} /> };
    }

    if (role === 'admin' && activeId === 'settings') {
        return {
            title: 'Settings',
            subtitle: 'Configure global platform settings, feature flags, integrations, and administrator security.',
            action: 'Save configuration',
            metrics: baseMetrics,
            custom: <AdminSettingsSection csrf={csrf} settings={platformSettings || {}} profile={securityProfile || {}} errors={errors || {}} />,
        };
    }

    if (activeId === 'discovery') {
        return {
            title: 'School discovery',
            subtitle: 'Find target institutions, compare opportunity scores, and plan outreach.',
            action: 'Apply filters',
            metrics: baseMetrics,
            custom: <DiscoverySection schools={schools || []} />,
        };
    }

    if (activeId === 'request-inbox') {
        return {
            title: 'Request inbox',
            subtitle: 'Approve, decline, and schedule school visit requests.',
            action: 'New match',
            metrics: baseMetrics,
            custom: <RequestInboxSection csrf={csrf} visitRequests={visitRequests || []} />,
        };
    }

    if (activeId === 'archive' || activeId === 'reports' || activeId === 'sync') {
        return {
            title: activeId === 'sync' ? 'Leads sync' : 'Visit archive',
            subtitle: 'Review historical visit outcomes and synchronize lead data.',
            action: 'Export data',
            metrics: baseMetrics,
            custom: <VisitArchiveSection csrf={csrf} archives={archives || []} analytics={analytics || {}} />,
        };
    }

    if (activeId === 'itinerary') {
        return {
            title: 'Route itinerary',
            subtitle: 'Optimize recruiter travel, visit sequencing, and logistics.',
            action: 'Review route',
            metrics: baseMetrics,
            custom: <ItinerarySection />,
        };
    }

    if (activeId === 'checkout') {
        return {
            title: 'Visit check-out',
            subtitle: 'Sync leads, rate outcomes, and complete post-visit tasks.',
            action: 'Complete visit',
            metrics: baseMetrics,
            custom: <CheckoutSection csrf={csrf} archives={archives || []} tasks={tasks || []} />,
        };
    }

    if (activeId === 'analytics') {
        return {
            title: 'Recruitment analytics',
            subtitle: 'Forecast engagement, identify growth hotspots, and prioritize next actions.',
            action: 'Generate recommendations',
            metrics: baseMetrics,
            custom: <AnalyticsForecastSection analytics={analytics || {}} schools={schools || []} />,
        };
    }

    if (activeId === 'roadmap') {
        return {
            title: 'Build roadmap',
            subtitle: 'Track every PRD feature as we complete the platform.',
            action: 'Add milestone later',
            metrics: baseMetrics,
            custom: <RoadmapTracker roadmap={roadmap} />,
        };
    }

    if (activeId === 'events' && role === 'university') {
        return {
            title: 'Event management',
            subtitle: 'Create and publish campus visit events with capacity controls.',
            action: 'New event',
            metrics: baseMetrics,
            custom: (
                <div className="grid gap-6">
                    <EventBuilder csrf={csrf} errors={errors || {}} old={old || {}} />
                    <EventCards csrf={csrf} events={events || []} role={role} old={old || {}} errors={errors || {}} />
                </div>
            ),
        };
    }

    if ((activeId === 'events' || activeId === 'calendar') && ['student', 'school', 'high_school'].includes(role)) {
        if (activeId === 'calendar' && role === 'student') {
            return {
                title: 'Calendar',
                subtitle: 'Visual schedule of your registered campus visits.',
                action: 'Browse events',
                metrics: baseMetrics,
                custom: <StudentCalendarSection registrations={registrations || []} />,
            };
        }

        return {
            title: role === 'student' ? 'Browse Events' : 'Visit calendar',
            subtitle: role === 'student' ? 'View available published events, filter by date or location, and register in one click.' : 'Browse published university campus visits and reserve seats.',
            action: role === 'student' ? 'Register' : 'Book visit',
            metrics: baseMetrics,
            custom: <EventCards csrf={csrf} events={(events || []).filter((event) => event.status === 'published')} role={role} old={old || {}} errors={errors || {}} />,
        };
    }

    if (activeId === 'registrations' || activeId === 'bookings') {
        return {
            title: role === 'student' ? 'My Bookings' : (activeId === 'bookings' ? 'Group bookings' : 'Registrations'),
            subtitle: role === 'student' ? 'Track your registered events and confirmed or waitlisted status.' : 'Live registration and waitlist records.',
            action: 'Export later',
            metrics: baseMetrics,
            custom: <RegistrationTable registrations={registrations || []} />,
        };
    }

    if (activeId === 'notifications' && role === 'student') {
        return {
            title: 'Notifications',
            subtitle: 'Show reminders, booking updates, and waitlist changes.',
            action: 'Refresh',
            metrics: baseMetrics,
            custom: <StudentNotificationsSection registrations={registrations || []} />,
        };
    }
    const contentByRole = {
        admin: {
            overview: ['Platform Overview', 'Monitor institutions, visit activity, users, and platform readiness.', 'Create user', ['Name', 'Role', 'Status'], [['Platform Admin', 'Admin', 'Active'], ['University Demo', 'University', 'Active'], ['High School Demo', 'High School', 'Active']], 'No users yet.'],
            users: ['User management', 'Create, review, and manage role-based accounts.', 'Add user', ['Name', 'Role', 'Status'], [['Platform Admin', 'Admin', 'Active'], ['University Demo', 'University', 'Active'], ['Student Demo', 'Student', 'Active']], 'No users yet.'],
            events: ['Event monitoring', 'Review all campus visit events across universities.', 'Review events', ['Event', 'Institution', 'Status'], [], 'No events have been created yet.'],
            waitlist: ['Waitlist operations', 'Review launch demand and export early access leads.', 'Open waitlist admin', ['Lead source', 'Segment', 'Status'], [['Landing page', 'Student', 'Captured'], ['Landing page', 'Institution', 'Captured']], 'No waitlist leads yet.'],
            reports: ['Reports', 'Export platform reports for operations and leadership.', 'Export report', ['Report', 'Format', 'Status'], [['Visit archive', 'CSV', 'Available'], ['Platform usage', 'PDF', 'Planned']], 'No reports available.'],
        },
        university: {
            overview: ['Recruitment overview', 'Track visit activity and pending recruitment work.', 'Create event', ['Event', 'Date', 'Status'], [['Campus Preview Day', 'Draft', 'Needs capacity'], ['STEM Faculty Tour', 'Draft', 'Needs publication']], 'Create your first event.'],
            events: ['Event management', 'Create, publish, edit, or cancel campus visit events.', 'New event', ['Event', 'Capacity', 'Status'], [['Campus Preview Day', '120 seats', 'Draft'], ['Arts Open House', '80 seats', 'Draft']], 'No events yet.'],
            registrations: ['Registrations', 'View students and schools registered for your visits.', 'Export attendees', ['Registrant', 'Event', 'Status'], [], 'No registrations yet.'],
            attendance: ['Attendance tracking', 'Mark attendance and compare expected versus actual turnout.', 'Mark attendance', ['Event', 'Expected', 'Attended'], [], 'No attendance records yet.'],
            templates: ['Message templates', 'Prepare confirmation, reminder, and cancellation templates.', 'Create template', ['Template', 'Channel', 'Status'], [['Registration confirmation', 'Email', 'Draft'], ['24h reminder', 'Email', 'Draft']], 'No templates yet.'],
        },
        high_school: {
            overview: ['School coordination', 'Manage students, bookings, and visit participation.', 'Add students', ['Student group', 'Event', 'Status'], [['Senior science cohort', 'Unassigned', 'Ready'], ['Guidance office list', 'Unassigned', 'Draft']], 'No groups yet.'],
            students: ['Student list', 'Maintain student records for bulk campus visit registration.', 'Add student', ['Student', 'Grade', 'Status'], [['Demo Student', '12', 'Ready']], 'No students added yet.'],
            bookings: ['Group bookings', 'Register student groups for university campus visits.', 'Start booking', ['Group', 'Visit', 'Status'], [], 'No group bookings yet.'],
            calendar: ['Visit calendar', 'Track upcoming visits and avoid participation conflicts.', 'View calendar', ['Date', 'Visit', 'Students'], [], 'No visits scheduled yet.'],
            attendance: ['Participation', 'Record attendance per student after each campus visit.', 'Update attendance', ['Student', 'Visit', 'Attendance'], [], 'No attendance records yet.'],
        },
        student: {
            overview: ['Student Dashboard', 'View upcoming registered visits and confirmed or waitlisted status.', 'Browse events', ['Visit', 'Status', 'Seats'], (registrations || []).slice(0, 4).map((registration) => [registration.event, registration.status, registration.partySize]), 'No upcoming registered visits yet.'],
            events: ['Browse Events', 'Browse campus visit opportunities published by universities.', 'Register', ['Event', 'Date', 'Slots'], [['Campus Preview Day', 'TBA', 'Open'], ['Arts Open House', 'TBA', 'Open']], 'No events available yet.'],
            registrations: ['My Bookings', 'View confirmed visits and upcoming reminders.', 'View details', ['Event', 'Status', 'Seats'], (registrations || []).map((registration) => [registration.event, registration.status, registration.partySize]), 'No bookings yet.'],
            calendar: ['Calendar', 'Visual schedule of your registered visits.', 'Browse events', ['Visit', 'Status', 'Seats'], (registrations || []).map((registration) => [registration.event, registration.status, registration.partySize]), 'No scheduled visits yet.'],
            notifications: ['Notifications', 'Read visit confirmations, reminders, and updates.', 'Mark all read', ['Notification', 'Channel', 'Status'], [], 'No notifications yet.'],
        },
    };

    const selected = contentByRole[role]?.[activeId] || contentByRole[role]?.overview || contentByRole.student.overview;
    const [title, subtitle, action, columns, rows, empty] = selected;

    return {
        title,
        subtitle,
        action,
        metrics: baseMetrics,
        primary: {
            title: activeId === 'analytics' ? 'Performance snapshot' : title,
            description: activeId === 'analytics' ? 'This section will connect to live analytics as event data grows.' : subtitle,
            columns,
            rows: activeId === 'analytics' ? [] : rows,
            empty: activeId === 'analytics' ? 'Analytics will populate after events and registrations are active.' : empty,
        },
        secondary: {
            title: 'Next actions',
            items: actions,
        },
    };
}

function Metric({ label, value, icon: Icon }) {
    return (
        <article className="rounded-2xl border border-white/15 bg-white/[0.07] p-5 shadow-xl shadow-black/15 backdrop-blur">
            <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-white/55">{label}</p>
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-100">
                    <Icon size={20} />
                </div>
            </div>
            <p className="mt-5 text-4xl font-light tracking-normal text-white">{value}</p>
        </article>
    );
}

function CenteredShell({ children }) {
    return (
        <DarkShell className="grid place-items-center px-5 py-10">
            {children}
        </DarkShell>
    );
}

function DarkShell({ children, className = '' }) {
    return (
        <main className={cx('relative min-h-screen overflow-hidden bg-black', className)}>
            <AnimatedBackground />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_2%,rgba(217,255,0,.055),transparent_18%),linear-gradient(180deg,rgba(0,0,0,.2),rgba(0,0,0,.92))]" />
            {children}
        </main>
    );
}

function AnimatedBackground() {
    const mountRef = useRef(null);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) {
            return undefined;
        }

        let disposed = false;
        let disposeScene;

        void (async () => {
            const {
                AdditiveBlending,
                DoubleSide,
                Mesh,
                PerspectiveCamera,
                QuadraticBezierCurve3,
                Scene,
                ShaderMaterial,
                TubeGeometry,
                Vector3,
                WebGLRenderer,
            } = await import('three');

            if (disposed || !mount.isConnected) return;

        const scene = new Scene();
        const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000, 0);
        mount.appendChild(renderer.domElement);

        const curve = new QuadraticBezierCurve3(
            new Vector3(-14, -3.2, 0),
            new Vector3(0.5, 3.4, 0),
            new Vector3(15, -0.2, 0)
        );

        const vertexShader = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            uniform float time;
            varying vec2 vUv;
            void main() {
                vec3 color1 = vec3(1.0, 0.12, 0.07);
                vec3 color2 = vec3(0.88, 0.06, 0.46);
                vec3 color3 = vec3(0.03, 0.72, 0.55);
                vec3 color = mix(color1, color2, vUv.x);
                color = mix(color, color3, smoothstep(0.68, 1.0, vUv.x));
                float glow = pow(1.0 - abs(vUv.y - 0.5) * 2.0, 2.0);
                float fade = 1.0 - smoothstep(0.88, 1.0, vUv.x);
                float pulse = sin(time * 1.45) * 0.08 + 0.92;
                gl_FragColor = vec4(color * glow * pulse * fade, glow * fade * 0.72);
            }
        `;

        const tubeGeometry = new TubeGeometry(curve, 220, 0.7, 32, false);
        const glowGeometry = new TubeGeometry(curve, 220, 1.55, 32, false);
        const material = new ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: { time: { value: 0 } },
            transparent: true,
            blending: AdditiveBlending,
            side: DoubleSide,
        });
        const glowMaterial = new ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: { time: { value: 0 } },
            transparent: true,
            blending: AdditiveBlending,
            side: DoubleSide,
        });

        const lightStreak = new Mesh(tubeGeometry, material);
        const glowLayer = new Mesh(glowGeometry, glowMaterial);
        scene.add(lightStreak, glowLayer);
        camera.position.z = 7;
        camera.position.y = -0.75;

        let animationId;
        const animate = () => {
            animationId = requestAnimationFrame(animate);
            const time = Date.now() * 0.001;
            material.uniforms.time.value = time;
            glowMaterial.uniforms.time.value = time * 0.8;
            lightStreak.rotation.z = Math.sin(time * 0.18) * 0.045;
            glowLayer.rotation.z = lightStreak.rotation.z;
            renderer.render(scene, camera);
        };

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };

        window.addEventListener('resize', handleResize);
        animate();

        disposeScene = () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationId);
            renderer.dispose();
            tubeGeometry.dispose();
            glowGeometry.dispose();
            material.dispose();
            glowMaterial.dispose();
            if (mount.contains(renderer.domElement)) {
                mount.removeChild(renderer.domElement);
            }
        };
        })().catch(() => {
            // The background is decorative; keep the screen usable if WebGL is unavailable.
        });

        return () => {
            disposed = true;
            disposeScene?.();
        };
    }, []);

    return <div ref={mountRef} className="pointer-events-none fixed inset-0 z-0 opacity-20" />;
}

createRoot(document.getElementById('app')).render(<AppErrorBoundary><App /></AppErrorBoundary>);



