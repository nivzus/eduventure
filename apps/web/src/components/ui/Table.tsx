import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/** <Table><THead><TR><TH>Ad</TH></TR></THead><TBody><TR><TD>…</TD></TR></TBody></Table> */
export function Table({ className, children, wrapperClassName, ...rest }: HTMLAttributes<HTMLTableElement> & { wrapperClassName?: string }) {
  return (
    <div className={cn('relative w-full overflow-x-auto rounded-3xl border border-line bg-elev shadow-inner-hl', wrapperClassName)}>
      <table className={cn('w-full border-collapse text-left text-sm', className)} {...rest}>
        {children}
      </table>
    </div>
  );
}
export function THead({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('border-b border-line bg-sunken/40 light:bg-bg/60', className)} {...rest} />;
}
export function TBody({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('[&>tr:last-child]:border-0', className)} {...rest} />;
}
export function TR({ className, interactive, ...rest }: HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }) {
  return <tr className={cn('border-b border-line transition-colors', interactive && 'cursor-pointer hover:bg-fg/[0.025]', className)} {...rest} />;
}
export function TH({ className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn('mono-label whitespace-nowrap px-4 py-3 font-medium first:pl-6 last:pr-6', className)} {...rest} />;
}
export function TD({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3.5 align-middle first:pl-6 last:pr-6', className)} {...rest} />;
}
