import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ inline, className, children, ...props }) => {
  // 检测当前主题（通过检查 data-theme 属性或 localStorage）
  const isDarkMode = () => {
    if (typeof window !== 'undefined') {
      const html = document.documentElement;
      const theme = html.getAttribute('data-theme') || localStorage.getItem('theme');
      // sakura 是暗黑模式，cyber 是明亮模式
      return theme === 'sakura';
    }
    return false;
  };

  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const codeString = String(children).replace(/\n$/, '');

  // 如果是内联代码，使用简单的 code 标签
  if (inline || !language) {
    return (
      <code 
        className={`bg-anime-card/40 px-1.5 py-0.5 rounded text-anime-accent font-mono text-sm ${className || ''}`}
        {...props}
      >
        {children}
      </code>
    );
  }

  // 代码块使用语法高亮
  const theme = isDarkMode() ? vscDarkPlus : oneLight;

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-anime-text/10 shadow-lg">
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={language}
          style={theme}
          customStyle={{
            margin: 0,
            padding: '1rem',
            fontSize: '0.875rem',
            lineHeight: '1.6',
            background: isDarkMode() ? '#1e1e1e' : '#f8f9fa',
            borderRadius: '0.5rem',
          }}
          PreTag="div"
          showLineNumbers={false}
          wrapLines={true}
          wrapLongLines={true}
          {...props}
        >
          {codeString}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export default CodeBlock;
