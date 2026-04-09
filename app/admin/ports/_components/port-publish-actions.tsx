import { PortStatus } from "@prisma/client"
import { type ComponentProps, type ReactNode, useState } from "react"
import { useFormContext } from "react-hook-form"
import { Button, type ButtonProps } from "~/components/common/button"
import { H5, H6 } from "~/components/common/heading"
import { Icon } from "~/components/common/icon"
import { Note } from "~/components/common/note"
import { Popover, PopoverContent, PopoverTrigger } from "~/components/common/popover"
import { RadioGroup, RadioGroupItem } from "~/components/common/radio-group"
import { Stack } from "~/components/common/stack"
import type { PortSchema } from "~/server/admin/ports/schema"

type PortPublishActionsProps = ComponentProps<typeof Stack> & {
  isPending: boolean
  isStatusPending: boolean
  onStatusSubmit: (status: PortStatus, publishedAt: Date | null) => void
}

type PopoverOption = {
  status: PortStatus
  title: ReactNode
  description?: ReactNode
  button?: ButtonProps
}

type ActionConfig = Omit<ButtonProps, "popover"> & {
  popover?: {
    title: ReactNode
    description?: ReactNode
    options: PopoverOption[]
  }
}

const getStatusConfig = (
  status: PortStatus,
  onPublished: () => void,
  onDraft: () => void,
): ActionConfig[] => {
  switch (status) {
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
      ]
    default:
      return [
        {
          type: "button",
          children: status === PortStatus.PendingEdit ? "Pending Edit" : "Publish",
          variant: "fancy",
          popover: {
            title: "Ready to publish this port?",
            options: [
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
          children: "Save Draft",
          variant: "primary",
        },
      ]
  }
}

export const PortPublishActions = ({
  isPending,
  isStatusPending,
  onStatusSubmit,
  children,
  ...props
}: PortPublishActionsProps) => {
  const { watch } = useFormContext<PortSchema>()
  const [status] = watch(["status"])

  const [isOpen, setIsOpen] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(status)

  const handlePublished = () => {
    onStatusSubmit(PortStatus.Published, new Date())
    setIsOpen(false)
  }

  const handleDraft = () => {
    onStatusSubmit(PortStatus.Draft, null)
    setIsOpen(false)
  }

  const portActions = getStatusConfig(status, handlePublished, handleDraft)

  return (
    <Stack size="sm" {...props}>
      {children}

      {portActions.map(({ popover, ...action }) => {
        if (popover) {
          const opts = popover.options
          const currentOption = opts.find(o => o.status === currentStatus) || opts[0]

          return (
            <Popover key={String(action.children)} open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <Button size="md" isPending={isStatusPending} {...action} />
              </PopoverTrigger>

              <PopoverContent
                align="center"
                side="top"
                sideOffset={8}
                className="w-72"
                onOpenAutoFocus={e => e.preventDefault()}
                asChild
              >
                <Stack size="lg" direction="column" className="items-stretch gap-5 min-w-80">
                  <Stack size="sm" direction="column">
                    <H5>{popover.title}</H5>

                    {popover.description && <Note>{popover.description}</Note>}
                  </Stack>

                  <RadioGroup
                    defaultValue={currentOption.status}
                    className="contents"
                    onValueChange={value => setCurrentStatus(value as PortStatus)}
                  >
                    {opts.map(option => (
                      <Stack size="sm" className="items-start" key={option.status}>
                        <RadioGroupItem
                          id={option.status}
                          value={option.status}
                          className="mt-0.5"
                        />

                        <Stack size="sm" direction="column" className="grow" asChild>
                          <label htmlFor={option.status}>
                            <H6>{option.title}</H6>

                            {option.description && <Note>{option.description}</Note>}
                          </label>
                        </Stack>
                      </Stack>
                    ))}
                  </RadioGroup>

                  <Stack className="justify-between">
                    <Button size="md" variant="secondary" onClick={() => setIsOpen(false)}>
                      Cancel
                    </Button>

                    {currentOption.button && (
                      <Button size="md" isPending={isStatusPending} {...currentOption.button} />
                    )}
                  </Stack>
                </Stack>
              </PopoverContent>
            </Popover>
          )
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
        )
      })}
    </Stack>
  )
}
