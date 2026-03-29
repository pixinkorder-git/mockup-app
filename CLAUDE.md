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

This is a **Next.js 16 App Router** project with TypeScript, Tailwind CSS v4, and React 19. It is a **fully client-side** mockup placer web app — no backend, no API routes, no server actions.

### Key conventions

- **Tailwind v4**: Uses `@import "tailwindcss"` in `globals.css` (not `@tailwind` directives). Theme tokens are defined via `@theme inline` blocks. PostCSS config is in `postcss.config.mjs`.
- **Path alias**: `@/*` maps to the project root (e.g., `@/app/...`, `@/components/...`).
- **App Router**: All routes live under `app/`. The single-page app lives at `app/page.tsx`.
- **Client components**: Since the app is fully client-side (canvas manipulation, file APIs, flood fill), components doing browser work must use `"use client"` at the top.

### App structure

The app is a mockup placer tool. File layout:

```
app/
  page.tsx               # Main app — all state lives here (client component)
  layout.tsx             # Fonts: Bebas Neue (display), Syne (body), JetBrains Mono (mono)
  globals.css            # CSS vars + @theme inline for Tailwind v4
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

### Fonts

Geist Sans and Geist Mono are loaded via `next/font/google` in `app/layout.tsx` and exposed as CSS variables `--font-geist-sans` / `--font-geist-mono`.

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

### Faz 1: MVP (Mevcut) ✅
- Landing page
- Temel mockup editörü
- Kullanıcı upload sistemi

### Faz 2: Beta (Sonraki)
- Kullanıcı hesapları
- Ödeme entegrasyonu (Stripe)
- Daha fazla şablon

### Faz 3: Launch
- SEO optimizasyonu
- Marketing kampanyaları
