import { useLayoutEffect, useRef } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { useOfflineQueueFlush } from "../../hooks/useOfflineQueueFlush";
import { CourseSwitcher } from "./CourseSwitcher";
import { Sidebar } from "./Sidebar";
import styles from "./AppShell.module.css";

// Account-level pages only — course-content browsing (the journey, each
// category) lives in the sidebar (Sidebar.tsx), not here.
const NAV_ITEMS = [
  { to: "/leagues", label: "Leagues" },
  { to: "/friends", label: "Friends" },
  { to: "/profile", label: "Profile" },
  { to: "/settings", label: "Settings" },
  { to: "/help", label: "Help" },
];

// Lesson/story/practice/checkpoint are full-screen, focused exercise
// flows — the header and sidebar would just be a way to accidentally
// navigate away mid-answer, so neither renders while one of these is active.
const LESSON_MODE_PATH = /^\/(lesson|story|practice|checkpoint)(\/|$)/;

export function AppShell() {
  const { logout } = useAuth();
  const { pendingCount, isFlushing } = useOfflineQueueFlush();
  const location = useLocation();
  const isLessonMode = LESSON_MODE_PATH.test(location.pathname);
  const shellRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // The sidebar sticks just below the header, so it needs to know the
  // header's real rendered height (it varies with content/zoom) rather
  // than a guessed constant — kept in sync via ResizeObserver.
  useLayoutEffect(() => {
    const header = headerRef.current;
    const shell = shellRef.current;
    if (!header || !shell || isLessonMode) return;
    // contentRect excludes padding/border, which would understate the
    // header's true height and make the sidebar stick a bit too high —
    // use the border-box height (offsetHeight) instead so the gap above
    // the top sidebar item matches whether it's stuck or not.
    const observer = new ResizeObserver(() => {
      shell.style.setProperty("--header-height", `${header.offsetHeight}px`);
    });
    observer.observe(header);
    return () => observer.disconnect();
  }, [isLessonMode]);

  return (
    <div className={styles.shell} ref={shellRef}>
      {!isLessonMode && (
        <header className={styles.header} ref={headerRef}>
          <span className={styles.brand}>ParsLing</span>
          <nav className={styles.nav}>
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          {pendingCount > 0 && (
            <span className={styles.syncBadge} title="Lessons saved offline, waiting to sync">
              {isFlushing ? "Syncing…" : `${pendingCount} pending sync`}
            </span>
          )}
          <CourseSwitcher />
          <button type="button" className={styles.signOut} onClick={() => void logout()}>
            Sign out
          </button>
        </header>
      )}
      <div className={styles.body}>
        {!isLessonMode && <Sidebar />}
        <main className={styles.main}>
          <div className={styles.mainInner}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
