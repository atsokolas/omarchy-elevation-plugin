import QtQuick
import qs.Commons

// A three-block skyline, drawn rather than set in a font — this machine's Nerd
// Font maps the nf-md-* building glyphs to the wrong codepoints, and drawing it
// also lets the blocks rise when the day turns over.
Item {
  id: root

  property real iconSize: Style.font.icon
  property color iconColor: Color.foreground
  // 0 flat to the ground, 1 fully built. Animated by `raise()`.
  property real built: 1

  width: iconSize
  height: iconSize

  function raise() { buildAnimation.restart() }

  SequentialAnimation {
    id: buildAnimation
    NumberAnimation { target: root; property: "built"; to: 0; duration: 140; easing.type: Easing.InCubic }
    NumberAnimation { target: root; property: "built"; to: 1; duration: 620; easing.type: Easing.OutBack }
  }

  Item {
    id: skyline
    anchors.centerIn: parent
    width: root.iconSize
    height: root.iconSize * 0.8

    readonly property real unit: width / 11
    readonly property real thickness: Math.max(1, Math.round(root.iconSize / 11))

    // Left low block, tall centre block, mid-height right block. Proportions
    // chosen to still read as buildings at 12px on a dense bar.
    Repeater {
      model: [
        { x: 0, w: 3, h: 0.58 },
        { x: 4, w: 3, h: 1.0 },
        { x: 8, w: 3, h: 0.76 }
      ]

      Rectangle {
        required property var modelData
        readonly property real full: skyline.height * modelData.h

        x: modelData.x * skyline.unit
        width: modelData.w * skyline.unit
        height: Math.max(skyline.thickness, full * root.built)
        y: skyline.height - height
        color: "transparent"
        border.width: skyline.thickness
        border.color: root.iconColor
        antialiasing: true

        // One window per block, so the silhouette still reads as inhabited.
        Rectangle {
          width: skyline.unit
          height: width
          x: (parent.width - width) / 2
          y: skyline.thickness * 2
          visible: parent.height > skyline.thickness * 5
          color: root.iconColor
          opacity: 0.75
        }
      }
    }
  }
}
