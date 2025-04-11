---
# Jekyllに処理させるため、空でもFront Matterは必要
---
<!DOCTYPE html>
<html>
<head>
<title>Redirecting...</title>
<!-- 
  meta refresh: 即時リダイレクトを実行 
  site.baseurl を使うことで _config.yml の変更に追従できる
  default: '' は baseurl が空の場合のエラーを防ぐため（念のため）
-->
<meta http-equiv="refresh" content="0; url={{ site.baseurl | default: '' }}/home/">
<!-- SEOのため、正規のURLを示す canonical タグ -->
<link rel="canonical" href="{{ site.baseurl | default: '' }}/home/"/>
<!-- JavaScriptによるリダイレクト (meta refreshが効かない環境向け) -->
<script>window.location.replace("{{ site.baseurl | default: '' }}/home/");</script>
</head>
<body>
<!-- JavaScriptが無効な場合などに表示されるメッセージ -->
<p>If you are not redirected automatically, follow this <a href="{{ site.baseurl | default: '' }}/home/">link to the welcome page</a>.</p>
</body>
</html>