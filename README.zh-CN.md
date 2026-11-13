# Simple Table Preview

[English](README.md) | 简体中文

用于 VS Code / Cursor 的只读 XLSX、CSV、TSV 表格预览插件。所有解析在本地运行，不上传文件。

## 安装与启动

从 [Releases](https://github.com/Muchmorepig/simple-table-preview/releases) 下载 `simple-table-preview-0.2.1.vsix`：按 Ctrl+Shift+P（Mac：Cmd+Shift+P），搜索 `VSIX`，选择 **Extensions: Install from VSIX… / 从 VSIX 安装**，选中安装包。已安装旧版时同样操作即可更新。

界面跟随编辑器显示语言：中文语言环境显示简体中文，其他语言显示英文。修改编辑器语言并重启后生效，无需安装不同版本。

开发调试：运行 `npm ci`，在 VS Code 或 Cursor 打开本目录，按 F5 启动 Extension Development Host，再打开 XLSX / CSV / TSV。若文件仍以文本打开，右键标签页 → **Reopen Editor With… / 使用其他编辑器重新打开** → **Table Preview**。可在该菜单中设为默认编辑器。

## 使用

- 选择工作表；CSV/TSV 默认首行作为表头，XLSX 默认显示全部行，可以勾选“首行作为表头”。
- 点击列名依次切换升序、降序、原始顺序。数值和科学计数法按数值排序，其他内容按自然文本排序。
- 拖动列标题右边界调整列宽；也可以用 Tab 聚焦边界后按左右方向键，每次调整 10 像素。列宽范围 80–1600 像素，过长内容悬停可查看全文。排序、过滤、翻页和切换工作表时保留各表列宽；重新读取或重新打开文件后恢复默认宽度。
- 底部依次为工作表/表头/编码设置、翻页、重置/重新读取操作；窄窗口自动换行。
- 每列输入框默认做不区分大小写的文本包含筛选，多列条件同时满足才显示。
- 正则使用 `/表达式/`，例如 `/^Gene\.09/`；加 `i` 忽略大小写，例如 `/^gene\./i`。支持 `i`、`m`、`s`、`u` 标志，不支持 `g`、`y`。无效表达式会标红并提示，保留上次有效结果。
- 数值阈值支持 `<`、`<=`、`>`、`>=`、`=`、`==`、`!=`，例如 P 值列输入 `<0.05`，logfoldchanges 列输入 `>=2`；支持 `<=1e-100` 等科学计数法。空白、非数值内容不参与阈值匹配；单独输入 `0.05` 仍按文本包含匹配。
- 排序、筛选覆盖已加载的全部行，每页显示 200 行。行号始终对应原文件行号。
- “重置排序和筛选”恢复原始顺序；“重新读取文件”读取外部保存后的内容。
- CSV/TSV 支持 UTF-8、GB18030 / GBK、UTF-16 LE；CSV 自动识别分隔符，TSV 固定使用制表符。
- 可选择单元格文本并使用系统复制快捷键。没有 Excel 式区域选择或编辑保存。

## 预览边界

文件最多 20 MiB，解析超时 15 秒；每表最多 50,000 行、200 列，全文件最多 200,000 个单元格（依工作表顺序分配）。超出范围会显示截断提示，排序和筛选仅作用于已加载部分。使用分页以控制 DOM 数量，暂不实现虚拟滚动。

只展示数据，不还原 Excel 格式、图表、合并单元格或宏，不计算公式；公式只显示文件已有的缓存结果。数字按 JavaScript 双精度表示，CSV/TSV 原始文本保留，但排序时会转换数值。首行表头、排序、筛选在切换工作表或重新读取时重置。文件外部修改后需手动重新读取。不要依靠本插件核对超出双精度范围的整数大小。

正则使用 JavaScript 原生引擎，在界面线程执行；复杂回溯表达式可能导致预览卡顿，请优先使用简单表达式。

## 验证和打包

```sh
npm test
npm run package
```

测试覆盖 CSV 引号、换行、编码、科学计数法排序、多列筛选、XLSX 工作表及预览上限。用户提供的真实数据样本保存在本地 `test/fixtures/`，不进入 Git 或 VSIX。

可选浏览器回归测试：在已安装 Playwright 和 Chromium 的环境中运行 `PLAYWRIGHT_MODULE=/path/to/playwright node test/browser-check.js`，验证拖动/键盘调整列宽、表头对齐、列宽保留及窄窗口工具栏。浏览器工具不作为插件依赖。

API 依据：[VS Code Custom Editor](https://code.visualstudio.com/api/extension-guides/custom-editors)。解析依赖依据：[SheetJS 官方 Node.js 安装说明](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/)，固定使用官方 CDN 的 0.20.3 版本。
