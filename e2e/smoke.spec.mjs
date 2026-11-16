import { BASE, check, helpers, newUser, test } from "./lib.mjs";

test("the site, from signing up to the demo account and back", async ({ page }) => {
  const { until, frames, appears, goes, waitFor, rendererSettled, blockCount } = helpers(page);

  const user = newUser();

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await appears(page.getByRole("heading", { name: /Build a world in your browser/ }));
  check(
    "signed-out visitors get the landing page, not the feed",
    (await page.getByRole("heading", { name: /Build a world in your browser/ }).count()) > 0,
  );
  check("signed-out header offers Log in", (await page.getByRole("link", { name: "Log in" }).count()) > 0);

  const flameOpacity = () =>
    page.$$eval("header a img", (images) =>
      // Round rather than slice the string: a finished fade can report "1.3e-7".
      images.map((image) => Math.round(Number(getComputedStyle(image).opacity) * 100) / 100),
    );
  const atRest = await flameOpacity();
  check("both campfires are loaded, one of them hidden", atRest.length === 2, JSON.stringify(atRest));
  check("soul fire shows at rest", atRest[0] === 1 && atRest[1] === 0, JSON.stringify(atRest));

  await page.locator("header a").first().hover();
  await page
    .waitForFunction(() => {
      const images = [...document.querySelectorAll("header a img")];
      return images.length === 2 && getComputedStyle(images[1]).opacity === "1";
    }, null, { timeout: 5000 })
    .catch(() => {});
  const hovered = await flameOpacity();
  check("hovering the brand swaps to ordinary fire", hovered[0] === 0 && hovered[1] === 1, JSON.stringify(hovered));
  await page.mouse.move(0, 300);

  await page.goto(`${BASE}/definitely-not-a-page`, { waitUntil: "domcontentloaded" });
  await appears(page.locator("text=couldn't find that page"));
  check("unknown routes show the 404 page", (await page.locator("text=couldn't find that page").count()) > 0);

  await page.goto(`${BASE}/editor`, { waitUntil: "domcontentloaded" });
  await page.waitForURL("**/login", { timeout: 15000 }).catch(() => {});
  check("signed-out /editor redirects to login", page.url().endsWith("/login"), page.url());

  const formErrors = async () =>
    (await page.locator("p.text-destructive").allTextContents()).join(" | ");

  await page.goto(`${BASE}/signup`, { waitUntil: "domcontentloaded" });
  await page.fill("#username", "shorty");
  await page.fill("#email", "shorty@chunkd.test");
  await page.fill("#password", "short");
  await page.getByRole("button", { name: "Create account" }).click();
  await appears(page.locator("text=/8 characters/"));
  check("signup names a password that is too short", (await formErrors()).includes("8 characters"), await formErrors());

  await page.goto(`${BASE}/signup`, { waitUntil: "domcontentloaded" });
  await page.fill("#username", "ok");
  await page.fill("#email", "not-an-email");
  await page.fill("#password", "supersecret1");
  await page.getByRole("button", { name: "Create account" }).click();
  await appears(page.locator("text=/3 characters/"));
  const shortUsername = await formErrors();
  check("signup names a username that is too short", shortUsername.includes("3 characters"), shortUsername);
  check("signup names a malformed email", shortUsername.includes("email address"), shortUsername);

  await page.goto(`${BASE}/signup`, { waitUntil: "domcontentloaded" });
  await page.fill("#username", user.username);
  await page.fill("#email", user.email);
  await page.fill("#password", user.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(`${BASE}/`, { timeout: 15000 });
  check("signup signs the user in without reloading the page", page.url() === `${BASE}/`);
  check("header switches to the signed-in menu", (await page.getByRole("link", { name: "Editor" }).first().count()) > 0);

  await page.goto(`${BASE}/signup`, { waitUntil: "domcontentloaded" });
  await page.fill("#username", `${user.username}b`.slice(0, 20));
  await page.fill("#email", user.email);
  await page.fill("#password", user.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await appears(page.locator("text=/already taken/i"));
  const taken = await formErrors();
  check("signup reports an email that is already registered", taken.toLowerCase().includes("already taken"), taken);

  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill("#email", user.email);
  await page.fill("#password", "definitely-wrong");
  await page.getByRole("button", { name: "Log in" }).click();
  await appears(page.locator("text=/incorrect email/i"));
  const wrongPassword = await formErrors();
  check("login reports a wrong password", wrongPassword.toLowerCase().includes("incorrect email"), wrongPassword);
  check("login keeps the typed email after a failure", (await page.inputValue("#email")) === user.email);

  check("the password starts hidden", (await page.getAttribute("#password", "type")) === "password");
  await page.getByRole("button", { name: "Show password" }).click();
  check("the password can be revealed", (await page.getAttribute("#password", "type")) === "text");
  await page.getByRole("button", { name: "Hide password" }).click();
  check("the password can be hidden again", (await page.getAttribute("#password", "type")) === "password");

  await page.fill("#password", user.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(`${BASE}/`, { timeout: 15000 });
  check("login succeeds with the right password", page.url() === `${BASE}/`);

  await page.getByRole("link", { name: "Editor" }).first().click();
  await page.waitForURL("**/editor", { timeout: 15000 });
  check("the editor finishes generating and drawing a world", await rendererSettled(),
    "the renderer never caught up with the world");

  check("the editor renders no site header", (await page.locator("header").count()) === 0);
  check("the editor renders no site footer", (await page.locator("footer").count()) === 0);
  const editorCanvas = await page.locator("#editor canvas").boundingBox();
  check("the canvas fills the window", editorCanvas !== null && editorCanvas.y === 0, JSON.stringify(editorCanvas));
  check("the editor opens paused", (await page.getByRole("button", { name: "Click to play" }).count()) > 0);
  check("the pause screen lists the controls", (await page.locator("text=Open the block inventory").count()) > 0);
  check("the pause screen offers a way back out", (await page.getByRole("link", { name: "Leave the editor" }).count()) > 0);

  await page.getByRole("button", { name: "Click to play" }).click();
  await goes(page.getByRole("button", { name: "Click to play" }));
  check("clicking to play dismisses the pause screen", (await page.getByRole("button", { name: "Click to play" }).count()) === 0);

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
        drawn,
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

  let afterPlace = afterBreak;
  for (const [pitch, yaw] of [[0, 2.4], [-0.6, 0], [-0.35, 0], [-0.85, 0], [-0.6, 1.6], [-0.6, 3.1], [-0.2, 0.8]]) {
    await page.evaluate(([p, y]) => window.__r3f.camera.rotation.set(p, y, 0), [pitch, yaw]);
    await frames();
    await page.mouse.click(cx, cy, { button: "right" });
    await until((want) => window.__world.getState().blocks.size > want, afterBreak.blocks, 2000);
    afterPlace = await scene();
    if (afterPlace.blocks > afterBreak.blocks) break;
  }
  check("right click places a block", afterPlace.blocks === afterBreak.blocks + 1,
    `${afterBreak.blocks} -> ${afterPlace.blocks}`);

  await page.evaluate(() => {
    const store = window.__world.getState();
    const camera = window.__r3f.camera;
    const x = Math.round(camera.position.x);
    const y = Math.round(camera.position.y);
    const z = Math.round(camera.position.z);
    store.setHotbarBlock(1, 4);
    store.setSelectedSlot(1);
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
    await page.mouse.down({ button: "left" });
    await page.mouse.up({ button: "left" });
    await until((want) => window.__world.getState().blocks.size === want, at - 1, 5000);
  }
  const wallAfter = await blockCount();
  check("five clicks in a row break five blocks", wallBefore - wallAfter === 5,
    `${wallBefore} -> ${wallAfter}`);

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

  const selectedSlot = () => page.evaluate(() => window.__world.getState().selectedSlot);

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
  check("the hotbar wraps around", (await scrollTo(-120, 9)) === 9, `slot ${await selectedSlot()}`);

  const beforePinch = await selectedSlot();
  await page.evaluate(() =>
    document.body.dispatchEvent(
      new WheelEvent("wheel", { deltaY: 400, ctrlKey: true, cancelable: true, bubbles: true }),
    ),
  );
  await frames(3);
  check("a pinch does not scrub through the hotbar", (await selectedSlot()) === beforePinch,
    `slot ${beforePinch} -> ${await selectedSlot()}`);

  await page.evaluate(() => window.__world.getState().setSelectedSlot(1));
  await page.keyboard.press("KeyE");
  await appears(page.getByRole("heading", { name: "Blocks" }));
  check("E opens the inventory", (await page.getByRole("heading", { name: "Blocks" }).count()) > 0);

  await page.getByRole("button", { name: "Obsidian" }).first().click();
  await until((want) => window.__world.getState().hotbar[0] === want, 25, 10000);
  const slotOne = await page.evaluate(() => window.__world.getState().hotbar[0]);
  check("choosing a block puts it in the selected slot", slotOne === 25, `id ${slotOne}`);

  await page.keyboard.press("Escape");
  await goes(page.getByRole("heading", { name: "Blocks" }));
  check("Escape closes the inventory", (await page.getByRole("heading", { name: "Blocks" }).count()) === 0);

  const axisAt = await page.evaluate(() => {
    const store = window.__world.getState();
    const OAK_LOG = 5;
    store.setHotbarBlock(1, OAK_LOG);
    store.setSelectedSlot(1);
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

  const shapeOfSlot = () =>
    page.evaluate(() => {
      const state = window.__world.getState();
      return state.hotbarShape[state.selectedSlot - 1];
    });

  await page.evaluate(() => {
    const store = window.__world.getState();
    const STONE_BRICKS = 9;
    store.setHotbarBlock(3, STONE_BRICKS);
    store.setSelectedSlot(3);
  });
  check("a slot places whole blocks to begin with", (await shapeOfSlot()) === 0, `shape ${await shapeOfSlot()}`);
  await page.keyboard.press("KeyR");
  await frames();
  check("R turns the slot over to slabs", (await shapeOfSlot()) === 1, `shape ${await shapeOfSlot()}`);

  await page.evaluate(() => {
    const OAK_LOG = 5;
    window.__world.getState().setHotbarBlock(3, OAK_LOG);
  });
  check("choosing a block with no slab clears the slot's shape", (await shapeOfSlot()) === 0, `shape ${await shapeOfSlot()}`);
  await page.keyboard.press("KeyR");
  await frames();
  check("R does nothing for a block with no slab", (await shapeOfSlot()) === 0, `shape ${await shapeOfSlot()}`);

  await page.evaluate(() => {
    const store = window.__world.getState();
    const STONE_BRICKS = 9;
    store.setHotbarBlock(3, STONE_BRICKS);
    store.setSelectedSlot(3);
  });
  await page.keyboard.press("KeyR");
  await frames();
  check(
    "the hotbar says the slot is holding a slab",
    (await page.locator('[aria-label*="slab, slot 3"]').count()) > 0,
  );
  await page.keyboard.press("KeyR");
  await frames();
  check("R steps on from a slab rather than toggling back", (await shapeOfSlot()) === 3, `shape ${await shapeOfSlot()}`);
  await page.keyboard.press("KeyR");
  await frames();
  check("R steps on from stairs to a wall", (await shapeOfSlot()) === 6, `shape ${await shapeOfSlot()}`);
  await page.keyboard.press("KeyR");
  await frames();
  check("R comes back to a whole block at the end", (await shapeOfSlot()) === 0, `shape ${await shapeOfSlot()}`);

  const slabs = await page.evaluate(() => {
    const store = window.__world.getState();

    const x = 12, y = 40, z = 12;
    const SHAPE_FULL = 0, SHAPE_SLAB_BOTTOM = 1, SHAPE_SLAB_TOP = 2;
    store.placeBlock(x, y, z, 0, SHAPE_FULL);
    store.placeBlock(x + 2, y, z, 0, SHAPE_SLAB_BOTTOM);
    store.placeBlock(x + 4, y, z, 0, SHAPE_SLAB_TOP);

    const read = (bx) => {
      const value = window.__world.getState().blocks.get(`${bx},${y},${z}`);
      return { id: value & 0xff, axis: (value >> 8) & 0b11, shape: (value >> 10) & 0b111 };
    };
    return [read(x), read(x + 2), read(x + 4)];
  });
  check("a whole block stores shape 0", slabs[0].shape === 0, JSON.stringify(slabs));
  check("a bottom slab stores shape 1", slabs[1].shape === 1, JSON.stringify(slabs));
  check("a top slab stores shape 2", slabs[2].shape === 2, JSON.stringify(slabs));
  check("the shape does not disturb the block id", slabs.every((one) => one.id === 9), JSON.stringify(slabs));

  const buried = await page.evaluate(() => {
    const store = window.__world.getState();
    const x = 20, y = 30, z = 20;

    store.placeBlock(x, y - 1, z, 0, 0);
    store.placeBlock(x, y - 2, z, 0, 0);
    store.placeBlock(x + 1, y - 1, z, 0, 0);
    store.placeBlock(x - 1, y - 1, z, 0, 0);
    store.placeBlock(x, y - 1, z + 1, 0, 0);
    store.placeBlock(x, y - 1, z - 1, 0, 0);
    store.placeBlock(x, y, z, 0, 1);

    const state = window.__world.getState();
    return {
      slabDrawn: state.visible.has(`${x},${y},${z}`),
      belowDrawn: state.visible.has(`${x},${y - 1},${z}`),
    };
  });
  check("a slab is drawn however buried", buried.slabDrawn, JSON.stringify(buried));
  check("a slab lying flush on a block still hides it", !buried.belowDrawn, JSON.stringify(buried));

  const SLAB_PAD_Y = 35;
  await page.evaluate((y) => {
    const store = window.__world.getState();
    const x = 30, z = 30;

    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        store.placeBlock(x + dx, y, z + dz, 0, 0);
        store.placeBlock(x + dx, y + 1, z + dz, 0, 1);
      }
    }

    const body = window.__player;
    body.x = x;
    body.y = y + 4;
    body.z = z;
    body.onGround = false;
  }, SLAB_PAD_Y);

  const landed = await until(() => window.__player?.onGround === true, null, 20000);
  const feet = await page.evaluate(() => window.__player.y);
  check(
    "the player stands on a slab's surface, not on top of its cell",
    landed && Math.abs(feet - (SLAB_PAD_Y + 1)) < 0.01,
    `landed ${landed}, feet ${feet}, expected ${SLAB_PAD_Y + 1}`,
  );

  await page.evaluate((y) => {
    const store = window.__world.getState();
    const x = 30, z = 30;
    for (let dx = 2; dx <= 7; dx += 1) {
      for (let dz = -1; dz <= 1; dz += 1) store.placeBlock(x + dx, y + 1, z + dz, 0, 0);
    }
    const body = window.__player;
    body.x = x;
    body.y = y + 1;
    body.z = z;
  }, SLAB_PAD_Y);

  await page.evaluate(() => window.__r3f.camera.rotation.set(0, -Math.PI / 2, 0, "YXZ"));
  await page.keyboard.down("w");
  const steppedUp = await until((want) => window.__player?.y >= want, SLAB_PAD_Y + 1.5, 15000);
  await page.keyboard.up("w");
  const afterStep = await page.evaluate(() => ({ x: window.__player.x, y: window.__player.y }));
  await page.evaluate(() => {
    const store = window.__world.getState();
    const STONE_BRICKS = 9;
    store.setHotbarBlock(4, STONE_BRICKS);
    store.setSelectedSlot(4);
  });
  const shapeOfFour = () =>
    page.evaluate(() => window.__world.getState().hotbarShape[3]);

  await page.keyboard.press("KeyR");
  await frames();
  check("R goes from a whole block to a slab", (await shapeOfFour()) === 1, `shape ${await shapeOfFour()}`);
  await page.keyboard.press("KeyR");
  await frames();
  check("R goes on to stairs", (await shapeOfFour()) === 3, `shape ${await shapeOfFour()}`);
  await page.keyboard.press("KeyR");
  await frames();
  check("R goes on to a wall", (await shapeOfFour()) === 6, `shape ${await shapeOfFour()}`);
  await page.keyboard.press("KeyR");
  await frames();
  check("R comes back round to a whole block", (await shapeOfFour()) === 0, `shape ${await shapeOfFour()}`);

  await page.evaluate(() => {
    const store = window.__world.getState();
    const CUT_SANDSTONE = 33;
    store.setHotbarBlock(5, CUT_SANDSTONE);
    store.setSelectedSlot(5);
  });
  const shapeOfFive = () => page.evaluate(() => window.__world.getState().hotbarShape[4]);
  await page.keyboard.press("KeyR");
  await frames();
  check("a block with no stairs stops at a slab", (await shapeOfFive()) === 1, `shape ${await shapeOfFive()}`);
  await page.keyboard.press("KeyR");
  await frames();
  check("and comes straight back to a whole block", (await shapeOfFive()) === 0, `shape ${await shapeOfFive()}`);

  const stairs = await page.evaluate(() => {
    const store = window.__world.getState();
    const STONE_BRICKS = 9, SHAPE_STAIRS_BOTTOM = 3, SHAPE_STAIRS_TOP = 4;
    store.setHotbarBlock(4, STONE_BRICKS);
    store.setSelectedSlot(4);
    const y = 44, z = 16;
    for (let facing = 0; facing < 4; facing += 1) {
      store.placeBlock(14 + facing * 2, y, z, 0, SHAPE_STAIRS_BOTTOM, facing);
    }
    store.placeBlock(14, y, z + 2, 0, SHAPE_STAIRS_TOP, 0);
    const read = (x, zz) => {
      const value = window.__world.getState().blocks.get(`${x},${y},${zz}`);
      return { id: value & 0xff, shape: (value >> 10) & 0b111, facing: (value >> 13) & 0b11 };
    };
    return {
      row: [read(14, z), read(16, z), read(18, z), read(20, z)],
      upsideDown: read(14, z + 2),
    };
  });
  check("stairs store their shape", stairs.row.every((one) => one.shape === 3), JSON.stringify(stairs.row));
  check("each facing is kept", stairs.row.map((one) => one.facing).join() === "0,1,2,3", JSON.stringify(stairs.row));
  check("the block id survives a facing", stairs.row.every((one) => one.id === 9), JSON.stringify(stairs.row));
  check("upside down stairs are their own shape", stairs.upsideDown.shape === 4, JSON.stringify(stairs.upsideDown));

  const STAIR_LANE_Z = 34;
  await page.evaluate(([y, z]) => {
    const store = window.__world.getState();
    const STONE_BRICKS = 9;
    store.setHotbarBlock(4, STONE_BRICKS);
    store.setSelectedSlot(4);

    for (let dx = 0; dx <= 10; dx += 1) {
      for (let dz = -1; dz <= 1; dz += 1) store.placeBlock(30 + dx, y, z + dz, 0, 0);
    }
    for (let step = 0; step < 4; step += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        store.placeBlock(33 + step, y + 1 + step, z + dz, 0, 3, 3);
      }
    }

    const body = window.__player;
    body.x = 30;
    body.y = y + 0.5;
    body.z = z;
  }, [SLAB_PAD_Y, STAIR_LANE_Z]);

  await page.evaluate(() => window.__r3f.camera.rotation.set(0, -Math.PI / 2, 0, "YXZ"));
  await page.keyboard.down("w");
  const climbed = await until((want) => window.__player?.y >= want, SLAB_PAD_Y + 4.5, 20000);
  await page.keyboard.up("w");
  const afterClimb = await page.evaluate(() => ({ x: window.__player.x, y: window.__player.y }));
  check("a staircase is walked up without jumping", climbed, JSON.stringify(afterClimb));

  const shapeCycle = async (blockId) => {
    await page.evaluate((id) => {
      const store = window.__world.getState();
      store.setHotbarBlock(7, id);
      store.setSelectedSlot(7);
    }, blockId);
    const readShape = () => page.evaluate(() => window.__world.getState().hotbarShape[6]);
    const seen = [await readShape()];
    for (let i = 0; i < 8; i += 1) {
      await page.keyboard.press("KeyR");
      await frames();
      const shape = await readShape();
      if (shape === seen[0]) break;
      seen.push(shape);
    }
    return seen.join(",");
  };
  const plankCycle = await shapeCycle(6);
  check("planks cycle through slab, stairs, fence and trapdoor", plankCycle === "0,1,3,5,7", plankCycle);
  const cobbleCycle = await shapeCycle(4);
  check("a wall stone cycles through slab, stairs and wall", cobbleCycle === "0,1,3,6", cobbleCycle);
  const stoneCycle = await shapeCycle(18);
  check("plain stone has no wall", stoneCycle === "0,1,3", stoneCycle);

  const SHAPE_Y = 70;
  await page.evaluate((y) => {
    const store = window.__world.getState();
    const place = (blockId, x, z, shape) => {
      store.setHotbarBlock(7, blockId);
      store.setSelectedSlot(7);
      store.placeBlock(x, y, z, 0, shape, 0, false);
    };
    for (const x of [40, 41, 42]) place(6, x, 40, 5);
    for (const x of [40, 41, 42]) place(4, x, 44, 6);
    place(4, 42, 45, 6);
    place(6, 46, 40, 7);
  }, SHAPE_Y);

  const variantAt = (x, y, z, shape) =>
    page.evaluate(
      ([x, y, z, shape]) => {
        for (const layer of window.__layers ?? []) {
          if (layer.shape !== shape) continue;
          const p = layer.positions;
          for (let i = 0; i < p.length; i += 3) {
            if (p[i] === x && p[i + 1] === y && p[i + 2] === z) return layer.variant;
          }
        }
        return null;
      },
      [x, y, z, shape],
    );
  await until(
    (y) => (window.__layers ?? []).some((layer) => layer.shape === 7 && layer.positions[1] === y),
    SHAPE_Y,
    10000,
  );

  const midFence = await variantAt(41, SHAPE_Y, 40, 5);
  check("a fence in a row joins both neighbours", midFence === 10, `variant ${midFence}`);
  const endFence = await variantAt(40, SHAPE_Y, 40, 5);
  check("a fence at the end of a row joins one", endFence === 2, `variant ${endFence}`);
  const midWall = await variantAt(41, SHAPE_Y, 44, 6);
  check("a straight run of wall has no post", midWall === 10, `variant ${midWall}`);
  const cornerWall = await variantAt(42, SHAPE_Y, 44, 6);
  check("a wall turning a corner has a post", cornerWall === 28, `variant ${cornerWall}`);
  const lonelyTrapdoor = await variantAt(46, SHAPE_Y, 40, 7);
  check("a trapdoor is drawn as a shut trapdoor", lonelyTrapdoor === 0, `variant ${lonelyTrapdoor}`);

  await page.evaluate((y) => {
    const store = window.__world.getState();
    const place = (blockId, x) => {
      store.setHotbarBlock(7, blockId);
      store.setSelectedSlot(7);
      store.placeBlock(x, y, 48, 0, 0);
    };
    place(18, 40);
    for (const x of [41, 42, 43]) place(50, x);
    place(3, 44);
    place(50, 46);
  }, SHAPE_Y);
  await until(
    (y) => (window.__layers ?? []).some((layer) => layer.blockId === 50 && layer.positions[1] === y),
    SHAPE_Y,
    10000,
  );
  const paneByStone = await variantAt(41, SHAPE_Y, 48, 0);
  check("a glass pane joins a solid block and the pane beside it", paneByStone === 10, `variant ${paneByStone}`);
  const paneByGlass = await variantAt(43, SHAPE_Y, 48, 0);
  check("a glass pane joins a glass block", paneByGlass === 10, `variant ${paneByGlass}`);
  const lonePane = await variantAt(46, SHAPE_Y, 48, 0);
  check("a glass pane on its own is just a post", lonePane === 0, `variant ${lonePane}`);

  const TRAPDOOR = { x: 50, y: 70, z: 50 };
  await page.evaluate(({ x, y, z }) => {
    const store = window.__world.getState();
    store.setHotbarBlock(7, 18);
    store.setSelectedSlot(7);
    store.placeBlock(x, y - 1, z, 0, 0);
    store.setHotbarBlock(7, 6);
    store.setSelectedSlot(7);
    store.placeBlock(x, y, z, 0, 7, 0, false);
    const body = window.__player;
    body.x = x;
    body.y = y - 0.5 + 3 / 16;
    body.z = z;
  }, TRAPDOOR);
  await page.evaluate(() => window.__r3f.camera.rotation.set(-Math.PI / 2, 0, 0, "YXZ"));
  await frames(2);

  const trapdoorOpen = () =>
    page.evaluate(
      ({ x, y, z }) => ((window.__world.getState().blocks.get(`${x},${y},${z}`) ?? 0) >> 16) & 1,
      TRAPDOOR,
    );
  check("the trapdoor starts shut", (await trapdoorOpen()) === 0, `open bit ${await trapdoorOpen()}`);
  await page.mouse.click(cx, cy, { button: "right" });
  const opened = await until(
    ({ x, y, z }) => (((window.__world.getState().blocks.get(`${x},${y},${z}`) ?? 0) >> 16) & 1) === 1,
    TRAPDOOR,
    5000,
  );
  check("right-clicking a trapdoor opens it", opened, `open bit ${await trapdoorOpen()}`);
  check(
    "opening a trapdoor builds nothing on it",
    await page.evaluate(({ x, y, z }) => !window.__world.getState().blocks.has(`${x},${y + 1},${z}`), TRAPDOOR),
  );

  await page.evaluate((y) => {
    const store = window.__world.getState();
    const STONE_BRICKS = 9;
    store.setHotbarBlock(6, STONE_BRICKS);
    store.setSelectedSlot(6);
    const body = window.__player;
    body.x = 30;
    body.y = y + 1;
    body.z = 30;
  }, SLAB_PAD_Y);
  await frames(2);
  await page.keyboard.press("KeyR");
  await frames();
  const underfoot = () =>
    page.evaluate((y) => {
      const value = window.__world.getState().blocks.get(`30,${y + 1},30`);
      return value === undefined ? null : (value >> 10) & 0b111;
    }, SLAB_PAD_Y);
  check("the pad the player is on is a slab", (await underfoot()) === 1, `shape ${await underfoot()}`);

  await page.evaluate(() => window.__r3f.camera.rotation.set(-Math.PI / 2, 0, 0, "YXZ"));
  await frames();
  await page.mouse.click(cx, cy, { button: "right" });
  await until((y) => {
    const value = window.__world.getState().blocks.get(`30,${y + 1},30`);
    return value !== undefined && ((value >> 10) & 0b111) === 0;
  }, SLAB_PAD_Y, 5000);
  check("a second slab of the same block fills the cell", (await underfoot()) === 0, `shape ${await underfoot()}`);

  const CORNER_AT = { x: 40, y: 48, z: 40 };
  await page.evaluate(({ x, y, z }) => {
    const store = window.__world.getState();
    const STONE_BRICKS = 9;
    store.setHotbarBlock(7, STONE_BRICKS);
    store.setSelectedSlot(7);

    for (let i = 0; i < 3; i += 1) store.placeBlock(x + i, y, z, 0, 3, 2);
    for (let i = 1; i <= 2; i += 1) store.placeBlock(x + 2, y, z - i, 0, 3, 3);

    for (let i = 0; i < 3; i += 1) store.placeBlock(x + 6 + i, y, z, 0, 3, 2);
    for (let i = 1; i <= 2; i += 1) store.placeBlock(x + 8, y, z + i, 0, 3, 3);
  }, CORNER_AT);

  await rendererSettled();

  const corners = await page.evaluate(({ x, y, z }) => {
    const drawn = new Map();
    for (const layer of window.__layers ?? []) {
      for (let i = 0; i < layer.positions.length; i += 3) {
        drawn.set(
          `${layer.positions[i]},${layer.positions[i + 1]},${layer.positions[i + 2]}`,
          layer.variant,
        );
      }
    }
    const quarters = (key) => {
      const mask = drawn.get(key);
      return mask === undefined ? null : [0, 1, 2, 3].filter((b) => mask & (1 << b)).length;
    };
    return {
      straight: quarters(`${x},${y},${z}`),
      outer: quarters(`${x + 2},${y},${z}`),
      inner: quarters(`${x + 8},${y},${z}`),
    };
  }, CORNER_AT);
  check("a straight stair fills two quarters of its tall half", corners.straight === 2, JSON.stringify(corners));
  check("an outer corner is cut back to one", corners.outer === 1, JSON.stringify(corners));
  check("an inner corner is filled out to three", corners.inner === 3, JSON.stringify(corners));

  check(
    "walking into a step climbs it without a jump",
    steppedUp && Math.abs(afterStep.y - (SLAB_PAD_Y + 1.5)) < 0.01,
    `${JSON.stringify(afterStep)}, expected y ${SLAB_PAD_Y + 1.5}`,
  );

  const brushSize = () => page.evaluate(() => window.__world.getState().brush);
  const bigger = [];
  for (let i = 0; i < 5; i += 1) {
    await page.keyboard.press("Backquote");
    bigger.push(await brushSize());
  }
  check("` steps the brush up and stops at the largest", bigger.join(",") === "3,5,7,9,9", bigger.join(","));

  const smaller = [];
  for (let i = 0; i < 5; i += 1) {
    await page.keyboard.press("Shift+Backquote");
    smaller.push(await brushSize());
  }
  check("shift+` steps it back down and stops at one", smaller.join(",") === "7,5,3,1,1", smaller.join(","));

  const BRUSH_AT = { x: 60, y: 70, z: 60 };
  await page.evaluate(({ x, y, z }) => {
    const store = window.__world.getState();
    store.setHotbarBlock(7, 29);
    store.setSelectedSlot(7);
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dz = -1; dz <= 1; dz += 1) store.placeBlock(x + dx, y, z + dz, 0, 0);
    }
    for (let dx = -2; dx <= 2; dx += 1) {
      for (let dy = 0; dy <= 5; dy += 1) store.placeBlock(x + dx, y + dy, z - 3, 0, 0);
    }
    const body = window.__player;
    body.x = x;
    body.y = y + 0.5;
    body.z = z;
    body.vy = 0;
  }, BRUSH_AT);
  await page.evaluate(() => window.__r3f.camera.rotation.set(0, 0, 0, "YXZ"));
  await frames(2);
  await page.keyboard.press("Backquote");

  const blocksNow = () => page.evaluate(() => window.__world.getState().blocks.size);
  const beforePlace = await blocksNow();
  await page.keyboard.press("KeyF");
  await frames(2);
  const placed = (await blocksNow()) - beforePlace;
  check("a brush three across places nine blocks at once", placed === 9, `${placed} blocks`);

  const square = await page.evaluate(({ x, y, z }) => {
    const { blocks } = window.__world.getState();
    let found = 0;
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) if (blocks.has(`${x + dx},${y + 2 + dy},${z - 2}`)) found += 1;
    }
    return found;
  }, BRUSH_AT);
  check("they land as a square up the face being looked at", square === 9, `${square} of nine`);

  const beforeBreak = await blocksNow();
  await page.keyboard.press("KeyC");
  await frames(2);
  const broken = beforeBreak - (await blocksNow());
  check("a brush three across breaks nine blocks at once", broken === 9, `${broken} blocks`);

  await page.keyboard.press("Shift+Backquote");
  check("the brush is back to one for what follows", (await brushSize()) === 1, `${await brushSize()} across`);

  await page.evaluate(() => window.__world.getState().setSelectedSlot(5));
  await page.keyboard.press("KeyQ");
  await frames();
  const pickedExisting = await page.evaluate(() => window.__world.getState().selectedSlot);
  check("picking a block already in the hotbar selects that slot", pickedExisting === 7, `slot ${pickedExisting}`);

  await page.evaluate(() => {
    const store = window.__world.getState();
    store.setHotbarBlock(7, 1);
    store.setSelectedSlot(5);
  });
  await page.keyboard.press("KeyQ");
  await frames();
  const pickedFresh = await page.evaluate(() => ({
    slot: window.__world.getState().selectedSlot,
    id: window.__world.getState().selectedBlockId(),
  }));
  check(
    "picking a block that is in no slot puts it in the one in hand",
    pickedFresh.slot === 5 && pickedFresh.id === 29,
    JSON.stringify(pickedFresh),
  );

  const layersBefore = await page.evaluateHandle(() => window.__layers);
  await page.evaluate(() => {
    const store = window.__world.getState();
    const camera = window.__r3f.camera;
    store.placeBlock(Math.round(camera.position.x), Math.round(camera.position.y) + 6, Math.round(camera.position.z));
  });
  await rendererSettled();
  const layerReuse = await page.evaluate((before) => {
    const after = window.__layers;
    return { before: before.length, after: after.length, kept: after.filter((layer) => before.includes(layer)).length };
  }, layersBefore);
  check(
    "an edit hands back the layers it did not touch",
    layerReuse.kept >= layerReuse.after - 2 && layerReuse.kept < layerReuse.after,
    JSON.stringify(layerReuse),
  );

  const spawn = await page.evaluate(() => window.__world.getState().spawnPoint());
  await page.evaluate(() => {
    window.__player.x = -400;
    window.__player.z = -400;
  });
  await frames(3);
  const returned = await page.evaluate(() => ({ x: window.__player.x, z: window.__player.z }));
  check(
    "wandering off the world puts you back at the spawn point",
    Math.abs(returned.x - spawn[0]) < 1 && Math.abs(returned.z - spawn[2]) < 1,
    `${JSON.stringify(returned)} against ${JSON.stringify(spawn)}`,
  );

  await page.evaluate(() => {
    window.__player.y = 180;
  });
  await frames(3);
  const high = await page.evaluate(() => ({ x: window.__player.x, y: window.__player.y, z: window.__player.z }));
  check(
    "building high is never what puts you back",
    high.y > 100 && Math.abs(high.x - returned.x) < 1 && Math.abs(high.z - returned.z) < 1,
    JSON.stringify(high),
  );
  await page.evaluate((at) => {
    window.__player.x = at[0];
    window.__player.y = at[1];
    window.__player.z = at[2];
  }, spawn);
  await rendererSettled();

  await page.keyboard.press("p");
  await page.locator("#buildName").waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  check("saving asks for a name", (await page.locator("#buildName").count()) > 0);
  check("the dialog previews the captured view", (await page.locator('[role=dialog] img').count()) > 0);

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
  const savedToast = page.locator("text=/build saved/i").first();
  await savedToast.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  check("the save confirmation appears", (await page.locator("text=/build saved/i").count()) > 0);
  await savedToast.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});

  const unsaved = await page.evaluate(() => {
    const store = window.__world.getState();
    const camera = window.__r3f.camera;
    const cell = [
      Math.round(camera.position.x),
      Math.round(camera.position.y) + 5,
      Math.round(camera.position.z),
    ];
    store.placeBlock(...cell);
    return cell.join(",");
  });
  await rendererSettled();
  check(
    "the world knows it has work in it",
    await page.evaluate(() => window.__world.getState().edited === true),
  );

  await page.reload({ waitUntil: "domcontentloaded" });
  await rendererSettled();
  const offer = page.getByRole("heading", { name: "Pick up where you left off?" });
  await appears(offer);
  check("an unsaved world is offered back after a reload", (await offer.count()) > 0);
  check(
    "it is not there yet, until it is asked for",
    await page.evaluate((key) => !window.__world.getState().blocks.has(key), unsaved),
  );

  await page.getByRole("button", { name: "Restore it" }).click();
  await goes(offer);
  check("restoring brings the unsaved work back", await page.evaluate((key) => window.__world.getState().blocks.has(key), unsaved));
  check(
    "and it is still counted as unsaved",
    await page.evaluate(() => window.__world.getState().edited === true),
  );

  await page.reload({ waitUntil: "domcontentloaded" });
  await rendererSettled();
  await appears(offer);
  await page.getByRole("button", { name: "Start fresh" }).click();
  await goes(offer);
  check("turning it down leaves the world as it was loaded", await page.evaluate((key) => !window.__world.getState().blocks.has(key), unsaved));

  await page.reload({ waitUntil: "domcontentloaded" });
  await rendererSettled();
  await frames(3);
  check("and it is not offered again", (await offer.count()) === 0);

  await page.keyboard.press("Escape");
  await appears(page.getByRole("link", { name: "Leave the editor" }));
  await page.getByRole("link", { name: "Leave the editor" }).click();
  await page.waitForURL(`${BASE}/`, { timeout: 15000 });
  check("Leave returns from the editor to the feed", page.url() === `${BASE}/`);
  await page.getByRole("link", { name: "My builds" }).first().click();
  await page.waitForURL("**/profile", { timeout: 15000 });
  await appears(page.getByRole("tab", { name: "Builds" }));
  check("profile page loads", (await page.getByRole("tab", { name: "Builds" }).count()) > 0);

  check("the saved build is listed on the profile", (await page.getByRole("button", { name: "Open" }).count()) > 0);
  check("the build kept the name it was given", (await page.locator("text=Ridge fort").count()) > 0);
  await page.getByRole("button", { name: "Open" }).first().click();
  await appears(page.locator("[role=dialog] canvas"));
  check("opening a build renders it in 3D", (await page.locator("[role=dialog] canvas").count()) > 0);
  await page.keyboard.press("Escape");
  await appears(page.getByRole("button", { name: /^Delete / }));
  check("a build offers a delete button to its owner", (await page.getByRole("button", { name: /^Delete / }).count()) > 0);

  await page.getByRole("link", { name: "Edit Ridge fort" }).click();
  await page.waitForURL("**/editor?build=*", { timeout: 15000 });
  const reopened = await until(
    () => window.__world?.getState().source?.name === "Ridge fort",
    null,
    20000,
  );
  check("Edit reopens the saved build in the editor", reopened);
  check(
    "the reopened world is the saved one, not a fresh seed",
    await page.evaluate(() => {
      const state = window.__world.getState();
      return new URL(location.href).searchParams.get("build") === state.source?.id;
    }),
  );
  await rendererSettled();
  await appears(page.getByRole("button", { name: "Click to play" }));
  check(
    "play is offered once the build has loaded",
    await page.getByRole("button", { name: "Click to play" }).isEnabled(),
  );
  await page.getByRole("button", { name: "Click to play" }).click();
  await goes(page.getByRole("button", { name: "Click to play" }));
  await page.keyboard.press("p");
  await page.locator("#buildName").waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  check(
    "saving a reopened build starts from its own name",
    (await page.locator("#buildName").inputValue()) === "Ridge fort",
  );
  await page.getByRole("button", { name: "Save build" }).click();
  await appears(page.locator("text=/already have a build named/i"));
  check("a name that is already taken asks before overwriting", (await page.locator("text=/already have a build named/i").count()) > 0);
  await page.getByRole("button", { name: "Overwrite" }).click();
  const overwroteToast = page.locator("text=/build saved/i").first();
  await overwroteToast.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  check("overwriting confirms like a save", (await page.locator("text=/build saved/i").count()) > 0);
  await overwroteToast.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});

  const marker = await page.evaluate(() => {
    const store = window.__world.getState();
    const camera = window.__r3f.camera;
    const x = Math.round(camera.position.x);
    const y = Math.round(camera.position.y) + 4;
    const z = Math.round(camera.position.z);
    store.placeBlock(x, y, z);
    return `${x},${y},${z}`;
  });
  await rendererSettled();
  await page.keyboard.press("p");
  await page.locator("#buildName").waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  await page.fill("#buildName", "Ridge outpost");
  await page.getByRole("button", { name: "Save build" }).click();
  const keptToast = page.locator("text=/build saved/i").first();
  await keptToast.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  await keptToast.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
  await frames(4);
  const afterSecondName = await page.evaluate((key) => ({
    kept: window.__world.getState().blocks.has(key),
    source: window.__world.getState().source,
    address: new URL(location.href).searchParams.get("build"),
  }), marker);
  check(
    "saving under a second name leaves the world where it is",
    afterSecondName.kept === true,
    JSON.stringify(afterSecondName),
  );
  check(
    "the editor carries on in the build it was saved as",
    afterSecondName.source?.name === "Ridge outpost" &&
      afterSecondName.address === afterSecondName.source?.id,
    JSON.stringify(afterSecondName),
  );

  await page.keyboard.press("Escape");
  await appears(page.getByRole("link", { name: "Leave the editor" }));
  await page.getByRole("link", { name: "Leave the editor" }).click();
  await page.waitForURL(`${BASE}/`, { timeout: 15000 });
  await page.getByRole("link", { name: "My builds" }).first().click();
  await page.waitForURL("**/profile", { timeout: 15000 });
  await appears(page.getByRole("tab", { name: "Builds" }));
  await appears(page.getByText("Ridge fort", { exact: true }));
  const copies = await page.getByText("Ridge fort", { exact: true }).count();
  check("overwriting leaves one build, not two", copies === 1, `${copies} builds named Ridge fort`);

  await page.getByRole("tab", { name: "Posts" }).click();
  await appears(page.locator("text=No posts yet"));
  check("an empty posts tab explains itself", (await page.locator("text=No posts yet").count()) > 0);
  await page.getByRole("tab", { name: "Builds" }).click();
  await appears(page.getByRole("button", { name: "New post" }));

  await page.getByRole("button", { name: "New post" }).click();
  await appears(page.locator('textarea[name="thoughtText"]'));
  check("post dialog opens", (await page.locator('textarea[name="thoughtText"]').count()) > 0);

  const buildOptions = await page.locator("#dropdown option").count();
  check("the saved build is offered as an attachment", buildOptions >= 2, `${buildOptions} options`);
  const formText = await page.locator("form").last().innerText();
  check("no stray 0 is rendered next to the build picker", !/(^|\s)0(\s|$)/.test(formText.split("\n")[0] ?? ""));

  if (buildOptions >= 2) await page.selectOption("#dropdown", { index: 1 });
  await page.fill('textarea[name="thoughtText"]', "End-to-end test build");
  await page.getByRole("button", { name: "Post", exact: true }).click();
  await goes(page.locator('textarea[name="thoughtText"]'));
  check("posting closes the dialog", (await page.locator('textarea[name="thoughtText"]').count()) === 0);

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await appears(page.locator("text=End-to-end test build"));
  check("the new post appears on the feed", (await page.locator("text=End-to-end test build").count()) > 0);
  await page.getByRole("button", { name: "Post actions" }).first().click();
  await page.getByRole("menuitem", { name: "Edit post" }).click();
  await page.fill('textarea[aria-label="Edit post text"]', "End-to-end test build, edited");
  await page.getByRole("button", { name: "Save" }).click();
  await appears(page.locator("text=End-to-end test build, edited"));
  check("a post can be edited in place", (await page.locator("text=End-to-end test build, edited").count()) > 0);

  await page.reload({ waitUntil: "domcontentloaded" });
  await appears(page.locator("text=End-to-end test build, edited"));
  check("the edit survives a reload", (await page.locator("text=End-to-end test build, edited").count()) > 0);

  check("timestamps are formatted rather than raw ISO",
    !/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(await page.locator("body").innerText()));

  await page.locator("article").first().locator("p").first().click({ force: true });
  await page.waitForURL(/\/thought\//, { timeout: 15000 }).catch(() => {});
  check("clicking a post card opens the post", /\/thought\//.test(page.url()), page.url());
  await page.goBack({ waitUntil: "domcontentloaded" });
  await appears(page.getByRole("link").filter({ hasText: /the discussion/ }));

  await page.getByRole("link").filter({ hasText: /the discussion/ }).first().click();
  await page.waitForURL(/\/thought\//, { timeout: 15000 }).catch(() => {});
  check("the post opens on its own page", /\/thought\//.test(page.url()), page.url());
  await appears(page.locator("canvas"));
  await until(() => window.__viewer !== undefined, null, 20000);

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

  const orbitTarget = () => page.evaluate(() => window.__viewer?.target?.toArray() ?? null);
  const dragBy = async (shift) => {
    const box = await page.locator("canvas").first().boundingBox();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const before = await orbitTarget();
    if (shift) await page.keyboard.down("Shift");
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 180, y + 50, { steps: 5 });
    await page.mouse.up();
    if (shift) await page.keyboard.up("Shift");
    await frames(3);
    const after = await orbitTarget();
    if (!before || !after) return null;
    return Math.hypot(after[0] - before[0], after[1] - before[1], after[2] - before[2]);
  };

  const rotated = await dragBy(false);
  check("dragging orbits the build without moving the target", rotated === 0, `${rotated}`);
  const panned = await dragBy(true);
  check("shift and drag pans the build", panned !== null && panned > 0.5, `${panned}`);

  await page.fill('textarea[aria-label="Write a comment"]', "Nice work");
  await page.getByRole("button", { name: "Comment" }).click();
  await appears(page.locator("text=Nice work"));
  check("a comment can be added", (await page.locator("text=Nice work").count()) > 0);

  const deleteButtons = page.getByRole("button", { name: "Delete comment" });
  const deleteButtonsAtOnce = await deleteButtons.count();
  await appears(deleteButtons);
  const deleteButtonCount = await deleteButtons.count();
  check(
    "your own comment offers a delete button",
    deleteButtonCount === 1,
    `${deleteButtonsAtOnce} at once, ${deleteButtonCount} after waiting`,
  );
  await page.getByRole("button", { name: "Delete comment" }).click();
  await goes(page.locator("text=Nice work"));
  await appears(page.locator("text=No comments yet"));
  check("a comment can be deleted", (await page.locator("text=Nice work").count()) === 0);
  check("the empty comment list explains itself", (await page.locator("text=No comments yet").count()) > 0);

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await appears(page.locator("article"));
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

  const otherAuthor = await page
    .locator("article a[href^='/profile/']")
    .filter({ hasNotText: user.username })
    .first()
    .getAttribute("href");

  if (otherAuthor && !otherAuthor.endsWith(user.username)) {
    await page.goto(BASE + otherAuthor, { waitUntil: "domcontentloaded" });
    await appears(page.getByRole("button", { name: "Follow" }));
    check("someone else's profile offers Follow", (await page.getByRole("button", { name: "Follow" }).count()) > 0);

    await page.getByRole("button", { name: "Follow" }).click();
    await appears(page.locator("text=/now following/"));
    check("following is confirmed on screen", (await page.locator("text=/now following/").count()) > 0);
    check("the button flips to Unfollow", (await page.getByRole("button", { name: "Unfollow" }).count()) > 0);

    await page.reload({ waitUntil: "domcontentloaded" });
    await appears(page.getByRole("button", { name: "Unfollow" }));
    check("the follow survives a reload", (await page.getByRole("button", { name: "Unfollow" }).count()) > 0);

    await page.getByRole("tab", { name: "Followers" }).click();
    await appears(page.locator(`text=${user.username}`));
    check("the person you followed lists you as a follower", (await page.locator(`text=${user.username}`).count()) > 0);

    await page.goto(`${BASE}/profile`, { waitUntil: "domcontentloaded" });
    await appears(page.getByRole("tab", { name: "Following", exact: true }));
    await page.getByRole("tab", { name: "Following", exact: true }).click();
    const followedName = otherAuthor.replace("/profile/", "");
    await appears(page.locator(`text=${followedName}`));
    check("they appear in your Following tab", (await page.locator(`text=${followedName}`).count()) > 0);
  }

  await page.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
  await until(
    (want) => document.querySelector("#settingsUsername")?.value === want,
    user.username,
    15000,
  );
  check("settings loads the current details", (await page.inputValue("#settingsUsername")) === user.username);

  const renamed = `${user.username}x`.slice(0, 20);
  await page.fill("#settingsUsername", renamed);
  await page.getByRole("button", { name: "Save changes" }).click();
  await appears(page.locator("text=/details were saved/"));
  check("a username change is confirmed", (await page.locator("text=/details were saved/").count()) > 0);

  await page.goto(`${BASE}/profile`, { waitUntil: "domcontentloaded" });
  await appears(page.locator(`text=${renamed}`));
  check("the new username shows on the profile", (await page.locator(`text=${renamed}`).count()) > 0);
  user.username = renamed;

  const newPassword = "supersecret2";
  await page.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
  await appears(page.locator("#currentPassword"));
  await page.fill("#currentPassword", "definitely-wrong");
  await page.fill("#newPassword", newPassword);
  await page.fill("#confirmPassword", newPassword);
  await page.getByRole("button", { name: "Change password" }).click();
  await appears(page.locator("text=/not your current password/"));
  check("the wrong current password is refused", (await page.locator("text=/not your current password/").count()) > 0);

  await page.fill("#currentPassword", user.password);
  await page.fill("#newPassword", newPassword);
  await page.fill("#confirmPassword", "something-else");
  await page.getByRole("button", { name: "Change password" }).click();
  await appears(page.locator("text=/do not match/"));
  check("mismatched new passwords are refused", (await page.locator("text=/do not match/").count()) > 0);

  await page.fill("#currentPassword", user.password);
  await page.fill("#newPassword", newPassword);
  await page.fill("#confirmPassword", newPassword);
  await page.getByRole("button", { name: "Change password" }).click();
  await appears(page.locator("text=/password was changed/"));
  check("the password change is confirmed", (await page.locator("text=/password was changed/").count()) > 0);
  user.password = newPassword;

  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await appears(page.getByRole("link", { name: "Log in" }));
  check("logout returns to the signed-out header", (await page.getByRole("link", { name: "Log in" }).count()) > 0);

  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill("#email", user.email);
  await page.fill("#password", user.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(`${BASE}/`, { timeout: 15000 }).catch(() => {});
  check("the changed password logs the user back in", page.url() === `${BASE}/`, page.url());

  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await appears(page.getByRole("heading", { name: /Build a world in your browser/ }));
  check(
    "signed out, the root explains what the app is",
    (await page.getByRole("heading", { name: /Build a world in your browser/ }).count()) > 0,
  );
  check(
    "the landing page offers a way in without an account",
    (await page.getByRole("button", { name: /Try it without an account/ }).count()) > 0,
  );
  await appears(page.locator('a[href^="/thought/"] img'));
  check(
    "the landing page shows builds people have made",
    (await page.locator('a[href^="/thought/"] img').count()) > 0,
  );

  const firstBuildLink = await page.locator('a[href^="/thought/"]').first().getAttribute("href");
  await page.goto(BASE + firstBuildLink, { waitUntil: "domcontentloaded" });
  await appears(page.getByRole("button", { name: "Scene settings" }));
  check("the viewer offers its own settings", (await page.getByRole("button", { name: "Scene settings" }).count()) > 0);
  check("the viewer names the build it is showing", (await page.locator("[data-viewer-chrome]").count()) > 0);

  await page.getByRole("button", { name: "Scene settings" }).click();
  await appears(page.getByRole("menuitemradio", { name: "Daylight" }));
  check("the settings offer a daylight scene", (await page.getByRole("menuitemradio", { name: "Daylight" }).count()) > 0);
  await page.getByRole("menuitemradio", { name: "Daylight" }).click();
  await until(() => /daylight/.test(localStorage.getItem("viewer-settings") ?? ""), null, 10000);
  const savedScene = await page.evaluate(() => localStorage.getItem("viewer-settings"));
  check("choosing a scene is remembered", /daylight/.test(savedScene ?? ""), String(savedScene));

  await page.reload({ waitUntil: "domcontentloaded" });
  await until(() => /daylight/.test(localStorage.getItem("viewer-settings") ?? ""), null, 15000);
  const afterReload = await page.evaluate(() => localStorage.getItem("viewer-settings"));
  check("the scene survives a reload", /daylight/.test(afterReload ?? ""), String(afterReload));
  await page.evaluate(() => localStorage.removeItem("viewer-settings"));

  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await appears(page.getByRole("button", { name: /Explore with a demo account/ }));
  check(
    "the login page offers the demo",
    (await page.getByRole("button", { name: /Explore with a demo account/ }).count()) > 0,
  );
  await page.goto(`${BASE}/signup`, { waitUntil: "domcontentloaded" });
  await appears(page.getByRole("button", { name: /Explore with a demo account/ }));
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
  await appears(page.getByRole("heading", { name: "Recent builds" }));
  check(
    "signing in swaps the landing page for the feed",
    (await page.getByRole("heading", { name: "Recent builds" }).count()) > 0,
  );

  await page.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
  await appears(page.locator("text=You are using the demo account"));
  check(
    "the demo account is told why it cannot change its details",
    (await page.locator("text=You are using the demo account").count()) > 0,
  );
  check("the demo is not offered the profile form", (await page.locator("#settingsUsername").count()) === 0);
  check("the demo is not offered the password form", (await page.locator("#newPassword").count()) === 0);

  await page.goto(`${BASE}/editor`, { waitUntil: "domcontentloaded" });
  await appears(page.getByRole("button", { name: "Click to play" }));
  check("the demo can open the editor", (await page.getByRole("button", { name: "Click to play" }).count()) > 0);
  check(
    "the editor offers scene settings while paused",
    (await page.getByRole("button", { name: "Scene settings" }).count()) > 0,
  );
  await page.getByRole("button", { name: "Scene settings" }).click();
  await appears(page.getByRole("menuitemradio", { name: "Studio" }));
  check(
    "the editor settings offer the studio scene",
    (await page.getByRole("menuitemradio", { name: "Studio" }).count()) > 0,
  );
  await page.getByRole("menuitemradio", { name: "Studio" }).click();
  await until(() => /studio/.test(localStorage.getItem("editor-settings") ?? ""), null, 10000);
  const editorScene = await page.evaluate(() => localStorage.getItem("editor-settings"));
  check("the editor keeps its own scene preference", /studio/.test(editorScene ?? ""), String(editorScene));

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

  await page.getByRole("button", { name: "Click to play" }).click();
  await until(() => window.__lockRequests.some((who) => who === "editor"), null, 10000);
  const locksOnPlay = await page.evaluate(() => window.__lockRequests.slice());
  check("starting play asks for the mouse", locksOnPlay.includes("editor"), locksOnPlay.join(", ") || "(none)");
  check("the pause screen goes away when play starts", (await page.locator("[data-pause-card]").count()) === 0);

  {
    const lockPage = await page.context().browser().newPage({ viewport: { width: 1280, height: 800 } });
    await lockPage.addInitScript(() => {
      let held = null;
      window.__refuseLock = false;
      Object.defineProperty(Document.prototype, "pointerLockElement", { configurable: true, get: () => held });
      const fire = (name) => setTimeout(() => document.dispatchEvent(new Event(name)), 0);
      Element.prototype.requestPointerLock = function () {
        if (window.__refuseLock) return fire("pointerlockerror");
        held = this;
        fire("pointerlockchange");
      };
      Document.prototype.exitPointerLock = function () {
        held = null;
        fire("pointerlockchange");
      };
      window.__dropLock = () => {
        held = null;
        fire("pointerlockchange");
      };
    });
    const on = (probe, arg = null, timeout = 15000) =>
      lockPage.waitForFunction(probe, arg, { timeout, polling: 100 }).then(
        () => true,
        () => false,
      );
    const playButton = () => lockPage.getByRole("button", { name: "Click to play" });

    await lockPage.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    await lockPage.getByRole("button", { name: /demo/i }).first().click();
    await lockPage.waitForURL(`${BASE}/`, { timeout: 20000 }).catch(() => {});
    await lockPage.goto(`${BASE}/editor`, { waitUntil: "domcontentloaded" });
    await on(() => {
      const world = window.__world?.getState();
      const state = window.__r3f;
      if (!world || !state) return false;
      let drawn = 0;
      state.scene.traverse((object) => {
        if (object.isInstancedMesh) drawn += object.count;
      });
      return world.blocks.size > 500 && drawn === world.visible.size;
    });
    await playButton().click();
    await on(() => !!document.pointerLockElement, null, 5000);
    await lockPage.evaluate(() => window.__r3f.camera.rotation.set(-Math.PI / 2, 0, 0, "YXZ"));

    await lockPage.evaluate(() => window.__dropLock());
    await playButton().waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
    await lockPage.evaluate(() => {
      window.__refuseLock = true;
    });
    await playButton().click();
    await playButton().waitFor({ state: "detached", timeout: 10000 }).catch(() => {});
    await lockPage.evaluate(() => {
      window.__refuseLock = false;
    });

    const size = () => lockPage.evaluate(() => window.__world.getState().blocks.size);
    const beforeReturn = await size();
    await lockPage.mouse.click(640, 400);
    const relocked = await on(() => !!document.pointerLockElement, null, 5000);
    const afterReturn = await size();
    check(
      "the first click back on the world only takes the mouse",
      relocked && afterReturn === beforeReturn,
      `locked ${relocked}, blocks ${beforeReturn} -> ${afterReturn}`,
    );

    await lockPage.mouse.click(640, 400);
    const actsAgain = await on((n) => window.__world.getState().blocks.size !== n, afterReturn, 5000);
    check("once the mouse is back, a click breaks a block again", actsAgain);

    await lockPage.evaluate(() => window.__dropLock());
    await playButton().waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
    await lockPage.evaluate(() => {
      window.__refuseLock = true;
    });
    await playButton().click();
    await playButton().waitFor({ state: "detached", timeout: 10000 }).catch(() => {});
    const beforeRefused = await size();
    await lockPage.mouse.click(640, 400);
    const actsRefused = await on((n) => window.__world.getState().blocks.size !== n, beforeRefused, 5000);
    check("when the browser stops granting the lock, a click still acts", actsRefused);

    const inventoryShown = () => lockPage.evaluate(() => !!document.querySelector('[class*="bg-zinc-900/95"]'));

    await lockPage.evaluate(() => {
      window.__refuseLock = false;
    });
    await lockPage.evaluate(() => window.__dropLock());
    await playButton().waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
    await lockPage.keyboard.press("KeyE");
    await lockPage.waitForTimeout(300);
    check(
      "E does not open the inventory while the editor is paused",
      !(await inventoryShown()) && (await playButton().count()) > 0,
    );

    await playButton().click();
    await on(() => !!document.pointerLockElement, null, 5000);
    await lockPage.keyboard.press("KeyE");
    await on(() => !!document.querySelector('[class*="bg-zinc-900/95"]'), null, 5000);
    await lockPage.keyboard.press("Escape");
    await on(() => !document.querySelector('[class*="bg-zinc-900/95"]') && !!document.pointerLockElement, null, 5000);
    await lockPage.mouse.click(640, 400);
    await lockPage.waitForTimeout(300);
    const lockHolder = await lockPage.evaluate(() => {
      const held = document.pointerLockElement;
      if (held === document.querySelector("#editor canvas")) return "the canvas";
      return held ? `${held.tagName.toLowerCase()}${held.id ? "#" + held.id : ""}` : "nothing";
    });
    check("after the inventory, a click keeps the lock on the canvas", lockHolder === "the canvas", lockHolder);

    await lockPage.close();
  }

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await appears(page.locator("article"));

  const refetched = [];
  const watchRefetch = (response) => {
    if (!response.url().includes("/graphql")) return;
    const name = response.request().postDataJSON()?.operationName;
    if (name) refetched.push(name);
  };
  page.on("response", watchRefetch);

  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await waitFor(() => refetched.includes("showcase"));
  await appears(page.getByRole("heading", { name: /Build a world in your browser/ }));
  page.off("response", watchRefetch);

  check(
    "signing out fetches the landing page afresh rather than leaving stale data on screen",
    refetched.includes("showcase"),
    refetched.join(", ") || "(no graphql requests after signing out)",
  );
  check(
    "the landing page after signing out does not report a missing build",
    (await page.locator("text=This build is no longer available").count()) === 0,
  );
});
