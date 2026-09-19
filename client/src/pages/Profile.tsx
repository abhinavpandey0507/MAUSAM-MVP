import { useState } from 'react';
import { Save, UserRound, Star, Trash2, Pencil } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { makeT } from '../i18n/translations';
import { LOCATIONS } from '../data/locations';
import { uniqueRequirements } from '../data/requirements';
import { PersonaPicker } from '../components/PersonaPicker';
import { useNavigate } from 'react-router-dom';

export function Profile() {
  const { language, profile, updateProfile, savedLocations, addSavedLocation, setLocation, resetProfile, setPersonas } = useApp();
  const t = makeT(language);
  const nav = useNavigate();
  const [name, setName] = useState(profile.name ?? '');
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [email, setEmail] = useState(profile.email ?? '');
  const [personaOpen, setPersonaOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = () => {
    updateProfile({ name, phone, email });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const doDelete = () => {
    resetProfile();
    nav('/');
  };

  const reqs = uniqueRequirements(profile.personas);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-5">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900">
        <UserRound className="h-6 w-6 text-brand-600" /> {t('nav.profile')}
      </h1>
      <p className="text-sm text-slate-500">{t('privacy.dataNote')}</p>

      <section className="card fade-up mt-4 space-y-4 p-5">
        <div>
          <label className="label-caps">{t('onboard.name')}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="field mt-1.5" placeholder={t('onboard.namePh')} />
        </div>
        <div>
          <label className="label-caps">{t('onboard.phone')}</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="field mt-1.5" placeholder={t('onboard.phonePh')} inputMode="tel" />
        </div>
        <div>
          <label className="label-caps">{t('onboard.email')}</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="field mt-1.5" placeholder={t('onboard.emailPh')} inputMode="email" />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="label-caps">{t('profile.personas')}</label>
            <button onClick={() => setPersonaOpen(true)} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700 ring-1 ring-brand-100">
              <Pencil className="h-3 w-3" /> Edit
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profile.personas.map((pid) => (
              <button key={pid} onClick={() => setPersonas(profile.personas.filter((x) => x !== pid))} title="Tap to remove" className="chip bg-brand-50 text-brand-700 ring-brand-200">
                {pid} ✕
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label-caps">{t('profile.requirements')}</label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {reqs.map((r) => {
              const on = profile.requirements.includes(r);
              return (
                <button key={r} onClick={() => updateProfile({ requirements: on ? profile.requirements.filter((x) => x !== r) : [...profile.requirements, r] })} className={`chip ${on ? 'bg-brand-50 text-brand-700 ring-brand-200' : 'bg-slate-50 text-slate-400 ring-slate-200'}`}>
                  {on ? '✓ ' : ''}{t(`req.${r}`)}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="label-caps">{t('profile.locations')}</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {LOCATIONS.map((l) => {
              const isSaved = savedLocations.includes(l.id);
              return (
                <button key={l.id} onClick={() => (isSaved ? setLocation(l.id) : addSavedLocation(l.id))} className={`chip ${isSaved ? 'bg-brand-50 text-brand-700 ring-brand-200' : 'bg-slate-50 text-slate-500 ring-slate-200'}`}>
                  {isSaved && <Star className="h-3 w-3 fill-current" />}
                  {l.name}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="label-caps">{t('profile.notifications')}</label>
          <div className="mt-2 space-y-2">
            {([['alerts', t('profile.notifyAlerts')], ['daily', t('profile.notifyDaily')], ['insights', t('profile.notifyInsights')]] as const).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm">
                <span className="font-medium text-slate-700">{label}</span>
                <input type="checkbox" checked={profile.notify[key]} onChange={(e) => updateProfile({ notify: { ...profile.notify, [key]: e.target.checked } })} className="h-5 w-5 accent-brand-600" />
              </label>
            ))}
          </div>
        </div>

        <button onClick={save} className="btn-primary w-full">
          <Save className="h-4 w-4" /> {saved ? t('profile.saved') : t('profile.save')}
        </button>
      </section>

      <section className="card fade-up mt-4 p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-red-600">
          <Trash2 className="h-4 w-4" /> {t('privacy.title')} — {t('privacy.deleteProfile')}
        </h2>
        <p className="mt-2 text-xs text-slate-500">{t('privacy.deleteBody')}</p>
        {confirmDelete ? (
          <div className="mt-3 flex gap-2">
            <button onClick={doDelete} className="btn-primary !bg-red-600 hover:!bg-red-700">
              {t('privacy.deleteConfirm')}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="btn-secondary">
              {t('btn.close')}
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="btn-secondary mt-3 !text-red-600">
            <Trash2 className="h-4 w-4" /> {t('privacy.deleteProfile')}
          </button>
        )}
      </section>

      <PersonaPicker open={personaOpen} onClose={() => setPersonaOpen(false)} multi />
    </div>
  );
}