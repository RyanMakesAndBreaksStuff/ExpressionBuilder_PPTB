import { createRoot } from 'react-dom/client';
import { ExpressionBuilderShell } from '@pavb/builder-ui';
import { createPptbAdapter } from '@pavb/platform';

createRoot(document.getElementById('root')!).render(
  <ExpressionBuilderShell adapter={createPptbAdapter(window.toolboxAPI)} />,
);
