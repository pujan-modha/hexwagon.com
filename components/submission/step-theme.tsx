"use client";

import { useCallback, useState } from "react";
import { useSubmissionStore } from "~/stores/submission-store";
import { searchThemesAction } from "~/actions/widget-search";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/common/command";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "~/components/common/dialog";
import { Button } from "~/components/common/button";
import { Label } from "~/components/common/label";

type StepThemeProps = {
  onNext: () => void;
};

const StepTheme = ({ onNext }: StepThemeProps) => {
  const { themeName, setTheme } = useSubmissionStore();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [themes, setThemes] = useState<Array<{ id: string; name: string }>>([]);

  const handleSearch = useCallback(async (q: string) => {
    setSearch(q);
    const normalizedQuery = q.trim();

    if (normalizedQuery.length < 2) {
      setThemes([]);
      return;
    }

    setIsLoading(true);
    try {
      const [results, error] = await searchThemesAction({
        query: normalizedQuery,
      });

      if (error) {
        setThemes([]);
        return;
      }

      setThemes(results ?? []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSelect = (id: string, name: string) => {
    setTheme(id, name);
    setOpen(false);
    onNext();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="theme-search">Search for a theme</Label>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              variant="secondary"
              className="justify-start text-left font-normal"
              onClick={() => setOpen(true)}
            >
              {themeName ?? "Select a theme..."}
            </Button>
          </DialogTrigger>

          <DialogContent className="p-0">
            <DialogPrimitive.Title className="sr-only">Search for a theme</DialogPrimitive.Title>
            <Command>
              <CommandInput
                placeholder="Search themes..."
                value={search}
                onValueChange={handleSearch}
              />
              <CommandList>
                <CommandEmpty>
                  {isLoading ? "Searching..." : "No theme found."}
                </CommandEmpty>
                {themes.map((theme) => (
                  <CommandItem
                    key={theme.id}
                    value={theme.id}
                    onSelect={() => handleSelect(theme.id, theme.name)}
                  >
                    {theme.name}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </DialogContent>
        </Dialog>
      </div>

      <p className="text-sm text-muted-foreground">
        Can&apos;t find your theme?{" "}
        <a
          href="/suggest?type=Theme"
          className="underline hover:text-foreground"
        >
          Suggest a new theme
        </a>
      </p>

      <Button onClick={onNext} disabled={!themeName}>
        Next
      </Button>
    </div>
  );
};

export { StepTheme };
