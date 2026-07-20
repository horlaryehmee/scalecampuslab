import React from 'react';
import {
    ArrowRight,
    BarChart3,
    CalendarCheck2,
    CheckCircle2,
    ClipboardCheck,
    GraduationCap,
    MessageSquareText,
    School,
    ShieldCheck,
    Sparkles,
    Users,
} from 'lucide-react';
import { ButtonLink, Card } from '../../components/ui';

const workflowSteps = [
    ['01', 'Plan the visit', 'Universities create a clear outreach programme with dates, capacity, locations, and an itinerary.', CalendarCheck2],
    ['02', 'Coordinate together', 'Schools review requests, respond in one place, and keep coordinators aligned as plans change.', School],
    ['03', 'Understand the outcome', 'Participation and attendance become useful insight for improving future school engagement.', BarChart3],
];

const institutionBenefits = [
    {
        title: 'For university outreach teams',
        description: 'Build a repeatable school-engagement programme without juggling email threads, spreadsheets, and disconnected calendars.',
        icon: GraduationCap,
        cta: 'Start as a university',
        to: '/register?role=university',
        bullets: [
            'Plan and manage outreach visits',
            'Send requests to school partners',
            'Coordinate itineraries and attendance',
            'Learn from every completed visit',
        ],
    },
    {
        title: 'For school coordinators',
        description: 'Give your team one dependable place to review opportunities, organise students, and prepare for each visit.',
        icon: School,
        cta: 'Join as a school',
        to: '/register?role=school',
        bullets: [
            'Review and respond to visit requests',
            'See current schedules and itineraries',
            'Coordinate eligible student groups',
            'Keep visit communication organised',
        ],
    },
];

const capabilities = [
    [CalendarCheck2, 'Visit planning', 'Keep dates, locations, capacity, and schedules connected from the beginning.'],
    [ClipboardCheck, 'Approvals', 'Give each school a clear, accountable way to accept or decline a request.'],
    [Users, 'Student coordination', 'Prepare the right student group and maintain a reliable participation record.'],
    [MessageSquareText, 'Shared communication', 'Keep important visit updates close to the programme they relate to.'],
    [ShieldCheck, 'Role-based access', 'University, school, student, and admin workspaces show people only what they need.'],
    [BarChart3, 'Engagement insight', 'Turn confirmed participation into a clearer view of outreach performance.'],
];

const launchPlan = [
    ['Create your workspace', 'Register your university or school and add the people responsible for visit coordination.'],
    ['Set up your process', 'Define how visits should be planned, reviewed, scheduled, and communicated.'],
    ['Connect your partners', 'Bring university and school coordinators into one shared workflow.'],
    ['Run your first visit', 'Move from request to approval, itinerary, participation, and follow-up in one place.'],
];

