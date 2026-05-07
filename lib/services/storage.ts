import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  ONBOARDING_DONE: "pf:onboarding_done",
  DOG_PROFILE: "pf:dog_profile",
  WALKS: "pf:walks",
  REMINDERS: "pf:reminders",
  PREMIUM: "pf:premium",
} as const;

export interface DogProfile {
  name: string;
  breed: string;
  age: string;
  energy: "bassa" | "media" | "alta";
  weightKg?: number;
  avatarEmoji?: string;
}

export interface WalkRecord {
  id: number;
  startedAt: number;
  endedAt: number;
  distanceKm: number;
  durationSec: number;
  caloriesKcal: number;
  rating: number;
  notes: string;
  photos: { before?: string; after?: string };
  path: { latitude: number; longitude: number; timestamp: number }[];
}

export interface Reminder {
  id: string;
  type: "vaccino" | "antiparassitario" | "toelettatura" | "passeggiata";
  title: string;
  scheduledFor: number; // ms epoch
  notificationId?: string;
}

async function read<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (e) {
    console.warn("[storage] read failed", key, e);
    return fallback;
  }
}

async function write<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("[storage] write failed", key, e);
  }
}

export const Storage = {
  async getOnboardingDone(): Promise<boolean> {
    return read(KEYS.ONBOARDING_DONE, false);
  },
  async setOnboardingDone(done: boolean) {
    await write(KEYS.ONBOARDING_DONE, done);
  },

  async getDogProfile(): Promise<DogProfile | null> {
    return read<DogProfile | null>(KEYS.DOG_PROFILE, null);
  },
  async setDogProfile(p: DogProfile) {
    await write(KEYS.DOG_PROFILE, p);
  },

  async getWalks(): Promise<WalkRecord[]> {
    return read<WalkRecord[]>(KEYS.WALKS, []);
  },
  async addWalk(w: WalkRecord) {
    const walks = await Storage.getWalks();
    walks.unshift(w);
    await write(KEYS.WALKS, walks.slice(0, 500));
  },
  async clearWalks() {
    await write(KEYS.WALKS, []);
  },

  async getReminders(): Promise<Reminder[]> {
    return read<Reminder[]>(KEYS.REMINDERS, []);
  },
  async setReminders(rs: Reminder[]) {
    await write(KEYS.REMINDERS, rs);
  },

  async getPremium(): Promise<boolean> {
    return read(KEYS.PREMIUM, false);
  },
  async setPremium(v: boolean) {
    await write(KEYS.PREMIUM, v);
  },
};
