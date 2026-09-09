/**
 * End-to-end smoke test.
 *
 * Drives a real browser through every route and the editor's core interactions.
 * Needs both servers running:
 *
 *   pnpm dev
 *   pnpm test:e2e
 */
import { chromium } from "playwright";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const results = [];

function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "   " + detail}`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

// Record who asks for the mouse. A browser driven by automation refuses every
// pointer lock request, so nothing here can prove that mouse-look works, but it
// can prove that nothing asks for the mouse when it should not.
await page.addInitScript(() => {
  window.__lockRequests = [];
  const request = Element.prototype.requestPointerLock;
  Element.prototype.requestPointerLock = function (...args) {
    window.__lockRequests.push(new Error().stack?.includes("drei") ? "drei" : "editor");
    return request.apply(this, args);
  };
});

const pageErrors = [];
page.on("pageerror", (error) => {
  // Pointer lock cannot be granted to a headless browser. It is not a defect.
  if (!/pointer lock/i.test(error.message)) pageErrors.push(error.message);
});

/**
 * Wait for a condition inside the page instead of guessing at a duration.
 *
 * The editor checks used fixed pauses, which made this half of the suite fail
 * roughly one run in three: anything competing for the machine pushed an
 * assertion past its window. This returns whether the condition arrived rather
 * than throwing, so a timeout still reaches the check below it and fails there,
 * with a reason, instead of ending the whole run.
 */
const until = async (probe, arg = null, timeout = 15000) => {
  try {
    await page.waitForFunction(probe, arg, { timeout, polling: 100 });
    return true;
  } catch {
    return false;
  }
};

/**
 * Let the render loop run. Some editor state is sampled per frame rather than
 * handled on the event, so a couple of frames is the real unit of waiting.
 */
const frames = (count = 2) =>
  page.evaluate(
    (n) =>
      new Promise((resolve) => {
        let left = n;
        const step = () => {
          left -= 1;
          if (left <= 0) resolve();
          else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }),
    count,
  );

/**
 * The renderer has caught up with the world when it is drawing an instance for
 * every visible block. That is the condition the old five and nine second
 * pauses were standing in for.
 */
const rendererSettled = () =>
  until(() => {
    const world = window.__world?.getState();
    const state = window.__r3f;
    if (!world || !state) return false;
    let drawn = 0;
    state.scene.traverse((object) => {
      if (object.isInstancedMesh) drawn += object.count;
    });
    return world.blocks.size > 500 && drawn === world.visible.size;
  });

const blockCount = () => page.evaluate(() => window.__world.getState().blocks.size);

const stamp = Date.now();
const user = {
  username: `e2e${stamp}`.slice(0, 20),
  email: `e2e${stamp}@chunkd.test`,
  password: "supersecret1",
};

// ---------------------------------------------------------------- public pages
await page.goto(BASE, { waitUntil: "networkidle" });
check(
  "signed-out visitors get the landing page, not the feed",
  (await page.getByRole("heading", { name: /Build a world in your browser/ }).count()) > 0,
);
check("signed-out header offers Log in", (await page.getByRole("link", { name: "Log in" }).count()) > 0);

// The campfire mark is two stacked animations that cross-fade: soul fire at
// rest, ordinary fire on hover. Comparing pixels would race the animation, so
// this reads the opacities the hover is actually driving.
const flameOpacity = () =>
  page.$$eval("header a img", (images) =>
    images.map((image) => Number(getComputedStyle(image).opacity.slice(0, 4))),
  );
const atRest = await flameOpacity();
check("both campfires are loaded, one of them hidden", atRest.length === 2, JSON.stringify(atRest));
check("soul fire shows at rest", atRest[0] === 1 && atRest[1] === 0, JSON.stringify(atRest));

await page.locator("header a").first().hover();
// The swap is a CSS transition, so this waits for it to finish rather than
// guessing at a duration. A fixed wait caught it mid-fade once the landing
// page's canvas started competing for the main thread.
await page
  .waitForFunction(() => {
    const images = [...document.querySelectorAll("header a img")];
    return images.length === 2 && getComputedStyle(images[1]).opacity === "1";
  }, null, { timeout: 5000 })
  .catch(() => {});
const hovered = await flameOpacity();
check("hovering the brand swaps to ordinary fire", hovered[0] === 0 && hovered[1] === 1, JSON.stringify(hovered));
await page.mouse.move(0, 300);
await page.waitForTimeout(400);

await page.goto(`${BASE}/definitely-not-a-page`, { waitUntil: "networkidle" });
check("unknown routes show the 404 page", (await page.locator("text=couldn't find that page").count()) > 0);

await page.goto(`${BASE}/editor`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
check("signed-out /editor redirects to login", page.url().endsWith("/login"), page.url());

// ------------------------------------------------------- sign-up form errors
// Every failure here used to render the same "Signup failed !", so nobody was
// ever told which field to change.
// Field problems and request failures are both rendered as destructive text.
const formErrors = async () =>
  (await page.locator("p.text-destructive").allTextContents()).join(" | ");

await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
await page.fill("#username", "shorty");
await page.fill("#email", "shorty@chunkd.test");
await page.fill("#password", "short");
await page.getByRole("button", { name: "Create account" }).click();
await page.waitForTimeout(500);
check("signup names a password that is too short", (await formErrors()).includes("8 characters"), await formErrors());

await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
await page.fill("#username", "ok");
await page.fill("#email", "not-an-email");
await page.fill("#password", "supersecret1");
await page.getByRole("button", { name: "Create account" }).click();
await page.waitForTimeout(500);
const shortUsername = await formErrors();
check("signup names a username that is too short", shortUsername.includes("3 characters"), shortUsername);
check("signup names a malformed email", shortUsername.includes("email address"), shortUsername);

// ---------------------------------------------------------------------- signup
await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
await page.fill("#username", user.username);
await page.fill("#email", user.email);
await page.fill("#password", user.password);
await page.getByRole("button", { name: "Create account" }).click();
await page.waitForURL(`${BASE}/`, { timeout: 15000 });
check("signup signs the user in without reloading the page", page.url() === `${BASE}/`);
check("header switches to the signed-in menu", (await page.getByRole("link", { name: "Editor" }).first().count()) > 0);

// --------------------------------------------------------------- login errors
// Signing up a second time with the same email has to say so, rather than
// failing with a message about something else.
await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
await page.fill("#username", `${user.username}b`.slice(0, 20));
await page.fill("#email", user.email);
await page.fill("#password", user.password);
await page.getByRole("button", { name: "Create account" }).click();
await page.waitForTimeout(1500);
const taken = await formErrors();
check("signup reports an email that is already registered", taken.toLowerCase().includes("already taken"), taken);

await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.fill("#email", user.email);
await page.fill("#password", "definitely-wrong");
await page.getByRole("button", { name: "Log in" }).click();
await page.waitForTimeout(1500);
const wrongPassword = await formErrors();
check("login reports a wrong password", wrongPassword.toLowerCase().includes("incorrect email"), wrongPassword);
check("login keeps the typed email after a failure", (await page.inputValue("#email")) === user.email);

// The password field can be revealed, so a typo is checkable before submitting.
check("the password starts hidden", (await page.getAttribute("#password", "type")) === "password");
await page.getByRole("button", { name: "Show password" }).click();
check("the password can be revealed", (await page.getAttribute("#password", "type")) === "text");
await page.getByRole("button", { name: "Hide password" }).click();
check("the password can be hidden again", (await page.getAttribute("#password", "type")) === "password");

await page.fill("#password", user.password);
await page.getByRole("button", { name: "Log in" }).click();
await page.waitForURL(`${BASE}/`, { timeout: 15000 });
check("login succeeds with the right password", page.url() === `${BASE}/`);

// ---------------------------------------------------------------------- editor
await page.getByRole("link", { name: "Editor" }).first().click();
await page.waitForURL("**/editor", { timeout: 15000 });
check("the editor finishes generating and drawing a world", await rendererSettled(),
  "the renderer never caught up with the world");

// The editor is routed outside the site shell so the hotbar is not drawn over
// the footer and the sticky header does not eat the top of the canvas.
check("the editor renders no site header", (await page.locator("header").count()) === 0);
check("the editor renders no site footer", (await page.locator("footer").count()) === 0);
const editorCanvas = await page.locator("#editor canvas").boundingBox();
check("the canvas fills the window", editorCanvas !== null && editorCanvas.y === 0, JSON.stringify(editorCanvas));
// The editor opens on its own pause screen, which is where the controls and
// the way back out live now that there is no site header.
check("the editor opens paused", (await page.getByRole("button", { name: "Click to play" }).count()) > 0);
check("the pause screen lists the controls", (await page.locator("text=Open the block inventory").count()) > 0);
check("the pause screen offers a way back out", (await page.getByRole("link", { name: "Leave the editor" }).count()) > 0);

await page.getByRole("button", { name: "Click to play" }).click();
await page.waitForTimeout(500);
check("clicking to play dismisses the pause screen", (await page.getByRole("button", { name: "Click to play" }).count()) === 0);

// Pin the world. A fresh editor seeds itself at random, so where the player
// lands, and therefore whether a given camera angle can legally place a block,
// changed from run to run. That made the placement check fail every so often
// for reasons that had nothing to do with the code under test.
await page.evaluate(() => window.__world.getState().newWorld(20260905));
check("the pinned world finishes drawing", await rendererSettled(),
  "the renderer never caught up with the world");

const scene = () =>
  page.evaluate(() => {
    const state = window.__r3f;
    if (!state) return null;
    let drawn = 0;
    let meshes = 0;
    state.scene.traverse((object) => {
      if (object.isInstancedMesh) drawn += object.count;
      else if (object.isMesh) meshes++;
    });
    return {
      // Blocks actually handed to the GPU. Fewer than the world holds, because
      // fully buried blocks are skipped.
      drawn,
      // Blocks in the world. This is what breaking and placing changes.
      blocks: window.__world.getState().blocks.size,
      meshes,
      triangles: state.gl.info.render.triangles,
    };
  });

const hotbarSlots = await page.locator('[aria-label$="slot 1"], [aria-label*="slot "]').count();
check("the hotbar shows every block slot", hotbarSlots === 9, `${hotbarSlots} slots`);

const before = await scene();
check("editor exposes a live scene", before !== null);
check("terrain generated blocks", (before?.blocks ?? 0) > 500, JSON.stringify(before));
check("the scene is actually being drawn", (before?.triangles ?? 0) > 1000, JSON.stringify(before));
check("buried blocks are not drawn", before.drawn < before.blocks, `${before.drawn} drawn of ${before.blocks}`);

// Aim straight down so the block underfoot is inside the player's reach.
await page.evaluate(() => window.__r3f.camera.rotation.set(-Math.PI / 2, 0, 0));
const box = await page.locator("canvas").boundingBox();
const cx = Math.round(box.x + box.width / 2);
const cy = Math.round(box.y + box.height / 2);

await page.mouse.move(cx, cy);
await frames();
await page.mouse.click(cx, cy, { button: "left" });
await until((want) => window.__world.getState().blocks.size === want, before.blocks - 1, 5000);
const afterBreak = await scene();
check("left click breaks a block", afterBreak.blocks === before.blocks - 1,
  `${before.blocks} -> ${afterBreak.blocks}`);

// The world is randomly seeded, so a single fixed camera angle sometimes aims
// somewhere a block cannot legally go: at the sky, or at a cell the player is
// standing in. Sweep a few angles and accept the first that lands one.
let afterPlace = afterBreak;
for (const [pitch, yaw] of [[-0.6, 0], [-0.35, 0], [-0.85, 0], [-0.6, 1.6], [-0.6, 3.1], [-0.2, 0.8], [0, 2.4]]) {
  await page.evaluate(([p, y]) => window.__r3f.camera.rotation.set(p, y, 0), [pitch, yaw]);
  await frames();
  await page.mouse.click(cx, cy, { button: "right" });
  // A short wait here on purpose: most of these angles are meant to fail, and
  // the loop moves on to the next one rather than waiting out a full timeout.
  await until((want) => window.__world.getState().blocks.size > want, afterBreak.blocks, 2000);
  afterPlace = await scene();
  if (afterPlace.blocks > afterBreak.blocks) break;
}
check("right click places a block", afterPlace.blocks === afterBreak.blocks + 1,
  `${afterBreak.blocks} -> ${afterPlace.blocks}`);

// ------------------------------------------------ repeated clicks keep working
// A stale aim target used to survive an edit, so the first click broke a block
// and every one after it silently re-aimed at the hole it had just made.
await page.evaluate(() => {
  const store = window.__world.getState();
  const camera = window.__r3f.camera;
  const x = Math.round(camera.position.x);
  const y = Math.round(camera.position.y);
  const z = Math.round(camera.position.z);
  store.setHotbarBlock(1, 4);
  store.setSelectedSlot(1);
  // A block of stone several deep directly ahead, so that breaking one always
  // leaves another behind it and well inside reach.
  for (let depth = 2; depth <= 7; depth += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) store.placeBlock(x + dx, y + dy, z - depth);
    }
  }
  camera.rotation.set(0, 0, 0, "YXZ");
});
await rendererSettled();

const wallBefore = await blockCount();
for (let i = 0; i < 5; i += 1) {
  const at = await blockCount();
  // Press and release with nothing in between. The editor acts on pointerdown
  // rather than on the next frame, and holding the button past REPEAT_MS in
  // World/index.tsx starts digging again, which turned five clicks into twelve
  // broken blocks when this waited for frames.
  await page.mouse.down({ button: "left" });
  await page.mouse.up({ button: "left" });
  // Waiting for this click's block to go, rather than for a fixed pause, is
  // what stops a slow frame being read as a click that did nothing.
  await until((want) => window.__world.getState().blocks.size === want, at - 1, 5000);
}
const wallAfter = await blockCount();
check("five clicks in a row break five blocks", wallBefore - wallAfter === 5,
  `${wallBefore} -> ${wallAfter}`);

// --------------------------------------------------------------- zoom gestures
// Zooming moves the crosshair away from where the player is aiming. The routes
// a page can refuse are refused; a two-finger double tap on a Mac trackpad is
// decided by the operating system and cannot be.
const zoomProbe = await page.evaluate(() => {
  const pinch = new WheelEvent("wheel", { deltaY: -120, ctrlKey: true, cancelable: true, bubbles: true });
  document.body.dispatchEvent(pinch);
  const gesture = new Event("gesturestart", { cancelable: true, bubbles: true });
  document.dispatchEvent(gesture);
  const scroll = new WheelEvent("wheel", { deltaY: 120, cancelable: true, bubbles: true });
  document.body.dispatchEvent(scroll);
  return {
    pinch: pinch.defaultPrevented,
    gesture: gesture.defaultPrevented,
    scroll: scroll.defaultPrevented,
  };
});
check("a trackpad pinch does not zoom the editor", zoomProbe.pinch);
check("a Safari zoom gesture does not zoom the editor", zoomProbe.gesture);
check("ordinary scrolling still gets through", !zoomProbe.scroll);

// ------------------------------------------------------- hotbar and inventory
const selectedSlot = () => page.evaluate(() => window.__world.getState().selectedSlot);

// The wheel is handled in the page, so wait for the slot to settle rather than
// guessing how long that takes; a fixed pause raced it on a busy run.
const scrollTo = async (delta, expected) => {
  await page.mouse.wheel(0, delta);
  await page
    .waitForFunction((want) => window.__world.getState().selectedSlot === want, expected, {
      timeout: 3000,
    })
    .catch(() => {});
  return selectedSlot();
};

await page.evaluate(() => window.__world.getState().setSelectedSlot(1));
check("scrolling down moves along the hotbar", (await scrollTo(120, 2)) === 2, `slot ${await selectedSlot()}`);
check("scrolling up moves back", (await scrollTo(-120, 1)) === 1, `slot ${await selectedSlot()}`);
// Scrolling up off the first slot should wrap to the last, not stop at zero.
check("the hotbar wraps around", (await scrollTo(-120, 9)) === 9, `slot ${await selectedSlot()}`);

const beforePinch = await selectedSlot();
await page.evaluate(() =>
  document.body.dispatchEvent(
    new WheelEvent("wheel", { deltaY: 400, ctrlKey: true, cancelable: true, bubbles: true }),
  ),
);
await page.waitForTimeout(400);
check("a pinch does not scrub through the hotbar", (await selectedSlot()) === beforePinch,
  `slot ${beforePinch} -> ${await selectedSlot()}`);

await page.evaluate(() => window.__world.getState().setSelectedSlot(1));
await page.keyboard.press("KeyE");
await page.waitForTimeout(600);
check("E opens the inventory", (await page.getByRole("heading", { name: "Blocks" }).count()) > 0);

// Picking a block from the inventory fills the selected slot.
await page.getByRole("button", { name: "Obsidian" }).first().click();
await page.waitForTimeout(300);
const slotOne = await page.evaluate(() => window.__world.getState().hotbar[0]);
check("choosing a block puts it in the selected slot", slotOne === 25, `id ${slotOne}`);

await page.keyboard.press("Escape");
await page.waitForTimeout(500);
check("Escape closes the inventory", (await page.getByRole("heading", { name: "Blocks" }).count()) === 0);

// ------------------------------------------------------- directional placing
// A log placed against a side face lies down; one placed on a top face stands
// up. Orientation lives in the stored value, above the block id's low byte.
const axisAt = await page.evaluate(() => {
  const store = window.__world.getState();
  const OAK_LOG = 5;
  store.setHotbarBlock(1, OAK_LOG);
  store.setSelectedSlot(1);
  // Somewhere empty and well clear of the player.
  const x = 5, y = 40, z = 5;
  store.placeBlock(x, y, z, 0);
  store.placeBlock(x + 2, y, z, 1);
  store.placeBlock(x + 4, y, z, 2);
  const read = (bx) => {
    const value = window.__world.getState().blocks.get(`${bx},${y},${z}`);
    return { id: value & 0xff, axis: (value >> 8) & 0b11 };
  };
  return [read(x), read(x + 2), read(x + 4)];
});
check("a log placed on a top face stands upright", axisAt[0].axis === 0, JSON.stringify(axisAt[0]));
check("a log placed against an east face lies east to west", axisAt[1].axis === 1, JSON.stringify(axisAt[1]));
check("a log placed against a north face lies north to south", axisAt[2].axis === 2, JSON.stringify(axisAt[2]));
check("orientation does not disturb the block id", axisAt.every((one) => one.id === 5), JSON.stringify(axisAt));

// P saves the world. The key state is sampled inside the render loop, so a
// press has to last longer than a frame to be seen.
// P captures the world and opens the naming dialog. Every build used to be
// saved as "Untitled build" because a keypress had nowhere to type a name.
await page.keyboard.press("p");
// The dialog previews a canvas capture, so it appears a frame or two after the
// key press. Wait for the field itself.
await page.locator("#buildName").waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
check("saving asks for a name", (await page.locator("#buildName").count()) > 0);
check("the dialog previews the captured view", (await page.locator('[role=dialog] img').count()) > 0);

// The world has to stand still while the dialog is open. Typing a name used to
// walk the player, because W is both a letter and the key for forward.
const cameraNow = () => page.evaluate(() => {
  const p = window.__r3f.camera.position;
  return [p.x, p.y, p.z];
});
const cameraBeforeTyping = await cameraNow();
await page.keyboard.down("w");
await page.waitForTimeout(900);
await page.keyboard.up("w");
const cameraAfterTyping = await cameraNow();
const moved = Math.hypot(
  cameraAfterTyping[0] - cameraBeforeTyping[0],
  cameraAfterTyping[1] - cameraBeforeTyping[1],
  cameraAfterTyping[2] - cameraBeforeTyping[2],
);
check("the world stands still while a build is being named", moved < 1e-6, `moved ${moved}`);

await page.fill("#buildName", "Ridge fort");
await page.getByRole("button", { name: "Save build" }).click();
// The confirmation clears itself after a couple of seconds. A fixed wait can
// land either side of that window, so wait for it to arrive, check, then wait
// for it to go rather than for a duration.
const savedToast = page.locator("text=/build saved/i").first();
await savedToast.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
check("the save confirmation appears", (await page.locator("text=/build saved/i").count()) > 0);
await savedToast.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});

// -------------------------------------------------------------------- profile
// The editor is outside the site shell now, so there is no header to click.
// Escape pauses, and leaving is done from the pause screen.
await page.keyboard.press("Escape");
await page.waitForTimeout(400);
await page.getByRole("link", { name: "Leave the editor" }).click();
await page.waitForURL(`${BASE}/`, { timeout: 15000 });
check("Leave returns from the editor to the feed", page.url() === `${BASE}/`);
await page.getByRole("link", { name: "My builds" }).first().click();
await page.waitForURL("**/profile", { timeout: 15000 });
await page.waitForTimeout(2500);
check("profile page loads", (await page.getByRole("tab", { name: "Builds" }).count()) > 0);

// The saved build is listed, can be opened in the 3D viewer, and belongs to the
// signed-in user so it offers a delete button. deleteBuild had no UI before.
check("the saved build is listed on the profile", (await page.getByRole("button", { name: "Open" }).count()) > 0);
check("the build kept the name it was given", (await page.locator("text=Ridge fort").count()) > 0);
await page.getByRole("button", { name: "Open" }).first().click();
await page.waitForTimeout(3000);
check("opening a build renders it in 3D", (await page.locator("[role=dialog] canvas").count()) > 0);
await page.keyboard.press("Escape");
await page.waitForTimeout(500);
check("a build offers a delete button to its owner", (await page.getByRole("button", { name: /^Delete / }).count()) > 0);

// Nothing has been posted yet at this point in the run, so the posts tab is
// the place to check that an empty list explains itself instead of going blank.
await page.getByRole("tab", { name: "Posts" }).click();
await page.waitForTimeout(500);
check("an empty posts tab explains itself", (await page.locator("text=No posts yet").count()) > 0);
await page.getByRole("tab", { name: "Builds" }).click();
await page.waitForTimeout(300);

// --------------------------------------------------------------- posting a build
await page.getByRole("button", { name: "New post" }).click();
await page.waitForTimeout(2000);
check("post dialog opens", (await page.locator('textarea[name="thoughtText"]').count()) > 0);

const buildOptions = await page.locator("#dropdown option").count();
check("the saved build is offered as an attachment", buildOptions >= 2, `${buildOptions} options`);
const formText = await page.locator("form").last().innerText();
check("no stray 0 is rendered next to the build picker", !/(^|\s)0(\s|$)/.test(formText.split("\n")[0] ?? ""));

if (buildOptions >= 2) await page.selectOption("#dropdown", { index: 1 });
await page.fill('textarea[name="thoughtText"]', "End-to-end test build");
await page.getByRole("button", { name: "Post", exact: true }).click();
await page.waitForTimeout(3000);
check("posting closes the dialog", (await page.locator('textarea[name="thoughtText"]').count()) === 0);

// ------------------------------------------------------------------- the feed
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
check("the new post appears on the feed", (await page.locator("text=End-to-end test build").count()) > 0);
// Read the rendered text, not the markup: each post carries a <time> element
// whose datetime attribute is deliberately the raw ISO string, because that is
// the machine-readable half that assistive technology and search engines use.
// Editing a post is one of the mutations the API has always had and the UI
// never offered. The author's own posts carry an actions menu; other people's
// do not.
await page.getByRole("button", { name: "Post actions" }).first().click();
await page.getByRole("menuitem", { name: "Edit post" }).click();
await page.fill('textarea[aria-label="Edit post text"]', "End-to-end test build, edited");
await page.getByRole("button", { name: "Save" }).click();
await page.waitForTimeout(1500);
check("a post can be edited in place", (await page.locator("text=End-to-end test build, edited").count()) > 0);

await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(1500);
check("the edit survives a reload", (await page.locator("text=End-to-end test build, edited").count()) > 0);

check("timestamps are formatted rather than raw ISO",
  !/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(await page.locator("body").innerText()));

// The whole card opens the post, not only the comments button. The click is
// forced because Playwright refuses to click an element something else covers,
// and being covered by the card's stretched link is the whole point: the
// browser delivers the click to that link, which is what a reader gets when
// they click the post text.
await page.locator("article").first().locator("p").first().click({ force: true });
await page.waitForTimeout(4000);
check("clicking a post card opens the post", /\/thought\//.test(page.url()), page.url());
await page.goBack({ waitUntil: "networkidle" });
await page.waitForTimeout(1500);

await page.getByRole("link").filter({ hasText: /the discussion/ }).first().click();
await page.waitForTimeout(4000);
check("the post opens on its own page", /\/thought\//.test(page.url()), page.url());

// The box to type in comes before the comments themselves.
const commentOrder = await page.evaluate(() => {
  const form = document.querySelector('textarea[aria-label="Write a comment"]');
  const list = document.querySelector("section ul");
  if (!form || !list) return "missing";
  return form.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING
    ? "form first"
    : "list first";
});
check("the comment box sits above the comments", commentOrder !== "list first", commentOrder);
check("the attached build renders in a canvas", (await page.locator("canvas").count()) > 0);

// Rotating leaves the orbit target alone; panning moves it. That is the only
// way to tell the two apart from outside the canvas, and telling them apart is
// the point: shift and drag used to rotate, because rebinding the mouse button
// cancelled out three's own built-in shift handling.
const orbitTarget = () => page.evaluate(() => window.__viewer?.target?.toArray() ?? null);
const dragBy = async (shift) => {
  const box = await page.locator("canvas").first().boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const before = await orbitTarget();
  if (shift) await page.keyboard.down("Shift");
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 180, y + 50, { steps: 20 });
  await page.mouse.up();
  if (shift) await page.keyboard.up("Shift");
  await page.waitForTimeout(600);
  const after = await orbitTarget();
  if (!before || !after) return null;
  return Math.hypot(after[0] - before[0], after[1] - before[1], after[2] - before[2]);
};

const rotated = await dragBy(false);
check("dragging orbits the build without moving the target", rotated === 0, `${rotated}`);
const panned = await dragBy(true);
check("shift and drag pans the build", panned !== null && panned > 0.5, `${panned}`);

// ------------------------------------------------------------------ commenting
await page.fill('textarea[aria-label="Write a comment"]', "Nice work");
await page.getByRole("button", { name: "Comment" }).click();
await page.waitForTimeout(2500);
check("a comment can be added", (await page.locator("text=Nice work").count()) > 0);

// deleteReaction has existed on the API since the start and had no UI. Only
// your own comments offer the button.
check("your own comment offers a delete button", (await page.getByRole("button", { name: "Delete comment" }).count()) === 1);
await page.getByRole("button", { name: "Delete comment" }).click();
await page.waitForTimeout(2000);
check("a comment can be deleted", (await page.locator("text=Nice work").count()) === 0);
check("the empty comment list explains itself", (await page.locator("text=No comments yet").count()) > 0);

// ------------------------------------------------------------------- the feed
// The feed is paged rather than fetching every post ever written. Ten come back
// first; scrolling to the bottom asks for the next ten.
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
const firstPage = await page.locator("article").count();
check("the feed loads one page at a time", firstPage <= 10, `${firstPage} posts`);

if (firstPage === 10) {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page
    .waitForFunction(() => document.querySelectorAll("article").length > 10, { timeout: 10000 })
    .catch(() => {});
  const secondPage = await page.locator("article").count();
  check("scrolling to the bottom loads more posts", secondPage > firstPage, `${firstPage} then ${secondPage}`);
}

// ----------------------------------------------------------------- following
// Someone else's profile. Following is one-way and immediate, so the button
// flips to "Unfollow" and a toast says what happened.
const otherAuthor = await page
  .locator("article a[href^='/profile/']")
  .filter({ hasNotText: user.username })
  .first()
  .getAttribute("href");

if (otherAuthor && !otherAuthor.endsWith(user.username)) {
  await page.goto(BASE + otherAuthor, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  check("someone else's profile offers Follow", (await page.getByRole("button", { name: "Follow" }).count()) > 0);

  await page.getByRole("button", { name: "Follow" }).click();
  await page.waitForTimeout(2500);
  check("following is confirmed on screen", (await page.locator("text=/now following/").count()) > 0);
  check("the button flips to Unfollow", (await page.getByRole("button", { name: "Unfollow" }).count()) > 0);

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  check("the follow survives a reload", (await page.getByRole("button", { name: "Unfollow" }).count()) > 0);

  // Following is one-way: they are in your Following tab, and you are in their
  // Followers tab, with nothing having been accepted by anyone.
  await page.getByRole("tab", { name: "Followers" }).click();
  await page.waitForTimeout(600);
  check("the person you followed lists you as a follower", (await page.locator(`text=${user.username}`).count()) > 0);

  await page.goto(`${BASE}/profile`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await page.getByRole("tab", { name: "Following", exact: true }).click();
  await page.waitForTimeout(600);
  const followedName = otherAuthor.replace("/profile/", "");
  check("they appear in your Following tab", (await page.locator(`text=${followedName}`).count()) > 0);
}

// ------------------------------------------------------------------ settings
await page.goto(`${BASE}/settings`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
check("settings loads the current details", (await page.inputValue("#settingsUsername")) === user.username);

const renamed = `${user.username}x`.slice(0, 20);
await page.fill("#settingsUsername", renamed);
await page.getByRole("button", { name: "Save changes" }).click();
await page.waitForTimeout(2500);
check("a username change is confirmed", (await page.locator("text=/details were saved/").count()) > 0);

await page.goto(`${BASE}/profile`, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
check("the new username shows on the profile", (await page.locator(`text=${renamed}`).count()) > 0);
user.username = renamed;

const newPassword = "supersecret2";
await page.goto(`${BASE}/settings`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.fill("#currentPassword", "definitely-wrong");
await page.fill("#newPassword", newPassword);
await page.fill("#confirmPassword", newPassword);
await page.getByRole("button", { name: "Change password" }).click();
await page.waitForTimeout(2000);
check("the wrong current password is refused", (await page.locator("text=/not your current password/").count()) > 0);

await page.fill("#currentPassword", user.password);
await page.fill("#newPassword", newPassword);
await page.fill("#confirmPassword", "something-else");
await page.getByRole("button", { name: "Change password" }).click();
await page.waitForTimeout(1000);
check("mismatched new passwords are refused", (await page.locator("text=/do not match/").count()) > 0);

await page.fill("#currentPassword", user.password);
await page.fill("#newPassword", newPassword);
await page.fill("#confirmPassword", newPassword);
await page.getByRole("button", { name: "Change password" }).click();
await page.waitForTimeout(2500);
check("the password change is confirmed", (await page.locator("text=/password was changed/").count()) > 0);
user.password = newPassword;

// ---------------------------------------------------------------------- logout
// Logging out moved into the account menu in the header.
await page.getByRole("button", { name: "Account menu" }).click();
await page.getByRole("menuitem", { name: "Log out" }).click();
await page.waitForTimeout(1500);
check("logout returns to the signed-out header", (await page.getByRole("link", { name: "Log in" }).count()) > 0);

// The changed password is the one that now works.
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.fill("#email", user.email);
await page.fill("#password", user.password);
await page.getByRole("button", { name: "Log in" }).click();
await page.waitForURL(`${BASE}/`, { timeout: 15000 }).catch(() => {});
check("the changed password logs the user back in", page.url() === `${BASE}/`, page.url());

// ------------------------------------------------------------------- landing
// Signed out, the root is a landing page rather than the feed, because a feed
// of strangers' posts does not tell a first-time visitor what this is.
await page.evaluate(() => localStorage.clear());
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(3000);
check(
  "signed out, the root explains what the app is",
  (await page.getByRole("heading", { name: /Build a world in your browser/ }).count()) > 0,
);
check(
  "the landing page offers a way in without an account",
  (await page.getByRole("button", { name: /Try it without an account/ }).count()) > 0,
);
check(
  "the landing page shows builds people have made",
  (await page.locator('a[href^="/thought/"] img').count()) > 0,
);

// ------------------------------------------------------------ viewer settings
// The viewer carries its own scene controls, and the choice is a preference
// rather than a property of one build, so it has to survive a reload.
const firstBuildLink = await page.locator('a[href^="/thought/"]').first().getAttribute("href");
await page.goto(BASE + firstBuildLink, { waitUntil: "networkidle" });
await page.waitForTimeout(6000);
check("the viewer offers its own settings", (await page.getByRole("button", { name: "Scene settings" }).count()) > 0);
check("the viewer names the build it is showing", (await page.locator("[data-viewer-chrome]").count()) > 0);

await page.getByRole("button", { name: "Scene settings" }).click();
await page.waitForTimeout(400);
check("the settings offer a daylight scene", (await page.getByRole("menuitemradio", { name: "Daylight" }).count()) > 0);
await page.getByRole("menuitemradio", { name: "Daylight" }).click();
await page.waitForTimeout(800);
const savedScene = await page.evaluate(() => localStorage.getItem("viewer-settings"));
check("choosing a scene is remembered", /daylight/.test(savedScene ?? ""), String(savedScene));

await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(5000);
const afterReload = await page.evaluate(() => localStorage.getItem("viewer-settings"));
check("the scene survives a reload", /daylight/.test(afterReload ?? ""), String(afterReload));
// Back to the default, so nothing later in the run inherits it.
await page.evaluate(() => localStorage.removeItem("viewer-settings"));

// ------------------------------------------------------------- the demo account
// The point of the demo button is that someone can look round without signing
// up, so these run on from the signed-out state above.
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
check(
  "the login page offers the demo",
  (await page.getByRole("button", { name: /Explore with a demo account/ }).count()) > 0,
);
await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
check(
  "the signup page offers the demo too",
  (await page.getByRole("button", { name: /Explore with a demo account/ }).count()) > 0,
);

await page.getByRole("button", { name: /Explore with a demo account/ }).click();
await page.waitForURL(`${BASE}/`, { timeout: 20000 }).catch(() => {});
check("the demo button signs straight in", page.url() === `${BASE}/`, page.url());
check(
  "the demo lands on the signed-in header",
  (await page.getByRole("link", { name: "Editor" }).first().count()) > 0,
);
check(
  "signing in swaps the landing page for the feed",
  (await page.getByRole("heading", { name: "Recent builds" }).count()) > 0,
);

// Everyone shares the account, so a change to its sign-in details would lock
// the next visitor out. Settings says so rather than offering forms that fail.
await page.goto(`${BASE}/settings`, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
check(
  "the demo account is told why it cannot change its details",
  (await page.locator("text=You are using the demo account").count()) > 0,
);
check("the demo is not offered the profile form", (await page.locator("#settingsUsername").count()) === 0);
check("the demo is not offered the password form", (await page.locator("#newPassword").count()) === 0);

// The demo is still a real account: it can do everything except change itself.
await page.goto(`${BASE}/editor`, { waitUntil: "networkidle" });
check("the demo can open the editor", (await page.getByRole("button", { name: "Click to play" }).count()) > 0);
// A build's thumbnail is a capture of the editor's own render, so the editor
// needs the same scene controls or the picture can only ever look one way.
check(
  "the editor offers scene settings while paused",
  (await page.getByRole("button", { name: "Scene settings" }).count()) > 0,
);
await page.getByRole("button", { name: "Scene settings" }).click();
await page.waitForTimeout(400);
check(
  "the editor settings offer the studio scene",
  (await page.getByRole("menuitemradio", { name: "Studio" }).count()) > 0,
);
await page.getByRole("menuitemradio", { name: "Studio" }).click();
await page.waitForTimeout(600);
const editorScene = await page.evaluate(() => localStorage.getItem("editor-settings"));
check("the editor keeps its own scene preference", /studio/.test(editorScene ?? ""), String(editorScene));

// Changing the scene needs a cursor, and the pause screen is the only place
// there is one. drei's pointer lock controls attach their click-to-lock handler
// to the whole document unless told otherwise, so opening this menu used to
// take the mouse and hand back mouse-look with the pause screen still on top.
const locksWhilePaused = await page.evaluate(() => {
  const seen = window.__lockRequests.slice();
  window.__lockRequests.length = 0;
  return seen;
});
check(
  "changing the scene while paused does not grab the mouse",
  locksWhilePaused.length === 0,
  locksWhilePaused.join(", ") || "(none)",
);
check("the pause screen is still up after changing the scene", (await page.locator("[data-pause-card]").count()) > 0);

// And starting play still asks for it, from the editor rather than from drei.
await page.getByRole("button", { name: "Click to play" }).click();
await page.waitForTimeout(1200);
const locksOnPlay = await page.evaluate(() => window.__lockRequests.slice());
check("starting play asks for the mouse", locksOnPlay.includes("editor"), locksOnPlay.join(", ") || "(none)");
check("the pause screen goes away when play starts", (await page.locator("[data-pause-card]").count()) === 0);

// ------------------------------------------------------------ signing out
// Signing out has to re-run the queries that are on screen, not just empty the
// cache. It used to call clearStore, which empties the cache and leaves every
// mounted query showing the result it already had. On the live site the
// database is wiped every few hours, so a tab opened before a reset held build
// ids that no longer existed, and the landing page's hero viewer reported the
// build as unavailable until a refresh. resetStore refetches instead.
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);

const refetched = [];
const watchRefetch = (response) => {
  if (!response.url().includes("/graphql")) return;
  const name = response.request().postDataJSON()?.operationName;
  if (name) refetched.push(name);
};
page.on("response", watchRefetch);

await page.getByRole("button", { name: "Account menu" }).click();
await page.getByRole("menuitem", { name: "Log out" }).click();
await page.waitForTimeout(4000);
page.off("response", watchRefetch);

check(
  "signing out refetches the feed rather than leaving stale data on screen",
  refetched.includes("thoughts"),
  refetched.join(", ") || "(no graphql requests after signing out)",
);
check(
  "the landing page after signing out does not report a missing build",
  (await page.locator("text=This build is no longer available").count()) === 0,
);

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
if (pageErrors.length) {
  console.log(`\nUncaught page errors (${pageErrors.length}):`);
  for (const message of [...new Set(pageErrors)].slice(0, 10)) console.log("  - " + message.slice(0, 200));
}
process.exit(failed.length === 0 && pageErrors.length === 0 ? 0 : 1);
