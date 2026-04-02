"use client";

import { useDebouncedState } from "@mantine/hooks";
import Image from "next/image";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useServerAction } from "zsa-react";
import { searchItems } from "~/actions/search";
import { Button } from "~/components/common/button";
import { Icon } from "~/components/common/icon";
import { VerifiedBadge } from "~/components/web/verified-badge";
import { platformHref, themeHref, themePlatformHref } from "~/lib/catalogue";
import type { IconName } from "~/types/icons";
import { cx } from "~/utils/cva";

const THEME_PLACEHOLDERS = [
  "Tokyo Night",
  "Catppuccin",
  "Gruvbox",
  "Nord",
  "One Dark",
  "Solarized",
];

const PLATFORM_PLACEHOLDERS = [
  "VS Code",
  "Neovim",
  "JetBrains",
  "Terminal",
  "Sublime Text",
  "Vim",
];

type ThemeHit = {
  slug: string;
  name: string;
  faviconUrl?: string;
  isVerified?: boolean;
};

type PlatformHit = {
  slug: string;
  name: string;
  faviconUrl?: string;
  isVerified?: boolean;
};

type ActiveField = "theme" | "platform" | null;

const normalize = (value: string) => value.trim();

const queryHref = (pathname: string, query: string) => {
  const params = new URLSearchParams({ q: query });
  return `${pathname}?${params.toString()}`;
};

