import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, ShieldCheck, Sparkles, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { makeT, LANGUAGES } from '../i18n/translations';
import { PERSONAS } from '../data/personas';
import { getLocationDef } from '../data/locations';
import { PERSONA_REQUIREMENTS, uniqueRequirements } from '../data/requirements';
import { MultiPersonaGrid } from '../components/Modal';
import { LocationPicker } from '../components/LocationPicker';
import type { Language, PersonaId } from '../types';

const STEPS = ['welcome', 'basic', 'persona', 'requirements', 'location', 'summary'] as const;
type Step = (typeof STEPS)[number];

export function Onboarding() {
  const { language, setLanguage, location, setLocation, completeOnboarding, profile } = useApp();
  const t = makeT(language);

  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState(profile.name ?? '');
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [email, setEmail] = useState(profile.email ?? '');
  const [personas, setPersonas] = useState<PersonaId[]>(profile.personas.length ? profile.personas : ['general']);
  const [requirements, setRequirements] = useState<string[]>(profile.requirements.length ? profile.requirements : []);
  const [locOpen, setLocOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stepIdx = STEPS.indexOf(step);
  const availableReqs = useMemo(() => uniqueRequirements(personas), [personas]);
  const reqDefaults = useMemo(() => Array.from(new Set(personas.flatMap((p) => PERSONA_REQUIREMENTS[p] ?? []))), [personas]);

  const locDef = getLocationDef(location);

  const next = () => {
    setError(null);
    if (step === 'basic' && (!name.trim() || !phone.trim() || phone.replace(/\D/g, '').length < 10)) {
      setError(t('onboard.required'));
      return;
    }
    if (step === 'persona' && personas.length === 0) {
      setError(t('onboard.personaHint'));
      return;
    }
    if (step === 'requirements' && requirements.length === 0) {
      setRequirements(reqDefaults);
    }
    const idx = STEPS.indexOf(step);
    if (idx >= STEPS.length - 1) {
      completeOnboarding({ name, phone, email, persona: personas[0], personas, requirements, location });
      return;
    }
    setStep(STEPS[idx + 1]);
  };

  const back = () => {
    setError(null);
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const selectPersona = (id: string) => {
    const pid = id as PersonaId;
    setPersonas((prev) => {
      const list = prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid];
      return list.length ? list : [];
    });
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-6 sm:py-10">
      {/* progress */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-cyan-500 text-lg text-white shadow-card">
            ☀️
          </span>
          <div>
            <p className="text-sm font-extrabold tracking-tight text-slate-900">MAUSAM</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600">{t('app.tagline')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex gap-1">
            {STEPS.map((s, i) => (
              <span key={s} className={`h-1.5 rounded-full transition-all ${i <= stepIdx ? 'w-5 bg-brand-500' : 'w-2 bg-slate-200'}`} />
            ))}
          </div>
          <span className="ml-2 text-[10px] font-bold text-slate-400">
            {stepIdx + 1}/{STEPS.length}
          </span>
        </div>
      </div>

      <div className="fade-up flex-1">
        {step === 'welcome' && (
          <section className="flex h-full flex-col justify-center text-center">
            <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-600 to-cyan-500 text-4xl shadow-card">
              <Sparkles className="h-10 w-10 text-white" />
            </span>
            <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{t('onboard.welcomeTitle')}</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-500">{t('onboard.welcomeBody')}</p>

            <div className="mx-auto mt-8 grid w-full max-w-md grid-cols-1 gap-3">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-left">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <span className="text-xs text-slate-600">{t('privacy.dataNote')}</span>
              </div>
            </div>

            <div className="mt-8 flex flex-col items-center gap-4">
              <div className="flex gap-1">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLanguage(l.id as Language)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-bold ring-1 transition-all ${
                      language === l.id ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-500 ring-slate-200 hover:ring-brand-300'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <button onClick={next} className="btn-primary w-full max-w-md">
                {t('onboard.start')} <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}

        {step === 'basic' && (
          <section>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{t('onboard.basicTitle')}</h1>
            <p className="mt-1 text-sm text-slate-500">{t('onboard.basicBody')}</p>
            <div className="mt-6 space-y-4">
              <Field label={t('onboard.name')}>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('onboard.namePh')} className="field" />
              </Field>
              <Field label={t('onboard.phone')}>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('onboard.phonePh')} inputMode="tel" className="field" />
              </Field>
              <Field label={t('onboard.email')}>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('onboard.emailPh')} inputMode="email" className="field" />
              </Field>
              {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
            </div>
          </section>
        )}

        {step === 'persona' && (
          <section>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{t('onboard.personaTitle')}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {t('onboard.personaBody')} <span className="font-semibold text-brand-600">({personas.length} {t('onboard.reqHint')})</span>
            </p>
            <div className="mt-6">
              <MultiPersonaGrid options={PERSONAS} selected={personas} onToggle={selectPersona} t={t} />
              {error && <p className="mt-3 text-xs font-semibold text-red-600">{error}</p>}
            </div>
          </section>
        )}

        {step === 'requirements' && (
          <section>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{t('onboard.reqTitle')}</h1>
            <p className="mt-1 text-sm text-slate-500">{t('onboard.reqBody')}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {availableReqs.map((r) => {
                const on = requirements.includes(r);
                return (
                  <button
                    key={r}
                    onClick={() =>
                      setRequirements((prev) => (on ? prev.filter((x) => x !== r) : [...prev, r]))
                    }
                    className={`rounded-full border-2 px-3.5 py-2 text-xs font-bold transition-all ${
                      on ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-500 hover:border-brand-300'
                    }`}
                  >
                    {on ? '✓ ' : ''}
                    {t(`req.${r}`)}
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-[11px] text-slate-400">
              {requirements.length} selected · default: {reqDefaults.length}
            </p>
          </section>
        )}

        {step === 'location' && (
          <section>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{t('onboard.locTitle')}</h1>
            <p className="mt-1 text-sm text-slate-500">{t('onboard.locBody')}</p>
            <div className="mt-6 flex items-center justify-between rounded-2xl border-2 border-brand-200 bg-brand-50 px-4 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-brand-100">
                  <MapPin className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">{locDef.name}, {locDef.state}</p>
                  <p className="text-[11px] text-slate-500">{t('onboard.locBody')}</p>
                </div>
              </div>
              <button onClick={() => setLocOpen(true)} className="btn-secondary shrink-0">
                {t('btn.changeLocation')}
              </button>
            </div>
            <button onClick={() => { setLocation('new-delhi'); }} className="mt-6 w-full rounded-2xl border-2 border-dashed border-slate-200 px-4 py-3 text-sm font-bold text-slate-500 transition-colors hover:border-brand-300">
              {t('onboard.locSkip')}
            </button>
          </section>
        )}

        {step === 'summary' && (
          <section>
            <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-brand-900 p-6 text-white shadow-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-cyan-300" />
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-cyan-300">
                    {t('onboard.summaryTitle')}
                  </span>
                </div>
                <Lock className="h-4 w-4 text-white/40" />
              </div>

              <h2 className="mt-4 text-xl font-extrabold">{name ? `👋 ${name}` : '—'}</h2>
              <p className="text-xs text-white/60">
                {phone} · {email || 'no email'} · {locDef.name}
              </p>

              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">{t('profile.personas')}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {personas.map((p) => {
                    const def = PERSONAS.find((x) => x.id === p);
                    return (
                      <span key={p} className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold">
                        {def?.emoji} {def?.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">{t('profile.requirements')}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {requirements.slice(0, 8).map((r) => (
                    <span key={r} className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-100">
                      {t(`req.${r}`)}
                    </span>
                  ))}
                  {requirements.length > 8 && (
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-100">
                      +{requirements.length - 8}
                    </span>
                  )}
                </div>
              </div>

              <p className="mt-5 text-[10px] text-white/40">{t('privacy.dataNote')}</p>
            </div>
          </section>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <button onClick={back} disabled={stepIdx === 0} className="btn-secondary disabled:opacity-40">
          <ChevronLeft className="h-4 w-4" /> {t('onboard.back')}
        </button>
        <button onClick={next} className="btn-primary flex-1 sm:flex-none">
          {step === 'summary' ? t('onboard.openMausam') : t('onboard.next')}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <LocationPicker open={locOpen} onClose={() => setLocOpen(false)} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      {children}
    </label>
  );
}