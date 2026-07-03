import { createRoot } from 'react-dom/client';
import { ExpressionBuilderShell } from '@ryanmakes/eb_builder-ui';
import { createWebAdapter } from '@ryanmakes/eb_platformadapter';

createRoot(document.getElementById('root')!).render(
  <ExpressionBuilderShell adapter={createWebAdapter()} platform="web" />,
);
