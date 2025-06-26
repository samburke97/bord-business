"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SearchInput from "@/components/ui/SearchInput";
import Button from "@/components/ui/Button";
import DataTable, { Column } from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";
import styles from "./SportsPage.module.css";
import TitleDescription from "@/components/ui/TitleDescription";

interface Sport {
  id: string;
  name: string;
  imageUrl?: string | null;
  tagCount: number;
  centerCount: number;
}

export default function SportsPage() {
  const router = useRouter();
  const [sports, setSports] = useState<Sport[]>([]);
  const [filteredSports, setFilteredSports] = useState<Sport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchSports = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/sports${
            searchQuery ? `?query=${encodeURIComponent(searchQuery)}` : ""
          }`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch sports");
        }

        const data = await response.json();
        setSports(data);
        setFilteredSports(data);
      } catch (error) {
        console.error("Error fetching sports:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSports();
  }, [searchQuery]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleRowClick = (sport: Sport) => {
    router.push(`/sports/${sport.id}`);
  };

  const handleCreateSport = () => {
    router.push("/sports/create");
  };

  const columns: Column<Sport>[] = [
    {
      key: "name",
      header: "Sport Name",
      render: (row) => (
        <div className={styles.sportNameCell}>
          <span>{row.name}</span>
        </div>
      ),
    },
    {
      key: "tagCount",
      header: "Tags",
      width: "100px",
      align: "right",
    },
    {
      key: "centerCount",
      header: "Centers",
      width: "100px",
      align: "right",
    },
  ];

  return (
    <div className={styles.pageContainer}>
      <div className={styles.container}>
        <div className={styles.header}>
          <TitleDescription title={"Sports"} count={sports.length} />
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => {}}>
              Upload
            </Button>
            <Button onClick={handleCreateSport}>Create</Button>
          </div>
        </div>

        <div className={styles.searchContainer}>
          <SearchInput
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onClear={() => handleSearch("")}
            placeholder="Search our sports database"
          />
        </div>

        {filteredSports.length === 0 && !isLoading ? (
          <EmptyState
            message="No sports found."
            createNewLink="/sports/create"
            createNewLabel="Create Sport"
          />
        ) : (
          <DataTable
            columns={columns}
            data={filteredSports}
            keyField="id"
            onRowClick={handleRowClick}
            isLoading={isLoading}
            itemType="sport"
          />
        )}
      </div>
    </div>
  );
}
