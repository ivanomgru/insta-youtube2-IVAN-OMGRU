/* =========================
   Robust helpers & fallbacks
   — اضافه کن اولِ فایل یا بلافاصله بعد از DOMContentLoaded
   ========================= */

(async function __robustify__(){
  // یک fetch ایمن که 404/500 و JSON.parse خطا را هندل می‌کند
  async function safeFetchJSON(url, opts = {}) {
    try {
      const res = await fetch(url, opts);
      if (!res.ok) {
        console.warn('safeFetchJSON: non-ok response for', url, res.status);
        return null;
      }
      return await res.json().catch(err => {
        console.warn('safeFetchJSON: json parse failed for', url, err);
        return null;
      });
    } catch (err) {
      console.warn('safeFetchJSON: network/fetch failed for', url, err);
      return null;
    }
  }

  // جایگزین ساده برای fetch('/api/media') و هر fetch مشابه:
  // قبلا: const res = await fetch('/api/media'); const data = await res.json();
  // بعدا: const data = await safeFetchJSON('/api/media') || {};

  // نمونه: patch برای window.generateJSONLD و IIFEهایی که از /api/media استفاده می‌کنند
  // اگر در کدِ تو فراخوانی fetch('/api/media') داری، اون را به safeFetchJSON تغییر بده.
  // برای راحتی، همان تابع generateJSONLD را override (بدون حذفِ نسخهٔ قبلی) تعریف می‌کنیم
  // تا فراخوانی‌های موجود به generateJSONLD کار کنند.
  window.safeFetchJSON = window.safeFetchJSON || safeFetchJSON;

  // ====== fallback loader برای لوگو (چند آدرس را امتحان می‌کند) ======
  function tryLoadLogo(imgEl, candidates = []) {
    if (!imgEl) return;
    let i = 0;
    function tryNext() {
      if (i >= candidates.length) {
        console.warn('tryLoadLogo: no candidate worked', candidates);
        return;
      }
      imgEl.onerror = () => { i++; tryNext(); };
      imgEl.src = candidates[i];
    }
    tryNext();
  }

  // اگر در HTML عنصری با آیدی logo وجود دارد، آدرس‌های جایگزین را امتحان کن
  const logoEl = document.querySelector('img#logo, img.logo, img[alt*="logo"], img[src*="logo"]');
  if (logoEl) {
    tryLoadLogo(logoEl, [
      logoEl.getAttribute('data-src') || logoEl.src || '',
      '/media/logo.png',
      '/images/logo.png',
      '/assets/logo.png',
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="40"><rect width="100%" height="100%" fill="%23eee"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23666" font-size="14">Logo</text></svg>'
    ].filter(Boolean));
  }

  // ====== Guard برای initGallery / ytGallery ======
  // اگر در کد دیگری فراخوانی initGallery یا مشابه داری، مطمئن شو ابتدا عنصر وجود دارد:
  window.safeInitGallery = function(idOrEl, initFn) {
    try {
      const el = (typeof idOrEl === 'string') ? document.getElementById(idOrEl) : idOrEl;
      if (!el) {
        console.warn('safeInitGallery: gallery not found', idOrEl);
        return null;
      }
      if (typeof initFn === 'function') return initFn(el);
      return el;
    } catch (e) {
      console.error('safeInitGallery error', e);
      return null;
    }
  };

  // مثال استفاده (در صورتی که 12.js یا هر فایل دیگری این الگو را داشته باشد):
  // safeInitGallery('ytGallery', (el)=> initGallery(el)); // <-- اگر initGallery وجود داشته باشه اجرا میشه

  // ====== پَچ برای fetchIG errors (fallback to manual) ======
  // اگر تابع fetchIG در global وجود دارد، آن را wrap میکنیم تا روی failure به دادهٔ دستی بازگردد.
  if (window.fetchIG && typeof window.fetchIG === 'function') {
    const _origFetchIG = window.fetchIG;
    window.fetchIG = async function(...args) {
      try {
        return await _origFetchIG.apply(this, args);
      } catch (err) {
        console.warn('fetchIG wrapper: original fetchIG failed, returning manual fallback', err);
        // fallback: اگر window.manualPosts موجود است برگردان یا [] برگردان
        return (window.manualPosts && Array.isArray(window.manualPosts)) ? window.manualPosts : [];
      }
    };
  }

  // ====== Patch/Replace any plain fetch('/api/media') usages by adding a convenience wrapper
  // اگر جایی در کدت هنوز مستقیم از fetch('/api/media') استفاده می‌کنه و خطای 404 می‌ده
  // بهتره جایگزینش کنی با:
  //   const data = await safeFetchJSON('/api/media') || {};
  // اما برای احتیاط، در window یک helper قرار می‌دیم:
  window.getSiteMedia = window.getSiteMedia || (async function(){ 
    return await safeFetchJSON('/api/media') || {}; 
  });

  // ====== Robust delegated login toggle (اگر #loginIcon یا #loginPanel پیدا نشود) ======
  // این کد یک listener کلی اضافه می‌کند تا اگر المان‌های خوب شناسایی نشدند، با کلاس یا data-attribute هم کار کند.
  function ensureLoginToggle() {
    const loginIcon = document.getElementById('loginIcon');
    const loginPanel = document.getElementById('loginPanel');
    // اگر المان‌های دقیق موجودند کاری نکن (همان کد اصلی شما عمل خواهد کرد)
    if (loginIcon && loginPanel) return;
    // delegated: هر المنتی که data-login-toggle یا .login-toggle کلیک شود پنل را باز می‌کند
    document.addEventListener('click', function delegatedLogin(e){
      const t = e.target.closest('[data-login-toggle], .login-toggle, .js-login-toggle');
      if (!t) return;
      // تلاش برای یافتن پنل بر اساس id محتمل یا کلاس
      const panel = document.getElementById('loginPanel') || document.querySelector('.login-panel') || document.querySelector('[data-login-panel]');
      if (!panel) {
        console.warn('delegatedLogin: no loginPanel found');
        return;
      }
      // toggle کلاس active و نمایش
      if (panel.classList.contains('active')) {
        panel.classList.remove('active');
        panel.style.opacity = '0';
        setTimeout(()=>{ panel.style.display = 'none'; }, 220);
      } else {
        panel.classList.add('active');
        panel.style.display = 'block';
        void panel.offsetWidth;
        panel.style.opacity = '1';
      }
    });
  }
  ensureLoginToggle();

  // ====== Small dev helper: report missing critical elements ======
  setTimeout(()=> {
    const missing = [];
    if (!document.getElementById('loginIcon')) missing.push('#loginIcon');
    if (!document.getElementById('loginPanel')) missing.push('#loginPanel');
    if (!document.getElementById('manual-post-form')) missing.push('#manual-post-form');
    if (!document.getElementById('manual-posts-list')) missing.push('#manual-posts-list');
    if (missing.length) console.info('DOM missing (optional but recommended):', missing.join(', '));
  }, 600);

  // ====== font preload warning note (non-destructive) ======
  // در HTML اگر فونت را این‌طور preload کرده‌ای:
  // <link rel="preload" href="https://fonts.googleapis.com/css2?family=Vazir&display=swap">
  // بهتر است به این شکل تغییرش بدهی (یا اضافه کنی) تا هشدار gone:
  // <link rel="preload" href="https://fonts.googleapis.com/css2?family=Vazir&display=swap" as="style" onload="this.rel='stylesheet'">
  // یا ساده تر فقط استفاده کن:
  // <link href="https://fonts.googleapis.com/css2?family=Vazir&display=swap" rel="stylesheet">
  // این فقط توصیه‌ست — هیچ خطی حذف یا تغییر در HTML انجام نمیده؛ فقط بهت میگم چه عوض کنی.

  // ====== quick console test helper - اجرا کن در Console برای بررسیِ آنی ======
  window.__robustify_test = function() {
    console.log('safeFetchJSON present?', !!window.safeFetchJSON);
    console.log('logoEl', logoEl);
    console.log('manualPosts length', (window.manualPosts && window.manualPosts.length) || 0);
  };

})(); /* end __robustify__ */

