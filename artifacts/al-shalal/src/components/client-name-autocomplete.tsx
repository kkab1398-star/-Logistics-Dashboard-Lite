import { useState, useRef, useEffect, useCallback, useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, ChevronDown, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const MIN_CHARS = 1;
const DEBOUNCE_MS = 180;
const NAVY = "#1a3358";
const GOLD = "#c9a227";

interface ClientNameAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  driverId?: number | null;
  className?: string;
  inputClassName?: string;
  showLabel?: boolean;
  required?: boolean;
  disabled?: boolean;
}

export function ClientNameAutocomplete({
  value,
  onChange,
  driverId,
  className,
  inputClassName,
  showLabel = true,
  required = false,
  disabled = false,
}: ClientNameAutocompleteProps) {
  const { t } = useI18n();
  const id = useId();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [isFetching, setIsFetching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < MIN_CHARS) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setIsFetching(true);
    try {
      const params = new URLSearchParams({ q: q.trim() });
      if (driverId) params.set("driverId", String(driverId));
      const res = await fetch(`${BASE_URL}/api/revenues/clients?${params}`);
      if (res.ok) {
        const data: string[] = await res.json();
        setSuggestions(data);
        setOpen(data.length > 0);
      }
    } catch {
      setSuggestions([]);
    } finally {
      setIsFetching(false);
    }
  }, [driverId]);

  useEffect(() => {
    const timer = setTimeout(() => fetchSuggestions(value), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, fetchSuggestions]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIdx(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (name: string) => {
    onChange(name);
    setOpen(false);
    setActiveIdx(-1);
    inputRef.current?.focus();
  };

  const clear = () => {
    onChange("");
    setSuggestions([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = (activeIdx + 1) % suggestions.length;
      setActiveIdx(next);
      listRef.current?.children[next]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = (activeIdx - 1 + suggestions.length) % suggestions.length;
      setActiveIdx(prev);
      listRef.current?.children[prev]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      select(suggestions[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIdx(-1);
    }
  };

  const highlightMatch = (name: string, query: string) => {
    if (!query.trim()) return <span>{name}</span>;
    const idx = name.toLowerCase().indexOf(query.toLowerCase().trim());
    if (idx === -1) return <span>{name}</span>;
    return (
      <>
        {name.slice(0, idx)}
        <mark className="rounded-sm px-0.5" style={{ background: `${GOLD}55`, color: NAVY, fontWeight: 700 }}>
          {name.slice(idx, idx + query.trim().length)}
        </mark>
        {name.slice(idx + query.trim().length)}
      </>
    );
  };

  return (
    <div className={cn("space-y-2", className)}>
      {showLabel && (
        <Label htmlFor={id} className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          {t("clientName")}
        </Label>
      )}
      <div className="relative" ref={containerRef}>
        <div className="relative flex items-center">
          <Input
            ref={inputRef}
            id={id}
            value={value}
            onChange={e => {
              onChange(e.target.value);
              setActiveIdx(-1);
              if (e.target.value.length >= MIN_CHARS) setOpen(true);
              else setOpen(false);
            }}
            onFocus={() => {
              if (value.length >= MIN_CHARS && suggestions.length > 0) setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={t("customerNameHint")}
            className={cn("h-12 bg-muted/50 pe-16", inputClassName)}
            autoComplete="off"
            disabled={disabled}
            required={required}
            aria-autocomplete="list"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-controls={open ? `${id}-list` : undefined}
            aria-activedescendant={activeIdx >= 0 ? `${id}-opt-${activeIdx}` : undefined}
          />
          <div className="absolute end-0 flex items-center pe-2 gap-0.5 pointer-events-none" aria-hidden="true">
            {isFetching && (
              <span className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: NAVY, borderTopColor: "transparent" }} />
            )}
          </div>
          {value && !disabled && (
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); clear(); }}
              className="absolute end-8 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              tabIndex={-1}
              aria-label="Clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onMouseDown={e => {
              e.preventDefault();
              if (open) { setOpen(false); return; }
              if (suggestions.length > 0) setOpen(true);
              else if (value.length >= MIN_CHARS) fetchSuggestions(value);
            }}
            className="absolute end-2 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            tabIndex={-1}
            aria-label="Show suggestions"
            disabled={disabled}
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform duration-150", open && "rotate-180")} />
          </button>
        </div>

        {open && suggestions.length > 0 && (
          <ul
            ref={listRef}
            id={`${id}-list`}
            role="listbox"
            className="absolute z-50 w-full mt-1 rounded-xl border shadow-lg overflow-hidden max-h-52 overflow-y-auto"
            style={{ background: "white", borderColor: `${NAVY}22` }}
          >
            <li className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground border-b" style={{ borderColor: `${GOLD}44`, background: `${NAVY}06` }}>
              {t("clientName")}
            </li>
            {suggestions.map((name, idx) => (
              <li
                key={name}
                id={`${id}-opt-${idx}`}
                role="option"
                aria-selected={idx === activeIdx}
                onMouseDown={e => { e.preventDefault(); select(name); }}
                onMouseEnter={() => setActiveIdx(idx)}
                className={cn(
                  "px-4 py-2.5 text-sm cursor-pointer flex items-center gap-2 transition-colors",
                  idx === activeIdx
                    ? "text-white"
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
                style={idx === activeIdx ? { background: NAVY } : {}}
              >
                <User className="h-3.5 w-3.5 shrink-0 opacity-50" />
                <span className="flex-1 truncate">
                  {highlightMatch(name, value)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
