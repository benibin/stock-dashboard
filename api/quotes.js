module.exports = async function handler(req, res) {
  try {
    const raw = String(req.query.symbols || 'SPY,QQQ,BTC-USD,ETH-USD');
    const symbols = [...new Set(raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean))].slice(0, 50);
    const quotes = [];
    await Promise.all(symbols.map(async (symbol) => {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=5m&includePrePost=true`;
        const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!r.ok) return;
        const j = await r.json();
        const result = j?.chart?.result?.[0];
        if (!result) return;
        const meta = result.meta || {};
        const ts = result.timestamp || [];
        const close = result.indicators?.quote?.[0]?.close || [];
        let lastIndex = -1;
        for (let i = close.length - 1; i >= 0; i--) {
          if (Number.isFinite(close[i])) { lastIndex = i; break; }
        }
        const lastBarPrice = lastIndex >= 0 ? Number(close[lastIndex]) : NaN;
        const lastBarTime = lastIndex >= 0 ? Number(ts[lastIndex]) : NaN;
        const regularPrice = Number(meta.regularMarketPrice);
        const previousClose = Number(meta.chartPreviousClose ?? meta.previousClose);
        const periods = meta.currentTradingPeriod || {};
        const inWindow = (p, t) => p && Number.isFinite(t) && Number.isFinite(p.start) && Number.isFinite(p.end) && t >= p.start && t <= p.end;
        let phase = 'regular';
        if (inWindow(periods.pre, lastBarTime)) phase = 'pre';
        else if (inWindow(periods.post, lastBarTime)) phase = 'post';
        else if (inWindow(periods.regular, lastBarTime)) phase = 'regular';
        else if (Number.isFinite(lastBarTime) && Number.isFinite(meta.regularMarketTime) && lastBarTime > meta.regularMarketTime) phase = 'extended';
        const livePrice = Number.isFinite(lastBarPrice) ? lastBarPrice : regularPrice;
        const changePercent = Number.isFinite(previousClose) && previousClose !== 0 && Number.isFinite(livePrice) ? (livePrice - previousClose) / previousClose * 100 : null;
        const regularChangePercent = Number.isFinite(previousClose) && previousClose !== 0 && Number.isFinite(regularPrice) ? (regularPrice - previousClose) / previousClose * 100 : null;
        if (!Number.isFinite(livePrice)) return;
        quotes.push({
          symbol,
          price: livePrice,
          livePrice,
          regularPrice: Number.isFinite(regularPrice) ? regularPrice : null,
          previousClose: Number.isFinite(previousClose) ? previousClose : null,
          changePercent,
          regularChangePercent,
          phase,
          currency: meta.currency || 'USD',
          timestamp: Number.isFinite(lastBarTime) ? lastBarTime * 1000 : Date.now(),
          regularMarketTime: Number.isFinite(meta.regularMarketTime) ? meta.regularMarketTime * 1000 : null
        });
      } catch (_) {}
    }));
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ quotes, fetchedAt: Date.now(), source: 'Yahoo Finance chart endpoint (unofficial, 5m extended-hours)' });
  } catch (e) {
    res.status(500).json({ error: e.message || 'quotes_failed' });
  }
};
