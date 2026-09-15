export type BookingStatus =
  | 'requested'
  | 'confirmed'
  | 'in_progress'
  | 'ready'
  | 'completed'
  | 'cancelled';

export type Profile = {
  id: string;
  full_name: string;
  phone: string;
  role: 'customer' | 'staff' | 'admin';
};

export type Booking = {
  id: string;
  customer_id: string;
  service: string;
  registration: string;
  preferred_date: string;
  notes: string | null;
  staff_notes: string | null;
  status: BookingStatus;
  created_at: string;
  profiles?: Pick<Profile, 'full_name' | 'phone'> | null;
};
