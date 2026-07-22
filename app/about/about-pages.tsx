"use client";

import Link from "next/link";
import { motion, useInView, useMotionValue, useTransform, animate, type Variants } from "framer-motion";
import {
  ArrowRight,
  Bell,
  BookOpen,
  Bot,
  Briefcase,
  CheckCircle2,
  Code2,
  Compass,
  Cookie,
  FileText,
  Flame,
  Globe2,
  HeartHandshake,
  Lock,
  MessageCircle,
  Network,
  Rocket,
  Scale,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import React, { useEffect, useRef } from "react";

const foundedDate = "December 12, 2025";

type IconCard = [string, LucideIcon, string];
type LinkCard = [string, string, string, LucideIcon];
type FeatureCard = [string, LucideIcon];
type ProgramCard = [string, string, LucideIcon];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const values: IconCard[] = [
  ["Innovation", Sparkles, "Build thoughtfully with AI, creativity, and real human needs at the center."],
  ["Privacy", Lock, "Treat personal conversations, identity, and data as something worth protecting."],
  ["Security", ShieldCheck, "Design every surface with resilience, trust, and responsible access."],
  ["Community", Users, "Create inclusive spaces where people can share, collaborate, and belong."],
  ["Transparency", FileText, "Explain decisions clearly and keep platform policies easy to understand."],
  ["Reliability", CheckCircle2, "Make OrbitByte feel fast, stable, and dependable every day."],
  ["Simplicity", Compass, "Reduce clutter so people can connect and create without friction."],
  ["AI First", Bot, "Use AI to empower people, not replace their voice or judgment."],
];

const features: FeatureCard[] = [
  ["AI Assistant", Bot],
  ["Reels", Flame],
  ["Stories", Star],
  ["Communities", Network],
  ["Messaging", MessageCircle],
  ["Voice & Video Calls", Video],
  ["AI Content Creation", Sparkles],
  ["Secure Authentication", ShieldCheck],
  ["Notifications", Bell],
  ["Bookmarks", BookOpen],
  ["Explore Feed", Compass],
  ["Premium UI", Rocket],
];

const legalLinks: LinkCard[] = [
  ["Privacy Policy", "How OrbitByte handles data, messages, AI interactions, and user rights.", "/privacy-policy", ShieldCheck],
  ["Terms & Conditions", "The rules for using OrbitByte safely and responsibly.", "/terms-and-conditions", Scale],
  ["Cookie Policy", "How cookies and local storage improve the product experience.", "/cookie-policy", Cookie],
  ["Community Guidelines", "Expectations for respectful, inclusive platform behavior.", "/community-guidelines", HeartHandshake],
  ["Content Policy", "How shared content should be created, posted, and reported.", "/content-policy", FileText],
  ["AI Usage Policy", "Responsible AI interaction, safety, and transparency principles.", "/ai-usage-policy", Bot],
  ["Copyright Policy", "Ownership, takedowns, and intellectual-property standards.", "/copyright-policy", BookOpen],
  ["Contact Support", "Reach OrbitByte for help, safety, or legal questions.", "/contact", MessageCircle],
];

const navigationCards: LinkCard[] = [
  ["About OrbitByte", "Story, mission, founder, values, highlights, and features.", "/about", Rocket],
  ["Join Our Collective", "Creator, developer, beta, ambassador, and partnership programs.", "/join", Users],
  ["Manifesto", "The beliefs behind OrbitByte and human-centered AI.", "/manifesto", BookOpen],
  ["Privacy Policy", "Data collection, security, retention, and rights.", "/privacy-policy", ShieldCheck],
  ["Terms & Conditions", "Responsibilities, rules, ownership, and platform use.", "/terms-and-conditions", Scale],
  ["Cookie Policy", "Cookie usage and product preferences.", "/cookie-policy", Cookie],
  ["Community Guidelines", "How we keep OrbitByte safe and inclusive.", "/community-guidelines", HeartHandshake],
  ["Contact Us", "Support and partnership contact paths.", "/contact", MessageCircle],
];

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f6f7fb] text-slate-950 dark:bg-[#05070b] dark:text-white">
      <div className="pointer-events-none fixed inset-0 -z-0 bg-[radial-gradient(circle_at_15%_10%,rgba(34,197,94,.13),transparent_28%),radial-gradient(circle_at_85%_5%,rgba(59,130,246,.16),transparent_32%),linear-gradient(180deg,rgba(255,255,255,.65),rgba(255,255,255,0))] dark:bg-[radial-gradient(circle_at_18%_12%,rgba(16,185,129,.18),transparent_30%),radial-gradient(circle_at_88%_8%,rgba(14,165,233,.18),transparent_32%),linear-gradient(180deg,rgba(15,23,42,.68),rgba(2,6,23,0))]" />
      <div className="relative z-10">{children}</div>
    </main>
  );
}

