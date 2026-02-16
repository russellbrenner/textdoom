# Running TextDoom on Kindle

This guide explains how to compile and run TextDoom on a Kindle device.

## Quick Start (No Compilation Needed)

The easiest way to play TextDoom on your Kindle is to simply visit the live version in your Kindle's web browser:

**[https://russellbrenner.github.io/textdoom/](https://russellbrenner.github.io/textdoom/)**

This requires no compilation or setup—just open the browser on your Kindle and navigate to the URL.

## Compiling for Local Use

If you want to compile and run TextDoom locally on your Kindle (e.g., for offline play or development), follow these steps:

### Prerequisites

You'll need a computer with:
- **Node.js** (version 16 or higher) — [Download from nodejs.org](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** (optional, for cloning the repository)

### Step 1: Get the Source Code

Clone the repository or download it as a ZIP:

```bash
# Using Git
git clone https://github.com/russellbrenner/textdoom.git
cd textdoom

# OR download ZIP from GitHub and extract it
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs the required build tools (TypeScript and Vite).

### Step 3: Build the Project

```bash
npm run build
```

This compiles the TypeScript code and creates production-ready files in the `dist/` folder. The build process:
1. Type-checks the TypeScript code with `tsc`
2. Bundles and optimizes everything with Vite
3. Outputs static HTML/JS/CSS files to `dist/`

### Step 4: Transfer Files to Kindle

After building, you'll have a `dist/` folder with these files:
- `index.html` — Main HTML file
- `assets/` — JavaScript bundle and other assets

**Important:** The default build uses `/textdoom/` as the base path (for GitHub Pages). To run locally on your Kindle, you need to rebuild with a relative base path:

1. Edit `vite.config.ts` and change the base path:
   ```typescript
   import { defineConfig } from 'vite';

   export default defineConfig({
     base: './',  // Changed from '/textdoom/'
     build: {
       outDir: 'dist',
       sourcemap: true,
     },
   });
   ```

2. Rebuild:
   ```bash
   npm run build
   ```

3. Transfer the entire `dist/` folder to your Kindle:
   - Connect your Kindle to your computer via USB
   - Copy the `dist/` folder to your Kindle's `documents/` folder
   - Rename it to something memorable like `textdoom/`

### Step 5: Open on Kindle

1. On your Kindle, open the **Experimental Web Browser** (may be called "Browser" on newer models)
2. Navigate to: `file:///mnt/us/documents/textdoom/index.html`
   - Exact path may vary by Kindle model
   - Try `file:///documents/textdoom/index.html` on newer Kindles
3. The game should load and be playable!

## Kindle-Specific Considerations

### Browser Compatibility

- **Kindle Fire Tablets**: Use the Silk browser, which has good HTML5 support. TextDoom should work well.
- **E-Ink Kindles**: The built-in browser has limited JavaScript support and will likely have performance issues. The game may run slowly or not at all on older e-ink models.
- **Newer Kindle E-Readers (2019+)**: Have better WebKit-based browsers that should handle the game, though at lower frame rates due to e-ink refresh rates.

### Controls

TextDoom uses keyboard controls:
- **Move**: WASD or Arrow keys
- **Strafe**: Q/E keys
- **Fire**: Spacebar
- **Weapons**: Number keys 1-9, 0, -

Make sure your Kindle has a physical keyboard or connect an external Bluetooth keyboard.

### Performance

- The game targets 60 FPS, which may not be achievable on Kindle devices, especially e-ink readers
- Consider the canvas size—the game renders ASCII characters, and smaller canvas sizes will perform better
- E-ink screens have slow refresh rates, making fast-paced games challenging

### Online Multiplayer

Online multiplayer uses WebRTC (PeerJS) which may not work on all Kindle browsers due to limited WebRTC support. Local split-screen multiplayer is more likely to work but requires a keyboard with all necessary keys.

## Troubleshooting

### "Cannot find module" errors during build
Make sure you've run `npm install` first.

### Game doesn't load on Kindle
- Check the file path is correct (use `file://` protocol)
- Ensure you rebuilt with `base: './'` in vite.config.ts
- Try opening the browser's developer console (if available) to see errors

### Blank screen
- The Kindle browser may not support all JavaScript features
- Try the online version instead: https://russellbrenner.github.io/textdoom/

### Controls don't work
- Ensure your Kindle has a physical keyboard or connect a Bluetooth keyboard
- The browser must have focus—tap/click on the game canvas

## Alternative: Development Build

For development or testing, you can run a local server:

```bash
npm run dev
```

This starts a development server (usually at `http://localhost:5173`). If your Kindle is on the same network, you can access it via your computer's IP address (e.g., `http://192.168.1.100:5173`).

## Need Help?

If you encounter issues:
1. Check that your Kindle browser supports HTML5 Canvas and ES6 JavaScript
2. Try the live version first to confirm compatibility: https://russellbrenner.github.io/textdoom/
3. Open an issue on GitHub: https://github.com/russellbrenner/textdoom/issues

## Summary

**Easiest method**: Visit https://russellbrenner.github.io/textdoom/ in your Kindle browser.

**Local compilation**:
1. Install Node.js and npm
2. Clone the repository
3. Run `npm install`
4. Edit `vite.config.ts` to use `base: './'`
5. Run `npm run build`
6. Copy `dist/` folder to Kindle
7. Open `index.html` in Kindle browser
