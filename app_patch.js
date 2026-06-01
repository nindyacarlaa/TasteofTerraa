/* ============================================================
   app_patch.js — Taste of Terra
   Fix: previousPage tracking, back navigation, category feed,
        search feed, copyright footer, "tidak ada resep" center
   ============================================================ */

// ============================================================
//  FIX: previousPage tracking — catat halaman aktif saat pindah
// ============================================================
const _origShowPage = window.showPage;
window.showPage = function(pageId) {
  const currentActive = document.querySelector('.page.active');
  if (currentActive && pageId === 'page-detail') {
    window.previousPage = currentActive.id;
  }
  if (_origShowPage) _origShowPage(pageId);
  else {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(pageId);
    if (target) target.classList.add('active');
  }
};

// ============================================================
//  FIX: openRecipe — catat previousPage sebelum buka detail
// ============================================================
const _origOpenRecipe = window.openRecipe;
window.openRecipe = function(id, fromPage) {
  const currentActive = document.querySelector('.page.active');
  window.previousPage = fromPage || (currentActive ? currentActive.id : 'page-landing');
  if (_origOpenRecipe) _origOpenRecipe(id, fromPage);
};

// ============================================================
//  FIX: goBackFromDetail — kembali ke halaman yang benar
// ============================================================
window.goBackFromDetail = function() {
  if (window.commentsUnsubscribe) { window.commentsUnsubscribe(); window.commentsUnsubscribe = null; }
  window.currentRecipeId = null;
  window.replyTargetId = null;
  const prev = window.previousPage || 'page-landing';
  const validPages = ['page-landing', 'page-search', 'page-category', 'page-home-public', 'page-home'];
  const target = validPages.includes(prev) ? prev : 'page-landing';
  const targetEl = document.getElementById(target);
  if (targetEl) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    targetEl.classList.add('active');
  } else {
    showPage('page-landing');
  }
};

// ============================================================
//  SVG ART: category cards di homepage
// ============================================================
function renderHomeCategoryArt() {
  const svgMap = {
    'hcat-dessert': `<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="160" height="120" fill="#8B1A1A"/><ellipse cx="80" cy="88" rx="50" ry="18" fill="#C8B898" opacity="0.5"/><rect x="52" y="52" width="56" height="36" rx="8" fill="#E4D5BA" opacity="0.95"/><ellipse cx="80" cy="52" rx="28" ry="12" fill="#FAF5EE"/><ellipse cx="80" cy="44" rx="18" ry="7" fill="#E4D5BA"/><circle cx="80" cy="36" r="7" fill="#7B1C1C" opacity="0.8"/><rect x="77" y="22" width="6" height="14" rx="3" fill="#9a7a6a"/><rect x="60" y="72" width="8" height="12" rx="2" fill="#C8B898" opacity="0.6"/><rect x="76" y="72" width="8" height="12" rx="2" fill="#C8B898" opacity="0.6"/><rect x="92" y="72" width="8" height="12" rx="2" fill="#C8B898" opacity="0.6"/></svg>`,
    'hcat-sidedish': `<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="160" height="120" fill="#6B1515"/><ellipse cx="80" cy="85" rx="58" ry="18" fill="#C8B898" opacity="0.4"/><ellipse cx="80" cy="72" rx="54" ry="24" fill="#E4D5BA" opacity="0.9"/><ellipse cx="65" cy="66" rx="14" ry="10" fill="#2d6a2d" opacity="0.85"/><ellipse cx="85" cy="62" rx="12" ry="9" fill="#e67e22" opacity="0.8"/><ellipse cx="95" cy="70" rx="10" ry="8" fill="#c0392b" opacity="0.7"/><ellipse cx="72" cy="74" rx="9" ry="6" fill="#f39c12" opacity="0.7"/><rect x="22" y="88" width="116" height="6" rx="3" fill="#C8B898" opacity="0.6"/></svg>`,
    'hcat-appetizer': `<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="160" height="120" fill="#7B1C1C"/><rect x="20" y="40" width="120" height="56" rx="10" fill="#E4D5BA" opacity="0.9"/><rect x="32" y="54" width="22" height="28" rx="5" fill="#e67e22" opacity="0.85"/><rect x="60" y="54" width="22" height="28" rx="5" fill="#c0392b" opacity="0.85"/><rect x="88" y="54" width="22" height="28" rx="5" fill="#2d6a2d" opacity="0.85"/><rect x="116" y="54" width="14" height="28" rx="4" fill="#9B59B6" opacity="0.7"/><rect x="18" y="90" width="124" height="8" rx="4" fill="#C8B898" opacity="0.7"/></svg>`,
    'hcat-diet': `<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="160" height="120" fill="#5a1212"/><circle cx="80" cy="65" r="42" fill="#E4D5BA" opacity="0.9"/><ellipse cx="68" cy="58" rx="13" ry="16" fill="#2d6a2d" opacity="0.85"/><circle cx="92" cy="55" rx="11" fill="#e67e22" opacity="0.8"/><ellipse cx="80" cy="72" rx="16" ry="8" fill="#c0392b" opacity="0.7"/><circle cx="63" cy="45" r="5" fill="#2d6a2d" opacity="0.7"/><circle cx="95" cy="68" r="4" fill="#f39c12" opacity="0.7"/><ellipse cx="80" cy="105" rx="48" ry="8" fill="#C8B898" opacity="0.35"/></svg>`
  };
  Object.entries(svgMap).forEach(([id, svg]) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = svg;
  });
}

