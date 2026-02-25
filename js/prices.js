// prices.js — loads prices.json at startup, provides lookup functions

const PRICES = {
  data: null,   // full PriceData object once loaded
  loaded: false,
};

const CONDITION_MULT = { NM: 1.0, LP: 0.85, MP: 0.70, HP: 0.50, DMG: 0.30 };

async function loadPrices() {
  try {
    const res = await fetch('public/prices.json');
    if (!res.ok) return;
    const json = await res.json();
    if (json && typeof json.prices === 'object') {
      PRICES.data   = json;
      PRICES.loaded = true;
    }
  } catch (e) {
    // No prices available — app works fine without them
  }
}

function getPrice(slug) {
  if (!slug || !PRICES.data) return null;
  return PRICES.data.prices[slug] ?? null;
}

function getAdjustedPrice(slug, condition) {
  const p = getPrice(slug);
  if (!p) return null;
  const mult = CONDITION_MULT[condition] ?? 1.0;
  return parseFloat((p.market * mult).toFixed(2));
}

function resolveSlug(sets, setName, finish) {
  if (!sets || !sets.length) return null;
  const setData = sets.find(s => s.n === setName) ?? sets[sets.length - 1];
  if (!setData || !setData.v) return null;
  const exact    = setData.v.find(v => v.finish === finish);
  if (exact) return exact.slug;
  const standard = setData.v.find(v => v.finish === 'Standard');
  return standard ? standard.slug : (setData.v[0]?.slug ?? null);
}
