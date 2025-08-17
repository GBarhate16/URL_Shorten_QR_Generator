"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { useUrls } from "@/hooks/use-urls";
import { useAnalytics } from "@/hooks/use-analytics";
import { useDashboardData } from "@/contexts/dashboard-data-context";
import type { ShortenedURL } from "@/hooks/use-urls";
import { useRouter } from "next/navigation";
import { API_CONFIG } from "@/config/api";
import { useAuth } from "@/contexts/auth-context";
import { safeArray, safeFilter, safeEvery, safeMap } from "@/lib/safe-arrays";

function normalize(text: string | null | undefined): string {
  return (text || "").toLowerCase();
}

export default function UrlsPage() {
  const router = useRouter();
  const { urls, isLoading, getFullShortUrl, mutate } = useUrls();
  const { mutate: refreshAnalytics } = useAnalytics("30d");
  const { refetchAll: refreshDashboardData } = useDashboardData();
  const { getValidAccessToken } = useAuth();

  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState(""); // YYYY-MM-DD
  const [deletingUrlId, setDeletingUrlId] = useState<number | null>(null);

  const navigateToCreateUrl = useCallback(() => {
    router.push("/dashboard/create-url");
  }, [router]);

  const deleteUrl = useCallback(
    async (urlId: number) => {
      const token = await getValidAccessToken();
      if (!token) {
        router.push("/login");
        return;
      }

      setDeletingUrlId(urlId);
      try {
        const response = await fetch(
          `${API_CONFIG.BASE_URL}/api/urls/${urlId}/`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          await mutate();
          await refreshAnalytics();
          await refreshDashboardData();
        } else {
          console.error("Failed to delete URL:", response.status);
        }
      } catch (error) {
        console.error("Error deleting URL:", error);
      } finally {
        setDeletingUrlId(null);
      }
    },
    [getValidAccessToken, router, mutate, refreshAnalytics, refreshDashboardData]
  );

  const filteredUrls: ShortenedURL[] = useMemo(() => {
    const source = safeArray(urls);
    const tokens = safeFilter(search.trim().toLowerCase().split(/\s+/), Boolean);

    return safeFilter(source, (u: ShortenedURL) => {
      if (filterDate) {
        const createdISO = new Date(u.created_at).toISOString().slice(0, 10);
        if (createdISO !== filterDate) return false;
      }

      if (tokens.length === 0) return true;

      const haystack = [
        normalize(u.title),
        normalize(u.short_code),
        normalize(u.original_url),
        normalize(getFullShortUrl(u.short_code)),
      ].join(" ");

      return safeEvery(tokens, (t) => haystack.includes(t));
    });
  }, [urls, search, filterDate, getFullShortUrl]);

  const clearFilters = useCallback(() => {
    setSearch("");
    setFilterDate("");
  }, []);

  return (
    <div className="p-3 sm:p-6">
      <div className="max-w-7xl mx-auto w-full">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 w-full">
              <h2 className="text-lg sm:text-xl font-semibold">
                Your Shortened URLs
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-7">
                  <Input
                    type="text"
                    label="Search"
                    placeholder="Search by title, short code, or original URL"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-3">
                  <Input
                    type="date"
                    label="Created on"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2 flex gap-2">
                  <Button variant="light" onPress={clearFilters}>
                    Clear
                  </Button>
                  <Button
                    color="primary"
                    variant="solid"
                    onPress={navigateToCreateUrl}
                  >
                    New
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading URLs...</p>
              </div>
            ) : !urls || urls.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No URLs created yet.{" "}
                <Button
                  color="primary"
                  variant="light"
                  onPress={navigateToCreateUrl}
                >
                  Create your first short URL
                </Button>
                !
              </div>
            ) : (
              <>
                {filteredUrls.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No results match your filters.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table
                      aria-label="Shortened URLs"
                      className="min-w-[800px] w-full"
                    >
                      <TableHeader>
                        <TableColumn className="w-[14%]">Title</TableColumn>
                        <TableColumn className="w-[24%]">
                          Original URL
                        </TableColumn>
                        <TableColumn className="w-[24%]">Short URL</TableColumn>
                        <TableColumn className="w-[8%] text-right">
                          Clicks
                        </TableColumn>
                        <TableColumn className="w-[10%]">QR</TableColumn>
                        <TableColumn className="w-[10%]">Created</TableColumn>
                        <TableColumn className="w-[10%]">Expires</TableColumn>
                        <TableColumn className="w-[10%] text-right">
                          Actions
                        </TableColumn>
                      </TableHeader>
                      <TableBody>
                        {safeMap(filteredUrls, (url) => (
                          <TableRow key={url.id}>
                            <TableCell>
                              <p className="font-medium truncate max-w-[180px] sm:max-w-[220px]">
                                {url.title || "Untitled"}
                              </p>
                            </TableCell>
                            <TableCell>
                              <a
                                href={url.original_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline truncate block max-w-[200px] sm:max-w-[320px]"
                              >
                                {url.original_url}
                              </a>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 min-w-0">
                                <a
                                  href={getFullShortUrl(url.short_code)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline truncate block max-w-[200px] sm:max-w-[320px] font-mono text-sm"
                                >
                                  {getFullShortUrl(url.short_code)}
                                </a>
                                <Button
                                  size="sm"
                                  variant="light"
                                  onPress={() =>
                                    navigator.clipboard.writeText(
                                      getFullShortUrl(url.short_code)
                                    )
                                  }
                                >
                                  Copy
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium tabular-nums text-right block">
                                {url.click_count}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="light"
                                onPress={async () => {
                                  const accessToken =
                                    typeof window !== "undefined"
                                      ? localStorage.getItem("accessToken")
                                      : null;
                                  if (!accessToken) {
                                    router.push("/login");
                                    return;
                                  }
                                  const resp = await fetch(
                                    `${API_CONFIG.BASE_URL}/api/urls/${url.id}/qr-download/`,
                                    {
                                      headers: {
                                        Authorization: `Bearer ${accessToken}`,
                                      },
                                    }
                                  );
                                  if (!resp.ok) return;
                                  const blob = await resp.blob();
                                  const objectUrl =
                                    window.URL.createObjectURL(blob);
                                  const a = document.createElement("a");
                                  a.href = objectUrl;
                                  a.download = `${(
                                    url.title ||
                                    url.short_code ||
                                    "qr"
                                  )
                                    .toLowerCase()
                                    .replace(/[^a-z0-9]+/g, "-")}.png`;
                                  document.body.appendChild(a);
                                  a.click();
                                  a.remove();
                                  window.URL.revokeObjectURL(objectUrl);
                                }}
                              >
                                Download QR
                              </Button>
                            </TableCell>
                            <TableCell>
                              {new Date(url.created_at).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              {url.expires_at ? (
                                new Date(url.expires_at).toLocaleString()
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-2 justify-end">
                                <Button
                                  size="sm"
                                  variant="light"
                                  color="primary"
                                  onPress={() =>
                                    router.push(
                                      `/dashboard/urls/${url.id}/stats`
                                    )
                                  }
                                >
                                  View Stats
                                </Button>
                                <Button
                                  size="sm"
                                  variant="light"
                                  color="danger"
                                  onPress={() => deleteUrl(url.id)}
                                  isLoading={deletingUrlId === url.id}
                                >
                                  Delete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
