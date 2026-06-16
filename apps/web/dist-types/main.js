import { jsx as _jsx } from "react/jsx-runtime";
import { createRoot } from 'react-dom/client';
import { ExpressionBuilderShell } from '@pavb/builder-ui';
import { createWebAdapter } from '@pavb/platform';
createRoot(document.getElementById('root')).render(_jsx(ExpressionBuilderShell, { adapter: createWebAdapter() }));
