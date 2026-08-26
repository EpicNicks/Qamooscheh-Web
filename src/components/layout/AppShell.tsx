import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import styles from "./AppShell.module.css";

const NAV_ITEMS = [
  { to: "/path", label: "Learn" },
  { to: "/leagues", label: "Leagues" },
  { to: "/friends", label: "Friends" },
  { to: "/profile", label: "Profile" },
  { to: "/settings", label: "Settings" },
];

export function AppShell() {
  const { logout } = useAuth();

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
        <button type="button" className={styles.signOut} onClick={() => void logout()}>
          Sign out
        </button>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
