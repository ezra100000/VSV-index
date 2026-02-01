# VSV Index - Betting Value Tracker

Interaktivní web aplikace pro analýzu ziskovosti sázek na fotbalové týmy z top 5 evropských lig.

## Funkce

- 📊 Analýza posledních 5 odehraných kol z každé ligy
- ⚽ Sledování 5 lig: Premier League, La Liga, Serie A, Bundesliga, Ligue 1
- 💰 Výpočet VSV (Virtual Stake Value) - ukazatel ziskovosti
- 🎯 Typ sázky: "Sázka bez remízy" (Draw No Bet)
- 📈 Real-time načítání dat z LiveSport.cz
- 🎨 Moderní, dynamický design s animacemi

## Výpočet VSV

Pro každý tým:
1. Analyzuje se posledních 5 ligových zápasů
2. Virtuální sázka:
   - **100 bodů** pokud je tým favorit (nižší kurz)
   - **50 bodů** pokud je tým outsider (vyšší nebo stejný kurz)
3. **VSV = (celkové výhry - celkové vklady) / celkové vklady × 100%**
4. Remízy se nepočítají (sázka se vrací)

## Instalace lokálně

```bash
# Nainstalovat závislosti
npm install

# Spustit vývojový server
npm run dev

# Build pro produkci
npm run build
```

## Deploy na Vercel

### Varianta 1: Přes Vercel CLI

```bash
# Nainstalovat Vercel CLI
npm i -g vercel

# Přihlásit se
vercel login

# Deployovat
vercel

# Pro produkční deploy
vercel --prod
```

### Varianta 2: Přes Vercel Dashboard

1. Nahrajte celý projekt do Git repozitáře (GitHub, GitLab, Bitbucket)
2. Přihlaste se na [vercel.com](https://vercel.com)
3. Klikněte na "New Project"
4. Importujte váš repozitář
5. Vercel automaticky detekuje Vite a nastaví build
6. Klikněte na "Deploy"

### Varianta 3: Přes Vercel bez Git

1. Přihlaste se na [vercel.com](https://vercel.com)
2. Přetáhněte celou složku projektu do Vercel Dashboard
3. Vercel automaticky deployne aplikaci

## Struktura projektu

```
betting-value-tracker/
├── src/
│   ├── BettingValueTracker.jsx  # Hlavní komponenta
│   ├── main.jsx                 # Entry point
│   └── index.css                # Styly + Tailwind
├── index.html                   # HTML template
├── package.json                 # Závislosti
├── vite.config.js              # Vite konfigurace
├── tailwind.config.js          # Tailwind konfigurace
├── postcss.config.js           # PostCSS konfigurace
└── vercel.json                 # Vercel konfigurace
```

## Technologie

- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Lucide React** - Ikony
- **Anthropic Claude API** - AI-powered data scraping

## Jak to funguje

1. Uživatel klikne na "Načíst data"
2. Aplikace použije Claude API pro web scraping LiveSport.cz
3. Pro každou ligu:
   - Načte výsledky z posledních 5 kol
   - Získá kurzy "Sázka bez remízy" pro každý zápas
   - Vypočítá VSV pro každý tým
4. Zobrazí žebříček seřazený podle VSV

## Poznámky

- Data se načítají on-demand (při kliknutí na tlačítko)
- Proces může trvat několik minut (scraping ~100+ zápasů)
- Aplikace neukládá historická data
- Vždy zobrazuje aktuální stav posledních 5 kol

## Změny oproti původní verzi

- ✅ Headline změněn na "VSV Index"
- ✅ Poslední sloupec přejmenován z "Úspěšnost" na "VSV"
- ✅ Vylepšené logování a error handling
- ✅ Lepší feedback při načítání dat

## Autor

Vytvořeno pomocí Claude AI (Anthropic)

## Licence

MIT
