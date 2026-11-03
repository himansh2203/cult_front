import { AnimatePresence, motion, useScroll, useSpring, useTransform } from 'motion/react'
import { ArrowRight, ArrowUpRight, Check, Clock, Dumbbell, Flame, HeartPulse, MapPin, Phone, Quote, ShieldCheck, Sparkles, Star, Timer, Trophy, Zap } from 'lucide-react'
import { FaFacebookF, FaInstagram, FaWhatsapp, FaYoutube } from 'react-icons/fa6'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { submitQuery } from '../lib/api'
import { inr } from '../lib/format'
import { planCatalog } from '../lib/seed'
import { Counter, Magnetic, Reveal, SplitHeading, TiltCard, useSpotlight } from '../components/ui/Effects'
import { Scene3D } from '../components/three/Scene3D'
import { loadBiometricScene, loadHeroScene } from '../components/three/loaders'
import type { ScanState } from '../components/three/BiometricScene'
import './landing.css'

const img = (id: string, w = 1000) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=82`

const stats = [
  { value: 1248, suffix: '+', label: 'Members trained' },
  { value: 99.8, suffix: '%', label: 'Gate uptime', decimals: 1 },
  { value: 0.8, suffix: 's', label: 'Avg. check-in', decimals: 1 },
  { value: 4.9, suffix: '/5', label: 'Member rating', decimals: 1 },
]

const pillars = [
  { icon: Zap, title: 'Frictionless entry', body: 'Fingerprint at the turnstile, attendance logged, membership verified — in under a second.' },
  { icon: ShieldCheck, title: 'Strict, fair access', body: 'Expired, suspended or unknown fingerprints are denied with a clear reason and full audit trail.' },
  { icon: HeartPulse, title: 'Coaching that compounds', body: 'Assessments, progress reviews and trainer touchpoints are tied to every visit you make.' },
]

const schedule = [
  { time: '05:30', title: 'Strength Lab', coach: 'Coach Arjun', intensity: 'Heavy', hour: 5, length: 75 },
  { time: '07:00', title: 'Metcon Burn', coach: 'Coach Riya', intensity: 'High', hour: 7, length: 50 },
  { time: '12:30', title: 'Lunch Express', coach: 'Coach Zoya', intensity: 'Moderate', hour: 12, length: 40 },
  { time: '18:30', title: 'Hypertrophy Club', coach: 'Coach Kabir', intensity: 'Focused', hour: 18, length: 70 },
  { time: '20:00', title: 'Fight Conditioning', coach: 'Coach Imran', intensity: 'High', hour: 20, length: 60 },
]

const gallery = [
  { title: 'Strength floor', detail: 'Plate-loaded machines, 12 racks, calibrated plates', src: img('photo-1593079831268-3381b0db4a77', 1400), span: 'wide' },
  { title: 'Functional turf', detail: 'Sleds, ropes, carries and athletic work', src: img('photo-1517836357463-d25dfeac3438') },
  { title: 'Cardio deck', detail: 'Connected cardio with biometric tracking', src: img('photo-1571902943202-507ec2618e8f') },
  { title: 'Recovery lounge', detail: 'Mobility, assessments and stretch zone', src: img('photo-1540497077202-7c8a3999166f') },
  { title: 'Personal coaching', detail: 'One-on-one programming', src: img('photo-1571019613914-85f342c6a11e') },
]

const rail = [
  { title: 'Olympic lifting', src: img('photo-1534258936925-c58bed479fcb', 700) },
  { title: 'Boxing conditioning', src: img('photo-1549719386-74dfcbf7dbed', 700) },
  { title: 'Machine zone', src: img('photo-1581009146145-b5ef050c2e1e', 700) },
  { title: 'Group training', src: img('photo-1518611012118-696072aa579a', 700) },
  { title: 'Evening energy', src: img('photo-1576678927484-cc907957088c', 700) },
  { title: 'Assessments', src: img('photo-1599058917212-d750089bc07e', 700) },
  { title: 'Progress tracking', src: img('photo-1605296867304-46d5465a13f1', 700) },
]

const testimonials = [
  { name: 'Ananya R.', role: 'Member · 14 months', quote: 'Fingerprint in, straight to the rack. No queue, no card, no excuses. Down 11 kg and still going.' },
  { name: 'Vikram S.', role: 'Powerlifter', quote: 'Calibrated plates, proper platforms and coaches who actually program. Best strength floor in the city.' },
  { name: 'Meera K.', role: 'Member · 6 months', quote: 'The renewal reminders and progress reviews kept me consistent for the first time in my life.' },
  { name: 'Rohan M.', role: 'Corporate plan', quote: 'Our whole team trains here. Access hours work around our shifts and billing is painless.' },
  { name: 'Isha P.', role: 'Transformation 90', quote: 'The 90-day plan is the real deal — InBody scans every month and a coach who notices everything.' },
]

const faqs = [
  { q: 'How does fingerprint entry work?', a: 'During onboarding we enrol your fingerprint on our secure reader. Only an encrypted template ID is stored — never an image of your finger. At the gate, the edge system checks your membership in real time and opens the turnstile.' },
  { q: 'What if the internet goes down?', a: 'Our local edge agent keeps an encrypted cache of active members, so entry keeps working offline and every event syncs to the cloud the moment we reconnect.' },
  { q: 'Can I freeze or upgrade my plan?', a: 'Yes. Upgrades are pro-rated instantly at the front desk, and Transformation 90 / Annual Black members can freeze for up to 30 days per year.' },
  { q: 'Do you offer a trial?', a: 'Book a tour with the form below and we will set you up with a guided trial session and a free movement assessment.' },
]

const goals = [
  { id: 'strength', label: 'Build strength', icon: Dumbbell },
  { id: 'fatloss', label: 'Lose fat', icon: Flame },
  { id: 'fitness', label: 'Stay fit', icon: HeartPulse },
  { id: 'compete', label: 'Compete', icon: Trophy },
] as const

const socials = [
  { label: 'Instagram', href: 'https://instagram.com', Icon: FaInstagram },
  { label: 'Facebook', href: 'https://facebook.com', Icon: FaFacebookF },
  { label: 'YouTube', href: 'https://youtube.com', Icon: FaYoutube },
  { label: 'WhatsApp', href: 'https://wa.me/919876543210', Icon: FaWhatsapp },
]

export default function LandingPage({ onOpenAdmin }: { onOpenAdmin: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(planCatalog[1]!.name)
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30 })
  const spotlight = useSpotlight<HTMLElement>()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const choosePlan = (plan: string) => {
    setSelectedPlan(plan)
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
  }

  const close = () => setMenuOpen(false)

  return (
    <main className="lp" ref={spotlight}>
      <motion.div className="lp-progress" style={{ scaleX: progress }} />
      <div className="lp-cursor-glow" aria-hidden="true" />
      <div className="lp-noise" aria-hidden="true" />

      <nav className={`lp-nav ${scrolled ? 'is-scrolled' : ''}`} aria-label="Website navigation">
        <a className="lp-brand" href="#home" aria-label="Cult Fitness home"><img src="/cult-logo.svg" alt="" /></a>
        <button type="button" className="lp-burger" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
          <span /><span /><span />
        </button>
        <div className={`lp-links ${menuOpen ? 'open' : ''}`}>
          <a href="#experience" onClick={close}>Experience</a>
          <a href="#schedule" onClick={close}>Schedule</a>
          <a href="#plans" onClick={close}>Plans</a>
          <a href="#access" onClick={close}>Smart Access</a>
          <a href="#faq" onClick={close}>FAQ</a>
          <button type="button" className="lp-nav-cta" onClick={() => { close(); onOpenAdmin() }}>Admin Console <ArrowUpRight size={15} /></button>
        </div>
      </nav>

      <Hero onOpenAdmin={onOpenAdmin} />

      <div className="lp-marquee" aria-label="Club highlights">
        <div className="lp-marquee-track">
          {Array.from({ length: 2 }).flatMap((_, copy) =>
            ['Open 5 AM – 11 PM', 'Biometric gate access', 'Certified coaches', 'Calibrated strength floor', 'InBody assessments', 'Recovery lounge', 'Offline-safe entry'].map((item) => (
              <span key={`${copy}-${item}`}><Sparkles size={14} /> {item}</span>
            )),
          )}
        </div>
      </div>

      <section className="lp-section" id="experience">
        <div className="lp-heading">
          <p className="lp-kicker">Member experience</p>
          <SplitHeading text="Engineered from reception to the last rep." />
        </div>
        <div className="lp-pillars">
          {pillars.map((pillar, index) => (
            <Reveal key={pillar.title} delay={index * 0.1}>
              <TiltCard className="lp-pillar">
                <span className="lp-pillar-icon"><pillar.icon size={22} /></span>
                <span className="lp-pillar-index">0{index + 1}</span>
                <h3>{pillar.title}</h3>
                <p>{pillar.body}</p>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      <Schedule />

      <section className="lp-section" aria-label="Inside the club">
        <div className="lp-heading">
          <p className="lp-kicker">Inside the club</p>
          <SplitHeading text="Every corner built for serious training." />
        </div>
        <div className="lp-bento">
          {gallery.map((item, index) => (
            <Reveal key={item.title} delay={index * 0.06} className={`lp-bento-item ${item.span ?? ''}`}>
              <TiltCard className="lp-bento-card" intensity={6}>
                <img src={item.src} alt={item.title} loading="lazy" />
                <div><strong>{item.title}</strong><span>{item.detail}</span></div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="lp-rail-section" aria-label="Training atmosphere">
        <div className="lp-rail">
          {[...rail, ...rail].map((item, index) => (
            <figure key={`${item.title}-${index}`} className="lp-rail-card">
              <img src={item.src} alt="" loading="lazy" />
              <figcaption>{item.title}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <PlanFinder onChoose={choosePlan} />

      <section className="lp-section" id="plans">
        <div className="lp-heading">
          <p className="lp-kicker">Memberships</p>
          <SplitHeading text="Pick the commitment. We handle the rest." />
        </div>
        <div className="lp-plans">
          {planCatalog.map((plan, index) => {
            const featured = plan.name === 'Transformation 90'
            return (
              <Reveal key={plan.name} delay={index * 0.08}>
                <TiltCard className={`lp-plan ${featured ? 'featured' : ''}`} intensity={8}>
                  {featured && <span className="lp-plan-badge">Most popular</span>}
                  <h3>{plan.name}</h3>
                  <div className="lp-plan-price"><strong>{inr(plan.price)}</strong><span>/ {plan.days} days</span></div>
                  <p className="lp-plan-effective">≈ {inr(Math.round((plan.price / plan.days) * 30))} per month</p>
                  <ul>
                    {plan.perks.split(', ').map((perk) => <li key={perk}><Check size={15} /> {perk}</li>)}
                    <li><Check size={15} /> Access {plan.window}</li>
                  </ul>
                  <button type="button" className={featured ? 'lp-btn primary' : 'lp-btn ghost'} onClick={() => choosePlan(plan.name)}>Enquire now <ArrowRight size={16} /></button>
                </TiltCard>
              </Reveal>
            )
          })}
        </div>
      </section>

      <AccessDemo />

      <section className="lp-section lp-testimonials" aria-label="Member stories">
        <div className="lp-heading center">
          <p className="lp-kicker">Member stories</p>
          <SplitHeading text="Results people talk about." />
        </div>
        <div className="lp-quote-rail">
          {[...testimonials, ...testimonials].map((item, index) => (
            <article className="lp-quote" key={`${item.name}-${index}`}>
              <Quote size={22} />
              <p>{item.quote}</p>
              <div className="lp-stars" aria-label="5 stars">{Array.from({ length: 5 }).map((_, star) => <Star key={star} size={13} fill="currentColor" />)}</div>
              <footer><strong>{item.name}</strong><span>{item.role}</span></footer>
            </article>
          ))}
        </div>
      </section>

      <Faq />

      <section className="lp-section lp-contact" id="contact">
        <div className="lp-contact-copy">
          <p className="lp-kicker">Start today</p>
          <SplitHeading text="Book your tour of Cult Fitness." />
          <p>Tell us your goal and preferred timing. Your query goes straight to the club owner and reception team.</p>
          <div className="lp-contact-actions">
            <a className="lp-call" href="tel:+919876543210" aria-label="Call Cult Fitness reception at +91 98765 43210">
              <span><Phone size={18} /></span>
              <div><strong>Call reception</strong><small>+91 98765 43210</small></div>
            </a>
            <a className="lp-call whatsapp" href="https://wa.me/919876543210" target="_blank" rel="noreferrer">
              <span><FaWhatsapp size={18} /></span>
              <div><strong>WhatsApp us</strong><small>Replies in ~5 min</small></div>
            </a>
          </div>
          <div className="lp-contact-meta">
            <span><Clock size={15} /> Mon–Sun · 05:00 – 23:00</span>
            <span><MapPin size={15} /> Main Branch, City Centre</span>
          </div>
        </div>
        <QueryForm plan={selectedPlan} onPlanChange={setSelectedPlan} />
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-top">
          <div>
            <img src="/cult-logo.svg" alt="Cult Fitness" />
            <p>A premium strength club with smart, biometric access — built so you show up, train hard and stay consistent.</p>
          </div>
          <div className="lp-footer-links">
            <a href="#experience">Experience</a>
            <a href="#plans">Plans</a>
            <a href="#access">Smart access</a>
            <a href="#contact">Contact</a>
            <button type="button" onClick={onOpenAdmin}>Admin console</button>
          </div>
          <div className="lp-socials" aria-label="Social media links">
            {socials.map(({ label, href, Icon }) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label}><Icon size={18} /></a>
            ))}
          </div>
        </div>
        <div className="lp-footer-word" aria-hidden="true">CULT</div>
        <p className="lp-footer-legal">© {new Date().getFullYear()} Cult Fitness Club. All rights reserved.</p>
      </footer>
    </main>
  )
}

function Hero({ onOpenAdmin }: { onOpenAdmin: () => void }) {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const sceneY = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])
  const copyY = useTransform(scrollYProgress, [0, 1], ['0%', '-18%'])
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  return (
    <section className="lp-hero" id="home" ref={ref}>
      <div className="lp-aurora" aria-hidden="true"><span /><span /><span /></div>
      <motion.div className="lp-hero-copy" style={{ y: copyY, opacity: fade }}>
        <motion.p className="lp-pill" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <span className="lp-live-dot" /> 186 members training right now
        </motion.p>
        <SplitHeading as="h1" text="Train like it matters. Enter like the future." className="lp-hero-title" delay={0.15} />
        <motion.p className="lp-hero-sub" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.8 }}>
          High-performance floors, certified coaches and sub-second biometric entry. Cult Fitness is the premium club for people who train seriously.
        </motion.p>
        <motion.div className="lp-hero-actions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75, duration: 0.8 }}>
          <Magnetic><a className="lp-btn primary" href="#plans">Explore memberships <ArrowRight size={17} /></a></Magnetic>
          <Magnetic><button type="button" className="lp-btn ghost" onClick={onOpenAdmin}>Owner console <ArrowUpRight size={17} /></button></Magnetic>
        </motion.div>
        <div className="lp-stats">
          {stats.map((stat) => (
            <div key={stat.label}>
              <strong><Counter value={stat.value} format={(value) => value.toFixed(stat.decimals ?? 0)} />{stat.suffix}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </motion.div>
      <motion.div className="lp-hero-visual" style={{ y: sceneY }}>
        <Scene3D load={loadHeroScene} props={{}} fallback={<img className="lp-hero-fallback" src={img('photo-1534438327276-14e5300c3a48', 1200)} alt="Gym training floor" />} />
        <motion.div className="lp-float a" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1 }}>
          <span><Zap size={14} /> Biometric entry</span><strong>0.8s check-in</strong>
        </motion.div>
        <motion.div className="lp-float b" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.2 }}>
          <span><Flame size={14} /> Tonight 18:30</span><strong>Hypertrophy Club</strong>
        </motion.div>
        <motion.div className="lp-float c" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4 }}>
          <span><ShieldCheck size={14} /> Access verified</span><strong>Rahul K. · Gold</strong>
        </motion.div>
      </motion.div>
      <a href="#experience" className="lp-scroll-cue" aria-label="Scroll to content"><span /></a>
    </section>
  )
}

function Schedule() {
  const hour = new Date().getHours()
  return (
    <section className="lp-section" id="schedule">
      <div className="lp-heading">
        <p className="lp-kicker">Signature training</p>
        <SplitHeading text="Sessions that make the floor feel alive." />
      </div>
      <div className="lp-schedule">
        {schedule.map((item, index) => {
          const live = hour === item.hour
          const done = hour > item.hour
          return (
            <Reveal key={item.title} delay={index * 0.07}>
              <article className={`lp-class ${live ? 'live' : ''} ${done ? 'done' : ''}`}>
                <time>{item.time}</time>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.coach} · <Timer size={13} /> {item.length} min</p>
                </div>
                <span className="lp-class-tag">{live ? 'Live now' : item.intensity}</span>
              </article>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}

function PlanFinder({ onChoose }: { onChoose: (plan: string) => void }) {
  const [goal, setGoal] = useState<(typeof goals)[number]['id']>('strength')
  const [days, setDays] = useState(4)
  const [offPeak, setOffPeak] = useState(false)

  const recommendation = useMemo(() => {
    if (offPeak && days <= 4 && goal !== 'compete') return planCatalog[0]!
    if (goal === 'compete' || days >= 6) return planCatalog[3]!
    if (goal === 'fatloss' || goal === 'strength') return planCatalog[2]!
    return planCatalog[1]!
  }, [goal, days, offPeak])

  return (
    <section className="lp-section lp-finder" aria-label="Plan finder">
      <div className="lp-heading">
        <p className="lp-kicker">Plan finder · 10 seconds</p>
        <SplitHeading text="Not sure which plan? Let us match you." />
      </div>
      <div className="lp-finder-grid">
        <div className="lp-finder-form">
          <fieldset>
            <legend>Your main goal</legend>
            <div className="lp-goal-row">
              {goals.map((item) => (
                <button type="button" key={item.id} className={goal === item.id ? 'active' : ''} onClick={() => setGoal(item.id)} aria-pressed={goal === item.id}>
                  <item.icon size={18} /> {item.label}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="lp-range">
            <span>Training days per week <b>{days}</b></span>
            <input type="range" min={1} max={7} value={days} onChange={(event) => setDays(Number(event.target.value))} />
          </label>
          <label className="lp-switch">
            <input type="checkbox" checked={offPeak} onChange={(event) => setOffPeak(event.target.checked)} />
            <span aria-hidden="true" />
            I can train off-peak (06:00 – 16:00)
          </label>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={recommendation.name}
            className="lp-finder-result"
            initial={{ opacity: 0, rotateY: -25, scale: 0.94 }}
            animate={{ opacity: 1, rotateY: 0, scale: 1 }}
            exit={{ opacity: 0, rotateY: 25, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          >
            <span className="lp-kicker">Your match</span>
            <h3>{recommendation.name}</h3>
            <strong>{inr(recommendation.price)} <small>/ {recommendation.days} days</small></strong>
            <p>{recommendation.perks}</p>
            <button type="button" className="lp-btn primary" onClick={() => onChoose(recommendation.name)}>Claim this plan <ArrowRight size={16} /></button>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}

function AccessDemo() {
  const [state, setState] = useState<ScanState>('idle')
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), [])

  const runScan = () => {
    if (state === 'scanning') return
    timers.current.forEach((timer) => window.clearTimeout(timer))
    setState('scanning')
    const granted = Math.random() > 0.2
    timers.current = [
      window.setTimeout(() => setState(granted ? 'granted' : 'denied'), 1600),
      window.setTimeout(() => setState('idle'), 4200),
    ]
  }

  const messages: Record<ScanState, [string, string]> = {
    idle: ['Place finger', 'Tap the scanner to try it'],
    scanning: ['Scanning…', 'Matching template on edge agent'],
    granted: ['Access granted', 'Welcome back, Rahul · Gold valid'],
    denied: ['Access denied', 'Membership expired — see reception'],
  }

  return (
    <section className="lp-section lp-access" id="access">
      <div className="lp-access-copy">
        <p className="lp-kicker">Smart entry</p>
        <SplitHeading text="Biometric access that never makes you wait." />
        <p>Our edge agent sits inside the club, talking to the fingerprint reader and turnstile directly. Membership, schedule and anti-passback rules are checked locally in milliseconds — even if the internet drops.</p>
        <ul className="lp-checklist">
          {['Encrypted template IDs, never fingerprint images', 'Works offline with secure local cache', 'Every attempt logged with reason codes', 'Instant revoke when a plan expires'].map((item) => (
            <li key={item}><Check size={16} /> {item}</li>
          ))}
        </ul>
      </div>
      <div role="button" tabIndex={0} className={`lp-scanner state-${state}`} onClick={runScan} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); runScan() } }} aria-label="Run biometric scan demo">
        <Scene3D load={loadBiometricScene} props={{ state }} fallback={<div className="fp-fallback" />} />
        <div className="lp-scanner-hud">
          <AnimatePresence mode="wait">
            <motion.div key={state} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <strong>{messages[state][0]}</strong>
              <span>{messages[state][1]}</span>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}

function Faq() {
  const [open, setOpen] = useState(0)
  return (
    <section className="lp-section lp-faq" id="faq">
      <div className="lp-heading">
        <p className="lp-kicker">FAQ</p>
        <SplitHeading text="Questions, answered." />
      </div>
      <div className="lp-faq-list">
        {faqs.map((item, index) => (
          <div key={item.q} className={`lp-faq-item ${open === index ? 'open' : ''}`}>
            <button type="button" aria-expanded={open === index} onClick={() => setOpen(open === index ? -1 : index)}>
              {item.q}
              <motion.span animate={{ rotate: open === index ? 45 : 0 }} className="lp-faq-plus">+</motion.span>
            </button>
            <AnimatePresence initial={false}>
              {open === index && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
                  <p>{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  )
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error'

function QueryForm({ plan, onPlanChange }: { plan: string; onPlanChange: (plan: string) => void }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' })
  const [state, setState] = useState<SubmitState>('idle')
  const [error, setError] = useState('')

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }))

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setState('submitting')
    setError('')
    try {
      await submitQuery({ ...form, plan })
      setForm({ name: '', phone: '', email: '', message: '' })
      setState('success')
    } catch (submitError) {
      setState('error')
      setError(submitError instanceof Error ? submitError.message : 'Query could not be sent.')
    }
  }

  return (
    <Reveal className="lp-form-wrap">
      <form className="lp-form" onSubmit={submit}>
        <AnimatePresence>
          {state === 'success' && (
            <motion.div className="lp-form-success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <motion.span initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.1 }}><Check size={34} /></motion.span>
              <strong>Query sent!</strong>
              <p>Our team will reach out shortly.</p>
              <button type="button" className="lp-btn ghost" onClick={() => setState('idle')}>Send another</button>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="lp-form-row">
          <label>Name<input required minLength={2} maxLength={80} autoComplete="name" value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Your full name" /></label>
          <label>Phone<input required type="tel" pattern="^\+?[0-9 ]{7,15}$" autoComplete="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="+91 98765 43210" /></label>
        </div>
        <div className="lp-form-row">
          <label>Email<input type="email" autoComplete="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="you@example.com" /></label>
          <label>Interested plan
            <select value={plan} onChange={(event) => onPlanChange(event.target.value)}>
              {planCatalog.map((item) => <option key={item.name}>{item.name}</option>)}
            </select>
          </label>
        </div>
        <label>Your goal<textarea required minLength={10} maxLength={2000} value={form.message} onChange={(event) => update('message', event.target.value)} placeholder="Tell us your goal, preferred timing, or membership question" /></label>
        <button type="submit" className="lp-btn primary block" disabled={state === 'submitting'}>
          {state === 'submitting' ? <span className="lp-spinner" /> : null}
          {state === 'submitting' ? 'Sending…' : 'Send query'}
        </button>
        {state === 'error' && <p className="lp-form-error" role="alert">{error}</p>}
      </form>
    </Reveal>
  )
}
