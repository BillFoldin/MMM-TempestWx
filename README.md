# MMM-ChoreTracker

**MMM-ChoreTracker** is a native, touchscreen-optimized chore and allowance tracking module for the [MagicMirror²](https://magicmirror.builders/) platform running on Raspberry Pi. It provides a 100% local, self-contained architecture with atomic NoSQL persistence, dynamic routine recurrence, threaded task notes, PIN-protected parental oversight, and an immutable payout audit engine.

---

## 🌟 Key Features

- **100% Local Raspberry Pi Execution:** Zero cloud dependencies, zero external database servers, and zero mobile app requirements.
- **Atomic NoSQL Persistence:** Powered by `lowdb` (v1.x CommonJS) combined with `write-file-atomic` adapters to guarantee zero JSON corruption during unexpected power outages or Raspberry Pi reboots.
- **Dynamic Recurrence Engine:** Evaluates daily routine tasks (brush teeth, make bed, feed pets) against scheduled days of the week and automatically resets completion status at midnight.
- **Touchscreen First (Raspberry Pi):** Large 48px–64px touch targets, tactile visual feedback, and responsive layout for 7", 10", 15", or 24" smart mirror displays.
- **Multi-Profile & "Up For Grabs":** Switch between child profiles with intuitive avatar chips or view unassigned "Up For Grabs" chores that any child can claim.
- **Clear Visual Distinction:** Basic expectations/routines are highlighted with routine badges (`$0.00`), while monetized reward chores showcase bold allowance values (e.g. `$5.00`).
- **Threaded Task Notes:** Children and parents can communicate directly inside chore cards with timestamped author-tagged message threads.
- **PIN-Protected Parent Hub:** 4-digit touchscreen numpad modal guarding parental administrative controls:
  - **Chore Approvals:** Inspect completed monetized chores and 1-tap approve or request redo.
  - **In-Module Chore Creation:** Add new routine or monetized chores directly from the mirror interface.
  - **Payout & Audit Engine:** Calculate approved earnings across custom date ranges, record immutable audit logs to `payouts_db.json`, and reset paid tasks.

---

## 📦 Embedded NoSQL Schemas

### 1. `data/chores_db.json`
```json
{
  "profiles": [
    {
      "id": "child_01",
      "name": "Alex",
      "pin": null,
      "icon": "assets/icons/alex.png"
    },
    {
      "id": "child_02",
      "name": "Emma",
      "pin": null,
      "icon": "assets/icons/emma.png"
    }
  ],
  "tasks": [
    {
      "id": "task_101",
      "title": "Brush Teeth",
      "category": "routine",
      "reward_amount": 0.00,
      "assigned_to": "child_01",
      "recurrence": {
        "frequency": "weekly",
        "days_of_week": [0, 1, 2, 3, 4, 5, 6]
      },
      "last_completed_date": "2026-09-24",
      "is_completed_today": false,
      "notes": []
    },
    {
      "id": "task_201",
      "title": "Rake Leaves",
      "category": "monetized",
      "reward_amount": 5.00,
      "assigned_to": "up_for_grabs",
      "recurrence": null,
      "is_completed": false,
      "is_approved": false,
      "notes": [
        {
          "author": "Parent",
          "text": "Please make sure to bag the leaves near the garage.",
          "timestamp": "2026-09-25T14:00:00Z"
        }
      ]
    }
  ]
}
```

### 2. `data/payouts_db.json`
```json
{
  "payout_records": [
    {
      "id": "payout_1001",
      "profile_id": "child_01",
      "total_amount": 12.50,
      "date_range_start": "2026-09-18",
      "date_range_end": "2026-09-25",
      "processed_timestamp": "2026-09-25T18:00:00Z",
      "approved_task_ids": ["task_201"]
    }
  ]
}
```

---

## 🚀 Installation on Raspberry Pi

1. Open your terminal on the Raspberry Pi and navigate to your MagicMirror `modules` directory:
   ```bash
   cd ~/MagicMirror/modules
   ```

2. Clone this repository (or copy the `MMM-ChoreTracker` directory):
   ```bash
   git clone https://github.com/your-username/MMM-ChoreTracker.git
   cd MMM-ChoreTracker
   ```

3. Install the lightweight production dependencies:
   ```bash
   npm install
   ```

---

## ⚙️ Configuration

Add the module to your `config/config.js` file:

```javascript
{
  module: "MMM-ChoreTracker",
  position: "middle_center", // or "top_center", "top_left", etc.
  config: {
    title: "Family Chore Tracker",
    parentPin: "1234",          // 4-digit PIN for parent dashboard
    currencySymbol: "$",        // Currency symbol ($, €, £, etc.)
    defaultProfileId: "all",    // 'all' or specific profile ID like 'child_01'
    showSummaryStats: true,     // Show completed count & reward total bar
    autoCloseModalSeconds: 60,  // Auto-close dialogs after 60s of touch inactivity
    theme: "dark"
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|---|---|---|---|
| `title` | `String` | `"Chore Tracker"` | Header title displayed on the mirror |
| `parentPin` | `String` | `"1234"` | 4-digit PIN for the Parent Administrative Hub |
| `currencySymbol` | `String` | `"$"` | Symbol for monetized chore rewards & payouts |
| `defaultProfileId` | `String` | `"all"` | Initial profile filter (`all`, `up_for_grabs`, or profile id) |
| `showSummaryStats` | `Boolean` | `true` | Show progress counter and total earned rewards |
| `autoCloseModalSeconds`| `Number` | `60` | Inactivity timeout in seconds for modals (`0` to disable) |

---

## 🔒 Security & Safe Atomic Writes

Raspberry Pi installations frequently suffer from power disconnects when power switches are flipped or cords unplugged. Conventional `fs.writeFileSync` can result in truncated or 0-byte corrupt JSON files if powered off mid-write.

`MMM-ChoreTracker` implements an atomic staging protocol via `write-file-atomic`:
1. Writes updated JSON data to a randomized temporary sibling file on disk.
2. Performs an atomic POSIX filesystem rename (`rename(2)`) to replace `chores_db.json` and `payouts_db.json`.
3. If an interruption occurs, the existing database remains intact and uncorrupted.

---

## 📄 License

MIT License. Designed with care for families and smart mirror enthusiasts.
