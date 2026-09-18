import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";

const db = new Database("xd_genie.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    student_id TEXT UNIQUE,
    college TEXT,
    password TEXT,
    mom_phone TEXT,
    genie_name TEXT,
    genie_personality TEXT,
    has_pet INTEGER DEFAULT 0,
    pet_name TEXT,
    is_setup_complete INTEGER DEFAULT 0,
    focus_hours INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    medals_count INTEGER DEFAULT 0,
    consecutive_days INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    name TEXT,
    location TEXT,
    day_of_week INTEGER,
    start_time TEXT,
    end_time TEXT,
    total_lessons INTEGER DEFAULT 16,
    completed_lessons INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    title TEXT,
    description TEXT,
    status TEXT DEFAULT 'pending',
    source TEXT DEFAULT 'self', -- 'self' or 'family'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Migration: Add missing columns if they don't exist (for existing databases)
const tableInfo = db.prepare("PRAGMA table_info(users)").all() as any[];
const columnNames = tableInfo.map(info => info.name);

if (!columnNames.includes('genie_name')) {
  db.exec("ALTER TABLE users ADD COLUMN genie_name TEXT");
}
if (!columnNames.includes('genie_personality')) {
  db.exec("ALTER TABLE users ADD COLUMN genie_personality TEXT");
}
if (!columnNames.includes('has_pet')) {
  db.exec("ALTER TABLE users ADD COLUMN has_pet INTEGER DEFAULT 0");
}
if (!columnNames.includes('pet_name')) {
  db.exec("ALTER TABLE users ADD COLUMN pet_name TEXT");
}
if (!columnNames.includes('college')) {
  db.exec("ALTER TABLE users ADD COLUMN college TEXT");
}
if (!columnNames.includes('password')) {
  db.exec("ALTER TABLE users ADD COLUMN password TEXT");
}
if (!columnNames.includes('mom_phone')) {
  db.exec("ALTER TABLE users ADD COLUMN mom_phone TEXT");
}
if (!columnNames.includes('focus_hours')) {
  db.exec("ALTER TABLE users ADD COLUMN focus_hours INTEGER DEFAULT 0");
}
if (!columnNames.includes('tasks_completed')) {
  db.exec("ALTER TABLE users ADD COLUMN tasks_completed INTEGER DEFAULT 0");
}
if (!columnNames.includes('medals_count')) {
  db.exec("ALTER TABLE users ADD COLUMN medals_count INTEGER DEFAULT 0");
}
if (!columnNames.includes('consecutive_days')) {
  db.exec("ALTER TABLE users ADD COLUMN consecutive_days INTEGER DEFAULT 1");
}

const courseTableInfo = db.prepare("PRAGMA table_info(courses)").all() as any[];
const courseColumnNames = courseTableInfo.map(info => info.name);
if (!courseColumnNames.includes('location')) {
  db.exec("ALTER TABLE courses ADD COLUMN location TEXT");
}
if (!courseColumnNames.includes('total_lessons')) {
  db.exec("ALTER TABLE courses ADD COLUMN total_lessons INTEGER DEFAULT 16");
}
if (!courseColumnNames.includes('completed_lessons')) {
  db.exec("ALTER TABLE courses ADD COLUMN completed_lessons INTEGER DEFAULT 0");
}

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // Mock School Login
  app.post("/api/login", (req, res) => {
    const { studentId, password } = req.body;
    let user = db.prepare("SELECT * FROM users WHERE student_id = ?").get(studentId) as any;
    
    if (!user) {
      return res.status(404).json({ error: "User not found. Please register." });
    }

    if (password && user.password && user.password !== password) {
      return res.status(401).json({ error: "Invalid password." });
    }
    
    res.json(user);
  });

  app.post("/api/register", (req, res) => {
    const { name, studentId, college, password, momPhone } = req.body;
    try {
      const id = Math.random().toString(36).substring(7);
      db.prepare("INSERT INTO users (id, name, student_id, college, password, mom_phone) VALUES (?, ?, ?, ?, ?, ?)").run(
        id, name, studentId, college, password, momPhone
      );
      
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;

      // Seed some mock courses
      const courses = [
        { name: "操作系统", location: "@A101", day: 1, start: "08:30", end: "10:05", total: 16, completed: 0 },
        { name: "信号系统", location: "@B202", day: 1, start: "10:25", end: "12:00", total: 16, completed: 0 },
        { name: "数电", location: "@C303", day: 1, start: "14:00", end: "15:35", total: 16, completed: 0 },
        { name: "高数", location: "@D404", day: 1, start: "15:55", end: "17:30", total: 16, completed: 0 },
        { name: "计算机组成原理", location: "@C205", day: 3, start: "10:00", end: "12:00", total: 16, completed: 6 },
      ];
      
      const insertCourse = db.prepare("INSERT INTO courses (user_id, name, location, day_of_week, start_time, end_time, total_lessons, completed_lessons) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
      courses.forEach(c => insertCourse.run(user.id, c.name, c.location, c.day, c.start, c.end, c.total, c.completed));

      db.prepare("INSERT INTO tasks (user_id, title, description, source) VALUES (?, ?, ?, ?)").run(
        user.id, "吃苹果 🍎", "妈妈的任务：Genie也想吃...", "family"
      );
      db.prepare("INSERT INTO tasks (user_id, title, description, source) VALUES (?, ?, ?, ?)").run(
        user.id, "预习数电第4章", "预计1.5h", "self"
      );

      res.json(user);
    } catch (error) {
      res.status(400).json({ error: "Registration failed. Student ID might already exist." });
    }
  });

  app.post("/api/setup", (req, res) => {
    const { userId, genieName, geniePersonality, hasPet, petName } = req.body;
    
    // Check if already setup
    const user = db.prepare("SELECT is_setup_complete FROM users WHERE id = ?").get(userId) as any;
    if (user?.is_setup_complete) {
      return res.status(400).json({ error: "Setup already completed and cannot be changed." });
    }

    db.prepare(`
      UPDATE users 
      SET genie_name = ?, genie_personality = ?, has_pet = ?, pet_name = ?, is_setup_complete = 1 
      WHERE id = ?
    `).run(genieName, geniePersonality, hasPet ? 1 : 0, petName || null, userId);

    const updatedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    res.json(updatedUser);
  });

  app.get("/api/courses/:userId", (req, res) => {
    const courses = db.prepare("SELECT * FROM courses WHERE user_id = ?").all(req.params.userId);
    res.json(courses);
  });

  app.patch("/api/courses/:id/progress", (req, res) => {
    const { completed_lessons } = req.body;
    db.prepare("UPDATE courses SET completed_lessons = ? WHERE id = ?").run(completed_lessons, req.params.id);
    res.json({ success: true });
  });

  app.get("/api/tasks/:userId", (req, res) => {
    const tasks = db.prepare("SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC").all(req.params.userId);
    res.json(tasks);
  });

  app.post("/api/tasks", (req, res) => {
    const { userId, title, description, source } = req.body;
    const result = db.prepare("INSERT INTO tasks (user_id, title, description, source) VALUES (?, ?, ?, ?)").run(userId, title, description, source || 'self');
    res.json({ id: result.lastInsertRowid });
  });

  app.patch("/api/tasks/:id", (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE tasks SET status = ? WHERE id = ?").run(status, req.params.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
