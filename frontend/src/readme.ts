const organization = "subjective-experience-shopping-platform";
export const demoUrl = `https://${organization}.github.io/review-catalog-platform-demo/`;

export const readmeChapters = [
  { id: "overview", title: "프로젝트 소개", description: "문제 정의와 프로젝트 구성", repository: ".github", path: "profile/README.md" },
  { id: "experiment", title: "속성 추출 실험", description: "Opinion Units와 정규화 평가", repository: "semantic-review-extraction-experiment", path: "README.md" },
  { id: "search", title: "통합 검색", description: "객관·체감·판매 조건 검색", repository: "meta-search", path: "README.md" },
  { id: "platform", title: "카탈로그 파이프라인", description: "처리·검증·버전 관리", repository: "review-catalog-platform", path: "README.md" },
].map(chapter => ({
  ...chapter,
  sourceUrl: `https://raw.githubusercontent.com/${organization}/${chapter.repository}/refs/heads/main/${chapter.path}`,
  githubUrl: `https://github.com/${organization}/${chapter.repository}/blob/main/${chapter.path}`,
}));

export type ReadmeChapter = (typeof readmeChapters)[number];

export function readmeHref(chapter: ReadmeChapter, section = "") {
  const hash = chapter.id === "overview" ? "#home" : `#home/${chapter.id}`;
  return section ? `${hash}?section=${encodeURIComponent(section)}` : hash;
}

export function readmeLocation(hash: string) {
  const [route, query] = hash.replace(/^#/, "").split("?");
  return {
    chapter: readmeChapters.find(chapter => route === `home/${chapter.id}`) ?? readmeChapters[0],
    section: new URLSearchParams(query).get("section") ?? "",
  };
}

export function appPage(hash: string) {
  const route = hash.replace(/^#/, "").split("?")[0];
  return !route || route === "home" || route.startsWith("home/") ? "home" : route;
}

export function resolveReadmeImage(src: string | undefined, chapter: ReadmeChapter) {
  try { return src ? new URL(src, chapter.sourceUrl).href : undefined; }
  catch { return undefined; }
}

// Resolve assets against raw GitHub; resolve document links against the GitHub file.
// Only this app's exact origin and base path are allowed to become local routes.
export function resolveReadmeLink(href: string | undefined, chapter: ReadmeChapter, currentUrl: string) {
  if (!href) return { href: undefined, external: false };
  const sectionHref = (fragment: string) => {
    if (/^#(?:home(?:\/[^?]*)?(?:\?.*)?|chat|report)$/.test(fragment)) return fragment;
    let section = fragment.slice(1);
    try { section = decodeURIComponent(section); } catch { /* Keep malformed fragments readable. */ }
    return readmeHref(chapter, section);
  };
  if (href.startsWith("#")) return { href: sectionHref(href), external: false };
  let url: URL;
  try { url = new URL(href, chapter.githubUrl); }
  catch { return { href: undefined, external: false }; }
  const sameApp = [new URL(demoUrl), new URL(currentUrl)].some(base =>
    url.origin === base.origin && url.pathname.replace(/\/$/, "") === base.pathname.replace(/\/$/, ""),
  );
  if (sameApp) return { href: sectionHref(url.hash || "#home"), external: false };
  return { href: url.href, external: url.protocol === "https:" || url.protocol === "http:" };
}
