document.addEventListener('DOMContentLoaded', () => {
  // گاردها برای جلوگیری از خطا اگر المان‌ها موجود نباشن
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = lightbox ? lightbox.querySelector('img') : null;
  const closeBtn = lightbox ? lightbox.querySelector('.lightbox-close') : null;
  const overlay = lightbox ? lightbox.querySelector('.lightbox-overlay') : null;
  const prevBtn = lightbox ? lightbox.querySelector('.prev') : null;
  const nextBtn = lightbox ? lightbox.querySelector('.next') : null;
  let images = [];
  let links = [];
  let currentIndex = 0;
  // جمع‌آوری تصاویر و لینک‌ها به‌صورت داینامیک (event delegation)
  document.addEventListener('click', (e) => {
    const card = e.target.closest && e.target.closest('.media-card');
    if (!card) return; // کلیک بیرون از کارت‌ها
    const img = card.querySelector('img');
    // const linkEl = card.querySelector('a'); // نگه داشته شده (بدون حذف)
    // اگر کلیک روی تصویر یا داخل تصویر بود → لایت‌باکس باز شود
    if (img && (e.target === img || img.contains(e.target))) {
      e.preventDefault();
      // بازسازی آرایه‌ها بر اساس وضعیت فعلی DOM (برای گالری‌های داینامیک)
      const cards = Array.from(document.querySelectorAll('.media-card'));
      images = cards.map(c => {
        const im = c.querySelector('img');
        return im ? im.src : '';
      });
      links = cards.map(c => {
        const a = c.querySelector('a');
        return a ? a.href : '#';
      });
      currentIndex = cards.indexOf(card);
      if (lightbox) openLightbox();
    }
  });
  function openLightbox() {
    if (!lightbox) return;
    if (lightbox.dataset.opening === '1') return;
    lightbox.dataset.opening = '1';
    lightbox.classList.remove('is-hidden');
    setTimeout(() => {
      lightbox.classList.add('active');
      if (lightboxImg) {
        lightboxImg.src = images[currentIndex] || '';
        lightboxImg.style.transform = 'scale(0.8)';
        setTimeout(() => lightboxImg.style.transform = 'scale(1)', 20);
      }
      // متن و لینک دکمه همزمان با باز شدن بروزرسانی شود
      let link = lightbox.querySelector('.lightbox-link');
      const lang = document.documentElement.getAttribute('lang');
      if (!link) {
        link = document.createElement('a');
        link.className = 'lightbox-link';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        // استایل‌های موقت (ترجیحاً در CSS قرار بگیرند)
        link.style.position = 'absolute';
        link.style.bottom = '20px';
        link.style.right = '20px';
        link.style.padding = '8px 16px';
        link.style.background = 'rgba(0,212,255,0.8)';
        link.style.color = '#000';
        link.style.fontWeight = 'bold';
        link.style.borderRadius = '8px';
        link.style.textDecoration = 'none';
        const contentEl = lightbox.querySelector('.lightbox-content');
        if (contentEl) contentEl.appendChild(link);
      }
      link.href = links[currentIndex] || '#';
      link.innerText = lang === 'ru' ? 'Смотрите сейчас!' : 'هم اکنون مشاهده کنید !';
      link.setAttribute('aria-label', lang === 'ru' ? 'Смотрите сейчас!' : 'هم اکنون مشاهده کنید !');

      setTimeout(() => { delete lightbox.dataset.opening; }, 400);
    }, 20);
  }
  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('active');
    setTimeout(() => lightbox.classList.add('is-hidden'), 300);
  }
  function prevImage() {
    if (!images.length) return;
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    openLightbox();
  }
  function nextImage() {
    if (!images.length) return;
    currentIndex = (currentIndex + 1) % images.length;
    openLightbox();
  }
  // Event Listeners
  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  if (overlay) overlay.addEventListener('click', closeLightbox);
  if (prevBtn) prevBtn.addEventListener('click', prevImage);
  if (nextBtn) nextBtn.addEventListener('click', nextImage);
  // کلیک روی تصویر داخل لایت‌باکس → باز کردن لینک فقط با Ctrl/Cmd
  if (lightboxImg) {
    lightboxImg.addEventListener('click', (e) => {
      if (e.ctrlKey || e.metaKey) {
        window.open(links[currentIndex] || '#', '_blank', 'noopener,noreferrer');
        return;
      }
      // در حالت عادی کلیک روی تصویر فقط تعامل درون لایت‌باکس را حفظ می‌کند
    });
  }
  // Keyboard navigation
  document.addEventListener('keydown', e => {
    if (!lightbox || !lightbox.classList.contains('active')) return;
    if (e.key === 'ArrowLeft') prevImage();
    if (e.key === 'ArrowRight') nextImage();
    if (e.key === 'Escape') closeLightbox();
  });
  // Swipe موبایل
  let touchStartX = 0;
  let touchEndX = 0;
  if (lightbox) {
    lightbox.addEventListener('touchstart', e => {
      if (!e.changedTouches || !e.changedTouches[0]) return;
      touchStartX = e.changedTouches[0].screenX;
    });
    lightbox.addEventListener('touchend', e => {
      if (!e.changedTouches || !e.changedTouches[0]) return;
      touchEndX = e.changedTouches[0].screenX;
      if (touchEndX < touchStartX - 50) nextImage();
      if (touchEndX > touchStartX + 50) prevImage();
    });
  }
  // نسخهٔ debounced از openLightbox در window (اگر نیاز باشه فراخوانی بشه)
  (function attachDebouncedOpen() {
    if (typeof openLightbox !== 'function') return;
    const _orig = openLightbox;
    let busy = false;
    window.openLightbox = function () {
      if (busy) return;
      busy = true;
      try {
        _orig();
      } finally {
        setTimeout(() => busy = false, 350);
      }
    };
  })();
}); // end DOMContentLoaded
/* =========================
   لودر و نمایش محتوای اصلی
========================= */
const loader = document.getElementById('loading-screen');
const mainContent = document.getElementById('main-content');
const loadingVideo = document.getElementById('loading-video');
// اگر mainContent موجود باشه مخفی کن (در غیر این صورت سکوت کن)
if (mainContent) mainContent.style.display = 'none';
// تابع محو شدن لودر
function fadeOutLoader() {
  if (!loader) return;
  loader.style.transition = "opacity 0.5s";
  loader.style.opacity = 0;
  setTimeout(() => {
    loader.style.display = "none";
    if (mainContent) mainContent.style.display = "block";
  }, 500);
}
// بررسی لود تصاویر (ایمن در برابر تقسیم بر صفر)
function checkImagesLoaded() {
  const imgs = document.images;
  if (!imgs || imgs.length === 0) return 1; // اگر تصویری نیست فرض می‌کنیم لود شده
  let loadedCount = 0;
  for (let img of imgs) {
    if (img.complete) loadedCount++;
  }
  return loadedCount / imgs.length; // نسبت تصاویر لود شده
}
// کنترل لودر و ویدیو
function handleLoading() {
  const loadRatio = checkImagesLoaded();

  if (loadRatio >= 0.5) { // حداقل 50٪ تصاویر لود شدند
    if (loadingVideo && typeof loadingVideo.addEventListener === 'function') {
      loadingVideo.addEventListener('ended', fadeOutLoader);
    }
    setTimeout(() => {
      fadeOutLoader();
    }, 1000); // جلوگیری از قفل شدن ویدیو
  } else {
    setTimeout(handleLoading, 200); // دوباره بررسی بعد 200ms
  }
}
// شروع بررسی بدون وابستگی به ترتیب لود
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { handleLoading(); });
} else {
  handleLoading();
}
function renderCard(item) {
  return `
    <article class="media-card" role="listitem" tabindex="0">
      <a href="${item.link}" target="_blank" rel="noopener noreferrer">
        <img src="${item.thumb}" alt="${item.alt || item.fa || 'media'}" loading="lazy">
      </a>
      <p class="lang-fa">${item.fa || ''}</p>
      <p class="lang-ru">${item.ru || ''}</p>
    </article>
  `;
}
function initGallery({ galleryId, btnId, manualData, fetchApiFn, pageSize = 8 }) {
  const gallery = document.getElementById(galleryId);
  const btn = document.getElementById(btnId);
  if (!gallery) { console.warn('initGallery: gallery not found', galleryId); return; }

  let page = 0;
  let DATA = [];
  let currentOrder = "oldest"; // "oldest" یا "newest"

  async function loadData() {
    let apiData = null;
    try {
      if (typeof fetchApiFn === 'function') apiData = await fetchApiFn();
    } catch (e) {
      console.warn('API fail for', galleryId, e);
    }
    DATA = apiData && apiData.length ? apiData : manualData || [];

    if (!DATA.length) {
      gallery.innerHTML = '<div class="api-error"><span class="lang-fa">هیچ پستی موجود نیست</span><span class="lang-ru">Нет постов</span></div>';
      if (btn) btn.style.display = 'none';
      return;
    }

    if (btn) btn.style.display = (DATA.length > pageSize) ? '' : 'none';
    renderNext();
  }

  function renderNext() {
    const start = page * pageSize;
    let slice = [];

    if (currentOrder === "oldest") {
      slice = DATA.slice(start, start + pageSize);
    } else {
      const reversed = DATA.length ? [...DATA].reverse() : [];
      slice = reversed.slice(start, start + pageSize);
    }

    if (slice.length === 0) {
      if (btn) btn.style.display = "none";
      return;
    }

    gallery.insertAdjacentHTML("beforeend", slice.map(renderCard).join(""));
    page++;

    if (page * pageSize >= DATA.length && btn) btn.style.display = "none";

    try {
      document.dispatchEvent(new CustomEvent('gallery:items-updated', {
        detail: { galleryId, rendered: slice.length, page }
      }));
    } catch (e) {
      console.warn('dispatch gallery:items-updated failed', e);
    }
  }

  // دکمه‌های مرتب‌سازی
  const existingNewest = gallery.parentElement.querySelector('.btn-sort.newest-' + galleryId);
  const existingOldest = gallery.parentElement.querySelector('.btn-sort.oldest-' + galleryId);

  if (!existingNewest) {
    const newestBtn = document.createElement("button");
    newestBtn.type = 'button';
    newestBtn.className = `btn-sort newest-${galleryId}`;
    newestBtn.setAttribute('aria-controls', galleryId);
    newestBtn.innerHTML = `
      <span class="lang-fa">جدیدترین‌ها</span>
      <span class="lang-ru">Сначала новые</span>
    `;
    newestBtn.addEventListener("click", () => {
      gallery.innerHTML = "";
      currentOrder = "newest";
      page = 0;
      if (btn) btn.style.display = (DATA.length > pageSize) ? '' : 'none';
      renderNext();
    });
    gallery.parentElement.insertBefore(newestBtn, gallery);
  }

  if (!existingOldest) {
    const oldestBtn = document.createElement("button");
    oldestBtn.type = 'button';
    oldestBtn.className = `btn-sort oldest-${galleryId}`;
    oldestBtn.setAttribute('aria-controls', galleryId);
    oldestBtn.innerHTML = `
      <span class="lang-fa">قدیمی‌ترین‌ها</span>
      <span class="lang-ru">Сначала старые</span>
    `;
    oldestBtn.addEventListener("click", () => {
      gallery.innerHTML = "";
      currentOrder = "oldest";
      page = 0;
      if (btn) btn.style.display = (DATA.length > pageSize) ? '' : 'none';
      renderNext();
    });
    gallery.parentElement.insertBefore(oldestBtn, gallery);
  }

  // اتصال دکمه نمایش بیشتر
  if (btn) {
    btn.removeEventListener('click', renderNext);
    btn.innerHTML = `
      <span class="lang-fa">نمایش بیشتر</span>
      <span class="lang-ru">Показать больше</span>
    `;
    btn.addEventListener("click", renderNext);
  }

  loadData();
}

