document.addEventListener('DOMContentLoaded', function () {
  const toc = document.getElementById('toc');
  const headings = document.querySelectorAll('.main-content h1, .main-content h2, .main-content h3');

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