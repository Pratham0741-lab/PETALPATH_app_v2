import { create } from 'zustand';

interface Toast {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface UIState {
  globalLoading: boolean;
  loadingMessage: string | null;

  toast: Toast | null;

  activeModal: string | null;
  modalData: unknown | null;

  setGlobalLoading: (loading: boolean, message?: string) => void;
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  hideToast: () => void;
  openModal: (name: string, data?: unknown) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  globalLoading: false,
  loadingMessage: null,

  toast: null,

  activeModal: null,
  modalData: null,

  setGlobalLoading: (loading: boolean, message?: string) => {
    set({
      globalLoading: loading,
      loadingMessage: loading ? (message ?? null) : null,
    });
  },

  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    set({ toast: { message, type } });
  },

  hideToast: () => {
    set({ toast: null });
  },

  openModal: (name: string, data?: unknown) => {
    set({ activeModal: name, modalData: data ?? null });
  },

  closeModal: () => {
    set({ activeModal: null, modalData: null });
  },
}));
