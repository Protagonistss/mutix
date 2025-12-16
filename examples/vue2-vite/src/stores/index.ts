import { createStore, ContextManager, createLowCodeAdapter } from 'mutix'

// --- Global Managers ---
export const manager = new ContextManager()

// --- Mock API Data ---
const mockUsers = [
  { id: 1, name: 'John Brown', age: 32, address: 'New York No. 1 Lake Park' },
  { id: 2, name: 'Jim Green', age: 42, address: 'London No. 1 Lake Park' },
  { id: 3, name: 'Joe Black', age: 32, address: 'Sidney No. 1 Lake Park' }
]

// --- 1. Page Scope: User List ---
// Represents the list page context
const PAGE_ID = Symbol('page-user-list')

manager.createContext(PAGE_ID, {
  listData: [...mockUsers],
  loading: false,
  total: 3
})

export const pageAdapter = createLowCodeAdapter(manager, PAGE_ID, {
  externals: {
    // Expose API capability to the context
    fetchList: () => {
      pageAdapter.setValue('loading', true)
      setTimeout(() => {
        // Reset to initial mock data for demo purposes
        // In real app, this would fetch from server
        pageAdapter.setValue('listData', [...mockUsers])
        pageAdapter.setValue('loading', false)
      }, 500)
    },
    // Action to handle edit click
    handleEdit: (record: any) => {
      // Initialize modal scope with record data
      modalAdapter.setValue('formData', { ...record })
      modalAdapter.setValue('visible', true)
      modalAdapter.setValue('title', `Edit User: ${record.name}`)
    }
  }
})

// --- 2. Modal Scope: User Edit ---
// Represents the modal context, inherits from Page
const MODAL_ID = Symbol('modal-user-edit')

manager.createContext(MODAL_ID, {
  visible: false,
  title: 'Edit User',
  formData: { id: 0, name: '', age: 0, address: '' },
  saving: false
}, PAGE_ID)

export const modalAdapter = createLowCodeAdapter(manager, MODAL_ID, {
  externals: {
    // Action to submit form
    submitForm: () => {
      const data = modalAdapter.getValue('formData')
      modalAdapter.setValue('saving', true)
      
      setTimeout(() => {
        console.log('Saving data:', data)
        // Update mock data locally
        const idx = mockUsers.findIndex(u => u.id === data.id)
        if (idx > -1) mockUsers[idx] = data
        
        modalAdapter.setValue('saving', false)
        modalAdapter.setValue('visible', false)
        
        // Refresh parent list
        // Note: In lowcode, this might be `ctx.parent.eval('fetchList()')`
        pageAdapter.eval('fetchList()')
        
      }, 1000)
    },
    // Action to cancel
    cancel: () => {
      modalAdapter.setValue('visible', false)
    }
  }
})
