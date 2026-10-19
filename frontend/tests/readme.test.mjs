import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appPage, demoUrl, readmeChapters, readmeHref, readmeLocation, resolveReadmeImage, resolveReadmeLink } from '../src/readme.ts';

const overview = readmeChapters[0];
const experiment = readmeChapters[1];
const platform = readmeChapters[3];
const local = 'http://127.0.0.1:4173/review-catalog-platform-demo/#home';

test('README sources follow the requested order, including the organization profile', () => {
  assert.deepEqual(readmeChapters.map(c => c.repository), ['.github', 'semantic-review-extraction-experiment', 'meta-search', 'review-catalog-platform']);
  assert.equal(overview.sourceUrl, 'https://raw.githubusercontent.com/subjective-experience-shopping-platform/.github/refs/heads/main/profile/README.md');
  for (const chapter of readmeChapters) {
    assert.equal(chapter.repositoryUrl, `https://github.com/subjective-experience-shopping-platform/${chapter.repository}`);
    assert.equal(readmeLocation(readmeHref(chapter)).chapter, chapter);
    assert.equal(appPage(readmeHref(chapter)), 'home');
  }
});

test('home chapter routes coexist with chat, report, and not-found routes', () => {
  assert.equal(appPage(''), 'home');
  assert.equal(appPage('#chat'), 'chat');
  assert.equal(appPage('#report'), 'report');
  assert.equal(appPage('#unknown'), 'unknown');
  assert.equal(readmeLocation('#home/unknown').chapter, overview);
  assert.deepEqual(readmeLocation(readmeHref(experiment, '정성적-평가사용자-평가')), { chapter: experiment, section: '정성적-평가사용자-평가' });
});

test('absolute production demo links become local hash navigation even in a local preview', () => {
  for (const route of ['chat', 'report', 'home', 'home/search']) {
    assert.deepEqual(resolveReadmeLink(demoUrl + '#' + route, overview, local), { href: '#' + route, external: false });
  }
  assert.deepEqual(resolveReadmeLink(demoUrl.replace(/\/$/, '') + '#chat', overview, local), { href: '#chat', external: false });
  assert.deepEqual(resolveReadmeLink(demoUrl, overview, local), { href: '#home', external: false });
  assert.deepEqual(resolveReadmeLink(local.replace('#home', '#report'), overview, local), { href: '#report', external: false });
});

test('README section anchors retain their chapter instead of activating an unknown app page', () => {
  assert.deepEqual(resolveReadmeLink('#평가-설계', experiment, local), { href: readmeHref(experiment, '평가-설계'), external: false });
  assert.deepEqual(resolveReadmeLink('#%ED%8F%89%EA%B0%80', experiment, local), { href: readmeHref(experiment, '평가'), external: false });
  assert.doesNotThrow(() => resolveReadmeLink('#%broken', experiment, local));
  assert.deepEqual(resolveReadmeLink('#chat', experiment, local), { href: '#chat', external: false });
});

test('unrelated URLs and lookalike demo URLs stay external', () => {
  for (const href of ['https://github.com/subjective-experience-shopping-platform/meta-search', 'https://example.com/review-catalog-platform-demo/#chat', 'https://subjective-experience-shopping-platform.github.io/another-project/#chat', demoUrl + 'extra/#chat']) {
    assert.deepEqual(resolveReadmeLink(href, overview, local), { href, external: true });
  }
});

test('relative files open as GitHub documents, while relative images use raw content', () => {
  assert.deepEqual(resolveReadmeLink('AGENTS.md#초기-migration', platform, local), { href: platform.githubUrl.replace('README.md', 'AGENTS.md') + '#%EC%B4%88%EA%B8%B0-migration', external: true });
  assert.equal(resolveReadmeLink('LICENSE', overview, local).href, overview.githubUrl.replace('README.md', 'LICENSE'));
  assert.equal(resolveReadmeImage('assets/page1.png', platform), platform.sourceUrl.replace('README.md', 'assets/page1.png'));
  assert.equal(resolveReadmeImage('https://img.shields.io/badge/MCP-Compatible-blue', overview), 'https://img.shields.io/badge/MCP-Compatible-blue');
  assert.equal(resolveReadmeImage(undefined, overview), undefined);
  assert.equal(resolveReadmeLink(undefined, overview, local).href, undefined);
});

test('malformed URLs cannot crash the README renderer', () => {
  assert.deepEqual(resolveReadmeLink('https://[invalid', overview, local), { href: undefined, external: false });
  assert.equal(resolveReadmeImage('https://[invalid', overview), undefined);
});
