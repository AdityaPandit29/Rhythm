# Rhythm  
### A Unified Productivity Engine for Habits, Routines & Tasks

Rhythm is a smart productivity app built with React Native that combines **habit tracking, time blocks, and task management** into one intelligent scheduling system.

Unlike traditional productivity apps that separate these features, Rhythm merges everything into a single scheduling engine to reduce mental load, prevent task pile-up, and build long-term discipline.

---

## 🚀 Why Rhythm?

Most productivity apps treat habits, routines, and tasks as separate modules.  
Rhythm integrates them into one unified engine that:

- Prevents scheduling conflicts  
- Automatically reschedules tasks  
- Tracks streaks and late status  
- Syncs notifications in real-time  
- Dynamically maps weekly schedules to real calendar dates  

Result → **Consistency without cognitive overload.**

---

# ✨ Features

## ✅ Habit Tracking
- Create recurring habits (weekday-based scheduling)
- Automatic streak tracking
- Smart late detection logic
- Auto-generate next 7-day reminders
- Real-time status updates (Upcoming / Ongoing / Late / Completed)

---

## ⏱ Time Blocks & Routine System
- Create protected routine blocks
- Prevent habit/task conflicts inside blocks
- Weekly schedule auto-mapped to actual calendar dates
- Dynamic block status detection
- Intelligent start-button logic

---

## 📝 Task Management
- Add / Edit / Delete tasks
- Schedule tasks with reminders
- Automatic notification rescheduling
- Real-time sync with SQLite storage

---

## 🔔 Smart Notification Engine
- Automatic notification refresh on:
  - App launch
  - Block updates
  - Task updates
- Android notification channel support
- Dynamic reminder generation
- Real-time sync between UI & scheduled notifications

---

## 🧠 Intelligent Scheduling Logic

Rhythm uses a logic-first architecture:

- Weekday-based blocks dynamically converted to real dates
- Current block state computed in real time
- Late habit detection algorithm
- Auto-rescheduling engine
- Notification lifecycle management

This makes the app behave like a **mini productivity operating system.**

---

# 🏗 Tech Stack

- **React Native (Expo)**
- **JavaScript (Functional Components + Hooks)**
- **Expo Notifications**
- **Expo SQLite**
- **EAS Build**
- SQLite-based persistent storage

---

# 📂 Project Structure

```
rhythm/  
│  
├── assets/                     # Images, icons, screenshots  
│  
├── src/  
│   ├── components/             # Reusable UI components  
│   │   ├── HabitCard.jsx   
│   │   ├── RoutineCard.jsx  
│   │   ├── TaskCard.jsx  
│   │  
│   ├── database/               # SQLite layer
│   │   ├── DatabaseSetup.js
│   │
│   ├── screens/                # App screens  
│   │   ├── Dashboard.jsx    
│   │   ├── EditHabit.jsx      
│   │   ├── EditRoutine.jsx      
│   │   ├── EditTask.jsx  
│   │   ├── Habits.jsx      
│   │   ├── HabitsStack.jsx      
│   │   ├── Routines.jsx     
│   │   ├── RoutinesStack.jsx      
│   │   ├── Tasks.jsx      
│   │   └── TasksStack.jsx      
│   │    
│   └── utils/                  # Helper functions  
│   │   ├── notify.js  
│   │   ├── quotes.js  
│   │   └── scheduling.js  
│  
├── App.js                      # Root component  
├── app.json  
├── package.json  
└── eas.json  
```

Architecture principles:
- Clean separation of concerns
- Reusable logic modules
- State-driven UI updates
- Persistent local storage

---

# 📦 Installation

```bash
git clone https://github.com/AdityaPandit29/Rhythm.git
cd project-name
npm install
npx expo start
```

# 🔧 Build APK (Android Testing)

To generate an Android APK for testing, run:

```bash
eas build -p android --profile preview
```

---

## 📥 After Build Completes

- Download the generated APK  
- Install it on your Android device  
- Uninstall the old version if a package conflict occurs  

---

# 📸 Screenshots

## Example Structure

```
/assets/screenshots/home.png
/assets/screenshots/habits.png
/assets/screenshots/blocks.png
/assets/screenshots/tasks.png
```

---

# 📌 Future Improvements

- ⏳ Daily Goal Timer with performance scoring  
- 📊 Analytics Dashboard  
- ☁️ Cloud Sync  
- 🌙 Dark Mode Enhancements  
- 🤖 AI-based Habit Suggestions  
- 🎮 Gamification System  

---

# 🎯 Motivation

Many productivity apps increase cognitive load instead of reducing it.

Rhythm was built to:

- Minimize decision fatigue  
- Prevent schedule conflicts  
- Encourage consistency  
- Reward discipline through streak systems  
- Automate planning  

It is designed as a **structured daily operating system for ambitious individuals.**

---

# 💡 What Makes This Project Strong

- Advanced scheduling logic  
- Real-time notification syncing  
- Persistent local database architecture  
- Clean hook-based React Native design  
- Scalable foundation for analytics & cloud integration  
