<template>
  <div class="app">
    <h1>LowCode CRUD Example</h1>
    
    <!-- Page Scope: List -->
    <a-card title="User List (Page Scope)" class="scope-card page-scope">
      <div slot="extra">
        <a-button type="primary" :loading="pageState.loading" @click="refreshList">
          Refresh List
        </a-button>
      </div>

      <a-table 
        :columns="columns" 
        :data-source="pageState.listData" 
        :loading="pageState.loading"
        row-key="id"
        bordered
      >
        <template slot="action" slot-scope="text, record">
          <a @click="handleEdit(record)">Edit</a>
        </template>
      </a-table>
    </a-card>

    <!-- Modal Scope: Edit Form -->
    <a-modal
      :visible="modalState.visible"
      :title="modalState.title"
      @cancel="handleCancel"
      @ok="handleSubmit"
      :confirmLoading="modalState.saving"
    >
      <a-form-model :model="modalState.formData" :label-col="{ span: 5 }" :wrapper-col="{ span: 16 }">
        <a-form-model-item label="Name">
          <a-input v-model="modalState.formData.name" />
        </a-form-model-item>
        <a-form-model-item label="Age">
          <a-input-number v-model="modalState.formData.age" />
        </a-form-model-item>
        <a-form-model-item label="Address">
          <a-textarea v-model="modalState.formData.address" />
        </a-form-model-item>
      </a-form-model>
      
      <div class="debug-info">
        <small>Current Scope ID: modal-user-edit (Parent: page-user-list)</small>
      </div>
    </a-modal>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { pageAdapter, modalAdapter } from './store'

const columns = [
  { title: 'ID', dataIndex: 'id', width: 80 },
  { title: 'Name', dataIndex: 'name' },
  { title: 'Age', dataIndex: 'age' },
  { title: 'Address', dataIndex: 'address' },
  { title: 'Action', scopedSlots: { customRender: 'action' } },
]

export default Vue.extend({
  data() {
    return {
      columns,
      // Reactive state from adapters
      pageState: pageAdapter.getSnapshot(),
      modalState: modalAdapter.getSnapshot(),
      
      unsubs: [] as Array<() => void>
    }
  },
  mounted() {
    // 1. Subscribe to Page Context
    this.unsubs.push(pageAdapter.subscribe(() => {
      this.pageState = { ...pageAdapter.getSnapshot() }
    }))
    
    // 2. Subscribe to Modal Context
    this.unsubs.push(modalAdapter.subscribe(() => {
      this.modalState = { ...modalAdapter.getSnapshot() }
    }))

    // Initial load
    this.refreshList()
  },
  beforeDestroy() {
    this.unsubs.forEach(u => u())
  },
  methods: {
    refreshList() {
      // Trigger action via lowcode evaluation
      pageAdapter.eval('fetchList()')
    },
    handleEdit(record: any) {
      // Pass data to modal context
      pageAdapter.eval('handleEdit(record)', { record })
    },
    handleCancel() {
      modalAdapter.eval('cancel()')
    },
    handleSubmit() {
      // Sync v-model changes back to store before submitting
      // (Since v-model mutates the local snapshot clone)
      modalAdapter.setValue('formData', this.modalState.formData)
      modalAdapter.eval('submitForm()')
    }
  }
})
</script>

<style scoped>
.app {
  padding: 24px;
  background: #f0f2f5;
  min-height: 100vh;
}

.scope-card {
  background: #fff;
  border-left: 5px solid #1890ff; /* Page Scope Color */
}

.debug-info {
  margin-top: 20px;
  padding: 10px;
  background: #fffbe6;
  border: 1px dashed #ffe58f;
  color: #d46b08;
}

/* AntDV Overrides */
.ant-table-wrapper {
  background: #fff;
}
</style>
