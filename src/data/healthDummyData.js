// Health.csv の構造に合わせたダミーデータ
// APIから取得するデータをシミュレート

export const healthDummyData = [
{ date: '2025-12-1', 体重: 65.5, 歩数: 10234, 睡眠時間: 7.8, 最高血圧: 130, 最低血圧: 85, 消費カロリー: 2100 },
  { date: '2025-10-15', 体重: 65.9, 歩数: 9800, 睡眠時間: 7.9, 最高血圧: 134, 最低血圧: 86, 消費カロリー: 2052 },
  { date: '2025-10-14', 体重: 65.8, 歩数: 7500, 睡眠時間: 7.7, 最高血圧: 135, 最低血圧: 87, 消費カロリー: 1930 },
  { date: '2025-10-13', 体重: 66.0, 歩数: 10800, 睡眠時間: 8.0, 最高血圧: 131, 最低血圧: 84, 消費カロリー: 2122 },
  { date: '2025-10-12', 体重: 65.9, 歩数: 6800, 睡眠時間: 7.3, 最高血圧: 138, 最低血圧: 90, 消費カロリー: 1892 },
  { date: '2025-10-11', 体重: 66.1, 歩数: 9500, 睡眠時間: 7.9, 最高血圧: 133, 最低血圧: 86, 消費カロリー: 2030 },
  { date: '2025-10-10', 体重: 66.0, 歩数: 7200, 睡眠時間: 7.6, 最高血圧: 136, 最低血圧: 88, 消費カロリー: 1918 },
  { date: '2025-10-09', 体重: 66.2, 歩数: 11300, 睡眠時間: 8.1, 最高血圧: 130, 最低血圧: 83, 消費カロリー: 2162 },
  { date: '2025-10-08', 体重: 66.1, 歩数: 5500, 睡眠時間: 6.9, 最高血圧: 141, 最低血圧: 93, 消費カロリー: 1800 },
  { date: '2025-10-07', 体重: 66.3, 歩数: 8900, 睡眠時間: 7.8, 最高血圧: 135, 最低血圧: 87, 消費カロリー: 2006 },
  { date: '2025-10-06', 体重: 66.2, 歩数: 7100, 睡眠時間: 7.5, 最高血圧: 137, 最低血圧: 89, 消費カロリー: 1914 },
  { date: '2025-10-05', 体重: 66.4, 歩数: 12000, 睡眠時間: 8.2, 最高血圧: 128, 最低血圧: 82, 消費カロリー: 2210 },
  { date: '2025-10-04', 体重: 66.3, 歩数: 6500, 睡眠時間: 7.1, 最高血圧: 139, 最低血圧: 91, 消費カロリー: 1870 },
  { date: '2025-10-03', 体重: 66.5, 歩数: 10500, 睡眠時間: 8.0, 最高血圧: 132, 最低血圧: 85, 消費カロリー: 2090 },
  { date: '2025-10-02', 体重: 66.4, 歩数: 7800, 睡眠時間: 7.2, 最高血圧: 136, 最低血圧: 88, 消費カロリー: 1932 },
  { date: '2025-10-01', 体重: 66.6, 歩数: 9200, 睡眠時間: 7.7, 最高血圧: 134, 最低血圧: 86, 消費カロリー: 2018 },
  { date: '2025-09-30', 体重: 66.5, 歩数: 8123, 睡眠時間: 7.8, 最高血圧: 135, 最低血圧: 87, 消費カロリー: 1955 },
  { date: '2025-09-29', 体重: 66.7, 歩数: 6876, 睡眠時間: 7.5, 最高血圧: 137, 最低血圧: 89, 消費カロリー: 1895 },
  { date: '2025-09-28', 体重: 66.6, 歩数: 10321, 睡眠時間: 8.1, 最高血圧: 130, 最低血圧: 83, 消費カロリー: 2083 },
  { date: '2025-09-27', 体重: 66.8, 歩数: 5987, 睡眠時間: 7.4, 最高血圧: 139, 最低血圧: 91, 消費カロリー: 1839 },
  { date: '2025-09-26', 体重: 66.7, 歩数: 9432, 睡眠時間: 7.9, 最高血圧: 133, 最低血圧: 85, 消費カロリー: 2027 },
];

// 最新データを取得（サマリー表示用）
export const getLatestData = () => {
  return healthDummyData[0];
};

// 週間平均を計算
export const getWeeklyAverage = () => {
  const weekData = healthDummyData.slice(0, 7);
  return {
    体重: (weekData.reduce((sum, d) => sum + d.体重, 0) / 7).toFixed(1),
    歩数: Math.round(weekData.reduce((sum, d) => sum + d.歩数, 0) / 7),
    睡眠時間: (weekData.reduce((sum, d) => sum + d.睡眠時間, 0) / 7).toFixed(1),
    最高血圧: Math.round(weekData.reduce((sum, d) => sum + d.最高血圧, 0) / 7),
    最低血圧: Math.round(weekData.reduce((sum, d) => sum + d.最低血圧, 0) / 7),
    消費カロリー: Math.round(weekData.reduce((sum, d) => sum + d.消費カロリー, 0) / 7),
  };
};

// 血圧の状態を判定
export const getBloodPressureStatus = (systolic, diastolic) => {
  if (systolic < 120 && diastolic < 80) return { status: 'optimal', label: '至適血圧' };
  if (systolic < 130 && diastolic < 85) return { status: 'normal', label: '正常' };
  if (systolic < 140 && diastolic < 90) return { status: 'high-normal', label: '正常高値' };
  return { status: 'warning', label: '要注意' };
};

// 歩数の状態を判定
export const getStepsStatus = (steps) => {
  if (steps >= 10000) return { status: 'excellent', label: '達成' };
  if (steps >= 8000) return { status: 'good', label: '良好' };
  if (steps >= 5000) return { status: 'normal', label: '普通' };
  return { status: 'low', label: '不足' };
};

// 睡眠時間の状態を判定
export const getSleepStatus = (hours) => {
  if (hours >= 7 && hours <= 9) return { status: 'optimal', label: '最適' };
  if (hours >= 6 && hours < 7) return { status: 'normal', label: '普通' };
  return { status: 'warning', label: '要改善' };
};
