import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import {
    Activity,
    AlertCircle,
    BarChart3,
    Bell,
    CalendarDays,
    CheckCircle2,
    ChevronRight,
    Edit,
    Loader2,
    LogOut,
    Plus,
    RefreshCcw,
    School,
    Sparkles,
    Trash2,
    UserCog,
    Users,
} from 'lucide-react';
import '../css/app.css';

const api = axios.create({
    baseURL: '/api',
    headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
    },
});

const AuthContext = createContext(null);
const ToastContext = createContext(null);
const NotificationContext = createContext(null);

function useAuth() {
    return useContext(AuthContext);
}

function useToast() {
    return useContext(ToastContext);
}

function useNotifications() {
    return useContext(NotificationContext);
}

function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem('campus_api_token'));
    const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('campus_api_user') || 'null'));
    const [mfaChallenge, setMfaChallenge] = useState(null);

    useEffect(() => {
        api.defaults.headers.common.Authorization = token ? `Bearer ${token}` : '';
    }, [token]);

    useEffect(() => {
        const interceptor = api.interceptors.response.use(
            (response) => {
                if (['post', 'put', 'patch', 'delete'].includes(response.config?.method || '')) {
                    window.dispatchEvent(new CustomEvent('campus:api-mutated', {
                        detail: {
                            method: response.config.method,
                            url: response.config.url,
                        },
                    }));
                }

                return response;
            },
            (error) => {
                if (error?.response?.status === 401) {
                    localStorage.removeItem('campus_api_token');
                    localStorage.removeItem('campus_api_user');
                    setToken(null);
                    setUser(null);
                }

                return Promise.reject(error);
            }
        );

        return () => api.interceptors.response.eject(interceptor);
    }, []);

    const login = async (email, password) => {
        const { data } = await api.post('/login', { email, password });
        if (data.mfa_required) {
            setMfaChallenge(data);
            return data;
        }

        finishLogin(data);
        return data;
    };

    const finishLogin = (data) => {
        localStorage.setItem('campus_api_token', data.token);
        localStorage.setItem('campus_api_user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        setMfaChallenge(null);
        window.location.hash = hashForView(data.user.role, defaultView(data.user.role));
    };

    const verifyMfa = async (code) => {
        const { data } = await api.post('/mfa/verify', {
            challenge_token: mfaChallenge?.challenge_token,
            code,
        });
        finishLogin(data);
    };

    const resendMfa = async () => {
        const { data } = await api.post('/mfa/resend', {
            challenge_token: mfaChallenge?.challenge_token,
        });
        setMfaChallenge(data);
    };

    const logout = async () => {
        try {
            if (token) {
                await api.post('/logout');
            }
        } finally {
            localStorage.removeItem('campus_api_token');
            localStorage.removeItem('campus_api_user');
            setToken(null);
            setUser(null);
            setMfaChallenge(null);
        }
    };

    return <AuthContext.Provider value={{ token, user, login, logout, mfaChallenge, verifyMfa, resendMfa, cancelMfa: () => setMfaChallenge(null) }}>{children}</AuthContext.Provider>;
}

