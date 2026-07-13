import React, { useState } from 'react';
import { ArrowRight, CalendarCheck2, CheckCircle2, MessageSquare, School, ShieldCheck, Users } from 'lucide-react';
import { api, apiError } from '../../services/api';
import { Button, ButtonLink, Card, Field } from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';
import { useApi } from '../../hooks/useApi';

function PageHero({ eyebrow, title, body }) {
    return (
        <section className="border-b border-slate-200 bg-gradient-to-b from-emerald-50/80 to-white">
            <div className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-28">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">{eyebrow}</p>
                <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-black tracking-[-0.045em] text-slate-950 sm:text-6xl">{title}</h1>
                <p className="mx-auto mt-5 max-w-3xl text-lg font-semibold leading-8 text-slate-600">{body}</p>
            </div>
        </section>
    );
}

export function AboutPage() {
    return (
        <main>
            <PageHero eyebrow="About ScaleCampusLab" title="Better outreach starts with a shared source of truth." body="ScaleCampusLab replaces fragmented emails and spreadsheets with a coordinated platform for the people planning, approving, and attending campus visits." />
            <section className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
                <div><p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Why we exist</p><h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Campus engagement is a relationship, not a calendar entry.</h2><p className="mt-5 text-base font-semibold leading-8 text-slate-600">University outreach teams need reliable school decisions. School coordinators need accurate itineraries and rosters. Students need clarity. When those needs live in different tools, opportunities get lost. ScaleCampusLab puts the workflow, communication, and evidence in one place.</p></div>
                <div className="grid gap-4 sm:grid-cols-2">
                    {[[CalendarCheck2, 'Plan with confidence', 'Clear dates, capacity, ownership, and status.'], [School, 'Respect school workflows', 'Requests go to real school coordinators for a decision.'], [Users, 'Center students', 'Participation and visit history stay visible.'], [ShieldCheck, 'Trust the data', 'Every record stays attached to its institution and event.']].map(([Icon, title, body]) => <Card key={title}><Icon className="text-emerald-700" size={23} /><h3 className="mt-4 font-black text-slate-950">{title}</h3><p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{body}</p></Card>)}
                </div>
            </section>
        </main>
    );
}

