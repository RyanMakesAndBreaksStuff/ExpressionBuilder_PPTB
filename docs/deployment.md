# Deployment

The repo emits two static hosts: one for browser publishing and one for Power Platform Toolbox packaging.

## Web Build

Build the browser host:

```powershell
npm run build:web
```

Preview the browser build:

```powershell
npm run preview:web
```

Theme changes are sourced from `packages/builder-ui/src/theme/workbenchTokens.ts`. `npm run preview:web` rebuilds before serving so the preview uses fresh `dist` output.

Publish the contents of `apps/web/dist` to GitHub Pages. The directory is a static Vite build and should include `index.html` plus generated assets.

## PPTB Build

Build the Power Platform Toolbox host:

```powershell
npm run build:pptb
```

Package the contents of `apps/pptb/dist` as the PPTB static package. The package should include `index.html` plus generated assets, with host integration provided through the PPTB bootstrap and platform adapter.

Re-run `npm run build:pptb` before loading the package into Power Platform Toolbox whenever builder-ui theme files change.
