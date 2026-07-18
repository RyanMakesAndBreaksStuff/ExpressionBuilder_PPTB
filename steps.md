# Repository Cleanup & GitHub Pages Setup

## Part A: Remove Sensitive/Unused Directories from Git History

### Overview
Remove all traces of `/docs`, `/tasks`, `AGENTS.md`, `.claude`, and `.agents` from the entire commit history. These directories contain development artifacts, AI agent configs, and internal planning that should not be in the repository.

**Current State:**
- 27 tracked files across `/docs`, `AGENTS.md` in git history
- `.claude` and `.agents` are gitignored but may exist in commits

### Prerequisites
```bash
# Install git-filter-repo (modern replacement for git filter-branch)
# On most systems:
python3 -m pip install --user git-filter-repo

# Verify installation
git filter-repo --version
```

### Step 1: Create a Backup
```bash
# Clone a backup before destructive operations
cd /tmp
git clone /home/user/ExpressionBuilder_PPTB ExpressionBuilder_PPTB_backup
cd ExpressionBuilder_PPTB_backup
git log --oneline | head -5  # Verify backup has history
```

### Step 2: Prepare the Filter List
Create a file listing paths to remove (save as `/tmp/paths-to-remove.txt`):
```
docs/
tasks/
AGENTS.md
.claude/
.agents/
```

### Step 3: Execute History Rewrite (DESTRUCTIVE)
```bash
cd /home/user/ExpressionBuilder_PPTB

# Remove paths from entire history
git filter-repo --paths-from-file /tmp/paths-to-remove.txt --invert-paths

# This operation:
# - Rewrites all commits
# - Creates .git-bfg-report/ with audit logs
# - LOSES the branches listed above in old-refs/
```

**After running this, the working tree will:**
- Keep only files NOT in the removal list
- Have a rewritten commit history
- Lose branch history (restore manually if needed)

### Step 4: Restore Working Branches
```bash
# The rewrite leaves you in detached state
# Restore main branch
git checkout -B main refs/original/refs/heads/main

# Restore the feature branch
git checkout -B claude/repo-cleanup-static-hosting-1rckuz refs/original/refs/heads/claude/repo-cleanup-static-hosting-1rckuz

# Verify history is clean
git log --oneline | head -10
git ls-files | grep -E '(^docs/|^tasks/|^AGENTS\.md|^\.claude|^\.agents)'  # Should be empty
```

### Step 5: Force Push to Remote (DESTRUCTIVE)
```bash
# Update `.gitignore` to ensure these are never re-added
# (if not already excluding them)

# Force push both branches
git push -f origin main
git push -f origin claude/repo-cleanup-static-hosting-1rckuz

# ⚠️  This rewrites remote history—inform team before executing
```

### Step 6: Verify Cleanup
```bash
# Confirm files are removed from history
git log -p --all -- docs/ | head -20  # Should show nothing recent
git log --all --format='%h %s' --follow -- AGENTS.md | wc -l  # Check if references exist

# Check repository size reduction
du -sh .git  # Before: ~X MB, After: ~Y MB (should be notably smaller)
```

---

## Part B: Host app/web Build as GitHub Pages (Static Site)

### Overview
Deploy the `apps/web` build artifacts to GitHub Pages, serving as a static site accessible at `https://RyanMakesAndBreaksStuff.github.io/ExpressionBuilder_PPTB/`.

### Option 1: Use `gh-pages` Branch (Recommended)

#### Step 1: Install gh-pages Package
```bash
cd /home/user/ExpressionBuilder_PPTB
npm install --save-dev gh-pages
```

#### Step 2: Configure package.json Scripts
Update `package.json` at the root:
```json
{
  "scripts": {
    "build": "tsc -b && npm run build:apps",
    "build:apps": "npm run build --workspaces",
    "build:web": "tsc -b packages/builder-ui && vite build --config apps/web/vite.config.ts",
    "deploy:web": "npm run build:web && gh-pages -d apps/web/dist -b gh-pages"
  }
}
```

#### Step 3: Deploy
```bash
npm run deploy:web
# This:
# - Builds apps/web/dist
# - Creates/updates gh-pages branch
# - Pushes to remote
```

#### Step 4: Configure GitHub Pages in Repository Settings
1. Go to: https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/settings/pages
2. Set **Source** to `Deploy from a branch`
3. Select branch: `gh-pages`
4. Select folder: `/ (root)`
5. Click Save

