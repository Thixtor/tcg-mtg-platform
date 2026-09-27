// ---------------------------------------------------------
// 4. HOOK DE DEBOUNCING PARA EL BUSCADOR
// ---------------------------------------------------------
import { useState, useEffect } from 'react';

/**
 * Retrasa la actualización de un valor hasta que transcurra un tiempo sin cambios.
 * Evita disparar peticiones excesivas a la API mientras el usuario escribe.
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}