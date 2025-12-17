<template>
  <a-modal
    v-model:open="visible"
    title="导入 Excel/CSV 到 MySQL"
    :width="1000"
    :footer="null"
    @cancel="handleCancel"
  >
    <!-- 步骤条 -->
    <a-steps :current="currentStep" style="margin-bottom: 24px">
      <a-step title="上传文件" />
      <a-step title="预览数据" />
      <a-step title="配置并导入" />
    </a-steps>

    <!-- 步骤 1: 上传文件 -->
    <div v-if="currentStep === 0">
      <a-upload-dragger
        v-model:file-list="fileList"
        :before-upload="handleBeforeUpload"
        :max-count="1"
        accept=".csv,.xlsx,.xls"
        @change="handleFileChange"
      >
        <p class="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p class="ant-upload-text">点击或拖拽文件到此区域上传</p>
        <p class="ant-upload-hint">支持 CSV、Excel (.xlsx, .xls) 格式</p>
      </a-upload-dragger>
    </div>

    <!-- 步骤 2: 预览数据并配置 -->
    <div v-if="currentStep === 1 && previewData">
      <a-space direction="vertical" style="width: 100%" :size="16">
        <!-- 文件信息 -->
        <a-descriptions bordered size="small" :column="3">
          <a-descriptions-item label="文件名">{{ previewData.filename }}</a-descriptions-item>
          <a-descriptions-item label="总行数">{{ previewData.total_rows }}</a-descriptions-item>
          <a-descriptions-item label="总列数">{{ previewData.total_columns }}</a-descriptions-item>
        </a-descriptions>

        <!-- 数据预览 -->
        <a-table
          :columns="previewColumns"
          :data-source="previewData.data"
          :scroll="{ x: true, y: 400 }"
          :pagination="{ pageSize: 50 }"
          size="small"
        />

        <!-- 导入配置 -->
        <a-form layout="vertical">
          <a-form-item label="表名" required>
            <a-input
              v-model:value="tableName"
              placeholder="输入表名（支持中文、字母、数字、下划线、短横线）"
              :rules="[{ required: true, pattern: /^[\u4e00-\u9fa5a-zA-Z0-9_-]+$/, message: '表名支持中文、字母、数字、下划线、短横线' }]"
            />
          </a-form-item>

          <a-form-item>
            <a-checkbox v-model:checked="dropIfExists">
              如果表已存在则覆盖
            </a-checkbox>
          </a-form-item>
        </a-form>

        <!-- 操作按钮 -->
        <div style="text-align: right">
          <a-space>
            <a-button @click="currentStep = 0">上一步</a-button>
            <a-button
              type="primary"
              :loading="importing"
              :disabled="!tableName"
              @click="handleImport"
            >
              导入到 MySQL
            </a-button>
          </a-space>
        </div>
      </a-space>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" style="text-align: center; padding: 40px">
      <a-spin tip="正在处理文件...">
        <div style="padding: 50px"></div>
      </a-spin>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import { InboxOutlined } from '@ant-design/icons-vue'
import { mysqlApi, fileApi } from '@/apis/knowledge_api'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'success'])

// 数据
const currentStep = ref(0)
const fileList = ref([])
const file = ref(null)
const previewData = ref(null)
const tableName = ref('')
const dropIfExists = ref(false)
const loading = ref(false)
const importing = ref(false)

// 计算属性
const visible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const previewColumns = computed(() => {
  if (!previewData.value) return []
  return previewData.value.columns.map(col => ({
    title: col.name,
    dataIndex: col.name,
    key: col.name,
    ellipsis: true
  }))
})

// 监听 visible 变化，重置状态
watch(visible, (newVal) => {
  if (!newVal) {
    resetState()
  }
})

// 重置状态
const resetState = () => {
  currentStep.value = 0
  fileList.value = []
  file.value = null
  previewData.value = null
  tableName.value = ''
  dropIfExists.value = false
  loading.value = false
  importing.value = false
}

// 上传前处理
const handleBeforeUpload = () => {
  return false // 阻止自动上传
}

// 文件变化处理
const handleFileChange = async (info) => {
  // Ant Design Vue 的 Upload 组件将原始文件包装在 originFileObj 中
  const selectedFile = info.file.originFileObj || info.file
  if (!selectedFile) return

  console.log('==== 文件信息 ====')
  console.log('info.file:', info.file)
  console.log('info.file.originFileObj:', info.file.originFileObj)
  console.log('selectedFile:', selectedFile)
  console.log('selectedFile type:', typeof selectedFile)
  console.log('selectedFile instanceof File:', selectedFile instanceof File)
  console.log('selectedFile instanceof Blob:', selectedFile instanceof Blob)
  console.log('selectedFile.name:', selectedFile.name)
  console.log('selectedFile.size:', selectedFile.size)

  file.value = selectedFile
  loading.value = true

  try {
    // 预览文件
    const data = await mysqlApi.previewFile(selectedFile)
    previewData.value = data

    // 自动设置表名（去除扩展名和特殊字符）
    // 支持中文、字母、数字、下划线、短横线
    // 过滤掉空格、斜杠、反斜杠、点号等特殊字符
    const name = selectedFile.name
      .replace(/\.(csv|xlsx|xls)$/i, '')
      .replace(/[\s\/\\\.,:;!@#$%^&*()+={}\[\]|<>?~`'"]/g, '_')
      .replace(/_+/g, '_')  // 将连续的下划线替换为单个下划线
      .replace(/^_|_$/g, '')  // 去除首尾的下划线
    tableName.value = name

    currentStep.value = 1
  } catch (error) {
    console.error('==== 完整错误对象 ====')
    console.error(error)
    console.error('==== 错误消息 ====')
    console.error(error.message)
    console.error('==== 错误字符串 ====')
    console.error(String(error))

    // 直接显示错误消息
    const errorMsg = '预览文件失败: ' + (error.message || String(error))
    message.error(errorMsg)
  } finally {
    loading.value = false
  }
}

// 导入到 MySQL
const handleImport = async () => {
  if (!file.value || !tableName.value) {
    message.warning('请完成所有步骤')
    return
  }

  // 验证表名（支持中文、字母、数字、下划线、短横线）
  if (!/^[\u4e00-\u9fa5a-zA-Z0-9_-]+$/.test(tableName.value)) {
    message.error('表名支持中文、字母、数字、下划线、短横线')
    return
  }

  importing.value = true
  try {
    // 先上传文件
    const uploadRes = await fileApi.uploadFile(file.value)
    const filePath = uploadRes.file_path

    // 导入到 MySQL
    await mysqlApi.importToMySQL({
      file_path: filePath,
      table_name: tableName.value,
      create_table: true,
      drop_if_exists: dropIfExists.value
    })

    message.success('导入成功')
    visible.value = false
    emit('success')
  } catch (error) {
    message.error('导入失败: ' + (error.response?.data?.detail || error.message))
    console.error(error)
  } finally {
    importing.value = false
  }
}

// 取消
const handleCancel = () => {
  visible.value = false
}
</script>

<style scoped>
.ant-upload-drag-icon {
  font-size: 48px;
  color: #1890ff;
}
</style>
