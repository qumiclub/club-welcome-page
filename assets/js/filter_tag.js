document.addEventListener('DOMContentLoaded', function () {
  const searchInput = document.getElementById('tag-search-input');
  const tagDropdown = document.getElementById('tag-dropdown');
  const selectedTagsContainer = document.getElementById('selected-tags');
  const tagOptions = document.querySelectorAll('.tag-option');
  const cards = document.querySelectorAll('.post-card');

  let selectedTags = [];
  let highlightedIndex = -1;

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
        card.style.display = '';
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
    closeDropdown();
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

  // 現在表示されている(絞り込み後の)候補一覧を取得
  function getVisibleOptions() {
    return Array.from(tagOptions).filter(option => option.style.display !== 'none');
  }

  // キーボード操作のハイライトを解除
  function clearHighlight() {
    tagOptions.forEach(option => option.classList.remove('is-highlighted'));
    highlightedIndex = -1;
    searchInput.removeAttribute('aria-activedescendant');
  }

  // 候補一覧のうち index 番目をハイライトし、aria-activedescendant を同期
  function setHighlight(index) {
    const visible = getVisibleOptions();
    tagOptions.forEach(option => option.classList.remove('is-highlighted'));

    if (visible.length === 0) {
      highlightedIndex = -1;
      searchInput.removeAttribute('aria-activedescendant');
      return;
    }

    highlightedIndex = ((index % visible.length) + visible.length) % visible.length;
    const option = visible[highlightedIndex];
    option.classList.add('is-highlighted');
    searchInput.setAttribute('aria-activedescendant', option.id);
    option.scrollIntoView({ block: 'nearest' });
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
    searchInput.setAttribute('aria-expanded', hasVisible ? 'true' : 'false');
    clearHighlight();
  }

  function closeDropdown() {
    tagDropdown.style.display = 'none';
    searchInput.setAttribute('aria-expanded', 'false');
    clearHighlight();
  }

  // Event Listeners
  searchInput.addEventListener('input', (e) => {
    filterDropdown(e.target.value);
  });

  searchInput.addEventListener('focus', () => {
    filterDropdown(searchInput.value);
  });

  // キーボード操作: ArrowUp/ArrowDown でハイライト移動、Enter で選択、Esc で閉じる
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (tagDropdown.style.display === 'none') {
        filterDropdown(searchInput.value);
      }
      const visible = getVisibleOptions();
      if (visible.length > 0) {
        setHighlight(highlightedIndex + 1);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const visible = getVisibleOptions();
      if (visible.length > 0) {
        setHighlight(highlightedIndex - 1);
      }
    } else if (e.key === 'Enter') {
      const visible = getVisibleOptions();
      if (highlightedIndex >= 0 && visible[highlightedIndex]) {
        e.preventDefault();
        addTag(visible[highlightedIndex].dataset.tag);
      }
    } else if (e.key === 'Escape') {
      closeDropdown();
    }
  });

  // Hide dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.tag-search-container')) {
      closeDropdown();
    }
  });

  tagOptions.forEach(option => {
    option.addEventListener('click', () => {
      addTag(option.dataset.tag);
    });

    option.addEventListener('mouseenter', () => {
      const visible = getVisibleOptions();
      const idx = visible.indexOf(option);
      if (idx >= 0) {
        setHighlight(idx);
      }
    });
  });
});
