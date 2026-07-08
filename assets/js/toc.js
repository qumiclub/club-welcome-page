document.addEventListener('DOMContentLoaded', function () {
  const toc = document.getElementById('toc');
  const headings = document.querySelectorAll('.main-content h1, .main-content h2, .main-content h3');

  // 記事本文内の画像は遅延読み込みにする
  document.querySelectorAll('.main-content img').forEach(function (img) {
    if (!img.hasAttribute('loading')) {
      img.setAttribute('loading', 'lazy');
    }
  });

  // 目次の折りたたみ: モバイルでは初期状態で閉じ、デスクトップ幅では常に開く
  // (markup 側は open がデフォルトなので、JS 無効環境では常に開いたまま = フォールバック)
  const tocDetails = document.querySelector('.toc-collapsible');
  if (tocDetails) {
    const mobileQuery = window.matchMedia('(max-width: 900px)');
    if (mobileQuery.matches) {
      tocDetails.open = false;
    }
    mobileQuery.addEventListener('change', function (e) {
      if (!e.matches) {
        tocDetails.open = true;
      }
    });
  }

  if (toc && headings.length > 0) {
    const ul = document.createElement('ul');
    toc.appendChild(ul);

    const tocLinks = [];
    // セキュリティ/バグ修正: ID重複を防止するためのカウンター
    const idCounter = {};

    headings.forEach(heading => {
      if (!heading.id) {
        let baseId = heading.textContent.trim().replace(/\s+/g, '-');
        // 同じIDが既に存在する場合はカウンターを追加
        if (idCounter[baseId] !== undefined) {
          idCounter[baseId]++;
          heading.id = `${baseId}-${idCounter[baseId]}`;
        } else {
          heading.id = baseId;
          idCounter[baseId] = 0;
        }
      }

      const li = document.createElement('li');
      li.classList.add('toc-' + heading.tagName.toLowerCase());

      const a = document.createElement('a');
      a.href = '#' + heading.id;
      a.textContent = heading.textContent;

      li.appendChild(a);
      ul.appendChild(li);
      tocLinks.push({ link: a, target: heading });
    });

    // Scroll Spy
    const observerOptions = {
      root: null,
      rootMargin: '-100px 0px -60% 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          tocLinks.forEach(item => item.link.classList.remove('active'));
          const activeLink = tocLinks.find(item => item.target === entry.target);
          if (activeLink) {
            activeLink.link.classList.add('active');
          }
        }
      });
    }, observerOptions);

    headings.forEach(heading => observer.observe(heading));
  }
});