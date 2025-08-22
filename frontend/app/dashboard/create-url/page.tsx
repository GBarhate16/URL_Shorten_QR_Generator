"use client";

import { useCallback, useState } from "react";
import { Card, CardBody, CardHeader, Input, Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/react";
import { useUrls } from "@/hooks/use-urls";
import { useAnalytics } from "@/hooks/use-analytics";
import { useDashboardData } from "@/contexts/dashboard-data-context";
import { getApiUrl, API_CONFIG } from "@/config/api";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { safeSlice, safeMap } from "@/lib/safe-arrays";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CreateUrlPage() {
  const router = useRouter();
  const { urls, isLoading, mutate, getFullShortUrl } = useUrls();
  const { mutate: refreshAnalytics } = useAnalytics("30d");
  const { refetchAll: refreshDashboardData } = useDashboardData();
  const { getValidAccessToken } = useAuth();
  const [newUrl, setNewUrl] = useState({ original_url: "", title: "", expires_at: "", short_code: "" });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [deletingUrlId, setDeletingUrlId] = useState<number | null>(null);

  // Get the 3 latest URLs
  const latestUrls = safeSlice(urls, 0, 3);

  const deleteUrl = useCallback(async (urlId: number) => {
    const token = await getValidAccessToken();
    if (!token) {
      router.push('/login');
      return;
    }

    setDeletingUrlId(urlId);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/urls/${urlId}/soft_delete/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Refresh URLs, analytics, and dashboard data
        await mutate();
        await refreshAnalytics();
        await refreshDashboardData();
      } else {
        console.error('Failed to delete URL:', response.status);
      }
    } catch (error) {
      console.error('Error deleting URL:', error);
    } finally {
      setDeletingUrlId(null);
    }
  }, [getValidAccessToken, router, mutate, refreshAnalytics, refreshDashboardData]);

  const downloadQr = useCallback(async (id: number, title?: string | null) => {
    const token = await getValidAccessToken();
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const resp = await fetch(`${API_CONFIG.BASE_URL}/api/urls/${id}/qr-download/`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!resp.ok) {
        if (resp.status === 401) {
          router.push('/login');
          return;
        }
        const txt = await resp.text();
        throw new Error(txt || `Download failed (${resp.status})`);
      }

      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);

      let filename = 'qr.png';
      const cd = resp.headers.get('Content-Disposition') || resp.headers.get('content-disposition');
      if (cd) {
        const match = /filename\*=UTF-8''([^;]+)|filename=\"?([^\";]+)\"?/i.exec(cd);
        const extracted = decodeURIComponent(match?.[1] || match?.[2] || '');
        if (extracted) filename = extracted;
      } else if (title) {
        filename = `${slugify(title) || 'qr'}.png`;
      }

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('QR download error:', e);
    }
  }, [router, getValidAccessToken]);

  // Memoized create URL handler
  const handleCreateUrl = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const token = await getValidAccessToken();
    if (!token) {
      setMessage("No access token found. Please log in again.");
      return;
    }
    
    setSubmitting(true);
    setMessage("");

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setSubmitting(false);
      setMessage("Request timed out. Please try again.");
    }, 30000); // 30 second timeout

    try {
      // Prepare payload; include short_code only if provided
      const payload: Record<string, unknown> = {
        original_url: newUrl.original_url,
        title: newUrl.title,
        expires_at: newUrl.expires_at ? new Date(newUrl.expires_at).toISOString() : null,
      };
      const cleanedSlug = slugify(newUrl.short_code || "");
      if (cleanedSlug) {
        payload.short_code = cleanedSlug;
      }

      const postUrl = getApiUrl("URLS");
      
              let response = await fetch(postUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        mode: "cors",
        credentials: "omit",
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        // Try to refresh token and retry once
        const newToken = await getValidAccessToken();
        if (newToken && newToken !== token) {
  
          response = await fetch(postUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${newToken}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            mode: "cors",
            credentials: "omit",
            body: JSON.stringify(payload),
          });
        }
      }
      
      clearTimeout(timeoutId); // Clear timeout on success
      
      if (response.ok) {
        // Immediately show success and reset form
        setNewUrl({ original_url: "", title: "", expires_at: "", short_code: "" });
        setMessage("Short URL created successfully!");
        setSubmitting(false);
        
        // Refresh data in background (non-blocking)

        Promise.all([
          mutate(),
          refreshAnalytics(),
          refreshDashboardData()
        ]).then(() => {
  
        }).catch(error => {
          console.error('Background refresh error:', error);
        });
        
        // Redirect after a short delay
        setTimeout(() => {
          router.push('/dashboard/urls');
        }, 1000);
      } else {
        const errorText = await response.text();
        console.error("[CreateURL] POST failed", response.status, errorText);
        setMessage(errorText || `Failed to create short URL: ${response.status}`);
        setSubmitting(false);
      }
    } catch (error) {
      clearTimeout(timeoutId); // Clear timeout on error
      console.error("[CreateURL] Network error:", error);
      setMessage("Network error. Please check your connection and try again.");
      setSubmitting(false);
    }
  }, [newUrl, mutate, router, refreshAnalytics, refreshDashboardData, getValidAccessToken]);

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6 w-full overflow-x-hidden">
        {/* Create URL Form */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Create New Short URL</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleCreateUrl} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Input 
                  type="url" 
                  label="Original URL" 
                  placeholder="https://example.com" 
                  value={newUrl.original_url} 
                  onChange={(e) => setNewUrl({ ...newUrl, original_url: e.target.value })} 
                  className="w-full min-w-0"
                  fullWidth
                  classNames={{
                    base: "min-w-0 w-full",
                    inputWrapper: "min-w-0 w-full",
                    input: "min-w-0 w-full",
                  }}
                  required 
                />
                <Input 
                  type="text" 
                  label="Title (Optional)" 
                  placeholder="My Website" 
                  value={newUrl.title} 
                  onChange={(e) => setNewUrl({ ...newUrl, title: e.target.value })} 
                  className="w-full min-w-0"
                  fullWidth
                  classNames={{
                    base: "min-w-0 w-full",
                    inputWrapper: "min-w-0 w-full",
                    input: "min-w-0 w-full",
                  }}
                />
                <Input 
                  type="text" 
                  label="Custom Slug (optional)" 
                  placeholder="my-custom-slug" 
                  value={newUrl.short_code} 
                  onChange={(e) => setNewUrl({ ...newUrl, short_code: e.target.value })}
                  className="w-full min-w-0"
                  fullWidth
                  classNames={{
                    base: "min-w-0 w-full",
                    inputWrapper: "min-w-0 w-full",
                    input: "min-w-0 w-full",
                  }}
                  description="Allowed: letters, digits, hyphen (-) and underscore (_)"
                />
                <Input 
                  type="datetime-local" 
                  label="Expires At (optional)" 
                  placeholder="Select date & time" 
                  value={newUrl.expires_at} 
                  onChange={(e) => setNewUrl({ ...newUrl, expires_at: e.target.value })} 
                  className="w-full min-w-0"
                  fullWidth
                  classNames={{
                    base: "min-w-0 w-full",
                    inputWrapper: "min-w-0 w-full",
                    input: "min-w-0 w-full",
                  }}
                />
              </div>
              <div className="flex items-center gap-4">
                <Button type="submit" color="primary" isLoading={submitting} disabled={submitting}>
                  {submitting ? "Creating..." : "Create Short URL"}
                </Button>
                {message && (
                  <span className={`text-sm font-medium ${message.toLowerCase().includes("success") ? "text-green-600" : "text-red-600"}`}>
                    {message}
                  </span>
                )}
              </div>
            </form>
          </CardBody>
        </Card>

        {/* Latest URLs Section - Same format as URLs page */}
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold">Latest Created URLs</h3>
          </CardHeader>
          <CardBody>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading URLs...</p>
              </div>
            ) : !urls || urls.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No URLs created yet. Create your first short URL above!
              </div>
            ) : (
              <Table aria-label="Latest URLs" className="w-full">
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
                  {safeMap(latestUrls, (url) => (
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
                        <Button size="sm" variant="light" onPress={() => downloadQr(url.id, url.title)}>
                          Download QR
                        </Button>
                      </TableCell>
                      <TableCell>{new Date(url.created_at).toLocaleString()}</TableCell>
                      <TableCell>
                        {url.expires_at ? new Date(url.expires_at).toLocaleString() : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="light" color="primary">
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
            )}
            {urls && urls.length > 3 && (
              <div className="text-center pt-4">
                <Button 
                  color="primary" 
                  variant="light" 
                  onPress={() => router.push('/dashboard/urls')}
                >
                  View all URLs →
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
