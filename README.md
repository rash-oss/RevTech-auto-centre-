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

1. Install Node.js 20 or newer.
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

- Push notifications and notification preferences
- Optional Stripe payment/deposit flow
- Hosted privacy policy and terms
- Store screenshots, final device testing, signed builds and submissions
