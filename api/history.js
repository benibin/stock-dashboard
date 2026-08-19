module.exports = async function handler(req, res) {
  try {
    const symbol = String(req.query.symbol || 'NVDA').trim().toUpperCase();
    const range = String(req.query.range || '6mo');
    const interval = String(req.query.interval || '1d');
    if (!/^[A-Z0-9.^=-]{1,20}$/.test(symbol)) return res.status(400).json({ error: 'invalid_symbol' });
    const allowedRanges = new Set(['1mo','3mo','6mo','1y','2y','5y']);
    const allowedIntervals = new Set(['1d','1wk']);
    const safeRange = allowedRanges.has(range) ? range : '6mo';
    const safeInterval = allowedIntervals.has(interval) ? interval : '1d';
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${safeRange}&interval=${safeInterval}&includePrePost=false&events=div%2Csplits`;
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) return res.status(r.status).json({ error: 'upstream_error', status: r.status });
    const j = await r.json();
    const result = j?.chart?.result?.[0];
    if (!result) return res.status(404).json({ error: j?.chart?.error?.description || 'symbol_not_found' });
    const ts = result.timestamp || [];
    const q = result.indicators?.quote?.[0] || {};
    const candles = ts.map((time, i) => ({
      time,
      open: q.open?.[i], high: q.high?.[i], low: q.low?.[i], close: q.close?.[i], volume: q.volume?.[i]
    })).filter(x => [x.open,x.high,x.low,x.close].every(Number.isFinite));
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ symbol, range: safeRange, interval: safeInterval, candles, meta: result.meta || {}, source: 'Yahoo Finance chart endpoint (unofficial)', fetchedAt: Date.now() });
  } catch (e) {
    res.status(500).json({ error: e.message || 'history_failed' });
  }
};
