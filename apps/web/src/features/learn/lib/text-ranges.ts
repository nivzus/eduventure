/**
 * Plain-text offsets ⇄ DOM Ranges inside a rendered article body.
 * Offsets count characters of the body's text nodes in document order (same as Range#toString),
 * so annotations survive re-renders as long as the markdown is unchanged.
 */

function textNodes(root: Node): Text[] {
  const out: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n = walker.nextNode();
  while (n) {
    out.push(n as Text);
    n = walker.nextNode();
  }
  return out;
}

/** Character offset of a (container, offset) boundary point relative to `root`. */
function boundaryOffset(root: HTMLElement, container: Node, offset: number): number {
  const r = document.createRange();
  r.selectNodeContents(root);
  try {
    r.setEnd(container, offset);
  } catch {
    return 0;
  }
  return r.toString().length;
}

export function rangeToOffsets(root: HTMLElement, range: Range): { start: number; end: number } | null {
  if (!root.contains(range.commonAncestorContainer)) return null;
  const start = boundaryOffset(root, range.startContainer, range.startOffset);
  const end = boundaryOffset(root, range.endContainer, range.endOffset);
  if (end <= start) return null;
  return { start, end };
}

export function offsetsToRange(root: HTMLElement, start: number, end: number): Range | null {
  const nodes = textNodes(root);
  let acc = 0;
  let startNode: Text | null = null;
  let startOff = 0;
  let endNode: Text | null = null;
  let endOff = 0;
  for (const node of nodes) {
    const len = node.data.length;
    if (!startNode && start <= acc + len) {
      startNode = node;
      startOff = Math.max(0, start - acc);
    }
    if (startNode && end <= acc + len) {
      endNode = node;
      endOff = Math.max(0, end - acc);
      break;
    }
    acc += len;
  }
  if (!startNode || !endNode) return null;
  const r = document.createRange();
  try {
    r.setStart(startNode, Math.min(startOff, startNode.data.length));
    r.setEnd(endNode, Math.min(endOff, endNode.data.length));
  } catch {
    return null;
  }
  return r;
}

/** Full plain text of the root (cached by callers). */
export function plainTextOf(root: HTMLElement): string {
  const r = document.createRange();
  r.selectNodeContents(root);
  return r.toString();
}

/**
 * Resolve an annotation to a Range: trust offsets when the quote still matches,
 * otherwise fall back to the nearest occurrence of the quote (content may have been edited).
 */
export function resolveAnnotationRange(
  root: HTMLElement,
  text: string,
  a: { startOffset: number; endOffset: number; quote: string },
): Range | null {
  if (text.slice(a.startOffset, a.endOffset) === a.quote) return offsetsToRange(root, a.startOffset, a.endOffset);
  if (!a.quote) return null;
  let best = -1;
  let bestDist = Infinity;
  let idx = text.indexOf(a.quote);
  while (idx !== -1) {
    const dist = Math.abs(idx - a.startOffset);
    if (dist < bestDist) {
      best = idx;
      bestDist = dist;
    }
    idx = text.indexOf(a.quote, idx + 1);
  }
  if (best === -1) return null;
  return offsetsToRange(root, best, best + a.quote.length);
}

/** Text offset under a viewport point (for clicking on CSS-highlighted text). */
export function offsetAtPoint(root: HTMLElement, x: number, y: number): number | null {
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  let node: Node | null = null;
  let offset = 0;
  if (typeof doc.caretPositionFromPoint === 'function') {
    const pos = doc.caretPositionFromPoint(x, y);
    if (pos) {
      node = pos.offsetNode;
      offset = pos.offset;
    }
  } else if (typeof doc.caretRangeFromPoint === 'function') {
    const r = doc.caretRangeFromPoint(x, y);
    if (r) {
      node = r.startContainer;
      offset = r.startOffset;
    }
  }
  if (!node || !root.contains(node)) return null;
  return boundaryOffset(root, node, offset);
}

// ───────────────────────── CSS Custom Highlight API ─────────────────────────

type HighlightCtor = new (...ranges: Range[]) => unknown;
type HighlightRegistry = { set(name: string, h: unknown): void; delete(name: string): boolean };

export function highlightsSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as unknown as { Highlight?: HighlightCtor }).Highlight === 'function' &&
    typeof CSS !== 'undefined' &&
    'highlights' in CSS
  );
}

export function setHighlight(name: string, ranges: Range[]) {
  if (!highlightsSupported()) return;
  const registry = (CSS as unknown as { highlights: HighlightRegistry }).highlights;
  const Ctor = (window as unknown as { Highlight: HighlightCtor }).Highlight;
  if (ranges.length === 0) registry.delete(name);
  else registry.set(name, new Ctor(...ranges));
}

export function clearHighlight(name: string) {
  if (!highlightsSupported()) return;
  (CSS as unknown as { highlights: HighlightRegistry }).highlights.delete(name);
}
