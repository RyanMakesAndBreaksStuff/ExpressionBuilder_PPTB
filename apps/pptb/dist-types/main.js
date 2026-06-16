import { jsx as _jsx } from "react/jsx-runtime";
import { createRoot } from 'react-dom/client';
import { ExpressionBuilderShell } from '@ryanmakes/eb_builder-ui';
import { createPptbAdapter } from '@ryanmakes/eb_platformadapter';
createRoot(document.getElementById('root')).render(_jsx(ExpressionBuilderShell, { adapter: createPptbAdapter(window.toolboxAPI) }));
