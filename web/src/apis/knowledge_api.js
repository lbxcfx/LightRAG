import { apiAdminGet, apiAdminPost, apiAdminPut, apiAdminDelete } from './base'

/**
 * 知识库管理API模块
 * 包含数据库管理、文档管理、查询接口等功能
 */

// =============================================================================
// === 数据库管理分组 ===
// =============================================================================

export const databaseApi = {
  /**
   * 获取所有知识库
   * @returns {Promise} - 知识库列表
   */
  getDatabases: async () => {
    return apiAdminGet('/api/knowledge/databases')
  },

  /**
   * 创建知识库
   * @param {Object} databaseData - 知识库数据
   * @returns {Promise} - 创建结果
   */
  createDatabase: async (databaseData) => {
    return apiAdminPost('/api/knowledge/databases', databaseData)
  },

  /**
   * 获取知识库详细信息
   * @param {string} dbId - 知识库ID
   * @returns {Promise} - 知识库信息
   */
  getDatabaseInfo: async (dbId) => {
    return apiAdminGet(`/api/knowledge/databases/${dbId}`)
  },

  /**
   * 更新知识库信息
   * @param {string} dbId - 知识库ID
   * @param {Object} updateData - 更新数据
   * @returns {Promise} - 更新结果
   */
  updateDatabase: async (dbId, updateData) => {
    return apiAdminPut(`/api/knowledge/databases/${dbId}`, updateData)
  },

  /**
   * 删除知识库
   * @param {string} dbId - 知识库ID
   * @returns {Promise} - 删除结果
   */
  deleteDatabase: async (dbId) => {
    return apiAdminDelete(`/api/knowledge/databases/${dbId}`)
  }
}

// =============================================================================
// === 文档管理分组 ===
// =============================================================================

export const documentApi = {
  /**
   * 添加文档到知识库
   * @param {string} dbId - 知识库ID
   * @param {Array} items - 文档列表
   * @param {Object} params - 处理参数
   * @returns {Promise} - 添加结果
   */
  addDocuments: async (dbId, items, params = {}) => {
    return apiAdminPost(`/api/knowledge/databases/${dbId}/documents`, {
      items,
      params
    })
  },

  /**
   * 获取文档信息
   * @param {string} dbId - 知识库ID
   * @param {string} docId - 文档ID
   * @returns {Promise} - 文档信息
   */
  getDocumentInfo: async (dbId, docId) => {
    return apiAdminGet(`/api/knowledge/databases/${dbId}/documents/${docId}`)
  },

  /**
   * 删除文档
   * @param {string} dbId - 知识库ID
   * @param {string} docId - 文档ID
   * @returns {Promise} - 删除结果
   */
  deleteDocument: async (dbId, docId) => {
    return apiAdminDelete(`/api/knowledge/databases/${dbId}/documents/${docId}`)
  },

  /**
   * 下载文档
   * @param {string} dbId - 知识库ID
   * @param {string} docId - 文档ID
   * @returns {Promise} - Response对象
   */
  downloadDocument: async (dbId, docId) => {
    return apiAdminGet(`/api/knowledge/databases/${dbId}/documents/${docId}/download`, {}, 'blob')
  }
}

// =============================================================================
// === 查询分组 ===
// =============================================================================

export const queryApi = {
  /**
   * 查询知识库
   * @param {string} dbId - 知识库ID
   * @param {string} query - 查询文本
   * @param {Object} meta - 查询参数
   * @returns {Promise} - 查询结果
   */
  queryKnowledgeBase: async (dbId, query, meta = {}) => {
    return apiAdminPost(`/api/knowledge/databases/${dbId}/query`, {
      query,
      meta
    })
  },

  /**
   * 测试查询知识库
   * @param {string} dbId - 知识库ID
   * @param {string} query - 查询文本
   * @param {Object} meta - 查询参数
   * @returns {Promise} - 测试结果
   */
  queryTest: async (dbId, query, meta = {}) => {
    return apiAdminPost(`/api/knowledge/databases/${dbId}/query-test`, {
      query,
      meta
    })
  },

  /**
   * 获取知识库查询参数
   * @param {string} dbId - 知识库ID
   * @returns {Promise} - 查询参数
   */
  getKnowledgeBaseQueryParams: async (dbId) => {
    return apiAdminGet(`/api/knowledge/databases/${dbId}/query-params`)
  }
}

