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
      `);

      console.log("routine and routine_days tables created.");
    };

    createTables();
  }, []);

  return null; // nothing to render
}
