/* MagicMirror²
 * Module: MMM-ChoreTracker
 *
 * Fully local, touchscreen-optimized Chore & Allowance Tracker.
 * Pure Vanilla JavaScript DOM manipulation with socket messaging.
 *
 * MIT Licensed.
 */

Module.register("MMM-ChoreTracker", {
  // Default module configuration
  defaults: {
    title: "Chore Tracker",
    parentPin: "1234",
    currencySymbol: "$",
    defaultProfileId: "all",
    showSummaryStats: true,
    showBadges: true,
    autoCloseModalSeconds: 60,
    touchFriendly: true,
    theme: "dark",
    dateFormat: "YYYY-MM-DD"
  },

  // Load stylesheet
  getStyles: function () {
    return ["MMM-ChoreTracker.css"];
  },

  // Module lifecycle start
  start: function () {
    Log.info("Starting module: " + this.name);
    this.profiles = [];
    this.tasks = [];
    this.payoutRecords = [];
    this.activeProfileId = this.config.defaultProfileId || "all";
    this.activeCategoryFilter = "all"; // 'all' | 'routine' | 'monetized'

    // Modal states
    this.activeModal = null; // null | 'task-details' | 'pin-entry' | 'parent-admin'
    this.selectedTaskId = null;
    this.pinEntered = "";
    this.pinError = false;
    this.parentActiveTab = "approvals"; // 'approvals' | 'create-chore' | 'payouts' | 'history'

    // Form states for new chore
    this.newChoreForm = {
      title: "",
      category: "routine",
      reward_amount: "0.00",
      assigned_to: "up_for_grabs",
      days_of_week: [0, 1, 2, 3, 4, 5, 6],
      initial_note: ""
    };

    // Payout calculation state
    this.payoutForm = {
      profile_id: "",
      date_range_start: this.getNDaysAgoString(7),
      date_range_end: this.getTodayDateString()
    };

    this.payoutToast = null;
    this.autoCloseTimer = null;

    // Request initial data from backend node_helper
    this.sendSocketNotification("GET_CHORES_DATA", {});
  },

  // Helper: Today date string YYYY-MM-DD
  getTodayDateString: function () {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  },

  // Helper: N days ago date string YYYY-MM-DD
  getNDaysAgoString: function (days) {
    const d = new Date(Date.now() - days * 86400000);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  },

  // Handle incoming socket notifications from node_helper
  socketNotificationReceived: function (notification, payload) {
    Log.info(this.name + " received socket notification: " + notification);

    if (notification === "CHORES_DATA_UPDATE") {
      this.profiles = payload.profiles || [];
      this.tasks = payload.tasks || [];
      this.payoutRecords = payload.payout_records || [];

      // Auto-set payout profile if none selected
      if (!this.payoutForm.profile_id && this.profiles.length > 0) {
        this.payoutForm.profile_id = this.profiles[0].id;
      }

      this.updateDom();
    } else if (notification === "PARENT_PIN_RESULT") {
      if (payload.success) {
        this.pinError = false;
        this.pinEntered = "";
        this.activeModal = "parent-admin";
        this.resetAutoCloseTimer();
      } else {
        this.pinError = true;
        this.pinEntered = "";
      }
      this.updateDom();
    } else if (notification === "PAYOUT_PROCESSED") {
      this.payoutToast = "Payout of " + this.config.currencySymbol + Number(payload.payoutRecord.total_amount).toFixed(2) + " successfully recorded!";
      setTimeout(() => {
        this.payoutToast = null;
        this.updateDom();
      }, 5000);
      this.updateDom();
    }
  },

  // Auto-close modal after user inactivity
  resetAutoCloseTimer: function () {
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = null;
    }
    if (this.activeModal && this.config.autoCloseModalSeconds > 0) {
      this.autoCloseTimer = setTimeout(() => {
        this.closeAllModals();
      }, this.config.autoCloseModalSeconds * 1000);
    }
  },

  closeAllModals: function () {
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = null;
    }
    this.activeModal = null;
    this.selectedTaskId = null;
    this.pinEntered = "";
    this.pinError = false;
    this.updateDom();
  },

  // Main DOM generation
  getDom: function () {
    const wrapper = document.createElement("div");
    wrapper.className = "mmm-choretracker-container";

    // 1. Header Bar
    const header = this.buildHeader();
    wrapper.appendChild(header);

    // 2. Profile Avatars Filter Bar
    const profileBar = this.buildProfileBar();
    wrapper.appendChild(profileBar);

    // 3. Stats & Category Filter Bar
    if (this.config.showSummaryStats) {
      const statsBar = this.buildStatsBar();
      wrapper.appendChild(statsBar);
    }

    // 4. Tasks List / Grid
    const tasksContainer = this.buildTasksGrid();
    wrapper.appendChild(tasksContainer);

    // 5. Active Modals (rendered as overlays)
    if (this.activeModal === "task-details") {
      const taskModal = this.buildTaskDetailModal();
      if (taskModal) wrapper.appendChild(taskModal);
    } else if (this.activeModal === "pin-entry") {
      const pinModal = this.buildPinModal();
      wrapper.appendChild(pinModal);
    } else if (this.activeModal === "parent-admin") {
      const adminModal = this.buildParentAdminModal();
      wrapper.appendChild(adminModal);
    }

    return wrapper;
  },

  // 1. Build Header Bar
  buildHeader: function () {
    const header = document.createElement("div");
    header.className = "ct-header";

    const titleEl = document.createElement("div");
    titleEl.className = "ct-title-group";

    const icon = document.createElement("span");
    icon.className = "ct-header-icon";
    icon.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`;
    titleEl.appendChild(icon);

    const titleText = document.createElement("h2");
    titleText.className = "ct-title";
    titleText.textContent = this.config.title;
    titleEl.appendChild(titleText);

    header.appendChild(titleEl);

    // Parent Dashboard Button (Lock)
    const parentBtn = document.createElement("button");
    parentBtn.className = "ct-parent-btn";
    parentBtn.setAttribute("type", "button");
    parentBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      <span>Parent Hub</span>
    `;
    parentBtn.addEventListener("click", () => {
      this.activeModal = "pin-entry";
      this.pinEntered = "";
      this.pinError = false;
      this.resetAutoCloseTimer();
      this.updateDom();
    });

    header.appendChild(parentBtn);
    return header;
  },

  // 2. Build Profile Avatars Filter Bar
  buildProfileBar: function () {
    const bar = document.createElement("div");
    bar.className = "ct-profile-bar";

    // "Everyone" Option
    const allBtn = document.createElement("button");
    allBtn.className = "ct-profile-chip" + (this.activeProfileId === "all" ? " active" : "");
    allBtn.innerHTML = `
      <span class="ct-avatar-badge ct-avatar-all">★</span>
      <span class="ct-profile-name">Everyone</span>
    `;
    allBtn.addEventListener("click", () => {
      this.activeProfileId = "all";
      this.updateDom();
    });
    bar.appendChild(allBtn);

    // Each Registered Child Profile
    this.profiles.forEach((profile) => {
      const btn = document.createElement("button");
      btn.className = "ct-profile-chip" + (this.activeProfileId === profile.id ? " active" : "");

      const avatar = document.createElement("span");
      avatar.className = "ct-avatar-badge";
      avatar.textContent = profile.name ? profile.name.charAt(0).toUpperCase() : "?";

      const name = document.createElement("span");
      name.className = "ct-profile-name";
      name.textContent = profile.name;

      btn.appendChild(avatar);
      btn.appendChild(name);

      btn.addEventListener("click", () => {
        this.activeProfileId = profile.id;
        this.updateDom();
      });

      bar.appendChild(btn);
    });

    // "Up For Grabs" Filter Chip
    const upForGrabsCount = this.tasks.filter((t) => t.assigned_to === "up_for_grabs" && !t.is_completed).length;
    const ufgBtn = document.createElement("button");
    ufgBtn.className = "ct-profile-chip ufg-chip" + (this.activeProfileId === "up_for_grabs" ? " active" : "");
    ufgBtn.innerHTML = `
      <span class="ct-avatar-badge ct-avatar-ufg">⚡</span>
      <span class="ct-profile-name">Up For Grabs</span>
      ${upForGrabsCount > 0 ? `<span class="ct-count-pill">${upForGrabsCount}</span>` : ""}
    `;
    ufgBtn.addEventListener("click", () => {
      this.activeProfileId = "up_for_grabs";
      this.updateDom();
    });
    bar.appendChild(ufgBtn);

    return bar;
  },

  // 3. Build Stats & Category Filter Bar
  buildStatsBar: function () {
    const bar = document.createElement("div");
    bar.className = "ct-stats-bar";

    const filtered = this.getFilteredTasks();
    const completedCount = filtered.filter((t) => this.isTaskCompleted(t)).length;
    const totalCount = filtered.length;

    // Calculate potential / earned rewards for active profile
    let earnedReward = 0;
    filtered.forEach((t) => {
      if (t.category === "monetized" && t.is_completed) {
        earnedReward += Number(t.reward_amount) || 0;
      }
    });

    const statsGroup = document.createElement("div");
    statsGroup.className = "ct-stats-summary";
    statsGroup.innerHTML = `
      <span class="ct-stat-item">
        <strong>${completedCount} / ${totalCount}</strong> done
      </span>
      ${earnedReward > 0 ? `
        <span class="ct-stat-item ct-stat-reward">
          <strong>${this.config.currencySymbol}${earnedReward.toFixed(2)}</strong> completed
        </span>
      ` : ""}
    `;
    bar.appendChild(statsGroup);

    // Category Tabs (All, Routine, Monetized)
    const tabsGroup = document.createElement("div");
    tabsGroup.className = "ct-category-tabs";

    const categories = [
      { id: "all", label: "All Chores" },
      { id: "routine", label: "Routines ($0.00)" },
      { id: "monetized", label: "Monetized Rewards" }
    ];

    categories.forEach((cat) => {
      const tab = document.createElement("button");
      tab.className = "ct-cat-tab" + (this.activeCategoryFilter === cat.id ? " active" : "");
      tab.textContent = cat.label;
      tab.addEventListener("click", () => {
        this.activeCategoryFilter = cat.id;
        this.updateDom();
      });
      tabsGroup.appendChild(tab);
    });

    bar.appendChild(tabsGroup);
    return bar;
  },

  // Filter tasks based on selected profile and active category
  getFilteredTasks: function () {
    return this.tasks.filter((task) => {
      // Profile matching:
      // If 'all': show everything
      // If 'up_for_grabs': show only up_for_grabs
      // If specific child: show tasks assigned specifically to that child PLUS tasks up_for_grabs
      let profileMatch = false;
      if (this.activeProfileId === "all") {
        profileMatch = true;
      } else if (this.activeProfileId === "up_for_grabs") {
        profileMatch = task.assigned_to === "up_for_grabs";
      } else {
        profileMatch = task.assigned_to === this.activeProfileId || task.assigned_to === "up_for_grabs";
      }

      if (!profileMatch) return false;

      // Category matching
      if (this.activeCategoryFilter !== "all" && task.category !== this.activeCategoryFilter) {
        return false;
      }

      return true;
    });
  },

  // Helper: check completion status of any task
  isTaskCompleted: function (task) {
    if (task.category === "routine") {
      return Boolean(task.is_completed_today);
    }
    return Boolean(task.is_completed);
  },

  // 4. Build Tasks Grid
  buildTasksGrid: function () {
    const list = document.createElement("div");
    list.className = "ct-tasks-grid";

    const filtered = this.getFilteredTasks();

    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "ct-empty-state";
      empty.innerHTML = `
        <div class="ct-empty-icon">🎉</div>
        <div class="ct-empty-title">All Caught Up!</div>
        <div class="ct-empty-desc">No tasks match your current view. Great job!</div>
      `;
      list.appendChild(empty);
      return list;
    }

    filtered.forEach((task) => {
      const card = this.buildTaskCard(task);
      list.appendChild(card);
    });

    return list;
  },

  // Build Individual Task Card
  buildTaskCard: function (task) {
    const card = document.createElement("div");
    const isCompleted = this.isTaskCompleted(task);
    const isMonetized = task.category === "monetized";
    const isUpForGrabs = task.assigned_to === "up_for_grabs";

    card.className = "ct-task-card" +
      (isCompleted ? " is-completed" : "") +
      (isMonetized ? " is-monetized" : " is-routine") +
      (isUpForGrabs ? " is-ufg" : "");

    // Checkbox Button
    const checkBtn = document.createElement("button");
    checkBtn.className = "ct-check-btn" + (isCompleted ? " checked" : "");
    checkBtn.setAttribute("type", "button");
    checkBtn.innerHTML = isCompleted
      ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
      : `<span class="ct-empty-circle"></span>`;

    checkBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleTaskCompletion(task);
    });
    card.appendChild(checkBtn);

    // Task Details Body
    const content = document.createElement("div");
    content.className = "ct-card-body";

    const titleRow = document.createElement("div");
    titleRow.className = "ct-card-title-row";

    const title = document.createElement("h3");
    title.className = "ct-card-title";
    title.textContent = task.title;
    titleRow.appendChild(title);

    // Badges Row
    const badges = document.createElement("div");
    badges.className = "ct-badges-row";

    // Category / Reward Badge
    const categoryBadge = document.createElement("span");
    if (isMonetized) {
      categoryBadge.className = "ct-badge ct-badge-monetized";
      categoryBadge.textContent = this.config.currencySymbol + Number(task.reward_amount).toFixed(2);
    } else {
      categoryBadge.className = "ct-badge ct-badge-routine";
      categoryBadge.textContent = "Routine • $0.00";
    }
    badges.appendChild(categoryBadge);

    // Assignee Badge
    const assigneeBadge = document.createElement("span");
    if (isUpForGrabs) {
      assigneeBadge.className = "ct-badge ct-badge-ufg";
      assigneeBadge.textContent = "⚡ Up For Grabs";
    } else {
      assigneeBadge.className = "ct-badge ct-badge-assignee";
      const assignedProfile = this.profiles.find((p) => p.id === task.assigned_to);
      assigneeBadge.textContent = assignedProfile ? assignedProfile.name : task.assigned_to;
    }
    badges.appendChild(assigneeBadge);

    // Approval status for monetized
    if (isMonetized && task.is_completed) {
      const approvalBadge = document.createElement("span");
      if (task.is_approved) {
        approvalBadge.className = "ct-badge ct-badge-approved";
        approvalBadge.textContent = "★ Approved";
      } else {
        approvalBadge.className = "ct-badge ct-badge-pending-approval";
        approvalBadge.textContent = "⏳ Pending Approval";
      }
      badges.appendChild(approvalBadge);
    }

    // Notes count indicator
    const notesCount = (task.notes && task.notes.length) || 0;
    if (notesCount > 0) {
      const notesBadge = document.createElement("span");
      notesBadge.className = "ct-badge ct-badge-notes";
      notesBadge.innerHTML = `💬 ${notesCount}`;
      badges.appendChild(notesBadge);
    }

    content.appendChild(titleRow);
    content.appendChild(badges);
    card.appendChild(content);

    // Click card body to open detail & notes modal
    card.addEventListener("click", () => {
      this.selectedTaskId = task.id;
      this.activeModal = "task-details";
      this.resetAutoCloseTimer();
      this.updateDom();
    });

    return card;
  },

  // Toggle completion of a task
  toggleTaskCompletion: function (task) {
    const isCurrentlyDone = this.isTaskCompleted(task);
    const newStatus = !isCurrentlyDone;

    // If an up_for_grabs task is marked completed, assign it to active child profile if selected
    let effectiveProfileId = task.assigned_to;
    if (task.assigned_to === "up_for_grabs" && this.activeProfileId !== "all" && this.activeProfileId !== "up_for_grabs") {
      effectiveProfileId = this.activeProfileId;
    }

    this.sendSocketNotification("TOGGLE_TASK_COMPLETION", {
      taskId: task.id,
      profileId: effectiveProfileId,
      isCompleted: newStatus
    });
  },

  // 5. Build Task Detail & Notes Modal
  buildTaskDetailModal: function () {
    const task = this.tasks.find((t) => t.id === this.selectedTaskId);
    if (!task) return null;

    const overlay = document.createElement("div");
    overlay.className = "ct-modal-overlay";
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) this.closeAllModals();
    });

    const modal = document.createElement("div");
    modal.className = "ct-modal-card";

    // Modal Header
    const modalHeader = document.createElement("div");
    modalHeader.className = "ct-modal-header";

    const titleGroup = document.createElement("div");
    const mTitle = document.createElement("h2");
    mTitle.className = "ct-modal-title";
    mTitle.textContent = task.title;

    const mSubtitle = document.createElement("div");
    mSubtitle.className = "ct-modal-subtitle";
    mSubtitle.textContent = task.category === "monetized"
      ? `Monetized Chore • Reward: ${this.config.currencySymbol}${Number(task.reward_amount).toFixed(2)}`
      : "Basic Expectation / Routine ($0.00)";

    titleGroup.appendChild(mTitle);
    titleGroup.appendChild(mSubtitle);
    modalHeader.appendChild(titleGroup);

    const closeBtn = document.createElement("button");
    closeBtn.className = "ct-modal-close-btn";
    closeBtn.textContent = "✕";
    closeBtn.addEventListener("click", () => this.closeAllModals());
    modalHeader.appendChild(closeBtn);
    modal.appendChild(modalHeader);

    // Modal Details Info
    const detailsGrid = document.createElement("div");
    detailsGrid.className = "ct-modal-meta-grid";

    const assigneeProfile = this.profiles.find((p) => p.id === task.assigned_to);
    const assigneeLabel = task.assigned_to === "up_for_grabs" ? "⚡ Up For Grabs" : (assigneeProfile ? assigneeProfile.name : task.assigned_to);

    let statusLabel = "Pending";
    if (task.category === "routine") {
      statusLabel = task.is_completed_today ? "Completed Today" : "Needs Completion";
    } else {
      if (task.is_completed) {
        statusLabel = task.is_approved ? "Approved for Payout" : "Completed (Waiting Approval)";
      }
    }

    detailsGrid.innerHTML = `
      <div class="ct-meta-box">
        <span class="ct-meta-label">Assigned To</span>
        <span class="ct-meta-val">${assigneeLabel}</span>
      </div>
      <div class="ct-meta-box">
        <span class="ct-meta-label">Status</span>
        <span class="ct-meta-val">${statusLabel}</span>
      </div>
      <div class="ct-meta-box">
        <span class="ct-meta-label">Recurrence</span>
        <span class="ct-meta-val">${task.recurrence ? "Weekly Scheduled" : "One-off Task"}</span>
      </div>
      <div class="ct-meta-box">
        <span class="ct-meta-label">Last Completed</span>
        <span class="ct-meta-val">${task.last_completed_date || "Never"}</span>
      </div>
    `;
    modal.appendChild(detailsGrid);

    // Actions Row (Claim, Mark Done/Undone)
    const actionsRow = document.createElement("div");
    actionsRow.className = "ct-modal-actions-row";

    if (task.assigned_to === "up_for_grabs") {
      const claimSelect = document.createElement("select");
      claimSelect.className = "ct-input-select";
      this.profiles.forEach((p) => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = "Claim as " + p.name;
        if (p.id === this.activeProfileId) opt.selected = true;
        claimSelect.appendChild(opt);
      });

      const claimBtn = document.createElement("button");
      claimBtn.className = "ct-btn ct-btn-claim";
      claimBtn.textContent = "⚡ Claim This Chore";
      claimBtn.addEventListener("click", () => {
        const claimant = claimSelect.value;
        this.sendSocketNotification("CLAIM_TASK", {
          taskId: task.id,
          profileId: claimant
        });
      });

      actionsRow.appendChild(claimSelect);
      actionsRow.appendChild(claimBtn);
    }

    const isDone = this.isTaskCompleted(task);
    const completeBtn = document.createElement("button");
    completeBtn.className = "ct-btn " + (isDone ? "ct-btn-uncomplete" : "ct-btn-complete");
    completeBtn.textContent = isDone ? "Mark Incomplete" : "✓ Mark as Completed";
    completeBtn.addEventListener("click", () => {
      this.toggleTaskCompletion(task);
    });
    actionsRow.appendChild(completeBtn);

    modal.appendChild(actionsRow);

    // Threaded Notes Section
    const notesSection = document.createElement("div");
    notesSection.className = "ct-notes-section";

    const notesHeader = document.createElement("h4");
    notesHeader.className = "ct-notes-header";
    notesHeader.textContent = `Threaded Task Notes (${(task.notes && task.notes.length) || 0})`;
    notesSection.appendChild(notesHeader);

    const notesList = document.createElement("div");
    notesList.className = "ct-notes-list";

    if (task.notes && task.notes.length > 0) {
      task.notes.forEach((note) => {
        const item = document.createElement("div");
        item.className = "ct-note-bubble" + (note.author === "Parent" ? " ct-note-parent" : " ct-note-child");

        const noteMeta = document.createElement("div");
        noteMeta.className = "ct-note-meta";

        const authorName = document.createElement("strong");
        authorName.textContent = note.author || "Family";

        const timeStr = document.createElement("span");
        try {
          const dateObj = new Date(note.timestamp);
          timeStr.textContent = dateObj.toLocaleDateString() + " " + dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        } catch (e) {
          timeStr.textContent = note.timestamp || "";
        }

        noteMeta.appendChild(authorName);
        noteMeta.appendChild(timeStr);

        const noteBody = document.createElement("div");
        noteBody.className = "ct-note-text";
        noteBody.textContent = note.text;

        item.appendChild(noteMeta);
        item.appendChild(noteBody);
        notesList.appendChild(item);
      });
    } else {
      const emptyNotes = document.createElement("div");
      emptyNotes.className = "ct-notes-empty";
      emptyNotes.textContent = "No notes on this chore yet. Leave instructions or progress updates below!";
      notesList.appendChild(emptyNotes);
    }
    notesSection.appendChild(notesList);

    // Add Note Form
    const addNoteForm = document.createElement("div");
    addNoteForm.className = "ct-add-note-form";

    const authorSelect = document.createElement("select");
    authorSelect.className = "ct-input-select ct-author-select";

    const optParent = document.createElement("option");
    optParent.value = "Parent";
    optParent.textContent = "Author: Parent";
    authorSelect.appendChild(optParent);

    this.profiles.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.name;
      opt.textContent = "Author: " + p.name;
      if (this.activeProfileId === p.id) opt.selected = true;
      authorSelect.appendChild(opt);
    });

    const noteInput = document.createElement("input");
    noteInput.className = "ct-input-text";
    noteInput.placeholder = "Write a note or comment...";

    const postBtn = document.createElement("button");
    postBtn.className = "ct-btn ct-btn-post-note";
    postBtn.textContent = "Send Note";
    postBtn.addEventListener("click", () => {
      const text = noteInput.value.trim();
      if (!text) return;
      this.sendSocketNotification("ADD_TASK_NOTE", {
        taskId: task.id,
        author: authorSelect.value,
        text: text
      });
      noteInput.value = "";
    });

    addNoteForm.appendChild(authorSelect);
    addNoteForm.appendChild(noteInput);
    addNoteForm.appendChild(postBtn);
    notesSection.appendChild(addNoteForm);

    modal.appendChild(notesSection);
    overlay.appendChild(modal);
    return overlay;
  },

  // 6. Build Touchscreen PIN Pad Modal
  buildPinModal: function () {
    const overlay = document.createElement("div");
    overlay.className = "ct-modal-overlay";
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) this.closeAllModals();
    });

    const card = document.createElement("div");
    card.className = "ct-pin-modal-card";

    const header = document.createElement("div");
    header.className = "ct-pin-header";
    header.innerHTML = `
      <div class="ct-pin-icon-wrap">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      </div>
      <h3>Parent Access</h3>
      <p>Enter your 4-digit PIN</p>
    `;
    card.appendChild(header);

    // 4 PIN Dots
    const dotsWrap = document.createElement("div");
    dotsWrap.className = "ct-pin-dots" + (this.pinError ? " ct-pin-shake" : "");
    for (let i = 0; i < 4; i++) {
      const dot = document.createElement("span");
      dot.className = "ct-pin-dot" + (i < this.pinEntered.length ? " filled" : "");
      dotsWrap.appendChild(dot);
    }
    card.appendChild(dotsWrap);

    if (this.pinError) {
      const errEl = document.createElement("div");
      errEl.className = "ct-pin-err-msg";
      errEl.textContent = "Incorrect PIN. Please try again.";
      card.appendChild(errEl);
    }

    // Touch Numpad Grid (1-9, Clear, 0, Close)
    const pad = document.createElement("div");
    pad.className = "ct-numpad-grid";

    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "CLR", "0", "✕"];
    keys.forEach((key) => {
      const btn = document.createElement("button");
      btn.className = "ct-numpad-key" + (key === "CLR" || key === "✕" ? " ct-key-util" : "");
      btn.textContent = key;

      btn.addEventListener("click", () => {
        this.resetAutoCloseTimer();
        if (key === "CLR") {
          this.pinEntered = "";
          this.pinError = false;
          this.updateDom();
        } else if (key === "✕") {
          this.closeAllModals();
        } else {
          if (this.pinEntered.length < 4) {
            this.pinEntered += key;
            this.pinError = false;
            this.updateDom();

            // Auto-submit on 4th digit
            if (this.pinEntered.length === 4) {
              this.sendSocketNotification("PARENT_VERIFY_PIN", {
                pin: this.pinEntered
              });
            }
          }
        }
      });
      pad.appendChild(btn);
    });

    card.appendChild(pad);
    overlay.appendChild(card);
    return overlay;
  },

  // 7. Build Full Parent Administrative Dashboard
  buildParentAdminModal: function () {
    const overlay = document.createElement("div");
    overlay.className = "ct-modal-overlay ct-admin-overlay";

    const card = document.createElement("div");
    card.className = "ct-admin-card";

    // Admin Header
    const header = document.createElement("div");
    header.className = "ct-admin-header";

    const titleGroup = document.createElement("div");
    titleGroup.innerHTML = `
      <h2>Parent Administrative Dashboard</h2>
      <p class="ct-admin-subtitle">Task Approval, In-Module Chore Creator & Payout Audit Engine</p>
    `;
    header.appendChild(titleGroup);

    const closeBtn = document.createElement("button");
    closeBtn.className = "ct-admin-exit-btn";
    closeBtn.textContent = "✕ Exit Dashboard";
    closeBtn.addEventListener("click", () => this.closeAllModals());
    header.appendChild(closeBtn);
    card.appendChild(header);

    // Toast Alert (if any)
    if (this.payoutToast) {
      const toast = document.createElement("div");
      toast.className = "ct-admin-toast";
      toast.textContent = this.payoutToast;
      card.appendChild(toast);
    }

    // Dashboard Navigation Tabs
    const nav = document.createElement("div");
    nav.className = "ct-admin-tabs";

    const pendingApprovalCount = this.tasks.filter((t) => t.category === "monetized" && t.is_completed && !t.is_approved).length;

    const tabs = [
      { id: "approvals", label: `Chore Approvals ${pendingApprovalCount > 0 ? `(${pendingApprovalCount})` : ""}` },
      { id: "create-chore", label: "+ Create New Chore" },
      { id: "payouts", label: "Payout & Audit Engine" },
      { id: "history", label: "Payout Receipts Log" }
    ];

    tabs.forEach((tab) => {
      const tabBtn = document.createElement("button");
      tabBtn.className = "ct-admin-tab" + (this.parentActiveTab === tab.id ? " active" : "");
      tabBtn.textContent = tab.label;
      tabBtn.addEventListener("click", () => {
        this.parentActiveTab = tab.id;
        this.resetAutoCloseTimer();
        this.updateDom();
      });
      nav.appendChild(tabBtn);
    });
    card.appendChild(nav);

    // Tab Body
    const body = document.createElement("div");
    body.className = "ct-admin-body";

    if (this.parentActiveTab === "approvals") {
      body.appendChild(this.buildApprovalsTab());
    } else if (this.parentActiveTab === "create-chore") {
      body.appendChild(this.buildCreateChoreTab());
    } else if (this.parentActiveTab === "payouts") {
      body.appendChild(this.buildPayoutsTab());
    } else if (this.parentActiveTab === "history") {
      body.appendChild(this.buildPayoutHistoryTab());
    }

    card.appendChild(body);
    overlay.appendChild(card);
    return overlay;
  },

  // 7a. Parent Admin: Chore Approvals Tab
  buildApprovalsTab: function () {
    const wrap = document.createElement("div");
    wrap.className = "ct-approvals-tab";

    const completedMonetized = this.tasks.filter((t) => t.category === "monetized" && t.is_completed);

    if (completedMonetized.length === 0) {
      wrap.innerHTML = `
        <div class="ct-empty-admin">
          <p>No monetized chores are currently awaiting parent approval.</p>
          <small>When a child completes a monetized chore, it will appear here for verification and payout approval.</small>
        </div>
      `;
      return wrap;
    }

    const tableWrap = document.createElement("div");
    tableWrap.className = "ct-table-responsive";

    const table = document.createElement("table");
    table.className = "ct-admin-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th>Task</th>
          <th>Completed By</th>
          <th>Reward</th>
          <th>Completion Date</th>
          <th>Approval Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    completedMonetized.forEach((task) => {
      const tr = document.createElement("tr");
      const childProfile = this.profiles.find((p) => p.id === task.assigned_to);
      const childName = childProfile ? childProfile.name : (task.assigned_to === "up_for_grabs" ? "Unassigned" : task.assigned_to);

      tr.innerHTML = `
        <td><strong>${task.title}</strong></td>
        <td>${childName}</td>
        <td><strong class="ct-text-emerald">${this.config.currencySymbol}${Number(task.reward_amount).toFixed(2)}</strong></td>
        <td>${task.completed_date || task.last_completed_date || "Today"}</td>
        <td>
          <span class="ct-badge ${task.is_approved ? "ct-badge-approved" : "ct-badge-pending-approval"}">
            ${task.is_approved ? "✓ Approved" : "⏳ Pending"}
          </span>
        </td>
        <td></td>
      `;

      const actionTd = tr.querySelector("td:last-child");

      if (!task.is_approved) {
        const approveBtn = document.createElement("button");
        approveBtn.className = "ct-btn ct-btn-approve";
        approveBtn.textContent = "✓ Approve";
        approveBtn.addEventListener("click", () => {
          this.sendSocketNotification("APPROVE_TASK", {
            taskId: task.id,
            isApproved: true
          });
        });
        actionTd.appendChild(approveBtn);

        const rejectBtn = document.createElement("button");
        rejectBtn.className = "ct-btn ct-btn-reject";
        rejectBtn.textContent = "Reject / Redo";
        rejectBtn.addEventListener("click", () => {
          this.sendSocketNotification("TOGGLE_TASK_COMPLETION", {
            taskId: task.id,
            profileId: task.assigned_to,
            isCompleted: false
          });
        });
        actionTd.appendChild(rejectBtn);
      } else {
        const revokeBtn = document.createElement("button");
        revokeBtn.className = "ct-btn ct-btn-revoke";
        revokeBtn.textContent = "Revoke Approval";
        revokeBtn.addEventListener("click", () => {
          this.sendSocketNotification("APPROVE_TASK", {
            taskId: task.id,
            isApproved: false
          });
        });
        actionTd.appendChild(revokeBtn);
      }

      tbody.appendChild(tr);
    });

    tableWrap.appendChild(table);
    wrap.appendChild(tableWrap);
    return wrap;
  },

  // 7b. Parent Admin: Create New Chore Form
  buildCreateChoreTab: function () {
    const wrap = document.createElement("div");
    wrap.className = "ct-create-chore-tab";

    const form = document.createElement("div");
    form.className = "ct-form-grid";

    // Title Input
    const titleGroup = document.createElement("div");
    titleGroup.className = "ct-form-group ct-col-span-2";
    titleGroup.innerHTML = `<label>Chore Title</label>`;
    const titleInput = document.createElement("input");
    titleInput.className = "ct-input-text";
    titleInput.placeholder = "e.g., Vacuum Living Room, Clean Cat Litter";
    titleInput.value = this.newChoreForm.title;
    titleInput.addEventListener("input", (e) => {
      this.newChoreForm.title = e.target.value;
    });
    titleGroup.appendChild(titleInput);
    form.appendChild(titleGroup);

    // Category Select
    const catGroup = document.createElement("div");
    catGroup.className = "ct-form-group";
    catGroup.innerHTML = `<label>Category</label>`;
    const catSelect = document.createElement("select");
    catSelect.className = "ct-input-select";
    catSelect.innerHTML = `
      <option value="routine" ${this.newChoreForm.category === "routine" ? "selected" : ""}>Routine / Expectation ($0.00)</option>
      <option value="monetized" ${this.newChoreForm.category === "monetized" ? "selected" : ""}>Monetized Allowance Reward</option>
    `;
    catSelect.addEventListener("change", (e) => {
      this.newChoreForm.category = e.target.value;
      this.updateDom();
    });
    catGroup.appendChild(catSelect);
    form.appendChild(catGroup);

    // Reward Amount Input (if monetized)
    const rewardGroup = document.createElement("div");
    rewardGroup.className = "ct-form-group";
    rewardGroup.innerHTML = `<label>Reward Amount (${this.config.currencySymbol})</label>`;
    const rewardInput = document.createElement("input");
    rewardInput.className = "ct-input-text";
    rewardInput.type = "number";
    rewardInput.step = "0.50";
    rewardInput.min = "0.00";
    rewardInput.value = this.newChoreForm.category === "monetized" ? this.newChoreForm.reward_amount : "0.00";
    rewardInput.disabled = this.newChoreForm.category === "routine";
    rewardInput.addEventListener("input", (e) => {
      this.newChoreForm.reward_amount = e.target.value;
    });
    rewardGroup.appendChild(rewardInput);
    form.appendChild(rewardGroup);

    // Assigned To Select
    const assignGroup = document.createElement("div");
    assignGroup.className = "ct-form-group";
    assignGroup.innerHTML = `<label>Assigned To</label>`;
    const assignSelect = document.createElement("select");
    assignSelect.className = "ct-input-select";

    const optUfg = document.createElement("option");
    optUfg.value = "up_for_grabs";
    optUfg.textContent = "⚡ Up For Grabs (Anyone can claim)";
    if (this.newChoreForm.assigned_to === "up_for_grabs") optUfg.selected = true;
    assignSelect.appendChild(optUfg);

    this.profiles.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.name;
      if (this.newChoreForm.assigned_to === p.id) opt.selected = true;
      assignSelect.appendChild(opt);
    });

    assignSelect.addEventListener("change", (e) => {
      this.newChoreForm.assigned_to = e.target.value;
    });
    assignGroup.appendChild(assignSelect);
    form.appendChild(assignGroup);

    // Recurrence Day Picker (for routines)
    if (this.newChoreForm.category === "routine") {
      const recurGroup = document.createElement("div");
      recurGroup.className = "ct-form-group ct-col-span-2";
      recurGroup.innerHTML = `<label>Scheduled Days of Week</label>`;

      const dayChips = document.createElement("div");
      dayChips.className = "ct-days-picker";
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

      dayNames.forEach((dName, dayIdx) => {
        const isSelected = this.newChoreForm.days_of_week.includes(dayIdx);
        const dayBtn = document.createElement("button");
        dayBtn.className = "ct-day-chip" + (isSelected ? " selected" : "");
        dayBtn.textContent = dName;
        dayBtn.addEventListener("click", () => {
          if (isSelected) {
            this.newChoreForm.days_of_week = this.newChoreForm.days_of_week.filter((d) => d !== dayIdx);
          } else {
            this.newChoreForm.days_of_week.push(dayIdx);
          }
          this.updateDom();
        });
        dayChips.appendChild(dayBtn);
      });

      recurGroup.appendChild(dayChips);
      form.appendChild(recurGroup);
    }

    // Initial Parent Note / Instructions
    const noteGroup = document.createElement("div");
    noteGroup.className = "ct-form-group ct-col-span-2";
    noteGroup.innerHTML = `<label>Initial Parent Instructions / Notes (Optional)</label>`;
    const noteInput = document.createElement("textarea");
    noteInput.className = "ct-input-textarea";
    noteInput.rows = 2;
    noteInput.placeholder = "e.g., Bag leaves near the garage or put away recycling.";
    noteInput.value = this.newChoreForm.initial_note;
    noteInput.addEventListener("input", (e) => {
      this.newChoreForm.initial_note = e.target.value;
    });
    noteGroup.appendChild(noteInput);
    form.appendChild(noteGroup);

    // Submit Button
    const submitGroup = document.createElement("div");
    submitGroup.className = "ct-form-actions ct-col-span-2";

    const saveBtn = document.createElement("button");
    saveBtn.className = "ct-btn ct-btn-save-chore";
    saveBtn.textContent = "Save & Publish Chore";
    saveBtn.addEventListener("click", () => {
      if (!this.newChoreForm.title.trim()) {
        alert("Please enter a chore title.");
        return;
      }

      this.sendSocketNotification("CREATE_TASK", {
        title: this.newChoreForm.title.trim(),
        category: this.newChoreForm.category,
        reward_amount: this.newChoreForm.category === "monetized" ? parseFloat(this.newChoreForm.reward_amount) || 0 : 0.00,
        assigned_to: this.newChoreForm.assigned_to,
        recurrence: this.newChoreForm.category === "routine" ? {
          frequency: "weekly",
          days_of_week: this.newChoreForm.days_of_week
        } : null,
        initial_note: this.newChoreForm.initial_note.trim()
      });

      // Reset form
      this.newChoreForm = {
        title: "",
        category: "routine",
        reward_amount: "0.00",
        assigned_to: "up_for_grabs",
        days_of_week: [0, 1, 2, 3, 4, 5, 6],
        initial_note: ""
      };

      this.parentActiveTab = "approvals";
      this.updateDom();
    });

    submitGroup.appendChild(saveBtn);
    form.appendChild(submitGroup);

    wrap.appendChild(form);
    return wrap;
  },

  // 7c. Parent Admin: Payout & Audit Engine Tab
  buildPayoutsTab: function () {
    const wrap = document.createElement("div");
    wrap.className = "ct-payouts-tab";

    const filterRow = document.createElement("div");
    filterRow.className = "ct-payout-filters";

    // Select Profile
    const profSelectWrap = document.createElement("div");
    profSelectWrap.className = "ct-filter-item";
    profSelectWrap.innerHTML = `<label>Select Child Profile</label>`;

    const profSelect = document.createElement("select");
    profSelect.className = "ct-input-select";
    this.profiles.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.name;
      if (p.id === this.payoutForm.profile_id) opt.selected = true;
      profSelect.appendChild(opt);
    });
    profSelect.addEventListener("change", (e) => {
      this.payoutForm.profile_id = e.target.value;
      this.updateDom();
    });
    profSelectWrap.appendChild(profSelect);
    filterRow.appendChild(profSelectWrap);

    // Date Range Start
    const startWrap = document.createElement("div");
    startWrap.className = "ct-filter-item";
    startWrap.innerHTML = `<label>Start Date</label>`;
    const startInput = document.createElement("input");
    startInput.type = "date";
    startInput.className = "ct-input-text";
    startInput.value = this.payoutForm.date_range_start;
    startInput.addEventListener("change", (e) => {
      this.payoutForm.date_range_start = e.target.value;
      this.updateDom();
    });
    startWrap.appendChild(startInput);
    filterRow.appendChild(startWrap);

    // Date Range End
    const endWrap = document.createElement("div");
    endWrap.className = "ct-filter-item";
    endWrap.innerHTML = `<label>End Date</label>`;
    const endInput = document.createElement("input");
    endInput.type = "date";
    endInput.className = "ct-input-text";
    endInput.value = this.payoutForm.date_range_end;
    endInput.addEventListener("change", (e) => {
      this.payoutForm.date_range_end = e.target.value;
      this.updateDom();
    });
    endWrap.appendChild(endInput);
    filterRow.appendChild(endWrap);

    wrap.appendChild(filterRow);

    // Calculate Eligible Approved Chores
    const targetProfileId = this.payoutForm.profile_id;
    const eligibleTasks = this.tasks.filter((t) => {
      if (t.category !== "monetized") return false;
      if (!t.is_completed || !t.is_approved) return false;
      if (t.assigned_to !== targetProfileId) return false;

      // Date range filter
      const compDate = t.completed_date || t.last_completed_date;
      if (compDate) {
        if (this.payoutForm.date_range_start && compDate < this.payoutForm.date_range_start) return false;
        if (this.payoutForm.date_range_end && compDate > this.payoutForm.date_range_end) return false;
      }
      return true;
    });

    let totalAmount = 0;
    eligibleTasks.forEach((t) => {
      totalAmount += Number(t.reward_amount) || 0;
    });

    // Payout Summary Box
    const summaryCard = document.createElement("div");
    summaryCard.className = "ct-payout-summary-card";

    const targetProfile = this.profiles.find((p) => p.id === targetProfileId);
    const targetName = targetProfile ? targetProfile.name : "Selected Child";

    summaryCard.innerHTML = `
      <div class="ct-summary-header">
        <div>
          <h3>Audit Calculation for ${targetName}</h3>
          <p>Range: ${this.payoutForm.date_range_start} to ${this.payoutForm.date_range_end}</p>
        </div>
        <div class="ct-summary-total">
          <span class="ct-total-label">Total Payout</span>
          <span class="ct-total-val">${this.config.currencySymbol}${totalAmount.toFixed(2)}</span>
        </div>
      </div>
      <div class="ct-summary-tasks">
        <h4>Eligible Approved Tasks (${eligibleTasks.length})</h4>
        ${eligibleTasks.length === 0 ? `<p class="ct-text-muted">No approved monetized chores found in this date range.</p>` : ""}
        <ul class="ct-summary-task-list">
          ${eligibleTasks.map((t) => `<li><span>${t.title}</span><strong>${this.config.currencySymbol}${Number(t.reward_amount).toFixed(2)}</strong></li>`).join("")}
        </ul>
      </div>
    `;

    // Process Payout Button
    const processBtn = document.createElement("button");
    processBtn.className = "ct-btn ct-btn-process-payout";
    processBtn.disabled = eligibleTasks.length === 0;
    processBtn.textContent = `Process & Append Payout Log (${this.config.currencySymbol}${totalAmount.toFixed(2)})`;
    processBtn.addEventListener("click", () => {
      if (eligibleTasks.length === 0) return;
      this.sendSocketNotification("PROCESS_PAYOUT", {
        profile_id: targetProfileId,
        date_range_start: this.payoutForm.date_range_start,
        date_range_end: this.payoutForm.date_range_end
      });
    });

    summaryCard.appendChild(processBtn);
    wrap.appendChild(summaryCard);
    return wrap;
  },

  // 7d. Parent Admin: Immutable Payout Receipts Log
  buildPayoutHistoryTab: function () {
    const wrap = document.createElement("div");
    wrap.className = "ct-history-tab";

    if (this.payoutRecords.length === 0) {
      wrap.innerHTML = `<div class="ct-empty-admin"><p>No previous payout records stored in payouts_db.json yet.</p></div>`;
      return wrap;
    }

    const tableWrap = document.createElement("div");
    tableWrap.className = "ct-table-responsive";

    const table = document.createElement("table");
    table.className = "ct-admin-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th>Payout ID</th>
          <th>Child Profile</th>
          <th>Total Payout</th>
          <th>Date Range</th>
          <th>Processed Timestamp</th>
          <th>Approved Task IDs</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    // Display latest records first
    const sorted = [...this.payoutRecords].reverse();

    sorted.forEach((rec) => {
      const tr = document.createElement("tr");
      const childProfile = this.profiles.find((p) => p.id === rec.profile_id);
      const childName = childProfile ? childProfile.name : rec.profile_id;

      let dateFormatted = rec.processed_timestamp;
      try {
        dateFormatted = new Date(rec.processed_timestamp).toLocaleString();
      } catch (e) {}

      tr.innerHTML = `
        <td><code class="ct-code-pill">${rec.id}</code></td>
        <td><strong>${childName}</strong></td>
        <td><strong class="ct-text-emerald">${this.config.currencySymbol}${Number(rec.total_amount).toFixed(2)}</strong></td>
        <td>${rec.date_range_start} → ${rec.date_range_end}</td>
        <td>${dateFormatted}</td>
        <td><small class="ct-text-muted">${(rec.approved_task_ids || []).join(", ") || "None"}</small></td>
      `;

      tbody.appendChild(tr);
    });

    tableWrap.appendChild(table);
    wrap.appendChild(tableWrap);
    return wrap;
  }
});
