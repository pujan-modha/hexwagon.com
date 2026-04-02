"use client";

import { useCallback, useState } from "react";
import { useSubmissionStore } from "~/stores/submission-store";
import { searchPlatformsAction } from "~/actions/widget-search";
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

type StepPlatformProps = {
  onNext: () => void;
  onBack: () => void;
};

const StepPlatform = ({ onNext, onBack }: StepPlatformProps) => {
  const { platformName, setPlatform } = useSubmissionStore();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [platforms, setPlatforms] = useState<
    Array<{ id: string; name: string }>
  >([]);

  const handleSearch = useCallback(async (q: string) => {
    setSearch(q);
    const normalizedQuery = q.trim();

    if (normalizedQuery.length < 2) {
      setPlatforms([]);
      return;
    }

    setIsLoading(true);
    try {
      const [results, error] = await searchPlatformsAction({
        query: normalizedQuery,
      });

      if (error) {
        setPlatforms([]);
        return;
      }

      setPlatforms(results ?? []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSelect = (id: string, name: string) => {
    setPlatform(id, name);
    setOpen(false);
    onNext();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="platform-search">Search for a platform</Label>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              variant="secondary"
              className="justify-start text-left font-normal"
              onClick={() => setOpen(true)}
            >
              {platformName ?? "Select a platform..."}
            </Button>
          </DialogTrigger>

          <DialogContent className="p-0">
            <DialogPrimitive.Title className="sr-only">Search for a platform</DialogPrimitive.Title>
            <Command>
              <CommandInput
                placeholder="Search platforms..."
                value={search}
                onValueChange={handleSearch}
              />
              <CommandList>
                <CommandEmpty>
                  {isLoading ? "Searching..." : "No platform found."}
                </CommandEmpty>
                {platforms.map((platform) => (
                  <CommandItem
                    key={platform.id}
                    value={platform.id}
                    onSelect={() => handleSelect(platform.id, platform.name)}
                  >
                    {platform.name}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </DialogContent>
        </Dialog>
      </div>

      <p className="text-sm text-muted-foreground">
        Can&apos;t find your platform?{" "}
        <a
          href="/suggest?type=Platform"
          className="underline hover:text-foreground"
        >
          Suggest a new platform
        </a>
      </p>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!platformName}>
          Next
        </Button>
      </div>
    </div>
  );
};

export { StepPlatform };
