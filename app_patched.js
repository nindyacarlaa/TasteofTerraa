/* ============================================================
   TASTE OF TERRA — app.js — v5 + Landing Page + Category Filter
   ============================================================ */

// ================================================================
//  GLOBAL STATE
// ================================================================
let currentUser         = null;
let currentRecipeId     = null;
let deleteTargetId      = null;
let addImgFile          = null;
let recipesUnsubscribe  = null;
let commentsUnsubscribe = null;
let allFirebaseRecipes  = [];
let replyTargetId       = null;
let activeCategory      = 'all';
let previousPage        = 'page-home-public'; // track where detail was opened from
let pendingAction       = null; // action to run after login

// ================================================================
//  DOM UTILS
// ================================================================
const $ = id => document.getElementById(id);

const showPage = id => {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  $(id).classList.add('active');
  window.scrollTo(0, 0);
};

function toast(msg, type = '') {
  const t = $('toast');
  t.textContent = msg;
  t.className   = 'toast show ' + type;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2800);
}

function initials(name = '') {
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function fmtDate(val) {
  if (!val) return 'baru saja';
  try {
    const d = val?.toDate ? val.toDate() : new Date(val);
    return d.toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  } catch { return '-'; }
}

// ================================================================
//  ALL RECIPES
// ================================================================
function getAllRecipes() { return [...allFirebaseRecipes]; }
function getRecipe(id)  { return getAllRecipes().find(r => r.id === id) || null; }

// ================================================================
//  CATEGORY HELPERS
// ================================================================
const CATEGORY_LABELS = {
  all:       'Semua',
  dessert:   '🍮 Dessert',
  sidedish:  '🥗 Side Dish',
  appetizer: '🥟 Appetizer',
  dietfood:  '🥦 Diet Food'
};

// Assign a default category to seed/legacy recipes by keyword matching
function guessCategory(recipe) {
  // Prioritaskan field category yang tersimpan di database
  if (recipe.category && recipe.category !== '') return recipe.category;
  // Fallback: tebak dari nama/deskripsi untuk resep lama tanpa field category
  const txt = (recipe.name + ' ' + (recipe.desc || '')).toLowerCase();
  if (/kue|dessert|brownies|tiramisu|cake|pudding|es |coklat|lava|martabak manis/.test(txt)) return 'dessert';
  if (/salad|tumis|sayur|sup|soup|urap|lalapan|sambal|side/.test(txt)) return 'sidedish';
  if (/sate|gorengan|tahu|tempe|lumpia|dimsum|appetizer|snack/.test(txt)) return 'appetizer';
  if (/diet|sehat|rendah|smoothie|oat|quinoa/.test(txt)) return 'dietfood';
  return 'dessert'; // fallback terakhir
}

function filterRecipesByCategory(recipes, cat) {
  if (!cat || cat === 'all') return recipes;
  return recipes.filter(r => guessCategory(r) === cat);
}

// ================================================================
//  BOOT
// ================================================================
window.addEventListener('DOMContentLoaded', () => {
  // Inject brand SVG on login page
  const brandImgEl = $('login-brand-svg');
  if (brandImgEl && window.FoodImages) brandImgEl.innerHTML = FoodImages.brandSVG;

  // Render landing category art
  renderLandingCategoryArt();

  // Init homepage slider auto-slide
  initHomeSlider();

  // Start public feed listener immediately (no login needed)
  startPublicFeedListener();

  // Auth state
  AuthService.onAuthStateChanged(async user => {
    if (user) {
      currentUser = user;
      await onLogin();
    } else {
      currentUser = null;
      // Stay on current public page — don't force redirect to login
      renderPublicHeader();
    }
  });
});

function renderLandingCategoryArt() {
  // Gambar SVG tiap category card
 const arts = {
  // Ganti nilai tiap key dengan tag <img> pakai URL gambar kamu:

  'cat-img-dessert':
    `<img src="IMAGEBOTI/dessert.jpg"
         style="width:100%;height:100%;object-fit:cover;display:block;">`,

  'cat-img-sidedish':
    `<img src="IMAGEBOTI/sd.jpg"
         style="width:100%;height:100%;object-fit:cover;display:block;">`,

  'cat-img-appetizer':
    `<img src="IMAGEBOTI/aot.jpg"
         style="width:100%;height:100%;object-fit:cover;display:block;">`,

  'cat-img-diet':
    `<img src="IMAGEBOTI/diet.jpg"
         style="width:100%;height:100%;object-fit:cover;display:block;">`
};
  Object.entries(arts).forEach(([id, svg]) => {
    const el = $(id);
    if (el) el.innerHTML = svg;
  });

  // Isi slider card 0 & 1 dengan SVG ilustrasi makanan
  const sliderSVGs = [
    `<svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id="bgrad0" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8B3A0F"/><stop offset="100%" stop-color="#3a0d0d"/></linearGradient></defs>
      <rect width="300" height="200" fill="#3a0d0d"/>
      <rect x="60" y="60" width="180" height="100" rx="12" fill="url(#bgrad0)"/>
      <rect x="75" y="75" width="75" height="70" rx="6" fill="#6b1e0c" opacity="0.9"/>
      <rect x="165" y="75" width="60" height="70" rx="6" fill="#5a1506" opacity="0.9"/>
      <rect x="75" y="115" width="75" height="5" rx="2" fill="#3a0d0d" opacity="0.5"/>
      <rect x="165" y="115" width="60" height="5" rx="2" fill="#3a0d0d" opacity="0.5"/>
      <ellipse cx="113" cy="82" rx="12" ry="5" fill="#C8813E" opacity="0.8"/>
      <ellipse cx="195" cy="85" rx="9" ry="4" fill="#C8813E" opacity="0.7"/>
      <circle cx="100" cy="92" r="3" fill="#FAF5EE" opacity="0.5"/>
      <circle cx="190" cy="96" r="2.5" fill="#FAF5EE" opacity="0.4"/>
    </svg>`,
    `<svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block" preserveAspectRatio="xMidYMid slice">
      <rect width="300" height="200" fill="#1a0f05"/>
      <ellipse cx="150" cy="130" rx="100" ry="30" fill="#6b3e10" opacity="0.5"/>
      <ellipse cx="150" cy="115" rx="95" ry="55" fill="#F5E6C8" stroke="#C8A87A" stroke-width="3"/>
      <ellipse cx="150" cy="105" rx="80" ry="38" fill="#E8B84B" opacity="0.85"/>
      <path d="M85 105 Q110 90 135 105 Q160 120 185 105 Q205 92 225 105" stroke="#C8813E" stroke-width="3" fill="none" opacity="0.7"/>
      <ellipse cx="130" cy="100" rx="18" ry="8" fill="#D4622A" opacity="0.9"/>
      <ellipse cx="170" cy="102" rx="14" ry="7" fill="#8B3A0F" opacity="0.8"/>
      <circle cx="148" cy="96" r="10" fill="#FAF5EE" opacity="0.9"/>
      <circle cx="148" cy="96" r="7" fill="#E8B84B"/>
      <path d="M120 60 Q122 50 120 40" stroke="#FAF5EE" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.4"/>
      <path d="M150 55 Q152 45 150 35" stroke="#FAF5EE" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.3"/>
      <path d="M180 60 Q182 50 180 40" stroke="#FAF5EE" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.4"/>
    </svg>`
  ];
  ['slider-card-0', 'slider-card-1'].forEach((id, i) => {
    const el = $(id);
    if (el) el.innerHTML = sliderSVGs[i];
  });

  // Landing hero art
  const heroArt = $('landing-hero-art');
  if (heroArt && window.FoodImages) {
    heroArt.innerHTML = FoodImages.brandSVG || '';
  }
}

// ================================================================
//  HOME SLIDER — DINAMIS DARI FIREBASE
// ================================================================
function initHomeSlider() {
  // Slider diisi setelah Firebase tiba via buildHomeSlider()
  // Fungsi ini sengaja kosong — dipanggil saat DOM belum ada kartu
}

function buildHomeSlider(recipes) {
  const slider   = $('home-slider');
  const dotsWrap = $('slider-dots');
  if (!slider || !dotsWrap) return;

  // Prioritaskan resep DENGAN gambar, max 5
  const withImg    = recipes.filter(r => r.image && r.image.trim() !== '');
  const withoutImg = recipes.filter(r => !r.image || r.image.trim() === '');

  // Gabung: yang ada foto dulu, sisanya belakang, total max 5
  const pool = [...withImg, ...withoutImg].slice(0, 5);
  if (pool.length === 0) return;

  // Palet fallback warna untuk kartu tanpa foto
  const gradients = [
    'linear-gradient(135deg,#7b1c1c,#3a0d0d)',
    'linear-gradient(135deg,#1a4a2e,#0d2a1a)',
    'linear-gradient(135deg,#1a2a4a,#0d1a2a)',
    'linear-gradient(135deg,#4a3a1a,#2a2010)',
    'linear-gradient(135deg,#3a1a4a,#200d2a)',
  ];

  slider.innerHTML = pool.map((r, i) => {
    const imgHTML = r.image
      ? `<img src="${r.image}" alt="${r.name.replace(/"/g,'&quot;')}"
              style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;"
              onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">`
      : '';
    const bg = gradients[i % gradients.length];
    const fallback = `<div style="${r.image ? 'display:none;' : 'display:flex;'}position:absolute;inset:0;width:100%;height:100%;
      align-items:center;justify-content:center;flex-direction:column;gap:8px;
      background:${bg};padding:12px;text-align:center;">
      <span style="font-size:36px">🍽</span>
      <span style="font-family:'Playfair Display',serif;font-size:11px;font-weight:700;color:rgba(255,255,255,0.8);
        text-transform:uppercase;letter-spacing:0.5px;line-height:1.3;">${r.name}</span>
    </div>`;
    return `<div class="slider-card" onclick="openRecipe('${r.id}','page-landing')" style="background:#3a0d0d;">
      <div class="slider-svg-wrap">${imgHTML}${fallback}</div>
      <div class="slider-card-overlay">
        <div class="slider-card-title">${r.name.toUpperCase()}</div>
      </div>
    </div>`;
  }).join('');

  // Render dots
  dotsWrap.innerHTML = pool.map((_,i) =>
    `<span class="slider-dot${i===0?' active':''}" data-index="${i}"></span>`
  ).join('');

  _startSliderAuto(slider, dotsWrap);
}

function _startSliderAuto(slider, dotsWrap) {
  if (window._sliderTimer) clearInterval(window._sliderTimer);

  const cards = slider.querySelectorAll('.slider-card');
  const dots  = dotsWrap.querySelectorAll('.slider-dot');
  if (cards.length < 2) return;

  let current  = 0;
  let isPaused = false;

  function goToSlide(idx) {
    current = (idx + cards.length) % cards.length;
    const w = cards[0].offsetWidth + parseInt(getComputedStyle(slider).gap || 0);
    slider.scrollTo({ left: current * w, behavior: 'smooth' });
    dots.forEach((d,i) => d.classList.toggle('active', i === current));
  }

  dots.forEach(dot => dot.addEventListener('click', () => {
    goToSlide(parseInt(dot.dataset.index));
    isPaused = true;
    setTimeout(() => { isPaused = false; }, 5000);
  }));

  slider.addEventListener('touchstart', () => { isPaused = true; }, { passive: true });
  slider.addEventListener('touchend', () => { setTimeout(() => { isPaused = false; }, 4000); }, { passive: true });
  slider.addEventListener('scroll', () => {
    const idx = Math.round(slider.scrollLeft / (cards[0].offsetWidth || 1));
    dots.forEach((d,i) => d.classList.toggle('active', i === idx));
    current = idx;
  }, { passive: true });

  window._sliderTimer = setInterval(() => {
    if (!isPaused) goToSlide(current + 1);
  }, 3000);
}

// ================================================================
//  AUTH FLOW
// ================================================================
function goToLogin() {
  showPage('page-login');
}

function goLanding() {
  if (commentsUnsubscribe) { commentsUnsubscribe(); commentsUnsubscribe = null; }
  currentRecipeId = null;
  replyTargetId   = null;
  showPage('page-landing');
}

function handleAvatarClick() {
  if (currentUser) {
    goProfile();
  } else {
    goToLogin();
  }
}

// Guard: require login to perform an action
function requireLogin(action) {
  if (currentUser) {
    action();
  } else {
    pendingAction = action;
    $('login-required-modal').classList.add('open');
  }
}

function closeLoginModal() {
  $('login-required-modal').classList.remove('open');
  pendingAction = null;
}

function switchTab(tab) {
  $('form-login').style.display    = tab === 'login'    ? 'block' : 'none';
  $('form-register').style.display = tab === 'register' ? 'block' : 'none';
  document.querySelectorAll('.tab-btn').forEach((b, i) => {
    b.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'register'));
  });
}

