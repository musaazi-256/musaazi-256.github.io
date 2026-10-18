/*
 * Swaps static OwnerHub screenshots for the product animations in /animations.
 *
 * This site is a compiled Next.js snapshot, so the markup can't be changed at
 * the source: React would revert edited HTML on hydration. Instead this script
 * waits for React to hydrate each image, inserts the animation next to it and
 * hides the image. It re-applies itself if React re-renders, follows the
 * site's light/dark toggle (the `dark` class on <html>), plays only what is on
 * screen, and in the modules carousel plays only the front card.
 *
 * Two formats, for comparing:
 *   MP4 video (default)      ?anim=video
 *   live HTML in an iframe   ?anim=html
 * The choice is remembered in localStorage until switched back.
 */
(function () {
  var BASE = '/animations/';
  var root = document.documentElement;
  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var MODE = (function () {
    var asked = new URLSearchParams(location.search).get('anim');
    try {
      if (asked === 'html' || asked === 'video') localStorage.setItem('oh-anim', asked);
      return localStorage.getItem('oh-anim') === 'html' ? 'html' : 'video';
    } catch (e) {
      return asked === 'html' ? 'html' : 'video';
    }
  })();

  // Keep the target images invisible (but holding their space) until swapped,
  // so the screenshot doesn't flash before the animation. Fallback after 6 s.
  root.setAttribute('data-oh-pending', '');
  setTimeout(function () { root.removeAttribute('data-oh-pending'); }, 6000);

  var MODULES = {
    'Inventory': 'inventory',
    'Marketplace': 'marketplace',
    'Briefs': 'briefs',
    'Proposals': 'proposals',
    'Campaigns': 'campaigns',
    'Field Crew': 'field',
    'Money': 'money',
    'Directory': 'directory',
    'Workspace & Teams': 'workspace'
  };

  var TARGETS = [
    {
      // Homepage hero: laptop mockup -> Marketplace walkthrough
      selector: 'img[alt="ADWrap OwnerHub dashboard on a laptop and phone"]',
      build: function () {
        return framed('oh-frame--hero', media({
          video: 'marketplace',
          html: 'marketplace-animation.html',
          ratio: 1800 / 1050,
          label: 'OwnerHub Marketplace: creating and publishing a listing'
        }));
      }
    },
    {
      // Homepage ecosystem card for OwnerHub -> Inventory module loop (drawn for card size)
      selector: 'img[alt="OOH OwnerHub workspace on a laptop and phone"]',
      build: function () {
        return framed('oh-frame--card', media({
          video: 'modules/inventory',
          html: 'modules/inventory.html',
          ratio: 720 / 458,
          label: 'OwnerHub Inventory: searching media and opening an item'
        }));
      }
    },
    {
      // OwnerHub product page hero screenshot -> hero tabs (all five stories)
      selector: 'img[title="OwnerHub - OOH inventory and campaign management"]',
      build: function () {
        var el = media({
          video: 'hero-tabs',
          html: 'hero-tabs.html',
          ratio: 2160 / 1162,
          label: 'OwnerHub: from media to proof of delivery'
        });
        // The HTML version sets its own height (it changes with width).
        if (el.tagName === 'IFRAME') {
          el.ohSizesItself = true;
          el.style.aspectRatio = '';
          el.style.height = '600px';
        }
        return el;
      }
    },
    {
      // OwnerHub modules carousel -> one short loop per card
      selector: 'article img[title^="OwnerHub - "]',
      build: function (img) {
        var name = MODULES[img.getAttribute('title').replace('OwnerHub - ', '')];
        if (!name) return null;
        var el = media({
          video: 'modules/' + name,
          html: 'modules/' + name + '.html',
          ratio: 720 / 458,
          label: img.getAttribute('alt'),
          // Only the front card's iframe is loaded, the rest when they come to the front.
          lazy: true
        });
        el.classList.add('oh-module');
        el.ohCarousel = img.closest('article');
        return el;
      }
    }
  ];

  var CSS = [
    'html[data-oh-pending] ' + TARGETS.map(function (t) { return t.selector; }).join(', html[data-oh-pending] ') + '{visibility:hidden}',
    'img[data-oh-replaced]{display:none!important}',
    '.oh-media{display:block;width:100%;height:auto;border:0;object-fit:cover}',
    '.oh-frame{overflow:hidden;border-radius:16px;padding:4px;border:1px solid oklch(var(--ooh-background-200));background:oklch(var(--ooh-background-100))}',
    '.dark .oh-frame{border-color:oklch(var(--ooh-background-300))}',
    '.oh-frame .oh-media{border-radius:12px}',
    '.oh-frame--hero{box-shadow:0 30px 60px -20px rgba(15,23,42,.35)}',
    '.oh-frame--card{transition:transform .5s}',
    '.group:hover .oh-frame--card{transform:scale(1.03)}',
    '.oh-module{border-radius:8px}'
  ].join('\n');

  function theme() {
    return root.classList.contains('dark') ? 'dark' : 'light';
  }

  // A <video> or an <iframe>, depending on MODE.
  function media(o) {
    var el;
    if (MODE === 'html') {
      el = document.createElement('iframe');
      el.title = o.label;
      el.ohHtml = o.html;
      el.ohLazy = !!o.lazy;
      el.addEventListener('load', function () { el.ohTheme = null; applyTheme(el); });
    } else {
      el = document.createElement('video');
      el.muted = true;
      el.loop = true;
      el.playsInline = true;
      el.setAttribute('muted', '');
      el.setAttribute('playsinline', '');
      el.preload = 'none';
      el.setAttribute('aria-label', o.label);
      el.ohName = o.video;
    }
    el.className = 'oh-media';
    el.style.aspectRatio = String(o.ratio);
    applyTheme(el);
    return el;
  }

  function framed(variant, el) {
    var frame = document.createElement('div');
    frame.className = 'oh-frame ' + variant;
    frame.appendChild(el);
    return frame;
  }

  // Point a video or iframe at the current theme.
  function applyTheme(el) {
    var t = theme();
    if (el.ohTheme === t) return;
    if (el.tagName === 'IFRAME') {
      if (!el.getAttribute('src')) return; // set when the iframe loads
      el.ohTheme = t;
      try { el.contentDocument.documentElement.setAttribute('data-theme', t); } catch (e) {}
      return;
    }
    el.ohTheme = t;
    var time = el.currentTime || 0;
    var wasPlaying = !el.paused;
    el.poster = BASE + 'poster/' + el.ohName + '-' + t + '.jpg';
    el.src = BASE + 'video/' + el.ohName + '-' + t + '.mp4';
    if (time) {
      el.addEventListener('loadedmetadata', function () { el.currentTime = time; }, { once: true });
    }
    if (wasPlaying) el.play().catch(function () {});
  }

  function isFront(el) {
    return !el.ohCarousel || el.ohCarousel.style.pointerEvents === 'auto';
  }

  // Videos are played and paused from here. The HTML versions pause themselves
  // off-screen and handle reduced motion, so they only need loading.
  function updatePlayback(el) {
    if (el.tagName === 'IFRAME') {
      if (!el.getAttribute('src') && (!el.ohLazy || (el.ohInView && isFront(el)))) {
        el.src = BASE + el.ohHtml + '#' + theme();
      }
      return;
    }
    if (!reduceMotion && el.ohInView && isFront(el)) {
      if (el.paused) el.play().catch(function () {});
    } else if (!el.paused) {
      el.pause();
    }
  }

  var items = [];
  var io = 'IntersectionObserver' in window
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          e.target.ohInView = e.isIntersecting;
          updatePlayback(e.target);
        });
      }, { rootMargin: '100px' })
    : null;

  function isHydrated(el) {
    for (var k in el) if (k.indexOf('__reactFiber') === 0) return true;
    return false;
  }

  function enhance(force) {
    TARGETS.forEach(function (t) {
      document.querySelectorAll(t.selector).forEach(function (img) {
        if (img.hasAttribute('data-oh-replaced')) return;
        // Inserting before React hydrates would cause a hydration mismatch.
        if (!force && !isHydrated(img)) return;
        var el = t.build(img);
        if (!el) return;
        img.parentNode.insertBefore(el, img.nextSibling);
        img.setAttribute('data-oh-replaced', '');
        var m = el.classList.contains('oh-media') ? el : el.querySelector('.oh-media');
        items.push(m);
        if (io) io.observe(m); else { m.ohInView = true; updatePlayback(m); }
      });
    });
  }

  function allDone() {
    return TARGETS.every(function (t) {
      return Array.prototype.every.call(document.querySelectorAll(t.selector), function (img) {
        return img.hasAttribute('data-oh-replaced');
      });
    });
  }

  function start() {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    // Wait for hydration, then swap. Give up waiting after 5 s and swap anyway.
    var tries = 0;
    (function poll() {
      enhance(tries > 50);
      if (allDone() || tries > 50) {
        root.removeAttribute('data-oh-pending');
        watch();
      } else {
        tries++;
        setTimeout(poll, 100);
      }
    })();
  }

  function watch() {
    var queued = false;
    new MutationObserver(function (records) {
      var themeChanged = records.some(function (r) { return r.target === root && r.attributeName === 'class'; });
      if (themeChanged) items.forEach(applyTheme);
      // Carousel moves change article styles: re-check which card is in front.
      items.forEach(updatePlayback);
      if (!queued) {
        queued = true;
        requestAnimationFrame(function () { queued = false; enhance(true); });
      }
    }).observe(root, { attributes: true, attributeFilter: ['class', 'style'], childList: true, subtree: true });
  }

  window.addEventListener('message', function (e) {
    if (!e.data || e.data.type !== 'ownerhub-hero-height') return;
    items.forEach(function (el) {
      if (el.ohSizesItself && el.contentWindow === e.source) el.style.height = e.data.height + 'px';
    });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
