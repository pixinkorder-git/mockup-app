# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Architecture

This is a **Next.js 16 App Router** project with TypeScript, Tailwind CSS v4, and React 19. It is a mockup placer web app with a client-side canvas editor and a backend powered by **Supabase** (auth + profiles) and **LemonSqueezy** (payments).

### Key conventions

- **Tailwind v4**: Uses `@import "tailwindcss"` in `globals.css` (not `@tailwind` directives). Theme tokens are defined via `@theme inline` blocks. PostCSS config is in `postcss.config.mjs`.
- **Path alias**: `@/*` maps to the project root (e.g., `@/app/...`, `@/components/...`).
- **App Router**: All routes live under `app/`. The single-page app lives at `app/page.tsx`.
- **Client components**: Since the app is fully client-side (canvas manipulation, file APIs, flood fill), components doing browser work must use `"use client"` at the top.

### App structure

The app is a mockup placer tool. File layout:

```
app/
  page.tsx               # Landing page (static)
  layout.tsx             # Root layout, fonts
  globals.css            # CSS vars + @theme inline for Tailwind v4
  app/
    page.tsx             # Main editor — all canvas/state lives here (client component)
  auth/
    callback/            # Supabase OAuth callback
    signout/             # Sign-out handler
  api/
    templates/           # Serves templates.json (or DB-backed list)
    webhooks/
      lemonsqueezy/      # LemonSqueezy payment webhook → updates profiles.plan
  pricing/               # Pricing page
  profile/               # User profile page
  login/                 # Login page
  contact/ feedback/ privacy/ terms/   # Static pages
  components/
    DropZone.tsx         # Drag-and-drop file upload
    MockupEditor.tsx     # Canvas-based frame pinning editor
    ResultsGrid.tsx      # Results grid with per-card download
  utils/
    types.ts             # ArtImage, Frame, MockupTemplate, GeneratedResult
    floodFill.ts         # floodFillImage() — async, runs on offscreen canvas
    compositor.ts        # generateAllResults() — canvas compositing with multiply blend
```

**User flow:**
1. Upload art images + mockup templates (drag & drop)
2. In the Frame Editor, click white/light areas on a mockup → flood fill detects frame boundary
3. Adjust tolerance slider (10–120) if fill bleeds into background
4. Generate → all results composited client-side
5. Download individual results or all at once

**Key algorithms:**
- **Flood fill** (`utils/floodFill.ts`): Stack-based BFS on `ImageData` using `Int32Array` stack for perf. Runs on a hidden offscreen canvas at full image resolution. Warns if detected region >65% of image (likely background click).
- **Compositing** (`utils/compositor.ts`): Draws art images into frame bounding boxes with cover-crop scaling, then overlays the mockup with `ctx.globalCompositeOperation = 'multiply'`. This preserves shadows/textures within the frame area.

**Distribution logic:**
- Multi-frame mockup: one result with arts placed round-robin across frames
- Single-frame mockup: one result per art image

**Plan gating (Browse Library):**
- `plan` state is fetched from `profiles.plan` (Supabase) on load — values: `'free'` | `'basic'` | `'pro'`
- `FREE_TEMPLATES = ['mockup1', 'mockup2', 'mockup18']` — always unlocked
- Non-pro users see a lock overlay + "Pro" badge on all other library cards; clicking shows a toast
- Pro users have no restrictions

### Fonts

Geist Sans and Geist Mono are loaded via `next/font/google` in `app/layout.tsx` and exposed as CSS variables `--font-geist-sans` / `--font-geist-mono`.

---

## Design System

- Theme: Light/white background (#FFFFFF), warm white surfaces (#FDFCFB)
- Accent color: #FF6B35 (hover: #E85A28)
- Fonts: Clash Display (titles, from fontshare CDN), Satoshi (body, from fontshare CDN)
- Logo: public/1logo.png, already contains "MockPlacer" text, never add separate text next to it
- Buttons: #FF6B35 background, white text, border-radius 12px, box-shadow 0 4px 20px rgba(255,107,53,0.3)
- Disabled buttons: same color at 40% opacity
- Section titles: Clash Display, title case (not UPPERCASE), orange left border 3px solid #FF6B35 with padding-left 10px
- Drop zones: dashed border rgba(255,107,53,0.3), on hover border-color #FF6B35
- Cards: white bg, border-radius 20px, border 1px solid #E5E5E5, shadow 0 1px 3px rgba(0,0,0,0.04) 0 8px 32px rgba(0,0,0,0.06)
- Nav: white bg, backdrop-filter blur(20px), border-bottom 1px solid rgba(0,0,0,0.05)
- No dark theme
- No dashes (em dash, en dash) in any text content
- No uppercase section titles

---

## 📍 Proje Linkleri & Deployment

- **GitHub:** https://github.com/pixinkorder-git/mockup-app
- **Vercel (Live):** https://mockup-app-olive.vercel.app
- **Domain:** mockplacer.com
- **Lokal Klasör:** C:\Users\Umut\Desktop\mockup-app

## 💰 İş Modeli (Planlanan)

### Free Tier
- Aylık 5 mockup, watermark ile, temel şablonlar

### Pro Tier ($9-15/ay)
- Sınırsız mockup, watermark yok, tüm şablonlar, yüksek çözünürlük

## 📋 Roadmap

### Faz 1: MVP ✅
- Landing page
- Temel mockup editörü
- Kullanıcı upload sistemi

### Faz 2: Beta ✅
- Kullanıcı hesapları (Supabase Auth)
- Ödeme entegrasyonu (LemonSqueezy)
- Kütüphane kilitleme (free/pro plan gating)
- Daha fazla şablon (mockup13-69)

### Faz 3: Launch (Sonraki)
- SEO optimizasyonu
- Marketing kampanyaları
- Watermark (free tier)
- Aylık mockup limiti (free tier)
