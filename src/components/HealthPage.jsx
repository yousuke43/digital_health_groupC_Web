import React, { useState, useEffect } from 'react';
import { 
  healthDummyData, 
  getLatestData, 
  getWeeklyAverage,
  getBloodPressureStatus,
  getStepsStatus,
  getSleepStatus
} from '../data/healthDummyData';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import '../styles/HealthPage.css';

const IP = import.meta.env.VITE_SERVER_IP || 'localhost:8000';
const HEALTH_API_URL = `http://${IP}/get_health_data`;  // ← 修正

function HealthPage() {
  const [healthData, setHealthData] = useState([]);
  const [latestData, setLatestData] = useState(null);
  const [weeklyAvg, setWeeklyAvg] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState('');
  const [chartOffset, setChartOffset] = useState(0);
  const [tableDisplayCount, setTableDisplayCount] = useState(14); // ← 追加: テーブル表示件数
  const [dateFilter, setDateFilter] = useState('');
  const [dateFilterEnd, setDateFilterEnd] = useState(''); // ← 追加: 終了日

  // 今日の日付を取得（YYYY-MM-DD形式）
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 日付を比較用に正規化
  const normalizeDate = (dateStr) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 今日のデータかどうかを判定
  const isToday = (dateStr) => {
    if (!dateStr) return false;
    return normalizeDate(dateStr) === getTodayString();
  };

  // 今日のデータがあるかチェック
  const hasTodayData = latestData && isToday(latestData.date);

  // 相対的な日付を取得
  const getRelativeDate = (dateStr) => {
    const normalized = normalizeDate(dateStr);
    const today = getTodayString();
    const date = new Date(normalized);
    const todayDate = new Date(today);
    const diffTime = todayDate - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '今日';
    if (diffDays === 1) return '昨日';
    if (diffDays < 7) return `${diffDays}日前`;
    return normalized;
  };

  // APIからデータ取得、失敗時はダミーデータにフォールバック
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      console.log('Fetching health data from:', HEALTH_API_URL);
      
      try {
        const response = await fetch(HEALTH_API_URL, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const apiData = await response.json();
        console.log('API data received:', apiData);
        
        // APIデータが有効かチェック
        if (apiData && Array.isArray(apiData) && apiData.length > 0) {
          // 日付順（新しい順）にソート
          const sortedData = apiData.sort((a, b) => 
            new Date(b.date) - new Date(a.date)
          );
          
          setHealthData(sortedData);
          setLatestData(sortedData[0]);
          setWeeklyAvg(calculateWeeklyAverage(sortedData));
          setDataSource('api');
          console.log('Health data loaded from API successfully');
        } else {
          throw new Error('Invalid API response: empty or not an array');
        }
        
      } catch (error) {
        console.warn('API fetch failed:', error.message);
        console.log('Using dummy data instead');
        
        // ダミーデータにフォールバック
        setHealthData(healthDummyData);
        setLatestData(healthDummyData[0]);
        setWeeklyAvg(calculateWeeklyAverage(healthDummyData));
        setDataSource('dummy');
      }
      
      setIsLoading(false);
    };

    fetchData();
  }, []);

  // 週間平均を計算（API用）
  const calculateWeeklyAverage = (data) => {
    const weekData = data.slice(0, 7);
    if (weekData.length === 0) return null;
    
    const count = weekData.length;
    return {
      体重: (weekData.reduce((sum, d) => sum + (d.体重 || 0), 0) / count).toFixed(1),
      歩数: Math.round(weekData.reduce((sum, d) => sum + (d.歩数 || 0), 0) / count),
      睡眠時間: (weekData.reduce((sum, d) => sum + (d.睡眠時間 || 0), 0) / count).toFixed(1),
      最高血圧: Math.round(weekData.reduce((sum, d) => sum + (d.最高血圧 || 0), 0) / count),
      最低血圧: Math.round(weekData.reduce((sum, d) => sum + (d.最低血圧 || 0), 0) / count),
      消費カロリー: Math.round(weekData.reduce((sum, d) => sum + (d.消費カロリー || 0), 0) / count),
    };
  };

  // グラフ用にデータを14日間分取得（オフセット対応）
  const chartDays = 14;
  const startIndex = chartOffset * chartDays;
  const endIndex = startIndex + chartDays;
  const chartData = [...healthData].slice(startIndex, endIndex).reverse();
  
  // 前後に移動できるかどうかの判定
  const canGoNewer = chartOffset > 0;
  const canGoOlder = endIndex < healthData.length;

  // 日付範囲の表示用
  const getDateRange = () => {
    if (chartData.length === 0) return '';
    const oldestDate = chartData[0]?.date || '';
    const newestDate = chartData[chartData.length - 1]?.date || '';
    return `${oldestDate} 〜 ${newestDate}`;
  };

  // テーブル用のフィルタリングされたデータ
  const filteredTableData = healthData.filter(item => {
    if (!dateFilter && !dateFilterEnd) return true;
    
    const itemDate = new Date(item.date);
    
    if (dateFilter && dateFilterEnd) {
      // 範囲検索
      const startDate = new Date(dateFilter);
      const endDate = new Date(dateFilterEnd);
      return itemDate >= startDate && itemDate <= endDate;
    } else if (dateFilter) {
      // 開始日のみ
      const startDate = new Date(dateFilter);
      return itemDate >= startDate;
    } else if (dateFilterEnd) {
      // 終了日のみ
      const endDate = new Date(dateFilterEnd);
      return itemDate <= endDate;
    }
    return true;
  });

  // 表示するテーブルデータ（件数制限）
  const displayedTableData = dateFilter || dateFilterEnd
    ? filteredTableData // 検索時は全件表示
    : filteredTableData.slice(0, tableDisplayCount);

  // もっと表示できるかどうか
  const canShowMore = !dateFilter && !dateFilterEnd && tableDisplayCount < healthData.length;
  const remainingCount = healthData.length - tableDisplayCount;

  if (isLoading) {
    return (
      <div id="health-page" className="page">
        <div className="health-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>データを読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  const bpStatus = latestData ? getBloodPressureStatus(latestData.最高血圧, latestData.最低血圧) : null;
  const stepsStatus = latestData ? getStepsStatus(latestData.歩数) : null;
  const sleepStatus = latestData ? getSleepStatus(latestData.睡眠時間) : null;

  // カスタムツールチップ
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-date">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString()}{entry.unit || ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // フィルターをクリア
  const clearDateFilter = () => {
    setDateFilter('');
    setDateFilterEnd('');
  };

  const hasDateFilter = dateFilter || dateFilterEnd;

  return (
    <div id="health-page" className="page">
      <div className="health-container">
        {/* ヘッダー */}
        <div className="page-header">
          <div className="header-content">
            <h1>健康データ</h1>
            <p className="page-description">日々の健康状態を記録・管理します</p>
          </div>
          <div className="header-actions">
            {dataSource === 'dummy' && (
              <span className="data-source-badge">デモデータ</span>
            )}
          </div>
        </div>

        {/* サマリーカード */}
        <div className="summary-section">
          <h2 className="section-title">📊 本日のサマリー</h2>
          
          {hasTodayData ? (
            <>
              <div className="summary-cards">
                {/* 体重カード */}
                <div className="summary-card">
                  <div className="card-header">
                    <span className="card-icon">⚖️</span>
                    <span className="card-title">体重</span>
                  </div>
                  <div className="card-body">
                    <span className="card-value">{latestData?.体重}</span>
                    <span className="card-unit">kg</span>
                  </div>
                  <div className="card-footer">
                    <span className="card-sub">週平均: {weeklyAvg?.体重} kg</span>
                  </div>
                </div>

                {/* 歩数カード */}
                <div className="summary-card">
                  <div className="card-header">
                    <span className="card-icon">🚶</span>
                    <span className="card-title">歩数</span>
                    <span className={`status-badge ${stepsStatus?.status}`}>{stepsStatus?.label}</span>
                  </div>
                  <div className="card-body">
                    <span className="card-value">{latestData?.歩数?.toLocaleString()}</span>
                    <span className="card-unit">歩</span>
                  </div>
                  <div className="card-footer">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${Math.min((latestData?.歩数 / 10000) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <span className="card-sub">目標: 10,000歩</span>
                  </div>
                </div>

                {/* 睡眠時間カード */}
                <div className="summary-card">
                  <div className="card-header">
                    <span className="card-icon">😴</span>
                    <span className="card-title">睡眠時間</span>
                    <span className={`status-badge ${sleepStatus?.status}`}>{sleepStatus?.label}</span>
                  </div>
                  <div className="card-body">
                    <span className="card-value">{latestData?.睡眠時間}</span>
                    <span className="card-unit">時間</span>
                  </div>
                  <div className="card-footer">
                    <span className="card-sub">週平均: {weeklyAvg?.睡眠時間} 時間</span>
                  </div>
                </div>

                {/* 血圧カード */}
                <div className="summary-card">
                  <div className="card-header">
                    <span className="card-icon">❤️</span>
                    <span className="card-title">血圧</span>
                    <span className={`status-badge ${bpStatus?.status}`}>{bpStatus?.label}</span>
                  </div>
                  <div className="card-body">
                    <span className="card-value">{latestData?.最高血圧}/{latestData?.最低血圧}</span>
                    <span className="card-unit">mmHg</span>
                  </div>
                  <div className="card-footer">
                    <span className="card-sub">週平均: {weeklyAvg?.最高血圧}/{weeklyAvg?.最低血圧}</span>
                  </div>
                </div>

                {/* 消費カロリーカード */}
                <div className="summary-card">
                  <div className="card-header">
                    <span className="card-icon">🔥</span>
                    <span className="card-title">消費カロリー</span>
                  </div>
                  <div className="card-body">
                    <span className="card-value">{latestData?.消費カロリー?.toLocaleString()}</span>
                    <span className="card-unit">kcal</span>
                  </div>
                  <div className="card-footer">
                    <span className="card-sub">週平均: {weeklyAvg?.消費カロリー?.toLocaleString()} kcal</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="no-today-data">
              <div className="no-data-icon">📭</div>
              <p className="no-data-message">今日のデータはまだありません</p>
              <p className="no-data-sub">データが記録されると、ここにサマリーが表示されます</p>
            </div>
          )}
        </div>

        {/* グラフセクション */}
        <div className="charts-section">
          <div className="charts-header">
            <h2 className="section-title">📈 トレンドグラフ</h2>
            <div className="chart-navigation">
              <button 
                className="chart-nav-btn" 
                onClick={() => setChartOffset(prev => prev + 1)}
                disabled={!canGoOlder}
              >
                ← 過去
              </button>
              <span className="chart-date-range">{getDateRange()}</span>
              <button 
                className="chart-nav-btn" 
                onClick={() => setChartOffset(prev => prev - 1)}
                disabled={!canGoNewer}
              >
                最新 →
              </button>
            </div>
          </div>
          <div className="charts-grid">
            {/* 体重推移グラフ（折れ線） */}
            <div className="chart-card">
              <div className="chart-header">
                <span className="chart-title">⚖️ 体重推移</span>
                <span className="chart-period">14日間</span>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eaeef2" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11 }} 
                      tickFormatter={(value) => value.slice(5)}
                    />
                    <YAxis 
                      domain={['dataMin - 1', 'dataMax + 1']} 
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="体重" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      dot={{ fill: '#8b5cf6', r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 歩数グラフ（棒グラフ） */}
            <div className="chart-card">
              <div className="chart-header">
                <span className="chart-title">🚶 歩数</span>
                <span className="chart-period">14日間</span>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eaeef2" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11 }} 
                      tickFormatter={(value) => value.slice(5)}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="歩数" 
                      fill="#2da44e" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 睡眠時間グラフ（エリアチャート） */}
            <div className="chart-card">
              <div className="chart-header">
                <span className="chart-title">😴 睡眠時間</span>
                <span className="chart-period">14日間</span>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eaeef2" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11 }} 
                      tickFormatter={(value) => value.slice(5)}
                    />
                    <YAxis domain={[5, 10]} tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="睡眠時間" 
                      stroke="#0969da" 
                      fill="#ddf4ff"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 消費カロリーグラフ（棒グラフ） */}
            <div className="chart-card">
              <div className="chart-header">
                <span className="chart-title">🔥 消費カロリー</span>
                <span className="chart-period">14日間</span>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eaeef2" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11 }} 
                      tickFormatter={(value) => value.slice(5)}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="消費カロリー" 
                      fill="#f97316" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 血圧推移グラフ（折れ線・2軸） */}
            <div className="chart-card full-width">
              <div className="chart-header">
                <span className="chart-title">❤️ 血圧推移</span>
                <span className="chart-period">14日間</span>
              </div>
              <div className="chart-container large">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eaeef2" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11 }} 
                      tickFormatter={(value) => value.slice(5)}
                    />
                    <YAxis domain={[70, 150]} tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="最高血圧" 
                      stroke="#cf222e" 
                      strokeWidth={2}
                      dot={{ fill: '#cf222e', r: 3 }}
                      name="最高血圧 (収縮期)"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="最低血圧" 
                      stroke="#0969da" 
                      strokeWidth={2}
                      dot={{ fill: '#0969da', r: 3 }}
                      name="最低血圧 (拡張期)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* データテーブル */}
        <div className="data-section">
          <div className="section-header">
            <h2 className="section-title">📅 記録履歴</h2>
          </div>
          
          {/* 日付フィルター */}
          <div className="date-filter-bar">
            <div className="date-filter-group">
              <label className="date-filter-label">期間で絞り込み:</label>
              <div className="date-inputs">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="date-input"
                />
                <span className="date-separator">〜</span>
                <input
                  type="date"
                  value={dateFilterEnd}
                  onChange={(e) => setDateFilterEnd(e.target.value)}
                  className="date-input"
                />
              </div>
              {hasDateFilter && (
                <button className="clear-filter-btn" onClick={clearDateFilter}>
                  クリア
                </button>
              )}
            </div>
            <span className="table-count">
              {hasDateFilter 
                ? `${filteredTableData.length}件見つかりました`
                : `${displayedTableData.length} / ${healthData.length}件表示`
              }
            </span>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>日付</th>
                  <th>体重 (kg)</th>
                  <th>歩数</th>
                  <th>睡眠 (h)</th>
                  <th>血圧 (mmHg)</th>
                  <th>カロリー (kcal)</th>
                </tr>
              </thead>
              <tbody>
                {displayedTableData.length > 0 ? (
                  displayedTableData.map((item, index) => {
                    const rowBpStatus = getBloodPressureStatus(item.最高血圧, item.最低血圧);
                    const rowStepsStatus = getStepsStatus(item.歩数);
                    const rowSleepStatus = getSleepStatus(item.睡眠時間);
                    return (
                      <tr key={index} className={rowBpStatus.status === 'warning' ? 'warning-row' : ''}>
                        <td className="date-cell">{item.date}</td>
                        <td>{item.体重}</td>
                        <td>
                          <span className={`inline-status ${rowStepsStatus.status}`}>
                            {item.歩数.toLocaleString()}
                            {rowStepsStatus.status === 'low' && <span className="status-icon">⚠️</span>}
                          </span>
                        </td>
                        <td>
                          <span className={`inline-status ${rowSleepStatus.status}`}>
                            {item.睡眠時間}
                            {rowSleepStatus.status === 'warning' && <span className="status-icon">⚠️</span>}
                          </span>
                        </td>
                        <td>
                          <span className={`bp-value ${rowBpStatus.status}`}>
                            {item.最高血圧}/{item.最低血圧}
                            {rowBpStatus.status === 'warning' && <span className="status-icon">🔴</span>}
                            {rowBpStatus.status === 'high-normal' && <span className="status-icon">🟡</span>}
                          </span>
                        </td>
                        <td>{item.消費カロリー.toLocaleString()}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="no-data-cell">
                      {dateFilter ? `「${dateFilter}」に一致するデータがありません` : 'データがありません'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* もっと見るボタン */}
          {canShowMore && (
            <div className="show-more-container">
              <button 
                className="show-more-btn"
                onClick={() => setTableDisplayCount(prev => prev + 14)}
              >
                もっと見る（残り {remainingCount}件）
              </button>
            </div>
          )}
          
          {/* 凡例 */}
          <div className="table-legend">
            <span className="legend-item"><span className="legend-icon">🔴</span> 血圧要注意</span>
            <span className="legend-item"><span className="legend-icon">🟡</span> 血圧正常高値</span>
            <span className="legend-item"><span className="legend-icon">⚠️</span> 改善推奨</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HealthPage;