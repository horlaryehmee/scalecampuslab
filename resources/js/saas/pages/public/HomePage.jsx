import React from 'react';
import { motion } from 'motion/react';
import {
    ArrowRight,
    BarChart3,
    Briefcase,
    CalendarCheck2,
    CheckCircle2,
    ClipboardCheck,
    Clock3,
    GraduationCap,
    Link as LinkIcon,
    MessageSquareText,
    School,
    ShieldCheck,
    Sparkles,
    Users,
} from 'lucide-react';
import { ButtonLink, Card } from '../../components/ui';

const workflowSteps = [
    ['01', 'One-Click Scheduling', 'Recruiters can see real-time availability and request slots in seconds.', CalendarCheck2, 'bg-sky-50 text-sky-700 border-sky-200', 'bg-sky-600 text-white'],
    ['02', 'Smart Itinerary Planning', 'Cluster high schools geographically to optimize your travel routes and time.', School, 'bg-emerald-50 text-emerald-700 border-emerald-200', 'bg-emerald-600 text-white'],
    ['03', 'Insightful Analytics', 'Track student engagement and visit outcomes with automated reporting tools.', BarChart3, 'bg-violet-50 text-violet-700 border-violet-200', 'bg-violet-600 text-white'],
];

const institutionBenefits = [
    {
        label: 'For Universities',
        title: 'Maximize your recruitment efforts',
        icon: GraduationCap,
        cta: 'Learn More for Higher Ed',
        to: '/register?role=university',
        image: '/images/campus-visit-hero.png',
        imageAlt: 'University students walking across a campus courtyard',
        accent: 'emerald',
        metric: ['34', 'open visit windows'],
        previewTitle: 'Regional outreach week',
        previewBody: 'Five school visits grouped into two travel days with confirmations ready for counselors.',
        bullets: [
            'Centralized database of high school profiles and policies',
            'Automated confirmations and calendar syncing',
            'Shared dashboards for collaborative planning',
            'Post-visit student engagement tracking',
        ],
    },
    {
        label: 'For High Schools',
        title: "Simplify your school's visitor management",
        icon: School,
        cta: 'Learn More for K-12',
        to: '/register?role=school',
        image: '/images/campus-visit-hero.png',
        imageAlt: 'Students and coordinators preparing for a school visit',
        dark: true,
        accent: 'blue',
        metric: ['18', 'pending requests reviewed'],
        previewTitle: 'Visitor capacity view',
        previewBody: 'Counselors can approve the right mix of college visits without crowding the school calendar.',
        bullets: [
            'Define clear visit windows and policies',
            'Reduce administrative burden with self-service booking',
            'Keep a record of all visiting institutions',
            'Enhance student exposure to diverse colleges',
        ],
    },
];

const capabilities = [
    [ClipboardCheck, 'Clear visit policies', 'Publish the rules, requirements, and approval steps every partner should follow.'],
    [Users, 'Partner directory', 'Keep school contacts, institution details, and relationship history easy to find.'],
    [MessageSquareText, 'Conversation history', 'Store decisions and important updates where future coordinators can review them.'],
    [ShieldCheck, 'Permission controls', 'Let admins, recruiters, counselors, and students access the right level of information.'],
    [CalendarCheck2, 'Operational records', 'Maintain a durable record of completed visits, participants, and next steps.'],
    [BarChart3, 'Outcome summaries', 'Package visit results into reports that leadership can review quickly.'],
];

const launchPlan = [
    ['Create your workspace', 'Register your university or school and add the people responsible for visit coordination.'],
    ['Set up your process', 'Define how visits should be planned, reviewed, scheduled, and communicated.'],
    ['Connect your partners', 'Bring university and school coordinators into one shared workflow.'],
    ['Run your first visit', 'Move from request to approval, itinerary, participation, and follow-up in one place.'],
];

const heroStats = [
    ['15.2K', 'Student visits', Users],
    ['4.5K', 'Partner schools', Briefcase],
    ['Resources', 'Shared tools', LinkIcon],
];

const heroImages = [
    '/images/campus-visit-hero.png',
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=900&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=900&auto=format&fit=crop',
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.14 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 18 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.45 },
    },
};

const imageVariants = {
    hidden: { opacity: 0, scale: 0.92 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.5, ease: 'easeOut' },
    },
};

