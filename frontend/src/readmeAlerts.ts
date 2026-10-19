import type { Element, Root } from "hast";

const alerts = {
  NOTE: { title: "Note", path: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 11v6M12 7v.01" },
  TIP: { title: "Tip", path: "M9 18h6M10 21h4M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 2H9s0-1-1-2Z" },
  IMPORTANT: { title: "Important", path: "M4 3h16v14h-8l-6 4v-4H4V3ZM12 7v4M12 14v.01" },
  WARNING: { title: "Warning", path: "m12 3 10 18H2L12 3ZM12 9v5M12 17v.01" },
  CAUTION: { title: "Caution", path: "m8 2-6 6v8l6 6h8l6-6V8l-6-6H8ZM12 7v6M12 17v.01" },
} as const;

// Run after HTML sanitization: only these fixed classes and SVG paths are added.
export function rehypeReadmeAlerts() {
  return (tree: Root) => {
    // GitHub alerts cannot be nested inside lists, quotes, or other elements.
    for (const node of tree.children) {
      if (node.type !== "element" || node.tagName !== "blockquote") continue;
      const index = node.children.findIndex(child => child.type !== "text" || child.value.trim() !== "");
      const paragraph = node.children[index];
      if (paragraph?.type !== "element" || paragraph.tagName !== "p") continue;
      const marker = paragraph.children[0];
      if (marker?.type !== "text") continue;
      const match = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][\t ]*(?:\r?\n|$)/i.exec(marker.value);
      if (!match) continue;
      const next = paragraph.children[1];
      const hardBreak = !match[0].endsWith("\n") && next?.type === "element" && next.tagName === "br";
      if (!match[0].endsWith("\n") && paragraph.children.length > 1 && !hardBreak) continue;
      const type = match[1].toUpperCase() as keyof typeof alerts;
      const { title, path } = alerts[type];
      marker.value = marker.value.slice(match[0].length);
      if (!marker.value) paragraph.children.shift();
      if (hardBreak) paragraph.children.shift();
      if (!paragraph.children.length) node.children.splice(index, 1);

      const heading: Element = {
        type: "element",
        tagName: "p",
        properties: { className: ["markdown-alert-title"] },
        children: [
          {
            type: "element",
            tagName: "svg",
            properties: {
              viewBox: "0 0 24 24", width: 16, height: 16,
              fill: "none", stroke: "currentColor", strokeWidth: "1.8",
              strokeLinecap: "round", strokeLinejoin: "round", ariaHidden: "true",
            },
            children: [{ type: "element", tagName: "path", properties: { d: path }, children: [] }],
          },
          { type: "text", value: title },
        ],
      };
      node.tagName = "div";
      node.properties = { className: ["markdown-alert", `markdown-alert-${type.toLowerCase()}`] };
      node.children.unshift(heading);
    }
  };
}
