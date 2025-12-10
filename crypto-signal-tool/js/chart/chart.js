/**
 * Lightweight Charts ラッパーモジュール
 */
import { toChartMarker } from '../strategies/base.js';

export class CandlestickChart {
    /**
     * @param {string|HTMLElement} container - コンテナ要素またはID
     */
    constructor(container) {
        this.containerElement = typeof container === 'string'
            ? document.getElementById(container)
            : container;

        this.chart = null;
        this.candlestickSeries = null;
        this.volumeSeries = null;
        this.markers = [];

        this._initChart();
    }

    /**
     * チャートを初期化
     */
    _initChart() {
        // グローバルのLightweightChartsを使用
        const LightweightCharts = window.LightweightCharts;

        if (!LightweightCharts) {
            throw new Error('Lightweight Charts library not loaded');
        }

        // チャートオプション
        const chartOptions = {
            width: this.containerElement.clientWidth,
            height: this.containerElement.clientHeight,
            layout: {
                background: { type: 'solid', color: '#1a1a2e' },
                textColor: '#a0a0a0',
            },
            grid: {
                vertLines: { color: '#2a2a4a' },
                horzLines: { color: '#2a2a4a' },
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
                vertLine: {
                    color: '#4dabf7',
                    width: 1,
                    style: LightweightCharts.LineStyle.Dashed,
                },
                horzLine: {
                    color: '#4dabf7',
                    width: 1,
                    style: LightweightCharts.LineStyle.Dashed,
                },
            },
            rightPriceScale: {
                borderColor: '#2a2a4a',
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.2,
                },
            },
            timeScale: {
                borderColor: '#2a2a4a',
                timeVisible: true,
                secondsVisible: false,
            },
            localization: {
                locale: 'ja-JP',
                priceFormatter: (price) => {
                    if (price >= 1000000) {
                        return (price / 1000000).toFixed(2) + 'M';
                    } else if (price >= 1000) {
                        return price.toLocaleString('ja-JP');
                    }
                    return price.toFixed(2);
                },
            },
        };

        this.chart = LightweightCharts.createChart(this.containerElement, chartOptions);

        // ローソク足シリーズを追加
        this.candlestickSeries = this.chart.addCandlestickSeries({
            upColor: '#00d26a',
            downColor: '#ff6b6b',
            borderUpColor: '#00d26a',
            borderDownColor: '#ff6b6b',
            wickUpColor: '#00d26a',
            wickDownColor: '#ff6b6b',
        });

        // 出来高シリーズを追加（下部に表示）
        this.volumeSeries = this.chart.addHistogramSeries({
            color: '#4dabf7',
            priceFormat: {
                type: 'volume',
            },
            priceScaleId: '',
            scaleMargins: {
                top: 0.8,
                bottom: 0,
            },
        });

        // リサイズハンドラ
        this._setupResizeHandler();
    }

    /**
     * リサイズハンドラを設定
     */
    _setupResizeHandler() {
        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                this.chart.applyOptions({ width, height });
            }
        });

        resizeObserver.observe(this.containerElement);
    }

    /**
     * ローソク足データを設定
     * @param {Array} candles - ローソク足データ配列
     */
    setData(candles) {
        if (!candles || candles.length === 0) {
            console.warn('No candle data to display');
            return;
        }

        // ローソク足データを設定
        this.candlestickSeries.setData(candles);

        // 出来高データを設定
        const volumeData = candles.map(candle => ({
            time: candle.time,
            value: candle.volume,
            color: candle.close >= candle.open ? '#00d26a44' : '#ff6b6b44',
        }));
        this.volumeSeries.setData(volumeData);

        // 表示範囲を調整
        this.chart.timeScale().fitContent();
    }

    /**
     * シグナルマーカーを設定
     * @param {Array} signals - シグナル配列
     */
    setMarkers(signals) {
        if (!signals || signals.length === 0) {
            this.candlestickSeries.setMarkers([]);
            this.markers = [];
            return;
        }

        // シグナルをLightweight Charts形式に変換
        const chartMarkers = signals.map(signal => toChartMarker(signal));

        // 時系列順にソート
        chartMarkers.sort((a, b) => a.time.localeCompare(b.time));

        this.candlestickSeries.setMarkers(chartMarkers);
        this.markers = chartMarkers;
    }

    /**
     * チャートに新しいデータを追加（リアルタイム更新用）
     * @param {Object} candle - 最新のローソク足
     */
    updateLastCandle(candle) {
        this.candlestickSeries.update(candle);

        // 出来高も更新
        this.volumeSeries.update({
            time: candle.time,
            value: candle.volume,
            color: candle.close >= candle.open ? '#00d26a44' : '#ff6b6b44',
        });
    }

    /**
     * チャートを破棄
     */
    destroy() {
        if (this.chart) {
            this.chart.remove();
            this.chart = null;
            this.candlestickSeries = null;
            this.volumeSeries = null;
        }
    }

    /**
     * 表示範囲を最新に移動
     */
    scrollToLatest() {
        this.chart.timeScale().scrollToRealTime();
    }

    /**
     * 表示範囲を全体にフィット
     */
    fitContent() {
        this.chart.timeScale().fitContent();
    }
}
