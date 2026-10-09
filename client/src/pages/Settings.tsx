import { Settings as SettingsIcon, Info, Languages, Bell, FlaskConical, ShieldCheck, UserCog, Trash2, Sparkles, LogIn, Loader2, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { INTEREST_OPTIONS } from '../services/sqlApi';
import { makeT, LANGUAGES } from '../i18n/translations';

export function Settings() {
  const { language, setLanguage, demoMode, setDemoMode, profile, updateProfile, resetProfile } = useApp();
  const { isAuthenticated, preferences, updatePreferences } = useAuth();
  const t = makeT(language);
  const nav = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [interests, setInterests] = useState<string[]>(preferences?.interests ?? []);
  const [savingInterests, setSavingInterests] = useState(false);
  const [prefsMsg, setPrefsMsg] = useState<string | null>(null);

  useEffect(() => {
    setInterests(preferences?.interests ?? []);
  }, [preferences]);

  const toast = (msg: string) => {
    setPrefsMsg(msg);
    window.setTimeout(() => setPrefsMsg(null), 2200);
  };

  const persist = (patch: Parameters<typeof updatePreferences>[0]) => {
    if (!isAuthenticated) return;
    updatePreferences(patch).catch(() => toast('Could not save your preferences.'));
  };

  const toggleInterest = (id: string) =>
    setInterests((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const saveInterests = async () => {
    setSavingInterests(true);
    try {
      await updatePreferences({ interests });
      toast('Personalization interests saved.');
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setSavingInterests(false);
    }
  };

  const changeLanguage = (l: typeof language) => {
    setLanguage(l);
    persist({ language: l });
  };

  const doDelete = () => {
    resetProfile();
    nav('/');
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-5">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900">
        <SettingsIcon className="h-6 w-6 text-brand-600" /> {t('nav.settings')}
      </h1>

      <section className="card fade-up mt-4 p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Languages className="h-4 w-4 text-brand-500" /> {t('settings.language')}
        </h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.id}
              onClick={() => changeLanguage(l.id as typeof language)}
              className={`rounded-xl px-3 py-2.5 text-sm font-bold ring-2 transition-all ${
                language === l.id ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card fade-up mt-4 p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Bell className="h-4 w-4 text-brand-500" /> {t('settings.notifications')}
        </h2>
        <div className="mt-3 space-y-2">
          {([['alerts', t('profile.notifyAlerts')], ['daily', t('profile.notifyDaily')], ['insights', t('profile.notifyInsights')]] as const).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm">
              <span className="font-medium text-slate-700">{label}</span>
              <input
                type="checkbox"
                checked={profile.notify[key]}
                onChange={(e) => {
                  updateProfile({ notify: { ...profile.notify, [key]: e.target.checked } });
                  persist({ [`notify${key[0].toUpperCase()}${key.slice(1)}`]: e.target.checked } as Parameters<typeof updatePreferences>[0]);
                }}
                className="h-5 w-5 accent-brand-600"
              />
            </label>
          ))}
        </div>
      </section>

      {/* Account + personalization */}
      <section className="card fade-up mt-4 p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Sparkles className="h-4 w-4 text-brand-500" /> Personalization
        </h2>
        {!isAuthenticated ? (
          <div className="mt-3 rounded-xl bg-brand-50 px-4 py-3.5">
            <p className="text-sm text-slate-600">
              Sign in to sync your interests, preferred location and preferences with your account.
            </p>
            <button onClick={() => nav('/auth')} className="btn-primary mt-3">
              <LogIn className="h-4 w-4" /> Sign in / Register
            </button>
          </div>
        ) : (
          <>
            <p className="mt-2 text-xs text-slate-500">
              What are your focus areas? The dashboard adapts its briefing and recommendations.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((opt) => {
                const on = interests.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => toggleInterest(opt.id)}
                    title={opt.description}
                    className={`chip ${on ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200'}`}
                  >
                    {on ? '✓ ' : ''}
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <button onClick={saveInterests} disabled={savingInterests} className="btn-secondary mt-3">
              {savingInterests ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Save interests
            </button>
          </>
        )}
        {prefsMsg && <p className="mt-3 text-xs font-semibold text-emerald-600">{prefsMsg}</p>}
      </section>

      <section className="card fade-up mt-4 p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <ShieldCheck className="h-4 w-4 text-emerald-500" /> {t('privacy.title')}
        </h2>
        <p className="mt-2 text-xs text-slate-500">{t('privacy.dataNote')}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => nav('/profile')} className="btn-secondary">
            <UserCog className="h-4 w-4" /> {t('privacy.editProfile')}
          </button>
          {confirmDelete ? (
            <>
              <button onClick={doDelete} className="btn-primary !bg-red-600 hover:!bg-red-700">
                <Trash2 className="h-4 w-4" /> {t('privacy.deleteConfirm')}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="btn-secondary">
                {t('btn.close')}
              </button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="btn-secondary !text-red-600">
              <Trash2 className="h-4 w-4" /> {t('privacy.deleteProfile')}
            </button>
          )}
        </div>
        <p className="mt-3 rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs text-slate-500">{t('privacy.locationBody')}</p>
      </section>

      <section className="card fade-up mt-4 p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <FlaskConical className="h-4 w-4 text-amber-500" /> {t('common.demoMode')}
        </h2>
        <button onClick={() => setDemoMode(!demoMode)} className={`btn-secondary mt-3 ${demoMode ? '!bg-amber-100 !text-amber-800 !ring-amber-300' : ''}`}>
          {demoMode ? t('data.demo') : 'OFF'} → {demoMode ? 'switch to live attempt' : 'enable demo fallback data'}
        </button>
        <p className="mt-2 text-xs text-slate-500">{t('settings.demo')}</p>
      </section>

      <section className="card fade-up mt-4 p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Info className="h-4 w-4 text-slate-400" /> {t('settings.about')}
        </h2>
        <p className="mt-2 text-sm text-slate-600">MAUSAM · Personalized Weather Intelligence · SIH 2026 · SIH26076 · Team THE_UNSCRIPTED.</p>
        <p className="mt-2 text-xs text-slate-500">{t('hero.attribution')}</p>
        <p className="mt-2 text-xs text-slate-500">{t('settings.dataNote')}</p>
      </section>
    </div>
  );
}