/* ------------------ MANUAL DATA ------------------ */
const YT_MANUAL = [
  {thumb:"media/youtube/1.jpg", link:"https://www.youtube.com/@ivan.omgruss", fa:"ویدیو 1", ru:"Видео 1"},


];
const IG_MANUAL = [
  {thumb:"media/instagram/1.jpg", link:"https://www.instagram.com/p/ChnSyX3pC-7/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==", fa:"پست 1", ru:"Пост 1"},

];
/* ------------------ API FETCHERS ------------------ */
async function fetchYT() {
  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=CHANNEL_ID&maxResults=12&type=video&order=date&key=API_KEY`);
    if (!res.ok) throw new Error("YT API fail");
    const data = await res.json();
    return data.items.map(v => ({
      thumb: v.snippet.thumbnails.medium.url,
      link: `https://www.youtube.com/watch?v=${v.id.videoId}`,
      fa: v.snippet.title, ru: v.snippet.title
    }));
  } catch (err) {
    console.warn('fetchYT error, falling back to YT_MANUAL', err);
    return YT_MANUAL;
  }
}
async function fetchIG() {
  try {
    const res = await fetch(`/instagram-api-proxy`);
    if (!res.ok) throw new Error("IG API fail");
    const data = await res.json();
    return data.items.map(v => ({
      thumb: v.media_url,
      link: v.permalink,
      fa: v.caption || "", ru: v.caption || ""
    }));
  } catch (err) {
    console.warn('fetchIG error, falling back to IG_MANUAL', err);
    return IG_MANUAL;
  }
}
/* ------------------ INIT ------------------ */
document.addEventListener("DOMContentLoaded", () => {
  initGallery({
    galleryId: "ytGallery",
    btnId: "loadMoreYT",
    manualData: YT_MANUAL,
    fetchApiFn: fetchYT
  });
  initGallery({
    galleryId: "igGallery",
    btnId: "loadMoreIG",
    manualData: IG_MANUAL,
    fetchApiFn: fetchIG
  });
});
/* 1) استایل‌های پایه (در صورت نبود CSS خارجی) */
(function injectStyles(){
  if (document.getElementById('gallery-enhancements-style')) return;
  const css = `
    .lightbox-link{ position:absolute; bottom:20px; right:20px; padding:8px 16px; background:rgba(0,212,255,0.9); color:#000; font-weight:700; border-radius:8px; text-decoration:none; z-index:9999; }
    .api-error{ padding:18px; background:rgba(255,0,0,0.06); color:#fff; border-radius:8px; text-align:center; margin:12px 0; }
  `;
  const s = document.createElement('style');
  s.id = 'gallery-enhancements-style';
  s.appendChild(document.createTextNode(css));
  document.head.appendChild(s);
})();
/* 2) گارد برای checkImagesLoaded تا از تقسیم بر صفر جلوگیری شود */
(function safeCheckImagesLoaded(){
  if (typeof checkImagesLoaded !== 'function') return;
  const _orig = checkImagesLoaded;
  window.checkImagesLoaded = function(){
    const imgs = document.images;
    if (!imgs || imgs.length === 0) return 1; // اگر تصویری نیست فرض می‌کنیم لود شده
    let loadedCount = 0;
    for (let img of imgs) if (img.complete) loadedCount++;
    return loadedCount / imgs.length;
  };
})();
/* 3) جلوگیری از باز شدن همزمان لایت‌باکس (debounce کوتاه)
   - این بخش به صورت ایمن (در صورتی که openLightbox در window موجود باشد) کار می‌کند
*/
(function debounceOpenLightbox(){
  if (typeof window.openLightbox !== 'function') return;
  const _origOpen = window.openLightbox;
  let busy = false;
  window.openLightbox = function(){
    if (busy) return;
    busy = true;
    try{
      _origOpen();
    }finally{
      setTimeout(()=> busy = false, 350);
    }
  };
})();
/* 4) تابع کمکی نمایش ارور در گالری (برای استفاده توسط توسعه‌دهنده) */
function showGalleryError(galleryId, message){
  const g = document.getElementById(galleryId);
  if (!g) return;
  const el = document.createElement('div');
  el.className = 'api-error';
  el.innerText = message || 'خطا در بارگذاری';
  // حذف محتوا و نمایش پیام خطا (بدون حذف فایل اصلی کد)
  g.innerHTML = '';
  g.appendChild(el);
}