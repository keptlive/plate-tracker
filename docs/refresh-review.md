# Plate Tracker review and refresh — October 24, 2026

Baseline: GitHub main cc782d0, clean existing WSL checkout; live Pages homepage HTTP 200. Preserved feature inventory: 50 state cards and outlines, tap-to-find and reversible flip, hold-to-remove with confirmation, capital/nickname/animal/flower/distance facts, expanded state facts and related states, local animal/flower photos and lightbox, hometown lookup/edit, 31 achievements in both inline and popup lists, progress, confetti/fireworks, confirmed reset, existing plateTracker/plateTrackerAch/plateTrackerHome storage keys. Existing dark glass cards, yellow/orange accents and Fredoka typography retained.

Findings to address:
- Unguarded JSON/storage reads and writes can prevent startup or gameplay.
- Cards have no keyboard activation; hidden card faces remain in the accessibility tree; dialogs lack focus containment/Escape/return focus; icon buttons lack names; zoom disabled.
- Confirmation callbacks execute even when the 400ms close guard rejects the close; dismissing achievement popups leaves confirmation styling/cancel state behind.
- Info-button pointerdown can begin removal; scrolling gestures and non-primary buttons can activate cards.
- Hometown changes revoke but do not grant qualifying achievements; saved achievement counts may disagree with current state.
- Three columns on narrow phones leave card-back facts clipped/tiny.
- No state search/filter or offline cache.

Boundaries: no state facts, image bytes, existing achievement definitions, or storage key migrations. Distances are straight-line distances to the existing representative state coordinates, not driving distances. Wikimedia attribution only names the site, not individual source pages/authors/licenses; provenance remains unresolved and no blanket image license is added. No full factual review of all state/animal/flower copy in this refresh.

Completed refresh and validation:
- Search and All/Missing/Found filters; larger phone cards and readable facts; explicit Remove control alongside preserved hold-to-remove; keyboard finding/flipping; named controls, focus containment/return and nested dialogs; zoom and reduced-motion support.
- Validated local saves with non-destructive fallback/warnings; immediate confirmation cleanup; gesture guards; consistent achievement reconciliation and hometown awards; bounded hometown requests with duplicate-submit guard and useful errors.
- Versioned same-origin offline shell plus all 74 local photos. Hometown requests remain network-only. No forced activation; old sessions finish before new worker activation. CI checks that cached content and version agree.
- 15 automated regressions pass using jsdom and a worker fixture: baseline inventory/assets, legacy saves, corrupt/blocked storage, keyboard actions, immediate removal/reset/cancel, search/filters, nested photo focus, hometown awards/failures/duplicates, scroll/hold behavior, delayed popup ordering, offline scope and cache cleanup.
- Actual browser checks: desktop and 320px/390px phone layouts, keyboard activation, achievement popup dismissal, facts, image enlargement, nested Escape/return focus, persistence after reload. Stopped the local HTTP server, reloaded successfully from the installed worker, and opened a loaded state photo (natural width 250) without that server. The offline test covers the game origin, not a forced loss of all internet access.
- Source data, state outlines, image bytes and achievement definitions are unchanged. Existing storage keys are retained. No public deployment is included in this review branch.

Remaining review boundaries: individual image provenance/licensing, full source verification of educational facts, and physical iOS/Android testing. Desktop browser viewport checks are not device certification. External hometown lookup availability is outside the game's control; failures preserve the prior home.
