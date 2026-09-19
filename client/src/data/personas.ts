import type { PersonaId } from '../types';

export interface PersonaDef {
  id: PersonaId;
  label: string;
  emoji: string;
  description: string;
  accent: string;
}

export const PERSONAS: PersonaDef[] = [
  { id: 'farmer', label: 'Farmer', emoji: '🌾', description: 'Farmer / Agriculture', accent: 'from-green-500 to-emerald-400' },
  { id: 'runner', label: 'Runner', emoji: '🏃', description: 'Runner / Outdoor fitness', accent: 'from-brand-500 to-cyan-400' },
  { id: 'commuter', label: 'Driver', emoji: '🚗', description: 'Driver / Commuter', accent: 'from-amber-500 to-orange-400' },
  { id: 'aviation', label: 'Aviation', emoji: '✈️', description: 'Aviation / Pilot', accent: 'from-sky-500 to-blue-400' },
  { id: 'traveler', label: 'Traveler', emoji: '🧳', description: 'Traveler', accent: 'from-violet-500 to-fuchsia-400' },
  { id: 'family', label: 'Family', emoji: '👨‍👩‍👧', description: 'Family / Parent', accent: 'from-rose-500 to-pink-400' },
  { id: 'event', label: 'Event Planner', emoji: '🎪', description: 'Event Planner', accent: 'from-purple-500 to-indigo-400' },
  { id: 'beach', label: 'Beach / Surfer', emoji: '🏖️', description: 'Beachgoer / Surfer', accent: 'from-cyan-500 to-teal-400' },
  { id: 'gardener', label: 'Gardener', emoji: '🌱', description: 'Gardener', accent: 'from-lime-500 to-green-400' },
  { id: 'general', label: 'General', emoji: '👤', description: 'General user', accent: 'from-slate-500 to-slate-400' },
  { id: 'cyclist', label: 'Cyclist', emoji: '🚴', description: 'Cyclist', accent: 'from-orange-500 to-amber-400' },
  { id: 'outdoor', label: 'Outdoor Worker', emoji: '🏗️', description: 'Construction / Outdoor work', accent: 'from-yellow-500 to-amber-400' },
  { id: 'student', label: 'Student', emoji: '🎓', description: 'Student', accent: 'from-indigo-500 to-blue-400' },
  { id: 'researcher', label: 'Researcher', emoji: '🔬', description: 'Research / Weather enthusiast', accent: 'from-teal-500 to-cyan-400' }
];

export const getPersona = (id: PersonaId): PersonaDef =>
  PERSONAS.find((p) => p.id === id) ?? PERSONAS.find((p) => p.id === 'general') ?? PERSONAS[0];