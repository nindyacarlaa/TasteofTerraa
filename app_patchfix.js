/* ============================================================
   app_patch4_fix.js — Taste of Terra — FINAL FIX
   Masalah: foto tidak muncul di search & category & tersimpan
   ============================================================ */

// ============================================================
//  1. CSS fix — rc-img harus punya height agar SVG tidak collapse
// ============================================================
(function() {
  const s = document.createElement('style');
  s.textContent = `
    .rc-img {
      min-height: 90px !important;
      height: auto !important;
      align-self: stretch !important;
      position: relative !important;
      overflow: hidden !important;
    }
    .rc-img > svg { 
      position: absolute; inset: 0;
      width: 100% !important; height: 100% !important; 
      display: block !important; 
    }
    .rc-img > div {
      position: absolute; inset: 0;
      width: 100%; height: 100%;
    }
    .rc-img > div > svg {
      width: 100%; height: 100%;
      display: block;
    }
  `;
  document.head.appendChild(s);
})();

// ============================================================
//  2. Override FoodImages setelah DOM siap
// ============================================================
(function waitFoodImages() {
  if (!window.FoodImages) { setTimeout(waitFoodImages, 50); return; }

  // Palette maroon — kontras dengan background beige rc-img
  FoodImages.getPlaceholderSVG = function(index) {
    index = index || 0;
    const pals = [
      { bg:'#7B1C1C', a:'#E4D5BA', b:'#FAF5EE' },
      { bg:'#5a1212', a:'#F0E6D3', b:'#E4D5BA' },
      { bg:'#8f2020', a:'#FAF5EE', b:'#C8B898' },
      { bg:'#3a0808', a:'#C8B898', b:'#F0E6D3' },
    ];
    var p = pals[index % pals.length];
    return '<svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block;">'
      + '<rect width="120" height="90" fill="' + p.bg + '"/>'
      + '<ellipse cx="60" cy="68" rx="35" ry="10" fill="' + p.a + '" opacity="0.2"/>'
      + '<path d="M25 55 Q25 78 60 78 Q95 78 95 55 Z" fill="' + p.a + '" opacity="0.3"/>'
      + '<ellipse cx="60" cy="55" rx="30" ry="8" fill="' + p.b + '" opacity="0.4"/>'
      + '<circle cx="48" cy="53" r="5" fill="' + p.b + '" opacity="0.6"/>'
      + '<circle cx="62" cy="51" r="6" fill="' + p.b + '" opacity="0.55"/>'
      + '<circle cx="75" cy="54" r="4" fill="' + p.b + '" opacity="0.6"/>'
      + '<rect x="57" y="32" width="3" height="15" rx="1.5" fill="' + p.a + '" opacity="0.7"/>'
      + '<rect x="53" y="27" width="2" height="9" rx="1" fill="' + p.a + '" opacity="0.6"/>'
      + '<rect x="60" y="27" width="2" height="9" rx="1" fill="' + p.a + '" opacity="0.6"/>'
      + '</svg>';
  };

  FoodImages.renderCardImage = function(recipe, index) {
    index = index || 0;
    if (recipe && recipe.image && typeof recipe.image === 'string' &&
        (recipe.image.startsWith('https://') || recipe.image.startsWith('http://') ||
         recipe.image.startsWith('data:') || recipe.image.startsWith('blob:'))) {
      return '<img src="' + recipe.image + '" alt="' + (recipe.name || '') + '" '
        + 'style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;" '
        + 'onerror="this.onerror=null;this.style.display=\'none\';'
        + 'var d=document.createElement(\'div\');d.style.cssText=\'position:absolute;inset:0;width:100%;height:100%;\';'
        + 'd.innerHTML=FoodImages.getPlaceholderSVG(' + index + ');this.parentElement.appendChild(d);">';
    }
    if (FoodImages.seedSVG && recipe && FoodImages.seedSVG[recipe.id]) {
      return FoodImages.seedSVG[recipe.id];
    }
    return FoodImages.getPlaceholderSVG(index);
  };

  console.log('FoodImages patched OK');
})();