function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 ${className}`}>{children}</section>;
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:text-emerald-200">
      <Sparkles size={14} />
      {children}
    </span>
  );
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -5 }}
      className={`rounded-[24px] border border-white/70 bg-white/75 p-6 shadow-[0_24px_70px_rgba(15,23,42,.09)] backdrop-blur-2xl transition dark:border-white/10 dark:bg-white/[0.07] dark:shadow-black/20 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) => Math.floor(latest).toLocaleString());

  useEffect(() => {
    if (!inView) return;
    const controls = animate(motionValue, value, { duration: 1.4, ease: "easeOut" });
    return controls.stop;
  }, [inView, motionValue, value]);

  useEffect(() => rounded.on("change", (latest) => {
    if (ref.current) ref.current.textContent = `${latest}${suffix}`;
  }), [rounded, suffix]);

  return <span ref={ref}>0{suffix}</span>;
}

function NavigationGrid() {
  return (
    <Section className="pt-4">
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {navigationCards.map(([title, desc, href, Icon]) => (
          <Link key={title as string} href={href as string} className="group block">
            <GlassCard className="h-full">
              <div className="mb-5 flex items-center justify-between">
                {React.createElement(Icon as typeof Rocket, { className: "h-6 w-6 text-emerald-600 dark:text-emerald-300" })}
                <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-emerald-600" />
              </div>
              <h3 className="text-base font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{desc}</p>
            </GlassCard>
          </Link>
        ))}
      </motion.div>
    </Section>
  );
}

