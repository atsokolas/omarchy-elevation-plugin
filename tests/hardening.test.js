// What comes off the network is bounded, checked and plain. The fetch
// commands run for real against a stand-in curl, so these cover the shell
// as well as the JavaScript around it.

const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")
const Model = require("../Model.js")

const ROOT = path.join(__dirname, "..")
const URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/X.jpg/960px-X.jpg"

// A curl that serves $STUB_BODY (or nothing), records its arguments and exits
// with $STUB_RC — like a server that lies about its length, or none at all.
function sandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "elevation-test-"))
  const bin = path.join(dir, "bin")
  fs.mkdirSync(bin)
  fs.writeFileSync(path.join(bin, "curl"),
    '#!/bin/sh\nprintf "%s\\n" "$@" > "$STUB_ARGS"\n[ -n "$STUB_BODY" ] && cat "$STUB_BODY"\nexit "${STUB_RC:-0}"\n', { mode: 0o755 })
  return { dir: dir, cache: path.join(dir, "cache"), args: path.join(dir, "args"), bin: bin }
}

function run(box, command, body, rc) {
  const env = Object.assign({}, process.env, {
    PATH: box.bin + ":" + process.env.PATH,
    STUB_ARGS: box.args,
    STUB_BODY: body || "",
    STUB_RC: String(rc || 0)
  })
  return spawnSync(command[0], command.slice(1), { env: env, encoding: "utf8" })
}

function leftovers(box) {
  return fs.existsSync(box.cache) ? fs.readdirSync(box.cache).filter(f => f.startsWith(".part")) : []
}

// The smallest honest PNG header `file` will read dimensions from.
function png(width, height) {
  const b = Buffer.alloc(33)
  Buffer.from("89504e470d0a1a0a0000000d49484452", "hex").copy(b, 0)
  b.writeUInt32BE(width, 16)
  b.writeUInt32BE(height, 20)
  b.writeUInt8(8, 24)
  b.writeUInt8(2, 25)
  return b
}

function file(box, name, data) {
  const p = path.join(box.dir, name)
  fs.writeFileSync(p, data)
  return p
}

const SUMMARY = JSON.stringify({ title: "Villa Savoye", extract: "A villa.", thumbnail: { source: URL } })

test("a summary within the limit is cached and served", () => {
  const box = sandbox()
  const out = run(box, Model.summaryCommand(box.cache, "Villa_Savoye", false), file(box, "s.json", SUMMARY))
  assert.equal(out.status, 0)
  assert.equal(out.stdout, SUMMARY)
  assert.equal(fs.readFileSync(Model.summaryCachePath(box.cache, "Villa_Savoye"), "utf8"), SUMMARY)
  assert.deepEqual(leftovers(box), [])
})

test("an oversized summary without a length is cut off and refused", () => {
  // The stand-in ignores --max-filesize, as a chunked response would.
  const box = sandbox()
  const big = file(box, "big.json", "x".repeat(Model.SUMMARY_MAX_BYTES + 4096))
  const out = run(box, Model.summaryCommand(box.cache, "X", false), big)
  assert.equal(out.status, 3)
  assert.equal(out.stdout, "")
  assert.ok(!fs.existsSync(Model.summaryCachePath(box.cache, "X")))
  assert.deepEqual(leftovers(box), [])
})

test("a declared length over the limit is refused without a retry", () => {
  const box = sandbox()
  const out = run(box, Model.summaryCommand(box.cache, "X", false), "", 63)
  assert.equal(out.status, 3)
  assert.deepEqual(leftovers(box), [])
})

test("a stalled or failed fetch leaves nothing behind", () => {
  const box = sandbox()
  const half = file(box, "half.json", "{\"title\":")
  const out = run(box, Model.summaryCommand(box.cache, "X", false), half, 28)
  assert.equal(out.status, 1)
  assert.ok(!fs.existsSync(Model.summaryCachePath(box.cache, "X")))
  assert.deepEqual(leftovers(box), [])
})

