import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import writeFileAtomic from 'write-file-atomic';
import low from 'lowdb';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const choresDbPath = path.join(dataDir, 'chores_db.json');
const payoutsDbPath = path.join(dataDir, 'payouts_db.json');

// Atomic File Adapter using write-file-atomic
class AtomicFileAdapter {
  source: string;
  defaultValue: any;

  constructor(source: string, defaultValue: any = {}) {
    this.source = source;
    this.defaultValue = defaultValue;
  }

  read() {
    if (fs.existsSync(this.source)) {
      try {
        const raw = fs.readFileSync(this.source, 'utf8');
        if (!raw || raw.trim() === '') {
          return this.defaultValue;
        }
        return JSON.parse(raw);
      } catch (err: any) {
        console.error(`[AtomicFileAdapter] Error reading ${this.source}:`, err.message);
        return this.defaultValue;
      }
    } else {
      try {
        const dir = path.dirname(this.source);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        writeFileAtomic.sync(this.source, JSON.stringify(this.defaultValue, null, 2), { encoding: 'utf8' });
      } catch (err: any) {
        console.error(`[AtomicFileAdapter] Init error for ${this.source}:`, err.message);
      }
      return this.defaultValue;
    }
  }

  write(data: any) {
    try {
      const dir = path.dirname(this.source);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      writeFileAtomic.sync(this.source, JSON.stringify(data, null, 2), { encoding: 'utf8' });
    } catch (err: any) {
      console.error(`[AtomicFileAdapter] Atomic write failed for ${this.source}:`, err.message);
      throw err;
    }
  }
}

const getDefaultChoresData = () => ({
  profiles: [
    {
      id: "child_01",
      name: "Alex",
      pin: null,
      icon: "assets/icons/alex.png"
    },
    {
      id: "child_02",
      name: "Emma",
      pin: null,
      icon: "assets/icons/emma.png"
    }
  ],
  tasks: [
    {
      id: "task_101",
      title: "Brush Teeth",
      category: "routine",
      reward_amount: 0.00,
      assigned_to: "child_01",
      recurrence: {
        frequency: "weekly",
        days_of_week: [0, 1, 2, 3, 4, 5, 6]
      },
      last_completed_date: "2026-09-24",
      is_completed_today: false,
      notes: []
    },
    {
      id: "task_102",
      title: "Make Bed",
      category: "routine",
      reward_amount: 0.00,
      assigned_to: "child_01",
      recurrence: {
        frequency: "weekly",
        days_of_week: [1, 2, 3, 4, 5]
      },
      last_completed_date: "2026-09-25",
      is_completed_today: true,
      notes: []
    },
    {
      id: "task_201",
      title: "Rake Leaves",
      category: "monetized",
      reward_amount: 5.00,
      assigned_to: "up_for_grabs",
      recurrence: null,
      is_completed: false,
      is_approved: false,
      notes: [
        {
          author: "Parent",
          text: "Please make sure to bag the leaves near the garage.",
          timestamp: "2026-09-25T14:00:00Z"
        }
      ]
    },
    {
      id: "task_202",
      title: "Wash Family Car",
      category: "monetized",
      reward_amount: 7.50,
      assigned_to: "child_01",
      recurrence: null,
      is_completed: true,
      completed_date: "2026-09-25",
      is_approved: true,
      notes: [
        {
          author: "Alex",
          text: "Completed the wheels and vacuumed inside too!",
          timestamp: "2026-09-25T16:30:00Z"
        }
      ]
    }
  ]
});

const getDefaultPayoutsData = () => ({
  payout_records: [
    {
      id: "payout_1001",
      profile_id: "child_01",
      total_amount: 12.50,
      date_range_start: "2026-09-18",
      date_range_end: "2026-09-25",
      processed_timestamp: "2026-09-25T18:00:00Z",
      approved_task_ids: ["task_201"]
    }
  ]
});

const choresDb = low(new AtomicFileAdapter(choresDbPath, getDefaultChoresData()));
const payoutsDb = low(new AtomicFileAdapter(payoutsDbPath, getDefaultPayoutsData()));

