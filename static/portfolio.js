// portfolio.js — Portfolio panel logic

const PORTFOLIO_MOCK_DATA = [
  { symbol: 'AAPL',  name: 'Apple Inc.',            qty: 50,   cost: 165.20, price: 189.45, currency: 'USD' },
  { symbol: 'MSFT',  name: 'Microsoft Corp.',        qty: 30,   cost: 280.50, price: 415.20, currency: 'USD' },
  { symbol: 'NVDA',  name: 'NVIDIA Corp.',            qty: 20,   cost: 450.00, price: 875.30, currency: 'USD' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.',           qty: 15,   cost: 130.00, price: 178.90, currency: 'USD' },
  { symbol: 'AMZN',  name: 'Amazon.com Inc.',         qty: 25,   cost: 175.00, price: 196.60, currency: 'USD' },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway B',    qty: 40,   cost: 340.00, price: 415.70, currency: 'USD' },
  { symbol: 'TSM',   name: 'Taiwan Semiconductor',    qty: 60,   cost: 100.00, price: 165.80, currency: 'USD' },
  { symbol: '0700.HK', name: 'Tencent Holdings',      qty: 200,  cost: 290.00, price: 380.20, currency: 'HKD' },
];

function _calcPortfolioRows(holdings) {
  let totalUsdValue = 0;
  const rows = holdings.map(h => {
    const fx          = h.usd_fx > 0 ? h.usd_fx : 1;
    const marketValue = h.qty * h.price;
    const usdValue    = marketValue / fx;
    const costBasis   = h.qty * h.cost;
    const pnl         = marketValue - costBasis;
    const pnlPct      = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
    totalUsdValue += usdValue;
    return { ...h, marketValue, usdValue, costBasis, pnl, pnlPct };
  });
  return { rows, totalUsdValue };
}

function _fmt(n, decimals = 2) {
  return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function _pnlClass(v) {
  return v > 0 ? 'pf-pos' : v < 0 ? 'pf-neg' : '';
}

function renderPortfolioTable(holdings) {
  const container = document.getElementById('portfolioContainer');
  if (!container) return;

  const { rows, totalUsdValue } = _calcPortfolioRows(holdings);

  let tbodyHtml = '';
  for (const r of rows) {
    const weight = totalUsdValue > 0 ? (r.usdValue / totalUsdValue) * 100 : 0;
    tbodyHtml += `
      <tr>
        <td class="pf-symbol">${r.symbol}</td>
        <td class="pf-name">${r.name}</td>
        <td class="pf-num">${r.qty}</td>
        <td class="pf-num">${_fmt(r.cost)}</td>
        <td class="pf-num">${_fmt(r.price)}</td>
        <td class="pf-num">${_fmt(r.marketValue)}</td>
        <td class="pf-num pf-usd">$${_fmt(r.usdValue)}</td>
        <td class="pf-num ${_pnlClass(r.pnl)}">${r.pnl >= 0 ? '+' : ''}${_fmt(r.pnl)}</td>
        <td class="pf-num ${_pnlClass(r.pnlPct)}">${r.pnlPct >= 0 ? '+' : ''}${_fmt(r.pnlPct)}%</td>
        <td class="pf-num">${_fmt(weight, 1)}%</td>
        <td class="pf-currency">${r.currency}</td>
      </tr>`;
  }

  container.innerHTML = `
    <div class="pf-summary">
      <span class="pf-summary-label">Total Market Value (USD)</span>
      <span class="pf-summary-value">$${_fmt(totalUsdValue)}</span>
    </div>
    <div class="pf-table-wrap">
      <table class="pf-table">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Name</th>
            <th class="pf-num">Qty</th>
            <th class="pf-num">Cost</th>
            <th class="pf-num">Price</th>
            <th class="pf-num">Mkt Value</th>
            <th class="pf-num">USD Value</th>
            <th class="pf-num">P&amp;L</th>
            <th class="pf-num">P&amp;L %</th>
            <th class="pf-num">Weight</th>
            <th>CCY</th>
          </tr>
        </thead>
        <tbody>${tbodyHtml}</tbody>
      </table>
    </div>`;
}

function _fmtUpdated(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch (_) { return iso; }
}

function _setUpdatedLabel(iso) {
  const text = iso ? `Updated: ${_fmtUpdated(iso)}` : '';
  ['portfolioUpdatedMain'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  });
}

async function loadPortfolio() {
  const container = document.getElementById('portfolioContainer');
  if (!container) return;
  container.innerHTML = '<div class="pf-loading">Loading...</div>';
  try {
    const resp = await api('/api/portfolio');
    _setUpdatedLabel(resp && resp.last_updated);
    const holdings = (resp && resp.holdings) ? resp.holdings : [];
    if (holdings.length === 0) {
      container.innerHTML = '<div class="pf-loading">No holdings found. Add data to <code>portfolio.json</code> in your Hermes WebUI state directory.</div>';
      return;
    }
    renderPortfolioTable(holdings);
  } catch (err) {
    container.innerHTML = `<div class="pf-loading" style="color:var(--error,#e04)">Failed to load portfolio: ${err.message}</div>`;
  }
}
