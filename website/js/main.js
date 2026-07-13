(function () {
  const cfg = window.DRIVEMATE_LANDING || {};
  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  // Store badges
  document.querySelectorAll('[data-store="ios"]').forEach((el) => {
    if (cfg.appStoreUrl) el.setAttribute('href', cfg.appStoreUrl);
  });
  document.querySelectorAll('[data-store="android"]').forEach((el) => {
    if (cfg.playStoreUrl) el.setAttribute('href', cfg.playStoreUrl);
  });

  // Mobile nav
  const nav = document.querySelector('.nav');
  const toggle = document.querySelector('.nav-toggle');
  toggle?.addEventListener('click', () => {
    const open = nav?.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  // Rotating hero words
  const rotator = document.querySelector('[data-words]');
  if (rotator) {
    const words = (rotator.getAttribute('data-words') || '')
      .split(',')
      .map((w) => w.trim())
      .filter(Boolean);
    let i = 0;
    if (words.length > 1) {
      setInterval(() => {
        i = (i + 1) % words.length;
        rotator.style.opacity = '0';
        rotator.style.transform = 'translateY(6px)';
        setTimeout(() => {
          rotator.textContent = words[i];
          rotator.style.opacity = '1';
          rotator.style.transform = 'none';
        }, 220);
      }, 2600);
      rotator.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
    }
  }

  // Hero video — autoplay + loop (with fallbacks for strict browsers)
  const heroVideoEl = document.querySelector('.hero-video');
  if (heroVideoEl) {
    heroVideoEl.muted = true;
    heroVideoEl.defaultMuted = true;
    heroVideoEl.loop = true;
    heroVideoEl.playsInline = true;
    heroVideoEl.setAttribute('playsinline', '');
    heroVideoEl.setAttribute('webkit-playsinline', '');

    const source = heroVideoEl.querySelector('source');
    if (source && cfg.heroVideo) {
      source.setAttribute('src', cfg.heroVideo);
    }

    const playHero = () => {
      const attempt = heroVideoEl.play();
      if (attempt && typeof attempt.catch === 'function') {
        attempt.catch(() => {
          // Retry once after a short delay (Safari / low-power mode)
          setTimeout(() => {
            heroVideoEl.muted = true;
            heroVideoEl.play().catch(() => {});
          }, 400);
        });
      }
    };

    heroVideoEl.addEventListener('ended', () => {
      heroVideoEl.currentTime = 0;
      playHero();
    });

    heroVideoEl.addEventListener('canplay', playHero, { once: true });
    heroVideoEl.load();
    playHero();
  }

  // Screenshots — load from assets/screenshot, show placeholders if missing
  const labels = {
    home: 'Add home.png',
    'scan-fault': 'Add scan-fault.png',
    'scan-fault2': 'Add scan-fault2.png',
    garages: 'Add garages.png',
    mylist: 'Add mylist.png',
    fuel: 'Add fuel.png',
    reminders: 'Add reminders.png',
    documents: 'Add documents.png',
  };

  document.querySelectorAll('img[data-shot]').forEach((img) => {
    const key = img.getAttribute('data-shot');
    const file = cfg.screenshots?.[key];
    const wrap = img.closest('.phone, .feature-phone, figure');
    if (!file) {
      wrap?.classList.add('is-empty');
      if (wrap) wrap.setAttribute('data-label', labels[key] || 'Screenshot coming soon');
      img.removeAttribute('src');
      return;
    }

    const src = `${cfg.screenshotBase || './img/shots/'}${file}`;
    img.src = src;
    img.addEventListener('error', () => {
      wrap?.classList.add('is-empty');
      if (wrap) wrap.setAttribute('data-label', labels[key] || 'Drop screenshot here');
      img.style.display = 'none';
    });
    img.addEventListener('load', () => {
      wrap?.classList.remove('is-empty');
      img.style.display = '';
    });
  });

  // Reveal on scroll
  const reveals = document.querySelectorAll(
    '.strip article, .feature-block, .steps article, .gallery-card, .faq-list, .cta-card',
  );
  reveals.forEach((el) => el.classList.add('reveal'));
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 },
  );
  reveals.forEach((el) => io.observe(el));
})();
