# License Plate Tracker

A browser road-trip game for spotting license plates from all 50 US states.

[Play the game](https://plates.kept.live)

## Play

- Tap a state card when you spot its plate. It flips to state facts and marks it found.
- Tap again to flip back. Hold a found card to remove it, then confirm.
- Open the information button for more facts and photos; tap a photo to enlarge it.
- Enter your hometown to show approximate distances to each state.
- Track progress and unlock achievements. Open the achievement counter for the full list.
- Use **Reset All** to start over, with confirmation before anything is cleared.

Progress, achievements and hometown are saved in this browser's local storage.
There is no account or cross-device sync. Clearing browser storage removes saved progress.
Hometown search sends the entered place name to OpenStreetMap's Nominatim service;
fonts load from Google Fonts.

## Run locally

No build step or package installation is needed. From this directory:

```sh
python3 -m http.server 8080
```

Open http://localhost:8080. Keep the same local origin to retain saved progress.

## Deployment

GitHub Pages serves the repository root from `main` at https://plates.kept.live
(the custom domain is set in the `CNAME` file and the repository Pages settings).
All JavaScript, images and state data must be deployed together. The scripts in
`index.html` load in dependency order.

## Features

All 50 state cards and outlines, state facts and photos, an image lightbox,
hometown distances, achievements, progress indicators, celebrations, saved
progress, individual removal and confirmed reset.

## Refresh controls and offline play

- Search by state name or abbreviation. Use All, Missing or Found to narrow the cards.
  A just-found card stays visible in Missing while you read it; flip it back or
  change the filter/search to refresh the list.
- Keyboard: Tab to a card, then Enter or Space to find/flip it. On its back,
  use Remove for the same confirmation as holding a card. Escape closes a popup;
  focus returns to the opener. Browser zoom and reduced-motion settings are respected.
- All 31 achievements remain available. Hometown changes update geography awards.
- Once the page says **Ready for offline play**, the game, facts and 74 local photos
  can be reopened without the game server. Hometown searches still need internet.
  Google Fonts is not included in the offline cache; a system font may be used.
  Browser cache eviction can remove the offline copy. Progress still uses the same
  local storage keys and origin; it does not sync between devices.
- Unreadable saved data is kept intact and a warning is shown. Reset All explicitly
  resets collection/achievement storage, while keeping your hometown.

## Development checks

Node 22 is used in CI. The game itself still needs no build or npm dependencies.
The npm packages are test tools only.

```sh
npm ci --ignore-scripts
npm test
npm run build:offline
node scripts/build-offline.cjs --check
```

Commit the regenerated `sw.js` whenever any cached game file changes. CI rejects a
stale cache manifest. An update waits until existing game tabs close, so a running
session does not mix old and new assets. Localhost previews do not install a worker
unless opened with `?offline-test`; use a fresh preview origin for repeated development.
See [review notes](docs/refresh-review.md) for the baseline, checks and remaining gaps.

## License

The code is released under the [MIT License](LICENSE). The photos in `images/` come from
Wikimedia Commons and keep their own Creative Commons or public-domain licenses
(see `images/attribution.txt`); the MIT License does not cover them.