export default function HomePage() {
    return (
        <main>
            <section className="overflow-hidden border-b border-slate-100 bg-white">
                <div className="mx-auto grid min-h-[720px] max-w-7xl items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.08fr] lg:px-8 lg:py-20">
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3.5 py-2 text-xs font-black text-slate-700">
                            <Sparkles size={14} /> Simplifying campus outreach logistics
                        </div>
                        <h1 className="mt-7 max-w-2xl text-4xl font-black leading-[1.08] tracking-[-0.05em] text-slate-950 sm:text-5xl lg:text-[3.65rem]">
                            Connect universities with high schools effortlessly.
                        </h1>
                        <p className="mt-6 max-w-xl text-base font-semibold leading-8 text-slate-600 sm:text-lg">
                            One central platform for university outreach teams to coordinate campus visits, manage itineraries, and build lasting relationships with high schools.
                        </p>
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <ButtonLink to="/register?role=university" className="w-full bg-[#171717] px-6 py-3.5 hover:bg-black sm:w-auto">
                                Start planning visits <ArrowRight size={17} />
                            </ButtonLink>
                            <ButtonLink to="/how-it-works" variant="secondary" className="w-full px-6 py-3.5 sm:w-auto">
                                View how it works
                            </ButtonLink>
                        </div>
                        <div className="mt-9 flex items-center gap-4">
                            <div className="flex -space-x-2">
                                {[
                                    ['U', 'bg-emerald-100 text-emerald-800'],
                                    ['S', 'bg-blue-100 text-blue-800'],
                                    ['C', 'bg-amber-100 text-amber-800'],
                                    ['+', 'bg-slate-100 text-slate-700'],
                                ].map(([initial, tone], index) => (
                                    <span key={`${initial}-${index}`} className={`grid h-9 w-9 place-items-center rounded-full border-2 border-white text-xs font-black ${tone}`}>{initial}</span>
                                ))}
                            </div>
                            <p className="text-sm font-bold text-slate-500">Built for universities and school partners</p>
                        </div>
                    </div>

                    <div className="relative mx-auto w-full max-w-2xl pb-8">
                        <div className="absolute -right-24 -top-20 h-72 w-72 rounded-full bg-emerald-100/70 blur-3xl" />
                        <img
                            src="/images/campus-visit-hero.png"
                            alt="University outreach coordinator speaking with visiting high-school students"
                            className="relative aspect-[1.04/1] w-full rounded-[1.75rem] object-cover shadow-2xl shadow-slate-900/15"
                        />
                        <div className="absolute -bottom-1 left-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-xl shadow-slate-900/15 sm:-left-6 sm:px-5">
                            <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><CalendarCheck2 size={22} /></span>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Scheduled today</p>
                                <p className="mt-0.5 text-lg font-black text-slate-950">12 visits</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
                <SectionIntro
                    eyebrow="A clear three-step system"
                    title="From outreach idea to a well-run visit"
                    body="ScaleCampusLab keeps the people, decisions, and visit details together, so every institution knows what happens next."
                />
                <div className="mt-12 grid gap-5 md:grid-cols-3">
                    {workflowSteps.map(([number, title, body, Icon]) => (
                        <Card key={number} className="relative overflow-hidden p-6">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-black text-emerald-700">{number}</span>
                                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Icon size={20} /></span>
                            </div>
                            <h3 className="mt-8 text-xl font-black tracking-tight text-slate-950">{title}</h3>
                            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{body}</p>
                        </Card>
                    ))}
                </div>
            </section>

            <section className="border-y border-slate-200 bg-slate-50">
                <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
                    <SectionIntro
                        eyebrow="Built for partnership"
                        title="The right workspace for both sides of the visit"
                        body="Universities and schools keep their own responsibilities while working from the same current plan."
                    />
                    <div className="mt-12 grid gap-6 lg:grid-cols-2">
                        {institutionBenefits.map(({ title, description, icon: Icon, cta, to, bullets }) => (
                            <Card key={title} className="flex h-full flex-col p-7 sm:p-8">
                                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-white"><Icon size={22} /></span>
                                <h3 className="mt-6 text-2xl font-black tracking-tight text-slate-950">{title}</h3>
                                <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">{description}</p>
                                <div className="mt-6 grid gap-3">
                                    {bullets.map((bullet) => (
                                        <p key={bullet} className="flex items-start gap-2 text-sm font-bold text-slate-700">
                                            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> {bullet}
                                        </p>
                                    ))}
                                </div>
                                <div className="mt-auto pt-8">
                                    <ButtonLink to={to} variant="secondary">{cta} <ArrowRight size={16} /></ButtonLink>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
                <SectionIntro
                    eyebrow="Everything the workflow needs"
                    title="Replace scattered coordination with one dependable process"
                    body="Each capability supports the same goal: helping institutions move a visit forward without losing context or accountability."
                />
                <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {capabilities.map(([Icon, title, body]) => (
                        <Card key={title} className="p-6">
                            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Icon size={20} /></span>
                            <h3 className="mt-5 text-lg font-black text-slate-950">{title}</h3>
                            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{body}</p>
                        </Card>
                    ))}
                </div>
            </section>

            <section className="border-y border-slate-200 bg-emerald-950 text-white">
                <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[.85fr_1.15fr] lg:px-8">
                    <SectionIntro
                        light
                        eyebrow="Your getting-started plan"
                        title="Move at a pace that works for your institution"
                        body="Begin with the team and process you already have. ScaleCampusLab gives that process structure, then helps both sides work together."
                    />
                    <div className="grid gap-3">
                        {launchPlan.map(([title, body], index) => (
                            <div key={title} className="grid grid-cols-[3rem_1fr] gap-4 rounded-2xl border border-white/10 bg-white/[0.07] p-5">
                                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-300 text-sm font-black text-emerald-950">
                                    {String(index + 1).padStart(2, '0')}
                                </span>
                                <div>
                                    <h3 className="font-black text-white">{title}</h3>
                                    <p className="mt-1 text-sm font-semibold leading-6 text-white/65">{body}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
                <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-50 to-blue-50 p-8 text-center ring-1 ring-slate-200 sm:p-14">
                    <h2 className="mx-auto max-w-3xl text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-5xl">
                        Ready to make campus outreach easier to run and easier to grow?
                    </h2>
                    <p className="mx-auto mt-5 max-w-2xl text-base font-semibold leading-7 text-slate-600">
                        Choose your institution type to create a workspace, or sign in to continue an existing programme.
                    </p>
                    <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                        <ButtonLink to="/register?role=university" className="w-full px-6 py-3.5 sm:w-auto">Start as a university <ArrowRight size={16} /></ButtonLink>
                        <ButtonLink to="/register?role=school" variant="secondary" className="w-full px-6 py-3.5 sm:w-auto">Join as a school</ButtonLink>
                        <ButtonLink to="/login" variant="ghost" className="w-full px-6 py-3.5 sm:w-auto">Log in</ButtonLink>
                    </div>
                </div>
            </section>
        </main>
    );
}

function SectionIntro({ eyebrow, title, body, light = false }) {
    return (
        <div className="max-w-3xl">
            <p className={light ? 'text-xs font-black uppercase tracking-[0.16em] text-emerald-300' : 'text-xs font-black uppercase tracking-[0.16em] text-emerald-700'}>{eyebrow}</p>
            <h2 className={light ? 'mt-3 text-3xl font-black tracking-[-0.035em] text-white sm:text-5xl' : 'mt-3 text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-5xl'}>{title}</h2>
            <p className={light ? 'mt-4 text-base font-semibold leading-7 text-white/60' : 'mt-4 text-base font-semibold leading-7 text-slate-600'}>{body}</p>
        </div>
    );
}
