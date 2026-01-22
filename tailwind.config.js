/** @type {import('tailwindcss').Config} */
export default {
  // 这个配置文件只是为了消除构建警告
  // 实际使用的是 CDN 版本的 Tailwind (index.html 中的 <script src="https://cdn.tailwindcss.com"></script>)
  content: [
    "./index.html",
    "./index.tsx",
    "./App.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
