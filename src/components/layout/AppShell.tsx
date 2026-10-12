import { useEffect, useLayoutEffect, useRef, type ComponentType } from "react";
import { NavLink, Outlet, useLocation, useNavigationType } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { useBootstrap } from "../../hooks/useBootstrap";
import { useOfflineQueueFlush } from "../../hooks/useOfflineQueueFlush";
import { useIsMobile } from "../../hooks/useMediaQuery";
import { useMobileDrawer } from "../../hooks/useMobileDrawer";
import { CourseSwitcher } from "./CourseSwitcher";
import { StreakCounter } from "./StreakCounter";
import { TotalXp } from "./TotalXp";
import { Sidebar } from "./Sidebar";
import { DailyGoalRing } from "../path/DailyGoalRing";
import { NavDrawer } from "./NavDrawer";
import { MenuIcon, TrophyIcon, PeopleIcon, AccountCircleIcon, SettingsIcon, HelpIcon, type IconProps } from "../common/icons";
import styles from "./AppShell.module.css";

// Account-level pages only — course-content browsing (the journey, each
// category) lives in the sidebar (Sidebar.tsx), not here. Below the mobile
// breakpoint the same <nav> becomes a tab bar along the bottom of the screen,
// icon over label (AppShell.module.css, issue #40); `icon` is hidden above
// it. Both render always, on both layouts, so there is never a JS/CSS
// mismatch right at the breakpoint.
const NAV_ITEMS: { to: string; label: string; icon: ComponentType<IconProps> }[] = [
  { to: "/leagues", label: "Leagues", icon: TrophyIcon },
  { to: "/friends", label: "Friends", icon: PeopleIcon },
  { to: "/profile", label: "Profile", icon: AccountCircleIcon },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
  { to: "/help", label: "Help", icon: HelpIcon },
];

// Lesson/story/practice/checkpoint are full-screen, focused exercise
// flows — the header and sidebar would just be a way to accidentally
// navigate away mid-answer, so neither renders while one of these is active.
const LESSON_MODE_PATH = /^\/(lesson|story|practice|checkpoint)(\/|$)/;

export function AppShell() {
  const { logout } = useAuth();
  const { pendingCount, isFlushing } = useOfflineQueueFlush();
  const bootstrap = useBootstrap();
  const location = useLocation();
  const navigationType = useNavigationType();
  const isLessonMode = LESSON_MODE_PATH.test(location.pathname);

  // React Router leaves the window where it was, so a page opened from a
  // scrolled one (the journey, say) would start scrolled too. Every page
  // starts at the top, except: back/forward, which the browser restores; a
  // #hash, which its page scrolls to itself (HelpPage); and the journey, which
  // centres on the learner's current lesson (PathPage).
  useEffect(() => {
    if (navigationType === "POP" || location.hash || location.pathname === "/path") return;
    window.scrollTo(0, 0);
  }, [location.pathname, location.hash, navigationType]);
  const shellRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const isMobile = useIsMobile();
  const { isOpen: drawerOpen, open: openDrawer, close: closeDrawer, panelRef: drawerPanelRef, triggerRef: drawerTriggerRef } = useMobileDrawer({
    enabled: isMobile && !isLessonMode,
    pathname: location.pathname,
  });

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
    <div className={isLessonMode ? styles.shell : `${styles.shell} ${styles.withNav}`} ref={shellRef}>
      {!isLessonMode && (
        <header className={styles.header} ref={headerRef}>
          <button
            type="button"
            ref={drawerTriggerRef}
            className={styles.drawerToggle}
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
            aria-controls="app-nav-drawer"
            onClick={() => (drawerOpen ? closeDrawer() : openDrawer("button"))}
          >
            <MenuIcon />
          </button>
          <span className={styles.brand}>ParsLing</span>
          <nav className={styles.nav} aria-label="Main">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
                // Always present, on BOTH layouts: `display: none` on the label
                // removes it from the accessibility tree too, so on mobile the
                // link would otherwise have no accessible name (icons.tsx's
                // SVGs are all aria-hidden by design). aria-label overrides the
                // visible text anyway, so both layouts announce identically.
                aria-label={label}
                title={label}
              >
                <Icon className={styles.navIcon} />
                <span className={styles.navLabel}>{label}</span>
              </NavLink>
            ))}
          </nav>
          {/* The header's right-hand side, kept together so it stays pinned
              right on mobile once the nav has moved to the bottom. */}
          <div className={styles.status}>
            {pendingCount > 0 && (
              <span
                className={styles.syncBadge}
                role="status"
                title="Lessons saved offline, waiting to sync"
                aria-label={isFlushing ? "Syncing saved lessons" : `${pendingCount} lessons waiting to sync`}
              >
                <span className={styles.syncDot} aria-hidden="true" />
                <span className={styles.syncText}>{isFlushing ? "Syncing…" : `${pendingCount} pending sync`}</span>
              </span>
            )}
            <TotalXp />
            <StreakCounter />
            {/* On mobile the daily goal lives up here, beside the streak, rather
                than taking a row of its own above the path (PathPage). */}
            {isMobile && <DailyGoalRing courseCode={bootstrap.data?.course?.code} compact />}
            <CourseSwitcher />
            <button type="button" className={styles.signOut} onClick={() => void logout()}>
              Sign out
            </button>
          </div>
        </header>
      )}
      <div className={styles.body}>
        {!isLessonMode &&
          (isMobile ? (
            <NavDrawer
              id="app-nav-drawer"
              isOpen={drawerOpen}
              panelRef={drawerPanelRef}
              onClose={closeDrawer}
              onSignOut={() => void logout()}
            >
              <Sidebar variant="drawer" />
            </NavDrawer>
          ) : (
            <Sidebar variant="rail" />
          ))}
        <main className={styles.main}>
          <div className={styles.mainInner}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