export const HeroSearch = () => {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const themeFieldRef = useRef<HTMLDivElement>(null);
  const platformFieldRef = useRef<HTMLDivElement>(null);

  const [theme, setTheme] = useState("");
  const [platform, setPlatform] = useState("");
  const [themePlaceholder, setThemePlaceholder] = useState(
    THEME_PLACEHOLDERS[0] ?? "",
  );
  const [platformPlaceholder, setPlatformPlaceholder] = useState(
    PLATFORM_PLACEHOLDERS[0] ?? "",
  );
  const [themeResults, setThemeResults] = useState<ThemeHit[]>([]);
  const [platformResults, setPlatformResults] = useState<PlatformHit[]>([]);
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [dropdownAnchor, setDropdownAnchor] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);

  const [debouncedTheme, setDebouncedTheme] = useDebouncedState("", 350);
  const [debouncedPlatform, setDebouncedPlatform] = useDebouncedState("", 350);

  useEffect(() => {
    let themeIndex = 0;
    let platformIndex = 0;

    const interval = setInterval(() => {
      themeIndex = (themeIndex + 1) % THEME_PLACEHOLDERS.length;
      platformIndex = (platformIndex + 1) % PLATFORM_PLACEHOLDERS.length;

      setThemePlaceholder(THEME_PLACEHOLDERS[themeIndex] ?? "");
      setPlatformPlaceholder(PLATFORM_PLACEHOLDERS[platformIndex] ?? "");
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      if (!formRef.current?.contains(target)) {
        setActiveField(null);
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  useEffect(() => {
    if (!activeField || !formRef.current) {
      setDropdownAnchor(null);
      return;
    }

    const targetRef =
      activeField === "theme" ? themeFieldRef : platformFieldRef;

    const updateAnchor = () => {
      const targetEl = targetRef.current;
      const formEl = formRef.current;

      if (!targetEl || !formEl) return;

      const fieldRect = targetEl.getBoundingClientRect();
      const formRect = formEl.getBoundingClientRect();

      setDropdownAnchor({
        left: fieldRect.left - formRect.left,
        top: fieldRect.bottom - formRect.top + 8,
        width: fieldRect.width,
      });
    };

    updateAnchor();

    window.addEventListener("resize", updateAnchor);
    window.addEventListener("scroll", updateAnchor, true);

    return () => {
      window.removeEventListener("resize", updateAnchor);
      window.removeEventListener("scroll", updateAnchor, true);
    };
  }, [activeField, theme, platform]);

  const themeSearch = useServerAction(searchItems, {
    onSuccess: ({ data }) => {
      if (data?.telemetry.usedFallback) {
        posthog.capture("search_meili_fallback", {
          source: "hero_search",
          field: "theme",
          queryLength: data.telemetry.queryLength,
          fallbackIndexes: data.telemetry.fallbackIndexes,
          fallbackReasons: data.telemetry.fallbackReasons,
          meiliFailures: data.telemetry.meiliFailures,
        });
      }

      const hits = data?.themes?.hits;
      setThemeResults(
        Array.isArray(hits) ? (hits as ThemeHit[]).slice(0, 5) : [],
      );
    },
    onError: () => setThemeResults([]),
  });

  const platformSearch = useServerAction(searchItems, {
    onSuccess: ({ data }) => {
      if (data?.telemetry.usedFallback) {
        posthog.capture("search_meili_fallback", {
          source: "hero_search",
          field: "platform",
          queryLength: data.telemetry.queryLength,
          fallbackIndexes: data.telemetry.fallbackIndexes,
          fallbackReasons: data.telemetry.fallbackReasons,
          meiliFailures: data.telemetry.meiliFailures,
        });
      }

      const hits = data?.platforms?.hits;
      setPlatformResults(
        Array.isArray(hits) ? (hits as PlatformHit[]).slice(0, 5) : [],
      );
    },
    onError: () => setPlatformResults([]),
  });

  useEffect(() => {
    const query = normalize(debouncedTheme);

    if (query.length < 2) {
      setThemeResults([]);
      return;
    }

    themeSearch.execute({ query, indexes: ["themes"] });
  }, [debouncedTheme, themeSearch.execute]);

  useEffect(() => {
    const query = normalize(debouncedPlatform);

    if (query.length < 2) {
      setPlatformResults([]);
      return;
    }

    platformSearch.execute({ query, indexes: ["platforms"] });
  }, [debouncedPlatform, platformSearch.execute]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const themeQuery = normalize(theme);
    const platformQuery = normalize(platform);

    if (!themeQuery && !platformQuery) return;

    const topTheme = themeResults[0];
    const topPlatform = platformResults[0];

    if (themeQuery && platformQuery && topTheme?.slug && topPlatform?.slug) {
      router.push(themePlatformHref(topTheme.slug, topPlatform.slug));
      return;
    }

    if (themeQuery && topTheme?.slug) {
      router.push(themeHref(topTheme.slug));
      return;
    }

    if (platformQuery && topPlatform?.slug) {
      router.push(platformHref(topPlatform.slug));
      return;
    }

    if (themeQuery && platformQuery) {
      router.push(queryHref("/themes", `${themeQuery} ${platformQuery}`));
      return;
    }

    if (themeQuery) {
      router.push(queryHref("/themes", themeQuery));
      return;
    }

    router.push(queryHref("/platforms", platformQuery));
  };

  const showThemeSuggestions = normalize(theme).length >= 2;
  const showPlatformSuggestions = normalize(platform).length >= 2;
  const showThemeDropdown = activeField === "theme" && showThemeSuggestions;
  const showPlatformDropdown =
    activeField === "platform" && showPlatformSuggestions;
  const isPending = themeSearch.isPending || platformSearch.isPending;

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="relative z-20 mx-auto w-full max-w-3xl px-6 md:px-2"
      noValidate
    >
      <div
        className="relative overflow-hidden rounded-2xl border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.48)), radial-gradient(circle at top left, rgba(255,255,255,0.08), transparent 35%), radial-gradient(circle at bottom right, rgba(255,255,255,0.04), transparent 30%)",
          backdropFilter: "blur(15px)",
          WebkitBackdropFilter: "blur(15px)",
        }}
      >
        <div className="relative grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <div ref={themeFieldRef} className="relative">
            <SearchField
              label="Theme"
              value={theme}
              placeholder={themePlaceholder}
              onFieldFocus={() => setActiveField("theme")}
              onValueChange={(value) => {
                setTheme(value);
                setDebouncedTheme(value);
                setActiveField("theme");
              }}
            />
          </div>

          <div
            ref={platformFieldRef}
            className="relative border-t border-white/10 sm:border-t-0 sm:border-l"
          >
            <SearchField
              label="Platform"
              value={platform}
              placeholder={platformPlaceholder}
              onFieldFocus={() => setActiveField("platform")}
              onValueChange={(value) => {
                setPlatform(value);
                setDebouncedPlatform(value);
                setActiveField("platform");
              }}
            />
          </div>

          <div className="border-t border-white/10 p-2 sm:border-t-0 sm:border-l">
            <Button
              type="submit"
              variant="fancy"
              size="lg"
              isPending={isPending}
              prefix={
                <Icon
                  name="lucide/search"
                  className="hidden size-[1.1em] md:block"
                />
              }
              className="h-full min-h-11 w-full rounded-lg text-center sm:w-auto"
            >
              Search
            </Button>
          </div>
        </div>
      </div>

      {(showThemeDropdown || showPlatformDropdown) && dropdownAnchor && (
        <div
          className="absolute z-50"
          style={{
            left: `${dropdownAnchor.left}px`,
            top: `${dropdownAnchor.top}px`,
            width: `${dropdownAnchor.width}px`,
          }}
        >
          {showThemeDropdown ? (
            <SuggestionDropdown
              iconName="lucide/star"
              isPending={themeSearch.isPending}
              emptyText="No theme matches yet"
              items={themeResults}
              onSelect={(item) => router.push(themeHref(item.slug))}
            />
          ) : (
            <SuggestionDropdown
              iconName="lucide/server"
              isPending={platformSearch.isPending}
              emptyText="No platform matches yet"
              items={platformResults}
              onSelect={(item) => router.push(platformHref(item.slug))}
            />
          )}
        </div>
      )}
    </form>
  );
};

type SearchFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  className?: string;
  onFieldFocus: () => void;
  onValueChange: (value: string) => void;
};

