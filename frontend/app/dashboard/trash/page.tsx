"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@heroui/button';
import { Input } from '@heroui/input';
import { Card, CardBody } from '@heroui/card';
import { Badge } from '@heroui/badge';
import { 
  Trash2, 
  RotateCcw, 
  Search, 
  AlertTriangle,
  Link,
  QrCode,
  Clock,
  Calendar
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { API_CONFIG } from '@/config/api';

interface TrashItem {
  id: number;
  title: string;
  type: 'url' | 'qr_code';
  days_remaining: number;
  deleted_at: string;
  is_deleted: boolean;
  short_code?: string;
  original_url?: string;
  qr_type?: string;
  description?: string;
}

interface TrashData {
  urls: TrashItem[];
  qr_codes: TrashItem[];
  total_items: number;
  urls_count: number;
  qr_codes_count: number;
  cached_at?: string;
}

export default function TrashPage() {
  const { getValidAccessToken } = useAuth();
  const [trashData, setTrashData] = useState<TrashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'urls' | 'qr_codes'>('all');
  const [restoring, setRestoring] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  
  // Cache for API responses to reduce redundant calls
  const [cache, setCache] = useState<Map<string, { data: TrashData; timestamp: number }>>(new Map());
  
  // Cache TTL: 30 seconds
  const CACHE_TTL = 30 * 1000;

  // Debounced search to reduce API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch trash data with caching and optimization
  const fetchTrashData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      const token = await getValidAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      if (filterType !== 'all') params.append('type', filterType);

      const cacheKey = `trash_${debouncedSearchTerm}_${filterType}`;
      const cached = cache.get(cacheKey);

      // Use cache if available and not expired, unless force refresh
      if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setTrashData(cached.data);
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/trash/?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();

        setTrashData(data);
        setCache(prev => new Map(prev).set(cacheKey, { data, timestamp: Date.now() }));
      } else {
        console.error('Failed to fetch trash data:', response.status, response.statusText);
        setTrashData(null);
      }
    } catch (error) {
      console.error('Failed to fetch trash data:', error);
      setTrashData(null);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm, filterType, getValidAccessToken, cache, CACHE_TTL]);

  // Restore item
  const handleRestore = async (item: TrashItem) => {
    try {
      setRestoring(item.id);
      const token = await getValidAccessToken();
      if (!token) return;

      // Use the correct endpoint based on item type
      const endpoint = item.type === 'url' 
        ? `${API_CONFIG.BASE_URL}/api/urls/${item.id}/restore/`
        : `${API_CONFIG.BASE_URL}/api/qr/codes/${item.id}/restore/`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Refresh trash data
        await fetchTrashData();
      } else {
        const errorData = await response.json();
        console.error('Restore failed:', errorData);
      }
    } catch (error) {
      console.error('Failed to restore item:', error);
    } finally {
      setRestoring(null);
    }
  };

  // Permanently delete item
  const handlePermanentDelete = async (item: TrashItem) => {
    if (!confirm('Are you sure you want to permanently delete this item? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(item.id);
      const token = await getValidAccessToken();
      if (!token) return;

      // Use the correct endpoint based on item type
      const endpoint = item.type === 'url' 
        ? `${API_CONFIG.BASE_URL}/api/urls/${item.id}/permanent_delete/`
        : `${API_CONFIG.BASE_URL}/api/qr/codes/${item.id}/permanent_delete/`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Refresh trash data
        await fetchTrashData();
      } else {
        const errorData = await response.json();
        console.error('Delete failed:', errorData);
      }
    } catch (error) {
      console.error('Failed to delete item:', error);
    } finally {
      setDeleting(null);
    }
  };

  // Optimized filtering using useMemo to prevent unnecessary recalculations
  const filteredItems = useMemo(() => {
    if (!trashData) return [];
    
    const allItems = [
      ...(trashData.urls?.map(url => ({ ...url, type: 'url' as const })) || []),
      ...(trashData.qr_codes?.map(qr => ({ ...qr, type: 'qr_code' as const })) || [])
    ];

    // Client-side filtering for better performance
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      return allItems.filter(item => 
        item.title?.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower) ||
        (item.short_code && item.short_code.toLowerCase().includes(searchLower)) ||
        (item.original_url && item.original_url.toLowerCase().includes(searchLower))
      );
    }

    return allItems;
  }, [trashData, debouncedSearchTerm]);

  // Load data on mount and when filters change
  useEffect(() => {
    fetchTrashData();
  }, [fetchTrashData]);

  // Get days remaining color
  const getDaysRemainingColor = (days: number) => {
    if (days <= 3) return 'danger';
    if (days <= 7) return 'warning';
    return 'success';
  };

  // Get days remaining text
  const getDaysRemainingText = (days: number) => {
    if (days === 0) return 'Deleting today';
    if (days === 1) return '1 day left';
    return `${days} days left`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading trash...</p>
        </div>
      </div>
    );
  }

  // Ensure trashData exists before processing
  if (!trashData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground">Failed to load trash data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Trash</h1>
          <p className="text-muted-foreground">
            Items will be permanently deleted after 15 days
          </p>
        </div>
                 <div className="flex items-center gap-2">
           <Badge color="warning" variant="flat">
             <Clock className="h-3 w-3 mr-1" />
             {trashData?.total_items || 0} items
           </Badge>
         </div>
      </div>

      {/* Warning Banner */}
      <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
        <CardBody className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-orange-800 dark:text-orange-200">
            <p className="font-medium mb-1">Items in trash will be permanently deleted after 15 days</p>
            <p>You can restore items or permanently delete them before the automatic cleanup.</p>
          </div>
        </CardBody>
      </Card>

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                startContent={<Search className="h-4 w-4 text-muted-foreground" />}
              />
            </div>
            
            {/* Type Filter */}
            <div className="flex gap-2">
              <Button
                variant={filterType === 'all' ? 'solid' : 'bordered'}
                size="sm"
                onPress={() => setFilterType('all')}
              >
                All
              </Button>
              <Button
                variant={filterType === 'urls' ? 'solid' : 'bordered'}
                size="sm"
                startContent={<Link className="h-3 w-3" />}
                onPress={() => setFilterType('urls')}
              >
                URLs
              </Button>
              <Button
                variant={filterType === 'qr_codes' ? 'solid' : 'bordered'}
                size="sm"
                startContent={<QrCode className="h-3 w-3" />}
                onPress={() => setFilterType('qr_codes')}
              >
                QR Codes
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12">
            <Trash2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Trash is empty</h3>
            <p className="text-muted-foreground">
              {debouncedSearchTerm || filterType !== 'all' 
                ? 'No items match your search criteria'
                : 'Deleted items will appear here'
              }
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <Card key={`${item.type}-${item.id}`} className="border-l-4 border-l-orange-500">
              <CardBody>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {item.type === 'url' ? (
                        <Link className="h-4 w-4 text-blue-600" />
                      ) : (
                        <QrCode className="h-4 w-4 text-green-600" />
                      )}
                      <h3 className="font-medium truncate">{item.title}</h3>
                      <Badge size="sm" variant="flat">
                        {item.type === 'url' ? 'URL' : 'QR Code'}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-y-1">
                      {item.type === 'url' && item.short_code && (
                        <p>Short code: {item.short_code}</p>
                      )}
                      {item.type === 'url' && item.original_url && (
                        <p className="truncate">Original URL: {item.original_url}</p>
                      )}
                      {item.type === 'qr_code' && item.qr_type && (
                        <p>Type: {item.qr_type}</p>
                      )}
                      {item.description && (
                        <p className="truncate">Description: {item.description}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        <span>Deleted on {item.deleted_at ? new Date(item.deleted_at).toLocaleDateString() : 'Unknown date'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    {/* Days Remaining */}
                    {item.days_remaining !== null && item.days_remaining !== undefined ? (
                      <Badge 
                        color={getDaysRemainingColor(item.days_remaining)}
                        variant="flat"
                        size="sm"
                      >
                        {getDaysRemainingText(item.days_remaining)}
                      </Badge>
                    ) : (
                      <Badge 
                        color="default"
                        variant="flat"
                        size="sm"
                      >
                        Calculating...
                      </Badge>
                    )}
                    
                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="bordered"
                        startContent={<RotateCcw className="h-3 w-3" />}
                        onPress={() => handleRestore(item)}
                        isLoading={restoring === item.id}
                        disabled={deleting === item.id}
                      >
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        color="danger"
                        variant="bordered"
                        startContent={<Trash2 className="h-3 w-3" />}
                        onPress={() => handlePermanentDelete(item)}
                        isLoading={deleting === item.id}
                        disabled={restoring === item.id}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
      
      
    </div>
  );
}