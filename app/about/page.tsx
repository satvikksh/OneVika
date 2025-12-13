// app/about/page.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Rocket, Users, Globe, Target, Zap, Sparkles, BookOpen,
  Award, Clock, Lightbulb, Shield, Heart, Brain, Infinity,
  ChevronRight, ExternalLink, Code, Palette, Cpu,
  Database, GitMerge, Star, Mail, MapPin, TrendingUp
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../theme-provider';

// -------------------------------------------------------------
// ANIMATION VARIANTS
// -------------------------------------------------------------
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12
    }
  }
};

const fadeInUp = {
  hidden: { y: 30, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: "easeOut"
    }
  }
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.8 }
  }
};

const scaleUp = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 15
    }
  }
};

// -------------------------------------------------------------
// REUSABLE COMPONENTS
// -------------------------------------------------------------

const SectionWrapper = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <section className={`container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 ${className}`}>
    {children}
  </section>
);

const GradientTitle = ({ children }: { children: React.ReactNode }) => (
  <motion.h2
    variants={fadeInUp}
    className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-blue-500 bg-clip-text text-transparent mb-8 text-center"
  >
    {children}
  </motion.h2>
);

const Card = ({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => (
  <motion.div
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, margin: "-100px" }}
    variants={itemVariants}
    transition={{ delay }}
    whileHover={{ 
      scale: 1.03, 
      y: -5,
      transition: { type: "spring", stiffness: 300, damping: 15 }
    }}
    className={`rounded-2xl p-6 border backdrop-blur-sm shadow-lg transition-all duration-300 ${className}`}
  >
    {children}
  </motion.div>
);

// -------------------------------------------------------------
// MAIN PAGE
// -------------------------------------------------------------

