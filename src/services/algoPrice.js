/**
 * Live ALGO/INR price service via CoinGecko public API.
 *
 * Falls back to a hardcoded rate when the API is unreachable (e.g. offline
 * during a hackathon demo) so the settlement flow never hard-crashes.
 */

const FALLBACK_ALGO_PRICE_INR = 80; // used when CoinGecko is unreachable

// Simple in-memory cache — one API call per 5 minutes max
let _cachedPrice = null;
let _cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Fetch the current ALGO price in INR.
 * Returns a number, e.g. 91.5
 */
export async function getAlgoPriceINR() {
  const now = Date.now();
  if (_cachedPrice && now - _cacheTimestamp < CACHE_TTL_MS) {
    return _cachedPrice;
  }

  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=algorand&vs_currencies=inr',
    );

    if (!response.ok) {
      throw new Error(`CoinGecko responded with ${response.status}`);
    }

    const data = await response.json();
    const price = data?.algorand?.inr;

    if (!price || typeof price !== 'number') {
      throw new Error('Unexpected CoinGecko response shape');
    }

    _cachedPrice = price;
    _cacheTimestamp = now;
    console.log('[AlgoPrice] Live ALGO price fetched: ₹' + price);
    return price;
  } catch (err) {
    console.warn('[AlgoPrice] CoinGecko fetch failed — using fallback rate ₹' + FALLBACK_ALGO_PRICE_INR, err);
    return FALLBACK_ALGO_PRICE_INR;
  }
}

/**
 * Convert an INR amount to ALGO using the live price.
 * @param {number} inrAmount
 * @returns {Promise<{ algoAmount: number, priceUsed: number }>}
 */
export async function convertINRToAlgo(inrAmount) {
  const priceUsed = await getAlgoPriceINR();
  const algoAmount = Number(inrAmount) / priceUsed;
  return { algoAmount, priceUsed };
}
