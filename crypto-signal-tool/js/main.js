/**
 * 仮想通貨バイシグナルツール - メインアプリケーション
 */
import { CandlestickChart } from './chart/chart.js';
import { fetchCandlestickMultiYear, fetchCandlestick } from './api/bitbank.js';
import { fetchFearGreedIndex, fetchFearGreedHistory, getFearGreedCssClass, getFearGreedText } from './api/feargreed.js';
import { FearGreedStrategy } from './strategies/feargreed.js';

class CryptoSignalApp {
    constructor() {
        // 状態管理
        this.state = {
            pair: 'btc_jpy',
            timeframe: '1day',
            autoUpdate: true,
            fearGreedIndex: null,
            fearGreedHistory: [],
            candles: [],
            signals: [],
            lastUpdateTime: null,
        };

        // コンポーネント
        this.chart = null;
        this.strategies = [];
        this.updateInterval = null;

        // 更新間隔（ミリ秒）
        this.UPDATE_INTERVAL_MS = 10 * 60 * 1000; // 10分

        // 初期化
        this._init();
    }

    /**
     * アプリケーション初期化
     */
    async _init() {
        try {
            this._showLoading(true);

            // DOM要素の取得
            this._cacheDOM();

            // イベントリスナーの設定
            this._setupEventListeners();

            // 戦略の初期化
            this._initStrategies();

            // チャートの初期化
            this.chart = new CandlestickChart('chart-container');

            // 初回データ取得
            await this._fetchAllData();

            // 自動更新の開始
            this._startAutoUpdate();

        } catch (error) {
            console.error('Initialization error:', error);
            this._showError('初期化に失敗しました: ' + error.message);
        } finally {
            this._showLoading(false);
        }
    }

    /**
     * DOM要素をキャッシュ
     */
    _cacheDOM() {
        this.elements = {
            pairSelect: document.getElementById('pair-select'),
            timeframeSelect: document.getElementById('timeframe-select'),
            fearGreedBadge: document.getElementById('fear-greed-badge'),
            fearGreedValue: document.getElementById('fear-greed-value'),
            fearGreedText: document.getElementById('fear-greed-text'),
            lastUpdateTime: document.getElementById('last-update-time'),
            refreshBtn: document.getElementById('refresh-btn'),
            autoUpdateCheckbox: document.getElementById('auto-update-checkbox'),
            logicFearGreed: document.getElementById('logic-feargreed'),
            buyThreshold: document.getElementById('buy-threshold'),
            sellThreshold: document.getElementById('sell-threshold'),
            signalHistory: document.getElementById('signal-history'),
        };
    }

    /**
     * イベントリスナーを設定
     */
    _setupEventListeners() {
        // 通貨ペア変更
        this.elements.pairSelect.addEventListener('change', async (e) => {
            this.state.pair = e.target.value;
            await this._fetchAllData();
        });

        // 時間足変更
        this.elements.timeframeSelect.addEventListener('change', async (e) => {
            this.state.timeframe = e.target.value;
            await this._fetchAllData();
        });

        // 手動更新
        this.elements.refreshBtn.addEventListener('click', async () => {
            await this._fetchAllData();
        });

        // 自動更新切り替え
        this.elements.autoUpdateCheckbox.addEventListener('change', (e) => {
            this.state.autoUpdate = e.target.checked;
            if (this.state.autoUpdate) {
                this._startAutoUpdate();
            } else {
                this._stopAutoUpdate();
            }
        });

        // Fear & Greed ロジック切り替え
        this.elements.logicFearGreed.addEventListener('change', (e) => {
            const strategy = this.strategies.find(s => s.id === 'feargreed');
            if (strategy) {
                strategy.setEnabled(e.target.checked);
                this._recalculateSignals();
            }
        });

        // 閾値変更
        this.elements.buyThreshold.addEventListener('change', (e) => {
            const strategy = this.strategies.find(s => s.id === 'feargreed');
            if (strategy) {
                strategy.updateSettings({ buyThreshold: parseInt(e.target.value) });
                this._recalculateSignals();
            }
        });

        this.elements.sellThreshold.addEventListener('change', (e) => {
            const strategy = this.strategies.find(s => s.id === 'feargreed');
            if (strategy) {
                strategy.updateSettings({ sellThreshold: parseInt(e.target.value) });
                this._recalculateSignals();
            }
        });
    }

    /**
     * 戦略を初期化
     */
    _initStrategies() {
        // Fear & Greed戦略を追加
        this.strategies.push(new FearGreedStrategy());

        // 将来的にここに他の戦略を追加
        // this.strategies.push(new RsiStrategy());
        // this.strategies.push(new MacdStrategy());
    }