async function login() {
  const email = $('l-email').value.trim().toLowerCase();
  const pass  = $('l-pass').value;
  if (!email || !pass) return toast('Isi email dan password!', 'err');
  try {
    await AuthService.login(email, pass);
  } catch (e) {
    if (e.code === 'auth/user-not-found')     return toast('Email tidak terdaftar!', 'err');
    if (e.code === 'auth/wrong-password')     return toast('Password salah!', 'err');
    if (e.code === 'auth/invalid-credential') return toast('Email atau password salah!', 'err');
    if (e.code === 'auth/invalid-email')      return toast('Format email tidak valid!', 'err');
    toast('Login gagal: ' + e.message, 'err');
  }
}

async function register() {
  const name  = $('r-name').value.trim();
  const email = $('r-email').value.trim().toLowerCase();
  const pass  = $('r-pass').value;
  const bday  = $('r-bday').value;
  if (!name)           return toast('Masukkan nama kamu!', 'err');
  if (!email)          return toast('Masukkan email!', 'err');
  if (pass.length < 6) return toast('Password minimal 6 karakter!', 'err');
  try {
    await AuthService.register(email, pass, name, bday);
    toast('Akun berhasil dibuat! 🎉', 'ok');
  } catch (e) {
    if (e.code === 'auth/email-already-in-use') return toast('Email sudah terdaftar!', 'err');
    toast('Registrasi gagal: ' + e.message, 'err');
  }
}

