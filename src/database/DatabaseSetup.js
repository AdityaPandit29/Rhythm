import { useEffect } from "react";
import { useSQLiteContext } from "expo-sqlite";

export default function DatabaseSetup() {
  const db = useSQLiteContext();

  useEffect(() => {
    const createTables = async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS routines (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          start_time TEXT,
          end_time TEXT,
          start_minutes INTEGER,
          end_minutes INTEGER
        );


        CREATE TABLE IF NOT EXISTS routine_days (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          routineId INTEGER,
          day INTEGER NOT NULL,
          FOREIGN KEY (routineId) REFERENCES routines(id)
        );

        CREATE TABLE IF NOT EXISTS habits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          start_time TEXT,       
          end_time TEXT,           
          start_minutes INTEGER,    
          end_minutes INTEGER,      
          current_streak INTEGER DEFAULT 0,
          best_streak INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS habit_days (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          habitId INTEGER NOT NULL,
          day INTEGER NOT NULL,
          FOREIGN KEY (habitId) REFERENCES habits(id)
        );

        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          priority TEXT CHECK (priority IN ('High','Medium','Low')) DEFAULT 'Medium',
          is_auto INTEGER DEFAULT 1,    
          deadline TEXT,                     
          total_duration INTEGER,             -- minutes (required if is_auto = 1)
          duration_left INTEGER,         -- minutes (ONLY for auto tasks)
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS task_schedules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          taskId INTEGER NOT NULL,
          date TEXT NOT NULL,             -- YYYY-MM-DD (scheduled day)
          start_time TEXT,
          end_time TEXT,
          start_minutes INTEGER,
          end_minutes INTEGER,
          duration INTEGER,               -- working minutes THIS day
          FOREIGN KEY (taskId)
          REFERENCES tasks(id)
          ON DELETE CASCADE
        );

      `);

      const schema = await db.getAllAsync(`
        SELECT sql FROM sqlite_master 
        WHERE type='table' AND name='habits';
      `);
      console.log(schema);
    };

    createTables();
  }, []);

  return null; // nothing to render
}
