import QtQuick
import Quickshell
import Quickshell.Io
import qs.Commons
import qs.Ui
import "Model.js" as Model

BarWidget {
  id: root
  moduleName: "atsokolas.elevation"

  function injectPanel() {
    var target = panelLoader.item
    if (!target) return
    if ("bar" in target) target.bar = root.bar
    if ("settings" in target) target.settings = root.settings
    if ("anchorItem" in target) target.anchorItem = button
    if ("hostWidget" in target) target.hostWidget = root
  }

  function refresh() {
    if (panelLoader.item && panelLoader.item.refresh) panelLoader.item.refresh()
  }

  function togglePanel() {
    if (panelLoader.item && panelLoader.item.toggle) panelLoader.item.toggle()
  }

  function open() {
    if (panelLoader.item && panelLoader.item.openFromHotkey) panelLoader.item.openFromHotkey()
  }

  function close() {
    if (panelLoader.item && panelLoader.item.close) panelLoader.item.close()
  }

  readonly property var service: panelLoader.item ? panelLoader.item.service : null
  readonly property bool opened: panelLoader.item ? panelLoader.item.opened === true : false
  readonly property var entry: service ? service.entry : null
  readonly property bool showName: service ? service.showName : true
  readonly property string label: service ? service.barText : Model.APP_NAME

  readonly property bool popoutSwitchClosing: panelLoader.item ? panelLoader.item.popoutSwitchClosing === true : false

  function closeForPopoutSwitch() {
    if (panelLoader.item) panelLoader.item.closeForPopoutSwitch()
  }

  implicitWidth: button.implicitWidth
  implicitHeight: button.implicitHeight

  onBarChanged: injectPanel()
  onSettingsChanged: injectPanel()

  IpcHandler {
    target: "atsokolas.elevation"
    function open(): void { root.open() }
    function close(): void { root.close() }
    function show(): void { root.open() }
    function hide(): void { root.close() }
    function toggle(): void { root.togglePanel() }
    function refresh(): string { root.refresh(); return "ok" }
    // The service is shared across monitors, so one call reaches every bar.
    function today(): string {
      if (!root.service) return "no service"
      root.service.jumpToday()
      return "ok"
    }
    function surprise(): string {
      if (!root.service) return "no service"
      root.service.surprise()
      return "ok"
    }
    function name(): string { return root.entry ? String(root.entry.n) : "" }
  }

  Loader {
    id: panelLoader
    active: true
    source: Qt.resolvedUrl("Panel.qml")
    visible: false
    onLoaded: {
      root.injectPanel()
      Qt.callLater(root.injectPanel)
    }
  }

  // A new building gets a new skyline: the blocks drop and rebuild.
  Connections {
    target: root.service
    ignoreUnknownSignals: true
    function onEntryChanged2() { icon.raise() }
  }

  WidgetButton {
    id: button
    anchors.fill: parent
    bar: root.bar
    text: ""
    labelVisible: false
    hasVisualContent: true
    fixedWidth: root.vertical ? -1 : Math.max(12, content.implicitWidth + button.scaledHorizontalMargin * 2)
    foreground: root.opened ? Color.accent : (root.bar ? root.bar.barForeground : Color.foreground)
    tooltipText: Model.tooltipText(root.entry)
    horizontalMargin: 8.75
    verticalPadding: 8.75

    onPressed: function(b) {
      if (b === Qt.RightButton || b === Qt.MiddleButton) root.refresh()
      else root.togglePanel()
    }

    Item {
      id: content
      anchors.fill: parent

      readonly property real gap: Style.spaceReal(7)
      readonly property bool labelVisible: !root.vertical && root.showName && labelText.text !== ""
      readonly property real implicitWidth: icon.width + (labelVisible ? gap + labelText.implicitWidth : 0)

      ElevationIcon {
        id: icon
        form: root.entry ? root.entry.f : "slab"
        iconSize: button.fontSize
        iconColor: button.foreground
        x: root.vertical ? (parent.width - width) / 2 : button.scaledHorizontalMargin
        y: (parent.height - height) / 2
      }

      Text {
        id: labelText
        visible: content.labelVisible
        x: icon.x + icon.width + content.gap
        anchors.verticalCenter: parent.verticalCenter
        text: root.label
        color: button.foreground
        font.family: button.fontFamily
        font.pixelSize: button.fontSize
        renderType: Text.NativeRendering
      }
    }
  }
}
