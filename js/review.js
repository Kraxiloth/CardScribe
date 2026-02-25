// review.js — review table rendering, card hover preview

const CDN_BASE = 'https://d27a44hjr9gen3.cloudfront.net/cards';

// ── Card Hover ────────────────────────────────────────────────────────────────

const preview    = document.getElementById('card-preview');
const previewImg = document.getElementById('card-preview-img');
let hoverTimer   = null;

function showPreview(slug, x, y, isSite) {
  if (!slug) return;
  clearTimeout(hoverTimer);
  hoverTimer = setTimeout(() => {
    const url = `${CDN_BASE}/${slug}.png`;
    if (isSite) {
      // Image is portrait (200×280) but card is landscape.
      // Rotate the image and size the container to the rotated footprint.
      const IMG_W = 200, IMG_H = 280;
      preview.style.width    = IMG_H + 'px';   // 280 — the rotated width
      preview.style.height   = IMG_W + 'px';   // 200 — the rotated height
      preview.style.overflow = 'hidden';
      // Centre the portrait image inside the landscape container, then rotate
      previewImg.style.width     = IMG_W + 'px';
      previewImg.style.height    = IMG_H + 'px';
      previewImg.style.position  = 'absolute';
      previewImg.style.left      = ((IMG_H - IMG_W) / 2) + 'px';
      previewImg.style.top       = ((IMG_W - IMG_H) / 2) + 'px';
      previewImg.style.transform = 'rotate(90deg)';
    } else {
      preview.style.width    = '200px';
      preview.style.height   = '';
      preview.style.overflow = 'visible';
      previewImg.style.width     = '100%';
      previewImg.style.height    = '';
      previewImg.style.position  = '';
      previewImg.style.left      = '';
      previewImg.style.top       = '';
      previewImg.style.transform = '';
    }
    previewImg.onload  = () => {
      positionPreview(x, y, isSite);
      preview.style.display = 'block';
      requestAnimationFrame(() => preview.classList.add('visible'));
    };
    previewImg.onerror = () => { preview.style.display = 'none'; };
    previewImg.src = url;
  }, 250);
}

function hidePreview() {
  clearTimeout(hoverTimer);
  preview.classList.remove('visible');
  setTimeout(() => { preview.style.display = 'none'; }, 150);
}

function positionPreview(x, y, isSite) {
  // Site cards: container is 280×200 (landscape)
  const W = isSite ? 280 : 200;
  const H = isSite ? 200 : 280;
  const OFFSET = 18;
  const vw = window.innerWidth, vh = window.innerHeight;
  let left = x + OFFSET;
  let top  = y - H / 2;
  if (left + W > vw - 8) left = x - W - OFFSET;
  if (top < 8)           top  = 8;
  if (top + H > vh - 8)  top  = vh - H - 8;
  preview.style.left = left + 'px';
  preview.style.top  = top  + 'px';
}

function updatePreviewPos(e) {
  if (preview.style.display === 'block') positionPreview(e.clientX, e.clientY);
}

// ── Table Rendering ───────────────────────────────────────────────────────────

const RARITY_CLASS = {
  Ordinary: 'badge-ordinary', Exceptional: 'badge-exceptional',
  Elite: 'badge-elite', Unique: 'badge-unique',
};

function effectivePrice(card) {
  if (card.price !== '') return parseFloat(card.price) || null;
  return getAdjustedPrice(card.slug, card.condition);
}

function calcTotal(cards) {
  return cards.reduce((sum, c) => {
    const p = effectivePrice(c);
    return sum + (p ?? 0) * (c.qty || 1);
  }, 0);
}

function updateTotal(cards) {
  document.getElementById('total-value').textContent =
    '$' + calcTotal(cards).toFixed(2);
}

function getFinishes(card) {
  if (!card.matchedCard) return ['Standard', 'Foil', 'Rainbow'];
  const setData = card.matchedCard.sets.find(s => s.n === card.setName)
    ?? card.matchedCard.sets[card.matchedCard.sets.length - 1];
  const finishes = [...new Set((setData?.v ?? []).map(v => v.finish))];
  if (!finishes.includes('Standard')) finishes.unshift('Standard');
  return finishes;
}

