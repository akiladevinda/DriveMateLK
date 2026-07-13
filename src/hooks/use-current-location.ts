import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

export type Coords = {
  latitude: number;
  longitude: number;
};

export type CurrentLocationState = {
  coords: Coords | null;
  loading: boolean;
  error: string | null;
  permissionDenied: boolean;
  refresh: () => Promise<Coords | null>;
};

export function useCurrentLocation(autoRequest = true): CurrentLocationState {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(autoRequest);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const didAutoRequest = useRef(false);

  const refresh = useCallback(async (): Promise<Coords | null> => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        setError('Location permission is required to find nearby workshops.');
        setCoords(null);
        return null;
      }

      setPermissionDenied(false);
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const next = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setCoords(next);
      return next;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not read your location.';
      setError(message);
      setCoords(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!autoRequest || didAutoRequest.current) return;
    didAutoRequest.current = true;
    void refresh();
  }, [autoRequest, refresh]);

  return { coords, loading, error, permissionDenied, refresh };
}
