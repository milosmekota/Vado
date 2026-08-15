# Technické poznámky a známá rizika

Dokument popisuje stav repozitáře zjištěný při kontrole. Není to seznam již
opravených věcí.

## Priorita 1 – oddělení dat uživatelů

Autorizace je na několika místech nekonzistentní:

- `/api/customers` správně vrací běžnému uživateli jen jeho zákazníky a adminovi
  všechny.
- Serverová stránka `/customers` však volá `getAllCustomers()` pro každou roli.
- AI nástroje také vždy volají `getAllCustomers()`.
- Routy komentářů a servisních událostí nyní vlastníka kontrolují před změnou.
  Níže položené servisní funkce ale stále pracují s pouhým ID, takže se nemají
  volat z nových endpointů bez předchozího autorizačního filtru.

Důsledek zbývajících read cest: přihlášený běžný uživatel může na serverové
stránce zákazníků nebo přes AI získat data jiného uživatele.

Doporučený směr opravy je předávat do servisní vrstvy aktuálního uživatele a
všechny dotazy stavět nad jednotným filtrem `{ _id, userId }`, respektive pouze
`{ _id }` pro admina. Kontrola musí proběhnout atomicky v databázovém dotazu,
ne až po načtení dokumentu.

## Priorita 2 – chování auth během buildu

`getCurrentUser()` zachytává všechny výjimky včetně interního signálu Next.js,
kterým `cookies()` označuje dynamické renderování. Produkční build uspěje, ale
vypisuje opakované chyby `Dynamic server usage` pro chráněné stránky.

Je vhodné explicitně označit dynamické routy/layout nebo interní Next.js výjimku
znovu vyhodit a zachytávat jen očekávané chyby JWT/databáze.

## Priorita 3 – údržba

- V repozitáři nejsou automatické testy.
- `next` je ve verzi 16, zatímco `eslint-config-next` je ve verzi 15.
- README je výchozí text z `create-next-app` a nepopisuje Vado.
- `CustomerCard.jsx` a `CalendarClient.jsx` jsou velké komponenty s několika
  odpovědnostmi.
- Výpočet servisního bucketu a pomocná funkce `addMonths` jsou duplikované.
- Normalizace zákazníka a sestavení autorizačního filtru jsou duplikované v API
  routách.
- `dotenv`, `@react-google-maps/api` a veřejný Google Maps klíč vypadají při
  současném použití Leafletu jako nevyužité pozůstatky; před odstraněním ověřit.
- Některé servisní operace ukládají dokument vícekrát, protože po změně znovu
  přepočítávají a persistují `nextService`.
- Auditní zápis probíhá po datové mutaci bez MongoDB transakce. Při výpadku mezi
  oběma zápisy může změna existovat bez auditního záznamu; pro vyšší garance bude
  potřeba replica set a transakce.

## Bezpečnostní poznámky

- JWT je v `httpOnly`, `sameSite=lax` cookie a v produkci má `secure=true`.
- Token platí sedm dní a uživatel se při každém ověření znovu načítá z databáze.
- Registrace je řízená serverovou proměnnou, ale server přijímá i veřejnou
  `NEXT_PUBLIC_ALLOW_REGISTRATION`; preferovat jediný serverový přepínač.
- Login a registrace nemají rate limiting.
- API nemá společnou validaci délek textových polí ani velikosti AI konverzace
  v bajtech; počet AI zpráv je omezen na 20.
- Nominatim endpoint posílá pevně zadaný kontaktní e-mail v `User-Agent`.

## Ověřený aktuální stav

- `npm run lint` prochází bez chyb.
- `npm run build` dokončí produkční build, ale s výše popsanými hláškami o
  dynamickém serverovém použití.
- Produkční sestavení obsahuje routy `/history` a `/api/history`.
- Automatické testy zatím nejsou k dispozici; změny byly ověřeny lintem a buildem.
