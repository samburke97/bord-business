"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import SearchInput from "@/components/ui/SearchInput";
import Button from "@/components/ui/Button";
import DataTable, { Column } from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";
import styles from "./TagsPage.module.css";
import Image from "next/image";
import TitleDescription from "../ui/TitleDescription";

interface Tag {
  id: string;
  name: string;
  imageUrl?: string;
  groupCount: number;
}

export default function TagsPage() {
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>([]);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchTags = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/tags");
        if (!response.ok) {
          throw new Error("Failed to fetch tags");
        }
        const data = await response.json();
        setTags(data);
        setFilteredTags(data);
      } catch (error) {
        console.error("Error fetching tags:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTags();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = tags.filter((tag) =>
        tag.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTags(filtered);
    } else {
      setFilteredTags(tags);
    }
  }, [searchQuery, tags]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleRowClick = (tag: Tag) => {
    router.push(`/tags/${tag.id}`);
  };

  const handleCreateTag = () => {
    router.push("/tags/create");
  };

  const handleUpload = () => {};

  const columns: Column<Tag>[] = [
    {
      key: "name",
      header: "Tag Name",
      render: (row) => (
        <div className={styles.tagNameCell}>
          <span>{row.name}</span>
        </div>
      ),
    },
    {
      key: "groupCount",
      header: "Groups",
      width: "100px",
      align: "right",
    },
  ];

  return (
    <div className={styles.pageContainer}>
      <div className={styles.container}>
        <div className={styles.header}>
          <TitleDescription title={"Tags"} count={tags.length} />
          <div className={styles.actions}>
            <Button variant="secondary" onClick={handleUpload}>
              Upload
            </Button>
            <Button onClick={handleCreateTag}>Create</Button>
          </div>
        </div>

        <div className={styles.searchContainer}>
          <SearchInput
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onClear={() => handleSearch("")}
            placeholder="Search our tag database"
          />
        </div>

        {filteredTags.length === 0 && !isLoading ? (
          <EmptyState
            message="No tags found."
            createNewLink="/tags/create"
            createNewLabel="Create Tag"
          />
        ) : (
          <DataTable
            columns={columns}
            data={filteredTags}
            keyField="id"
            onRowClick={handleRowClick}
            isLoading={isLoading}
            itemType="tag"
          />
        )}
      </div>
    </div>
  );
}
