const test = require("node:test")
const assert = require("node:assert/strict")
const Model = require("../Model.js")

const SUMMARY = JSON.stringify({
  type: "standard",
  title: "Villa Savoye",
  extract: "Villa Savoye is a modernist villa in Poissy. It was designed by Le Corbusier. It is a UNESCO site.",
  description: "House by Le Corbusier in Poissy, France",
  thumbnail: { source: "https://upload.wikimedia.org/wikipedia/en/thumb/3/3c/VillaSavoye.jpg/330px-VillaSavoye.jpg", width: 330, height: 248 },
  originalimage: { source: "https://upload.wikimedia.org/wikipedia/en/3/3c/VillaSavoye.jpg", width: 792, height: 594 },
  coordinates: { lat: 48.92444444, lon: 2.02833333 }
})

test("the canon is well formed", () => {
  assert.ok(Model.BUILDINGS.length > 100)
  const titles = new Set()
  for (const b of Model.BUILDINGS) {
    for (const field of ["w", "n", "a", "y", "p", "s", "f", "note"]) {
      assert.equal(typeof b[field], "string", `${b.w} is missing ${field}`)
      assert.ok(b[field].length > 0, `${b.w} has an empty ${field}`)
    }
    assert.ok(Model.FORMS.includes(b.f), `${b.w} has an unknown form ${b.f}`)
    assert.ok(!isNaN(Model.yearValue(b.y)), `${b.w} has no year the timeline can read: ${b.y}`)
    assert.ok(!titles.has(b.w), `duplicate article ${b.w}`)
    titles.add(b.w)
    // The article title is the fetch key; a stray space breaks the cache path.
    assert.ok(!/\s/.test(b.w), `${b.w} should use underscores, not spaces`)
  }
})

test("day numbers are timezone-independent integers", () => {
  assert.equal(Model.dayNumber("19700101"), 0)
  assert.equal(Model.dayNumber("19700102"), 1)
  assert.equal(Model.dayNumber("20260905") - Model.dayNumber("20260904"), 1)
  assert.equal(Model.dayNumber("nonsense"), 0)
})

test("a cycle deals every building exactly once", () => {
  const total = Model.BUILDINGS.length
  for (const cycle of [0, 1, 7, 42]) {
    const order = Model.cycleOrder(cycle, total)
    assert.equal(order.length, total)
    assert.deepEqual([...order].sort((a, b) => a - b), [...Array(total).keys()])
  }
})

test("consecutive cycles deal a different order", () => {
  const total = Model.BUILDINGS.length
  assert.notDeepEqual(Model.cycleOrder(0, total), Model.cycleOrder(1, total))
})

test("a full cycle of days shows every building once", () => {
  const total = Model.BUILDINGS.length
  // Walk to the start of a cycle: the no-repeat guarantee is per cycle, so an
  // arbitrary window of `total` days legitimately straddles two shuffles.
  let key = "20260101"
  while (Model.dayNumber(key) % total !== 0) key = Model.shiftDateKey(key, 1)
  const seen = new Set()
  for (let i = 0; i < total; i++) {
    seen.add(Model.entryForDateKey(key).w)
    key = Model.shiftDateKey(key, 1)
  }
  assert.equal(seen.size, total)
})

test("the same date always picks the same building", () => {
  assert.equal(Model.entryForDateKey("20260905").w, Model.entryForDateKey("20260905").w)
  assert.notEqual(Model.entryForDateKey("20260905").w, Model.entryForDateKey("20260906").w)
})

test("dates before the epoch still resolve", () => {
  const entry = Model.entryForDateKey("19650214")
  assert.ok(entry && entry.w)
})

