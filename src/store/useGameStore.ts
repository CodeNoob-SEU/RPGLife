import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createInitialState } from '../domain/initialState';
import { migrate as migrateState } from '../domain/migrate';
import { CURRENT_VERSION } from '../domain/version';
import { createGameActions, GameStore } from './gameActions';

export const useGameStore = create<GameStore>()(
  persist(
    immer((set, get) => ({
      ...createInitialState(new Date()),
      actions: createGameActions(set as any, get as any), // cast bridges zustand immer-middleware set typing
    })),
    {
      name: 'rpglife-state',
      version: CURRENT_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s): Omit<GameStore, 'actions'> => {
        const { actions, ...data } = s; // 不持久化函数
        return data;
      },
      migrate: (persisted, fromVersion) => migrateState(persisted, fromVersion) as any,
    }
  )
);
