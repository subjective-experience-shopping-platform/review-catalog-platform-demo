import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { readmeChapters } from '../src/readme.ts';

test('README rendering preserves safe HTML, local navigation, diagrams, and image preview controls', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
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
  } finally {
    await server.close();
  }
});