// ============================================================
//  3. renderSearchFeed — baca dari window._searchRecipes ATAU
//     window.allFirebaseRecipes (fallback langsung ke variabel app)
// ============================================================
window.renderSearchFeed = function(term) {
  var feed = document.getElementById('recipe-feed-search');
  if (!feed) return;

  // Ambil data — coba semua sumber
  var recipes = window._searchRecipes
    || window.allFirebaseRecipes
    || (window.getAllRecipes ? window.getAllRecipes() : [])
    || [];

  if (term && term.trim()) {
    var q = term.trim().toLowerCase();
    recipes = recipes.filter(function(r) {
      return (r.name||'').toLowerCase().includes(q)
          || (r.desc||'').toLowerCase().includes(q)
          || (r.author||'').toLowerCase().includes(q)
          || (r.ingredients||[]).some(function(ing) {
               return (typeof ing==='string' ? ing : '').toLowerCase().includes(q);
             });
    });
  }

  if (!recipes.length) {
    feed.innerHTML = '<div class="no-results">🔍 '
      + (term && term.trim()
          ? 'Tidak ada resep untuk "<strong>' + term + '</strong>"'
          : 'Belum ada resep tersedia')
      + '</div>';
    return;
  }

  feed.innerHTML = recipes.map(function(r, i) {
    return '<div class="recipe-card" onclick="openRecipe(\'' + r.id + '\', \'page-search\')">'
      + '<div class="rc-img">' + (window.FoodImages ? FoodImages.renderCardImage(r, i) : '') + '</div>'
      + '<div class="rc-body">'
      + '<div class="rc-name">' + (r.name||'') + '</div>'
      + '<div class="rc-desc">' + (r.desc||'').substring(0,100) + '…</div>'
      + '<div class="rc-footer">'
      + '<span class="rc-bookmark">⊘</span>'
      + '<button class="more-btn" onclick="event.stopPropagation();openRecipe(\'' + r.id + '\',\'page-search\')">More</button>'
      + '</div></div></div>';
  }).join('');
};

// ============================================================
//  4. renderCategoryFeed — fix catNorm + baca data dari semua sumber
// ============================================================
window.renderCategoryFeed = function(cat) {
  var feed = document.getElementById('recipe-feed-cat');
  if (!feed) return;
  feed.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';

  var recipes = window._searchRecipes
    || window.allFirebaseRecipes
    || (window.getAllRecipes ? window.getAllRecipes() : [])
    || [];

  // FIX UTAMA: catNorm didefinisikan dari parameter cat
  var catNorm = (cat || '').toLowerCase().replace(/[\s\-_]+/g, '');

  var aliases = {
    dessert:   ['dessert'],
    sidedish:  ['sidedish', 'side dish', 'side_dish', 'side-dish', 'side'],
    appetizer: ['appetizer'],
    dietfood:  ['dietfood', 'diet', 'diet food', 'diet_food', 'diet-food']
  };
  var valid = aliases[catNorm] || [catNorm];

  var filtered = recipes.filter(function(r) {
    var rc = (r.category || r.kategori || '').toLowerCase().replace(/[\s\-_]+/g,'').trim();
    return valid.some(function(v) { return v.replace(/[\s\-_]+/g,'') === rc; });
  });

  var labels = { dessert:'Dessert', sidedish:'Side Dish', appetizer:'Appetizer', dietfood:'Diet Food' };
  if (!filtered.length) {
    feed.innerHTML = '<div class="no-results">🍽 Belum ada resep ' + (labels[catNorm]||catNorm) + ' tersedia</div>';
    return;
  }

  feed.innerHTML = filtered.map(function(r, i) {
    return '<div class="recipe-card" onclick="openRecipe(\'' + r.id + '\', \'page-category\')">'
      + '<div class="rc-img">' + (window.FoodImages ? FoodImages.renderCardImage(r, i) : '') + '</div>'
      + '<div class="rc-body">'
      + '<div class="rc-name">' + (r.name||'') + '</div>'
      + '<div class="rc-desc">' + (r.desc||'').substring(0,100) + '…</div>'
      + '<div class="rc-footer">'
      + '<span class="rc-bookmark">⊘</span>'
      + '<button class="more-btn" onclick="event.stopPropagation();openRecipe(\'' + r.id + '\',\'page-category\')">More</button>'
      + '</div></div></div>';
  }).join('');
};

// ============================================================
//  5. Patch goSearch() — pastikan data sudah ada sebelum render
// ============================================================
(function() {
  var origGoSearch = window.goSearch;
  window.goSearch = function() {
    // Sync data dulu dari allFirebaseRecipes jika _searchRecipes belum ada
    if (!window._searchRecipes && window.getAllRecipes) {
      window._searchRecipes = window.getAllRecipes();
    }
    if (origGoSearch) origGoSearch();
    else {
      window.previousPage = (document.querySelector('.page.active') || {}).id || 'page-landing';
      var input = document.getElementById('search-input-search');
      if (input) input.value = '';
      if (window.showPage) showPage('page-search');
      window.renderSearchFeed('');
      setTimeout(function() { if (input) input.focus(); }, 100);
    }
  };
})();

console.log('app_patch4_fix.js FINAL loaded OK');
