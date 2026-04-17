import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CreateLinkResult } from "@/actions/link-actions";

// ============================================
// TYPES
// ============================================

interface LinkHistoryItem {
  id: string;
  shortLink: string;
  originalUrl: string;
  platform: "shopee" | "tiktok";
  createdAt: Date;
  productInfo?: {
    name: string;
    price: number;
    image: string;
    commission: number;
    cashback: number;
  };
}

interface LinkStore {
  // State
  isLoading: boolean;
  error: string | null;
  generatedLink: CreateLinkResult | null;
  linkHistory: LinkHistoryItem[];
  guestSessionId: string | null;
  affiliateId: string | null;

  // Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setGeneratedLink: (link: CreateLinkResult | null) => void;
  addToHistory: (link: CreateLinkResult) => void;
  clearHistory: () => void;
  getOrCreateGuestSessionId: () => string;
  clearGuestSessionId: () => void;
  setAffiliateId: (id: string) => void;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Tạo guest session ID duy nhất
 */
function createGuestSessionId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `guest_${timestamp}_${randomPart}`;
}

// ============================================
// STORE
// ============================================

export const useLinkStore = create<LinkStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isLoading: false,
      error: null,
      generatedLink: null,
      linkHistory: [],
      guestSessionId: null,
      affiliateId: null,

      // Actions
      setLoading: (loading) => set({ isLoading: loading }),
      
      setError: (error) => set({ error }),
      
      setGeneratedLink: (link) => set({ generatedLink: link }),
      
      addToHistory: (link) => {
        const historyItem: LinkHistoryItem = {
          id: link.linkId,
          shortLink: link.shortLink,
          originalUrl: link.originalUrl,
          platform: link.platform,
          createdAt: new Date(),
          productInfo: link.productInfo,
        };
        
        set((state) => ({
          linkHistory: [historyItem, ...state.linkHistory].slice(0, 20),
        }));
      },
      
      clearHistory: () => set({ linkHistory: [] }),
      
      getOrCreateGuestSessionId: () => {
        const currentId = get().guestSessionId;
        if (currentId) {
          return currentId;
        }
        
        const newId = createGuestSessionId();
        set({ guestSessionId: newId });
        return newId;
      },
      
      clearGuestSessionId: () => set({ guestSessionId: null }),
      
      setAffiliateId: (id) => set({ affiliateId: id }),
    }),
    {
      name: "ck-affiliate-link-store",
      partialize: (state) => ({
        linkHistory: state.linkHistory,
        guestSessionId: state.guestSessionId,
      }),
    }
  )
);
