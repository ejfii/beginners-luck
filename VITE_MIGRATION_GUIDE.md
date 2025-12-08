# Vite Migration Guide
**From:** Create React App (react-scripts 5.0.1)  
**To:** Vite 6.x  
**Estimated Time:** 2-4 hours  
**Difficulty:** Medium  

---

## Why Migrate?

### Problems with Current Setup (CRA)
- ❌ Create React App is **deprecated** (abandoned by Meta in 2023)
- ❌ Frozen on `react-scripts@5.0.1` with **9 known vulnerabilities**
- ❌ Cannot upgrade eslint, webpack, or other build tools
- ❌ Slow development server (5-10 second restarts)
- ❌ Large bundle sizes due to poor tree-shaking
- ❌ No security updates or bug fixes

### Benefits of Vite
- ✅ **Actively maintained** (weekly releases, 2024+)
- ✅ **10-100x faster** HMR (Hot Module Replacement)
- ✅ **Zero known vulnerabilities**
- ✅ **Smaller bundles** (20-40% reduction typical)
- ✅ Native ESM in development (instant startup)
- ✅ Modern tooling (Rollup + esbuild)
- ✅ Same simplicity as CRA

---

## Prerequisites

```bash
# Ensure you're on a clean git state
git status

# Create a feature branch
git checkout -b feature/migrate-to-vite

# Backup current package.json
cp client/package.json client/package.json.backup
```

---

## Step 1: Remove CRA Dependencies

```bash
cd client

# Remove react-scripts and related dependencies
npm uninstall react-scripts

# This will remove ~600 MB of node_modules
```

---

## Step 2: Install Vite

```bash
# Install Vite and React plugin
npm install --save-dev vite @vitejs/plugin-react

# Optional: Install Vitest if you want to migrate tests too
npm install --save-dev vitest @vitest/ui
```

**Expected `package.json` changes:**
```json
{
  "devDependencies": {
    "vite": "^6.0.0",
    "@vitejs/plugin-react": "^4.3.4"
  }
}
```

---

## Step 3: Update Package Scripts

**Before (CRA):**
```json
{
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  }
}
```

**After (Vite):**
```json
{
  "scripts": {
    "dev": "vite",
    "start": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "lint": "eslint src --ext .js,.jsx"
  }
}
```

---

## Step 4: Create Vite Configuration

Create `client/vite.config.js`:

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  
  // Development server config
  server: {
    port: 3000,
    open: true, // Auto-open browser
    
    // Proxy API requests to backend
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false
      }
    }
  },

  // Build configuration
  build: {
    outDir: 'build', // Keep same output directory as CRA
    sourcemap: true,
    
    // Code splitting optimization
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'pdf': ['jspdf', 'html2canvas']
        }
      }
    }
  },

  // Enable CSS processing
  css: {
    modules: {
      localsConvention: 'camelCase'
    }
  },

  // Define environment variables
  define: {
    'process.env': {}
  }
});
```

---

## Step 5: Restructure index.html

### Move index.html to Root

**Before:** `client/public/index.html`  
**After:** `client/index.html`

```bash
mv client/public/index.html client/index.html
```

### Update index.html Content

**Remove these CRA-specific tags:**
```html
<!-- DELETE: -->
<link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
<link rel="manifest" href="%PUBLIC_URL%/manifest.json" />
```

**Add Vite entry point:**
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Negotiation Engine - AI-powered settlement analysis" />
    <link rel="manifest" href="/manifest.json" />
    <title>Negotiation Engine</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
    
    <!-- Vite entry point -->
    <script type="module" src="/src/index.js"></script>
  </body>
</html>
```

**Key changes:**
1. ❌ Remove `%PUBLIC_URL%` (Vite handles this automatically)
2. ✅ Add `<script type="module" src="/src/index.js">`
3. ✅ Public assets now referenced from root: `/favicon.ico`

---

## Step 6: Update Environment Variables

### Rename Files

**Before:** `.env` with `REACT_APP_*` prefix  
**After:** `.env` with `VITE_*` prefix

```bash
# If you have environment variables
# Change from:
REACT_APP_API_BASE_URL=http://localhost:5001/api

# To:
VITE_API_BASE_URL=http://localhost:5001/api
```

