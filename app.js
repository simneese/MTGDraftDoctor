const curveKeys = [
  { key: "lands", label: "Lands" },
  { key: "mv1", label: "1" },
  { key: "mv2", label: "2" },
  { key: "mv3", label: "3" },
  { key: "mv4", label: "4" },
  { key: "mv5", label: "5" },
  { key: "mv6", label: "6+" },
];

const totalTarget = 40;

const colors = [
  { symbol: "W", land: "Plains" },
  { symbol: "U", land: "Islands" },
  { symbol: "B", land: "Swamps" },
  { symbol: "R", land: "Mountains" },
  { symbol: "G", land: "Forests" },
];

const defaults = {
  mode: "basic",
  counts: {
    lands: 0,
    mv1: 0,
    mv2: 0,
    mv3: 0,
    mv4: 0,
    mv5: 0,
    mv6: 0,
  },
  ranges: {
    lands: { min: 17, max: 18 },
    mv1: { min: 1, max: 2 },
    mv2: { min: 7, max: 8 },
    mv3: { min: 5, max: 6 },
    mv4: { min: 3, max: 4 },
    mv5: { min: 2, max: 3 },
    mv6: { min: 0, max: 1 },
  },
  mana: {
    W: { cost: 0, duals: 0 },
    U: { cost: 0, duals: 0 },
    B: { cost: 0, duals: 0 },
    R: { cost: 0, duals: 0 },
    G: { cost: 0, duals: 0 },
  },
  nonbasicLands: 0,
  advancedDeck: [],
  advancedBasicLands: 0,
  selectedSets: [],
  deckPreviewOpen: false,
};

let state = structuredClone(defaults);
let searchController = null;
let searchTimer = null;
let setSearchTimer = null;
let allSets = [];
let setsLoaded = false;
let setLoadPromise = null;

const searchPlaceholderCards = [
  "Lightning Strike",
  "Llanowar Elves",
  "Murder",
  "Divination",
  "Serra Angel",
  "Evolving Wilds",
  "Cultivate",
  "Pacifism",
  "Negate",
  "Shock",
  "Giant Growth",
  "Doom Blade",
  "Air Elemental",
  "Hill Giant",
  "Plains",
  "Island",
  "Swamp",
  "Mountain",
  "Forest",
];

const curveInputs = document.querySelector("#curveInputs");
const rangeEditor = document.querySelector("#rangeEditor");
const landInputs = document.querySelector("#landInputs");
const curveRecommendations = document.querySelector("#curveRecommendations");
const landRecommendations = document.querySelector("#landRecommendations");
const deckStatus = document.querySelector("#deckStatus");
const curveOptions = document.querySelector("#curveOptions");
const curveOptionsButton = document.querySelector("#curveOptionsButton");
const themeToggle = document.querySelector("#themeToggle");
const basicModeButton = document.querySelector("#basicModeButton");
const advancedModeButton = document.querySelector("#advancedModeButton");
const advancedPanel = document.querySelector("#advancedPanel");
const setSearchInput = document.querySelector("#setSearchInput");
const selectedSetTags = document.querySelector("#selectedSetTags");
const setSuggestions = document.querySelector("#setSuggestions");
const cardSearchInput = document.querySelector("#cardSearchInput");
const searchMeta = document.querySelector("#searchMeta");
const searchResults = document.querySelector("#searchResults");
const advancedDeckList = document.querySelector("#advancedDeckList");
const advancedDeckSummary = document.querySelector("#advancedDeckSummary");
const advancedBasicLandsInput = document.querySelector("#advancedBasicLandsInput");
const clearDeckButton = document.querySelector("#clearDeckButton");
const deckPreviewPanel = document.querySelector("#deckPreviewPanel");
const deckPreviewToggle = document.querySelector("#deckPreviewToggle");
const deckPreviewContent = document.querySelector("#deckPreviewContent");
const deckPreviewGroups = document.querySelector("#deckPreviewGroups");
const floatingCardPreview = document.querySelector("#floatingCardPreview");
const canvas = document.querySelector("#curveChart");
const ctx = canvas.getContext("2d");

function shuffle(values) {
  return values
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map((item) => item.value);
}

function setRandomSearchPlaceholder() {
  const examples = shuffle(searchPlaceholderCards).slice(0, 3);
  cardSearchInput.placeholder = `${examples.join(", ")}...`;
}

function scryfallHeaders() {
  return { Accept: "application/json;q=0.9,*/*;q=0.8" };
}

function getSetFilterQuery() {
  if (!state.selectedSets.length) return "";
  const terms = state.selectedSets.map((set) => `set:${set.code}`);
  return terms.length === 1 ? terms[0] : `(${terms.join(" or ")})`;
}

function totalCards() {
  return Object.values(state.counts).reduce((sum, value) => sum + number(value), 0);
}

function totalSpells() {
  return totalCards() - number(state.counts.lands);
}

function basicLandSlotCount() {
  return number(state.counts.lands);
}