export default function HomePage() {
    const [activeAudience, setActiveAudience] = React.useState(0);
    const selectedAudience = institutionBenefits[activeAudience];

    return (
        <main>
            <section className="w-full overflow-hidden border-b border-slate-100 bg-white">
                <div className="mx-auto grid min-h-[720px] max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-10 lg:px-8">
                    <motion.div
                        className="relative z-10 flex flex-col items-center text-center lg:items-start lg:text-left"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <motion.div variants={itemVariants} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3.5 py-2 text-xs font-black text-slate-700">
                            <Sparkles size={14} /> Simplifying campus outreach logistics
                        </motion.div>
                        <motion.h1 variants={itemVariants} className="mt-7 max-w-2xl text-4xl font-black leading-[1.08] tracking-[-0.05em] text-slate-950 sm:text-6xl">
                            Connect universities with high schools effortlessly.
                        </motion.h1>
                        <motion.p variants={itemVariants} className="mt-6 max-w-md text-base font-semibold leading-8 text-slate-600 sm:text-lg">
                            One central platform for university outreach teams to coordinate campus visits, manage itineraries, and build lasting relationships with high schools.
                        </motion.p>
                        <motion.div variants={itemVariants} className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                            <ButtonLink to="/register?role=university" className="w-full bg-[#171717] px-6 py-3.5 hover:bg-black sm:w-auto">
                                Start planning visits <ArrowRight size={17} />
                            </ButtonLink>
                            <ButtonLink to="/how-it-works" variant="secondary" className="w-full px-6 py-3.5 sm:w-auto">
                                View how it works
                            </ButtonLink>
                        </motion.div>
                        <motion.div variants={itemVariants} className="mt-12 flex flex-wrap justify-center gap-6 lg:justify-start">
                            {heroStats.map(([value, label, Icon]) => (
                                <div key={label} className="flex items-center gap-3">
                                    <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600"><Icon size={19} /></span>
                                    <div>
                                        <p className="text-xl font-black text-slate-950">{value}</p>
                                        <p className="text-sm font-semibold text-slate-500">{label}</p>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    </motion.div>

                    <motion.div
                        className="relative mx-auto h-[410px] w-full max-w-2xl sm:h-[520px]"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <div className="absolute left-10 top-8 h-16 w-16 rounded-2xl bg-blue-100/80" />
                        <div className="absolute bottom-12 right-20 h-14 w-14 rounded-xl bg-emerald-100/80" />
                        <motion.div variants={imageVariants} className="absolute left-1/2 top-0 h-52 w-52 -translate-x-1/2 rounded-2xl bg-white p-2 shadow-xl shadow-slate-900/12 sm:h-72 sm:w-72">
                            <img src={heroImages[0]} alt="University outreach visit" className="h-full w-full rounded-xl object-cover" />
                        </motion.div>
                        <motion.div variants={imageVariants} className="absolute right-0 top-[32%] h-44 w-44 rounded-2xl bg-white p-2 shadow-xl shadow-slate-900/12 sm:h-60 sm:w-60">
                            <img src={heroImages[1]} alt="Students collaborating on campus" className="h-full w-full rounded-xl object-cover" />
                        </motion.div>
                        <motion.div variants={imageVariants} className="absolute bottom-0 left-0 h-40 w-40 rounded-2xl bg-white p-2 shadow-xl shadow-slate-900/12 sm:h-56 sm:w-56">
                            <img src={heroImages[2]} alt="School coordinators discussing visit plans" className="h-full w-full rounded-xl object-cover" />
                        </motion.div>
                        <div className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-xl shadow-slate-900/15 sm:flex">
                            <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><CalendarCheck2 size={22} /></span>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Scheduled today</p>
                                <p className="mt-0.5 text-lg font-black text-slate-950">12 visits</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            <section className="bg-[linear-gradient(135deg,#eff6ff_0%,#ecfdf5_48%,#f5f3ff_100%)] px-4 py-20 text-slate-950 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-5xl">
                    <div className="mx-auto max-w-2xl text-center">
                        <span className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
                            Recruitment toolkit
                        </span>
                        <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-4xl">
                            Everything you need for efficient outreach
                        </h2>
                        <p className="mt-3 text-base font-semibold leading-7 text-slate-600">
                            Eliminate the back-and-forth emails and scheduling conflicts with our specialized recruitment toolkit.
                        </p>
                    </div>
                    <div className="mt-12 grid gap-6 sm:grid-cols-3">
                    {workflowSteps.map(([number, title, body, Icon, iconTone, badgeTone]) => (
                        <Card key={number} className="relative overflow-hidden rounded-lg border-white/70 bg-white/90 p-6 shadow-lg shadow-slate-900/[0.06]">
                            <span className={`absolute right-6 top-6 rounded-full px-2.5 py-1 font-mono text-xs font-black tabular-nums ${badgeTone}`}>
                                {number}
                            </span>
                            <span className={`absolute inset-x-0 top-0 h-1 ${badgeTone.split(' ')[0]}`} />
                            <div>
                                <span className={`flex h-12 w-12 items-center justify-center border ${iconTone}`}>
                                    <Icon size={20} aria-hidden="true" />
                                </span>
                                <h3 className="mt-5 text-base font-black tracking-tight text-slate-950">{title}</h3>
                                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{body}</p>
                            </div>
                        </Card>
                    ))}
                    </div>
                </div>
            </section>

            <section className="border-y border-slate-200 bg-[#f7faf9]">
                <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
                    <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
                        <SectionIntro
                            eyebrow="Built for partnership"
                            title="One shared visit flow, tuned for each team"
                            body="Switch between the university and high school workspaces to see how each side plans, approves, tracks, and follows up on recruitment visits."
                        />
                        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm shadow-slate-900/[0.04] sm:grid-cols-2">
                            {institutionBenefits.map((audience, index) => {
                                const Icon = audience.icon;
                                const active = activeAudience === index;
                                return (
                                    <button
                                        key={audience.label}
                                        type="button"
                                        onClick={() => setActiveAudience(index)}
                                        className={`group flex min-h-24 items-center gap-4 rounded-xl px-4 text-left transition ${
                                            active
                                                ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/15'
                                                : 'bg-slate-50 text-slate-700 hover:bg-white hover:shadow-sm'
                                        }`}
                                        aria-pressed={active}
                                    >
                                        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${
                                            active ? 'bg-white/12 text-emerald-300' : 'bg-white text-emerald-700 shadow-sm'
                                        }`}>
                                            <Icon size={22} />
                                        </span>
                                        <span>
                                            <span className="block text-xs font-black uppercase tracking-[0.12em] opacity-70">{audience.label}</span>
                                            <span className="mt-1 block text-sm font-black leading-5">{audience.title}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <motion.div
                        key={selectedAudience.label}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                        className="mt-12 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/[0.07]"
                    >
                        <AudienceFeature {...selectedAudience} imageRight={activeAudience === 1} />
                    </motion.div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
                <SectionIntro
                    eyebrow="Operational foundation"
                    title="Keep every recruitment relationship documented"
                    body="Beyond booking visits, ScaleCampusLab preserves the context your teams need before, during, and after every school partnership."
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

function AudienceFeature({ label, title, icon: Icon, cta, to, bullets, image, imageAlt, imageRight = false, accent = 'emerald', metric, previewTitle, previewBody }) {
    const accentClasses = {
        emerald: {
            icon: 'bg-emerald-50 text-emerald-700',
            line: 'bg-emerald-500',
            soft: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
            button: 'bg-[#075f56] hover:bg-[#054b45]',
            check: 'text-emerald-600',
        },
        blue: {
            icon: 'bg-blue-50 text-blue-700',
            line: 'bg-blue-500',
            soft: 'bg-blue-50 text-blue-800 ring-blue-100',
            button: 'bg-blue-600 hover:bg-blue-700',
            check: 'text-blue-600',
        },
    }[accent];

    return (
        <div className="grid items-stretch lg:grid-cols-2">
            <div className={`relative min-h-[390px] overflow-hidden bg-slate-950 ${imageRight ? 'lg:order-2' : ''}`}>
                <img src={image} alt={imageAlt} className="absolute inset-0 h-full w-full object-cover opacity-90 transition duration-500 hover:scale-[1.03]" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.08),rgba(15,23,42,0.72))]" />
                <div className="absolute left-5 top-5 rounded-2xl border border-white/15 bg-white/90 p-4 shadow-xl shadow-black/20 backdrop-blur sm:left-7 sm:top-7">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Workspace signal</p>
                    <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{metric?.[0]}</p>
                    <p className="mt-1 max-w-40 text-sm font-bold leading-5 text-slate-600">{metric?.[1]}</p>
                </div>
                <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/15 bg-slate-950/82 p-5 text-white shadow-2xl shadow-black/25 backdrop-blur sm:inset-x-7 sm:bottom-7">
                    <div className="flex items-start gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 text-emerald-300">
                            <Clock3 size={21} />
                        </span>
                        <div>
                            <p className="font-black">{previewTitle}</p>
                            <p className="mt-1 text-sm font-semibold leading-6 text-white/70">{previewBody}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
                <p className={`inline-flex w-fit items-center gap-3 rounded-full px-3.5 py-2 text-sm font-black ring-1 ${accentClasses.soft}`}>
                    <Icon size={18} strokeWidth={2.3} /> {label}
                </p>
                <h3 className="mt-6 max-w-xl text-3xl font-black leading-tight tracking-[-0.035em] text-slate-950 sm:text-5xl">
                    {title}
                </h3>
                <div className="mt-8 grid gap-3">
                    {bullets.map((bullet, index) => (
                        <motion.div
                            key={bullet}
                            initial={{ opacity: 0, x: 14 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.28, delay: index * 0.06 }}
                            className="group grid grid-cols-[2.75rem_1fr] items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-md hover:shadow-slate-900/[0.05]"
                        >
                            <span className={`grid h-11 w-11 place-items-center rounded-xl bg-white shadow-sm ${accentClasses.check}`}>
                                <CheckCircle2 size={21} strokeWidth={2.3} />
                            </span>
                            <span>
                                <span className="block text-sm font-black text-slate-950">{bullet}</span>
                                <span className={`mt-3 block h-1.5 overflow-hidden rounded-full bg-slate-200`}>
                                    <span className={`block h-full rounded-full ${accentClasses.line}`} style={{ width: `${88 - index * 9}%` }} />
                                </span>
                            </span>
                        </motion.div>
                    ))}
                </div>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <ButtonLink to={to} className={`${accentClasses.button} px-5 py-3`}>
                        {cta} <ArrowRight size={16} />
                    </ButtonLink>
                    <ButtonLink to="/how-it-works" variant="secondary" className="px-5 py-3">
                        Explore workflow
                    </ButtonLink>
                </div>
            </div>
        </div>
    );
}
