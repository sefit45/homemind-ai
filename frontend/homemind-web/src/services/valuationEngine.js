import {
  loadUserAssets,
  saveUserAssets,
} from "./userAssetsStore";

function getMockMarketMultiplier(asset) {
  if (asset.type === "real_estate") return 1.015;
  if (asset.type === "vehicle") return 0.985;
  if (asset.type === "crypto") return 1.04;
  if (asset.type === "investment") return 1.012;
  if (asset.type === "pension") return 1.006;
  if (asset.type === "cash") return 1;
  return 1;
}

function getConfidence(asset) {
  if (asset.type === "cash") return "high";
  if (asset.type === "crypto" || asset.type === "investment") return "medium";
  if (asset.type === "real_estate" || asset.type === "vehicle") return "low";
  return "low";
}

export function estimateMarketValue(asset) {
  const currentValue = Number(asset.estimatedValue || 0);
  const multiplier = getMockMarketMultiplier(asset);
  const estimatedMarketValue = Math.round(currentValue * multiplier);

  return {
    assetId: asset.id,
    previousValue: currentValue,
    estimatedMarketValue,
    changeAmount: estimatedMarketValue - currentValue,
    changePercent:
      currentValue > 0
        ? ((estimatedMarketValue - currentValue) / currentValue) * 100
        : 0,
    confidence: getConfidence(asset),
    source: "mock_market_provider",
    checkedAt: new Date().toISOString(),
  };
}

export function runDailyValuationSync() {
  const assets = loadUserAssets();

  const updatedAssets = assets.map((asset) => {
    if (asset.valuationMode === "manual") {
      return asset;
    }

    const valuation = estimateMarketValue(asset);

    return {
      ...asset,
      previousEstimatedValue: asset.estimatedValue,
      estimatedValue: valuation.estimatedMarketValue,
      lastMarketCheckAt: valuation.checkedAt,
      marketValueConfidence: valuation.confidence,
      lastValuationSource: valuation.source,
      lastValuationChangeAmount: valuation.changeAmount,
      lastValuationChangePercent: valuation.changePercent,
      updatedAt: new Date().toISOString(),
    };
  });

  saveUserAssets(updatedAssets);

  return updatedAssets;
}

export function shouldRunDailyValuationSync() {
  const lastRun = localStorage.getItem("homemind_last_valuation_sync_at");

  if (!lastRun) return true;

  const lastRunDate = new Date(lastRun);
  const now = new Date();

  return (
    lastRunDate.getFullYear() !== now.getFullYear() ||
    lastRunDate.getMonth() !== now.getMonth() ||
    lastRunDate.getDate() !== now.getDate()
  );
}

export function runDailyValuationSyncIfNeeded() {
  if (!shouldRunDailyValuationSync()) {
    return loadUserAssets();
  }

  const updatedAssets = runDailyValuationSync();

  localStorage.setItem(
    "homemind_last_valuation_sync_at",
    new Date().toISOString()
  );

  return updatedAssets;
}