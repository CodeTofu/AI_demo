# 无障碍 — 补充说明

仅在审查焦点管理、ARIA、弹窗/对话框或读屏相关行为时阅读本文。

## 焦点

- 模态/对话框：打开时限制焦点在对话框内；关闭后将焦点回到触发控件。
- `autoFocus`：慎用；勿让键盘用户跳过必要的前置内容。

## ARIA

- 优先使用原生元素（`button`、`a`、`input`），少用带 `role` 的 `div`。
- 使用 `role` 时补齐必备属性（例如可折叠区域的 `aria-expanded` 与 `aria-controls`）。
- 实时区域（`aria-live`）：用于异步状态更新；避免频繁打扰「polite」区域。

## 标签

- 每个表单控件需有关联标签（`htmlFor` / `aria-label` / `aria-labelledby`）。
- 纯图标按钮需 `aria-label`（或可见文字）。

## 动效

- 若应用已有动效，对非必要动画应尊重 `prefers-reduced-motion`。
