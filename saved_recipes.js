/* ============================================================
   saved_recipes_patch.js — Taste of Terra  v3
   Fix: tombol kembali page tersimpan pakai addEventListener
        (bukan onclick string) agar pasti berfungsi
   ============================================================ */

// ================================================================
//  SVG ICONS
// ================================================================
const BM_ICON_EMPTY    = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
const BM_ICON_FILLED   = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
const BM_ICON_EMPTY_LG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
const BM_ICON_FILLED_LG= `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;

// ================================================================
//  SAVED RECIPES CORE — localStorage
// ================================================================
const SavedRecipes = {
  _key() {
    const uid = window.currentUser?.uid || 'guest';
    return `saved_recipes_${uid}`;
  },
  getIds() {
    try { return JSON.parse(localStorage.getItem(this._key()) || '[]'); }
    catch { return []; }
  },
  isSaved(id) { return this.getIds().includes(id); },
  toggle(id) {
    const ids = this.getIds();
    const idx = ids.indexOf(id);
    if (idx === -1) {
      ids.push(id);
      localStorage.setItem(this._key(), JSON.stringify(ids));
      return true;
    } else {
      ids.splice(idx, 1);
      localStorage.setItem(this._key(), JSON.stringify(ids));
      return false;
    }
  },
  count() { return this.getIds().length; },
  clear() { localStorage.removeItem(this._key()); }
};
window.SavedRecipes = SavedRecipes;

// ================================================================
//  TOGGLE BOOKMARK
// ================================================================
window.toggleBookmark = function(id, event) {
  if (event) { event.stopPropagation(); event.preventDefault(); }
  const isSaved = SavedRecipes.toggle(id);
  window.toast(isSaved ? 'Resep disimpan!' : 'Dihapus dari simpanan', isSaved ? 'ok' : '');
  _refreshBtnsForId(id);
  updateSavedBadge();
  if (document.getElementById('page-saved')?.classList.contains('active')) renderSavedPage();
};

function _refreshBtnsForId(id) {
  const saved = SavedRecipes.isSaved(id);
  document.querySelectorAll(`[data-bookmark-id="${id}"]`).forEach(btn => {
    const isLg   = btn.classList.contains('bm-lg');
    btn.innerHTML = saved ? (isLg ? BM_ICON_FILLED_LG : BM_ICON_FILLED)
                          : (isLg ? BM_ICON_EMPTY_LG  : BM_ICON_EMPTY);
    btn.title     = saved ? 'Hapus dari simpanan' : 'Simpan resep';
    btn.classList.toggle('bm-saved', saved);
  });
}

function updateSavedBadge() {
  const count = SavedRecipes.count();
  document.querySelectorAll('.saved-count-badge').forEach(el => {
    el.textContent   = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
  document.querySelectorAll('.btn-saved-label').forEach(el => {
    el.textContent = count > 0 ? `TERSIMPAN (${count})` : 'TERSIMPAN';
  });
}

// ================================================================
//  BOOKMARK BUTTON HTML
// ================================================================
function bookmarkBtnHTML(recipeId, large) {
  const saved   = SavedRecipes.isSaved(recipeId);
  const icon    = saved ? (large ? BM_ICON_FILLED_LG : BM_ICON_FILLED)
                        : (large ? BM_ICON_EMPTY_LG  : BM_ICON_EMPTY);
  return `<button
    class="rc-bookmark${large ? ' bm-lg' : ''}${saved ? ' bm-saved' : ''}"
    data-bookmark-id="${recipeId}"
    onclick="toggleBookmark('${recipeId}', event)"
    title="${saved ? 'Hapus dari simpanan' : 'Simpan resep'}">${icon}</button>`;
}
window.bookmarkBtnHTML = bookmarkBtnHTML;

// ================================================================
//  INJECT BOOKMARK KE FEED
// ================================================================
function _injectBookmarksInFeed(feedId) {
  const feed = document.getElementById(feedId);
  if (!feed) return;
  feed.querySelectorAll('.recipe-card').forEach(card => {
    const match = (card.getAttribute('onclick') || '').match(/openRecipe\('([^']+)'/);
    if (!match) return;
    const id = match[1];
    const staticBtn = card.querySelector('.rc-bookmark:not([data-bookmark-id])');
    if (staticBtn) {
      staticBtn.outerHTML = bookmarkBtnHTML(id);
    } else if (!card.querySelector('[data-bookmark-id]')) {
      const footer = card.querySelector('.rc-footer');
      if (footer) footer.insertAdjacentHTML('afterbegin', bookmarkBtnHTML(id));
    }
  });
}

function patchFeedRenderers() {
  [
    ['renderFeed',         'recipe-feed'],
    ['renderPublicFeed',   'recipe-feed-pub'],
    ['renderSearchFeed',   'recipe-feed-search'],
    ['renderCategoryFeed', 'recipe-feed-cat'],
  ].forEach(([fn, feedId]) => {
    const orig = window[fn];
    if (!orig) return;   // ← kalau belum ada, skip dulu
    window[fn] = function(...args) {
      orig.apply(this, args);
      _injectBookmarksInFeed(feedId);
    };
  });
}
// ================================================================
//  BOOKMARK DI HALAMAN DETAIL
// ================================================================
function injectDetailBookmarkBtn(recipeId) {
  if (!recipeId) return;
  const header = document.querySelector('#page-detail .header');
  if (!header) return;
  header.querySelectorAll('.detail-bm-btn').forEach(b => b.remove());

  const btn = document.createElement('button');
  const saved = SavedRecipes.isSaved(recipeId);
  btn.className = `detail-bm-btn rc-bookmark bm-lg${saved ? ' bm-saved' : ''}`;
  btn.setAttribute('data-bookmark-id', recipeId);
  btn.title     = saved ? 'Hapus dari simpanan' : 'Simpan resep';
  btn.innerHTML = saved ? BM_ICON_FILLED_LG : BM_ICON_EMPTY_LG;
  btn.addEventListener('click', e => { e.stopPropagation(); window.toggleBookmark(recipeId, e); });

  const ava = header.querySelector('#hdr-ava-detail');
  if (ava) header.insertBefore(btn, ava);
  else header.appendChild(btn);
}

const _origOpenRecipeBM = window.openRecipe;
window.openRecipe = function(id, fromPage) {
  const result = _origOpenRecipeBM ? _origOpenRecipeBM(id, fromPage) : undefined;
  setTimeout(() => injectDetailBookmarkBtn(id), 100);
  return result;
};

// ================================================================
//  NAVIGASI PAGE TERSIMPAN
// ================================================================
// Simpan halaman asal sebelum buka page-saved
window.goSavedRecipes = function() {
  const active = document.querySelector('.page.active');
  // Jangan simpan page-saved sebagai asal (mencegah loop)
  if (active && active.id !== 'page-saved') {
    window._savedFromPage = active.id;
  }
  renderSavedPage();
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById('page-saved');
  if (pg) pg.classList.add('active');
  window.scrollTo(0, 0);
};

// Kembali dari page-saved ke halaman asal
function _doGoBackFromSaved() {
  const valid  = ['page-landing','page-home','page-home-public','page-category','page-search'];
  const dest   = window._savedFromPage;
  const target = valid.includes(dest) ? dest : 'page-landing';
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(target);
  if (el) { el.classList.add('active'); window.scrollTo(0, 0); }
}
window.goBackFromSaved = _doGoBackFromSaved; // expose juga ke window jaga-jaga

// ================================================================
//  INJECT PAGE SAVED (dengan addEventListener, bukan onclick string)
// ================================================================
function injectSavedPage() {
  if (document.getElementById('page-saved')) return;

  // Buat elemen secara programatik agar event listener bisa ditambah langsung
  const page = document.createElement('div');
  page.id        = 'page-saved';
  page.className = 'page';

  // --- Header ---
  const header = document.createElement('div');
  header.className = 'header';

  const backBtn = document.createElement('button');
  backBtn.className = 'header-back-btn';
  backBtn.title     = 'Kembali';
  backBtn.innerHTML = `<span class="header-back-arrow">←</span><span class="header-back-label">Kembali</span>`;
  backBtn.addEventListener('click', _doGoBackFromSaved);          // ← addEventListener langsung

  const logo = document.createElement('div');
  logo.className   = 'header-logo';
  logo.textContent = 'TASTE OF TERRA';
  logo.style.cursor = 'pointer';
  logo.addEventListener('click', _doGoBackFromSaved);             // ← logo juga kembali

  const ava = document.createElement('div');
  ava.className = 'header-avatar';
  ava.id        = 'hdr-ava-saved';
  ava.innerHTML = '👤';
  ava.style.cssText = 'cursor:pointer;';
  ava.addEventListener('click', () => {
    if (window.handleAvatarClick) window.handleAvatarClick();
  });

  header.appendChild(backBtn);
  header.appendChild(logo);
  header.appendChild(ava);

  // --- Sub-header: judul + hapus semua ---
  const subHeader = document.createElement('div');
  subHeader.style.cssText = 'background:var(--beige-light);padding:14px 20px 12px;border-bottom:1px solid var(--beige-dark);flex-shrink:0;';
  subHeader.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="color:var(--maroon);display:flex;align-items:center;">${BM_ICON_FILLED_LG}</span>
        <span style="font-family:'Playfair Display',serif;font-size:20px;font-weight:900;color:var(--maroon);">Resep Tersimpan</span>
      </div>
      <button id="btn-clear-saved" style="background:none;border:1.5px solid var(--maroon);border-radius:14px;padding:5px 14px;font-size:12px;color:var(--maroon);cursor:pointer;font-family:'Playfair Display',serif;font-weight:700;flex-shrink:0;">
        Hapus Semua
      </button>
    </div>`;

  // --- Feed ---
  const scrollBody = document.createElement('div');
  scrollBody.className = 'scroll-body';
  const feed = document.createElement('div');
  feed.className = 'recipe-feed';
  feed.id        = 'recipe-feed-saved';
  feed.innerHTML = '<div class="no-results">Memuat…</div>';
  scrollBody.appendChild(feed);

  // --- Footer ---
  const footer = document.createElement('div');
  footer.className   = 'landing-footer';
  footer.textContent = 'copyright©alnin';

  page.appendChild(header);
  page.appendChild(subHeader);
  page.appendChild(scrollBody);
  page.appendChild(footer);

  document.getElementById('app').appendChild(page);

  // Tombol hapus semua — addEventListener setelah elemen ada di DOM
  document.getElementById('btn-clear-saved').addEventListener('click', () => {
    if (!confirm('Hapus semua resep tersimpan?')) return;
    SavedRecipes.clear();
    updateSavedBadge();
    document.querySelectorAll('[data-bookmark-id]').forEach(btn => {
      const isLg   = btn.classList.contains('bm-lg');
      btn.innerHTML = isLg ? BM_ICON_EMPTY_LG : BM_ICON_EMPTY;
      btn.classList.remove('bm-saved');
      btn.title = 'Simpan resep';
    });
    renderSavedPage();
    window.toast('Semua simpanan dihapus.', '');
  });
}

