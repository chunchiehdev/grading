import { Link, useLoaderData } from 'react-router';
import { useTranslation, Trans } from 'react-i18next';
import { getRoleBasedDashboard, type User } from '@/root';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useMemo, useRef } from 'react';
import { HeroSection } from './HeroSection';

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
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const drawLine = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 2, ease: 'easeInOut' },
  },
};

// ============================================
// PHILOSOPHY SECTION - Productive Friction (a.png)
// ============================================
const PhilosophySection = () => {
  const { t } = useTranslation('landing');
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], [50, -50]);

  return (
    <section id="philosophy" ref={ref} className="min-h-screen py-20 lg:py-32 relative bg-background dark:bg-background">
      <div className="w-full px-6 lg:px-12 xl:px-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          {/* Image - The Hand & Knot (a.png) */}
          <motion.div style={{ y: imageY }} className="flex items-center justify-center">
            <motion.img
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 1, ease: "easeOut" }}
              src="/a.png"
              alt="The Dialectic - Hand touching the knot of understanding"
              className="w-full h-auto max-h-[40vh] sm:max-h-none object-cover xl:scale-110 max-w-lg xl:max-w-xl 2xl:max-w-2xl mix-blend-multiply dark:mix-blend-screen dark:invert"
              style={{ filter: 'contrast(1.05)' }}
            />
          </motion.div>

          {/* Text Content */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
            className="space-y-10"
          >
            {/* Label */}
            <motion.span variants={fadeInUp} className="inline-block text-xs tracking-[0.25em] text-[#E07A5F] uppercase font-medium border-b border-[#E07A5F]/30 pb-2">
              {t('philosophy.label')}
            </motion.span>

            {/* Title */}
            <motion.h2
              variants={fadeInUp}
              className="font-serif text-4xl sm:text-5xl lg:text-6xl text-[#2C2C2C] dark:text-foreground leading-[1.1] tracking-tight"
            >
              {t('philosophy.title')}
            </motion.h2>

            {/* Description with Highlight */}
            <motion.p variants={fadeInUp} className="text-lg sm:text-xl text-[#2C2C2C]/80 dark:text-muted-foreground font-light leading-relaxed max-w-xl">
              <Trans
                i18nKey="landing:philosophy.description"
                components={{ 1: <span className="text-[#E07A5F] font-normal" /> }}
              />
            </motion.p>

            {/* Feature Points */}
            <motion.div variants={fadeInUp} className="pt-6 space-y-6 border-l-2 border-[#2C2C2C]/10 pl-6">
              
              {/* Socratic Point */}
              <div className="group">
                <h3 className="text-[#2C2C2C] dark:text-foreground font-serif text-xl mb-1 flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E07A5F]" />
                  {t('philosophy.points.socratic.title')}
                </h3>
                <p className="text-[#2C2C2C]/60 dark:text-muted-foreground font-light text-sm pl-4.5">
                  {t('philosophy.points.socratic.desc')}
                </p>
              </div>

              {/* Dialectic Point */}
              <div className="group">
                <h3 className="text-[#2C2C2C] dark:text-foreground font-serif text-xl mb-1 flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E07A5F]" />
                  {t('philosophy.points.dialectic.title')}
                </h3>
                <p className="text-[#2C2C2C]/60 dark:text-muted-foreground font-light text-sm pl-4.5">
                  {t('philosophy.points.dialectic.desc')}
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
  const { t } = useTranslation('landing');

  const methodologySteps = [
    {
      number: '01',
      title: t('methodology.steps.featureExtraction.title'),
      description: t('methodology.steps.featureExtraction.desc'),
    },
    {
      number: '02',
      title: t('methodology.steps.ruleBased.title'),
      description: t('methodology.steps.ruleBased.desc'),
    },
    {
      number: '03',
      title: t('methodology.steps.iterative.title'),
      description: t('methodology.steps.iterative.desc'),
    },
  ];

  return (
    <section id="methodology" className="bg-[#2C2C2C] dark:bg-card py-20 lg:py-32 text-[#FDFBF7] dark:text-card-foreground">
      <div className="w-full px-6 lg:px-12 xl:px-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
          className="text-center mb-16 lg:mb-24"
        >
          <motion.span variants={fadeInUp} className="text-sm tracking-[0.3em] text-[#E07A5F] uppercase font-light">
            {t('methodology.label')}
          </motion.span>
          <motion.h2 variants={fadeInUp} className="font-serif text-3xl sm:text-4xl lg:text-5xl mt-4 leading-[1.15]">
            {t('methodology.title')}
          </motion.h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {methodologySteps.map((item, index) => (
            <motion.div
              key={item.number}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              className="group"
            >
              <div className="border border-[#FDFBF7]/20 dark:border-white/20 p-8 lg:p-10 h-full hover:border-[#E07A5F]/50 transition-colors duration-500">
                <span className="font-serif text-5xl lg:text-6xl text-[#E07A5F]/30 group-hover:text-[#E07A5F]/60 transition-colors">
                  {item.number}
                </span>
                <h3 className="font-serif text-xl lg:text-2xl mt-4 mb-4">{item.title}</h3>
                <p className="text-[#FDFBF7]/60 dark:text-muted-foreground font-light leading-relaxed">{item.description}</p>
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
  const { t } = useTranslation('landing');
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], [50, -50]);

  return (
    <section id="growth" ref={ref} className="min-h-screen bg-[#FDFBF7] dark:bg-background py-20 lg:py-32 relative">
      <div className="w-full px-6 lg:px-12 xl:px-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Text Content */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
            className="space-y-10 order-2 lg:order-1"
          >
            {/* Label */}
            <motion.span variants={fadeInUp} className="inline-block text-xs tracking-[0.25em] text-[#E07A5F] uppercase font-medium border-b border-[#E07A5F]/30 pb-2">
              {t('growth.label')}
            </motion.span>

            {/* Title */}
            <motion.h2
              variants={fadeInUp}
              className="font-serif text-4xl sm:text-5xl lg:text-6xl text-[#2C2C2C] dark:text-foreground leading-[1.1] tracking-tight"
            >
              <Trans i18nKey="landing:growth.title" components={{ 1: <span className="italic text-[#E07A5F]" /> }} />
            </motion.h2>

            {/* Description */}
            <motion.p variants={fadeInUp} className="text-lg sm:text-xl text-[#2C2C2C]/80 dark:text-muted-foreground font-light leading-relaxed max-w-xl">
              <Trans
                i18nKey="landing:growth.description"
                components={{ 1: <span className="text-[#2C2C2C] dark:text-foreground font-medium" /> }}
              />
            </motion.p>

            {/* Feature Points */}
            <motion.div variants={fadeInUp} className="pt-6 space-y-6">
              {[
                  { key: 'mirroring', tKey: 'growth.points.mirroring' },
                  { key: 'declaration', tKey: 'growth.points.declaration' },
                  { key: 'iterative', tKey: 'growth.points.archaeology' }
              ].map((point) => (
                  <div key={point.key} className="group flex items-start gap-4">
                     <div className="w-1.5 h-1.5 mt-2.5 rounded-full bg-[#E07A5F] flex-shrink-0" />
                     <div>
                        <h3 className="text-[#2C2C2C] dark:text-foreground font-serif text-lg leading-tight mb-1">
                            {t(`${point.tKey}.title`)}
                        </h3>
                        <p className="text-[#2C2C2C]/60 dark:text-muted-foreground font-light text-sm">
                            {t(`${point.tKey}.desc`)}
                        </p>
                     </div>
                  </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Image - The Contemplation */}
          <motion.div style={{ y: imageY }} className="flex items-center justify-center order-1 lg:order-2">
            <motion.img
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 1, ease: 'easeOut' }}
              src="/c.png"
              alt="The Contemplation - Reflecting on cognitive growth"
              className="w-full h-auto max-h-[40vh] sm:max-h-none object-cover xl:scale-110 max-w-lg xl:max-w-xl 2xl:max-w-2xl mix-blend-multiply dark:mix-blend-screen dark:invert"
              style={{ filter: 'contrast(1.05)' }}
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
  const { t } = useTranslation('landing');
  return (
    <section className="bg-[#FDFBF7] dark:bg-background py-20 lg:py-32 border-t border-[#2C2C2C]/10 dark:border-border">
      <div className="w-full px-6 lg:px-12 xl:px-20 text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="space-y-8"
        >
          <motion.h2
            variants={fadeInUp}
            className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#2C2C2C] dark:text-foreground leading-[1.15]"
          >
            <Trans i18nKey="landing:cta.title" components={{ 1: <span className="italic text-[#E07A5F]" /> }} />
          </motion.h2>

          <motion.p variants={fadeInUp} className="text-lg text-[#2C2C2C]/70 dark:text-muted-foreground font-light max-w-2xl mx-auto">
            {t('cta.subtitle')}
          </motion.p>

          <motion.div variants={fadeInUp} className="pt-4">
            <Link
              to={primaryButtonTarget}
              className="inline-block bg-[#E07A5F] text-white px-10 py-4 text-sm font-light tracking-wide transition-all duration-300 hover:bg-[#c66a52]"
            >
            {isLoggedIn ? t('cta.button.user') : t('cta.button.guest')}
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
  const { t } = useTranslation('landing');
  return (
    <footer className="bg-[#FDFBF7] dark:bg-background border-t border-[#2C2C2C]/10 dark:border-border py-12 lg:py-16">
      <div className="w-full px-6 lg:px-12 xl:px-20">
        <div className="mt-12 pt-8 border-[#2C2C2C]/10 dark:border-border text-center">
          <p className="font-serif text-lg italic text-[#2C2C2C]/60 dark:text-muted-foreground">{t('footer.quote')}</p>
          <p className="text-xs text-[#2C2C2C]/40 dark:text-muted-foreground/60 mt-2 font-light">{t('footer.author')}</p>
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
    <div className="bg-background min-h-screen font-sans antialiased">
      <HeroSection />
      <PhilosophySection />
      <MethodologySection />
      <GrowthSection />
      <CTASection primaryButtonTarget={primaryButtonTarget} isLoggedIn={isLoggedIn} />
      <Footer />
    </div>
  );
};

export { PrismaLanding };
