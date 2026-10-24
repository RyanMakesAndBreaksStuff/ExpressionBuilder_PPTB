import { createRoot } from 'react-dom/client';
import { createWebAdapter } from '@ryanmakes/eb_platformadapter';
import { WebApp } from './WebApp';

const adapter = createWebAdapter();
const initialTheme = await adapter.getTheme();

createRoot(document.getElementById('root')!).render(
  <WebApp adapter={adapter} initialTheme={initialTheme} />,
);
