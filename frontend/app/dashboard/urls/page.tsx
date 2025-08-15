"use client";

import { useCallback, useMemo, useState } from "react";
import { Card, CardBody, CardHeader, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { useUrls } from "@/hooks/use-urls";
import type { ShortenedURL } from "@/hooks/use-urls";
import { useRouter } from "next/navigation";
import { API_CONFIG } from "@/config/api";
import { safeArray, safeFilter, safeMap, safeEvery } from "@/lib/safe-arrays";

function normalize(text: string | null | undefined): string {
  return (text || "").toLowerCase();
}

export default function UrlsPage() {
  const router = useRouter();
  const { urls, isLoading, getFullShortUrl } = useUrls();

  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState(""); // YYYY-MM-DD

  const navigateToCreateUrl = useCallback(() => {
    router.push('/dashboard/create-url');
  }, [router]);

  const filteredUrls: ShortenedURL[] = useMemo(() => {
    const source = safeArray(urls);

    const tokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean);

    return safeFilter(source, (u: ShortenedURL) => {
      // Date filter: match created_at date to filterDate
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

      // All tokens must be present (word-to-word AND search)
      return safeEvery(tokens, (t) => haystack.includes(t));
    });
  }, [urls, search, filterDate, getFullShortUrl]);

  const clearFilters = useCallback(() => {
    setSearch("");
    setFilterDate("");
  }, []);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 w-full">
              <h2 className="text-xl font-semibold">Your Shortened URLs</h2>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-7">
                  <Input
                    type="text"
                    label="Search"
                    placeholder="Search by title, short code, or original URL"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="md:col-span-3">
                  <Input
                    type="date"
                    label="Created on"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2 flex gap-2">
                  <Button variant="light" onPress={clearFilters}>Clear</Button>
                  <Button color="primary" variant="solid" onPress={navigateToCreateUrl}>New</Button>
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
                No URLs created yet. <Button color="primary" variant="light" onPress={navigateToCreateUrl}>Create your first short URL</Button>!
              </div>
            ) : (
              <>
                {filteredUrls.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No results match your filters.
                  </div>
                ) : (
                  <Table aria-label="Shortened URLs" className="w-full">
                    <TableHeader>
                      <TableColumn className="w-[14%]">Title</TableColumn>
                      <TableColumn className="w-[24%]">Original URL</TableColumn>
                      <TableColumn className="w-[24%]">Short URL</TableColumn>
                      <TableColumn className="w-[8%] text-right">Clicks</TableColumn>
                      <TableColumn className="w-[10%]">QR</TableColumn>
                      <TableColumn className="w-[10%]">Created</TableColumn>
                      <TableColumn className="w-[10%]">Expires</TableColumn>
                      <TableColumn className="w-[10%] text-right">Actions</TableColumn>
                    </TableHeader>
                    <TableBody>
                      {filteredUrls.map((url) => (
                        <TableRow key={url.id}>
                          <TableCell>
                            <p className="font-medium truncate max-w-[220px]">{url.title || "Untitled"}</p>
                          </TableCell>
                          <TableCell>
                            <a 
                              href={url.original_url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-primary hover:underline truncate block max-w-[320px]"
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
                                className="text-primary hover:underline truncate block max-w-[320px] font-mono text-sm"
                              >
                                {getFullShortUrl(url.short_code)}
                              </a>
                              <Button 
                                size="sm" 
                                variant="light" 
                                onPress={() => navigator.clipboard.writeText(getFullShortUrl(url.short_code))}
                              >
                                Copy
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium tabular-nums text-right block">{url.click_count}</span>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="light" onPress={async () => {
                              const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
                              if (!accessToken) { router.push('/login'); return; }
                              const resp = await fetch(`${API_CONFIG.BASE_URL}/api/urls/${url.id}/qr-download/`, { headers: { Authorization: `Bearer ${accessToken}` } });
                              if (!resp.ok) return;
                              const blob = await resp.blob();
                              const objectUrl = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = objectUrl;
                              a.download = `${(url.title || url.short_code || 'qr').toLowerCase().replace(/[^a-z0-9]+/g,'-')}.png`;
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              window.URL.revokeObjectURL(objectUrl);
                            }}>
                              Download QR
                            </Button>
                          </TableCell>
                          <TableCell>{new Date(url.created_at).toLocaleString()}</TableCell>
                          <TableCell>
                            {url.expires_at ? new Date(url.expires_at).toLocaleString() : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2 justify-end">
                              <Button size="sm" variant="light" color="primary" onPress={() => router.push(`/dashboard/urls/${url.id}/stats`)}>
                                View Stats
                              </Button>
                              <Button size="sm" variant="light" color="danger">
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
