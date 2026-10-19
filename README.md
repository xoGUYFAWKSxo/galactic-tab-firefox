# Galactic Tab

A personalized Firefox new-tab page with a rotating spiral galaxy, forward-moving stars, and a Customize panel.

## Features
- Six color themes (Classic, Icy blue, Warm gold, Purple nebula, Emerald, Rose) that tint the stars, artwork, nebula and accents together.
- Four pieces of artwork: spiral galaxy, nebula, black hole and ringed planet. Position, size and spin are adjustable; the planet stays still.
- Backgrounds: nebula glow, twilight, deep black, or your own image with adjustable dimming.
- Occasional shooting stars, and an Animation setting that follows the system's reduce-motion preference, always animates, or pauses everything.
- Search with Firefox's default engine or any other installed engine.
- Shortcuts: pin your own sites, hide Firefox's suggestions, choose how many to show, or turn Firefox's frequent sites off.
- Widgets that can be shown, hidden and reordered: title, greeting with your name, search, shortcuts, clock, to-do list and notes.
- Clock options: 12 or 24 hours, seconds, date format, and a second time zone.
- Minimal, Productivity and Deep Space presets, plus up to 12 saved setups of your own.
- Optional sync of the look, layout and shortcuts through your Firefox account.
- Browser Strip controls: live colors, prepared animation presets, artwork choice, size/position/spin, and a closest-preset Match new tab option.
- Local settings and JSON backup import/export.

## Load for development
1. Download or clone this repository.
2. In Firefox, open `about:debugging#/runtime/this-firefox`.
3. Choose **Load Temporary Add-on**, select `manifest.json`, and open a fresh tab.
4. Click **Customize** at the bottom right. Use **Browser Strip > Apply visuals** to customize the browser header.

Temporary add-ons disappear on restart. Persistent installation requires Mozilla signing. Reload the extension after source changes and open a fresh new tab.

## Permissions and data
- `search`: lists your installed search engines and searches with the one you choose.
- `topSites`: displays Firefox shortcuts.
- `theme`: applies optional browser-strip visuals.
- `storage`: saves page settings, notes, to-dos, saved setups, your background image and browser-strip preferences, and restores the strip on startup.

Everything is kept in `browser.storage.local`, which survives clearing history and site data. Settings saved by versions before 1.5.0 in page `localStorage` are moved over automatically the first time a new tab opens. The extension does not send any of this to a server. Searches and opened shortcuts go to their normal destinations. Export backups before uninstalling; backups include notes, to-dos, saved setups and the background image. Page backups and Browser Strip backups are separate.

### Sync
Sync is off until you turn it on in **Customize › Sync & backup**, separately on each computer. When it is on, the look, widget layout, clock options, search choice and shortcuts are written to `browser.storage.sync`, which Firefox Sync carries to your other computers when you are signed in and **Add-ons** is ticked in Firefox's Sync settings. Notes, to-dos, saved setups and the background image never leave the computer. If your account already holds settings from another computer when you turn sync on, you choose which copy to keep. Firefox Sync is Mozilla's service, so turning this on shares those settings with it; nothing is sent anywhere else.

## Build
Python 3.10+ is required for the build scripts.

```sh
python -m pip install -r requirements.txt
python tools/build_artwork.py
python tools/build_strip_presets.py
python tools/package.py
```

Prepared images are included, so rebuilding is optional. `build_artwork.py` draws the nebula, black hole and ringed planet into `assets/art/`. `build_strip_presets.py` takes a few minutes; name pieces to rebuild only those, for example `python tools/build_strip_presets.py nebula blackhole` (choices: `galaxy`, `nebula`, `blackhole`, `planet`, `stars`). The output `galactic-tab.xpi` is unsigned. Browser-strip presets are palette APNGs, about 72 MB in total. The newer artwork turns at 12.5 frames per second to keep its files half the size, and the planet ships as still images only. Each slow preset is a copy of the normal one with doubled frame delays; Firefox ignores multi-megabyte `data:` theme images, so the copies cannot be generated at runtime.

## Design limitations
The custom page replaces Firefox Home. Native weather and news cards are not embedded. Widgets reorder in a responsive vertical stack. Browser-strip animation presets approximate new-tab slider values; colors apply live. The page follows the system's reduce-motion preference unless Animation is set otherwise; choose Still for each browser-strip layer to disable its animation. Color themes recolor the new-tab page only; the browser strip's star color is fixed in its prepared images, though Match new tab copies the theme's accent color. Pinned shortcuts show a letter tile unless Firefox already has an icon for that site, because the page never fetches icons itself.

## Related theme and artwork
[Galactic Theme](https://github.com/xoGUYFAWKSxo/galactic-theme-firefox) is the standalone browser theme. Browser Strip controls override it while enabled; turning them off restores the installed theme.

The galaxy artwork is generated from the original project reference; see `artwork-prompt.txt`. The nebula, black hole and ringed planet are drawn procedurally by `tools/build_artwork.py`. Its native resolution is 1254 by 1254 pixels, with an 8K-looking visual style.
