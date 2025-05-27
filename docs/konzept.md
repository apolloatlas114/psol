Multiplayer Game Konzept (Stand Mai 2025, aktualisiert)
1. Ziel & Vision
- Modernes, schnelles, massenbasiertes Multiplayer-Browserspiel im Neon-3D-Stil.
- Free2Play (FFA & Koop), spaeter Krypto-Cashgames und Referral-System.
- Maximale Skalierbarkeit (spaeter Steam/Mobile, grosse Turniere, modulare Erweiterbarkeit).
- Zielgruppe: Skill-Spieler, Krypto-Enthusiasten, Highscorejaeger, Community-Builder.
2. Spielmodi & Lobbys
- **Free2Play (FFA):**
- 50 Spieler, jederzeit beitretbar, offene Runde (kein Timer), Leaderboard laeuft permanent.
- Respawn: Nach Tod (Score/Masse = 0) sofortiger Respawn mit Startscore, zufaellige Position.
- **Free2Play Koop:**
- Start mit Freunden ueber Einladungslink/Code, gemeinsamer Einstieg.
- Jeder hat eigenen Score, kann aber pro Runde einmal "Masse spenden" (Teamplay-Feature).
- Respawn: Wie FFA (siehe oben).
- **Cash Game:**
- Wie Free2Play, aber **kein Respawn!**
- Runde endet nach 20 Minuten, Top 5 bekommen Preispool (Top 1 am meisten).
- Ragequit: Score verfaellt, kein Cashout.
- Sieg: Wer am Ende die meiste Masse hat, gewinnt.
- **Turniere:**
- Kommen spaeter, eigene Card im Dashboard mit Infos/HTML.
3. Kernmechanik
- Spieler koennen NICHT durch Kollision fressen.
- **PvP: Laserstrahlen:**
- Zieht 10% der aktuellen Masse/Score des Gegners ab (auch unter Startmasse!).
- Faellt Score auf 0: Spieler "stirbt", sofortiger Respawn (FFA/Koop).
- Cooldown pro Spieler: 10 Sekunden.
- Jeder Schuss kostet den Schuetzen 2% seiner eigenen Masse/Score.
- Laser schiesst in Richtung Maus (instant, kein Delay).
- In Cashgames: Respawn NICHT erlaubt!
- **Startmasse:** 30.
- **Figurgroesse:** Radius = sqrtMasse * 1.5.
4. Progression, Raenge & Skins
- **Rangsystem (ohne Saison-Reset, max. Level 30):**
- Rang 2: 1 Kill in einem Match.
- Rang 3: 1 Kill & Teilnahme an 2 Matches.
- Rang 4: Mindestens einmal 200 Score/Masse erreicht.
- ... bis Level 30 (weitere Bedingungen individuell).
- Jeder Rang schaltet einen exklusiven Skin frei (nur fuer diesen Rang!).
- **Premium-Skins:**
- Im Shop kaufbar, unabhaengig vom Rangsystem.
- Skins koennen Sounds enthalten (im Shop vorhoerbar).
- Sound im Spiel: Mit Hotkey (10s Cooldown), hoerbar fuer Spieler in der Naehe.
- Social-Skin mit Sound fuer Einladungen von Freunden.
5. Shop & Webflow Dashboard
- Shop-UI wird direkt im Webflow-Editor gestaltet.
- **Funktionen:**
- Kauf-Button fuer Skins oeffnet Wallet-Dialog (Phantom/MetaMask) mit passendem Preis.
- Sound-Button zum Vorhoeren/Abspielen (10s Cooldown im Spiel).
- Skins: Besitz/Preisstatus muss per API angebunden werden.
6. Events
### Boss-Event (Gruen)
- Start: 60 Sekunden nach Spielstart.
- Ansage "BOSSFIGHT" (gruen) mit Font & Sound, unten am Bildschirm.
- Boss hat 500 HP, Lebensbalken unten.
- Bewegung: Nur im lila Eventkreis.
- Boss schiesst gruene Laser auf Spieler im Kreis (jeder Treffer: 30% Score/Masse Abzug).
- Nach 5 Minuten ohne Kill: "BOSS LEFT"-Font & Sound, Boss despawnt.
- Wird Boss gekillt: "BOSS KILLED"-Font & Sound, droppt 20 Powerups, 60s Zeit zum Einsammeln.
### Feed Your Egg Event
- Start: 3 Min nach Boss-Event, dauert 5 Minuten.
- "FEED YOUR EGG"-Ansage + Sound.
- Jeder Spieler erhaelt ein Egg (Skin folgt), das neben dem Spieler spawnt (Start: 50 HP, sichtbare
HP-Anzeige).
- Spieler sammelt Futter -> Score geht direkt auf das Egg (max. 100 HP).
- Ist Egg auf 100 HP: Wird zum Eggmonster (LED-Licht-Figur, 100 HP).
- Eggmonster greift Gegner mit Laser an (10% Score Abzug, 15s Cooldown), bewegt sich zu Gegnern (keine
Kollision), sucht alle 20s neues Ziel, bleibt bis Tod.
- Egg wird getroffen: Jeder Lasertreffer von anderen Spielern zieht 10% HP ab.
- Wird Eggmonster getroffen: Parent-Spieler erhaelt Score/Masse.
- Nach 5 Min "EGGMONSTER ALIVE"-Ansage, verschwindet nach 20s.
- Eggmonster bleiben, bis sie zerstoert werden.
### Zweites Boss-Event (Blau)
- Start: 5 Min nach "EGGMONSTER ALIVE".
- Ansage "BOSSFIGHT" (blau) mit Font & Sound, Bossmusik laeuft.
- Boss mit 5000 HP, kann sich auf ganzer Map bewegen, schiesst blaue Laser (30% Abzug, alle 20s Sound).
- "BOSS KILLED": Font & Sound, droppt viele Powerups (60s Zeit), max. 5 verschiedene pro Spieler.
7. Power-Ups & Stationen
- Stationen zufaellig auf Map verteilt, sichtbar als farbige Punkte auf Minimap (oben links, halbtransparent).
- Symbole fuer Powerups erscheinen am linken Bildschirmrand, wenn Spieler in Naehe.
- Kauf: Taste druecken + 30% der aktuellen Score/Masse bezahlen.
- Nur 1 Powerup gleichzeitig aktiv (Anzeige am oberen Bildschirmrand).
- **Arten:** Speed-Boost (hellblau), Massenmagnet (blau), Railgun (rot), Toxictrail (gruen).
- Event-Powerups: 60s Zeit zum Aufnehmen, max. 5 verschiedene gleichzeitig.
8. Minimap
- Zeigt nur eigenen Spieler (immer gruen) und Powerup-Stationen (je nach Typ farbig).
- Keine Gegner-Anzeige!
9. Statistik / Profil (Webflow)
- Werte per API abrufbar, im Popup-Profil im Dashboard:
- Highscore (Bestleistung)
- Top 3-Platzierungen
- Anzahl Kills
- Siege in Events
- Gesamtspielzeit
- Meiste Masse in einer Runde
- Meiste Eventsiege
10. Turniere & Cashgames
- Turnierbereich: Eigene Card im Dashboard, Pop-Up mit Text/Infos (kommt spaeter).
- Cashgames: Wie FFA, aber ohne Respawn und mit 20-Minuten-Timer. Top 5 gewinnen Preispool
(Verteilung: Top 1 am meisten). Ragequit = kein Gewinn.
11. Sonstiges / Offene Punkte
- Weiterentwicklung: Neue Events, Powerups, mehr Raenge & Skins, Turniere, Teamplay-Features.
- Balancing und Anpassung laufend nach Community-Feedback.
- Security: Kein User-Bildupload, Wallet-Sicherheit, Event-Handling via eigenstaendigen JS-Files.