async function logout() {
  if (recipesUnsubscribe)  { recipesUnsubscribe();  recipesUnsubscribe  = null; }
  if (commentsUnsubscribe) { commentsUnsubscribe(); commentsUnsubscribe = null; }
  await AuthService.logout();
  currentUser        = null;
  currentRecipeId    = null;
  allFirebaseRecipes = [];
  $('l-email').value = '';
  $('l-pass').value  = '';
  toast('Sampai jumpa! 👋');
  showPage('page-landing');
}

async function onLogin() {
  renderHeader();
  renderPublicHeader();
  // Run any pending action that required login
  if (pendingAction) {
    const action = pendingAction;
    pendingAction = null;
    closeLoginModal();
    action();
    return;
  }
  showPage('page-home');
  startFeedListener();
}

// ================================================================
//  HEADERS
// ================================================================
function renderHeader() {
  ['hdr-ava', 'hdr-ava-detail'].forEach(id => {
    const el = $(id);
    if (!el) return;
    if (currentUser?.avatarUrl) {
      el.innerHTML = `<img src="${currentUser.avatarUrl}" alt="ava" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    } else {
      el.textContent = initials(currentUser?.name || currentUser?.email || '?');
    }
  });
}

function renderLandingHeaderBtn() {
  const el = $('landing-header-btn');
  if (!el) return;
  if (currentUser) {
    // Sudah login — tampilkan avatar/inisial yang bisa diklik ke profil
    if (currentUser.avatarUrl) {
      el.innerHTML = `<div onclick="goProfile()" title="${currentUser.name || currentUser.email}"
        style="width:40px;height:40px;border-radius:50%;overflow:hidden;border:2px solid var(--beige-dark);cursor:pointer;flex-shrink:0;">
        <img src="${currentUser.avatarUrl}" alt="profil" style="width:100%;height:100%;object-fit:cover;">
      </div>`;
    } else {
      el.innerHTML = `<div onclick="goProfile()" title="${currentUser.name || currentUser.email}"
        style="width:40px;height:40px;border-radius:50%;background:var(--beige-dark);border:2px solid var(--beige);
               display:flex;align-items:center;justify-content:center;cursor:pointer;
               font-family:'Playfair Display',serif;font-weight:700;font-size:14px;color:var(--maroon);flex-shrink:0;">
        ${initials(currentUser.name || currentUser.email)}
      </div>`;
    }
  } else {
    // Belum login — tampilkan tombol MASUK
    el.innerHTML = `<button class="landing-login-btn" onclick="goToLogin()">MASUK</button>`;
  }
}

function renderPublicHeader() {
  renderLandingHeaderBtn();
  ['hdr-ava-pub', 'hdr-ava-cat', 'hdr-ava-detail'].forEach(id => {
    const el = $(id);
    if (!el) return;
    if (currentUser?.avatarUrl) {
      el.innerHTML = `<img src="${currentUser.avatarUrl}" alt="ava" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      el.title = currentUser.name || currentUser.email;
    } else if (currentUser) {
      el.textContent = initials(currentUser?.name || currentUser?.email || '?');
    } else {
      el.innerHTML = '👤';
      el.title = 'Masuk';
    }
  });
}

