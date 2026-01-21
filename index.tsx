import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 先定义 ErrorBoundary，再在下面的 render 中使用，避免“Cannot access before initialization” 报错
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: unknown }
> {
  state: { hasError: boolean; error?: unknown } = { hasError: false };

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown) {
    // 方便你在 DevTools 里直接看到堆栈
    console.error('React render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
          <h1 style={{ fontSize: 18, margin: 0 }}>页面渲染失败（前端运行时报错）</h1>
          <pre style={{ whiteSpace: 'pre-wrap', opacity: 0.9 }}>
            {String(this.state.error)}
          </pre>
          <div style={{ opacity: 0.8, fontSize: 12 }}>
            打开浏览器 DevTools Console 能看到更完整的报错堆栈。
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {/* 兜底：如果 App 运行时报错，至少在页面上显示错误信息（避免“只有背景啥也没有”） */}
    <ErrorBoundary>
    <App />
    </ErrorBoundary>
  </React.StrictMode>
);