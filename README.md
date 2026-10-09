# Trainingsplanner — Golfacademy Almeerderhout

Webapp (PWA) voor het coachteam: roosters, kalender (dag/week/maand/jaar/tijdlijn), groepen, leden, activiteiten, drills-database en logboek.
Huisstijl: C@ddie (Albert Sans, oranje/antraciet/papier). Fase 1, 2 en 3.

## Direct bekijken (demo-modus)

Open `index.html` via een webserver (niet via `file://`, want de app gebruikt ES-modules):

```
cd trainingsplanner
python3 -m http.server 8080
```

Ga naar http://localhost:8080 en kies een coach. In demo-modus blijven alle gegevens in de browser (localStorage); via *Meer → Demo opnieuw instellen* zet je de voorbeelddata terug.

## Live zetten met het hele team (Supabase)

1. **Supabase-project aanmaken** op https://supabase.com → *New project*. Kies regio **Frankfurt (eu-central-1)** en bewaar het databasewachtwoord.
2. **Schema laden**: *SQL Editor → New query* → plak de inhoud van `supabase/schema.sql` → *Run*.
3. **Basisgegevens**: open `supabase/seed.sql`, pas onderaan de coach-rij aan (jouw naam en het e-mailadres waarmee je inlogt) → *Run*. Daarna `supabase/drills.sql` → *Run* (49 drills uit C@ddie).
4. **Inloggen instellen**: *Authentication → Providers → Email* aan. Voor wachtwoorden: *Authentication → Users → Add user* (e-mail + wachtwoord) per coach, óf laat coaches zelf een *inloglink* aanvragen in het loginscherm (magic link; dan moet *Confirm email* uit of het e-mailsjabloon ingesteld zijn).
   Een coach moet eerst als coach bestaan in de app (*Meer → Coaches → +*) met hetzelfde e-mailadres; bij de eerste login wordt het account automatisch gekoppeld.
5. **Sleutels invullen**: *Settings → API* → kopieer *Project URL* en *anon public key* naar `js/config.js`:
   ```js
   supabaseUrl: "https://xxxx.supabase.co",
   supabaseAnonKey: "eyJ...",
   ```
6. **Hosten**: zet de map op Netlify, Vercel, GitHub Pages of de webruimte van de club (statische bestanden, geen server nodig). Voeg in Supabase onder *Authentication → URL Configuration* de site-URL toe.
7. **AVG**: sluit in Supabase de verwerkersovereenkomst (DPA) af (*Organization → Legal documents*). Bewaar in ledennotities geen medische of andere gevoelige gegevens.

## Rechten

| | Coördinator | Coach |
|---|---|---|
| Groepen, roosters, seizoenen, locaties, coaches | beheren | lezen |
| Losse activiteiten | alle | eigen |
| Sessie aanpassen / afgelasten | alle | eigen sessies |
| Logboek, aanwezigheid, actiepunten | alle | eigen |
| Drills | beheren + goedkeuren | eigen toevoegen |

Een persoon kan beide rollen hebben (vlaggen in het coachprofiel). Rechten worden in de database afgedwongen (Row Level Security), niet alleen in de interface.

## Structuur

```
index.html            app-schil
css/app.css           huisstijl
js/config.js          Supabase-sleutels / demo-modus
js/app.js             router, login, navigatie
js/store/             opslag: demo (localStorage) en supabase (Postgres + realtime)
js/lib/recur.js       herhalingsengine: roosterregels → sessies, conflictcontrole
js/lib/model.js       afgeleide gegevens (sessies verrijkt met groep/coach/locatie)
js/views/             vandaag, kalender, groepen, activiteiten, drills, meer, sessie, roosterregel
js/data/              voorbeelddata, drills en taxonomie uit C@ddie
supabase/             schema.sql, seed.sql, drills.sql
```

## Datamodel in het kort

- **schedule_rules**: een roostermoment of activiteit met herhaling (eenmalig, wekelijks, om de week, n-de weekdag van de maand, losse datums), start/einde of aantal keer, tijd, locatie, coaches.
- **overrides**: afwijking voor één voorkomen (andere tijd/datum/locatie/coach, of afgelast) — sleutel `rule_id + datum`.
- Sessies worden niet opgeslagen maar berekend uit regels + afwijkingen + vakanties; logs, aanwezigheid en (fase 2) lesvoorbereidingen hangen aan de sessiesleutel `rule_id_datum`.

## Fase 2 — lesvoorbereiding

