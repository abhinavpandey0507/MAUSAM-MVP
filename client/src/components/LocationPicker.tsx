import { useMemo, useState } from 'react';
import { MapPin, LocateFixed, Star, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LOCATIONS } from '../data/locations';
import { makeT } from '../i18n/translations';
import { Modal } from './Modal';

export function LocationPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { language, location, setLocation, savedLocations, addSavedLocation, removeSavedLocation } = useApp();
  const t = makeT(language);
  const [query, setQuery] = useState('');
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LOCATIONS;
    return LOCATIONS.filter((l) => l.name.toLowerCase().includes(q) || l.state.toLowerCase().includes(q));
  }, [query]);

  const choose = (id: string) => {
    setLocation(id);
    onClose();
  };

  const useGeo = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation not available in this browser.');
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // nearest supported city by haversine
        const { latitude, longitude } = pos.coords;
        let best = LOCATIONS[0];
        let bestD = Infinity;
        for (const l of LOCATIONS) {
          const d = (l.lat - latitude) ** 2 + (l.lon - longitude) ** 2;
          if (d < bestD) {
            bestD = d;
            best = l;
          }
        }
        setLocation(best.id);
        addSavedLocation(best.id);
        setLocating(false);
        onClose();
      },
      (err) => {
        setLocating(false);
        setGeoError(err.message || 'Location permission denied');
      },
      { timeout: 8000 }
    );
  };

  return (
    <Modal open={open} onClose={onClose} title={t('btn.changeLocation')} wide>
      <div className="mb-4 flex gap-2">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('btn.searchCity')}
          className="w-full rounded-xl border-0 bg-slate-100 px-4 py-2.5 text-sm ring-1 ring-transparent focus:ring-2 focus:ring-brand-400"
        />
        <button onClick={useGeo} className="btn-secondary shrink-0" disabled={locating}>
          <LocateFixed className={`h-4 w-4 ${locating ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{t('btn.useMyLocation')}</span>
        </button>
      </div>
      {geoError && <p className="mb-2 text-xs text-red-600">{geoError}</p>}

      <p className="label-caps mb-2">{t('btn.savedLocations')}</p>
      {savedLocations.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {savedLocations.map((id) => {
            const l = LOCATIONS.find((x) => x.id === id);
            if (!l) return null;
            return (
              <span key={id} className="chip bg-brand-50 text-brand-700 ring-brand-200">
                <Star className="h-3 w-3 fill-current" />
                <button onClick={() => choose(id)} className="font-semibold hover:underline">
                  {l.name}
                </button>
                <button onClick={() => removeSavedLocation(id)} className="opacity-60 hover:opacity-100" aria-label="Remove">
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <p className="label-caps mb-2">{t('btn.searchCity')}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {results.map((l) => {
          const active = l.id === location;
          return (
            <button
              key={l.id}
              onClick={() => choose(l.id)}
              className={`flex items-center gap-3 rounded-xl border-2 px-3.5 py-3 text-left transition-all ${
                active ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-brand-300'
              }`}
            >
              <MapPin className={`h-5 w-5 ${active ? 'text-brand-600' : 'text-slate-300'}`} />
              <span className="flex-1">
                <span className="block text-sm font-bold text-slate-900">{l.name}</span>
                <span className="block text-xs text-slate-400">{l.state}</span>
              </span>
              {active && <span className="chip bg-brand-600 text-white ring-brand-600">{t('demo.active')}</span>}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addSavedLocation(l.id);
                }}
                className="rounded-md p-1 text-slate-300 hover:text-amber-500"
                title="Save"
              >
                <Star className="h-4 w-4" />
              </button>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}