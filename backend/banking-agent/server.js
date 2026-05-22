import express from "express";
import cors from "cors";
import fs from "fs";
import { performMizrahiAutoLogin } from "./services/mizrahiAutoLogin.js";
import { chromium } from "playwright";

const app = express();
const PORT = 8787;
const SNAPSHOT_PATH = "./bankSnapshotStore.json";

app.use(cors());
app.use(express.json());

let browserContext = null;
let page = null;

async function ensureBrowser() {
  if (browserContext && page) return page;

  browserContext = await chromium.launchPersistentContext("./bank-session", {
    headless: false,
    viewport: { width: 1600, height: 1000 },
    args: ["--start-maximized"],
  });

  page = await browserContext.newPage();
  return page;
}

function saveSnapshot(snapshot) {
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), "utf-8");
}

function loadSnapshot() {
  if (!fs.existsSync(SNAPSHOT_PATH)) return null;
  return JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf-8"));
}

function normalizeText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function extractAmount(text) {
  const match = String(text || "").match(/-?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?/);
  return match ? match[0] : null;
}

function findValueNearLabel(text, labels = [], range = 220) {
  const cleaned = normalizeText(text);

  for (const label of labels) {
    const index = cleaned.indexOf(label);
    if (index === -1) continue;

    const segment = cleaned.slice(index, index + range);
    const amount = extractAmount(segment);

    if (amount) return amount;
  }

  return null;
}

function extractLastTransactions(text) {
  const cleaned = normalizeText(text);
  const sectionIndex = cleaned.indexOf("תנועות אחרונות בחשבון");

  if (sectionIndex === -1) return [];

  const section = cleaned.slice(sectionIndex, sectionIndex + 3500);
  const rows = section.split(/(?=\d{2}\/\d{2}\/\d{4})/g);

  return rows
    .filter((row) => /\d{2}\/\d{2}\/\d{4}/.test(row))
    .slice(0, 8)
    .map((row) => {
      const date = row.match(/\d{2}\/\d{2}\/\d{4}/)?.[0] || null;
      const amounts = row.match(/-?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?/g) || [];

      return {
        date,
        amount: amounts[0] || null,
        balance: amounts[1] || null,
        rawText: normalizeText(row).slice(0, 260),
      };
    });
}

function extractFinancialSnapshot(text) {
  const cleaned = normalizeText(text);

  return {
    bank: "מזרחי טפחות",
    pageTitle: "דף הבית של החשבון",
    balance: findValueNearLabel(cleaned, ["יתרת עו", "יתרת עוש", "יתרת עו״ש"]),
    creditCardUtilization: findValueNearLabel(cleaned, [
      "כרטיסי אשראי",
      "ניצול אשראי",
      "מסגרת אשראי",
    ]),
    securities: findValueNearLabel(cleaned, ["תיק ניירות ערך", "ניירות ערך"]),
    deposits: findValueNearLabel(cleaned, [
      "פקדונות וחסכונות",
      "פיקדונות וחסכונות",
    ]),
    foreignCurrency: findValueNearLabel(cleaned, ["מטבע חוץ"]),
    loans: findValueNearLabel(cleaned, ["הלוואות"]),
    lastTransactions: extractLastTransactions(cleaned),
    rawPreview: cleaned.slice(0, 6000),
    rawText: cleaned,
    createdAt: new Date().toISOString(),
  };
}

function buildSnapshotSummary(snapshot) {
  if (!snapshot) return "עדיין אין לי תמונת מצב שמורה.";

  const lines = [];

  lines.push("קראתי את דף הבית של מזרחי ושמרתי תמונת מצב.");

  if (snapshot.balance) lines.push(`יתרת העובר ושב היא ${snapshot.balance} שקלים.`);
  if (snapshot.securities) lines.push(`ניירות הערך הם ${snapshot.securities} שקלים.`);
  if (snapshot.creditCardUtilization) lines.push(`זיהיתי נתון אשראי של ${snapshot.creditCardUtilization} שקלים.`);
  if (snapshot.deposits) lines.push(`פיקדונות וחסכונות: ${snapshot.deposits} שקלים.`);
  if (snapshot.foreignCurrency) lines.push(`מטבע חוץ: ${snapshot.foreignCurrency}.`);
  if (snapshot.loans) lines.push(`הלוואות: ${snapshot.loans} שקלים.`);
  if (snapshot.lastTransactions?.length) lines.push(`זוהו ${snapshot.lastTransactions.length} תנועות אחרונות.`);

  return lines.join(" ");
}

