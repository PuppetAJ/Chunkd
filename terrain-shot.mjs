import { chromium } from "playwright";
const OUT = process.argv[2] ?? "terrain";
const DIR = "/private/tmp/claude-501/-Users-work-Developer-Web-Projects-ReactMC/02bd0881-ca1a-4ace-9721-5bc675f7ce33/scratchpad/shots";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1100, height: 780 } });
page.on("pageerror", (e) => console.log("[pageerror]", e.message.slice(0, 160)));
const stamp = Date.now();
await page.goto("http://localhost:3000/signup", { waitUntil: "networkidle" });
await page.fill("#username", `tr${stamp}`.slice(0, 20));
await page.fill("#email", `tr${stamp}@chunkd.test`);
await page.fill("#password", "supersecret1");
await page.getByRole("button", { name: "Submit" }).click();
await page.waitForURL("http://localhost:3000/", { timeout: 20000 });
await page.goto("http://localhost:3000/editor", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__r3f && window.__world, null, { timeout: 25000 });
await page.evaluate(() => window.__world.getState().newWorld(20260905));
await page.waitForTimeout(6000);

// Double tap space to start flying, then hold it to climb for a view of the
// whole map. The player drives the camera, so this is the honest way up.
for (const _ of [0, 1]) {
  await page.keyboard.down("Space");
  await page.waitForTimeout(60);
  await page.keyboard.up("Space");
  await page.waitForTimeout(90);
}
await page.waitForTimeout(300);
await page.keyboard.down("Space");
await page.waitForTimeout(Number(process.env.CLIMB ?? 4200));
await page.keyboard.up("Space");
await page.waitForTimeout(400);

const info = await page.evaluate(() => {
  const { camera } = window.__r3f;
  camera.rotation.set(-0.85, 0.78, 0, "YXZ");
  camera.updateMatrixWorld();
  let drawn = 0; window.__r3f.scene.traverse((o) => { if (o.isInstancedMesh) drawn += o.count; });
  return {
    blocks: window.__world.getState().blocks.size, drawn,
    calls: window.__r3f.gl.info.render.calls,
    camY: +camera.position.y.toFixed(1),
  };
});
console.log(info);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${DIR}/${OUT}.png` });
console.log("saved", OUT);
await browser.close();
