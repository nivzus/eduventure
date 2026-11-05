'use client';

import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

export const controlBase =
  'w-full rounded-2xl border border-line bg-sunken/70 text-[15px] text-fg shadow-[inset_0_1px_2px_rgba(0,0,0,.18)] ' +
  'transition-[border-color,box-shadow,background-color] duration-200 ease-out-expo light:bg-surface light:shadow-none ' +
  'placeholder:text-subtle hover:border-line-strong focus:border-signal/70 focus:outline-none focus-visible:outline-none focus:ring-4 focus:ring-signal/12 ' +
  'light:focus:border-aurora/60 light:focus:ring-aurora/12 ' +
  'disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger/70 aria-[invalid=true]:focus:ring-danger/15';

/* ── Label ───────────────────────────────────────────────────── */
export function Label({ className, children, ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn('text-[13px] font-semibold text-fg', className)} {...rest}>
      {children}
    </label>
  );
}

/* ── Input ───────────────────────────────────────────────────── */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: ReactNode;
  /** element inside the right edge (button, kbd, unit…) */
  rightSlot?: ReactNode;
  invalid?: boolean;
  inputSize?: 'sm' | 'md' | 'lg';
  wrapperClassName?: string;
  ref?: React.Ref<HTMLInputElement>;
}

/** <Input leftIcon={<Search />} placeholder="Axtar…" /> */
export function Input({ leftIcon, rightSlot, invalid, inputSize = 'md', className, wrapperClassName, ref, ...rest }: InputProps) {
  const h = inputSize === 'sm' ? 'h-9 text-sm' : inputSize === 'lg' ? 'h-14 text-base' : 'h-11';
  const input = (
    <input
      ref={ref}
      aria-invalid={invalid || rest['aria-invalid'] || undefined}
      className={cn(controlBase, h, 'px-4', leftIcon && 'pl-11', rightSlot && 'pr-12', className)}
      {...rest}
    />
  );
  if (!leftIcon && !rightSlot) return input;
  return (
    <div className={cn('relative', wrapperClassName)}>
      {leftIcon && (
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-subtle [&_svg]:size-[18px]">{leftIcon}</span>
      )}
      {input}
      {rightSlot && <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center">{rightSlot}</span>}
    </div>
  );
}

/* ── Textarea ────────────────────────────────────────────────── */
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  /** grow with content */
  autoGrow?: boolean;
  ref?: React.Ref<HTMLTextAreaElement>;
}

export function Textarea({ invalid, autoGrow, className, ref, onInput, rows = 4, ...rest }: TextareaProps) {
  const inner = useRef<HTMLTextAreaElement | null>(null);
  const grow = (el: HTMLTextAreaElement | null) => {
    if (!el || !autoGrow) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  };
  useEffect(() => grow(inner.current));
  return (
    <textarea
      ref={(el) => {
        inner.current = el;
        if (typeof ref === 'function') ref(el);
        else if (ref) (ref as React.RefObject<HTMLTextAreaElement | null>).current = el;
      }}
      rows={rows}
      aria-invalid={invalid || rest['aria-invalid'] || undefined}
      className={cn(controlBase, 'min-h-24 resize-y px-4 py-3 leading-relaxed', autoGrow && 'resize-none overflow-hidden', className)}
      onInput={(e) => {
        grow(e.currentTarget);
        onInput?.(e);
      }}
      {...rest}
    />
  );
}

/* ── Select (native) ─────────────────────────────────────────── */
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options?: SelectOption[];
  placeholder?: string;
  invalid?: boolean;
  selectSize?: 'sm' | 'md';
  wrapperClassName?: string;
  ref?: React.Ref<HTMLSelectElement>;
}

/** <Select value={v} onChange={e => setV(e.target.value)} options={[{value:'a',label:'A'}]} /> */
export function Select({ options, placeholder, invalid, selectSize = 'md', className, wrapperClassName, children, ref, ...rest }: SelectProps) {
  return (
    <div className={cn('relative', wrapperClassName)}>
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(controlBase, 'appearance-none pl-4 pr-10', selectSize === 'sm' ? 'h-9 text-sm' : 'h-11', className)}
        {...rest}
      >
        {placeholder !== undefined && (
          <option value="" disabled={rest.required}>
            {placeholder}
          </option>
        )}
        {options?.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
    </div>
  );
}

