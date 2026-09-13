/**
 * What happens to a world when a session runs out underneath it.
 *
 * Separate from the smoke suite because it needs a server that hands out
 * short-lived tokens, which nothing else wants:
 *
 *   JWT_EXPIRES_IN=60s pnpm dev:server
 *   pnpm test:session
 *
 * A token normally lasts two hours, so this is the only way to reach the code
 * that matters in less than an afternoon.
 */
import { launch, helpers, reporter, newUser, signUp, BASE } from "./lib.mjs";

const { page, pageErrors, close } = await launch();
const wait = helpers(page);
const { check, report } = reporter();

const seconds = Number(process.env.SESSION_SECONDS ?? 60);

const buildSomething = async () => {
  await page.goto(`${BASE}/editor`, { waitUntil: "domcontentloaded" });
  await wait.rendererSettled();
  await page.getByRole("button", { name: "Click to play" }).click();
  await wait.goes(page.getByRole("button", { name: "Click to play" }));
  const marker = await page.evaluate(() => {
    const store = window.__world.getState();
    const camera = window.__r3f.camera;
    const cell = [
      Math.round(camera.position.x),
      Math.round(camera.position.y) + 4,
      Math.round(camera.position.z),
    ];
    store.placeBlock(...cell);
    return cell.join(",");
  });
  await wait.rendererSettled();
  return marker;
};

const holds = (marker) => page.evaluate((key) => window.__world.getState().blocks.has(key), marker);

// ------------------------------------------------- a session that keeps going
let renewals = 0;
page.on("request", (request) => {
  if ((request.postData() ?? "").includes("renewToken")) renewals += 1;
});

const user = newUser();
await signUp(page, user);
const firstToken = await page.evaluate(() => localStorage.getItem("id_token"));
await buildSomething();
await page.waitForTimeout((seconds + 35) * 1000);

check("the session renews itself in the background", renewals > 0, `${renewals} renewals`);
check(
  "the stored token is replaced with a fresh one",
  await page.evaluate((was) => localStorage.getItem("id_token") !== was, firstToken),
);
check(
  "nothing interrupts the person building",
  (await page.getByRole("heading", { name: "Your session ended" }).count()) === 0,
);

await page.keyboard.press("p");
await page.locator("#buildName").waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
await page.fill("#buildName", "Long session");
await page.getByRole("button", { name: "Save build" }).click();
let saved = page.locator("text=/build saved/i").first();
await saved.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
check("a save long after the first token still works", (await page.locator("text=/build saved/i").count()) > 0);
await saved.waitFor({ state: "hidden", timeout: 15000 }).catch(() => {});

// ------------------------------------------- a session that ends all the same
// Renewal is what stops this happening, so it has to be turned off to test it.
await page.route("**/graphql", async (route) => {
  if ((route.request().postData() ?? "").includes("renewToken")) {
    return route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ errors: [{ message: "renewal blocked by the test" }] }),
    });
  }
  return route.continue();
});

const marker = await buildSomething();
await page.waitForTimeout((seconds + 5) * 1000);

await page.keyboard.press("p");
await page.locator("#buildName").waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
await page.fill("#buildName", "Rescued world");
await page.getByRole("button", { name: "Save build" }).click();

const prompt = page.getByRole("heading", { name: "Your session ended" });
await prompt.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
check("an ended session asks for a password rather than giving up", (await prompt.count()) > 0);
check("the editor is still the page it was", new URL(page.url()).pathname === "/editor", page.url());
check("the canvas is never torn down", (await page.locator("canvas").count()) > 0);
check("the world is still in the editor", await holds(marker));
check("the half-finished save is still on screen", (await page.locator("#buildName").count()) > 0);

await page.fill("#sessionPassword", user.password);
await page.getByRole("button", { name: /Sign in and keep building/ }).click();
await prompt.waitFor({ state: "hidden", timeout: 25000 }).catch(() => {});
check("signing in puts the person back where they were", (await prompt.count()) === 0);
check("the world survives signing in", await holds(marker));

await page.locator("#buildName").waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
await page.getByRole("button", { name: "Save build" }).click();
saved = page.locator("text=/build saved/i").first();
await saved.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
check("the world saves once signed back in", (await page.locator("text=/build saved/i").count()) > 0);

const builds = await page.evaluate(async () => {
  const response = await fetch("/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${localStorage.getItem("id_token")}`,
    },
    body: JSON.stringify({ query: "{ me { builds { name } } }" }),
  });
  return (await response.json()).data?.me?.builds?.map((build) => build.name) ?? [];
});
check("the rescued world reached the account", builds.includes("Rescued world"), JSON.stringify(builds));

await close();
process.exit(report(pageErrors));
