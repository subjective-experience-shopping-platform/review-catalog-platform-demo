import { isValidElement, useMemo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import { ArrowUpRight } from "./icons";
import { resolveReadmeImage, resolveReadmeLink, type ReadmeChapter } from "./readme";
import { ReadmeMermaid } from "./ReadmeMermaid";
import type { ReadmePreviewImage } from "./ReadmeImagePreview";

type Props = {
  markdown: string;
  chapter: ReadmeChapter;
  currentUrl: string;
  onPreview: (image: ReadmePreviewImage) => void;
};

export function ReadmeMarkdown({ markdown, chapter, currentUrl, onPreview }: Props) {
  const components = useMemo<Components>(() => ({
    a: ({ node: _node, href, children, ...props }) => {
      const link = resolveReadmeLink(href, chapter, currentUrl);
      return <a {...props} href={link.href} target={link.external ? "_blank" : undefined} rel={link.external ? "noreferrer" : undefined}>{children}{link.href && <ArrowUpRight className="readme-heading-link-icon" size={16} />}</a>;
    },
    img: ({ node: _node, src, alt, ...props }) => <img {...props} src={resolveReadmeImage(src, chapter)} alt={alt || `${chapter.title} 문서 이미지`} loading="lazy" role="button" tabIndex={0} aria-label={`${alt || "문서 이미지"} 확대 보기`}
      onClick={event => {
        event.preventDefault();
        event.stopPropagation();
        if (event.currentTarget.naturalWidth) onPreview({ src: event.currentTarget.currentSrc, alt: alt || `${chapter.title} 문서 이미지`, opener: event.currentTarget });
      }}
      onKeyDown={event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.currentTarget.click();
        }
      }} />,
    pre: ({ node: _node, children, ...props }) => {
      if (isValidElement<{ className?: string; children?: string }>(children) && children.props.className?.split(/\s+/).includes("language-mermaid")) {
        return <ReadmeMermaid source={String(children.props.children ?? "").trim()} />;
      }
      return <pre {...props}>{children}</pre>;
    },
    table: ({ node: _node, children, ...props }) => <div className="readme-table" role="region" aria-label="문서 표" tabIndex={0}><table {...props}>{children}</table></div>,
  }), [chapter, currentUrl, onPreview]);

  return <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    rehypePlugins={[rehypeRaw, rehypeSanitize, [rehypeSlug, { prefix: "readme-" }]]}
    components={components}
  >{markdown}</ReactMarkdown>;
}
