# RevTech Auto Centre

Customer mobile app for RevTech Auto Centre, built with Expo and React Native.

## Included

- Garage home page and contact details
- MOT, servicing, repairs, diagnostics, tyres/brakes and air-conditioning services
- Secure email customer registration and sign-in
- Permanent booking storage with customer-only access controls
- Customer booking and live repair-status view
- Protected garage staff dashboard
- Staff booking-status updates
- Password reset and in-app account deletion
- Direct phone and email actions

## Run the app

1. Install Node.js 22 or newer.
2. Run `npm install`.
3. Run `npx expo start`.
4. Scan the QR code using Expo Go on iPhone or Android.

## Business details

- RevTech Auto Centre
- Unit 13, Brettell Lane Industrial Estate, Brierley Hill, DY5 3LH
- 07306 478555
- RevTechautocentre@gmail.com
- Monday to Saturday, 9:00am–7:30pm

## Connect the production database

1. Create a Supabase project.
2. Open its SQL editor and run `supabase/schema.sql`.
3. Copy `.env.example` to `.env` and add the project's URL and public anon key.
4. Register the owner's account in the app.
5. In the SQL editor, run the final commented `update` statement in `schema.sql` using the owner's email. Only the protected database console can grant staff/admin access.

Never commit `.env` or a Supabase service-role key. The mobile app uses only the public anon key; row-level security protects private data.

## Remaining release work

- Push delivery backend, device credential setup, delivery receipts and physical-device verification (token registration/preferences are implemented)
- Optional payment/deposit flow; current bookings are requests, with payment arranged directly with the garage
- Hosted privacy policy and terms
- Store screenshots, final device testing, signed builds and submissions

## Verified implementation update

- Saved vehicles: add, edit, remove and reuse registration in a booking.
- Booking contact details persist to the customer profile before requesting a booking.
- Booking inputs retain focus across edits; account content is cleared when switching users.
- Customer status refreshes when opening Bookings, returning to the app, and every 30 seconds while that screen is active.
- Staff updates wait for server confirmation and report denied/failed writes.
- TypeScript and Expo exports for both iOS and Android pass. These are not physical-device tests or signed store builds.

## Release blockers still open

- Password recovery screen and deep-link handling implemented. Supabase Auth URL Configuration must allow `revtech://auth/callback`; email delivery and installed-build recovery still need testing. The connector cannot change the Auth redirect allowlist.
- Push queue SQL is installed, but the scheduled sender is INACTIVE. Deployment of the prepared worker was blocked by automatic approval review pending explicit approval to send device tokens and booking-status text to Expo. Worker code has not been deployed or runtime-tested.
- Hosted policy URLs and store disclosures need verifying against the final build.
- Live end-to-end tests need customer/staff accounts and real iOS/Android devices.
- Google developer verification and store testing/review gates remain.
- The live database has hardened policies in the private schema; do not rerun schema.sql on the existing database.

## 15 September release fixes

- Account deletion now invokes the existing authenticated `delete-account` Edge Function rather than a nonexistent database RPC.
- Password recovery supports the `revtech://auth/callback` link and a password-change screen. Signup confirmation uses the same callback. Requires a rebuilt app and the Auth redirect allowlist setting above.
- Privacy and terms can be opened without signing in.
- Notification preference writes preserve the other switch and report failures. Removed the appointment-reminder switch because no reminder implementation exists.
- Push delivery preparation: `supabase/push_delivery.sql`, `supabase/functions/booking-notifications/index.ts`. Server-only queue, preference checks, retry leases, ticket/receipt processing and invalid-device cleanup. No sender is active and no notifications have been sent.
- Remaining notification hardening before activation: verify sign-out/device token cleanup and shared-device account switching; test the worker with mocked Expo responses and on physical phones; check APNs/FCM credentials. Do not enable the cron job until explicit Expo data-transfer approval and these checks are complete.
- Mobile typecheck and iOS/Android exports pass; signed builds, store metadata, hosted policy links and device tests remain outstanding.
