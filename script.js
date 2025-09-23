const taskForm = document.getElementById("taskForm");
const taskList = document.getElementById("taskList");
const filterButtons = document.querySelectorAll(".filter-btn");
const themeToggle = document.getElementById("themeToggle");
const searchInput = document.getElementById("searchInput");
const confirmModal = document.getElementById("confirmModal");
const confirmDelete = document.getElementById("confirmDelete");
const cancelDelete = document.getElementById("cancelDelete");

let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let currentFilter = "all";
let currentSearch = "";
let taskToDelete = null;
let editingTaskId = null;

// Generate unique ID for tasks
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// -------- THEME TOGGLE --------
function applyTheme(isDark) {
  if (isDark) {
    document.body.classList.add("dark-mode");
    themeToggle.textContent = "☀️ Light Mode";
  } else {
    document.body.classList.remove("dark-mode");
    themeToggle.textContent = "🌙 Dark Mode";
  }
}

// Auto-detect system preference if no saved preference
const savedTheme = localStorage.getItem("darkMode");
const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const initialTheme = savedTheme !== null ? savedTheme === "true" : systemPrefersDark;

applyTheme(initialTheme);

themeToggle.addEventListener("click", () => {
  const isDark = !document.body.classList.contains("dark-mode");
  applyTheme(isDark);
  localStorage.setItem("darkMode", isDark);
});

// -------- TASK STATISTICS --------
function updateStats() {
  const total = tasks.length;
  const completed = tasks.filter(task => task.status === "done").length;
  const overdue = tasks.filter(task => isOverdue(task)).length;
  
  document.getElementById("totalTasks").textContent = total;
  document.getElementById("completedTasks").textContent = completed;
  document.getElementById("overdueTasks").textContent = overdue;
}

// -------- SEARCH FUNCTIONALITY --------
searchInput.addEventListener("input", (e) => {
  currentSearch = e.target.value.toLowerCase();
  renderTasks();
});

// -------- TASK LOGIC --------
function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

function sortTasks(tasksArray) {
  return tasksArray.sort((a, b) => {
    // Overdue tasks first
    const aOverdue = isOverdue(a);
    const bOverdue = isOverdue(b);
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    
    // Then sort by deadline
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline) - new Date(b.deadline);
  });
}

function isOverdue(taskObj) {
  if (!taskObj.deadline || taskObj.status === "done") return false;
  const today = new Date();
  const deadlineDate = new Date(taskObj.deadline);
  return deadlineDate < today.setHours(0,0,0,0);
}

function getRelativeDate(dateString) {
  if (!dateString) return "";
  
  const taskDate = new Date(dateString);
  const today = new Date();
  const diffTime = taskDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  if (diffDays === -1) return "Overdue by 1 day";
  if (diffDays < -1) return `Overdue by ${Math.abs(diffDays)} days`;
  if (diffDays > 1) return `Due in ${diffDays} days`;
  
  return "";
}

function filterTasks(tasksArray) {
  return tasksArray.filter(task => {
    // Filter by status
    const statusMatch = currentFilter === "all" || 
                       (currentFilter === "overdue" && isOverdue(task)) ||
                       (currentFilter !== "overdue" && task.status === currentFilter);
    
    // Filter by search
    const searchMatch = currentSearch === "" || 
                       task.title.toLowerCase().includes(currentSearch) ||
                       task.notes.toLowerCase().includes(currentSearch);
    
    return statusMatch && searchMatch;
  });
}

