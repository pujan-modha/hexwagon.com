"use client"

import type { ReactNode } from "react"
import { useQueryState } from "nuqs"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/common/tabs"

type Tab = {
  value: string
  label: string
  content: ReactNode
}

type EntityTabsProps = {
  tabs: Tab[]
  defaultTab?: string
}

const EntityTabs = ({ tabs, defaultTab }: EntityTabsProps) => {
  const [activeTab, setActiveTab] = useQueryState("tab")
  const currentTab = activeTab ?? defaultTab ?? tabs[0]?.value

  return (
    <Tabs
      value={currentTab ?? undefined}
      onValueChange={value => {
        if (value) {
          setActiveTab(value)
        }
      }}
    >
      <TabsList>
        {tabs.map(tab => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map(tab => (
        <TabsContent key={tab.value} value={tab.value}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}

export { EntityTabs }
