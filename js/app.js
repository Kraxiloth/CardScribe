// app.js — wires everything together

// ── State ─────────────────────────────────────────────────────────────────────
let cards       = [];
let currentStep = 1;

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

// ── Steps ─────────────────────────────────────────────────────────────────────
function goToStep(n) {
  currentStep = n;
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.step').forEach(s => {
    s.classList.toggle('active', parseInt(s.dataset.step) === n);
  });
  document.getElementById(`step-${n}`).classList.add('active');
  if (n === 3) renderSummary(cards);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
 
// ── Step 1: Parse ──────────────────────────────────────────────────────────────
const EXAMPLE = `2x Abaddon Succubus Gothic Elite Foil NM
1 Avalon Arthurian Legends Unique NM
2x Camelot Arthurian Legends Unique LP
3 Apprentice Wizard Beta Standard NM
1x Black Knight Gothic Exceptional Foil NM
4x Spire Gothic Ordinary NM`;

document.getElementById('btn-load-example').addEventListener('click', () => {
  document.getElementById('paste-input').value = EXAMPLE;
});

document.getElementById('btn-clear').addEventListener('click', () => {
  document.getElementById('paste-input').value = '';
});

document.getElementById('btn-parse').addEventListener('click', () => {
  const text = document.getElementById('paste-input').value.trim();
  if (!text) { showToast('Please paste some cards first'); return; }

  const parsed = parseCardList(text);
  if (!parsed.length) { showToast('Could not parse any cards — check the format'); return; }

  cards = parsed.map(p => {
    const match   = findCard(p.rawName, p.setName);
    const setName = p.setName || (match ? match.sets[match.sets.length - 1].n : '');
    const slug    = match ? resolveSlug(match.sets, setName, p.finish) : null;
    return {
      id:          Math.random().toString(36).slice(2),
      rawName:     p.rawName,
      qty:         p.qty,
      condition:   p.condition,
      finish:      p.finish,
      setName,
      matched:     !!match,
      matchedCard: match,
      suggestions: match ? [] : getSuggestions(p.rawName),
      price:       '',
      slug,
    };
  });

  renderTable(cards);
  goToStep(2);
});

// ── Step 2: Review ─────────────────────────────────────────────────────────────
document.getElementById('btn-back-1').addEventListener('click', () => goToStep(1));
document.getElementById('btn-to-3').addEventListener('click', () => {
  if (!cards.length) { showToast('No cards to continue with'); return; }
  goToStep(3);
});

document.getElementById('btn-add-row').addEventListener('click', () => {
  cards.push(blankCard());
  renderTable(cards);
});

document.getElementById('btn-fill-market').addEventListener('click', () => {
  const filled = fillFromMarket(cards);
  if (filled > 0) showToast(`Filled ${filled} card${filled > 1 ? 's' : ''} from market prices`);
  else showToast('No blank prices to fill');
});

// ── Step 3: Listing Info ───────────────────────────────────────────────────────
document.getElementById('btn-back-2').addEventListener('click', () => goToStep(2));
document.getElementById('btn-to-4').addEventListener('click', () => {
  if (!cards.length) { showToast('No cards to continue with'); return; }
  const seller = getSellerInfo();
  const ad     = generateAd(cards, seller.listingType, seller);
  console.log('seller:', JSON.stringify(seller));
  console.log('ad:', ad);
  goToStep(4);
  document.getElementById('ad-output').value = ad;
});

// Listing type toggle
document.querySelectorAll('.type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('listing-type').value = btn.dataset.type;
  });
});

// Payment chips
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => chip.classList.toggle('active'));
});

