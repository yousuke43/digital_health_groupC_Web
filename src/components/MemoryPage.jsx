import React, { useState, useEffect } from 'react';
import '../styles/MemoryPage.css'; // ★ 思い出ページ専用のCSSを新しく使う

// APIサーバーのURL (環境変数から取得するか、直接指定)
// 前回 localhost:8000 を使っていたので、それに合わせます
const IP = import.meta.env.VITE_SERVER_IP;
const API_BASE_URL = `http://${IP}`; 

function MemoryPage() {
  // 状態管理
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // コンポーネントが読み込まれた時にAPIを叩く
  useEffect(() => {
    const fetchMemories = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`${API_BASE_URL}/get_memories`);
        
        if (!response.ok) {
          throw new Error(`HTTPエラー: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        // ★★★ この行を追加！ ★★★
        console.log("サーバーから届いた生データ:", data);
        
        // 日付の降順（新しい順）に並び替える
        const sortedData = data.sort((a, b) => new Date(b.日付) - new Date(a.日付));
        
        setMemories(sortedData);
        
      } catch (err) {
        console.error("思い出データの取得に失敗しました:", err);
        setError(err.message || 'データの取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchMemories();
  }, []); // 空の依存配列 [] は、コンポーネントのマウント時に1回だけ実行されることを意味します

  // ローディング中の表示
  if (loading) {
    return (
      <div className="page active" style={{ display: 'flex' }}>
        <div className="placeholder-page">
          <h1>思い出記録</h1>
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  // エラー発生時の表示
  if (error) {
    return (
      <div className="page active" style={{ display: 'flex' }}>
        <div className="placeholder-page">
          <h1>思い出記録</h1>
          <p style={{ color: '#D90000' }}>エラー: {error}</p>
          <p>サーバーが起動しているか確認してください。</p>
        </div>
      </div>
    );
  }

  // データが空の場合の表示
  if (memories.length === 0) {
     return (
      <div className="page active" style={{ display: 'flex' }}>
        <div className="placeholder-page">
          <h1>思い出記録</h1>
          <p>まだ記録された思い出はありません。</p>
        </div>
      </div>
    );
  }

  // 思い出リストの表示
  return (
    <div className="page active" id="memory-page-container">
      <div className="header">
         {/* h1 は元のファイルにあったので、もし不要なら削除 */}
         <h1>思い出記録</h1>
      </div>
      <ul className="memory-list">
        {memories.map((memory, index) => (
          <li key={index} className="memory-card">
            <div className="memory-card-header">
              <span className="memory-card-date">{memory.日付}</span>
              <h2 className="memory-card-topic">{memory.トピック}</h2>
            </div>
            <p className="memory-card-content">
              {memory.内容}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default MemoryPage;