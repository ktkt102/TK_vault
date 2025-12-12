/**
 * シグナル戦略の基底クラス
 * 全てのシグナルロジックはこのクラスを継承する
 */
export class SignalStrategy {
    /**
     * @param {string} id - 戦略の一意識別子
     * @param {string} name - 表示名
     */
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.enabled = true;
    }

    /**
     * シグナルを計算する
     * @param {Array} candles - ローソク足データ配列
     * @param {Object} extraData - 追加データ（恐怖指数など）
     * @returns {Array} シグナル配列
     */
    calculate(candles, extraData = {}) {
        throw new Error('calculate() must be implemented by subclass');
    }

    /**
     * 戦略の有効/無効を切り替える
     * @param {boolean} enabled
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * 戦略が有効かどうか
     * @returns {boolean}
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * 設定を取得する（サブクラスでオーバーライド）
     * @returns {Object}
     */
    getSettings() {
        return {};
    }

    /**
     * 設定を更新する（サブクラスでオーバーライド）
     * @param {Object} settings
     */
    updateSettings(settings) {
        // サブクラスで実装
    }
}

/**
 * シグナルマーカーの型定義
 * @typedef {Object} SignalMarker
 * @property {string} time - シグナル発生時刻 (YYYY-MM-DD形式)
 * @property {string} type - シグナルタイプ ('buy' | 'sell')
 * @property {string} text - 表示テキスト
 * @property {string} reason - シグナルの理由
 * @property {string} strategyId - 発生元の戦略ID
 */

/**
 * シグナルマーカーを作成するヘルパー関数
 * @param {string} time
 * @param {string} type
 * @param {string} text
 * @param {string} reason
 * @param {string} strategyId
 * @returns {SignalMarker}
 */
export function createSignalMarker(time, type, text, reason, strategyId) {
    return {
        time,
        type,
        text,
        reason,
        strategyId
    };
}

/**
 * シグナルマーカーをLightweight Charts用の形式に変換
 * @param {SignalMarker} signal
 * @returns {Object}
 */
export function toChartMarker(signal) {
    if (signal.type === 'buy') {
        return {
            time: signal.time,
            position: 'belowBar',
            color: '#00d26a',
            shape: 'arrowUp',
            text: signal.text || 'Buy'
        };
    } else {
        return {
            time: signal.time,
            position: 'aboveBar',
            color: '#ff6b6b',
            shape: 'arrowDown',
            text: signal.text || 'Sell'
        };
    }
}