// Card summary renderer
function renderSummary(cards) {
  const body = document.getElementById('summary-body');
  if (!body) return;
  body.innerHTML = '';

  const grouped = new Map();
  cards.forEach(c => {
    const key = c.setName || 'Unknown Set';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(c);
  });

  for (const [setName, setCards] of grouped) {
    const setEl = document.createElement('div');
    setEl.className = 'summary-set';
    setEl.textContent = setName;
    body.appendChild(setEl);

    const sorted = [...setCards].sort((a, b) =>
      (RARITY_ORDER[a.matchedCard?.rarity] ?? 4) - (RARITY_ORDER[b.matchedCard?.rarity] ?? 4)
    );

    sorted.forEach(card => {
      const name   = card.matchedCard?.name ?? card.rawName;
      const rarity = card.matchedCard?.rarity;
      const finish = card.finish !== 'Standard' ? card.finish : '';
      const isSite = card.matchedCard?.type === 'Site';

      const row = document.createElement('div');
      row.className = 'summary-row';

      const qty = document.createElement('span');
      qty.className = 'summary-qty';
      qty.textContent = `${card.qty}×`;

      const nameEl = document.createElement('span');
      nameEl.className = 'summary-name';
      nameEl.textContent = name;
      if (card.slug) {
        nameEl.addEventListener('mouseenter', e => showPreview(card.slug, e.clientX, e.clientY, isSite));
        nameEl.addEventListener('mousemove',  e => updatePreviewPos(e));
        nameEl.addEventListener('mouseleave', hidePreview);
      }

      row.appendChild(qty);
      row.appendChild(nameEl);

      if (rarity) {
        const rar = document.createElement('span');
        rar.className = `badge badge-${rarity.toLowerCase()}`;
        rar.textContent = rarity;
        row.appendChild(rar);
      }
      if (finish) {
        const fin = document.createElement('span');
        fin.className = 'badge badge-finish';
        fin.textContent = finish;
        row.appendChild(fin);
      }

      const cond = document.createElement('span');
      cond.className = 'summary-cond';
      cond.textContent = card.condition;
      row.appendChild(cond);

      body.appendChild(row);
    });
  }
}

function getSellerInfo() {
  const activeChips = [...document.querySelectorAll('.chip.active')]
    .map(c => c.dataset.value);
  return {
    listingType:    document.getElementById('listing-type').value,
    discord:        document.getElementById('discord-handle').value,
    currency:       document.getElementById('currency').value,
    shipsFrom:      document.getElementById('ships-from').value,
    shipsTo:        document.getElementById('ships-to').value,
    paymentMethods: activeChips.join(', '),
    tradeOffer:     document.getElementById('trade-offer').value,
    comments:       document.getElementById('comments').value,
    openToOffers:   document.getElementById('open-to-offers').checked,
  };
}

// ── Step 4: Generate ───────────────────────────────────────────────────────────
document.getElementById('btn-back-3').addEventListener('click', () => goToStep(3));
document.getElementById('btn-copy').addEventListener('click', () => {
  const text = document.getElementById('ad-output').value;
  if (!text) { showToast('Nothing to copy'); return; }
  navigator.clipboard.writeText(text)
    .then(() => showToast('Copied to clipboard!'))
    .catch(() => {
      document.getElementById('ad-output').select();
      document.execCommand('copy');
      showToast('Copied to clipboard!');
    });
});

// Output tabs
document.querySelectorAll('.output-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.output-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
    if (tab.dataset.tab === 'preview') {
      const text = document.getElementById('ad-output').value;
      document.getElementById('ad-preview').innerHTML = renderDiscordMarkdown(text);
    }
  });
});

function renderDiscordMarkdown(text) {
  const lines = text.split('\n');
  return lines.map(line => {
    // Escape HTML first
    line = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    // Bold italic ***text***
    line = line.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    // Bold **text**
    line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic *text*
    line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Underline __text__
    line = line.replace(/__(.*?)__/g, '<u>$1</u>');
    // Strikethrough ~~text~~
    line = line.replace(/~~(.*?)~~/g, '<s>$1</s>');
    return `<p>${line}</p>`;
  }).join('');
}

// ── Step nav clicks ────────────────────────────────────────────────────────────
document.querySelectorAll('.step').forEach(btn => {
  btn.addEventListener('click', () => {
    const n = parseInt(btn.dataset.step);
    if (n < currentStep) goToStep(n);
  });
});

// ── Init ───────────────────────────────────────────────────────────────────────
loadPrices();
