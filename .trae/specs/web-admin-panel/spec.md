# 网页管理面板 Spec

## Why
为 Docker 容器添加网页管理界面，让用户可以通过浏览器查看和管理同步数据，无需安装浏览器插件即可访问服务器数据。

## What Changes
- 创建网页管理界面（HTML/CSS/JS）
- 添加数据展示页面（书签、历史记录、Cookie）
- 添加实时连接状态显示
- 添加客户端列表展示
- 添加数据管理功能（搜索、删除、导出）

## Impact
- 新增文件：`server/src/public/` 目录
- 修改：`server/src/index.js` 添加根路由
- Docker 容器无需修改配置

## ADDED Requirements
### Requirement: 网页管理界面
系统 SHALL 提供以下网页界面：
1. **首页** - 显示服务器状态和统计数据
2. **书签页面** - 查看所有书签，支持搜索和删除
3. **历史记录页面** - 查看历史记录，支持搜索和删除
4. **Cookie 页面** - 查看 Cookie 数据
5. **客户端页面** - 查看连接的客户端列表

#### Scenario: 用户访问管理界面
- **WHEN** 用户访问 `http://localhost:8080/`
- **THEN** 显示管理界面首页，包含服务器状态和数据统计

#### Scenario: 实时数据同步
- **WHEN** 浏览器插件推送新数据
- **THEN** 网页界面实时更新显示最新数据

## MODIFIED Requirements
### Requirement: 服务器根路由
服务器 SHALL 在根路径 `/` 提供网页管理界面，而不是返回 404。
