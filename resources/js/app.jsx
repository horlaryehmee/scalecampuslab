import React, { Component, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import L from 'leaflet';
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
import {
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
} from 'three';
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
                    window.location.assign('/dashboard');
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
                            <a href="/logout" onClick={(event) => { event.preventDefault(); document.getElementById('fallback-logout')?.submit(); }} className="inline-flex rounded-xl border border-white/15 px-4 py-2.5 text-sm font-black text-white">Sign out</a>
                        </div>
                        <form id="fallback-logout" action="/logout" method="POST" className="hidden"><input type="hidden" name="_token" value={document.querySelector('meta[name=csrf-token]')?.content || ''} /></form>
                    </section>
                </CenteredShell>
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

    if (page === 'forgot-password') {
        return <ForgotPasswordPage csrf={csrf} errors={errors} old={old} flash={JSON.parse(mount.dataset.flash || '{}')} {...props} />;
    }

    if (page === 'dashboard') {
        return <RoleDashboard csrf={csrf} errors={errors} old={old} flash={flash} {...props} />;
    }

    return <LandingPage csrf={csrf} errors={errors} old={old} signupCount={props.signupCount} />;
}

function EmptyState({ message }) {
    return (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-7 text-center text-sm font-semibold text-slate-500">
            {message}
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
    const timeLeft = useCountdown('2027-02-01T09:00:00Z');
    const joinedCount = Math.max(signupCount, 1);

    return (
        <DarkShell className="bg-[#101010]">
            <div className="pointer-events-none absolute inset-0 z-[1] opacity-[0.42]">
                <div className="absolute left-1/2 top-[-14rem] h-[42rem] w-[42rem] -translate-x-1/2 rounded-[42%_58%_38%_62%] border border-white/10" />
                <div className="absolute left-[55%] top-[-21rem] h-[55rem] w-[55rem] -translate-x-1/2 rotate-[-18deg] rounded-[45%_55%_34%_66%] border border-white/[0.075]" />
                <div className="absolute left-[62%] top-[8rem] h-[40rem] w-[40rem] rotate-[28deg] rounded-[38%_62%_52%_48%] border border-white/[0.06]" />
            </div>

            <section className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-5 py-12 text-center sm:px-8">
                <div className="absolute right-5 top-5 sm:right-8 sm:top-8">
                    <a href="/login" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15">
                        Sign in <ArrowRight size={15} />
                    </a>
                </div>
                <EarlyAccessLogo />

                <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 shadow-2xl shadow-black/30 backdrop-blur">
                    <span className="h-2 w-2 rounded-full bg-lime-300 shadow-[0_0_14px_rgba(217,255,0,.9)]" />
                    <span className="text-[11px] font-black uppercase tracking-normal text-white/62">Available in early 2027</span>
                </div>

                <h1 className="mt-7 text-4xl font-semibold leading-tight tracking-normal text-white sm:text-5xl">Get notified when we launch</h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/42 sm:text-base">
                    Leave your email and we will let you know when ScaleCampusLab officially launches. This does not create an account or give you platform access.
                </p>

                <WaitlistForm csrf={csrf} errors={errors} old={old} />
                <AudienceStrip signupCount={joinedCount} />
                <Countdown timeLeft={timeLeft} />

                <div className="mt-5 flex items-center gap-2 text-[11px] font-black uppercase tracking-normal text-white/58">
                    <CalendarDays size={14} className="text-white/35" />
                    Left until full release
                </div>

            </section>
        </DarkShell>
    );
}

function WaitlistForm({ csrf, errors, old }) {
    return (
        <section id="waitlist" className="mt-7 w-full max-w-[520px]">
            <form action="/waitlist" method="POST">
                <input type="hidden" name="_token" value={csrf} />
                <input type="hidden" name="full_name" value={old.full_name || 'Launch Notification Subscriber'} />
                <input type="hidden" name="role" value={old.role || 'student'} />
                <input type="hidden" name="consent" value="1" />
                <div className="flex h-11 items-center gap-2 rounded-xl border border-white/[0.055] bg-white/[0.045] p-1.5 shadow-2xl shadow-black/20 backdrop-blur">
                    <label htmlFor="email" className="sr-only">Email address</label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Email"
                        defaultValue={old.email || ''}
                        autoComplete="email"
                        className="min-w-0 flex-1 bg-transparent px-2.5 text-sm font-semibold text-white outline-none placeholder:text-white/28"
                    />
                    <button className="h-8 shrink-0 rounded-lg bg-lime-300 px-4 text-sm font-black text-black shadow-[0_0_22px_rgba(217,255,0,.28)] hover:bg-lime-200">
                        Join waitlist
                    </button>
                </div>
                {errors.email?.[0] && <p className="mt-2 text-sm font-semibold text-red-300">{errors.email[0]}</p>}
                {(errors.full_name?.[0] || errors.role?.[0] || errors.consent?.[0]) && (
                    <p className="mt-2 text-sm font-semibold text-red-300">Please refresh and try again.</p>
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
    const demoAccounts = mode === 'admin'
        ? [
            ['Admin', 'admin@scalecampuslab.test', '/admin/login'],
        ]
        : [
            ['University', 'university@scalecampuslab.test', '/login'],
            ['School', 'school@scalecampuslab.test', '/login'],
            ['Student', 'student@scalecampuslab.test', '/login'],
            ['Admin', 'admin@scalecampuslab.test', '/admin/login'],
        ];

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

                <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                    <p className="text-xs font-black uppercase tracking-normal text-white/45">Demo accounts</p>
                    <div className="mt-3 grid gap-2">
                        {demoAccounts.map(([label, email, demoAction]) => (
                            <form key={email} action={demoAction} method="POST">
                                <input type="hidden" name="_token" value={csrf} />
                                <input type="hidden" name="email" value={email} />
                                <input type="hidden" name="password" value="password" />
                                <button className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-left text-sm font-bold text-white/80 transition hover:border-lime-300/35 hover:bg-lime-300/10 hover:text-white">
                                    <span>{label}</span>
                                    <span className="text-xs font-semibold text-white/40">{email}</span>
                                </button>
                            </form>
                        ))}
                    </div>
                    <p className="mt-3 text-xs font-semibold text-white/35">Password: password</p>
                </div>

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

function RoleDashboard({ csrf, role, title, subtitle, metrics, actions, roadmap = {}, events = [], registrations = [], users = [], schools = [], students = [], visitRequests = [], itineraryItems = [], archives = [], tasks = [], analytics = {}, messages = [], schoolProfile = {}, securityProfile = {}, universityOverview = {}, systemHealth = {}, platformSettings = {}, errors = {}, old = {}, flash = {} }) {
    const navGroups = dashboardNavGroups(role);
    const navItems = flatNavItems(navGroups);
    const defaultActiveId = navItems[0]?.id || 'overview';
    const storageKey = `scalecampus.activeTab.${role}`;
    const [dashboardData, setDashboardData] = useState({ metrics, roadmap, events, registrations, users, schools, students, visitRequests, itineraryItems, archives, tasks, analytics, messages, schoolProfile, securityProfile, universityOverview, systemHealth, platformSettings });
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
            setSubmitting(true);

            try {
                const response = await fetch(form.action || window.location.href, {
                    method: form.method || 'POST',
                    body: new FormData(form),
                    headers: { 'X-Requested-With': 'XMLHttpRequest' },
                    credentials: 'same-origin',
                    redirect: 'follow',
                });
                const html = await response.text();
                const parsed = new DOMParser().parseFromString(html, 'text/html');
                const nextApp = parsed.getElementById('app');

                if (nextApp?.dataset.props) {
                    const nextProps = JSON.parse(nextApp.dataset.props || '{}');
                    setDashboardData((current) => ({
                        ...current,
                        metrics: nextProps.metrics || current.metrics,
                        roadmap: nextProps.roadmap || current.roadmap,
                        events: nextProps.events || current.events,
                        registrations: nextProps.registrations || current.registrations,
                        users: nextProps.users || current.users,
                        schools: nextProps.schools || current.schools,
                        students: nextProps.students || current.students,
                        visitRequests: nextProps.visitRequests || current.visitRequests,
                        archives: nextProps.archives || current.archives,
                        tasks: nextProps.tasks || current.tasks,
                        analytics: nextProps.analytics || current.analytics,
                        messages: nextProps.messages || current.messages,
                        schoolProfile: nextProps.schoolProfile || current.schoolProfile,
                        securityProfile: nextProps.securityProfile || current.securityProfile,
                        universityOverview: nextProps.universityOverview || current.universityOverview,
                        systemHealth: nextProps.systemHealth || current.systemHealth,
                        platformSettings: nextProps.platformSettings || current.platformSettings,
                    }));
                    setFormErrors(JSON.parse(nextApp.dataset.errors || '{}'));
                    setFormOld(JSON.parse(nextApp.dataset.old || '{}'));
                    setLocalFlash(JSON.parse(nextApp.dataset.flash || '{}'));
                    form.reset();
                } else {
                    window.location.reload();
                }
            } catch (error) {
                setLocalFlash({ status: 'Action could not complete. Please try again.' });
            } finally {
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
        >
            <div className="flex flex-col gap-6" data-dashboard-app>
                {submitting && <p className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">Saving...</p>}
                {localFlash?.status && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{localFlash.status}</p>}
                {showMetrics && <MetricGrid metrics={content.metrics} />}
                {content.custom || (
                    <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
                        <DataPanel title={content.primary.title} description={content.primary.description} rows={content.primary.rows} columns={content.primary.columns} empty={content.primary.empty} />
                        <ActionPanel title={content.secondary.title} items={content.secondary.items} />
                    </div>
                )}
            </div>
        </DashboardFrame>
    );
}

function AdminDashboard({ csrf, signups, pagination, stats, role }) {
    const filters = useMemo(() => [
        ['All', '/admin/waitlist', !role],
        ['Universities', '/admin/waitlist?role=university', role === 'university'],
        ['High Schools', '/admin/waitlist?role=high_school', role === 'high_school'],
        ['Students', '/admin/waitlist?role=student', role === 'student'],
    ], [role]);

    const metrics = [
        { label: 'Total signups', value: stats.total, trend: 'Captured leads' },
        { label: 'Universities', value: stats.university, trend: 'Institution demand' },
        { label: 'High schools', value: stats.highSchool, trend: 'Group booking demand' },
        { label: 'Students', value: stats.student, trend: 'Direct student interest' },
    ];

    return (
        <DashboardFrame
            csrf={csrf}
            role="admin"
            title="Waitlist Operations"
            subtitle="Review notification subscribers, filter by audience, and export the launch contact list."
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
                            <p className="mt-1 text-sm text-gray-500">Filter by role or export the full CSV for the launch announcement.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                            {filters.map(([label, href, active]) => (
                                <a key={label} href={href} className={cx('rounded-md px-3 py-2 text-center text-sm font-medium', active ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                                    {label}
                                </a>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-3 p-4 sm:hidden">
                        {signups.length === 0 ? (
                            <p className="rounded-lg bg-gray-50 px-4 py-8 text-center text-sm font-medium text-gray-500">No signups yet.</p>
                        ) : signups.map((signup) => (
                            <article key={signup.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-gray-950">{signup.full_name}</p>
                                        <p className="mt-1 break-all text-sm text-gray-600">{signup.email}</p>
                                    </div>
                                    <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{roleLabels[signup.role]}</span>
                                </div>
                                <p className="mt-3 text-xs font-medium text-gray-400">{new Date(signup.created_at).toLocaleString()}</p>
                            </article>
                        ))}
                    </div>
                    <div className="hidden overflow-x-auto sm:block">
                        <table className="w-full min-w-[760px] text-left">
                            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                                <tr>
                                    <th className="px-5 py-3">Name</th>
                                    <th className="px-5 py-3">Email</th>
                                    <th className="px-5 py-3">Role</th>
                                    <th className="px-5 py-3">Joined</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {signups.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-5 py-10 text-center font-medium text-gray-500">No signups yet.</td>
                                    </tr>
                                ) : signups.map((signup) => (
                                    <tr key={signup.id} className="hover:bg-gray-50">
                                        <td className="px-5 py-4 font-semibold text-gray-950">{signup.full_name}</td>
                                        <td className="px-5 py-4 text-gray-600">{signup.email}</td>
                                        <td className="px-5 py-4"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{roleLabels[signup.role]}</span></td>
                                        <td className="px-5 py-4 text-gray-500">{new Date(signup.created_at).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-gray-200 p-4 text-sm sm:p-5">
                        <a href={pagination.previousPageUrl || '#'} className={cx('font-semibold', pagination.previousPageUrl ? 'text-gray-700 hover:text-gray-950' : 'pointer-events-none text-gray-300')}>Previous</a>
                        <span className="text-center font-medium text-gray-500">Page {pagination.currentPage} of {pagination.lastPage}</span>
                        <a href={pagination.nextPageUrl || '#'} className={cx('font-semibold', pagination.nextPageUrl ? 'text-gray-700 hover:text-gray-950' : 'pointer-events-none text-gray-300')}>Next</a>
                    </div>
                </section>
            </div>
        </DashboardFrame>
    );
}

function DashboardFrame({ csrf, children, role, title, subtitle, activeId, activeTitle, navGroups, onSelect, logoutAction = '/logout' }) {
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
        admin: ['overview', 'universities', 'schools', 'events', 'users', 'analytics', 'health', 'settings'],
        student: ['overview', 'events', 'bookings', 'calendar', 'messages'],
    };
    const hideMobilePageHeader = compactMobilePage || (customHeaderPages[role] || []).includes(activeId);

    useEffect(() => {
        if (!toast) return undefined;
        const timeout = window.setTimeout(() => setToast(null), 3200);
        return () => window.clearTimeout(timeout);
    }, [toast]);

    const handleSelect = (id) => {
        if (id === 'search') {
            setSearchOpen(true);
            setMobileNavOpen(false);
            return;
        }
        onSelect(id);
        setMobileNavOpen(false);
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
                            <button type="button" onClick={() => setToast({ title: 'Notifications', message: 'No new alerts right now.' })} className="relative grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-950" aria-label="Notifications">
                                <Bell size={18} />
                                <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-rose-500" />
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
                                <button type="button" onClick={() => setToast({ title: 'Notifications', message: 'No new alerts right now.' })} className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:text-indigo-600">
                                    <Bell size={17} />
                                    <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-indigo-500" />
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
        student: ['overview', 'my-visits', 'explore-visits', 'messages'],
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
                <form action={logoutAction} method="POST">
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

function SaaSEmptyState({ title = 'Nothing here yet', description = 'New records will appear here when available.', action }) {
    return (
        <div className="grid place-items-center px-5 py-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Inbox size={22} />
            </div>
            <p className="mt-4 text-sm font-black text-slate-950">{title}</p>
            <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">{description}</p>
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
        <div className="fixed bottom-5 right-5 z-[60] w-[calc(100vw-2.5rem)] max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-950/15">
            <div className="flex gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Bell size={17} /></span>
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
    const upcoming = events.filter((event) => event.status === 'published' && (!event.startsAt || new Date(event.startsAt) >= new Date())).slice(0, 4);
    const trend = overview.trend || [];
    const trendMax = Math.max(...trend.map((item) => Number(item.value || 0)), 1);
    const nextVisit = upcoming[0];
    const cycle = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date());
    const cards = [
        ['Visits', overview.totalVisits || 0, '+12%', CalendarDays, 'bg-[#e5eeff] text-[#006a61]'],
        ['Pending', events.filter((event) => event.status === 'draft').length, 'Review', Clock, 'bg-amber-50 text-amber-700'],
        ['Conv. Rate', `${overview.attendanceRate || 0}%`, 'Live', CheckCircle2, 'bg-emerald-50 text-emerald-700'],
        ['Capacity', `${overview.capacityUsage || 0}%`, 'Usage', Activity, 'bg-slate-950 text-white'],
    ];

    return (
        <div className="grid gap-4">
            <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">Administrative Overview</h1>
                    <p className="mt-1 text-sm font-semibold text-slate-500">Recruitment performance summary · {cycle}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                    <button type="button" onClick={() => window.print()} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white md:px-4 md:py-2.5 md:text-sm">Generate Report</button>
                    <form action="/dashboard/university/demo-data/populate" method="POST">
                        <input type="hidden" name="_token" value={csrf} />
                        <button className="w-full rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-black text-teal-800 md:px-4 md:py-2.5 md:text-sm">Populate data</button>
                    </form>
                    {Number(overview.demoEvents || 0) > 0 && (
                        <form action="/dashboard/university/demo-data" method="POST" className="col-span-2 sm:col-span-1">
                            <input type="hidden" name="_token" value={csrf} />
                            <input type="hidden" name="_method" value="DELETE" />
                            <button className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-black text-rose-700 md:px-4 md:py-2.5 md:text-sm">Clear data</button>
                        </form>
                    )}
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
                                <h2 className="text-base font-black text-slate-950">Today's Schedule</h2>
                                <p className="mt-0.5 text-xs font-semibold text-slate-500">Published visits and next program activity</p>
                            </div>
                            <button type="button" onClick={() => setSection('calendar')} className="inline-flex items-center gap-1 text-xs font-black text-[#006a61]">Calendar <ChevronRight size={14} /></button>
                        </div>
                        <div className="mt-3 overflow-hidden rounded-lg border border-slate-100">
                            {(upcoming.length ? upcoming : events.slice(0, 3)).map((event, index) => {
                                const date = event.startsAt ? new Date(event.startsAt) : null;
                                const time = date && !Number.isNaN(date.getTime()) ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : `${String(9 + (index * 2)).padStart(2, '0')}:00`;
                                const period = date && !Number.isNaN(date.getTime()) ? date.toLocaleTimeString([], { hour: 'numeric', hour12: true }).split(' ')[1] : 'AM';

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
                            {!events.length && <div className="p-8 text-center text-sm font-semibold text-slate-500">No visit programs yet. Populate demo data to preview the dashboard.</div>}
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
                        ) : <SaaSEmptyState title="No engagement yet" message="Populate demo data or receive registrations to build this chart." />}
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
                            <p className="text-xs font-black text-emerald-700">Itinerary Optimization Suggested</p>
                            <p className="mt-2 text-xs leading-5 text-slate-600">{nextVisit ? `Your next hosted program is ${nextVisit.title} at ${nextVisit.location || nextVisit.venue}. Review capacity and attendee communications before arrival.` : 'Create or populate a visit program to receive database-driven planning guidance.'}</p>
                        </div>
                        <button type="button" onClick={() => setSection('calendar')} className="mt-3 w-full rounded-lg border border-[#006a61]/30 bg-white px-3 py-2 text-xs font-black text-[#006a61]">Review Adjusted Schedule</button>
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

function UniversityVisitsSection({ csrf, events, registrations, errors, old }) {
    const [editor, setEditor] = useState(null);
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
                <button onClick={() => setEditor({})} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#006a61] px-4 py-2.5 text-sm font-black text-white shadow-sm hover:opacity-90"><Plus size={16} /> Create Program</button>
            </div>

            {editor && <UniversityEventEditor csrf={csrf} event={editor.id ? editor : null} errors={errors} old={old} onClose={() => setEditor(null)} />}

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
                                    <div className="flex items-center gap-3 md:justify-end">
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
                                        <button type="button" onClick={() => setEditor(event)} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:border-[#006a61]/30 hover:text-[#006a61]" aria-label={`Edit ${event.title}`}><Edit3 size={15} /></button>
                                        <form action={`/campus-events/${event.id}`} method="POST" onSubmit={(formEvent) => { if (!window.confirm(`Delete ${event.title}? This cannot be undone.`)) formEvent.preventDefault(); }}>
                                            <input type="hidden" name="_token" value={csrf} />
                                            <input type="hidden" name="_method" value="DELETE" />
                                            <button className="grid h-8 w-8 place-items-center rounded-lg border border-red-100 text-red-600 hover:bg-red-50" aria-label={`Delete ${event.title}`}><Trash2 size={15} /></button>
                                        </form>
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

function UniversityEventStatusForm({ csrf, event, status, label, tone = 'primary' }) {
    return (
        <form action={`/campus-events/${event.id}`} method="POST">
            <input type="hidden" name="_token" value={csrf} />
            <input type="hidden" name="_method" value="PUT" />
            <input type="hidden" name="title" value={event.title || ''} />
            <input type="hidden" name="starts_at" value={toInputDateTime(event.startsAt)} />
            <input type="hidden" name="ends_at" value={toInputDateTime(event.endsAt)} />
            <input type="hidden" name="venue" value={event.venue || 'Main Campus'} />
            <input type="hidden" name="location" value={event.location || ''} />
            <input type="hidden" name="description" value={event.description || ''} />
            <input type="hidden" name="capacity" value={event.capacity || 50} />
            <input type="hidden" name="status" value={status} />
            <button className={cx('rounded-lg px-3 py-1.5 text-xs font-black', tone === 'primary' ? 'border border-[#006a61]/30 text-[#006a61] hover:bg-emerald-50' : 'border border-slate-200 text-slate-500 hover:bg-slate-50')}>{label}</button>
        </form>
    );
}

function UniversityEventEditor({ csrf, event, errors, old, onClose }) {
    const isEdit = Boolean(event);
    const value = (key, fallback = '') => old[key] || event?.[key] || fallback;
    return (
        <section className="rounded-xl border border-blue-200 bg-blue-50/40 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-wide text-blue-700">{isEdit ? 'Edit event' : 'New event'}</p><h2 className="mt-1 text-xl font-black text-slate-950">{isEdit ? event.title : 'Create a university event'}</h2></div><button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-bold text-slate-500 hover:bg-white">Close</button></div>
            <form action={isEdit ? `/campus-events/${event.id}` : '/campus-events'} method="POST" className="mt-5 grid gap-4 md:grid-cols-2"><input type="hidden" name="_token" value={csrf} />{isEdit && <input type="hidden" name="_method" value="PUT" />}<LightField label="Event title" name="title" defaultValue={value('title')} error={errors.title?.[0]} /><LightField label="Venue" name="venue" defaultValue={value('venue')} error={errors.venue?.[0]} /><LightField label="Start date and time" name="starts_at" type="datetime-local" defaultValue={toInputDateTime(value('startsAt') || value('starts_at'))} error={errors.starts_at?.[0]} /><LightField label="End date and time" name="ends_at" type="datetime-local" defaultValue={toInputDateTime(value('endsAt') || value('ends_at'))} error={errors.ends_at?.[0]} /><LightField label="Location" name="location" defaultValue={value('location')} error={errors.location?.[0]} /><LightField label="Capacity" name="capacity" type="number" min="1" defaultValue={value('capacity', '50')} error={errors.capacity?.[0]} /><div className="md:col-span-2"><LightTextarea label="Description" name="description" defaultValue={value('description')} error={errors.description?.[0]} /></div><label className="text-sm font-semibold text-slate-700">Status<select name="status" defaultValue={value('status', 'published')} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none"><option value="published">Upcoming</option><option value="draft">Draft</option><option value="cancelled">Cancelled</option></select></label><div className="flex items-end justify-end"><button className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-black text-white">{isEdit ? 'Save Changes' : 'Create Event'}</button></div></form>
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
                    {['student', 'school', 'high_school'].includes(role) && event.status === 'published' && (
                        <form action={`/campus-events/${event.id}/registrations`} method="POST" className="mt-5 grid gap-3 border-t border-gray-100 pt-4">
                            <input type="hidden" name="_token" value={csrf} />
                            {role === 'student' ? (
                                <>
                                    <input type="hidden" name="party_size" value="1" />
                                    <button className="rounded-md bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800">{isFull ? 'Join waitlist' : 'Register'}</button>
                                </>
                            ) : (
                                <>
                                    <LightField label={['school', 'high_school'].includes(role) ? 'Group name' : 'Registrant name'} name="registrant_name" defaultValue={old.registrant_name || ''} error={errors.registrant_name?.[0]} />
                                    <LightField label="Email" name="registrant_email" type="email" defaultValue={old.registrant_email || ''} error={errors.registrant_email?.[0]} />
                                    <LightField label={['school', 'high_school'].includes(role) ? 'Number of students' : 'Seats'} name="party_size" type="number" min="1" defaultValue={['school', 'high_school'].includes(role) ? '10' : '1'} error={errors.party_size?.[0]} />
                                    <button className="rounded-md bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800">Register</button>
                                </>
                            )}
                        </form>
                    )}
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
    const [sortBy, setSortBy] = useState('match');
    const [selectedIds, setSelectedIds] = useState([]);
    const [previewId, setPreviewId] = useState(null);
    const [mobileVisibleCount, setMobileVisibleCount] = useState(6);

    const rows = useMemo(() => events.map((event, index) => enrichDiscoverVisit(event, visitRequests, index)), [events, visitRequests]);
    const universities = [...new Set(rows.map((row) => row.university).filter(Boolean))].sort();
    const regions = [...new Set(rows.map((row) => row.region).filter(Boolean))].sort();
    const focusOptions = [...new Set(rows.map((row) => row.focus).filter(Boolean))].sort();
    const savedHubs = focusOptions.slice(0, 3).map((focus) => ({ focus, count: rows.filter((row) => row.focus === focus).length }));
    const filteredRows = rows
        .filter((row) => {
            const haystack = `${row.university} ${row.title} ${row.description} ${row.location} ${row.venue} ${row.focus}`.toLowerCase();
            const matchesQuery = !query || haystack.includes(query.toLowerCase());
            const matchesRegion = region === 'all' || row.region === region;
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
            return right.matchScore - left.matchScore;
        });
    const preview = rows.find((row) => row.id === previewId) || null;
    const selectedRows = rows.filter((row) => selectedIds.includes(String(row.id)));
    const requestedCount = rows.filter((row) => row.existingRequest).length;
    const openCount = rows.filter((row) => row.seatsLeft > 0).length;
    const avgMatch = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.matchScore, 0) / rows.length) : 0;
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
        setSortBy('match');
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
                    <option value="match">Sort: Match</option>
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
                                    <span className={cx('max-w-[92px] shrink-0 truncate rounded-full px-2 py-0.5 text-[9px] font-black leading-4', row.matchScore >= 90 ? 'bg-[#86f2e4] text-[#006a61]' : 'bg-[#dce9ff] text-blue-700')}>{row.focus || `${row.matchScore}%`}</span>
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
                                <p className="mt-0.5 text-[10px] font-bold text-slate-400">{row.matchScore}% AI match</p>
                            </div>
                            {row.existingRequest ? (
                                <button type="button" onClick={() => setSection?.('bookings')} className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-black text-slate-700">View Request</button>
                            ) : (
                                <RequestVisitForm csrf={csrf} row={row} old={old} compact />
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
                        <SchoolDiscoveryStat label="Avg Match" value={`${avgMatch}%`} />
                    </div>

                    {savedHubs.length > 0 && (
                        <section className="mt-6">
                            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Saved Hubs</p>
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
                        <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.1em] text-slate-500">Global Region<select value={region} onChange={(event) => setRegion(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-900"><option value="all">All Regions</option>{regions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
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
                                <option value="match">Sort by AI Match</option>
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
                                    <th className="w-24 px-4 py-3 text-center">AI Match</th>
                                    <th className="w-32 px-4 py-3">Interest</th>
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
                                        <td className="px-4 py-3 text-center"><span className={cx('rounded-full px-2 py-1 text-[11px] font-black', row.matchScore >= 90 ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700')}>{row.matchScore}%</span></td>
                                        <td className="px-4 py-3"><InterestBars score={row.matchScore} /></td>
                                        <td className="px-4 py-3"><span className={cx('rounded border px-2 py-1 text-[10px] font-black uppercase', row.statusTone)}>{row.statusLabel}</span></td>
                                        <td className="px-4 py-3"><span className={cx('text-[11px] font-black', row.seatsLeft > 0 ? 'text-emerald-700' : 'text-slate-400')}>{row.availabilityLabel}</span></td>
                                        <td className="px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                                            {row.existingRequest ? (
                                                <button type="button" onClick={() => setSection?.('bookings')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">View Request</button>
                                            ) : (
                                                <RequestVisitForm csrf={csrf} row={row} old={old} compact />
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

function InterestBars({ score }) {
    const bars = [0.55, 0.7, 0.9, 0.8, 1].map((multiplier) => Math.max(18, Math.round(score * multiplier)));
    return <div className="flex h-4 items-end gap-1">{bars.map((height, index) => <span key={index} className={cx('w-1.5 rounded-t', score >= 88 ? 'bg-emerald-500' : 'bg-blue-500')} style={{ height: `${height}%` }} />)}</div>;
}

function RequestVisitForm({ csrf, row, old = {}, compact = false }) {
    return (
        <form action="/visit-requests" method="POST" className={compact ? '' : 'grid gap-3'}>
            <input type="hidden" name="_token" value={csrf} />
            <input type="hidden" name="campus_event_id" value={row.id} />
            <input type="hidden" name="requested_window" value={row.startsAt && new Date(row.startsAt) > new Date() ? new Date(row.startsAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)} />
            <input type="hidden" name="group_size" value={old.party_size || '10'} />
            <input type="hidden" name="priority" value={row.matchScore >= 90 ? '4' : row.matchScore >= 80 ? '3' : '2'} />
            <input type="hidden" name="notes" value={`Requested from School Discover Visits. Match score: ${row.matchScore}%. Focus: ${row.focus}.`} />
            <button className={compact ? 'rounded-lg bg-slate-950 px-3 py-2 text-[11px] font-black text-white hover:bg-slate-800' : 'w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700'}>{row.seatsLeft > 0 ? 'Request Visit' : 'Join Waitlist'}</button>
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
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">{row.matchScore}%</span>
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
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Student Interest Heatmap</p>
                <div className="mt-3 rounded-xl bg-slate-50 p-4">
                    <InterestBars score={row.matchScore} />
                    <p className="mt-3 text-xs text-slate-500">Derived from program focus, capacity pressure, and current visit data.</p>
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

function SchoolBookingsSection({ csrf = '', visitRequests = [], registrations = [], events = [], setSection }) {
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
                                    <button type="button" onClick={() => handleMobileRequestAction(request)} className="flex-1 rounded-lg bg-[#006a61] px-3 py-2 text-[12px] font-black text-white">
                                        {mobileRequestActionLabel(request)}
                                    </button>
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
                    <p className="mt-1 max-w-3xl text-sm text-slate-500">Monitor and manage sent visit inquiries to partner universities. Status updates, student counts, and itinerary readiness stay tied to database records.</p>
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
                <SchoolRequestMetric label="Total Sent" value={visitRequests.length} helper={`${totalStudents.toLocaleString()} requested students`} icon={Send} tone="blue" />
                <SchoolRequestMetric label="Pending" value={pendingCount} helper="Awaiting university review" icon={Clock} tone="amber" />
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
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 font-bold text-slate-700">{request.window || formatShortDate(request.eventDate)}</td>
                                            <td className="px-5 py-4 font-bold text-slate-700">{Number(request.groupSize || 0).toLocaleString()}</td>
                                            <td className="px-5 py-4"><span className={cx('rounded-full px-2.5 py-1 text-[11px] font-black uppercase ring-1', tone)}>{label}</span></td>
                                            <td className="px-5 py-4 text-right">
                                                <button type="button" onClick={() => setSelectedId(request.id)} className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-50">View Details</button>
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

            <SchoolRequestPreview csrf={csrf} request={selected} statusMeta={statusMeta} setSection={setSection} onClose={() => setSelectedId(null)} />

            {createOpen && (
                <ModalShell title="New Visit Request" onClose={() => setCreateOpen(false)}>
                    <form action="/visit-requests" method="POST" className="grid gap-4" onSubmit={() => window.setTimeout(() => setCreateOpen(false), 0)}>
                        <input type="hidden" name="_token" value={csrf} />
                        <label className="grid gap-1.5 text-sm font-bold text-slate-700">
                            University visit program
                            <select name="campus_event_id" required className="rounded-xl border border-slate-200 px-3 py-2.5 font-normal">
                                <option value="">Select a published visit</option>
                                {publishedEvents.map((event) => <option key={event.id} value={event.id}>{event.university || 'University'} â€” {event.title}</option>)}
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
    const requestedEventIds = new Set(requestRows.map((request) => Number(request?.eventId)).filter(Boolean));
    const registeredEventIds = new Set(registrationRows.map((registration) => Number(registration?.eventId)).filter(Boolean));
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
    const budgetEstimate = Math.round((totalMiles || upcoming.length * 18) * 2.35 + totalStudents * 4 + upcoming.length * 95);
    const schoolStudents = studentRows.length || totalStudents;
    const hasCoordinates = upcoming.some((stop) => stop.latitude !== null && stop.longitude !== null);

    return (
        <div className="grid gap-6">
            <section className="grid gap-4 md:grid-cols-4">
                <SchoolRequestMetric label="Live Destinations" value={upcoming.length} helper={`${confirmedStops} approved / confirmed`} icon={RouteIcon} tone="blue" />
                <SchoolRequestMetric label="Students Covered" value={totalStudents.toLocaleString()} helper={`${schoolStudents.toLocaleString()} student records available`} icon={UsersRound} tone="emerald" />
                <SchoolRequestMetric label="Budget Estimate" value={`$${budgetEstimate.toLocaleString()}`} helper="Travel and coordination estimate" icon={BarChart3} tone="amber" />
                <SchoolRequestMetric label="Route Distance" value={knownSegments.length ? `${Math.round(totalMiles)}mi` : 'Set coords'} helper={knownSegments.length ? 'Computed from event coordinates' : 'Add event coordinates for mileage'} icon={MapPin} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
                <aside className="space-y-5">
                    <div className="rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-600 p-5 text-white shadow-lg">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-white/70">AI itinerary planner</p>
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
                                                        <form action={`/school-itinerary/${stop.itineraryItemId}`} method="POST" onSubmit={(event) => { if (!window.confirm('Remove this destination from your itinerary?')) event.preventDefault(); }}>
                                                            <input type="hidden" name="_token" value={csrf} /><input type="hidden" name="_method" value="DELETE" />
                                                            <button className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-[11px] font-black text-rose-700">Remove</button>
                                                        </form>
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
                            <OpenStreetMapLink location={upcoming[0]?.location || 'United States'} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-blue-700">Open Map</OpenStreetMapLink>
                        </div>
                        <OpenStreetMapEmbed location={upcoming[0]?.location || 'United States'} points={routePoints} title="School itinerary route map" className="h-[460px] rounded-none border-0" />
                        {!hasCoordinates && upcoming.length > 0 && <p className="border-t border-slate-200 bg-amber-50 px-5 py-3 text-xs font-bold text-amber-800">Add latitude/longitude to visit programs for precise map tagging and mileage calculations.</p>}
                    </section>

                    <section className="grid gap-6 lg:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h2 className="text-lg font-black text-slate-950">Time Allocation</h2>
                            <div className="mt-5 space-y-4">
                                {upcoming.slice(0, 4).map((stop, index) => (
                                    <div key={`${stop.id}-time`}>
                                        <div className="flex items-center justify-between text-sm"><span className="font-black text-slate-700">{stop.title}</span><span className="font-bold text-slate-500">{formatShortDate(stop.date)}</span></div>
                                        <div className="mt-2 h-3 rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, Math.max(12, (Number(stop.students || 1) / Math.max(1, totalStudents)) * 100))}%` }} /></div>
                                        <p className="mt-1 text-xs font-semibold text-slate-500">{stop.students} student(s) allocated to this destination</p>
                                    </div>
                                ))}
                                {upcoming.length === 0 && <p className="text-sm font-semibold text-slate-500">Time allocation will appear when live event destinations exist.</p>}
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
    const minutes = Math.max(5, Math.round(miles * 2.2));
    return { distanceMiles: miles, label: `${miles.toFixed(1)} miles • approx. ${minutes} min transit` };
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

function SchoolRequestPreview({ csrf, request, statusMeta = {}, setSection, onClose }) {
    if (!request) {
        return null;
    }

    const currentProgress = request.status === 'scheduled' ? 'w-full' : request.status === 'approved' ? 'w-2/3' : request.status === 'declined' ? 'w-1/3 bg-rose-500' : 'w-1/3';

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/20 backdrop-blur-[1px]" onClick={onClose}>
            <aside className="absolute right-0 top-0 h-full w-full max-w-[420px] overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">REQ-{String(request.id).padStart(4, '0')}</p>
                        <h2 className="mt-2 text-2xl font-black text-slate-950">{request.event || 'Visit Request'}</h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500">{request.university || 'University Partner'} • {request.eventLocation || 'Location TBA'}</p>
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
                    {request.status !== 'declined' && (
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
    const [tier, setTier] = useState('all');
    const [region, setRegion] = useState('all');
    const [modal, setModal] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const universities = users.filter((user) => user.role === 'university').map((user) => enrichAdminUniversity(user, events, registrations));
    const regions = [...new Set(universities.map((item) => item.region).filter(Boolean))].sort();
    const filtered = universities.filter((item) => {
        const text = `${item.name} ${item.email} ${item.region} ${item.contact}`.toLowerCase();
        return (!query || text.includes(query.toLowerCase()))
            && (status === 'all' || item.verificationStatus === status)
            && (tier === 'all' || item.tier === tier)
            && (region === 'all' || item.region === region);
    });
    const selected = universities.find((item) => item.id === selectedId);
    const activeInstitutions = universities.filter((item) => item.accountStatus === 'active').length;
    const pendingVerification = universities.filter((item) => item.verificationStatus === 'unverified').length;
    const totalBookings = universities.reduce((total, item) => total + item.bookings, 0);
    const activePrograms = universities.reduce((total, item) => total + item.activePrograms, 0);
    const institutionMapPoints = filtered.slice(0, 30).map((item) => ({
        label: item.name,
        location: item.region,
        meta: `${item.activePrograms} programs • ${item.bookings} bookings`,
    }));
    const reset = () => { setQuery(''); setStatus('all'); setTier('all'); setRegion('all'); };

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
                        <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.1em] text-slate-500">Tier Level<select value={tier} onChange={(event) => setTier(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold normal-case tracking-normal text-slate-900"><option value="all">All Tiers</option><option value="tier_1">Tier 1 Global Premium</option><option value="tier_2">Tier 2 Regional Elite</option><option value="tier_3">Tier 3 Standard</option></select></label>
                        <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.1em] text-slate-500">Region<select value={region} onChange={(event) => setRegion(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold normal-case tracking-normal text-slate-900"><option value="all">All Regions</option>{regions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4"><MapIcon size={20} className="text-blue-700" /><p className="mt-2 text-xs font-black uppercase text-blue-700">Regional Heatmap</p><p className="mt-1 text-xs leading-5 text-slate-600">{regions.length} region(s) represented by live institution data.</p><div className="mt-3"><OpenStreetMapEmbed location={region === 'all' ? (regions[0] || 'United States') : region} points={institutionMapPoints} title="Institution regional heatmap on OpenStreetMap" className="h-28" /></div><OpenStreetMapLink location={region === 'all' ? (regions[0] || 'United States') : region} className="mt-2 inline-flex text-xs font-black text-blue-700">OpenStreetMap</OpenStreetMapLink></div>
                    </div>
                </aside>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between"><div><h2 className="text-xl font-black text-slate-950">University Directory</h2><p className="mt-1 text-sm text-slate-500">{filtered.length} result(s), database-backed institution accounts.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => exportRowsToCsv('universities.csv', [['Name', 'Email', 'Tier', 'Region', 'Programs', 'Bookings', 'Account Status', 'Verification'], ...filtered.map((item) => [item.name, item.email, item.tierLabel, item.region, item.activePrograms, item.bookings, item.accountStatus, item.verificationStatus])])} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"><Download size={14} className="inline" /> Export</button><button type="button" onClick={() => setModal({ type: 'create' })} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-slate-800"><Plus size={14} className="inline" /> New University</button></div></div>
                    <div className="overflow-x-auto"><table className="w-full min-w-[1020px] text-left text-sm"><thead className="bg-slate-50 text-[11px] font-black uppercase tracking-[0.08em] text-slate-500"><tr><th className="px-5 py-4">University Name</th><th className="px-5 py-4">Primary Contact</th><th className="px-5 py-4 text-center">Active Programs</th><th className="px-5 py-4 text-center">Total Bookings</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Verification</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((item) => <tr key={item.id} className="group hover:bg-slate-50"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-950 text-xs font-black text-white">{item.initials}</span><span><span className="block font-black text-slate-950">{item.name}</span><span className="mt-0.5 block text-xs font-semibold text-slate-500">{item.tierLabel} • {item.region}</span></span></div></td><td className="px-5 py-4"><p className="font-bold text-slate-800">{item.contact}</p><p className="mt-1 text-xs text-slate-500">{item.email}</p></td><td className="px-5 py-4 text-center"><button type="button" onClick={() => setSelectedId(item.id)} className="font-black text-blue-700 hover:underline">{item.activePrograms}</button></td><td className="px-5 py-4 text-center font-black text-slate-800">{item.bookings.toLocaleString()}</td><td className="px-5 py-4"><span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{item.accountStatus}</span></td><td className="px-5 py-4"><span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase', item.verificationStatus === 'verified' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700')}><span className={cx('h-1.5 w-1.5 rounded-full', item.verificationStatus === 'verified' ? 'bg-blue-500' : 'bg-amber-500')} />{item.verificationStatus}</span></td><td className="px-5 py-4 text-right"><div className="flex justify-end gap-1"><button type="button" onClick={() => setSelectedId(item.id)} className="rounded-lg p-2 text-blue-700 hover:bg-blue-50" title="View Profile"><Search size={17} /></button><button type="button" onClick={() => setModal({ type: 'edit', item })} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" title="Edit Institution"><Edit3 size={17} /></button><form action={`/dashboard/admin/universities/${item.id}/verification`} method="POST"><input type="hidden" name="_token" value={csrf} /><input type="hidden" name="verified" value={item.verificationStatus === 'verified' ? '0' : '1'} /><button className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50" title="Toggle Verification"><ShieldCheck size={17} /></button></form><button type="button" onClick={() => setModal({ type: 'delete', item })} className="rounded-lg p-2 text-rose-700 hover:bg-rose-50" title="Delete Institution"><Trash2 size={17} /></button></div></td></tr>)}{filtered.length === 0 && <tr><td colSpan="7" className="px-5 py-14 text-center"><EmptyState message="No institution accounts match these filters." /></td></tr>}</tbody></table></div>
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
                <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-14 w-14 place-items-center rounded-xl bg-slate-950 font-black text-white">{item.initials}</span><div><h2 className="text-xl font-black text-slate-950">{item.name}</h2><p className="mt-1 text-sm text-slate-500">{item.tierLabel} • {item.region}</p></div></div><button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"><X size={16} /></button></div>
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
    const tier = capacity >= 300 || activePrograms >= 5 ? 'tier_1' : capacity >= 120 || activePrograms >= 2 ? 'tier_2' : 'tier_3';
    const region = discoverRegion(ownedEvents[0]?.location || user.email || '');
    return { ...user, contact: user.name, initials: (user.name || user.email || 'U').split(' ').map((word) => word[0]).slice(0, 3).join('').toUpperCase(), programs: ownedEvents, registrationRows: bookingRows, activePrograms, bookings, confirmedSeats, waitlistedSeats, capacity, tier, tierLabel: tier === 'tier_1' ? 'Tier 1 Global Premium' : tier === 'tier_2' ? 'Tier 2 Regional Elite' : 'Tier 3 Standard', region, accountStatus: 'active', verificationStatus: user.verified ? 'verified' : 'unverified', status: 'active' };
}

function AdminSchoolsSection({ csrf, schools = [], visitRequests = [], archives = [], errors = {} }) {
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('all');
    const [region, setRegion] = useState('all');
    const [volume, setVolume] = useState('all');
    const [modal, setModal] = useState(null);
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

    return (
        <div className="grid gap-6">
            <section className="grid gap-4 md:grid-cols-4">
                <AdminInstitutionMetric label="Verified Schools" value={verified} detail={`${rows.length} total directory rows`} icon={School} tone="emerald" />
                <AdminInstitutionMetric label="Pending Review" value={pending} detail="Need admin verification" icon={Clock} tone="amber" />
                <AdminInstitutionMetric label="Active Students" value={activeStudents.toLocaleString()} detail="Demand volume from database" icon={UsersRound} tone="blue" />
                <AdminInstitutionMetric label="Suspended" value={suspended} detail="Restricted schools" icon={ShieldCheck} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
                        <div><h2 className="text-xl font-black text-slate-950">Schools Directory</h2><p className="mt-1 text-sm text-slate-500">Shared target-school records used by universities, schools, and admin oversight.</p></div>
                        <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => exportRowsToCsv('admin-schools.csv', [['Code', 'Name', 'District', 'Coordinator', 'Students', 'Status'], ...filtered.map((school) => [school.code, school.name, school.district, school.coordinatorName, school.activeApplicants, school.status])])} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"><Download size={14} className="inline" /> Export</button>
                            <button type="button" onClick={() => setModal({ type: 'create' })} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white"><Plus size={14} className="inline" /> New School Entry</button>
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
                                {filtered.length === 0 && <tr><td colSpan="6" className="px-5 py-14 text-center"><EmptyState message="No schools match these filters." /></td></tr>}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-4 text-xs font-bold text-slate-500"><span>Showing {filtered.length} of {rows.length} schools</span><span>Directory is database-backed</span></div>
                </div>

                <aside className="space-y-4">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-4"><h3 className="font-black text-slate-950">Regional Clusters</h3><OpenStreetMapLink location={topRegion?.name || 'United States'} className="text-xs font-black text-blue-700">Open map</OpenStreetMapLink></div>
                        <div className="relative h-48"><OpenStreetMapEmbed location={topRegion?.name || 'United States'} points={schoolMapPoints} title="Admin school regional clusters on OpenStreetMap" className="h-48 rounded-none border-0" /><span className="absolute left-8 top-8 grid h-12 w-12 place-items-center rounded-full border-2 border-white bg-blue-600 text-xs font-black text-white shadow-lg">{Math.max(1, Math.round(rows.length * 0.35))}</span><span className="absolute bottom-10 right-10 grid h-14 w-14 place-items-center rounded-full border-2 border-white bg-emerald-500 text-xs font-black text-white shadow-lg">{Math.max(1, Math.round(rows.length * 0.55))}</span></div>
                        <div className="p-4"><p className="text-xs font-black uppercase text-slate-400">Top Region</p><p className="mt-1 font-black text-slate-950">{topRegion?.name || 'No region yet'}</p><div className="mt-3 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${topRegion ? Math.min(100, (topRegion.count / Math.max(1, rows.length)) * 100) : 0}%` }} /></div></div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-black text-slate-950">Directory Analytics</h3><div className="mt-4 space-y-3"><MiniStat label="Engagement Avg." value={`${rows.length ? Math.round(rows.reduce((sum, school) => sum + Number(school.matchScore || 0), 0) / rows.length) : 0}%`} /><MiniStat label="Visit Requests" value={rows.reduce((sum, school) => sum + Number(school.visitRequests || 0), 0)} /><MiniStat label="Archive Visits" value={rows.reduce((sum, school) => sum + Number(school.archiveVisits || 0), 0)} /></div></div>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm"><Sparkles size={18} className="text-emerald-700" /><h3 className="mt-3 font-black text-slate-950">Admin Insight</h3><p className="mt-2 text-sm leading-6 text-slate-600">{pending > 0 ? `${pending} school record(s) need verification before full platform trust.` : 'School directory is verified. Monitor suspended and high-volume schools weekly.'}</p></div>
                </aside>
            </section>

            <AdminSchoolDrawer school={selected} onClose={() => setSelectedId(null)} setModal={setModal} />
            {modal?.type === 'create' && <AdminSchoolForm csrf={csrf} title="New School Entry" action="/dashboard/admin/schools" errors={errors} onClose={() => setModal(null)} />}
            {modal?.type === 'edit' && <AdminSchoolForm csrf={csrf} title="Edit School" action={`/dashboard/admin/schools/${modal.item.id}`} method="PUT" item={modal.item} errors={errors} onClose={() => setModal(null)} />}
            {modal?.type === 'delete' && <ModalShell title="Delete School" onClose={() => setModal(null)}><form action={`/dashboard/admin/schools/${modal.item.id}`} method="POST" className="space-y-4"><input type="hidden" name="_token" value={csrf} /><input type="hidden" name="_method" value="DELETE" /><p className="text-sm leading-6 text-slate-600">Delete <span className="font-black text-slate-950">{modal.item.name}</span>? Schools with shared visit activity cannot be deleted.</p><div className="flex justify-end gap-2"><button type="button" onClick={() => setModal(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black">Cancel</button><button className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-black text-white">Delete</button></div></form></ModalShell>}
        </div>
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
                    <LightField label="Match Score" name="match_score" type="number" defaultValue={item.matchScore ?? 0} error={errors.match_score?.[0]} required />
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
                <div className="mt-5 grid grid-cols-2 gap-3"><MiniStat label="Active Students" value={Number(school.activeApplicants || 0).toLocaleString()} /><MiniStat label="Match Score" value={`${school.matchScore}/100`} /><MiniStat label="Requests" value={school.visitRequests} /><MiniStat label="Archives" value={school.archiveVisits} /></div>
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
    const totalSeats = rows.reduce((sum, row) => sum + Number(row.attendees || 0), 0);
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
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Real-time oversight of recruitment operations, shared visit requests, event capacity, and campus outreach across all zones.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={exportActivity} className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-black text-blue-700"><Download size={16} className="inline" /> Export Report</button>
                    <button type="button" onClick={() => setTab('pending')} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"><Plus size={16} className="inline" /> Review Requests</button>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-4">
                <AdminInstitutionMetric label="Active Visits" value={activeRows.length} detail="Live and scheduled operations" icon={CalendarDays} tone="blue" />
                <AdminInstitutionMetric label="Pending Requests" value={rows.filter((row) => row.status === 'requested').length} detail="Need decision" icon={Clock} tone="amber" />
                <AdminInstitutionMetric label="Attendees" value={totalSeats.toLocaleString()} detail="Seats across activity" icon={UsersRound} tone="emerald" />
                <AdminInstitutionMetric label="Alerts" value={urgentRows.length + warningRows.length} detail="Logistics watchlist" icon={ShieldCheck} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
                <aside className="space-y-5">
                    <div className="rounded-2xl border-l-4 border-rose-600 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-rose-700"><ShieldCheck size={18} /><h3 className="text-xs font-black uppercase tracking-[0.16em]">Critical Logistics Warnings</h3></div>
                        <div className="mt-4 space-y-3">
                            {[...urgentRows, ...warningRows].slice(0, 3).map((row) => (
                                <button key={row.id} type="button" onClick={() => setSelectedId(row.id)} className={cx('w-full rounded-xl border p-3 text-left', row.severity === 'urgent' ? 'border-rose-100 bg-rose-50' : 'border-slate-200 bg-slate-50')}>
                                    <div className="flex items-start justify-between gap-3"><p className={cx('font-black', row.severity === 'urgent' ? 'text-rose-800' : 'text-slate-950')}>{row.alertTitle}</p><span className={cx('rounded-full px-2 py-0.5 text-[9px] font-black uppercase', row.severity === 'urgent' ? 'bg-rose-600 text-white' : 'bg-amber-100 text-amber-700')}>{row.severity}</span></div>
                                    <p className="mt-1 text-xs leading-5 text-slate-600">{row.alertBody}</p>
                                </button>
                            ))}
                            {urgentRows.length + warningRows.length === 0 && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">No critical logistics issues detected.</p>}
                        </div>
                        <button type="button" onClick={() => setTab('pending')} className="mt-4 w-full border-t border-slate-100 pt-4 text-center text-sm font-black text-blue-700">Resolve pending issues</button>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-4"><h3 className="font-black text-slate-950">Live Zone Occupancy</h3><span className="text-[10px] font-black text-emerald-600">LIVE FEED</span></div>
                        <div className="relative h-56"><OpenStreetMapEmbed location={topRegion} points={zonePoints} title="Visit activity tagged on OpenStreetMap" className="h-56 rounded-none border-0" /><div className="absolute left-4 top-4 max-w-[220px] rounded-xl border border-white bg-white/95 p-3 shadow-lg"><p className="text-sm font-black text-slate-950">Active Zone Focus</p><p className="mt-1 text-xs leading-5 text-slate-500">{activeRows.length} active visits • {topRegion}</p></div></div>
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
                                        <td className="px-5 py-4"><div className="flex items-center -space-x-2">{row.attendeeBadges.map((badge) => <span key={badge} className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-blue-50 text-[10px] font-black text-blue-700">{badge}</span>)}{row.attendees > row.attendeeBadges.length && <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-slate-200 text-[10px] font-black text-slate-600">+{row.attendees - row.attendeeBadges.length}</span>}</div></td>
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
                <div className="rounded-2xl bg-slate-950 p-5 text-white shadow-sm"><p className="text-xs font-black uppercase tracking-[0.16em] text-white/60">Growth Metric</p><p className="mt-4 text-4xl font-black">+{Math.min(99, Math.max(0, rows.length + archives.length)).toFixed(1)}%</p><p className="mt-2 text-sm text-white/70">Increase in tracked school engagement based on visit activity volume.</p></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Active Window</p><p className="mt-4 text-2xl font-black text-slate-950">Peak Recruitment</p><p className="mt-2 text-sm text-slate-500">High-frequency period based on scheduled and approved requests.</p></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Health Index</p><p className="mt-4 text-2xl font-black text-slate-950">{Math.max(70, 100 - (urgentRows.length * 8) - (warningRows.length * 3)).toFixed(1)}% Efficiency</p><p className="mt-2 text-sm text-slate-500">Estimated allocation health across active zones.</p></div>
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
            attendeeBadges: initialsList([request.school || 'SC', request.university || 'UN']),
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
            attendeeBadges: initialsList(relatedRegistrations.map((registration) => registration.name || registration.school).slice(0, 3)),
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
        attendeeBadges: initialsList([archive.school || 'AR']),
    }));

    return [...requestRows, ...eventRows, ...archiveRows].sort((left, right) => {
        const severityRank = { urgent: 0, warning: 1, normal: 2 };
        return (severityRank[left.severity] ?? 2) - (severityRank[right.severity] ?? 2);
    });
}

function initialsList(values = []) {
    const list = values.filter(Boolean).map((value) => initials(value)).slice(0, 3);
    return list.length ? list : ['NA'];
}

function AdminUsersAccessSection({ csrf, users = [], errors = {} }) {
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
            {modal?.type === 'create' && <AdminUserForm csrf={csrf} title="Create User" action="/dashboard/admin/users" errors={errors} onClose={() => setModal(null)} />}
            {modal?.type === 'edit' && <AdminUserForm csrf={csrf} title="Edit User" action={`/dashboard/admin/users/${modal.item.id}`} method="PUT" item={modal.item} errors={errors} onClose={() => setModal(null)} />}
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

function AdminUserForm({ csrf, title, action, method = 'POST', item = {}, errors = {}, onClose }) {
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

function ToggleBox({ name, label, defaultChecked }) {
    return <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-bold text-slate-700"><input type="hidden" name={name} value="0" /><input type="checkbox" name={name} value="1" defaultChecked={defaultChecked} className="rounded border-slate-300 text-blue-600" /> {label}</label>;
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
    const [period, setPeriod] = useState('30');
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
    const insights = analytics.insights || [];
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
                    <select value={period} onChange={(event) => setPeriod(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700">
                        <option value="30">Last 30 Days</option>
                        <option value="90">Last 90 Days</option>
                        <option value="365">Last 12 Months</option>
                    </select>
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
                                <p className="mt-1 text-sm text-slate-500">Registered seats to confirmed visits, attendance, and applications.</p>
                            </div>
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{analytics.modelConfidence || 0}% confidence</span>
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
                        <h2 className="text-lg font-black text-slate-950">Regional Growth Hotspots</h2>
                        <div className="mt-4 space-y-3">{hotspots.length ? hotspots.map((hotspot) => <div key={hotspot.region} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"><span className="font-bold text-slate-700">{hotspot.region}</span><span className="font-black text-emerald-600">+{hotspot.growth}</span></div>) : <p className="text-sm text-slate-500">Hotspots will appear when regional school data exists.</p>}</div>
                    </section>
                    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                        <Sparkles size={18} className="text-emerald-700" />
                        <h2 className="mt-3 text-lg font-black text-slate-950">Predictive Signals</h2>
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
        ['Health Score', score],
        ['System Status', status],
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
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Server-backed monitoring</p>
                    <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">System Health & Audit Hub</h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Infrastructure checks are generated directly by Laravel from the current server, database, storage, queues, mail, sessions, logs, and recent platform activity.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"><RefreshCcw size={16} /> Force Sync</button>
                    <button type="button" onClick={exportAudit} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700"><Download size={16} /> Export Audit</button>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between"><p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">System Score</p><SystemStatusBadge status={status} /></div>
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
                                <h2 className="text-xl font-black text-slate-950">Live Service Checks</h2>
                                <p className="mt-1 text-sm text-slate-500">Generated at {formatDateTime(health.generatedAt)} from the current server.</p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-600">{checks.length} checks</span>
                        </div>
                        <div className="mt-5 overflow-x-auto">
                            <table className="w-full min-w-[760px] text-left text-sm">
                                <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-[0.08em] text-slate-500"><tr><th className="px-4 py-3">Service</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Latency</th><th className="px-4 py-3">Server Detail</th></tr></thead>
                                <tbody className="divide-y divide-slate-100">
                                    {checks.map((item) => <tr key={item.name} className="hover:bg-slate-50"><td className="px-4 py-4 font-black text-slate-950">{item.name}</td><td className="px-4 py-4"><SystemStatusBadge status={item.status} /></td><td className="px-4 py-4 font-bold text-slate-700">{item.latencyMs !== null && item.latencyMs !== undefined ? `${item.latencyMs}ms` : '—'}</td><td className="px-4 py-4 text-slate-600">{item.detail}</td></tr>)}
                                    {checks.length === 0 && <tr><td colSpan="4" className="px-4 py-12 text-center"><EmptyState message="No health checks are available." /></td></tr>}
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

function AdminSettingsSection({ csrf, settings = {}, profile = {}, errors = {} }) {
    const branding = settings.branding || {};
    const localization = settings.localization || {};
    const features = settings.features || {};
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
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Configure branding, localization, feature flags, security policy, and integration metadata from database-backed settings.</p>
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
                                    <p className="mt-1 text-sm text-slate-500">Global policy values for administrators, sessions, retention, and password lifecycle.</p>
                                </div>
                            </div>
                            <div className="mt-6 space-y-5">
                                <ToggleBox name="admin_mfa_required" label="Require MFA for all admin users" defaultChecked={security.adminMfaRequired !== false} />
                                <div className="grid gap-4 md:grid-cols-3">
                                    <LightField label="Session Timeout Minutes" name="session_timeout_minutes" type="number" min="15" max="240" defaultValue={security.sessionTimeoutMinutes || 30} error={errors.session_timeout_minutes?.[0]} required />
                                    <LightField label="Password Rotation Days" name="password_rotation_days" type="number" min="30" max="365" defaultValue={security.passwordRotationDays || 90} error={errors.password_rotation_days?.[0]} required />
                                    <LightField label="Data Retention Days" name="data_retention_days" type="number" min="30" max="3650" defaultValue={security.dataRetentionDays || 365} error={errors.data_retention_days?.[0]} required />
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
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="text-lg font-black text-slate-950">Feature Flags</h2>
                                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase text-blue-700">Live</span>
                            </div>
                            <div className="mt-5 space-y-4">
                                <ToggleBox name="ai_matchmaking" label="AI Matchmaking" defaultChecked={!!features.aiMatchmaking} />
                                <ToggleBox name="beta_messaging" label="Beta Messaging" defaultChecked={!!features.betaMessaging} />
                                <ToggleBox name="advanced_analytics" label="Advanced Analytics" defaultChecked={features.advancedAnalytics !== false} />
                                <ToggleBox name="maintenance_mode" label="Maintenance Mode" defaultChecked={!!features.maintenanceMode} />
                            </div>
                        </section>

                        <section className="rounded-2xl bg-slate-950 p-5 text-white shadow-sm">
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-white/60">System Performance</p>
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
                    <p className="text-sm font-semibold text-slate-600">Saving updates the database-backed master configuration immediately.</p>
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
            meta: `${request.school || 'School'} â†’ ${request.university || 'University'}`,
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
    const healthRows = [
        ['Database', 'Operational', `${users.length + events.length + registrations.length + visitRequests.length} records loaded`],
        ['Visit Activity', pendingRequests.length > 0 ? 'Review needed' : 'Operational', `${pendingRequests.length} pending request(s)`],
        ['Messaging', messages.some((message) => message.status === 'failed') ? 'Attention' : 'Operational', `${messages.length} notification(s)`],
        ['Access Control', users.filter((user) => !user.verified).length > 0 ? 'Review needed' : 'Operational', `${users.filter((user) => !user.verified).length} unverified account(s)`],
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
                            <h2 className="text-lg font-black text-slate-950">System Health</h2>
                            <button type="button" onClick={() => setSection?.('system-health')} className="text-xs font-black text-blue-700">Details</button>
                        </div>
                        <div className="mt-4 space-y-3">
                            {healthRows.map(([service, status, detail]) => (
                                <div key={service} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-black text-slate-950">{service}</p>
                                        <span className={cx('rounded-full px-2 py-0.5 text-[10px] font-black uppercase', status === 'Operational' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>{status}</span>
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

function SchoolCoordinatorOverviewSection({ events = [], registrations = [], schools = [], students = [], visitRequests = [], analytics = {}, messages = [], setSection }) {
    const publishedEvents = events.filter((event) => event.status === 'published');
    const confirmedVisits = registrations.filter((registration) => registration.status === 'confirmed');
    const activeRequests = visitRequests.filter((request) => request.status !== 'declined');
    const pendingRequests = visitRequests.filter((request) => request.status === 'requested');
    const scheduledRequests = visitRequests.filter((request) => ['approved', 'scheduled'].includes(request.status));
    const studentRows = normalizeSchoolStudents(students, events);
    const requestedStudents = visitRequests.reduce((total, request) => total + Number(request.groupSize || 0), 0);
    const confirmedStudents = confirmedVisits.reduce((total, registration) => total + Number(registration.partySize || 0), 0);
    const studentTotal = studentRows.length || confirmedStudents || requestedStudents;
    const registrationGoal = Math.max(studentTotal, 120);
    const registrationPct = Math.min(100, Math.round((studentTotal / registrationGoal) * 100));
    const nextConfirmed = confirmedVisits
        .map((registration) => ({ ...registration, eventRecord: events.find((event) => event.title === registration.event) || {} }))
        .sort((left, right) => new Date(left.eventRecord.startsAt || 0) - new Date(right.eventRecord.startsAt || 0))[0];
    const nextDate = nextConfirmed?.eventRecord?.startsAt || scheduledRequests[0]?.eventDate || publishedEvents[0]?.startsAt;
    const universityCards = schoolUniversityCards(events, schools);
    const recommended = universityCards.slice(0, 3);
    const interestRows = schoolInterestDistribution(studentRows, registrations, events);
    const engagementScore = Math.min(9.8, Math.max(4.2, ((activeRequests.length * 0.8) + (confirmedVisits.length * 1.1) + (studentRows.length * 0.03) + 5))).toFixed(1);
    const upcomingVisits = schoolOverviewUpcomingVisits(confirmedVisits, visitRequests, publishedEvents, events).slice(0, 5);
    const latestMessage = messages[0];
    const todayVisits = upcomingVisits.slice(0, 3);
    const firstName = (messages[0]?.sender || schoolProfileNameFromStudents(studentRows) || 'Coordinator').split(' ')[0];
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
                        <span className="text-xs font-black">+{Math.max(1, Math.round(studentTotal / 100))}%</span>
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
                    <h2 className="text-xl font-black text-slate-950">Today's Schedule</h2>
                    <button type="button" onClick={() => setSection?.('calendar')} className="text-xs font-black text-[#006a61]">View Calendar</button>
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="relative space-y-6 p-5">
                        <div className="absolute bottom-8 left-9 top-8 w-px bg-slate-200" />
                        {todayVisits.length ? todayVisits.map((visit, index) => (
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
                <SchoolOverviewMetric icon={GraduationCap} label="Registered Students" value={studentTotal.toLocaleString()} trend={`${registrationPct}% of current goal`} tone="emerald" progress={registrationPct} />
            </div>

            <div className="grid gap-6 xl:grid-cols-12">
                <section className="xl:col-span-4">
                    <div className="relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
                        <div className="absolute -right-14 -top-14 h-36 w-36 rounded-full bg-lime-200/40 blur-3xl" />
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-emerald-700">
                            <Sparkles size={13} /> AI Insight
                        </span>
                        <h2 className="mt-4 text-2xl font-black text-slate-950">Guide Next</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            Based on current student interests and your request history, prioritize universities with strong alignment and open visit capacity.
                        </p>
                        <div className="mt-5 space-y-3">
                            {recommended.map((university) => (
                                <button key={university.name} type="button" onClick={() => setSection?.('explore-universities')} className="flex w-full items-center gap-3 rounded-xl border border-transparent p-3 text-left transition hover:border-slate-200 hover:bg-slate-50">
                                    <span className={cx('grid h-12 w-12 shrink-0 place-items-center rounded-xl text-xs font-black text-white', university.image || 'bg-slate-950')}>{university.name.split(' ').map((word) => word[0]).slice(0, 2).join('')}</span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-black text-slate-950">{university.name}</span>
                                        <span className="mt-0.5 block text-xs font-semibold text-slate-500">{university.match}% match • {university.focus}</span>
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
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-black text-slate-950">Engagement Score</h2>
                            <p className="mt-1 text-sm text-slate-500">Overall student platform activity</p>
                            <div className="mt-4 flex items-end gap-2">
                                <span className="text-5xl font-black text-slate-950">{engagementScore}</span>
                                <span className="pb-1 text-sm font-black text-emerald-600">{Number(engagementScore) >= 7.5 ? 'High' : 'Growing'}</span>
                            </div>
                        </div>
                        <div className="relative h-28 w-28">
                            <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                                <path className="text-slate-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="100, 100" strokeWidth="3" />
                                <path className="text-lime-500" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${Math.round(Number(engagementScore) * 10)}, 100`} strokeLinecap="round" strokeWidth="3" />
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
        const event = events.find((item) => item.title === registration.event || item.id === registration.eventId) || {};
        const university = event.university || registration.name || 'University Partner';

        return {
            id: `registration-${registration.id}`,
            university,
            program: registration.event || event.title || 'Confirmed visit',
            date: event.startsAt || registration.createdAt,
            endsAt: event.endsAt,
            location: event.location || registration.eventLocation || 'Campus location',
            venue: event.venue || 'Confirmed venue',
            status: 'confirmed',
            statusLabel: `${Number(registration.partySize || 0).toLocaleString()} Registered`,
            initials: university.split(' ').map((word) => word[0]).slice(0, 3).join(''),
        };
    });
    const fromRequests = visitRequests.filter((request) => request.status !== 'declined').map((request) => {
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
            statusLabel: request.status === 'requested' ? 'Pending Start' : `${Number(request.groupSize || 0).toLocaleString()} Requested`,
            initials: university.split(' ').map((word) => word[0]).slice(0, 3).join(''),
        };
    });

    return [...fromRegistrations, ...fromRequests]
        .filter((visit) => visit.date)
        .sort((left, right) => new Date(left.date) - new Date(right.date));
}

function schoolInterestDistribution(students, registrations, events) {
    const buckets = [
        ['STEM / Engineering', /stem|engineer|computer|robot|tech|data|science|ai/i],
        ['Arts & Humanities', /art|human|design|creative|media|history|literature/i],
        ['Business & Finance', /business|finance|management|economics|leadership/i],
    ];
    const source = students.length
        ? students.map((student) => student.interest || '')
        : registrations.map((registration) => `${registration.interest || ''} ${registration.event || ''}`);
    const total = Math.max(1, source.length);
    const rows = buckets.map(([label, regex]) => {
        const count = source.filter((value) => regex.test(value)).length;
        return { label, percent: Math.max(8, Math.round((count / total) * 100)) };
    });
    const used = rows.reduce((sum, row) => sum + row.percent, 0);

    if (used < 100) {
        rows.push({ label: 'Exploratory / Undeclared', percent: 100 - used });
    }

    return rows.slice(0, 4);
}

function SchoolStudentsSection({ csrf, events = [], students = [], errors = {} }) {
    const [query, setQuery] = useState('');
    const [grade, setGrade] = useState('all');
    const [interest, setInterest] = useState('all');
    const [selected, setSelected] = useState([]);
    const [page, setPage] = useState(1);
    const [modal, setModal] = useState(null);
    const pageSize = 8;
    const eventOptions = useMemo(() => {
        const titles = events.map((event) => event.title).filter(Boolean).slice(0, 8);
        return titles.length ? titles : ['MIT Tech Tour', 'Stanford Virtual', 'Johns Hopkins Q&A', 'Berkeley Info Session'];
    }, [events]);
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
                            <select name="event_title" className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-blue-400">
                                {eventOptions.map((title) => <option key={title} value={title}>{title}</option>)}
                            </select>
                        </label>
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => setModal(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-black text-slate-600">Cancel</button>
                            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white">Assign to Event</button>
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

function SchoolExploreUniversitiesSection({ events = [], schools = [], setSection }) {
    const [query, setQuery] = useState('');
    const [location, setLocation] = useState('all');
    const [institution, setInstitution] = useState('all');
    const [program, setProgram] = useState('all');
    const [sortBy, setSortBy] = useState('match');
    const [minimumMatch, setMinimumMatch] = useState(70);
    const [selected, setSelected] = useState([]);
    const [shortlist, setShortlist] = useState([]);
    const [profileUniversity, setProfileUniversity] = useState(null);
    const [page, setPage] = useState(1);
    const pageSize = 8;
    const universities = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        return schoolUniversityCards(events, schools)
            .filter((card) => {
                const searchable = `${card.name} ${card.location} ${card.type} ${card.focus} ${card.tags.join(' ')}`.toLowerCase();
                const queryMatch = !normalizedQuery || searchable.includes(normalizedQuery);
                const locationMatch = location === 'all' || card.region === location || card.location.toLowerCase().includes(location);
                const institutionMatch = institution === 'all' || card.type.toLowerCase().includes(institution);
                const programMatch = program === 'all' || card.focus.toLowerCase().includes(program);
                const matchThreshold = Number(card.match || 0) >= minimumMatch;
                return queryMatch && locationMatch && institutionMatch && programMatch && matchThreshold;
            })
            .sort((left, right) => {
                if (sortBy === 'engagement') return Number(right.score || 0) - Number(left.score || 0);
                if (sortBy === 'visits') return Number(right.upcomingVisits || 0) - Number(left.upcomingVisits || 0);
                if (sortBy === 'name') return left.name.localeCompare(right.name);
                return Number(right.match || 0) - Number(left.match || 0);
            });
    }, [events, schools, query, location, institution, program, minimumMatch, sortBy]);
    const totalPages = Math.max(1, Math.ceil(universities.length / pageSize));
    const visibleUniversities = universities.slice((page - 1) * pageSize, page * pageSize);
    const topMatch = universities[0];
    const shortlistItems = schoolUniversityCards(events, schools).filter((card) => shortlist.includes(card.name)).slice(0, 4);

    useEffect(() => {
        setPage(1);
    }, [query, location, institution, program, minimumMatch, sortBy]);

    const toggleSelected = (name) => {
        setSelected((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
    };

    const toggleShortlist = (name) => {
        setShortlist((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
    };

    const resetFilters = () => {
        setQuery('');
        setLocation('all');
        setInstitution('all');
        setProgram('all');
        setMinimumMatch(70);
        setSortBy('match');
    };

    if (profileUniversity) {
        return (
            <UniversityProfileSection
                university={profileUniversity}
                events={events}
                isSaved={shortlist.includes(profileUniversity.name)}
                onBack={() => setProfileUniversity(null)}
                onSave={() => toggleShortlist(profileUniversity.name)}
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
                            Search, compare, and shortlist universities for student cohorts. This workspace is designed for large datasets with filters, ranking, and paginated results.
                        </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3 xl:w-[520px]">
                        <DiscoveryStat label="Results" value={universities.length.toLocaleString()} />
                        <DiscoveryStat label="Selected" value={selected.length} />
                        <DiscoveryStat label="Shortlist" value={shortlist.length} />
                    </div>
                </div>

                <div className="grid gap-4 border-t border-slate-200 bg-slate-50 p-4 lg:grid-cols-[1.3fr_repeat(5,minmax(0,1fr))]">
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
                        ['all', 'All Regions'],
                        ['west', 'West Coast'],
                        ['northeast', 'Northeast'],
                        ['midwest', 'Midwest'],
                        ['south', 'South'],
                    ]} />
                    <DiscoverySelect value={institution} onChange={setInstitution} options={[
                        ['all', 'All Types'],
                        ['private', 'Private'],
                        ['public', 'Public'],
                        ['technical', 'Technical'],
                    ]} />
                    <DiscoverySelect value={program} onChange={setProgram} options={[
                        ['all', 'All Programs'],
                        ['engineering', 'Engineering'],
                        ['business', 'Business'],
                        ['arts', 'Liberal Arts'],
                        ['health', 'Health Sciences'],
                    ]} />
                    <DiscoverySelect value={sortBy} onChange={setSortBy} options={[
                        ['match', 'Sort: AI match'],
                        ['engagement', 'Sort: engagement'],
                        ['visits', 'Sort: visits'],
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
                                <Sparkles size={14} /> AI Discovery Active
                            </span>
                            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">Minimum match: {minimumMatch}%</span>
                            <input
                                type="range"
                                min="50"
                                max="95"
                                step="5"
                                value={minimumMatch}
                                onChange={(event) => setMinimumMatch(Number(event.target.value))}
                                className="w-36 accent-blue-700"
                                aria-label="Minimum match score"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:text-blue-700">
                                <Download size={14} /> Export
                            </button>
                            <button type="button" disabled={!selected.length} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">
                                <CheckSquare size={14} /> Compare {selected.length || ''}
                            </button>
                        </div>
                    </div>

                    <div className="hidden bg-slate-50 px-5 py-3 text-[11px] font-black uppercase tracking-wide text-slate-400 lg:grid lg:grid-cols-[44px_1.6fr_1fr_1fr_120px_120px_1.2fr_150px]">
                        <span />
                        <span>University</span>
                        <span>Location</span>
                        <span>Program fit</span>
                        <span>AI match</span>
                        <span>Engagement</span>
                        <span>Signals</span>
                        <span>Actions</span>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {visibleUniversities.map((card) => (
                            <article key={card.name} className="grid gap-4 p-5 transition hover:bg-blue-50/40 lg:grid-cols-[44px_1.6fr_1fr_1fr_120px_120px_1.2fr_150px] lg:items-center">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={selected.includes(card.name)}
                                        onChange={() => toggleSelected(card.name)}
                                        className="h-4 w-4 rounded border-slate-300 text-blue-700"
                                        aria-label={`Select ${card.name}`}
                                    />
                                </label>
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
                                    <p className="mt-1 text-xs font-semibold text-slate-400">{card.upcomingVisits} visit slots</p>
                                </div>
                                <ScoreMeter value={card.match} tone="emerald" suffix="%" />
                                <ScoreMeter value={card.score} tone="blue" />
                                <div className="flex flex-wrap gap-1.5">
                                    {card.tags.slice(0, 3).map((tag) => (
                                        <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-500">{tag}</span>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => toggleShortlist(card.name)}
                                        className={cx('rounded-lg border px-3 py-2 text-xs font-black', shortlist.includes(card.name) ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-600 hover:text-blue-700')}
                                    >
                                        <Star size={14} className="inline" /> {shortlist.includes(card.name) ? 'Saved' : 'Save'}
                                    </button>
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
                                <h2 className="text-xl font-black text-slate-950">AI Fit Brief</h2>
                                <p className="text-xs font-bold text-slate-400">Refreshed from current cohort signals</p>
                            </div>
                        </div>
                        {topMatch && (
                            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                                <p className="text-[11px] font-black uppercase text-emerald-700">Top Recommendation</p>
                                <p className="mt-2 text-lg font-black text-slate-950">{topMatch.name}</p>
                                <p className="mt-2 text-sm leading-6 text-slate-600">{topMatch.match}% match because your cohort shows strong {topMatch.focus.toLowerCase()} intent and prior engagement in {topMatch.location}.</p>
                            </div>
                        )}
                        <div className="mt-5 space-y-4">
                            <InsightBar label="STEM demand" value={86} />
                            <InsightBar label="Travel feasibility" value={74} />
                            <InsightBar label="Application conversion" value={68} />
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-black text-slate-950">Shortlist</h2>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-500">{shortlist.length}</span>
                        </div>
                        <div className="mt-4 space-y-3">
                            {(shortlistItems.length ? shortlistItems : universities.slice(0, 3)).map((card) => (
                                <div key={card.name} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="font-black text-slate-900">{card.name}</p>
                                        <span className="text-xs font-black text-emerald-700">{card.match}%</span>
                                    </div>
                                    <p className="mt-1 text-xs font-semibold text-slate-500">{card.focus} - {card.location}</p>
                                </div>
                            ))}
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

function UniversityProfileSection({ university, events = [], isSaved, onBack, onSave, onOpenVisits }) {
    const relatedEvents = events.filter((event) => {
        const eventUniversity = (event.university || '').toLowerCase();
        return eventUniversity && (eventUniversity.includes(university.name.toLowerCase()) || university.name.toLowerCase().includes(eventUniversity));
    });
    const fallbackEvents = [
        { title: 'Campus Tour & Engineering Info', startsAt: '2026-10-15T10:00:00', location: 'Virtual', action: 'Register' },
        { title: 'Silicon Valley Campus Visit', startsAt: '2026-10-22T09:00:00', location: university.location, action: 'Request' },
        { title: 'Admissions Q&A', startsAt: '2026-11-05T14:00:00', location: 'Virtual', action: 'RSVP' },
    ];
    const campusEvents = (relatedEvents.length ? relatedEvents : fallbackEvents).slice(0, 3);
    const rank = Math.max(1, 18 - Math.round(Number(university.match || 80) / 7));
    const acceptance = Math.max(4, 18 - Math.round(Number(university.match || 80) / 8)).toFixed(1);
    const sat = 1280 + Math.round(Number(university.score || 80) * 2.8);
    const aid = Math.max(28, Math.round(Number(university.match || 80) * 0.65));
    const diversity = Math.max(44, Math.min(74, Math.round(Number(university.score || 70) * 0.72)));
    const outcomes = Math.max(82, Math.min(97, Math.round(Number(university.match || 80) * 0.98)));

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
                                <span className="rounded bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">Top 10 {university.focus}</span>
                                <span className="rounded bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">Research I</span>
                            </div>
                            <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">{university.name}</h1>
                            <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-slate-500"><MapPin size={15} /> {university.location}</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={onSave} className={cx('rounded-lg border px-6 py-3 text-sm font-black', isSaved ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:text-blue-700')}>
                            {isSaved ? 'Saved' : 'Save'}
                        </button>
                        <button type="button" className="rounded-lg bg-blue-700 px-6 py-3 text-sm font-black text-white hover:bg-blue-800">Brochure</button>
                    </div>
                </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
                <section className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-3">
                        <UniversityProfileMetric label="National Rank" value={`#${rank}`} detail="+1 Position" tone="green" />
                        <UniversityProfileMetric label="Acceptance" value={`${acceptance}%`} detail="Highly Selective" tone="red" />
                        <UniversityProfileMetric label="Avg SAT" value={sat} detail="Mid 50%" />
                        <UniversityProfileMetric label="Outcomes" value={`${outcomes}%`} detail="Employed/Grad" />
                        <UniversityProfileMetric label="Diversity" value={`${diversity}%`} detail="Students of Color" />
                        <UniversityProfileMetric label="Avg Aid" value={`$${aid}k`} detail="Need-Based" />
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
                                        <p className="mt-1 text-xs font-semibold text-slate-500">{event.location || university.location} - {formatTimeRange(event.startsAt, event.endsAt || event.event_date)}</p>
                                    </div>
                                    <button type="button" onClick={onOpenVisits} className="text-sm font-black text-blue-700">{event.action || 'Register'}</button>
                                </div>
                            ))}
                        </div>
                    </section>
                </section>

                <aside className="space-y-5">
                    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-black text-slate-950">Match Breakdown</h2>
                            <span className="text-2xl font-black text-emerald-600">{university.match}%</span>
                        </div>
                        <div className="mt-5 space-y-4">
                            <ProfileMatchLine label="Academic Rigor" value={92} note="Strong" />
                            <ProfileMatchLine label="STEM Alignment" value={university.focus.toLowerCase().includes('engineering') ? 96 : 76} note={university.focus.toLowerCase().includes('engineering') ? 'Excellent' : 'Good'} />
                            <ProfileMatchLine label="Financial Fit" value={68} note="Moderate" />
                        </div>
                        <p className="mt-5 rounded-lg bg-emerald-50 p-3 text-xs font-semibold leading-5 text-emerald-900">
                            High interest in {university.tags[0]} and AP CS. Recommended: {university.focus} tour.
                        </p>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-black text-slate-950">Campus Highlights</h2>
                            <Grid2X2 size={17} className="text-blue-700" />
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            {['D.School Labs', 'Green Library', 'Science Quad'].map((label) => (
                                <div key={label} className="flex h-24 items-end rounded-lg bg-slate-400 p-2 text-xs font-black text-white">{label}</div>
                            ))}
                            <div className="grid h-24 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-black text-blue-700">+12 More</div>
                        </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2">
                            <GraduationCap size={18} className="text-blue-700" />
                            <h2 className="text-lg font-black text-slate-950">Graduate Success</h2>
                        </div>
                        <div className="mt-4 flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <div className="h-12 w-12 rounded-lg bg-slate-300" />
                            <div>
                                <p className="text-sm font-black text-slate-950">Sarah J. '22</p>
                                <p className="text-xs font-semibold text-slate-500">B.S. Computer Science</p>
                                <p className="mt-1 text-xs font-black text-blue-700">Now at Google AI</p>
                            </div>
                        </div>
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

function ProfileMatchLine({ label, value, note }) {
    return (
        <div>
            <div className="flex items-center justify-between text-xs font-black">
                <span className="text-slate-600">{label}</span>
                <span className="text-emerald-700">{note}</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${value}%` }} />
            </div>
        </div>
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

function ScoreMeter({ value, tone = 'blue', suffix = '/100' }) {
    const color = tone === 'emerald' ? 'bg-emerald-500' : 'bg-blue-600';
    return (
        <div>
            <div className="flex items-center justify-between">
                <span className="text-sm font-black text-slate-900">{value}{suffix}</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-100">
                <div className={cx('h-2 rounded-full', color)} style={{ width: `${Math.min(100, Number(value || 0))}%` }} />
            </div>
        </div>
    );
}

function InsightBar({ label, value }) {
    return (
        <div>
            <div className="flex items-center justify-between text-xs font-black text-slate-500">
                <span>{label}</span>
                <span>{value}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-blue-600" style={{ width: `${value}%` }} />
            </div>
        </div>
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
                                    Update Logo
                                    <input type="url" name="logo_url" defaultValue={value('logo_url', profile.logoUrl || '')} placeholder="https://..." className="sr-only" />
                                </label>
                            </div>
                            <div className="grid gap-4">
                                <LightField label="School Name" name="name" defaultValue={value('name')} error={errors.name?.[0]} />
                                <LightTextarea label="Address" name="location" defaultValue={value('location')} error={errors.location?.[0]} />
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
                        <SettingToggle
                            name="sms_alerts"
                            title="SMS Alerts"
                            description="Get instant texts for urgent updates."
                            defaultChecked={boolValue('sms_alerts', false)}
                        />
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                            <div className="flex gap-2">
                                <Sparkles size={17} className="mt-0.5 shrink-0 text-emerald-600" />
                                <p className="text-xs font-semibold leading-5 text-emerald-800">Smart scheduling is enabled. Preferences update automatically based on engagement.</p>
                            </div>
                        </div>
                    </div>
                </aside>
            </form>
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
                                    <p className="mt-1 text-sm text-slate-500">The current MVP stores the 2FA requirement and enforces the security posture in account data. Token delivery can be attached later.</p>
                                </div>
                            </div>
                            <span className={cx('rounded-full px-3 py-1 text-xs font-black', profile.twoFactorEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>{profile.twoFactorEnabled ? 'Enabled' : 'Not enabled'}</span>
                        </div>
                        <div className="mt-6 space-y-5">
                            <SettingToggle name="two_factor_enabled" title="Require two-factor verification" description="Mark this account as requiring a second verification step." defaultChecked={!!profile.twoFactorEnabled} />
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

function SettingToggle({ name, title, description, defaultChecked }) {
    return (
        <label className="flex items-center justify-between gap-4">
            <span>
                <span className="block text-sm font-black text-slate-800">{title}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
            </span>
            <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
                <input type="hidden" name={name} value="0" />
                <input type="checkbox" name={name} value="1" defaultChecked={defaultChecked} className="peer sr-only" />
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
    const [messageOpen, setMessageOpen] = useState(false);
    const [page, setPage] = useState(1);
    const perPage = 10;
    const programs = [...new Set(registrations.map((item) => item.event).filter(Boolean))].sort();
    const interests = [...new Set(registrations.map((item) => item.interest).filter(Boolean))].sort();
    const filtered = registrations.filter((item) => {
        const haystack = `${item.name} ${item.email} ${item.school} ${item.schoolLocation} ${item.event} ${item.interest}`.toLowerCase();
        return haystack.includes(query.toLowerCase())
            && (status === 'all' || item.status === status)
            && (program === 'all' || item.event === program)
            && (interest === 'all' || item.interest === interest);
    });
    const pages = Math.max(1, Math.ceil(filtered.length / perPage));
    const visible = filtered.slice((page - 1) * perPage, page * perPage);
    const selectedVisible = visible.length > 0 && visible.every((item) => selected.includes(item.id));
    const totalSeats = filtered.reduce((sum, item) => sum + Number(item.partySize || 0), 0);
    const confirmedSeats = filtered.filter((item) => item.status === 'confirmed').reduce((sum, item) => sum + Number(item.partySize || 0), 0);
    const attendedSeats = filtered.filter((item) => item.attended).reduce((sum, item) => sum + Number(item.partySize || 0), 0);
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
        const rows = [['Name', 'Email', 'School', 'Location', 'Interest', 'Visit Program', 'Seats', 'Status', 'Attended'], ...filtered.map((item) => [item.name, item.email, item.school, item.schoolLocation, item.interest, item.event, item.partySize, item.status, item.attended ? 'yes' : 'no'])];
        const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'university-attendees.csv';
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="grid gap-4 md:gap-5">
            <section className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">Attendees</h1>
                    <p className="mt-1 text-sm font-semibold text-slate-500">Review and manage registered students and school groups for upcoming visits.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
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
                        <MiniStat label="Confirmed seats" value={confirmedSeats.toLocaleString()} />
                        <MiniStat label="Attendance marked" value={`${Math.round((attendedSeats / Math.max(1, confirmedSeats)) * 100)}%`} />
                    </div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm md:p-5">
                    <div className="flex items-center gap-2">
                        <Sparkles size={18} className="text-emerald-700" />
                        <p className="text-xs font-black uppercase tracking-wide text-emerald-800">AI Insight</p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-emerald-900">Highest attendee concentration is <span className="font-black">{topInterest}</span>. Use this to plan faculty coverage, lab guides, and follow-up messaging.</p>
                    <button type="button" onClick={() => setProgram('all')} className="mt-4 inline-flex items-center gap-2 text-sm font-black text-emerald-800">Review full roster <ArrowRight size={15} /></button>
                </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="grid gap-2 p-3 md:hidden">
                    {visible.map((item) => (
                        <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                            <div className="grid grid-cols-[auto_38px_minmax(0,1fr)_auto] items-center gap-2.5">
                                <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggleOne(item.id)} className="h-4 w-4 rounded border-slate-300 text-[#006a61]" aria-label={`Select ${item.name}`} />
                                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#e5eeff] text-[11px] font-black text-[#0b1c30]">{initials(item.name)}</span>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-black text-slate-950">{item.name}</p>
                                    <p className="truncate text-[11px] font-semibold text-slate-500">{item.school || 'Direct student'} • {item.partySize} seat{Number(item.partySize) === 1 ? '' : 's'}</p>
                                </div>
                                <AttendeeStatusBadge status={item.status} attended={item.attended} />
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-2 border-y border-slate-100 py-2">
                                <div><span className="block text-[9px] font-black uppercase tracking-wide text-slate-400">Program</span><span className="mt-0.5 block truncate text-[12px] font-black text-slate-700">{item.event || 'Program TBA'}</span></div>
                                <div><span className="block text-[9px] font-black uppercase tracking-wide text-slate-400">Interest</span><span className="mt-0.5 block truncate text-[12px] font-black text-slate-700">{item.interest || 'Undeclared'}</span></div>
                            </div>
                            <div className="mt-2 flex gap-2">
                                <button type="button" onClick={() => setEditing(item)} className="flex-1 rounded-lg bg-slate-950 px-3 py-2 text-[12px] font-black text-white">Edit</button>
                                <button type="button" onClick={() => { setSelected((current) => current.includes(item.id) ? current : [...current, item.id]); setMessageOpen(true); }} className="flex-1 rounded-lg border border-[#006a61]/30 px-3 py-2 text-[12px] font-black text-[#006a61]">Message</button>
                                <form action={`/dashboard/university/attendees/${item.id}`} method="POST">
                                    <input type="hidden" name="_token" value={csrf} />
                                    <input type="hidden" name="_method" value="DELETE" />
                                    <button className="grid h-8 w-9 place-items-center rounded-lg border border-red-100 text-red-600" aria-label={`Remove ${item.name}`}><Trash2 size={15} /></button>
                                </form>
                            </div>
                        </article>
                    ))}
                    {visible.length === 0 && <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm font-semibold text-slate-500">No attendees match the current filters.</div>}
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
                            {visible.map((item) => (
                                <tr key={item.id} className="group hover:bg-slate-50">
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
                                    <td className="px-5 py-4"><span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{item.interest || 'Undeclared'}</span></td>
                                    <td className="px-5 py-4">
                                        <p className="text-sm font-semibold text-slate-800">{item.event || 'Program TBA'}</p>
                                        <p className="mt-1 text-xs text-slate-500">{formatDateTime(item.eventDate)} · {item.partySize} seat{Number(item.partySize) === 1 ? '' : 's'}</p>
                                    </td>
                                    <td className="px-5 py-4 text-center"><AttendeeStatusBadge status={item.status} attended={item.attended} /></td>
                                    <td className="px-5 py-4">
                                        <div className="flex justify-end gap-2">
                                            <button type="button" onClick={() => setEditing(item)} title="Edit attendee" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"><Edit3 size={16} /></button>
                                            <form action={`/dashboard/university/attendees/${item.id}`} method="POST">
                                                <input type="hidden" name="_token" value={csrf} />
                                                <input type="hidden" name="_method" value="DELETE" />
                                                <button title="Remove attendee" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"><Trash2 size={16} /></button>
                                            </form>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {visible.length === 0 && (
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
                        </div>
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-black text-slate-600">Cancel</button>
                            <button className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white">Save Changes</button>
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
                                <option value="sms">SMS</option>
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

function StudentNotificationsSection({ registrations }) {
    const notifications = registrations.slice(0, 6).map((registration) => ({
        id: registration.id || `${registration.event}-${registration.status}`,
        title: registration.status === 'waitlisted' ? 'Waitlist update' : 'Booking confirmation',
        body: `${registration.event} is currently ${registration.status}.`,
    }));

    return (
        <section className="grid gap-3">
            {notifications.length === 0 ? (
                <p className="rounded-xl border border-gray-200 bg-white px-5 py-10 text-center text-sm font-medium text-gray-500">No reminders or updates yet.</p>
            ) : notifications.map((notification) => (
                <article key={notification.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-semibold text-gray-950">{notification.title}</p>
                    <p className="mt-1 text-sm text-gray-500">{notification.body}</p>
                </article>
            ))}
        </section>
    );
}

function EventCalendarSection({ csrf, events, registrations = [], title = 'Calendar' }) {
    const [localEvents, setLocalEvents] = useState(events || []);

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
    const selectedEvent = localEvents.find((event) => event.id === selectedId) || datedEvents[0] || localEvents[0] || null;
    const selectedRoster = selectedEvent ? registrations.filter((registration) => registration.event === selectedEvent.title) : [];
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
    const pendingStart = pendingDate && selectedEvent ? moveEventToDate(selectedEvent.startsAt, pendingDate) : null;
    const pendingEnd = pendingDate && selectedEvent ? moveEventToDate(selectedEvent.endsAt || selectedEvent.startsAt, pendingDate) : null;

    const selectEvent = (event) => {
        setSelectedId(event.id);
        setPendingDate(null);
        if (event.startsAt) setSelectedDate(new Date(event.startsAt));
    };

    const jumpToToday = () => {
        const today = new Date();
        setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
        setSelectedDate(today);
    };

    const handleMoveSubmit = async (event) => {
        event.preventDefault();
        if (!selectedEvent || !pendingStart) return;

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
                    ? { ...item, startsAt: pendingStart, endsAt: pendingEnd }
                    : item
            )));
            setSelectedDate(new Date(pendingStart));
            setCursor(new Date(new Date(pendingStart).getFullYear(), new Date(pendingStart).getMonth(), 1));
            setPendingDate(null);
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
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                    <button type="button" onClick={jumpToToday} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm">Today</button>
                    <button type="button" onClick={() => selectedEvent && setPendingDate(addDays(new Date(selectedEvent.startsAt || Date.now()), 7))} disabled={!selectedEvent} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white shadow-sm disabled:opacity-40">Suggest Slot</button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 md:gap-4">
                <ScheduleMetric label="This week" value={weekEvents || localEvents.length} detail="scheduled visits" tone="green" />
                <ScheduleMetric label="Expected" value={expectedStudents.toLocaleString()} detail="students" tone="blue" />
                <ScheduleMetric label="Busiest" value={busiestDay.label} detail={busiestDay.detail} tone="slate" />
            </div>

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
                            <button key={date.toISOString()} type="button" onClick={() => setSelectedDate(date)} className={cx('relative rounded-xl px-1 py-2 text-center transition', active ? 'bg-[#006a61] text-white shadow-sm' : 'text-slate-500')}>
                                <span className="block text-[9px] font-black uppercase">{date.toLocaleDateString([], { weekday: 'short' })}</span>
                                <span className="mt-1 block text-sm font-black">{date.getDate()}</span>
                                {count > 0 && <span className={cx('mx-auto mt-1 block h-1.5 w-1.5 rounded-full', active ? 'bg-white' : 'bg-[#006a61]')} />}
                            </button>
                        );
                    })}
                </div>

                <div className="relative mt-4 space-y-3 before:absolute before:bottom-2 before:left-5 before:top-2 before:w-px before:bg-slate-200">
                    {dayEvents.length === 0 ? (
                        <button type="button" onClick={() => selectedEvent && setPendingDate(selectedDate)} className="relative z-10 w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm font-black text-slate-500">Free slot - tap to move selected visit here</button>
                    ) : dayEvents.map((event) => (
                        <MobileScheduleCard key={event.id} event={event} active={selectedId === event.id} onSelect={() => selectEvent(event)} onMove={() => setPendingDate(selectedDate)} />
                    ))}
                </div>
            </section>

            <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
                <section className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{cursor.getFullYear()}</p>
                            <h2 className="text-xl font-black text-slate-950">{cursor.toLocaleDateString([], { month: 'long' })}</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="rounded-xl bg-[#e5eeff] px-3 py-2 text-xs font-black text-[#006a61]">Month</span>
                            <button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600"><ChevronRight size={16} className="rotate-180" /></button>
                            <button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600"><ChevronRight size={16} /></button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-[10px] font-black uppercase tracking-wide text-slate-400">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <div key={day} className="px-2 py-2.5">{day}</div>)}
                    </div>
                    <div className="grid grid-cols-7">
                        {monthCells.map((date) => {
                            const dayItems = eventsForDay(date);
                            const inMonth = date.getMonth() === cursor.getMonth();
                            const isTarget = pendingDate && isSameCalendarDay(date, pendingDate);
                            const isSelectedDay = isSameCalendarDay(date, selectedDate);

                            return (
                                <div key={date.toISOString()} className={cx('min-h-24 border-b border-r border-slate-100 p-2', inMonth ? 'bg-white' : 'bg-slate-50/70', isSelectedDay && 'bg-emerald-50/40', isTarget && 'ring-2 ring-inset ring-[#006a61]')}>
                                    <div className="flex items-center justify-between">
                                        <button type="button" onClick={() => setSelectedDate(date)} className={cx('grid h-6 w-6 place-items-center rounded-full text-xs font-black', isSelectedDay ? 'bg-[#006a61] text-white' : inMonth ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-300')}>{date.getDate()}</button>
                                        {selectedEvent && inMonth && <button type="button" onClick={() => setPendingDate(date)} className="rounded px-1.5 py-1 text-[10px] font-black text-[#006a61] hover:bg-emerald-50">Move</button>}
                                    </div>
                                    <div className="mt-1.5 space-y-1">
                                        {dayItems.slice(0, 2).map((event) => {
                                            const full = Number(event.confirmedSeats || 0) >= Number(event.capacity || 1);
                                            return (
                                                <button key={event.id} type="button" onClick={() => selectEvent(event)} className={cx('w-full rounded-lg border-l-4 px-2 py-1 text-left text-[10px] font-bold leading-4', selectedId === event.id ? 'border-[#006a61] bg-emerald-50 text-[#005049]' : full ? 'border-red-500 bg-red-50 text-red-700' : 'border-blue-500 bg-blue-50 text-blue-800')}>
                                                    <span className="block truncate">{event.title}</span>
                                                    <span className="opacity-75">{formatTimeRange(event.startsAt, event.endsAt)} · {event.confirmedSeats}/{event.capacity}</span>
                                                </button>
                                            );
                                        })}
                                        {dayItems.length > 2 && <span className="text-[10px] font-bold text-slate-400">+{dayItems.length - 2} more</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <CalendarEventDrawer event={selectedEvent} roster={selectedRoster} />
            </div>

            {moveMessage && <p className={cx('rounded-xl px-4 py-3 text-sm font-black', moveMessage.includes('Unable') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700')}>{moveMessage}</p>}

            {pendingDate && selectedEvent && (
                <section className="sticky bottom-20 z-20 ml-auto w-full rounded-2xl border border-slate-700 bg-slate-950 p-3 text-white shadow-2xl md:bottom-4 md:max-w-2xl">
                    <form action={`/campus-events/${selectedEvent.id}`} method="POST" onSubmit={handleMoveSubmit} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <input type="hidden" name="_token" value={csrf} />
                        <input type="hidden" name="_method" value="PUT" />
                        <input type="hidden" name="title" value={selectedEvent.title || ''} />
                        <input type="hidden" name="venue" value={selectedEvent.venue || ''} />
                        <input type="hidden" name="location" value={selectedEvent.location || ''} />
                        <input type="hidden" name="description" value={selectedEvent.description || ''} />
                        <input type="hidden" name="capacity" value={selectedEvent.capacity || 1} />
                        <input type="hidden" name="status" value={selectedEvent.status || 'published'} />
                        <input type="hidden" name="starts_at" value={toInputDateTime(pendingStart)} />
                        <input type="hidden" name="ends_at" value={toInputDateTime(pendingEnd)} />
                        <p className="text-sm font-bold">Move "{selectedEvent.title}" to {formatShortDate(pendingStart)}?</p>
                        <div className="grid grid-cols-2 gap-2 md:flex">
                            <button type="button" onClick={() => setPendingDate(null)} className="rounded-xl px-3 py-2 text-xs font-black text-white/70 hover:bg-white/10">Cancel</button>
                            <button disabled={savingMove} className="rounded-xl bg-[#006a61] px-4 py-2 text-xs font-black text-white hover:opacity-90 disabled:opacity-50">{savingMove ? 'Saving...' : 'Confirm'}</button>
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

function MobileScheduleCard({ event, active, onSelect, onMove }) {
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
                    <span onClick={(click) => { click.stopPropagation(); onMove(); }} className="rounded-lg bg-slate-950 px-3 py-1.5 text-[11px] font-black text-white">Move here</span>
                </div>
            </button>
        </article>
    );
}

function CalendarEventDrawer({ event, roster }) {
    if (!event) {
        return (
            <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                <EmptyState message="Select an event to inspect capacity, attending schools, and scheduling notes." />
            </aside>
        );
    }

    const percent = eventCapacityPercent(event);
    const schools = roster.length
        ? [...new Set(roster.map((registration) => registration.name).filter(Boolean))]
        : ['Stanford University', 'UC Berkeley', 'MIT', 'NIST International School', 'Oakwood Prep'];
    const isFull = Number(event.confirmedSeats || 0) >= Number(event.capacity || 1);

    return (
        <aside className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4 md:p-5">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className={cx('h-2.5 w-2.5 rounded-full', isFull ? 'bg-red-500' : 'bg-emerald-500')} />
                        <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">{isFull ? 'Full' : 'Confirmed'}</span>
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
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">Attending Schools</p>
                    <div className="mt-2 flex flex-wrap gap-2 md:mt-3">
                        {schools.slice(0, 4).map((school) => <span key={school} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{school}</span>)}
                        {schools.length > 4 && <span className="rounded-md bg-slate-200 px-2.5 py-1 text-xs font-black text-slate-600">+{schools.length - 4} more</span>}
                    </div>
                </div>

                <div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">AI Notes</p>
                    <p className={cx('mt-2 rounded-xl border-l-4 p-3 text-xs font-semibold leading-5 md:mt-3', isFull ? 'border-red-300 bg-red-50 text-red-800' : 'border-emerald-300 bg-emerald-50 text-emerald-800')}>
                        {isFull ? 'Capacity pressure is high. Recommended to open a second room, increase virtual capacity, or move overflow to waitlist.' : 'Healthy booking pace. Recommended to keep this slot and trigger counselor reminders seven days before the event.'}
                    </p>
                </div>

                <button type="button" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
                    <Search size={15} /> View Full Event
                </button>
            </div>
        </aside>
    );
}

function MessageCenterSection({ csrf, registrations = [], messages = [], role }) {
    const threads = messageThreadsForRole(role, messages, registrations);
    const [activeId, setActiveId] = useState(threads[0]?.id || 'general');
    const [filter, setFilter] = useState('active');
    const [mobileChatOpen, setMobileChatOpen] = useState(false);
    const [mobileCategory, setMobileCategory] = useState('all');
    const [draft, setDraft] = useState('');
    const [channel, setChannel] = useState('email');
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
            payload.set('channel', channel);
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

                    <form action="/dashboard/messages" method="POST" onSubmit={submitMessage} className="sticky bottom-0 border-t border-slate-200 bg-white p-3 md:p-4">
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
                                <select name="channel" value={channel} onChange={(event) => setChannel(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs font-bold text-slate-600 outline-none md:px-3">
                                    <option value="email">Email</option>
                                    <option value="sms">SMS</option>
                                </select>
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
    const roleDefaults = {
        university: [
            ['sarah', 'Sarah Jenkins', 'Coordinator, Lincoln High School', 'Looking forward to the campus tour...', 'SJ', 'bg-slate-700', 'students'],
            ['marcus', 'Marcus Johnson', 'Westlake Academy', 'Can we add 5 more students to the robotics visit?', 'MJ', 'bg-emerald-700', 'students'],
            ['elena', 'Elena Wong', 'Oakridge High', 'Is parking available for the bus near the east gate?', 'EW', 'bg-blue-500', 'students'],
        ],
        school: [
            ['admissions', 'University Admissions', 'Campus visit office', 'We are confirming your visit request details.', 'UA', 'bg-blue-700', 'admissions'],
            ['events', 'Event Operations', 'Visit logistics', 'Bus arrival and check-in instructions are ready.', 'EO', 'bg-slate-700', 'admissions'],
            ['parent', 'Sarah Thompson (Parent)', 'Parent contact', 'Thank you for the update on the orientation schedule.', 'ST', 'bg-emerald-700', 'parents'],
        ],
        student: [
            ['advisor', 'Campus Visit Advisor', 'University admissions', 'Your visit reminder and check-in barcode are ready.', 'CA', 'bg-blue-700', 'admissions'],
            ['school', 'School Counselor', 'Guidance office', 'Please confirm your attendance for the upcoming visit.', 'SC', 'bg-emerald-700', 'students'],
        ],
        platform: [
            ['ops', 'Platform Operations', 'System-wide messaging', 'Queued notifications and delivery health are normal.', 'PO', 'bg-slate-700', 'admissions'],
            ['support', 'University Support', 'Recruiter support desk', 'A school has requested more event capacity.', 'US', 'bg-blue-700', 'admissions'],
        ],
        admin: [
            ['ops', 'Platform Operations', 'System-wide messaging', 'Queued notifications and delivery health are normal.', 'PO', 'bg-slate-700', 'admissions'],
        ],
    };
    const defaults = roleDefaults[role] || roleDefaults.platform;
    const demoThreads = defaults.map(([id, name, subtitle, preview, initialsText, color, category], index) => ({
        id,
        name,
        subtitle,
        preview,
        time: index === 0 ? '10:42 AM' : 'Yesterday',
        initials: initialsText,
        color,
        category,
        categoryLabel: titleCase(category),
        online: index === 0,
        unread: index === 1,
        unreadCount: index === 1 ? 1 : 0,
        archived: false,
        messages: [
            { id: `${id}-1`, author: name, time: '2:30 PM', body: preview, mine: false },
            { id: `${id}-2`, author: 'You', time: '3:15 PM', body: responseForRole(role, registrations), mine: true },
            { id: `${id}-3`, author: name, time: '10:42 AM', body: 'That sounds like a good plan. Looking forward to the next update.', mine: false },
        ],
    }));

    return [...queuedMessages, ...demoThreads];
}

function responseForRole(role, registrations) {
    if (role === 'student') return 'Thanks, I have confirmed my visit and will watch for reminders.';
    if (role === 'school') return 'We will split students into groups and share the final attendee list.';
    if (role === 'admin' || role === 'platform') return 'Please keep the delivery log updated and flag failed messages.';
    return `Perfect, thanks for the update. ${registrations.length || 45} students is great. We will split them into manageable groups.`;
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

        let map = null;
        try {
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
                marker.bindPopup(`<strong>${point.label}</strong><br/>${point.location || ''}${point.meta ? `<br/>${point.meta}` : ''}`);
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

        return () => {
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
            />
        );
    }

    return (
        <div className="grid gap-4 md:gap-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div><h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">Partner Schools</h1><p className="mt-1 text-sm font-semibold text-slate-500">Manage institutional relationships and student engagement analytics.</p></div>
                <button type="button" onClick={() => document.getElementById('partner-school-search')?.focus()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"><Search size={16} /> Find Schools</button>
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-2 md:gap-4 xl:grid-cols-4">
                <PartnerMetric label="Total Partnerships" value={schools.length} detail="Growing network" />
                <PartnerMetric label="Active Engagements" value={engagementTotal.toLocaleString()} detail="High activity" tone="green" />
                <PartnerMetric label="Upcoming Visits" value={scheduledVisits} detail="Scheduled or requested" />
                <section className="rounded-xl bg-emerald-600 p-3 text-white shadow-sm md:p-4"><p className="text-[10px] font-black uppercase tracking-wide text-white/70 md:text-xs">AI Outreach</p><p className="mt-2 text-xl font-black">Optimum</p><p className="mt-1 text-xs text-white/80">Strong partner coverage</p></section>
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
                            <button type="button" onClick={() => openSchoolDetail(school)} className="mt-2 w-full rounded-lg bg-slate-950 px-3 py-2 text-[12px] font-black text-white">View Profile</button>
                        </article>
                    ))}
                </div>
                <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[830px] text-left text-sm"><thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">School Name</th><th className="px-5 py-4">Location</th><th className="px-5 py-4">Engagement Score</th><th className="px-5 py-4">No. of Visits</th><th className="px-5 py-4 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-200">{visibleSchools.length === 0 ? <tr><td colSpan="5" className="px-5 py-12 text-center text-slate-500">No partner schools match these filters.</td></tr> : visibleSchools.map((school) => <tr key={school.id} className="hover:bg-blue-50/30"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded bg-blue-100 text-xs font-black text-blue-700">{school.name.slice(0, 1)}</span><div><p className="font-black text-slate-950">{school.name}</p><p className="text-xs text-slate-400">{school.type?.replace('_', ' ') || 'Partner school'}</p></div></div></td><td className="px-5 py-4 text-slate-600"><span className="inline-flex items-center gap-1"><MapPin size={13} /> {school.city}, {school.country}</span></td><td className="px-5 py-4"><PartnerScore school={school} /></td><td className="px-5 py-4 font-bold text-slate-700">{schoolVisits(school)}</td><td className="px-5 py-4 text-right"><button type="button" onClick={() => openSchoolDetail(school)} className="text-xs font-black text-blue-700 hover:text-blue-900">View Details</button></td></tr>)}</tbody></table></div>
                <div className="flex items-center justify-between border-t border-slate-200 px-3 py-3 text-xs text-slate-500 md:px-5 md:py-4"><span>Showing {visibleSchools.length} of {schools.length} partner schools</span><span className="hidden md:inline">Database-backed demo data</span></div>
            </section>

            <section className="rounded-xl border border-blue-200 bg-blue-50 p-4 md:p-6"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2 text-sm font-black text-slate-950"><Sparkles size={18} className="text-blue-600" /> AI-Powered School Matching</div><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 md:mt-3">Your partner-school data indicates strong opportunities in high-engagement regions. Review the highest match scores to prioritize outreach and visits.</p></div><div className="grid grid-cols-2 gap-2 md:flex"><button type="button" onClick={() => setTab('ivy')} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white md:px-4 md:py-2.5 md:text-sm">Review</button><button type="button" onClick={() => setTab('all')} className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-black text-blue-700 md:px-4 md:py-2.5 md:text-sm">Dismiss</button></div></div></section>
        </div>
    );
}

function PartnerMetric({ label, value, detail, tone = 'blue' }) {
    return <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:p-4"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400 md:text-[11px]">{label}</p><p className="mt-2 text-xl font-black text-slate-950 md:text-2xl">{value}</p><p className={cx('mt-1 text-[11px] font-bold md:text-xs', tone === 'green' ? 'text-emerald-600' : 'text-blue-600')}>{detail}</p></section>;
}

function PartnerSchoolDetail({ csrf, school, archives, visitsCount, onBack }) {
    const insight = partnerSchoolInsight(school, archives);
    const yearlyApplicants = Math.round((Number(school.activeApplicants || 0) * 8) + Number(school.matchScore || 0) * 9);
    const recruited = archives.reduce((total, archive) => total + Number(archive.leads || 0), 0) || Math.round(yearlyApplicants * 0.42);
    const latestArchive = archives[0];
    const primaryContact = `${school.name.split(' ')[0]} Admissions`;
    const contacts = [
        ['Dr. Sarah Jenkins', 'Director of College Counseling', 'sarah.jenkins@example.edu'],
        ['Marcus Thompson', 'Mathematics Manager', 'marcus.thompson@example.edu'],
    ];

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
                        <Sparkles size={14} /> {school.matchScore} - High Potential
                    </span>
                    <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-black text-blue-700">
                        <MailCheck size={14} /> Message Counselor
                    </button>
                    <form action={`/partner-schools/${school.id}/schedule-visit`} method="POST">
                        <input type="hidden" name="_token" value={csrf} />
                        <button className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white">
                            <CalendarDays size={14} /> Schedule New Visit
                        </button>
                    </form>
                    <button type="button" onClick={onBack} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500" aria-label="Back to schools"><X size={15} /></button>
                </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
                <PartnerMetric label="Total Partnership" value={`${Math.max(1, visitsCount + 9)} Years`} detail="Long-term strategic ally" tone="green" />
                <PartnerMetric label="Students Recruited" value={recruited.toLocaleString()} detail="+18% from previous year" tone="green" />
                <PartnerMetric label="Campus Visits" value={visitsCount || archives.length || 1} detail={`Avg. ${Math.max(1, Math.round((visitsCount || 1) / 2))} visits / year`} />
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[310px_1fr]">
                <section className="rounded-lg bg-slate-950 p-5 text-white shadow-sm">
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-black uppercase text-emerald-200">
                        <Brain size={14} /> AI Recruitment Insights
                    </div>
                    <p className="mt-5 text-xs font-black uppercase tracking-wide text-white/50">Conversion Probability</p>
                    <div className="mt-2 flex items-end gap-2">
                        <span className="text-4xl font-black">{insight.probability}%</span>
                        <span className="mb-1 rounded-full bg-emerald-400 px-2 py-1 text-[10px] font-black text-slate-950">Excellent</span>
                    </div>
                    <p className="mt-5 text-xs font-black uppercase tracking-wide text-white/50">Engagement Strategies</p>
                    <div className="mt-3 space-y-3">
                        {insight.strategies.map((strategy) => (
                            <div key={strategy} className="flex gap-2 text-xs leading-5 text-white/80">
                                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-300" />
                                <span>{strategy}</span>
                            </div>
                        ))}
                    </div>
                    <button type="button" className="mt-5 w-full rounded-lg border border-white/15 bg-white px-3 py-2 text-xs font-black text-slate-950">Generate Detailed Report</button>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h3 className="font-black text-slate-950">Engagement Trends</h3>
                            <p className="mt-1 text-xs font-semibold text-slate-500">Applications vs. inquiries based on demo history.</p>
                        </div>
                        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                            <button type="button" className="rounded-md bg-white px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm">Yearly</button>
                            <button type="button" className="px-3 py-1.5 text-xs font-bold text-slate-400">Quarterly</button>
                        </div>
                    </div>
                    <PartnerTrendChart school={school} archives={archives} />
                </section>
            </div>

            <section className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <h3 className="font-black text-slate-950">Recent Campus Engagements</h3>
                    <button type="button" className="text-xs font-black text-blue-700">View All History</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wide text-slate-500">
                            <tr><th className="px-5 py-3">Event Name</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Attendance</th><th className="px-5 py-3">Follow-ups</th><th className="px-5 py-3">Status</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {detailArchives(school, archives).map((archive) => (
                                <tr key={archive.id}>
                                    <td className="px-5 py-4"><p className="font-black text-slate-950">{archive.type}</p><p className="text-xs text-slate-400">{archive.summary}</p></td>
                                    <td className="px-5 py-4 font-semibold text-slate-600">{formatShortDate(archive.visitedOn)}</td>
                                    <td className="px-5 py-4"><div className="h-1.5 w-28 rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, Math.max(12, Number(archive.engagement || 0) * 2))}%` }} /></div><p className="mt-1 text-xs font-bold text-slate-500">{archive.leads}+ leads</p></td>
                                    <td className="px-5 py-4 font-semibold text-slate-600">{Math.max(8, Math.round(Number(archive.leads || 0) * 0.28))} Students</td>
                                    <td className="px-5 py-4"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700">{archive.status?.replace('_', ' ') || 'completed'}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <div className="mt-5 grid gap-4 lg:grid-cols-[320px_1fr]">
                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="font-black text-slate-950">Key Contacts</h3>
                    <div className="mt-4 space-y-4">
                        {contacts.map(([name, title, email]) => (
                            <div key={email} className="flex items-center gap-3">
                                <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-xs font-black text-slate-700">{name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>
                                <div className="min-w-0 flex-1"><p className="text-sm font-black text-slate-950">{name}</p><p className="text-xs text-slate-500">{title}</p></div>
                                <a href={`mailto:${email}`} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-blue-700" aria-label={`Email ${name}`}><MailCheck size={14} /></a>
                            </div>
                        ))}
                    </div>
                    <div className="mt-5 border-t border-slate-100 pt-4">
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Location Info</p>
                        <div className="mt-3"><OpenStreetMapEmbed location={`${school.name}, ${school.city}, ${school.country}`} points={[{ label: school.name, location: `${school.city}, ${school.country}`, latitude: school.latitude, longitude: school.longitude, meta: `${visitsCount} visits • ${school.matchScore}/100 match` }]} title={`${school.name} location on OpenStreetMap`} className="h-36" /></div>
                        <OpenStreetMapLink location={`${school.name}, ${school.city}, ${school.country}`} className="mt-2 inline-flex items-center gap-1 text-xs font-black text-blue-700"><MapIcon size={13} /> Open in OpenStreetMap</OpenStreetMapLink>
                    </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <h3 className="font-black text-slate-950">Internal Strategic Notes</h3>
                        <button type="button" className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500" aria-label="Edit notes"><Command size={14} /></button>
                    </div>
                    <div className="mt-4 space-y-3">
                        <StrategicNote body={`${school.name} remains a strong source for ${insight.focusArea} talent. Focus on the upcoming cycle with a premium counselor relationship and faculty-led session.`} author={primaryContact} date={latestArchive?.visitedOn || '2026-10-12'} />
                        <StrategicNote body={`Recurring pipeline for ${insight.focusArea.toLowerCase()} roles is trending upward. Suggested engagement: portfolio review, parent briefing, and student application clinic.`} author="AI Recruitment Model" date="2026-09-18" />
                    </div>
                    <textarea className="mt-4 min-h-24 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50" placeholder="Add a quick note..." />
                </section>
            </div>
        </section>
    );
}

function PartnerTrendChart({ school, archives }) {
    const base = Math.max(24, Number(school.matchScore || 80) - 46);
    const points = ['2022', '2023', '2024', '2025', '2026'].map((year, index) => {
        const archiveLift = archives[index % Math.max(1, archives.length)]?.engagement || 0;
        return { year, inquiries: Math.round(base + index * 8 + archiveLift), applications: Math.round(base * 0.45 + index * 6 + Number(school.yieldRate || 0) * 3) };
    });
    const maxValue = Math.max(...points.map((point) => point.inquiries), 1);

    return (
        <div className="mt-8 flex h-72 items-end gap-4 border-b border-l border-slate-200 px-4 pb-4">
            {points.map((point) => (
                <div key={point.year} className="flex flex-1 flex-col items-center justify-end gap-2">
                    <div className="flex h-48 w-full items-end justify-center gap-2">
                        <span className="w-4 rounded-t bg-blue-600" style={{ height: `${Math.max(12, (point.applications / maxValue) * 100)}%` }} title={`${point.applications} applications`} />
                        <span className="w-4 rounded-t bg-emerald-400" style={{ height: `${Math.max(16, (point.inquiries / maxValue) * 100)}%` }} title={`${point.inquiries} inquiries`} />
                    </div>
                    <span className="text-xs font-bold text-slate-400">{point.year}</span>
                </div>
            ))}
        </div>
    );
}

function StrategicNote({ body, author, date }) {
    return (
        <article className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <p className="text-sm leading-6 text-slate-600">"{body}"</p>
            <p className="mt-2 text-[11px] font-black uppercase text-slate-400">{author} - {formatShortDate(date)}</p>
        </article>
    );
}

function partnerSchoolInsight(school, archives) {
    const focusArea = /science|tech|engineering|robotics|nist/i.test(school.name) ? 'STEM' : /arts|design|portfolio/i.test(school.name) ? 'Creative Arts' : 'Business and Analytics';
    const probability = Math.min(96, Math.max(64, Math.round(Number(school.matchScore || 80) * 0.86 + Number(school.yieldRate || 0) * 1.8 + archives.length)));

    return {
        focusArea,
        probability,
        strategies: [
            `Host a ${focusArea} track briefing with faculty and current students.`,
            `Use alumni outcomes from the ${school.region} region in counselor follow-up.`,
            'Increase presence in the graduate school and scholarship advising channel.',
        ],
    };
}

function detailArchives(school, archives) {
    if (archives.length > 0) {
        return archives.slice(0, 4);
    }

    const leads = Math.max(45, Number(school.activeApplicants || 6) * 12);

    return [
        { id: `${school.id}-spring`, type: 'Spring Tech Career Fair', visitedOn: '2026-04-12', leads, engagement: 42, status: 'completed', summary: 'Main campus recruitment fair' },
        { id: `${school.id}-mixer`, type: 'Engineering Mixer', visitedOn: '2026-03-05', leads: Math.round(leads * 0.62), engagement: 34, status: 'completed', summary: 'Departmental networking session' },
        { id: `${school.id}-mba`, type: 'Leadership Session', visitedOn: '2026-02-18', leads: Math.round(leads * 0.44), engagement: 28, status: 'completed', summary: 'Counselor and student briefing' },
    ];
}

function PartnerScore({ school }) {
    const label = school.matchScore >= 94 ? 'High conversion potential' : school.matchScore >= 88 ? 'Rising engagement' : 'Growth opportunity';
    return <div><span className={cx('rounded-full px-2.5 py-1 text-[10px] font-black uppercase', school.matchScore >= 94 ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700')}>{school.tier}</span><p className="mt-1 text-[10px] font-bold uppercase text-emerald-600">{label} · {school.matchScore}/100</p></div>;
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

function UniversityVisitRequestsSection({ csrf, visitRequests = [], schools = [] }) {
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
    const pendingCount = visitRequests.filter((item) => item.status === 'requested').length;
    const approvedCount = visitRequests.filter((item) => ['approved', 'scheduled'].includes(item.status)).length;
    const reviewCount = visitRequests.filter((item) => item.status === 'approved').length;
    const capacityPct = Math.min(100, Math.max(0, Math.round((approvedCount / Math.max(1, visitRequests.length)) * 100)));

    useEffect(() => setPage(1), [query, status, region, date]);

    const exportCsv = () => {
        const rows = [['Request ID', 'School', 'Requested date', 'Group size', 'Region', 'Status'], ...filtered.map((item) => [`REQ-${String(item.id).padStart(4, '0')}`, item.school, item.window, item.groupSize, item.region || '', item.status])];
        const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
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
                <div><h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">Visit Requests</h1><p className="mt-1 text-sm font-semibold text-slate-500">Manage and track incoming campus visit inquiries from partner schools.</p></div>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                    <button type="button" onClick={exportCsv} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#006a61]/30 bg-white px-3 py-2 text-xs font-black text-[#006a61] md:px-4 md:py-2.5 md:text-sm"><Download size={15} /> Export</button>
                    <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white md:px-4 md:py-2.5 md:text-sm"><Plus size={15} /> New Request</button>
                </div>
            </section>

            <section className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
                <MobileRequestMetric label="Total Pending" value={pendingCount} helper="+12% vs last week" tone="emerald" icon={Activity} />
                <MobileRequestMetric label="Under Review" value={reviewCount} helper="Last updated 1h ago" tone="blue" icon={Clock} />
                <MobileRequestMetric label="Confirmed" value={approvedCount} helper="Active visits today" tone="emerald" icon={CheckCircle2} />
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
                    <MobileVisitRequestCard key={request.id} csrf={csrf} request={request} statusStyle={statusStyle} onDetails={() => setSelected(request)} />
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
                            <div className="flex items-center gap-3 md:col-span-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600"><School size={18} /></span><span className="min-w-0"><span className="block truncate text-sm font-black text-slate-900">{request.school}</span><span className="mt-0.5 block text-xs text-slate-500">ID: REQ-{String(request.id).padStart(4, '0')}</span></span></div>
                            <p className="text-sm text-slate-700 md:col-span-2">{request.window}</p>
                            <p className="text-sm font-semibold text-slate-700 md:col-span-2">{request.groupSize} Students</p>
                            <p className="text-sm text-slate-700 md:col-span-2">{request.region || request.location || 'Unassigned'}</p>
                            <div className="md:col-span-2"><span className={cx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold capitalize', statusStyle[request.status] || 'border-slate-200 bg-slate-50 text-slate-600')}><span className="h-1.5 w-1.5 rounded-full bg-current" />{request.status === 'requested' ? 'Pending' : request.status}</span></div>
                            <div className="flex justify-end gap-1 md:opacity-0 md:group-hover:opacity-100">
                                {request.status === 'requested' && <><DecisionIconButton csrf={csrf} id={request.id} decision="approved" label="Approve" icon={CheckCircle2} tone="green" /><DecisionIconButton csrf={csrf} id={request.id} decision="declined" label="Reject" icon={X} tone="red" /></>}
                                {request.status === 'approved' && <DecisionIconButton csrf={csrf} id={request.id} decision="scheduled" label="Schedule" icon={CalendarDays} tone="blue" />}
                                <button type="button" onClick={() => setSelected(request)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-200" title="View details"><MoreVertical size={18} /></button>
                            </div>
                        </article>
                    ))}
                </div>
                <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between"><p className="text-slate-500">Showing <strong className="text-slate-900">{filtered.length ? (page - 1) * perPage + 1 : 0}</strong> to <strong className="text-slate-900">{Math.min(page * perPage, filtered.length)}</strong> of <strong className="text-slate-900">{filtered.length}</strong> results</p><div className="flex gap-2"><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-bold disabled:opacity-40">Previous</button><span className="rounded-lg bg-blue-600 px-3 py-1.5 font-bold text-white">{page}</span><button type="button" disabled={page === pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-bold disabled:opacity-40">Next</button></div></div>
            </section>

            {createOpen && <ModalShell title="New Visit Request" onClose={() => setCreateOpen(false)}><form action="/visit-requests" method="POST" className="grid gap-4" onSubmit={() => window.setTimeout(() => setCreateOpen(false), 0)}><input type="hidden" name="_token" value={csrf} /><label className="grid gap-1.5 text-sm font-bold text-slate-700">Partner school<select name="target_school_id" required className="rounded-lg border border-slate-200 px-3 py-2.5 font-normal"><option value="">Select a school</option>{schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}</select></label><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-bold text-slate-700">Requested date<input type="date" name="requested_window" required min={new Date().toISOString().slice(0, 10)} className="rounded-lg border border-slate-200 px-3 py-2.5 font-normal" /></label><label className="grid gap-1.5 text-sm font-bold text-slate-700">Group size<input type="number" name="group_size" required min="1" max="10000" defaultValue="30" className="rounded-lg border border-slate-200 px-3 py-2.5 font-normal" /></label></div><label className="grid gap-1.5 text-sm font-bold text-slate-700">Priority<select name="priority" defaultValue="2" className="rounded-lg border border-slate-200 px-3 py-2.5 font-normal"><option value="1">Low</option><option value="2">Normal</option><option value="3">High</option><option value="4">Urgent</option><option value="5">Critical</option></select></label><label className="grid gap-1.5 text-sm font-bold text-slate-700">Notes<textarea name="notes" rows="3" className="rounded-lg border border-slate-200 px-3 py-2.5 font-normal" placeholder="Request context or accessibility needs..." /></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setCreateOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold">Cancel</button><button className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white">Add Request</button></div></form></ModalShell>}
            {selected && <ModalShell title={selected.school} onClose={() => setSelected(null)}><div className="grid gap-3 text-sm"><RequestDetail label="Request ID" value={`REQ-${String(selected.id).padStart(4, '0')}`} /><RequestDetail label="Requested date" value={selected.window} /><RequestDetail label="Group size" value={`${selected.groupSize} students`} /><RequestDetail label="Region" value={selected.region || selected.location} /><RequestDetail label="Status" value={selected.status} /></div></ModalShell>}
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

function MobileVisitRequestCard({ csrf, request, onDetails }) {
    const isPending = request.status === 'requested';
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
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-500">
                        <span className="inline-flex items-center gap-1"><CalendarDays size={13} /> {request.window || 'Date pending'}</span>
                        <span className="inline-flex items-center gap-1"><MapPin size={13} /> {request.region || request.location || 'Region pending'}</span>
                        <span className="inline-flex items-center gap-1 font-black text-slate-800"><UsersRound size={13} /> {request.groupSize || 0} Students</span>
                    </div>
                </div>
            </div>
            <div className="mt-3 flex gap-2">
                {isPending ? (
                    <>
                        <DecisionTextButton csrf={csrf} id={request.id} decision="approved" label="Approve" tone="approve" />
                        <DecisionTextButton csrf={csrf} id={request.id} decision="declined" label="Deny" tone="deny" />
                    </>
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

function AnalyticsForecastSection({ analytics = {}, schools = [] }) {
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
    const insights = analytics.insights || [];

    const exportReport = () => {
        const rows = [
            ['Metric', 'Value', 'Detail'],
            ...kpis.map((item) => [item.label, item.value, item.trend || '']),
            [],
            ['Funnel Step', 'Count', 'Rate'],
            ...funnel.map((item) => [item.label, item.value, `${item.rate}%`]),
            [],
            ['Opportunity', 'Score', 'Detail'],
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
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{analytics.modelConfidence || 0}% confidence</span>
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

                    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
                        <h2 className="text-lg font-black text-slate-950 md:text-xl">Rising Opportunities</h2>
                        <div className="mt-4 divide-y divide-slate-100">
                            {opportunities.length === 0 ? (
                                <EmptyState message="Opportunity ranking will appear after schools or visits are available." />
                            ) : opportunities.map((item) => (
                                <div key={`${item.name}-${item.score}`} className="grid gap-3 py-4 md:grid-cols-[1fr_160px_80px] md:items-center">
                                    <div>
                                        <p className="text-sm font-black text-slate-950">{item.name}</p>
                                        <p className="mt-1 text-xs text-slate-500">{item.meta}</p>
                                    </div>
                                    <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.min(100, Number(item.score || 0))}%` }} /></div>
                                    <p className="text-right text-sm font-black text-blue-700">{item.score}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <aside className="space-y-4 md:space-y-6">
                    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                            <Sparkles size={18} className="text-emerald-600" />
                            <h2 className="text-lg font-black text-slate-950">Predictive Insights</h2>
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
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                        <h2 className="text-lg font-black text-slate-950">Signal Strength</h2>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <MiniStat label="Confidence" value={`${analytics.modelConfidence || 0}%`} />
                            <MiniStat label="Variables" value={analytics.activeVariables || 0} />
                        </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                        <h2 className="text-lg font-black text-slate-950">Growth Hotspots</h2>
                        <div className="mt-4 space-y-3">
                            {(analytics.hotspots || []).length === 0 ? (
                                <p className="text-sm text-slate-500">Hotspots will appear when regional data exists.</p>
                            ) : (analytics.hotspots || []).map((hotspot) => (
                                <div key={hotspot.region} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                                    <span className="font-bold text-slate-700">{hotspot.region}</span>
                                    <span className="font-black text-emerald-600">+{hotspot.growth}</span>
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

    return endTime ? `${startTime} â€“ ${endTime}` : startTime;
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

function schoolProfileNameFromStudents(students = []) {
    const student = students.find((item) => item?.name);
    return student?.name || '';
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

function enrichDiscoverVisit(event, visitRequests = [], index = 0) {
    const capacity = Number(event.capacity || 0);
    const confirmedSeats = Number(event.confirmedSeats || 0);
    const seatsLeft = Math.max(0, capacity - confirmedSeats);
    const focus = eventFocus(event);
    const limitedThreshold = Math.max(5, Math.ceil(Math.max(1, capacity) * 0.15));
    const fillRate = capacity > 0 ? confirmedSeats / capacity : 0;
    const focusBoost = focus === 'Engineering & Tech' ? 12 : focus === 'Business' ? 7 : 4;
    const availabilityBoost = seatsLeft > limitedThreshold ? 8 : seatsLeft > 0 ? 4 : -6;
    const matchScore = Math.max(55, Math.min(98, Math.round(72 + focusBoost + availabilityBoost + ((index % 5) * 2) - (fillRate * 8))));
    const existingRequest = visitRequests.find((request) => Number(request.eventId) === Number(event.id));
    const statusLabel = existingRequest
        ? existingRequest.status
        : seatsLeft === 0
            ? 'Waitlist'
            : /virtual|zoom|online/i.test(`${event.venue || ''} ${event.location || ''}`)
                ? 'Virtual'
                : 'Verified';

    return {
        ...event,
        initials: (event.university || event.title || 'UV').split(' ').map((word) => word[0]).slice(0, 3).join('').toUpperCase(),
        university: event.university || 'University Partner',
        focus,
        region: discoverRegion(event.location || event.venue || ''),
        capacity,
        confirmedSeats,
        seatsLeft,
        limitedThreshold,
        matchScore,
        existingRequest,
        statusLabel,
        statusTone: existingRequest
            ? 'border-blue-200 bg-blue-50 text-blue-700'
            : seatsLeft === 0
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : /virtual|zoom|online/i.test(`${event.venue || ''} ${event.location || ''}`)
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-slate-100 text-slate-600',
        availabilityLabel: seatsLeft > 0
            ? `${seatsLeft}/${capacity || seatsLeft} seats open`
            : 'No seats left',
    };
}

function discoverRegion(location = '') {
    const normalized = location.toLowerCase();
    if (/lagos|abuja|accra|ghana|nigeria|kenya|africa/.test(normalized)) return 'Africa';
    if (/london|zurich|europe|paris|berlin|switzerland|uk|united kingdom/.test(normalized)) return 'Europe';
    if (/singapore|jakarta|bangkok|tokyo|asia/.test(normalized)) return 'Asia Pacific';
    if (/stanford|cambridge|boston|palo alto|pasadena|berkeley|usa|united states|ca|ma|ny/.test(normalized)) return 'North America';
    return 'Global';
}

function schoolUniversityCards(events, schools) {
    const inferRegion = (location = '') => {
        const normalized = location.toLowerCase();
        if (/ca|wa|or|stanford|berkeley|pasadena|seattle|los angeles|san diego/.test(normalized)) return 'west';
        if (/ma|ny|pa|ri|ct|nj|cambridge|boston|ithaca|providence/.test(normalized)) return 'northeast';
        if (/il|mi|oh|mn|wi|chicago|ann arbor/.test(normalized)) return 'midwest';
        return 'south';
    };
    const tagSets = [
        ['stem', 'high-yield', 'scholarships'],
        ['engineering', 'lab-tour', 'robotics'],
        ['business', 'leadership', 'internships'],
        ['arts', 'portfolio', 'creative'],
        ['health', 'pre-med', 'research'],
    ];
    const palette = [
        'bg-gradient-to-br from-amber-300 via-sky-500 to-slate-900',
        'bg-gradient-to-br from-emerald-200 via-green-600 to-slate-900',
        'bg-gradient-to-br from-blue-200 via-slate-500 to-slate-900',
        'bg-gradient-to-br from-lime-200 via-emerald-600 to-slate-900',
        'bg-gradient-to-br from-violet-300 via-indigo-600 to-slate-950',
        'bg-gradient-to-br from-rose-200 via-orange-500 to-slate-900',
    ];
    const eventUniversities = [...new Set(events.map((event) => event.university).filter(Boolean))].map((name, index) => {
        const event = events.find((item) => item.university === name) || {};
        const focus = eventFocus(event);
        const location = event.location || ['Stanford, CA', 'Cambridge, MA', 'Berkeley, CA', 'Ithaca, NY'][index % 4];
        return {
            name,
            location,
            region: inferRegion(location),
            type: index % 3 === 0 ? 'Private Research' : index % 3 === 1 ? 'Public Research' : 'Technical Institute',
            focus,
            match: [98, 94, 91, 88, 84, 79][index % 6],
            score: [85, 92, 78, 65, 74, 89][index % 6],
            upcomingVisits: Number(event.capacity || 24) > 60 ? 5 : (index % 5) + 1,
            tags: tagSets[index % tagSets.length],
            image: palette[index % palette.length],
        };
    });
    const fallback = [
        ['Stanford University', 'Stanford, CA', 'Private Research', 'Engineering', 98, 85, 6, ['stem', 'ai-lab', 'high-yield']],
        ['MIT', 'Cambridge, MA', 'Technical Institute', 'Engineering', 94, 92, 5, ['robotics', 'lab-tour', 'research']],
        ['UC Berkeley', 'Berkeley, CA', 'Public Research', 'Business', 88, 78, 4, ['business', 'public-policy', 'startups']],
        ['Cornell University', 'Ithaca, NY', 'Private Research', 'Liberal Arts', 85, 65, 3, ['arts', 'architecture', 'portfolio']],
        ['Georgia Tech', 'Atlanta, GA', 'Public Research', 'Engineering', 91, 88, 5, ['engineering', 'co-op', 'stem']],
        ['Carnegie Mellon', 'Pittsburgh, PA', 'Private Research', 'Engineering', 90, 90, 4, ['computer-science', 'ai', 'research']],
        ['UCLA', 'Los Angeles, CA', 'Public Research', 'Health Sciences', 86, 81, 4, ['health', 'pre-med', 'urban-campus']],
        ['Northwestern University', 'Evanston, IL', 'Private Research', 'Business', 82, 79, 2, ['business', 'media', 'leadership']],
        ['University of Washington', 'Seattle, WA', 'Public Research', 'Engineering', 89, 84, 5, ['cloud', 'engineering', 'west-coast']],
        ['Rice University', 'Houston, TX', 'Private Research', 'Health Sciences', 80, 76, 2, ['pre-med', 'research', 'small-cohort']],
        ['Brown University', 'Providence, RI', 'Private Research', 'Liberal Arts', 78, 72, 2, ['open-curriculum', 'arts', 'northeast']],
        ['University of Michigan', 'Ann Arbor, MI', 'Public Research', 'Business', 84, 83, 3, ['business', 'engineering', 'midwest']],
        ['Caltech', 'Pasadena, CA', 'Technical Institute', 'Engineering', 92, 87, 3, ['physics', 'robotics', 'research']],
        ['Duke University', 'Durham, NC', 'Private Research', 'Health Sciences', 83, 80, 2, ['health', 'leadership', 'south']],
        ['NYU', 'New York, NY', 'Private Research', 'Liberal Arts', 79, 74, 4, ['arts', 'business', 'urban-campus']],
        ['University of Chicago', 'Chicago, IL', 'Private Research', 'Business', 77, 71, 2, ['economics', 'research', 'midwest']],
    ].map(([name, location, type, focus, match, score, upcomingVisits, tags], index) => ({
        name,
        location,
        region: inferRegion(location),
        type,
        focus,
        match,
        score,
        upcomingVisits,
        tags,
        image: palette[index % palette.length],
    }));

    const merged = [...eventUniversities, ...fallback.filter((fallbackCard) => !eventUniversities.some((card) => card.name === fallbackCard.name))];

    return merged;
}

function schoolStudentRows(events = []) {
    const eventTitles = events
        .map((event) => event.title)
        .filter(Boolean)
        .slice(0, 6);
    const fallbackEvents = ['MIT Tech Tour', 'Stanford Virtual', 'Johns Hopkins Q&A', 'Berkeley Info Session', 'CalTech Robotics'];
    const titles = eventTitles.length ? eventTitles : fallbackEvents;
    const base = [
        ['Sarah Jenkins', 'ID: ST-8492', '12th', 'Computer Science', [titles[0] || fallbackEvents[0], titles[1] || fallbackEvents[1]]],
        ['Marcus Chen', 'ID: ST-8821', '11th', 'Business Admin', []],
        ['Elena Rodriguez', 'ID: ST-8752', '12th', 'Pre-Med', [titles[2] || fallbackEvents[2]]],
        ['Ava Thompson', 'ID: ST-8840', '12th', 'Engineering', [titles[3] || fallbackEvents[3]]],
        ['Noah Williams', 'ID: ST-8915', '10th', 'Computer Science', []],
        ['Maya Patel', 'ID: ST-9022', '11th', 'Pre-Med', [titles[4] || fallbackEvents[4]]],
        ['Daniel Okafor', 'ID: ST-9147', '12th', 'Business Admin', [titles[1] || fallbackEvents[1]]],
        ['Grace Kim', 'ID: ST-9203', '11th', 'Engineering', [titles[0] || fallbackEvents[0]]],
        ['Omar Hassan', 'ID: ST-9310', '10th', 'Liberal Arts', []],
        ['Lily Morgan', 'ID: ST-9444', '12th', 'Computer Science', [titles[3] || fallbackEvents[3], titles[4] || fallbackEvents[4]]],
    ];

    return base.map(([name, id, grade, interest, assignedEvents]) => ({
        name,
        id: id.replace('ID: ', ''),
        grade,
        interest,
        assignedEvents,
        initials: name.split(' ').map((part) => part[0]).slice(0, 2).join(''),
    }));
}

function normalizeSchoolStudents(students = [], events = []) {
    if (students.length) {
        return students.map((student) => ({
            id: student.id,
            name: student.name,
            email: student.email || '',
            studentIdentifier: student.studentIdentifier || `ST-${student.id}`,
            grade: student.grade || '12th',
            interest: student.interest || 'Undecided',
            assignedEvents: student.assignedEvents || [],
            initials: (student.name || 'Student').split(' ').map((part) => part[0]).slice(0, 2).join(''),
        }));
    }

    return schoolStudentRows(events).map((student, index) => ({
        ...student,
        email: `student${index + 1}@example.test`,
        studentIdentifier: student.id,
        id: `demo-${index + 1}`,
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
            { id: 'overview', title: 'Dashboard', icon: LayoutDashboard },
            { id: 'my-visits', title: 'My Visits', icon: FolderKanban },
            { id: 'explore-visits', title: 'Explore Visits', icon: Search },
            { id: 'messages', title: 'Messages', icon: Inbox },
        ],
        admin: [
            { id: 'overview', title: 'Platform Overview', icon: LayoutDashboard },
            { id: 'universities', title: 'Institutions', icon: GraduationCap },
            { id: 'schools', title: 'Schools', icon: School },
            { id: 'events', title: 'Visit Activity', icon: CalendarDays },
            { id: 'users-access', title: 'Users & Access', icon: ShieldCheck },
            { id: 'analytics', title: 'Analytics', icon: Activity },
            { id: 'system-health', title: 'System Health', icon: Terminal },
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
    const { csrf, roadmap, events, registrations, users, schools, students, visitRequests, itineraryItems, archives, tasks, analytics, messages, schoolProfile, securityProfile, universityOverview, systemHealth, platformSettings, errors, old, setActiveId } = context;
    const baseMetrics = metrics.map((metric) => ({ ...metric, trend: metric.trend || 'Ready for live data' }));

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
            custom: <UniversityVisitsSection csrf={csrf} events={events || []} registrations={registrations || []} errors={errors || {}} old={old || {}} />,
        };
    }

    if (role === 'university' && activeId === 'visit-requests') {
        return { title: 'Visit Requests', subtitle: 'Review and respond to requests submitted by partner schools.', action: 'Review requests', metrics: baseMetrics, custom: <UniversityVisitRequestsSection csrf={csrf} visitRequests={visitRequests || []} schools={schools || []} /> };
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
            custom: <EventCalendarSection csrf={csrf} events={events || []} registrations={registrations || []} title="University Calendar" />,
        };
    }

    if (role === 'university' && activeId === 'insights') {
        return {
            title: 'Recruitment insights',
            subtitle: 'Review engagement forecasts and opportunity signals.',
            action: 'Refresh insights',
            metrics: baseMetrics,
            custom: <AnalyticsForecastSection analytics={analytics || {}} schools={schools || []} />,
        };
    }

    if (role === 'university' && activeId === 'messages') {
        return { title: 'Communications', subtitle: 'Send and review campus-visit communications.', action: 'New message', metrics: baseMetrics, custom: <MessageCenterSection csrf={csrf} registrations={registrations || []} messages={messages || []} role="university" /> };
    }

    if (role === 'university' && activeId === 'settings') {
        return {
            title: 'Settings',
            subtitle: 'Manage institution access, authentication, and account protection.',
            action: 'Save changes',
            metrics: baseMetrics,
            custom: <SecurityAccessSection csrf={csrf} profile={securityProfile || {}} errors={errors || {}} role={role} />,
        };
    }

    if (['school', 'high_school'].includes(role) && activeId === 'overview') {
        return { title: 'Coordinator Overview', subtitle: 'Monitor campus visits and student engagement metrics.', action: 'New request', metrics: baseMetrics, custom: <SchoolCoordinatorOverviewSection events={events || []} registrations={registrations || []} schools={schools || []} students={students || []} visitRequests={visitRequests || []} analytics={analytics || {}} messages={messages || []} setSection={setActiveId || (() => {})} /> };
    }

    if (['school', 'high_school'].includes(role) && activeId === 'students') {
        return { title: 'My Students', subtitle: 'Manage and assign students to upcoming university visits.', action: 'Add student', metrics: baseMetrics, custom: <SchoolStudentsSection csrf={csrf} events={events || []} students={students || []} errors={errors || {}} /> };
    }

    if (['school', 'high_school'].includes(role) && activeId === 'explore-universities') {
        return { title: 'Explore Universities', subtitle: 'Discover available university opportunities and suitable visit partners.', action: 'Explore', metrics: baseMetrics, custom: <SchoolExploreUniversitiesSection events={events || []} schools={schools || []} setSection={setActiveId || (() => {})} /> };
    }

    if (['school', 'high_school'].includes(role) && activeId === 'events') {
        return { title: 'Discover Visits', subtitle: 'Find and request upcoming university visit programs for your students.', action: 'Request visit', metrics: baseMetrics, custom: <SchoolAvailableVisitsSection csrf={csrf} events={(events || []).filter((event) => event.status === 'published')} visitRequests={visitRequests || []} old={old || {}} errors={errors || {}} setSection={setActiveId || (() => {})} /> };
    }

    if (['school', 'high_school'].includes(role) && activeId === 'bookings') {
        return { title: 'My Requests', subtitle: 'Track pending, approved, and completed visit requests.', action: 'New visit request', metrics: baseMetrics, custom: <SchoolBookingsSection csrf={csrf} visitRequests={visitRequests || []} registrations={registrations || []} events={events || []} setSection={setActiveId || (() => {})} /> };
    }

    if (['school', 'high_school'].includes(role) && activeId === 'itinerary') {
        return { title: 'Itinerary', subtitle: 'Build, arrange, and manage a flexible route from live visit destinations.', action: 'Optimize route', metrics: baseMetrics, custom: <SchoolItinerarySection csrf={csrf} visitRequests={visitRequests || []} registrations={registrations || []} events={events || []} students={students || []} itineraryItems={itineraryItems || []} setSection={setActiveId || (() => {})} /> };
    }

    if (['school', 'high_school'].includes(role) && activeId === 'calendar') {
        return { title: 'My Schedule', subtitle: 'View upcoming visits and student attendance dates.', action: 'Discover visits', metrics: baseMetrics, custom: <EventCalendarSection csrf={csrf} events={(events || []).filter((event) => event.status === 'published')} registrations={registrations || []} title="School Schedule" /> };
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
        return { title: 'Messages', subtitle: 'Review school request updates and communications.', action: 'New message', metrics: baseMetrics, custom: <MessageCenterSection csrf={csrf} registrations={registrations || []} messages={messages || []} role="school" /> };
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
        return { title: 'My Visits', subtitle: 'Track your upcoming campus visits and current booking status.', action: 'Explore visits', metrics: baseMetrics, custom: <RegistrationTable registrations={registrations || []} /> };
    }

    if (role === 'student' && activeId === 'explore-visits') {
        return { title: 'Explore Visits', subtitle: 'Browse published campus visits and register in one click.', action: 'Register', metrics: baseMetrics, custom: <EventCards csrf={csrf} events={(events || []).filter((event) => event.status === 'published')} role={role} old={old || {}} errors={errors || {}} /> };
    }

    if (role === 'student' && activeId === 'messages') {
        return { title: 'Messages', subtitle: 'Read confirmations, reminders, and visit updates.', action: 'Refresh', metrics: baseMetrics, custom: <MessageCenterSection csrf={csrf} registrations={registrations || []} messages={messages || []} role="student" /> };
    }

    if (role === 'admin' && activeId === 'universities') {
        return { title: 'Institutions', subtitle: 'Manage university accounts, verification state, and visit-program activity.', action: 'New institution', metrics: baseMetrics, custom: <AdminUniversitiesSection csrf={csrf} users={users || []} events={events || []} registrations={registrations || []} errors={errors || {}} /> };
    }

    if (role === 'admin' && activeId === 'schools') {
        return { title: 'Schools Directory', subtitle: 'Manage school records, verification status, coordinators, and engagement activity.', action: 'New school', metrics: baseMetrics, custom: <AdminSchoolsSection csrf={csrf} schools={schools || []} visitRequests={visitRequests || []} archives={archives || []} errors={errors || {}} /> };
    }

    if (role === 'admin' && activeId === 'events') {
        return { title: 'Visit Activity', subtitle: 'Monitor visit programs, requests, logistics warnings, and archived visit operations.', action: 'Review activity', metrics: baseMetrics, custom: <AdminVisitActivitySection csrf={csrf} events={events || []} visitRequests={visitRequests || []} registrations={registrations || []} archives={archives || []} /> };
    }

    if (role === 'admin' && activeId === 'users-access') {
        return { title: 'Users & Access', subtitle: 'Manage platform users, portal roles, security posture, and access status.', action: 'Create user', metrics: baseMetrics, custom: <AdminUsersAccessSection csrf={csrf} users={users || []} errors={errors || {}} /> };
    }

    if (role === 'admin' && activeId === 'analytics') {
        return { title: 'Analytics', subtitle: 'Track platform-wide conversion, engagement, communication, and demand signals.', action: 'Export report', metrics: baseMetrics, custom: <AdminAnalyticsSection analytics={analytics || {}} users={users || []} events={events || []} registrations={registrations || []} schools={schools || []} visitRequests={visitRequests || []} messages={messages || []} /> };
    }

    if (role === 'admin' && activeId === 'system-health') {
        return { title: 'System Health', subtitle: 'Monitor server, database, queues, mail, storage, logs, and audit activity.', action: 'Force sync', metrics: baseMetrics, custom: <AdminSystemHealthSection health={systemHealth || {}} /> };
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
            templates: ['Message templates', 'Prepare confirmation, reminder, and cancellation templates.', 'Create template', ['Template', 'Channel', 'Status'], [['Registration confirmation', 'Email', 'Draft'], ['24h reminder', 'Email/SMS', 'Draft']], 'No templates yet.'],
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
        if (!mountRef.current) {
            return undefined;
        }

        const scene = new Scene();
        const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000, 0);
        mountRef.current.appendChild(renderer.domElement);

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

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationId);
            renderer.dispose();
            tubeGeometry.dispose();
            glowGeometry.dispose();
            material.dispose();
            glowMaterial.dispose();
            if (mountRef.current?.contains(renderer.domElement)) {
                mountRef.current.removeChild(renderer.domElement);
            }
        };
    }, []);

    return <div ref={mountRef} className="pointer-events-none fixed inset-0 z-0 opacity-20" />;
}

createRoot(document.getElementById('app')).render(<AppErrorBoundary><App /></AppErrorBoundary>);



