import React, { useState, useEffect } from 'react';
import { memoryDummyData, cleanTitle, extractTags } from '../data/memoryDummyData';
import '../styles/MemoryPage.css';

const IP = import.meta.env.VITE_SERVER_IP;
const MEMORY_API_URL = `http://${IP}/api/memory`;

function MemoryPage() {
  const [memories, setMemories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState(new Set());

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

  // 相対的な日付表示（簡潔版）
  const getRelativeDate = (dateStr) => {
    const normalized = normalizeDate(dateStr);
    const today = getTodayString();
    const date = new Date(normalized);
    const todayDate = new Date(today);
    const diffTime = todayDate - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '今日';
    if (diffDays === 1) return '昨日';
    if (diffDays === 2) return '一昨日';
    if (diffDays < 7) return `${diffDays}日前`;
    if (diffDays < 14) return '1週間前';
    if (diffDays < 21) return '2週間前';
    if (diffDays < 28) return '3週間前';
    // 1ヶ月以上は表示しない（日付のみ）
    return null;
  };

  // 日付をフォーマット（短縮版）
  const formatDateShort = (dateStr) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];
    return `${month}月${day}日（${weekday}）`;
  };

  // 年月でグループ化用
  const getYearMonth = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}年${date.getMonth() + 1}月`;
  };

  // APIからデータ取得
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      try {
        const response = await fetch(MEMORY_API_URL, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const apiData = await response.json();

        if (apiData && Array.isArray(apiData) && apiData.length > 0) {
          const sortedData = apiData.sort((a, b) =>
            new Date(b.日付) - new Date(a.日付)
          );

          const formattedData = sortedData.map((item, index) => ({
            id: index + 1,
            date: item.日付,
            title: cleanTitle(item.タイトル),
            content: item.内容,
            tags: extractTags(item.内容),
          }));

          setMemories(formattedData);
          setDataSource('api');
        } else {
          throw new Error('Invalid API response');
        }

      } catch (error) {
        console.warn('API fetch failed, using dummy data:', error.message);

        const formattedDummy = memoryDummyData.map((item, index) => ({
          id: index + 1,
          date: item.日付,
          title: cleanTitle(item.タイトル),
          content: item.内容,
          tags: extractTags(item.内容),
        }));

        setMemories(formattedDummy);
        setDataSource('dummy');
      }

      setIsLoading(false);
    };

    fetchData();
  }, []);

  // 展開/折りたたみトグル
  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // 全て展開/折りたたみ
  const expandAll = () => {
    setExpandedIds(new Set(filteredMemories.map(m => m.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // 検索フィルタリング
  const filteredMemories = memories.filter(memory => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      memory.title.toLowerCase().includes(query) ||
      memory.content.toLowerCase().includes(query) ||
      memory.tags.some(tag => tag.toLowerCase().includes(query))
    );
  });

  // 日付でグループ化
  const groupedMemories = filteredMemories.reduce((groups, memory) => {
    const date = normalizeDate(memory.date);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(memory);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedMemories).sort((a, b) => 
    new Date(b) - new Date(a)
  );

  if (isLoading) {
    return (
      <div id="memory-page" className="page">
        <div className="memory-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>データを読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="memory-page" className="page">
      <div className="memory-container">
        {/* ヘッダー */}
        <div className="page-header">
          <div className="header-content">
            <h1>💭 思い出記録</h1>
            <p className="page-description">大切な思い出を振り返りましょう</p>
          </div>
          {dataSource === 'dummy' && (
            <span className="data-source-badge">デモデータ</span>
          )}
        </div>

        {/* 検索バー */}
        <div className="search-section">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="思い出を検索...（タイトル、内容、タグ）"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-btn" onClick={() => setSearchQuery('')}>✕</button>
            )}
          </div>
        </div>

        {/* 統計＆操作 */}
        <div className="memory-toolbar">
          <div className="memory-stats">
            <span className="stat-item">📝 {filteredMemories.length} 件</span>
            <span className="stat-item">📅 {sortedDates.length} 日分</span>
          </div>
          <div className="toolbar-actions">
            <button className="text-btn" onClick={expandAll}>すべて展開</button>
            <button className="text-btn" onClick={collapseAll}>すべて閉じる</button>
          </div>
        </div>

        {/* タイムライン */}
        <div className="timeline-container">
          {sortedDates.length > 0 ? (
            sortedDates.map((date, index) => {
              const relativeDate = getRelativeDate(date);
              const yearMonth = getYearMonth(date);
              const prevYearMonth = index > 0 ? getYearMonth(sortedDates[index - 1]) : null;
              const showYearMonthHeader = yearMonth !== prevYearMonth;

              return (
                <React.Fragment key={date}>
                  {/* 年月ヘッダー */}
                  {showYearMonthHeader && (
                    <div className="year-month-header">
                      <span className="year-month-text">{yearMonth}</span>
                    </div>
                  )}
                  
                  <div className="timeline-group">
                    <div className="timeline-date-header">
                      <div className="date-marker"></div>
                      <span className="date-main">{formatDateShort(date)}</span>
                      {relativeDate && (
                        <span className="date-relative-badge">{relativeDate}</span>
                      )}
                      <span className="date-count">{groupedMemories[date].length}件</span>
                    </div>
                    <div className="memory-list">
                      {groupedMemories[date].map((memory) => (
                        <div key={memory.id} className="memory-item">
                          <div 
                            className="memory-title-row"
                            onClick={() => toggleExpand(memory.id)}
                          >
                            <span className={`expand-arrow ${expandedIds.has(memory.id) ? 'expanded' : ''}`}>
                              ▶
                            </span>
                            <span className="memory-title">{memory.title}</span>
                            <div className="memory-tags-inline">
                              {memory.tags.slice(0, 2).map((tag, idx) => (
                                <span key={idx} className="tag-small">#{tag}</span>
                              ))}
                            </div>
                          </div>
                          {expandedIds.has(memory.id) && (
                            <div className="memory-detail">
                              <p className="memory-content">{memory.content}</p>
                              <div className="memory-tags">
                                {memory.tags.map((tag, idx) => (
                                  <span 
                                    key={idx} 
                                    className="tag"
                                    onClick={() => setSearchQuery(tag)}
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          ) : (
            <div className="empty-state">
              <span className="empty-icon">🔍</span>
              <p>「{searchQuery}」に一致する思い出が見つかりませんでした</p>
              <button className="secondary-btn" onClick={() => setSearchQuery('')}>
                検索をクリア
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MemoryPage;