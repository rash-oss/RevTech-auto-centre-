import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

export function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || password.length < 8 || (mode === 'signup' && (!fullName.trim() || !phone.trim()))) {
      Alert.alert('Check your details', 'Enter a valid email, an 8-character password, your name and phone number.');
      return;
    }
    setBusy(true);
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim(), phone: phone.trim() } },
        });
    setBusy(false);

    if (result.error) {
      Alert.alert(mode === 'login' ? 'Could not sign in' : 'Could not create account', result.error.message);
      return;
    }
    if (mode === 'signup' && !result.data.session) {
      Alert.alert('Check your email', 'Open the confirmation email, then return here to sign in.');
      setMode('login');
    }
  };

  const resetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Email needed', 'Enter your email address first.');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    Alert.alert(error ? 'Could not send email' : 'Email sent', error?.message || 'Check your inbox for a password reset link.');
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{mode === 'login' ? 'Customer sign in' : 'Create account'}</Text>
      <Text style={styles.intro}>Sign in to keep your vehicles, bookings and repair updates secure.</Text>
      {mode === 'signup' && (
        <>
          <TextInput style={styles.input} placeholder="Full name" placeholderTextColor="#737780" value={fullName} onChangeText={setFullName} autoComplete="name" />
          <TextInput style={styles.input} placeholder="Phone number" placeholderTextColor="#737780" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" />
        </>
      )}
      <TextInput style={styles.input} placeholder="Email address" placeholderTextColor="#737780" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <TextInput style={styles.input} placeholder="Password (8 characters minimum)" placeholderTextColor="#737780" value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
      <TouchableOpacity style={[styles.primary, busy && styles.disabled]} disabled={busy} onPress={submit}>
        <Text style={styles.primaryText}>{busy ? 'PLEASE WAIT…' : mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}</Text>
      </TouchableOpacity>
      {mode === 'login' && <TouchableOpacity onPress={resetPassword}><Text style={styles.link}>Forgot password?</Text></TouchableOpacity>}
      <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
        <Text style={styles.switch}>{mode === 'login' ? 'New customer? Create an account' : 'Already registered? Sign in'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 12 },
  title: { color: '#fff', fontSize: 28, fontWeight: '900' },
  intro: { color: '#979ba3', fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 22 },
  input: { color: '#fff', backgroundColor: '#15171b', borderWidth: 1, borderColor: '#33363d', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, marginBottom: 13 },
  primary: { backgroundColor: '#dc172a', borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginTop: 5 },
  disabled: { opacity: 0.55 },
  primaryText: { color: '#fff', fontWeight: '900', letterSpacing: 1, fontSize: 13 },
  link: { color: '#ef4052', textAlign: 'center', marginTop: 18, fontWeight: '700' },
  switch: { color: '#c9cbd0', textAlign: 'center', marginTop: 24 },
});
