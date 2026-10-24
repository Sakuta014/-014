# 参赛作品公开体验与 Token 方案

2026-10-24 查阅官方比赛报名 issue、对应 README，并检查 McVibe 的 Token 接口源码。以下是仓库声明及源码所展示的做法，不代表逐一实测其线上服务。

- [麦麦抄作业 #511](https://github.com/M-China/mcd-developer-innovation-challenge/issues/511)：[README](https://github.com/Ithrael/mcd-copy-meal/blob/main/README.md) 提供免 Token 的 Pages 示例；实时功能使用用户自己的 Token，不共享作者账号。
- [麦门足迹 #167](https://github.com/M-China/mcd-developer-innovation-challenge/issues/167)：[README](https://github.com/Alphaxiaoteng/mcvibe/blob/main/README.md) 提供沙盒体验，再绑定自己的 Token。[接口源码](https://github.com/Alphaxiaoteng/mcvibe/blob/main/api/token.ts) 从请求接收 Token 并创建 MCP 客户端。
- [麦麦奇幻乐园 #516](https://github.com/M-China/mcd-developer-innovation-challenge/issues/516)：[README](https://github.com/banshoudigua/McD-Arcade-Adventure/blob/master/README.md) 使用公开脱敏快照供游客体验，个人业务需要自己的 Token。

本项目采用：首页免登录、公开套餐快照明确标注示例参考价；实时核价与订单使用每位访客自己的临时会话，作者凭证不作为默认值。
