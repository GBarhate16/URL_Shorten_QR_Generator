"use client";

import { useCallback, useMemo, useState } from "react";
import { Card, CardBody, CardHeader, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { useQrCodes, type QRCode } from "@/contexts/qr-codes-context";
import { useRouter } from "next/navigation";
import { safeArray, safeFilter, safeEvery, safeMap } from "@/lib/safe-arrays";
import { QrCode, Download, Trash2, Eye, EyeOff, ExternalLink, BarChart3 } from "lucide-react";
import Image from 'next/image';

function normalize(text: string | null | undefined): string {
  return (text || "").toLowerCase();
}

// Helper function to safely format dates
function formatDate(dateString: string | null | undefined): { date: string; time: string } {
  if (!dateString) {
    return { date: 'No date', time: '' };
  }
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return { date: 'Invalid date', time: '' };
    }
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString()
    };
  } catch (error) {
    return { date: 'Invalid date', time: '' };
  }
}

export default function QrCodesPage() {
  const router = useRouter();
  const { qrCodes, isLoading, isInitializing, deleteQrCode, toggleQrCodeStatus, downloadQrCode } = useQrCodes();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedQrCode, setSelectedQrCode] = useState<QRCode | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  const navigateToCreateQr = useCallback(() => {
    router.push('/dashboard/create-qr');
  }, [router]);

  const filteredQrCodes: QRCode[] = useMemo(() => {
    const source = safeArray(qrCodes);

    const tokens = safeFilter(search.trim().toLowerCase().split(/\s+/), Boolean);

    return safeFilter(source, (qr: QRCode) => {
      // Type filter
      if (filterType && qr.qr_type !== filterType) return false;

      // Status filter
      if (filterStatus && qr.status !== filterStatus) return false;

      if (tokens.length === 0) return true;

      const haystack = [
        normalize(qr.title),
        normalize(qr.description),
        normalize(qr.short_code),
        normalize(qr.qr_type),
        normalize(qr.is_dynamic ? 'dynamic' : 'static'),
      ].join(" ");

      // All tokens must be present (word-to-word AND search)
      return safeEvery(tokens, (t) => haystack.includes(t));
    });
  }, [qrCodes, search, filterType, filterStatus]);

  const clearFilters = useCallback(() => {
    setSearch("");
    setFilterType("");
    setFilterStatus("");
  }, []);

  const handleDelete = useCallback(async (id: number) => {
    if (confirm('Are you sure you want to delete this QR code?')) {
      try {
        await deleteQrCode(id);
      } catch (error) {
        console.error('Failed to delete QR code:', error);
      }
    }
  }, [deleteQrCode]);

  const handleToggleStatus = useCallback(async (id: number) => {
    try {
      await toggleQrCodeStatus(id);
    } catch (error) {
      console.error('Failed to toggle QR code status:', error);
    }
  }, [toggleQrCodeStatus]);

  const handleDownload = useCallback(async (id: number, title?: string) => {
    try {
      await downloadQrCode(id, title);
    } catch (error) {
      console.error('Failed to download QR code:', error);
    }
  }, [downloadQrCode]);

  const handleQrCodeClick = useCallback((qrCode: QRCode) => {
    setSelectedQrCode(qrCode);
    setShowQrModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowQrModal(false);
    setSelectedQrCode(null);
  }, []);



  const getContentPreview = (qr: QRCode): string => {
    switch (qr.qr_type) {
      case 'url':
        return qr.content.url || 'No URL';
      case 'wifi':
        return qr.content.wifi?.ssid || 'No SSID';
      case 'text':
        return qr.content.text || 'No text';
      case 'vcard':
        return qr.content.vcard?.name || 'No name';
      case 'event':
        return qr.content.event?.title || 'No title';
      case 'file':
        return qr.content.file?.name || 'No file';
      default:
        return 'Unknown content';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'success', text: 'Active' },
      inactive: { color: 'warning', text: 'Inactive' },
      expired: { color: 'danger', text: 'Expired' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status };
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${config.color}-100 text-${config.color}-800 dark:bg-${config.color}-900 dark:text-${config.color}-200`}>
        {config.text}
      </span>
    );
  };

  const getTypeIcon = (type: string) => {
    const iconMap = {
      url: <ExternalLink className="h-4 w-4" />,
      wifi: <QrCode className="h-4 w-4" />,
      text: <QrCode className="h-4 w-4" />,
      vcard: <QrCode className="h-4 w-4" />,
      event: <QrCode className="h-4 w-4" />,
      file: <QrCode className="h-4 w-4" />,
    };
    
    return iconMap[type as keyof typeof iconMap] || <QrCode className="h-4 w-4" />;
  };

  return (
    <div className="p-4 sm:p-6 overflow-x-hidden">
      <div className="max-w-7xl mx-auto w-full overflow-x-hidden px-1 sm:px-0">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 w-full">
              <h2 className="text-xl font-semibold">Your QR Codes</h2>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-4">
                  <Input
                    type="text"
                    label="Search"
                    placeholder="Search by title, description, or type"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    type="text"
                    label="Type"
                    placeholder="All types"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    type="text"
                    label="Status"
                    placeholder="All statuses"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2 flex gap-2">
                  <Button variant="light" onPress={clearFilters}>Clear</Button>
                  <Button color="primary" variant="solid" onPress={navigateToCreateQr}>New QR Code</Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            {isLoading || isInitializing ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading QR codes...</p>
              </div>
            ) : !qrCodes || qrCodes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No QR codes created yet. <Button color="primary" variant="light" onPress={navigateToCreateQr}>Create your first QR code</Button>!
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <Table aria-label="QR Codes table" className="min-w-full">
                    <TableHeader>
                      <TableColumn className="w-[200px] min-w-[180px]">QR Code</TableColumn>
                      <TableColumn className="w-[120px] min-w-[100px]">Type</TableColumn>
                      <TableColumn className="min-w-[200px]">Content</TableColumn>
                      <TableColumn className="w-[100px] min-w-[80px]">Status</TableColumn>
                      <TableColumn className="w-[80px] min-w-[70px]">Scans</TableColumn>
                      <TableColumn className="w-[120px] min-w-[100px]">Created</TableColumn>
                      <TableColumn className="w-[200px] min-w-[180px]">Actions</TableColumn>
                    </TableHeader>
                    <TableBody>
                      {safeMap(filteredQrCodes, (qr) => (
                        <TableRow 
                          key={qr.id} 
                          className="cursor-pointer hover:bg-gray-800/50 transition-colors"
                          onClick={() => handleQrCodeClick(qr)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex-shrink-0">
                                {qr.qr_image_url ? (
                                  <Image 
                                    src={qr.qr_image_url} 
                                    alt={qr.title}
                                    width={48}
                                    height={48}
                                    className="w-12 h-12 rounded border object-contain"
                                    style={{ minWidth: '48px', minHeight: '48px' }}
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center flex-shrink-0">
                                    <QrCode className="h-6 w-6 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium truncate">{qr.title}</p>
                                <p className="text-sm text-muted-foreground truncate">{qr.short_code}</p>
                                {qr.is_dynamic && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 mt-1">
                                    Dynamic
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getTypeIcon(qr.qr_type)}
                              <span className="capitalize text-sm">{qr.qr_type}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs min-w-0">
                              <p className="truncate text-sm">{getContentPreview(qr)}</p>
                              {qr.description && (
                                <p className="text-xs text-muted-foreground truncate mt-1">{qr.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(qr.status)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <BarChart3 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm">{qr.scan_count || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="truncate">{formatDate(qr.created_at).date}</p>
                              <p className="text-xs text-muted-foreground truncate">{formatDate(qr.created_at).time}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="light"
                                onPress={() => handleDownload(qr.id, qr.title)}
                                startContent={<Download className="h-3 w-3" />}
                                className="text-xs"
                              >
                                Download
                              </Button>
                              <Button
                                size="sm"
                                variant="light"
                                onPress={() => handleToggleStatus(qr.id)}
                                startContent={qr.status === 'active' ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                className="text-xs"
                              >
                                {qr.status === 'active' ? 'Deactivate' : 'Activate'}
                              </Button>
                              <Button
                                size="sm"
                                variant="light"
                                color="danger"
                                onPress={() => handleDelete(qr.id)}
                                startContent={<Trash2 className="h-3 w-3" />}
                                className="text-xs"
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

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-4">
                  {safeMap(filteredQrCodes, (qr) => (
                    <Card 
                      key={qr.id} 
                      className="cursor-pointer hover:bg-gray-800/50 transition-colors"
                      onPress={() => handleQrCodeClick(qr)}
                    >
                      <CardBody className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            {qr.qr_image_url ? (
                              <Image 
                                src={qr.qr_image_url} 
                                alt={qr.title}
                                width={64}
                                height={64}
                                className="w-16 h-16 rounded border object-contain"
                                style={{ minWidth: '64px', minHeight: '64px' }}
                              />
                            ) : (
                              <div className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center flex-shrink-0">
                                <QrCode className="h-8 w-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-medium truncate">{qr.title}</h3>
                              {getStatusBadge(qr.status)}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{qr.short_code}</p>
                            <div className="flex items-center gap-2 mb-2">
                              {getTypeIcon(qr.qr_type)}
                              <span className="capitalize text-sm">{qr.qr_type}</span>
                              {qr.is_dynamic && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                  Dynamic
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2 truncate">{getContentPreview(qr)}</p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <BarChart3 className="h-4 w-4" />
                                  <span>{qr.scan_count || 0} scans</span>
                                </div>
                                <span>{formatDate(qr.created_at).date}</span>
                              </div>
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="sm"
                                  variant="light"
                                  onPress={() => handleDownload(qr.id, qr.title)}
                                  startContent={<Download className="h-3 w-3" />}
                                  className="text-xs"
                                >
                                  Download
                                </Button>
                                <Button
                                  size="sm"
                                  variant="light"
                                  onPress={() => handleToggleStatus(qr.id)}
                                  startContent={qr.status === 'active' ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                  className="text-xs"
                                >
                                  {qr.status === 'active' ? 'Deactivate' : 'Activate'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="light"
                                  color="danger"
                                  onPress={() => handleDelete(qr.id)}
                                  startContent={<Trash2 className="h-3 w-3" />}
                                  className="text-xs"
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </CardBody>
        </Card>
        
        {/* QR Code Modal */}
        {showQrModal && selectedQrCode && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-xl border border-gray-600 p-6 max-w-md w-full mx-4 relative">
              {/* Close Button */}
              <button
                onClick={handleCloseModal}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              {/* Modal Content */}
              <div className="text-center">
                {/* QR Code Type Badge */}
                <div className="mb-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    selectedQrCode.qr_type === 'url' ? 'bg-blue-500/20 text-blue-300' :
                    selectedQrCode.qr_type === 'wifi' ? 'bg-green-500/20 text-green-300' :
                    selectedQrCode.qr_type === 'text' ? 'bg-purple-500/20 text-purple-300' :
                    selectedQrCode.qr_type === 'vcard' ? 'bg-orange-500/20 text-orange-300' :
                    selectedQrCode.qr_type === 'event' ? 'bg-pink-500/20 text-pink-300' :
                    selectedQrCode.qr_type === 'file' ? 'bg-indigo-500/20 text-indigo-300' :
                    'bg-gray-500/20 text-gray-300'
                  }`}>
                    {selectedQrCode.qr_type === 'url' && '🔗'}
                    {selectedQrCode.qr_type === 'wifi' && '📶'}
                    {selectedQrCode.qr_type === 'text' && '📝'}
                    {selectedQrCode.qr_type === 'vcard' && '👤'}
                    {selectedQrCode.qr_type === 'event' && '📅'}
                    {selectedQrCode.qr_type === 'file' && '📁'}
                    <span className="ml-1 capitalize">{selectedQrCode.qr_type}</span>
                  </span>
                </div>
                
                {/* Title */}
                <h3 className="text-xl font-semibold text-white mb-2">{selectedQrCode.title}</h3>
                
                {/* Description */}
                {selectedQrCode.description && (
                  <p className="text-gray-300 mb-4">{selectedQrCode.description}</p>
                )}
                
                {/* Content Preview */}
                <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-300 mb-1">Content:</p>
                  <p className="text-white font-medium">{getContentPreview(selectedQrCode)}</p>
                </div>
                
                {/* QR Code Display */}
                                                 <div className="bg-white rounded-lg p-4 mb-6 mx-auto w-48 h-48 flex items-center justify-center">
                  {selectedQrCode.qr_image_url ? (
                    <Image 
                      src={selectedQrCode.qr_image_url} 
                      alt={selectedQrCode.title}
                      width={192}
                      height={192}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-white flex items-center justify-center">
                      <QrCode className="w-24 h-24 text-black" />
                    </div>
                  )}
                </div>
                
                {/* Status and Date */}
                <div className="flex items-center justify-between text-sm mb-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full ${
                    selectedQrCode.status === 'active' ? 'bg-green-500/20 text-green-300' :
                    selectedQrCode.status === 'inactive' ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-red-500/20 text-red-300'
                  }`}>
                    {selectedQrCode.status === 'active' ? '●' : '○'} {selectedQrCode.status}
                  </span>
                  <span className="text-gray-300">
                    {selectedQrCode.created_at ? formatDate(selectedQrCode.created_at).date : 'No date'}
                  </span>
                </div>
                
                {/* Scan Count */}
                <div className="flex items-center justify-center gap-2 mb-6 text-sm text-gray-300">
                  <BarChart3 className="h-4 w-4" />
                  <span>{selectedQrCode.scan_count || 0} scans</span>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    variant="light"
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white border-white/20"
                    onPress={() => handleDownload(selectedQrCode.id, selectedQrCode.title)}
                    startContent={<Download className="h-4 w-4" />}
                  >
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="light"
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white border-white/20"
                    onPress={() => handleToggleStatus(selectedQrCode.id)}
                    startContent={selectedQrCode.status === 'active' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  >
                    {selectedQrCode.status === 'active' ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    size="sm"
                    variant="light"
                    color="danger"
                    className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 border-red-500/30"
                    onPress={() => handleDelete(selectedQrCode.id)}
                    startContent={<Trash2 className="h-4 w-4" />}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