test("an oversized summary already on disk is never read", () => {
  const box = sandbox()
  fs.mkdirSync(box.cache, { recursive: true })
  fs.writeFileSync(Model.summaryCachePath(box.cache, "X"), "y".repeat(Model.SUMMARY_MAX_BYTES + 1))
  const out = run(box, Model.summaryCommand(box.cache, "X", false), file(box, "s.json", SUMMARY))
  assert.equal(out.status, 0)
  assert.equal(out.stdout, SUMMARY)
})

test("fetches are HTTPS only, uncompressed, and timed", () => {
  const box = sandbox()
  run(box, Model.summaryCommand(box.cache, "X", false), file(box, "s.json", SUMMARY))
  const args = fs.readFileSync(box.args, "utf8").split("\n")
  for (const flag of ["--proto", "--proto-redir", "--max-time", "--connect-timeout", "--max-filesize", "--max-redirs"])
    assert.ok(args.includes(flag), flag)
  assert.equal(args[args.indexOf("--proto") + 1], "=https")
  assert.equal(args[args.indexOf("--max-filesize") + 1], String(Model.SUMMARY_MAX_BYTES))
  assert.ok(args.includes("Accept-Encoding: identity"))
  assert.ok(!args.includes("--compressed"))
})

test("a photograph is checked by type and size before it is cached", () => {
  const box = sandbox()
  const target = Model.imageCachePath(box.cache, "X", URL)
  const good = run(box, Model.imageCommand(box.cache, target, URL), file(box, "ok.png", png(960, 720)))
  assert.equal(good.status, 0)
  assert.equal(good.stdout, target)
  assert.ok(fs.existsSync(target))
})

test("a photograph that isn't an image is refused", () => {
  const box = sandbox()
  const target = Model.imageCachePath(box.cache, "X", URL)
  const out = run(box, Model.imageCommand(box.cache, target, URL), file(box, "page.html", "<html><img src=x></html>"))
  assert.equal(out.status, 3)
  assert.ok(!fs.existsSync(target))
  assert.deepEqual(leftovers(box), [])
})

test("a photograph too large to decode is refused", () => {
  const box = sandbox()
  const target = Model.imageCachePath(box.cache, "X", URL)
  for (const dims of [[Model.IMAGE_MAX_SIDE + 1, 10], [10, 60000], [4096, 4096 + 1]]) {
    const out = run(box, Model.imageCommand(box.cache, target, URL), file(box, "huge.png", png(dims[0], dims[1])))
    assert.equal(out.status, 3, dims.join("x"))
    assert.ok(!fs.existsSync(target))
  }
})

test("an oversized photograph without a length is cut off", () => {
  const box = sandbox()
  const target = Model.imageCachePath(box.cache, "X", URL)
  const big = file(box, "big.png", Buffer.concat([png(960, 720), Buffer.alloc(Model.IMAGE_MAX_BYTES)]))
  const out = run(box, Model.imageCommand(box.cache, target, URL), big)
  assert.equal(out.status, 3)
  assert.ok(!fs.existsSync(target))
  assert.deepEqual(leftovers(box), [])
})

test("a bad photograph already in the cache is removed before QML sees it", () => {
  const box = sandbox()
  const target = Model.imageCachePath(box.cache, "X", URL)
  fs.mkdirSync(box.cache, { recursive: true })
  fs.writeFileSync(target, "<svg onload=alert(1)>")
  const out = run(box, Model.imageCommand(box.cache, target, URL), file(box, "ok.png", png(640, 480)))
  assert.equal(out.status, 0)
  assert.equal(fs.readFileSync(target).subarray(0, 4).toString("hex"), "89504e47")
})

