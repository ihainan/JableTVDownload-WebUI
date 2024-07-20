const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { exec } = require('child_process');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// paths
const scriptPath = path.join(__dirname, "../scripts/download-video.sh");
const tmpDownloadPath = path.join(__dirname, "../tmp_downloads");
const downloadPath = path.join(__dirname, "../downloads");

// remove the temporary directory
fs.rmSync(tmpDownloadPath, { recursive: true, force: true });
fs.mkdirSync(tmpDownloadPath);

// initialize database
const dbPath = path.join(__dirname, "../db/tasks.db");
const dbDir = path.join(__dirname, "../db");
console.log("doPath = " + dbPath);
let db;

// change db file permission
fs.stat(dbDir, (err, dirStats) => {
  if (err) {
    console.error('Failed to get directory stats', err);
  } else {
    const dirMode = dirStats.mode;
    const dirUid = dirStats.uid;
    const dirGid = dirStats.gid;
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Failed to open database', err);
      } else {
        console.log('Connected to the tasks database.');
        fs.chmod(dbPath, dirMode, (err) => {
          if (err) {
            console.error('Failed to set database file permissions', err);
          } else {
            console.log('permission changed for db file');
            fs.chown(dbPath, dirUid, dirGid, (err) => {
              console.log('owner changed for db file');
              if (err) {
                console.error('Failed to set database file owner', err);
              } else {
                console.log('Database file permissions and owner set to match directory');

                db = new sqlite3.Database(dbPath, (err) => {
                  if (err) {
                    console.error('Failed to open database', err);
                  } else {
                    console.log('Connected to the tasks database.');
                    initializeDB();
                  }
                });
              }
            });
          }
        });
      }   
    });    
  }
});

function initializeDB() {
  db.serialize(() => {
    // create tasks table
    db.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        url TEXT,
        status TEXT,
        createdAt TEXT,
        logs TEXT
      )
    `, function(err) {
      if (err) {
        console.error('Failed to create table', err.message);
      } else {
        console.log(`Table created`);
      }
    });  
    db.run(`
      UPDATE tasks
      SET status = '失败'
      WHERE status = '正在运行'
    `, function(err) {
      if (err) {
        console.error('Failed to update task status', err.message);
      } else {
        console.log(`Rows updated: ${this.changes}`);
      }
    });  
  });
}

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

app.get('/image/:id', (req, res) => {
  const imageId = req.params.id;
  const imagePath = path.join(downloadPath + '/' + imageId, `${imageId}.jpg`);

  fs.stat(imagePath, (err, stats) => {
    if (err) {
      // console.error(`File not found: ${imagePath}`);
      res.status(404).send("Image not found");
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'image/jpeg', // 根据图片格式设置
      'Content-Length': stats.size,
    });

    fs.createReadStream(imagePath).pipe(res);
  });
});

app.get('/video/:id', (req, res) => {
  const videoId = req.params.id;
  const videoPath = path.join(downloadPath + '/' + videoId, `${videoId}.mp4`);

  fs.stat(videoPath, (err, stats) => {
    if (err) {
      // console.error(`File not found: ${imagePath}`);
      res.status(404).send("Video not found");
      return;
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
      };

      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };

      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }
  })
});

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
    console.log("scriptPath = " + scriptPath);
    updateTaskStatus(taskId, '正在运行', () => {
      const command = `cd ${tmpDownloadPath} && bash ${scriptPath} "${url.trim()}" "${downloadPath}"`;
      console.log('command = ' + command);
      const commandProcess = exec(command);

      commandProcess.stdout.on('data', (data) => {
        appendTaskLogs(taskId, data.toString());
      });

      commandProcess.stderr.on('data', (data) => {
        console.log('Error message from script: ' + data.toString());
        appendTaskLogs(taskId, data.toString());
      });

      commandProcess.on('close', (code) => {
        if (code === 0) {
          updateTaskStatus(taskId, '成功', () => {
            processTask(); // 处理下一个任务
          });
        } else {
          console.log('Failed to execute task, exit code = ' + code)
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