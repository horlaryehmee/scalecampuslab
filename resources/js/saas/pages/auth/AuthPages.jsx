import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, GraduationCap, MailCheck, ShieldCheck } from 'lucide-react';
import { Button, Field, PageState } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useApi } from '../../hooks/useApi';
import { api, apiError, dashboardPath } from '../../services/api';

const MFA_CHALLENGE_KEY = 'scalecampuslab.login.mfa';

function AuthShell({ eyebrow, title, body, children }) {
    return (
        <main className="grid min-h-screen bg-[#f6f8f7] lg:grid-cols-[.8fr_1.2fr]">
            <aside className="relative hidden overflow-hidden bg-[#073f3b] p-12 text-white lg:flex lg:flex-col lg:justify-between">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(52,211,153,.22),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(59,130,246,.16),transparent_36%)]" />
                <Link to="/" className="relative inline-flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-[#075f56]"><GraduationCap size={23} /></span><span className="text-lg font-black">ScaleCampusLab</span></Link>
                <div className="relative max-w-md"><p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Connected campus outreach</p><h2 className="mt-4 text-4xl font-black tracking-[-0.04em]">Plan together. Decide faster. Track what matters.</h2><div className="mt-8 grid gap-3">{['Role-specific workspaces', 'Real school approvals', 'Verified student participation'].map((item) => <p key={item} className="flex items-center gap-2 text-sm font-bold text-white/70"><CheckCircle2 size={16} className="text-emerald-300" />{item}</p>)}</div></div>
                <p className="relative text-xs font-semibold text-white/35">ScaleCampusLab · Campus visits coordinated</p>
            </aside>
            <section className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-8">
                <div className="w-full max-w-lg">
                    <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-950"><ArrowLeft size={16} /> Back to website</Link>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">{eyebrow}</p>
                    <h1 className="mt-3 text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-4xl">{title}</h1>
                    {body && <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{body}</p>}
                    <div className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/[0.05] sm:p-7">{children}</div>
                </div>
            </section>
        </main>
    );
}