// ================================================================
//  PUBLIC FEED LISTENER (no login needed)
// ================================================================
function startPublicFeedListener() {
  if (recipesUnsubscribe) recipesUnsubscribe();
  recipesUnsubscribe = RecipeService.onRecipesChanged(recipes => {
    allFirebaseRecipes = recipes;
    window._searchRecipes = recipes;
    buildHomeSlider(recipes);
    renderPublicFeed();
    renderLandingFeatured();
    // Also refresh logged-in feed if active
    const term = $('search-input')?.value?.trim() || '';
    renderFeed(term);
  });
}

function renderLandingFeatured() {
  const el = $('landing-featured');
  if (!el) return;
  const recipes = getAllRecipes().slice(0, 8);
  if (!recipes.length) {
    el.innerHTML = '<div style="padding:20px;color:var(--beige-dark);font-style:italic">Memuat resep…</div>';
    return;
  }
  el.innerHTML = recipes.map((r, i) => `
    <div class="landing-featured-card" onclick="openRecipe('${r.id}', 'page-landing')">
      <div class="lf-img">${FoodImages.renderCardImage(r, i)}</div>
      <div class="lf-name">${r.name}</div>
    </div>
  `).join('');
}

// ================================================================
//  CATEGORY FILTER (shared between public & logged-in)
// ================================================================
function filterByCategory(cat, btn) {
  activeCategory = cat;
  // Update pills on BOTH bars
  document.querySelectorAll('.cat-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.cat === cat);
  });
  // Re-render whichever feed is visible
  const pubFeedVisible = $('page-home-public').classList.contains('active');
  if (pubFeedVisible) {
    renderPublicFeed();
  } else {
    renderFeed($('search-input')?.value?.trim() || '');
  }
}

function openCategory(cat) {
  activeCategory = cat;
  const labels = { dessert:'Dessert', sidedish:'Side Dish', appetizer:'Appetizer', dietfood:'Diet Food' };
  const el = $('cat-page-title');
  if (el) el.textContent = labels[cat] || cat;
  previousPage = 'page-category';
  renderCategoryFeed(cat);
  showPage('page-category');
}

