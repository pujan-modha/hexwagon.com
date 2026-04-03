"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { getRandomString } from "@primoui/utils";
import { addDays, differenceInCalendarDays, parseISO } from "date-fns";
import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useServerAction } from "zsa-react";
import { toast } from "sonner";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/common/dialog";
import { Button } from "~/components/common/button";
import { Input } from "~/components/common/input";
import { TextArea } from "~/components/common/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/common/select";
import { Checkbox } from "~/components/common/checkbox";
import { Label } from "~/components/common/label";
import { Badge } from "~/components/common/badge";
import { Card, CardDescription, CardHeader } from "~/components/common/card";
import { H4 } from "~/components/common/heading";
import { adsConfig, type AdSpotType } from "~/config/ads";
import { adStatus, type AdStatusValue } from "~/utils/ads";
import type { AdAdminMany } from "~/server/admin/ads/payloads";
import type { AdPricingMap } from "~/server/web/ads/queries";
import { createAd, updateAd } from "~/server/admin/ads/actions";
import {
  AdPreviewBanner,
  AdPreviewCard,
  type AdPreviewAd,
} from "~/components/web/ads/ad-preview";
import { uploadImageToS3 } from "~/actions/media";

const IMAGE_ACCEPT =
  "image/png,image/jpeg,image/jpg,image/webp,image/gif,image/avif,image/svg+xml,.svg";

type AdFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pricing: AdPricingMap;
  ad?: AdAdminMany;
};

const formSchema = z
  .object({
    spot: z.enum(["Banner", "Listing", "Sidebar", "Footer"]),
    email: z.string().email("Must be a valid email address.").max(255),
    name: z.string().min(1, "Ad name is required.").max(255),
    description: z.string().max(500).optional().or(z.literal("")),
    destinationUrl: z.string().url("Must be a valid URL.").max(2048),
    faviconUrl: z
      .string()
      .url("Must be a valid image URL.")
      .max(2048)
      .optional()
      .or(z.literal("")),
    startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a valid date."),
    endsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a valid date."),
    priceUsd: z
      .string()
      .min(1, "Required.")
      .refine((value) => !Number.isNaN(Number(value)) && Number(value) > 0, {
        message: "Must be a positive number.",
      }),
    status: z.enum([
      adStatus.Pending,
      adStatus.Approved,
      adStatus.Rejected,
      adStatus.Cancelled,
    ]),
    markAsPaid: z.boolean(),
    autoPrice: z.boolean(),
    buttonLabel: z.string().max(80).optional().or(z.literal("")),
    useCustomCode: z.boolean(),
    customHtml: z.string().optional().or(z.literal("")),
    customCss: z.string().optional().or(z.literal("")),
    customJs: z.string().optional().or(z.literal("")),
  })
  .refine((value) => new Date(value.endsAt) >= new Date(value.startsAt), {
    message: "End date must be on or after start date.",
    path: ["endsAt"],
  });

type FormValues = z.infer<typeof formSchema>;

const toDateInput = (date: Date) => date.toISOString().split("T")[0] ?? "";

const centsToUsd = (cents?: number | null) => ((cents ?? 0) / 100).toFixed(2);

const usdToCents = (usd: string) => Math.round(Number(usd) * 100);

