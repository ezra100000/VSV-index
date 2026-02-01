import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Loader2, Trophy, Target } from 'lucide-react';

const BettingValueTracker = () => {
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState([]);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState('');

  const leagues = [
    { name: 'Premier League', url: 'https://www.livesport.cz/fotbal/anglie/premier-league/vysledky/' },
    { name: 'La Liga', url: 'https://www.livesport.cz/fotbal/spanelsko/laliga/vysledky/' },
    { name: 'Serie A', url: 'https://www.livesport.cz/fotbal/italie/serie-a/vysledky/' },
    { name: 'Bundesliga', url: 'https://www.livesport.cz/fotbal/nemecko/bundesliga/vysledky/' },
    { name: 'Ligue 1', url: 'https://www.livesport.cz/fotbal/francie/ligue-1/vysledky/' }
  ];

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setTeams([]);
    setProgress('Začínám načítat data...');

    try {
      const allTeamsData = [];

      for (const league of leagues) {
        setProgress(`Načítám ${league.name}...`);
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4000,
            messages: [{
              role: 'user',
              content: `Potřebuji získat data z webu ${league.url}. 
              
Prosím:
1. Najdi všechny zápasy z posledních 5 dokončených kol této soutěže
2. Pro každý zápas mi vrať v JSON formátu:
   - home_team: název domácího týmu
   - away_team: název hostujícího týmu
   - home_score: počet gólů domácích
   - away_score: počet gólů hostů
   - match_url: URL detailu zápasu (ve formátu /zapas/...)
   
Vrať POUZE čistý JSON array, bez jakéhokoliv dalšího textu, preamble nebo markdown backticks.`
            }],
            tools: [{ type: 'web_search_20250305', name: 'web_search' }]
          })
        });

        const data = await response.json();
        
        // Better error handling
        if (!data.content || data.content.length === 0) {
          console.error('No content in response for', league.name);
          continue;
        }

        const content = data.content.map(item => item.type === 'text' ? item.text : '').join('');
        
        let matches;
        try {
          const cleanContent = content.replace(/```json|```/g, '').trim();
          matches = JSON.parse(cleanContent);
          console.log(`${league.name}: Načteno ${matches.length} zápasů`);
        } catch (e) {
          console.error('Error parsing matches for', league.name, ':', e);
          continue;
        }

        if (!Array.isArray(matches) || matches.length === 0) {
          console.error('No matches found for', league.name);
          continue;
        }

        const teamsMap = new Map();
        let processedMatches = 0;

        for (let i = 0; i < matches.length && i < 50; i++) {
          const match = matches[i];
          setProgress(`${league.name}: Zápas ${i + 1}/${Math.min(matches.length, 50)}`);
          
          // Skip draws
          if (match.home_score === match.away_score) {
            console.log(`Skipping draw: ${match.home_team} vs ${match.away_team}`);
            continue;
          }

          const oddsUrl = `https://www.livesport.cz${match.match_url}/kurzy/draw-no-bet/zakladni-doba/`;
          
          const oddsResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 1000,
              messages: [{
                role: 'user',
                content: `Z této stránky ${oddsUrl} potřebuji zjistit kurzy pro "Sázka bez remízy" (Draw No Bet).
                
Vrať mi POUZE JSON objekt v tomto formátu, bez jakéhokoliv dalšího textu:
{
  "home_odds": číslo (kurz na domácí tým),
  "away_odds": číslo (kurz na hosty)
}

Pokud kurzy nejsou dostupné, vrať null.`
              }],
              tools: [{ type: 'web_search_20250305', name: 'web_search' }]
            })
          });

          const oddsData = await oddsResponse.json();
          
          if (!oddsData.content || oddsData.content.length === 0) {
            console.log(`No odds data for match: ${match.home_team} vs ${match.away_team}`);
            continue;
          }

          const oddsContent = oddsData.content.map(item => item.type === 'text' ? item.text : '').join('');
          
          let odds;
          try {
            const cleanOdds = oddsContent.replace(/```json|```/g, '').trim();
            odds = JSON.parse(cleanOdds);
          } catch (e) {
            console.log(`Error parsing odds for: ${match.home_team} vs ${match.away_team}`);
            continue;
          }

          if (!odds || !odds.home_odds || !odds.away_odds) {
            console.log(`Invalid odds for: ${match.home_team} vs ${match.away_team}`);
            continue;
          }

          processedMatches++;
          console.log(`Processing match: ${match.home_team} vs ${match.away_team} (${odds.home_odds} vs ${odds.away_odds})`);

          // Process home team
          const homeWin = match.home_score > match.away_score;
          const homeFavorite = odds.home_odds < odds.away_odds;
          const homeBet = homeFavorite ? 100 : 50;
          const homeReturn = homeWin ? homeBet * odds.home_odds : 0;

          if (!teamsMap.has(match.home_team)) {
            teamsMap.set(match.home_team, {
              team: match.home_team,
              league: league.name,
              favoriteCount: 0,
              outsiderCount: 0,
              totalBet: 0,
              totalReturn: 0
            });
          }
          const homeData = teamsMap.get(match.home_team);
          homeData.totalBet += homeBet;
          homeData.totalReturn += homeReturn;
          homeData.favoriteCount += homeFavorite ? 1 : 0;
          homeData.outsiderCount += homeFavorite ? 0 : 1;

          // Process away team
          const awayWin = match.away_score > match.home_score;
          const awayFavorite = odds.away_odds < odds.home_odds;
          const awayBet = awayFavorite ? 100 : 50;
          const awayReturn = awayWin ? awayBet * odds.away_odds : 0;

          if (!teamsMap.has(match.away_team)) {
            teamsMap.set(match.away_team, {
              team: match.away_team,
              league: league.name,
              favoriteCount: 0,
              outsiderCount: 0,
              totalBet: 0,
              totalReturn: 0
            });
          }
          const awayData = teamsMap.get(match.away_team);
          awayData.totalBet += awayBet;
          awayData.totalReturn += awayReturn;
          awayData.favoriteCount += awayFavorite ? 1 : 0;
          awayData.outsiderCount += awayFavorite ? 0 : 1;
        }

        console.log(`${league.name}: Zpracováno ${processedMatches} zápasů, ${teamsMap.size} týmů`);
        allTeamsData.push(...Array.from(teamsMap.values()));
      }

      console.log(`Total teams collected: ${allTeamsData.length}`);

      if (allTeamsData.length === 0) {
        setError('Nepodařilo se načíst žádná data. Zkuste to prosím znovu.');
        setProgress('');
        return;
      }

      const processedTeams = allTeamsData.map(team => ({
        ...team,
        profit: team.totalReturn - team.totalBet,
        vsv: team.totalBet > 0 ? ((team.totalReturn - team.totalBet) / team.totalBet) * 100 : 0
      })).sort((a, b) => b.vsv - a.vsv);

      console.log(`Processed teams: ${processedTeams.length}`);
      setTeams(processedTeams);
      setProgress(`Hotovo! Načteno ${processedTeams.length} týmů.`);
    } catch (err) {
      console.error('Error in fetchData:', err);
      setError(err.message);
      setProgress('');
    } finally {
      setLoading(false);
    }
  };

  const getVSVColor = (vsv) => {
    if (vsv > 20) return 'text-emerald-400';
    if (vsv > 0) return 'text-green-400';
    if (vsv > -20) return 'text-orange-400';
    return 'text-red-400';
  };

  const getVSVIcon = (vsv) => {
    if (vsv > 5) return <TrendingUp className="w-4 h-4" />;
    if (vsv < -5) return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="fixed inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(34, 211, 238, 0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(34, 211, 238, 0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
          animation: 'gridMove 20s linear infinite'
        }} />
      </div>

      <style>{`
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-in {
          animation: slideIn 0.5s ease-out forwards;
        }
      `}</style>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12">
        <header className="mb-12 text-center">
          <div className="inline-flex items-center gap-3 mb-4 bg-cyan-500/10 px-6 py-3 rounded-full border border-cyan-500/30">
            <Trophy className="w-6 h-6 text-cyan-400" />
            <span className="text-cyan-400 font-bold tracking-wider text-sm uppercase">Betting Intelligence</span>
          </div>
          <h1 className="text-6xl md:text-7xl font-black mb-4 bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 bg-clip-text text-transparent leading-tight">
            VSV Index
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto font-light">
            Analýza ziskovosti sázek na fotbalové týmy z top 5 evropských lig<br/>
            <span className="text-sm text-slate-500">Poslední 5 odehraných kol • Sázka bez remízy</span>
          </p>
        </header>

        <div className="text-center mb-12">
          <button
            onClick={fetchData}
            disabled={loading}
            className="group relative px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg font-bold text-lg
                     hover:from-cyan-400 hover:to-blue-400 transition-all duration-300 disabled:opacity-50 
                     disabled:cursor-not-allowed shadow-lg shadow-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/70
                     hover:scale-105 active:scale-95"
          >
            <span className="flex items-center gap-3">
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Načítám data...
                </>
              ) : (
                <>
                  <Target className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                  Načíst data
                </>
              )}
            </span>
          </button>
          {progress && (
            <p className="mt-4 text-cyan-400 text-sm animate-pulse">{progress}</p>
          )}
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-center">
            Chyba: {error}
          </div>
        )}

        {teams.length > 0 && (
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700">
                    <th className="px-6 py-4 text-left text-xs font-bold text-cyan-400 uppercase tracking-wider">#</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-cyan-400 uppercase tracking-wider">Tým</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-cyan-400 uppercase tracking-wider">Soutěž</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-cyan-400 uppercase tracking-wider">Favorit</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-cyan-400 uppercase tracking-wider">Outsider</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-cyan-400 uppercase tracking-wider">Vklady</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-cyan-400 uppercase tracking-wider">Zisk</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-cyan-400 uppercase tracking-wider">VSV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {teams.map((team, index) => (
                    <tr 
                      key={index} 
                      className="hover:bg-slate-800/30 transition-colors duration-200 animate-slide-in"
                      style={{ animationDelay: `${index * 0.02}s` }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-bold ${
                          index < 3 ? 'text-yellow-400' : 
                          index < 10 ? 'text-slate-300' : 
                          'text-slate-500'
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-white">{team.team}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs text-slate-400">{team.league}</span>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className="text-sm text-slate-300">{team.favoriteCount}</span>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className="text-sm text-slate-300">{team.outsiderCount}</span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <span className="text-sm text-slate-300">{team.totalBet.toFixed(0)}</span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <span className={`text-sm font-semibold ${team.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {team.profit >= 0 ? '+' : ''}{team.profit.toFixed(0)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <span className={getVSVColor(team.vsv)}>
                            {getVSVIcon(team.vsv)}
                          </span>
                          <span className={`text-sm font-bold ${getVSVColor(team.vsv)}`}>
                            {team.vsv >= 0 ? '+' : ''}{team.vsv.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {teams.length > 0 && (
          <div className="mt-8 text-center text-slate-500 text-sm">
            <p>Analyzováno {teams.length} týmů z 5 evropských lig</p>
            <p className="mt-2">Data: LiveSport.cz • Typ sázky: Sázka bez remízy</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BettingValueTracker;
