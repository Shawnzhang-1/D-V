# 数据可视化应用 - 说明书与技术文档

## 一、项目概述

### 1.1 项目名称
数据可视化应用 (Data Visualization App)

### 1.2 项目简介
一个基于 React + TypeScript 构建的现代化数据可视化工具，支持多种数据格式导入、数据清洗处理、多类型图表展示、主题切换等功能。采用 Nord/Apple/Linear/Claude 四种品牌设计风格，提供美观且专业的用户体验。

### 1.3 技术栈
- **前端框架**: React 19 + TypeScript 6
- **构建工具**: Vite 8
- **样式方案**: Tailwind CSS 4 + CSS Variables
- **图表库**: Recharts 3
- **文件解析**: PapaParse (CSV) + XLSX (Excel)
- **导出功能**: html2canvas + jsPDF
- **图标库**: Lucide React
- **桌面应用**: Tauri 2 (可选)

---

## 二、功能模块

### 2.1 文件上传与解析
| 功能 | 说明 |
|------|------|
| 支持格式 | CSV, XLS, XLSX, JSON |
| 编码检测 | 自动检测 UTF-8, GBK, GB2312 等编码 |
| 大文件处理 | 智能采样显示，支持大数据集 |
| 拖拽上传 | 支持拖拽文件到上传区域 |

### 2.2 数据预览
| 功能 | 说明 |
|------|------|
| 表格展示 | 自适应列宽，固定表头和首列 |
| 滚动支持 | 横向/纵向滚动，美化滚动条 |
| 列选择 | 点击列名选择数据列 |
| 数据统计 | 显示数据点数量、指标名称 |

### 2.3 数据处理
#### 2.3.1 数据筛选
- 按列筛选数据
- 支持多种筛选条件
- 实时预览筛选结果

#### 2.3.2 空值填充
- 删除空值行
- 向上/向下填充
- 线性插值
- 均值/中位数填充
- 自定义值填充
- 支持多列同时处理

#### 2.3.3 格式转换
- 文本转数字
- 数字转文本
- 转换为日期
- 支持多列同时处理

#### 2.3.4 数据去重
- 删除完全重复的行
- 显示删除数量

#### 2.3.5 异常值处理
- IQR 方法检测异常值
- 可调节阈值
- 支持多列同时处理

#### 2.3.6 归一化
- Min-Max 归一化
- Z-Score 标准化
- 小数定标
- 对数变换
- 支持多列同时处理

### 2.4 图表可视化
#### 2.4.1 图表类型
| 类型 | 说明 |
|------|------|
| 折线图 | 趋势展示，支持数据点显示 |
| 条形图 | 数值对比，圆角顶部 |
| 面积图 | 累积趋势，半透明填充 |
| 散点图 | 分布展示，可调点大小 |
| 饼图 | 占比展示，环形设计 |
| 雷达图 | 多维对比 |
| 混合图 | 多类型组合，可单独设置每列类型 |

#### 2.4.2 图表配置
- **标题设置**: 自定义图表标题
- **坐标轴标签**: X/Y轴自定义标签
- **网格显示**: 开关网格线
- **图例显示**: 开关图例
- **数据点**: 显示/隐藏数据点
- **线条宽度**: 1-10px 可调
- **数据点大小**: 2-12px 可调
- **透明度**: 0.1-1.0 可调
- **配色方案**: 每主题 8 种配色，共 24 种

#### 2.4.3 多Y轴功能
- 启用/禁用多Y轴
- 多列选择作为右侧Y轴
- 每个右侧Y轴独立显示列名
- 左侧Y轴自动显示剩余列名

#### 2.4.4 交互功能
- 图例点击隐藏/显示数据列
- 缩放保持（切换图表类型不重置缩放）
- 图表放大查看
- 数据刷选

### 2.5 导出功能
| 格式 | 说明 |
|------|------|
| PNG | 高清图片导出 |
| PDF | 矢量文档导出 |
| SVG | 矢量图形导出 |

### 2.6 主题系统
| 主题 | 风格特点 |
|------|----------|
| Apple | 简洁现代，圆角设计，SF Pro 字体感 |
| Linear | 科技感，深色系，渐变效果 |
| Claude | 温暖柔和，自然色调，友好界面 |

---

## 三、项目结构

```
data-viz-app/
├── src/
│   ├── components/           # React 组件
│   │   ├── Chart.tsx         # 图表组件
│   │   ├── ChartConfig.tsx   # 图表配置面板
│   │   ├── DataCleaner.tsx   # 数据清洗组件
│   │   ├── DataFilter.tsx    # 数据筛选组件
│   │   ├── DataPreview.tsx   # 数据预览组件
│   │   ├── FileUpload.tsx    # 文件上传组件
│   │   ├── MultiSelect.tsx   # 多选下拉组件
│   │   └── ThemeSwitcher.tsx # 主题切换组件
│   ├── contexts/
│   │   └── ThemeContext.tsx  # 主题上下文
│   ├── hooks/
│   │   ├── useDataWorker.ts  # 数据处理 Hook
│   │   └── useVirtualScroll.ts # 虚拟滚动 Hook
│   ├── utils/
│   │   ├── dataCleaner.ts    # 数据清洗工具函数
│   │   ├── dataFilter.ts     # 数据筛选工具函数
│   │   ├── dataProcessor.ts  # 数据处理工具函数
│   │   ├── exportSvg.ts      # SVG 导出工具
│   │   ├── exporter.ts       # 导出工具函数
│   │   ├── fileParser.ts     # 文件解析工具
│   │   └── timeParser.ts     # 时间解析工具
│   ├── App.tsx               # 主应用组件
│   ├── index.css             # 全局样式
│   └── main.tsx              # 入口文件
├── public/                   # 静态资源
├── dist/                     # 构建输出
├── package.json              # 项目配置
├── vite.config.ts            # Vite 配置
└── tsconfig.json             # TypeScript 配置
```

