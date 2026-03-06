document.addEventListener('DOMContentLoaded', function () {
  const searchInput = document.getElementById('tag-search-input');
  const tagDropdown = document.getElementById('tag-dropdown');
  const selectedTagsContainer = document.getElementById('selected-tags');
  const tagOptions = document.querySelectorAll('.tag-option');
  const cards = document.querySelectorAll('.post-card');

  let selectedTags = [];

  // Initialize from URL
  const urlParams = new URLSearchParams(window.location.search);
  const tagsParam = urlParams.get('tags');
  if (tagsParam) {
    selectedTags = tagsParam.split(',').filter(t => t);
    renderSelectedTags();
    filterPosts();
  }

  function filterPosts() {
    cards.forEach(card => {
      const cardTags = Array.from(card.querySelectorAll('.tag')).map(t => t.textContent.trim());
      // Check if card has ALL selected tags
      const hasAllTags = selectedTags.every(tag => cardTags.includes(tag));

      if (selectedTags.length === 0 || hasAllTags) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  }

  function updateUrl() {
    const newUrl = new URL(window.location);
    if (selectedTags.length > 0) {
      newUrl.searchParams.set('tags', selectedTags.join(','));
    } else {
      newUrl.searchParams.delete('tags');
    }
    window.history.pushState({}, '', newUrl);
  }

  function addTag(tag) {
    if (!selectedTags.includes(tag)) {
      selectedTags.push(tag);
      renderSelectedTags();
      filterPosts();
      updateUrl();
    }
    searchInput.value = '';
    filterDropdown('');
    tagDropdown.style.display = 'none';
  }

  function removeTag(tag) {
    selectedTags = selectedTags.filter(t => t !== tag);
    renderSelectedTags();
    filterPosts();
    updateUrl();
  }

  function renderSelectedTags() {
    selectedTagsContainer.innerHTML = '';
    selectedTags.forEach(tag => {
      const tagEl = document.createElement('div');
      tagEl.className = 'selected-tag';

      // セキュリティ: textContent を使用してXSSを防止
      const tagText = document.createTextNode(tag + ' ');
      tagEl.appendChild(tagText);

      const removeBtn = document.createElement('span');
      removeBtn.className = 'remove-tag';
      removeBtn.dataset.tag = tag;
      removeBtn.textContent = '×';
      tagEl.appendChild(removeBtn);

      selectedTagsContainer.appendChild(tagEl);
    });

    // Re-attach event listeners to remove buttons
    document.querySelectorAll('.remove-tag').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering container click
        removeTag(e.target.dataset.tag);
      });
    });
  }

  function filterDropdown(query) {
    const lowerQuery = query.toLowerCase();
    let hasVisible = false;
    tagOptions.forEach(option => {
      const tag = option.dataset.tag;
      if (tag.toLowerCase().includes(lowerQuery) && !selectedTags.includes(tag)) {
        option.style.display = 'block';
        hasVisible = true;
      } else {
        option.style.display = 'none';
      }
    });
    tagDropdown.style.display = hasVisible ? 'block' : 'none';
  }

  // Event Listeners
  searchInput.addEventListener('input', (e) => {
    filterDropdown(e.target.value);
  });

  searchInput.addEventListener('focus', () => {
    filterDropdown(searchInput.value);
  });

  // Hide dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.tag-search-container')) {
      tagDropdown.style.display = 'none';
    }
  });

  tagOptions.forEach(option => {
    option.addEventListener('click', () => {
      addTag(option.dataset.tag);
    });
  });
});