import { isTruthy } from "@primoui/utils";
import { PortStatus } from "@prisma/client";
import { addDays, formatDate, isFriday, isMonday, isWednesday } from "date-fns";
import { type ComponentProps, type ReactNode, useState } from "react";
import { useFormContext } from "react-hook-form";
import { Button, type ButtonProps } from "~/components/common/button";
import { Calendar } from "~/components/common/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/common/dialog";
import { H5, H6 } from "~/components/common/heading";
import { Icon } from "~/components/common/icon";
import { Input } from "~/components/common/input";
import { Note } from "~/components/common/note";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/common/popover";
import { RadioGroup, RadioGroupItem } from "~/components/common/radio-group";
import { Stack } from "~/components/common/stack";
import type { PortSchema } from "~/server/admin/ports/schema";

type PortPublishActionsProps = ComponentProps<typeof Stack> & {
  isPending: boolean;
  isStatusPending: boolean;
  canSchedule: boolean;
  onStatusSubmit: (status: PortStatus, publishedAt: Date | null) => void;
};

type PopoverOption = {
  status: PortStatus;
  title: ReactNode;
  description?: ReactNode;
  button?: ButtonProps;
};

type ActionConfig = Omit<ButtonProps, "popover"> & {
  popover?: {
    title: ReactNode;
    description?: ReactNode;
    options: PopoverOption[];
  };
};

const getStatusConfig = (
  status: PortStatus,
  canSchedule: boolean,
  onPublished: () => void,
  onScheduled: () => void,
  onDraft: () => void,
): ActionConfig[] => {
  switch (status) {
    case PortStatus.Scheduled:
      return [
        {
          type: "button",
          children: "Scheduled",
          variant: "secondary",
          prefix: <Icon name="lucide/calendar" />,
          popover: {
            title: "Update port status",
            options: [
              {
                status: PortStatus.Draft,
                title: "Revert to draft",
                description: "Do not publish this port",
                button: {
                  onClick: onDraft,
                  children: "Unschedule",
                },
              },
              {
                status: PortStatus.Scheduled,
                title: "Schedule for later",
                description: "Set automatic future publish date",
                button: {
                  onClick: onScheduled,
                  children: "Reschedule",
                },
              },
              {
                status: PortStatus.Published,
                title: "Publish now",
                description: "Set this port live immediately",
                button: {
                  onClick: onPublished,
                  children: "Publish",
                },
              },
            ],
          },
        },
        {
          type: "submit",
          children: "Update",
          variant: "primary",
        },
      ];
    case PortStatus.Published:
      return [
        {
          type: "button",
          children: "Published",
          variant: "secondary",
          prefix: <Icon name="lucide/badge-check" />,
          popover: {
            title: "Update port status",
            options: [
              {
                status: PortStatus.Draft,
                title: "Unpublished",
                description: "Revert this port to a draft",
                button: {
                  onClick: onDraft,
                  children: "Unpublish",
                },
              },
              {
                status: PortStatus.Published,
                title: "Published",
                description: "Keep this port publicly available",
              },
            ],
          },
        },
        {
          type: "submit",
          children: "Update",
          variant: "primary",
        },
      ];
    case PortStatus.PendingEdit:
    case PortStatus.Draft:
    default:
      const options: PopoverOption[] = [
        {
          status: PortStatus.Published,
          title: "Publish now",
          description: "Set this port live immediately",
          button: {
            onClick: onPublished,
            children: "Publish",
          },
        },
      ];

      if (canSchedule) {
        options.push({
          status: PortStatus.Scheduled,
          title: "Schedule for later",
          description: "Set automatic future publish date",
          button: {
            onClick: onScheduled,
            children: "Schedule",
          },
        });
      }

      return [
        {
          type: "button",
          children:
            status === PortStatus.PendingEdit ? "Pending Edit" : "Publish",
          variant: "fancy",
          popover: {
            title: "Ready to publish this port?",
            options,
          },
        },
        {
          type: "submit",
          children: "Save Draft",
          variant: "primary",
        },
      ];
  }
};

