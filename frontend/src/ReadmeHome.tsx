import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import { ArrowRight, ArrowUpRight } from "./icons";
import { readmeChapters, readmeHref, readmeLocation, resolveReadmeImage, resolveReadmeLink } from "./readme";
import "./readme.css";

const documents = new Map<string, string>();

export function ReadmeHome() {
  const [route, setRoute] = useState(() => readmeLocation(location.hash));
  const [document, setDocument] = useState<{ id: string; text: string } | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const article = useRef<HTMLElement>(null);
  const { chapter, section } = route;
  const index = readmeChapters.indexOf(chapter);
  const markdown = document?.id === chapter.id ? document.text : "";

  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [chapter.id]);

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

  useEffect(() => {
    if (!markdown) return;
    if (section) {
      const target = window.document.getElementById(`readme-${section}`)
        ?? window.document.getElementById(`user-content-${section}`);
      target?.scrollIntoView({ block: "start" });
    }
  }, [markdown, section]);

  function selectChapter() {
    window.scrollTo({ top: 0, behavior: "instant" });
    article.current?.focus({ preventScroll: true });
  }

  const previous = readmeChapters[index - 1];
  const next = readmeChapters[index + 1];

  return (
    <main id="main-content" tabIndex={-1} className="readme-home">
      <aside className="readme-index" aria-label="프로젝트 문서">
        <h2>프로젝트 읽기</h2>
        <nav className="readme-chapters" aria-label="README 선택">
          {readmeChapters.map(item => (
            <a key={item.id} href={readmeHref(item)} aria-current={chapter.id === item.id ? "page" : undefined} onClick={selectChapter}>
              <strong>{item.title}</strong>
              <span>{item.description}</span>
            </a>
          ))}
        </nav>
        <p className="readme-index-note">리뷰에서 출발해 실험과 검색,<br />카탈로그 운영까지.</p>
      </aside>
      <section className="readme-reader" aria-label={chapter.title}>
        <div className="readme-source">
          <span>{chapter.repository === ".github" ? "프로젝트 소개" : chapter.repository}</span>
          <a href={chapter.githubUrl} target="_blank" rel="noreferrer">GitHub 원문 <ArrowUpRight size={16} /></a>
        </div>
        <article ref={article} tabIndex={-1} className="readme-markdown" aria-label={`${chapter.title} README`} aria-busy={!markdown && !error}>
          {error ? (
            <div className="readme-error" role="alert">
              <h1>문서를 불러올 수 없습니다</h1>
              <p>{error}</p>
              <button type="button" className="primary" onClick={() => setAttempt(value => value + 1)}>다시 시도</button>
            </div>
          ) : markdown ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw, rehypeSanitize, [rehypeSlug, { prefix: "readme-" }]]}
              components={{
                a: ({ node: _node, href, children, ...props }) => {
                  const link = resolveReadmeLink(href, chapter, location.href);
                  return <a {...props} href={link.href} target={link.external ? "_blank" : undefined} rel={link.external ? "noreferrer" : undefined}>{children}</a>;
                },
                img: ({ node: _node, src, alt, ...props }) => <img {...props} src={resolveReadmeImage(src, chapter)} alt={alt || `${chapter.title} 문서 이미지`} loading="lazy" />,
                table: ({ node: _node, children, ...props }) => <div className="readme-table" role="region" aria-label="문서 표" tabIndex={0}><table {...props}>{children}</table></div>,
              }}
            >{markdown}</ReactMarkdown>
          ) : (
            <div className="readme-loading" role="status">
              <p>README를 불러오는 중입니다.</p>
              <div aria-hidden="true"><span /><span /><span /><span /></div>
            </div>
          )}
        </article>
        <nav className="readme-pagination" aria-label="이전·다음 README">
          {previous && <a href={readmeHref(previous)} className="readme-previous" onClick={selectChapter}><span>이전 문서<strong>{previous.title}</strong></span><ArrowRight size={24} /></a>}
          {next && <a href={readmeHref(next)} className="readme-next" onClick={selectChapter}><span>다음 문서<strong>{next.title}</strong></span><ArrowRight size={24} /></a>}
        </nav>
      </section>
    </main>
  );
}
