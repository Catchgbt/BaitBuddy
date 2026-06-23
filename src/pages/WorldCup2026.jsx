import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Trophy,
  MapPin,
  CalendarDays,
  Users,
  Globe2,
  Flag,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import PageContainer from "@/components/layout/PageContainer";
import {
  TOURNAMENT,
  HOST_NATIONS,
  HOST_CITIES,
  CONFEDERATION_SLOTS,
  STAGES,
  PAST_CHAMPIONS,
} from "@/data/worldCup2026";

// CSS-Flagge aus drei Farbstreifen (keine Emojis)
function FlagBars({ colors, className = "" }) {
  return (
    <div className={`flex overflow-hidden rounded-md ring-1 ring-white/20 ${className}`}>
      {colors.map((c, i) => (
        <span key={i} className="flex-1" style={{ backgroundColor: c }} />
      ))}
    </div>
  );
}

// Zahl, die beim Sichtbarwerden hochzaehlt
function CountUp({ to, duration = 1400, suffix = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(eased * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  return (
    <span ref={ref}>
      {value}
      {suffix}
    </span>
  );
}

function useCountdown(targetIso) {
  const target = useMemo(() => new Date(targetIso).getTime(), [targetIso]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = target - now;
  const done = diff <= 0;
  const total = Math.max(diff, 0);
  return {
    done,
    days: Math.floor(total / 86400000),
    hours: Math.floor((total % 86400000) / 3600000),
    minutes: Math.floor((total % 3600000) / 60000),
    seconds: Math.floor((total % 60000) / 1000),
  };
}

// Animierte schwebende Lichtpunkte im Hintergrund
function FloatingOrbs() {
  const orbs = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 6 + Math.random() * 22,
        delay: Math.random() * 6,
        duration: 7 + Math.random() * 8,
        opacity: 0.15 + Math.random() * 0.35,
      })),
    []
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {orbs.map((o) => (
        <motion.span
          key={o.id}
          className="absolute rounded-full bg-gradient-to-br from-cyan-300 to-emerald-300 blur-[2px]"
          style={{
            left: `${o.left}%`,
            width: o.size,
            height: o.size,
            opacity: o.opacity,
          }}
          initial={{ y: "110%" }}
          animate={{ y: "-20%" }}
          transition={{
            duration: o.duration,
            delay: o.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
};

function CountdownUnit({ value, label }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-16 sm:w-20 overflow-hidden rounded-2xl bg-white/10 backdrop-blur-md ring-1 ring-white/20">
        <div className="px-2 py-3 text-center">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={value}
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -18, opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="text-2xl sm:text-3xl font-black tabular-nums text-white"
            >
              {String(value).padStart(2, "0")}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <span className="mt-2 text-[11px] uppercase tracking-widest text-white/60">
        {label}
      </span>
    </div>
  );
}

function StatCard({ icon: Icon, value, suffix, label, delay }) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
      custom={delay}
      whileHover={{ y: -6 }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-5 backdrop-blur-sm"
    >
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-emerald-400/10 blur-2xl transition-all group-hover:bg-emerald-400/25" />
      <Icon className="h-6 w-6 text-emerald-300" />
      <div className="mt-3 text-3xl font-black text-white">
        <CountUp to={value} suffix={suffix} />
      </div>
      <div className="mt-1 text-sm text-white/60">{label}</div>
    </motion.div>
  );
}

export default function WorldCup2026() {
  const cd = useCountdown(TOURNAMENT.openingMatch);
  const final = useCountdown(TOURNAMENT.finalMatch);
  const tournamentRunning = cd.done && !final.done;
  const tournamentOver = final.done;

  const [activeCountry, setActiveCountry] = useState("all");
  const filteredCities =
    activeCountry === "all"
      ? HOST_CITIES
      : HOST_CITIES.filter((c) => c.country === activeCountry);

  return (
    <PageContainer maxWidth="max-w-6xl" className="text-white">
      {/* Hero */}
      <section className="relative -mx-4 overflow-hidden bg-gradient-to-br from-[#03190f] via-[#04261a] to-[#021018] px-4 pb-14 pt-10 sm:pt-14">
        <FloatingOrbs />
        {/* Rasenlinien-Andeutung */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background:repeating-linear-gradient(90deg,transparent,transparent_56px,#34d399_56px,#34d399_57px)]" />

        <div className="relative mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "backOut" }}
            className="mx-auto inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-200"
          >
            <Sparkles className="h-3.5 w-3.5" />
            USA · Kanada · Mexiko
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-6xl"
          >
            <span className="bg-gradient-to-r from-white via-emerald-100 to-cyan-200 bg-clip-text text-transparent">
              Weltmeisterschaft
            </span>
            <br />
            <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-emerald-300 bg-clip-text text-7xl text-transparent sm:text-8xl">
              2026
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mx-auto mt-4 max-w-xl text-sm text-white/70 sm:text-base"
          >
            Das erste Turnier mit 48 Nationen und 104 Spielen. Eroeffnung im
            legendaeren Estadio Azteca, Finale im MetLife Stadium.
          </motion.p>

          {/* Countdown */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="mt-9"
          >
            {tournamentOver ? (
              <div className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-6 py-4 text-lg font-bold ring-1 ring-white/20">
                <Trophy className="h-5 w-5 text-yellow-300" />
                Das Turnier ist abgeschlossen
              </div>
            ) : tournamentRunning ? (
              <div className="inline-flex items-center gap-3 rounded-2xl bg-emerald-500/15 px-6 py-4 ring-1 ring-emerald-400/40">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
                </span>
                <span className="text-lg font-bold text-emerald-100">
                  Das Turnier laeuft – noch {final.days} Tage bis zum Finale
                </span>
              </div>
            ) : (
              <>
                <p className="mb-4 text-xs uppercase tracking-[0.3em] text-white/50">
                  Anpfiff in
                </p>
                <div className="flex items-center justify-center gap-3 sm:gap-4">
                  <CountdownUnit value={cd.days} label="Tage" />
                  <CountdownUnit value={cd.hours} label="Std" />
                  <CountdownUnit value={cd.minutes} label="Min" />
                  <CountdownUnit value={cd.seconds} label="Sek" />
                </div>
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="-mx-4 bg-[#021018] px-4 pb-10 pt-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <StatCard icon={Users} value={TOURNAMENT.teams} label="Nationen" delay={0} />
          <StatCard icon={Trophy} value={TOURNAMENT.matches} label="Spiele" delay={1} />
          <StatCard icon={MapPin} value={TOURNAMENT.hostCities} label="Spielorte" delay={2} />
          <StatCard icon={Flag} value={TOURNAMENT.hostNations} label="Gastgeber" delay={3} />
        </div>
      </section>

      {/* Gastgebernationen */}
      <section className="-mx-4 bg-[#021018] px-4 py-10">
        <SectionTitle icon={Globe2} kicker="Gastgeber" title="Drei Nationen, ein Turnier" />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {HOST_NATIONS.map((n, i) => (
            <motion.div
              key={n.code}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-40px" }}
              custom={i}
              whileHover={{ y: -8, scale: 1.015 }}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6"
            >
              <div
                className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${n.gradient}`}
              />
              <div className="flex items-center gap-3">
                <FlagBars colors={n.colors} className="h-7 w-11" />
                <h3 className="text-xl font-black">{n.name}</h3>
              </div>
              <p className="mt-3 text-sm text-white/60">{n.note}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {n.cities.map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/70 ring-1 ring-white/10"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Spielorte mit Filter */}
      <section className="-mx-4 bg-gradient-to-b from-[#021018] to-[#03190f] px-4 py-10">
        <SectionTitle icon={MapPin} kicker="Spielorte" title="16 Stadien in Nordamerika" />
        <div className="mt-5 flex flex-wrap gap-2">
          {["all", "Mexiko", "USA", "Kanada"].map((c) => (
            <button
              key={c}
              onClick={() => setActiveCountry(c)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
                activeCountry === c
                  ? "bg-emerald-400 text-emerald-950"
                  : "bg-white/[0.06] text-white/70 ring-1 ring-white/10 hover:bg-white/10"
              }`}
            >
              {c === "all" ? "Alle" : c}
            </button>
          ))}
        </div>

        <motion.div layout className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filteredCities.map((c) => (
              <motion.div
                key={c.city}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                {c.highlight && (
                  <span className="absolute right-3 top-3 rounded-full bg-yellow-400/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-yellow-950">
                    {c.highlight}
                  </span>
                )}
                <div className="text-xs uppercase tracking-widest text-emerald-300/80">
                  {c.country}
                </div>
                <div className="mt-1 text-lg font-bold">{c.city}</div>
                <div className="mt-0.5 text-sm text-white/55">{c.stadium}</div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </section>

      {/* Turnierverlauf */}
      <section className="-mx-4 bg-[#03190f] px-4 py-10">
        <SectionTitle icon={CalendarDays} kicker="Ablauf" title="Der Weg zum Titel" />
        <div className="relative mt-6 pl-6">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-emerald-400 via-emerald-400/40 to-transparent" />
          {STAGES.map((s, i) => (
            <motion.div
              key={s.phase}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-30px" }}
              custom={i}
              className="relative mb-6 last:mb-0"
            >
              <span className="absolute -left-6 top-1.5 h-3.5 w-3.5 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
              <div className="flex flex-wrap items-baseline gap-x-3">
                <h3 className="text-lg font-bold">{s.phase}</h3>
                <span className="text-sm text-white/50">{s.detail}</span>
              </div>
              <div className="mt-0.5 text-sm text-emerald-300/80">{s.dates}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Konfoederations-Quoten */}
      <section className="-mx-4 bg-[#03190f] px-4 py-10">
        <SectionTitle icon={Globe2} kicker="Qualifikation" title="48 Startplaetze weltweit" />
        <div className="mt-6 space-y-3">
          {CONFEDERATION_SLOTS.map((conf, i) => {
            const max = 16;
            return (
              <motion.div
                key={conf.code}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-30px" }}
                custom={i}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold">{conf.code}</span>
                    <span className="ml-2 text-sm text-white/50">{conf.region}</span>
                  </div>
                  <div className="text-sm text-white/70">
                    <span className="font-black text-emerald-300">{conf.slots}</span>
                    {conf.playoff > 0 && (
                      <span className="text-white/40"> + {conf.playoff} Playoff</span>
                    )}
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(conf.slots / max) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.15 * i, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                  />
                </div>
                {conf.note && (
                  <div className="mt-1.5 text-xs text-white/40">{conf.note}</div>
                )}
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Rekord-Weltmeister */}
      <section className="-mx-4 bg-gradient-to-b from-[#03190f] to-[#021018] px-4 py-10">
        <SectionTitle icon={Trophy} kicker="Geschichte" title="Die Rekordweltmeister" />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PAST_CHAMPIONS.map((champ, i) => (
            <motion.div
              key={champ.country}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-30px" }}
              custom={i}
              whileHover={{ y: -5 }}
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center"
            >
              <FlagBars colors={champ.colors} className="mx-auto h-6 w-9" />
              <div className="mt-3 text-sm font-bold">{champ.country}</div>
              <div className="mt-1 flex items-center justify-center gap-1 text-yellow-300">
                <Trophy className="h-3.5 w-3.5" />
                <span className="text-lg font-black">{champ.titles}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Abschluss-Banner */}
      <section className="-mx-4 bg-[#021018] px-4 pb-16 pt-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-cyan-700 p-8 text-center"
        >
          <FloatingOrbs />
          <div className="relative">
            <Trophy className="mx-auto h-10 w-10 text-yellow-300" />
            <h3 className="mt-3 text-2xl font-black sm:text-3xl">
              Wer holt den Titel 2026?
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/80">
              48 Teams, 16 Stadien, ein Sommer Fussballgeschichte zwischen
              Vancouver und Mexiko-Stadt.
            </p>
            <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold ring-1 ring-white/30">
              Finale: 19. Juli 2026
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>
        </motion.div>
      </section>
    </PageContainer>
  );
}

function SectionTitle({ icon: Icon, kicker, title }) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
    >
      <div className="flex items-center gap-2 text-emerald-300/80">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-[0.25em]">
          {kicker}
        </span>
      </div>
      <h2 className="mt-2 text-2xl font-black sm:text-3xl">{title}</h2>
    </motion.div>
  );
}