// ============================================================
//  SVG placeholder untuk slider cards
// ============================================================
function renderSliderPlaceholders() {
  const el0 = document.getElementById('slider-card-0');
  const el1 = document.getElementById('slider-card-1');
  if (el0) el0.innerHTML = `<svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="300" height="200" fill="#5a1212"/><rect x="80" y="60" width="140" height="100" rx="12" fill="#3a0808" opacity="0.7"/><rect x="110" y="75" width="80" height="70" rx="8" fill="#C8B898" opacity="0.4"/><circle cx="150" cy="110" r="25" fill="#E4D5BA" opacity="0.5"/><rect x="130" y="95" width="40" height="30" rx="4" fill="#9a7a6a" opacity="0.7"/></svg>`;
  if (el1) el1.innerHTML = `<svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="300" height="200" fill="#2a1a0a"/><circle cx="150" cy="105" r="60" fill="#3a2010" opacity="0.7"/><ellipse cx="150" cy="115" rx="55" ry="20" fill="#8B4513" opacity="0.5"/><circle cx="138" cy="98" r="12" fill="#E4D5BA" opacity="0.6"/><circle cx="165" cy="95" r="10" fill="#f39c12" opacity="0.5"/><ellipse cx="150" cy="120" rx="40" ry="12" fill="#C8B898" opacity="0.4"/></svg>`;
  if (window.FoodImages && window.FoodImages.seedSVG) {
    if (FoodImages.seedSVG['brownies'] && el0) el0.innerHTML = FoodImages.seedSVG['brownies'];
    if (FoodImages.seedSVG['ramen'] && el1) el1.innerHTML = FoodImages.seedSVG['ramen'];
  }
}

// ============================================================
//  Update slider dengan data Firebase
// ============================================================
function updateSliderWithFirebaseData() {
  const recipes = window._searchRecipes || window.allFirebaseRecipes || [];
  const slider  = document.getElementById('home-slider');
  if (!slider || !recipes.length) return;

  recipes.slice(0, 2).forEach((r, i) => {
    const card    = slider.children[i];
    if (!card) return;

    // Update judul
    const titleEl = card.querySelector('.slider-card-title');
    if (titleEl) titleEl.textContent = r.name.toUpperCase();

    // Update onclick
    card.onclick = () => openRecipe(r.id, 'page-landing');

    // Update gambar
    const svgWrap = card.querySelector('.slider-svg-wrap');
    if (svgWrap && window.FoodImages) {
      svgWrap.innerHTML = FoodImages.renderCardImage(r, i);
    }
  });
}