const SearchField = ({
  label,
  value,
  placeholder,
  className,
  onFieldFocus,
  onValueChange,
}: SearchFieldProps) => {
  return (
    <label
      className={cx(
        "relative flex min-h-14 flex-col justify-center px-4 py-3 text-start backdrop-blur-2xl transition-colors focus-within:bg-white/8",
        className,
      )}
    >
      <span className="mb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
        {label}
      </span>

      <input
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onFocus={onFieldFocus}
        placeholder={placeholder}
        className="w-full bg-transparent text-base font-medium text-foreground outline-none placeholder:text-muted-foreground/60"
      />
    </label>
  );
};

type SuggestionItem = {
  slug: string;
  name: string;
  faviconUrl?: string;
  isVerified?: boolean;
};

type SuggestionDropdownProps<T extends SuggestionItem> = {
  iconName: IconName;
  items: T[];
  isPending: boolean;
  emptyText: string;
  onSelect: (item: T) => void;
};

const SuggestionDropdown = <T extends SuggestionItem>({
  iconName,
  items,
  isPending,
  emptyText,
  onSelect,
}: SuggestionDropdownProps<T>) => {
  return (
    <div className="rounded-xl border border-white/12 bg-background/75 p-2 shadow-[0_24px_45px_-28px_hsl(var(--foreground)/0.9)] backdrop-blur-lg">
      {isPending && (
        <p className="rounded-md border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground/80">
          Searching...
        </p>
      )}

      {!isPending && !items.length && (
        <p className="rounded-md border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground/80">
          {emptyText}
        </p>
      )}

      {!!items.length && (
        <div className="max-h-52 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <button
              key={item.slug}
              type="button"
              className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm font-medium text-secondary-foreground hover:bg-accent hover:text-foreground"
              onClick={() => onSelect(item)}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="grid size-5 shrink-0 place-items-center overflow-hidden rounded bg-background/80">
                  {item.faviconUrl ? (
                    <Image
                      src={item.faviconUrl}
                      alt=""
                      width={20}
                      height={20}
                      className="size-5 object-cover"
                    />
                  ) : (
                    <Icon name={iconName} className="size-3.5 opacity-70" />
                  )}
                </span>
                <span className="truncate">{item.name}</span>
                {item.isVerified ? <VerifiedBadge size="xs" /> : null}
              </span>
              <Icon name="lucide/chevron-right" className="size-4 opacity-50" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
