import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AuthScreen } from './src/components/AuthScreen';
import { StaffDashboard } from './src/components/StaffDashboard';
import { useAuth } from './src/hooks/useAuth';
import { isBackendConfigured, supabase } from './src/lib/supabase';
import type { Booking } from './src/types';

type Tab = 'Home' | 'Book' | 'Bookings' | 'Account' | 'Staff';

const services = [
  { icon: '🛠️', name: 'Vehicle Repair', detail: 'Diagnostics and repairs' },
  { icon: '✅', name: 'MOT', detail: 'Book your MOT test' },
  { icon: '🛢️', name: 'Full Service', detail: 'Complete vehicle care' },
  { icon: '⚡', name: 'Diagnostics', detail: 'Warning light checks' },
  { icon: '🛞', name: 'Tyres & Brakes', detail: 'Safety inspections' },
  { icon: '❄️', name: 'Air Conditioning', detail: 'Recharge and repair' },
];

const customerTabs: { key: Tab; icon: string }[] = [
  { key: 'Home', icon: '⌂' },
  { key: 'Book', icon: '＋' },
  { key: 'Bookings', icon: '▣' },
  { key: 'Account', icon: '●' },
];

export default function App() {
  const { session, profile, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>('Home');
  const [service, setService] = useState('');
  const [registration, setRegistration] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingBusy, setBookingBusy] = useState(false);

  const isStaff = profile?.role === 'staff' || profile?.role === 'admin';
  const tabs = isStaff ? [...customerTabs, { key: 'Staff' as Tab, icon: '◆' }] : customerTabs;

  const canSubmit = useMemo(
    () => Boolean(service && registration.trim() && name.trim() && phone.trim() && date.trim()),
    [service, registration, name, phone, date],
  );

  const chooseService = (value: string) => {
    setService(value);
    setTab('Book');
  };

  const loadBookings = useCallback(async () => {
    if (!session || !isBackendConfigured) return;
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('customer_id', session.user.id)
      .order('created_at', { ascending: false });
    if (error) Alert.alert('Could not load bookings', error.message);
    else setBookings((data || []) as Booking[]);
  }, [session]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  const submitBooking = async () => {
    if (!canSubmit) {
      Alert.alert('Missing details', 'Please complete all required fields.');
      return;
    }
    if (!session || !isBackendConfigured) {
      setTab('Account');
      Alert.alert('Sign in required', 'Create or sign in to your secure account before requesting a booking.');
      return;
    }
    setBookingBusy(true);
    const { error } = await supabase.from('bookings').insert({
      customer_id: session.user.id,
      service,
      registration: registration.trim(),
      preferred_date: date.trim(),
      notes: notes.trim() || null,
    });
    setBookingBusy(false);
    if (error) {
      Alert.alert('Booking not sent', error.message);
      return;
    }
    await loadBookings();
    setTab('Bookings');
    setNotes('');
    Alert.alert('Booking requested', 'RevTech has received your request and will contact you to confirm it.');
  };

  const Header = () => (
    <View style={styles.header}>
      <Image source={require('./assets/logo.png')} style={styles.logo} resizeMode="contain" />
      <View style={styles.headerText}>
        <Text style={styles.brand}>REVTECH</Text>
        <Text style={styles.tag}>AUTO CENTRE</Text>
      </View>
      <TouchableOpacity style={styles.callButton} onPress={() => Linking.openURL('tel:07306478555')}>
        <Text style={styles.callText}>CALL</Text>
      </TouchableOpacity>
    </View>
  );

  const Home = () => (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>WELCOME TO REVTECH</Text>
        <Text style={styles.heroTitle}>Your car, cared for.</Text>
        <Text style={styles.heroBody}>Professional repairs, servicing and MOTs from a garage you can trust.</Text>
        <TouchableOpacity style={styles.primary} onPress={() => setTab('Book')}>
          <Text style={styles.primaryText}>BOOK YOUR CAR IN</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Our services</Text>
        <Text style={styles.sectionHint}>Tap to book</Text>
      </View>
      <View style={styles.grid}>
        {services.map((item) => (
          <TouchableOpacity key={item.name} style={styles.serviceCard} onPress={() => chooseService(item.name)}>
            <Text style={styles.serviceIcon}>{item.icon}</Text>
            <Text style={styles.serviceName}>{item.name}</Text>
            <Text style={styles.serviceDetail}>{item.detail}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>RevTech Auto Centre</Text>
        <Text style={styles.infoLine}>Unit 13, Brettell Lane Industrial Estate</Text>
        <Text style={styles.infoLine}>Brierley Hill, DY5 3LH</Text>
        <Text style={styles.infoLine}>Monday–Saturday · 9:00am–7:30pm</Text>
        <TouchableOpacity onPress={() => Linking.openURL('mailto:RevTechautocentre@gmail.com')}>
          <Text style={styles.redLink}>RevTechautocentre@gmail.com</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const Book = () => (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.pageTitle}>Book your vehicle in</Text>
      <Text style={styles.pageIntro}>Send the details below and RevTech will contact you to confirm the appointment.</Text>

      <Text style={styles.label}>SERVICE REQUIRED *</Text>
      <View style={styles.chips}>
        {services.map((item) => (
          <TouchableOpacity
            key={item.name}
            style={[styles.chip, service === item.name && styles.chipActive]}
            onPress={() => setService(item.name)}
          >
            <Text style={[styles.chipText, service === item.name && styles.chipTextActive]}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Field label="VEHICLE REGISTRATION *" value={registration} onChangeText={(v) => setRegistration(v.toUpperCase())} placeholder="AB21 CDE" autoCapitalize="characters" />
      <Field label="YOUR NAME *" value={name} onChangeText={setName} placeholder="Full name" />
      <Field label="PHONE NUMBER *" value={phone} onChangeText={setPhone} placeholder="07..." keyboardType="phone-pad" />
      <Field label="PREFERRED DATE *" value={date} onChangeText={setDate} placeholder="e.g. Monday 21 September" />
      <Field label="NOTES" value={notes} onChangeText={setNotes} placeholder="Tell us about the problem" multiline />
      <TouchableOpacity disabled={bookingBusy} style={[styles.primary, (!canSubmit || bookingBusy) && styles.primaryDisabled]} onPress={submitBooking}>
        <Text style={styles.primaryText}>{bookingBusy ? 'SENDING…' : 'REQUEST BOOKING'}</Text>
      </TouchableOpacity>
      <Text style={styles.disclaimer}>Your booking is confirmed only after the garage contacts you.</Text>
    </ScrollView>
  );

  const Bookings = () => (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>My bookings</Text>
      {bookings.length ? bookings.map((booking) => (
        <View style={styles.bookingCard} key={booking.id}>
          <View style={styles.bookingTop}>
            <View>
              <Text style={styles.bookingService}>{booking.service}</Text>
              <Text style={styles.bookingReg}>{booking.registration}</Text>
            </View>
            <View style={styles.statusPill}><Text style={styles.statusText}>{booking.status.replace('_', ' ').toUpperCase()}</Text></View>
          </View>
          <View style={styles.divider} />
          <Text style={styles.infoLine}>Preferred date: {booking.preferred_date}</Text>
          <Text style={styles.infoLine}>RevTech will contact you to confirm.</Text>
          <View style={styles.progressRow}>
            <View style={[styles.progressDot, booking.status !== 'cancelled' && styles.progressDone]} />
            <View style={styles.progressLine} />
            <View style={[styles.progressDot, ['in_progress', 'ready', 'completed'].includes(booking.status) && styles.progressDone]} />
            <View style={styles.progressLine} />
            <View style={[styles.progressDot, ['ready', 'completed'].includes(booking.status) && styles.progressDone]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressText}>Requested</Text><Text style={styles.progressText}>In progress</Text><Text style={styles.progressText}>Ready</Text>
          </View>
        </View>
      )) : (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>▣</Text>
          <Text style={styles.emptyTitle}>No bookings yet</Text>
          <Text style={styles.emptyBody}>Your appointments and repair updates will appear here.</Text>
          <TouchableOpacity style={styles.primary} onPress={() => setTab('Book')}>
            <Text style={styles.primaryText}>MAKE A BOOKING</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  const Account = () => (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Account</Text>
      {!isBackendConfigured ? (
        <View style={styles.setupCard}>
          <Text style={styles.setupTitle}>Secure accounts are ready to connect</Text>
          <Text style={styles.infoLine}>The live database keys still need adding before customer sign-in can be used.</Text>
        </View>
      ) : authLoading ? <ActivityIndicator color="#dc172a" size="large" /> : !session ? <AuthScreen /> : <>
      <View style={styles.profileCard}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{profile?.full_name?.[0]?.toUpperCase() || 'R'}</Text></View>
        <View><Text style={styles.profileName}>{profile?.full_name || 'RevTech Customer'}</Text><Text style={styles.profileSub}>{profile?.phone || session.user.email}</Text></View>
      </View>
      {['My vehicles', 'Booking history', 'Notifications', 'Privacy policy', 'Terms & conditions'].map((item) => (
        <TouchableOpacity key={item} style={styles.menuRow} onPress={() => Alert.alert(item, 'This section is ready to connect to the secure customer account system.') }>
          <Text style={styles.menuText}>{item}</Text><Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.outlineButton} onPress={() => Linking.openURL('tel:07306478555')}>
        <Text style={styles.outlineText}>CONTACT REVTECH</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.signOutButton} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.signOutText}>SIGN OUT</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteButton} onPress={() => Alert.alert(
        'Delete account?',
        'This permanently deletes your account, vehicles and booking history.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete permanently', style: 'destructive', onPress: async () => {
            const { error } = await supabase.rpc('delete_own_account');
            if (error) Alert.alert('Could not delete account', error.message);
            else await supabase.auth.signOut();
          } },
        ],
      )}>
        <Text style={styles.deleteText}>DELETE MY ACCOUNT</Text>
      </TouchableOpacity>
      </>}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#08090b" />
      <Header />
      <View style={styles.screen}>
        {tab === 'Home' && <Home />}
        {tab === 'Book' && <Book />}
        {tab === 'Bookings' && <Bookings />}
        {tab === 'Account' && <Account />}
        {tab === 'Staff' && isStaff && <StaffDashboard />}
      </View>
      <View style={styles.nav}>
        {tabs.map((item) => (
          <TouchableOpacity key={item.key} style={styles.navItem} onPress={() => setTab(item.key)}>
            <Text style={[styles.navIcon, tab === item.key && styles.navActive]}>{item.icon}</Text>
            <Text style={[styles.navLabel, tab === item.key && styles.navActive]}>{item.key}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, multiline, ...inputProps } = props;
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        multiline={multiline}
        placeholderTextColor="#70747c"
        style={[styles.input, multiline && styles.textarea]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#08090b', paddingTop: StatusBar.currentHeight || 0 },
  screen: { flex: 1 },
  header: { height: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: '#23252a' },
  logo: { width: 58, height: 54 },
  headerText: { flex: 1, marginLeft: 8 },
  brand: { color: '#f2f3f5', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  tag: { color: '#dc172a', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  callButton: { borderWidth: 1, borderColor: '#dc172a', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8 },
  callText: { color: '#fff', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  content: { padding: 18, paddingBottom: 32 },
  hero: { backgroundColor: '#15171b', borderRadius: 18, padding: 22, borderWidth: 1, borderColor: '#292c31' },
  eyebrow: { color: '#e21b31', fontWeight: '900', fontSize: 12, letterSpacing: 2, marginBottom: 12 },
  heroTitle: { color: '#fff', fontSize: 34, fontWeight: '900', lineHeight: 39 },
  heroBody: { color: '#adb0b7', fontSize: 15, lineHeight: 22, marginTop: 12, marginBottom: 22 },
  primary: { backgroundColor: '#dc172a', borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  primaryDisabled: { opacity: 0.45 },
  primaryText: { color: '#fff', fontWeight: '900', letterSpacing: 1, fontSize: 13 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 26, marginBottom: 12 },
  sectionTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  sectionHint: { color: '#777b84', fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  serviceCard: { width: '48.5%', backgroundColor: '#15171b', padding: 16, minHeight: 136, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: '#25282e' },
  serviceIcon: { fontSize: 24, marginBottom: 12 },
  serviceName: { color: '#fff', fontWeight: '800', fontSize: 15 },
  serviceDetail: { color: '#81858e', fontSize: 12, marginTop: 5, lineHeight: 17 },
  infoCard: { marginTop: 14, backgroundColor: '#111317', borderRadius: 14, padding: 18, borderLeftWidth: 3, borderLeftColor: '#dc172a' },
  infoTitle: { color: '#fff', fontWeight: '800', fontSize: 17, marginBottom: 8 },
  infoLine: { color: '#a5a8ae', fontSize: 13, lineHeight: 21 },
  redLink: { color: '#e7283c', fontSize: 13, marginTop: 7 },
  pageTitle: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 6 },
  pageIntro: { color: '#979ba3', fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 24 },
  label: { color: '#c5c7cb', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  chip: { borderWidth: 1, borderColor: '#383b42', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 9, marginRight: 7, marginBottom: 8 },
  chipActive: { backgroundColor: '#dc172a', borderColor: '#dc172a' },
  chipText: { color: '#b4b7bd', fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  fieldWrap: { marginBottom: 16 },
  input: { color: '#fff', backgroundColor: '#15171b', borderWidth: 1, borderColor: '#33363d', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  disclaimer: { color: '#6f737b', textAlign: 'center', fontSize: 11, marginTop: 10, lineHeight: 16 },
  bookingCard: { marginTop: 20, backgroundColor: '#15171b', borderWidth: 1, borderColor: '#30333a', borderRadius: 16, padding: 18 },
  bookingTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bookingService: { color: '#fff', fontSize: 19, fontWeight: '800' },
  bookingReg: { color: '#9da1a9', fontSize: 14, marginTop: 5, fontWeight: '700' },
  statusPill: { backgroundColor: '#442329', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20 },
  statusText: { color: '#ff6170', fontSize: 10, fontWeight: '900' },
  divider: { height: 1, backgroundColor: '#2c2f35', marginVertical: 17 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 22, paddingHorizontal: 12 },
  progressDot: { width: 13, height: 13, borderRadius: 7, backgroundColor: '#43464c', borderWidth: 2, borderColor: '#6d7077' },
  progressDone: { backgroundColor: '#dc172a', borderColor: '#ff5a69' },
  progressLine: { flex: 1, height: 2, backgroundColor: '#3a3d43' },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  progressText: { color: '#7f838b', fontSize: 10 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { color: '#e22337', fontSize: 45 },
  emptyTitle: { color: '#fff', fontSize: 21, fontWeight: '800', marginTop: 18 },
  emptyBody: { color: '#858991', textAlign: 'center', lineHeight: 20, marginTop: 8, marginBottom: 24, maxWidth: 270 },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#15171b', borderRadius: 14, padding: 17, marginTop: 20, marginBottom: 20 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#dc172a', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '900' },
  profileName: { color: '#fff', fontSize: 17, fontWeight: '800' },
  profileSub: { color: '#888c94', marginTop: 4, fontSize: 12 },
  menuRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#26292f', paddingVertical: 17 },
  menuText: { color: '#d9dade', fontSize: 15 },
  chevron: { color: '#747880', fontSize: 25 },
  outlineButton: { borderWidth: 1, borderColor: '#dc172a', borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginTop: 28 },
  outlineText: { color: '#fff', fontWeight: '900', letterSpacing: 1, fontSize: 12 },
  setupCard: { backgroundColor: '#291b1e', borderWidth: 1, borderColor: '#6a2b34', borderRadius: 14, padding: 18, marginTop: 20 },
  setupTitle: { color: '#fff', fontWeight: '800', fontSize: 16, marginBottom: 8 },
  signOutButton: { paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  signOutText: { color: '#8f939b', fontWeight: '800', fontSize: 12 },
  deleteButton: { paddingVertical: 13, alignItems: 'center' },
  deleteText: { color: '#d75a66', fontWeight: '800', fontSize: 11 },
  nav: { height: 68, flexDirection: 'row', backgroundColor: '#0e1013', borderTopWidth: 1, borderTopColor: '#292c31', paddingBottom: 4 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navIcon: { color: '#666a73', fontSize: 18, marginBottom: 2 },
  navLabel: { color: '#666a73', fontSize: 10, fontWeight: '700' },
  navActive: { color: '#ef263b' },
});