function nonbasicLandCount() {
  return Math.min(number(state.counts.lands), clampWhole(state.nonbasicLands));
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampWhole(value) {
  return Math.max(0, Math.round(number(value)));
}

function normalizeNumberInput(input) {
  const cleanValue = clampWhole(input.value);
  input.value = cleanValue;
  return cleanValue;
}

function isAdvancedMode() {
  return state.mode === "advanced";
}

function getCardFaces(card) {
  return card.card_faces?.length ? card.card_faces : [card];
}

function isLandCard(card) {
  return getCardFaces(card).some((face) => face.type_line?.includes("Land"));
}

function isBasicLand(card) {
  return getCardFaces(card).some((face) => face.type_line?.includes("Basic Land"));
}

function getManaCost(card) {
  return getCardFaces(card)
    .map((face) => face.mana_cost || "")
    .join("");
}

function countColoredManaSymbols(manaCost) {
  const counts = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  const symbols = manaCost.match(/\{[^}]+\}/g) || [];
  symbols.forEach((symbol) => {
    colors.forEach((color) => {
      if (symbol.includes(color.symbol)) {
        counts[color.symbol] += 1;
      }
    });
  });
  return counts;
}

function getImageUrl(card) {
  if (card.image_uris?.small) return card.image_uris.small;
  return card.card_faces?.find((face) => face.image_uris?.small)?.image_uris.small || "";
}

function getPreviewImageUrl(card) {
  if (card.image_uris?.normal) return card.image_uris.normal;
  if (card.image_uris?.small) return card.image_uris.small;
  const faceImage = card.card_faces?.find((face) => face.image_uris?.normal || face.image_uris?.small);
  return faceImage?.image_uris?.normal || faceImage?.image_uris?.small || "";
}

function getCurveBucket(card) {
  if (isLandCard(card)) return "lands";
  const manaValue = Math.ceil(number(card.cmc));
  return manaValue >= 6 ? "mv6" : `mv${Math.max(1, manaValue)}`;
}

function getCardLine(card) {
  const manaCost = getManaCost(card);
  const landText = isLandCard(card) ? "Land" : `${Math.ceil(number(card.cmc)) || 0} MV`;
  return [landText, manaCost, card.type_line].filter(Boolean).join(" - ");
}

function deriveAdvancedInputs() {
  const derivedCounts = structuredClone(defaults.counts);
  const derivedMana = structuredClone(defaults.mana);
  let derivedNonbasicLands = 0;

  derivedCounts.lands += clampWhole(state.advancedBasicLands);

  state.advancedDeck.forEach((entry) => {
    const quantity = clampWhole(entry.quantity);
    const card = entry.card;

    if (isLandCard(card)) {
      derivedCounts.lands += quantity;

      if (!isBasicLand(card)) {
        derivedNonbasicLands += quantity;
        const produced = card.produced_mana || [];
        produced.forEach((symbol) => {
          if (derivedMana[symbol]) {
            derivedMana[symbol].duals += quantity;
          }
        });
      }
      return;
    }

    const bucket = getCurveBucket(card);
    if (derivedCounts[bucket] !== undefined) {
      derivedCounts[bucket] += quantity;
    }

    const pips = countColoredManaSymbols(getManaCost(card));
    colors.forEach((color) => {
      derivedMana[color.symbol].cost += pips[color.symbol] * quantity;
    });
  });

  state.counts = derivedCounts;
  state.mana = derivedMana;
  state.nonbasicLands = derivedNonbasicLands;
}

function setMode(mode) {
  state.mode = mode;
  if (isAdvancedMode()) {
    deriveAdvancedInputs();
  }
  render();
}

function curveValue(key) {
  return number(state.counts[key]);
}

function analyzeCurve() {
  const curve = curveKeys.map((item) => {
    const actual = curveValue(item.key);
    const range = state.ranges[item.key];
    let delta = 0;
    let status = "good";
    if (actual < range.min) {
      delta = range.min - actual;
      status = "add";
    } else if (actual > range.max) {
      delta = range.max - actual;
      status = "cut";
    }

    return {
      ...item,
      actual,
      range,
      delta,
      status,
      recommended: actual + delta,
    };
  });

  const total = totalCards();
  curve.push({
    key: "total",
    label: "Total",
    actual: total,
    range: { min: totalTarget, max: totalTarget },
    delta: total === totalTarget ? 0 : totalTarget - total,
    status: total === totalTarget ? "good" : total < totalTarget ? "add" : "cut",
    recommended: totalTarget,
  });

  return curve;
}