function renderCategoryFeed(cat) {
  const feed = $('recipe-feed-cat');
  if (!feed) return;
  const recipes = filterRecipesByCategory(getAllRecipes(), cat);
  if (!recipes.length) {
    feed.innerHTML = `<div class="no-results">🔍 Belum ada resep untuk kategori ini</div>`;
    return;
  }
  feed.innerHTML = recipes.map((r, i) => `
    <div class="recipe-card" onclick="openRecipe('${r.id}', 'page-category')">
      <div class="rc-img">${FoodImages.renderCardImage(r, i)}</div>
      <div class="rc-body">
        <div class="rc-name">${r.name}</div>
        <div class="rc-desc">${r.desc.substring(0, 100)}…</div>
        <div class="rc-footer">
          <button class="rc-bookmark" onclick="event.stopPropagation()" title="Simpan">⊘</button>
          <button class="more-btn" onclick="event.stopPropagation();openRecipe('${r.id}', 'page-category')">More</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ================================================================
//  PUBLIC FEED
// ================================================================
function renderPublicFeed(term = '') {
  const feed = $('recipe-feed-pub');
  if (!feed) return;
  const searchTerm = term || ($('search-input-pub')?.value?.trim() || '');
  let recipes = getAllRecipes();

  if (activeCategory !== 'all') {
    recipes = filterRecipesByCategory(recipes, activeCategory);
  }

  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    recipes = recipes.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.desc.toLowerCase().includes(q) ||
      (r.author || '').toLowerCase().includes(q)
    );
  }

  if (!recipes.length) {
    feed.innerHTML = `<div class="no-results">🔍 ${searchTerm ? `Tidak ada resep "<strong>${searchTerm}</strong>"` : 'Belum ada resep'}</div>`;
    return;
  }

  feed.innerHTML = recipes.map((r, i) => `
    <div class="recipe-card" onclick="openRecipe('${r.id}', 'page-home-public')">
      <div class="rc-img">${FoodImages.renderCardImage(r, i)}</div>
      <div class="rc-body">
        <div class="rc-name">${r.name}</div>
        <div class="rc-desc">${r.desc.substring(0, 100)}…</div>
        <div class="rc-footer">
          <span class="rc-author">${r.author || 'Anonim'}</span>
          <button class="more-btn" onclick="event.stopPropagation();openRecipe('${r.id}','page-home-public')">More</button>
        </div>
      </div>
    </div>
  `).join('');
}

function doSearchPub() {
  renderPublicFeed($('search-input-pub').value.trim());
}

// ================================================================
//  LOGGED-IN FEED
// ================================================================
function startFeedListener() {
  // Already running from startPublicFeedListener; just re-render
  const term = $('search-input')?.value?.trim() || '';
  renderFeed(term);
}

function goHome() {
  if (commentsUnsubscribe) { commentsUnsubscribe(); commentsUnsubscribe = null; }
  currentRecipeId = null;
  replyTargetId   = null;
  if (currentUser) {
    showPage('page-home');
    renderFeed($('search-input')?.value?.trim() || '');
  } else {
    showPage('page-home-public');
    renderPublicFeed();
  }
}

function renderFeed(term = '') {
  const feed = $('recipe-feed');
  if (!feed) return;

  let recipes = getAllRecipes();

  if (activeCategory !== 'all') {
    recipes = filterRecipesByCategory(recipes, activeCategory);
  }

  if (term) {
    const q = term.toLowerCase();
    recipes = recipes.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.desc.toLowerCase().includes(q) ||
      (r.author || '').toLowerCase().includes(q)
    );
  }

  if (!recipes.length) {
    feed.innerHTML = `<div class="no-results">🔍 Tidak ada resep${term ? ` "<strong>${term}</strong>"` : ''}</div>`;
    return;
  }

  feed.innerHTML = recipes.map((r, i) => `
    <div class="recipe-card" onclick="openRecipe('${r.id}', 'page-home')">
      <div class="rc-img">${FoodImages.renderCardImage(r, i)}</div>
      <div class="rc-body">
        <div class="rc-name">${r.name}</div>
        <div class="rc-desc">${r.desc.substring(0, 100)}…</div>
        <div class="rc-footer">
          <span class="rc-author">${r.author || 'Anonim'}</span>
          <button class="more-btn" onclick="event.stopPropagation();openRecipe('${r.id}','page-home')">More</button>
        </div>
      </div>
    </div>
  `).join('');
}

function doSearch() {
  renderFeed($('search-input').value.trim());
}

// ================================================================
//  DETAIL
// ================================================================
async function openRecipe(id, fromPage) {
  if (fromPage) previousPage = fromPage;
  if (commentsUnsubscribe) { commentsUnsubscribe(); commentsUnsubscribe = null; }

  let r = getRecipe(id);
  if (!r) r = await RecipeService.getById(id);
  if (!r) return toast('Resep tidak ditemukan', 'err');

  currentRecipeId = id;
  replyTargetId   = null;

  // Hero
  const heroEl = document.querySelector('.detail-hero');
  heroEl.innerHTML = `
    ${FoodImages.renderHeroImage(r)}
    <div class="detail-hero-overlay">
      <div class="detail-hero-title">${r.name}</div>
    </div>
  `;

  $('detail-author').textContent = r.author || 'Anonim';

  // Category badge
  const badgeEl = $('detail-category-badge');
  if (badgeEl) {
    const cat = guessCategory(r);
    const catLabel = CATEGORY_LABELS[cat] || cat;
    badgeEl.textContent = catLabel;
    badgeEl.style.display = 'inline-block';
  }

  const oldBodyImg = $('detail-body-img');
  if (oldBodyImg) oldBodyImg.remove();

  $('detail-ingredients').innerHTML = (r.ingredients || []).map(i => `<li>${i}</li>`).join('');
  $('detail-steps').innerHTML = (r.steps || []).map((s, i) =>
    `<li><div class="step-n">${i+1}</div><span>${s}</span></li>`
  ).join('');

  // Render comment input area based on login state
  renderCommentInput();

  renderPublicHeader();
  renderHeader();
  startCommentsListener(id);
  showPage('page-detail');
}

function goBackFromDetail() {
  if (commentsUnsubscribe) { commentsUnsubscribe(); commentsUnsubscribe = null; }
  currentRecipeId = null;
  replyTargetId   = null;
  const dest = previousPage || (currentUser ? 'page-home' : 'page-landing');
  showPage(dest);
}

function renderCommentInput() {
  const row = $('comment-input-row');
  if (!row) return;
  if (currentUser) {
    row.innerHTML = `
      <div class="c-ava-input" id="cmt-ava">${initials(currentUser.name || currentUser.email)}</div>
      <textarea class="c-input" id="cmt-input" placeholder="Tulis komentar…" rows="1"
                onkeydown="cmtKey(event)"></textarea>
      <button class="c-send" onclick="sendComment()">➤</button>
    `;
    const avaEl = $('cmt-ava');
    if (avaEl && currentUser.avatarUrl) {
      avaEl.innerHTML = `<img src="${currentUser.avatarUrl}" alt="ava" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    }
  } else {
    row.innerHTML = `
      <div class="comment-login-prompt">
        <span>💬 Punya pendapat?</span>
        <button class="cmt-login-btn" onclick="requireLogin(() => openRecipe(currentRecipeId))">Masuk untuk berkomentar</button>
      </div>
    `;
  }
}

