import React, { useState } from 'react';
import ChatPage from './components/ChatPage';
import HealthPage from './components/HealthPage';
import MemoryPage from './components/MemoryPage';
import './styles/App.css'; // App用のCSSをインポート

function App() {
  const [currentPage, setCurrentPage] = useState('chat'); // 'chat', 'health', 'memory'

  // ナビゲーションボタンの定義
  const navItems = [
    { id: 'chat', label: '会話する' },
    { id: 'health', label: '健康データ' },
    { id: 'memory', label: '思い出記録' },
  ];

  // 表示するページコンポーネントを選択
  const renderPage = () => {
    switch (currentPage) {
      case 'chat':
        return <ChatPage />;
      case 'health':
        return <HealthPage />;
      case 'memory':
        return <MemoryPage />;
      default:
        return <ChatPage />;
    }
  };

  return (
    <>
      <nav>
        {navItems.map((item) => (
          <button
            key={item.id}
            id={`nav-${item.id}`}
            className={currentPage === item.id ? 'active' : ''}
            onClick={() => setCurrentPage(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <main id="content-area">
        {renderPage()}
      </main>
    </>
  );
}

export default App;