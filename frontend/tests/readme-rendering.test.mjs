import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { readmeChapters } from '../src/readme.ts';

test('README rendering preserves safe HTML, navigation, diagrams, images, and GitHub alerts', async t => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const { ReadmeMarkdown } = await server.ssrLoadModule('/src/ReadmeMarkdown.tsx');
    const render = markdown => renderToStaticMarkup(createElement(ReadmeMarkdown, {
      markdown,
      chapter: readmeChapters[0],
      currentUrl: 'http://127.0.0.1:5173/review-catalog-platform-demo/',
      onPreview: () => {},
    }));

    const links = render('### [Search](https://github.com/example/search)\n\n[Chat](https://subjective-experience-shopping-platform.github.io/review-catalog-platform-demo/#chat)');
    assert.match(links, /<h3 id="readme-search"><a[^>]*target="_blank"[^>]*>Search<svg/);
    assert.match(links, /class="readme-heading-link-icon"/);
    assert.match(links, /<a href="#chat">Chat/);
    assert.doesNotMatch(links, /href="#chat"[^>]*target=/);

    const images = render('<img src="assets/diagram.png" alt="Diagram" width="100%" />');
    assert.match(images, /src="https:\/\/raw.githubusercontent.com\/subjective-experience-shopping-platform\/\.github\/refs\/heads\/main\/profile\/assets\/diagram.png"/);
    assert.match(images, /role="button" tabindex="0" aria-label="Diagram 확대 보기"/);
    assert.match(images, /width="100%"/);

    const diagram = render('```mermaid\nflowchart LR\n A --> B\n```');
    assert.match(diagram, /class="readme-mermaid"/);
    assert.match(diagram, /aria-busy="true"/);
    assert.doesNotMatch(diagram, /<pre>/);
    assert.match(render('```python\nprint("hello")\n```'), /<pre><code class="language-python">/);

    const unsafe = render('<script>alert(1)</script><img src="x" onerror="alert(1)" />\n\n[bad](javascript:alert%281%29)');
    assert.doesNotMatch(unsafe, /<script|onerror=|javascript:/);
    assert.match(render('> Compact quote'), /<blockquote>\s*<p>Compact quote<\/p>\s*<\/blockquote>/);

    await t.test('all five alert types render with a title, icon, and rich body', () => {
      for (const type of ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION']) {
        const alert = render(`> [!${type}]\n> **사용 전 주의사항**\n>\n> 본문과 [Chat](https://subjective-experience-shopping-platform.github.io/review-catalog-platform-demo/#chat)\n>\n> - 항목\n> - 다음 항목`);
        assert.match(alert, new RegExp(`class="markdown-alert markdown-alert-${type.toLowerCase()}"`));
        assert.match(alert, new RegExp(`class="markdown-alert-title"><svg[^>]*aria-hidden="true"[^>]*>.*</svg>${type[0] + type.slice(1).toLowerCase()}</p>`));
        assert.match(alert, /<p><strong>사용 전 주의사항<\/strong><\/p>/);
        assert.match(alert, /<a href="#chat">Chat/);
        assert.match(alert, /<ul>\s*<li>항목<\/li>\s*<li>다음 항목<\/li>\s*<\/ul>/);
        assert.doesNotMatch(alert, /\[!|<blockquote>|<p>\s*<\/p>/);
      }
      assert.match(render('> [!note]\n> 내용'), /markdown-alert-note/);
      assert.match(render('> [!NOTE]\n>\n> 다른 문단'), /<p>다른 문단<\/p>/);
      assert.match(render('> [!NOTE]'), /markdown-alert-note/);
      assert.match(render('> [!NOTE]  \n> 다음 줄'), /<p>\s*다음 줄<\/p>/);
    });

    await t.test('ordinary quotes, unsupported markers, inline titles, and code remain unchanged', () => {
      for (const source of [
        '> [!UNKNOWN]\n> 내용',
        '> [!WARNING] 사용자 지정 제목\n> 내용',
        '> [!WARNING] **사용자 지정 제목**\n> 내용',
        '> [!WARNING] <b>사용자 지정 제목</b>\n> 내용',
        '> 앞 문장\n> [!NOTE]\n> 내용',
        '> `[!NOTE]`\n> 내용',
        '`[!NOTE]`',
        '```markdown\n> [!NOTE]\n> 내용\n```',
      ]) {
        const html = render(source);
        assert.doesNotMatch(html, /markdown-alert/);
        assert.match(html, /\[!/);
      }
    });

    await t.test('alerts inside other elements are not converted', () => {
      for (const source of ['> > [!NOTE]\n> > 내용', '- 항목\n\n  > [!TIP]\n  > 내용', '<div>\n\n> [!NOTE]\n> 내용\n\n</div>']) {
        assert.doesNotMatch(render(source), /markdown-alert/);
      }
    });

    await t.test('alert content is sanitized and adjacent alerts remain separate', () => {
      const html = render('> [!WARNING]\n> <script>alert(1)</script><img src="x" onerror="alert(1)" />\n>\n> [bad](javascript:alert%281%29)\n\n> [!TIP]\n> 안전한 내용');
      assert.equal((html.match(/class="markdown-alert markdown-alert-/g) || []).length, 2);
      assert.doesNotMatch(html, /<script|onerror=|javascript:/);
      assert.match(html, /안전한 내용/);
    });
  } finally {
    await server.close();
  }
});