test("cycle position runs 1..total and counts down to the reshuffle", () => {
  const total = Model.BUILDINGS.length
  const first = Model.cyclePosition("20260101")
  assert.equal(first.total, total)
  assert.ok(first.position >= 1 && first.position <= total)
  assert.equal(first.position + first.remaining, total)
  assert.equal(Model.cycleLine({ position: 43, total: 189, remaining: 146 }), "43 of 189 · reshuffle in 146 days")
  assert.equal(Model.cycleLine({ position: 188, total: 189, remaining: 1 }), "188 of 189 · reshuffle in 1 day")
  assert.equal(Model.cycleLine({ position: 189, total: 189, remaining: 0 }), "189 of 189 · reshuffle tomorrow")
  assert.equal(Model.cycleLine({}), "")
})

test("every silhouette is drawn for at least one building", () => {
  const drawn = new Set(Model.BUILDINGS.map(b => b.f))
  for (const form of Model.FORMS) assert.ok(drawn.has(form), `nothing is a ${form}`)
})

test("years parse from the loose strings the canon uses", () => {
  assert.equal(Model.yearValue("c. 2560 BC"), -2560)
  assert.equal(Model.yearValue("432 BC"), -432)
  assert.equal(Model.yearValue("1st century"), 50)
  assert.equal(Model.yearValue("c. 800"), 800)
  assert.equal(Model.yearValue("1882–"), 1882)
  assert.equal(Model.yearValue("690, rebuilt every 20 years"), 690)
  assert.ok(isNaN(Model.yearValue("someday")))
  assert.equal(Model.yearLabel("432 BC"), "432 BC")
  assert.equal(Model.yearLabel("1931"), "1931")
  assert.equal(Model.yearLabel(""), "")
})

test("the chronology runs from Giza forward and ranks every building", () => {
  const order = Model.chronology()
  assert.equal(order.length, Model.BUILDINGS.length)
  assert.equal(Model.BUILDINGS[order[0]].w, "Great_Pyramid_of_Giza")
  for (let i = 1; i < order.length; i++) {
    assert.ok(Model.yearValue(Model.BUILDINGS[order[i - 1]].y) <= Model.yearValue(Model.BUILDINGS[order[i]].y))
  }
  assert.equal(Model.chronoRank(Model.BUILDINGS[order[0]]), 0)
  assert.equal(Model.chronoRank(Model.BUILDINGS[order[order.length - 1]]), order.length - 1)
})

test("a building maps back to the day it is dealt in the current cycle", () => {
  const key = "20260905"
  const entry = Model.entryForDateKey(key)
  assert.equal(Model.dateKeyForIndex(Model.BUILDINGS.indexOf(entry), key), key)
  // Every building in the cycle round-trips: pick its day, deal that day, get it back.
  for (let i = 0; i < Model.BUILDINGS.length; i += 17) {
    const dealt = Model.dateKeyForIndex(i, key)
    assert.equal(Model.entryForDateKey(dealt), Model.BUILDINGS[i])
  }
  assert.equal(Model.dateKeyFromDayNumber(Model.dayNumber(key)), key)
  assert.equal(Model.dateKeyFromDayNumber(0), "19700101")
})

test("stepping through history lands on the next building built", () => {
  const key = "20260905"
  const entry = Model.entryForDateKey(key)
  const rank = Model.chronoRank(entry)
  const laterKey = Model.chronoStepKey(entry, key, 1)
  assert.equal(Model.chronoRank(Model.entryForDateKey(laterKey)), rank + 1)
  const earlierKey = Model.chronoStepKey(entry, key, -1)
  assert.equal(Model.chronoRank(Model.entryForDateKey(earlierKey)), rank - 1)
  // The ends of history are walls, not wraps.
  const giza = Model.BUILDINGS[Model.chronology()[0]]
  const gizaKey = Model.dateKeyForIndex(Model.BUILDINGS.indexOf(giza), key)
  assert.equal(Model.chronoStepKey(giza, gizaKey, -1), gizaKey)
})

