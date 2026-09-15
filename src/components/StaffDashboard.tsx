import React, { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';
import type { Booking, BookingStatus } from '../types';

const statuses: BookingStatus[] = ['requested', 'confirmed', 'in_progress', 'ready', 'completed', 'cancelled'];
const labels: Record<BookingStatus, string> = {
  requested: 'Requested', confirmed: 'Confirmed', in_progress: 'In progress',
  ready: 'Ready', completed: 'Completed', cancelled: 'Cancelled',
};

export function StaffDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select('*, profiles!bookings_customer_id_fkey(full_name, phone)')
      .order('created_at', { ascending: false });
    setLoading(false);
    if (error) Alert.alert('Could not load bookings', error.message);
    else setBookings((data || []) as Booking[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: BookingStatus) => {
    if (saving) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from('bookings').update({ status }).eq('id', id).select('id, status').single();
      if (error) throw error;
      setBookings(items => items.map(item => item.id === id ? { ...item, status: data.status } : item));
    } catch { Alert.alert('Update failed', 'The status was not saved. Please refresh and try again.'); }
    finally { setSaving(false); }
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#dc172a" />}>
      <Text style={styles.title}>Garage dashboard</Text>
      <Text style={styles.intro}>{bookings.length} customer booking{bookings.length === 1 ? '' : 's'} · pull down to refresh</Text>
      {bookings.map((booking) => (
        <View style={styles.card} key={booking.id}>
          <View style={styles.top}>
            <View style={styles.flex}>
              <Text style={styles.service}>{booking.service}</Text>
              <Text style={styles.reg}>{booking.registration}</Text>
            </View>
            <Text style={styles.status}>{labels[booking.status]}</Text>
          </View>
          <Text style={styles.customer}>{booking.profiles?.full_name || 'Customer'} · {booking.profiles?.phone || 'No phone'}</Text>
          <Text style={styles.detail}>Requested date: {booking.preferred_date}</Text>
          {!!booking.notes && <Text style={styles.detail}>Customer notes: {booking.notes}</Text>}
          <Text style={styles.changeLabel}>UPDATE REPAIR STATUS</Text>
          <View style={styles.chips}>
            {statuses.map((status) => (
              <TouchableOpacity disabled={saving} key={status} style={[styles.chip, booking.status === status && styles.active]} onPress={() => updateStatus(booking.id, status)}>
                <Text style={[styles.chipText, booking.status === status && styles.activeText]}>{labels[status]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
      {!loading && bookings.length === 0 && <Text style={styles.empty}>No bookings have been received yet.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 18, paddingBottom: 40 },
  title: { color: '#fff', fontSize: 29, fontWeight: '900' },
  intro: { color: '#979ba3', marginTop: 7, marginBottom: 18 },
  card: { backgroundColor: '#15171b', borderWidth: 1, borderColor: '#30333a', borderRadius: 15, padding: 17, marginBottom: 14 },
  top: { flexDirection: 'row', alignItems: 'flex-start' }, flex: { flex: 1 },
  service: { color: '#fff', fontSize: 18, fontWeight: '800' }, reg: { color: '#ef4052', fontWeight: '900', marginTop: 5 },
  status: { color: '#ff8490', backgroundColor: '#442329', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 15, fontSize: 10, fontWeight: '900' },
  customer: { color: '#d7d8dc', marginTop: 14, fontWeight: '700' }, detail: { color: '#92969e', marginTop: 7, lineHeight: 19 },
  changeLabel: { color: '#777b84', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginTop: 17, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' }, chip: { borderWidth: 1, borderColor: '#3a3e45', borderRadius: 16, paddingHorizontal: 9, paddingVertical: 7, marginRight: 6, marginBottom: 7 },
  active: { backgroundColor: '#dc172a', borderColor: '#dc172a' }, chipText: { color: '#aeb1b7', fontSize: 10, fontWeight: '700' }, activeText: { color: '#fff' },
  empty: { color: '#8d9199', textAlign: 'center', marginTop: 70 },
});
