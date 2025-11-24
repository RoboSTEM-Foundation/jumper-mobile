# Vercel Subpath Deployment Guide

## Configuration Steps

### 1. Vite Configuration
The `vite.config.js` now includes `base: '/jumper/'` to ensure all assets are prefixed correctly.

### 2. Vercel Configuration  
The `vercel.json` handles:
- **Root redirect**: `tools.robostem.org` → `https://robostem.org`
- **Subpath routing**: `/jumper` → serves the Vite app
- **Asset rewrites**: All `/jumper/*` paths work correctly

### 3. Domain Setup in Vercel

1. Go to your Vercel project settings
2. Navigate to **Domains**
3. Add `tools.robostem.org` as a custom domain
4. Vercel will provide DNS records for your domain provider

### 4. DNS Configuration (at your domain provider)

Add a CNAME record:
```
Type: CNAME
Name: tools
Value: cname.vercel-dns.com
```

### 5. Deployment

```bash
# Build locally to test
npm run build
npm run preview

# Commit and push to trigger Vercel deployment
git add .
git commit -m "Configure subpath deployment at /jumper"
git push
```

### 6. Testing

After deployment:
- `tools.robostem.org` → Redirects to `robostem.org` ✓
- `tools.robostem.org/jumper` → Your Live Viewer app ✓
- All assets load correctly from `/jumper/assets/*` ✓

### Future Tools

To add more tools under other subpaths:
1. Create new projects/folders for each tool
2. Build each with appropriate base paths (`/other-tool/`)
3. Add rewrites to `vercel.json` for each subpath

## Important Notes

- The `base` path in `vite.config.js` must match the Vercel routing
- All internal app links work relative to the base path automatically
- Environment variables remain the same
- Vercel Analytics will continue working at the subpath
