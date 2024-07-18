<!-- src/components/TaskManager.vue -->
<template>
  <div class="container mt-5">
    <h1 class="mb-4 text-center">JableTV Downloader</h1>
    <div class="input-group mb-3">
      <input v-model="url" class="form-control" @keyup.enter="addUrl" placeholder="Enter URL">
      <button @click="addUrl" class="btn btn-primary">Add</button>
    </div>
    <p v-if="urlError" class="text-danger">{{ urlError }}</p>
    <div class="table-responsive">
      <table class="table table-bordered">
        <thead class="thead-light">
          <tr>
            <th scope="col">#</th>
            <th scope="col">URL</th>
            <th scope="col">Created Date</th>
            <th scope="col">Status</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(taskId, index) in sortedTasks" :key="taskId">
            <th scope="row">{{ sortedTasks.length - index }}</th>
            <td class="text-break">
              <a :href="tasks[taskId].url" target="_blank">{{ tasks[taskId].url }}</a>
            </td>
            <td>{{ formatDate(tasks[taskId].createdAt) }}</td>
            <td>
              <span :class="getStatusBadgeClass(tasks[taskId].status)">{{ tasks[taskId].status }}</span>
            </td>
            <td>
              <button class="btn btn-link" @click="viewLogs(taskId)" title="View Logs">
                <i class="fas fa-terminal"></i>
              </button>
              <button class="btn btn-danger btn-sm" @click="confirmDelete(taskId)" title="Delete Task">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showLogs" class="modal" tabindex="-1" role="dialog" style="display: block;">
      <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Task Logs</h5>
            <button type="button" class="close" @click="closeLogs" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body">
            <pre class="logs-pre">{{ logs }}</pre>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeLogs">Close</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirm Delete Modal -->
    <div v-if="showDeleteConfirm" class="modal" tabindex="-1" role="dialog" style="display: block;">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Confirm Delete</h5>
            <button type="button" class="close" @click="closeDeleteConfirm" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to delete this task?</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeDeleteConfirm">Cancel</button>
            <button type="button" class="btn btn-danger" @click="deleteTaskConfirmed">Delete</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
export default {
  data() {
    return {
      url: '',
      tasks: {},
      showLogs: false,
      logs: '',
      apiUrl: process.env.VUE_APP_API_URL,
      urlError: '',
      showDeleteConfirm: false,
      taskIdToDelete: null,
      logUpdateInterval: null // 添加日志更新定时器
    };
  },
  computed: {
    sortedTasks() {
      return Object.keys(this.tasks)
        .sort((a, b) => new Date(this.tasks[b].createdAt) - new Date(this.tasks[a].createdAt));
    }
  },
  methods: {
    async addUrl() {
      this.urlError = '';
      this.url = this.url.trim();
      const urlPattern = /^https:\/\/jable\.tv\/videos\/[^/]+\/$/;
      if (!urlPattern.test(this.url)) {
        this.urlError = 'URL 格式不正确，请输入符合 https://jable.tv/videos/<番号>/ 格式的 URL';
        return;
      }

      if (this.url) {
        const response = await axios.post(`${this.apiUrl}/add_url`, { url: this.url });
        const taskId = response.data.taskId;
        this.tasks[taskId] = { url: this.url, status: '尚未开始', createdAt: new Date().toISOString() };
        this.url = '';
        this.updateTaskStatus();
      }
    },
    async updateTaskStatus() {
      const response = await axios.get(`${this.apiUrl}/task_status`);
      this.tasks = response.data;
      setTimeout(this.updateTaskStatus, 1000);
    },
    async viewLogs(taskId) {
      try {
        await this.fetchLogs(taskId);
        this.showLogs = true;
        this.$nextTick(this.scrollToBottom);
        window.addEventListener('keydown', this.handleKeyDown);
        // 设置定时器定期获取最新日志
        this.logUpdateInterval = setInterval(async () => {
          await this.fetchLogs(taskId);
        }, 1000);
      } catch (error) {
        console.error(`Error fetching logs for task ${taskId}:`, error);
      }
    },
    async fetchLogs(taskId) {
      try {
        const response = await axios.get(`${this.apiUrl}/task_logs/${taskId}`);
        this.logs = response.data.logs;
        // this.$nextTick(this.scrollToBottom);
      } catch (error) {
        console.error(`Error fetching logs for task ${taskId}:`, error);
      }
    },
    scrollToBottom() {
      const modalBody = this.$el.querySelector('.modal-body');
      if (modalBody) {
        console.log("Current scrollHeight: ", modalBody.scrollHeight);
        console.log("Current scrollTop: ", modalBody.scrollTop);
        modalBody.scrollTop = modalBody.scrollHeight;
        console.log("After setting scrollTop: ", modalBody.scrollTop);
      }
    },
    confirmDelete(taskId) {
      this.taskIdToDelete = taskId;
      this.showDeleteConfirm = true;
    },
    async deleteTaskConfirmed() {
      if (this.taskIdToDelete) {
        try {
          const response = await axios.delete(`${this.apiUrl}/task/${this.taskIdToDelete}`);
          if (response.status === 200) {
            this.$delete(this.tasks, this.taskIdToDelete);
          }
        } catch (error) {
          console.error(`Error deleting task ${this.taskIdToDelete}:`, error);
        }
      }
      this.closeDeleteConfirm();
    },
    closeDeleteConfirm() {
      this.taskIdToDelete = null;
      this.showDeleteConfirm = false;
    },
    closeLogs() {
      this.showLogs = false;
      this.logs = '';
      window.removeEventListener('keydown', this.handleKeyDown);
      // 清除日志更新定时器
      if (this.logUpdateInterval) {
        clearInterval(this.logUpdateInterval);
        this.logUpdateInterval = null;
      }
    },
    handleKeyDown(event) {
      if (event.key === 'Escape' && this.showLogs) {
        this.closeLogs();
      }
    },
    formatDate(dateString) {
      const date = new Date(dateString);

      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');

      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');

      return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
    },
    getStatusBadgeClass(status) {
      switch (status) {
        case '尚未开始':
          return 'badge bg-secondary';
        case '正在运行':
          return 'badge bg-warning';
        case '成功':
          return 'badge bg-success';
        case '失败':
          return 'badge bg-danger';
        default:
          return 'badge bg-secondary';
      }
    }
  },
  mounted() {
    this.updateTaskStatus();
    window.addEventListener('keydown', this.handleKeyDown);
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleKeyDown);
  }
};
</script>

<style scoped>
.container {
  max-width: 1200px;
}

.modal {
  background-color: rgba(0, 0, 0, 0.5);
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-dialog.modal-lg {
  max-width: 80%;
}

.modal-content {
  background: white;
  border-radius: 5px;
  overflow: hidden;
}

.modal-header .close {
  background: none;
  border: none;
  font-size: 1.5rem;
}

.modal-body {
  max-height: 70vh;
  overflow-y: auto;
}

.modal-body pre {
  white-space: pre-wrap;
  /* 自动换行 */
  word-wrap: break-word;
  /* 防止超长单词换行 */
  font-family: "Courier New", Courier, monospace;
}

p.text-danger {
  color: red;
}

/* 更改图标按钮尺寸 */
.btn-link i,
.btn-danger i {
  font-size: 1.2rem;
}

/* 为移动端设置字体大小和内边距 */
@media (max-width: 768px) {
  h1 {
    font-size: 1.5rem;
  }

  .btn {
    font-size: 0.875rem;
    padding: 0.5rem 0.75rem;
  }

  .table {
    font-size: 0.875rem;
  }

  .modal-dialog.modal-lg {
    max-width: 100%;
  }
}
</style>