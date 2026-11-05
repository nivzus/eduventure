'use client';

import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { cloneElement, isValidElement, useCallback, useRef, useState, type KeyboardEvent, type ReactElement, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { renderIcon, useAnchoredPosition, useDismiss, useMounted, type Align, type IconLike, type Side } from './_internal';

export interface MenuItem {
  label?: ReactNode;
  icon?: IconLike;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  disabled?: boolean;
  /** right-aligned hint, e.g. "⌘K" */
  shortcut?: string;
  description?: ReactNode;
  /** render a divider instead of an item */
  separator?: boolean;
}

export interface MenuProps {
  /** element (e.g. <IconButton/>) — gets onClick/aria props; or any node (wrapped in a button) */
  trigger: ReactNode;
  items: (MenuItem | null | false | undefined)[];
  align?: Align;
  side?: Side;
  className?: string;
  /** optional header node inside the menu */
  header?: ReactNode;
  /** aria-label when trigger isn't an element */
  label?: string;
}

/**
 * <Menu trigger={<IconButton label="Əməliyyatlar" icon={<MoreHorizontal/>} />}
 *       items={[{label:'Redaktə', icon: Pencil, href:'/x'}, {separator:true}, {label:'Sil', icon: Trash2, danger:true, onClick}]} />
 */
export function Menu({ trigger, items, align = 'end', side = 'bottom', className, header, label }: MenuProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const anchor = useRef<HTMLSpanElement>(null);
  const floating = useRef<HTMLDivElement>(null);
  const mounted = useMounted();
  const pos = useAnchoredPosition(open, anchor, floating, { side, align, offset: 8 });
  useDismiss(open, close, [anchor, floating]);
  const list = items.filter(Boolean) as MenuItem[];

  const focusItem = (dir: 1 | -1 | 0) => {
    const nodes = Array.from(floating.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? []);
    if (!nodes.length) return;
    const i = nodes.indexOf(document.activeElement as HTMLElement);
    const next = dir === 0 ? 0 : (i + dir + nodes.length) % nodes.length;
    nodes[next]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusItem(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusItem(-1);
    } else if (e.key === 'Tab') {
      close();
    }
  };

  const triggerProps = {
    onClick: (e: React.MouseEvent) => {
      if (isValidElement(trigger)) (trigger.props as { onClick?: (e: React.MouseEvent) => void }).onClick?.(e);
      setOpen((o) => !o);
      if (!open) setTimeout(() => focusItem(0), 40);
    },
    'aria-haspopup': 'menu' as const,
    'aria-expanded': open,
  };

  const itemCls = (it: MenuItem) =>
    cn(
      'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium outline-none transition-colors',
      it.danger ? 'text-danger hover:bg-danger/10 focus:bg-danger/10' : 'text-fg hover:bg-fg/[0.06] focus:bg-fg/[0.06]',
      it.disabled && 'pointer-events-none opacity-40',
    );

  const content = (it: MenuItem) => (
    <>
      {it.icon && <span className={cn('shrink-0 [&_svg]:size-4', it.danger ? 'text-danger' : 'text-muted')}>{renderIcon(it.icon, 'size-4', 16)}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate">{it.label}</span>
        {it.description && <span className="block truncate text-xs font-normal text-muted">{it.description}</span>}
      </span>
      {it.shortcut && <span className="font-mono text-[10.5px] text-subtle">{it.shortcut}</span>}
    </>
  );

  return (
    <>
      <span ref={anchor} className="inline-flex">
        {isValidElement(trigger) ? (
          cloneElement(trigger as ReactElement<Record<string, unknown>>, triggerProps)
        ) : (
          <button type="button" aria-label={label} className="inline-flex items-center" {...triggerProps}>
            {trigger}
          </button>
        )}
      </span>
      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={floating}
                role="menu"
                onKeyDown={onKeyDown}
                className={cn('fixed z-[150] min-w-[220px] max-w-[320px] rounded-2xl border border-line-strong bg-elev p-1.5 shadow-pop', className)}
                style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, transformOrigin: pos?.origin }}
                initial={{ opacity: 0, scale: 0.94, filter: 'blur(4px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
                transition={{ type: 'spring', stiffness: 460, damping: 32 }}
              >
                {header && <div className="border-b border-line px-3 pb-2.5 pt-2">{header}</div>}
                {list.map((it, i) =>
                  it.separator ? (
                    <div key={i} role="separator" className="my-1.5 h-px bg-line" />
                  ) : it.href ? (
                    <Link key={i} href={it.href} role="menuitem" aria-disabled={it.disabled} className={itemCls(it)} onClick={() => { it.onClick?.(); close(); }}>
                      {content(it)}
                    </Link>
                  ) : (
                    <button
                      key={i}
                      type="button"
                      role="menuitem"
                      aria-disabled={it.disabled}
                      className={itemCls(it)}
                      onClick={() => {
                        it.onClick?.();
                        close();
                      }}
                    >
                      {content(it)}
                    </button>
                  ),
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
