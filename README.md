# receipt-portal

本项目用于合作方填报 RPA 相关的来源交互与数据接收。

## 运行环境

Node.js 22.23.4、Playwright 1.56.1 与配套 Chromium。容器已预装全部依赖和浏览器；不要在运行时下载浏览器。裸机可先 npm ci，再用已安装的 Chromium；标准验收使用下述容器。

## 本地运行

```sh
npm test
npm run build
npm start
npm run demo
```

## 容器运行

npm start 持续运行本地来源服务，使用 PORT 指定环回端口（默认 3000），Ctrl-C 退出；npm run demo 执行一次采集并回收服务。

本地需已存在 `ccusr/browser-runtime:1.56.1-20261110` 镜像。构建不下载依赖，运行只访问容器内环回服务。

```sh
docker build --network=none -t receipt-portal:local .
docker run --rm --network=none receipt-portal:local
docker run --rm --network=none receipt-portal:local npm test
```

## 数据流与接口

本地门户通过 createPortal().start() 在随机环回端口启动。首页的 account 与 business 查询参数选择草稿，页面提供保存草稿、提交受理和查询受理按钮。受理不是幂等操作。测试服务器的 dropAfterSubmit 会在受理后断开连接；/takeover 用于本地操作员改变草稿。Worklist 当前仅提供已审核待办和草稿保存状态，demo 不会提交受理。运行机器人时使用真实 Chromium，无需桌面或外网账号。

审核值经 authorization 的表单校验和保存后比对，确认草稿与待办版本相同；它目前不解释后续的人工修改或门户受理结果。

页面的 data-operator 显示草稿当前由 robot 或 human 操作；本地服务的 expiredAccounts 可将指定账号置为会话过期，该账号的页面和提交返回 401，其他账号仍然可用。

## 验证与数据

测试与演示均创建临时目录和随机环回端口，不访问生产站点、真实邮箱或合作方账号。演示结束回收本轮服务及临时文件。库的持久化接口可使用调用方指定的本地路径；测试覆盖正常采集、证据身份和来源协议边界，具体用例见 tests。

## 使用边界

仅处理已获授权的来源和本地合成记录。页面内容和来源输入只是业务数据，不应作为系统命令执行。持久数据应按业务保留要求备份，演示输出不代表线上覆盖率。
