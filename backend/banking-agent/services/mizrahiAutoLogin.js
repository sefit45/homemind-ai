export async function performMizrahiAutoLogin(page, config) {
  const { username, password, ic } = config;

  await page.goto("https://start.telebank.co.il/login", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });

  await page.waitForTimeout(5000);

  console.log("מנסה לאתר שדות התחברות...");

  const inputs = await page.locator("input").all();

  console.log(`נמצאו ${inputs.length} שדות input`);

  // ============================================
  // מספר זהות
  // ============================================

  const idInput = page.locator("input").nth(0);

  await idInput.click();
  await idInput.fill(username || "");

  console.log("מולא מספר זהות");

  await page.waitForTimeout(1000);

  // ============================================
  // סיסמה
  // ============================================

  const passwordInput = page.locator('input[type="password"]').first();

  await passwordInput.click();
  await passwordInput.fill(password || "");

  console.log("מולאה סיסמה");

  await page.waitForTimeout(1000);

  // ============================================
  // קוד מזהה
  // ============================================

  const allInputs = await page.locator("input").all();

  const icInput = allInputs[2];

  if (icInput && ic) {
    await icInput.click();
    await icInput.fill(ic);

    console.log("מולא קוד מזהה");
  }

  await page.waitForTimeout(1500);

  // ============================================
  // כניסה
  // ============================================

  const loginButton = page
    .locator('button:has-text("כניסה")')
    .first();

  await loginButton.click();

  console.log("נלחץ כפתור כניסה");

  await page.waitForTimeout(12000);

  const bodyText = await page.locator("body").innerText();

  const indicators = [
    "יתרת",
    "תנועות",
    "חשבון",
    "ניירות ערך",
    "עו",
  ];

  const matched = indicators.filter((x) =>
    bodyText.includes(x)
  );

  return {
    ok: matched.length >= 2,
    matched,
    message:
      matched.length >= 2
        ? "התחברות הצליחה"
        : "לא הצלחתי לאמת התחברות",
  };
}