// ================================================================
//  RENDER ISI HALAMAN TERSIMPAN
// ================================================================
function renderSavedPage() {
  const feed = document.getElementById('recipe-feed-saved');
  if (!feed) return;

  const savedIds = SavedRecipes.getIds();
  if (!savedIds.length) {
    feed.innerHTML = `<div class="no-results" style="flex-direction:column;gap:8px;">
      <span style="font-size:36px;line-height:1;">${BM_ICON_FILLED_LG}</span>
      <span>Belum ada resep yang disimpan.</span>
      <small style="font-size:13px;color:var(--text-light);margin-top:4px;">Ketuk ikon bookmark pada resep untuk menyimpannya.</small>
    </div>`;
    return;
  }

  const all     = window._searchRecipes || window.allFirebaseRecipes || [];
  const recipes = savedIds.map(id => all.find(r => r.id === id)).filter(Boolean);

  if (!recipes.length) {
    feed.innerHTML = `<div class="no-results">Data resep belum termuat.<br><small style="font-size:13px;margin-top:6px;display:block">Coba buka halaman ini lagi sebentar.</small></div>`;
    return;
  }

  feed.innerHTML = recipes.map((r, i) => `
    <div class="recipe-card" onclick="openRecipe('${r.id}', 'page-saved')">
      <div class="rc-img">${window.FoodImages ? FoodImages.renderCardImage(r, i) : ''}</div>
      <div class="rc-body">
        <div class="rc-name">${r.name}</div>
        <div class="rc-desc">${(r.desc || '').substring(0, 100)}…</div>
        <div class="rc-footer">
          ${bookmarkBtnHTML(r.id)}
          <button class="more-btn" onclick="event.stopPropagation();openRecipe('${r.id}','page-saved')">More</button>
        </div>
      </div>
    </div>`).join('');
}

