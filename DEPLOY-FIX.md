# 部署问题修复指南

## 问题：缺少依赖包

部署时如果遇到 `Failed to resolve import` 错误，说明服务器上的 `node_modules` 缺少某些依赖包。

## 解决方案

### 方法一：在服务器上重新安装依赖（推荐）

```bash
# 1. 进入项目目录
cd /www/wwwroot/pangyan_world

# 2. 删除旧的 node_modules（可选，但推荐）
rm -rf node_modules package-lock.json

# 3. 重新安装所有依赖
npm install

# 4. 重新构建
npm run build
```

### 方法二：确保 package.json 包含所有依赖

如果 `package.json` 已经更新，但服务器上的文件还是旧的，需要：

```bash
# 1. 上传最新的 package.json 到服务器
# 2. 在服务器上运行
npm install

# 3. 重新构建
npm run build
```

### 方法三：使用 npm ci（生产环境推荐）

```bash
# npm ci 会严格按照 package-lock.json 安装，适合生产环境
npm ci

# 然后构建
npm run build
```

## 当前需要的依赖包

确保 `package.json` 包含以下依赖：

```json
{
  "dependencies": {
    "@google/genai": "^1.37.0",
    "lucide-react": "^0.562.0",
    "react": "^19.2.3",
    "react-dom": "^19.2.3",
    "react-markdown": "^9.0.1",
    "remark-gfm": "^4.0.0",
    "rehype-raw": "^7.0.0"
  }
}
```

## 完整部署流程

```bash
# 1. 进入项目目录
cd /www/wwwroot/pangyan_world

# 2. 拉取最新代码（如果使用 Git）
git pull

# 3. 安装/更新依赖
npm install

# 4. 构建项目
npm run build

# 5. 如果使用 PM2，重启服务
pm2 restart my-world-frontend

# 或如果使用 Nginx，确保 dist 目录已更新
# 文件应该已经在 dist/ 目录中
```

## 检查依赖是否安装

```bash
# 检查特定包是否安装
npm list react-markdown
npm list remark-gfm
npm list rehype-raw

# 查看所有已安装的包
npm list --depth=0
```

## 常见问题

### 1. 权限问题
```bash
# 如果遇到权限错误
sudo chown -R $USER:$USER /www/wwwroot/pangyan_world
```

### 2. Node 版本问题
```bash
# 检查 Node 版本（需要 Node 16+）
node -v

# 如果版本太低，使用 nvm 升级
nvm install 18
nvm use 18
```

### 3. 网络问题（如果 npm install 很慢）
```bash
# 使用国内镜像
npm install --registry=https://registry.npmmirror.com

# 或设置永久镜像
npm config set registry https://registry.npmmirror.com
```

## 快速修复命令（一键执行）

```bash
cd /www/wwwroot/pangyan_world && \
npm install && \
npm run build && \
echo "部署完成！"
```
