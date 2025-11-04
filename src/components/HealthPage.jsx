import React, { useState, useEffect, useMemo } from 'react'; // ★ useMemo をインポート
// ★ 1. Chart.js と Reactラッパーをインポート
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import '../styles/HealthPage.css'; // ★ CSSをインポート

// ★ 2. Chart.jsに必要なコンポーネントを登録
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// ★ APIのURL
const IP = import.meta.env.VITE_SERVER_IP;
const HEALTH_API_URL = `http://${IP}/get_health_data`;

// ★ グラフの共通オプション (アニメーションを滑らかに)
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
    },
  },
  animation: {
    duration: 500, // データの切り替えを滑らかに
  },
};

// ★ 1ページに表示する日数
const ITEMS_PER_PAGE = 7;

function HealthPage() {
  // ★ 状態管理を変更
  const [allHealthData, setAllHealthData] = useState([]); // 全データ
  const [currentEndIndex, setCurrentEndIndex] = useState(0); // 表示期間の終了インデックス
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // データをAPIから取得
  useEffect(() => {
    const fetchHealthData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(HEALTH_API_URL);
        if (!response.ok) {
          throw new Error(`HTTPエラー: ${response.status}`);
        }
        const data = await response.json(); 
        
        // 日付の昇順（古い順）に並び替える
        const sortedData = data.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // ★ 全データを保存
        setAllHealthData(sortedData);
        // ★ 最初は最新のデータ (配列の末尾) を表示するように設定
        setCurrentEndIndex(sortedData.length);
        
      } catch (err) {
        console.error("健康データの取得に失敗しました:", err);
        setError("健康データの読み込みに失敗しました。サーバー側でCORSとAPIエンドポイントを確認してください。");
      } finally {
        setLoading(false);
      }
    };

    fetchHealthData();
  }, []);

  // ★ --- グラフ用データの切り出し (useMemoで計算) --- ★
  const { chartData, currentStartDate, currentEndDate, isFirstPage, isLastPage } = useMemo(() => {
    // 表示期間の開始インデックスを計算 (0より小さくならないように)
    const startIndex = Math.max(0, currentEndIndex - ITEMS_PER_PAGE);
    // 実際に表示するデータを全データからスライス
    const displayedData = allHealthData.slice(startIndex, currentEndIndex);

    const labels = displayedData.map(d => d.date);

    return {
      // Chart.js が必要とする形式にデータを加工
      chartData: {
        labels: labels,
        weight: displayedData.map(d => d.体重),
        steps: displayedData.map(d => d.歩数),
        sleep: displayedData.map(d => d.睡眠時間),
        systolicBP: displayedData.map(d => d.最高血圧),
        diastolicBP: displayedData.map(d => d.最低血圧),
        calories: displayedData.map(d => d.消費カロリー),
      },
      // 表示期間の文字列
      currentStartDate: labels[0] || '',
      currentEndDate: labels[labels.length - 1] || '',
      // ボタンの無効化判定
      isFirstPage: startIndex === 0,
      isLastPage: currentEndIndex === allHealthData.length,
    };
  }, [allHealthData, currentEndIndex]); // allHealthDataかcurrentEndIndexが変わった時だけ再計算

  
  // ★ --- ボタン操作 --- ★
  
  // 「過去へ」ボタン
  const handlePrevious = () => {
    setCurrentEndIndex(prev => Math.max(ITEMS_PER_PAGE, prev - ITEMS_PER_PAGE));
  };

  // 「次へ (最新へ)」ボタン
  const handleNext = () => {
    setCurrentEndIndex(prev => Math.min(allHealthData.length, prev + ITEMS_PER_PAGE));
  };


  // --- レンダリング ---
  if (loading) { /* ... (ローディング表示は変更なし) ... */ }
  if (error) { /* ... (エラー表示は変更なし) ... */ }

  return (
    <div className="page health-page-container">
      
      {/* ★ ヘッダーとナビゲーションボタン ★ */}
      <div className="health-header">
        <h1>健康データ</h1>
        <div className="date-navigation">
          <button onClick={handlePrevious} disabled={isFirstPage}>
            &lt; 前の{ITEMS_PER_PAGE}日
          </button>
          <span className="date-display">
            {currentStartDate} 〜 {currentEndDate}
          </span>
          <button onClick={handleNext} disabled={isLastPage}>
            次の{ITEMS_PER_PAGE}日 &gt;
          </button>
        </div>
      </div>
      
      {/* グラフをグリッドで表示 */}
      <div className="chart-grid">
        
        {/* 1. 体重グラフ (折れ線) */}
        <div className="chart-widget">
          <h2>体重の推移 (kg)</h2>
          <div className="chart-content">
            <Line
              options={chartOptions}
              data={{
                labels: chartData.labels,
                datasets: [
                  {
                    label: '体重',
                    data: chartData.weight,
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                  },
                ],
              }}
            />
          </div>
        </div>

        {/* 2. 血圧グラフ (折れ線) */}
        <div className="chart-widget">
          <h2>血圧の推移 (mmHg)</h2>
          <div className="chart-content">
            <Line
              options={chartOptions}
              data={{
                labels: chartData.labels,
                datasets: [
                  {
                    label: '最高血圧',
                    data: chartData.systolicBP,
                    borderColor: 'rgb(255, 159, 64)',
                    backgroundColor: 'rgba(255, 159, 64, 0.5)',
                  },
                  {
                    label: '最低血圧',
                    data: chartData.diastolicBP,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                  },
                ],
              }}
            />
          </div>
        </div>
        
        {/* 3. 歩数グラフ (棒) */}
        <div className="chart-widget">
          <h2>歩数</h2>
          <div className="chart-content">
            <Bar
              options={chartOptions}
              data={{
                labels: chartData.labels,
                datasets: [
                  {
                    label: '歩数',
                    data: chartData.steps,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgb(54, 162, 235)',
                    borderWidth: 1,
                  },
                ],
              }}
            />
          </div>
        </div>
        
        {/* 4. 睡眠時間グラフ (棒) */}
        <div className="chart-widget">
          <h2>睡眠時間 (時間)</h2>
          <div className="chart-content">
            <Bar
              options={chartOptions}
              data={{
                labels: chartData.labels,
                datasets: [
                  {
                    label: '睡眠時間',
                    data: chartData.sleep,
                    backgroundColor: 'rgba(153, 102, 255, 0.5)',
                    borderColor: 'rgb(153, 102, 255)',
                    borderWidth: 1,
                  },
                ],
              }}
            />
          </div>
        </div>
        
      </div>
    </div>
  );
}

export default HealthPage;