function calculateBasics() {
  const landCount = basicLandSlotCount();
  const totalNonbasics = nonbasicLandCount();
  const totalCost = colors.reduce((sum, color) => sum + number(state.mana[color.symbol].cost), 0);
  if (totalCost === 0) {
    return colors.map((color) => ({
      ...color,
      cost: 0,
      duals: number(state.mana[color.symbol].duals),
      costShare: 0,
      initialNeed: 0,
      rawNeed: 0,
      protected: false,
      count: 0,
    }));
  }

  const rows = colors.map((color, index) => {
    const cost = number(state.mana[color.symbol].cost);
    const duals = number(state.mana[color.symbol].duals);
    const costShare = totalCost ? cost / totalCost : 0;
    const rawNeed = Math.max(0, costShare * landCount - duals);
    return {
      ...color,
      index,
      cost,
      duals,
      costShare,
      initialNeed: rawNeed,
      rawNeed,
      protected: false,
      count: 0,
    };
  });

  const targetBasics = Math.max(0, landCount - totalNonbasics);
  const activeRows = rows.filter((row) => row.cost > 0 && row.rawNeed > 0);
  const protectedRows = activeRows
    .slice()
    .sort((a, b) => a.rawNeed - b.rawNeed || a.index - b.index)
    .slice(0, targetBasics);

  protectedRows.forEach((row) => {
    row.count = 1;
    row.protected = true;
  });

  const remainingBasics = Math.max(0, targetBasics - protectedRows.length);
  const remainingNeed = rows.reduce((sum, row) => {
    if (!row.cost) return sum;
    return sum + Math.max(0, row.rawNeed - row.count);
  }, 0);

  rows.forEach((row) => {
    if (!row.cost) return;
    const adjustedNeed = Math.max(0, row.rawNeed - row.count);
    row.adjustedNeed = remainingNeed ? (adjustedNeed / remainingNeed) * remainingBasics : 0;
    row.count += Math.floor(row.adjustedNeed);
  });

  let assigned = rows.reduce((sum, row) => sum + row.count, 0);

  const byRemainder = rows.slice().sort((a, b) => {
    const aNeed = a.adjustedNeed || 0;
    const bNeed = b.adjustedNeed || 0;
    const remainder = bNeed - Math.floor(bNeed) - (aNeed - Math.floor(aNeed));
    return remainder || b.cost - a.cost || a.index - b.index;
  });

  const eligibleRemainders = byRemainder.filter((row) => row.cost > 0);
  let remainderIndex = 0;
  while (assigned < targetBasics && eligibleRemainders.length) {
    eligibleRemainders[remainderIndex % eligibleRemainders.length].count += 1;
    assigned += 1;
    remainderIndex += 1;
  }

  const bySmallestRemainder = byRemainder.slice().reverse();
  while (assigned > targetBasics) {
    const row = bySmallestRemainder.find((item) => item.count > (item.protected ? 1 : 0));
    if (!row) break;
    row.count -= 1;
    assigned -= 1;
  }

  return rows;
}

function renderCurveInputs() {
  curveInputs.innerHTML = "";
  curveKeys.forEach((item) => {
    const range = state.ranges[item.key];
    const disabled = isAdvancedMode() ? "disabled" : "";
    const card = document.createElement("div");
    card.className = "curve-card";

    card.innerHTML = `
      <div class="curve-label">
        <strong>${item.label}</strong>
        <span class="range-text" data-range-label="${item.key}">${range.min}-${range.max}</span>
      </div>
      <div class="number-control">
        <label class="field-label" for="${item.key}-count">${isAdvancedMode() ? "From Deck" : "Count"}</label>
        <input id="${item.key}-count" data-kind="count" data-key="${item.key}" type="number" min="0" value="${state.counts[item.key]}" aria-label="${item.label} count" ${disabled} />
      </div>
    `;
    curveInputs.append(card);
  });
}

function renderRangeEditor() {
  rangeEditor.innerHTML = "";
  curveKeys.forEach((item) => {
    const range = state.ranges[item.key];
    const row = document.createElement("div");
    row.className = "range-row";
    row.innerHTML = `
      <strong>${item.label}</strong>
      <label><span>Min</span><input data-kind="min" data-key="${item.key}" type="number" min="0" value="${range.min}" aria-label="${item.label} ideal minimum" /></label>
      <label><span>Max</span><input data-kind="max" data-key="${item.key}" type="number" min="0" value="${range.max}" aria-label="${item.label} ideal maximum" /></label>
    `;
    rangeEditor.append(row);
  });
}

function renderLandInputs() {
  const totalCost = colors.reduce((sum, color) => sum + number(state.mana[color.symbol].cost), 0);
  const disabled = isAdvancedMode() ? "disabled" : "";
  landInputs.innerHTML = "";
  const nonbasicRow = document.createElement("div");
  nonbasicRow.className = "nonbasic-row";
  nonbasicRow.innerHTML = `
    <div>
      <strong>Nonbasic Lands</strong>
      <span>${isAdvancedMode() ? "Derived from added land cards" : "Count every nonbasic land in your deck"}</span>
    </div>
    <input data-kind="nonbasic-lands" type="number" min="0" value="${state.nonbasicLands}" ${disabled} aria-label="Nonbasic lands in deck" />
  `;
  landInputs.append(nonbasicRow);

  colors.forEach((color) => {
    const mana = state.mana[color.symbol];
    const share = totalCost ? number(mana.cost) / totalCost : 0;
    const row = document.createElement("div");
    row.className = "color-row";
    row.innerHTML = `
      <div class="color-chip"><span class="mana-dot mana-${color.symbol}" aria-label="${color.symbol} mana"></span>${color.land}</div>
      <label>${isAdvancedMode() ? "In Card Costs" : "In Costs"}<input data-kind="mana-cost" data-color="${color.symbol}" type="number" min="0" value="${mana.cost}" ${disabled} /></label>
      <label>On Nonbasic Lands<input data-kind="mana-duals" data-color="${color.symbol}" type="number" min="0" value="${mana.duals}" ${disabled} /></label>
      <span class="percent-pill" data-percent="${color.symbol}">${Math.round(share * 100)}%</span>
    `;
    landInputs.append(row);
  });
}

