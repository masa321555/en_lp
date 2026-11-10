/* 合同会社en LP — main.js（依存なし） */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.remove('no-js');
  root.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- hero: one orchestrated load moment ---------- */
  window.addEventListener('load', function () {
    document.body.classList.add('is-loaded');
  });
  // 画像の読み込みが遅くてもコピーは出す
  setTimeout(function () { document.body.classList.add('is-loaded'); }, 1200);

  /* ---------- hero video: PC only, after load ---------- */
  var heroVideo = document.getElementById('hero-video');
  if (heroVideo && !reduceMotion && typeof heroVideo.play === 'function') {
    var pcQuery = window.matchMedia('(min-width: 768px)');
    var currentVariant = null;
    var canWebm = heroVideo.canPlayType('video/webm; codecs="vp9"');
    var loadVariant = function () {
      var variant = pcQuery.matches ? 'pc' : 'sp';
      if (variant === currentVariant) return;
      currentVariant = variant;
      var webmAttr = variant === 'sp' ? 'data-webm-sp' : 'data-webm';
      var mp4Attr = variant === 'sp' ? 'data-mp4-sp' : 'data-mp4';
      heroVideo.classList.remove('is-playing');
      while (heroVideo.firstChild) heroVideo.removeChild(heroVideo.firstChild);
      if (canWebm) {
        var webm = document.createElement('source'); webm.src = heroVideo.getAttribute(webmAttr); webm.type = 'video/webm';
        heroVideo.appendChild(webm);
      }
      var mp4 = document.createElement('source'); mp4.src = heroVideo.getAttribute(mp4Attr); mp4.type = 'video/mp4';
      heroVideo.appendChild(mp4);
      heroVideo.load();
      var p = heroVideo.play();
      if (p && typeof p.catch === 'function') p.catch(function () { /* 自動再生不可: 静止画のまま */ });
    };
    heroVideo.addEventListener('playing', function () { heroVideo.classList.add('is-playing'); });
    var startVideo = function () { loadVariant(); };
    // 画面幅がPC/SPの境界をまたいだら素材を差し替える（ブラウザ幅の変更・回転）
    if (typeof pcQuery.addEventListener === 'function') pcQuery.addEventListener('change', loadVariant);
    else if (typeof pcQuery.addListener === 'function') pcQuery.addListener(loadVariant);
    if (document.readyState === 'complete') setTimeout(startVideo, 300);
    else window.addEventListener('load', function () { setTimeout(startVideo, 300); });
  }

  /* ---------- nav: mobile toggle ---------- */
  var nav = document.getElementById('nav');
  var toggle = document.getElementById('nav-toggle');
  var links = document.getElementById('nav-links');
  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
  }
  toggle.addEventListener('click', function () {
    setMenu(!nav.classList.contains('is-open'));
  });
  links.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') setMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) setMenu(false);
  });

  /* ---------- nav: current section ---------- */
  var navAnchors = Array.prototype.slice.call(links.querySelectorAll('a[href^="#"]'));
  var sectionMap = {};
  navAnchors.forEach(function (a) {
    var id = a.getAttribute('href').slice(1);
    var sec = document.getElementById(id);
    if (sec) sectionMap[id] = a;
  });
  if ('IntersectionObserver' in window) {
    var currentObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navAnchors.forEach(function (a) { a.classList.remove('is-current'); });
        var a = sectionMap[en.target.id];
        if (a && !a.classList.contains('nav__cta')) a.classList.add('is-current');
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    Object.keys(sectionMap).forEach(function (id) {
      currentObs.observe(document.getElementById(id));
    });
  }

  /* ---------- section reveal (opacity only, once) ---------- */
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var revealObs = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); obs.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    reveals.forEach(function (el) { revealObs.observe(el); });
  }

  /* ---------- tagline reveal: 文節ごとに読み順で点灯 ---------- */
  var chunks = Array.prototype.slice.call(document.querySelectorAll('.tagline__chunk'));
  if (reduceMotion || !('IntersectionObserver' in window)) {
    chunks.forEach(function (c) { c.classList.add('is-on'); });
  } else {
    // 画面の下から35%の位置をトリガーラインにする。読み順を保つため、
    // あるチャンクが点灯したら、それより前のチャンクもすべて点灯させる。
    var chunkObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var idx = chunks.indexOf(en.target);
        for (var i = 0; i <= idx; i++) chunks[i].classList.add('is-on');
        chunkObs.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -35% 0px', threshold: 0.6 });
    chunks.forEach(function (c, i) {
      // 読み順の間隔を transition-delay で付ける（同時に交差した場合の順序保証）
      c.style.transitionDelay = (i * 90) + 'ms';
      chunkObs.observe(c);
    });
  }

  /* ---------- 計測: Googleタグ（gtag.js）が読み込まれているときだけ送信 ---------- */
  function track(name, params) {
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
  }
  // CTAクリック（フォームへのリンク）。どの位置のCTAが押されたかを cta_location で区別
  Array.prototype.slice.call(document.querySelectorAll('a[href="#form"]')).forEach(function (a) {
    a.addEventListener('click', function () {
      var sec = a.closest('section, header');
      track('cta_click', { cta_location: sec && sec.id ? sec.id : 'unknown', link_text: a.textContent.trim() });
    });
  });
  // フォーム到達（フォームのセクションが初めて画面に入ったとき）
  var formSection = document.getElementById('form');
  if (formSection && 'IntersectionObserver' in window) {
    var formViewObs = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { track('form_view'); obs.disconnect(); }
      });
    }, { threshold: 0.3 });
    formViewObs.observe(formSection);
  }

  /* ---------- form: client validation ---------- */
  var form = document.getElementById('contact-form');
  if (form) {
    // 入力開始（最初の1回だけ）
    var formStarted = false;
    form.addEventListener('input', function () {
      if (formStarted) return;
      formStarted = true;
      track('form_start');
    });
    // Turnstile はサイトキーが設定されているときだけ読み込む
    var ts = form.querySelector('.cf-turnstile');
    if (ts && ts.getAttribute('data-sitekey')) {
      var tsScript = document.createElement('script');
      tsScript.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      tsScript.async = true; tsScript.defer = true;
      document.head.appendChild(tsScript);
    }
    var status = document.getElementById('form-status');
    var fields = [
      { id: 'f-company', msg: '会社名を入力してください。' },
      { id: 'f-name', msg: 'お名前を入力してください。' },
      { id: 'f-email', msg: 'メールアドレスを入力してください。', email: true },
      { id: 'f-status', msg: '導入状況を選択してください。' }
    ];
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function validateField(f) {
      var el = document.getElementById(f.id);
      var err = document.getElementById(f.id + '-error');
      var v = el.value.trim();
      var message = '';
      if (!v) message = f.msg;
      else if (f.email && !emailRe.test(v)) message = 'メールアドレスの形式が正しくありません。';
      err.textContent = message;
      el.setAttribute('aria-invalid', message ? 'true' : 'false');
      return !message;
    }
    fields.forEach(function (f) {
      var el = document.getElementById(f.id);
      el.addEventListener('blur', function () { validateField(f); });
      el.addEventListener('input', function () {
        if (el.getAttribute('aria-invalid') === 'true') validateField(f);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      fields.forEach(function (f) { if (!validateField(f)) ok = false; });
      status.classList.remove('is-error');
      if (!ok) {
        status.textContent = '入力内容をご確認ください。';
        status.classList.add('is-error');
        var firstInvalid = form.querySelector('[aria-invalid="true"]');
        if (firstInvalid) firstInvalid.focus();
        return;
      }
      var endpoint = form.getAttribute('data-endpoint');
      if (!endpoint) {
        // 送信先未設定（README参照）。本番では data-endpoint にPOST先を設定する。
        status.textContent = 'フォームの送信先が未設定です。設定後に送信できます。';
        status.classList.add('is-error');
        return;
      }
      var submitBtn = form.querySelector('[type="submit"]');
      submitBtn.disabled = true;
      status.textContent = '送信しています。';
      fetch(endpoint, { method: 'POST', body: new FormData(form) })
        .then(function (res) { return res.json().catch(function () { return { ok: res.ok }; }); })
        .then(function (data) {
          if (!data || !data.ok) throw new Error(data && data.error ? data.error : 'bad status');
          track('generate_lead', { form_id: 'contact-form' });
          form.reset();
          if (window.turnstile && typeof window.turnstile.reset === 'function') { try { window.turnstile.reset(); } catch (e) {} }
          status.textContent = '送信しました。1営業日以内に返信します。';
        })
        .catch(function (err) {
          var msg = '送信できませんでした。時間をおいて再度お試しください。';
          if (err && err.message === 'turnstile') msg = '確認チェックが完了していません。チェックを済ませてから再度お試しください。';
          status.textContent = msg;
          status.classList.add('is-error');
        })
        .then(function () { submitBtn.disabled = false; });
    });
  }
})();
