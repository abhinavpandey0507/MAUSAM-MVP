import { useApp } from '../context/AppContext';
import { makeT } from '../i18n/translations';
import { Modal, PersonaGrid, MultiPersonaGrid } from './Modal';
import { PERSONAS } from '../data/personas';
import type { PersonaId } from '../types';

export function PersonaPicker({
  open,
  onClose,
  multi
}: {
  open: boolean;
  onClose: () => void;
  multi?: boolean;
}) {
  const { language, persona, profile, setPersona, setPersonas } = useApp();
  const t = makeT(language);

  if (multi) {
    return (
      <Modal open={open} onClose={onClose} title={t('profile.personas')} wide>
        <p className="mb-4 text-sm text-slate-500">
          Same weather data — different priorities. Select the roles that describe you.
        </p>
        <MultiPersonaGrid
          options={PERSONAS}
          selected={profile.personas}
          onToggle={(id) => {
            const list = profile.personas.includes(id as PersonaId)
              ? profile.personas.filter((x) => x !== id)
              : [...profile.personas, id as PersonaId];
            setPersonas(list.length ? list : ['general']);
          }}
          t={t}
        />
        <button onClick={onClose} className="btn-primary mt-5 w-full">
          {t('btn.close')}
        </button>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={t('btn.changePersona')}>
      <p className="mb-4 text-sm text-slate-500">
        Same weather data — different priorities. Change the persona and watch the homepage reorder.
      </p>
      <PersonaGrid
        options={PERSONAS}
        current={persona}
        onSelect={(id) => {
          setPersona(id as PersonaId);
          onClose();
        }}
        t={t}
      />
    </Modal>
  );
}