document.addEventListener("DOMContentLoaded", () => {
  // ———— المان‌های لاگین و پنل مدیریت ————
  const loginIcon     = document.getElementById("loginIcon");
  const loginPanel    = document.getElementById("loginPanel");
  const loginSubmit   = document.getElementById("loginSubmit");
  const loginError    = document.getElementById("loginError");
  const adminPanel = document.getElementById("admin-panel-container");
  if (adminPanel) adminPanel.style.display = 'none';
  const logoutBtn     = document.getElementById("logoutBtn");
  // ———— المان‌های مدیریت پست‌های دستی ————
  const form          = document.getElementById("manual-post-form");
  const postsList     = document.getElementById("manual-posts-list");
  const manualSection = document.getElementById("manual-admin-section") || adminPanel;
  const apiSection    = document.getElementById('api-posts-section'); // ← اضافه شد

  // ============================
  // پایدارسازی و اصلاح رفتار پنل لاگین (افزوده — بدون حذف چیزِ قبلی)
  // ============================
  // اطمینان از مقداردهی اولیه نمایش/aria
  if (loginPanel) {
    // اگر کلاس active از قبل بود، نمایش بده، وگرنه پنهان کن
    if (loginPanel.classList.contains('active')) {
      loginPanel.style.display = loginPanel.style.display || 'block';
      loginPanel.setAttribute('aria-hidden','false');
    } else {
      // وقتی CSS مستقلِ شما ممکن است نمایش را کنترل کند، داخلی هم محافظت می‌کنیم
      if (!loginPanel.style.display) loginPanel.style.display = 'none';
      loginPanel.setAttribute('aria-hidden','true');
      // آماده‌سازی برای انیمیشن اگر لازم باشد
      loginPanel.style.opacity = loginPanel.classList.contains('active') ? '1' : '0';
      loginPanel.style.transition = loginPanel.style.transition || 'opacity 0.18s ease-in-out';
    }
  }

  // تابع باز/بستن ایمن پنل لاگین
  function openLoginPanel() {
    if (!loginPanel) return;
    loginPanel.classList.add('active');
    loginPanel.style.display = 'block';
    // force reflow قبل از انیمیت برای مطمئن شدن از transition
    void loginPanel.offsetWidth;
    loginPanel.style.opacity = '1';
    loginPanel.setAttribute('aria-hidden','false');
    // فوکوس روی اولین فیلد
    const userEl = document.getElementById('loginUsername');
    if (userEl) userEl.focus();
  }
  function closeLoginPanel() {
    if (!loginPanel) return;
    loginPanel.classList.remove('active');
    loginPanel.style.opacity = '0';
    loginPanel.setAttribute('aria-hidden','true');
    // اگر transition پایان نیافت، fallback بزنیم
    const onEnd = () => {
      loginPanel.style.display = 'none';
      loginPanel.removeEventListener('transitionend', onEnd);
      clearTimeout(fb);
    };
    loginPanel.addEventListener('transitionend', onEnd);
    const fb = setTimeout(() => {
      if (loginPanel) loginPanel.style.display = 'none';
      try { loginPanel.removeEventListener('transitionend', onEnd); } catch(e){}
    }, 300);
  }

  // جایگزینِ امن برای toggle اولیه — نگه داشتن خطوط قبلی اما پایدارتر
  function toggleLoginPanel(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (loginPanel?.classList.contains('active')) closeLoginPanel();
    else openLoginPanel();
  }

  // اطمینان از قابل‌کلیک بودن loginIcon حتی اگر عناصر داخلی داشته باشد
  if (loginIcon) {
    // اضافه کردن role/tabindex برای دسترسی اگر وجود ندارد
    if (!loginIcon.hasAttribute('role')) loginIcon.setAttribute('role','button');
    if (!loginIcon.hasAttribute('tabindex')) loginIcon.setAttribute('tabindex','0');

    // حذف listener قبلی stopPropagation (اگر وجود دارد) را اجازه بده — ولی ما addEventListener متوالی هم داریم
    loginIcon.addEventListener('click', (e) => {
      // اگر کلیک روی یک فرزند انجام شد، باید همچنان عمل کند
      e.stopPropagation();
      toggleLoginPanel(e);
    });

    // پشتیبانی از کیبورد
    loginIcon.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleLoginPanel(e);
      }
    });
  }

  // اگر پنل یا آیکون وجود ندارد، از خطای محتمل جلوگیری می‌کنیم (fail-safe)
  // (خطوط قبلی شما که loginPanel?.classList.toggle استفاده می‌کرد حفظ شده بود؛ اینجا تقویت شده است)

  // 🔹 تابع بروزرسانی نمایش بخش‌ها بر اساس API key
  function updateSectionsVisibility() {
    const isAdmin  = localStorage.getItem("isAdmin") === "true";
    const hasAPIKey = !!localStorage.getItem('apiKey');
    if (manualSection) manualSection.style.display = (isAdmin && !hasAPIKey) ? 'block' : 'none';
    if (apiSection)    apiSection.style.display    = (isAdmin &&  hasAPIKey) ? 'block' : 'none';
  }
  // صدا زدن اولیه
  updateSectionsVisibility();

  // بارگذاری پست‌های ذخیره‌شده
  let manualPosts = [];
  try {
    manualPosts = JSON.parse(localStorage.getItem("manualPosts") || "[]");
    if (!Array.isArray(manualPosts)) manualPosts = [];
  } catch(e) { manualPosts = []; }
  // بررسی وضعیت API
  window.manualPosts = manualPosts;

  // 🔹 نمایش/مخفی‌شدن فرم ورود
  // حذف نکردم: اما eventهای اضافی را امن‌تر کردم (stopPropagation روی submit کنترل شده)
  loginIcon?.addEventListener("click", e => {
    /* NOTE: این handler ممکن است دوبار اضافه شود ولی toggleLoginPanel از باز/بستن پشتیبانی می‌کند */
    e.stopPropagation();
    // همچنین به toggle اجازه می‌دهیم یکسان عمل کند
    toggleLoginPanel(e);
  });
  loginPanel?.addEventListener("click", e => e.stopPropagation());
  loginSubmit?.addEventListener("click", e => e.stopPropagation());

  // 🔹 رویداد کلیک روی دکمه ورود
  loginSubmit?.addEventListener("click", e => {
    e.preventDefault();
    const user = (document.getElementById("loginUsername")?.value || "").trim();
    const pass = (document.getElementById("loginPassword")?.value || "").trim();

    if (user === "1111" && pass === "1111") {
      loginPanel?.classList.remove("active");
      showAdminPanel();
      if (manualSection) manualSection.style.display = "block";
      if (loginError) loginError.textContent = "";
      const loginUsername = document.getElementById("loginUsername");
      if (loginUsername) loginUsername.value = "";
      localStorage.setItem("isAdmin", "true");
      updateSectionsVisibility(); // ← بروزرسانی نمایش بعد از ورود
      // بعد از لاگین، حتماً پنل لاگین را ببند
      closeLoginPanel();
    } else {
      if (loginError) loginError.textContent = "نام کاربری یا رمز اشتباه است";
    }
  });

  // 🔹 بستن فرم ورود با کلیک بیرون
  document.addEventListener("click", e => {
    if (
      loginPanel?.classList.contains("active") &&
      !loginPanel.contains(e.target) &&
      (!loginIcon || !loginIcon.contains(e.target)) // ← null-safe
    ) {
      closeLoginPanel();
    }
  });

  // بستن با Esc
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && loginPanel?.classList.contains('active')) {
      closeLoginPanel();
    }
  });

   //🔹 تابع نمایش پنل مدیریت
  function showAdminPanel() {
    if (!adminPanel) return;
   adminPanel.style.display    = "block";
    adminPanel.style.opacity    = "0";
    adminPanel.style.transition = "opacity 0.3s ease-in-out";
    requestAnimationFrame(() => {
      adminPanel.style.opacity = "1";
    });
  }

  // 🔹 تابع مخفی کردن پنل مدیریت
  function hideAdminPanel() {
    if (!adminPanel) return;
    adminPanel.style.opacity = "0";
    adminPanel.addEventListener(
      "transitionend",
      () => { adminPanel.style.display = "none"; },
      { once: true }
    );
  }

  // 🔹 خروج ادمین
  logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("isAdmin");
    hideAdminPanel();
    if (manualSection) manualSection.style.display = "none";
    updateSectionsVisibility(); // ← بروزرسانی نمایش بعد از خروج
  });

  // 🔹 حفظ وضعیت لاگین پس از ری‌فرش صفحه
  if (localStorage.getItem("isAdmin") === "true") {
    showAdminPanel();
    if (manualSection) manualSection.style.display = "block";
  }
  updateSectionsVisibility();

  // ====== مدیریت ویرایش ======
  let editingIndex = null;

   //🔹 افزودن/ویرایش پست جدید — نسخه اصلاح‌شده (بدون حذف منطق قبلی، فقط یک‌بار اجرا)
  if (form && !form.dataset.boundSubmit) {
    form.addEventListener("submit", function(e) {
      e.preventDefault();
      const typeInput      = (document.getElementById("post-type")?.value || "").trim();
      const linkInput      = (document.getElementById("post-link")?.value || "").trim();
      const captionFaInput = (document.getElementById("caption-fa")?.value || "").trim();
      const captionRuInput = (document.getElementById("caption-ru")?.value || "").trim();
      const fileInputEl    = document.getElementById("thumbnail");

      const post = {
        type: typeInput,
        link: linkInput,
        captionFa: captionFaInput,
        captionRu: captionRuInput,
        thumbnail: ""
      };

      // اعتبارسنجی: باید یا لینک یا تصویر باشد
      const hasFile = !!(fileInputEl && fileInputEl.files && fileInputEl.files[0]);
      if (!linkInput && !hasFile) {
        alert("لینک یا تصویر پست را وارد کنید");
        return;
      }

       //ذخیره‌ساز
      const persist = () => {
        if (editingIndex !== null) {
          manualPosts[editingIndex] = post;
          editingIndex = null;
        } else {
          manualPosts.push(post);
        }
        localStorage.setItem("manualPosts", JSON.stringify(manualPosts));
        window.manualPosts = manualPosts;
        renderManualPosts();
        if (typeof generateJSONLD === "function") generateJSONLD();
        if (form) form.reset();
      };

      // اگر فایل بود: Base64 بخوان
      if (hasFile) {
        const reader = new FileReader();
        reader.onload = () => { post.thumbnail = reader.result || ""; persist(); };
        reader.onerror = () => { console.error("FileReader error"); persist(); };
        reader.readAsDataURL(fileInputEl.files[0]);
      } else {
        persist();
      }
    });
    form.dataset.boundSubmit = "true";
  }

  // ====== <-- REPLACED renderManualPosts() --> ======
  // This version renders admin list and a dedicated .manual-gallery-grid only.
  function renderManualPosts() {
    const list = document.getElementById("manual-posts-list");
    const manualGrid = document.querySelector(".manual-gallery-grid");

    if (list) list.innerHTML = "";
    if (manualGrid) manualGrid.innerHTML = "";

    manualPosts.forEach((post, index) => {
      // ---- کارت پنل مدیریت (لیست ادمین) ----
      const adminCard = document.createElement("div");
      adminCard.className = "manual-post-card";
      if (post.type === "instagram") adminCard.classList.add("instagram-special");
      if (post.type === "youtube")   adminCard.classList.add("youtube-special");

      adminCard.innerHTML = `
        <p><strong>${post.type || ""}</strong>: ${post.captionFa || ""}</p>
        <p>${post.captionRu || ""}</p>
        <a href="${post.link || "#"}" target="_blank" rel="noopener noreferrer">لینک</a>
        ${post.thumbnail ? `<img src="${post.thumbnail}" alt="${post.captionFa || ""}" style="max-width:100px;">` : ""}
        <div style="margin-top:8px;">
          <button data-idx="${index}" class="editPost">ویرایش</button>
          <button data-idx="${index}" class="deletePost">حذف</button>
        </div>
      `;
      if (list) list.appendChild(adminCard);

      // attach handlers
      const delBtn = adminCard.querySelector(".deletePost");
      const editBtn = adminCard.querySelector(".editPost");
      if (delBtn) delBtn.onclick = () => deleteManualPost(index);
      if (editBtn) editBtn.onclick = () => editManualPost(index);

      // ---- کارت نمایشی برای بخش "پست‌های دستی" (بدون دکمه‌ها) ----
      const viewCard = document.createElement("div");
      viewCard.className = "manual-post-card";
      if (post.type === "instagram") viewCard.classList.add("instagram-special");
      if (post.type === "youtube")   viewCard.classList.add("youtube-special");

      viewCard.innerHTML = `
        ${post.thumbnail ? `<img src="${post.thumbnail}" alt="${post.captionFa || ""}">` : (post.link ? `<a href="${post.link}" target="_blank" rel="noopener noreferrer">${post.link}</a>` : '')}
        <div class="overlay-link"><a href="${post.link || '#'}" target="_blank" rel="noopener noreferrer">${post.type === 'instagram' ? 'مشاهده' : 'مشاهده'}</a></div>
        <p class="lang-fa">${post.captionFa || ''}</p>
        <p class="lang-ru">${post.captionRu || ''}</p>
      `;
      if (manualGrid) manualGrid.appendChild(viewCard);
    });
  }

  window.renderManualPosts = renderManualPosts;
  renderManualPosts();

