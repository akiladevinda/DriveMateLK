import { useEffect, useState } from 'react';

import type { Phase1VehicleType } from '@/constants/vehicles';
import * as vehicleCatalog from '@/services/vehicle-catalog-service';

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export function useMakeSuggestions(
  query: string,
  enabled: boolean,
  vehicleType: Phase1VehicleType | string = 'car',
) {
  const debouncedQuery = useDebouncedValue(query, 220);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void vehicleCatalog.suggestMakes(debouncedQuery, vehicleType).then((items) => {
      if (!cancelled) {
        setSuggestions(items);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, enabled, vehicleType]);

  return { suggestions, loading };
}

export function useModelSuggestions(
  make: string,
  query: string,
  enabled: boolean,
  vehicleType: Phase1VehicleType | string = 'car',
) {
  const debouncedMake = useDebouncedValue(make, 250);
  const debouncedQuery = useDebouncedValue(query, 220);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || debouncedMake.trim().length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void vehicleCatalog
      .suggestModels(debouncedMake, debouncedQuery, vehicleType)
      .then((items) => {
        if (!cancelled) {
          setSuggestions(items);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedMake, debouncedQuery, enabled, vehicleType]);

  return { suggestions, loading };
}
