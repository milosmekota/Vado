# Kontext aplikace Vado

## Účel produktu

Vado pomáhá servisnímu technikovi nebo malé servisní firmě spravovat zákazníky,
instalovaná zařízení a termíny servisů. Aplikace je navržená jako přihlášené
interní rozhraní, nikoli jako veřejný zákaznický portál.

## Hlavní uživatelské scénáře

1. Uživatel se přihlásí, případně se zaregistruje, pokud je registrace povolena.
2. Na dashboardu vidí počty zákazníků podle stavu posledního servisu.
3. V seznamu zákazníků může vyhledávat, filtrovat, přidávat a upravovat záznamy.
4. Ke každému zákazníkovi může přidávat komentáře.
5. Servis lze naplánovat z karty zákazníka nebo z kalendáře.
6. Kalendář umožňuje události vytvářet, přesouvat a mazat.
7. Mapa zobrazuje zákazníky s uloženou polohou; chybějící polohy lze dopočítat
   přes Nominatim.
8. AI asistent umí read-only hledat zákazníky a prioritizovat servisní práci.
9. V historii lze dohledat autora, čas a konkrétní hodnoty všech nových změn.

## Responzivní rozhraní

Dashboard zobrazuje šest modulů jako sjednocené barevné dlaždice bez doplňkových
popisků. Na mobilu jsou ve dvou sloupcích, na tabletu ve třech a na velké obrazovce
až v šesti. Pořadí modulů je Zákazníci, Kalendář, AI asistent, Mapa, Nastavení a
Historie.

Stránka začíná přímo sekcí `Moduly` bez nadpisu `Dashboard`. Servisní statistiky
mají vlastní sjednocené karty s barevnými stavovými ikonami. Na mobilu jsou ve
dvou sloupcích a poslední karta využívá celou šířku; na velké obrazovce se všech
pět statistik skládá do jedné řady.

Název `Vado` v levé části horní lišty funguje jako domovské tlačítko. Pro jasnou
interaktivitu má ikonu domů, viditelný rámeček, pozadí, hover stav, tooltip a
`aria-label`.

Měsíční kalendář používá na mobilu jako krátký titulek události příjmení zákazníka.
Na větších obrazovkách zobrazuje název servisní události. Detail události vždy
zachovává původní název servisu a celé jméno zákazníka.

## Stránky

| Cesta | Účel |
| --- | --- |
| `/` | Dashboard a servisní statistiky |
| `/login` | Přihlášení a volitelná registrace |
| `/customers` | Seznam, hledání a filtrování zákazníků |
| `/customers/new` | Vytvoření zákazníka |
| `/calendar` | FullCalendar se servisními událostmi |
| `/map` | Leaflet mapa zákazníků |
| `/ai` | Chat s read-only AI nástroji |
| `/history` | Auditní historie zákazníků, komentářů, poloh a servisů |
| `/settings` | Zatím pouze placeholder |

Chráněné stránky používají na serveru `getCurrentUser()` a bez uživatele
přesměrují na `/login`. Kořenový layout načítá uživatele také pro horní lištu.

## Datový model

### User

- `email` – unikátní, normalizovaný na lowercase
- `password` – bcrypt hash
- `role` – `user` nebo `admin`

### Customer

- vlastník: `userId`
- identita a kontakt: jméno, příjmení, e-mail, telefon, adresa, obec
- zařízení: výrobce, výrobní číslo, typ, rok instalace, online stav
- servis: `lastService`, odvozené `nextService`, pole `serviceEvents`
- poloha: souřadnice a metadata geokódování
- poznámky: vložené pole `comments`

Komentáře obsahují `id`, text, e-mail autora a ISO datum. Servisní události
obsahují `id`, datum `YYYY-MM-DD`, stav `planned|done|canceled`, název, poznámku
a zdroj. V současném UI se pracuje hlavně s plánovanými událostmi.

### AuditLog

Append-only auditní záznam obsahuje vlastníka dat, autora akce, typ a ID entity,
zákazníka, český souhrn, změněná pole se starou a novou hodnotou a automatický
timestamp. Běžný uživatel čte jen historii vlastních zákazníků, admin všechny
záznamy. Historie vzniká až od nasazení této funkce a nedopočítává starší změny.
Čas se v rozhraní zobrazuje jako datum a `HH:mm` v časové zóně `Europe/Prague`.

Audit se zapisuje při založení, úpravě a smazání zákazníka, při změnách komentářů
a polohy a při vytvoření, přesunu nebo smazání servisní události. Výpis je
stránkovaný po 100 záznamech a umožňuje postupně načíst celou historii.

## API

| Endpoint | Operace |
| --- | --- |
| `/api/auth/login` | Přihlášení a nastavení JWT cookie |
| `/api/auth/register` | Volitelná registrace a automatické přihlášení |
| `/api/auth/me` | Aktuální uživatel |
| `/api/auth/logout` | Smazání cookie |
| `/api/customers` | Výpis a vytvoření zákazníků |
| `/api/customers/[id]` | Detail, úprava a smazání zákazníka |
| `/api/customers/[id]/comments` | Přidání komentáře |
| `/api/customers/[id]/comments/[commentId]` | Úprava a smazání komentáře |
| `/api/customers/[id]/location` | Uložení geokódované polohy |
| `/api/service-events` | Výpis, vytvoření, přesun a smazání servisu |
| `/api/geocode` | Serverový proxy endpoint pro Nominatim |
| `/api/ai/chat` | OpenAI chat s lokálními read-only nástroji |
| `/api/history` | Stránkovaný výpis auditních záznamů |

## AI asistent

Route používá OpenAI Responses API a nabízí tři funkce:

- přehled servisních úkolů,
- hledání zákazníků,
- detail zákazníka včetně posledních komentářů.

Nástroje nemění databázi. Model dostává nejvýše posledních 20 zpráv a smyčka
zpracuje nejvýše pět kol function callů.

## Stav servisu

Dashboard, seznam zákazníků a mapa počítají stav z `lastService`:

- `ok` – servis proběhl v posledních 12 měsících,
- `dueSoon` – před 12 až 24 měsíci,
- `overdue` – před více než 24 měsíci,
- `missing` – datum chybí nebo je neplatné.

Tento výpočet je nyní duplikovaný v několika klientských komponentách i v AI
routě.