const AdFormDialog = ({
  open,
  onOpenChange,
  pricing,
  ad,
}: AdFormDialogProps) => {
  const isEdit = ad !== undefined;
  const defaultSpot = (ad?.type ?? "Banner") as AdSpotType;

  const defaultValues: FormValues = isEdit
    ? {
        spot: ad.type as AdSpotType,
        email: ad.email,
        name: ad.name,
        description: ad.description ?? "",
        destinationUrl: ad.websiteUrl,
        faviconUrl: ad.faviconUrl ?? "",
        startsAt: toDateInput(ad.startsAt),
        endsAt: toDateInput(ad.endsAt),
        priceUsd: centsToUsd(ad.priceCents),
        status: ad.status as AdStatusValue,
        markAsPaid: ad.paidAt !== null,
        autoPrice: false,
        buttonLabel: ad.buttonLabel ?? "",
        useCustomCode: Boolean(ad.customHtml || ad.customCss || ad.customJs),
        customHtml: ad.customHtml ?? "",
        customCss: ad.customCss ?? "",
        customJs: ad.customJs ?? "",
      }
    : {
        spot: defaultSpot,
        email: "",
        name: "",
        description: "",
        destinationUrl: "",
        faviconUrl: "",
        startsAt: toDateInput(new Date()),
        endsAt: toDateInput(addDays(new Date(), 7)),
        priceUsd: "",
        status: adStatus.Approved,
        markAsPaid: false,
        autoPrice: true,
        buttonLabel: "",
        useCustomCode: false,
        customHtml: "",
        customCss: "",
        customJs: "",
      };

  const { register, handleSubmit, setValue, control, reset } =
    useForm<FormValues>({
      resolver: zodResolver(formSchema),
      defaultValues,
    });

  useEffect(() => {
    reset(defaultValues);
  }, [ad?.id, open, reset]);

  const watchedValues = useWatch({ control }) as Partial<FormValues>;
  const watchedSpot = (watchedValues.spot ?? defaultValues.spot) as AdSpotType;
  const watchedStart = watchedValues.startsAt ?? defaultValues.startsAt;
  const watchedEnd = watchedValues.endsAt ?? defaultValues.endsAt;
  const watchedAutoPrice = watchedValues.autoPrice ?? defaultValues.autoPrice;

  const days = useMemo(() => {
    const startDate = parseISO(watchedStart);
    const endDate = parseISO(watchedEnd);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()))
      return null;
    if (endDate < startDate) return null;

    return differenceInCalendarDays(endDate, startDate) + 1;
  }, [watchedStart, watchedEnd]);

  const dailyRate = pricing[watchedSpot] ?? pricing.Banner;

  useEffect(() => {
    if (!days) return;

    if (!watchedAutoPrice) return;

    const nextPrice = (days * dailyRate).toFixed(2);
    if (watchedValues.priceUsd !== nextPrice) {
      setValue("priceUsd", nextPrice, { shouldValidate: true });
    }
  }, [dailyRate, days, setValue, watchedAutoPrice, watchedValues.priceUsd]);

  const { execute: createAction, isPending: createPending } = useServerAction(
    createAd,
    {
      onSuccess: () => {
        toast.success("Ad created.");
        onOpenChange(false);
      },
      onError: ({ err }) => toast.error(err.message),
    },
  );

  const { execute: updateAction, isPending: updatePending } = useServerAction(
    updateAd,
    {
      onSuccess: () => {
        toast.success("Ad updated.");
        onOpenChange(false);
      },
      onError: ({ err }) => toast.error(err.message),
    },
  );

  const isPending = createPending || updatePending;

  const { execute: uploadImageAction, isPending: isUploadingImage } =
    useServerAction(uploadImageToS3, {
      onSuccess: ({ data }) => {
        toast.success("Image uploaded successfully.");
        setValue("faviconUrl", data, { shouldValidate: true });
      },
      onError: ({ err }) => toast.error(err.message),
    });

  const previewAd: AdPreviewAd = {
    type: watchedSpot,
    websiteUrl: watchedValues.destinationUrl || "https://example.com",
    name: watchedValues.name || "Ad preview",
    description:
      watchedValues.description || "Campaign description will appear here.",
    buttonLabel: watchedValues.buttonLabel || null,
    faviconUrl: watchedValues.faviconUrl ?? defaultValues.faviconUrl ?? null,
  };

  const PreviewComponent =
    watchedSpot === "Banner" ? AdPreviewBanner : AdPreviewCard;
  const previewPlacement =
    watchedSpot === "Banner"
      ? "Banner placement"
      : watchedSpot === "Sidebar"
        ? "Sidebar placement"
        : watchedSpot === "Footer"
          ? "Footer placement"
          : "Listing placement";

  const onSubmit = (values: FormValues) => {
    const payload = {
      spot: values.spot,
      email: values.email,
      name: values.name,
      description: values.description !== "" ? values.description : undefined,
      destinationUrl: values.destinationUrl,
      faviconUrl: values.faviconUrl !== "" ? values.faviconUrl : undefined,
      startsAt: values.startsAt,
      endsAt: values.endsAt,
      priceCents: usdToCents(values.priceUsd),
      status: values.status,
      markAsPaid: values.markAsPaid,
      buttonLabel: values.buttonLabel !== "" ? values.buttonLabel : undefined,
      customHtml:
        values.useCustomCode && values.customHtml !== ""
          ? values.customHtml
          : undefined,
      customCss:
        values.useCustomCode && values.customCss !== ""
          ? values.customCss
          : undefined,
      customJs:
        values.useCustomCode && values.customJs !== ""
          ? values.customJs
          : undefined,
    };

    if (isEdit) {
      updateAction({ adId: ad.id, ...payload });
      return;
    }

    createAction(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl lg:max-h-[92vh]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Ad" : "Create Ad"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the ad details and save changes."
              : "Create a direct ad deal or house ad."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <form
            id="ad-form"
            onSubmit={handleSubmit(onSubmit)}
            className="grid gap-5 sm:grid-cols-2 lg:pr-1"
          >
            <div className="space-y-4 sm:col-span-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Placement
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="spot">Ad Spot</Label>
                  <Select
                    value={watchedSpot}
                    onValueChange={(value) =>
                      setValue("spot", value as AdSpotType, {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger id="spot">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {adsConfig.adSpots.map((spot) => (
                        <SelectItem key={spot.type} value={spot.type}>
                          {spot.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={watchedValues.status ?? defaultValues.status}
                    onValueChange={(value) =>
                      setValue("status", value as AdStatusValue, {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(adStatus).map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-4 sm:col-span-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Campaign
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="startsAt">Start Date</Label>
                  <Input id="startsAt" type="date" {...register("startsAt")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endsAt">End Date</Label>
                  <Input id="endsAt" type="date" {...register("endsAt")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priceUsd">Total Price</Label>
                  <Input
                    id="priceUsd"
                    type="number"
                    step="0.01"
                    min="0.01"
                    {...register("priceUsd")}
                  />
                </div>
              </div>
              {days !== null && (
                <p className="text-xs text-muted-foreground">
                  {days} day{days === 1 ? "" : "s"} · ${dailyRate.toFixed(2)}
                  /day list rate
                </p>
              )}

              <div className="flex items-center gap-2">
                <Checkbox
                  id="autoPrice"
                  checked={watchedAutoPrice}
                  onCheckedChange={(checked) =>
                    setValue("autoPrice", checked === true)
                  }
                />
                <Label htmlFor="autoPrice">
                  Auto-calculate price from dates and spot rate
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                When enabled, the total price tracks the selected duration and
                current spot rate.
              </p>
            </div>

            <div className="space-y-4 sm:col-span-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Advertiser
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Ad name"
                    {...register("name")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    {...register("email")}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <TextArea
                  id="description"
                  placeholder="Short description for the ad"
                  {...register("description")}
                />
              </div>
            </div>

            <div className="space-y-4 sm:col-span-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Creative
              </p>
              <div className="space-y-2">
                <Label htmlFor="destinationUrl">Destination URL</Label>
                <Input
                  id="destinationUrl"
                  type="url"
                  placeholder="https://example.com"
                  {...register("destinationUrl")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="faviconUrl">Image URL</Label>
                <Input
                  id="faviconUrl"
                  type="url"
                  placeholder="https://example.com/image.png"
                  {...register("faviconUrl")}
                />
                <Input
                  type="file"
                  hover
                  accept={IMAGE_ACCEPT}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;

                    uploadImageAction({
                      file,
                      path: `ads/${getRandomString(12)}/favicon-upload`,
                    });

                    event.currentTarget.value = "";
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to use the website favicon. If none exists, the ad
                  will render without an image.
                </p>
                {isUploadingImage && (
                  <p className="text-xs text-muted-foreground">
                    Uploading image...
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="buttonLabel">Button Label</Label>
                <Input
                  id="buttonLabel"
                  placeholder="Learn more"
                  {...register("buttonLabel")}
                />
              </div>
            </div>

            <div className="space-y-4 sm:col-span-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="markAsPaid"
                  checked={watchedValues.markAsPaid}
                  onCheckedChange={(checked) =>
                    setValue("markAsPaid", checked === true)
                  }
                  disabled={isEdit && ad?.paidAt !== null}
                />
                <Label htmlFor="markAsPaid">Mark as paid</Label>
                {isEdit && ad?.paidAt !== null && (
                  <span className="text-xs text-muted-foreground">
                    Already paid
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4 sm:col-span-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="useCustomCode"
                  checked={watchedValues.useCustomCode}
                  onCheckedChange={(checked) =>
                    setValue("useCustomCode", checked === true)
                  }
                />
                <Label htmlFor="useCustomCode">Use custom HTML/CSS/JS</Label>
              </div>

              {watchedValues.useCustomCode && (
                <div className="grid gap-4 rounded-md border p-4">
                  <div className="space-y-2">
                    <Label htmlFor="customHtml">HTML</Label>
                    <TextArea
                      id="customHtml"
                      className="min-h-28 font-mono text-xs"
                      {...register("customHtml")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customCss">CSS</Label>
                    <TextArea
                      id="customCss"
                      className="min-h-24 font-mono text-xs"
                      {...register("customCss")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customJs">JavaScript</Label>
                    <TextArea
                      id="customJs"
                      className="min-h-24 font-mono text-xs"
                      {...register("customJs")}
                    />
                  </div>
                </div>
              )}
            </div>
          </form>

          <Card className="self-start overflow-hidden border-border/70 bg-muted/25 shadow-sm lg:sticky lg:top-4">
            <div className="flex flex-col gap-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <H4 as="h2">Preview</H4>
                  <CardDescription>
                    Rendered with the same public ad layout used on the site.
                  </CardDescription>
                </div>

                <Badge variant="outline">{previewPlacement}</Badge>
              </div>

              <div
                className={
                  watchedSpot === "Sidebar" || watchedSpot === "Footer"
                    ? "max-w-sm"
                    : "w-full"
                }
              >
                <PreviewComponent ad={previewAd} interactive={false} />
              </div>

              <div className="grid gap-3 rounded-lg border bg-background/70 p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium tabular-nums">
                    {days
                      ? `${days} day${days === 1 ? "" : "s"}`
                      : "Select dates"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Daily rate</span>
                  <span className="font-medium tabular-nums">
                    ${dailyRate.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Total price</span>
                  <span className="font-medium tabular-nums">
                    ${centsToUsd(usdToCents(watchedValues.priceUsd || "0"))}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" form="ad-form" isPending={isPending}>
            {isEdit ? "Save changes" : "Create ad"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { AdFormDialog };
