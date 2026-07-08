document.addEventListener('DOMContentLoaded', function () {
  const toggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('site-nav');

  if (!toggle || !nav) {
    return;
  }

  // JS が有効な場合のみ、モバイル幅でナビを開閉式にする
  // (CSS 側は body.js-nav が無いとナビを常に表示したままにする = JS無効時のフォールバック)
  document.body.classList.add('js-nav');

  function openNav() {
    nav.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
  }

  function closeNav() {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  function isOpen() {
    return nav.classList.contains('is-open');
  }

  toggle.addEventListener('click', function () {
    if (isOpen()) {
      closeNav();
    } else {
      openNav();
    }
  });

  // ナビ内のリンクをクリックしたら閉じる
  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) {
      closeNav();
    }
  });

  // Esc キーで閉じてトグルボタンにフォーカスを戻す
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) {
      closeNav();
      toggle.focus();
    }
  });

  // ナビの外側をクリックしたら閉じる
  document.addEventListener('click', function (e) {
    if (isOpen() && !nav.contains(e.target) && !toggle.contains(e.target)) {
      closeNav();
    }
  });
});
