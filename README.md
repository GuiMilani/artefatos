# artefatos

Art portfolio of Guilherme Milani, live at https://guimilani.github.io/artefatos/.

Each **artifact** (*artefato*) is a self-contained production cycle: analogue photos, scans,
tags, stickers, textures, sound, video and 3D scans. The site is meant to be a piece in itself,
mobile first.

The index works like a terminal catalogue. As the list scrolls, the row crossing the reading line
becomes active and its cover is redrawn in ASCII, bit by bit, on a canvas beneath the list.
The ASCII reveal is modelled on the old landing page of the YEAR0001 label.

## Run locally

```sh
npm install
npm run dev      # http://localhost:4321/artefatos/
npm run build    # outputs the static site to dist/
```

## Add an artifact

1. Create a folder at `src/content/artifacts/<slug>/`. The slug becomes the URL: `/artefatos/a/<slug>/`.
2. Put the cover and media in subfolders (`photos/`, `scans/`, `audio/`, `video/`, `3d/`).
3. Add an `index.md` with the metadata:

```yaml
---
number: "0003"            # catalogue number; the index sorts highest first
title: "cycle name"
year: "2026"              # shown on the index row
period: "2025–2026"
place: "Sorocaba / SP"
media: ["foto", "scan", "som"]
accent: "#ff2a2a"         # the artifact's single colour
cover: ./photos/01.jpg
seed: 3                   # changes the order of the ASCII reveal
charset: default          # default | blocks | kana
brightness: max           # max (faithful to year0001, drops colour) | luma
draft: false              # true hides the artifact
blocks:
  - { type: photo, src: ./photos/01.jpg, caption: "35mm, hp5", pixelated: false }
  - { type: scan, src: ./scans/02.jpg }
  - { type: text, content: "two lines at most" }
  - { type: audio, src: ./audio/track.mp3, title: "track 01", loop: false }
  - { type: video, src: ./video/loop.mp4, poster: ./video/loop.jpg }
  - { type: model3d, src: ./3d/object.glb, poster: ./3d/object.jpg }
---
```

Visible text on the site (titles, captions, the poem) stays in Portuguese: it is part of the work.

### Media formats

- Photos and scans: JPG or PNG, up to 2400 px on the long edge. The build generates AVIF and WebP at 480, 800 and 1200 px.
  Use `pixelated: true` for low-resolution sources such as Nintendo DS photos.
- Audio: MP3 at 192–256 kbps. Short seamless loops: WAV.
- Video (TouchDesigner exports): H.264 MP4, 720p, 3–8 MB, muted so it can autoplay.
- 3D: `.glb` with Draco or meshopt compression, up to about 5 MB.
- No single file may exceed 100 MB (GitHub limit). Full-resolution masters stay out of the repo.

## Structure

- `src/content/artifacts/`: the content, one folder per artifact.
- `src/content.config.ts`: the metadata schema.
- `src/lib/ascii.ts`: converts a cover into characters at build time.
- `src/lib/ascii-canvas.ts`: draws and animates the ASCII in the browser.
- `src/pages/index.astro`: the index.
- `src/pages/a/[id].astro`: the artifact page.

## Deployment

Every push to `main` builds and publishes the site with GitHub Actions
(Settings → Pages → Source: GitHub Actions).
