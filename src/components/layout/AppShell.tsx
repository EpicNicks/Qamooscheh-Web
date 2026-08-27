import { NavLink, Outlet } from "react-router-dom";
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
];

export function AppShell() {
  const { logout } = useAuth();
  const { pendingCount, isFlushing } = useOfflineQueueFlush();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <span className={styles.brand}>Qamooscheh</span>
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
      <div className={styles.body}>
        <Sidebar />
        <main className={styles.main}>
          <div className={styles.mainInner}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
