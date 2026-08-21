module.exports = async function handler(req, res) {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/json,text/plain,*/*',
      'Referer': 'https://www.nasdaq.com/market-activity/stocks/screener'
    };
    async function fetchExchange(exchange) {
      const url = `https://api.nasdaq.com/api/screener/stocks?tableonly=true&limit=5000&exchange=${exchange}&download=true`;
      const r = await fetch(url, { headers });
      if (!r.ok) throw new Error(`${exchange}_scan_failed_${r.status}`);
      const j = await r.json();
      return j?.data?.rows || [];
    }
    const [nasdaq, nyse] = await Promise.all([fetchExchange('nasdaq'), fetchExchange('nyse')]);
    const parseNum = (v) => {
      if (v == null) return null;
      const n = Number(String(v).replace(/[$,%+,]/g, '').trim());
      return Number.isFinite(n) ? n : null;
    };
    const rows = [...nasdaq, ...nyse].map(r => ({
      symbol: String(r.symbol || '').trim().toUpperCase(),
      name: r.name || '',
      exchange: r.exchange || '',
      sector: r.sector || 'Unknown',
      industry: r.industry || 'Unknown',
      price: parseNum(r.lastsale ?? r.lastSalePrice),
      changePercent: parseNum(r.pctchange ?? r.percentageChange),
      volume: parseNum(r.volume),
      marketCap: parseNum(r.marketCap)
    })).filter(x => x.symbol && Number.isFinite(x.price) && Number.isFinite(x.changePercent));

    const filtered = rows.filter(x => x.price >= 2 && (x.marketCap == null || x.marketCap >= 100000000) && (x.volume == null || x.volume >= 100000));
    const sectorMap = new Map();
    for (const x of filtered) {
      const key = x.sector || 'Unknown';
      if (!sectorMap.has(key)) sectorMap.set(key, []);
      sectorMap.get(key).push(x);
    }
    const sectors = [...sectorMap.entries()].map(([sector, list]) => {
      const vals = list.map(x => x.changePercent).filter(Number.isFinite);
      const positive = vals.filter(v => v > 0).length;
      const avg = vals.reduce((a,b)=>a+b,0) / vals.length;
      const sorted = [...vals].sort((a,b)=>a-b);
      const median = sorted.length ? sorted[Math.floor(sorted.length/2)] : 0;
      const breadth = vals.length ? positive / vals.length * 100 : 0;
      const score = avg * 0.55 + median * 0.25 + (breadth - 50) * 0.04;
      const leaders = [...list].sort((a,b) => {
        const aScore = (a.changePercent || 0) + Math.log10(Math.max(a.volume || 1, 1))*0.12;
        const bScore = (b.changePercent || 0) + Math.log10(Math.max(b.volume || 1, 1))*0.12;
        return bScore - aScore;
      }).slice(0, 8);
      return { sector, score, avgChange: avg, medianChange: median, breadth, count: vals.length, leaders };
    }).filter(x => x.count >= 3).sort((a,b)=>b.score-a.score);

    const topMovers = [...filtered].sort((a,b)=>b.changePercent-a.changePercent).slice(0, 100);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
      fetchedAt: Date.now(),
      source: 'Nasdaq stock screener API',
      universeCount: filtered.length,
      sectors: sectors.slice(0, 20),
      topMovers
    });
  } catch (e) {
    res.status(500).json({ error: e.message || 'market_scan_failed' });
  }
};