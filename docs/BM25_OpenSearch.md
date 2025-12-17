# OpenSearch BM25 模式接入说明

本方案为 LightRAG 增加了基于 OpenSearch 的 BM25 词法检索模式（`mode: bm25`），默认对 chunk 级文本建立倒排索引并在查询时使用 BM25。

## 配置

在环境变量或 `.env` 中设置：

- `OPENSEARCH_HOST`: OpenSearch 地址（支持含协议，如 `https://localhost:9200`）
- `OPENSEARCH_USER` / `OPENSEARCH_PASSWORD`: 账号密码（可选）
- `OPENSEARCH_INDEX_CHUNKS`: 索引名，默认 `lightrag-chunks`
- `OPENSEARCH_VERIFY_CERTS`: 是否验证 TLS 证书（默认 `true`）

配置样例见 `env.example` 与 `config.ini.example`。

## 索引构建

- 首次使用 `bm25` 模式会自动检查索引是否存在，不存在则创建。
- 若索引为空，会从本地 `working_dir[/workspace]/kv_store_text_chunks.json` 批量导入所有 chunk，索引字段包括 `content、file_path、doc_id、chunk_id、chunk_order_index、metadata`。
- 之后新增文档请重新构建索引或在入库流程中同步到 OpenSearch（当前实现为按需全量导入）。

## 查询

- 前端查询模式下拉新增 `BM25`，请求 `mode: 'bm25'`，后端 `/query` 和 `/query/stream` 已支持。
- 命中结果按 BM25 `_score` 排序，进入统一的 chunk 处理与引用生成流程，响应结构与其他模式一致。

## 快速验证

1) 启动 OpenSearch（示例）  
```bash
docker run -p 9200:9200 -e "discovery.type=single-node" opensearchproject/opensearch:latest
```

2) 设置环境变量并启动 API  
```bash
export OPENSEARCH_HOST=http://localhost:9200
export OPENSEARCH_USER=admin
export OPENSEARCH_PASSWORD=admin
```

3) 运行一次查询（将自动建索引并导入 chunk）  
```bash
curl -X POST http://localhost:9621/query \
  -H "Content-Type: application/json" \
  -d '{"query":"测试内容","mode":"bm25","stream":false}'
```

返回若含有 `data.chunks` 即表示 BM25 检索成功。若第一次调用没有结果，可确认 `rag_storage/kv_store_text_chunks.json` 中是否已有数据，或检查 OpenSearch 连接配置。***