// ================================================================
//  TOMBOL TERSIMPAN DI SEMUA ACTION BAR
// ================================================================
function injectSavedButton() {
  document.querySelectorAll('.home-action-bar').forEach(bar => {
    if (bar.querySelector('.btn-saved-recipes')) return;
    const btn = document.createElement('button');
    btn.className = 'action-bar-btn btn-saved-recipes';
    btn.innerHTML = `
      <span class="btn-dot" style="position:relative;">
        ${BM_ICON_EMPTY}
        <span class="saved-count-badge" style="display:none;position:absolute;top:-6px;right:-6px;background:#e53e3e;color:white;border-radius:50%;width:15px;height:15px;font-size:9px;font-weight:700;align-items:center;justify-content:center;line-height:1;"></span>
      </span>
      <span class="btn-saved-label">TERSIMPAN</span>`;
    btn.addEventListener('click', () => window.goSavedRecipes());  // ← addEventListener
    bar.appendChild(btn);
  });
  updateSavedBadge();
}

// ================================================================
//  CSS
// ================================================================
function injectBookmarkCSS() {
  if (document.getElementById('bm-styles')) return;
  const s = document.createElement('style');
  s.id = 'bm-styles';
  s.textContent = `
    .rc-bookmark {
      background: none; border: none; cursor: pointer;
      color: var(--maroon); opacity: 0.55;
      transition: opacity 0.18s, transform 0.15s;
      padding: 2px 4px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      border-radius: 6px;
    }
    .rc-bookmark:hover { opacity: 1; transform: scale(1.2); }
    .rc-bookmark.bm-saved { opacity: 1; animation: bm-pop 0.22s ease; }
    @keyframes bm-pop {
      0%   { transform: scale(1); }
      50%  { transform: scale(1.5); }
      100% { transform: scale(1); }
    }
    .detail-bm-btn { margin-right: 4px; }
    #page-saved { display: none; flex-direction: column; }
    #page-saved.active { display: flex !important; }
    .saved-count-badge {
      display: none; position: absolute; top: -6px; right: -6px;
      background: #e53e3e; color: white; border-radius: 50%;
      width: 15px; height: 15px; font-size: 9px; font-weight: 700;
      align-items: center; justify-content: center; line-height: 1;
    }
  `;
  document.head.appendChild(s);
}

// ================================================================
//  INIT
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
  injectBookmarkCSS();
  injectSavedPage();
  injectSavedButton();
  setTimeout(patchFeedRenderers, 300);

  // Patch goBackFromDetail agar page-saved dikenali
  const _origGoBack = window.goBackFromDetail;
  if (_origGoBack) {
    window.goBackFromDetail = function() {
      if (window.previousPage === 'page-saved') {
        _doGoBackFromSaved();
        return;
      }
      _origGoBack();
    };
  }

  setTimeout(updateSavedBadge, 400);
});