function answerQuestion(question, snapshot) {
  const q = normalizeText(question).toLowerCase();

  if (!snapshot) {
    return "עדיין אין לי תמונת מצב שמורה. קודם בקש ממני לקרוא את דף הבית של הבנק.";
  }

  if (q.includes("יתרה") || q.includes("עובר") || q.includes("כמה כסף")) {
    return snapshot.balance
      ? `יתרת העובר ושב שלך היא ${snapshot.balance} שקלים.`
      : "לא הצלחתי לזהות יתרת עובר ושב.";
  }

  if (q.includes("מינוס") || q.includes("במינוס")) {
    if (!snapshot.balance) return "לא הצלחתי לזהות אם אתה במינוס.";

    const numericBalance = Number(String(snapshot.balance).replace(/,/g, ""));

    return numericBalance < 0
      ? `כן, לפי דף הבית אתה במינוס של ${Math.abs(
          Math.round(numericBalance)
        ).toLocaleString("he-IL")} שקלים.`
      : `לא, לפי דף הבית אינך במינוס. היתרה היא ${snapshot.balance} שקלים.`;
  }

  if (q.includes("ניירות") || q.includes("השקעות") || q.includes("תיק")) {
    return snapshot.securities
      ? `שווי תיק ניירות הערך שלך הוא ${snapshot.securities} שקלים.`
      : "לא הצלחתי לזהות ניירות ערך.";
  }

  if (q.includes("פיקדון") || q.includes("חיסכון") || q.includes("חסכון")) {
    return snapshot.deposits
      ? `סך הפיקדונות והחסכונות שלך הוא ${snapshot.deposits} שקלים.`
      : "לא הצלחתי לזהות פיקדונות וחסכונות.";
  }

  if (q.includes("מטבע") || q.includes("מטח") || q.includes("דולר")) {
    return snapshot.foreignCurrency
      ? `זיהיתי מטבע חוץ בשווי ${snapshot.foreignCurrency}.`
      : "לא הצלחתי לזהות מטבע חוץ.";
  }

  if (q.includes("אשראי") || q.includes("כרטיס")) {
    return snapshot.creditCardUtilization
      ? `זיהיתי נתון אשראי של ${snapshot.creditCardUtilization} שקלים.`
      : "לא הצלחתי לזהות נתון אשראי.";
  }

  if (q.includes("הלוואה") || q.includes("הלוואות")) {
    return snapshot.loans
      ? `זיהיתי הלוואות בסכום ${snapshot.loans} שקלים.`
      : "לא הצלחתי לזהות הלוואות.";
  }

  if (q.includes("תנועה") || q.includes("תנועות") || q.includes("אחרונה")) {
    if (!snapshot.lastTransactions?.length) return "לא זיהיתי תנועות אחרונות.";

    const first = snapshot.lastTransactions[0];

    return `התנועה האחרונה שזיהיתי היא מתאריך ${
      first.date || "לא ידוע"
    }, בסכום ${first.amount || "לא ידוע"}.`;
  }

  if (
    q.includes("סכם") ||
    q.includes("סיכום") ||
    q.includes("מצב") ||
    q.includes("מה אתה רואה") ||
    q.includes("דף הבית") ||
    q.includes("חשבון")
  ) {
    return buildSnapshotSummary(snapshot);
  }

  if (q.includes("מדאיג") || q.includes("בעיה") || q.includes("חריג")) {
    const concerns = [];

    if (snapshot.balance) {
      const numericBalance = Number(String(snapshot.balance).replace(/,/g, ""));
      if (numericBalance < 0) {
        concerns.push(
          `הדבר המרכזי שמדאיג הוא יתרת עובר ושב שלילית: ${snapshot.balance} שקלים.`
        );
      }
    }

    if (snapshot.lastTransactions?.length) {
      concerns.push("יש תנועות אחרונות שכדאי לעבור עליהן ולוודא שאין חיובים חריגים או כפולים.");
    }

    return concerns.length
      ? concerns.join(" ")
      : "לא זיהיתי משהו חריג ברור מתוך דף הבית, אבל כדאי לבדוק את התנועות האחרונות.";
  }

  return buildSnapshotSummary(snapshot);
}

