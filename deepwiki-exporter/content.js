(function () {
  'use strict';

  // 重複実行を防止
  if (window.__deepwikiExporterLoaded) return;
  window.__deepwikiExporterLoaded = true;

  // --- UI: エクスポートボタンの作成 ---
  function createExportButton() {
    const btn = document.createElement('button');
    btn.id = 'dw-export-btn';
    btn.textContent = '\uD83D\uDE80 \u4E00\u62EC\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8';
    Object.assign(btn.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: '2147483647',
      padding: '12px 24px',
      fontSize: '15px',
      fontWeight: '700',
      color: '#fff',
      background: 'linear-gradient(135deg, #ec4899, #db2777)',
      border: 'none',
      borderRadius: '12px',
      cursor: 'pointer',
      boxShadow: '0 4px 14px rgba(236,72,153,0.4)',
      transition: 'transform 0.15s, box-shadow 0.15s',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    });
    btn.addEventListener('mouseenter', function () {
      btn.style.transform = 'scale(1.05)';
      btn.style.boxShadow = '0 6px 20px rgba(236,72,153,0.5)';
    });
    btn.addEventListener('mouseleave', function () {
      btn.style.transform = 'scale(1)';
      btn.style.boxShadow = '0 4px 14px rgba(236,72,153,0.4)';
    });
    btn.addEventListener('click', startExport);
    document.body.appendChild(btn);
    return btn;
  }

  // --- UI: プログレスオーバーレイの作成 ---
  function createProgressOverlay() {
    var overlay = document.createElement('div');
    overlay.id = 'dw-progress-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      background: 'rgba(0,0,0,0.7)',
      zIndex: '2147483647',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    });

    var box = document.createElement('div');
    Object.assign(box.style, {
      background: '#1a1a2e',
      borderRadius: '16px',
      padding: '32px 40px',
      textAlign: 'center',
      color: '#fff',
      minWidth: '320px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      border: '1px solid #333',
    });

    var title = document.createElement('div');
    title.textContent = '\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u4E2D...';
    title.style.fontSize = '18px';
    title.style.fontWeight = '700';
    title.style.marginBottom = '16px';

    var status = document.createElement('div');
    status.id = 'dw-progress-status';
    status.textContent = '\u6E96\u5099\u4E2D...';
    status.style.fontSize = '14px';
    status.style.color = '#aaa';
    status.style.marginBottom = '16px';

    var barBg = document.createElement('div');
    Object.assign(barBg.style, {
      width: '100%',
      height: '8px',
      background: '#333',
      borderRadius: '4px',
      overflow: 'hidden',
    });

    var barFill = document.createElement('div');
    barFill.id = 'dw-progress-bar';
    Object.assign(barFill.style, {
      width: '0%',
      height: '100%',
      background: 'linear-gradient(90deg, #ec4899, #f472b6)',
      borderRadius: '4px',
      transition: 'width 0.3s ease',
    });

    barBg.appendChild(barFill);
    box.appendChild(title);
    box.appendChild(status);
    box.appendChild(barBg);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    return overlay;
  }

  function updateProgress(current, total, pageName) {
    var status = document.getElementById('dw-progress-status');
    var bar = document.getElementById('dw-progress-bar');
    if (status) {
      status.textContent = current + '/' + total + ' \u30DA\u30FC\u30B8\u53D6\u5F97\u4E2D... ' + pageName;
    }
    if (bar) {
      bar.style.width = Math.round((current / total) * 100) + '%';
    }
  }

  function removeProgressOverlay() {
    var overlay = document.getElementById('dw-progress-overlay');
    if (overlay) overlay.remove();
  }

  // --- サイドバーからWikiリンクを取得 ---
  function getWikiLinks() {
    var links = document.querySelectorAll('a[href^="/wiki/"]');
    var seen = {};
    var result = [];
    links.forEach(function (a) {
      var href = a.getAttribute('href');
      if (!seen[href]) {
        seen[href] = true;
        // リンクテキストを取得（SVGアイコンなどを除外）
        var textEl = a.querySelector('div.overflow-hidden') || a;
        var name = (textEl.textContent || '').trim();
        result.push({ href: href, name: name });
      }
    });
    return result;
  }

  // --- HTMLからコンテンツ要素を抽出 ---
  function extractContent(doc) {
    // メインコンテンツ領域を探す
    var content = doc.querySelector('.prose-custom');
    if (!content) {
      content = doc.querySelector('.prose.prose-invert');
    }
    if (!content) {
      content = doc.querySelector('.wiki-content-container');
    }
    if (!content) {
      content = doc.querySelector('.wiki-container');
    }
    if (!content) return null;

    // クローンを作成して不要な要素を除去（元のDOMを壊さない）
    var clone = content.cloneNode(true);

    // コピーリンクボタン（見出し横の「Link copied!」テキストを含む）を除去
    clone.querySelectorAll('button[aria-label="Copy link to header"]').forEach(function (el) {
      el.remove();
    });
    // ツールチップspan（id="tooltip-..."）を除去
    clone.querySelectorAll('span[id^="tooltip-"]').forEach(function (el) {
      el.remove();
    });

    return clone;
  }

  // --- ページタイトルを取得 ---
  function getPageTitle(doc) {
    var titleTag = doc.querySelector('title');
    if (titleTag) {
      var text = titleTag.textContent || '';
      // "DeepWiki: xxx" の形式から "xxx" を抽出
      var match = text.match(/^DeepWiki:\s*(.+)$/);
      if (match) return match[1].trim();
      return text.trim();
    }
    // タイトルタグがない場合、h1を使用
    var h1 = doc.querySelector('h1');
    if (h1) return (h1.textContent || '').trim();
    return '';
  }

  // --- Turndown設定 ---
  function createTurndownService() {
    var td = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
      emDelimiter: '*',
    });

    // コピーリンクボタンを除外
    td.remove(function (node) {
      if (node.nodeName === 'BUTTON' && node.getAttribute('aria-label') === 'Copy link to header') {
        return true;
      }
      // ツールチップspanを除外
      if (node.nodeName === 'SPAN' && node.id && node.id.startsWith('tooltip-')) {
        return true;
      }
      // SVGアイコンを除外
      if (node.nodeName === 'svg' || node.nodeName === 'SVG') {
        return true;
      }
      return false;
    });

    // details/summary要素の処理
    td.addRule('details', {
      filter: 'details',
      replacement: function (content, node) {
        var summary = node.querySelector('summary');
        var summaryText = summary ? summary.textContent.trim() : '';
        // details内のsummary以降のコンテンツだけを取得
        var innerContent = content;
        if (summaryText && innerContent.indexOf(summaryText) === 0) {
          innerContent = innerContent.substring(summaryText.length).trim();
        }
        return '\n\n<details>\n<summary>' + summaryText + '</summary>\n\n' + innerContent + '\n\n</details>\n\n';
      },
    });

    // mermaidダイアグラムは除外（SVGレンダリングなので変換不可）
    td.addRule('mermaid', {
      filter: function (node) {
        return node.classList && (node.classList.contains('mermaid') || node.classList.contains('mermaid-container'));
      },
      replacement: function () {
        return '';
      },
    });

    return td;
  }

  // --- ページを取得してMarkdownに変換 ---
  async function fetchAndConvert(url, turndownService) {
    var fullUrl = window.location.origin + url;
    var response = await fetch(fullUrl, { credentials: 'same-origin' });
    if (!response.ok) {
      throw new Error('HTTP ' + response.status + ': ' + url);
    }
    var html = await response.text();
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, 'text/html');

    var contentEl = extractContent(doc);
    if (!contentEl) {
      return '<!-- \u30B3\u30F3\u30C6\u30F3\u30C4\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3067\u3057\u305F: ' + url + ' -->\n';
    }

    var markdown = turndownService.turndown(contentEl);
    return markdown;
  }

  // --- プロジェクト名を取得 ---
  function getProjectName() {
    // 現在のページタイトルから取得
    var titleMatch = document.title.match(/^DeepWiki:\s*(.+)$/);
    if (titleMatch) {
      return titleMatch[1].trim().replace(/\//g, '_');
    }
    // ブレッドクラムから取得
    var breadcrumb = document.querySelector('nav[aria-label="breadcrumb"]');
    if (breadcrumb) {
      var spans = breadcrumb.querySelectorAll('span.truncate');
      if (spans.length > 0) {
        return spans[spans.length - 1].textContent.trim().replace(/\//g, '_');
      }
    }
    return 'deepwiki-export';
  }

  // --- ファイルをダウンロード ---
  function downloadMarkdown(content, filename) {
    var blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --- メイン処理: エクスポート実行 ---
  async function startExport() {
    var btn = document.getElementById('dw-export-btn');
    if (btn) btn.style.display = 'none';

    var wikiLinks = getWikiLinks();
    if (wikiLinks.length === 0) {
      alert('\u30B5\u30A4\u30C9\u30D0\u30FC\u306BWiki\u30DA\u30FC\u30B8\u306E\u30EA\u30F3\u30AF\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3067\u3057\u305F\u3002\n\u30EB\u30FC\u30C8\u753B\u9762\uFF08\u30B5\u30A4\u30C9\u30D0\u30FC\u306B\u5168\u30DA\u30FC\u30B8\u304C\u4E26\u3093\u3067\u3044\u308B\u72B6\u614B\uFF09\u3067\u5B9F\u884C\u3057\u3066\u304F\u3060\u3055\u3044\u3002');
      if (btn) btn.style.display = '';
      return;
    }

    var overlay = createProgressOverlay();
    var turndownService = createTurndownService();
    var allMarkdown = [];
    var projectName = getProjectName();
    var errors = [];

    for (var i = 0; i < wikiLinks.length; i++) {
      var link = wikiLinks[i];
      updateProgress(i + 1, wikiLinks.length, link.name || link.href);

      try {
        var md = await fetchAndConvert(link.href, turndownService);
        // ページ区切り: リポジトリ名をヘッダーとして追加
        var pageName = link.name || link.href.split('/').pop();
        var header = '# ' + pageName + '\n\n';
        allMarkdown.push(header + md);
      } catch (e) {
        errors.push(link.href + ': ' + e.message);
        allMarkdown.push('# ' + (link.name || link.href) + '\n\n> \u30A8\u30E9\u30FC: \u30DA\u30FC\u30B8\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F (' + e.message + ')\n');
      }

      // サーバーへの負荷軽減のため少し待機
      if (i < wikiLinks.length - 1) {
        await new Promise(function (resolve) { setTimeout(resolve, 500); });
      }
    }

    // 全ページを結合
    var combined = allMarkdown.join('\n\n---\n\n');

    // ファイル名の生成
    var filename = projectName + '.md';

    // ダウンロード
    downloadMarkdown(combined, filename);

    removeProgressOverlay();

    if (errors.length > 0) {
      alert('\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u5B8C\u4E86\uFF08' + errors.length + '\u4EF6\u306E\u30A8\u30E9\u30FC\u3042\u308A\uFF09\n\n' + errors.join('\n'));
    }

    if (btn) btn.style.display = '';
  }

  // --- 初期化: ボタンが必要なページかチェックして配置 ---
  function init() {
    // サイドバーにwikiリンクがあるか確認（遅延ロード対応）
    function tryInit() {
      var wikiLinks = document.querySelectorAll('a[href^="/wiki/"]');
      if (wikiLinks.length > 0) {
        createExportButton();
        return true;
      }
      return false;
    }

    if (!tryInit()) {
      // SPAの場合、DOMの変化を監視してリンクが出現したら初期化
      var attempts = 0;
      var maxAttempts = 30;
      var interval = setInterval(function () {
        attempts++;
        if (tryInit() || attempts >= maxAttempts) {
          clearInterval(interval);
        }
      }, 1000);
    }
  }

  // ページ読み込み完了後に初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
