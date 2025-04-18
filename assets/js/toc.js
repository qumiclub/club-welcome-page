document.addEventListener('DOMContentLoaded', function() {
  const toc = document.getElementById('toc');
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6'); // TOC に含める見出しのレベルを指定

  if (toc && headings.length > 0) {
    const ul = document.createElement('ul');
    toc.appendChild(ul);

    headings.forEach(heading => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#' + heading.id;
      a.textContent = heading.textContent;

      li.appendChild(a);
      ul.appendChild(li);
    });
  }
});