export function HowItWorksPage() {
    const stages = [
        ['University plans', 'Create a visit program with a date, location, capacity, and itinerary. Select a connected school and send a request.'],
        ['School decides', 'The recipient school reviews the real request, approves or rejects it, and sees every later schedule update.'],
        ['Students participate', 'The school assigns its students, or eligible students register. Each student sees current visit details.'],
        ['Attendance is verified', 'The host checks students in against their registration so participation is tied to the correct event.'],
        ['Analytics update', 'University and admin reporting reflects requests, approvals, registrations, and verified attendance.'],
    ];
    return (
        <main>
            <PageHero eyebrow="How it works" title="One continuous workflow from invitation to insight." body="No manual handoffs. Every approval, roster change, itinerary item, and attendance record remains connected to the visit that created it." />
            <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
                <div className="grid gap-5">
                    {stages.map(([title, body], index) => <Card key={title} className="grid gap-5 p-6 sm:grid-cols-[4rem_1fr]"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-sm font-black text-emerald-700">{String(index + 1).padStart(2, '0')}</span><div><h2 className="text-xl font-black text-slate-950">{title}</h2><p className="mt-2 text-sm font-semibold leading-7 text-slate-600">{body}</p></div></Card>)}
                </div>
                <div className="mt-12 rounded-3xl bg-slate-950 p-8 text-center text-white"><h2 className="text-2xl font-black">Choose the workspace that fits your role.</h2><div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><ButtonLink to="/register?role=university">University workspace <ArrowRight size={16} /></ButtonLink><ButtonLink to="/register?role=school" variant="secondary">School workspace</ButtonLink></div></div>
            </section>
        </main>
    );
}

const faqs = [
    ['Who can use ScaleCampusLab?', 'University outreach teams, registered school coordinators, students connected to a school, and platform administrators each receive a role-specific workspace.'],
    ['How does a visit request work?', 'A university selects a real school account and sends a request for a published event. That recipient school—not the sender—approves or rejects the request.'],
    ['Can schools manage student groups?', 'Yes. School coordinators can maintain their student directory and assign only students who belong to their school to approved visits.'],
    ['Where does attendance data come from?', 'Attendance is recorded against registered students at the event. Analytics then use those verified participation records.'],
    ['Does the site reload after actions?', 'No. Dashboard actions use background requests, inline feedback, and refreshed server data while keeping you in the current workspace.'],
    ['What happens when an event changes?', 'Connected schools and students receive platform notifications and see the current schedule the next time data refreshes.'],
];

export function FaqPage() {
    const [open, setOpen] = useState(0);
    const managedFaqs = useApi('/public/faqs', { initialData: { data: [] } });
    const publishedFaqs = (managedFaqs.data?.data || []).map((faq) => [faq.question, faq.answer]);
    const visibleFaqs = publishedFaqs.length ? publishedFaqs : faqs;

    return (
        <main>
            <PageHero eyebrow="Frequently asked questions" title="Straight answers about campus visit coordination." body="Learn how roles, approvals, student participation, and live data work across the platform." />
            <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
                {managedFaqs.error && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800">Managed FAQs are temporarily unavailable; showing the platform guide.</p>}
                <div className="grid gap-3">{visibleFaqs.map(([question, answer], index) => <article key={question} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><button type="button" onClick={() => setOpen(open === index ? -1 : index)} className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left font-black text-slate-950"><span>{question}</span><span className="text-xl text-emerald-700">{open === index ? '−' : '+'}</span></button>{open === index && <p className="border-t border-slate-100 px-5 py-5 text-sm font-semibold leading-7 text-slate-600">{answer}</p>}</article>)}</div>
            </section>
        </main>
    );
}

export function ContactPage() {
    const toast = useToast();
    const [form, setForm] = useState({ name: '', email: '', organization: '', subject: '', message: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
    const submit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.post('/contact', form);
            setForm({ name: '', email: '', organization: '', subject: '', message: '' });
            toast.push('Your message has been received. We will reply by email.');
        } catch (requestError) {
            setError(apiError(requestError));
        } finally {
            setLoading(false);
        }
    };
    return (
        <main>
            <PageHero eyebrow="Contact" title="Tell us what your visit workflow needs." body="Send a real message to the ScaleCampusLab team. We store each enquiry so it can be reviewed and answered." />
            <section className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[.75fr_1.25fr]">
                <div><span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><MessageSquare size={22} /></span><h2 className="mt-5 text-2xl font-black text-slate-950">Start a conversation</h2><p className="mt-3 text-sm font-semibold leading-7 text-slate-600">Share your role, organization, and the coordination challenge you want to solve. Required fields are validated by the backend.</p><div className="mt-6 grid gap-3">{['Product and onboarding questions', 'University or school partnership enquiries', 'Technical support for existing accounts'].map((item) => <p key={item} className="flex items-center gap-2 text-sm font-bold text-slate-700"><CheckCircle2 size={16} className="text-emerald-600" />{item}</p>)}</div></div>
                <Card className="p-6"><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2"><Field label="Name" value={form.name} onChange={update('name')} required /><Field label="Email" type="email" value={form.email} onChange={update('email')} required /><Field label="Organization" value={form.organization} onChange={update('organization')} /><Field label="Subject" value={form.subject} onChange={update('subject')} required /><Field label="Message" as="textarea" rows="6" minLength="10" value={form.message} onChange={update('message')} required className="sm:col-span-2" />{error && <p className="sm:col-span-2 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}<div className="sm:col-span-2"><Button type="submit" loading={loading}>Send message <ArrowRight size={16} /></Button></div></form></Card>
            </section>
        </main>
    );
}
