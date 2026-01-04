import { Link, useLoaderData } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getRoleBasedDashboard, type User } from '@/root';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useMemo, useRef } from 'react';

interface LoaderData {
  user: User | null;
  isPublicPath: boolean;
}

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2
    }
  }
};

const drawLine = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: { 
    pathLength: 1, 
    opacity: 1,
    transition: { duration: 2, ease: "easeInOut" }
  }
};

// ============================================
// NAVBAR
// ============================================
const Navbar = ({ primaryButtonTarget, isLoggedIn }: { primaryButtonTarget: string; isLoggedIn: boolean }) => {
  const { t } = useTranslation(['landing']);
  
  return (
    <motion.nav 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 bg-[#FDFBF7]/90 backdrop-blur-sm border-b border-[#2C2C2C]/10"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="font-serif text-2xl tracking-wider text-[#2C2C2C]">
          PRISMA
        </Link>

        {/* Navigation Links - Hidden on mobile */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#philosophy" className="text-sm text-[#2C2C2C]/70 hover:text-[#2C2C2C] transition-colors font-light tracking-wide">
            Philosophy
          </a>
          <a href="#methodology" className="text-sm text-[#2C2C2C]/70 hover:text-[#2C2C2C] transition-colors font-light tracking-wide">
            Methodology
          </a>
          <a href="#growth" className="text-sm text-[#2C2C2C]/70 hover:text-[#2C2C2C] transition-colors font-light tracking-wide">
            Growth
          </a>
        </div>

        {/* CTA Button */}
        <Link
          to={primaryButtonTarget}
          className="px-6 py-2.5 text-sm font-light tracking-wide border border-[#E07A5F] text-[#E07A5F] hover:bg-[#E07A5F] hover:text-white transition-all duration-300"
        >
          {isLoggedIn ? 'Enter the Loop' : 'Get Started'}
        </Link>
      </div>
    </motion.nav>
  );
};

// ============================================
// HERO SECTION - The Cognitive Lens (b.png)
// ============================================
const HeroSection = ({ primaryButtonTarget, isLoggedIn }: { primaryButtonTarget: string; isLoggedIn: boolean }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });
  
  const imageY = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section ref={ref} className="min-h-screen bg-[#FDFBF7] pt-24 lg:pt-32 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center min-h-[70vh]">
          
          {/* Text Content */}
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-8 order-2 lg:order-1"
          >
            <motion.h1 
              variants={fadeInUp}
              className="font-serif text-4xl sm:text-5xl lg:text-6xl xl:text-7xl text-[#2C2C2C] leading-[1.1] tracking-tight"
            >
              Illuminating the{' '}
              <span className="italic text-[#E07A5F]">Black Box</span>{' '}
              of Assessment
            </motion.h1>

            <motion.div variants={fadeInUp} className="w-20 h-px bg-[#2C2C2C]/30" />

            <motion.p 
              variants={fadeInUp}
              className="text-lg lg:text-xl text-[#2C2C2C]/70 font-light leading-relaxed max-w-lg"
            >
              We move beyond automated grading. Prisma acts as a cognitive lens, 
              transforming chaotic drafts into structured, evidence-based learning journeys.
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                to={primaryButtonTarget}
                className="group bg-[#E07A5F] text-white px-8 py-4 text-sm font-light tracking-wide transition-all duration-300 hover:bg-[#c66a52] text-center"
              >
                <span className="group-hover:translate-x-1 transition-transform duration-300 inline-block">
                  {isLoggedIn ? 'Enter the Loop' : 'Begin Your Journey'}
                </span>
              </Link>

              <a
                href="#philosophy"
                className="group text-[#2C2C2C] px-8 py-4 text-sm font-light tracking-wide border border-[#2C2C2C]/30 transition-all duration-300 hover:border-[#2C2C2C] text-center"
              >
                <span className="group-hover:translate-x-1 transition-transform duration-300 inline-block">
                  Explore Philosophy
                </span>
              </a>
            </motion.div>
          </motion.div>

          {/* Image - The Prism */}
          <motion.div 
            style={{ y: imageY, opacity }}
            className="flex items-center justify-center order-1 lg:order-2"
          >
            <motion.img
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.3 }}
              src="/b.png"
              alt="The Cognitive Prism - Transforming chaos into clarity"
              className="w-full max-w-md lg:max-w-lg xl:max-w-xl mix-blend-multiply"
              style={{ filter: 'contrast(1.1)' }}
            />
          </motion.div>
        </div>
      </div>

      {/* Decorative line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#2C2C2C]/20 to-transparent" />
    </section>
  );
};

// ============================================
// PHILOSOPHY SECTION - Productive Friction (a.png)
// ============================================
const PhilosophySection = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });
  
  const imageY = useTransform(scrollYProgress, [0, 1], [50, -50]);

  return (
    <section id="philosophy" ref={ref} className="min-h-screen bg-[#FDFBF7] py-20 lg:py-32 relative">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          {/* Image - The Hand & Knot */}
          <motion.div 
            style={{ y: imageY }}
            className="flex items-center justify-center"
          >
            <motion.img
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1 }}
              src="/a.png"
              alt="The Dialectic - Hand touching the knot of understanding"
              className="w-full max-w-sm lg:max-w-md xl:max-w-lg mix-blend-multiply"
              style={{ filter: 'contrast(1.1)' }}
            />
          </motion.div>

          {/* Text Content */}
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="space-y-8"
          >
            <motion.span 
              variants={fadeInUp}
              className="text-sm tracking-[0.3em] text-[#E07A5F] uppercase font-light"
            >
              Philosophy
            </motion.span>

            <motion.h2 
              variants={fadeInUp}
              className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#2C2C2C] leading-[1.15]"
            >
              Meaningful Resistance,{' '}
              <span className="italic">Not Blind Acceptance</span>
            </motion.h2>

            <motion.div variants={fadeInUp} className="w-16 h-px bg-[#E07A5F]/50" />

            <motion.p 
              variants={fadeInUp}
              className="text-lg text-[#2C2C2C]/70 font-light leading-relaxed"
            >
              True learning happens in the struggle. Our system introduces{' '}
              <span className="text-[#E07A5F] font-medium">'Productive Friction'</span>, 
              inviting students to defend their ideas and engage in a Socratic dialogue 
              with AI, rather than passively accepting a score.
            </motion.p>

            <motion.div variants={fadeInUp} className="pt-4 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 mt-2 bg-[#E07A5F] rounded-full flex-shrink-0" />
                <p className="text-[#2C2C2C]/60 font-light">
                  <span className="text-[#2C2C2C] font-medium">Socratic Rejection</span> — 
                  Challenge assumptions, spark deeper thinking
                </p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 mt-2 bg-[#E07A5F] rounded-full flex-shrink-0" />
                <p className="text-[#2C2C2C]/60 font-light">
                  <span className="text-[#2C2C2C] font-medium">Dialectic Exchange</span> — 
                  Transform monologue into meaningful dialogue
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// ============================================
// METHODOLOGY SECTION - The Process
// ============================================
const MethodologySection = () => {
  return (
    <section id="methodology" className="bg-[#2C2C2C] py-20 lg:py-32 text-[#FDFBF7]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="text-center mb-16 lg:mb-24"
        >
          <motion.span 
            variants={fadeInUp}
            className="text-sm tracking-[0.3em] text-[#E07A5F] uppercase font-light"
          >
            Methodology
          </motion.span>
          <motion.h2 
            variants={fadeInUp}
            className="font-serif text-3xl sm:text-4xl lg:text-5xl mt-4 leading-[1.15]"
          >
            The Three Lenses
          </motion.h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {[
            {
              number: "01",
              title: "Feature Extraction",
              description: "AI analyzes structural patterns, argument flow, and evidence usage to build a comprehensive understanding."
            },
            {
              number: "02", 
              title: "Rule-Based Verification",
              description: "Transparent rubric-aligned assessment ensures every evaluation is traceable and explainable."
            },
            {
              number: "03",
              title: "Iterative Refinement",
              description: "Continuous feedback loops transform single submissions into evolving learning artifacts."
            }
          ].map((item, index) => (
            <motion.div
              key={item.number}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              className="group"
            >
              <div className="border border-[#FDFBF7]/20 p-8 lg:p-10 h-full hover:border-[#E07A5F]/50 transition-colors duration-500">
                <span className="font-serif text-5xl lg:text-6xl text-[#E07A5F]/30 group-hover:text-[#E07A5F]/60 transition-colors">
                  {item.number}
                </span>
                <h3 className="font-serif text-xl lg:text-2xl mt-4 mb-4">
                  {item.title}
                </h3>
                <p className="text-[#FDFBF7]/60 font-light leading-relaxed">
                  {item.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ============================================
// GROWTH SECTION - Metacognition (c.png)
// ============================================
const GrowthSection = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });
  
  const imageY = useTransform(scrollYProgress, [0, 1], [50, -50]);

  return (
    <section id="growth" ref={ref} className="min-h-screen bg-[#FDFBF7] py-20 lg:py-32 relative">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          {/* Text Content */}
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="space-y-8 order-2 lg:order-1"
          >
            <motion.span 
              variants={fadeInUp}
              className="text-sm tracking-[0.3em] text-[#E07A5F] uppercase font-light"
            >
              Growth
            </motion.span>

            <motion.h2 
              variants={fadeInUp}
              className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#2C2C2C] leading-[1.15]"
            >
              A Mirror for{' '}
              <span className="italic">Your Thoughts</span>
            </motion.h2>

            <motion.div variants={fadeInUp} className="w-16 h-px bg-[#E07A5F]/50" />

            <motion.p 
              variants={fadeInUp}
              className="text-lg text-[#2C2C2C]/70 font-light leading-relaxed"
            >
              Prisma doesn't just judge; it reflects. Through iterative version 
              comparisons and self-declaration prompts, we help students see their 
              own <span className="text-[#E07A5F] font-medium">cognitive growth</span> over time.
            </motion.p>

            <motion.div variants={fadeInUp} className="pt-4 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 mt-2 bg-[#E07A5F] rounded-full flex-shrink-0" />
                <p className="text-[#2C2C2C]/60 font-light">
                  <span className="text-[#2C2C2C] font-medium">Cognitive Mirroring</span> — 
                  See your thinking patterns reflected back
                </p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 mt-2 bg-[#E07A5F] rounded-full flex-shrink-0" />
                <p className="text-[#2C2C2C]/60 font-light">
                  <span className="text-[#2C2C2C] font-medium">Self-Declaration</span> — 
                  Articulate your learning intentions
                </p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 mt-2 bg-[#E07A5F] rounded-full flex-shrink-0" />
                <p className="text-[#2C2C2C]/60 font-light">
                  <span className="text-[#2C2C2C] font-medium">Version Archaeology</span> — 
                  Trace your intellectual evolution
                </p>
              </div>
            </motion.div>
          </motion.div>

          {/* Image - The Contemplation */}
          <motion.div 
            style={{ y: imageY }}
            className="flex items-center justify-center order-1 lg:order-2"
          >
            <motion.img
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1 }}
              src="/c.png"
              alt="The Contemplation - Student reflecting on their growth"
              className="w-full max-w-sm lg:max-w-md xl:max-w-lg mix-blend-multiply"
              style={{ filter: 'contrast(1.1)' }}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// ============================================
// CALL TO ACTION SECTION
// ============================================
const CTASection = ({ primaryButtonTarget, isLoggedIn }: { primaryButtonTarget: string; isLoggedIn: boolean }) => {
  return (
    <section className="bg-[#FDFBF7] py-20 lg:py-32 border-t border-[#2C2C2C]/10">
      <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="space-y-8"
        >
          <motion.h2 
            variants={fadeInUp}
            className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#2C2C2C] leading-[1.15]"
          >
            Ready to Transform{' '}
            <span className="italic text-[#E07A5F]">Assessment</span>?
          </motion.h2>

          <motion.p 
            variants={fadeInUp}
            className="text-lg text-[#2C2C2C]/70 font-light max-w-2xl mx-auto"
          >
            Join educators and students who are moving beyond grades 
            to cultivate genuine understanding.
          </motion.p>

          <motion.div variants={fadeInUp} className="pt-4">
            <Link
              to={primaryButtonTarget}
              className="inline-block bg-[#E07A5F] text-white px-10 py-4 text-sm font-light tracking-wide transition-all duration-300 hover:bg-[#c66a52]"
            >
              {isLoggedIn ? 'Enter the Loop' : 'Begin Your Journey'}
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

// ============================================
// FOOTER
// ============================================
const Footer = () => {
  return (
    <footer className="bg-[#FDFBF7] border-t border-[#2C2C2C]/10 py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="font-serif text-xl tracking-wider text-[#2C2C2C]">
            PRISMA
          </div>
          
          <p className="text-sm text-[#2C2C2C]/50 font-light">
            © {new Date().getFullYear()} Prisma. All rights reserved.
          </p>
        </div>

        <div className="mt-12 pt-8 border-t border-[#2C2C2C]/10 text-center">
          <p className="font-serif text-lg italic text-[#2C2C2C]/60">
            "Tools for thought, not just for efficiency."
          </p>
          <p className="text-xs text-[#2C2C2C]/40 mt-2 font-light">
            — Inspired by Microsoft Research
          </p>
        </div>
      </div>
    </footer>
  );
};

// ============================================
// MAIN LANDING PAGE COMPONENT
// ============================================
const PrismaLanding = () => {
  const loaderData = useLoaderData() as LoaderData | undefined;
  const user = loaderData?.user || null;
  const isLoggedIn = Boolean(user);

  const primaryButtonTarget = useMemo(() => {
    if (user && user.role) {
      return getRoleBasedDashboard(user.role);
    } else if (user) {
      return '/auth/select-role';
    } else {
      return '/auth/login';
    }
  }, [user]);

  return (
    <div className="bg-[#FDFBF7] min-h-screen font-sans antialiased">
      <Navbar primaryButtonTarget={primaryButtonTarget} isLoggedIn={isLoggedIn} />
      <HeroSection primaryButtonTarget={primaryButtonTarget} isLoggedIn={isLoggedIn} />
      <PhilosophySection />
      <MethodologySection />
      <GrowthSection />
      <CTASection primaryButtonTarget={primaryButtonTarget} isLoggedIn={isLoggedIn} />
      <Footer />
    </div>
  );
};

export { PrismaLanding };
