<template>
  <div v-if="sources.length > 0" class="knowledge-sources-tag">
    <!-- 折叠状态：只显示来源标签 -->
    <div class="sources-header" @click="toggleExpand" :class="{ expanded: isExpanded }">
      <div class="sources-summary">
        <FileTextOutlined class="icon" />
        <span class="text">来源：{{ sources.length }} 个文档</span>
        <DownOutlined :class="{ 'icon-rotate': isExpanded }" class="expand-icon" />
      </div>
    </div>

    <!-- 展开状态：显示详细信息 -->
    <div v-if="isExpanded" class="sources-details">
      <div
        v-for="(source, index) in sources"
        :key="index"
        class="source-item"
        @click="showSourceDetail(source, index)"
      >
        <div class="source-summary">
          <FileImageOutlined v-if="isImageFile(source.metadata?.file_type)" class="file-icon image-icon" />
          <FileOutlined v-else class="file-icon" />
          <span class="source-name">{{ source.metadata.source || '未知文档' }}</span>
          <span class="source-score">相似度: {{ (source.score * 100).toFixed(0) }}%</span>
          <EyeOutlined class="view-icon" />
        </div>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <a-modal
      v-model:open="modalVisible"
      :title="`来源 #${selectedSource?.index + 1} - ${selectedSource?.data?.metadata?.source}`"
      width="700px"
      :footer="null"
      class="source-detail-modal"
    >
      <div v-if="selectedSource" class="source-detail">
        <div class="detail-header">
          <div class="score-info">
            <div class="score-label">相似度分数</div>
            <div class="score-value">{{ (selectedSource.data.score * 100).toFixed(1) }}%</div>
            <a-progress
              :percent="getPercent(selectedSource.data.score)"
              :stroke-color="getScoreColor(selectedSource.data.score)"
              :show-info="false"
              :stroke-width="6"
            />
          </div>
          <div v-if="selectedSource.data.rerank_score" class="score-info">
            <div class="score-label">重排序分数</div>
            <div class="score-value">{{ (selectedSource.data.rerank_score * 100).toFixed(1) }}%</div>
            <a-progress
              :percent="getPercent(selectedSource.data.rerank_score)"
              :stroke-color="getScoreColor(selectedSource.data.rerank_score)"
              :show-info="false"
              :stroke-width="6"
            />
          </div>
        </div>

        <div class="detail-content">
          <h5>文档内容</h5>
          <!-- 如果是图片文件，显示图片预览 -->
          <div v-if="isImageFile(selectedSource.data.metadata?.file_type)" class="image-preview">
            <img
              :src="getPreviewUrl(selectedSource.data.metadata)"
              :alt="selectedSource.data.metadata?.source"
              @error="handleImageError"
            />
          </div>
          <div class="content-text">{{ selectedSource.data.content }}</div>
        </div>

        <div v-if="selectedSource.data.metadata" class="detail-metadata">
          <h5>元数据</h5>
          <div class="metadata-list">
            <div v-for="(value, key) in selectedSource.data.metadata" :key="key" class="metadata-item">
              <span class="metadata-key">{{ key }}:</span>
              <span class="metadata-value">{{ value }}</span>
            </div>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { FileTextOutlined, FileOutlined, FileImageOutlined, DownOutlined, EyeOutlined } from '@ant-design/icons-vue'

const props = defineProps({
  sources: {
    type: Array,
    default: () => []
  }
})

const isExpanded = ref(false)
const modalVisible = ref(false)
const selectedSource = ref(null)

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}

const showSourceDetail = (source, index) => {
  selectedSource.value = {
    data: source,
    index: index
  }
  modalVisible.value = true

  // 调试日志
  console.log('==== Source Detail ====')
  console.log('Source:', source)
  console.log('Metadata:', source.metadata)
  console.log('File Type:', source.metadata?.file_type)
  console.log('Is Image?:', isImageFile(source.metadata?.file_type))
  console.log('Preview URL:', getPreviewUrl(source.metadata))
  console.log('======================')
}

const getPercent = (score) => {
  if (score <= 1) {
    return Math.round(score * 100)
  }
  return Math.min(Math.round(score * 100), 100)
}

const getScoreColor = (score) => {
  if (score >= 0.7) return '#52c41a'  // 绿色 - 高相关性
  if (score >= 0.5) return '#faad14'  // 橙色 - 中等相关性
  return '#ff4d4f'  // 红色 - 低相关性
}

const isImageFile = (fileType) => {
  const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'tif']
  return imageTypes.includes(fileType?.toLowerCase())
}