export function LoginPage() {
    const { login, user, ready } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const [search] = useSearchParams();
    const [form, setForm] = useState({ email: '', password: '', remember: true });
    const [loading, setLoading] = useState(false);
    const [demoLoading, setDemoLoading] = useState('');
    const [error, setError] = useState('');
    const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));
    const demoAccounts = [
        ['Admin', 'admin@scalecampuslab.test', '/dashboard/admin'],
        ['University', 'university@scalecampuslab.test', '/dashboard/university'],
        ['School', 'school@scalecampuslab.test', '/dashboard/school'],
        ['Student', 'student@scalecampuslab.test', '/dashboard/student'],
    ];

    useEffect(() => {
        if (ready && user?.email_verified) window.location.replace(dashboardPath(user));
        if (ready && user?.email_verified === false) navigate('/verify-email', { replace: true });
    }, [navigate, ready, user]);

    useEffect(() => {
        if (search.get('verified') === '1') toast.push('Your email has been verified. You can continue to your workspace.');
        if (search.get('reset') === '1') toast.push('Your password has been reset. Sign in with your new password.');
    }, [search, toast]);

    const submit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        try {
            const result = await login(form);
            if (result.mfa_required) {
                window.sessionStorage.setItem(MFA_CHALLENGE_KEY, JSON.stringify({
                    challenge_token: result.challenge_token,
                    masked_email: result.masked_email,
                    expires_at: result.expires_at,
                }));
                navigate('/mfa-challenge');
                return;
            }

            toast.push(result.message || 'Signed in successfully.');
            if (result.user?.email_verified === false) {
                navigate('/verify-email', { replace: true });
            } else {
                window.location.assign(dashboardPath(result.user));
            }
        } catch (requestError) {
            setError(apiError(requestError, 'Unable to sign in.'));
        } finally {
            setLoading(false);
        }
    };

    const openDemo = async (email) => {
        setDemoLoading(email);
        setError('');
        try {
            const result = await login({ email, password: 'password', remember: true });
            if (result.mfa_required) {
                setError('This demo account has extra verification enabled. Use the standard sign-in form.');
                return;
            }

            toast.push('Demo workspace opened.');
            window.location.assign(dashboardPath(result.user));
        } catch (requestError) {
            setError(apiError(requestError, 'Unable to open this demo dashboard. Run the demo seeder and try again.'));
        } finally {
            setDemoLoading('');
        }
    };

    return (
        <AuthShell eyebrow="Welcome back" title="Sign in to your workspace" body="Use the account connected to your university, school, student profile, or admin role.">
            <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-sm font-black text-slate-950">Demo dashboards</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {demoAccounts.map(([label, email, path]) => (
                        <button key={email} type="button" onClick={() => openDemo(email)} disabled={Boolean(demoLoading || loading)} className="flex items-center justify-between rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-left text-sm font-black text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">
                            <span>{demoLoading === email ? 'Opening...' : label}</span>
                            <span className="text-[11px] font-bold text-slate-400">{path.replace('/dashboard/', '')}</span>
                        </button>
                    ))}
                </div>
            </div>
            <form onSubmit={submit} className="grid gap-4">
                <Field label="Email address" type="email" autoComplete="email" value={form.email} onChange={update('email')} required autoFocus />
                <Field label="Password" type="password" autoComplete="current-password" value={form.password} onChange={update('password')} required />
                <div className="flex items-center justify-between gap-3"><label className="inline-flex items-center gap-2 text-sm font-bold text-slate-600"><input type="checkbox" checked={form.remember} onChange={update('remember')} className="h-4 w-4 rounded border-slate-300 text-emerald-700" /> Keep me signed in</label><Link to="/forgot-password" className="text-sm font-black text-emerald-700 hover:text-emerald-900">Forgot password?</Link></div>
                {error && <p className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}
                <Button type="submit" loading={loading} className="mt-1 w-full py-3">Sign in <ArrowRight size={16} /></Button>
            </form>
            <p className="mt-5 text-center text-sm font-semibold text-slate-500">New to ScaleCampusLab? <Link to="/register" className="font-black text-emerald-700">Create an account</Link></p>
        </AuthShell>
    );
}

export function MfaChallengePage() {
    const { completeMfa } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const [challenge, setChallenge] = useState(() => {
        try {
            return JSON.parse(window.sessionStorage.getItem(MFA_CHALLENGE_KEY) || 'null');
        } catch {
            return null;
        }
    });
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!challenge?.challenge_token) navigate('/login', { replace: true });
    }, [challenge, navigate]);

    const submit = async (event) => {
        event.preventDefault();
        if (!challenge?.challenge_token) return;
        setLoading(true);
        setError('');
        try {
            const result = await completeMfa({ challenge_token: challenge.challenge_token, code });
            window.sessionStorage.removeItem(MFA_CHALLENGE_KEY);
            toast.push(result.message || 'Signed in successfully.');
            window.location.assign(dashboardPath(result.user));
        } catch (requestError) {
            setError(apiError(requestError, 'Unable to verify this sign-in code.'));
        } finally {
            setLoading(false);
        }
    };

    const resend = async () => {
        if (!challenge?.challenge_token) return;
        setResending(true);
        setError('');
        try {
            const response = await api.post('/mfa/resend', { challenge_token: challenge.challenge_token });
            const next = {
                challenge_token: response.data.challenge_token,
                masked_email: response.data.masked_email,
                expires_at: response.data.expires_at,
            };
            setChallenge(next);
            window.sessionStorage.setItem(MFA_CHALLENGE_KEY, JSON.stringify(next));
            setCode('');
            toast.push(response.data.message || 'A new sign-in code has been sent.');
        } catch (requestError) {
            setError(apiError(requestError, 'Unable to send another code.'));
        } finally {
            setResending(false);
        }
    };

    return (
        <AuthShell eyebrow="Secure sign in" title="Enter your sign-in code" body={`We sent a six-digit, one-time code to ${challenge?.masked_email || 'your account email'}.`}>
            <form onSubmit={submit} className="grid gap-4">
                <Field label="Verification code" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength="6" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} required autoFocus />
                <p className="text-xs font-semibold leading-5 text-slate-500">The code expires shortly and can only be used once.</p>
                {error && <p className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}
                <Button type="submit" loading={loading} disabled={code.length !== 6} className="w-full py-3"><ShieldCheck size={16} /> Verify and sign in</Button>
                <Button type="button" loading={resending} variant="secondary" onClick={resend} className="w-full">Send a new code</Button>
            </form>
            <p className="mt-5 text-center"><Link to="/login" onClick={() => window.sessionStorage.removeItem(MFA_CHALLENGE_KEY)} className="text-sm font-black text-emerald-700">Cancel and return to sign in</Link></p>
        </AuthShell>
    );
}

