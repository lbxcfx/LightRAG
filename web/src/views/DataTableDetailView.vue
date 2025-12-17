<template>
  <div class="table-detail-view">
    <a-card :bordered="false">
      <!-- 返回按钮 -->
      <a-button @click="goBack" style="margin-bottom: 16px">
        <template #icon><ArrowLeftOutlined /></template>
        返回列表
      </a-button>

      <!-- 表信息 -->
      <a-card :title="`表: ${tableName}`" :loading="loading">
        <!-- 表统计信息 -->
        <a-descriptions v-if="tableInfo" bordered size="small" :column="3">
          <a-descriptions-item label="行数">
            {{ tableInfo.row_count.toLocaleString() }}
          </a-descriptions-item>
          <a-descriptions-item label="列数">
            {{ tableInfo.column_count }}
          </a-descriptions-item>
          <a-descriptions-item label="引擎">
            {{ tableInfo.engine }}
          </a-descriptions-item>
          <a-descriptions-item label="字符集">
            {{ tableInfo.collation }}
          </a-descriptions-item>
          <a-descriptions-item label="创建时间" :span="2">
            {{ tableInfo.create_time ? formatDate(tableInfo.create_time) : '-' }}
          </a-descriptions-item>
        </a-descriptions>

        <!-- 标签页 -->
        <a-tabs default-active-key="data" style="margin-top: 16px">
          <!-- 数据预览标签 -->
          <a-tab-pane key="data" tab="数据预览">
            <a-table
              :columns="dataColumns"
              :data-source="tableData?.data || []"
              :loading="dataLoading"
              :scroll="{ x: true }"
              :pagination="pagination"
              size="small"
              @change="handleTableChange"
            />
          </a-tab-pane>

          <!-- 表结构标签 -->
          <a-tab-pane key="structure" tab="表结构">
            <a-table
              :columns="structureColumns"
              :data-source="tableInfo?.columns || []"
              :pagination="false"
              size="small"
              row-key="name"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'null'">
                  {{ record.null ? '是' : '否' }}
                </template>

                <template v-else-if="column.key === 'key'">
                  <a-tag v-if="record.key" color="blue">{{ record.key }}</a-tag>
                </template>
              </template>
            </a-table>
          </a-tab-pane>
        </a-tabs>
      </a-card>
    </a-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import { mysqlApi } from '@/apis/knowledge_api'

const route = useRoute()
const router = useRouter()

// 数据
const tableName = ref(route.params.tableName)
const tableInfo = ref(null)
const tableData = ref(null)
const loading = ref(false)
const dataLoading = ref(false)
const currentPage = ref(1)
const pageSize = ref(100)

// 表结构列定义
const structureColumns = [
  { title: '列名', dataIndex: 'name', key: 'name' },
  { title: '类型', dataIndex: 'type', key: 'type' },
  { title: '允许NULL', dataIndex: 'null', key: 'null' },
  { title: '键', dataIndex: 'key', key: 'key' },
  { title: '默认值', dataIndex: 'default', key: 'default' },
  { title: '额外', dataIndex: 'extra', key: 'extra' }
]

// 数据列（动态生成）
const dataColumns = computed(() => {
  if (!tableData.value) return []
  return tableData.value.columns.map(col => ({
    title: col,
    dataIndex: col,
    key: col,
    ellipsis: true
  }))
})

// 分页配置
const pagination = computed(() => ({
  current: currentPage.value,
  pageSize: pageSize.value,
  total: tableData.value?.total || 0,
  showTotal: (total) => `共 ${total.toLocaleString()} 行`,
  showSizeChanger: true,
  pageSizeOptions: ['50', '100', '200', '500']
}))

// 加载表信息
const loadTableInfo = async () => {
  loading.value = true
  try {
    const info = await mysqlApi.getTableInfo(tableName.value)
    tableInfo.value = info
  } catch (error) {
    message.error('获取表信息失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 加载表数据
const loadTableData = async (page = 1, size = pageSize.value) => {
  dataLoading.value = true
  try {
    const offset = (page - 1) * size
    const data = await mysqlApi.getTableData(tableName.value, offset, size)
    tableData.value = data
    currentPage.value = page
    pageSize.value = size
  } catch (error) {
    message.error('获取表数据失败')
    console.error(error)
  } finally {
    dataLoading.value = false
  }
}

// 表格变化处理
const handleTableChange = (pag) => {
  loadTableData(pag.current, pag.pageSize)
}

// 返回列表
const goBack = () => {
  router.push('/data-tables')
}

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

// 初始化
onMounted(() => {
  loadTableInfo()
  loadTableData()
})
</script>

<style scoped>
.table-detail-view {
  padding: 20px;
}
</style>