async function createSnapshotFromCurrentPage() {
  const bankPage = await ensureBrowser();
  await bankPage.waitForTimeout(2500);

  const text = await bankPage.locator("body").innerText();
  const snapshot = extractFinancialSnapshot(text);

  saveSnapshot(snapshot);

  return snapshot;
}

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "HomeMind Banking Agent",
    mode: "read-only-safe",
  });
});

app.post("/api/banking/mizrahi/open", async (req, res) => {
  try {
    const bankPage = await ensureBrowser();

    await bankPage.goto("https://start.telebank.co.il/login", {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });

    res.json({
      ok: true,
      action: "open_mizrahi",
      message: "פתחתי את מזרחי בדפדפן Playwright. התחבר ידנית.",
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: error.message,
    });
  }
});

app.post("/api/banking/mizrahi/snapshot", async (req, res) => {
  try {
    const snapshot = await createSnapshotFromCurrentPage();

    res.json({
      ok: true,
      snapshot,
      message: buildSnapshotSummary(snapshot),
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: error.message,
    });
  }
});

app.get("/api/banking/mizrahi/snapshot", (req, res) => {
  try {
    const snapshot = loadSnapshot();

    res.json({
      ok: true,
      snapshot,
      message: buildSnapshotSummary(snapshot),
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: error.message,
    });
  }
});

app.post("/api/banking/mizrahi/ask", (req, res) => {
  try {
    const snapshot = loadSnapshot();
    const answer = answerQuestion(req.body.question, snapshot);

    res.json({
      ok: true,
      answer,
      message: answer,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: error.message,
    });
  }
});

app.post("/api/banking/command", async (req, res) => {
  try {
    const command = normalizeText(req.body.command);

    if (!command) {
      return res.status(400).json({
        ok: false,
        message: "לא התקבלה פקודה.",
      });
    }

    const wantsOpenBank =
      command.includes("פתח") ||
      command.includes("תפתח") ||
      command.includes("תתחבר") ||
      command.includes("כניסה") ||
      command.includes("כנס");

    const mentionsMizrahi =
      command.includes("מזרחי") ||
      command.includes("בנק");

    const wantsSnapshot =
      command.includes("סנאפשוט") ||
      command.includes("snapshot") ||
      command.includes("תקרא") ||
      command.includes("קרא") ||
      command.includes("נתח") ||
      command.includes("דף הבית") ||
      command.includes("תמונת מצב");

    if (wantsSnapshot) {
      const snapshot = await createSnapshotFromCurrentPage();

      return res.json({
        ok: true,
        action: "snapshot",
        snapshot,
        message: buildSnapshotSummary(snapshot),
      });
    }

    if (wantsOpenBank && mentionsMizrahi) {
      const bankPage = await ensureBrowser();

      await bankPage.goto("https://start.telebank.co.il/login", {
        waitUntil: "domcontentloaded",
        timeout: 120000,
      });

      return res.json({
        ok: true,
        action: "open_mizrahi",
        message: "פתחתי את מזרחי בדפדפן Playwright. התחבר ידנית.",
      });
    }

    const snapshot = loadSnapshot();
    const answer = answerQuestion(command, snapshot);

    return res.json({
      ok: true,
      action: "ask_snapshot",
      message: answer,
      answer,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: error.message,
    });
  }
});

app.post("/api/banking/close", async (req, res) => {
  try {
    if (browserContext) {
      await browserContext.close();
    }

    browserContext = null;
    page = null;

    res.json({
      ok: true,
      message: "סגרתי את דפדפן הבנק.",
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: error.message,
    });
  }
});

app.post("/api/banking/mizrahi/auto-login-test", async (req, res) => {
  try {
    const bankPage = await ensureBrowser();

    const result = await performMizrahiAutoLogin(bankPage, {
      username: process.env.MIZRAHI_USERNAME,
      password: process.env.MIZRAHI_PASSWORD,
      IC: process.env.MIZRAHI_IC,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`HomeMind Banking Agent running on http://localhost:${PORT}`);
});