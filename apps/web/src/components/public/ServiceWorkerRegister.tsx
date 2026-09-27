'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          void registration.unregister();
        }
      });

      if ('caches' in window) {
        caches.keys().then((keys) => {
          for (const key of keys) {
            void caches.delete(key);
          }
        });
      }
    }
  }, []);

  return null;
}
