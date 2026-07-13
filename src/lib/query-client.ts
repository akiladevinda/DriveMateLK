import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 1000 * 60 * 30,
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const queryKeys = {
  profile: (userId: string) => ['profile', userId] as const,
  vehicles: (userId: string) => ['vehicles', userId] as const,
  vehicle: (vehicleId: string) => ['vehicle', vehicleId] as const,
  documents: (vehicleId: string) => ['documents', vehicleId] as const,
  fuel: (vehicleId: string) => ['fuel', vehicleId] as const,
  expenses: (vehicleId: string) => ['expenses', vehicleId] as const,
  services: (vehicleId: string) => ['services', vehicleId] as const,
  maintenance: (vehicleId: string) => ['maintenance', vehicleId] as const,
  reminders: (userId: string) => ['reminders', userId] as const,
  healthScore: (vehicleId: string) => ['health-score', vehicleId] as const,
  timeline: (vehicleId: string) => ['timeline', vehicleId] as const,
  garages: (filters?: string) => ['garages', filters ?? 'all'] as const,
  garage: (garageId: string) => ['garage', garageId] as const,
  roadside: (userId: string) => ['roadside', userId] as const,
  sharing: (vehicleId: string) => ['sharing', vehicleId] as const,
  insurance: (vehicleId: string) => ['insurance', vehicleId] as const,
  insuranceClaims: (vehicleId: string) => ['insurance-claims', vehicleId] as const,
  leasing: (vehicleId: string) => ['leasing', vehicleId] as const,
  analytics: (vehicleId: string) => ['analytics', vehicleId] as const,
} as const;