function renderTasks() {
  taskList.innerHTML = "";
  let filtered = filterTasks(tasks);
  let sorted = sortTasks(filtered);

  if (sorted.length === 0) {
    taskList.innerHTML = `
      <div style="text-align: center; color: var(--grey); padding: 20px;">
        ${currentSearch ? "No tasks found matching your search." : "No tasks yet. Add one above!"}
      </div>
    `;
    updateStats();
    return;
  }

  sorted.forEach((taskObj) => {
    const task = document.createElement("div");
    task.classList.add("task", taskObj.status, `category-${taskObj.category || 'other'}`);
    task.dataset.taskId = taskObj.id;

    if (isOverdue(taskObj)) {
      task.classList.add("overdue");
    }

    if (editingTaskId === taskObj.id) {
      task.classList.add("editing");
    }

    const relativeDate = getRelativeDate(taskObj.deadline);
    const deadlineText = taskObj.deadline ? `<small>Deadline: ${taskObj.deadline}${taskObj.time ? ` at ${taskObj.time}` : ""}</small>` : "";
    const relativeDateText = relativeDate ? `<div class="task-date-info">${relativeDate}</div>` : "";
    const categoryText = `<span class="task-category category-${taskObj.category || 'other'}">${taskObj.category || 'other'}</span>`;

    task.innerHTML = `
      <div class="task-content">
        <div class="task-header">
          <h3>${taskObj.title}${categoryText}</h3>
          ${deadlineText}
        </div>
        <p>${taskObj.notes || '<em>No notes</em>'}</p>
        ${relativeDateText}
        <div class="task-buttons">
          <button class="done-btn">Mark Done</button>
          <button class="notdone-btn">Mark Not Done</button>
          <button class="edit-btn">Edit</button>
          <button class="remove-btn">Remove</button>
        </div>
      </div>
      
      <div class="edit-form">
        <input type="text" class="edit-title" value="${taskObj.title}" placeholder="Task Title">
        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
          <input type="date" class="edit-deadline" value="${taskObj.deadline || ''}">
          <input type="time" class="edit-time" value="${taskObj.time || ''}">
          <select class="edit-category">
            <option value="other" ${taskObj.category === 'other' ? 'selected' : ''}>Other</option>
            <option value="work" ${taskObj.category === 'work' ? 'selected' : ''}>Work</option>
            <option value="personal" ${taskObj.category === 'personal' ? 'selected' : ''}>Personal</option>
            <option value="shopping" ${taskObj.category === 'shopping' ? 'selected' : ''}>Shopping</option>
            <option value="health" ${taskObj.category === 'health' ? 'selected' : ''}>Health</option>
          </select>
        </div>
        <textarea class="edit-notes" placeholder="Add notes...">${taskObj.notes || ''}</textarea>
        <div class="form-buttons">
          <button class="save-btn">Save Changes</button>
          <button class="cancel-btn">Cancel</button>
        </div>
      </div>
    `;

    // Event listeners for task buttons
    const doneBtn = task.querySelector(".done-btn");
    const notdoneBtn = task.querySelector(".notdone-btn");
    const editBtn = task.querySelector(".edit-btn");
    const removeBtn = task.querySelector(".remove-btn");
    const saveBtn = task.querySelector(".save-btn");
    const cancelBtn = task.querySelector(".cancel-btn");

    doneBtn.addEventListener("click", () => {
      const taskIndex = tasks.findIndex(t => t.id === taskObj.id);
      if (taskIndex !== -1) {
        tasks[taskIndex].status = "done";
        saveTasks();
        renderTasks();
      }
    });

    notdoneBtn.addEventListener("click", () => {
      const taskIndex = tasks.findIndex(t => t.id === taskObj.id);
      if (taskIndex !== -1) {
        tasks[taskIndex].status = "notdone";
        saveTasks();
        renderTasks();
      }
    });

    editBtn.addEventListener("click", () => {
      if (editingTaskId === taskObj.id) {
        // Cancel editing
        editingTaskId = null;
      } else {
        // Start editing
        editingTaskId = taskObj.id;
      }
      renderTasks();
    });

    removeBtn.addEventListener("click", () => {
      taskToDelete = taskObj.id;
      confirmModal.style.display = "block";
    });

    saveBtn.addEventListener("click", () => {
      const taskIndex = tasks.findIndex(t => t.id === taskObj.id);
      if (taskIndex !== -1) {
        const editTitle = task.querySelector(".edit-title").value.trim();
        const editDeadline = task.querySelector(".edit-deadline").value;
        const editTime = task.querySelector(".edit-time").value;
        const editCategory = task.querySelector(".edit-category").value;
        const editNotes = task.querySelector(".edit-notes").value.trim();

        if (editTitle) {
          tasks[taskIndex].title = editTitle;
          tasks[taskIndex].deadline = editDeadline;
          tasks[taskIndex].time = editTime;
          tasks[taskIndex].category = editCategory;
          tasks[taskIndex].notes = editNotes;
          
          editingTaskId = null;
          saveTasks();
          renderTasks();
        }
      }
    });

    cancelBtn.addEventListener("click", () => {
      editingTaskId = null;
      renderTasks();
    });

    // Show/hide edit form
    if (editingTaskId === taskObj.id) {
      task.querySelector(".task-content").style.display = "none";
      task.querySelector(".edit-form").classList.add("active");
    } else {
      task.querySelector(".task-content").style.display = "block";
      task.querySelector(".edit-form").classList.remove("active");
    }

    // Drag and drop functionality
    task.draggable = true;
    task.addEventListener("dragstart", (e) => {
      task.classList.add("dragging");
      e.dataTransfer.setData("text/plain", taskObj.id);
    });

    task.addEventListener("dragend", () => {
      task.classList.remove("dragging");
    });

    task.addEventListener("dragover", (e) => {
      e.preventDefault();
    });

    task.addEventListener("drop", (e) => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData("text/plain");
      const draggedIndex = tasks.findIndex(t => t.id === draggedId);
      const targetIndex = tasks.findIndex(t => t.id === taskObj.id);
      
      if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
        const draggedTask = tasks.splice(draggedIndex, 1)[0];
        tasks.splice(targetIndex, 0, draggedTask);
        saveTasks();
        renderTasks();
      }
    });

    taskList.appendChild(task);
  });

  updateStats();
}

