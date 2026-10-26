# TAXIO Operator integration gate

The app is an offline demo by default; no backend URL or keys are built into source code.

Integration code in src/backend.ts supports authenticated login, company resolution,
company logo/name retrieval, and read-only booking data through ordinary RLS rules.
No production or staging configuration has been applied.

Before any live connection:
1. Obtain explicit owner approval for the target environment.
2. Verify mobile identities, company membership and RLS with dedicated test accounts.
3. Review whether company_members roles actually permit **driver** access.
4. Identify the exact existing company-A and rescue decision RPCs and verify atomicity,
   tenant authorization, and authoritative 45-second deadlines.
5. Implement backend-mediated push-token registration and Expo push delivery, with no
   secrets in the app bundle.
6. Test the timeouts with locked/background devices and offline reconnection.
7. Verify trip completion works on the authorized operating company only.

Never place Supabase service-role credentials in EXPO_PUBLIC variables.
Never call a production mutation from a demo UI.

To opt in to a controlled non-production read-only integration, supply
EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY locally or in
an approved dedicated build environment. Do not publish production credentials.