// ================================================================
//  COMMENTS — REALTIME + REPLY + DELETE
// ================================================================
function startCommentsListener(recipeId) {
  if (commentsUnsubscribe) { commentsUnsubscribe(); commentsUnsubscribe = null; }

  const list = $('comments-list');
  if (list) {
    list.innerHTML = '<div class="no-cmt">Memuat komentar… 💬</div>';

    if (list._cmtHandler) list.removeEventListener('click', list._cmtHandler);
    list._cmtHandler = function(e) {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      e.stopPropagation();
      const action = btn.dataset.action;
      const cmtId  = btn.dataset.cmt;
      const repId  = btn.dataset.rep;
      const author = btn.dataset.author;

      if (action === 'del-cmt')   deleteComment(cmtId);
      if (action === 'del-reply') deleteReply(cmtId, repId);
      if (action === 'reply') {
        if (!currentUser) {
          requireLogin(() => { startReply(cmtId, author); });
        } else {
          startReply(cmtId, author);
        }
      }
    };
    list.addEventListener('click', list._cmtHandler);
  }

  commentsUnsubscribe = CommentService.onCommentsChanged(recipeId, cmts => {
    if (currentRecipeId !== recipeId) return;
    renderComments(cmts);
  });
}

function renderComments(cmts) {
  const list = $('comments-list');
  if (!list) return;

  if (!cmts || !cmts.length) {
    list.innerHTML = '<div class="no-cmt">Belum ada komentar. Jadilah yang pertama! 💬</div>';
    return;
  }

  const esc = s => String(s).replace(/"/g, '&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  list.innerHTML = cmts.map(c => {
    const isOwn = currentUser && c.uid === currentUser.uid;
    const userAva = c.avatarUrl
      ? `<img src="${esc(c.avatarUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
      : initials(c.author || '?');
    const avaStyle = c.avatarUrl ? '' : 'background:var(--maroon);color:white';

    const repliesHtml = (c.replies || []).map(rep => {
      const repIsOwn = currentUser && rep.uid === currentUser.uid;
      const repAva   = rep.avatarUrl
        ? `<img src="${esc(rep.avatarUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
        : initials(rep.author || '?');
      const repAvaStyle = rep.avatarUrl ? '' : 'background:var(--maroon-mid);color:white';
      return `
        <div class="comment-item reply-item" style="margin-left:38px;margin-top:6px;">
          <div class="c-ava" style="${repAvaStyle}">${repAva}</div>
          <div class="c-body">
            <div class="c-name">${esc(rep.author || 'Anonim')}</div>
            <div class="c-text">${esc(rep.text)}</div>
            <div class="c-time">${fmtDate(rep.at)}</div>
          </div>
          ${repIsOwn ? `<button class="c-del-btn" data-action="del-reply" data-cmt="${esc(c.id)}" data-rep="${esc(rep.id)}" title="Hapus">🗑</button>` : ''}
        </div>`;
    }).join('');

    return `
      <div class="comment-item" id="cmt-${esc(c.id)}">
        <div class="c-ava" style="${avaStyle}">${userAva}</div>
        <div class="c-body">
          <div class="c-name">${esc(c.author || 'Anonim')}</div>
          <div class="c-text">${esc(c.text)}</div>
          <div class="c-time">${fmtDate(c.at)}
            <button class="c-reply-btn" data-action="reply" data-cmt="${esc(c.id)}" data-author="${esc(c.author || '')}">Balas</button>
          </div>
        </div>
        ${isOwn ? `<button class="c-del-btn" data-action="del-cmt" data-cmt="${esc(c.id)}" title="Hapus">🗑</button>` : ''}
      </div>
      ${repliesHtml}`;
  }).join('');

  list.scrollTop = list.scrollHeight;
}

function startReply(commentId, authorName) {
  replyTargetId = commentId;
  const input = $('cmt-input');
  if (input) {
    input.placeholder = `Membalas ${authorName || 'komentar ini'}…`;
    input.focus();
  }
  let replyLabel = $('reply-label');
  if (!replyLabel) {
    replyLabel = document.createElement('div');
    replyLabel.id = 'reply-label';
    replyLabel.className = 'reply-label';
    const inputRow = document.querySelector('.comment-input-row');
    if (inputRow) inputRow.insertBefore(replyLabel, inputRow.firstChild);
  }
  replyLabel.innerHTML = `<span>↩ Membalas ${authorName ? '<strong>' + authorName + '</strong>' : 'komentar'}</span><button onclick="cancelReply()">✕</button>`;
}

function cancelReply() {
  replyTargetId = null;
  const input = $('cmt-input');
  if (input) input.placeholder = 'Tulis komentar…';
  const lbl = $('reply-label');
  if (lbl) lbl.remove();
}

async function deleteComment(commentId) {
  if (!currentUser || !currentRecipeId) return;
  if (!commentId) return toast('ID komentar tidak valid', 'err');
  try {
    await CommentService.deleteComment(currentRecipeId, commentId);
    toast('Komentar dihapus.', 'ok');
  } catch (e) {
    toast('Gagal hapus komentar: ' + e.message, 'err');
  }
}

