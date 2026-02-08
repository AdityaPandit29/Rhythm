import { useEffect } from "react";
import { useSQLiteContext } from "expo-sqlite";

export default function DatabaseSetup() {
  const db = useSQLiteContext();

  useEffect(() => {
    const createTables = async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS routines (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS routine_schedules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          routineId INTEGER NOT NULL,

          day INTEGER NOT NULL,     
          start_minutes INTEGER NOT NULL,
          end_minutes INTEGER NOT NULL,

          FOREIGN KEY (routineId)
          REFERENCES routines(id)
          ON DELETE CASCADE
        );


        CREATE TABLE IF NOT EXISTS habits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,   
          current_streak INTEGER DEFAULT 0,
          best_streak INTEGER DEFAULT 0,
          duration INTEGER NOT NULL,
          last_done_date TEXT,
          last_counted_on TEXT
        );

        CREATE TABLE IF NOT EXISTS habit_schedules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          habitId INTEGER NOT NULL,

          day INTEGER NOT NULL,     
          start_minutes INTEGER NOT NULL,
          end_minutes INTEGER NOT NULL,

          FOREIGN KEY (habitId)
          REFERENCES habits(id)
          ON DELETE CASCADE
        ); 


        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,

          -- Only meaningful for AUTO tasks
          priority TEXT CHECK (priority IN ('High','Low')) DEFAULT 'Low',
          deadline_date TEXT,
          deadline_minutes INTEGER, 
          total_duration INTEGER,
          duration_left INTEGER,

          -- Task mode
          is_auto INTEGER NOT NULL, -- 1 = auto, 0 = manual

          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS task_schedules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          taskId INTEGER NOT NULL,

          date TEXT NOT NULL,        -- YYYY-MM-DD
          start_minutes INTEGER NOT NULL,
          end_minutes INTEGER NOT NULL,
          duration INTEGER NOT NULL,

          FOREIGN KEY (taskId)
          REFERENCES tasks(id)
          ON DELETE CASCADE
        );        
      `);

      const res = await db.getAllAsync(`
        SELECT * FROM habit_schedules;
      `);

      const des = await db.getAllAsync(`
        SELECT * FROM habits;
      `);

      // const pes = await db.getAllAsync(`
      //   SELECT * FROM task_schedules;
      // `);

      // console.log(des);
      // console.log(pes);
    };

    createTables();
  }, []);

  return null; // nothing to render
}
