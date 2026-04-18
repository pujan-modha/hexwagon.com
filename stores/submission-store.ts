import { create } from "zustand"

export type SubmissionKind = "port" | "config"

type SubmissionState = {
  kind: SubmissionKind | null
  step: number
  themeId: string | null
  themeName: string | null
  platformId: string | null
  platformName: string | null
  themeIds: string[]
  themeNames: string[]
  platformIds: string[]
  platformNames: string[]
  name: string
  description: string
  content: string
  repositoryUrl: string
  license: string
  fonts: Array<{ name: string; url: string }>
  screenshots: string[]
  submitterNote: string
  newsletterOptIn: boolean

  setStep: (step: number) => void
  setKind: (kind: SubmissionKind | null) => void
  setTheme: (id: string, name: string) => void
  setThemes: (entries: Array<{ id: string; name: string }>) => void
  setPlatform: (id: string, name: string) => void
  setPlatforms: (entries: Array<{ id: string; name: string }>) => void
  setDetails: (details: {
    name?: string
    description?: string
    content?: string
    repositoryUrl?: string
    license?: string
    fonts?: Array<{ name: string; url: string }>
    screenshots?: string[]
    submitterNote?: string
    newsletterOptIn?: boolean
  }) => void
  reset: () => void
}

const initialState = {
  kind: null,
  step: 0,
  themeId: null,
  themeName: null,
  platformId: null,
  platformName: null,
  themeIds: [],
  themeNames: [],
  platformIds: [],
  platformNames: [],
  name: "",
  description: "",
  content: "",
  repositoryUrl: "",
  license: "",
  fonts: [],
  screenshots: [],
  submitterNote: "",
  newsletterOptIn: true,
} satisfies Omit<
  SubmissionState,
  | "setStep"
  | "setKind"
  | "setTheme"
  | "setThemes"
  | "setPlatform"
  | "setPlatforms"
  | "setDetails"
  | "reset"
>

export const useSubmissionStore = create<SubmissionState>(set => ({
  ...initialState,

  setStep: step => set({ step }),

  setKind: kind =>
    set({
      ...initialState,
      kind,
      step: kind ? 1 : 0,
    }),

  setTheme: (id, name) =>
    set({
      themeId: id,
      themeName: name,
      themeIds: [id],
      themeNames: [name],
    }),

  setThemes: entries =>
    set({
      themeId: entries[0]?.id ?? null,
      themeName: entries[0]?.name ?? null,
      themeIds: entries.map(entry => entry.id),
      themeNames: entries.map(entry => entry.name),
    }),

  setPlatform: (id, name) =>
    set({
      platformId: id,
      platformName: name,
      platformIds: [id],
      platformNames: [name],
    }),

  setPlatforms: entries =>
    set({
      platformId: entries[0]?.id ?? null,
      platformName: entries[0]?.name ?? null,
      platformIds: entries.map(entry => entry.id),
      platformNames: entries.map(entry => entry.name),
    }),

  setDetails: details =>
    set(state => ({
      ...state,
      ...details,
    })),

  reset: () => set(initialState),
}))