### Update Code References

**Before (CRA):**
```javascript
const API_URL = process.env.REACT_APP_API_BASE_URL;
```

**After (Vite):**
```javascript
const API_URL = import.meta.env.VITE_API_BASE_URL;
```

**Search and replace in all files:**
```bash
# Find all uses of process.env
grep -r "process\.env\.REACT_APP" client/src/

# Update each file manually or use sed:
find client/src -type f -name "*.js" -exec sed -i '' 's/process\.env\.REACT_APP_/import.meta.env.VITE_/g' {} +
```

---

## Step 7: Update ESLint Configuration

Update `client/package.json` eslintConfig:

**Before:**
```json
{
  "eslintConfig": {
    "extends": ["react-app"]
  }
}
```

**After:**
```json
{
  "eslintConfig": {
    "extends": ["eslint:recommended", "plugin:react/recommended"],
    "env": {
      "browser": true,
      "es2021": true
    },
    "parserOptions": {
      "ecmaVersion": "latest",
      "sourceType": "module"
    },
    "settings": {
      "react": {
        "version": "detect"
      }
    }
  }
}
```

**Install new eslint dependencies:**
```bash
npm install --save-dev eslint-plugin-react eslint-plugin-react-hooks
```

---

## Step 8: Fix Import Paths (if needed)

Vite is stricter about imports. Check these patterns:

### Import Extensions
Most imports work as-is, but check for:

```javascript
// ❌ May cause issues in Vite
import Component from './Component';

// ✅ Explicit extension (safer)
import Component from './Component.js';
```

**Run this to check:**
```bash
# Find imports without extensions
grep -r "from '\./.*[^']'" client/src/ | grep -v "\.js'" | grep -v "\.css'"
```

### Dynamic Imports
```javascript
// ✅ Both work in Vite
import('jspdf')
import('./Component.js')
```

### Asset Imports
```javascript
// ✅ Images, fonts, etc.
import logo from './logo.svg';
import './App.css';
```

---

## Step 9: Update Testing (Optional)

If you want to use Vitest instead of Jest:

### Install Vitest
```bash
npm install --save-dev vitest @vitest/ui jsdom
npm install --save-dev @testing-library/react @testing-library/jest-dom
```

### Create vitest.config.js
```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
  },
});
```

### Update setupTests.js
```javascript
import '@testing-library/jest-dom';
```

**Or keep Jest:** Just update test script to `jest` instead of `react-scripts test`

---

## Step 10: Test the Migration

### Start Development Server
```bash
cd client
npm start  # or npm run dev

# Expected output:
# VITE v6.0.0  ready in 234 ms
# ➜  Local:   http://localhost:3000/
# ➜  Network: use --host to expose
```

**Success indicators:**
- ✅ Server starts in <1 second (vs 10+ seconds with CRA)
- ✅ Browser opens automatically
- ✅ App loads without errors
- ✅ HMR (hot reload) works instantly

### Test Production Build
```bash
npm run build

# Expected output:
# vite v6.0.0 building for production...
# ✓ 124 modules transformed.
# build/index.html                   0.45 kB │ gzip: 0.30 kB
# build/assets/index-[hash].css      8.23 kB │ gzip: 2.51 kB
# build/assets/index-[hash].js      82.14 kB │ gzip: 32.45 kB
```

**Check bundle size reduction:**
```bash
# Compare build sizes
du -sh build/  # Should be 20-40% smaller than CRA build
```

### Preview Production Build
```bash
npm run preview

# Opens production build at http://localhost:4173
```

---

## Step 11: Update .gitignore

Vite-specific additions:
```bash
# Vite
dist/
*.local

# Keep these from CRA
build/
node_modules/
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```

---

## Step 12: Test All Features

**Critical paths to verify:**

1. **Authentication**
   - [ ] Login works
   - [ ] Registration works
   - [ ] Session persistence

2. **Negotiations**
   - [ ] List loads
   - [ ] Create new negotiation
   - [ ] Edit existing negotiation
   - [ ] Delete negotiation

