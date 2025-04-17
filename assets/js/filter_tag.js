const tagFilters = document.querySelectorAll('.tag-filter');
const postCards = document.querySelectorAll('.post-card');

tagFilters.forEach(filter => {
  filter.addEventListener('click', (event) => {
    event.preventDefault();
    const selectedTag = filter.dataset.tag;

    postCards.forEach(card => {
      const cardTags = Array.from(card.querySelectorAll('.tag')).map(tag => tag.textContent);

      if (selectedTag === 'all' || cardTags.includes(selectedTag)) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });
  });
});