## Plan

1. **Maak een OAuth callback-pagina**
   - Voeg een publieke `/auth/callback` route toe.
   - Laat deze pagina de auth-sessie verwerken via de bestaande backend-client.
   - Toon alleen een korte laadstatus tijdens verwerking.
   - Redirect bij succes naar `/dashboard`; bij fout terug naar `/login` met een duidelijke foutmelding.

2. **Zet Google OAuth redirects gelijk**
   - Pas Google-login en Google-registratie aan zodat `redirect_uri` naar `${window.location.origin}/auth/callback` wijst in plaats van alleen de root `/`.
   - Dit voorkomt dat de callback op een niet-bestaande of verkeerde route belandt.

3. **Plaats de route vóór de catch-all 404**
   - Voeg `/auth/callback` in `App.tsx` toe vóór `path="*"`.
   - De 404-pagina blijft alleen voor echte onbekende routes.

4. **Verbeter foutmelding bij Google-login**
   - Als de callback een fout bevat of geen sessie kan maken, toon op `/login` een begrijpelijke melding in plaats van de gebruiker op 404 te laten eindigen.

5. **Opruimen van dubbele redirects**
   - Verwijder dubbele `navigate('/dashboard')` calls in login/landing zodat de overgang rustiger en voorspelbaar blijft.

## Technische details

- Huidige frontend OAuth-config gebruikt nu `redirect_uri: window.location.origin` in `Login.tsx` en `Register.tsx`.
- Er bestaat momenteel geen `/auth/callback` route in React Router.
- De catch-all route `path="*"` toont `NotFound`, waardoor callback-paden zonder route als 404 kunnen verschijnen.
- De bestaande `AuthProvider` heeft al `getSession()` en `onAuthStateChange`; de nieuwe callback-pagina vult dit aan door expliciet de callback af te handelen en daarna door te sturen.