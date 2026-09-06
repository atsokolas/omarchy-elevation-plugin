import QtQuick
import Quickshell
import Quickshell.Io
import "Model.js" as Model

// One engine per shell. Every bar — one per monitor — reads this instance, so
// the article is fetched once and the day rolls over once.
//
// Nothing here needs the network to work: the curated note ships with the
// plugin, and Wikipedia only ever adds to what is already on screen.
Item {
  id: root

  property var shell: null
  property var settings: ({})
  property bool active: true

  readonly property string cacheDir: Quickshell.env("HOME") + "/.cache/omarchy/elevation"

  property string todayKey: Model.dateKeyFromDate(new Date())
  property string dateKey: Model.dateKeyFromDate(new Date())

  readonly property var entry: Model.entryForDateKey(dateKey)
  readonly property var position: Model.cyclePosition(dateKey)
  readonly property bool isToday: dateKey === todayKey

  property var summary: ({ ok: false, extract: "", description: "", image: "", lat: 0, lon: 0 })
  // The photograph as taken, and what the panel shows — the same file, or
  // its twin rendered in the current theme.
  property string plainPath: ""
  property string imagePath: ""

  // The desktop's palette, watched so a theme change re-renders the photo.
  readonly property string colorsPath: Quickshell.env("HOME") + "/.local/state/omarchy/current/theme/colors.toml"
  property var colors: null
  readonly property string themeKey: Model.themeKey(colors)
  property string _themedPending: ""
  property bool loading: false
  property bool imageLoading: false
  property string lastError: ""

  readonly property bool showName: Model.boolSetting(setting("showName", true), true)
  readonly property bool showPhoto: Model.boolSetting(setting("showPhoto", true), true)
  readonly property bool notify: Model.boolSetting(setting("notify", false), false)
  readonly property bool themed: Model.boolSetting(setting("themed", false), false)

  readonly property string barText: entry ? Model.barLabel(entry, 24) : Model.APP_NAME
  readonly property string body: Model.bodyText(entry, summary)

  // Ticks on the minute, for the clock on the wall.
  property real nowMs: Date.now()

  // Raised whenever the visible building changes, so the bar can rebuild its
  // skyline and the panel can re-run its reveal.
  signal entryChanged2(var entry)

  // Guards a repeat toast for the same day, the way Easel does it.
  property string _announcedKey: ""
  property string _summaryOutput: ""
  property string _imageOutput: ""
  property string _loadedTitle: ""

  function setting(name, fallback) {
    var value = settings ? settings[name] : undefined
    return value === undefined || value === null ? fallback : value
  }

  function load(force) {
    if (!active || !entry) return
    var title = String(entry.w)
    // A date shuffle back onto the same building is a no-op unless forced.
    if (!force && _loadedTitle === title && summary.ok) return
    _loadedTitle = title
    summary = { ok: false, extract: "", description: "", image: "", lat: 0, lon: 0 }
    plainPath = ""
    imagePath = ""
    lastError = ""
    loading = true
    _summaryOutput = ""
    summaryProcess.command = Model.summaryCommand(cacheDir, title, force === true)
    summaryProcess.running = true
  }

  function applySummary(raw) {
    loading = false
    var parsed = Model.parseSummary(raw)
    if (!parsed.ok) {
      // The article genuinely has no summary — retrying will not help.
      lastError = "No article — showing the curated note"
      retryTimer.stop()
      return
    }
    summary = parsed
    lastError = ""
    retryTimer.stop()
    if (showPhoto) loadImage()
  }

  function loadImage() {
    if (!entry || !summary.ok || !summary.image) return
    var url = Model.upscaleThumb(summary.image, 960)
    var path = Model.imageCachePath(cacheDir, entry.w, url)
    imageLoading = true
    _imageOutput = ""
    imageProcess.command = Model.imageCommand(cacheDir, path, url)
    imageProcess.running = true
  }

  function refresh() { load(true) }

  // Show the photograph as taken, or in the current theme — rendered once
  // per palette and kept beside the original.
  function present() {
    if (plainPath === "") return
    if (!themed || !colors) {
      imagePath = plainPath
      return
    }
    _themedPending = Model.themedPath(plainPath, themeKey)
    themedCheckProcess.command = ["test", "-s", _themedPending]
    themedCheckProcess.running = true
  }

  onThemedChanged: present()
  onThemeKeyChanged: present()

  function setDateKey(key) {
    var next = String(key || todayKey)
    if (next === dateKey) {
      load(false)
      return
    }
    dateKey = next
    load(false)
    entryChanged2(entry)
  }

  function shiftDay(days) { setDateKey(Model.shiftDateKey(dateKey, days)) }
  function jumpToday() { setDateKey(todayKey) }

  // The timeline browses the canon in the order it was built; each stop is
  // still a real day in the current cycle, so the heading says when it comes.
  function showIndex(index) { setDateKey(Model.dateKeyForIndex(index, dateKey)) }
  function stepHistory(step) { setDateKey(Model.chronoStepKey(entry, dateKey, step)) }

  // A coin flip through the canon rather than a date — same machinery, just a
  // day picked at random from the next few years.
  function surprise() {
    var span = Model.BUILDINGS.length
    var offset = Math.floor(Math.random() * span) + 1
    setDateKey(Model.shiftDateKey(todayKey, offset))
  }

  function openArticle() {
    if (!entry) return
    Quickshell.execDetached(Model.openCommand(entry.w))
  }

  function openMap() {
    var command = Model.mapCommand(summary)
    if (command) Quickshell.execDetached(command)
  }

  function announce(forEntry) {
    if (!notify || !forEntry) return
    if (_announcedKey === dateKey) return
    _announcedKey = dateKey
    var command = Model.toastCommand(forEntry)
    if (command) Quickshell.execDetached(command)
  }

  onShowPhotoChanged: if (showPhoto && !imagePath) loadImage()

  Component.onCompleted: {
    Quickshell.execDetached(Model.pruneCommand(cacheDir, 120))
    load(false)
  }

  Process {
    id: summaryProcess
    stdout: StdioCollector {
      waitForEnd: true
      onStreamFinished: root._summaryOutput = text
    }
    onExited: function(code) {
      if (code !== 0) {
        root.loading = false
        root.lastError = "Offline — showing the curated note"
        retryTimer.restart()
        return
      }
      root.applySummary(root._summaryOutput)
    }
  }

  Process {
    id: imageProcess
    stdout: StdioCollector {
      waitForEnd: true
      onStreamFinished: root._imageOutput = text
    }
    onExited: function(code) {
      root.imageLoading = false
      if (code !== 0) {
        root.plainPath = ""
        root.imagePath = ""
        return
      }
      root.plainPath = String(root._imageOutput).replace(/^\s+|\s+$/g, "")
      root.present()
    }
  }

  FileView {
    path: root.colorsPath
    watchChanges: true
    printErrors: false
    onLoaded: root.colors = Model.parseColors(text())
    onLoadFailed: root.colors = null
    onFileChanged: reload()
  }

  Process {
    id: themedCheckProcess
    onExited: function(code) {
      if (code === 0) {
        root.imagePath = root._themedPending
        return
      }
      themedRenderProcess.command = Model.themedCommand(root.plainPath, root._themedPending, root.colors)
      themedRenderProcess.running = true
    }
  }

  // A failed render — no ImageMagick, say — falls back to the photograph.
  Process {
    id: themedRenderProcess
    onExited: function(code) { root.imagePath = code === 0 ? root._themedPending : root.plainPath }
  }

  // The network can arrive after the shell does. Back off gently rather than
  // hammering Wikipedia, and stop as soon as anything lands.
  Timer {
    id: retryTimer
    interval: 60000
    repeat: true
    running: false
    onTriggered: if (root.active) root.load(false)
  }

  // Wakes on the minute — so the day turns over within a second of midnight,
  // in step with the other daily widgets, and the wall clock stays honest. A
  // plain timer rather than a scheduled alarm, so it survives a suspend across
  // the date boundary.
  Timer {
    running: root.active
    interval: 60000 - Date.now() % 60000
    onTriggered: {
      root.nowMs = Date.now()
      interval = 60000 - root.nowMs % 60000
      restart()
      var today = Model.dateKeyFromDate(new Date())
      if (today === root.todayKey) return
      var wasToday = root.dateKey === root.todayKey
      root.todayKey = today
      if (!wasToday) return
      root.setDateKey(today)
      root.announce(root.entry)
    }
  }
}
