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
  members: FamilyMember[];
  setFamily: (family: {
    id: string;
    name: string | null;
    inviteCode: string | null;
  }) => void;
  setMembers: (members: FamilyMember[]) => void;
  clearFamily: () => void;
}

export const useFamilyStore = create<FamilyState>((set) => ({
  familyId: null,
  familyName: null,
  inviteCode: null,
  members: [],
  setFamily: ({ id, name, inviteCode }) =>
    set({ familyId: id, familyName: name, inviteCode }),
  setMembers: (members) => set({ members }),
  clearFamily: () =>
    set({ familyId: null, familyName: null, inviteCode: null, members: [] }),
}));
