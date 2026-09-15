import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let pendingRegistration: Promise<void> = Promise.resolve();
let generation = 0;
const tokenStorageKey = 'revtech.registeredPushToken';

export async function detachPushToken(userId: string) {
  generation++;
  await pendingRegistration;
  const token = await AsyncStorage.getItem(tokenStorageKey);
  if (!token) return;
  const { error } = await supabase.from('push_tokens').delete().eq('user_id', userId).eq('token', token);
  if (error) throw error;
  await AsyncStorage.removeItem(tokenStorageKey);
}

export function usePushNotifications(session: Session | null) {
  useEffect(() => {
    if (!session || !Device.isDevice) return;

    let active = true;
    const currentGeneration = ++generation;
    const register = async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('booking-updates', {
          name: 'Booking updates',
          importance: Notifications.AndroidImportance.HIGH,
        });
      }

      const current = await Notifications.getPermissionsAsync();
      const permission = current.status === 'granted'
        ? current
        : await Notifications.requestPermissionsAsync();
      if (currentGeneration !== generation || !active || permission.status !== 'granted') return;

      const projectId = Constants.expoConfig?.extra?.eas?.projectId
        || Constants.easConfig?.projectId;
      if (!projectId) return;

      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      if (currentGeneration !== generation || !active) return;
      await AsyncStorage.setItem(tokenStorageKey, token);
      const { error } = await supabase.from('push_tokens').upsert({
        user_id: session.user.id,
        token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'token' });
      if (error) throw error;
    };

    pendingRegistration = register().catch(() => undefined);
    return () => { active = false; };
  }, [session?.user.id]);
}
