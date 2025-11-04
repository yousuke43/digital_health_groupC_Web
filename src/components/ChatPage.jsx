import React, { useState, useRef, useEffect } from 'react';
import VrmViewer from './VrmViewer'; 
import '../styles/ChatPage.css'; // ★ CSSの確認が必要 (後述)
const IP = import.meta.env.VITE_SERVER_IP;
const SERVER_URL = `ws://${IP}/ws/transcribe`;

// (Web Speech API の準備 ... 変更なし)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.interimResults = false;
    recognition.continuous = true; 
} else {
    console.warn("Web Speech API はこのブラウザではサポートされていません。");
}


function ChatPage() {
  const [status, setStatus] = useState({ key: 'disconnected', text: '未接続' });
  const [logs, setLogs] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioToPlay, setAudioToPlay] = useState(null);
  const [micError, setMicError] = useState(null);
  
  // ★★★ 1. 「考え中」状態を追加 ★★★
  const [isThinking, setIsThinking] = useState(false);

  const websocket = useRef(null);
  const logContainerRef = useRef(null);
  const vrmViewerRef = useRef(null);
  
  // ログが追加されたら一番下にスクロール
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, isThinking]); // ★ isThinking が変わった時もスクロール

  // ログを配列の「最後」に追加
  const addLog = (text, type) => {
    setLogs(prevLogs => [
      ...prevLogs,
      { id: Date.now(), text, type }
    ]);
  };

  // --- WebSocket接続 ---
  const connect = () => {
    if (vrmViewerRef.current) vrmViewerRef.current.startAudioContext();
    if (websocket.current && websocket.current.readyState !== WebSocket.CLOSED) return;
    setStatus({ key: 'connecting', text: '接続中...' });
    websocket.current = new WebSocket(SERVER_URL);
    websocket.current.binaryType = 'arraybuffer';

    websocket.current.onopen = () => {
      setStatus({ key: 'connected', text: '接続済み' });
      addLog("サーバーに接続しました。", "info");
    };
    websocket.current.onclose = () => {
      setStatus({ key: 'disconnected', text: '未接続' });
      stopMicrophone();
      addLog("サーバーから切断されました。", "info");
      websocket.current = null;
      setIsThinking(false); // ★ 切断時も「考え中」を解除
    };
    websocket.current.onerror = (event) => {
      console.error("WebSocketエラー:", event);
      setStatus({ key: 'disconnected', text: 'エラー' });
      setIsThinking(false); // ★ エラー時も「考え中」を解除
    };

    // ★★★ 2. onmessage ハンドラを修正 ★★★
    websocket.current.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "user_transcription") {
            addLog(data.text, 'user');
          
          } else if (data.type === "ai_processing") {
            // ★ 「考え中」フラグを立てる (ログには追加しない)
            setIsThinking(true); 
            
          } else if (data.type === "ai_response") {
            // ★ AIの返事が来たら「考え中」を解除し、ログに追加
            setIsThinking(false); 
            addLog(data.text, 'ai');
          }
          
        } catch (e) { 
          setIsThinking(false); // エラー時も解除
          addLog(event.data, 'ai'); 
        }
      } else if (event.data instanceof ArrayBuffer) {
        // ★ 音声データが来ても「考え中」を解除
        setIsThinking(false); 
        setAudioToPlay(event.data);
      }
    };
  }; // connect 関数の終わり

  const disconnect = () => {
    if (websocket.current && websocket.current.readyState === WebSocket.OPEN) {
      websocket.current.close();
    }
  };

  // --- マイク処理 (Web Speech API) ---
  useEffect(() => {
    if (!recognition) {
      setMicError('お使いのブラウザは音声認識に対応していません。');
      addLog('音声認識非対応ブラウザです', 'info');
      return;
    }
    // ( ... onstart, onend, onspeechstart, onspeechend は変更なし ...)
    recognition.onstart = () => { console.log('SpeechRecognition: onstart'); setIsRecording(true); addLog("マイク録音を開始しました。", "info"); };
    recognition.onend = () => { console.log('SpeechRecognition: onend'); setIsRecording(false); addLog("マイクを停止しました。", "info"); };
    recognition.onspeechstart = () => { console.log('SpeechRecognition: onspeechstart'); addLog("音声の検出を開始しました...", "info"); };
    recognition.onspeechend = () => { console.log('SpeechRecognition: onspeechend'); addLog("音声の検出を終了しました。", "info"); };

    // ★★★ 3. onresult を修正 ★★★
    recognition.onresult = (event) => {
      let final_transcript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final_transcript += event.results[i][0].transcript;
        }
      }
      const text = final_transcript.trim();
      console.log('SpeechRecognition: onresult (final text)', text);
      if (text && websocket.current?.readyState === WebSocket.OPEN) {
        addLog(text, 'user');
        websocket.current.send(text);
        // ★ ユーザー送信時にも「考え中」を開始
        setIsThinking(true); 
      } else if (text) {
        addLog(`(送信失敗: ${text})`, 'info');
      }
    };

    recognition.onerror = (event) => {
      // ( ... 変更なし ...)
      console.error('SpeechRecognition error:', event.error);
      let errorMsg = `音声認識エラー: ${event.error}`;
      if (event.error === 'no-speech') errorMsg = '音声が検出されませんでした。';
      else if (event.error === 'not-allowed') { errorMsg = 'マイクの使用が許可されていません。'; setMicError(errorMsg); }
      else if (event.error === 'network' || event.error === 'service-not-allowed') errorMsg = 'ネットワークまたは認識サービスのエラーです。';
      addLog(errorMsg, 'info');
      setIsThinking(false); // ★ エラー時も解除
    };
    return () => {
      if (recognition) { recognition.stop(); console.log("ChatPage unmount: SpeechRecognition stopped"); }
    };
  }, []); // 空の配列でマウント時のみ

  const startMicrophone = () => {
    // ( ... 変更なし ... )
    if (isRecording || !recognition) return;
    try { recognition.start(); } 
    catch (err) { console.error("recognition.start() エラー:", err); addLog('音声認識を開始できませんでした。', 'info'); }
  };

  const stopMicrophone = () => {
    // ( ... 変更なし ... )
    if (!isRecording || !recognition) return;
    try { recognition.stop(); } 
    catch (err) { console.error("recognition.stop() エラー:", err); }
  };

  const toggleMicrophone = () => {
    // ( ... 変更なし ... )
    if (isRecording) { stopMicrophone(); } 
    else { startMicrophone(); }
  };

  // ★★★ 4. sendText を修正 ★★★
  const sendText = () => {
    if (textInput && websocket.current?.readyState === WebSocket.OPEN) {
      websocket.current.send(textInput);
      addLog(textInput, 'user');
      setTextInput('');
      // ★ テキスト送信時にも「考え中」を開始
      setIsThinking(true); 
    }
  };


  // --- JSX (レンダリング) ---
  return (
    <div id="chat-page" className="page">
      <div className="chat-interface-area">
        {/* ( ... ヘッダー ... 変更なし) */}
        <div className="header">
          <h1>会話</h1>
          <span id="status" className={status.key}>{status.text}</span>
          {status.key === 'connected' ? (
            <button id="disconnectButton" onClick={disconnect}>切断</button>
          ) : (
            <button id="connectButton" onClick={connect} disabled={status.key === 'connecting'}>
              {status.key === 'connecting' ? '接続中...' : '接続'}
            </button>
          )}
        </div>
        
        {/* ( ... ログコンテナ ... ) */}
        <div className="log-container" ref={logContainerRef}>
          <div className="log-wrapper">
            {logs.map((log) => (
              <p key={log.id} className={`message ${log.type}`}>
                {log.text}
              </p>
            ))}
            
            {/* ★★★ 5. isThinking が true なら「考え中...」を表示 ★★★ */}
            {isThinking && (
              <p key="thinking-indicator" className="message info thinking-indicator">
                （考え中...）
              </p>
            )}
            
          </div>
        </div>
        
        {/* ( ... フッター ... 変更なし) */}
        <div className="footer">
          <div className="input-area">
            <button
              id="micButton"
              className={isRecording ? 'recording' : ''}
              onClick={toggleMicrophone}
              disabled={status.key !== 'connected' || !!micError} 
            >
              {isRecording ? '■' : '🎤'} 
            </button>
            <input
              type="text"
              id="textInput"
              placeholder={micError ? micError : "テキストでも入力できます..."}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendText()}
              disabled={status.key !== 'connected'}
            />
            <button id="sendButton" onClick={sendText} disabled={status.key !== 'connected'}>
              送信
            </button>
          </div>
        </div>
      </div>
      
      {/* ( ... VRMビューワー ... 変更なし) */}
      <div className="vrm-area">
        <VrmViewer ref={vrmViewerRef} audioData={audioToPlay} />
      </div>
    </div>
  );
}

export default ChatPage;