/* ── Checkbox ────────────────────────────────────────────────── */
export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: ReactNode;
  description?: ReactNode;
  onCheckedChange?: (checked: boolean) => void;
  ref?: React.Ref<HTMLInputElement>;
}

/** <Checkbox checked={v} onCheckedChange={setV} label="Yadda saxla" /> */
export function Checkbox({ label, description, onCheckedChange, onChange, className, id, ref, ...rest }: CheckboxProps) {
  const auto = useId();
  const cid = id ?? auto;
  return (
    <label htmlFor={cid} className={cn('group/cb inline-flex cursor-pointer items-start gap-3', rest.disabled && 'cursor-not-allowed opacity-50', className)}>
      <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center">
        <input
          ref={ref}
          id={cid}
          type="checkbox"
          className="peer absolute inset-0 size-full cursor-pointer appearance-none rounded-[7px] border border-line-strong bg-sunken/60 transition-colors duration-200 checked:border-signal checked:bg-signal hover:border-fg/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal light:bg-surface light:checked:bg-signal"
          onChange={(e) => {
            onChange?.(e);
            onCheckedChange?.(e.target.checked);
          }}
          {...rest}
        />
        <svg viewBox="0 0 16 16" className="pointer-events-none relative size-3.5 text-signal-fg [stroke-dasharray:20] [stroke-dashoffset:20] transition-[stroke-dashoffset] duration-300 ease-out-expo peer-checked:[stroke-dashoffset:0]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8.5l3.2 3L13 4.5" />
        </svg>
      </span>
      {(label || description) && (
        <span className="flex flex-col gap-0.5 leading-snug">
          {label && <span className="text-sm font-medium text-fg">{label}</span>}
          {description && <span className="text-[13px] text-muted">{description}</span>}
        </span>
      )}
    </label>
  );
}

/* ── Switch ──────────────────────────────────────────────────── */
export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  id?: string;
  size?: 'sm' | 'md';
  className?: string;
  'aria-label'?: string;
}

/** <Switch checked={on} onCheckedChange={setOn} label="Qarışdır" /> */
export function Switch({ checked, onCheckedChange, label, description, disabled, id, size = 'md', className, ...rest }: SwitchProps) {
  const auto = useId();
  const sid = id ?? auto;
  const dims = size === 'sm' ? { track: 'h-5 w-9', knob: 'size-4', travel: 16 } : { track: 'h-6 w-11', knob: 'size-5', travel: 20 };
  const btn = (
    <button
      id={sid}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={rest['aria-label']}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex shrink-0 items-center rounded-full border p-[1px] transition-colors duration-300 ease-out-expo disabled:opacity-50',
        dims.track,
        checked ? 'border-signal bg-signal' : 'border-line-strong bg-fg/[0.08]',
      )}
    >
      <motion.span
        className={cn('block rounded-full shadow-[0_1px_3px_rgba(0,0,0,.35)]', dims.knob, checked ? 'bg-signal-fg' : 'bg-fg')}
        animate={{ x: checked ? dims.travel : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
      />
    </button>
  );
  if (!label && !description) return <span className={className}>{btn}</span>;
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <label htmlFor={sid} className="flex cursor-pointer flex-col gap-0.5 leading-snug">
        {label && <span className="text-sm font-medium text-fg">{label}</span>}
        {description && <span className="text-[13px] text-muted">{description}</span>}
      </label>
      {btn}
    </div>
  );
}

/* ── Field ───────────────────────────────────────────────────── */
export interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
  required?: boolean;
  /** element at the right of the label row (e.g. "Şifrəni unutdum") */
  labelRight?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** <Field label="E-poçt" error={errors.email} htmlFor="email"><Input id="email" invalid={!!errors.email} /></Field> */
export function Field({ label, hint, error, htmlFor, required, labelRight, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {(label || labelRight) && (
        <div className="flex items-baseline justify-between gap-3">
          {label && (
            <Label htmlFor={htmlFor}>
              {label}
              {required && <span className="ml-0.5 text-ember">*</span>}
            </Label>
          )}
          {labelRight}
        </div>
      )}
      {children}
      <AnimatePresence initial={false} mode="popLayout">
        {error ? (
          <motion.p
            key="err"
            role="alert"
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-1.5 text-[13px] font-medium text-danger"
          >
            <span className="inline-block size-1 rounded-full bg-danger" />
            {error}
          </motion.p>
        ) : hint ? (
          <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[13px] text-subtle">
            {hint}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
