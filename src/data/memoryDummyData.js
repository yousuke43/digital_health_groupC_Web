// Memory.csv の構造に合わせたダミーデータ
// APIから取得するデータをシミュレート

export const memoryDummyData = [
  {
    日付: '2025-10-22',
    タイトル: '未来大への印象',
    内容: 'ガラス張りの広々とした空間を持つ未来大の建物は、未来都市のようでユーザーにとって魅力的だと感じられている。'
  },
  {
    日付: '2025-10-18',
    タイトル: '海での告白の思い出',
    内容: 'かつて海で彼女に告白し振られてしまったが、その出来事は本人にとって懐かしい良い思い出として心に残っている。'
  },
  {
    日付: '2025-10-03',
    タイトル: '友人と夢を語ったラーメン屋',
    内容: '高校時代、学校帰りに友人と通ったラーメン屋は、将来の夢を素直に語り合える特別な場所だった。その友人たちとは今でも年に一度集まる大切な関係が続いている。'
  },
  {
    日付: '2025-09-27',
    タイトル: '息子と見た函館の桜',
    内容: '港町、特に函館に愛着があり、息子が幼い頃によく五稜郭公園へ連れて行っては見事な桜を一緒に眺めた。'
  },
  {
    日付: '2025-09-27',
    タイトル: '通信士としての経験',
    内容: '若い頃に船の通信士として働き、モールス信号を必死に覚えた経験が、学ぶことへの姿勢の原点となっている。'
  },
];

// タイトルから「- 」プレフィックスを削除する関数
export const cleanTitle = (title) => {
  if (!title) return '';
  return title.replace(/^-\s*/, '');
};

// 日付でグループ化する関数
export const groupByDate = (memories) => {
  const grouped = {};
  memories.forEach(memory => {
    const date = memory.日付;
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(memory);
  });
  return grouped;
};

// タグを内容から抽出する関数（簡易版）
export const extractTags = (content) => {
  const tags = [];
  const keywords = ['家族', '友人', '仕事', '旅行', '学校', '海', '桜', '思い出', '自然'];
  keywords.forEach(keyword => {
    if (content.includes(keyword)) {
      tags.push(keyword);
    }
  });
  return tags.length > 0 ? tags : ['思い出'];
};
