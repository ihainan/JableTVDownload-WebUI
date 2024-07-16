const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { exec } = require('child_process');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// 初始化数据库
const dbPath = path.join(__dirname, "../db/tasks.db");
console.log("doPath = " + dbPath);
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to open database', err);
  } else {
    console.log('Connected to the tasks database.');
  }
});

// 创建 tasks 表
db.run(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    url TEXT,
    status TEXT,
    createdAt TEXT,
    logs TEXT
  )
`);

const addTask = (url) => {
  const taskId = Date.now().toString();
  const createdAt = new Date().toISOString();
  db.run(
    'INSERT INTO tasks (id, url, status, createdAt, logs) VALUES (?, ?, ?, ?, ?)',
    [taskId, url, '尚未开始', createdAt, '']
  );
  return taskId;
};

const getTaskStatus = (callback) => {
  db.all('SELECT id, url, status, createdAt FROM tasks', [], (err, rows) => {
    if (err) {
      console.error('Failed to fetch tasks', err);
      callback({});
    } else {
      const taskStatus = {};
      rows.forEach((row) => {
        taskStatus[row.id] = {
          url: row.url,
          status: row.status,
          createdAt: row.createdAt
        };
      });
      callback(taskStatus);
    }
  });
};

const getTaskLogs = (taskId, callback) => {
  db.get('SELECT logs FROM tasks WHERE id = ?', [taskId], (err, row) => {
    if (err) {
      console.error('Failed to fetch task logs', err);
      callback(null);
    } else {
      callback(row ? row.logs : null);
    }
  });
};

const deleteTask = (taskId) => {
  db.run('DELETE FROM tasks WHERE id = ?', [taskId], (err) => {
    if (err) {
      console.error('Failed to delete task', err);
    }
  });
};

const appendTaskLogs = (taskId, data, callback) => {
  db.run(
    'UPDATE tasks SET logs = logs || ? WHERE id = ?',
    [data, taskId],
    (err) => {
      if (err) {
        console.error('Failed to update task logs', err);
      }
      if (callback) callback();
    }
  );
};

const updateTaskStatus = (taskId, status, callback) => {
  db.run(
    'UPDATE tasks SET status = ? WHERE id = ?',
    [status, taskId],
    (err) => {
      if (err) {
        console.error('Failed to update task status', err);
      }
      if (callback) callback();
    }
  );
};

const processTask = () => {
  db.get('SELECT id, url FROM tasks WHERE status = "尚未开始" ORDER BY createdAt LIMIT 1', [], (err, row) => {
    if (err) {
      console.error('Failed to fetch next task', err);
      return;
    }

    if (!row) {
      console.log('No tasks to process');
      return;
    }

    const taskId = row.id;
    const url = row.url;
    const relativePath = path.join(__dirname, "../scripts/download-video.sh");
    const downloadPath = path.join(__dirname, "../downloads");
    console.log("relativePath = " + relativePath);
    updateTaskStatus(taskId, '正在运行', () => {
      const command = `bash ${relativePath} "${url.trim()}" "${downloadPath}"`;
      console.log('command = ' + command);
      const commandProcess = exec(command);

      commandProcess.stdout.on('data', (data) => {
        appendTaskLogs(taskId, data.toString());
      });

      commandProcess.stderr.on('data', (data) => {
        appendTaskLogs(taskId, data.toString());
      });

      commandProcess.on('close', (code) => {
        if (code === 0) {
          updateTaskStatus(taskId, '成功', () => {
            processTask(); // 处理下一个任务
          });
        } else {
          appendTaskLogs(taskId, `\nExit code = ${code}`, () => {
            updateTaskStatus(taskId, '失败', () => {
              processTask(); // 处理下一个任务
            });
          });
        }
      });
    });
  });
};

app.post('/add_url', (req, res) => {
  const { url } = req.body;
  const taskId = addTask(url);
  processTask(); // 执行任务处理
  res.json({ taskId });
});

app.delete('/task/:taskId', (req, res) => {
  const taskId = req.params.taskId;
  deleteTask(taskId);
  res.json({ message: 'Task deleted successfully' });
});

app.get('/task_status', (req, res) => {
  getTaskStatus((taskStatus) => {
    res.json(taskStatus);
  });
});

app.get('/task_logs/:taskId', (req, res) => {
  const taskId = req.params.taskId;
  getTaskLogs(taskId, (logs) => {
    if (logs !== null) {
      res.json({ logs });
    } else {
      res.status(404).json({ error: 'Task not found' });
    }
  });
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});