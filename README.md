# Galactic Tab

A personalized Firefox new-tab page with a rotating spiral galaxy, forward-moving stars, and a Customize panel.

## Features
- Default Firefox search and shortcuts from Firefox's own new-tab list.
- Clock, notes, and widgets that can be shown, hidden, and reordered.
- Galaxy position, size and spin; star speed, density and twinkle controls.
- Minimal, Productivity and Deep Space presets.
- Browser Strip controls: live colors, prepared animation presets, galaxy size/position/spin, and a closest-preset Match new tab option.
- Local settings and JSON backup import/export.

## Load for development
1. Download or clone this repository.
2. In Firefox, open `about:debugging#/runtime/this-firefox`.
3. Choose **Load Temporary Add-on**, select `manifest.json`, and open a fresh tab.
4. Click **Customize** at the bottom right. Use **Browser Strip > Apply visuals** to customize the browser header.

Temporary add-ons disappear on restart. Persistent installation requires Mozilla signing. Reload the extension after source changes and open a fresh new tab.

## Permissions and data
- `search`: uses your default search engine.
- `topSites`: displays Firefox shortcuts.
- `theme`: applies optional browser-strip visuals.
- `storage`: saves browser-strip preferences and restores them on startup.

Page preferences and notes use extension local storage; browser-strip settings use `browser.storage.local`. The extension does not send these to a server. Searches and opened shortcuts go to their normal destinations. Export backups before uninstalling; backups can contain notes. Page backups and Browser Strip backups are separate.

## Build
Python 3.10+ is required for the build scripts.

```sh
python -m pip install -r requirements.txt
python tools/build_strip_presets.py
python tools/package.py
```

Prepared animation images are included. Rebuilding them is optional and can take a few minutes. The output `galactic-tab.xpi` is unsigned. Browser-strip presets add substantially to package size.

## Design limitations
The custom page replaces Firefox Home. Native weather and news cards are not embedded. Widgets reorder in a responsive vertical stack. Browser-strip animation presets approximate new-tab slider values; colors apply live. The page honors system reduced-motion preferences; choose Still for each browser-strip layer to disable its animation.

## Related theme and artwork
[Galactic Theme](https://github.com/xoGUYFAWKSxo/galactic-theme-firefox) is the standalone browser theme. Browser Strip controls override it while enabled; turning them off restores the installed theme.

The galaxy artwork is generated from the original project reference; see `artwork-prompt.txt`. Its native resolution is 1254 by 1254 pixels, with an 8K-looking visual style.