export function RegisterPage() {
    const { register } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const [search] = useSearchParams();
    const requestedRole = ['university', 'school', 'student'].includes(search.get('role')) ? search.get('role') : 'university';
    const [form, setForm] = useState({ role: requestedRole, name: '', email: '', phone: '', password: '', password_confirmation: '', school_name: '', school_location: '', school_id: '', student_identifier: '', grade_level: '', interest_major: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const home = useApi('/public/registration-options');
    const schools = home.data?.schools || home.data?.data?.schools || [];
    const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

    const submit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        try {
            const result = await register(form);
            toast.push(result.message || 'Account created.');
            if (result.user?.email_verified === false) {
                navigate('/verify-email', { replace: true });
            } else {
                window.location.assign(dashboardPath(result.user));
            }
        } catch (requestError) {
            setError(apiError(requestError, 'Unable to create your account.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell eyebrow="Create an account" title="Start with the workspace built for your role" body="Every record you create will stay connected to the correct institution, event, and participant.">
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                <Field label="Role" as="select" value={form.role} onChange={update('role')} options={[{ value: 'university', label: 'University' }, { value: 'school', label: 'School' }, { value: 'student', label: 'Student' }]} className="sm:col-span-2" />
                <Field label={form.role === 'university' ? 'University representative name' : form.role === 'school' ? 'Coordinator name' : 'Full name'} value={form.name} onChange={update('name')} required />
                <Field label="Email" type="email" autoComplete="email" value={form.email} onChange={update('email')} required />
                <Field label="Phone (optional)" type="tel" value={form.phone} onChange={update('phone')} className="sm:col-span-2" />
                {form.role === 'school' && <><Field label="School name" value={form.school_name} onChange={update('school_name')} required /><Field label="School location" value={form.school_location} onChange={update('school_location')} required /></>}
                {form.role === 'student' && (
                    <>
                        <PageState loading={home.loading} error={home.error} onRetry={() => home.refresh()}>
                            <Field label="School" as="select" value={form.school_id} onChange={update('school_id')} required options={[{ value: '', label: 'Select your school' }, ...schools.map((school) => ({ value: school.id, label: `${school.name}${school.location ? ` — ${school.location}` : ''}` }))]} />
                        </PageState>
                        <Field label="Student ID (optional)" value={form.student_identifier} onChange={update('student_identifier')} />
                        <Field label="Grade level (optional)" value={form.grade_level} onChange={update('grade_level')} />
                        <Field label="Area of interest (optional)" value={form.interest_major} onChange={update('interest_major')} />
                    </>
                )}
                <Field label="Password" type="password" autoComplete="new-password" minLength="8" value={form.password} onChange={update('password')} required />
                <Field label="Confirm password" type="password" autoComplete="new-password" minLength="8" value={form.password_confirmation} onChange={update('password_confirmation')} required />
                <p className="text-xs font-semibold leading-5 text-slate-500 sm:col-span-2">Use at least eight characters with letters and numbers. We will send an email verification link after registration.</p>
                {error && <p className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700 sm:col-span-2">{error}</p>}
                <div className="sm:col-span-2"><Button type="submit" loading={loading} className="w-full py-3">Create account <ArrowRight size={16} /></Button></div>
            </form>
            <p className="mt-5 text-center text-sm font-semibold text-slate-500">Already registered? <Link to="/login" className="font-black text-emerald-700">Sign in</Link></p>
        </AuthShell>
    );
}

export function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const submit = async (event) => {
        event.preventDefault();
        setLoading(true); setMessage(''); setError('');
        try {
            const response = await api.post('/forgot-password', { email });
            setMessage(response.data?.message);
        } catch (requestError) { setError(apiError(requestError)); } finally { setLoading(false); }
    };
    return <AuthShell eyebrow="Account recovery" title="Reset your password" body="Enter your account email. The response is intentionally the same whether or not an account exists."><form onSubmit={submit} className="grid gap-4"><Field label="Email address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoFocus />{message && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{message}</p>}{error && <p className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}<Button type="submit" loading={loading} className="w-full">Send reset link</Button></form><p className="mt-5 text-center"><Link to="/login" className="text-sm font-black text-emerald-700">Back to sign in</Link></p></AuthShell>;
}

export function ResetPasswordPage() {
    const { token = '' } = useParams();
    const [search] = useSearchParams();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: search.get('email') || '', password: '', password_confirmation: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
    const submit = async (event) => {
        event.preventDefault(); setLoading(true); setError('');
        try { await api.post('/reset-password', { ...form, token }); navigate('/login?reset=1', { replace: true }); }
        catch (requestError) { setError(apiError(requestError)); } finally { setLoading(false); }
    };
    return <AuthShell eyebrow="Choose a new password" title="Secure your account" body="This reset link can only be used for the email address it was issued to."><form onSubmit={submit} className="grid gap-4"><Field label="Email" type="email" value={form.email} onChange={update('email')} required /><Field label="New password" type="password" minLength="8" value={form.password} onChange={update('password')} required /><Field label="Confirm new password" type="password" minLength="8" value={form.password_confirmation} onChange={update('password_confirmation')} required />{error && <p className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}<Button type="submit" loading={loading} className="w-full">Reset password</Button></form></AuthShell>;
}

export function VerifyEmailPage() {
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user?.email_verified && user?.access_status === 'active') window.location.replace(dashboardPath(user));
    }, [navigate, user]);

    const resend = async () => {
        setLoading(true); setError('');
        try { const response = await api.post('/email/verification-notification'); toast.push(response.data?.message || 'Verification link sent.'); }
        catch (requestError) { setError(apiError(requestError)); } finally { setLoading(false); }
    };

    const check = async () => {
        setLoading(true); setError('');
        try {
            const current = await refreshUser();
            if (current?.email_verified && current?.access_status === 'active') window.location.replace(dashboardPath(current));
            else if (current?.email_verified) toast.push('Email verified. Your account is awaiting approval.', 'info');
            else toast.push('Your email is not verified yet.', 'info');
        }
        catch (requestError) { setError(apiError(requestError)); } finally { setLoading(false); }
    };

    const awaitingApproval = user?.email_verified && user?.access_status !== 'active';

    return <AuthShell eyebrow={awaitingApproval ? 'Approval pending' : 'Verify your email'} title={awaitingApproval ? 'Your email is verified' : 'Check your inbox to finish setup'} body={awaitingApproval ? 'A platform administrator will review your account before portal access is enabled.' : `We sent a signed verification link to ${user?.email || 'your account email'}.`}><div className="text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><MailCheck size={30} /></span><p className="mt-5 text-sm font-semibold leading-6 text-slate-600">{awaitingApproval ? 'Your workspace remains protected while approval is pending. You can sign in after the account is activated.' : 'Open the link in the same browser, then return here. Your workspace data remains protected until setup is complete.'}</p>{error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}{!awaitingApproval && <div className="mt-6 grid gap-3 sm:grid-cols-2"><Button loading={loading} onClick={check}><ShieldCheck size={16} /> I verified my email</Button><Button loading={loading} variant="secondary" onClick={resend}>Resend link</Button></div>}{awaitingApproval && <div className="mt-6"><Button variant="secondary" onClick={() => window.location.assign('/login')} className="w-full">Return to sign in</Button></div>}</div></AuthShell>;
}