    /**
     * 全データを取得
     */
    async _fetchAllData() {
        try {
            this._showLoading(true);
            this.elements.refreshBtn.disabled = true;

            // Fear & Greed データと価格データを並行取得
            const [fearGreedData, fearGreedHistory, candles] = await Promise.all([
                fetchFearGreedIndex(),
                fetchFearGreedHistory(365),  // 1年分の履歴
                this._fetchCandles(),
            ]);

            // 状態を更新
            this.state.fearGreedIndex = fearGreedData.value;
            this.state.fearGreedHistory = fearGreedHistory;
            this.state.candles = candles;
            this.state.lastUpdateTime = new Date();

            // UIを更新
            this._updateFearGreedBadge(fearGreedData.value);
            this._updateLastUpdateTime();

            // チャートを更新
            this.chart.setData(candles);

            // シグナルを計算・表示
            this._recalculateSignals();

        } catch (error) {
            console.error('Data fetch error:', error);
            this._showError('データ取得に失敗しました: ' + error.message);
        } finally {
            this._showLoading(false);
            this.elements.refreshBtn.disabled = false;
        }
    }

    /**
     * ローソク足データを取得
     */
    async _fetchCandles() {
        const { pair, timeframe } = this.state;

        // 日足・週足・月足の場合は複数年分取得
        if (['1day', '1week', '1month'].includes(timeframe)) {
            return await fetchCandlestickMultiYear(pair, timeframe, 2);
        }

        // それ以外は今年のデータのみ
        return await fetchCandlestick(pair, timeframe);
    }

    /**
     * シグナルを再計算
     */
    _recalculateSignals() {
        const { candles, fearGreedIndex, fearGreedHistory } = this.state;

        if (!candles || candles.length === 0) {
            return;
        }

        // 全戦略のシグナルを収集
        const allSignals = [];

        for (const strategy of this.strategies) {
            if (strategy.isEnabled()) {
                const signals = strategy.calculate(candles, {
                    fearGreedIndex,
                    fearGreedHistory,
                });
                allSignals.push(...signals);
            }
        }

        // 重複を除去（同じ時刻・同じタイプのシグナル）
        const uniqueSignals = this._deduplicateSignals(allSignals);

        // 状態を更新
        this.state.signals = uniqueSignals;

        // チャートにマーカーを設定
        this.chart.setMarkers(uniqueSignals);

        // シグナル履歴UIを更新
        this._updateSignalHistory(uniqueSignals);
    }

    /**
     * シグナルの重複を除去
     */
    _deduplicateSignals(signals) {
        const seen = new Map();

        for (const signal of signals) {
            const key = `${signal.time}-${signal.type}`;
            if (!seen.has(key)) {
                seen.set(key, signal);
            }
        }

        return Array.from(seen.values())
            .sort((a, b) => b.time.localeCompare(a.time));  // 新しい順
    }

    /**
     * Fear & Greed バッジを更新
     */
    _updateFearGreedBadge(value) {
        this.elements.fearGreedValue.textContent = value;
        this.elements.fearGreedText.textContent = `(${getFearGreedText(value)})`;

        // CSSクラスを更新
        const cssClass = getFearGreedCssClass(value);
        this.elements.fearGreedBadge.className = 'fear-greed-badge ' + cssClass;
    }

    /**
     * 最終更新時刻を更新
     */
    _updateLastUpdateTime() {
        const now = this.state.lastUpdateTime || new Date();
        const timeStr = now.toLocaleTimeString('ja-JP');
        this.elements.lastUpdateTime.textContent = timeStr;
    }

    /**
     * シグナル履歴UIを更新
     */
    _updateSignalHistory(signals) {
        const container = this.elements.signalHistory;

        if (!signals || signals.length === 0) {
            container.innerHTML = '<p class="no-signals">シグナルなし</p>';
            return;
        }

        // 最新10件を表示
        const recentSignals = signals.slice(0, 10);

        const html = recentSignals.map(signal => `
            <div class="signal-item ${signal.type}">
                <span class="signal-type ${signal.type}">${signal.type.toUpperCase()}</span>
                <span class="signal-date">${signal.time}</span>
                <span class="signal-reason">${signal.reason}</span>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    /**
     * 自動更新を開始
     */
    _startAutoUpdate() {
        if (this.updateInterval) {
            return;
        }

        this.updateInterval = setInterval(async () => {
            if (this.state.autoUpdate) {
                console.log('Auto-updating data...');
                await this._fetchAllData();
            }
        }, this.UPDATE_INTERVAL_MS);

        console.log(`Auto-update started (interval: ${this.UPDATE_INTERVAL_MS / 1000}s)`);
    }

    /**
     * 自動更新を停止
     */
    _stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            console.log('Auto-update stopped');
        }
    }

    /**
     * ローディング表示
     */
    _showLoading(show) {
        let overlay = document.querySelector('.loading-overlay');

        if (show) {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'loading-overlay';
                overlay.innerHTML = '<div class="loading-spinner"></div>';
                document.body.appendChild(overlay);
            }
            overlay.style.display = 'flex';
        } else if (overlay) {
            overlay.style.display = 'none';
        }
    }

    /**
     * エラー表示
     */
    _showError(message) {
        // 既存のエラーメッセージを削除
        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;

        const chartArea = document.querySelector('.chart-area');
        chartArea.insertBefore(errorDiv, chartArea.firstChild);

        // 5秒後に自動で消す
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
}

// アプリケーション起動
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CryptoSignalApp();
});