- **Leerlijn per groep** (`group_themes`): periodethema's met start, aantal weken, focuscategorieën en periodedoel; zichtbaar als band op de tijdlijn.
- **Lesvoorbereiding per sessie** (`lesson_plans`): thema, lesdoel, blokken (warming-up / techniek / spelvorm / afsluiting) met drill of vrije tekst, minuten en notitie; status concept/definitief.
- **Generator** (`js/lib/generator.js`): scoort drills op thema-focus, niveau, leeftijd, locatie, groepsgrootte, recent gebruik en favorieten; per blok "alternatief / makkelijker / moeilijker"; "voorstellen genereren" voor alle komende sessies van een groep.
- **PDF** (`js/lib/pdf.js`, pdf-lib + Albert Sans in `lib/`): A4 met kop, thema/lesdoel, blokken met tijden, uitvoering, materiaal en notities.
- Kopiëren van/naar andere sessies; leerlijn kopiëren naar een andere groep.

## Fase 4 — Programma (inhoudelijke planning)

- Tabblad **Programma** (alleen ≥ 1000 px): per groep en seizoen profiel → periodisering → thema's → sessiematrix.
- **Profiel** (`groups.profile`): Beginner (alleen thema's), Recreatief (AV → SV → Speelseizoen → TR), Competitief (AV, SV, PC, WE, OH, TR), Selectie (+ taper/herstel rond A-pieken), Topgolf (alle fases). Seizoensdoel en MJOP-fase.
- **Periodisering** (`programs.phases`, C@ddie-model in `js/lib/periodization.js`): fases met trainingsmix techniek/skill/performance en accenten per categorie; automatisch opgebouwd uit profiel + wedstrijden (`buildPhases`), daarna per fase aan te passen.
- **Wedstrijden** (`programs.peaks`): A/B/C-pieken, uit de wedstrijdbibliotheek ("Uit bibliotheek"), handmatig of uit de kalender (activiteiten van het type Wedstrijd).
- **Thema's** uit profielsjablonen (`THEME_TEMPLATES`) over de fases; **sessiematrix** weken × roostermomenten met stand Compact / Inhoud (blokken met drills), vastzetten en opnieuw genereren per sessie; vakanties als gearceerd blok.
- **Genereer programma** met coach-input: aandachtspunten (komen in elke voorbereiding), nadruk per categorie, blokopbouw, beschikbare locaties, favorieten eerst, herhalingsvenster, fases/thema's opbouwen, bereik. De generator weegt fase-mix, accenten en nadruk mee.

## Fase 3 — coördinatie

- **Afmelden & vervanging** (`requests`): coach meldt zich af met reden en vraagt optioneel een collega (kandidaten gesorteerd op beschikbaarheid, overlap, specialisatie, vaste coach van de groep); collega accepteert met één tik of coördinator kiest een vervanger; de vervanger krijgt de melding met link naar de sessie (voorbereiding + laatste log staan daar).
- **Meldingen** (`notifications`): belletje in de kop met teller; gestuurd bij afgelasten, aanpassen, vervanging en acceptatie. Realtime in Supabase-modus.
- **ICS-agenda**: download per coach, per groep of hele team (6 maanden vooruit, Europe/Amsterdam). Een live abonnement vraagt een kleine Supabase Edge Function (fase 4).
- **Seizoen kopiëren**: Instellingen → Seizoenen → kopieer-icoon: roosterregels, leerlijnen en vakanties schuiven in hele weken mee naar een nieuw seizoen.
- **Rapportages**: dekking per groep (gelogd / voorbereid, voorbij en komend), thema-heatmap (minuten per hoofdcategorie per groep), vervangingen; CSV-export.

## Fase 5 — Wedstrijdmodule

- **Wedstrijdbibliotheek** (pagina *Wedstrijden*, via Activiteiten → Wedstrijden of Instellingen): tours (`tours`: naam, kleur), wedstrijden (`competitions`: categorie, speelvorm, klasse A/B/C, dagen, locatie, organisator, link, labels) en **edities per seizoen** (`competition_editions`: datum/einde, tijden, klasse, locatie, gekoppelde groepen).
- **In de kalender**: één tik zet een editie als activiteit van het type Wedstrijd in de kalender (coaches = coaches van de gekoppelde groepen; `schedule_rules.edition_id`); datum- en groepswijzigingen werken door, "Uit kalender halen" verwijdert de activiteit weer.
- **In programma's**: groep koppelen vanuit de editie, of op de programmapagina *Uit bibliotheek*; de editie wordt een A/B/C-piek (`peaks[].edition_id`) die de periodisering stuurt. Ontkoppelen haalt de piek weer weg.
- Rechten: team leest, coördinator beheert (RLS).