test("photographs only come from Wikimedia over HTTPS", () => {
  assert.equal(Model.imageUrlAllowed(URL), true)
  assert.equal(Model.imageUrlAllowed("https://thumb.wikimedia.org/w/a.jpg"), true)
  for (const bad of ["http://upload.wikimedia.org/a.jpg", "https://upload.wikimedia.org.evil.com/a.jpg",
    "https://evil.com/upload.wikimedia.org/a.jpg", "file:///etc/passwd", "https://upload.wikimedia.org/a b.jpg", ""])
    assert.equal(Model.imageUrlAllowed(bad), false, bad)
  const parsed = Model.parseSummary(JSON.stringify({ title: "X", extract: "x", thumbnail: { source: "https://evil.com/x.jpg" } }))
  assert.equal(parsed.image, "")
  assert.equal(parsed.thumb, "")
})

test("one building's photograph can't be filed under another's name", () => {
  // The cache once served Villa Savoye's photograph for Paimio: a lookup for
  // one building finished after the panel had moved on to the next, and its
  // picture was saved under the new name. The file now carries the address
  // it came from, and the service drops results for a building it has left.
  const savoye = "https://upload.wikimedia.org/wikipedia/en/thumb/3/3c/VillaSavoye.jpg/960px-VillaSavoye.jpg"
  const paimio = "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Paimio_Sanatorium2.jpg/960px-Paimio_Sanatorium2.jpg"
  assert.notEqual(Model.imageCachePath("/c", "Paimio_Sanatorium", savoye), Model.imageCachePath("/c", "Paimio_Sanatorium", paimio))
  assert.notEqual(Model.imageCachePath("/c", "Paimio_Sanatorium", paimio), Model.imageCachePath("/c", "Villa_Savoye", savoye))
  assert.equal(Model.imageCachePath("/c", "Villa_Savoye", savoye), Model.imageCachePath("/c", "Villa_Savoye", savoye))
  const seen = {}
  for (const b of Model.BUILDINGS) {
    const key = Model.summaryCachePath("/c", b.w)
    assert.ok(!seen[key], b.w + " shares a cache file with " + seen[key])
    seen[key] = b.w
  }
  const service = fs.readFileSync(path.join(ROOT, "Service.qml"), "utf8")
  assert.match(service, /root\._summaryTitle !== root\._loadedTitle/)
  assert.match(service, /root\._imageTitle !== String\(root\.entry\.w\)/)
  assert.match(service, /if \(summaryProcess\.running\) return/)
  assert.match(service, /if \(imageProcess\.running\) return/)
})

test("cache names stay inside the cache", () => {
  for (const title of ["..", "../../etc/passwd", "a/b", ".hidden"]) {
    const p = Model.summaryCachePath("/c", title)
    assert.match(p, /^\/c\/[^/]+$/)
    assert.ok(!p.startsWith("/c/."), p)
  }
})

test("markup in an article stays literal text", () => {
  const raw = JSON.stringify({ title: "X", extract: "<font color=red>big</font> <img src=https://evil.com/x.png>", description: "<b>d</b>" })
  const parsed = Model.parseSummary(raw)
  assert.equal(parsed.extract, "<font color=red>big</font> <img src=https://evil.com/x.png>")
  assert.equal(Model.bodyText(null, parsed), parsed.extract)
  assert.match(Model.trimToSentences(parsed.extract, 700), /<img src=/)
})

test("every Text renders as plain text", () => {
  for (const name of fs.readdirSync(ROOT).filter(f => f.endsWith(".qml"))) {
    const qml = fs.readFileSync(path.join(ROOT, name), "utf8")
    const blocks = qml.split(/\n\s*Text \{\n/).slice(1)
    for (const block of blocks)
      assert.match(block.split("\n").slice(0, 2).join("\n"), /textFormat: Text\.PlainText/, name)
  }
})

test("the photograph decodes no larger than its frame", () => {
  const panel = fs.readFileSync(path.join(ROOT, "Panel.qml"), "utf8")
  assert.match(panel, /sourceSize\.width:/)
  assert.match(panel, /sourceSize\.height:/)
})