function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const push = (message, type = 'success') => {
        const id = crypto.randomUUID();
        setToasts((items) => [...items, { id, message, type }]);
        setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3500);
    };

    return (
        <ToastContext.Provider value={{ push }}>
            {children}
            <div className="fixed right-4 top-4 z-50 grid gap-2">
                {toasts.map((toast) => (
                    <div key={toast.id} className={`rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg ${toast.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                        {toast.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

function NotificationProvider({ children }) {
    const { user } = useAuth();
    const toast = useToast();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const refresh = async ({ announce = false } = {}) => {
        if (! user) {
            setMessages([]);
            return;
        }

        setLoading(true);
        setError('');

        try {
            const { data } = await api.get('/messages');
            const nextMessages = records(data);
            const seenKey = `campus_seen_messages_${user.id}`;
            const seenIds = JSON.parse(localStorage.getItem(seenKey) || '[]');
            const newMessages = nextMessages.filter((message) => !seenIds.includes(message.id));

            if (announce && seenIds.length > 0 && newMessages.length > 0) {
                toast.push(`${newMessages.length} new notification${newMessages.length === 1 ? '' : 's'}.`);
            }

            localStorage.setItem(seenKey, JSON.stringify(nextMessages.map((message) => message.id)));
            setMessages(nextMessages);
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (! user) {
            setMessages([]);
            return undefined;
        }

        refresh();
        const interval = setInterval(() => refresh({ announce: true }), 30000);
        const listener = () => refresh({ announce: true });
        window.addEventListener('campus:api-mutated', listener);

        return () => {
            clearInterval(interval);
            window.removeEventListener('campus:api-mutated', listener);
        };
    }, [user?.id]);

    return (
        <NotificationContext.Provider value={{ messages, loading, error, refresh, count: messages.length }}>
            {children}
        </NotificationContext.Provider>
    );
}

function useApi(path, options = {}) {
    const [data, setData] = useState(options.initial ?? null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [version, setVersion] = useState(0);

    useEffect(() => {
        if (options.enabled === false) {
            setLoading(false);
            return undefined;
        }

        let active = true;
        setLoading(true);
        setError('');

        api.get(path)
            .then(({ data: response }) => {
                if (active) {
                    setData(response);
                }
            })
            .catch((err) => {
                if (active) {
                    setError(errorMessage(err));
                }
            })
            .finally(() => active && setLoading(false));

        return () => {
            active = false;
        };
    }, [path, version, options.enabled]);

    useEffect(() => {
        if (! options.refreshOnMutation) {
            return undefined;
        }

        const listener = () => setVersion((value) => value + 1);
        window.addEventListener('campus:api-mutated', listener);

        return () => window.removeEventListener('campus:api-mutated', listener);
    }, [options.refreshOnMutation]);

    return { data, loading, error, refresh: () => setVersion((value) => value + 1), setData };
}

function App() {
    return (
        <AuthProvider>
            <ToastProvider>
                <NotificationProvider>
                    <PlatformApp />
                </NotificationProvider>
            </ToastProvider>
        </AuthProvider>
    );
}

function PlatformApp() {
    const { user } = useAuth();

    if (!user) {
        return <LoginScreen />;
    }

    return <DashboardShell />;
}

function LoginScreen() {
    const { login, mfaChallenge, verifyMfa, resendMfa, cancelMfa } = useAuth();
    const toast = useToast();
    const [email, setEmail] = useState('university@scalecampuslab.test');
    const [password, setPassword] = useState('password');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const submit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (mfaChallenge) {
                await verifyMfa(code);
                toast.push('Signed in successfully.');
            } else {
                const result = await login(email, password);
                if (!result?.mfa_required) toast.push('Signed in successfully.');
            }
        } catch (err) {
            const message = errorMessage(err);
            setError(message);
            toast.push(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const resend = async () => {
        setLoading(true);
        setError('');
        try {
            await resendMfa();
            setCode('');
            toast.push('A new sign-in code has been sent.');
        } catch (err) {
            const message = errorMessage(err);
            setError(message);
            toast.push(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const demos = [
        ['University', 'university@scalecampuslab.test'],
        ['School', 'school@scalecampuslab.test'],
        ['Student', 'student@scalecampuslab.test'],
        ['Admin', 'admin@scalecampuslab.test'],
    ];

    return (
        <main className="grid min-h-screen place-items-center bg-[#f7f5f7] px-4">
            <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-gray-950 text-white">
                        <School size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-gray-950">Campus Visit Platform</h1>
                        <p className="text-sm text-gray-500">API-powered role workspace</p>
                    </div>
                </div>
                <form onSubmit={submit} className="mt-6 space-y-4">
                    {mfaChallenge ? (
                        <>
                            <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Enter the six-digit code sent to {mfaChallenge.masked_email}.</p>
                            <TextInput label="Verification code" value={code} onChange={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))} type="text" />
                        </>
                    ) : (
                        <>
                            <TextInput label="Email" value={email} onChange={setEmail} type="email" />
                            <TextInput label="Password" value={password} onChange={setPassword} type="password" />
                        </>
                    )}
                    {error && <ErrorBanner message={error} />}
                    <button disabled={loading || (mfaChallenge && code.length !== 6)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
                        {loading && <Loader2 className="animate-spin" size={16} />}
                        {mfaChallenge ? 'Verify and sign in' : 'Sign in'}
                    </button>
                </form>
                {mfaChallenge && <div className="mt-3 flex items-center justify-between text-sm font-semibold"><button type="button" disabled={loading} onClick={resend} className="text-emerald-700 disabled:opacity-50">Send a new code</button><button type="button" onClick={() => { cancelMfa(); setCode(''); setError(''); }} className="text-gray-500">Cancel</button></div>}
                {!mfaChallenge && <div className="mt-5 rounded-xl bg-gray-50 p-4 text-sm">
                    <p className="font-semibold text-gray-950">Demo accounts</p>
                    <div className="mt-2 grid gap-2">
                        {demos.map(([label, demoEmail]) => (
                            <button key={demoEmail} type="button" onClick={() => setEmail(demoEmail)} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-gray-600 hover:border-gray-300">
                                <span>{label}</span>
                                <span className="text-xs">{demoEmail}</span>
                            </button>
                        ))}
                    </div>
                </div>}
            </section>
        </main>
    );
}

function DashboardShell() {
    const { user, logout } = useAuth();
    const [view, setView] = useState(() => viewFromHash(user.role));
    const nav = navFor(user.role);
    const sidebarSubtitle = user.role === 'university' ? 'University Recruitment OS' : `${roleLabel(user.role)} workspace`;

    useEffect(() => {
        const syncFromHash = () => setView(viewFromHash(user.role));
        syncFromHash();
        window.addEventListener('hashchange', syncFromHash);

        return () => window.removeEventListener('hashchange', syncFromHash);
    }, [user.role]);

    const selectView = (nextView) => {
        setView(nextView);
        window.location.hash = hashForView(user.role, nextView);
    };

    return (
        <main className="min-h-screen bg-[#f7f5f7] text-gray-950">
            <aside className="fixed inset-y-0 left-0 hidden w-72 bg-black p-4 text-white lg:block">
                <div className="flex items-center gap-3 px-2 py-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-gray-950">
                        <School size={21} />
                    </div>
                    <div>
                        <p className="font-semibold">CampusConnect</p>
                        <p className="text-xs leading-4 text-white/70">{sidebarSubtitle}</p>
                    </div>
                </div>
                <nav className="mt-8 space-y-1">
                    {nav.map((item) => (
                        <button key={item.id} onClick={() => selectView(item.id)} className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-semibold ${view === item.id ? 'bg-[#42a5ff] text-black' : 'text-white hover:bg-white/10'}`}>
                            <item.icon size={18} />
                            {item.label}
                        </button>
                    ))}
                </nav>
                <button onClick={logout} className="absolute bottom-5 left-4 right-4 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-white/60 hover:bg-white/10 hover:text-white">
                    <LogOut size={18} />
                    Log out
                </button>
            </aside>
            <section className="lg:pl-72">
                <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white/95 px-4 backdrop-blur lg:px-8">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{roleLabel(user.role)}</p>
                        <h1 className="truncate text-lg font-semibold">{nav.find((item) => item.id === view)?.label || 'Dashboard'}</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <NotificationBell />
                        <button onClick={logout} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 lg:hidden">Logout</button>
                    </div>
                </header>
                <div className="border-b border-gray-200 bg-white p-3 lg:hidden">
                    <div className="flex gap-2 overflow-x-auto">
                        {nav.map((item) => (
                            <button key={item.id} onClick={() => selectView(item.id)} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold ${view === item.id ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="p-4 lg:p-8">
                    <RoleView view={view} setView={selectView} />
                </div>
            </section>
        </main>
    );
}

function RoleView({ view, setView }) {
    const { user } = useAuth();

    if (user.role === 'university') {
        return <UniversityDashboard view={view} setView={setView} />;
    }

    if (user.role === 'school' || user.role === 'high_school') {
        return <SchoolDashboard view={view} />;
    }

    if (user.role === 'student') {
        return <StudentDashboard view={view} />;
    }

    return <AdminDashboard view={view} />;
}

function UniversityDashboard({ view, setView }) {
    const events = useApi('/events', { refreshOnMutation: true });
    const reports = useApi('/reports', { initial: {}, refreshOnMutation: true });
    const applications = useApi('/applications', { refreshOnMutation: true });
    const registrationTotal = totalReportCount(reports.data?.registrations_per_event);
    const attendanceRows = records(reports.data?.attendance_tracking);
    const attended = attendanceRows.reduce((sum, row) => sum + Number(row.attended_count || 0), 0);
    const attendanceTotal = attendanceRows.reduce((sum, row) => sum + Number(row.total || 0), 0);
    const attendanceRate = attendanceTotal ? `${Math.round((attended / attendanceTotal) * 100)}%` : '0%';
    const conversionRows = records(reports.data?.conversion_to_applications);
    const accepted = conversionRows.filter((row) => row.status === 'accepted').reduce((sum, row) => sum + Number(row.total || 0), 0);
    const conversionTotal = conversionRows.reduce((sum, row) => sum + Number(row.total || 0), 0);
    const conversionRate = conversionTotal ? `${Math.round((accepted / conversionTotal) * 100)}%` : '0%';

    if (view === 'visits') {
        return <EventManagement eventsState={events} />;
    }

    if (view === 'discovery') {
        return <UniversityDiscovery />;
    }

    if (view === 'itinerary') {
        return <UniversityItinerary events={records(events.data)} />;
    }

    return (
        <DashboardHome
            title="University dashboard"
            subtitle="Manage events, registrations, waitlists, attendance, applications, and recruitment intelligence."
            loading={events.loading || reports.loading || applications.loading}
            metrics={[
                ['Total events', records(events.data).length],
                ['Total registrations', registrationTotal],
                ['Attendance rate', attendanceRate],
                ['Applications conversion', conversionRate],
            ]}
        >
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <EventList events={records(events.data).slice(0, 5)} onSelect={() => setView('visits')} />
                <ReportsPanel reportsState={reports} compact />
            </div>
        </DashboardHome>
    );
}

function SchoolDashboard({ view }) {
    const events = useApi('/events', { refreshOnMutation: true });
    const students = useApi('/students', { refreshOnMutation: true });
    const bookings = useApi('/registrations', { refreshOnMutation: true });
    const bookingRows = records(bookings.data);
    const upcomingBookings = bookingRows.filter((booking) => booking.event?.event_date && new Date(booking.event.event_date) >= new Date());
    const recentActivity = bookingRows.slice(0, 4);

    if (view === 'students') {
        return <StudentManagement studentsState={students} />;
    }

    if (view === 'events') {
        return <AvailableEvents eventsState={events} groupMode />;
    }

    if (view === 'bookings') {
        return <BookingHistory title="School bookings" />;
    }

    if (view === 'calendar') {
        return <CalendarView source="bookings" />;
    }

    return (
        <DashboardHome
            title="School dashboard"
            subtitle="Manage students, book published university visits, and track upcoming school participation."
            loading={events.loading || students.loading || bookings.loading}
            metrics={[
                ['Upcoming visits', upcomingBookings.length],
                ['Students registered', new Set(bookingRows.map((booking) => booking.student_id)).size],
                ['Confirmed bookings', bookingRows.filter((booking) => booking.status === 'confirmed').length],
                ['Waitlisted', bookingRows.filter((booking) => booking.status === 'waitlisted').length],
            ]}
        >
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <AvailableEvents eventsState={events} groupMode compact />
                <Panel title="Recent activity">
                    {recentActivity.length ? (
                        <div className="space-y-3">
                            {recentActivity.map((booking) => (
                                <div key={booking.id} className="rounded-xl border border-gray-200 p-3">
                                    <p className="font-semibold text-gray-950">{booking.student?.name || `Student #${booking.student_id}`}</p>
                                    <p className="mt-1 text-sm text-gray-500">{booking.event?.title || 'Event'} · {formatDate(booking.created_at)}</p>
                                    <StatusPill status={booking.status} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState message="No school booking activity yet." />
                    )}
                </Panel>
            </div>
        </DashboardHome>
    );
}

function StudentDashboard({ view }) {
    const events = useApi('/events', { refreshOnMutation: true });
    const bookings = useApi('/registrations', { refreshOnMutation: true });
    const notifications = useNotifications();
    const bookingRows = records(bookings.data);
    const upcomingBookings = bookingRows
        .filter((booking) => booking.event?.event_date && new Date(booking.event.event_date) >= new Date() && booking.status !== 'cancelled')
        .slice(0, 5);

    if (view === 'events') {
        return <AvailableEvents eventsState={events} />;
    }

    if (view === 'calendar') {
        return <CalendarView source="bookings" />;
    }

    if (view === 'bookings') {
        return <BookingHistory title="My bookings" />;
    }

    if (view === 'notifications') {
        return <NotificationsPanel />;
    }

    return (
        <DashboardHome
            title="Student dashboard"
            subtitle="Browse visits, register, track status, and review your calendar."
            loading={events.loading || bookings.loading || notifications.loading}
            metrics={[
                ['Upcoming visits', upcomingBookings.length],
                ['Confirmed', bookingRows.filter((booking) => booking.status === 'confirmed').length],
                ['Waitlisted', bookingRows.filter((booking) => booking.status === 'waitlisted').length],
                ['Notifications', notifications.count],
            ]}
        >
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <Panel title="Upcoming registered visits">
                    {upcomingBookings.length ? (
                        <div className="space-y-3">
                            {upcomingBookings.map((booking) => (
                                <article key={booking.id} className="rounded-xl border border-gray-200 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-gray-950">{booking.event?.title || 'Campus visit'}</p>
                                            <p className="mt-1 text-sm text-gray-500">{formatDate(booking.event?.event_date)} · {booking.event?.location || 'TBA'}</p>
                                        </div>
                                        <StatusPill status={booking.status} />
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <EmptyState message="No upcoming registered visits yet." />
                    )}
                </Panel>
                <AvailableEvents eventsState={events} compact />
            </div>
        </DashboardHome>
    );
}

function AdminDashboard({ view }) {
    const analytics = useApi('/admin/analytics', { initial: {}, refreshOnMutation: true });
    const users = useApi('/admin/users', { refreshOnMutation: true });
    const universities = useApi('/admin/universities', { refreshOnMutation: true });
    const schools = useApi('/admin/schools/summary', { refreshOnMutation: true });
    const events = useApi('/admin/events', { refreshOnMutation: true });
    const logs = useApi('/admin/logs', { refreshOnMutation: true });

    if (view === 'users') {
        return <UserManagement usersState={users} />;
    }

    if (view === 'universities') {
        return <AccountDirectory title="Universities" usersState={universities} role="university" />;
    }

    if (view === 'schools') {
        return <AdminSchools schoolsState={schools} />;
    }

    if (view === 'events') {
        return <AdminEventList eventsState={events} />;
    }

    if (view === 'reports') {
        return <AdminReports analyticsState={analytics} />;
    }

    if (view === 'logs') {
        return <SystemLogs logsState={logs} />;
    }

    return (
        <DashboardHome
            title="Admin dashboard"
            subtitle="Manage users, platform events, and operational analytics."
            loading={analytics.loading}
            metrics={[
                ['Users', analytics.data?.users || 0],
                ['Events', analytics.data?.events || 0],
                ['Registrations', analytics.data?.registrations || 0],
                ['Universities', analytics.data?.universities || 0],
            ]}
        >
            <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                <UserManagement usersState={users} compact />
                <AdminEventList eventsState={{ ...events, data: { data: records(events.data).slice(0, 6) } }} compact />
            </div>
        </DashboardHome>
    );
}

function EventManagement({ eventsState }) {
    const [editing, setEditing] = useState(null);
    const toast = useToast();

    return (
        <div className="grid gap-6">
            {editing && (
                <EventForm event={editing} onSaved={() => { setEditing(null); eventsState.refresh(); }} />
            )}
            <Panel title="Event listing" action={<RefreshButton onClick={eventsState.refresh} />}>
                <AsyncState state={eventsState}>
                    <div className="space-y-3">
                        {records(eventsState.data).map((event) => (
                            <article key={event.id} className="rounded-xl border border-gray-200 bg-white p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h3 className="font-semibold text-gray-950">{event.title}</h3>
                                        <p className="mt-1 text-sm text-gray-500">{formatDate(event.event_date)} · {event.location}</p>
                                        <StatusPill status={event.status} />
                                    </div>
                                    <div className="flex flex-wrap justify-end gap-2">
                                        <IconButton label="Edit" icon={Edit} onClick={() => setEditing(event)} />
                                        <EventStatusButton event={event} onDone={eventsState.refresh} />
                                        <IconButton label="Delete" icon={Trash2} danger onClick={async () => {
                                            try {
                                                await api.delete(`/events/${event.id}`);
                                                toast.push('Event deleted.');
                                                eventsState.refresh();
                                            } catch (error) {
                                                toast.push(errorMessage(error), 'error');
                                            }
                                        }} />
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </AsyncState>
            </Panel>
        </div>
    );
}

function EventForm({ event, onSaved }) {
    const toast = useToast();
    const [form, setForm] = useState(emptyEvent());
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setForm(event ? {
            title: event.title || '',
            description: event.description || '',
            location: event.location || '',
            event_date: toInputDate(event.event_date),
            capacity: event.capacity || 50,
            status: event.status || 'draft',
        } : emptyEvent());
    }, [event]);

    const submit = async (submitEvent) => {
        submitEvent.preventDefault();
        setSaving(true);
        setError('');

        try {
            if (event) {
                await api.put(`/events/${event.id}`, form);
            } else {
                await api.post('/events', form);
            }
            onSaved();
            setForm(emptyEvent());
            toast.push(event ? 'Event updated.' : 'Event created.');
        } catch (err) {
            const message = errorMessage(err);
            setError(message);
            toast.push(message, 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Panel title={event ? 'Edit event' : 'Create event'}>
            <form onSubmit={submit} className="space-y-4">
                <TextInput label="Title" value={form.title} onChange={(value) => setForm({ ...form, title: value })} />
                <TextInput label="Location" value={form.location} onChange={(value) => setForm({ ...form, location: value })} />
                <TextInput label="Date and time" type="datetime-local" value={form.event_date} onChange={(value) => setForm({ ...form, event_date: value })} />
                <TextInput label="Capacity" type="number" value={form.capacity} onChange={(value) => setForm({ ...form, capacity: Number(value) })} />
                <label className="block text-sm font-semibold text-gray-700">
                    Status
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 outline-none focus:border-gray-400">
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </label>
                <label className="block text-sm font-semibold text-gray-700">
                    Description
                    <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows="4" className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-gray-400" />
                </label>
                {error && <ErrorBanner message={error} />}
                <button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
                    {saving && <Loader2 className="animate-spin" size={16} />}
                    {event ? 'Save changes' : 'Create event'}
                </button>
            </form>
        </Panel>
    );
}

function UniversityRegistrations({ events }) {
    const [selected, setSelected] = useState(events[0]?.id || '');
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('all');
    const registrations = useApi(selected ? `/events/${selected}/registrations` : '/events');

    useEffect(() => {
        if (!selected && events[0]) {
            setSelected(events[0].id);
        }
    }, [events, selected]);

    const filtered = records(registrations.data).filter((row) => {
        const haystack = `${row.student?.name || ''} ${row.student?.email || ''} ${row.school?.name || ''} ${row.status || ''}`.toLowerCase();
        return haystack.includes(query.toLowerCase()) && (status === 'all' || row.status === status);
    });

    return (
        <Panel title="Registrations and waitlist">
            <div className="mb-4 grid gap-3 md:grid-cols-[1fr_1fr_180px]">
                <select value={selected} onChange={(e) => setSelected(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm">
                    {events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
                </select>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search student, school, or email" className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400" />
                <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm">
                    <option value="all">All statuses</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="waitlisted">Waitlisted</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>
            <AsyncState state={registrations}>
                <DataTable columns={['Student', 'Email', 'School', 'Status', 'Created']} rows={filtered.map((row) => [
                    row.student?.name || row.student_id,
                    row.student?.email || '-',
                    row.school?.name || 'Direct',
                    <StatusPill status={row.status} />,
                    formatDate(row.created_at),
                ])} />
            </AsyncState>
        </Panel>
    );
}

function UniversityMessages({ events }) {
    const toast = useToast();
    const [eventId, setEventId] = useState(events[0]?.id || '');
    const [type, setType] = useState('email');
    const [content, setContent] = useState('Your campus visit details have been updated. Please check your dashboard for the latest information.');
    const [sending, setSending] = useState(false);
    const templates = [
        ['Event update', 'Your campus visit details have been updated. Please check your dashboard for the latest information.'],
        ['Reminder', 'Reminder: your upcoming campus visit is approaching. Please arrive 15 minutes early for check-in.'],
        ['Cancellation', 'This campus visit has been cancelled. We will notify you when a replacement date is available.'],
        ['Waitlist update', 'A seat may become available soon. We will confirm your registration status automatically.'],
    ];

    useEffect(() => {
        if (!eventId && events[0]) {
            setEventId(events[0].id);
        }
    }, [events, eventId]);

    const send = async (submitEvent) => {
        submitEvent.preventDefault();
        setSending(true);

        try {
            const { data } = await api.post('/messages', { event_id: eventId, type, content });
            toast.push(`Queued ${data.queued} ${type.toUpperCase()} update${data.queued === 1 ? '' : 's'}.`);
        } catch (error) {
            toast.push(errorMessage(error), 'error');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
            <Panel title="Send updates to registered users">
                <form onSubmit={send} className="space-y-4">
                    <label className="block text-sm font-semibold text-gray-700">
                        Event
                        <select value={eventId} onChange={(event) => setEventId(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 outline-none focus:border-gray-400">
                            {events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
                        </select>
                    </label>
                    <label className="block text-sm font-semibold text-gray-700">
                        Channel
                        <select value={type} onChange={(event) => setType(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 outline-none focus:border-gray-400">
                            <option value="email">Email</option>
                        </select>
                    </label>
                    <label className="block text-sm font-semibold text-gray-700">
                        Message
                        <textarea value={content} onChange={(event) => setContent(event.target.value)} rows="8" className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-gray-400" />
                    </label>
                    <button disabled={sending || !eventId || !content.trim()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
                        {sending && <Loader2 className="animate-spin" size={16} />}
                        Send update
                    </button>
                </form>
            </Panel>
            <Panel title="Message templates">
                <div className="space-y-3">
                    {templates.map(([label, body]) => (
                        <button key={label} type="button" onClick={() => setContent(body)} className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left hover:bg-gray-50">
                            <p className="font-semibold text-gray-950">{label}</p>
                            <p className="mt-1 text-sm leading-6 text-gray-500">{body}</p>
                        </button>
                    ))}
                </div>
            </Panel>
        </div>
    );
}

function UniversityDiscovery() {
    return (
        <div className="grid gap-6">
            <Panel title="Discovery">
                <p className="mb-4 text-sm leading-6 text-gray-500">
                    Identify high-opportunity schools, regions, and engagement patterns before scheduling visits.
                </p>
                <AIPanel />
            </Panel>
        </div>
    );
}

function UniversityItinerary({ events }) {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const destinations = events.slice(0, 5).map((event) => event.location).filter(Boolean);

    const build = async () => {
        setLoading(true);
        setError('');

        try {
            const { data } = await api.post('/ai/itinerary', {
                destinations: destinations.length ? destinations : ['Seattle', 'Portland', 'Vancouver'],
            });
            setResult(data);
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        build();
    }, [events.length]);

    return (
        <Panel title="Itinerary" action={<button onClick={build} className="rounded-lg bg-gray-950 px-3 py-2 text-sm font-semibold text-white">Rebuild</button>}>
            {loading && <LoadingState />}
            {error && <ErrorBanner message={error} />}
            {!loading && !error && (
                <div className="grid gap-4 lg:grid-cols-2">
                    {(result?.days || []).map((item) => (
                        <article key={`${item.day}-${item.stop}`} className="rounded-xl border border-gray-200 bg-white p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Day {item.day}</p>
                            <h3 className="mt-2 text-lg font-semibold text-gray-950">{item.stop}</h3>
                            <p className="mt-1 text-sm text-gray-500">Recommended time: {item.recommended_time}</p>
                            <p className="mt-3 text-sm leading-6 text-gray-500">Use this stop to coordinate visit sequencing and reduce travel gaps.</p>
                        </article>
                    ))}
                    {(!result?.days || result.days.length === 0) && <EmptyState message="No itinerary suggestions yet." />}
                </div>
            )}
        </Panel>
    );
}

function StudentManagement({ studentsState }) {
    const toast = useToast();
    const [form, setForm] = useState({ name: '', email: '' });
    const [bulkCsv, setBulkCsv] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [bulkSaving, setBulkSaving] = useState(false);

    const resetForm = () => {
        setForm({ name: '', email: '' });
        setEditingId(null);
    };

    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);

        try {
            if (editingId) {
                await api.patch(`/students/${editingId}`, form);
                toast.push('Student updated.');
            } else {
                await api.post('/students', form);
                toast.push('Student added.');
            }
            resetForm();
            studentsState.refresh();
        } catch (error) {
            toast.push(errorMessage(error), 'error');
        } finally {
            setSaving(false);
        }
    };

    const bulkUpload = async (event) => {
        event.preventDefault();
        setBulkSaving(true);

        try {
            const { data } = await api.post('/students/bulk', { csv: bulkCsv });
            toast.push(`${data.created?.length || 0} students uploaded.`);
            setBulkCsv('');
            studentsState.refresh();
        } catch (error) {
            toast.push(errorMessage(error), 'error');
        } finally {
            setBulkSaving(false);
        }
    };

    const remove = async (student) => {
        if (!confirm(`Delete ${student.name}?`)) {
            return;
        }

        try {
            await api.delete(`/students/${student.id}`);
            toast.push('Student deleted.');
            studentsState.refresh();
        } catch (error) {
            toast.push(errorMessage(error), 'error');
        }
    };

    return (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
            <Panel title="Students">
                <AsyncState state={studentsState}>
                    <DataTable
                        columns={['Name', 'Email', 'Actions']}
                        rows={records(studentsState.data).map((student) => [
                            student.name,
                            student.email,
                            <div className="flex gap-2">
                                <IconButton label="Edit" icon={Edit} onClick={() => {
                                    setEditingId(student.id);
                                    setForm({ name: student.name, email: student.email });
                                }} />
                                <IconButton label="Delete" icon={Trash2} danger onClick={() => remove(student)} />
                            </div>,
                        ])}
                    />
                </AsyncState>
            </Panel>
            <div className="grid gap-6">
                <Panel title={editingId ? 'Edit student' : 'Add student'}>
                    <form onSubmit={submit} className="space-y-4">
                        <TextInput label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
                        <TextInput label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
                        <button disabled={saving || !form.name.trim() || !form.email.trim()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
                            {saving && <Loader2 className="animate-spin" size={16} />}
                            {editingId ? 'Save student' : 'Add student'}
                        </button>
                        {editingId && <button type="button" onClick={resetForm} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700">Cancel edit</button>}
                    </form>
                </Panel>
                <Panel title="Bulk upload students">
                    <form onSubmit={bulkUpload} className="space-y-4">
                        <label className="block text-sm font-semibold text-gray-700">
                            CSV rows
                            <textarea
                                value={bulkCsv}
                                onChange={(event) => setBulkCsv(event.target.value)}
                                rows="7"
                                placeholder={"Jane Student,jane@example.com\nSamuel Learner,samuel@example.com"}
                                className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                            />
                        </label>
                        <p className="text-xs leading-5 text-gray-500">Use one student per line: name,email. Uploaded students are linked only to your school.</p>
                        <button disabled={bulkSaving || !bulkCsv.trim()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
                            {bulkSaving && <Loader2 className="animate-spin" size={16} />}
                            Upload students
                        </button>
                    </form>
                </Panel>
            </div>
        </div>
    );
}

function AvailableEvents({ eventsState, groupMode = false, compact = false }) {
    const [dateFilter, setDateFilter] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const filteredEvents = records(eventsState.data).filter((event) => {
        const dateMatches = !dateFilter || (event.event_date || '').slice(0, 10) >= dateFilter;
        const locationMatches = !locationFilter || (event.location || '').toLowerCase().includes(locationFilter.toLowerCase());

        return dateMatches && locationMatches;
    });

    return (
        <Panel title={groupMode ? 'Available events and group booking' : 'Browse events'} action={<RefreshButton onClick={eventsState.refresh} />}>
            <div className="mb-4 grid gap-3 md:grid-cols-2">
                <TextInput label="From date" type="date" value={dateFilter} onChange={setDateFilter} />
                <TextInput label="Location" value={locationFilter} onChange={setLocationFilter} placeholder="Filter by city, campus, or region" />
            </div>
            <AsyncState state={eventsState}>
                <div className={`grid gap-4 ${compact ? '' : 'xl:grid-cols-2'}`}>
                    {filteredEvents.map((event) => (
                        <EventBookingCard key={event.id} event={event} groupMode={groupMode} onDone={eventsState.refresh} />
                    ))}
                </div>
            </AsyncState>
        </Panel>
    );
}

function EventBookingCard({ event, groupMode, onDone }) {
    const { user } = useAuth();
    const toast = useToast();
    const students = useApi('/students', { initial: [], enabled: groupMode });
    const [studentIds, setStudentIds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [detailsOpen, setDetailsOpen] = useState(false);
    const isFull = Number(event.confirmed_count || 0) >= Number(event.capacity || 0);

    const register = async () => {
        setLoading(true);
        setMessage('');

        try {
            if (groupMode) {
                const { data } = await api.post(`/events/${event.id}/group-registrations`, { student_ids: studentIds });
                const waitlisted = records(data.registrations).filter((registration) => registration.status === 'waitlisted').length;
                setMessage(waitlisted > 0 ? `${waitlisted} student(s) added to waitlist; remaining seats were confirmed.` : 'Group booking confirmed.');
            } else {
                const { data } = await api.post(`/events/${event.id}/registrations`);
                setMessage(data.status === 'waitlisted' ? 'Event is full. You have been added to the waitlist.' : 'Registration confirmed.');
            }
            toast.push('Registration submitted.');
            onDone?.();
        } catch (err) {
            const error = errorMessage(err);
            setMessage(error);
            toast.push(error, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <article className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h3 className="font-semibold">{event.title}</h3>
                    <p className="mt-1 text-sm text-gray-500">{formatDate(event.event_date)} · {event.location}</p>
                    <p className="mt-2 text-sm text-gray-500">Capacity {event.capacity} · Confirmed {event.confirmed_count ?? 0} · Waitlist {event.waitlisted_count ?? 0}</p>
                </div>
                <StatusPill status={event.status} />
            </div>
            {isFull && <p className="mt-2 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold uppercase text-amber-700">Full · waitlist available</p>}
            <button type="button" onClick={() => setDetailsOpen((open) => !open)} className="mt-3 text-sm font-semibold text-blue-700">
                {detailsOpen ? 'Hide details' : 'View details'}
            </button>
            {detailsOpen && (
                <div className="mt-3 rounded-xl bg-gray-50 p-3 text-sm leading-6 text-gray-600">
                    <p>{event.description || 'No description provided yet.'}</p>
                    {event.university?.name && <p className="mt-2 font-semibold text-gray-800">Hosted by {event.university.name}</p>}
                </div>
            )}
            {groupMode && (
                <div className="mt-4">
                    <p className="text-sm font-semibold text-gray-700">Select students</p>
                    <AsyncState state={students}>
                        <div className="mt-2 grid max-h-44 gap-2 overflow-y-auto rounded-xl border border-gray-200 p-2">
                            {records(students.data).map((student) => (
                                <label key={student.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50">
                                    <input
                                        type="checkbox"
                                        checked={studentIds.includes(student.id)}
                                        onChange={(change) => setStudentIds((items) => change.target.checked ? [...items, student.id] : items.filter((id) => id !== student.id))}
                                    />
                                    {student.name} <span className="text-xs text-gray-400">#{student.id}</span>
                                </label>
                            ))}
                        </div>
                    </AsyncState>
                </div>
            )}
            {['student', 'school', 'high_school'].includes(user.role) && (
                <button onClick={register} disabled={loading || (groupMode && studentIds.length === 0)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                    {loading && <Loader2 className="animate-spin" size={16} />}
                    {groupMode ? 'Book group' : (isFull ? 'Join waitlist' : 'Register')}
                </button>
            )}
            {message && <p className="mt-3 text-sm font-semibold text-gray-600">{message}</p>}
        </article>
    );
}

function BookingHistory({ title = 'Booking history' }) {
    const bookings = useApi('/registrations');
    const { user } = useAuth();
    const columns = user.role === 'student'
        ? ['Event', 'Location', 'Status', 'Booked']
        : ['Student', 'Event', 'Location', 'Status', 'Booked'];
    const rows = records(bookings.data).map((booking) => {
        const base = [
            booking.event?.title || '-',
            booking.event?.location || '-',
            <StatusPill status={booking.status} />,
            formatDate(booking.created_at),
        ];

        return user.role === 'student' ? base : [booking.student?.name || 'Me', ...base];
    });

    return (
        <Panel title={title}>
            <AsyncState state={bookings}>
                <DataTable
                    columns={columns}
                    rows={rows}
                />
            </AsyncState>
        </Panel>
    );
}

function NotificationsPanel() {
    const notifications = useNotifications();

    return (
        <Panel title="Notifications" action={<RefreshButton onClick={notifications.refresh} />}>
            <AsyncState state={{ loading: notifications.loading, error: notifications.error }}>
                <div className="space-y-3">
                    {notifications.messages.length === 0 ? (
                        <EmptyState message="No reminders or updates yet." />
                    ) : notifications.messages.map((message) => (
                        <article key={message.id} className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm font-bold uppercase tracking-wide text-gray-500">{message.type}</p>
                                    <p className="mt-2 leading-6 text-gray-800">{message.content}</p>
                                    <p className="mt-2 text-xs text-gray-400">{formatDate(message.created_at)}</p>
                                </div>
                                <StatusPill status={message.status} />
                            </div>
                        </article>
                    ))}
                </div>
            </AsyncState>
        </Panel>
    );
}

function CalendarView({ compact = false, source = 'events' }) {
    const calendar = useApi('/calendar', { initial: {}, enabled: source === 'events' });
    const bookings = useApi('/registrations', { initial: [], enabled: source === 'bookings' });
    const groupedBookings = records(bookings.data).reduce((groups, booking) => {
        if (!booking.event?.event_date || booking.status === 'cancelled') {
            return groups;
        }

        const date = booking.event.event_date.slice(0, 10);
        groups[date] = groups[date] || [];
        groups[date].push({
            id: booking.id,
            title: booking.event.title,
            location: booking.event.location,
            status: booking.status,
            student: booking.student?.name,
        });

        return groups;
    }, {});
    const state = source === 'bookings' ? bookings : calendar;
    const calendarData = source === 'bookings' ? groupedBookings : (calendar.data || {});

    return (
        <Panel title={source === 'bookings' ? 'Upcoming visit calendar' : 'Monthly calendar'} action={<CalendarDays size={18} />}>
            <AsyncState state={state}>
                <div className={`grid gap-3 ${compact ? '' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
                    {Object.entries(calendarData).map(([date, events]) => (
                        <article key={date} className="rounded-xl border border-gray-200 bg-white p-4">
                            <p className="font-semibold text-gray-950">{date}</p>
                            <div className="mt-3 space-y-2">
                                {events.map((event) => (
                                    <div key={event.id} className="rounded-lg bg-gray-50 p-3 text-sm">
                                        <p className="font-semibold">{event.title}</p>
                                        <p className="text-gray-500">{event.location}</p>
                                        {event.student && <p className="text-xs text-gray-400">{event.student}</p>}
                                        {event.status && <StatusPill status={event.status} />}
                                    </div>
                                ))}
                            </div>
                        </article>
                    ))}
                </div>
            </AsyncState>
        </Panel>
    );
}

function ReportsPanel({ reportsState, compact = false }) {
    const [downloading, setDownloading] = useState('');
    const toast = useToast();

    const download = async (format) => {
        setDownloading(format);
        try {
            const response = await api.get(`/reports/export/${format}`, { responseType: 'blob' });
            const url = URL.createObjectURL(response.data);
            const link = document.createElement('a');
            link.href = url;
            link.download = format === 'pdf' ? 'campus-visit-report.pdf' : 'campus-visit-report.xls';
            link.click();
            URL.revokeObjectURL(url);
            toast.push(`${format.toUpperCase()} export downloaded.`);
        } catch (error) {
            toast.push(errorMessage(error), 'error');
        } finally {
            setDownloading('');
        }
    };

    return (
        <Panel title="Reports and charts" action={!compact && (
            <div className="flex gap-2">
                <button disabled={!!downloading} onClick={() => download('pdf')} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold disabled:opacity-50">PDF</button>
                <button disabled={!!downloading} onClick={() => download('excel')} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold disabled:opacity-50">Excel</button>
            </div>
        )}>
            <AsyncState state={reportsState}>
                <div className={`grid gap-4 ${compact ? '' : 'xl:grid-cols-3'}`}>
                    <ChartCard title="Registrations" data={records(reportsState.data?.registrations_per_event).map((item) => [item.title, item.registrations_count])} />
                    <ChartCard title="Attendance" data={records(reportsState.data?.attendance_tracking).map((item) => [`Event ${item.event_id}`, Number(item.attended_count || 0)])} />
                    <ChartCard title="Conversion" data={records(reportsState.data?.conversion_to_applications).map((item) => [item.status, item.total])} />
                </div>
            </AsyncState>
        </Panel>
    );
}

function AIPanel() {
    const [result, setResult] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const run = async () => {
        setLoading(true);
        setError('');
        try {
            const [matches, engagement, itinerary] = await Promise.all([
                api.post('/ai/school-matches', { schools: [{ name: 'Oakwood Prep' }, { name: 'North Valley Magnet' }, { name: 'International School of Boston' }] }),
                api.post('/ai/engagement-prediction', { past_attendance: 84, email_responses: 12 }),
                api.post('/ai/itinerary', { destinations: ['Boston', 'Cambridge', 'Providence'] }),
            ]);
            setResult({ matches: matches.data, engagement: engagement.data, itinerary: itinerary.data });
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        run();
    }, []);

    return (
        <Panel title="AI recruitment intelligence" action={<button onClick={run} className="rounded-lg bg-gray-950 px-3 py-2 text-sm font-semibold text-white">Refresh AI</button>}>
            {loading && <LoadingState />}
            {error && <ErrorBanner message={error} />}
            {!loading && (
                <div className="grid gap-4 xl:grid-cols-3">
                    <AICard title="Recommended schools" icon={Sparkles}>
                        {(result.matches || []).map((item) => (
                            <div key={item.name} className="rounded-lg bg-gray-50 p-3">
                                <p className="font-semibold">{item.name}</p>
                                <p className="text-sm text-gray-500">Score {item.match_score}</p>
                            </div>
                        ))}
                    </AICard>
                    <AICard title="Predicted engagement" icon={Activity}>
                        <p className="text-4xl font-semibold">{result.engagement?.engagement_probability || 0}%</p>
                        <p className="mt-2 text-sm text-gray-500">{result.engagement?.recommended_action}</p>
                    </AICard>
                    <AICard title="Itinerary suggestions" icon={CalendarDays}>
                        {(result.itinerary?.days || []).map((item) => (
                            <p key={`${item.day}-${item.stop}`} className="rounded-lg bg-gray-50 p-3 text-sm">Day {item.day}: {item.stop} at {item.recommended_time}</p>
                        ))}
                    </AICard>
                </div>
            )}
        </Panel>
    );
}

function UserManagement({ usersState, compact = false }) {
    const toast = useToast();
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student', school_id: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (editing) {
            setForm({
                name: editing.name || '',
                email: editing.email || '',
                password: '',
                role: editing.role || 'student',
                school_id: editing.school_id || '',
            });
        }
    }, [editing]);

    const reset = () => {
        setEditing(null);
        setForm({ name: '', email: '', password: '', role: 'student', school_id: '' });
    };

    const save = async (event) => {
        event.preventDefault();
        setSaving(true);

        try {
            const payload = {
                name: form.name,
                email: form.email,
                role: form.role,
                school_id: form.school_id || null,
            };

            if (!editing) {
                payload.password = form.password;
            }

            if (editing) {
                await api.patch(`/admin/users/${editing.id}`, payload);
                toast.push('User updated.');
            } else {
                await api.post('/admin/users', payload);
                toast.push('User created.');
            }

            reset();
            usersState.refresh();
        } catch (error) {
            toast.push(errorMessage(error), 'error');
        } finally {
            setSaving(false);
        }
    };

    const remove = async (user) => {
        if (!confirm(`Delete ${user.name}?`)) {
            return;
        }

        try {
            await api.delete(`/admin/users/${user.id}`);
            toast.push('User deleted.');
            usersState.refresh();
        } catch (error) {
            toast.push(errorMessage(error), 'error');
        }
    };

    return (
        <Panel title="Manage users" action={<RefreshButton onClick={usersState.refresh} />}>
            {!compact && (
                <form onSubmit={save} className="mb-5 grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-2 xl:grid-cols-5">
                    <TextInput label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
                    <TextInput label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
                    {!editing && <TextInput label="Password" type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} />}
                    <label className="block text-sm font-semibold text-gray-700">
                        Role
                        <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400">
                            <option value="admin">Admin</option>
                            <option value="university">University</option>
                            <option value="school">School</option>
                            <option value="student">Student</option>
                        </select>
                    </label>
                    <TextInput label="School ID" value={form.school_id} onChange={(value) => setForm({ ...form, school_id: value })} placeholder="Optional" />
                    <div className="flex items-end gap-2">
                        <button disabled={saving || !form.name || !form.email || (!editing && !form.password)} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 text-sm font-bold text-white disabled:opacity-60">
                            {saving && <Loader2 className="animate-spin" size={16} />}
                            {editing ? 'Save' : 'Create'}
                        </button>
                        {editing && <button type="button" onClick={reset} className="h-11 rounded-xl border border-gray-200 px-4 text-sm font-bold text-gray-700">Cancel</button>}
                    </div>
                </form>
            )}
            <AsyncState state={usersState}>
                <DataTable
                    columns={compact ? ['Name', 'Email', 'Role', 'School'] : ['Name', 'Email', 'Role', 'School', 'Actions']}
                    rows={records(usersState.data).slice(0, compact ? 6 : 50).map((user) => [
                        user.name,
                        user.email,
                        roleLabel(user.role),
                        user.school?.name || '-',
                        ...(compact ? [] : [<div className="flex gap-2">
                            <IconButton label="Edit" icon={Edit} onClick={() => setEditing(user)} />
                            <IconButton label="Delete" icon={Trash2} danger onClick={() => remove(user)} />
                        </div>]),
                    ])}
                />
            </AsyncState>
        </Panel>
    );
}

function AccountDirectory({ title, usersState }) {
    return (
        <Panel title={`Manage ${title.toLowerCase()}`} action={<RefreshButton onClick={usersState.refresh} />}>
            <AsyncState state={usersState}>
                <DataTable
                    columns={['Name', 'Email', 'Events', 'Created']}
                    rows={records(usersState.data).map((user) => [
                        user.name,
                        user.email,
                        user.events_count ?? 0,
                        formatDate(user.created_at),
                    ])}
                />
            </AsyncState>
        </Panel>
    );
}

function AdminSchools({ schoolsState }) {
    return (
        <Panel title="Manage school accounts" action={<RefreshButton onClick={schoolsState.refresh} />}>
            <AsyncState state={schoolsState}>
                <DataTable
                    columns={['School', 'Location', 'Users', 'Registrations']}
                    rows={records(schoolsState.data).map((school) => [
                        school.name,
                        school.location || '-',
                        school.users_count ?? 0,
                        school.registrations_count ?? 0,
                    ])}
                />
            </AsyncState>
        </Panel>
    );
}

function AdminEventList({ eventsState, compact = false }) {
    const toast = useToast();

    const cancel = async (event) => {
        if (!confirm(`Cancel ${event.title}?`)) {
            return;
        }

        try {
            await api.post(`/events/${event.id}/cancel`);
            toast.push('Event cancelled.');
            eventsState.refresh?.();
        } catch (error) {
            toast.push(errorMessage(error), 'error');
        }
    };

    return (
        <Panel title="All platform events" action={!compact && <RefreshButton onClick={eventsState.refresh} />}>
            <AsyncState state={eventsState}>
                <DataTable
                    columns={compact ? ['Event', 'University', 'Status'] : ['Event', 'University', 'Date', 'Location', 'Bookings', 'Status', 'Actions']}
                    rows={records(eventsState.data).map((event) => compact ? [
                        event.title,
                        event.university?.name || '-',
                        <StatusPill status={event.status} />,
                    ] : [
                        event.title,
                        event.university?.name || '-',
                        formatDate(event.event_date),
                        event.location,
                        `${event.confirmed_count ?? 0} confirmed / ${event.waitlisted_count ?? 0} waitlisted`,
                        <StatusPill status={event.status} />,
                        <button disabled={event.status === 'cancelled'} onClick={() => cancel(event)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold uppercase text-red-600 disabled:opacity-50">Cancel</button>,
                    ])}
                />
            </AsyncState>
        </Panel>
    );
}

function AdminReports({ analyticsState }) {
    return (
        <Panel title="Platform-wide analytics and engagement trends">
            <AsyncState state={analyticsState}>
                <div className="grid gap-4 xl:grid-cols-3">
                    <ChartCard title="Platform totals" data={[
                        ['Users', analyticsState.data?.users || 0],
                        ['Events', analyticsState.data?.events || 0],
                        ['Registrations', analyticsState.data?.registrations || 0],
                        ['Applications', analyticsState.data?.applications || 0],
                    ]} />
                    <ChartCard title="Event status" data={[
                        ['Published', analyticsState.data?.published_events || 0],
                        ['Cancelled', analyticsState.data?.cancelled_events || 0],
                        ['Waitlisted', analyticsState.data?.waitlisted_registrations || 0],
                    ]} />
                    <ChartCard title="Engagement trends" data={records(analyticsState.data?.engagement_trends).map((item) => [item.date, item.total])} />
                </div>
            </AsyncState>
        </Panel>
    );
}

function SystemLogs({ logsState }) {
    return (
        <Panel title="System logs" action={<RefreshButton onClick={logsState.refresh} />}>
            <AsyncState state={logsState}>
                <DataTable
                    columns={['Action', 'Actor', 'Subject', 'Metadata', 'Time']}
                    rows={records(logsState.data).map((log) => [
                        log.action,
                        log.user?.name || 'System',
                        `${(log.subject_type || '').split('\\').pop() || '-'} #${log.subject_id || '-'}`,
                        JSON.stringify(log.metadata || {}),
                        formatDate(log.created_at),
                    ])}
                />
            </AsyncState>
        </Panel>
    );
}

function EventList({ events, onSelect, admin = false }) {
    return (
        <Panel title={admin ? 'All platform events' : 'Upcoming events'} action={onSelect && <button onClick={onSelect} className="text-sm font-semibold text-blue-700">View all</button>}>
            <div className="space-y-3">
                {events.length === 0 ? <EmptyState message="No events found." /> : events.map((event) => (
                    <article key={event.id} className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4">
                        <div>
                            <p className="font-semibold">{event.title}</p>
                            <p className="text-sm text-gray-500">{formatDate(event.event_date)} · {event.location}</p>
                        </div>
                        <StatusPill status={event.status} />
                    </article>
                ))}
            </div>
        </Panel>
    );
}

function NotificationBell() {
    const notifications = useNotifications();
    const count = notifications?.count || 0;

    return (
        <div className="relative">
            <Bell size={20} className="text-gray-600" />
            {count > 0 && <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-red-600 text-[10px] font-bold text-white">{count}</span>}
        </div>
    );
}

function DashboardHome({ title, subtitle, metrics, loading, children }) {
    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-3xl font-semibold tracking-tight">{title}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">{subtitle}</p>
            </section>
            {loading ? <LoadingState /> : <MetricGrid metrics={metrics} />}
            {children}
        </div>
    );
}

function Panel({ title, action, children }) {
    return (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold">{title}</h2>
                {action}
            </div>
            {children}
        </section>
    );
}

function MetricGrid({ metrics }) {
    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(([label, value]) => (
                <article key={label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-medium text-gray-500">{label}</p>
                    <p className="mt-3 text-3xl font-semibold">{value}</p>
                </article>
            ))}
        </div>
    );
}

function ChartCard({ title, data }) {
    const max = Math.max(1, ...data.map(([, value]) => Number(value || 0)));

    return (
        <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="font-semibold">{title}</h3>
            <div className="mt-4 space-y-3">
                {data.length === 0 ? <EmptyState message="No chart data yet." /> : data.slice(0, 6).map(([label, value]) => (
                    <div key={label}>
                        <div className="flex justify-between text-xs text-gray-500">
                            <span className="truncate">{label}</span>
                            <span>{value}</span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-gray-100">
                            <div className="h-2 rounded-full bg-blue-600" style={{ width: `${(Number(value || 0) / max) * 100}%` }} />
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

function AICard({ title, icon: Icon, children }) {
    return (
        <section className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-4 flex items-center gap-2">
                <Icon size={18} className="text-blue-700" />
                <h3 className="font-semibold">{title}</h3>
            </div>
            <div className="space-y-3">{children}</div>
        </section>
    );
}

function DataTable({ columns, rows }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>{columns.map((column) => <th key={column} className="px-4 py-3">{column}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {rows.length === 0 ? (
                        <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">No records found.</td></tr>
                    ) : rows.map((row, index) => (
                        <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3 text-gray-600 first:font-semibold first:text-gray-950">{cell}</td>)}</tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function TextInput({ label, value, onChange, type = 'text', placeholder = '' }) {
    return (
        <label className="block text-sm font-semibold text-gray-700">
            {label}
            <input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-100" />
        </label>
    );
}

function AsyncState({ state, children }) {
    if (state.loading) {
        return <LoadingState />;
    }

    if (state.error) {
        return <ErrorBanner message={state.error} />;
    }

    return children;
}

function LoadingState() {
    return (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white p-8 text-sm font-semibold text-gray-500">
            <Loader2 size={18} className="animate-spin" />
            Loading
        </div>
    );
}

function ErrorBanner({ message }) {
    return (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            <AlertCircle size={18} />
            {message}
        </div>
    );
}

function EmptyState({ message }) {
    return <p className="rounded-xl bg-gray-50 p-5 text-center text-sm text-gray-500">{message}</p>;
}

function StatusPill({ status }) {
    const classes = {
        published: 'bg-emerald-50 text-emerald-700',
        confirmed: 'bg-emerald-50 text-emerald-700',
        sent: 'bg-emerald-50 text-emerald-700',
        draft: 'bg-gray-100 text-gray-600',
        pending: 'bg-amber-50 text-amber-700',
        waitlisted: 'bg-amber-50 text-amber-700',
        cancelled: 'bg-red-50 text-red-700',
    };

    return <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase ${classes[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
}

function IconButton({ label, icon: Icon, onClick, danger = false }) {
    return (
        <button title={label} onClick={onClick} className={`grid h-9 w-9 place-items-center rounded-lg border ${danger ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            <Icon size={16} />
        </button>
    );
}

function RefreshButton({ onClick }) {
    return <button onClick={onClick} className="grid h-9 w-9 place-items-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"><RefreshCcw size={16} /></button>;
}

function EventStatusButton({ event, onDone }) {
    const [loading, setLoading] = useState(false);
    const toast = useToast();
    const next = event.status === 'published' ? 'unpublish' : 'publish';

    const submit = async () => {
        setLoading(true);
        try {
            await api.post(`/events/${event.id}/${next}`);
            toast.push(`Event ${next === 'publish' ? 'published' : 'unpublished'}.`);
            onDone();
        } catch (error) {
            toast.push(errorMessage(error), 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button onClick={submit} disabled={loading} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold uppercase text-gray-600 hover:bg-gray-50">
            {loading ? '...' : next}
        </button>
    );
}

function navFor(role) {
    const common = [{ id: 'home', label: 'Dashboard', icon: Activity }];
    const map = {
        university: [
            ...common,
            { id: 'discovery', label: 'Discovery', icon: Sparkles },
            { id: 'visits', label: 'Visits', icon: CalendarDays },
            { id: 'itinerary', label: 'Itinerary', icon: Activity },
        ],
        school: [
            ...common,
            { id: 'students', label: 'Students', icon: Users },
            { id: 'events', label: 'Events', icon: CalendarDays },
            { id: 'bookings', label: 'Bookings', icon: CheckCircle2 },
            { id: 'calendar', label: 'Calendar', icon: CalendarDays },
        ],
        high_school: [
            ...common,
            { id: 'students', label: 'Students', icon: Users },
            { id: 'events', label: 'Events', icon: CalendarDays },
            { id: 'bookings', label: 'Bookings', icon: CheckCircle2 },
            { id: 'calendar', label: 'Calendar', icon: CalendarDays },
        ],
        student: [
            ...common,
            { id: 'events', label: 'Browse Events', icon: CalendarDays },
            { id: 'bookings', label: 'My Bookings', icon: CheckCircle2 },
            { id: 'calendar', label: 'Calendar', icon: CalendarDays },
            { id: 'notifications', label: 'Notifications', icon: Bell },
        ],
        admin: [
            ...common,
            { id: 'users', label: 'Users', icon: UserCog },
            { id: 'universities', label: 'Universities', icon: School },
            { id: 'schools', label: 'Schools', icon: Users },
            { id: 'events', label: 'Events', icon: CalendarDays },
            { id: 'reports', label: 'Reports', icon: BarChart3 },
            { id: 'logs', label: 'System Logs', icon: Activity },
        ],
    };

    return map[role] || map.student;
}

function defaultView(role) {
    return navFor(role).some((item) => item.id === 'home') ? 'home' : navFor(role)[0]?.id || 'home';
}

function roleRoutePrefix(role) {
    return {
        admin: 'admin',
        university: 'university',
        school: 'school',
        high_school: 'school',
        student: 'student',
    }[role] || 'student';
}

function hashForView(role, view) {
    return `#/${roleRoutePrefix(role)}/${view === 'home' ? 'dashboard' : view}`;
}

function viewFromHash(role) {
    const nav = navFor(role);
    const fallback = defaultView(role);
    const parts = window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    const [prefix, routeView] = parts;

    if (prefix !== roleRoutePrefix(role)) {
        window.location.hash = hashForView(role, fallback);
        return fallback;
    }

    const view = routeView === 'dashboard' ? 'home' : routeView;

    if (! nav.some((item) => item.id === view)) {
        window.location.hash = hashForView(role, fallback);
        return fallback;
    }

    return view;
}

function roleLabel(role) {
    return {
        admin: 'Admin',
        university: 'University',
        school: 'School',
        high_school: 'School',
        student: 'Student',
    }[role] || 'User';
}

function records(payload) {
    if (Array.isArray(payload)) {
        return payload;
    }

    if (Array.isArray(payload?.data)) {
        return payload.data;
    }

    return [];
}

function totalReportCount(items) {
    return records(items).reduce((sum, item) => sum + Number(item.registrations_count || item.total || 0), 0);
}

function errorMessage(error) {
    return error?.response?.data?.message
        || Object.values(error?.response?.data?.errors || {})?.[0]?.[0]
        || error.message
        || 'Something went wrong.';
}

function formatDate(value) {
    if (!value) {
        return 'TBA';
    }

    return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function toInputDate(value) {
    if (!value) {
        return '';
    }

    const date = new Date(value);
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function emptyEvent() {
    return {
        title: '',
        description: '',
        location: '',
        event_date: '',
        capacity: 50,
        status: 'draft',
    };
}

createRoot(document.getElementById('platform-root')).render(<App />);
