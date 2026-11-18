"use client";

import {
  Children,
  Fragment,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { BottomSheet } from "@/components/ios/bottom-sheet";

/**
 * The app's dropdown. Replaces the browser's <select> so every dropdown looks the same:
 * desktop opens a rounded card menu under the field, phones open a bottom sheet.
 *
 * Written like a native select so swapping is a small edit:
 *   <Select value={x} onChange={(e) => setX(e.target.value)}>
 *     <option value="">All</option>
 *     <optgroup label="Team"><option value="a">A</option></optgroup>
 *   </Select>
 * Or pass `onValueChange={(v) => …}`. `<option data-hint="26">` shows a grey note on the
 * right (counts). An option with value "" that is disabled or hidden is the placeholder.
 */

/** What onChange receives: enough of a change event for `e.target.value` code */
export interface SelectChangeEvent {
  target: { value: string; name?: string };
  currentTarget: { value: string; name?: string };
}

interface Item {
  value: string;
  label: string;
  disabled?: boolean;
  hint?: string;
  group?: string;
}

type Variant = "field" | "filter";

export interface SelectProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "value" | "defaultValue" | "onChange" | "children" | "type"> {
  value?: string | number | null;
  defaultValue?: string | number;
  onChange?: (e: SelectChangeEvent) => void;
  onValueChange?: (value: string) => void;
  /** <option> and <optgroup> elements, as in a native select */
  children: ReactNode;
  /** Shown when nothing is chosen */
  placeholder?: string;
  /** field: form input look (default). filter: pill for filter bars */
  variant?: Variant;
  size?: "sm" | "md";
  /** Filter pill tinted, as a set filter */
  active?: boolean;
  /** Search box in the menu. Default: on when there are 8+ options */
  searchable?: boolean;
  /** Title of the phone sheet. Default: the field's <label>, then aria-label */
  sheetTitle?: string;
  /** Classes for the menu card (e.g. a wider min width) */
  menuClassName?: string;
  /** Submitted with a <form> */
  name?: string;
}

const SEARCH_FROM = 8;

// ─── Reading <option> children ───

function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement(node)) return textOf((node.props as { children?: ReactNode }).children);
  return "";
}

function readOptions(children: ReactNode, group?: string): { items: Item[]; placeholder?: string } {
  const items: Item[] = [];
  let placeholder: string | undefined;
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<Record<string, unknown>>;
    const props = el.props;
    if (el.type === Fragment) {
      const inner = readOptions(props.children as ReactNode, group);
      items.push(...inner.items);
      placeholder ??= inner.placeholder;
    } else if (el.type === "optgroup") {
      const inner = readOptions(props.children as ReactNode, String(props.label ?? ""));
      items.push(...inner.items);
    } else if (el.type === "option") {
      const label = textOf(props.children as ReactNode);
      const value = props.value !== undefined && props.value !== null ? String(props.value) : label;
      if (value === "" && (props.disabled || props.hidden)) {
        placeholder ??= label;
        return;
      }
      if (props.hidden) return;
      items.push({
        value,
        label,
        disabled: !!props.disabled,
        hint: props["data-hint"] !== undefined ? String(props["data-hint"]) : undefined,
        group,
      });
    }
  });
  return { items, placeholder };
}

// ─── Styles ───

const TRIGGER: Record<Variant, Record<"sm" | "md", string>> = {
  field: {
    md: "h-10 w-full rounded-lg bg-surface-container-low px-4 text-body max-lg:min-h-11",
    sm: "h-8 w-full rounded-lg bg-surface-container-low px-3 text-label",
  },
  filter: {
    md: "h-8 rounded-full border px-3 text-label font-medium",
    sm: "h-7 rounded-full border px-2.5 text-caption font-medium",
  },
};

interface MenuPos {
  left: number;
  width: number;
  maxHeight: number;
  /** Set when the menu opens under the field */
  top?: number;
  /** Set when it opens above (distance from the window bottom) */
  bottom?: number;
}

// ─── Component ───

