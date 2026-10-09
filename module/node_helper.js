/* MagicMirror²
 * Node Helper: MMM-ChoreTracker
 *
 * Backend engine managing local embedded JSON databases with atomic writes (write-file-atomic),
 * dynamic midnight recurrence engine, task completion, threaded notes, PIN security,
 * and immutable payout ledger processing.
 *
 * MIT Licensed.
 */

const fs = require("fs");
const path = require("path");
const writeFileAtomic = require("write-file-atomic");
const low = require("lowdb");
const { v4: uuidv4 } = require("uuid");

let NodeHelper;
try {
  NodeHelper = require("node_helper");
} catch (e) {
  NodeHelper = {
    create: function (definition) {
      return Object.assign({
        name: "MMM-ChoreTracker",
        sendSocketNotification: function (notification, payload) {
          console.log(`[node_helper:standalone] -> ${notification}:`, payload);
        }
      }, definition);
    }
  };
}

class AtomicFileAdapter {
  constructor(source, defaultValue = {}) {
    this.source = source;
    this.defaultValue = defaultValue;
    this.serialize = (data) => JSON.stringify(data, null, 2);
    this.deserialize = JSON.parse;
  }

  read() {
    if (fs.existsSync(this.source)) {
      try {
        const raw = fs.readFileSync(this.source, "utf8");
        if (!raw || raw.trim() === "") {
          return this.defaultValue;
        }
        return this.deserialize(raw);
      } catch (err) {
        console.error(`[MMM-ChoreTracker] Warning: Malformed JSON or read error in ${this.source}. Falling back to default:`, err.message);
        return this.defaultValue;
      }
    } else {
      try {
        const dir = path.dirname(this.source);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        writeFileAtomic.sync(this.source, this.serialize(this.defaultValue), { encoding: "utf8" });
      } catch (err) {
        console.error(`[MMM-ChoreTracker] Failed to initialize ${this.source} with default:`, err.message);
      }
      return this.defaultValue;
    }
  }

  write(data) {
    try {
      const dir = path.dirname(this.source);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      writeFileAtomic.sync(this.source, this.serialize(data), { encoding: "utf8" });
    } catch (err) {
      console.error(`[MMM-ChoreTracker] Atomic write failed for ${this.source}:`, err.message);
      throw err;
    }
  }
}