// =============================================================================
// === 文件管理分组 ===
// =============================================================================

export const fileApi = {
  /**
   * 上传文件
   * @param {File} file - 文件对象
   * @param {string} dbId - 知识库ID（可选）
   * @returns {Promise} - 上传结果
   */
  uploadFile: async (file, dbId = null) => {
    const formData = new FormData()
    formData.append('file', file)

    const url = dbId
      ? `/api/knowledge/files/upload?db_id=${dbId}`
      : '/api/knowledge/files/upload'

    // 不要手动设置 Content-Type，让浏览器自动设置 multipart/form-data 和 boundary
    return apiAdminPost(url, formData)
  },

  /**
   * 获取支持的文件类型
   * @returns {Promise} - 文件类型列表
   */
  getSupportedFileTypes: async () => {
    return apiAdminGet('/api/knowledge/files/supported-types')
  }
}

// =============================================================================
// === 知识库类型分组 ===
// =============================================================================

export const typeApi = {
  /**
   * 获取支持的知识库类型
   * @returns {Promise} - 知识库类型列表
   */
  getKnowledgeBaseTypes: async () => {
    return apiAdminGet('/api/knowledge/types')
  },

  /**
   * 获取知识库统计信息
   * @returns {Promise} - 统计信息
   */
  getStatistics: async () => {
    return apiAdminGet('/api/knowledge/stats')
  }
}

// =============================================================================
// === Embedding模型状态检查分组 ===
// =============================================================================

export const embeddingApi = {
  /**
   * 获取指定embedding模型的状态
   * @param {string} modelId - 模型ID
   * @returns {Promise} - 模型状态
   */
  getModelStatus: async (modelId) => {
    return apiAdminGet(`/api/knowledge/embedding-models/${modelId}/status`)
  },

  /**
   * 获取所有embedding模型的状态
   * @returns {Promise} - 所有模型状态
   */
  getAllModelsStatus: async () => {
    return apiAdminGet('/api/knowledge/embedding-models/status')
  }
}

// =============================================================================
// === MySQL 数据表管理分组 ===
// =============================================================================

export const mysqlApi = {
  /**
   * 获取所有 MySQL 表
   * @returns {Promise} - 表列表
   */
  getTables: async () => {
    return apiAdminGet('/api/knowledge/mysql/tables')
  },

  /**
   * 获取表详细信息
   * @param {string} tableName - 表名
   * @returns {Promise} - 表详细信息
   */
  getTableInfo: async (tableName) => {
    return apiAdminGet(`/api/knowledge/mysql/tables/${tableName}`)
  },

  /**
   * 获取表数据（分页）
   * @param {string} tableName - 表名
   * @param {number} offset - 偏移量
   * @param {number} limit - 限制数量
   * @returns {Promise} - 表数据
   */
  getTableData: async (tableName, offset = 0, limit = 100) => {
    return apiAdminGet(`/api/knowledge/mysql/tables/${tableName}/data`, {
      params: { offset, limit }
    })
  },

  /**
   * 删除表
   * @param {string} tableName - 表名
   * @returns {Promise} - 删除结果
   */
  deleteTable: async (tableName) => {
    return apiAdminDelete(`/api/knowledge/mysql/tables/${tableName}`)
  },

  /**
   * 预览 Excel/CSV 文件
   * @param {File} file - 文件对象
   * @returns {Promise} - 预览数据
   */
  previewFile: async (file) => {
    console.log('==== previewFile 调用 ====')
    console.log('file 参数:', file)
    console.log('file instanceof File:', file instanceof File)

    const formData = new FormData()
    formData.append('file', file)

    console.log('FormData 内容:')
    for (let pair of formData.entries()) {
      console.log(pair[0], pair[1])
    }

    // 不要手动设置 Content-Type，让浏览器自动设置 multipart/form-data 和 boundary
    return apiAdminPost('/api/knowledge/mysql/preview', formData)
  },

  /**
   * 导入文件到 MySQL
   * @param {Object} options - 导入选项
   * @returns {Promise} - 导入结果
   */
  importToMySQL: async (options) => {
    return apiAdminPost('/api/knowledge/mysql/import', options)
  }
}
