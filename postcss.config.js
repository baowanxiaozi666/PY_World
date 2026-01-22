// PostCSS 配置文件（用于消除构建警告）
// 实际项目使用 CDN 版本的 Tailwind，这个文件只是为了让构建工具不报错
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
