/**
 * WebSocket 連接測試組件
 * 用於驗證 WebSocket 模組是否正常工作
 */

import React, { useState } from 'react';
import { useWebSocket, useWebSocketStatus, websocket } from '@/lib/websocket';
import { useLoaderData } from 'react-router';
import type { User } from '@/root';
import { formatDateTimeInTimeZone, formatTimeInTimeZone } from '@/lib/date';

interface LoaderData {
  user: User | null;
  [key: string]: any;
}

export function WebSocketTest() {
  const loaderData = useLoaderData() as LoaderData | undefined;
  const user = loaderData?.user || null;
  const userId = user?.id;

  const { connectionState, isConnected, isHealthy, metrics, reconnect } = useWebSocketStatus();

  const [pingResult, setPingResult] = useState<string>('');
  const [testLogs, setTestLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = formatTimeInTimeZone(new Date());
    setTestLogs((prev) => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  const handlePing = async () => {
    try {
      const start = Date.now();
      const response = await websocket.ping();
      const latency = Date.now() - start;
      setPingResult(`${response} (${latency}ms)`);
      addLog(`心跳測試成功: ${response}, 延遲: ${latency}ms`);
    } catch (error) {
      setPingResult('失敗');
      addLog(`心跳測試失敗: ${error}`);
    }
  };

  const handleReconnect = async () => {
    try {
      addLog('嘗試手動重連...');
      await reconnect();
      addLog('重連成功');
    } catch (error) {
      addLog(`重連失敗: ${error}`);
    }
  };

  React.useEffect(() => {
    if (!userId) return;

    addLog(`開始監聽用戶事件: ${userId}`);

    // 監聽連接事件
    const unsubscribeConnect = websocket.on('connect', () => {
      addLog('WebSocket 連接成功');
    });

    const unsubscribeDisconnect = websocket.on('disconnect', (reason: string) => {
      addLog(`WebSocket 斷線: ${reason}`);
    });

    const unsubscribeError = websocket.on('error', (error: { message: string }) => {
      addLog(`WebSocket 錯誤: ${error.message}`);
    });

    const unsubscribeMessage = websocket.on('new-msg', (msg: any) => {
      addLog(`收到新訊息: ${msg.id} - ${msg.content.substring(0, 30)}...`);
    });

    return () => {
      unsubscribeConnect();
      unsubscribeDisconnect();
      unsubscribeError();
      unsubscribeMessage();
    };
  }, [userId]);

  return (
    <div
      style={{
        padding: '20px',
        border: '2px solid #ddd',
        borderRadius: '8px',
        maxWidth: '600px',
        margin: '20px auto',
        fontFamily: 'monospace',
      }}
    >
      <h2 style={{ marginTop: 0 }}>🔧 WebSocket 連接測試</h2>

      {/* 基本信息 */}
      <div style={{ marginBottom: '20px' }}>
        <div>
          <strong>載入狀態:</strong> 已載入
        </div>
        <div>
          <strong>用戶ID:</strong> {userId || '未登入'}
        </div>
        <div>
          <strong>連接狀態:</strong>
          <span
            style={{
              color: isConnected ? 'green' : 'red',
              fontWeight: 'bold',
              marginLeft: '8px',
            }}
          >
            {isConnected ? '🟢 已連接' : '🔴 未連接'}
          </span>
        </div>
        <div>
          <strong>詳細狀態:</strong> {connectionState}
        </div>
        <div>
          <strong>健康狀態:</strong> {isHealthy ? '  健康' : '❌ 不健康'}
        </div>
      </div>

      {/* 連接指標 */}
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f5f5f5' }}>
        <h4 style={{ margin: '0 0 10px 0' }}>📊 連接指標</h4>
        <div>連接嘗試次數: {metrics.connectionAttempts}</div>
        <div>總重連次數: {metrics.totalReconnects}</div>
        <div>最後連接時間: {metrics.lastConnectTime ? formatDateTimeInTimeZone(metrics.lastConnectTime) : '無'}</div>
        <div>最後斷線時間: {metrics.lastDisconnectTime ? formatDateTimeInTimeZone(metrics.lastDisconnectTime) : '無'}</div>
      </div>

      {/* 測試按鈕 */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={handlePing}
          disabled={!isConnected}
          style={{
            padding: '8px 16px',
            marginRight: '10px',
            backgroundColor: isConnected ? '#007bff' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isConnected ? 'pointer' : 'not-allowed',
          }}
        >
          🏓 測試心跳
        </button>

        <button
          onClick={handleReconnect}
          disabled={isConnected}
          style={{
            padding: '8px 16px',
            backgroundColor: !isConnected ? '#28a745' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: !isConnected ? 'pointer' : 'not-allowed',
          }}
        >
          🔄 手動重連
        </button>

        {pingResult && (
          <div style={{ marginTop: '10px' }}>
            <strong>心跳結果:</strong> {pingResult}
          </div>
        )}
      </div>

      {/* 事件日誌 */}
      <div>
        <h4 style={{ margin: '0 0 10px 0' }}>📝 事件日誌 (最近 10 條)</h4>
        <div
          style={{
            height: '200px',
            overflow: 'auto',
            backgroundColor: '#000',
            color: '#0f0',
            padding: '10px',
            fontSize: '12px',
            borderRadius: '4px',
          }}
        >
          {testLogs.length === 0 ? <div>等待事件...</div> : testLogs.map((log, index) => <div key={index}>{log}</div>)}
        </div>
      </div>
    </div>
  );
}

export function SimpleWebSocketStatus() {
  const loaderData = useLoaderData() as LoaderData | undefined;
  const user = loaderData?.user || null;
  const userId = user?.id;
  const { isConnected, connectionState } = useWebSocket(userId);

  if (!user) {
    return (
      <div
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          padding: '8px 12px',
          backgroundColor: '#e2e3e5',
          border: '1px solid #d1ecf1',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 1000,
        }}
      >
        未登入 👤
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        padding: '8px 12px',
        backgroundColor: isConnected ? '#d4edda' : '#f8d7da',
        border: `1px solid ${isConnected ? '#c3e6cb' : '#f5c6cb'}`,
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: 1000,
      }}
    >
      WebSocket: {isConnected ? '🟢' : '🔴'} {connectionState}
    </div>
  );
}