export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  {
    value: valueProp,
    defaultValue,
    onChange,
    onValueChange,
    children,
    placeholder: placeholderProp,
    variant = "field",
    size = "md",
    active,
    searchable,
    sheetTitle,
    menuClassName,
    name,
    id,
    className,
    disabled,
    onKeyDown: onKeyDownProp,
    onClick: onClickProp,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const baseId = id ?? `select-${autoId.replace(/:/g, "")}`;
  const listId = `${baseId}-list`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  useImperativeHandle(ref, () => triggerRef.current as HTMLButtonElement);

  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();

  const controlled = valueProp !== undefined;
  const [inner, setInner] = useState(defaultValue !== undefined ? String(defaultValue) : "");
  const value = controlled ? (valueProp == null ? "" : String(valueProp)) : inner;

  const { items, placeholder: optionPlaceholder } = useMemo(() => readOptions(children), [children]);
  const selected = items.find((i) => i.value === value);
  const placeholder = placeholderProp ?? optionPlaceholder;
  // Like a native select, an unknown value shows the first option unless there is a placeholder
  const shown = selected ?? (placeholder === undefined ? items[0] : undefined);
  const showSearch = searchable ?? items.length >= SEARCH_FROM;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((i) => i.label.toLowerCase().includes(q) || i.group?.toLowerCase().includes(q)) : items;
  }, [items, query]);

  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const choose = useCallback(
    (item: Item) => {
      if (item.disabled) return;
      if (!controlled) setInner(item.value);
      if (item.value !== value) {
        const target = { value: item.value, name };
        onChange?.({ target, currentTarget: target });
        onValueChange?.(item.value);
      }
      close();
    },
    [controlled, value, name, onChange, onValueChange, close],
  );

  // Phone sheet title: the field's visible label when there is one
  const ariaLabel = rest["aria-label"];
  const [labelText, setLabelText] = useState<string | undefined>(sheetTitle);

  const openMenu = () => {
    if (disabled) return;
    setQuery("");
    const current = items.findIndex((i) => i.value === value);
    setActiveIndex(current >= 0 ? current : items.findIndex((i) => !i.disabled));
    if (isMobile) {
      const label = document
        .querySelector(`label[for="${CSS.escape(baseId)}"]`)
        ?.textContent?.replace(/\*/g, "")
        .trim();
      setLabelText(sheetTitle || label || ariaLabel || "Choose");
    } else {
      // First guess before the menu exists, then again once it's drawn (real height)
      place();
      requestAnimationFrame(place);
    }
    setOpen(true);
  };

  const move = (from: number, step: 1 | -1) => {
    if (!visible.length) return -1;
    let i = from;
    for (let n = 0; n < visible.length; n++) {
      i = (i + step + visible.length) % visible.length;
      if (!visible[i].disabled) return i;
    }
    return from;
  };

  // Type a letter on the closed field or open list to jump to it
  const typeahead = useRef({ text: "", at: 0 });
  const jumpTo = (key: string) => {
    const now = Date.now();
    const t = typeahead.current;
    t.text = now - t.at > 700 ? key : t.text + key;
    t.at = now;
    return visible.findIndex((i) => !i.disabled && i.label.toLowerCase().startsWith(t.text.toLowerCase()));
  };

  const onListKeys = (e: KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => move(i, 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => move(i, -1));
        break;
      case "Home":
        if (showSearch) return;
        e.preventDefault();
        setActiveIndex(move(-1, 1));
        break;
      case "End":
        if (showSearch) return;
        e.preventDefault();
        setActiveIndex(move(visible.length, -1));
        break;
      case "Enter":
        e.preventDefault();
        if (visible[activeIndex]) choose(visible[activeIndex]);
        break;
      case " ":
        if (showSearch) return;
        e.preventDefault();
        if (visible[activeIndex]) choose(visible[activeIndex]);
        break;
      case "Escape":
        // Only the menu closes, not the dialog around it
        e.preventDefault();
        e.stopPropagation();
        close();
        break;
      case "Tab":
        close(false);
        break;
      default:
        if (!showSearch && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          const hit = jumpTo(e.key);
          if (hit >= 0) setActiveIndex(hit);
        }
    }
  };

  const onTriggerKeys = (e: KeyboardEvent<HTMLButtonElement>) => {
    onKeyDownProp?.(e);
    if (e.defaultPrevented) return;
    if (open && !isMobile) {
      onListKeys(e);
      return;
    }
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      openMenu();
    } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      // Closed: a letter picks the matching option, like a native select
      const hit = jumpTo(e.key);
      if (hit >= 0) choose(visible[hit]);
    }
  };

  // ─── Desktop menu position: under the field, or above when there's no room ───
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<MenuPos | null>(null);

  const place = useCallback(() => {
    const t = triggerRef.current?.getBoundingClientRect();
    if (!t) return;
    const gap = 6;
    const margin = 12;
    const roomBelow = window.innerHeight - t.bottom - gap - margin;
    const roomAbove = t.top - gap - margin;
    const want = Math.min(menuRef.current?.scrollHeight ?? 320, 320);
    const above = roomBelow < want && roomAbove > roomBelow;
    const maxHeight = Math.max(140, Math.min(320, above ? roomAbove : roomBelow));
    const width = Math.max(t.width, 176);
    const left = Math.min(Math.max(margin, t.left), window.innerWidth - width - margin);
    setPos(
      above
        ? { left, width, maxHeight, bottom: window.innerHeight - t.top + gap }
        : { left, width, maxHeight, top: t.bottom + gap },
    );
  }, []);

  useEffect(() => {
    if (!open || isMobile) return;
    const onMove = () => place();
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      close(false);
    };
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    document.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, isMobile, place, close]);

  // Keep the highlighted row in view while using the arrow keys
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    document.getElementById(`${baseId}-opt-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex, baseId]);

  const activeId = open && activeIndex >= 0 && visible[activeIndex] ? `${baseId}-opt-${activeIndex}` : undefined;

  // ─── Pieces ───

  const searchBox = showSearch && (
    <div className={cn("relative shrink-0", isMobile ? "px-4 pb-2" : "p-1.5 pb-1")}>
      <Search
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/60",
          isMobile ? "left-7" : "left-4",
        )}
      />
      <input
        autoFocus={!isMobile}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(0);
          // Fewer rows can change whether it fits below
          requestAnimationFrame(place);
        }}
        onKeyDown={onListKeys}
        placeholder="Search…"
        aria-label="Search options"
        role="combobox"
        aria-expanded
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        className={cn(
          "w-full rounded-xl bg-surface-container-low pl-9 pr-3 text-body text-on-surface outline-none placeholder:text-placeholder focus:ring-2 focus:ring-primary/30",
          isMobile ? "h-11" : "h-9",
        )}
      />
    </div>
  );

  const rows = (
    <div id={listId} role="listbox" aria-labelledby={baseId} className={cn(isMobile ? "pb-2" : "p-1.5")}>
      {visible.length === 0 && (
        <p className="px-3 py-6 text-center text-label text-on-surface-variant/70">No matches</p>
      )}
      {visible.map((item, index) => {
        const isSelected = item.value === value;
        const isActive = index === activeIndex;
        const newGroup = item.group && item.group !== visible[index - 1]?.group;
        return (
          <Fragment key={`${item.group ?? ""}:${item.value}`}>
            {newGroup && (
              <p
                role="presentation"
                className={cn(
                  "text-caption font-semibold uppercase tracking-wider text-on-surface-variant/70",
                  isMobile ? "px-5 pt-4 pb-1.5" : "px-3 pt-2.5 pb-1",
                )}
              >
                {item.group}
              </p>
            )}
            <div
              id={`${baseId}-opt-${index}`}
              role="option"
              aria-selected={isSelected}
              aria-disabled={item.disabled || undefined}
              onPointerEnter={() => !isMobile && !item.disabled && setActiveIndex(index)}
              onClick={() => choose(item)}
              className={cn(
                "flex cursor-pointer select-none items-center gap-2.5 text-on-surface transition-colors duration-120 ease-standard",
                isMobile
                  ? "mx-2 min-h-12 rounded-2xl px-3 text-body-lg active:bg-surface-container"
                  : "min-h-9 rounded-xl px-2.5 py-1.5 text-body",
                !isMobile && isActive && "bg-surface-container",
                isSelected && "font-medium",
                item.disabled && "cursor-not-allowed opacity-40",
              )}
            >
              {!isMobile && (
                <Check aria-hidden className={cn("h-4 w-4 shrink-0 text-primary", !isSelected && "invisible")} />
              )}
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.hint && <span className="shrink-0 text-label tabular-nums text-on-surface-variant/60">{item.hint}</span>}
              {isMobile && isSelected && <Check aria-hidden className="h-5 w-5 shrink-0 text-primary" />}
            </div>
          </Fragment>
        );
      })}
    </div>
  );

  const opensUp = pos?.bottom !== undefined;

  return (
    <>
      <button
        {...rest}
        ref={triggerRef}
        id={baseId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={!showSearch && !isMobile ? activeId : undefined}
        disabled={disabled}
        onClick={(e) => {
          onClickProp?.(e);
          if (e.defaultPrevented) return;
          if (open) close();
          else openMenu();
        }}
        onKeyDown={onTriggerKeys}
        className={cn(
          "group inline-flex min-w-0 items-center justify-between gap-2 text-left outline-none transition-colors duration-120 ease-standard",
          "focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-50",
          TRIGGER[variant][size],
          variant === "field" &&
            "text-on-surface hover:bg-surface-container aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-error/50",
          variant === "field" && open && "bg-surface-container ring-2 ring-primary/30",
          variant === "filter" &&
            (active
              ? "border-transparent bg-on-surface text-surface"
              : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-outline hover:text-on-surface"),
          className,
        )}
      >
        <span className={cn("min-w-0 flex-1 truncate", !shown && "text-on-surface-variant/60")}>
          {shown ? shown.label : placeholder}
        </span>
        {shown?.hint && variant === "filter" && (
          <span className={cn("tabular-nums", active ? "text-surface/70" : "text-on-surface-variant/60")}>{shown.hint}</span>
        )}
        <ChevronDown
          aria-hidden
          className={cn(
            "shrink-0 transition-transform duration-180 ease-standard",
            variant === "filter" ? "h-3.5 w-3.5" : "h-4 w-4",
            open && "rotate-180",
            variant === "filter" && active ? "text-surface" : "text-on-surface-variant",
          )}
        />
      </button>
      {name && <input type="hidden" name={name} value={value} />}

      {/* Phones: a bottom sheet with big rows */}
      {isMobile && (
        <BottomSheet open={open} onClose={() => close()} title={labelText ?? "Choose"} maxHeight={0.7}>
          {searchBox}
          {rows}
        </BottomSheet>
      )}

      {/* Desktop: a rounded card under (or above) the field */}
      {!isMobile &&
        typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={menuRef}
                key="menu"
                initial={reduceMotion ? false : { opacity: 0, scale: 0.98, y: opensUp ? 4 : -4 }}
                animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: 0.14, ease: [0.2, 0, 0, 1] } }}
                exit={
                  reduceMotion
                    ? { opacity: 0, transition: { duration: 0 } }
                    : { opacity: 0, scale: 0.98, transition: { duration: 0.1 } }
                }
                style={{
                  position: "fixed",
                  left: pos?.left ?? -9999,
                  top: pos ? pos.top : -9999,
                  bottom: pos?.bottom,
                  minWidth: pos?.width,
                  maxHeight: pos?.maxHeight,
                  transformOrigin: opensUp ? "bottom" : "top",
                }}
                className={cn(
                  // Above dialogs (z-50/60) and sheets (z-70)
                  "z-[80] flex max-w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container-lowest shadow-popover",
                  menuClassName,
                )}
              >
                {searchBox}
                <div className="min-h-0 overflow-y-auto overscroll-contain">{rows}</div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
});
