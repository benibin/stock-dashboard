module.exports = async function handler(req, res) {
  try {
    const raw = String(req.query.symbols || 'SPY,QQQ,BTC-USD,ETH-USD');
    const symbols = [...new Set(raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean))].slice(0, 50);
    const quotes = [];
    await Promise.all(symbols.map(async (symbol) => {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d&includePrePost=true`;
        const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!r.ok) return;
        const j = await r.json();
        const result = j?.chart?.result?.[0];
        if (!result) return;
        const meta = result.meta || {};
        const closes = (result.indicators?.quote?.[0]?.close || []).filter(v => Number.isFinite(v));
        const price = Number(meta.regularMarketPrice ?? closes.at(-1));
        const previousClose = Number(meta.chartPreviousClose ?? meta.previousClose ?? closes.at(-2));
        if (!Number.isFinite(price)) return;
        const changePercent = Number.isFinite(previousClose) && previousClose !== 0 ? (price - previousClose) / previousClose * 100 : null;
        quotes.push({ symbol, price, previousClose, changePercent, currency: meta.currency || 'USD', timestamp: (meta.regularMarketTime || Math.floor(Date.now()/1000))*1000 });
      } catch (_) {}
    }));
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ quotes, fetchedAt: Date.now(), source: 'Yahoo Finance chart endpoint (unofficial)' });
  } catch (e) {
    res.status(500).json({ error: e.message || 'quotes_failed' });
  }
};