const getPreviewUrl = (metadata) => {
  if (!metadata?.file_id) return ''

  // 从 file_path 中提取 db_id
  // file_path 格式: saves/knowledge_base_data/chroma_data/kb_xxx/uploads/file.jpg
  // 或者: knowledge_base_data/milvus_data/kb_xxx/uploads/file.jpg
  const filePath = metadata.file_path || ''
  const dbIdMatch = filePath.match(/kb_[a-f0-9]+/)
  const dbId = dbIdMatch ? dbIdMatch[0] : ''

  if (!dbId) {
    console.warn('Could not extract db_id from path:', filePath)
    return ''
  }

  const url = `/api/knowledge/databases/${dbId}/documents/${metadata.file_id}/preview`
  console.log('Preview URL:', url, 'for file:', metadata.source)
  return url
}

const handleImageError = (event) => {
  console.error('Failed to load image:', event.target.src)
  event.target.style.display = 'none'
}
</script>

<style lang="less" scoped>
.knowledge-sources-tag {
  margin-top: 12px;
  background: var(--gray-10);
  border: 1px solid var(--gray-150);
  border-radius: 8px;
  overflow: hidden;

  .sources-header {
    padding: 8px 12px;
    cursor: pointer;
    transition: background 0.2s ease;

    &:hover {
      background: var(--gray-25);
    }

    &.expanded {
      background: var(--gray-25);
      border-bottom: 1px solid var(--gray-150);
    }

    .sources-summary {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--gray-700);

      .icon {
        color: var(--main-color);
        font-size: 14px;
      }

      .text {
        flex: 1;
        font-weight: 500;
      }

      .expand-icon {
        color: var(--gray-400);
        font-size: 12px;
        transition: transform 0.2s ease;

        &.icon-rotate {
          transform: rotate(180deg);
        }
      }
    }
  }

  .sources-details {
    padding: 4px;
    background: var(--gray-0);
  }

  .source-item {
    padding: 8px 10px;
    margin: 2px 0;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: var(--gray-25);

      .view-icon {
        opacity: 1;
      }
    }

    .source-summary {
      display: flex;
      align-items: center;
      gap: 8px;

      .file-icon {
        color: var(--gray-500);
        font-size: 12px;

        &.image-icon {
          color: var(--main-color);
        }
      }

      .source-name {
        flex: 1;
        font-size: 12px;
        color: var(--gray-700);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .source-score {
        font-size: 11px;
        color: var(--gray-600);
        background: var(--gray-25);
        padding: 2px 6px;
        border-radius: 4px;
        border: 1px solid var(--gray-100);
        white-space: nowrap;
      }

      .view-icon {
        color: var(--gray-400);
        font-size: 12px;
        opacity: 0.5;
        transition: opacity 0.2s ease;
      }
    }
  }
}

:deep(.source-detail-modal) {
  .ant-modal-header {
    border-bottom: 1px solid var(--gray-200);
  }

  .ant-modal-title {
    color: var(--main-color);
    font-weight: 500;
    font-size: 14px;
  }
}

.source-detail {
  .detail-header {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;

    .score-info {
      flex: 1;
      padding: 12px;
      background: var(--gray-25);
      border-radius: 8px;
      border: 1px solid var(--gray-150);

      .score-label {
        font-size: 12px;
        color: var(--gray-500);
        margin-bottom: 6px;
      }

      .score-value {
        font-size: 18px;
        font-weight: 600;
        color: var(--gray-800);
        margin-bottom: 8px;
      }
    }
  }

  .detail-content {
    margin-bottom: 16px;

    h5 {
      margin: 0 0 8px 0;
      color: var(--gray-800);
      font-size: 14px;
      font-weight: 500;
    }

    .image-preview {
      margin-bottom: 12px;
      display: flex;
      justify-content: center;
      align-items: center;
      background: var(--gray-25);
      border: 1px solid var(--gray-150);
      border-radius: 6px;
      padding: 12px;
      max-height: 400px;
      overflow: hidden;

      img {
        max-width: 100%;
        max-height: 380px;
        object-fit: contain;
        border-radius: 4px;
      }
    }

    .content-text {
      font-size: 13px;
      line-height: 1.6;
      color: var(--gray-700);
      white-space: pre-wrap;
      word-break: break-word;
      background: var(--gray-25);
      padding: 12px;
      border-radius: 6px;
      border: 1px solid var(--gray-150);
      max-height: 300px;
      overflow-y: auto;
    }
  }

  .detail-metadata {
    h5 {
      margin: 0 0 8px 0;
      color: var(--gray-800);
      font-size: 14px;
      font-weight: 500;
    }

    .metadata-list {
      background: var(--gray-25);
      padding: 12px;
      border-radius: 6px;
      border: 1px solid var(--gray-150);

      .metadata-item {
        padding: 4px 0;
        font-size: 12px;
        display: flex;
        gap: 8px;

        .metadata-key {
          color: var(--gray-600);
          font-weight: 500;
          min-width: 80px;
        }

        .metadata-value {
          color: var(--gray-700);
          flex: 1;
          word-break: break-all;
        }
      }
    }
  }
}
</style>
