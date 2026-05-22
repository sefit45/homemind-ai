import { chromium } from "playwright";

const CONFIG = {
  USERNAME: "", // <-- הכנס כאן מזהה משתמש
  PASSWORD: "", // <-- הכנס כאן סיסמה
};

async function run() {
  const context = await chromium.launchPersistentContext(
    "./bank-session",
    {
      headless: false,
      viewport: { width: 1600, height: 1000 },
      args: ["--start-maximized"],
      slowMo: 250,
    }
  );

  const page = await context.newPage();

  console.log("פותח את מזרחי...");

  await page.goto("https://start.telebank.co.il/login", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });

  console.log("ממתין למסך התחברות...");

  await page.waitForTimeout(5000);

  // =========================================================
  // חשוב:
  // הסלקטורים כאן הם TEMPLATE בלבד
  // אחרי שנראה את ה-DOM האמיתי נחליף אותם
  // =========================================================

  try {
    console.log("מנסה למלא שם משתמש...");

    await page.fill(
      'input[type="text"]',
      CONFIG.USERNAME
    );

    await page.waitForTimeout(1000);

    console.log("מנסה למלא סיסמה...");

    await page.fill(
      'input[type="password"]',
      CONFIG.PASSWORD
    );

    await page.waitForTimeout(1000);

    console.log("מנסה ללחוץ התחברות...");

    await page.click('button:has-text("כניסה")');

    console.log("ממתין להתחברות...");

    await page.waitForTimeout(10000);

    const bodyText = await page.locator("body").innerText();

    const loginIndicators = [
      "יתרת",
      "עו",
      "תנועות",
      "ניירות ערך",
      "חשבון",
    ];

    const matched = loginIndicators.filter((x) =>
      bodyText.includes(x)
    );

    if (matched.length >= 2) {
      console.log("✅ התחברות הצליחה");
      console.log("נמצאו:", matched.join(", "));
    } else {
      console.log("⚠️ לא הצלחתי לאמת התחברות מלאה");
    }

    await page.screenshot({
      path: "./test-output/mizrahi-after-login.png",
      fullPage: true,
    });

    console.log("נשמר צילום מסך");
  } catch (error) {
    console.error("❌ שגיאה:", error.message);

    await page.screenshot({
      path: "./test-output/mizrahi-login-error.png",
      fullPage: true,
    });
  }

  // להשאיר פתוח לבדיקה
}

run();