// -------- MODAL FUNCTIONALITY --------
confirmDelete.addEventListener("click", () => {
  if (taskToDelete) {
    const taskIndex = tasks.findIndex(t => t.id === taskToDelete);
    if (taskIndex !== -1) {
      tasks.splice(taskIndex, 1);
      saveTasks();
      renderTasks();
    }
    taskToDelete = null;
  }
  confirmModal.style.display = "none";
});

cancelDelete.addEventListener("click", () => {
  taskToDelete = null;
  confirmModal.style.display = "none";
});

// Close modal when clicking outside
confirmModal.addEventListener("click", (e) => {
  if (e.target === confirmModal) {
    taskToDelete = null;
    confirmModal.style.display = "none";
  }
});

// -------- TASK FORM --------
taskForm.addEventListener("submit", function(e) {
  e.preventDefault();

  const title = document.getElementById("taskTitle").value.trim();
  const deadline = document.getElementById("taskDeadline").value;
  const time = document.getElementById("taskTime").value;
  const category = document.getElementById("taskCategory").value;
  const notes = document.getElementById("taskNotes").value.trim();

  if (title === "") return;

  const newTask = {
    id: generateId(),
    title,
    deadline,
    time,
    category,
    notes,
    status: "pending",
    createdAt: new Date().toISOString()
  };

  tasks.push(newTask);
  saveTasks();
  renderTasks();

  taskForm.reset();
});

// -------- FILTER FUNCTIONALITY --------
filterButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    filterButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderTasks();
  });
});

// -------- KEYBOARD SHORTCUTS --------
document.addEventListener("keydown", (e) => {
  // Escape to cancel editing or close modal
  if (e.key === "Escape") {
    if (editingTaskId) {
      editingTaskId = null;
      renderTasks();
    }
    if (confirmModal.style.display === "block") {
      taskToDelete = null;
      confirmModal.style.display = "none";
    }
  }
  
  // Ctrl/Cmd + Enter to add task quickly
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    const titleInput = document.getElementById("taskTitle");
    if (titleInput.value.trim()) {
      taskForm.dispatchEvent(new Event("submit"));
    }
  }
  
  // Focus search with Ctrl/Cmd + F
  if ((e.ctrlKey || e.metaKey) && e.key === "f") {
    e.preventDefault();
    searchInput.focus();
  }
});

// -------- DATA EXPORT --------
function exportTasks() {
  const dataStr = JSON.stringify(tasks, null, 2);
  const dataBlob = new Blob([dataStr], {type: 'application/json'});
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `tasks_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Add export functionality (you can add a button for this in HTML if needed)
window.exportTasks = exportTasks;

// -------- INITIAL RENDER --------
renderTasks();