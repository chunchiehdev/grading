# 从Remix升级到React 19和React Router 7

本文档记录了将项目从Remix升级到React 19和React Router 7的步骤和变更。

## 已完成的更改

1. **Package.json更新**

   - 更新所有React Router包到版本`^7.5.2`
   - 移除所有Remix依赖
   - 更新`@react-spring/web`到兼容React 19的版本`^10.2.0`

2. **入口文件更新**

   - 替换`app/entry.client.tsx`中的`HydratedRouter`为`RouterProvider`和`createBrowserRouter`
   - 替换`app/entry.server.tsx`中的`ServerRouter`为`StaticRouterProvider`和`createStaticRouter`

3. **根组件更新**

   - 更新`app/root.tsx`以使用React Router 7的API
   - 修改元数据和链接处理
   - 显式包含客户端入口点脚本

4. **路由配置更新**

   - 使用`createRoutesFromFolders`替换Remix的路由配置
   - 简化路由配置

5. **Vite配置更新**

   - 从`@react-router/dev`导入`reactRouter`插件
   - 更新Vite配置

6. **自定义主题管理**
   - 创建`app/theme-provider.tsx`替换`remix-themes`
   - 实现了主题上下文、提供者组件和切换功能
   - 添加了Cookie基础管理，用于服务器端状态同步
   - 提供了`ThemeToggle`组件用于UI交互

## 更新脚本

我们创建了一个脚本来帮助更新导入语句：

```bash
./update-imports.sh
```

此脚本执行以下替换：

- `@remix-run/react` → `react-router-dom`
- `remix-utils/sse/react` → `react-router-dom/sse/client`
- `remix-utils/sse/server` → `react-router-dom/sse/server`
- `remix-themes` → `../theme-provider`
- `@remix-run/node` → `@react-router/node`
- `MetaFunction` → `MetaDescriptor`
- `LinksFunction` → `LinkDescriptor`
- `useTransition` → `useNavigation`

## 主题提供者实现细节

自定义主题提供者(`app/theme-provider.tsx`)实现了以下功能：

1. **主题上下文**：创建React上下文管理主题状态
2. **暗/亮模式切换**：提供简单API用于切换主题模式
3. **系统偏好检测**：根据系统偏好自动选择默认主题
4. **持久化存储**：使用localStorage保存主题选择
5. **服务器端支持**：通过Cookie处理服务器端主题状态
6. **TypeScript支持**：完整的类型定义和类型保护

### 使用示例

```tsx
// 在根组件中
import { ThemeProvider, getThemeSession } from './theme-provider';

// 在loader中获取主题
const loader = async ({ request }: LoaderFunctionArgs) => {
  const theme = getThemeSession(request);
  return { theme };
};

// 在组件中使用
function App() {
  const { theme } = useLoaderData<typeof loader>();

  return (
    <ThemeProvider specifiedTheme={theme}>
      {/* 应用内容 */}
      <ThemeToggle />
    </ThemeProvider>
  );
}
```

## 后续步骤

1. **清理和重新安装依赖**

   ```bash
   npm ci
   ```

2. **修复导入问题**

   - 处理运行脚本后可能仍存在的导入问题
   - 确保所有导入的API都与React Router 7兼容

3. **测试应用程序**

   - 运行应用并确保所有功能正常工作
   - 特别检查路由、表单提交和服务器端渲染

4. **类型错误处理**
   - 处理TypeScript类型问题，尤其是由于API更改导致的问题

## 常见问题

### 模块找不到错误

运行`npm install`后应该会解决大多数模块找不到的错误。

### React 19兼容性问题

某些依赖项可能与React 19不兼容。如果遇到冲突，您可以：

- 寻找并更新到兼容的版本
- 使用`--legacy-peer-deps`标志安装（不推荐用于生产）

### 路由相关问题

确保所有路由组件都正确使用React Router 7的API和约定。

### 主题系统迁移问题

从`remix-themes`迁移到自定义主题提供者时，注意以下事项：

- 更新所有导入路径
- 将`useTheme()`调用更改为新的API
- 更新服务器端处理逻辑，使用`getThemeSession`和`setThemeCookie`
- 确保CSS中的主题类选择器保持一致