// ============================================================
//  SEARCH PAGE
// ============================================================
function goSearch() {
  window.previousPage = (document.querySelector('.page.active') || {}).id || 'page-landing';
  const input = document.getElementById('search-input-search');
  if (input) input.value = '';
  showPage('page-search');
  // Render langsung pakai data yang sudah ada
  renderSearchFeed('');
  setTimeout(() => { if (input) input.focus(); }, 100);
}

function renderSearchFeed(term) {
  const feed = document.getElementById('recipe-feed-search');
  if (!feed) return;
  // Baca dari window._searchRecipes (diisi oleh patch RecipeService.onRecipesChanged)
  // atau fallback ke allFirebaseRecipes jika tersedia
  let recipes = window._searchRecipes || window.allFirebaseRecipes || [];
  if (term && term.trim()) {
    const q = term.trim().toLowerCase();
    recipes = recipes.filter(r =>
      (r.name || '').toLowerCase().includes(q) ||
      (r.desc || '').toLowerCase().includes(q) ||
      (r.author || '').toLowerCase().includes(q) ||
      (r.ingredients || []).some(ing => (typeof ing === 'string' ? ing : '').toLowerCase().includes(q))
    );
  }
  if (!recipes.length) {
    feed.innerHTML = `<div class="no-results">🔍 ${term && term.trim()
      ? `Tidak ada resep untuk "<strong>${term}</strong>"`
      : 'Belum ada resep tersedia'}</div>`;
    return;
  }
  feed.innerHTML = recipes.map((r, i) => `
    <div class="recipe-card" onclick="openRecipe('${r.id}', 'page-search')">
      <div class="rc-img">${window.FoodImages ? FoodImages.renderCardImage(r, i) : ''}</div>
      <div class="rc-body">
        <div class="rc-name">${r.name}</div>
        <div class="rc-desc">${(r.desc || '').substring(0, 100)}…</div>
        <div class="rc-footer">
          <span class="rc-bookmark">⊘</span>
          <button class="more-btn" onclick="event.stopPropagation();openRecipe('${r.id}','page-search')">More</button>
        </div>
      </div>
    </div>
  `).join('');
}

function doSearchPage() {
  const term = (document.getElementById('search-input-search') || {}).value || '';
  renderSearchFeed(term);
}

