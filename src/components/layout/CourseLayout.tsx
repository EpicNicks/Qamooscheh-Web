import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import styles from "./CourseLayout.module.css";

/** Wraps course-content pages (the journey, each category library) with the sidebar. Lesson/story/checkpoint stay outside this — focused single-task screens, not browsing. */
export function CourseLayout() {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}
