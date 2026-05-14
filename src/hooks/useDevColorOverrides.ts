import { useEffect } from 'react';
import { useDevToolStore } from '../stores/devToolStore';

export function useDevColorOverrides(): void {
  const overrides = useDevToolStore((state) => state.overrides);

  useEffect(() => {
    Object.entries(overrides).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });

    return () => {
      Object.keys(overrides).forEach((key) => {
        document.documentElement.style.removeProperty(key);
      });
    };
  }, [overrides]);
}
