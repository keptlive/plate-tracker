# License Plate Tracker

A browser road-trip game for spotting license plates from all 50 US states.

[Play the game](https://keptlive.github.io/plate-tracker/)

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

The intended GitHub Pages configuration serves the repository root from `main`.
All JavaScript, images and state data must be deployed together. The scripts in
`index.html` load in dependency order.

## Features

All 50 state cards and outlines, state facts and photos, an image lightbox,
hometown distances, achievements, progress indicators, celebrations, saved
progress, individual removal and confirmed reset.

## Licensing

This repository does not yet specify a reuse license. Image provenance and
reuse terms need review before applying a license to those assets.
