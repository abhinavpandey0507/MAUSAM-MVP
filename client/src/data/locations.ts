import type { LocationDef } from '../types';

export const LOCATIONS: LocationDef[] = [
  { id: 'new-delhi', name: 'New Delhi', state: 'Delhi', lat: 28.6139, lon: 77.209 },
  { id: 'chandigarh', name: 'Chandigarh', state: 'Chandigarh', lat: 30.7333, lon: 76.7794 },
  { id: 'mumbai', name: 'Mumbai', state: 'Maharashtra', lat: 19.076, lon: 72.8777 },
  { id: 'bengaluru', name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lon: 77.5946 },
  { id: 'chennai', name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lon: 80.2707 },
  { id: 'kolkata', name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lon: 88.3639 },
  { id: 'hyderabad', name: 'Hyderabad', state: 'Telangana', lat: 17.385, lon: 78.4867 }
];

export const getLocationDef = (id: string): LocationDef =>
  LOCATIONS.find((l) => l.id === id) ?? LOCATIONS[0];