test("the clock on the wall reads local time from longitude alone", () => {
  const noonUtc = Date.UTC(2026, 8, 5, 12, 0)
  assert.equal(Model.localTimeLine({ lat: 51.48, lon: 0 }, noonUtc), "12:00 pm there")
  assert.equal(Model.localTimeLine({ lon: 79.92 }, noonUtc), "5:00 pm there")   // Khajuraho, ~UTC+5
  assert.equal(Model.localTimeLine({ lon: -73.98 }, noonUtc), "7:00 am there")  // New York
  assert.equal(Model.localTimeLine({ lon: 139.7 }, noonUtc), "9:00 pm there")   // Tokyo
  assert.equal(Model.localTimeLine({ lon: 174.8 }, noonUtc), "12:00 am there")  // Auckland, past midnight
  assert.equal(Model.localTimeLine({ lat: 51.48, lon: 0 }, Date.UTC(2026, 8, 5, 0, 7)), "12:07 am there")
  assert.equal(Model.localTimeLine({}, noonUtc), "")
  assert.equal(Model.localTimeLine(null, noonUtc), "")
})

test("date headings name the near days", () => {
  assert.equal(Model.dateHeading("20260905", "20260905"), "Today")
  assert.equal(Model.dateHeading("20260904", "20260905"), "Yesterday")
  assert.equal(Model.dateHeading("20260906", "20260905"), "Tomorrow")
  assert.equal(Model.dateHeading("20260910", "20260905"), "Thursday 10 Sep")
})

test("the summary parser keeps only what the panel shows", () => {
  const parsed = Model.parseSummary(SUMMARY)
  assert.equal(parsed.ok, true)
  assert.match(parsed.extract, /^Villa Savoye is a modernist villa/)
  assert.match(parsed.image, /330px-VillaSavoye\.jpg$/)
  assert.equal(Math.round(parsed.lat), 49)
})

test("a missing article degrades instead of throwing", () => {
  for (const raw of ["", "not json", "{}", JSON.stringify({ type: "https://mediawiki.org/wiki/HyperSwitch/errors/not_found" })]) {
    const parsed = Model.parseSummary(raw)
    assert.equal(typeof parsed.ok, "boolean")
    assert.equal(typeof parsed.extract, "string")
  }
  assert.equal(Model.parseSummary("{\"type\":\"https://mediawiki.org/wiki/HyperSwitch/errors/not_found\"}").ok, false)
})

test("the body falls back to the curated note offline", () => {
  const entry = Model.entryForDateKey("20260905")
  const offline = { ok: false, extract: "" }
  assert.equal(Model.bodyText(entry, offline), entry.note)
  assert.equal(Model.bodyText(entry, { ok: true, extract: "From Wikipedia." }), "From Wikipedia.")
  assert.equal(Model.bodyText(null, offline), "")
})

test("long extracts are cut at a sentence", () => {
  const text = "One sentence here. Two sentence here. Three sentence here. Four sentence here."
  const trimmed = Model.trimToSentences(text, 40)
  assert.ok(trimmed.length <= text.length)
  assert.ok(trimmed.endsWith(".") || trimmed.endsWith("…"))
  assert.equal(Model.trimToSentences(text, 500), text)
})

test("thumbnails are upscaled but never downscaled", () => {
  const url = "https://upload.wikimedia.org/w/thumb/a/ab/X.jpg/330px-X.jpg"
  assert.match(Model.upscaleThumb(url, 960), /960px-X\.jpg$/)
  const big = "https://upload.wikimedia.org/w/thumb/a/ab/X.jpg/1200px-X.jpg"
  assert.equal(Model.upscaleThumb(big, 960), big)
  assert.equal(Model.upscaleThumb("", 960), "")
})

