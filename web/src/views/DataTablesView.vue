<template>
  <div class="data-tables-view">
    <a-card :bordered="false">
      <!-- 工具栏 -->
      <div class="toolbar">
        <a-space>
          <a-button type="primary" @click="showImportModal">
            <template #icon><PlusOutlined /></template>
            导入 Excel/CSV
          </a-button>
          <a-button @click="loadTables">
            <template #icon><ReloadOutlined /></template>
            刷新
          </a-button>
        </a-space>
      </div>

      <!-- 表列表 -->
      <a-table
        :columns="columns"
        :data-source="tables"
        :loading="loading"
        :pagination="false"
        row-key="name"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <a @click="viewTable(record.name)">{{ record.name }}</a>
          </template>

          <template v-else-if="column.key === 'row_count'">
            {{ record.row_count.toLocaleString() }}
          </template>

          <template v-else-if="column.key === 'columns'">
            <a-space :size="[0, 8]" wrap>
              <a-tag v-for="col in record.columns" :key="col">{{ col }}</a-tag>
            </a-space>
          </template>

          <template v-else-if="column.key === 'create_time'">
            {{ record.create_time ? formatDate(record.create_time) : '-' }}
          </template>

          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="viewTable(record.name)">
                查看
              </a-button>
              <a-button type="link" size="small" danger @click="confirmDelete(record.name)">
                删除
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 导入弹窗 -->
    <ImportModal
      v-model:visible="importModalVisible"
      @success="handleImportSuccess"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { mysqlApi } from '@/apis/knowledge_api'
import { useRouter } from 'vue-router'
import ImportModal from '@/components/mysql/ImportModal.vue'

const router = useRouter()

// 数据
const tables = ref([])
const loading = ref(false)
const importModalVisible = ref(false)

// 表格列定义
const columns = [
  {
    title: '表名',
    dataIndex: 'name',
    key: 'name'
  },
  {
    title: '行数',
    dataIndex: 'row_count',
    key: 'row_count'
  },
  {
    title: '列数',
    dataIndex: 'column_count',
    key: 'column_count'
  },
  {
    title: '列名',
    dataIndex: 'columns',
    key: 'columns'
  },
  {
    title: '创建时间',
    dataIndex: 'create_time',
    key: 'create_time'
  },
  {
    title: '操作',
    key: 'action',
    width: 150
  }
]

// 加载表列表
const loadTables = async () => {
  loading.value = true
  try {
    const response = await mysqlApi.getTables()
    tables.value = response.tables || []
  } catch (error) {
    message.error('获取表列表失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 查看表详情
const viewTable = (tableName) => {
  router.push(`/data-tables/${tableName}`)
}

// 显示导入弹窗
const showImportModal = () => {
  importModalVisible.value = true
}

// 导入成功回调
const handleImportSuccess = () => {
  loadTables()
}

// 确认删除
const confirmDelete = (tableName) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除表 "${tableName}" 吗？此操作不可恢复！`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      try {
        await mysqlApi.deleteTable(tableName)
        message.success('删除成功')
        loadTables()
      } catch (error) {
        message.error('删除失败')
        console.error(error)
      }
    }
  })
}

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

// 初始化
onMounted(() => {
  loadTables()
})
</script>

<style scoped>
.data-tables-view {
  padding: 20px;
}

.toolbar {
  margin-bottom: 16px;
}

.data-tables-view :deep(.ant-table) .ant-tag {
  margin: 2px;
}
</style>
