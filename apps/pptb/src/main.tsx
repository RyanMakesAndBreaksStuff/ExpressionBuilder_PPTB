import { createRoot } from 'react-dom/client';
import { ExpressionBuilderShell } from '@ryanmakes/eb_builder-ui';
import { createPptbAdapter } from '@ryanmakes/eb_platformadapter';

const adapter = createPptbAdapter(window.toolboxAPI);

async function main() {
  let initialTheme: Awaited<ReturnType<typeof adapter.getTheme>> = 'light';
  try {
    initialTheme = await adapter.getTheme();
  } catch {
    // Keep the light fallback so the shell still renders.
  }

  createRoot(document.getElementById('root')!).render(
    <ExpressionBuilderShell adapter={adapter} initialTheme={initialTheme} platform="pptb" />,
  );
}

void main();