module.exports = NodeHelper.create({
  start: function () {
    console.log(`[${this.name}] Initializing backend helper with Atomic NoSQL engine...`);
    this.config = {
      parentPin: "1234",
      dataDir: path.join(__dirname, "data")
    };

    if (!fs.existsSync(this.config.dataDir)) {
      fs.mkdirSync(this.config.dataDir, { recursive: true });
    }

    this.choresDbPath = path.join(this.config.dataDir, "chores_db.json");
    this.payoutsDbPath = path.join(this.config.dataDir, "payouts_db.json");

    this.initDatabases();
    this.evaluateRecurrence();
    this.startMidnightRecurrenceEngine();
  },

  initDatabases: function () {
    const defaultChoresData = {
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
    };

    const defaultPayoutsData = {
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
    };

    const choresAdapter = new AtomicFileAdapter(this.choresDbPath, defaultChoresData);
    this.choresDb = low(choresAdapter);

    const payoutsAdapter = new AtomicFileAdapter(this.payoutsDbPath, defaultPayoutsData);
    this.payoutsDb = low(payoutsAdapter);

    console.log(`[${this.name}] Connected to NoSQL databases: ${this.choresDbPath} and ${this.payoutsDbPath}`);
  },

  getLocalDateString: function (d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  },

  evaluateRecurrence: function () {
    try {
      const today = new Date();
      const todayStr = this.getLocalDateString(today);
      const currentDayOfWeek = today.getDay();

      const tasks = this.choresDb.get("tasks").value() || [];
      let stateChanged = false;

      tasks.forEach((task) => {
        if (task.category === "routine" && task.recurrence) {
          const daysOfWeek = task.recurrence.days_of_week || [0, 1, 2, 3, 4, 5, 6];
          const isScheduledToday = daysOfWeek.includes(currentDayOfWeek);

          if (task.last_completed_date && task.last_completed_date < todayStr) {
            if (isScheduledToday && task.is_completed_today) {
              task.is_completed_today = false;
              stateChanged = true;
              console.log(`[${this.name}:RecurrenceEngine] Reset routine task "${task.title}" (${task.id}) for today (${todayStr}).`);
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
        this.choresDb.set("tasks", tasks).write();
        console.log(`[${this.name}:RecurrenceEngine] Atomic write completed after daily recurrence evaluation.`);
      }
    } catch (err) {
      console.error(`[${this.name}:RecurrenceEngine] Recurrence evaluation failed:`, err);
    }
  },

  startMidnightRecurrenceEngine: function () {
    let lastCheckedDate = this.getLocalDateString();

    setInterval(() => {
      const currentDate = this.getLocalDateString();
      if (currentDate !== lastCheckedDate) {
        console.log(`[${this.name}] Midnight rollover detected (${lastCheckedDate} -> ${currentDate}). Running recurrence engine...`);
        lastCheckedDate = currentDate;
        this.evaluateRecurrence();
        this.broadcastAllChoresData();
      }
    }, 60 * 1000);
  },

  broadcastAllChoresData: function () {
    try {
      const profiles = this.choresDb.get("profiles").value() || [];
      const tasks = this.choresDb.get("tasks").value() || [];
      const payout_records = this.payoutsDb.get("payout_records").value() || [];

      this.sendSocketNotification("CHORES_DATA_UPDATE", {
        profiles: profiles,
        tasks: tasks,
        payout_records: payout_records
      });
    } catch (err) {
      console.error(`[${this.name}] Error broadcasting chores data:`, err);
    }
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === "GET_CHORES_DATA") {
      this.evaluateRecurrence();
      this.broadcastAllChoresData();
    } else if (notification === "TOGGLE_TASK_COMPLETION") {
      this.handleToggleTaskCompletion(payload);
    } else if (notification === "CLAIM_TASK") {
      this.handleClaimTask(payload);
    } else if (notification === "ADD_TASK_NOTE") {
      this.handleAddTaskNote(payload);
    } else if (notification === "PARENT_VERIFY_PIN") {
      this.handleVerifyPin(payload);
    } else if (notification === "APPROVE_TASK") {
      this.handleApproveTask(payload);
    } else if (notification === "CREATE_TASK") {
      this.handleCreateTask(payload);
    } else if (notification === "DELETE_TASK") {
      this.handleDeleteTask(payload);
    } else if (notification === "PROCESS_PAYOUT") {
      this.handleProcessPayout(payload);
    }
  },

  handleToggleTaskCompletion: function (payload) {
    try {
      const { taskId, profileId, isCompleted } = payload;
      const todayStr = this.getLocalDateString();
      const tasks = this.choresDb.get("tasks").value() || [];
      const task = tasks.find((t) => t.id === taskId);

      if (!task) return;

      if (task.category === "routine") {
        task.is_completed_today = Boolean(isCompleted);
        if (isCompleted) {
          task.last_completed_date = todayStr;
        }
      } else {
        task.is_completed = Boolean(isCompleted);
        task.completed_date = isCompleted ? todayStr : null;

        if (isCompleted) {
          if (task.assigned_to === "up_for_grabs" && profileId && profileId !== "up_for_grabs" && profileId !== "all") {
            task.assigned_to = profileId;
          }
        } else {
          task.is_approved = false;
        }
      }

      this.choresDb.set("tasks", tasks).write();
      this.broadcastAllChoresData();
    } catch (err) {
      console.error(`[${this.name}] handleToggleTaskCompletion failed:`, err);
    }
  },

  handleClaimTask: function (payload) {
    try {
      const { taskId, profileId } = payload;
      if (!profileId) return;

      const tasks = this.choresDb.get("tasks").value() || [];
      const task = tasks.find((t) => t.id === taskId);

      if (task && task.assigned_to === "up_for_grabs") {
        task.assigned_to = profileId;
        if (!task.notes) task.notes = [];
        const profile = (this.choresDb.get("profiles").value() || []).find((p) => p.id === profileId);
        const name = profile ? profile.name : profileId;
        task.notes.push({
          author: "System",
          text: `Chore claimed by ${name}.`,
          timestamp: new Date().toISOString()
        });

        this.choresDb.set("tasks", tasks).write();
        this.broadcastAllChoresData();
      }
    } catch (err) {
      console.error(`[${this.name}] handleClaimTask failed:`, err);
    }
  },

  handleAddTaskNote: function (payload) {
    try {
      const { taskId, author, text } = payload;
      if (!text || !text.trim()) return;

      const tasks = this.choresDb.get("tasks").value() || [];
      const task = tasks.find((t) => t.id === taskId);

      if (task) {
        if (!task.notes) task.notes = [];
        task.notes.push({
          author: author || "Family",
          text: text.trim(),
          timestamp: new Date().toISOString()
        });

        this.choresDb.set("tasks", tasks).write();
        this.broadcastAllChoresData();
      }
    } catch (err) {
      console.error(`[${this.name}] handleAddTaskNote failed:`, err);
    }
  },

  handleVerifyPin: function (payload) {
    const enteredPin = String(payload.pin || "").trim();
    const correctPin = String(this.config.parentPin || "1234").trim();

    const isMatch = enteredPin === correctPin;
    this.sendSocketNotification("PARENT_PIN_RESULT", {
      success: isMatch,
      message: isMatch ? "Authenticated" : "Incorrect PIN"
    });
  },

  handleApproveTask: function (payload) {
    try {
      const { taskId, isApproved } = payload;
      const tasks = this.choresDb.get("tasks").value() || [];
      const task = tasks.find((t) => t.id === taskId);

      if (task) {
        task.is_approved = Boolean(isApproved);
        if (!task.notes) task.notes = [];
        task.notes.push({
          author: "Parent",
          text: isApproved ? "Chore verified and approved for payout." : "Approval status revoked.",
          timestamp: new Date().toISOString()
        });

        this.choresDb.set("tasks", tasks).write();
        this.broadcastAllChoresData();
      }
    } catch (err) {
      console.error(`[${this.name}] handleApproveTask failed:`, err);
    }
  },

  handleCreateTask: function (payload) {
    try {
      const isMonetized = payload.category === "monetized";
      const reward = isMonetized ? Math.max(0, parseFloat(payload.reward_amount) || 0) : 0.00;

      const newTask = {
        id: "task_" + uuidv4().substring(0, 8),
        title: String(payload.title || "Untitled Chore").trim(),
        category: isMonetized ? "monetized" : "routine",
        reward_amount: reward,
        assigned_to: payload.assigned_to || "up_for_grabs",
        recurrence: isMonetized ? null : (payload.recurrence || {
          frequency: "weekly",
          days_of_week: [0, 1, 2, 3, 4, 5, 6]
        }),
        last_completed_date: null,
        is_completed_today: false,
        is_completed: false,
        is_approved: false,
        notes: payload.initial_note ? [
          {
            author: "Parent",
            text: String(payload.initial_note).trim(),
            timestamp: new Date().toISOString()
          }
        ] : []
      };

      const tasks = this.choresDb.get("tasks").value() || [];
      tasks.push(newTask);
      this.choresDb.set("tasks", tasks).write();

      console.log(`[${this.name}] Created new task: "${newTask.title}" (${newTask.id})`);
      this.broadcastAllChoresData();
    } catch (err) {
      console.error(`[${this.name}] handleCreateTask failed:`, err);
    }
  },

  handleDeleteTask: function (payload) {
    try {
      const { taskId } = payload;
      let tasks = this.choresDb.get("tasks").value() || [];
      tasks = tasks.filter((t) => t.id !== taskId);
      this.choresDb.set("tasks", tasks).write();
      this.broadcastAllChoresData();
    } catch (err) {
      console.error(`[${this.name}] handleDeleteTask failed:`, err);
    }
  },

  handleProcessPayout: function (payload) {
    try {
      const { profile_id, date_range_start, date_range_end } = payload;
      const todayStr = this.getLocalDateString();

      const tasks = this.choresDb.get("tasks").value() || [];

      const eligibleTasks = tasks.filter((task) => {
        if (task.category !== "monetized") return false;
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
        console.log(`[${this.name}] No eligible approved tasks to process payout for ${profile_id}`);
        return;
      }

      let totalAmount = 0;
      const approvedTaskIds = [];
      eligibleTasks.forEach((t) => {
        totalAmount += Number(t.reward_amount) || 0;
        approvedTaskIds.push(t.id);
      });

      const payoutRecord = {
        id: "payout_" + uuidv4().substring(0, 8),
        profile_id: profile_id,
        total_amount: Number(totalAmount.toFixed(2)),
        date_range_start: date_range_start || todayStr,
        date_range_end: date_range_end || todayStr,
        processed_timestamp: new Date().toISOString(),
        approved_task_ids: approvedTaskIds
      };

      const payoutRecords = this.payoutsDb.get("payout_records").value() || [];
      payoutRecords.push(payoutRecord);
      this.payoutsDb.set("payout_records", payoutRecords).write();

      eligibleTasks.forEach((t) => {
        t.is_completed = false;
        t.is_approved = false;
        t.last_payout_id = payoutRecord.id;
        t.last_payout_date = todayStr;
        if (!t.notes) t.notes = [];
        t.notes.push({
          author: "System",
          text: `Paid in Payout #${payoutRecord.id} ($${Number(t.reward_amount).toFixed(2)}) on ${todayStr}.`,
          timestamp: new Date().toISOString()
        });
      });

      this.choresDb.set("tasks", tasks).write();

      console.log(`[${this.name}] Successfully processed Payout #${payoutRecord.id} ($${payoutRecord.total_amount}) for ${profile_id}`);

      this.sendSocketNotification("PAYOUT_PROCESSED", {
        success: true,
        payoutRecord: payoutRecord
      });

      this.broadcastAllChoresData();
    } catch (err) {
      console.error(`[${this.name}] handleProcessPayout failed:`, err);
    }
  }
});
