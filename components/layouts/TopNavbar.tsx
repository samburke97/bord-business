"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import styles from "./TopNavbar.module.css";
import Button from "../ui/Button";

export default function TopNavbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const getPageTitle = () => {
    const path = pathname?.split("/").pop();
    if (!path || path === "dashboard") return "Dashboard";
    return path.charAt(0).toUpperCase() + path.slice(1);
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <header className={styles.topNav}>
      <div>
        <span>{getPageTitle()}</span>
      </div>

      <div>
        {session?.user && (
          <Button onClick={handleLogout} variant="danger">
            Logout
          </Button>
        )}
      </div>
    </header>
  );
}