export function AboutExperience() {
  const stats = [
    ["Active Users", 12500, "+"],
    ["Communities", 320, "+"],
    ["AI Conversations", 86000, "+"],
    ["Posts Shared", 48000, "+"],
    ["Messages Sent", 210000, "+"],
  ];

  return (
    <PageShell>
      <section className="relative mx-auto flex min-h-[86vh] max-w-7xl flex-col justify-center px-4 pb-12 pt-24 sm:px-6 lg:px-8">
        <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-4xl">
          <motion.div variants={fadeUp}><Badge>Connect. Create. Inspire.</Badge></motion.div>
          <motion.h1 variants={fadeUp} className="mt-7 text-5xl font-black leading-[0.94] tracking-tight text-slate-950 dark:text-white sm:text-7xl lg:text-8xl">
            OrbitByte is building India&apos;s AI-powered social network.
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-7 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
            Founded by Satvik Kushwaha on {foundedDate}, OrbitByte brings secure messaging, communities, creator tools, AI assistance, and expressive social experiences into one fast, privacy-first platform.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 font-bold text-white shadow-xl transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950">
              Join OrbitByte <ArrowRight size={18} />
            </Link>
            <Link href="#features" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/70 px-6 py-3 font-bold text-slate-800 backdrop-blur-xl transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/10 dark:text-white">
              Explore Features
            </Link>
          </motion.div>
        </motion.div>
      </section>

      <NavigationGrid />

      <Section>
        <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <GlassCard>
            <Badge>Our Story</Badge>
            <h2 className="mt-5 text-3xl font-black sm:text-5xl">Built to make social networking feel trustworthy again.</h2>
            <p className="mt-5 text-slate-600 dark:text-slate-300">
              OrbitByte was created to solve the noise, insecurity, and fragmentation that make modern social platforms exhausting. The vision is an Indian social networking platform where people can communicate, collaborate, create, and discover through AI without giving up privacy or control.
            </p>
            <p className="mt-4 text-slate-600 dark:text-slate-300">
              From December 2025 to the present, OrbitByte has evolved as a product shaped by speed, safety, premium design, and practical AI experiences for everyday creators and communities.
            </p>
          </GlassCard>
          <GlassCard>
            <Badge>Founder</Badge>
            <div className="mt-5 flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-sky-500 text-2xl font-black text-white">SK</div>
              <div>
                <h3 className="text-2xl font-black">Satvik Kushwaha</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Founder, OrbitByte</p>
              </div>
            </div>
            <blockquote className="mt-6 border-l-4 border-emerald-500 pl-4 text-lg font-medium leading-8">
              “OrbitByte exists to prove that social media can be intelligent, beautiful, safe, and deeply human.”
            </blockquote>
            <div className="mt-6 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              {["2025: OrbitByte established", "Present: AI, chat, posts, calls, communities, and premium UI evolve", "Next: India’s most reliable AI-powered social network"].map((item) => (
                <div key={item} className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />{item}</div>
              ))}
            </div>
          </GlassCard>
        </div>
      </Section>

      <Section>
        <div className="grid gap-6 lg:grid-cols-2">
          <GlassCard>
            <h2 className="text-3xl font-black">Our Mission</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {["Secure", "Fast", "Privacy-first", "AI-powered"].map((item) => (
                <div key={item} className="rounded-2xl bg-slate-950/[0.04] p-4 font-bold dark:bg-white/10">{item}</div>
              ))}
            </div>
          </GlassCard>
          <GlassCard>
            <h2 className="text-3xl font-black">Future Mission</h2>
            <p className="mt-5 text-lg leading-8 text-slate-600 dark:text-slate-300">
              Our vision is to create India&apos;s most reliable AI-powered social networking platform where people can connect, collaborate, communicate, and create safely using cutting-edge artificial intelligence.
            </p>
          </GlassCard>
        </div>
      </Section>

      <Section>
        <div className="mb-8 text-center">
          <Badge>Core Values</Badge>
          <h2 className="mt-5 text-4xl font-black sm:text-5xl">Principles behind every OrbitByte experience.</h2>
        </div>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {values.map(([title, Icon, desc]) => (
            <GlassCard key={title as string}>
              {React.createElement(Icon as typeof Rocket, { className: "h-8 w-8 text-emerald-600 dark:text-emerald-300" })}
              <h3 className="mt-5 text-xl font-black">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{desc}</p>
            </GlassCard>
          ))}
        </motion.div>
      </Section>

      <Section>
        <GlassCard>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {stats.map(([label, value, suffix]) => (
              <div key={label as string} className="text-center">
                <div className="text-4xl font-black text-slate-950 dark:text-white">
                  <CountUp value={value as number} suffix={suffix as string} />
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </Section>

      <Section className="scroll-mt-20" >
        <div id="features" className="mb-8 text-center">
          <Badge>Features</Badge>
          <h2 className="mt-5 text-4xl font-black sm:text-5xl">Everything OrbitByte is becoming.</h2>
        </div>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(([title, Icon]) => (
            <GlassCard key={title as string} className="flex items-center gap-4">
              {React.createElement(Icon as typeof Rocket, { className: "h-6 w-6 text-emerald-600 dark:text-emerald-300" })}
              <span className="font-bold">{title}</span>
            </GlassCard>
          ))}
        </motion.div>
      </Section>

      <Section>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Modern Interface", "A clean, premium product experience built for repeated daily use."],
            ["Fast Performance", "Responsive feeds, messaging, calling, and discovery."],
            ["Privacy Focus", "Safety and control designed into platform foundations."],
            ["AI Integration", "Assistant workflows that help people write, explore, and create."],
            ["Future Ready", "A platform direction ready for creators, developers, and communities."],
            ["Built for Everyone", "Simple enough to use, powerful enough to grow with India."],
          ].map(([title, desc]) => (
            <GlassCard key={title}><h3 className="text-xl font-black">{title}</h3><p className="mt-3 text-slate-600 dark:text-slate-300">{desc}</p></GlassCard>
          ))}
        </div>
      </Section>

      <Section>
        <div className="mb-8 text-center">
          <Badge>Legal Center</Badge>
          <h2 className="mt-5 text-4xl font-black sm:text-5xl">Clear policies for a trusted platform.</h2>
        </div>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {legalLinks.map(([title, desc, href, Icon]) => (
            <Link key={title as string} href={href as string} className="group block">
              <GlassCard className="h-full">
                {React.createElement(Icon as typeof Rocket, { className: "h-6 w-6 text-emerald-600 dark:text-emerald-300" })}
                <h3 className="mt-5 font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{desc}</p>
                <ArrowRight className="mt-5 h-4 w-4 transition group-hover:translate-x-1" />
              </GlassCard>
            </Link>
          ))}
        </motion.div>
      </Section>
    </PageShell>
  );
}

