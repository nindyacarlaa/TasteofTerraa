/* ============================================================
   app_patch_scroll.js — Taste of Terra
   Fix 1: Action bar bisa di-scroll horizontal di HP
   Fix 2: Nama akun pembuat resep dipotong 7 karakter + "..."
   ============================================================ */

// ============================================================
//  1. CSS — action bar scrollable + author truncate 7 char
// ============================================================
(function injectScrollCSS() {
  const s = document.createElement('style');
  s.textContent = `
    /* === ACTION BAR: horizontal scroll di mobile === */
    .home-action-bar {
      overflow-x: auto !important;
      overflow-y: visible !important;
      flex-wrap: nowrap !important;
      -webkit-overflow-scrolling: touch !important;
      scroll-snap-type: x proximity !important;
      scrollbar-width: none !important;       /* Firefox */
      -ms-overflow-style: none !important;    /* IE/Edge */
      gap: 8px !important;
      padding-right: 20px !important;         /* jangan terpotong di kanan */
    }
    .home-action-bar::-webkit-scrollbar {
      display: none !important;               /* Chrome/Safari */
    }
    .action-bar-btn {
      flex-shrink: 0 !important;              /* tombol tidak mengecil */
      scroll-snap-align: start !important;
      white-space: nowrap !important;
    }

    /* === AUTHOR NAME: tampilkan maks 7 karakter + "..." === */
    .rc-author {
      display: inline-block !important;
      max-width: 7ch !important;              /* 7 karakter */
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      vertical-align: bottom !important;
    }
  `;
  document.head.appendChild(s);
})();

// ============================================================
//  2. Patch renderCardImage / feed render agar author dipotong
//     (untuk kartu yang sudah ada di DOM & yang baru dirender)
// ============================================================

// Helper: potong nama jadi 7 karakter + "..."
window._truncAuthor = function(name) {
  if (!name) return '';
  return name.length > 7 ? name.slice(0, 7) + '…' : name;
};

// ============================================================
//  3. Patch renderRecipeFeed (home feed) agar author terpotong
// ============================================================
(function patchHomeFeed() {
  function waitApp() {
    if (typeof window.renderRecipeFeed !== 'function') {
      setTimeout(waitApp, 80);
      return;
    }

    var origRender = window.renderRecipeFeed;
    window.renderRecipeFeed = function() {
      origRender.apply(this, arguments);
      // Setelah render, potong semua .rc-author di DOM
      _truncateAllAuthors();
    };

    console.log('renderRecipeFeed patched for author truncation');
  }
  waitApp();
})();

// ============================================================
//  4. Patch renderSearchFeed & renderCategoryFeed
// ============================================================
(function patchSearchCatFeed() {
  function waitFeeds() {
    var ready = typeof window.renderSearchFeed === 'function'
             && typeof window.renderCategoryFeed === 'function';
    if (!ready) { setTimeout(waitFeeds, 80); return; }

    var origSearch = window.renderSearchFeed;
    window.renderSearchFeed = function() {
      origSearch.apply(this, arguments);
      _truncateAllAuthors();
    };

    var origCat = window.renderCategoryFeed;
    window.renderCategoryFeed = function() {
      origCat.apply(this, arguments);
      _truncateAllAuthors();
    };

    console.log('renderSearchFeed & renderCategoryFeed patched for author truncation');
  }
  waitFeeds();
})();

// ============================================================
//  5. MutationObserver — potong author di kartu yang baru muncul
// ============================================================
function _truncateAllAuthors() {
  document.querySelectorAll('.rc-author').forEach(function(el) {
    var full = el.getAttribute('data-fullname') || el.textContent.trim();
    if (!el.getAttribute('data-fullname')) {
      el.setAttribute('data-fullname', full); // simpan nama asli untuk tooltip
    }
    el.title = full; // tooltip tampilkan nama lengkap saat hover
    if (full.length > 7) {
      el.textContent = full.slice(0, 7) + '…';
    }
  });
}

(function startObserver() {
  var observer = new MutationObserver(function(mutations) {
    var hasNew = mutations.some(function(m) {
      return m.addedNodes.length > 0;
    });
    if (hasNew) _truncateAllAuthors();
  });

  function attachObserver() {
    var targets = [
      document.getElementById('recipe-feed'),
      document.getElementById('recipe-feed-search'),
      document.getElementById('recipe-feed-cat'),
      document.getElementById('saved-recipe-list'),
    ].filter(Boolean);

    if (targets.length === 0) {
      setTimeout(attachObserver, 200);
      return;
    }

    targets.forEach(function(t) {
      observer.observe(t, { childList: true, subtree: true });
    });
    console.log('MutationObserver author-truncation aktif pada', targets.length, 'feed');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachObserver);
  } else {
    attachObserver();
  }
})();

console.log('app_patch_scroll.js loaded OK');
