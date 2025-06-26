"use client";

import Sidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";
import styles from "./MainLayout.module.css";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <div className={styles.contentContainer}>
        <TopNavbar />
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
