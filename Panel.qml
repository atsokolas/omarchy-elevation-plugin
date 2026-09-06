import QtQuick
import QtQuick.Layouts
import Quickshell
import qs.Commons
import qs.Ui
import "Model.js" as Model

Panel {
  id: root
  moduleName: "atsokolas.elevation"
  ipcTarget: "atsokolas.elevation"
  manageIpc: false

  property var anchorItem: null
  property var hostWidget: null
  property bool openedFromHotkey: false
  property string page: "card"

  readonly property var barIdentity: hostWidget || root
  readonly property color foreground: bar ? bar.foreground : Color.foreground
  readonly property color dim: Qt.darker(foreground, 1.55)
  readonly property string fontFamily: bar ? bar.fontFamily : Style.font.family

  readonly property var sharedService: bar && bar.shell && typeof bar.shell.serviceFor === "function"
    ? bar.shell.serviceFor(moduleName) : null
  readonly property var service: sharedService || localService

  readonly property var entry: service.entry
  readonly property string dateHeading: Model.dateHeading(service.dateKey, service.todayKey)

  // Content settles in behind the panel frame on open and on every new
  // building, so browsing days feels like turning a page rather than a repaint.
  property real reveal: 1

  NumberAnimation {
    id: revealAnimation
    target: root
    property: "reveal"
    from: 0
    to: 1
    duration: 280
    easing.type: Easing.OutCubic
  }

  function pushSettings() { if (service) service.settings = settings }
  onSettingsChanged: pushSettings()
  onServiceChanged: pushSettings()
  Component.onCompleted: pushSettings()

  function persistSettings(values) {
    var entryData = { id: root.moduleName }
    for (var existing in root.settings) if (existing !== "id") entryData[existing] = root.settings[existing]
    for (var key in values) {
      if (values[key] === undefined) delete entryData[key]
      else entryData[key] = values[key]
    }
    root.settings = entryData
    if (root.bar && root.bar.shell && typeof root.bar.shell.updateEntryInline === "function")
      root.bar.shell.updateEntryInline(root.moduleName, entryData)
    pushSettings()
  }

  function open() {
    openedFromHotkey = false
    setCenterHoverRevealSuppressed(false)
    root.controller.show()
  }

  function openFromHotkey() {
    openedFromHotkey = true
    root.controller.show()
    Qt.callLater(function() {
      if (root.opened) setCenterHoverRevealSuppressed(true)
    })
  }

  function close() {
    setCenterHoverRevealSuppressed(false)
    root.controller.hide()
  }

  function toggle() {
    if (root.opened) root.close()
    else root.openFromHotkey()
  }

  function refresh() { service.refresh() }

  function switchPanel(direction) {
    if (root.bar && typeof root.bar.switchPanelFrom === "function")
      return root.bar.switchPanelFrom(root.barIdentity, direction)
    return false
  }

  function setCenterHoverRevealSuppressed(value) {
    if (root.bar && "centerHoverRevealSuppressed" in root.bar)
      root.bar.centerHoverRevealSuppressed = value
  }

  function showSettings() { page = "settings" }
  function showCard() { page = "card" }

  function copyEntry() {
    var payload = Model.copyPayload(entry)
    if (payload) Quickshell.execDetached(Model.copyCommand(payload))
  }

  function handleClose() {
    if (page !== "card") showCard()
    else close()
  }

  function handleMove(dx, dy) {
    if (page !== "card") return
    if (dx !== 0) service.shiftDay(dx > 0 ? 1 : -1)
    else if (dy !== 0) bodyFlick.flick(0, dy > 0 ? -600 : 600)
  }

  onOpenedChanged: if (opened) revealAnimation.restart()

  Connections {
    target: root.service
    ignoreUnknownSignals: true
    function onEntryChanged2() { if (root.opened) revealAnimation.restart() }
  }

  Service {
    id: localService
    active: root.sharedService === null
  }

  KeyboardPanel {
    id: panel
    anchorItem: root.anchorItem
    owner: root.barIdentity
    bar: root.bar
    open: root.opened
    centerOnBar: true
    focusTarget: keyCatcher
    contentWidth: panel.fittedContentWidth(Style.space(460))
    contentHeight: panel.fittedContentHeight(Style.space(560), Style.space(660))

    PanelKeyCatcher {
      id: keyCatcher
      anchors.fill: parent
      onMoveRequested: function(dx, dy) { root.handleMove(dx, dy) }
      onActivateRequested: root.service.openArticle()
      onCloseRequested: root.handleClose()
      onTabRequested: function(direction) { root.switchPanel(direction) }
      onTextKey: function(text) {
        var key = String(text || "").toLowerCase()
        if (key === "r") root.refresh()
        else if (key === "s") root.page === "settings" ? root.showCard() : root.showSettings()
        else if (key === "t") root.service.jumpToday()
        else if (key === "o") root.service.openArticle()
        else if (key === "c") root.copyEntry()
        else if (key === "m") root.service.openMap()
        else if (key === "n") root.service.surprise()
        else if (key === "[") root.service.stepHistory(-1)
        else if (key === "]") root.service.stepHistory(1)
        else if (key === "i") root.persistSettings({ themed: !root.service.themed })
      }

      ColumnLayout {
        anchors.fill: parent
        spacing: Style.space(10)

        // ---- Header ------------------------------------------------------
        Item {
          Layout.fillWidth: true
          implicitHeight: Math.max(heroIcon.height, heroLabels.implicitHeight, headerButtons.height)

          ElevationIcon {
            id: heroIcon
            anchors.left: parent.left
            anchors.verticalCenter: parent.verticalCenter
            form: root.entry ? root.entry.f : "slab"
            night: Model.isNightThere(root.service.summary, root.service.nowMs)
            iconSize: Style.font.display
            iconColor: root.foreground
          }

          Column {
            id: heroLabels
            anchors.left: heroIcon.right
            anchors.leftMargin: Style.space(12)
            anchors.right: headerButtons.left
            anchors.rightMargin: Style.space(8)
            anchors.verticalCenter: parent.verticalCenter
            spacing: Style.space(2)

            Text {
              width: parent.width
              text: root.page === "settings" ? "Settings" : Model.APP_NAME
              color: root.foreground
              font.family: root.fontFamily
              font.pixelSize: Style.font.title
              font.bold: true
              elide: Text.ElideRight
            }

            Text {
              width: parent.width
              text: root.page === "settings"
                ? "Elevation"
                : (root.service.lastError !== "" ? root.service.lastError : root.dateHeading)
              color: root.service.lastError !== "" && root.page !== "settings" ? Color.urgent : root.dim
              font.family: root.fontFamily
              font.pixelSize: Style.font.bodySmall
              elide: Text.ElideRight
            }
          }

          Row {
            id: headerButtons
            anchors.right: parent.right
            anchors.verticalCenter: parent.verticalCenter
            spacing: Style.space(2)

            PanelActionButton {
              visible: root.page !== "card"
              iconText: "󰁍"
              tooltipText: "Back"
              foreground: root.foreground
              fontFamily: root.fontFamily
              onClicked: root.showCard()
            }

            PanelActionButton {
              visible: root.page === "card"
              iconText: "󰒓"
              tooltipText: "Settings"
              foreground: root.foreground
              fontFamily: root.fontFamily
              onClicked: root.showSettings()
            }
          }
        }

        PanelSeparator { Layout.fillWidth: true }

        // ---- The day's building -----------------------------------------
        ColumnLayout {
          Layout.fillWidth: true
          Layout.fillHeight: true
          visible: root.page === "card"
          spacing: Style.space(10)
          opacity: root.reveal
          transform: Translate { y: (1 - root.reveal) * Style.space(8) }

          // Photo. Absent for the handful of buildings whose lead image is
          // still in copyright, so the placeholder has to hold the frame.
          Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: Math.round(width * 0.52)
            visible: root.service.showPhoto
            radius: Style.cornerRadius
            clip: true
            color: Qt.rgba(root.foreground.r, root.foreground.g, root.foreground.b, 0.06)

            Image {
              id: photo
              anchors.fill: parent
              source: root.service.imagePath !== "" ? "file://" + root.service.imagePath : ""
              fillMode: Image.PreserveAspectCrop
              asynchronous: true
              cache: false
              opacity: status === Image.Ready ? 1 : 0
              Behavior on opacity { NumberAnimation { duration: 320; easing.type: Easing.OutCubic } }
            }

            // Standing in for the photo: the skyline, drawn large and faint.
            ElevationIcon {
              anchors.centerIn: parent
              form: root.entry ? root.entry.f : "slab"
              night: Model.isNightThere(root.service.summary, root.service.nowMs)
              iconSize: Math.min(parent.height * 0.5, Style.space(72))
              iconColor: root.foreground
              opacity: photo.status === Image.Ready ? 0 : 0.22
              Behavior on opacity { NumberAnimation { duration: 320 } }
            }

            Text {
              anchors.centerIn: parent
              anchors.verticalCenterOffset: Style.space(46)
              visible: photo.status !== Image.Ready && !root.service.imageLoading
              text: root.service.loading ? "Looking it up…" : "No photograph"
              color: root.dim
              font.family: root.fontFamily
              font.pixelSize: Style.font.caption
            }
          }

          // Name, credit, place.
          ColumnLayout {
            Layout.fillWidth: true
            spacing: Style.space(3)

            Text {
              Layout.fillWidth: true
              text: root.entry ? String(root.entry.n) : ""
              color: root.foreground
              font.family: root.fontFamily
              font.pixelSize: Style.font.title
              font.bold: true
              wrapMode: Text.WordWrap
            }

            Text {
              Layout.fillWidth: true
              text: Model.creditLine(root.entry, root.service.nowMs)
              visible: text !== ""
              color: Color.accent
              font.family: root.fontFamily
              font.pixelSize: Style.font.body
              wrapMode: Text.WordWrap
            }

            Text {
              Layout.fillWidth: true
              text: Model.placeLine(root.entry, root.service.summary, root.service.nowMs).toUpperCase()
              visible: text !== ""
              color: root.dim
              font.family: root.fontFamily
              font.pixelSize: Style.font.caption
              font.bold: true
              font.letterSpacing: 1.1
              elide: Text.ElideRight
            }
          }

          // The article's opening paragraph, or the curated note offline.
          Flickable {
            id: bodyFlick
            Layout.fillWidth: true
            Layout.fillHeight: true
            contentHeight: bodyText.implicitHeight
            clip: true
            boundsBehavior: Flickable.StopAtBounds

            Text {
              id: bodyText
              width: bodyFlick.width
              text: Model.trimToSentences(root.service.body, 700)
              color: root.foreground
              font.family: root.fontFamily
              font.pixelSize: Style.font.body
              lineHeight: 1.3
              wrapMode: Text.WordWrap
            }
          }

          // ---- Where it sits in history ---------------------------------
          // Every building in the canon as a tick, oldest on the left, in
          // rank order rather than by year — a linear axis would cram the
          // whole twentieth century into the last inch. Click to visit.
          Item {
            id: timeline
            Layout.fillWidth: true
            implicitHeight: Style.space(30)

            readonly property var order: Model.chronology()
            readonly property int rank: Model.chronoRank(root.entry)
            readonly property real inset: Style.spaceReal(3)
            readonly property real track: width - inset * 2
            function xAt(r) { return inset + (order.length > 1 ? r / (order.length - 1) : 0) * track }

            Canvas {
              id: ticks
              anchors.fill: parent
              onWidthChanged: requestPaint()
              onPaint: {
                var ctx = getContext("2d")
                ctx.reset()
                ctx.strokeStyle = Qt.rgba(root.dim.r, root.dim.g, root.dim.b, 0.55)
                ctx.lineWidth = 1
                ctx.beginPath()
                for (var i = 0; i < timeline.order.length; i++) {
                  var x = Math.round(timeline.xAt(i)) + 0.5
                  ctx.moveTo(x, Style.spaceReal(9)); ctx.lineTo(x, Style.spaceReal(13))
                }
                ctx.stroke()
              }
            }

            // You are here.
            Rectangle {
              id: marker
              width: Style.spaceReal(3)
              height: Style.spaceReal(11)
              radius: width / 2
              color: Color.accent
              x: timeline.xAt(timeline.rank) - width / 2
              y: Style.spaceReal(6)
              Behavior on x { NumberAnimation { duration: 260; easing.type: Easing.OutCubic } }
            }

            Text {
              anchors.left: parent.left
              anchors.bottom: parent.bottom
              text: Model.yearLabel(Model.BUILDINGS[timeline.order[0]].y)
              color: root.dim
              font.family: root.fontFamily
              font.pixelSize: Style.font.caption
            }

            Text {
              anchors.right: parent.right
              anchors.bottom: parent.bottom
              text: Model.yearLabel(Model.BUILDINGS[timeline.order[timeline.order.length - 1]].y)
              color: root.dim
              font.family: root.fontFamily
              font.pixelSize: Style.font.caption
            }

            Text {
              id: yearNow
              anchors.bottom: parent.bottom
              x: Math.max(Style.spaceReal(48), Math.min(timeline.width - width - Style.spaceReal(48), marker.x + marker.width / 2 - width / 2))
              text: root.entry ? Model.yearLabel(root.entry.y) : ""
              color: Color.accent
              font.family: root.fontFamily
              font.pixelSize: Style.font.caption
              font.bold: true
              Behavior on x { NumberAnimation { duration: 260; easing.type: Easing.OutCubic } }
            }

            MouseArea {
              anchors.fill: parent
              cursorShape: Qt.PointingHandCursor
              onClicked: function(mouse) {
                var r = Math.round((mouse.x - timeline.inset) / timeline.track * (timeline.order.length - 1))
                r = Math.max(0, Math.min(timeline.order.length - 1, r))
                root.service.showIndex(timeline.order[r])
              }
            }
          }

          PanelSeparator { Layout.fillWidth: true }

          // ---- Footer ----------------------------------------------------
          Item {
            Layout.fillWidth: true
            implicitHeight: Math.max(footerLabel.implicitHeight, footerButtons.height)

            Text {
              id: footerLabel
              anchors.left: parent.left
              anchors.right: footerButtons.left
              anchors.rightMargin: Style.space(8)
              anchors.verticalCenter: parent.verticalCenter
              text: Model.sourceLine(root.service.summary) + "  ·  " + Model.cycleLine(root.service.position)
              color: root.dim
              font.family: root.fontFamily
              font.pixelSize: Style.font.caption
              elide: Text.ElideRight
            }

            Row {
              id: footerButtons
              anchors.right: parent.right
              anchors.verticalCenter: parent.verticalCenter
              spacing: Style.space(2)

              PanelActionButton {
                iconText: "󰁍"
                tooltipText: "Previous day"
                foreground: root.foreground
                fontFamily: root.fontFamily
                onClicked: root.service.shiftDay(-1)
              }

              PanelActionButton {
                iconText: "󰁔"
                tooltipText: "Next day"
                foreground: root.foreground
                fontFamily: root.fontFamily
                onClicked: root.service.shiftDay(1)
              }

              PanelActionButton {
                visible: !root.service.isToday
                iconText: "󰥔"
                tooltipText: "Back to today"
                foreground: root.foreground
                fontFamily: root.fontFamily
                onClicked: root.service.jumpToday()
              }

              PanelActionButton {
                iconText: "󰒝"
                tooltipText: "Surprise me"
                foreground: root.foreground
                fontFamily: root.fontFamily
                onClicked: root.service.surprise()
              }

              PanelActionButton {
                iconText: "󰆏"
                tooltipText: "Copy"
                foreground: root.foreground
                fontFamily: root.fontFamily
                onClicked: root.copyEntry()
              }

              PanelActionButton {
                visible: root.service.summary.lat !== 0
                iconText: "󰍎"
                tooltipText: "Map"
                foreground: root.foreground
                fontFamily: root.fontFamily
                onClicked: root.service.openMap()
              }

              PanelActionButton {
                iconText: "󰖟"
                tooltipText: "Open on Wikipedia"
                foreground: root.foreground
                fontFamily: root.fontFamily
                onClicked: root.service.openArticle()
              }
            }
          }
        }

        // ---- Settings ----------------------------------------------------
        ColumnLayout {
          Layout.fillWidth: true
          Layout.fillHeight: true
          visible: root.page === "settings"
          spacing: Style.space(4)

          PanelHero {
            Layout.fillWidth: true
            title: "Name on the bar"
            meta: "Show the building's name beside the icon"
            foreground: root.foreground
            fontFamily: root.fontFamily
            trailingControl: Component {
              ToggleSwitch {
                checked: root.service.showName
                onToggled: root.persistSettings({ showName: !root.service.showName })
              }
            }
          }

          PanelHero {
            Layout.fillWidth: true
            title: "Photo in the panel"
            meta: "Fetch the article's lead image"
            foreground: root.foreground
            fontFamily: root.fontFamily
            trailingControl: Component {
              ToggleSwitch {
                checked: root.service.showPhoto
                onToggled: root.persistSettings({ showPhoto: !root.service.showPhoto })
              }
            }
          }

          PanelHero {
            Layout.fillWidth: true
            title: "Photo in my theme"
            meta: "Render the photograph in the desktop's colours"
            foreground: root.foreground
            fontFamily: root.fontFamily
            trailingControl: Component {
              ToggleSwitch {
                checked: root.service.themed
                onToggled: root.persistSettings({ themed: !root.service.themed })
              }
            }
          }

          PanelHero {
            Layout.fillWidth: true
            title: "Notify on the daily change"
            meta: "A quiet toast when the building turns over"
            foreground: root.foreground
            fontFamily: root.fontFamily
            trailingControl: Component {
              ToggleSwitch {
                checked: root.service.notify
                onToggled: root.persistSettings({ notify: !root.service.notify })
              }
            }
          }

          Item { Layout.fillHeight: true }

          Text {
            Layout.fillWidth: true
            text: "← →  browse days   ·   [ ]  earlier / later in history   ·   t  today\nn  surprise me   ·   o  open   ·   c  copy   ·   m  map   ·   i  in my theme   ·   r  refetch"
            color: root.dim
            font.family: root.fontFamily
            font.pixelSize: Style.font.caption
            lineHeight: 1.4
            wrapMode: Text.WordWrap
          }
        }
      }
    }
  }
}