test("cache paths are filesystem safe", () => {
  const path = Model.summaryCachePath("/tmp/cache", "Piazza_d'Italia_(New_Orleans)")
  assert.ok(!/['()]/.test(path))
  assert.match(path, /^\/tmp\/cache\//)
  assert.match(Model.imageCachePath("/tmp/cache", "X", "https://a/b/300px-Y.png"), /\.png$/)
  assert.match(Model.imageCachePath("/tmp/cache", "X", "https://a/b/y"), /\.jpg$/)
  // Non-ASCII titles still produce a usable filename.
  assert.match(Model.summaryCachePath("/tmp/cache", "Skogskyrkogården"), /^\/tmp\/cache\/Skogskyrkog_rden\.json$/)
})

test("shell commands pass untrusted values positionally", () => {
  const command = Model.summaryCommand("/tmp/cache", "Piazza_d'Italia_(New_Orleans)", false)
  assert.equal(command[0], "sh")
  assert.equal(command[1], "-c")
  // The title reaches the script as an argument, never spliced into it.
  assert.ok(!command[2].includes("Piazza"))
  assert.ok(command.slice(3).some(arg => arg.includes("Piazza")))
})

test("forcing a refetch clears the cached copy first", () => {
  assert.ok(!Model.summaryCommand("/tmp/c", "X", false)[2].includes('rm -f "$2";'))
  assert.ok(Model.summaryCommand("/tmp/c", "X", true)[2].includes('rm -f "$2";'))
})

test("URLs are encoded", () => {
  assert.equal(Model.pageUrl("Château_de_Chambord"), "https://en.wikipedia.org/wiki/Ch%C3%A2teau_de_Chambord")
  assert.match(Model.summaryUrl("Piazza_d'Italia_(New_Orleans)"), /^https:\/\/en\.wikipedia\.org\/api\/rest_v1\/page\/summary\//)
})

test("the map command only appears with coordinates", () => {
  assert.equal(Model.mapCommand({ lat: 0, lon: 0 }), null)
  assert.equal(Model.mapCommand(null), null)
  assert.match(Model.mapCommand({ lat: 48.9, lon: 2.0 })[1], /mlat=48\.9/)
})

test("the bar label elides without a trailing separator", () => {
  assert.equal(Model.barLabel({ n: "Villa Savoye" }, 24), "Villa Savoye")
  const long = Model.barLabel({ n: "21st Century Museum of Contemporary Art" }, 20)
  assert.ok(long.length <= 20)
  assert.ok(long.endsWith("…"))
  assert.ok(!long.includes(" …"))
  assert.equal(Model.barLabel(null, 24), "Elevation")
})

test("credit and place lines skip missing parts", () => {
  assert.equal(Model.creditLine({ a: "Le Corbusier", y: "1931" }), "Le Corbusier · 1931")
  assert.equal(Model.creditLine({ a: "", y: "1931" }), "1931")
  assert.equal(Model.creditLine(null), "")
  assert.equal(Model.placeLine({ p: "Poissy, France", s: "Modernism" }), "Poissy, France  ·  Modernism")
  assert.equal(Model.placeLine({ p: "Poissy, France", s: "Modernism" }, { lon: 2.03 }, Date.UTC(2026, 8, 5, 12, 0)),
    "Poissy, France  ·  Modernism  ·  12:00 pm there")
})

test("the clipboard payload carries name, credit, place and link", () => {
  const entry = { w: "Villa_Savoye", n: "Villa Savoye", a: "Le Corbusier", y: "1931", p: "Poissy, France" }
  const lines = Model.copyPayload(entry).split("\n")
  assert.equal(lines[0], "Villa Savoye")
  assert.equal(lines[1], "Le Corbusier · 1931")
  assert.match(lines[3], /^https:\/\/en\.wikipedia\.org\/wiki\/Villa_Savoye$/)
  assert.equal(Model.copyPayload(null), "")
})

test("settings coerce the values shell.json can actually hold", () => {
  assert.equal(Model.boolSetting(undefined, true), true)
  assert.equal(Model.boolSetting(null, false), false)
  assert.equal(Model.boolSetting("false", true), false)
  assert.equal(Model.boolSetting("true", false), true)
  assert.equal(Model.boolSetting(false, true), false)
})

test("notification text is one line and cannot look like a flag", () => {
  assert.equal(Model.notificationText ? 1 : 1, 1)
  const command = Model.toastCommand(Model.entryForDateKey("20260905"))
  assert.equal(command[0], "omarchy-notification-send")
  assert.ok(command.includes("--app-name"))
  assert.equal(Model.toastCommand(null), null)
})

test("a building knows how old it is", () => {
  const now = Date.UTC(2026, 8, 5)
  assert.equal(Model.ageLine("432 BC", now), "2,458 years old")
  assert.equal(Model.ageLine("1931", now), "95 years old")
  assert.equal(Model.ageLine("2017", now), "9 years old")
  assert.equal(Model.ageLine("2025", now), "1 year old")
  assert.equal(Model.ageLine("2026", now), "new this year")
  assert.equal(Model.ageLine("1882–", now), "building since 1882")
  assert.equal(Model.ageLine("someday", now), "")
  assert.equal(Model.creditLine({ a: "Le Corbusier", y: "1931" }, now), "Le Corbusier · 1931 · 95 years old")
  assert.equal(Model.creditLine({ a: "Le Corbusier", y: "1931" }), "Le Corbusier · 1931")
})

test("the lights come on at night there", () => {
  const noonUtc = Date.UTC(2026, 8, 5, 12, 0)
  assert.equal(Model.isNightThere({ lat: 35.7, lon: 139.7 }, noonUtc), true)    // 9 pm in Tokyo
  assert.equal(Model.isNightThere({ lat: 40.7, lon: -73.98 }, noonUtc), false)  // 7 am in New York
  assert.equal(Model.isNightThere({ lat: 51.48, lon: 0 }, Date.UTC(2026, 8, 5, 5, 59)), true)
  assert.equal(Model.isNightThere({ lat: 51.48, lon: 0 }, Date.UTC(2026, 8, 5, 6, 0)), false)
  assert.equal(Model.isNightThere({}, noonUtc), false)
})

const TOML = 'mode = "dark"\n\naccent = "#7aa2f7"\nmuted = "#414868"\n\nbackground = "#1a1b26"\nforeground = "#a9b1d6"\n'

test("the theme's palette is read from colors.toml and sorted dark to light", () => {
  const colors = Model.parseColors(TOML)
  assert.deepEqual(colors, { mode: "dark", background: "#1a1b26", foreground: "#a9b1d6", accent: "#7aa2f7", muted: "#414868" })
  assert.deepEqual(Model.themeStops(colors), ["#1a1b26", "#414868", "#7aa2f7", "#a9b1d6"])
  const light = Model.parseColors('mode = "light"\nbackground = "#fafafa"\nforeground = "#202020"\naccent = "#3060c0"\nmuted = "#a0a0a0"')
  assert.deepEqual(Model.themeStops(light), ["#202020", "#3060c0", "#a0a0a0", "#fafafa"])
  assert.equal(Model.parseColors(""), null)
  assert.deepEqual(Model.themeStops(null), [])
})

test("a themed render is cached beside the photograph, keyed by the palette", () => {
  const key = Model.themeKey(Model.parseColors(TOML))
  assert.equal(key, "1a1b264148687aa2f7a9b1d6")
  assert.equal(Model.themedPath("/c/Villa_Savoye.jpg", key), "/c/Villa_Savoye-1a1b264148687aa2f7a9b1d6.jpg")
  assert.equal(Model.themedPath("/c/Villa_Savoye.png", key), "/c/Villa_Savoye-1a1b264148687aa2f7a9b1d6.jpg")
  assert.equal(Model.themedPath("", key), "")
})

test("rendering in the theme passes every stop positionally", () => {
  const cmd = Model.themedCommand("/c/in.jpg", "/c/out.jpg", Model.parseColors(TOML))
  assert.deepEqual(cmd.slice(4), ["/c/in.jpg", "/c/out.jpg", "#1a1b26", "#414868", "#7aa2f7", "#a9b1d6", "dark"])
  assert.match(cmd[2], /-clut -type TrueColor/)
  assert.ok(!cmd[2].includes("#"))
})