// === جایگزین/افزودن: تابع سراسری تولید/بروزرسانی JSON-LD (نسخهٔ غنی‌شده) ===
window.generateJSONLD = async function() {
  try {
    const res = await fetch('/api/media').catch(()=>null);
    const data = res ? await res.json().catch(()=>({})) : {};
    const instaData = data?.instagram?.data || [];
    const ytData    = data?.youtube?.items || [];
    const manualPostsLocal = (window.manualPosts && Array.isArray(window.manualPosts)) ? window.manualPosts : [];

    const PERSON_ID = "https://ivanomgru.com/#person";
    const ORG_ID    = "https://ivanomgru.com/#organization";

    const person = {
      "@type": "Person",
      "@id": PERSON_ID,
      "name": "Abolfazl Shahab",
      "alternateName": ["ابوالفضل شهاب", "Абульфазль Шахаб"],
      "url": "https://ivan-omgru.ir",
      "image": "https://ivan-omgru.ir/media/instagram/1.jpg",
      "description": "Founder of ivan_omgru | Content creator | Bilingual (Persian-Russian).",
      "sameAs": [
        "https://instagram.com/ivan.omgru",
        "https://youtube.com/@ivan.omgruss"
      ],
      "knowsLanguage": [
        { "@type": "Language", "name": "Persian" },
        { "@type": "Language", "name": "Russian" }
      ],
      "jobTitle": "Developer & Content Creator",
      "worksFor": { "@id": ORG_ID }
    };

    const organization = {
      "@type": "Organization",
      "@id": ORG_ID,
      "name": "ivan_omgru",
      "alternateName": ["ایوان امگرو", "Иван омгру"],
      "url": "https://ivan-omgru.ir",
      "logo": "https://ivanomgru.com/logoman/ivan44.jpg",
      "sameAs": [
        "https://instagram.com/ivan.omgru",
        "https://youtube.com/@ivan.omgruss"
      ],
      // اضافه شدن @type برای ارتباط صریح با شخص
      "founder": { "@type": "Person", "@id": PERSON_ID }
    };

    // ساخت آرایه پست‌های اینستا (با author/publisher)
    const instagramPosts = instaData.map(item => ({
      "@type": "ImageObject",
      "name": ((item.caption || "").slice(0,80)) + "… - پست اینستاگرام ابوالفضل شهاب",
      "url": item.permalink || "",
      "contentUrl": item.media_url || "",
      "author": { "@id": PERSON_ID },
      "publisher": { "@id": ORG_ID }
    }));

    // ساخت آرایه ویدیوهای یوتیوب (با description, author, publisher)
    const youtubeVideos = ytData.map(item => ({
      "@type": "VideoObject",
      "name": ((item?.snippet?.title || "").slice(0,80)) + "… - ویدیو یوتیوب ابوالفضل شهاب",
      "url": (item?.id?.videoId ? `https://www.youtube.com/watch?v=${item.id.videoId}` : ""),
      "thumbnailUrl": (item?.snippet?.thumbnails?.high?.url || ""),
      "uploadDate": (item?.snippet?.publishedAt || new Date().toISOString()),
      "description": (item?.snippet?.description || "").slice(0, 300),
      "author": { "@id": PERSON_ID },
      "publisher": { "@id": ORG_ID }
    }));

    // اضافه کردن پست‌های دستی (manual) به صورت نُودهای جداگانه با author/publisher
    const manualJson = manualPostsLocal.map(p => ({
      "@type": p.type === 'instagram' ? 'ImageObject' : 'VideoObject',
      "name": ((p.captionFa || "").slice(0,80)) + "… - پست دستی",
      "url": p.link || "",
      "contentUrl": p.thumbnail || undefined,
      "thumbnailUrl": p.thumbnail || undefined,
      "uploadDate": new Date().toISOString(),
      "author": { "@id": PERSON_ID },
      "publisher": { "@id": ORG_ID }
    }));

    const jsonLD = {
      "@context": "https://schema.org",
      "@graph": [person, organization, ...instagramPosts, ...youtubeVideos, ...manualJson]
    };

    let scriptTag = document.head.querySelector('script[type="application/ld+json"]');
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }
    // به‌روزرسانی/ثبت JSON-LD
    scriptTag.textContent = JSON.stringify(jsonLD, null, 2);
  } catch(err) {
    console.error("خطا در تولید JSON-LD:", err);
  }
};


  // فراخوانی اولیه برای اطمینان از وجود JSON-LD در بارگذاری
  if (typeof window.generateJSONLD === 'function') {
    window.generateJSONLD();
  }

  function createMediaCard({ type, thumbnail, video, link, captionFa, captionRu }) {
    const card = document.createElement('div');
    card.className = `media-card ${type === 'instagram' ? 'instagram-special' : 'youtube-special'}`;

    if(type === 'instagram') {
      const img = document.createElement('img');
      img.src = thumbnail || "";
      img.alt = captionFa || "";
      card.appendChild(img);
    } else {
      const vid = document.createElement('video');
      vid.src = video || "";
      vid.autoplay = true;
      vid.loop = true;
      vid.muted = true;
      card.appendChild(vid);
    }

    const pFa = document.createElement('p');
    pFa.className = 'lang-fa';
    pFa.textContent = captionFa || "";
    card.appendChild(pFa);

    const pRu = document.createElement('p');
    pRu.className = 'lang-ru';
    pRu.textContent = captionRu || "";
    card.appendChild(pRu);

    const overlay = document.createElement('div');
    overlay.className = 'overlay-link';
    const aFa = document.createElement('a');
    aFa.href = link || "#";
    aFa.target = '_blank';
    aFa.className = 'lang-fa';
    aFa.textContent = type === 'instagram' ? 'مشاهده در اینستا' : 'مشاهده در یوتیوب';
    overlay.appendChild(aFa);

    const aRu = document.createElement('a');
    aRu.href = link || "#";
    aRu.target = '_blank';
    aRu.className = 'lang-ru';
    aRu.textContent = type === 'instagram' ? 'Посмотреть в Инстаграм' : 'Посмотреть на Ютубе';
    overlay.appendChild(aRu);

    card.appendChild(overlay);
    return card;
  }

  // ———— حذف پست ————
  function deleteManualPost(index) {
    if (confirm("آیا مطمئن هستید که این پست را حذف کنید؟")) {
      manualPosts.splice(index, 1);
      localStorage.setItem("manualPosts", JSON.stringify(manualPosts));
      window.manualPosts = manualPosts;
      renderManualPosts();
      if (typeof generateJSONLD === "function") generateJSONLD(); // ← اینجا
    }
  }

  function editManualPost(index) {
    const post = manualPosts[index];
    if (!post) return;

    const typeEl = document.getElementById("post-type");
    const linkEl = document.getElementById("post-link");
    const capFaEl = document.getElementById("caption-fa");
    const capRuEl = document.getElementById("caption-ru");
    const thumbEl = document.getElementById("thumbnail");

    if (typeEl) typeEl.value = post.type || "";
    if (linkEl) linkEl.value = post.link || "";
    if (capFaEl) capFaEl.value = post.captionFa || "";
    if (capRuEl) capRuEl.value = post.captionRu || "";
    if (thumbEl) thumbEl.value = "";

    editingIndex = index;
  }

  // ===== زبان دو زبانه =====
  (function(){
    // انتخابگرها
    const faSelector = '.lang-fa';
    const ruSelector = '.lang-ru';

    // تابع عمومی تغییر زبان (قابل استفاده از داخل HTML هم هست)
    function setLanguage(lang) {
      const isFa = (lang === 'fa');

      // نمایش/مخفی کردن عناصر هر زبان و تنظیم aria-hidden
      document.querySelectorAll(faSelector).forEach(el => {
        el.style.display = isFa ? 'block' : 'none';
        el.setAttribute('aria-hidden', isFa ? 'false' : 'true');
      });
      document.querySelectorAll(ruSelector).forEach(el => {
        el.style.display = isFa ? 'none' : 'block';
        el.setAttribute('aria-hidden', isFa ? 'true' : 'false');
      });

      // تنظیم زبان و جهت سند برای دسترس‌پذیری و SEO تا حد ممکن (بدون حذف h1ها)
      document.documentElement.lang = isFa ? 'fa' : 'ru';
      document.documentElement.dir  = isFa ? 'rtl' : 'ltr';

      // ذخیره انتخاب کاربر
      try { localStorage.setItem('siteLanguage', lang); } catch(e){ /* ignore */ }

      // اعلام (aria-live) برای اسکرین‌ریدرها
      let announcer = document.getElementById('langAnnouncer');
      if (!announcer) {
        announcer = document.createElement('div');
        announcer.id = 'langAnnouncer';
        announcer.setAttribute('aria-live', 'polite');
        announcer.style.position = 'absolute';
        announcer.style.left = '-9999px';
        document.body.appendChild(announcer);
      }
      announcer.textContent = isFa ? 'زبان: فارسی' : 'Язык: Русский';
    }

    // قرار دادن تابع در window تا onclick های inline هم کار کنند
    window.setLanguage = setLanguage;

    // ✅ مقداردهی فقط وقتی DOM آماده شد
    let instaSwiper = createProSwiper('.instagram-swiper');
    let ytSwiper    = createProSwiper('.youtube-swiper');
    window.instaSwiper = instaSwiper;
    window.ytSwiper    = ytSwiper;

    document.querySelectorAll('.lang-switch button').forEach(btn => {
      const dataLang = btn.getAttribute('data-lang');
      if (!btn.hasAttribute('role')) btn.setAttribute('role','button');
      if (!btn.hasAttribute('tabindex')) btn.setAttribute('tabindex','0');

      btn.addEventListener('click', () => {
        const lang = dataLang || parseLangFromButton(btn) || 'fa';
        setLanguage(lang);
      });

      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          btn.click();
        }
      });
    });

    // مقدار ذخیره‌شده یا تشخیص مختصر از مرورگر
    const saved = (function(){ try { return localStorage.getItem('siteLanguage'); } catch(e){ return null; } })();
    const defaultLang = saved || ((navigator.language || '').startsWith('ru') ? 'ru' : 'fa');
    setLanguage(defaultLang);

    // کمکی
    function parseLangFromButton(btn) {
      if (btn.dataset && btn.dataset.lang) return btn.dataset.lang;
      const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
      if (aria.includes('فارسی') || aria.includes('farsi')) return 'fa';
      if (aria.includes('рус') || aria.includes('русский')) return 'ru';
      const txt = (btn.textContent || '').trim().toLowerCase();
      if (txt.startsWith('فار') || txt.startsWith('fa')) return 'fa';
      if (txt.startsWith('рус') || txt.startsWith('ru')) return 'ru';
      const onclick = btn.getAttribute('onclick') || '';
      const m = onclick.match(/setLanguage(['"]?(fa|ru)['"]?)/i);
      if (m && m[1]) return m[1].toLowerCase();
      return null;
    }
  })();

});

