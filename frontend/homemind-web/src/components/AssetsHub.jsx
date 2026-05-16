import { useMemo, useState } from "react";
import {
  addUserAsset,
  deleteUserAsset,
  updateUserAsset,
  calculateUserAssetsSummary,
  ASSET_TYPES,
} from "../services/userAssetsStore";

function formatCurrency(value) {
  return `₪${Math.round(Number(value || 0)).toLocaleString("he-IL")}`;
}

const emptyAsset = {
  type: "real_estate",
  name: "",
  description: "",
  city: "",
  country: "ישראל",
  estimatedValue: "",
  debt: "",
  monthlyIncome: "",
  currency: "ILS",
  valuationMode: "manual",
};

function getAssetTypeMeta(type) {
  return ASSET_TYPES.find((item) => item.value === type) || ASSET_TYPES[0];
}

function AssetFormFields({ form, setForm, submitText }) {
  return (
    <form className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <label className="space-y-2">
        <div className="text-slate-300 font-bold">סוג נכס</div>
        <select
          value={form.type}
          onChange={(event) =>
            setForm((current) => ({ ...current, type: event.target.value }))
          }
          className="w-full rounded-2xl bg-slate-950 border border-white/10 px-4 py-4 outline-none"
        >
          {ASSET_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.icon} {type.label}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2">
        <div className="text-slate-300 font-bold">שם הנכס</div>
        <input
          value={form.name}
          onChange={(event) =>
            setForm((current) => ({ ...current, name: event.target.value }))
          }
          required
          placeholder="לדוגמה: דירה בפתח תקווה"
          className="w-full rounded-2xl bg-slate-950 border border-white/10 px-4 py-4 outline-none"
        />
      </label>

      <label className="space-y-2">
        <div className="text-slate-300 font-bold">תיאור / הערות</div>
        <input
          value={form.description}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              description: event.target.value,
            }))
          }
          placeholder="כתובת, בנק, פלטפורמה, מסלול וכו׳"
          className="w-full rounded-2xl bg-slate-950 border border-white/10 px-4 py-4 outline-none"
        />
      </label>

      <label className="space-y-2">
        <div className="text-slate-300 font-bold">עיר</div>
        <input
          value={form.city}
          onChange={(event) =>
            setForm((current) => ({ ...current, city: event.target.value }))
          }
          placeholder="לדוגמה: תל אביב"
          className="w-full rounded-2xl bg-slate-950 border border-white/10 px-4 py-4 outline-none"
        />
      </label>

      <label className="space-y-2">
        <div className="text-slate-300 font-bold">מדינה</div>
        <input
          value={form.country}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              country: event.target.value,
            }))
          }
          className="w-full rounded-2xl bg-slate-950 border border-white/10 px-4 py-4 outline-none"
        />
      </label>

      <label className="space-y-2">
        <div className="text-slate-300 font-bold">מטבע</div>
        <select
          value={form.currency}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              currency: event.target.value,
            }))
          }
          className="w-full rounded-2xl bg-slate-950 border border-white/10 px-4 py-4 outline-none"
        >
          <option value="ILS">שקל</option>
          <option value="USD">דולר</option>
          <option value="EUR">אירו</option>
          <option value="HUF">פורינט</option>
        </select>
      </label>

      <label className="space-y-2">
        <div className="text-slate-300 font-bold">שווי משוער</div>
        <input
          type="number"
          value={form.estimatedValue}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              estimatedValue: event.target.value,
            }))
          }
          placeholder="0"
          className="w-full rounded-2xl bg-slate-950 border border-white/10 px-4 py-4 outline-none"
        />
      </label>

      <label className="space-y-2">
        <div className="text-slate-300 font-bold">חוב / הלוואה</div>
        <input
          type="number"
          value={form.debt}
          onChange={(event) =>
            setForm((current) => ({ ...current, debt: event.target.value }))
          }
          placeholder="0"
          className="w-full rounded-2xl bg-slate-950 border border-white/10 px-4 py-4 outline-none"
        />
      </label>

      <label className="space-y-2">
        <div className="text-slate-300 font-bold">הכנסה חודשית</div>
        <input
          type="number"
          value={form.monthlyIncome}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              monthlyIncome: event.target.value,
            }))
          }
          placeholder="0"
          className="w-full rounded-2xl bg-slate-950 border border-white/10 px-4 py-4 outline-none"
        />
      </label>

      <button
        type="submit"
        className="hidden"
      >
        {submitText}
      </button>
    </form>
  );
}

