"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import {
  RiHomeLine,
  RiSettings4Line,
  RiUser3Line,
  RiMapPinLine,
} from "react-icons/ri";
import styles from "./Sidebar.module.css";

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [configureExpanded, setConfigureExpanded] = useState(
    () =>
      pathname?.includes("/configure") ||
      pathname?.includes("/groups") ||
      pathname?.includes("/tags") ||
      pathname?.includes("/sports")
  );

  const [locationsExpanded, setLocationsExpanded] = useState(() =>
    pathname?.includes("/locations")
  );

  const isActive = (path: string) =>
    pathname === path || pathname?.startsWith(`${path}/`);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoContainer}>
        <Link href="/dashboard">
          <Image
            src="/bord.svg"
            alt="Bord Logo"
            width={40}
            height={40}
            className={styles.logo}
          />
        </Link>
      </div>

      <nav className={styles.navItems}>
        <Link
          href="/dashboard"
          className={`${styles.navItem} ${
            isActive("/dashboard") ? styles.active : ""
          }`}
        >
          <RiHomeLine className={styles.icon} />
          <span className={styles.navLabel}>Dashboard</span>
        </Link>

        <button
          onClick={() => setLocationsExpanded(!locationsExpanded)}
          className={`${styles.navItem} ${
            isActive("/locations") ? styles.active : ""
          }`}
        >
          <RiMapPinLine className={styles.icon} />
          <span className={styles.navLabel}>Locations</span>
        </button>

        {locationsExpanded && (
          <div className={styles.subnav}>
            <Link
              href="/locations"
              className={`${styles.subnavItem} ${
                pathname === "/locations" ? styles.subactive : ""
              }`}
            >
              <span className={styles.navLabel}>Full Library</span>
            </Link>
            <Link
              href="/locations/requests"
              className={`${styles.subnavItem} ${
                isActive("/locations/requests") ? styles.subactive : ""
              }`}
            >
              <span className={styles.navLabel}>Requests</span>
            </Link>
          </div>
        )}

        <button
          onClick={() => setConfigureExpanded(!configureExpanded)}
          className={`${styles.navItem} ${
            isActive("/configure") ||
            isActive("/sports") ||
            isActive("/groups") ||
            isActive("/tags")
              ? styles.active
              : ""
          }`}
        >
          <RiSettings4Line className={styles.icon} />
          <span className={styles.navLabel}>Configure</span>
        </button>

        {configureExpanded && (
          <div className={styles.subnav}>
            <Link
              href="/sports"
              className={`${styles.subnavItem} ${
                isActive("/sports") ? styles.subactive : ""
              }`}
            >
              <span className={styles.navLabel}>Sports</span>
            </Link>
            <Link
              href="/groups"
              className={`${styles.subnavItem} ${
                isActive("/groups") ? styles.subactive : ""
              }`}
            >
              <span className={styles.navLabel}>Groups</span>
            </Link>
            <Link
              href="/tags"
              className={`${styles.subnavItem} ${
                isActive("/tags") ? styles.subactive : ""
              }`}
            >
              <span className={styles.navLabel}>Tags</span>
            </Link>
          </div>
        )}
      </nav>
    </aside>
  );
}
