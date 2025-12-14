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
          day TEXT NOT NULL,
          FOREIGN KEY (routineId) REFERENCES routines(id)
        );

        CREATE TABLE IF NOT EXISTS habits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          duration_minutes INTEGER NOT NULL,
          is_auto INTEGER NOT NULL DEFAULT 1, 

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
          day TEXT NOT NULL,
          FOREIGN KEY (habitId) REFERENCES habits(id)
        );


      `);

      console.log("routine and routine_days tables created.");
    };

    createTables();
  }, []);

  return null; // nothing to render
}