// ============================================================
//  FIX: renderCategoryFeed — filter berdasarkan kategori
// ============================================================
function renderCategoryFeed(cat) {
  const feed = document.getElementById('recipe-feed-cat');
  if (!feed) return;
  feed.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;

  const recipes = window._searchRecipes || window.allFirebaseRecipes || [];

  // Alias tiap kategori untuk toleransi format berbeda
  const catAliases = {
    'dessert':   ['dessert'],
    'sidedish':  ['sidedish', 'side dish', 'side_dish', 'side-dish'],
    'appetizer': ['appetizer'],
    'dietfood':  ['dietfood', 'diet food', 'diet_food', 'diet-food', 'diet']
  };
  const validValues = catAliases[catNorm] || [catNorm];

  const filtered = recipes.filter(r => {
    const rCat = (r.category || r.kategori || '').toLowerCase().trim();
    return validValues.includes(rCat);
  });

  if (!filtered.length) {
    const labelMap = { dessert:'Dessert', sidedish:'Side Dish', appetizer:'Appetizer', dietfood:'Diet Food' };
    feed.innerHTML = `<div class="no-results">🍽 Belum ada resep ${labelMap[catNorm] || catNorm} tersedia</div>`;
    return;
  }

  feed.innerHTML = filtered.map((r, i) => `
    <div class="recipe-card" onclick="openRecipe('${r.id}', 'page-category')">
      <div class="rc-img">${window.FoodImages ? FoodImages.renderCardImage(r, i) : ''}</div>
      <div class="rc-body">
        <div class="rc-name">${r.name}</div>
        <div class="rc-desc">${(r.desc || '').substring(0, 100)}…</div>
        <div class="rc-footer">
          <span class="rc-bookmark">⊘</span>
          <button class="more-btn" onclick="event.stopPropagation();openRecipe('${r.id}','page-category')">More</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ============================================================
//  Override openCategory — update judul + render feed
// ============================================================
window.openCategory = function(cat) {
  const labels = { dessert:'DESSERT', sidedish:'SIDE DISH', appetizer:'APPETIZER', dietfood:'DIET FOOD' };
  const titleEl = document.getElementById('cat-page-title');
  if (titleEl) titleEl.textContent = labels[cat] || cat.toUpperCase();
  window.previousPage = (document.querySelector('.page.active') || {}).id || 'page-landing';
  window.activeCategory = cat;
  updateCatPageHeader();
  renderCategoryFeed(cat);
  showPage('page-category');
};

// ============================================================
//  CATEGORY PAGE header — update berdasarkan status login
// ============================================================
function updateCatPageHeader() {
  const btn = document.getElementById('cat-page-login-btn');
  if (!btn) return;
  if (window.currentUser) {
    btn.textContent = window.currentUser.name ? window.currentUser.name.split(' ')[0] : 'Profil';
    btn.onclick = () => goProfile();
  } else {
    btn.textContent = 'MASUK';
    btn.onclick = () => goToLogin();
  }
}

// ============================================================
//  DOMContentLoaded
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  renderHomeCategoryArt();
  renderSliderPlaceholders();

  // Update avatar di search header
  function updateSearchHeader() {
    const el = document.getElementById('hdr-ava-search');
    if (!el) return;
    if (window.currentUser?.avatarUrl) {
      el.innerHTML = `<img src="${window.currentUser.avatarUrl}" alt="">`;
    } else if (window.currentUser) {
      el.textContent = (window.currentUser.name || window.currentUser.email || '?')[0].toUpperCase();
      el.style.background = 'var(--maroon)';
      el.style.color = 'white';
    } else {
      el.textContent = '👤';
    }
  }
  updateSearchHeader();

  // Hook renderPublicFeed untuk update slider & category
  const originalRenderPublicFeed = window.renderPublicFeed;
  if (originalRenderPublicFeed) {
    window.renderPublicFeed = function(...args) {
      originalRenderPublicFeed.apply(this, args);
      updateSliderWithFirebaseData();
      if (window.activeCategory) renderCategoryFeed(window.activeCategory);
    };
  }

  // Patch startPublicFeedListener supaya sinkronkan ke window._searchRecipes
  // (variabel lokal allFirebaseRecipes di app_patched1.js tidak bisa di-intercept,
  //  jadi kita wrap RecipeService.onRecipesChanged langsung)
  const _origOnRecipesChanged = RecipeService.onRecipesChanged.bind(RecipeService);
  RecipeService.onRecipesChanged = function(onUpdate) {
    return _origOnRecipesChanged(function(recipes) {
      window._searchRecipes = recipes;
      onUpdate(recipes);
      // Auto-refresh halaman yang sedang aktif
      const activePage = (document.querySelector('.page.active') || {}).id;
      if (activePage === 'page-search') {
        const term = (document.getElementById('search-input-search') || {}).value || '';
        renderSearchFeed(term);
      }
      if (activePage === 'page-category' && window.activeCategory) {
        renderCategoryFeed(window.activeCategory);
      }
      updateSliderWithFirebaseData();
    });
  };

  // Modal overlay close on backdrop click
  const modal = document.getElementById('confirm-modal');
  if (modal) modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  const lrModal = document.getElementById('login-required-modal');
  if (lrModal) lrModal.addEventListener('click', e => { if (e.target === lrModal) closeLoginModal(); });
});
