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

export function usePushNotifications(session: Session | null) {
  useEffect(() => {
    if (!session || !Device.isDevice) return;

    let active = true;
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
      if (!active || permission.status !== 'granted') return;

      const projectId = Constants.expoConfig?.extra?.eas?.projectId
        || Constants.easConfig?.projectId;
      if (!projectId) return;

      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      if (!active) return;
      await supabase.from('push_tokens').upsert({
        user_id: session.user.id,
        token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'token' });
    };

    register().catch(() => undefined);
    return () => { active = false; };
  }, [session]);
}
