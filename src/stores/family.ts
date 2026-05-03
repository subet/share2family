import { create } from 'zustand';

interface FamilyMember {
  userId: string;
  displayName: string;
  avatarEmoji: string;
  role: 'admin' | 'member';
}

interface FamilyState {
  familyId: string | null;
  familyName: string | null;
  inviteCode: string | null;
  isPremium: boolean;
  members: FamilyMember[];
  setFamily: (family: {
    id: string;
    name: string | null;
    inviteCode: string | null;
    isPremium: boolean;
  }) => void;
  setMembers: (members: FamilyMember[]) => void;
  clearFamily: () => void;
}

export const useFamilyStore = create<FamilyState>((set) => ({
  familyId: null,
  familyName: null,
  inviteCode: null,
  isPremium: false,
  members: [],
  setFamily: ({ id, name, inviteCode, isPremium }) =>
    set({ familyId: id, familyName: name, inviteCode, isPremium }),
  setMembers: (members) => set({ members }),
  clearFamily: () =>
    set({ familyId: null, familyName: null, inviteCode: null, isPremium: false, members: [] }),
}));
