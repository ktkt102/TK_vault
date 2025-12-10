/**
 * bitbank Public API クライアント
 * https://github.com/bitbankinc/bitbank-api-docs
 */

const BITBANK_API_BASE = 'https://public.bitbank.cc';

/**
 * 利用可能な通貨ペア
 */
export const AVAILABLE_PAIRS = [
    { value: 'btc_jpy', label: 'BTC/JPY' },
    { value: 'eth_jpy', label: 'ETH/JPY' },
    { value: 'xrp_jpy', label: 'XRP/JPY' },
    { value: 'ltc_jpy', label: 'LTC/JPY' },
    { value: 'mona_jpy', label: 'MONA/JPY' },
    { value: 'bcc_jpy', label: 'BCH/JPY' },
    { value: 'xlm_jpy', label: 'XLM/JPY' },
    { value: 'bat_jpy', label: 'BAT/JPY' },
    { value: 'omg_jpy', label: 'OMG/JPY' },
    { value: 'xym_jpy', label: 'XYM/JPY' },
    { value: 'link_jpy', label: 'LINK/JPY' },
    { value: 'mkr_jpy', label: 'MKR/JPY' },
    { value: 'matic_jpy', label: 'MATIC/JPY' },
    { value: 'dot_jpy', label: 'DOT/JPY' },
    { value: 'doge_jpy', label: 'DOGE/JPY' },
    { value: 'astr_jpy', label: 'ASTR/JPY' },
    { value: 'ada_jpy', label: 'ADA/JPY' },
    { value: 'avax_jpy', label: 'AVAX/JPY' },
    { value: 'axs_jpy', label: 'AXS/JPY' },
    { value: 'flr_jpy', label: 'FLR/JPY' },
    { value: 'sand_jpy', label: 'SAND/JPY' },
];

/**
 * 利用可能な時間足
 */
export const AVAILABLE_TIMEFRAMES = [
    { value: '1min', label: '1分足' },
    { value: '5min', label: '5分足' },
    { value: '15min', label: '15分足' },
    { value: '30min', label: '30分足' },
    { value: '1hour', label: '1時間足' },
    { value: '4hour', label: '4時間足' },
    { value: '8hour', label: '8時間足' },
    { value: '12hour', label: '12時間足' },
    { value: '1day', label: '日足' },
    { value: '1week', label: '週足' },
    { value: '1month', label: '月足' },
];

/**
 * ローソク足データを取得する
 * @param {string} pair - 通貨ペア (例: 'btc_jpy')
 * @param {string} candleType - 足種 (例: '1hour', '1day')
 * @param {string} [yyyymmdd] - 日付指定（オプション）
 * @returns {Promise<Array>} ローソク足データ配列
 */
export async function fetchCandlestick(pair, candleType, yyyymmdd = null) {
    try {
        // 日付パラメータの組み立て
        let dateParam = '';
        if (yyyymmdd) {
            dateParam = yyyymmdd;
        } else {
            // 今年のデータを取得
            const now = new Date();
            dateParam = now.getFullYear().toString();
        }

        const url = `${BITBANK_API_BASE}/${pair}/candlestick/${candleType}/${dateParam}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success !== 1) {
            throw new Error(data.data?.code || 'Unknown API error');
        }

        // OHLCVデータをLightweight Charts形式に変換
        const candlesticks = data.data.candlestick;
        if (!candlesticks || candlesticks.length === 0) {
            return [];
        }

        const ohlcv = candlesticks[0].ohlcv;
        return ohlcv.map(candle => {
            const [open, high, low, close, volume, timestamp] = candle;
            // タイムスタンプをUNIX秒に変換（Lightweight Chartsはミリ秒ではなく秒を期待）
            const timeInSeconds = Math.floor(timestamp / 1000);
            // 日付文字列に変換（日足の場合はYYYY-MM-DD形式）
            const date = new Date(timestamp);
            const dateStr = date.toISOString().split('T')[0];

            return {
                time: dateStr,
                open: parseFloat(open),
                high: parseFloat(high),
                low: parseFloat(low),
                close: parseFloat(close),
                volume: parseFloat(volume)
            };
        }).sort((a, b) => a.time.localeCompare(b.time));
    } catch (error) {
        console.error('Error fetching candlestick data:', error);
        throw error;
    }
}

/**
 * 複数年分のローソク足データを取得する（日足用）
 * @param {string} pair - 通貨ペア
 * @param {string} candleType - 足種
 * @param {number} yearsBack - 何年分取得するか
 * @returns {Promise<Array>} ローソク足データ配列
 */
export async function fetchCandlestickMultiYear(pair, candleType, yearsBack = 2) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const allCandles = [];

    for (let i = 0; i <= yearsBack; i++) {
        const year = currentYear - i;
        try {
            const candles = await fetchCandlestick(pair, candleType, year.toString());
            allCandles.push(...candles);
        } catch (error) {
            console.warn(`Failed to fetch data for year ${year}:`, error);
        }
    }

    // 重複を除去して時系列順にソート
    const uniqueCandles = Array.from(
        new Map(allCandles.map(c => [c.time, c])).values()
    ).sort((a, b) => a.time.localeCompare(b.time));

    return uniqueCandles;
}

/**
 * 現在のティッカー情報を取得する
 * @param {string} pair - 通貨ペア
 * @returns {Promise<Object>} ティッカー情報
 */
export async function fetchTicker(pair) {
    try {
        const url = `${BITBANK_API_BASE}/${pair}/ticker`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success !== 1) {
            throw new Error(data.data?.code || 'Unknown API error');
        }

        return {
            sell: parseFloat(data.data.sell),
            buy: parseFloat(data.data.buy),
            high: parseFloat(data.data.high),
            low: parseFloat(data.data.low),
            open: parseFloat(data.data.open),
            last: parseFloat(data.data.last),
            volume: parseFloat(data.data.vol),
            timestamp: data.data.timestamp
        };
    } catch (error) {
        console.error('Error fetching ticker:', error);
        throw error;
    }
}