export const PortPublishActions = ({
  isPending,
  isStatusPending,
  canSchedule,
  onStatusSubmit,
  children,
  ...props
}: PortPublishActionsProps) => {
  const { watch } = useFormContext<PortSchema>();
  const [status, publishedAt] = watch(["status", "publishedAt"]);
  const publishedAtDate = new Date(publishedAt ?? new Date());

  const [isOpen, setIsOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(status);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    formatDate(publishedAtDate, "yyyy-MM-dd"),
  );
  const [selectedTime, setSelectedTime] = useState(
    formatDate(publishedAtDate, "HH:mm"),
  );

  const handlePublished = () => {
    onStatusSubmit(PortStatus.Published, new Date());
    setIsOpen(false);
  };

  const handleScheduled = () => {
    const scheduledDate = new Date(`${selectedDate}T${selectedTime}`);
    onStatusSubmit(PortStatus.Scheduled, scheduledDate);
    setIsOpen(false);
  };

  const handleDraft = () => {
    onStatusSubmit(PortStatus.Draft, null);
    setIsOpen(false);
  };

  const portActions = getStatusConfig(
    status,
    canSchedule,
    handlePublished,
    handleScheduled,
    handleDraft,
  );

  return (
    <Stack size="sm" {...props}>
      {children}

      {portActions.map(({ popover, ...action }) => {
        if (popover) {
          const opts = popover.options;
          const currentOption =
            opts.find((o) => o.status === currentStatus) || opts[0];

          return (
            <Popover
              key={String(action.children)}
              open={isOpen}
              onOpenChange={setIsOpen}
            >
              <PopoverTrigger asChild>
                <Button size="md" isPending={isStatusPending} {...action} />
              </PopoverTrigger>

              <PopoverContent
                align="center"
                side="top"
                sideOffset={8}
                className="w-72"
                onOpenAutoFocus={(e) => e.preventDefault()}
                asChild
              >
                <Stack
                  size="lg"
                  direction="column"
                  className="items-stretch gap-5 min-w-80"
                >
                  <Stack size="sm" direction="column">
                    <H5>{popover.title}</H5>

                    {popover.description && <Note>{popover.description}</Note>}
                  </Stack>

                  <RadioGroup
                    defaultValue={currentOption.status}
                    className="contents"
                    onValueChange={(value) =>
                      setCurrentStatus(value as PortStatus)
                    }
                  >
                    {opts.map((option) => (
                      <Stack
                        size="sm"
                        className="items-start"
                        key={option.status}
                      >
                        <RadioGroupItem
                          id={option.status}
                          value={option.status}
                          className="mt-0.5"
                        />

                        <Stack
                          size="sm"
                          direction="column"
                          className="grow"
                          asChild
                        >
                          <label htmlFor={option.status}>
                            <H6>{option.title}</H6>

                            {option.description && (
                              <Note>{option.description}</Note>
                            )}

                            {option.status === PortStatus.Scheduled &&
                              currentStatus === PortStatus.Scheduled && (
                                <Stack
                                  size="sm"
                                  wrap={false}
                                  className="mt-2 items-stretch w-full"
                                >
                                  <Button
                                    size="md"
                                    variant="secondary"
                                    onClick={() => setIsScheduleOpen(true)}
                                    suffix={<Icon name="lucide/calendar" />}
                                    className="w-full tabular-nums"
                                  >
                                    {selectedDate}
                                  </Button>

                                  <Input
                                    type="time"
                                    value={selectedTime}
                                    onChange={(e) =>
                                      setSelectedTime(e.target.value)
                                    }
                                    className="w-full tabular-nums"
                                  />

                                  <Dialog
                                    open={isScheduleOpen}
                                    onOpenChange={setIsScheduleOpen}
                                  >
                                    <DialogContent className="max-w-sm">
                                      <DialogHeader>
                                        <DialogTitle>
                                          Pick a date to publish
                                        </DialogTitle>
                                      </DialogHeader>

                                      <Calendar
                                        mode="single"
                                        selected={new Date(selectedDate)}
                                        disabled={{ before: new Date() }}
                                        onSelect={(date) => {
                                          date &&
                                            setSelectedDate(
                                              formatDate(date, "yyyy-MM-dd"),
                                            );
                                          setIsScheduleOpen(false);
                                        }}
                                        modifiers={{
                                          schedulable: Array.from(
                                            { length: 365 },
                                            (_, i) => {
                                              const date = addDays(
                                                new Date(),
                                                i,
                                              );
                                              return isMonday(date) ||
                                                isWednesday(date) ||
                                                isFriday(date)
                                                ? date
                                                : undefined;
                                            },
                                          ).filter(isTruthy),
                                        }}
                                        modifiersClassNames={{
                                          schedulable:
                                            "before:absolute before:bottom-0.5 before:left-1/2 before:z-10 before:size-1 before:rounded-full before:bg-chart-1 before:-translate-x-1/2",
                                        }}
                                      />
                                    </DialogContent>
                                  </Dialog>
                                </Stack>
                              )}
                          </label>
                        </Stack>
                      </Stack>
                    ))}
                  </RadioGroup>

                  <Stack className="justify-between">
                    <Button
                      size="md"
                      variant="secondary"
                      onClick={() => setIsOpen(false)}
                    >
                      Cancel
                    </Button>

                    {currentOption.button && (
                      <Button
                        size="md"
                        isPending={isStatusPending}
                        {...currentOption.button}
                      />
                    )}
                  </Stack>
                </Stack>
              </PopoverContent>
            </Popover>
          );
        }

        return (
          <Button
            key={String(action.children)}
            name="submit"
            size="md"
            isPending={isPending}
            className="lg:min-w-24"
            {...action}
          />
        );
      })}
    </Stack>
  );
};
