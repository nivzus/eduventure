'use client';

import { forwardRef, memo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { slugify } from '../../lib/format';
import '../../styles/reader.css';

interface HNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HNode[];
}

const textOf = (n: HNode): string => (n.type === 'text' ? (n.value ?? '') : (n.children ?? []).map(textOf).join(''));

/** rehype plugin: stable, de-duplicated ids on h2/h3 (used by the table of contents). */
function rehypeHeadingIds() {
  return (tree: unknown) => {
    const seen = new Map<string, number>();
    const walk = (node: HNode) => {
      if (node.type === 'element' && (node.tagName === 'h2' || node.tagName === 'h3')) {
        const base = slugify(textOf(node));
        const n = seen.get(base) ?? 0;
        seen.set(base, n + 1);
        node.properties = { ...(node.properties ?? {}), id: n ? `${base}-${n + 1}` : base };
      }
      node.children?.forEach(walk);
    };
    walk(tree as HNode);
  };
}

const components: Components = {
  pre({ node, children, ...rest }) {
    const first = (node as unknown as HNode | undefined)?.children?.[0];
    const cls = first?.properties?.className;
    const lang = Array.isArray(cls)
      ? String(cls.find((c) => String(c).startsWith('language-')) ?? '').replace('language-', '')
      : '';
    return (
      <pre data-lang={lang || 'mətn'} {...rest}>
        {children}
      </pre>
    );
  },
  table({ node: _node, children, ...rest }) {
    return (
      <div className="ev-table-wrap">
        <table {...rest}>{children}</table>
      </div>
    );
  },
  img({ node: _node, alt, src, ...rest }) {
    if (!src) return null;
    return (
      <span className="ev-figure" data-caption={alt || undefined}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={typeof src === 'string' ? src : undefined} alt={alt ?? ''} loading="lazy" {...rest} />
      </span>
    );
  },
  a({ node: _node, href, children, ...rest }) {
    const external = typeof href === 'string' && /^https?:\/\//.test(href);
    return (
      <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} {...rest}>
        {children}
      </a>
    );
  },
};

const plugins = { remark: [remarkGfm], rehype: [rehypeHeadingIds] };

interface MarkdownProps {
  content: string;
  className?: string;
  /** Article reader gets drop cap + section numbers; previews/compact use the base style. */
  variant?: 'reader' | 'compact';
}

/** Markdown renderer with the "expedition journal" typography (see styles/reader.css). */
export const Markdown = memo(
  forwardRef<HTMLDivElement, MarkdownProps>(function Markdown({ content, className, variant = 'reader' }, ref) {
    return (
      <div ref={ref} className={cn('ev-prose', variant === 'reader' && 'ev-prose--reader', className)}>
        <ReactMarkdown remarkPlugins={plugins.remark} rehypePlugins={plugins.rehype} components={components}>
          {content}
        </ReactMarkdown>
      </div>
    );
  }),
);