async function deleteReply(commentId, replyId) {
  if (!currentUser || !currentRecipeId) return;
  if (!commentId || !replyId) return toast('ID tidak valid', 'err');
  try {
    await CommentService.deleteReply(currentRecipeId, commentId, replyId);
    toast('Balasan dihapus.', 'ok');
  } catch (e) {
    toast('Gagal hapus balasan: ' + e.message, 'err');
  }
}

async function sendComment() {
  if (!currentUser) {
    requireLogin(() => openRecipe(currentRecipeId));
    return;
  }
  if (!currentRecipeId) return toast('Pilih resep dulu!', 'err');

  const input = $('cmt-input');
  const text  = input.value.trim();
  if (!text) return;

  try {
    const payload = {
      author:    currentUser.name || currentUser.email,
      uid:       currentUser.uid,
      avatarUrl: currentUser.avatarUrl || null,
      text
    };

    if (replyTargetId) {
      await CommentService.addReply(currentRecipeId, replyTargetId, payload);
      cancelReply();
    } else {
      await CommentService.add(currentRecipeId, payload);
    }
    input.value = '';
  } catch (e) {
    toast('Gagal kirim: ' + e.message, 'err');
  }
}

function cmtKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment(); }
}

// ================================================================
//  ADD RECIPE
// ================================================================
function goAddRecipe() {
  if (!currentUser) {
    requireLogin(goAddRecipe);
    return;
  }
  addImgFile = null;
  $('add-img-preview').style.display     = 'none';
  $('add-img-placeholder').style.display = 'none';
  $('add-img-art').style.display         = 'flex';
  ['add-name','add-desc','add-ing','add-steps','add-img-url'].forEach(id => $(id).value = '');
  // Reset category to first
  document.querySelectorAll('.cat-select-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
  $('add-category').value = 'dessert';
  showPage('page-add');
}

function selectCategory(btn) {
  // Hanya reset tombol di dalam form tambah resep, bukan semua halaman
  const form = document.getElementById('page-add');
  if (form) {
    form.querySelectorAll('.cat-select-btn').forEach(b => b.classList.remove('active'));
  } else {
    document.querySelectorAll('.cat-select-btn').forEach(b => b.classList.remove('active'));
  }
  btn.classList.add('active');
  $('add-category').value = btn.dataset.val;
  console.log('Kategori dipilih:', btn.dataset.val); // debug
}

function previewAddImg(input) {
  const file = input.files[0];
  if (!file) return;
  addImgFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    $('add-img-preview').src               = e.target.result;
    $('add-img-preview').style.display     = 'block';
    $('add-img-art').style.display         = 'none';
    $('add-img-placeholder').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

async function submitRecipe() {
  const name     = $('add-name').value.trim();
  const desc     = $('add-desc').value.trim();
  const ings     = $('add-ing').value.trim().split('\n').map(s => s.trim()).filter(Boolean);
  const steps    = $('add-steps').value.trim().split('\n').map(s => s.trim()).filter(Boolean);
  const imgUrl   = $('add-img-url').value.trim();
  // Baca kategori dari hidden input DAN dari tombol yang aktif (double check)
  let category = $('add-category').value;
  const activeBtn = document.querySelector('#page-add .cat-select-btn.active');
  if (activeBtn && activeBtn.dataset.val) {
    category = activeBtn.dataset.val; // prioritaskan tombol aktif
  }
  if (!category) category = 'dessert';

  if (!name)         return toast('Masukkan nama makanan!', 'err');
  if (!desc)         return toast('Masukkan deskripsi!', 'err');
  if (!ings.length)  return toast('Masukkan minimal 1 bahan!', 'err');
  if (!steps.length) return toast('Masukkan minimal 1 langkah!', 'err');

  const btn = document.querySelector('.submit-recipe');
  btn.textContent = '⏳ Menyimpan…';
  btn.disabled    = true;

  try {
    let imageToSave = imgUrl || null;

    if (addImgFile) {
      btn.textContent = '⏳ Mengunggah foto…';
      try {
        const compressed = await window._compressImage(addImgFile, 800, 0.75);
        const base64Data = compressed.split(',')[1];
        const byteChars  = atob(base64Data);
        const byteArr    = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
        const blob = new Blob([byteArr], { type: 'image/jpeg' });

        const ref = storage.ref(`recipes/${Date.now()}_${currentUser.uid}.jpg`);
        imageToSave = await Promise.race([
          ref.put(blob).then(snap => snap.ref.getDownloadURL()),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 20000))
        ]);
      } catch (uploadErr) {
        console.warn('Storage upload gagal, fallback ke base64:', uploadErr.message);
        imageToSave = await window._compressImage(addImgFile, 600, 0.65);
        toast('Foto disimpan lokal (Storage tidak tersedia)', '');
      }
    }

    btn.textContent = '⏳ Menyimpan resep…';
    await RecipeService.addDirect({
      name, desc,
      ingredients: ings,
      steps,
      category,
      image:    imageToSave,
      author:   currentUser.name || currentUser.email,
      authorId: currentUser.uid
    });

    toast('Resep berhasil dibagikan! 🍽', 'ok');
    addImgFile = null;
    goHome();

  } catch (e) {
    console.error('submitRecipe error:', e);
    toast('Gagal menyimpan: ' + (e.message || 'Coba lagi'), 'err');
  } finally {
    btn.textContent = '🍽 BAGIKAN RESEP';
    btn.disabled    = false;
  }
}

