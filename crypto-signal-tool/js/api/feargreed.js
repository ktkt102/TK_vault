/**
 * Alternative.me Fear & Greed Index API クライアント
 * https://alternative.me/crypto/fear-and-greed-index/
 */

const FEAR_GREED_API_BASE = 'https://api.alternative.me/fng/';

/**
 * Fear & Greed Indexを取得する
 * @param {number} [limit=1] - 取得する履歴の数（デフォルト: 最新1件）
 * @returns {Promise<Object>} Fear & Greed データ
 */
export async function fetchFearGreedIndex(limit = 1) {
    try {
        const url = `${FEAR_GREED_API_BASE}?limit=${limit}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.metadata && data.metadata.error) {
            throw new Error(data.metadata.error);
        }

        // 最新のデータを返す
        const latestData = data.data[0];

        return {
            value: parseInt(latestData.value),
            classification: latestData.value_classification,
            timestamp: parseInt(latestData.timestamp),
            timeUntilUpdate: latestData.time_until_update || null,
            history: data.data
        };
    } catch (error) {
        console.error('Error fetching Fear & Greed Index:', error);
        throw error;
    }
}

/**
 * Fear & Greed Indexの履歴を取得する
 * @param {number} days - 取得する日数
 * @returns {Promise<Array>} Fear & Greed 履歴データ配列
 */
export async function fetchFearGreedHistory(days = 30) {
    try {
        const url = `${FEAR_GREED_API_BASE}?limit=${days}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.metadata && data.metadata.error) {
            throw new Error(data.metadata.error);
        }

        return data.data.map(item => ({
            value: parseInt(item.value),
            classification: item.value_classification,
            timestamp: item.timestamp,
            date: new Date(parseInt(item.timestamp) * 1000).toISOString().split('T')[0]
        }));
    } catch (error) {
        console.error('Error fetching Fear & Greed history:', error);
        throw error;
    }
}

/**
 * Fear & Greed 値に基づくCSS クラス名を取得
 * @param {number} value - Fear & Greed Index値 (0-100)
 * @returns {string} CSS クラス名
 */
export function getFearGreedCssClass(value) {
    if (value <= 20) return 'extreme-fear';
    if (value <= 40) return 'fear';
    if (value <= 60) return 'neutral';
    if (value <= 80) return 'greed';
    return 'extreme-greed';
}

/**
 * Fear & Greed 値に基づく分類テキストを取得
 * @param {number} value - Fear & Greed Index値 (0-100)
 * @returns {string} 分類テキスト
 */
export function getFearGreedText(value) {
    if (value <= 20) return 'Extreme Fear';
    if (value <= 40) return 'Fear';
    if (value <= 60) return 'Neutral';
    if (value <= 80) return 'Greed';
    return 'Extreme Greed';
}