/* =========================
   کش با انقضا
========================= */
function setCache(key, data, ttl = 86400000) {
  const record = { data, expires: Date.now() + ttl };
  try { localStorage.setItem(key, JSON.stringify(record)); } catch(e) {}
}

function getCache(key) {
  try {
    const record = JSON.parse(localStorage.getItem(key) || "{}");
    if (!record || !record.expires || Date.now() > record.expires) {
      localStorage.removeItem(key);
      return null;
    }
    return (record.data ?? null);
  } catch(e) {
    localStorage.removeItem(key);
    return null;
  }
}

/* =========================
   ایجاد Swiper با breakpoints (ایمن + Lazy واقعی)
========================= */
function createProSwiper(selector) {
  const container = document.querySelector(selector);
  if (!container || typeof Swiper === 'undefined') return null;
  return new Swiper(container, {
    slidesPerView: 1,
    spaceBetween: 20,
    loop: true,
    effect: 'coverflow',
    coverflowEffect: { rotate: 30, stretch: 0, depth: 150, modifier: 1, slideShadows: true },
    navigation: {
      nextEl: container.querySelector('.swiper-button-next'),
      prevEl: container.querySelector('.swiper-button-prev')
    },
    breakpoints: { 480: { slidesPerView: 2 }, 768: { slidesPerView: 3 }, 1024: { slidesPerView: 4 }, 1400: { slidesPerView: 5 } },
    preloadImages: false,
    lazy: { loadPrevNext: true, loadPrevNextAmount: 2 },
    observer: true,
    observeParents: true,
    grabCursor: true,
    centeredSlides: true,
    speed: 800,
    keyboard: { enabled: true },
    a11y: { enabled: true }
  });
}