function renderRow(card, cards) {
  const tr = document.createElement('tr');
  if (!card.matched && card.rawName) tr.classList.add('unmatched');
  tr.dataset.id = card.id;

  const name      = card.matchedCard?.name ?? card.rawName;
  const rarity    = card.matchedCard?.rarity ?? '';
  const sets      = card.matchedCard?.sets ?? [];
  const finishes  = getFinishes(card);
  const adjMarket = getAdjustedPrice(card.slug, card.condition);
  const isAuto    = card.price === '' && adjMarket !== null;

  // ── Qty
  const tdQty = document.createElement('td');
  const inQty = document.createElement('input');
  inQty.type = 'number'; inQty.min = 1; inQty.max = 99;
  inQty.value = card.qty;
  inQty.className = 't-input qty';
  inQty.addEventListener('change', () => {
    card.qty = parseInt(inQty.value) || 1;
    updateTotal(cards);
  });
  tdQty.appendChild(inQty);

  // ── Name
  const tdName = document.createElement('td');
  if (card.matched) {
    const nameEl = document.createElement('div');
    nameEl.className = 'card-name-matched';
    nameEl.textContent = name;
    // Hover preview
    const isSite = card.matchedCard?.type === 'Site';
    nameEl.addEventListener('mouseenter', e => showPreview(card.slug, e.clientX, e.clientY, isSite));
    nameEl.addEventListener('mousemove',  e => updatePreviewPos(e));
    nameEl.addEventListener('mouseleave', hidePreview);
    tdName.appendChild(nameEl);
  } else {
    if (card.rawName) {
      const errEl = document.createElement('div');
      errEl.style.cssText = 'font-weight:600;color:var(--danger);margin-bottom:0.2rem';
      errEl.textContent = card.rawName;
      tdName.appendChild(errEl);
    }
    if (card.suggestions[0]) {
      const dym = document.createElement('div');
      dym.className = 'did-you-mean';
      dym.textContent = `Did you mean: ${card.suggestions[0]}?`;
      dym.addEventListener('click', () => {
        const match = findCard(card.suggestions[0]);
        if (match) {
          card.rawName     = match.name;
          card.matched     = true;
          card.matchedCard = match;
          card.setName     = match.sets[match.sets.length - 1].n;
          card.slug        = resolveSlug(match.sets, card.setName, card.finish);
          card.suggestions = [];
          renderTable(cards);
        }
      });
      tdName.appendChild(dym);
    }
    const inName = document.createElement('input');
    inName.type = 'text'; inName.className = 't-input';
    inName.style.width = '100%';
    inName.value = card.rawName;
    inName.placeholder = 'Type card name…';
    inName.addEventListener('change', () => {
      card.rawName = inName.value;
    });
    inName.addEventListener('blur', () => {
      const match = findCard(inName.value);
      if (match) {
        card.matched     = true;
        card.matchedCard = match;
        card.rawName     = match.name;
        card.setName     = match.sets[match.sets.length - 1].n;
        card.slug        = resolveSlug(match.sets, card.setName, card.finish);
        card.suggestions = [];
        renderTable(cards);
      } else {
        card.suggestions = getSuggestions(inName.value);
        renderTable(cards);
      }
    });
    tdName.appendChild(inName);
  }

  // ── Set
  const tdSet = document.createElement('td');
  if (sets.length > 0) {
    const sel = document.createElement('select');
    sel.className = 't-input';
    sets.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.n; opt.textContent = s.n;
      if (s.n === card.setName) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', () => {
      card.setName = sel.value;
      card.slug    = resolveSlug(card.matchedCard.sets, card.setName, card.finish);
      renderTable(cards);
    });
    tdSet.appendChild(sel);
  } else {
    const inSet = document.createElement('input');
    inSet.type = 'text'; inSet.className = 't-input';
    inSet.value = card.setName; inSet.placeholder = 'Set…';
    inSet.addEventListener('change', () => { card.setName = inSet.value; });
    tdSet.appendChild(inSet);
  }

  // ── Rarity
  const tdRarity = document.createElement('td');
  if (rarity) {
    const badge = document.createElement('span');
    badge.className = `badge ${RARITY_CLASS[rarity] ?? ''}`;
    badge.textContent = rarity;
    tdRarity.appendChild(badge);
  } else {
    tdRarity.innerHTML = '<span style="color:var(--text-dim)">—</span>';
  }

  // ── Finish
  const tdFinish = document.createElement('td');
  const selFinish = document.createElement('select');
  selFinish.className = 't-input';
  finishes.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f; opt.textContent = f;
    if (f === card.finish) opt.selected = true;
    selFinish.appendChild(opt);
  });
  selFinish.addEventListener('change', () => {
    card.finish = selFinish.value;
    if (card.matchedCard) {
      card.slug = resolveSlug(card.matchedCard.sets, card.setName, card.finish);
    }
    renderTable(cards);
  });
  tdFinish.appendChild(selFinish);

  // ── Condition
  const tdCond = document.createElement('td');
  const selCond = document.createElement('select');
  selCond.className = 't-input';
  ['NM','LP','MP','HP','DMG'].forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    if (c === card.condition) opt.selected = true;
    selCond.appendChild(opt);
  });
  selCond.addEventListener('change', () => {
    card.condition = selCond.value;
    renderTable(cards);
  });
  tdCond.appendChild(selCond);

  // ── Market
  const tdMarket = document.createElement('td');
  tdMarket.innerHTML = adjMarket !== null
    ? `<span class="market-price">$${adjMarket.toFixed(2)}</span>`
    : `<span class="market-dash">—</span>`;

  // ── Price
  const tdPrice = document.createElement('td');
  const wrap = document.createElement('div');
  wrap.className = 'price-wrap';
  const sym = document.createElement('span');
  sym.className = 'currency-symbol'; sym.textContent = '$';
  const inPrice = document.createElement('input');
  inPrice.type = 'number'; inPrice.min = 0; inPrice.step = 0.01;
  inPrice.className = 't-input price';
  inPrice.value = card.price;
  inPrice.placeholder = adjMarket !== null ? adjMarket.toFixed(2) : '0.00';
  if (isAuto) inPrice.style.color = 'var(--text-dim)';
  inPrice.addEventListener('input', () => {
    card.price = inPrice.value;
    updateTotal(cards);
  });
  wrap.appendChild(sym);
  wrap.appendChild(inPrice);
  tdPrice.appendChild(wrap);
  if (isAuto) {
    const autoLabel = document.createElement('div');
    autoLabel.className = 'auto-label'; autoLabel.textContent = 'auto';
    tdPrice.appendChild(autoLabel);
  }

  // ── Remove
  const tdRemove = document.createElement('td');
  const btnRemove = document.createElement('button');
  btnRemove.className = 'btn btn-danger'; btnRemove.textContent = '✕';
  btnRemove.addEventListener('click', () => {
    const idx = cards.findIndex(c => c.id === card.id);
    if (idx !== -1) { cards.splice(idx, 1); renderTable(cards); }
  });
  tdRemove.appendChild(btnRemove);

  tr.append(tdQty, tdName, tdSet, tdRarity, tdFinish, tdCond, tdMarket, tdPrice, tdRemove);
  return tr;
}