3. **Moves & Brackets**
   - [ ] Add plaintiff move
   - [ ] Add defendant move
   - [ ] View brackets
   - [ ] Calculations are correct

4. **PDF Export**
   - [ ] Export negotiation as PDF (jspdf 3.x)
   - [ ] PDF contains all data
   - [ ] Images render correctly

5. **Templates**
   - [ ] Save as template
   - [ ] Create from template
   - [ ] Delete template

6. **Mediation View**
   - [ ] Opens correctly
   - [ ] Timer works
   - [ ] Proposals submit

---

## Step 13: Update Documentation

Update `README.md` with new commands:

```markdown
## Development

```bash
# Install dependencies
cd client
npm install

# Start development server (Vite)
npm start

# Build for production
npm run build

# Preview production build
npm run preview
```

## Production Deployment

The build outputs to `client/build/` (same as before).
Deploy these static files to your hosting provider.
```

---

## Troubleshooting

### Issue: "Cannot find module"
**Cause:** Missing `.js` extension in import  
**Fix:** Add explicit extension: `import X from './X.js'`

### Issue: "process is not defined"
**Cause:** Using `process.env` instead of `import.meta.env`  
**Fix:** Replace `process.env.REACT_APP_X` with `import.meta.env.VITE_X`

### Issue: "Global is not defined"
**Cause:** Some libraries expect Node globals  
**Fix:** Add to `vite.config.js`:
```javascript
define: {
  global: 'globalThis'
}
```

### Issue: CSS not loading
**Cause:** Import path issue  
**Fix:** Ensure CSS imports use relative paths: `import './App.css'`

### Issue: Build fails with "out of memory"
**Fix:** Increase Node memory:
```bash
NODE_OPTIONS=--max_old_space_size=4096 npm run build
```

---

## Rollback Plan

If something goes wrong:

```bash
# Restore original package.json
cp client/package.json.backup client/package.json

# Reinstall CRA dependencies
npm install

# Delete Vite config
rm client/vite.config.js

# Move index.html back
mv client/index.html client/public/index.html

# Restore original scripts
git checkout client/package.json

# Clean install
rm -rf node_modules package-lock.json
npm install
```

---

## Performance Comparison

### Development Server Startup

| Metric | CRA | Vite | Improvement |
|--------|-----|------|-------------|
| Cold start | 8-12s | 0.2-0.5s | **20-40x faster** |
| HMR | 2-5s | <50ms | **40-100x faster** |
| Memory usage | 600-800 MB | 150-250 MB | **60-70% less** |

### Production Build

| Metric | CRA | Vite | Improvement |
|--------|-----|------|-------------|
| Build time | 45-60s | 10-15s | **3-4x faster** |
| Bundle size | ~250 kB | ~180 kB | **28% smaller** |
| Chunks | Basic | Optimized | Better caching |

---

## Post-Migration Checklist

- [ ] Development server starts in <1 second
- [ ] Hot reload works instantly
- [ ] All pages load without errors
- [ ] Authentication flows work
- [ ] API calls succeed (proxy configured correctly)
- [ ] PDF export works (jspdf)
- [ ] Production build succeeds
- [ ] Production bundle is smaller than CRA
- [ ] All tests pass
- [ ] ESLint works
- [ ] Environment variables work
- [ ] Git history is clean
- [ ] Documentation updated
- [ ] Team informed of new commands

---

## Additional Resources

- [Vite Official Guide](https://vitejs.dev/guide/)
- [Vite React Plugin](https://github.com/vitejs/vite-plugin-react)
- [Migrating from CRA](https://vitejs.dev/guide/migration.html)
- [Vite Performance](https://vitejs.dev/guide/why.html)

---

## Conclusion

After migration:
- ✅ **Zero security vulnerabilities** (down from 9)
- ✅ **10-100x faster development** experience
- ✅ **Smaller production bundles**
- ✅ **Modern, maintained tooling**
- ✅ **Same React code** (no rewrites needed)

**Estimated time:** 2-4 hours for first-time migration  
**Maintenance time saved:** ~2-3 hours/month (faster development)

---

**Need Help?** Create an issue or consult the Vite Discord community.