function renderStatus() {
  const curve = analyzeCurve();
  const issues = curve.filter((item) => item.status !== "good").length;
  deckStatus.innerHTML = `
    <div class="status-item"><span class="status-value">${totalCards()}</span><span class="status-label">cards</span></div>
    <div class="status-item"><span class="status-value">${totalTarget}</span><span class="status-label">target</span></div>
    <div class="status-item"><span class="status-value">${totalSpells()}</span><span class="status-label">spells</span></div>
    <div class="status-item"><span class="status-value">${issues}</span><span class="status-label">flags</span></div>
  `;
}

function updateCurveInputDisplay() {
  curveKeys.forEach((item) => {
    const rangeLabel = document.querySelector(`[data-range-label="${item.key}"]`);
    if (rangeLabel) {
      const range = state.ranges[item.key];
      rangeLabel.textContent = `${range.min}-${range.max}`;
    }
  });
}

function updateLandInputDisplay() {
  const totalCost = colors.reduce((sum, color) => sum + number(state.mana[color.symbol].cost), 0);
  colors.forEach((color) => {
    const percent = document.querySelector(`[data-percent="${color.symbol}"]`);
    if (percent) {
      const share = totalCost ? number(state.mana[color.symbol].cost) / totalCost : 0;
      percent.textContent = `${Math.round(share * 100)}%`;
    }
  });
}

function renderRecommendations() {
  const curve = analyzeCurve();
  const flags = curve.filter((item) => item.status !== "good");
  const total = curve.find((item) => item.key === "total");

  if (!flags.length) {
    curveRecommendations.innerHTML = `
      <div class="recommendation">
        <strong>Curve Is In Range</strong>
        <span>Your counts match the editable curve targets.</span>
      </div>
    `;
    return;
  }

  curveRecommendations.innerHTML = flags
    .map((item) => {
      const abs = Math.abs(item.delta);
      const noun = abs === 1 ? "card" : "cards";
      const target =
        item.status === "add"
          ? `Add ${abs} ${noun} at ${item.label}.`
          : `Cut ${abs} ${noun} from ${item.label}.`;
      const rangeText = `${item.range.min}-${item.range.max}`;
      if (item.key === "total") {
        const totalAction =
          item.status === "add"
            ? `Add at least ${abs} ${noun} to reach the 40-card minimum.`
            : `It is recommended to cut ${abs} ${noun}, since sealed decks are usually strongest at 40 cards.`;
        return `
          <div class="recommendation ${item.status}">
            <strong>Deck Total</strong>
            <span>${totalAction} Current: ${item.actual}. Minimum: 40.</span>
          </div>
        `;
      }

      return `
        <div class="recommendation ${item.status}">
          <strong>${item.label} Mana</strong>
          <span>${target} Current: ${item.actual}. Target range: ${rangeText}.</span>
        </div>
      `;
    })
    .join("");

  if (total.status !== "good") {
    curveRecommendations.insertAdjacentHTML(
      "beforeend",
      `<div class="recommendation warn"><strong>Balance The Total First</strong><span>Sealed decks must be at least 40 cards. If you are over 40, it is recommended to trim back to 40.</span></div>`,
    );
  }
}

function renderLandRecommendations() {
  const totalCost = colors.reduce((sum, color) => sum + number(state.mana[color.symbol].cost), 0);
  const landCount = basicLandSlotCount();
  const totalNonbasics = nonbasicLandCount();
  const basics = [...calculateBasics()].sort((a, b) => b.count - a.count || b.cost - a.cost);
  const totalBasics = basics.reduce((sum, row) => sum + row.count, 0);

  if (landCount === 0) {
    landRecommendations.innerHTML = `
      <div class="recommendation warn">
        <strong>Enter Your Lands</strong>
        <span>Input the number of lands in the Mana Curve section above to get suggested basic lands.</span>
      </div>
      <div class="formula-note">Total Basics: <strong>0</strong>.</div>
    `;
    return;
  }

  if (totalCost === 0) {
    landRecommendations.innerHTML = `
      <div class="recommendation warn">
        <strong>Count Mana Pips</strong>
        <span>Enter the colored mana symbols from your spell costs to get suggested basic lands.</span>
      </div>
      <div class="formula-note">Total Basics: <strong>0</strong>.</div>
    `;
    return;
  }

  landRecommendations.innerHTML = basics
    .map(
      (row) => `
        <div class="land-result">
          <div>
            <strong>${row.land}</strong>
            <div class="land-name">${row.symbol}: ${row.cost} cost symbols, ${row.duals} nonbasic-land color sources</div>
          </div>
          <div class="land-count">${row.count}</div>
        </div>
      `,
    )
    .join("");

  landRecommendations.insertAdjacentHTML(
    "beforeend",
    `<div class="formula-note">Total Basics: <strong>${totalBasics}</strong>. ${landCount} land slots, ${totalNonbasics} nonbasic. Color demand is weighted by costs; nonbasics reduce basic slots.</div>`,
  );
}