function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Dynamic Recurrence Engine
function evaluateRecurrence() {
  try {
    const today = new Date();
    const todayStr = getLocalDateString(today);
    const currentDayOfWeek = today.getDay();

    const tasks = (choresDb as any).get('tasks').value() || [];
    let stateChanged = false;

    tasks.forEach((task: any) => {
      if (task.category === 'routine' && task.recurrence) {
        const daysOfWeek = task.recurrence.days_of_week || [0, 1, 2, 3, 4, 5, 6];
        const isScheduledToday = daysOfWeek.includes(currentDayOfWeek);

        if (task.last_completed_date && task.last_completed_date < todayStr) {
          if (isScheduledToday && task.is_completed_today) {
            task.is_completed_today = false;
            stateChanged = true;
          }
        } else if (task.last_completed_date === todayStr) {
          if (!task.is_completed_today) {
            task.is_completed_today = true;
            stateChanged = true;
          }
        } else if (!task.last_completed_date) {
          if (task.is_completed_today) {
            task.is_completed_today = false;
            stateChanged = true;
          }
        }
      }
    });

    if (stateChanged) {
      (choresDb as any).set('tasks', tasks).write();
    }
  } catch (err: any) {
    console.error('Error evaluating recurrence:', err);
  }
}

// Initial evaluation
evaluateRecurrence();

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const PORT = process.env.PORT || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // GET full chores data & evaluate recurrence
  app.get('/api/chores', (_req, res) => {
    evaluateRecurrence();
    const profiles = (choresDb as any).get('profiles').value() || [];
    const tasks = (choresDb as any).get('tasks').value() || [];
    const payout_records = (payoutsDb as any).get('payout_records').value() || [];
    res.json({ profiles, tasks, payout_records });
  });

  // Toggle Task Completion
  app.post('/api/chores/toggle', (req, res) => {
    const { taskId, profileId, isCompleted } = req.body;
    const todayStr = getLocalDateString();
    const tasks = (choresDb as any).get('tasks').value() || [];
    const task = tasks.find((t: any) => t.id === taskId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.category === 'routine') {
      task.is_completed_today = Boolean(isCompleted);
      if (isCompleted) {
        task.last_completed_date = todayStr;
      }
    } else {
      task.is_completed = Boolean(isCompleted);
      task.completed_date = isCompleted ? todayStr : null;

      if (isCompleted) {
        if (task.assigned_to === 'up_for_grabs' && profileId && profileId !== 'up_for_grabs' && profileId !== 'all') {
          task.assigned_to = profileId;
        }
      } else {
        task.is_approved = false;
      }
    }

    (choresDb as any).set('tasks', tasks).write();
    res.json({ success: true, task });
  });

  // Claim Up For Grabs Chore
  app.post('/api/chores/claim', (req, res) => {
    const { taskId, profileId } = req.body;
    if (!profileId) {
      return res.status(400).json({ error: 'Profile ID required' });
    }

    const tasks = (choresDb as any).get('tasks').value() || [];
    const task = tasks.find((t: any) => t.id === taskId);

    if (task && task.assigned_to === 'up_for_grabs') {
      task.assigned_to = profileId;
      if (!task.notes) task.notes = [];
      const profiles = (choresDb as any).get('profiles').value() || [];
      const p = profiles.find((prof: any) => prof.id === profileId);
      const name = p ? p.name : profileId;
      task.notes.push({
        author: 'System',
        text: `Chore claimed by ${name}.`,
        timestamp: new Date().toISOString()
      });

      (choresDb as any).set('tasks', tasks).write();
      return res.json({ success: true, task });
    }

    res.status(400).json({ error: 'Cannot claim task' });
  });

  // Add Threaded Note
  app.post('/api/chores/note', (req, res) => {
    const { taskId, author, text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Note text required' });
    }

    const tasks = (choresDb as any).get('tasks').value() || [];
    const task = tasks.find((t: any) => t.id === taskId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (!task.notes) task.notes = [];
    const note = {
      author: author || 'Family',
      text: text.trim(),
      timestamp: new Date().toISOString()
    };
    task.notes.push(note);

    (choresDb as any).set('tasks', tasks).write();
    res.json({ success: true, note, task });
  });

  // Verify PIN
  app.post('/api/chores/verify-pin', (req, res) => {
    const { pin } = req.body;
    const parentPin = process.env.PARENT_PIN || '1234';
    const isMatch = String(pin || '').trim() === parentPin;
    res.json({ success: isMatch });
  });

  // Approve / Revoke Task
  app.post('/api/chores/approve', (req, res) => {
    const { taskId, isApproved } = req.body;
    const tasks = (choresDb as any).get('tasks').value() || [];
    const task = tasks.find((t: any) => t.id === taskId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    task.is_approved = Boolean(isApproved);
    if (!task.notes) task.notes = [];
    task.notes.push({
      author: 'Parent',
      text: isApproved ? 'Chore verified and approved for payout.' : 'Approval revoked.',
      timestamp: new Date().toISOString()
    });

    (choresDb as any).set('tasks', tasks).write();
    res.json({ success: true, task });
  });

  // Create Task
  app.post('/api/chores/create', (req, res) => {
    const { title, category, reward_amount, assigned_to, recurrence, initial_note } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const isMonetized = category === 'monetized';
    const reward = isMonetized ? Math.max(0, parseFloat(reward_amount) || 0) : 0.00;

    const newTask = {
      id: 'task_' + uuidv4().substring(0, 8),
      title: title.trim(),
      category: isMonetized ? 'monetized' : 'routine',
      reward_amount: reward,
      assigned_to: assigned_to || 'up_for_grabs',
      recurrence: isMonetized ? null : (recurrence || {
        frequency: 'weekly',
        days_of_week: [0, 1, 2, 3, 4, 5, 6]
      }),
      last_completed_date: null,
      is_completed_today: false,
      is_completed: false,
      is_approved: false,
      notes: initial_note ? [
        {
          author: 'Parent',
          text: String(initial_note).trim(),
          timestamp: new Date().toISOString()
        }
      ] : []
    };

    const tasks = (choresDb as any).get('tasks').value() || [];
    tasks.push(newTask);
    (choresDb as any).set('tasks', tasks).write();

    res.json({ success: true, task: newTask });
  });

  // Delete Task
  app.post('/api/chores/delete', (req, res) => {
    const { taskId } = req.body;
    let tasks = (choresDb as any).get('tasks').value() || [];
    tasks = tasks.filter((t: any) => t.id !== taskId);
    (choresDb as any).set('tasks', tasks).write();
    res.json({ success: true });
  });

  // Process Payout
  app.post('/api/chores/payout', (req, res) => {
    const { profile_id, date_range_start, date_range_end } = req.body;
    const todayStr = getLocalDateString();
    const tasks = (choresDb as any).get('tasks').value() || [];

    const eligibleTasks = tasks.filter((task: any) => {
      if (task.category !== 'monetized') return false;
      if (!task.is_completed || !task.is_approved) return false;
      if (task.assigned_to !== profile_id) return false;

      const compDate = task.completed_date || task.last_completed_date;
      if (compDate) {
        if (date_range_start && compDate < date_range_start) return false;
        if (date_range_end && compDate > date_range_end) return false;
      }
      return true;
    });

    if (eligibleTasks.length === 0) {
      return res.status(400).json({ error: 'No approved monetized chores found in range' });
    }

    let totalAmount = 0;
    const approvedTaskIds: string[] = [];
    eligibleTasks.forEach((t: any) => {
      totalAmount += Number(t.reward_amount) || 0;
      approvedTaskIds.push(t.id);
    });

    const payoutRecord = {
      id: 'payout_' + uuidv4().substring(0, 8),
      profile_id: profile_id,
      total_amount: Number(totalAmount.toFixed(2)),
      date_range_start: date_range_start || todayStr,
      date_range_end: date_range_end || todayStr,
      processed_timestamp: new Date().toISOString(),
      approved_task_ids: approvedTaskIds
    };

    const payoutRecords = (payoutsDb as any).get('payout_records').value() || [];
    payoutRecords.push(payoutRecord);
    (payoutsDb as any).set('payout_records', payoutRecords).write();

    eligibleTasks.forEach((t: any) => {
      t.is_completed = false;
      t.is_approved = false;
      t.last_payout_id = payoutRecord.id;
      t.last_payout_date = todayStr;
      if (!t.notes) t.notes = [];
      t.notes.push({
        author: 'System',
        text: `Paid in Payout #${payoutRecord.id} ($${Number(t.reward_amount).toFixed(2)}) on ${todayStr}.`,
        timestamp: new Date().toISOString()
      });
    });

    (choresDb as any).set('tasks', tasks).write();
    res.json({ success: true, payoutRecord });
  });

  // Reset Demo Database
  app.post('/api/chores/reset-demo', (_req, res) => {
    (choresDb as any).setState(getDefaultChoresData()).write();
    (payoutsDb as any).setState(getDefaultPayoutsData()).write();
    res.json({ success: true });
  });

  // Vite middleware in dev or static files in prod
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`MMM-ChoreTracker server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
