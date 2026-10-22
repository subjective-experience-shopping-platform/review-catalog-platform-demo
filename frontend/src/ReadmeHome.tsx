import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "./icons";
import { readmeChapters, readmeHref, readmeLocation } from "./readme";
import { ReadmeImagePreview, type ReadmePreviewImage } from "./ReadmeImagePreview";
import { ReadmeMarkdown } from "./ReadmeMarkdown";
import "./readme.css";

const documents = new Map<string, string>();
type Heading = { id: string; title: string; level: number };

export function ReadmeHome() {
  const [route, setRoute] = useState(() => readmeLocation(location.hash));
  const [document, setDocument] = useState<{ id: string; text: string } | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [preview, setPreview] = useState<ReadmePreviewImage | null>(null);
  const article = useRef<HTMLElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const [contents, setContents] = useState<{ chapterId: string; headings: Heading[] }>({ chapterId: "", headings: [] });
  const { chapter, section } = route;
  const index = readmeChapters.indexOf(chapter);
  const markdown = document?.id === chapter.id ? document.text : "";

  useEffect(() => {
    setPreview(null);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [chapter.id]);

  useEffect(() => {
    const sync = () => setRoute(readmeLocation(location.hash));
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setError("");
    const cached = documents.get(chapter.id);
    if (cached) {
      setDocument({ id: chapter.id, text: cached });
      return;
    }
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    (async () => {
      try {
        const response = await fetch(chapter.sourceUrl, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();
        if (!text.trim()) throw new Error("Empty README");
        if (!controller.signal.aborted) {
          documents.set(chapter.id, text);
          setDocument({ id: chapter.id, text });
        }
      } catch {
        if (!cancelled) setError("README를 불러오지 못했습니다. 다시 시도하거나 GitHub 원문을 확인해 주세요.");
      } finally {
        window.clearTimeout(timeout);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [chapter, attempt]);

  // Read the sanitized, slugged headings from the same render as the article.
  // This also supports HTML headings and duplicate titles without a second parser.
  useEffect(() => {
    const headings = Array.from(article.current?.querySelectorAll<HTMLElement>(".readme-content :is(h2, h3, h4)[id]") ?? [])
      .map(heading => ({ id: heading.id, title: heading.textContent?.trim() || "", level: Number(heading.tagName.slice(1)) }))
      .filter(heading => heading.title);
    setContents({ chapterId: chapter.id, headings });
  }, [markdown, chapter.id]);

  function scrollToSection(id: string) {
    const target = window.document.getElementById(`readme-${id}`)
      ?? window.document.getElementById(`user-content-${id}`)
      ?? window.document.getElementById(id);
    if (!target) return;
    const offset = window.matchMedia("(max-width: 760px)").matches ? (sidebar.current?.getBoundingClientRect().height ?? 0) + 16 : 32;
    window.scrollTo({ top: window.scrollY + target.getBoundingClientRect().top - offset, behavior: "instant" });
  }

  useEffect(() => {
    if (markdown && section && contents.chapterId === chapter.id) scrollToSection(section);
  }, [markdown, section, contents, chapter.id]);

  function selectChapter() {
    window.scrollTo({ top: 0, behavior: "instant" });
    article.current?.focus({ preventScroll: true });
  }



  const previous = readmeChapters[index - 1];
  const next = readmeChapters[index + 1];

  return (
    <main id="main-content" tabIndex={-1} className="readme-home">
      <aside ref={sidebar} className="readme-index" aria-label="프로젝트 문서">
        <h2>프로젝트 문서</h2>
        <nav className="readme-chapters" aria-label="README 선택">
          {readmeChapters.map(item => (
            <a key={item.id} href={readmeHref(item)} aria-current={chapter.id === item.id ? "page" : undefined} onClick={selectChapter}>
              <strong>{item.title}</strong>
              <span>{item.description}</span>
            </a>
          ))}
        </nav>
        <div className="readme-toc">
          <h2 id="readme-toc-title">문서 목차</h2>
          <nav aria-labelledby="readme-toc-title">
            <ul>
              {(contents.chapterId === chapter.id && !error ? contents.headings : []).map(heading => {
                const sectionId = heading.id.replace(/^readme-/, "");
                return <li key={heading.id} className={`readme-toc-level-${heading.level}`}>
                  <a href={readmeHref(chapter, sectionId)} aria-current={section === sectionId ? "location" : undefined} onClick={event => {
                    event.preventDefault();
                    location.hash = readmeHref(chapter, sectionId);
                    scrollToSection(sectionId);
                  }}>{heading.title}</a>
                </li>;
              })}
            </ul>
          </nav>
        </div>
      </aside>
      <section className="readme-reader" aria-label={chapter.title}>
        <article ref={article} tabIndex={-1} className="readme-markdown" aria-label={`${chapter.title} README`} aria-busy={!markdown && !error}>
          <a className="readme-github-link" href={chapter.repositoryUrl} target="_blank" rel="noreferrer" aria-label={`${chapter.title} GitHub 저장소 (새 탭)`} title="GitHub 저장소 보기">
            <img src={`${import.meta.env.BASE_URL}github-open-link.png`} alt="" width={32} height={32} />
          </a>
          <div className="readme-content">
            {error ? (
              <div className="readme-error" role="alert">
                <h1>문서를 불러올 수 없습니다</h1>
                <p>{error}</p>
                <button type="button" className="primary" onClick={() => setAttempt(value => value + 1)}>다시 시도</button>
              </div>
            ) : markdown ? (
              <ReadmeMarkdown markdown={markdown} chapter={chapter} currentUrl={location.href} onPreview={setPreview} />
            ) : (
              <div className="readme-loading" role="status">
                <p>README를 불러오는 중입니다.</p>
                <div aria-hidden="true"><span /><span /><span /><span /></div>
              </div>
            )}
          </div>
        </article>
        <nav className="readme-pagination" aria-label="이전·다음 README">
          {previous && <a href={readmeHref(previous)} className="readme-previous" onClick={selectChapter}><span>이전 문서<strong>{previous.title}</strong></span><ArrowRight size={24} /></a>}
          {next ? <a href={readmeHref(next)} className="readme-next" onClick={selectChapter}><span>다음 문서<strong>{next.title}</strong></span><ArrowRight size={24} /></a>
            : <a href="#report" className="readme-next readme-report"><span>직접 사용해 보기<strong>리뷰 보고서</strong></span><ArrowRight size={24} /></a>}
        </nav>
      </section>
      {preview && <ReadmeImagePreview image={preview} onClose={() => setPreview(null)} />}
    </main>
  );
}