function renderTable(cards) {
  const tbody = document.getElementById('review-tbody');
  tbody.innerHTML = '';
  cards.forEach(card => tbody.appendChild(renderRow(card, cards)));
  updateTotal(cards);

  // Update header counts
  const matched   = cards.filter(c => c.matched).length;
  const unmatched = cards.filter(c => !c.matched).length;
  document.getElementById('card-count').textContent =
    `${cards.length} cards · ${matched} matched` +
    (unmatched > 0 ? ` · ${unmatched} unmatched` : '');

  // Unmatched notice
  const notice = document.getElementById('unmatched-notice');
  if (unmatched > 0) {
    notice.style.display = 'block';
    notice.querySelector('.notice').textContent =
      `⚠ ${unmatched} card${unmatched > 1 ? 's' : ''} could not be matched — please review below.`;
  } else {
    notice.style.display = 'none';
  }

  // Price notice
  const priceNotice = document.getElementById('price-notice');
  if (PRICES.loaded) {
    priceNotice.style.display = 'block';
    priceNotice.querySelector('.notice').innerHTML =
      `💰 Market prices courtesy of <a href="${PRICES.data.sourceUrl}" target="_blank">${PRICES.data.source}</a>` +
      ` · Updated ${new Date(PRICES.data.updated).toLocaleDateString()}` +
      ` · Prices are NM baseline adjusted for condition. Override any price manually.`;
    document.getElementById('btn-fill-market').style.display = 'inline-block';
  } else {
    priceNotice.style.display = 'none';
    document.getElementById('btn-fill-market').style.display = 'none';
  }
}

function fillFromMarket(cards) {
  let filled = 0;
  cards.forEach(card => {
    if (card.price !== '') return;
    const p = getAdjustedPrice(card.slug, card.condition);
    if (p === null) return;
    card.price = p.toFixed(2);
    filled++;
  });
  renderTable(cards);
  return filled;
}

function blankCard() {
  return {
    id: Math.random().toString(36).slice(2),
    rawName: '', qty: 1, condition: 'NM', finish: 'Standard',
    setName: '', matched: false, matchedCard: null,
    suggestions: [], price: '', slug: null,
  };
}