function drawChart() {
  const styles = getComputedStyle(document.body);
  const panel = styles.getPropertyValue("--panel").trim();
  const line = styles.getPropertyValue("--line").trim();
  const muted = styles.getPropertyValue("--muted").trim();
  const ink = styles.getPropertyValue("--ink").trim();
  const green = styles.getPropertyValue("--green").trim();
  const greenSoft = styles.getPropertyValue("--green-soft").trim();
  const red = styles.getPropertyValue("--red").trim();
  const blue = styles.getPropertyValue("--blue").trim();
  const data = analyzeCurve().filter((item) => item.key !== "total");
  const width = canvas.width;
  const height = canvas.height;
  const padding = { top: 28, right: 24, bottom: 48, left: 44 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...data.flatMap((item) => [item.actual, item.range.max]), 1);
  const scaleMax = Math.ceil(maxValue / 2) * 2 + 2;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = panel;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
  ctx.fillStyle = muted;
  ctx.font = "14px Inter, system-ui, sans-serif";
  for (let tick = 0; tick <= scaleMax; tick += 2) {
    const y = padding.top + plotHeight - (tick / scaleMax) * plotHeight;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillText(String(tick), 12, y + 5);
  }

  const slot = plotWidth / data.length;
  data.forEach((item, index) => {
    const x = padding.left + index * slot + slot * 0.18;
    const barWidth = slot * 0.42;
    const rangeX = padding.left + index * slot + slot * 0.12;
    const rangeWidth = slot * 0.54;
    const rangeTop = padding.top + plotHeight - (item.range.max / scaleMax) * plotHeight;
    const rangeBottom = padding.top + plotHeight - (item.range.min / scaleMax) * plotHeight;
    const barTop = padding.top + plotHeight - (item.actual / scaleMax) * plotHeight;
    const base = padding.top + plotHeight;

    ctx.fillStyle = greenSoft;
    ctx.fillRect(rangeX, rangeTop, rangeWidth, Math.max(3, rangeBottom - rangeTop));

    ctx.fillStyle = item.status === "cut" ? red : item.status === "add" ? blue : green;
    ctx.fillRect(x, barTop, barWidth, base - barTop);

    ctx.fillStyle = ink;
    ctx.font = "700 15px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(item.actual), x + barWidth / 2, barTop - 8);
    ctx.font = "13px Inter, system-ui, sans-serif";
    ctx.fillText(item.label, x + barWidth / 2, height - 20);
  });
  ctx.textAlign = "left";
}

function renderModeControls() {
  const advanced = isAdvancedMode();
  advancedPanel.hidden = !advanced;
  basicModeButton.classList.toggle("active", !advanced);
  advancedModeButton.classList.toggle("active", advanced);
  basicModeButton.setAttribute("aria-pressed", String(!advanced));
  advancedModeButton.setAttribute("aria-pressed", String(advanced));
}

function renderSelectedSets() {
  selectedSetTags.innerHTML = "";

  if (!state.selectedSets.length) {
    return;
  }

  state.selectedSets.forEach((set) => {
    const tag = document.createElement("button");
    tag.className = "set-tag";
    tag.type = "button";
    tag.dataset.action = "remove-set";
    tag.dataset.setCode = set.code;
    tag.textContent = `${set.code.toUpperCase()} - ${set.name}`;
    tag.setAttribute("aria-label", `Remove ${set.name} set filter`);
    selectedSetTags.append(tag);
  });
}

function renderSetSuggestions(sets = []) {
  setSuggestions.innerHTML = "";
  sets.forEach((set) => {
    const button = document.createElement("button");
    button.className = "set-suggestion";
    button.type = "button";
    button.dataset.action = "add-set";
    button.dataset.setCode = set.code;
    const name = document.createElement("strong");
    name.textContent = set.name;
    const details = document.createElement("span");
    details.textContent = `${set.code.toUpperCase()}${set.released_at ? ` - ${set.released_at}` : ""}`;
    button.append(name, details);
    setSuggestions.append(button);
  });
}

function showSetSuggestionMessage(message) {
  setSuggestions.innerHTML = "";
  const status = document.createElement("div");
  status.className = "empty-state";
  status.textContent = message;
  setSuggestions.append(status);
}

