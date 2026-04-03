import { create } from "zustand";

type SubmissionState = {
  step: number;
  themeId: string | null;
  themeName: string | null;
  platformId: string | null;
  platformName: string | null;
  name: string;
  description: string;
  content: string;
  repositoryUrl: string;
  license: string;
  submitterNote: string;
  newsletterOptIn: boolean;

  setStep: (step: number) => void;
  setTheme: (id: string, name: string) => void;
  setPlatform: (id: string, name: string) => void;
  setPortDetails: (details: {
    name?: string;
    description?: string;
    content?: string;
    repositoryUrl?: string;
    license?: string;
    submitterNote?: string;
    newsletterOptIn?: boolean;
  }) => void;
  reset: () => void;
};

const initialState = {
  step: 1,
  themeId: null,
  themeName: null,
  platformId: null,
  platformName: null,
  name: "",
  description: "",
  content: "",
  repositoryUrl: "",
  license: "",
  submitterNote: "",
  newsletterOptIn: true,
};

export const useSubmissionStore = create<SubmissionState>((set) => ({
  ...initialState,

  setStep: (step) => set({ step }),

  setTheme: (id, name) => set({ themeId: id, themeName: name }),

  setPlatform: (id, name) => set({ platformId: id, platformName: name }),

  setPortDetails: (details) =>
    set((state) => ({
      ...state,
      ...details,
    })),

  reset: () => set(initialState),
}));
