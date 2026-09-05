# Elevation

A different piece of architecture every day, on the Omarchy bar.

189 buildings — Giza to the Elbphilharmonie — dealt one per day. The bar
draws the day's building as a small silhouette beside its name; click it for
the photograph, the architect, and the story.

## Features

- **A building a day** — a new one at local midnight, the same one on every
  monitor, with a toast if you want one.
- **Its own silhouette** — every building in the canon names one of nine
  shapes (columns, dome, spire, pyramid, pagoda, arch, slab, tower, curve),
  drawn on the bar and rebuilt from the ground when the day turns.
- **The story** — Wikipedia's opening paragraph and lead photograph, on top
  of a curated line that ships with the plugin so the panel is never blank.
- **A timeline** — every building as a tick in the order it was built, with
  the day's building marked and its year beneath. Click a tick to visit.
- **The clock on the wall** — the local time at the building, read from its
  longitude, so you know whether it is night there.
- **A passport** — where this cycle stands and how long until the reshuffle.

## Install

```bash
omarchy plugin add https://github.com/atsokolas/omarchy-elevation-plugin.git --enable
```

That clones the plugin into `~/.config/omarchy/plugins/atsokolas.elevation`,
validates it against the shell's manifest schema, and puts it on the bar. Move
it if it did not land where you want:

```bash
omarchy bar move atsokolas.elevation --section right --before omarchy.network
```

## How the day is picked

Each pass through the canon is a fresh seeded shuffle, so every building comes
up exactly once per 189-day cycle and the order differs each time round. The day
number comes from `Date.UTC(local Y/M/D)`, so it turns over at local midnight
and survives DST. Same scheme as `atsokolas.munger`.

The timeline browses the canon in the order it was built, but every stop is
still a real day in the current cycle — the heading says when that building
comes round on its own.

## Offline

Every building ships with a curated one-line note, so the panel is never blank.
Wikipedia's summary and lead photograph are fetched on top of that and cached
under `~/.cache/omarchy/elevation/`; files untouched for 120 days are pruned.
A few canonical buildings (the Chrysler Building among them) have no free lead
image, and the panel falls back to the drawn silhouette.

## Keys

| Key | Action |
| --- | --- |
| `←` `→` | Browse days |
| `[` `]` | Earlier / later in history |
| `t` | Back to today |
| `n` | Surprise me |
| `o` / `Return` | Open on Wikipedia |
| `c` | Copy the building to the clipboard |
| `m` | Open the location on a map |
| `r` | Refetch the article |
| `s` | Settings |

On the bar: left click opens the panel, right or middle click refetches.

## Settings

On the widget's `shell.json` entry, or from the panel's settings page.

| Key | Default | What it does |
|---|---|---|
| `showName` | `true` | The building's name beside the silhouette |
| `showPhoto` | `true` | Fetch the article's lead image |
| `notify` | `false` | A quiet toast when the building turns over |

## IPC

```bash
omarchy-shell atsokolas.elevation toggle
omarchy-shell atsokolas.elevation name       # today's building
omarchy-shell atsokolas.elevation surprise
omarchy-shell atsokolas.elevation today
```

## Data

Summaries and photographs come from the Wikipedia REST API
(`en.wikipedia.org/api/rest_v1/page/summary/…`), requested with an identifying
user agent. Nothing else leaves the machine. The plugin writes only its own
widget entry in `shell.json`, and only when you change a setting.

## Requirements

- Omarchy Quattro (Quickshell plugin support)
- `curl`
- Network access to `en.wikipedia.org` for the article and photo — everything
  else works offline

## Tests

Pure logic and the canon live in `Model.js`; the QML stays thin.

```bash
./tests/run
```

## Remove

```bash
omarchy plugin disable atsokolas.elevation
omarchy plugin remove atsokolas.elevation --yes
```

## License

MIT.
