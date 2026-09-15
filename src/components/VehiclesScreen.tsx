import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';
type Vehicle = { id: string; registration: string; make: string | null; model: string | null };
export function VehiclesScreen({ userId, onBack, onBook }: { userId: string; onBack: () => void; onBook: (registration: string) => void }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [registration, setRegistration] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    const { data, error } = await supabase.from('vehicles').select('id, registration, make, model').eq('customer_id', userId).order('created_at', { ascending: false });
    setLoading(false);
    if (error) Alert.alert('Could not load vehicles', error.message);
    else setVehicles(data || []);
  }, [userId]);
  useEffect(() => { void load(); }, [load]);
  const clear = () => { setRegistration(''); setMake(''); setModel(''); setEditing(null); };
  const save = async () => {
    const reg = registration.replace(/\s/g, '').toUpperCase();
    if (!/^[A-Z0-9]{2,12}$/.test(reg)) { Alert.alert('Check registration', 'Enter a registration containing 2–12 letters or numbers.'); return; }
    setBusy(true);
    try {
      const values = { registration: reg, make: make.trim() || null, model: model.trim() || null };
      const result = editing
        ? await supabase.from('vehicles').update(values).eq('id', editing).eq('customer_id', userId).select('id').single()
        : await supabase.from('vehicles').insert({ ...values, customer_id: userId }).select('id').single();
      if (result.error) throw result.error;
      clear(); await load();
    } catch (error) { Alert.alert('Vehicle not saved', (error as { code?: string }).code === '23505' ? 'This registration is already saved.' : 'Please check your connection and try again.'); }
    finally { setBusy(false); }
  };
  const remove = (vehicle: Vehicle) => Alert.alert('Remove vehicle?', `Remove ${vehicle.registration}? Existing bookings will remain.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: async () => {
      setBusy(true);
      try {
        const { error } = await supabase.from('vehicles').delete().eq('id', vehicle.id).eq('customer_id', userId).select('id').single();
        if (error) throw error;
        if (editing === vehicle.id) clear();
        await load();
      } catch { Alert.alert('Could not remove vehicle', 'Please try again.'); }
      finally { setBusy(false); }
    } },
  ]);
  return <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
    <TouchableOpacity onPress={onBack}><Text style={styles.link}>‹ Account</Text></TouchableOpacity>
    <Text style={styles.title}>My vehicles</Text>
    {loading && <Text style={styles.text}>Loading vehicles…</Text>}
    {!loading && !vehicles.length && <Text style={styles.text}>Save your first vehicle below.</Text>}
    {vehicles.map(vehicle => <View style={styles.card} key={vehicle.id}>
      <Text style={styles.title}>{vehicle.registration}</Text><Text style={styles.text}>{[vehicle.make, vehicle.model].filter(Boolean).join(' ')}</Text>
      <TouchableOpacity disabled={busy} onPress={() => onBook(vehicle.registration)}><Text style={styles.link}>Book this vehicle</Text></TouchableOpacity>
      <TouchableOpacity disabled={busy} onPress={() => { setEditing(vehicle.id); setRegistration(vehicle.registration); setMake(vehicle.make || ''); setModel(vehicle.model || ''); }}><Text style={styles.link}>Edit vehicle</Text></TouchableOpacity>
      <TouchableOpacity disabled={busy} onPress={() => remove(vehicle)}><Text style={styles.link}>Remove vehicle</Text></TouchableOpacity>
    </View>)}
    <Text style={styles.title}>{editing ? 'Edit vehicle' : 'Add vehicle'}</Text>
    {([{ label: 'Registration', value: registration, set: setRegistration }, { label: 'Make (optional)', value: make, set: setMake }, { label: 'Model (optional)', value: model, set: setModel }]).map(field => <TextInput key={field.label} accessibilityLabel={field.label} placeholder={field.label} placeholderTextColor="#999" style={styles.input} value={field.value} onChangeText={field.set} maxLength={60} editable={!busy} autoCapitalize="characters" />)}
    <TouchableOpacity disabled={busy} style={styles.button} onPress={save}><Text style={styles.text}>{busy ? 'Saving…' : 'Save vehicle'}</Text></TouchableOpacity>
    {editing && <TouchableOpacity disabled={busy} onPress={clear}><Text style={styles.link}>Cancel editing</Text></TouchableOpacity>}
  </ScrollView>;
}
const styles = StyleSheet.create({ wrap: { padding: 20, paddingBottom: 50 }, title: { color: '#fff', fontSize: 23, fontWeight: '800', marginVertical: 12 }, text: { color: '#ddd', marginVertical: 6 }, link: { color: '#ff8490', paddingVertical: 12 }, card: { backgroundColor: '#15171b', padding: 16, borderRadius: 14, marginBottom: 14 }, input: { color: '#fff', backgroundColor: '#15171b', padding: 15, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#33363d' }, button: { backgroundColor: '#dc172a', padding: 12, alignItems: 'center', borderRadius: 10 } });
