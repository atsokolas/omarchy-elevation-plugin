# Elevation

A different piece of architecture every day, on the Omarchy bar.

189 buildings — Giza to the Elbphilharmonie — dealt one per day. Click the bar
widget for the photograph, the architect, and the story.

## How the day is picked

Each pass through the canon is a fresh seeded shuffle, so every building comes
up exactly once per 189-day cycle and the order differs each time round. The day
number comes from `Date.UTC(local Y/M/D)`, so it turns over at local midnight
and survives DST. Same scheme as `atsokolas.munger`.

## Offline

Every building ships with a curated one-line note, so the panel is never blank.
Wikipedia's summary and lead photograph are fetched on top of that and cached
under `~/.cache/omarchy/elevation/`; files untouched for 120 days are pruned.
A few canonical buildings (the Chrysler Building among them) have no free lead
image, and the panel falls back to a drawn placeholder.

## Keys

| Key | Action |
| --- | --- |
| `←` `→` | Browse days |
| `t` | Back to today |
| `n` | Surprise me |
| `o` / `Return` | Open on Wikipedia |
| `c` | Copy the building to the clipboard |
| `m` | Open the location on a map |
| `r` | Refetch the article |
| `s` | Settings |

## IPC

```bash
omarchy-shell atsokolas.elevation toggle
omarchy-shell atsokolas.elevation name       # today's building
omarchy-shell atsokolas.elevation surprise
omarchy-shell atsokolas.elevation today
```

## Tests

Pure logic lives in `Model.js`; the QML stays thin.

```bash
./tests/run
```