**Site will be live at:** `https://RyanMakesAndBreaksStuff.github.io/ExpressionBuilder_PPTB/`

---

### Option 2: GitHub Actions (Automatic Deployment on Push)

#### Step 1: Create Workflow File
Create `.github/workflows/deploy-web.yml`:
```yaml
name: Deploy app/web to GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build app/web
        run: npm run build:web
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: 'apps/web/dist'
  
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

#### Step 2: Enable GitHub Pages in Repository Settings
1. Navigate to: https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/settings/pages
2. Set **Source** to `GitHub Actions`
3. Save

#### Step 3: Trigger Deployment
```bash
git push origin main  # Workflow auto-triggers on push
```

Or manually trigger via Actions tab.

---

### Option 3: Use Vite's Built-in Deployment (Simplest)

#### Step 1: Update vite.config.ts
Modify `apps/web/vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

const workspaceSrc = {
  '@ryanmakes/eb_engine': resolve(import.meta.dirname, '../../packages/engine/src/index.ts'),
  '@ryanmakes/eb_platformadapter': resolve(import.meta.dirname, '../../packages/platform/src/index.ts'),
  '@ryanmakes/eb_builder-ui': resolve(import.meta.dirname, '../../packages/builder-ui/src/index.ts'),
};

export default defineConfig({
  base: '/ExpressionBuilder_PPTB/',  // ← Add this for repo subdirectory
  plugins: [react()],
  resolve: { alias: workspaceSrc },
});
```

#### Step 2: Build and Deploy
```bash
npm run build:web
npx gh-pages -d apps/web/dist -b gh-pages
```

---

### Verify Deployment

After choosing an option above:

```bash
# Check gh-pages branch exists
git branch -r | grep gh-pages

# Verify contents
git show gh-pages:index.html | head -10

# Visit in browser
# https://RyanMakesAndBreaksStuff.github.io/ExpressionBuilder_PPTB/
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| 404 errors on subpages | Ensure `base: '/ExpressionBuilder_PPTB/'` in vite.config.ts |
| Build fails | Run `npm run typecheck` and `npm run lint` first |
| Pages not updating | Clear browser cache, check gh-pages branch has latest |
| Actions permissions error | Enable `pages: write` in workflow permissions |

---

## Summary Workflow

### Complete One-Time Setup
```bash
# 1. History cleanup (requires force-push approval)
cd /home/user/ExpressionBuilder_PPTB
python3 -m pip install --user git-filter-repo
git filter-repo --paths-from-file /tmp/paths-to-remove.txt --invert-paths
git checkout -B main refs/original/refs/heads/main
git push -f origin main

# 2. GitHub Pages setup (choose ONE option)
# Option A: GitHub Actions (recommended for CI/CD)
mkdir -p .github/workflows
# Copy deploy-web.yml from Option 2 above
git add .github/workflows/deploy-web.yml
git commit -m "ci: add GitHub Pages deployment workflow"

# Option B: Manual gh-pages branch
npm install --save-dev gh-pages
npm run build:web
npx gh-pages -d apps/web/dist -b gh-pages

# 3. Configure repository settings
# Visit: https://github.com/RyanMakesAndBreaksStuff/ExpressionBuilder_PPTB/settings/pages
# - Choose deployment source (GitHub Actions or gh-pages branch)
# - Save

# 4. Verify
git log --oneline | head -5
npm run build:web  # Test build succeeds
# Visit: https://RyanMakesAndBreaksStuff.github.io/ExpressionBuilder_PPTB/
```

---

## Notes & Considerations

1. **Backup First**: History rewriting is destructive. Keep the backup in `/tmp/ExpressionBuilder_PPTB_backup`.
2. **Team Coordination**: Force-push to main requires team awareness to avoid conflicts.
3. **Base Path**: If hosting at a subdirectory, always include `base: '/ExpressionBuilder_PPTB/'` in Vite config.
4. **Size Impact**: Removing `docs/` should reduce `.git` size by 5-20% depending on media assets.
5. **Node Version**: Project requires Node `>=24.17.0 <25` (enforce via `.nvmrc` or CI).
6. **Continuous Deployment**: Option 2 (GitHub Actions) is best for automatic updates on every commit.

