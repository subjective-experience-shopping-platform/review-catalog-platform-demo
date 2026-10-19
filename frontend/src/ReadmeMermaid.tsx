import { useEffect, useId, useRef, useState } from "react";

// Load Mermaid only when a document contains a diagram. Its render API queues
// concurrent requests, including effects repeated by React StrictMode.
const loadMermaid = () => import("mermaid").then(({ default: mermaid }) => {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    suppressErrorRendering: true,
    theme: "neutral",
    fontFamily: '"Helvetica Neue", "Apple SD Gothic Neo", sans-serif',
  });
  return mermaid;
});
let renderer: ReturnType<typeof loadMermaid> | undefined;
let sequence = 0;

export function ReadmeMermaid({ source }: { source: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    container.current?.replaceChildren();
    (async () => {
      try {
        renderer ??= loadMermaid().catch(error => { renderer = undefined; throw error; });
        const mermaid = await renderer;
        await document.fonts.ready;
        if (cancelled) return;
        const { svg } = await mermaid.render(`readme-mermaid-${id}-${++sequence}`, source);
        if (!cancelled && container.current) {
          // Mermaid sanitizes the SVG under securityLevel: strict.
          container.current.innerHTML = svg;
          setStatus("ready");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, [id, source]);

  return (
    <figure className="readme-mermaid" aria-label="Mermaid 도표" aria-busy={status === "loading"}>
      {status === "loading" && <p role="status">도표를 불러오는 중입니다.</p>}
      <div ref={container} className="readme-mermaid-canvas" role="region" aria-label="도표 (가로 스크롤 가능)" tabIndex={0} hidden={status !== "ready"} />
      {status === "error" && <><p role="status">도표를 표시하지 못했습니다. 원문 코드를 확인해 주세요.</p><pre><code>{source}</code></pre></>}
    </figure>
  );
}
