import { createRoot } from 'react-dom/client';
import { createWebAdapter } from '@ryanmakes/eb_platformadapter';
import { WebApp } from './WebApp';

const adapter = createWebAdapter();
let initialTheme: Awaited<ReturnType<typeof adapter.getTheme>> = 'light';
try {
  initialTheme = await adapter.getTheme();
} catch {
  // Keep the light fallback so the app still renders.
}

createRoot(document.getElementById('root')!).render(
  <WebApp adapter={adapter} initialTheme={initialTheme} />,
);
