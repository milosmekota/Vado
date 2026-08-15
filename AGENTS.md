# Vado – pracovní kontext

Tento soubor je rychlý vstupní bod pro další práci v repozitáři. Podrobnější
popis aplikace je v `docs/PROJECT_CONTEXT.md` a technická rizika a pravidla jsou
v `docs/TECHNICAL_NOTES.md`.

## Co je Vado

Vado je česká interní servisní CRM aplikace. Eviduje zákazníky a jejich zařízení,
komentáře, poslední servis, plánované servisní události a polohu. Nad daty nabízí
dashboard, seznam zákazníků, kalendář, mapu, read-only AI asistenta a auditní
historii změn.

## Stack

- Next.js 16, App Router, JavaScript/JSX
- React 19 a Material UI 7
- MongoDB přes Mongoose
- JWT v `httpOnly` cookie `token`, hesla přes `bcryptjs`
- FullCalendar pro servisní kalendář
- Leaflet a Nominatim/OpenStreetMap pro mapu a geokódování
- OpenAI Responses API pro AI asistenta

## Orientace v repozitáři

- `src/app/` – stránky, layout a API route handlers
- `src/app/components/` – klientské UI komponenty
- `src/models/` – Mongoose modely `User`, `Customer` a append-only `AuditLog`
- `src/services/customer.service.js` – dotazy a servisní události
- `src/services/audit.service.js` – zápis a stránkovaný výpis historie změn
- `src/lib/auth.js` – načtení aktuálního uživatele z JWT
- `src/lib/mongodb.js` – sdílené MongoDB připojení
- `src/lib/openai.js` – OpenAI klient

## Příkazy

```bash
npm run dev
npm run lint
npm run build
npm start
```

Před dokončením změny spusť minimálně `npm run lint`. U změn rout, modelů,
layoutu nebo závislostí spusť také `npm run build`.

## Kritický invariant autorizace

Záznam `Customer` patří uživateli přes `userId`. Běžný uživatel smí číst nebo
měnit jen zákazníky s vlastním `userId`; admin může pracovat se všemi. Tento filtr
musí platit i pro vnořené komentáře, lokaci a servisní události. Samotné ověření,
že je uživatel přihlášený, nestačí.

Aktuální implementace tento invariant nedodržuje všude. Před rozšiřováním API si
přečti `docs/TECHNICAL_NOTES.md`.

## Konvence a zdroje pravdy

- Datum servisu se ukládá jako řetězec `YYYY-MM-DD`.
- `Customer.serviceEvents` je zdroj servisních událostí.
- `Customer.nextService` je odvozené datum nejbližší události se stavem `planned`.
- Komentáře a servisní události mají aplikační UUID v poli `id`, nikoli vlastní
  MongoDB `_id`.
- Každá úspěšná mutace zákazníka, komentáře, polohy nebo servisu musí vytvořit
  auditní záznam s vlastníkem dat a aktuálním uživatelem jako autorem.
- Auditní záznamy jsou append-only; běžný uživatel vidí historii vlastních dat,
  admin vidí vše.
- API odpovědi zákazníka obvykle skrývají `userId` a `__v`.
- Texty uživatelského rozhraní jsou česky.
- Dashboard používá pro moduly responzivní dlaždice: 2 sloupce na mobilu,
  3 na tabletu a až 6 na velké obrazovce. Pořadí končí `Nastavení`, `Historie`.
- V mobilním kalendáři je titulkem události příjmení zákazníka; původní název
  servisu zůstává v detailu události.
- Tajné hodnoty patří do `.env.local`; dokumentují se jen názvy proměnných.

## Důležité proměnné prostředí

- `MONGODB_URI`
- `JWT_SECRET`
- `ALLOW_REGISTRATION`
- `NEXT_PUBLIC_ALLOW_REGISTRATION`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` – v současné Leaflet implementaci patrně
  nepoužívaná
