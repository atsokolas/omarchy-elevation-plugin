import QtQuick
import qs.Commons

// The day's building, drawn as one of nine silhouettes rather than set in a
// font — this machine's Nerd Font maps the nf-md-* building glyphs to the
// wrong codepoints, and drawing it lets the building rise when the day turns.
Item {
  id: root

  // One of Model.FORMS. Every entry in the canon names its own.
  property string form: "slab"
  property real iconSize: Style.font.icon
  property color iconColor: Color.foreground
  // 0 flat to the ground, 1 fully built. Animated by `raise()`.
  property real built: 1
  // Night at the building: the windows are lit, and there is a moon.
  property bool night: false

  width: iconSize
  height: iconSize

  function raise() { buildAnimation.restart() }
  // A smaller rise, for a hover.
  function nudge() { nudgeAnimation.restart() }

  SequentialAnimation {
    id: nudgeAnimation
    NumberAnimation { target: root; property: "built"; to: 0.82; duration: 90; easing.type: Easing.InQuad }
    NumberAnimation { target: root; property: "built"; to: 1; duration: 380; easing.type: Easing.OutBack }
  }

  SequentialAnimation {
    id: buildAnimation
    NumberAnimation { target: root; property: "built"; to: 0; duration: 140; easing.type: Easing.InCubic }
    NumberAnimation { target: root; property: "built"; to: 1; duration: 620; easing.type: Easing.OutBack }
  }

  onFormChanged: canvas.requestPaint()
  onBuiltChanged: canvas.requestPaint()
  onNightChanged: canvas.requestPaint()
  onIconColorChanged: canvas.requestPaint()

  Canvas {
    id: canvas
    anchors.fill: parent
    antialiasing: true
    onWidthChanged: requestPaint()
    onHeightChanged: requestPaint()

    // Each silhouette is a path in a unit square — x across, y down, the
    // ground at y = 1 — so the same drawing serves a 12px bar and a 72px
    // placeholder. Proportions are chosen to still read at the small end.
    readonly property var silhouettes: ({
      slab: function(c) {
        c.rect(0.04, 0.38, 0.92, 0.62)
        c.moveTo(0.04, 0.59); c.lineTo(0.96, 0.59)
        c.moveTo(0.04, 0.79); c.lineTo(0.96, 0.79)
      },
      tower: function(c) {
        c.rect(0.34, 0.14, 0.32, 0.86)
        c.moveTo(0.5, 0.14); c.lineTo(0.5, 0)
        c.moveTo(0.34, 0.43); c.lineTo(0.66, 0.43)
        c.moveTo(0.34, 0.71); c.lineTo(0.66, 0.71)
      },
      columns: function(c) {
        c.moveTo(0.02, 0.38); c.lineTo(0.5, 0.02); c.lineTo(0.98, 0.38); c.lineTo(0.02, 0.38)
        var xs = [0.17, 0.39, 0.61, 0.83]
        for (var i = 0; i < xs.length; i++) { c.moveTo(xs[i], 0.38); c.lineTo(xs[i], 1) }
        c.moveTo(0.02, 1); c.lineTo(0.98, 1)
      },
      dome: function(c) {
        c.rect(0.16, 0.58, 0.68, 0.42)
        c.moveTo(0.84, 0.58); c.arc(0.5, 0.58, 0.34, 0, Math.PI, true)
        c.moveTo(0.5, 0.24); c.lineTo(0.5, 0.08)
      },
      spire: function(c) {
        c.moveTo(0.34, 1); c.lineTo(0.34, 0.38); c.lineTo(0.5, 0); c.lineTo(0.66, 0.38); c.lineTo(0.66, 1)
        c.moveTo(0.34, 0.64); c.lineTo(0.04, 0.64); c.lineTo(0.04, 1)
        c.moveTo(0.66, 0.64); c.lineTo(0.96, 0.64); c.lineTo(0.96, 1)
        c.moveTo(0.04, 1); c.lineTo(0.96, 1)
      },
      pyramid: function(c) {
        c.moveTo(0.02, 1); c.lineTo(0.5, 0.04); c.lineTo(0.98, 1); c.lineTo(0.02, 1)
        c.moveTo(0.5, 0.04); c.lineTo(0.62, 1)
      },
      pagoda: function(c) {
        c.rect(0.32, 0.18, 0.36, 0.82)
        var eaves = [[0.72, 0.92], [0.46, 0.72], [0.2, 0.52]]
        for (var i = 0; i < eaves.length; i++) {
          var y = eaves[i][0], half = eaves[i][1] / 2
          c.moveTo(0.5 - half, y - 0.05); c.lineTo(0.5 - half + 0.07, y)
          c.lineTo(0.5 + half - 0.07, y); c.lineTo(0.5 + half, y - 0.05)
        }
        c.moveTo(0.5, 0.18); c.lineTo(0.5, 0)
      },
      arch: function(c) {
        c.moveTo(0.02, 1); c.lineTo(0.02, 0.3); c.lineTo(0.98, 0.3); c.lineTo(0.98, 1)
        var xs = [0.22, 0.5, 0.78], r = 0.11
        for (var i = 0; i < xs.length; i++) {
          c.moveTo(xs[i] - r, 1); c.lineTo(xs[i] - r, 0.66)
          c.arc(xs[i], 0.66, r, Math.PI, 0, false)
          c.lineTo(xs[i] + r, 1)
        }
      },
      curve: function(c) {
        c.moveTo(0.04, 1)
        c.bezierCurveTo(0.1, 0.35, 0.3, 0.05, 0.55, 0.08)
        c.bezierCurveTo(0.75, 0.1, 0.9, 0.5, 0.96, 1)
        c.moveTo(0.3, 1); c.quadraticCurveTo(0.45, 0.45, 0.72, 0.42)
      }
    })

    // Where the lights come on at night. Only the forms with windows.
    readonly property var windows: ({
      slab: [[0.22, 0.48], [0.5, 0.48], [0.78, 0.48], [0.22, 0.69], [0.5, 0.69], [0.78, 0.69]],
      tower: [[0.43, 0.29], [0.57, 0.29], [0.43, 0.57], [0.57, 0.57], [0.43, 0.85], [0.57, 0.85]]
    })

    function ground(ctx, span) {
      ctx.translate((width - span) / 2, (height + span) / 2)
      ctx.scale(span, span * Math.max(0.02, root.built))
      ctx.translate(0, -1)
    }

    onPaint: {
      var ctx = getContext("2d")
      ctx.reset()
      var thickness = Math.max(1, root.iconSize / 11)
      var span = Math.min(width, height) - thickness
      var draw = silhouettes[root.form] || silhouettes.slab

      // Build the path under a transform that squashes it toward the ground
      // by `built`, then restore before stroking so the line stays crisp.
      ctx.save()
      ground(ctx, span)
      ctx.beginPath()
      draw(ctx)
      ctx.restore()

      ctx.lineWidth = thickness
      ctx.lineJoin = "round"
      ctx.lineCap = "round"
      ctx.strokeStyle = root.iconColor
      ctx.stroke()

      if (!root.night) return
      ctx.save()
      ground(ctx, span)
      ctx.beginPath()
      var lit = windows[root.form] || []
      for (var i = 0; i < lit.length; i++) ctx.rect(lit[i][0] - 0.04, lit[i][1] - 0.04, 0.08, 0.08)
      ctx.restore()
      ctx.fillStyle = root.iconColor
      ctx.fill()

      // A crescent in the corner, once there is room for one.
      if (root.iconSize < 20) return
      ctx.beginPath()
      var cx = (width - span) / 2 + span * 0.14, cy = (height - span) / 2 + span * 0.16
      ctx.arc(cx, cy, span * 0.07, Math.PI * 0.35, Math.PI * 1.65, false)
      ctx.stroke()
    }
  }
}
