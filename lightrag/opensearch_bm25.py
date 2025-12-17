import json
import os
from typing import Any, Dict, List, Optional

from opensearchpy import OpenSearch, RequestsHttpConnection
from opensearchpy.exceptions import NotFoundError

from lightrag.utils import logger, load_json


def _bool_env(value: str | bool | None, default: bool = True) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    return str(value).lower() not in {"0", "false", "no"}


def build_opensearch_client(global_config: dict[str, Any]) -> Optional[OpenSearch]:
    host = global_config.get("opensearch_host") or ""
    if not host:
        logger.warning("OpenSearch host not configured; BM25 mode will be disabled.")
        return None

    user = global_config.get("opensearch_user") or ""
    password = global_config.get("opensearch_password") or ""
    verify_certs = _bool_env(global_config.get("opensearch_verify_certs"), True)

    # Allow host to include scheme/port (e.g., https://localhost:9200)
    if "://" not in host:
        # Default to https if verify is requested, otherwise http
        scheme = "https" if verify_certs else "http"
        host = f"{scheme}://{host}"

    client = OpenSearch(
        hosts=[host],
        http_auth=(user, password) if user else None,
        verify_certs=verify_certs,
        ssl_show_warn=False,
        connection_class=RequestsHttpConnection,
        timeout=30,
    )
    return client


def ensure_index(client: OpenSearch, index_name: str) -> None:
    if client.indices.exists(index=index_name):
        return

    logger.info(f"Creating OpenSearch index: {index_name}")
    body = {
        "settings": {
            "index": {
                "number_of_shards": 1,
                "number_of_replicas": 0,
            }
        },
        "mappings": {
            "properties": {
                "content": {"type": "text"},
                "file_path": {"type": "keyword"},
                "doc_id": {"type": "keyword"},
                "chunk_id": {"type": "keyword"},
                "chunk_order_index": {"type": "integer"},
                "metadata": {"type": "object", "enabled": True},
            }
        },
    }
    client.indices.create(index=index_name, body=body)


def get_index_stats(client: OpenSearch, index_name: str) -> Dict[str, Any]:
    try:
        stats = client.indices.stats(index=index_name)
        shards = stats.get("indices", {}).get(index_name, {})
        count = shards.get("total", {}).get("docs", {}).get("count", 0)
        return {"count": count}
    except NotFoundError:
        return {"count": 0}


def bulk_index_chunks_from_file(
    client: OpenSearch,
    index_name: str,
    working_dir: str,
    workspace: str = "",
) -> int:
    """Load chunk JSON file and index into OpenSearch (idempotent)."""
    base_dir = os.path.join(working_dir, workspace) if workspace else working_dir
    file_path = os.path.join(base_dir, "kv_store_text_chunks.json")
    data = load_json(file_path) or {}
    if not data:
        logger.warning(f"No chunk data found to index: {file_path}")
        return 0

    actions = []
    for chunk_id, chunk in data.items():
        source = {
            "content": chunk.get("content", ""),
            "file_path": chunk.get("file_path") or chunk.get("source_id", ""),
            "doc_id": chunk.get("full_doc_id", ""),
            "chunk_id": chunk_id,
            "chunk_order_index": chunk.get("chunk_order_index", 0),
            "metadata": {
                "source_type": chunk.get("source_type", ""),
                "create_time": chunk.get("create_time", 0),
                "update_time": chunk.get("update_time", 0),
            },
        }
        actions.append({"index": {"_index": index_name, "_id": chunk_id}})
        actions.append(source)

    if not actions:
        return 0

    # Use the bulk API; opensearch-py requires NDJSON body
    body = "\n".join(json.dumps(action, ensure_ascii=False) for action in actions) + "\n"
    resp = client.bulk(body=body, index=index_name, refresh=True)
    errors = resp.get("errors")
    items = len(resp.get("items", []))
    if errors:
        logger.warning(f"Bulk index completed with errors; items={items}")
    else:
        logger.info(f"Bulk indexed {items // 2} chunks into {index_name}")
    return items // 2


def search_bm25(
    client: OpenSearch,
    index_name: str,
    query: str,
    size: int,
    fields: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    body = {
        "size": size,
        "query": {
            "multi_match": {
                "query": query,
                "fields": fields or ["content"],
            }
        },
    }
    resp = client.search(index=index_name, body=body)
    return resp.get("hits", {}).get("hits", [])