export default function AssetsHub({ onAssetsChanged }) {
  const [summary, setSummary] = useState(() => calculateUserAssetsSummary());
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyAsset);
  const [editingAssetId, setEditingAssetId] = useState(null);
  const [editForm, setEditForm] = useState(emptyAsset);

  const assets = summary.assets || [];

  const groupedAssets = useMemo(() => {
    return ASSET_TYPES.map((typeItem) => ({
      ...typeItem,
      assets: assets.filter((asset) => asset.type === typeItem.value),
    })).filter((group) => group.assets.length > 0);
  }, [assets]);

  function refresh() {
    const nextSummary = calculateUserAssetsSummary();
    setSummary(nextSummary);

    if (onAssetsChanged) {
      onAssetsChanged(nextSummary);
    }
  }

  function normalizeForm(form) {
    return {
      ...form,
      estimatedValue: Number(form.estimatedValue || 0),
      debt: Number(form.debt || 0),
      monthlyIncome: Number(form.monthlyIncome || 0),
      updatedAt: new Date().toISOString(),
    };
  }

  function handleAddSubmit(event) {
    event.preventDefault();

    addUserAsset(normalizeForm(addForm));
    setAddForm(emptyAsset);
    setIsAddOpen(false);
    refresh();
  }

  function openInlineEdit(asset) {
    setEditingAssetId(asset.id);
    setEditForm({
      type: asset.type || "real_estate",
      name: asset.name || "",
      description: asset.description || "",
      city: asset.city || "",
      country: asset.country || "ישראל",
      estimatedValue: asset.estimatedValue || "",
      debt: asset.debt || "",
      monthlyIncome: asset.monthlyIncome || "",
      currency: asset.currency || "ILS",
      valuationMode: asset.valuationMode || "manual",
    });
  }

  function cancelInlineEdit() {
    setEditingAssetId(null);
    setEditForm(emptyAsset);
  }

  function handleEditSubmit(event, assetId) {
    event.preventDefault();

    updateUserAsset(assetId, normalizeForm(editForm));
    cancelInlineEdit();
    refresh();
  }

  function handleDelete(assetId) {
    deleteUserAsset(assetId);
    refresh();

    if (editingAssetId === assetId) {
      cancelInlineEdit();
    }
  }

  return (
    <div className="space-y-8" dir="rtl">
      <section className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="rounded-[28px] bg-white/[0.04] border border-white/10 p-6">
          <div className="text-slate-400">סך נכסים</div>
          <div className="text-3xl font-black mt-2">
            {formatCurrency(summary.totalAssets)}
          </div>
        </div>

        <div className="rounded-[28px] bg-white/[0.04] border border-white/10 p-6">
          <div className="text-slate-400">התחייבויות</div>
          <div className="text-3xl font-black mt-2 text-rose-300">
            {formatCurrency(summary.totalDebt)}
          </div>
        </div>

        <div className="rounded-[28px] bg-white/[0.04] border border-white/10 p-6">
          <div className="text-slate-400">שווי נקי</div>
          <div className="text-3xl font-black mt-2 text-cyan-300">
            {formatCurrency(summary.netWorth)}
          </div>
        </div>

        <div className="rounded-[28px] bg-white/[0.04] border border-white/10 p-6">
          <div className="text-slate-400">הכנסה חודשית מנכסים</div>
          <div className="text-3xl font-black mt-2 text-emerald-300">
            {formatCurrency(summary.monthlyIncome)}
          </div>
        </div>
      </section>

      <section className="rounded-[34px] bg-white/[0.04] border border-white/10 p-7">
        <div className="flex items-center justify-between gap-5">
          <div>
            <div className="text-3xl font-black">הוספת נכס חדש</div>
            <div className="text-slate-400 mt-2">
              ההוספה סגורה כברירת מחדל. לחץ על הכפתור כדי לפתוח את הטופס.
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAddOpen((current) => !current)}
            className="rounded-2xl bg-cyan-400 text-black font-black px-7 py-4"
          >
            {isAddOpen ? "סגור טופס" : "הוסף נכס"}
          </button>
        </div>

        {isAddOpen && (
          <form onSubmit={handleAddSubmit} className="mt-8">
            <AssetFormFields
              form={addForm}
              setForm={setAddForm}
              submitText="הוסף נכס"
            />

            <div className="flex flex-wrap gap-4 mt-6">
              <button
                type="submit"
                className="rounded-2xl bg-cyan-400 text-black font-black px-8 py-4"
              >
                הוסף נכס
              </button>

              <button
                type="button"
                onClick={() => {
                  setAddForm(emptyAsset);
                  setIsAddOpen(false);
                }}
                className="rounded-2xl bg-white/10 border border-white/10 font-bold px-8 py-4"
              >
                ביטול
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="space-y-7">
        {groupedAssets.map((group) => (
          <div
            key={group.value}
            className="rounded-[34px] bg-white/[0.03] border border-white/10 p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-2xl font-black">
                  {group.icon} {group.label}
                </div>

                <div className="text-slate-400 mt-1">
                  {group.assets.length} פריטים
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {group.assets.map((asset) => {
                const meta = getAssetTypeMeta(asset.type);
                const isEditing = editingAssetId === asset.id;

                return (
                  <div
                    key={asset.id}
                    className="rounded-[28px] bg-slate-950/60 border border-white/10 p-6"
                  >
                    {!isEditing && (
                      <>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-2xl font-black">
                              {meta.icon} {asset.name}
                            </div>

                            <div className="text-slate-400 mt-2">
                              {asset.description || "ללא תיאור"}
                            </div>

                            {(asset.city || asset.country) && (
                              <div className="text-slate-500 mt-1">
                                {[asset.city, asset.country]
                                  .filter(Boolean)
                                  .join(", ")}
                              </div>
                            )}
                          </div>

                          <div className="text-left">
                            <div className="text-slate-400 text-sm">שווי</div>
                            <div className="text-2xl font-black text-cyan-300">
                              {formatCurrency(asset.estimatedValue)}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-6">
                          <div className="rounded-2xl bg-white/[0.04] p-4">
                            <div className="text-slate-400 text-sm">חוב</div>
                            <div className="font-black text-rose-300 mt-1">
                              {formatCurrency(asset.debt)}
                            </div>
                          </div>

                          <div className="rounded-2xl bg-white/[0.04] p-4">
                            <div className="text-slate-400 text-sm">
                              הכנסה חודשית
                            </div>
                            <div className="font-black text-emerald-300 mt-1">
                              {formatCurrency(asset.monthlyIncome)}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                          <button
                            type="button"
                            onClick={() => openInlineEdit(asset)}
                            className="rounded-2xl bg-white/10 border border-white/10 px-5 py-3 font-bold"
                          >
                            ערוך במקום
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(asset.id)}
                            className="rounded-2xl bg-rose-500/10 border border-rose-400/20 text-rose-300 px-5 py-3 font-bold"
                          >
                            מחק
                          </button>
                        </div>
                      </>
                    )}

                    {isEditing && (
                      <form onSubmit={(event) => handleEditSubmit(event, asset.id)}>
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <div className="text-2xl font-black">
                              עריכת נכס במקום
                            </div>
                            <div className="text-slate-400 mt-1">
                              עדכן את הפרטים ושמור בלי לעלות למעלה.
                            </div>
                          </div>
                        </div>

                        <AssetFormFields
                          form={editForm}
                          setForm={setEditForm}
                          submitText="שמור שינויים"
                        />

                        <div className="flex flex-wrap gap-4 mt-6">
                          <button
                            type="submit"
                            className="rounded-2xl bg-cyan-400 text-black font-black px-8 py-4"
                          >
                            שמור שינויים
                          </button>

                          <button
                            type="button"
                            onClick={cancelInlineEdit}
                            className="rounded-2xl bg-white/10 border border-white/10 font-bold px-8 py-4"
                          >
                            ביטול
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}