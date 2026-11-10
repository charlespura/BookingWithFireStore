import { useEffect, useState } from 'react';
import { configured } from './config';
import {
  defaultServices,
  defaultSettings,
  type Service,
  type Settings,
  type Slot,
} from '../models';
export function useCatalog() {
  const [services, setServices] = useState<Service[]>(defaultServices);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    let off: (() => void) | undefined;
    const loaded = new Set<string>();
    const done = (part: string) => {
      loaded.add(part);
      if (loaded.size === 2) setLoading(false);
    };
    const fail = () => {
      if (!cancelled) {
        setError('Visit availability is temporarily unavailable. Please try again shortly.');
        setLoading(false);
      }
    };
    void import('./catalogRuntime')
      .then(({ subscribeCatalog }) => {
        if (cancelled) return;
        off = subscribeCatalog(
          (s) => {
            setServices(s);
            done('services');
          },
          (s) => {
            setSettings(s);
            done('settings');
          },
          fail,
        );
      })
      .catch(fail);
    return () => {
      cancelled = true;
      off?.();
    };
  }, []);
  return { services, settings, loading, error };
}
export function useSlots(date: string) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadedDate, setLoadedDate] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!configured || !date) return;
    let cancelled = false;
    let off: (() => void) | undefined;
    const fail = () => {
      if (!cancelled) {
        setError('We could not check these times. Please try again later.');
        setLoadedDate(date);
      }
    };
    void import('./catalogRuntime')
      .then(({ subscribeSlots }) => {
        if (cancelled) return;
        off = subscribeSlots(
          date,
          (s) => {
            setSlots(s);
            setError('');
            setLoadedDate(date);
          },
          fail,
        );
      })
      .catch(fail);
    return () => {
      cancelled = true;
      off?.();
    };
  }, [date]);
  return { slots, loading: configured && loadedDate !== date, error };
}