function renderAdvancedDeck() {
  const total = state.advancedDeck.reduce((sum, entry) => sum + clampWhole(entry.quantity), 0);
  advancedDeckSummary.textContent = `${total} ${total === 1 ? "card" : "cards"}`;
  advancedBasicLandsInput.value = clampWhole(state.advancedBasicLands);
  advancedDeckList.innerHTML = "";

  if (!state.advancedDeck.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Search for cards and add them here. The curve and mana base panels will update from the deck list.";
    advancedDeckList.append(empty);
    return;
  }

  state.advancedDeck
    .slice()
    .sort((a, b) => a.card.name.localeCompare(b.card.name))
    .forEach((entry) => {
      const row = document.createElement("div");
      row.className = "deck-card";

      const info = document.createElement("div");
      const name = document.createElement("strong");
      name.className = "card-name";
      name.textContent = entry.card.name;
      const details = document.createElement("div");
      details.className = "card-details";
      details.textContent = getCardLine(entry.card);
      info.append(name, details);

      const controls = document.createElement("div");
      controls.className = "quantity-control";
      const remove = document.createElement("button");
      remove.className = "quantity-button";
      remove.type = "button";
      remove.dataset.action = "decrease-card";
      remove.dataset.cardId = entry.card.id;
      remove.textContent = "-";
      remove.setAttribute("aria-label", `Remove one ${entry.card.name}`);
      const quantity = document.createElement("strong");
      quantity.textContent = entry.quantity;
      const add = document.createElement("button");
      add.className = "quantity-button";
      add.type = "button";
      add.dataset.action = "increase-card";
      add.dataset.cardId = entry.card.id;
      add.textContent = "+";
      add.setAttribute("aria-label", `Add one ${entry.card.name}`);
      controls.append(remove, quantity, add);

      row.append(info, controls);
      advancedDeckList.append(row);
    });
}

function renderDeckPreview() {
  const advanced = isAdvancedMode();
  deckPreviewPanel.hidden = !advanced;
  deckPreviewContent.hidden = !state.deckPreviewOpen;
  deckPreviewToggle.textContent = state.deckPreviewOpen ? "Hide Preview" : "Show Preview";
  deckPreviewToggle.setAttribute("aria-expanded", String(state.deckPreviewOpen));

  deckPreviewGroups.innerHTML = "";
  if (!advanced || !state.deckPreviewOpen) return;

  if (!state.advancedDeck.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Add cards in Advanced Mode to preview your deck by mana cost.";
    deckPreviewGroups.append(empty);
    return;
  }

  curveKeys.forEach((bucket) => {
    const entries = state.advancedDeck
      .filter((entry) => getCurveBucket(entry.card) === bucket.key)
      .slice()
      .sort((a, b) => a.card.name.localeCompare(b.card.name));

    if (!entries.length) return;

    const group = document.createElement("section");
    group.className = "preview-group";
    group.setAttribute("aria-label", `${bucket.label} mana value cards`);

    const cards = document.createElement("div");
    cards.className = "preview-card-grid";
    entries.forEach((entry) => {
      const card = document.createElement("article");
      card.className = "preview-card";
      card.tabIndex = 0;
      card.dataset.previewName = entry.card.name;

      const imageUrl = getPreviewImageUrl(entry.card);
      card.dataset.previewImage = imageUrl;
      if (imageUrl) {
        const image = document.createElement("img");
        image.src = imageUrl;
        image.alt = entry.card.name;
        image.loading = "lazy";
        card.append(image);
      } else {
        const placeholder = document.createElement("div");
        placeholder.className = "preview-placeholder";
        placeholder.textContent = entry.card.name;
        card.append(placeholder);
      }

      if (entry.quantity > 1) {
        const badge = document.createElement("span");
        badge.className = "preview-quantity";
        badge.textContent = `x${entry.quantity}`;
        card.append(badge);
      }

      cards.append(card);
    });

    group.append(cards);
    deckPreviewGroups.append(group);
  });
}

function renderSearchResults(cards = []) {
  searchResults.innerHTML = "";
  cards.forEach((card) => {
    const row = document.createElement("div");
    row.className = "card-result";

    const imageUrl = getImageUrl(card);
    const image = document.createElement(imageUrl ? "img" : "div");
    image.className = imageUrl ? "card-thumb" : "card-thumb card-placeholder";
    if (imageUrl) {
      image.src = imageUrl;
      image.alt = "";
      image.loading = "lazy";
    } else {
      image.textContent = "MTG";
    }

    const info = document.createElement("div");
    const name = document.createElement("strong");
    name.className = "card-name";
    name.textContent = card.name;
    const details = document.createElement("div");
    details.className = "card-details";
    details.textContent = getCardLine(card);
    info.append(name, details);

    const button = document.createElement("button");
    button.className = "add-card-button";
    button.type = "button";
    button.dataset.action = "add-search-card";
    button.textContent = "Add";
    button.setAttribute("aria-label", `Add ${card.name}`);
    button._card = card;

    row.append(image, info, button);
    searchResults.append(row);
  });
}

function positionFloatingPreview(target) {
  const rect = target.getBoundingClientRect();
  const previewWidth = floatingCardPreview.offsetWidth || 260;
  const previewHeight = floatingCardPreview.offsetHeight || 364;
  const gap = 12;
  const left = Math.min(
    Math.max(gap, rect.left + rect.width / 2 - previewWidth / 2),
    window.innerWidth - previewWidth - gap,
  );
  const preferredTop = rect.bottom + gap;
  const top =
    preferredTop + previewHeight + gap > window.innerHeight
      ? Math.max(gap, rect.top - previewHeight - gap)
      : preferredTop;

  floatingCardPreview.style.left = `${left}px`;
  floatingCardPreview.style.top = `${top}px`;
}

