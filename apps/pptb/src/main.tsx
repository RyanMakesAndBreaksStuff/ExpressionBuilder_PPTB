import { createRoot } from 'react-dom/client';
import { ExpressionBuilderShell } from '@ryanmakes/eb_builder-ui';
import { createPptbAdapter } from '@ryanmakes/eb_platformadapter';

const adapter = createPptbAdapter(window.toolboxAPI);
const initialTheme = await adapter.getTheme();

createRoot(document.getElementById('root')!).render(
  <ExpressionBuilderShell adapter={adapter} initialTheme={initialTheme} platform="pptb" />,
);
