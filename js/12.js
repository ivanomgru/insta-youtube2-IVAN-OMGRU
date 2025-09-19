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
  let pageLinks = []; // ← اضافه شد
  let currentIndex = 0;

  // === NEW: کش برای نتایج اعتبارسنجی لینک‌ها (اجتناب از درخواست‌های مکرر) ===
  const linkValidationCache = new Map();

  // === NEW: تابع بررسی دسترسی لینک با HEAD و تایم‌اوت ایمن ===
  function checkLink(url, timeoutMs = 2500) {
    if (!url || url === '#' || url.trim() === '') return Promise.resolve(false);
    // اگر توی کش هست، نتیجه را برگردان
    if (linkValidationCache.has(url)) {
      return Promise.resolve(!!linkValidationCache.get(url));
    }
    return new Promise((resolve) => {
      let controller = null;
      let timedOut = false;
      if ('AbortController' in window) controller = new AbortController();
      const timer = setTimeout(() => {
        timedOut = true;
        try { if (controller) controller.abort(); } catch (e) {}
        resolve(false);
      }, timeoutMs);

      fetch(url, { method: 'HEAD', signal: controller ? controller.signal : undefined })
        .then(res => {
          clearTimeout(timer);
          const ok = !!(res && res.ok);
          linkValidationCache.set(url, ok);
          resolve(ok);
        })
        .catch(err => {
          clearTimeout(timer);
          // اگر HEAD با مشکل CORS یا خطا مواجه شد، قبول می‌کنیم که نامعتبر است.
          // (قابل توجه: بررسی مطمئن cross-origin همیشه ممکن نیست؛ این رو محافظه‌کارانه انجام دادیم)
          linkValidationCache.set(url, false);
          resolve(false);
        });
    });
  }

  // === NEW: انتخاب بهترین لینک نهایی برای ایندکس داده‌شده ===
  async function resolveBestLink(index) {
    const href = links[index] || '#';
    const pl = pageLinks[index] && pageLinks[index] !== '#' ? pageLinks[index] : null;

    // اگر href یک تصویر است و pageLink موجود است => تلاش کن pageLink رو استفاده کنی
    const isImage = !!String(href).match(/\.(jpe?g|png|gif|webp|svg|bmp)(?:[\?#]|$)/i);
    if (isImage && pl) {
      const ok = await checkLink(pl);
      if (ok) return pl;
      // اگر pageLink معتبر نبود، fallback به href
      return href;
    }

    // در حالت کلی: اول href (پیش‌فرض)، اگر نبود سعی کن pageLink را استفاده کنی، در نهایت '#'
    return href || pl || '#';
  }
  // ==================================================================

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
      // ← ساخت/به‌روزرسانی آرایه pageLinks از data-page-link روی <a>
      // تغییر: الان فقط attribute data-page-link را می‌گیریم (دیگه fallback به href نمیدیم)
      pageLinks = cards.map(c => {
        const a = c.querySelector('a');
        return a ? (a.getAttribute('data-page-link') || '') : '';
      });

      currentIndex = cards.indexOf(card);
      if (lightbox) openLightbox();
    }
  });

  async function openLightbox() {
    if (!lightbox) return;
    if (lightbox.dataset.opening === '1') return;
    lightbox.dataset.opening = '1';
    lightbox.classList.remove('is-hidden');
    setTimeout(async () => {
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

      // ← اکنون از pageLinks استفاده می‌کند (اگر موجود نبود، '#' خواهد بود)
      // اما: ابتدا لینک را موقتاً غیرفعال می‌کنیم تا زمان بررسی اعتبار آن
      // نکته: الان link ابتدا روی href قرار می‌گیرد (پیش‌فرض)، سپس ممکن است resolveBestLink آن را تغییر دهد
      link.href = links[currentIndex] || '#';
      link.setAttribute('aria-disabled', 'true');
      if (!link.dataset.origText) link.dataset.origText = link.innerText || '';
      link.innerText = lang === 'ru' ? 'در حال بررسی...' : 'در حال بررسی...';

      // بررسی غیرهمزمان و ست کردن لینک مناسب (با fallback به links[currentIndex])
      try {
        const best = await resolveBestLink(currentIndex);
        link.href = best || (links[currentIndex] || '#');
      } catch (e) {
        link.href = links[currentIndex] || '#';
      } finally {
        link.removeAttribute('aria-disabled');
        link.innerText = lang === 'ru' ? 'Смотрите сейчас!' : 'هم اکنون مشاهده کنید !';
        link.setAttribute('aria-label', lang === 'ru' ? 'Смотрите сейчас!' : 'هم اکنون مشاهده کنید !');
      }

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
        // اکنون سعی می‌کنیم از لینک داخل لایت‌باکس استفاده کنیم (که resolve شده است)
        const lbLink = lightbox ? lightbox.querySelector('.lightbox-link') : null;
        const targetHref = lbLink ? (lbLink.href || links[currentIndex] || '#') : (links[currentIndex] || '#');
        window.open(targetHref, '_blank', 'noopener,noreferrer');
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
      <a href="${item.link}" data-page-link="${item.pageLink || ''}" target="_blank" rel="noopener noreferrer">
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
  {"@id":"https://youtube.ivan-omgru.ir/media/youtube/1.jpg","thumb":"https://youtube.ivan-omgru.ir/media/youtube/1.jpg","link":"https://www.youtube.com/@ivan.omgruss","fa":"ویدیو معرفی سایت ivan_omgru","ru":"Видео: Введение в сайт ivan_omgru"}
];
const IG_MANUAL = [
  {"@id":"https://insta.ivan-omgru.ir/media/instagram/1.jpg","thumb":"https://insta.ivan-omgru.ir/media/instagram/1.jpg","link":"https://www.instagram.com/p/ChnSyX3pC-7/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==","pageLink":"https://insta.ivan-omgru.ir/posts/instagram1.html","fa":"پست 1","ru":"Пост 1"}
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