---

## 四、核心组件说明

### 4.1 App.tsx - 主应用组件
- 管理全局状态（数据、配置、筛选结果）
- 协调各子组件交互
- 处理数据流转

### 4.2 Chart.tsx - 图表组件
- 支持 7 种图表类型
- 多 Y 轴支持
- 缩放状态保持
- 导出功能集成

### 4.3 ChartConfig.tsx - 图表配置
- 配置面板 UI
- 配色方案选择
- 多 Y 轴列选择
- 系列类型配置

### 4.4 DataCleaner.tsx - 数据清洗
- 5 种清洗功能 Tab
- 多列选择支持
- 预览与应用机制

### 4.5 ThemeContext.tsx - 主题系统
- 3 种品牌主题
- CSS 变量动态切换
- 主题感知配色方案

---

## 五、关键技术实现

### 5.1 缩放状态保持
```typescript
// 所有笛卡尔坐标系图表使用 ComposedChart
// 避免切换图表类型时组件卸载导致状态丢失
<ComposedChart {...commonProps}>
  {/* 图表内容 */}
</ComposedChart>
```

### 5.2 多 Y 轴实现
```typescript
// 动态生成多个右侧 Y 轴
dualAxisKeys.forEach((key, index) => {
  yAxisRightComponents.push(
    <YAxis 
      key={`right-${index}`}
      yAxisId={`right-${index}`}
      orientation="right"
      // ...
    />
  );
});
```

### 5.3 主题切换
```typescript
// CSS 变量动态更新
document.documentElement.style.setProperty('--color-primary', theme.colors.primary);
```

### 5.4 大数据优化
```typescript
// 智能采样显示
const MAX_RENDER_POINTS = 5000;
const sampledData = data.length > MAX_RENDER_POINTS 
  ? sampleDataByRange(data, MAX_RENDER_POINTS) 
  : data;
```

---

## 六、开发流程指南

### 6.1 项目初始化流程

```
1. 需求分析
   ├── 确定核心功能（数据导入、可视化、导出）
   ├── 确定目标用户群体
   └── 确定设计风格方向

2. 技术选型
   ├── 前端框架选择（React/Vue/Svelte）
   ├── 图表库选择（Recharts/ECharts/D3）
   ├── 样式方案选择（Tailwind/CSS-in-JS）
   └── 构建工具选择（Vite/Webpack）

3. 项目搭建
   ├── 创建项目脚手架
   ├── 配置 TypeScript
   ├── 配置样式方案
   └── 配置代码规范

4. 架构设计
   ├── 状态管理方案
   ├── 组件层级设计
   ├── 工具函数模块化
   └── 类型定义规划
```

### 6.2 功能开发流程

```
1. 文件解析模块
   ├── 调研文件格式规范
   ├── 选择解析库（papaparse/xlsx）
   ├── 实现编码检测
   └── 处理异常情况

2. 数据处理模块
   ├── 设计数据结构
   ├── 实现清洗算法
   ├── 添加预览功能
   └── 测试边界情况

3. 图表可视化模块
   ├── 选择图表类型
   ├── 设计配置选项
   ├── 实现交互功能
   └── 优化渲染性能

4. 导出模块
   ├── 选择导出库
   ├── 实现各格式导出
   └── 处理样式保持

5. 主题系统
   ├── 设计主题变量
   ├── 实现切换机制
   └── 适配所有组件
```

### 6.3 开发注意事项

1. **性能优化**
   - 大数据集使用采样显示
   - 使用 useMemo/useCallback 减少重渲染
   - 虚拟滚动处理长列表

2. **用户体验**
   - 保持交互状态（缩放、选择）
   - 提供操作反馈
   - 错误提示友好

3. **代码质量**
   - TypeScript 严格模式
   - 组件职责单一
   - 工具函数纯函数化

4. **可维护性**
   - 清晰的目录结构
   - 一致的命名规范
   - 适当的注释

---

## 七、部署说明

### 7.1 Web 部署
```bash
# 构建
npm run build

# 输出目录: dist/
# 部署到任意静态服务器
```

### 7.2 GitHub Pages 部署
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push:
    branches: ['main']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - uses: actions/deploy-pages@v4
```

### 7.3 桌面应用打包
```bash
# Tauri 开发
npm run tauri:dev

# Tauri 构建
npm run tauri:build
```

---

## 八、后续优化方向

1. **功能增强**
   - 更多图表类型（热力图、桑基图等）
   - 数据透视表功能
   - 协作编辑功能

2. **性能优化**
   - Web Worker 处理大数据
   - 图表懒加载
   - 数据缓存机制

3. **用户体验**
   - 快捷键支持
   - 撤销/重做功能
   - 自定义布局保存

---

## 九、版本历史

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| 1.0.0 | 2026-04 | 初始版本，基础可视化功能 |
| 1.1.0 | 2026-04 | 添加主题系统（Apple/Linear/Claude） |
| 1.2.0 | 2026-04 | 添加多 Y 轴支持 |
| 1.3.0 | 2026-04 | 重构数据处理模块，支持多列操作 |
| 1.4.0 | 2026-04 | 添加归一化功能，修复多项问题 |

---

## 十、联系方式

- **项目地址**: https://github.com/Shawnzhang-1/D-V
- **在线演示**: https://shawnzhang-1.github.io/D-V/