/* =========================
   ایجاد کارت‌ها برای Swiper با lazy load صحیح
========================= */
function createSlideCard(link, imgSrc, captionFa = '', captionRu = '', icon = '') {
  const _capFa = String(captionFa || '');
  const _capRu = String(captionRu || '');
  return `
    <div class="swiper-slide">
      <a href="${link}" target="_blank" rel="noopener noreferrer">
        <img data-src="${imgSrc}" class="swiper-lazy" alt="${_capFa}" loading="lazy" decoding="async">
        <div class="swiper-lazy-preloader"></div>
        <p class="lang-fa">${_capFa}</p>
        <p class="lang-ru">${_capRu}</p>
      </a>
      ${icon ? `<div class="overlay-icon">${icon}</div>` : ''}
    </div>`;
}

/* =========================
   افزودن اسلایدها به Swiper و فعال کردن lazy load
========================= */
function addSlides(swiperInstance, slidesHtml = []) {
  if (!swiperInstance || !Array.isArray(slidesHtml) || slidesHtml.length === 0) return;
  swiperInstance.appendSlide(slidesHtml);
  if (typeof swiperInstance.update === 'function') swiperInstance.update();
  if (swiperInstance.lazy && typeof swiperInstance.lazy.load === 'function') {
    swiperInstance.lazy.load();
  }
}

/* =========================
   Lazy load تصاویر و ویدیوهای گالری غیر Swiper
========================= */
function lazyLoadMedia(selector) {
  const elems = document.querySelectorAll(selector);
  if (!('IntersectionObserver' in window)) {
    elems.forEach(el => {
      if (el.dataset && el.dataset.src) {
        el.src = el.dataset.src;
        el.setAttribute('loading','lazy');
        el.removeAttribute('data-src');
      }
    });
    return;
  }
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      if (el.dataset.src) {
        el.src = el.dataset.src;
        el.setAttribute('loading', 'lazy');
        el.removeAttribute('data-src');
      }
      obs.unobserve(el);
    });
  }, { rootMargin: '200px 0px', threshold: 0 });
  elems.forEach(el => observer.observe(el));
}

// در دسترس سراسری (در صورت نیاز کدهای دیگر)
window.createProSwiper  = window.createProSwiper  || createProSwiper;
window.createSlideCard  = window.createSlideCard  || createSlideCard;
window.addSlides        = window.addSlides        || addSlides;
window.lazyLoadMedia    = window.lazyLoadMedia    || lazyLoadMedia;

// رندر اولیه پست‌ها در صورت وجود تابع
if (typeof renderManualPosts === 'function') renderManualPosts();
