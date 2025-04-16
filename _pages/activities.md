---
layout: default
title: 九州大学医学部情報研 -活動内容-
---

# 活動記録
<div class="post-list-cards">
  {% for post in site.posts %}
    <a href="{{ post.url | relative_url }}" class="post-card">
      <h2 class="post-card-title">{{ post.title }}</h2>
      <p class="post-card-meta">
        <time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: "%Y年%m月%d日" }}</time>
      </p>
    </a>
  {% endfor %}
</div>