export function JoinCollectiveExperience() {
  const programs: ProgramCard[] = [
    ["Why Join", "Shape a growing AI-powered social network from the earliest chapters.", Users],
    ["Community Benefits", "Discover people, groups, stories, ideas, and creative momentum.", HeartHandshake],
    ["Creator Program", "Build an audience with premium publishing and AI-assisted workflows.", Star],
    ["Developer Program", "Help imagine integrations, APIs, automations, and extensibility.", Code2],
    ["Beta Testing", "Try new OrbitByte features early and influence product polish.", Compass],
    ["Ambassador Program", "Represent OrbitByte in communities, campuses, and creator circles.", Globe2],
    ["Careers Coming Soon", "Future roles for builders, designers, community leads, and AI experts.", Briefcase],
    ["Open Source Contributions", "Collaborate on future public tools and community infrastructure.", Network],
    ["Partnerships", "Work with OrbitByte across education, creators, communities, and technology.", Rocket],
  ];

  return (
    <PageShell>
      <Section className="pt-28 text-center">
        <Badge>Join Our Collective</Badge>
        <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-black tracking-tight sm:text-7xl">Join the Future of Social Networking</h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
          Become part of a growing community building the next generation of AI-powered social networking.
        </p>
        <Link href="/register" className="mt-9 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-7 py-3 font-bold text-white dark:bg-white dark:text-slate-950">
          Join OrbitByte Today <ArrowRight size={18} />
        </Link>
      </Section>
      <Section>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid gap-4 md:grid-cols-3">
          {programs.map(([title, desc, Icon]) => (
            <GlassCard key={title as string}>
              {React.createElement(Icon as typeof Rocket, { className: "h-7 w-7 text-emerald-600 dark:text-emerald-300" })}
              <h2 className="mt-5 text-xl font-black">{title}</h2>
              <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{desc}</p>
            </GlassCard>
          ))}
        </motion.div>
      </Section>
    </PageShell>
  );
}

export function ManifestoExperience() {
  const beliefs = [
    "Technology should connect people.",
    "AI should empower humans.",
    "Privacy is a right.",
    "Communities should be inclusive.",
    "Creativity deserves recognition.",
    "Social media should inspire rather than divide.",
    "Innovation never stops.",
    "Trust is earned.",
    "Every voice matters.",
    "The future belongs to open collaboration.",
  ];

  return (
    <PageShell>
      <Section className="pt-28">
        <Badge>Manifesto</Badge>
        <h1 className="mt-6 max-w-5xl text-5xl font-black tracking-tight sm:text-7xl">OrbitByte Manifesto</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">We believe social technology should feel calm, creative, intelligent, and safe.</p>
      </Section>
      <Section className="pt-0">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="space-y-4">
          {beliefs.map((belief, index) => (
            <motion.div key={belief} variants={fadeUp} className="rounded-[24px] border border-white/70 bg-white/70 p-6 text-3xl font-black shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.07] sm:text-5xl">
              <span className="mr-5 text-emerald-500">{String(index + 1).padStart(2, "0")}</span>
              {belief}
            </motion.div>
          ))}
        </motion.div>
      </Section>
    </PageShell>
  );
}

export function LegalCenterExperience() {
  return (
    <PageShell>
      <Section className="pt-28 text-center">
        <Badge>Legal Center</Badge>
        <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-black tracking-tight sm:text-7xl">Policies that keep OrbitByte safe and transparent.</h1>
      </Section>
      <Section className="pt-0">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {legalLinks.map(([title, desc, href, Icon]) => (
            <Link key={title as string} href={href as string} className="group block">
              <GlassCard className="h-full">
                {React.createElement(Icon as typeof Rocket, { className: "h-7 w-7 text-emerald-600 dark:text-emerald-300" })}
                <h2 className="mt-5 text-xl font-black">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{desc}</p>
                <ArrowRight className="mt-5 h-4 w-4 transition group-hover:translate-x-1" />
              </GlassCard>
            </Link>
          ))}
        </div>
      </Section>
    </PageShell>
  );
}

export function PolicyExperience({ title, sections, updated = "July 23, 2026" }: { title: string; sections: string[]; updated?: string }) {
  return (
    <PageShell>
      <Section className="pt-28">
        <Badge>OrbitByte Legal</Badge>
        <h1 className="mt-6 max-w-4xl text-5xl font-black tracking-tight sm:text-7xl">{title}</h1>
        <p className="mt-5 text-sm font-semibold text-slate-500 dark:text-slate-400">Last Updated: {updated}</p>
      </Section>
      <Section className="pt-0">
        <GlassCard>
          <div className="grid gap-4 md:grid-cols-2">
            {sections.map((section) => (
              <div key={section} className="rounded-2xl bg-slate-950/[0.04] p-5 dark:bg-white/10">
                <h2 className="font-black">{section}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  OrbitByte maintains this section to explain responsibilities, safeguards, user choices, and platform expectations in clear language. For specific questions, contact OrbitByte support.
                </p>
              </div>
            ))}
          </div>
        </GlassCard>
      </Section>
    </PageShell>
  );
}
