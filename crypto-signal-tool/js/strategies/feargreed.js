/**
 * Fear & Greed Index に基づくシグナル戦略
 */
import { SignalStrategy, createSignalMarker } from './base.js';

export class FearGreedStrategy extends SignalStrategy {
    constructor() {
        super('feargreed', 'Fear & Greed Index');

        // 閾値の設定（調整可能）
        this.buyThreshold = 20;   // この値以下でBUYシグナル
        this.sellThreshold = 80;  // この値以上でSELLシグナル
    }

    /**
     * シグナルを計算する
     * @param {Array} candles - ローソク足データ配列
     * @param {Object} extraData - { fearGreedIndex: number, fearGreedHistory: Array }
     * @returns {Array} シグナル配列
     */
    calculate(candles, extraData = {}) {
        if (!this.enabled) {
            return [];
        }

        const signals = [];
        const { fearGreedIndex, fearGreedHistory = [] } = extraData;

        // 履歴データがある場合は過去のシグナルも生成
        if (fearGreedHistory.length > 0 && candles.length > 0) {
            // Fear & Greed履歴とローソク足を日付でマッチング
            const candleMap = new Map();
            candles.forEach(candle => {
                candleMap.set(candle.time, candle);
            });

            fearGreedHistory.forEach(fgData => {
                const timestamp = parseInt(fgData.timestamp);
                const date = new Date(timestamp * 1000);
                const dateStr = date.toISOString().split('T')[0];
                const value = parseInt(fgData.value);

                // 対応するローソク足が存在するか確認
                if (candleMap.has(dateStr)) {
                    const signal = this._evaluateIndex(value, dateStr);
                    if (signal) {
                        signals.push(signal);
                    }
                }
            });
        } else if (fearGreedIndex !== undefined && candles.length > 0) {
            // 現在の恐怖指数のみで最新足にシグナルを付与
            const latestCandle = candles[candles.length - 1];
            const signal = this._evaluateIndex(fearGreedIndex, latestCandle.time);
            if (signal) {
                signals.push(signal);
            }
        }

        return signals;
    }

    /**
     * 恐怖指数を評価してシグナルを生成
     * @param {number} index - 恐怖指数（0-100）
     * @param {string} time - 時刻
     * @returns {Object|null} シグナルまたはnull
     */
    _evaluateIndex(index, time) {
        if (index <= this.buyThreshold) {
            return createSignalMarker(
                time,
                'buy',
                `FG:${index}`,
                this._getClassification(index),
                this.id
            );
        } else if (index >= this.sellThreshold) {
            return createSignalMarker(
                time,
                'sell',
                `FG:${index}`,
                this._getClassification(index),
                this.id
            );
        }
        return null;
    }

    /**
     * 恐怖指数の分類を取得
     * @param {number} index
     * @returns {string}
     */
    _getClassification(index) {
        if (index <= 20) return 'Extreme Fear';
        if (index <= 40) return 'Fear';
        if (index <= 60) return 'Neutral';
        if (index <= 80) return 'Greed';
        return 'Extreme Greed';
    }

    /**
     * 設定を取得
     * @returns {Object}
     */
    getSettings() {
        return {
            buyThreshold: this.buyThreshold,
            sellThreshold: this.sellThreshold
        };
    }

    /**
     * 設定を更新
     * @param {Object} settings
     */
    updateSettings(settings) {
        if (settings.buyThreshold !== undefined) {
            this.buyThreshold = Math.max(0, Math.min(100, settings.buyThreshold));
        }
        if (settings.sellThreshold !== undefined) {
            this.sellThreshold = Math.max(0, Math.min(100, settings.sellThreshold));
        }
    }
}

/**
 * 恐怖指数の分類情報を取得するヘルパー
 * @param {number} index
 * @returns {Object} { classification: string, cssClass: string }
 */
export function getFearGreedClassification(index) {
    if (index <= 20) {
        return { classification: 'Extreme Fear', cssClass: 'extreme-fear' };
    }
    if (index <= 40) {
        return { classification: 'Fear', cssClass: 'fear' };
    }
    if (index <= 60) {
        return { classification: 'Neutral', cssClass: 'neutral' };
    }
    if (index <= 80) {
        return { classification: 'Greed', cssClass: 'greed' };
    }
    return { classification: 'Extreme Greed', cssClass: 'extreme-greed' };
}
