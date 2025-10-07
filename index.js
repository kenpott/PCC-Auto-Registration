import { chromium } from "patchright";

// CONFIG //
const u = "";
const p = "";
const TERM = 202610; // 202610 = Winter 2026
/**
 *  10 - Winter
 *  20 - 
 *  30 - 
 *  70 - Fall
 *  75 - 
 */
const CRNS = ["10924", "10195"];
const registrationDate = new Date("2025-11-07T08:00:00-07:00");
const TRACKING_INTERVAL = 60000; // 1min
let cacheClasses = {};
let page;

async function sendWebhook(message) {
  await fetch(
    "https://discord.com/api/webhooks/1424650408130908190/NXxHZEh99w-IalogVjPAV7osBhoTJXj6Dw3mJLNBDzwDw7u1bKPmIaMhk2HSi8-5wyWI",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: `<@489547245021298700>\n${message}` }),
    }
  );
}

async function login() {
  console.log("[Kewl] Logging in...");
  await page.fill('input[name="usernameUserInput"]', u);
  await page.fill('input[name="password"]', p);
  await page.click('button[type="submit"]');
  console.log("[Kewl] Logged in successfully!");
  return true;
}

async function selectTerm(term = TERM) {
  console.log("[Kewl] Selecting term...");
  await page.goto(
    "https://ssb-prod.ec.pasadena.edu/ssomanager/saml/login?relayState=/c/auth/SSB?pkg=bwskfreg.P_AltPin"
  );
  await page.evaluate(async (term) => {
    await fetch("https://ssb-prod.ec.pasadena.edu/PROD/bwskfreg.P_AltPin", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ term_in: term }),
      credentials: "include",
    });
  }, term);
  await page.reload();
  console.log("[Kewl] Term selected!");
}

async function addClasses(crns = CRNS) {
  console.log("[Kewl] Adding classes...");
  for (let i = 0; i < crns.length; i++) {
    const crnInput = page.locator(`#crn_id${i + 1}`);
    await crnInput.fill(String(crns[i]));
  }
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.locator('input[value="Submit Changes"]').click(),
  ]);

  console.log("[Kewl] Classes submitted!");
}

async function trackClasses(crns = CRNS) {
  console.log("[Kewl] Checking classes...");

  const response = await fetch(
    "https://prod-apiweb.pasadena.edu/api/classSchedule/202610"
  );
  const data = await response.json();
  const matches = data.filter((c) => crns.includes(c.crn));

  for (const match of matches) {
    const seatsAvail = Number(match.seatsAvail);
    const cached = cacheClasses[match.crn];

    if (!cached) {
      cacheClasses[match.crn] = { ...match, seatsAvail };
      continue;
    }

    const cachedSeats = Number(cached.seatsAvail);

    if (cachedSeats !== seatsAvail) {
      console.log(
        `[Kewl] Slot change for ${match.courseTitle}\n` +
          `[Kewl] Seats Available: ${cachedSeats} → ${seatsAvail}`
      );

      await sendWebhook(
        `[Kewl] Slot change for ${match.courseTitle}\n` +
          `[Kewl] Seats Available: ${cachedSeats} → ${seatsAvail}`
      );
    }

    if (seatsAvail > 0 && new Date() >= registrationDate) {
      console.log(`[Kewl] Attempting to add ${match.courseTitle}...`);
      await sendWebhook(`[Kewl] Attempting to add ${match.courseTitle}...`);
      await main();
    }

    cacheClasses[match.crn] = { ...match, seatsAvail };
  }
}

async function main() {
  const browser = await chromium.launchPersistentContext("...", {
    channel: "chrome",
    headless: false,
    viewport: null,
  });
  page = await browser.newPage();

  await page.goto("https://lancerpoint.pasadena.edu");
  console.log("Page title:", await page.title());
  if ((await page.title()) === "Pasadena City College Login") {
    await login();
  }
  await page.waitForURL("https://experience.elluciancloud.com/paccd/**", {
    timeout: 5000,
  });
  await selectTerm();
  await addClasses();
}

(async () => {
  await sendWebhook("[Kewl] Starting up...");
  while (true) {
    console.log("[Kewl] Initiating...");
    if (new Date() >= registrationDate) {
      console.log(
        `[Kewl] Registration date met (${registrationDate.toLocaleString()})`
      );
      await sendWebhook(
        `[Kewl] Registration date met (${registrationDate.toLocaleString()})`
      );
    }
    await trackClasses();
    await new Promise((r) => setTimeout(r, TRACKING_INTERVAL));
  }
})();
