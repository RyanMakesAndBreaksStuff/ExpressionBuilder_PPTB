import { createRoot } from 'react-dom/client';
import { ExpressionBuilderShell } from '@ryanmakes/eb_builder-ui';
import { createWebAdapter } from '@ryanmakes/eb_platformadapter';

const adapter = createWebAdapter();
const initialTheme = await adapter.getTheme();

createRoot(document.getElementById('root')!).render(
  <ExpressionBuilderShell adapter={adapter} initialTheme={initialTheme} platform="web" />,
);
