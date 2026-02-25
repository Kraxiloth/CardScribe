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
  document.getElementById('step-' + n).classList.add('active');
  if (n === 3) renderSummary(cards);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Step 1 ─────────────────────────────────────────────────────────────────────
const EXAMPLE = '2x Abaddon Succubus Gothic Elite Foil NM\n1 Avalon Arthurian Legends Unique NM\n2x Camelot Arthurian Legends Unique LP\n3 Apprentice Wizard Beta Standard NM\n1x Black Knight Gothic Exceptional Foil NM\n4x Spire Gothic Ordinary NM';

document.getElementById('btn-load-example').addEventListener('click', function() {
  document.getElementById('paste-input').value = EXAMPLE;
});

document.getElementById('btn-clear').addEventListener('click', function() {
  document.getElementById('paste-input').value = '';
});

document.getElementById('btn-parse').addEventListener('click', function() {
  var text = document.getElementById('paste-input').value.trim();
  if (!text) { showToast('Please paste some cards first'); return; }
  var parsed = parseCardList(text);
  if (!parsed.length) { showToast('Could not parse any cards'); return; }
  cards = parsed.map(function(p) {
    var match   = findCard(p.rawName, p.setName);
    var setName = p.setName || (match ? match.sets[match.sets.length - 1].n : '');
    var slug    = match ? resolveSlug(match.sets, setName, p.finish) : null;
    return {
      id:          Math.random().toString(36).slice(2),
      rawName:     p.rawName,
      qty:         p.qty,
      condition:   p.condition,
      finish:      p.finish,
      setName:     setName,
      matched:     !!match,
      matchedCard: match,
      suggestions: match ? [] : getSuggestions(p.rawName),
      price:       '',
      slug:        slug,
    };
  });
  renderTable(cards);
  goToStep(2);
});

// ── Step 2 ─────────────────────────────────────────────────────────────────────
document.getElementById('btn-back-1').addEventListener('click', function() { goToStep(1); });
document.getElementById('btn-to-3').addEventListener('click', function() {
  if (!cards.length) { showToast('No cards to continue with'); return; }
  goToStep(3);
});
document.getElementById('btn-add-row').addEventListener('click', function() {
  cards.push(blankCard());
  renderTable(cards);
});
document.getElementById('btn-fill-market').addEventListener('click', function() {
  var filled = fillFromMarket(cards);
  showToast(filled > 0 ? 'Filled ' + filled + ' card' + (filled > 1 ? 's' : '') + ' from market prices' : 'No blank prices to fill');
});

// ── Step 3 ─────────────────────────────────────────────────────────────────────
document.getElementById('btn-back-2').addEventListener('click', function() { goToStep(2); });
document.getElementById('btn-to-4').addEventListener('click', function() {
  if (!cards.length) { showToast('No cards to continue with'); return; }
  var seller = getSellerInfo();
  var ad     = generateAd(cards, seller.listingType, seller);
  var el     = document.getElementById('ad-output');
  el.textContent = ad;
  goToStep(4);
});

document.querySelectorAll('.type-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.type-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    document.getElementById('listing-type').value = btn.dataset.type;
  });
});

document.querySelectorAll('.chip').forEach(function(chip) {
  chip.addEventListener('click', function() { chip.classList.toggle('active'); });
});

function renderSummary(cards) {
  var body = document.getElementById('summary-body');
  if (!body) return;
  body.innerHTML = '';
  var grouped = new Map();
  cards.forEach(function(c) {
    var key = c.setName || 'Unknown Set';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(c);
  });
  grouped.forEach(function(setCards, setName) {
    var setEl = document.createElement('div');
    setEl.className = 'summary-set';
    setEl.textContent = setName;
    body.appendChild(setEl);
    var sorted = setCards.slice().sort(function(a, b) {
      return (RARITY_ORDER[a.matchedCard && a.matchedCard.rarity] || 4) -
             (RARITY_ORDER[b.matchedCard && b.matchedCard.rarity] || 4);
    });
    sorted.forEach(function(card) {
      var name   = (card.matchedCard && card.matchedCard.name) || card.rawName;
      var rarity = card.matchedCard && card.matchedCard.rarity;
      var finish = card.finish !== 'Standard' ? card.finish : '';
      var isSite = card.matchedCard && card.matchedCard.type === 'Site';
      var row    = document.createElement('div');
      row.className = 'summary-row';
      var qty = document.createElement('span');
      qty.className = 'summary-qty';
      qty.textContent = card.qty + '×';
      var nameEl = document.createElement('span');
      nameEl.className = 'summary-name';
      nameEl.textContent = name;
      if (card.slug) {
        nameEl.addEventListener('mouseenter', function(e) { showPreview(card.slug, e.clientX, e.clientY, isSite); });
        nameEl.addEventListener('mousemove',  function(e) { updatePreviewPos(e); });
        nameEl.addEventListener('mouseleave', hidePreview);
      }
      row.appendChild(qty);
      row.appendChild(nameEl);
      if (rarity) {
        var rar = document.createElement('span');
        rar.className = 'badge badge-' + rarity.toLowerCase();
        rar.textContent = rarity;
        row.appendChild(rar);
      }
      if (finish) {
        var fin = document.createElement('span');
        fin.className = 'badge badge-finish';
        fin.textContent = finish;
        row.appendChild(fin);
      }
      var cond = document.createElement('span');
      cond.className = 'summary-cond';
      cond.textContent = card.condition;
      row.appendChild(cond);
      body.appendChild(row);
    });
  });
}

function getSellerInfo() {
  var activeChips = Array.from(document.querySelectorAll('.chip.active')).map(function(c) { return c.dataset.value; });
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

// ── Step 4 ─────────────────────────────────────────────────────────────────────
document.getElementById('btn-back-3').addEventListener('click', function() { goToStep(3); });
document.getElementById('btn-copy').addEventListener('click', function() {
  var text = document.getElementById('ad-output').textContent;
  if (!text) { showToast('Nothing to copy'); return; }
  navigator.clipboard.writeText(text)
    .then(function() { showToast('Copied to clipboard!'); })
    .catch(function() {
      var ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Copied to clipboard!');
    });
});

document.querySelectorAll('.output-tab').forEach(function(tab) {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.output-tab').forEach(function(t) { t.classList.remove('active'); });
    document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    if (tab.dataset.tab === 'preview') {
      var text = document.getElementById('ad-output').textContent;
      document.getElementById('ad-preview').innerHTML = renderDiscordMarkdown(text);
    }
  });
});

function renderDiscordMarkdown(text) {
  return text.split('\n').map(function(line) {
    line = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    line = line.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
    line = line.replace(/__(.*?)__/g, '<u>$1</u>');
    line = line.replace(/~~(.*?)~~/g, '<s>$1</s>');
    return '<p>' + line + '</p>';
  }).join('');
}

// ── Step nav ───────────────────────────────────────────────────────────────────
document.querySelectorAll('.step').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var n = parseInt(btn.dataset.step);
    if (n < currentStep) goToStep(n);
  });
});

// ── Init ───────────────────────────────────────────────────────────────────────
loadPrices();