function showFloatingPreview(target) {
  floatingCardPreview.innerHTML = "";
  const imageUrl = target.dataset.previewImage;
  const name = target.dataset.previewName || "Card preview";

  if (imageUrl) {
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = name;
    floatingCardPreview.append(image);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "preview-placeholder";
    placeholder.textContent = name;
    floatingCardPreview.append(placeholder);
  }

  floatingCardPreview.hidden = false;
  positionFloatingPreview(target);
}

function hideFloatingPreview() {
  floatingCardPreview.hidden = true;
  floatingCardPreview.innerHTML = "";
}

function addCardToDeck(card) {
  const existing = state.advancedDeck.find((entry) => entry.card.id === card.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.advancedDeck.push({ card, quantity: 1 });
  }
  deriveAdvancedInputs();
  render();
}

function changeCardQuantity(cardId, delta) {
  const existing = state.advancedDeck.find((entry) => entry.card.id === cardId);
  if (!existing) return;
  existing.quantity += delta;
  state.advancedDeck = state.advancedDeck.filter((entry) => entry.quantity > 0);
  deriveAdvancedInputs();
  render();
}

async function loadSets() {
  if (setsLoaded) return allSets;
  if (setLoadPromise) return setLoadPromise;

  setLoadPromise = fetch("https://api.scryfall.com/sets", { headers: scryfallHeaders() })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Set list failed to load.");
      }
      return response.json();
    })
    .then((payload) => {
      allSets = payload.data
        .map((set) => ({
          code: set.code,
          name: set.name,
          released_at: set.released_at,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setsLoaded = true;
      return allSets;
    })
    .catch((error) => {
      setLoadPromise = null;
      showSetSuggestionMessage(error.message || "Set lookup failed.");
      return [];
    });

  return setLoadPromise;
}

async function searchSets(query) {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    renderSetSuggestions([]);
    return;
  }

  showSetSuggestionMessage("Loading sets...");
  const sets = await loadSets();
  const selectedCodes = new Set(state.selectedSets.map((set) => set.code));
  const matches = sets
    .filter((set) => !selectedCodes.has(set.code))
    .filter((set) => set.code.toLowerCase().includes(trimmed) || set.name.toLowerCase().includes(trimmed))
    .slice(0, 8);

  if (!matches.length) {
    showSetSuggestionMessage("No matching sets found.");
    return;
  }

  renderSetSuggestions(matches);
}

function addSetFilter(code) {
  const set = allSets.find((item) => item.code === code);
  if (!set || state.selectedSets.some((item) => item.code === code)) return;
  state.selectedSets.push(set);
  setSearchInput.value = "";
  renderSelectedSets();
  renderSetSuggestions([]);
  searchScryfall(cardSearchInput.value);
}

function removeSetFilter(code) {
  state.selectedSets = state.selectedSets.filter((set) => set.code !== code);
  renderSelectedSets();
  searchScryfall(cardSearchInput.value);
}

async function searchScryfall(query) {
  if (searchController) {
    searchController.abort();
  }

  const trimmed = query.trim();
  if (trimmed.length < 2) {
    searchMeta.textContent = "Type at least two characters to search.";
    searchResults.innerHTML = "";
    return;
  }

  searchController = new AbortController();
  searchMeta.textContent = "Searching Scryfall...";

  try {
    const headers = scryfallHeaders();
    const setFilter = getSetFilterQuery();
    const cardQuery = [trimmed, setFilter].filter(Boolean).join(" ");
    const searchUrl = new URL("https://api.scryfall.com/cards/search");
    searchUrl.searchParams.set("q", cardQuery);
    searchUrl.searchParams.set("unique", "cards");
    searchUrl.searchParams.set("order", "name");

    const exactUrl = new URL("https://api.scryfall.com/cards/named");
    exactUrl.searchParams.set("exact", trimmed);

    const [response, exactResponse] = await Promise.all([
      fetch(searchUrl, {
        headers,
        signal: searchController.signal,
      }),
      setFilter
        ? Promise.resolve(null)
        : fetch(exactUrl, {
            headers,
            signal: searchController.signal,
          }).catch(() => null),
    ]);

    if (!response.ok && !exactResponse?.ok) {
      throw new Error(response.status === 404 ? "No cards found." : "Scryfall search failed.");
    }

    const exactCard = exactResponse?.ok ? await exactResponse.json() : null;
    const payload = response.ok ? await response.json() : { data: [], total_cards: exactCard ? 1 : 0 };
    const exactSearchMatch = payload.data.find((card) => card.name.toLowerCase() === trimmed.toLowerCase());
    const orderedCards = exactCard
      ? [exactCard, ...payload.data.filter((card) => card.id !== exactCard.id)]
      : exactSearchMatch
        ? [exactSearchMatch, ...payload.data.filter((card) => card.id !== exactSearchMatch.id)]
        : payload.data;
    const cards = orderedCards.slice(0, 12);

    const filterText = state.selectedSets.length
      ? ` in ${state.selectedSets.map((set) => set.code.toUpperCase()).join(", ")}`
      : "";
    searchMeta.textContent = `${payload.total_cards} result${payload.total_cards === 1 ? "" : "s"} found${filterText}. Showing ${cards.length}.`;
    renderSearchResults(cards);
  } catch (error) {
    if (error.name === "AbortError") return;
    searchMeta.textContent = error.message || "Search failed. Try again in a moment.";
    searchResults.innerHTML = "";
  }
}

function render() {
  if (isAdvancedMode()) {
    deriveAdvancedInputs();
  }
  renderModeControls();
  renderSelectedSets();
  renderAdvancedDeck();
  renderDeckPreview();
  renderCurveInputs();
  renderRangeEditor();
  renderLandInputs();
  updateDynamicViews();
}

function updateDynamicViews() {
  updateCurveInputDisplay();
  updateLandInputDisplay();
  renderStatus();
  renderRecommendations();
  renderLandRecommendations();
  drawChart();
}

document.addEventListener("input", (event) => {
  const target = event.target;
  const kind = target.dataset.kind;
  if (!kind) return;

  if (kind === "count") {
    state.counts[target.dataset.key] = normalizeNumberInput(target);
  }

  if (kind === "min" || kind === "max") {
    const key = target.dataset.key;
    state.ranges[key][kind] = normalizeNumberInput(target);
    if (state.ranges[key].min > state.ranges[key].max) {
      state.ranges[key].max = state.ranges[key].min;
      const maxInput = document.querySelector(`[data-kind="max"][data-key="${key}"]`);
      if (maxInput) maxInput.value = state.ranges[key].max;
    }
  }

  if (kind === "mana-cost") {
    state.mana[target.dataset.color].cost = normalizeNumberInput(target);
  }

  if (kind === "mana-duals") {
    state.mana[target.dataset.color].duals = normalizeNumberInput(target);
  }

  if (kind === "nonbasic-lands") {
    state.nonbasicLands = normalizeNumberInput(target);
  }

  if (kind === "advanced-basic-lands") {
    state.advancedBasicLands = normalizeNumberInput(target);
    deriveAdvancedInputs();
  }

  updateDynamicViews();
});

document.querySelector("#resetButton").addEventListener("click", () => {
  const mode = state.mode;
  state = structuredClone(defaults);
  state.mode = mode;
  render();
});

basicModeButton.addEventListener("click", () => {
  setMode("basic");
});

advancedModeButton.addEventListener("click", () => {
  setMode("advanced");
});

clearDeckButton.addEventListener("click", () => {
  state.advancedDeck = [];
  state.advancedBasicLands = 0;
  deriveAdvancedInputs();
  render();
});

deckPreviewToggle.addEventListener("click", () => {
  state.deckPreviewOpen = !state.deckPreviewOpen;
  hideFloatingPreview();
  renderDeckPreview();
});

deckPreviewGroups.addEventListener("mouseover", (event) => {
  const card = event.target.closest(".preview-card");
  if (!card) return;
  showFloatingPreview(card);
});

deckPreviewGroups.addEventListener("mouseout", (event) => {
  const card = event.target.closest(".preview-card");
  if (!card || card.contains(event.relatedTarget)) return;
  hideFloatingPreview();
});

deckPreviewGroups.addEventListener("focusin", (event) => {
  const card = event.target.closest(".preview-card");
  if (!card) return;
  showFloatingPreview(card);
});

deckPreviewGroups.addEventListener("focusout", (event) => {
  const card = event.target.closest(".preview-card");
  if (!card || card.contains(event.relatedTarget)) return;
  hideFloatingPreview();
});

window.addEventListener("scroll", hideFloatingPreview, { passive: true });
window.addEventListener("resize", hideFloatingPreview);

cardSearchInput.addEventListener("input", () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => searchScryfall(cardSearchInput.value), 250);
});

