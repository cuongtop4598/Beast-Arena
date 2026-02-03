import { create } from 'zustand';

interface PlayerState {
  playerId: string | null;
  displayName: string;
  token: string | null;
  guestToken: string | null;
  wins: number;
  losses: number;
  rankPoints: number;
  freePracticeLeft: number;
  selectedCharacter: string;

  // Actions
  setPlayer: (id: string, name: string, token: string) => void;
  setGuestToken: (guestToken: string) => void;
  setFullProfile: (data: {
    playerId: string;
    displayName: string;
    token: string;
    guestToken: string;
    wins: number;
    losses: number;
    rankPoints: number;
    selectedCharacter: string;
    freePracticeLeft: number;
  }) => void;
  updateStats: (wins: number, losses: number, rankPoints: number) => void;
  setFreePractice: (count: number) => void;
  setSelectedCharacter: (char: string) => void;
  logout: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  playerId: null,
  displayName: 'Guest',
  token: null,
  guestToken: null,
  wins: 0,
  losses: 0,
  rankPoints: 1000,
  freePracticeLeft: 5,
  selectedCharacter: 'tiger',

  setPlayer: (id, name, token) =>
    set({ playerId: id, displayName: name, token }),

  setGuestToken: (guestToken) => set({ guestToken }),

  setFullProfile: (data) =>
    set({
      playerId: data.playerId,
      displayName: data.displayName,
      token: data.token,
      guestToken: data.guestToken,
      wins: data.wins,
      losses: data.losses,
      rankPoints: data.rankPoints,
      selectedCharacter: data.selectedCharacter,
      freePracticeLeft: data.freePracticeLeft,
    }),

  updateStats: (wins, losses, rankPoints) =>
    set({ wins, losses, rankPoints }),

  setFreePractice: (count) => set({ freePracticeLeft: count }),

  setSelectedCharacter: (char) => set({ selectedCharacter: char }),

  logout: () =>
    set({
      playerId: null,
      displayName: 'Guest',
      token: null,
      wins: 0,
      losses: 0,
      rankPoints: 1000,
      freePracticeLeft: 5,
    }),
}));