export default function AboutPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [activeTimeline, setActiveTimeline] = useState<number | null>(null);

  // TIMELINE
  const timeline = [
    { 
      year: '2020', 
      title: 'The Spark of Imagination', 
      desc: 'Satvik\'s Group begins as a digital thought experiment exploring what could be built if reality were optional.',
      icon: <Sparkles className="w-6 h-6" /> 
    },
    { 
      year: '2021', 
      title: 'The Collective Forms', 
      desc: 'First visionary members join the collective. We establish the Imaginary Institute as a conceptual framework for exploring impossible ideas.',
      icon: <Users className="w-6 h-6" /> 
    },
    { 
      year: '2022', 
      title: 'Quantum Breakthrough', 
      desc: 'Develop the conceptual framework for Quantum Constructs, our first major imaginary technology that challenges conventional physics.',
      icon: <Zap className="w-6 h-6" /> 
    },
    { 
      year: '2023', 
      title: 'Expanding Realms', 
      desc: 'Launch multiple imaginary realms including Cosmic Archives, Neural Nexus, and Chrono Visions. The collective grows to 100+ members.',
      icon: <Globe className="w-6 h-6" /> 
    },
    { 
      year: '2024', 
      title: 'Interdimensional Recognition', 
      desc: 'Receive conceptual recognition from the International Society of Imaginary Science. Publish our first manifesto on Impossible Technologies.',
      icon: <Award className="w-6 h-6" /> 
    },
    { 
      year: '2025', 
      title: 'The Great Expansion', 
      desc: 'Currently developing Stellar Forge technology and preparing for our most ambitious project: The Omniverse Bridge connecting all imaginary dimensions.',
      icon: <Rocket className="w-6 h-6" /> 
    },
  ];

  // VALUES
  const coreValues = [
    { 
      icon: <Infinity className="w-10 h-10" />, 
      title: "Boundless Imagination", 
      desc: "We believe the only limit is what we can conceive. No idea is too wild, no concept too impossible to explore and develop.", 
      color: "from-purple-500 to-pink-500" 
    },
    { 
      icon: <Brain className="w-10 h-10" />, 
      title: "Collective Intelligence", 
      desc: "Great ideas multiply when shared. Our collective thinking creates solutions and concepts no single mind could imagine alone.", 
      color: "from-blue-500 to-cyan-500" 
    },
    { 
      icon: <Shield className="w-10 h-10" />, 
      title: "Conceptual Integrity", 
      desc: "Every imaginary construct must maintain internal consistency and logical coherence, even when breaking external rules and physics.", 
      color: "from-emerald-500 to-green-500" 
    },
    { 
      icon: <Heart className="w-10 h-10" />, 
      title: "Joyful Creation", 
      desc: "We build because it brings us joy and wonder. The creative process itself is as important as the final conceptual product.", 
      color: "from-rose-500 to-red-500" 
    },
  ];

  // TEAM
  const team = [
    { 
      name: 'Satvik Kushwaha', 
      role: 'Founder & Chief Imaginator', 
      avatar: 'SG', 
      specialty: 'Concept Architecture', 
      bio: 'Visionary thinker who believes reality is just another parameter to optimize. Started the collective as a digital thought experiment to explore impossible technologies.', 
      projects: ['Quantum Constructs', 'Omniverse Bridge', 'Reality Canvas'] 
    },
    { 
      name: 'Rahul Vortex', 
      role: 'Director of Impossible Physics', 
      avatar: 'LC', 
      specialty: 'Reality Engineering', 
      bio: 'Former theoretical physicist who realized the equations were more beautiful and elegant when you could change the fundamental constants of reality itself.', 
      projects: ['Chrono Visions', 'Stellar Forge', 'Quantum Fields'] 
    },
    { 
      name: 'Nova', 
      role: 'Head of Neural Interfaces', 
      avatar: 'KN', 
      specialty: 'Cognitive Technology', 
      bio: 'Neuro-architect who designs mind-machine interfaces that currently only work in imagination, but serve as blueprints for future consciousness technology.', 
      projects: ['Neural Nexus', 'Collective Consciousness', 'Dream Engines'] 
    },
    { 
      name: 'Professor Orion Black', 
      role: 'Keeper of Cosmic Archives', 
      avatar: 'OB', 
      specialty: 'Information Paradoxes', 
      bio: 'Collector and curator of knowledge that doesn\'t exist yet. Maintains our interdimensional database of impossible facts and conceptual discoveries.', 
      projects: ['Cosmic Archives', 'Temporal Library', 'Memory Wells'] 
    },
  ];

  // TECHNOLOGIES
  const technologies = [
    { name: 'Quantum Constructs', desc: 'Build structures that occupy multiple quantum states simultaneously, defying classical physics.', icon: <Cpu /> },
    { name: 'Neural Nexus', desc: 'Connect minds across conceptual boundaries through imaginary brain-computer interfaces.', icon: <Brain /> },
    { name: 'Cosmic Archives', desc: 'Store and retrieve information in dimensions beyond conventional space-time constraints.', icon: <Database /> },
    { name: 'Chrono Visions', desc: 'View, navigate, and interact with alternate timelines and parallel universes.', icon: <Clock /> },
    { name: 'Aether Gardens', desc: 'Cultivate and study life forms from ethereal dimensions and imaginary ecosystems.', icon: <Sparkles /> },
    { name: 'Stellar Forge', desc: 'Create, manipulate, and study miniature artificial star systems and celestial phenomena.', icon: <Star /> },
    { name: 'Reality Canvas', desc: 'Paint with the fundamental fabric of spacetime itself, manipulating reality as an artistic medium.', icon: <Palette /> },
    { name: 'Paradox Engines', desc: 'Power systems that run on logical contradictions and impossible mathematical principles.', icon: <GitMerge /> },
  ];

  // STATISTICS
  const stats = [
    { label: 'Active Members', value: '150+', icon: <Users className="w-6 h-6" /> },
    { label: 'Imaginary Realms', value: '12', icon: <Globe className="w-6 h-6" /> },
    { label: 'Ongoing Projects', value: '47', icon: <Code className="w-6 h-6" /> },
    { label: 'Dimensions Explored', value: '∞', icon: <Infinity className="w-6 h-6" /> },
  ];

  return (
    <div className={`min-h-screen ${isDark ? "dark bg-gray-900" : "bg-gray-50"} transition-colors duration-300`}>
      
      {/* -------------------- HERO SECTION -------------------- */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative overflow-hidden py-20 md:py-32"
      >
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-pink-900/20" />
        <motion.div 
          animate={{ 
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{ 
            duration: 20,
            repeat: Infinity,
            repeatType: "reverse"
          }}
          className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"
        />
        <motion.div 
          animate={{ 
            x: [0, -100, 0],
            y: [0, 50, 0],
          }}
          transition={{ 
            duration: 25,
            repeat: Infinity,
            repeatType: "reverse"
          }}
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"
        />
        
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative container mx-auto px-4 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="inline-flex items-center gap-2 bg-white/10 dark:bg-gray-800/50 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-white/20 dark:border-gray-700"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">BEYOND REALITY</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-6"
          >
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              About Satvik's Group
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="max-w-3xl mx-auto text-xl text-gray-700 dark:text-gray-300 mb-8"
          >
            A collective of visionary thinkers, dreamers, and builders exploring what exists 
            at the intersection of imagination and technological possibility.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap justify-center gap-4 mt-8"
          >
            <Link 
              href="/join"
              className="group px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-500 text-white font-semibold hover:from-purple-700 hover:to-blue-600 transition-all duration-300 hover:scale-105 flex items-center gap-3"
            >
              <span>Join Our Collective</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="/manifesto"
              className="group px-8 py-4 rounded-xl bg-white/10 dark:bg-gray-800/50 backdrop-blur-sm border border-white/20 dark:border-gray-700 text-gray-900 dark:text-white font-semibold hover:bg-white/20 dark:hover:bg-gray-700/50 transition-all duration-300 hover:scale-105 flex items-center gap-3"
            >
              <BookOpen className="w-5 h-5" />
              <span>Read Our Manifesto</span>
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* -------------------- MISSION SECTION -------------------- */}
      <SectionWrapper>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
          className={`max-w-6xl mx-auto rounded-3xl p-8 md:p-12 ${isDark ? 'bg-gray-800/50' : 'bg-white'} backdrop-blur-sm border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
        >
          <motion.div variants={itemVariants} className="flex items-center gap-4 mb-8">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500">
              <Target className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Our Mission</h2>
          </motion.div>
          
          <motion.p variants={itemVariants} className="text-lg text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
            At Satvik's Group, we operate on a radical premise: <span className="font-bold text-purple-600 dark:text-purple-400">reality is optional</span>. 
            We are not constrained by physics as we know it, by economics as they exist, or by technology as it has been built.
          </motion.p>
          
          <motion.p variants={itemVariants} className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
            Instead, we imagine what could be, and then we build it—in concept, in code, and in collective consciousness. 
            We create technologies that haven't been invented, solve problems that haven't been identified, and explore realms that haven't been discovered.
          </motion.p>
        </motion.div>
      </SectionWrapper>

      {/* -------------------- VALUES SECTION -------------------- */}
      <SectionWrapper>
        <GradientTitle>Our Guiding Principles</GradientTitle>
        
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {coreValues.map((value, index) => (
            <Card 
              key={index}
              className={`${isDark ? 'bg-gray-800/50 border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-800'}`}
              delay={index * 0.1}
            >
              <div className={`w-20 h-20 rounded-xl bg-gradient-to-br ${value.color} flex items-center justify-center mx-auto text-white mb-6`}>
                {value.icon}
              </div>
              <h3 className="text-xl font-bold text-center mb-3">{value.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-center">{value.desc}</p>
            </Card>
          ))}
        </motion.div>
      </SectionWrapper>

      {/* -------------------- TIMELINE SECTION -------------------- */}
      <SectionWrapper>
        <GradientTitle>Our Journey Through Imagination</GradientTitle>
        
        <div className="relative max-w-5xl mx-auto">
          {/* Timeline line */}
          <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-gradient-to-b from-purple-500 to-blue-500" />
          
          <div className="space-y-12 relative">
            {timeline.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`flex items-center ${index % 2 === 0 ? "flex-row" : "flex-row-reverse"}`}
                onMouseEnter={() => setActiveTimeline(index)}
                onMouseLeave={() => setActiveTimeline(null)}
              >
                <div className={`w-1/2 ${index % 2 === 0 ? "pr-12 text-right" : "pl-12"}`}>
                  <Card 
                    className={`${isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-white border-gray-200'} ${activeTimeline === index ? 'ring-2 ring-purple-500/50' : ''}`}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500">
                        {item.icon}
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{item.year}</div>
                        <h3 className="text-xl font-bold">{item.title}</h3>
                      </div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">{item.desc}</p>
                  </Card>
                </div>
                
                {/* Center point */}
                <div className="absolute left-1/2 transform -translate-x-1/2">
                  <motion.div 
                    animate={{ 
                      scale: activeTimeline === index ? 1.3 : 1,
                      boxShadow: activeTimeline === index ? '0 0 20px rgba(168, 85, 247, 0.5)' : 'none'
                    }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className={`w-6 h-6 rounded-full border-4 ${isDark ? 'bg-gray-900 border-purple-400' : 'bg-white border-purple-500'}`}
                  />
                </div>
                
                <div className="w-1/2" />
              </motion.div>
            ))}
          </div>
        </div>
      </SectionWrapper>

      {/* -------------------- TEAM SECTION -------------------- */}
      <SectionWrapper>
        <GradientTitle>Meet The Collective</GradientTitle>
        
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {team.map((member, index) => (
            <Card 
              key={index}
              className={`${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}
              delay={index * 0.1}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-2xl text-white font-bold">
                    {member.avatar}
                  </div>
                  <div className="absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-600 to-blue-500 text-white">
                    {member.specialty}
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{member.name}</h3>
                  <p className="text-purple-600 dark:text-purple-400 font-medium">{member.role}</p>
                </div>
              </div>
              
              <p className="text-gray-600 dark:text-gray-400 mb-4">{member.bio}</p>
              
              <div className="space-y-2">
                <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">Notable Projects</div>
                <div className="flex flex-wrap gap-2">
                  {member.projects.map((project, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                    >
                      {project}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </motion.div>

        {/* Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={`mt-16 rounded-3xl p-8 ${isDark ? 'bg-gray-800/50' : 'bg-white'} backdrop-blur-sm border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 mb-4">
                  <div className="text-purple-600 dark:text-purple-400">
                    {stat.icon}
                  </div>
                </div>
                <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{stat.value}</div>
                <div className="text-gray-600 dark:text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </SectionWrapper>

      {/* -------------------- TECHNOLOGY SECTION -------------------- */}
      <SectionWrapper>
        <GradientTitle>Our Imaginary Technology Stack</GradientTitle>
        
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {technologies.map((tech, index) => (
            <Card 
              key={index}
              className={`${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}
              delay={index * 0.05}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-blue-500/10">
                  <div className="text-purple-600 dark:text-purple-400">
                    {tech.icon}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{tech.name}</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{tech.desc}</p>
            </Card>
          ))}
        </motion.div>
      </SectionWrapper>

      {/* -------------------- CALL TO ACTION -------------------- */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="relative py-20 md:py-32 overflow-hidden"
      >
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-blue-900/30 to-pink-900/30" />
        <motion.div 
          animate={{ 
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{ 
            duration: 15,
            repeat: Infinity,
            repeatType: "reverse"
          }}
          className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"
        />
        <motion.div 
          animate={{ 
            x: [0, -50, 0],
            y: [0, 30, 0],
          }}
          transition={{ 
            duration: 20,
            repeat: Infinity,
            repeatType: "reverse"
          }}
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"
        />
        
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          className="relative container mx-auto px-4 text-center max-w-4xl"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", delay: 0.2 }}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-white/20"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span className="text-sm font-semibold text-white">YOUR JOURNEY BEGINS HERE</span>
          </motion.div>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to Imagine With Us?
          </h2>
          
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto leading-relaxed">
            Whether you're a dreamer, a builder, a thinker, or all three—there's a place for you 
            in our collective. Bring your wildest ideas and help us build impossible things.
          </p>
          
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/join"
              className="group px-8 py-4 rounded-xl bg-white text-gray-900 font-bold hover:bg-gray-100 transition-all duration-300 hover:scale-105 hover:shadow-2xl flex items-center gap-3"
            >
              <span>Join The Collective</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/projects"
              className="group px-8 py-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white font-semibold hover:bg-white/20 transition-all duration-300 hover:scale-105 flex items-center gap-3"
            >
              <ExternalLink className="w-5 h-5" />
              <span>Explore Our Projects</span>
            </Link>
          </div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="mt-12 pt-12 border-t border-white/20"
          >
            <p className="text-white/60 text-sm">
              Satvik's Group • Imaginary Institute • Est. 2020 • ∞ Dimensions and Counting
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}