// ================================================================
//  PROFILE
// ================================================================
async function goProfile() {
  if (!currentUser) return goToLogin();

  showPage('page-profile');

  const lgEl = $('profile-ava-lg');
  if (currentUser.avatarUrl) {
    lgEl.innerHTML = `<img src="${currentUser.avatarUrl}" alt="ava" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
  } else {
    lgEl.textContent = initials(currentUser.name || currentUser.email);
    lgEl.style.color = 'var(--maroon)';
  }

  $('profile-name-display').textContent  = currentUser.name || currentUser.email;
  $('profile-email-display').textContent = currentUser.email;
  $('pf-name').value = currentUser.name || '';
  $('pf-bday').value = currentUser.bday  || '';

  $('stat-recipes').textContent  = '…';
  $('stat-comments').textContent = '…';
  $('my-recipes-section').innerHTML = '<div class="empty-profile">Memuat…</div>';

  try {
    const myRecipes    = await RecipeService.getByUser(currentUser.uid);
    const allRecipeIds = getAllRecipes().map(r => r.id);
    const totalCmt     = await CommentService.countByUser(currentUser.uid, allRecipeIds);

    $('stat-recipes').textContent  = myRecipes.length;
    $('stat-comments').textContent = totalCmt;

    const sec = $('my-recipes-section');
    if (!myRecipes.length) {
      sec.innerHTML = '<div class="empty-profile">Belum ada resep yang dibagikan</div>';
    } else {
      sec.innerHTML = myRecipes.map(r => {
        const thumb = r.image
          ? `<img class="my-recipe-img" src="${r.image}" onerror="this.style.display='none'" alt="${r.name}">`
          : (FoodImages.seedSVG?.[r.id]
              ? `<div class="my-recipe-img-svg">${FoodImages.seedSVG[r.id]}</div>`
              : '<div class="my-recipe-img-svg"></div>');
        return `
          <div class="my-recipe-item">
            ${thumb}
            <div class="my-recipe-name" onclick="openRecipe('${r.id}', 'page-profile')">${r.name}</div>
            <button class="my-recipe-delete" onclick="event.stopPropagation();askDelete('${r.id}')" title="Hapus">🗑</button>
          </div>`;
      }).join('');
    }

  } catch (e) {
    console.error('goProfile error:', e);
    $('stat-recipes').textContent  = '–';
    $('stat-comments').textContent = '–';
    $('my-recipes-section').innerHTML = '<div class="empty-profile">Gagal memuat data</div>';
    toast('Error memuat profil: ' + e.message, 'err');
  }
}

async function uploadAvatar(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = '';

  const btn = document.querySelector('.profile-edit-badge');
  const prevContent = btn ? btn.innerHTML : '';
  if (btn) btn.innerHTML = '⏳';

  try {
    toast('Mengunggah foto profil…');
    const url = await AuthService.uploadAvatar(currentUser.uid, file);
    currentUser.avatarUrl = url;
    const lgEl = $('profile-ava-lg');
    if (lgEl) lgEl.innerHTML = `<img src="${url}" alt="ava" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    renderHeader();
    renderPublicHeader();
    toast('Foto profil diperbarui! 📸', 'ok');
  } catch (e) {
    toast('Gagal upload foto: ' + e.message, 'err');
  } finally {
    if (btn) btn.innerHTML = prevContent;
  }
}

async function saveProfile() {
  const name = $('pf-name').value.trim();
  const bday = $('pf-bday').value;
  if (!name) return toast('Nama tidak boleh kosong!', 'err');
  const btn = document.querySelector('.save-profile-btn');
  if (btn) { btn.textContent = 'Menyimpan…'; btn.disabled = true; }
  try {
    const updated = await AuthService.updateUser(currentUser.uid, { name, bday });
    if (updated) {
      currentUser = { ...currentUser, ...updated };
    } else {
      currentUser.name = name;
      currentUser.bday = bday;
    }
    $('profile-name-display').textContent = currentUser.name || currentUser.email;
    $('pf-name').value = currentUser.name || '';
    $('pf-bday').value = currentUser.bday  || '';
    renderHeader();
    toast('Profil berhasil disimpan! ✅', 'ok');
  } catch (e) {
    toast('Gagal simpan: ' + e.message, 'err');
  } finally {
    if (btn) { btn.textContent = 'Simpan Perubahan'; btn.disabled = false; }
  }
}

// ================================================================
//  DELETE RECIPE
// ================================================================
function askDelete(id) {
  deleteTargetId = id;
  $('confirm-modal').classList.add('open');
}

function closeModal() {
  $('confirm-modal').classList.remove('open');
  deleteTargetId = null;
}

async function confirmDelete() {
  if (!deleteTargetId) return;
  try {
    await RecipeService.delete(deleteTargetId);
    closeModal();
    toast('Resep dihapus.', 'ok');
    goProfile();
  } catch (e) {
    toast('Gagal hapus: ' + e.message, 'err');
    closeModal();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const modal = $('confirm-modal');
  if (modal) modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  const lrModal = $('login-required-modal');
  if (lrModal) lrModal.addEventListener('click', e => { if (e.target === lrModal) closeLoginModal(); });
});
