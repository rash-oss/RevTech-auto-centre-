import React, { useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

export function PasswordRecovery({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (busy) return;
    if (password.length < 8 || password !== confirm) {
      Alert.alert('Check your password', 'Use at least eight characters and enter the same password twice.');
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword(''); setConfirm('');
      Alert.alert('Password updated', 'Your new password is ready to use.');
      onDone();
    } catch (error) {
      Alert.alert('Could not update password', error instanceof Error ? error.message : 'Please request a new reset email and try again.');
    } finally { setBusy(false); }
  };
  return <View style={{ padding: 24, gap: 18 }}>
    <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800' }}>Set a new password</Text>
    <Text style={{ color: '#c9cbd0' }}>Enter your new password twice to finish recovering your account.</Text>
    <TextInput accessibilityLabel="New password" placeholder="New password" placeholderTextColor="#979ba3" secureTextEntry autoCapitalize="none" autoComplete="new-password" value={password} onChangeText={setPassword} style={{ color: '#fff', backgroundColor: '#15171b', padding: 16, borderRadius: 10 }} />
    <TextInput accessibilityLabel="Confirm new password" placeholder="Confirm new password" placeholderTextColor="#979ba3" secureTextEntry autoCapitalize="none" autoComplete="new-password" value={confirm} onChangeText={setConfirm} style={{ color: '#fff', backgroundColor: '#15171b', padding: 16, borderRadius: 10 }} />
    <TouchableOpacity disabled={busy} onPress={save} style={{ backgroundColor: '#dc172a', padding: 18, borderRadius: 10, opacity: busy ? 0.5 : 1 }}><Text style={{ color: '#fff', textAlign: 'center', fontWeight: '800' }}>{busy ? 'SAVING…' : 'SAVE PASSWORD'}</Text></TouchableOpacity>
    <TouchableOpacity disabled={busy} onPress={onDone}><Text style={{ color: '#c9cbd0', textAlign: 'center' }}>Cancel</Text></TouchableOpacity>
  </View>;
}