setSearchInput.addEventListener("focus", () => {
  loadSets();
});

setSearchInput.addEventListener("input", () => {
  window.clearTimeout(setSearchTimer);
  setSearchTimer = window.setTimeout(() => searchSets(setSearchInput.value), 150);
});

setSuggestions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action='add-set']");
  if (!button) return;
  addSetFilter(button.dataset.setCode);
});

selectedSetTags.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action='remove-set']");
  if (!button) return;
  removeSetFilter(button.dataset.setCode);
});

searchResults.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action='add-search-card']");
  if (!button?._card) return;
  addCardToDeck(button._card);
});

advancedDeckList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const delta = button.dataset.action === "increase-card" ? 1 : -1;
  changeCardQuantity(button.dataset.cardId, delta);
});

curveOptionsButton.addEventListener("click", () => {
  const willOpen = curveOptions.hidden;
  curveOptions.hidden = !willOpen;
  curveOptionsButton.setAttribute("aria-expanded", String(willOpen));
  curveOptionsButton.textContent = willOpen ? "Hide Options" : "Options";
});

themeToggle.addEventListener("click", () => {
  const isDark = document.body.dataset.theme === "dark";
  document.body.dataset.theme = isDark ? "light" : "dark";
  themeToggle.textContent = isDark ? "Dark Mode" : "Light Mode";
  themeToggle.setAttribute("aria-pressed", String(!isDark));
  drawChart();
});

setRandomSearchPlaceholder();
render();
