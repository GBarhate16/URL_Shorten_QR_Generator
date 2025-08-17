"use client";

import { useState, useCallback } from 'react';
import { Card, CardBody, CardHeader } from "@heroui/react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Textarea } from "@heroui/input";
import { Select, SelectItem } from "@heroui/react";
import Image from 'next/image';

import { useQrCodes, type CreateQRCodeData, type QRCodeContent, type QRCodeCustomization } from '@/contexts/qr-codes-context';
import { safeSlice } from '@/lib/safe-arrays';
import { QrCode, Download, Trash2, Eye, EyeOff, Upload } from 'lucide-react';

// Type for QR code display (compatible with both real and sample data)
type DisplayQRCode = {
  id: number;
  title: string;
  description?: string;
  qr_type: string;
  status: string;
  created_at: string;
  customization: Record<string, unknown> | QRCodeCustomization;
  content: Record<string, unknown> | QRCodeContent;
  is_dynamic: boolean;
  user: number;
  short_code?: string;
  redirect_url?: string;
  qr_image?: string;
  qr_image_url?: string;
  updated_at?: string;
  expires_at?: string;
  scan_count?: number;
  files?: unknown[];
};

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

export default function CreateQrPage() {
  const { qrCodes, isLoading, isInitializing, createQrCode, uploadFile, downloadQrCode, deleteQrCode } = useQrCodes();
  
  const [qrData, setQrData] = useState<CreateQRCodeData>({
    title: '',
    description: '',
    qr_type: 'url',
    is_dynamic: false,
    content: {},
    customization: {
      foreground_color: '#000000',
      background_color: '#FFFFFF',
      size: 300,
      style: 'square',
      border: false,
    },
    expires_at: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showCustomization, setShowCustomization] = useState(false);
  const [selectedQrCode, setSelectedQrCode] = useState<DisplayQRCode | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  // Get the 5 latest QR codes for the recent section
  const latestQrCodes = safeSlice(qrCodes, 0, 5);
  
  // Sample QR codes for demonstration (when backend is not available)
  const sampleQrCodes = [
    {
      id: 1,
      title: "Company Website",
      description: "Main company website QR code for business cards",
      qr_type: "url" as const,
      status: "active" as const,
      created_at: new Date().toISOString(),
      customization: {},
      content: {},
      is_dynamic: false,
      user: 1,
      short_code: "",
      redirect_url: "",
      qr_image: "",
      qr_image_url: "",
      updated_at: "",
      expires_at: "",
      scan_count: 0,
      files: []
    },
    {
      id: 2,
      title: "WiFi Network",
      description: "Office WiFi access for guests",
      qr_type: "wifi" as const,
      status: "active" as const,
      created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      customization: {},
      content: {},
      is_dynamic: false,
      user: 1,
      short_code: "",
      redirect_url: "",
      qr_image: "",
      qr_image_url: "",
      updated_at: "",
      expires_at: "",
      scan_count: 0,
      files: []
    },
    {
      id: 3,
      title: "Business Card",
      description: "Contact information QR code",
      qr_type: "vcard" as const,
      status: "active" as const,
      created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      customization: {},
      content: {},
      is_dynamic: false,
      user: 1,
      short_code: "",
      redirect_url: "",
      qr_image: "",
      qr_image_url: "",
      updated_at: "",
      expires_at: "",
      scan_count: 0,
      files: []
    },
    {
      id: 4,
      title: "Event Invitation",
      description: "Team building event QR code",
      qr_type: "event" as const,
      status: "active" as const,
      created_at: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
      customization: {},
      content: {},
      is_dynamic: false,
      user: 1,
      short_code: "",
      redirect_url: "",
      qr_image: "",
      qr_image_url: "",
      updated_at: "",
      expires_at: "",
      scan_count: 0,
      files: []
    },
    {
      id: 5,
      title: "Document Access",
      description: "Important document download QR code",
      qr_type: "file" as const,
      status: "active" as const,
      created_at: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
      customization: {},
      content: {},
      is_dynamic: false,
      user: 1,
      short_code: "",
      redirect_url: "",
      qr_image: "",
      qr_image_url: "",
      updated_at: "",
      expires_at: "",
      scan_count: 0,
      files: []
    }
  ];
  
  // Use sample data if no real QR codes are available
  const displayQrCodes = latestQrCodes.length > 0 ? latestQrCodes : sampleQrCodes;
  const isUsingSampleData = latestQrCodes.length === 0 && !isLoading && !isInitializing;
  


  const handleInputChange = useCallback((field: keyof CreateQRCodeData, value: string | boolean | number) => {
    setQrData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleContentChange = useCallback((field: keyof QRCodeContent, value: string | object | boolean) => {
    setQrData(prev => ({
      ...prev,
      content: { ...prev.content, [field]: value }
    }));
  }, []);

  const handleCustomizationChange = useCallback((field: keyof QRCodeCustomization, value: string | number | boolean) => {
    setQrData(prev => ({
      ...prev,
      customization: { ...prev.customization, [field]: value }
    }));
  }, []);

  const handleSizeChange = useCallback((value: string) => {
    const size = parseInt(value);
    if (!isNaN(size)) {
      setQrData(prev => ({
        ...prev,
        customization: { ...prev.customization, size }
      }));
    }
  }, []);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const fileData = await uploadFile(file);
      handleContentChange('file', {
        name: fileData.file_name,
        url: fileData.file_url,
        type: fileData.file_type,
        size: fileData.file_size,
      });
      setMessage('File uploaded successfully!');
    } catch (error) {
      setMessage(`File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploadingFile(false);
    }
  }, [uploadFile, handleContentChange]);

  const handleQrCodeClick = useCallback((qrCode: DisplayQRCode) => {
    setSelectedQrCode(qrCode);
    setShowQrModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowQrModal(false);
    setSelectedQrCode(null);
  }, []);

  const handleCreateQrCode = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!qrData.title.trim()) {
      setMessage('Please enter a title for your QR code');
      return;
    }

    // Validate content based on QR type
    if (qrData.qr_type === 'url' && !qrData.content.url?.trim()) {
      setMessage('Please enter a URL');
      return;
    }
    if (qrData.qr_type === 'wifi' && !qrData.content.wifi?.ssid?.trim()) {
      setMessage('Please enter WiFi SSID');
      return;
    }
    if (qrData.qr_type === 'text' && !qrData.content.text?.trim()) {
      setMessage('Please enter text content');
      return;
    }
    if (qrData.qr_type === 'vcard' && !qrData.content.vcard?.name?.trim()) {
      setMessage('Please enter contact name');
      return;
    }
    if (qrData.qr_type === 'event' && !qrData.content.event?.title?.trim()) {
      setMessage('Please enter event title');
      return;
    }
    if (qrData.qr_type === 'file' && !qrData.content.file?.url) {
      setMessage('Please upload a file first');
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      // Convert empty string to null for expires_at
      const qrDataToSend = {
        ...qrData,
        expires_at: qrData.expires_at || null
      };
      
      await createQrCode(qrDataToSend);
      setMessage('QR code created successfully!');
      
      // Reset form
      setQrData({
        title: '',
        description: '',
        qr_type: 'url',
        is_dynamic: false,
        content: {},
        customization: {
          foreground_color: '#000000',
          background_color: '#FFFFFF',
          size: 300,
          style: 'square',
          border: false,
        },
        expires_at: '',
      });
    } catch (error) {
      setMessage(`Failed to create QR code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  }, [qrData, createQrCode]);

  const renderContentFields = () => {
    switch (qrData.qr_type) {
      case 'url':
        return (
          <Input
            type="url"
            label="URL"
            placeholder="https://example.com"
            value={qrData.content.url || ''}
            onChange={(e) => handleContentChange('url', e.target.value)}
            isRequired
          />
        );
      
      case 'wifi':
        return (
          <div className="space-y-3">
            <Input
              label="WiFi SSID"
              placeholder="Network Name"
              value={qrData.content.wifi?.ssid || ''}
              onChange={(e) => handleContentChange('wifi', { ...qrData.content.wifi, ssid: e.target.value })}
              isRequired
            />
            <Input
              type="password"
              label="Password"
              placeholder="Network Password"
              value={qrData.content.wifi?.password || ''}
              onChange={(e) => handleContentChange('wifi', { ...qrData.content.wifi, password: e.target.value })}
            />
            <Select
              label="Encryption"
              selectedKeys={[qrData.content.wifi?.encryption || 'WPA']}
              onChange={(e) => handleContentChange('wifi', { ...qrData.content.wifi, encryption: e.target.value as 'WPA' | 'WEP' | 'nopass' })}
            >
              <SelectItem key="WPA" value="WPA">WPA/WPA2/WPA3</SelectItem>
              <SelectItem key="WEP" value="WEP">WEP</SelectItem>
              <SelectItem key="nopass" value="nopass">No Password</SelectItem>
            </Select>
                         <div className="flex items-center gap-2">
               <input
                 type="checkbox"
                 id="hidden"
                 checked={qrData.content.wifi?.hidden || false}
                 onChange={(e) => handleContentChange('wifi', { ...qrData.content.wifi, hidden: e.target.checked })}
                 className="w-4 h-4 text-primary bg-gray-700 border-gray-600 rounded focus:ring-primary focus:ring-2"
               />
               <label htmlFor="hidden" className="text-gray-300">Hidden Network</label>
             </div>
          </div>
        );
      
      case 'text':
        return (
          <Textarea
            label="Text Content"
            placeholder="Enter your text here..."
            value={qrData.content.text || ''}
            onChange={(e) => handleContentChange('text', e.target.value)}
            isRequired
          />
        );
      
      case 'vcard':
        return (
          <div className="space-y-3">
            <Input
              label="Full Name"
              placeholder="John Doe"
              value={qrData.content.vcard?.name || ''}
              onChange={(e) => handleContentChange('vcard', { ...qrData.content.vcard, name: e.target.value })}
              isRequired
            />
            <Input
              type="tel"
              label="Phone Number"
              placeholder="+1 234 567 8900"
              value={qrData.content.vcard?.phone || ''}
              onChange={(e) => handleContentChange('vcard', { ...qrData.content.vcard, phone: e.target.value })}
            />
            <Input
              type="email"
              label="Email"
              placeholder="john@example.com"
              value={qrData.content.vcard?.email || ''}
              onChange={(e) => handleContentChange('vcard', { ...qrData.content.vcard, email: e.target.value })}
            />
            <Input
              label="Company"
              placeholder="Company Name"
              value={qrData.content.vcard?.company || ''}
              onChange={(e) => handleContentChange('vcard', { ...qrData.content.vcard, company: e.target.value })}
            />
            <Input
              label="Job Title"
              placeholder="Software Engineer"
              value={qrData.content.vcard?.title || ''}
              onChange={(e) => handleContentChange('vcard', { ...qrData.content.vcard, title: e.target.value })}
            />
            <Input
              label="Address"
              placeholder="123 Main St, City, State"
              value={qrData.content.vcard?.address || ''}
              onChange={(e) => handleContentChange('vcard', { ...qrData.content.vcard, address: e.target.value })}
            />
          </div>
        );
      
      case 'event':
        return (
          <div className="space-y-3">
            <Input
              label="Event Title"
              placeholder="Team Meeting"
              value={qrData.content.event?.title || ''}
              onChange={(e) => handleContentChange('event', { ...qrData.content.event, title: e.target.value })}
              isRequired
            />
            <Textarea
              label="Description"
              placeholder="Event description..."
              value={qrData.content.event?.description || ''}
              onChange={(e) => handleContentChange('event', { ...qrData.content.event, description: e.target.value })}
            />
            <Input
              label="Location"
              placeholder="Conference Room A"
              value={qrData.content.event?.location || ''}
              onChange={(e) => handleContentChange('event', { ...qrData.content.event, location: e.target.value })}
            />
            <Input
              type="datetime-local"
              label="Start Time"
              value={qrData.content.event?.startTime || ''}
              onChange={(e) => handleContentChange('event', { ...qrData.content.event, startTime: e.target.value })}
              isRequired
            />
            <Input
              type="datetime-local"
              label="End Time"
              value={qrData.content.event?.endTime || ''}
              onChange={(e) => handleContentChange('event', { ...qrData.content.event, endTime: e.target.value })}
            />
          </div>
        );
      
      case 'file':
        return (
          <div className="space-y-3">
                         <div className="border-2 border-dashed border-gray-500 rounded-lg p-6 text-center bg-gray-800/30">
               <input
                 type="file"
                 id="file-upload"
                 className="hidden"
                 onChange={handleFileUpload}
                 accept="*/*"
               />
               <label htmlFor="file-upload" className="cursor-pointer">
                 <Upload className="mx-auto h-12 w-12 text-gray-400" />
                 <div className="mt-2">
                   <span className="text-sm font-medium text-gray-300">
                     {uploadingFile ? 'Uploading...' : 'Click to upload file'}
                   </span>
                 </div>
                 <p className="text-xs text-gray-400 mt-1">
                   Supports any file type
                 </p>
               </label>
             </div>
                         {qrData.content.file && (
               <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-600">
                 <p className="text-sm font-medium text-white">{qrData.content.file.name}</p>
                 <p className="text-xs text-gray-300">
                   {qrData.content.file.type} • {(qrData.content.file.size / 1024 / 1024).toFixed(2)} MB
                 </p>
               </div>
             )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="p-4 sm:p-6 overflow-x-hidden">
      <div className="max-w-7xl mx-auto w-full overflow-x-hidden px-1 sm:px-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                     {/* Create QR Code Form */}
           <div className="lg:col-span-2">
             <Card className="border-0 shadow-lg">
                               <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <QrCode className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-white">Create New QR Code</h2>
                      <p className="text-sm text-gray-300 mt-1">Generate custom QR codes for various purposes</p>
                    </div>
                  </div>
                </CardHeader>
              <CardBody>
                <form onSubmit={handleCreateQrCode} className="space-y-8">
                                     {/* Basic Information */}
                   <div className="space-y-4 pb-6">
                                           <div className="flex items-center gap-2 pb-2 border-b border-gray-600">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <h3 className="text-lg font-medium text-white">Basic Information</h3>
                      </div>
                    <Input
                      label="Title"
                      placeholder="My QR Code"
                      value={qrData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      isRequired
                    />
                    <Textarea
                      label="Description (Optional)"
                      placeholder="Describe your QR code..."
                      value={qrData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                    />
                  </div>

                                     {/* QR Code Type */}
                   <div className="space-y-4 pb-6">
                                           <div className="flex items-center gap-2 pb-2 border-b border-gray-600">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <h3 className="text-lg font-medium text-white">QR Code Type</h3>
                      </div>
                                <Select
              label="Type"
              selectedKeys={[qrData.qr_type]}
              onChange={(e) => handleInputChange('qr_type', e.target.value as 'url' | 'wifi' | 'text' | 'vcard' | 'event' | 'file')}
            >
                      <SelectItem key="url" value="url">URL/Link</SelectItem>
                      <SelectItem key="wifi" value="wifi">WiFi Network</SelectItem>
                      <SelectItem key="text" value="text">Plain Text</SelectItem>
                      <SelectItem key="vcard" value="vcard">Contact (vCard)</SelectItem>
                      <SelectItem key="event" value="event">Calendar Event</SelectItem>
                      <SelectItem key="file" value="file">File</SelectItem>
                    </Select>
                    
                                         <div className="flex items-center gap-2">
                       <input
                         type="checkbox"
                         id="dynamic"
                         checked={qrData.is_dynamic}
                         onChange={(e) => handleInputChange('is_dynamic', e.target.checked)}
                         className="w-4 h-4 text-primary bg-gray-700 border-gray-600 rounded focus:ring-primary focus:ring-2"
                       />
                       <label htmlFor="dynamic" className="text-gray-300">Dynamic QR Code (Trackable & Updatable)</label>
                     </div>
                  </div>

                                     {/* Content Fields */}
                   <div className="space-y-4 pb-6">
                                           <div className="flex items-center gap-2 pb-2 border-b border-gray-600">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <h3 className="text-lg font-medium text-white">Content</h3>
                      </div>
                    {renderContentFields()}
                  </div>

                                     {/* Customization */}
                   <div className="space-y-4 pb-6">
                                           <div className="flex items-center justify-between pb-2 border-b border-gray-600">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          <h3 className="text-lg font-medium text-white">Customization</h3>
                        </div>
                      <Button
                        variant="light"
                        size="sm"
                        onPress={() => setShowCustomization(!showCustomization)}
                        startContent={showCustomization ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      >
                        {showCustomization ? 'Hide' : 'Show'} Options
                      </Button>
                    </div>
                    
                                         {showCustomization && (
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-600">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-300">Foreground Color</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={qrData.customization?.foreground_color || '#000000'}
                              onChange={(e) => handleCustomizationChange('foreground_color', e.target.value)}
                              className="w-12 h-10 rounded-lg border border-gray-600 bg-gray-700 cursor-pointer"
                            />
                            <span className="text-sm text-gray-300 font-mono">
                              {qrData.customization?.foreground_color || '#000000'}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-300">Background Color</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={qrData.customization?.background_color || '#FFFFFF'}
                              onChange={(e) => handleCustomizationChange('background_color', e.target.value)}
                              className="w-12 h-10 rounded-lg border border-gray-600 bg-gray-700 cursor-pointer"
                            />
                            <span className="text-sm text-gray-300 font-mono">
                              {qrData.customization?.background_color || '#FFFFFF'}
                            </span>
                          </div>
                        </div>
                        <Input
                          type="number"
                          label="Size (px)"
                          value={String(qrData.customization?.size || 300)}
                          onChange={(e) => handleSizeChange(e.target.value)}
                          min={100}
                          max={1000}
                        />
                        <Select
                          label="Style"
                          selectedKeys={[qrData.customization?.style || 'square']}
                          onChange={(e) => handleCustomizationChange('style', e.target.value as 'square' | 'rounded' | 'circle')}
                        >
                          <SelectItem key="square" value="square">Square</SelectItem>
                          <SelectItem key="rounded" value="rounded">Rounded</SelectItem>
                          <SelectItem key="circle" value="circle">Circle</SelectItem>
                        </Select>
                                                 <div className="flex items-center gap-2">
                           <input
                             type="checkbox"
                             id="border"
                             checked={qrData.customization?.border || false}
                             onChange={(e) => handleCustomizationChange('border', e.target.checked)}
                             className="w-4 h-4 text-primary bg-gray-700 border-gray-600 rounded focus:ring-primary focus:ring-2"
                           />
                           <label htmlFor="border" className="text-gray-300">Add Border</label>
                         </div>
                      </div>
                    )}
                    
                    {/* Color Preview - Always Visible */}
                    <div className="mt-4 p-4 bg-gray-800/30 rounded-lg border border-gray-600">
                      <h4 className="text-sm font-medium text-gray-300 mb-3">Color Preview</h4>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-8 h-8 rounded-lg border border-gray-600"
                            style={{ backgroundColor: qrData.customization?.foreground_color || '#000000' }}
                          ></div>
                          <span className="text-sm text-gray-300">Foreground</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-8 h-8 rounded-lg border border-gray-600"
                            style={{ backgroundColor: qrData.customization?.background_color || '#FFFFFF' }}
                          ></div>
                          <span className="text-sm text-gray-300">Background</span>
                        </div>
                      </div>
                    </div>
                  </div>

                                     {/* Expiration */}
                   <div className="space-y-4 pb-6">
                                           <div className="flex items-center gap-2 pb-2 border-b border-gray-600">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <h3 className="text-lg font-medium text-white">Expiration (Optional)</h3>
                      </div>
                    <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-600">
                      <Input
                        type="datetime-local"
                        label="Expires At"
                        value={qrData.expires_at || ''}
                        onChange={(e) => handleInputChange('expires_at', e.target.value)}
                        placeholder="Select expiration date and time"
                        description="Leave empty for no expiration"
                      />
                    </div>
                  </div>

                                     {/* Submit Button */}
                   <div className="pt-4">
                     <Button
                       type="submit"
                       color="primary"
                       size="lg"
                       className="w-full h-12 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                       isLoading={submitting}
                       disabled={submitting}
                     >
                       {submitting ? 'Creating...' : 'Create QR Code'}
                     </Button>
                   </div>

                                     {/* Message */}
                   {message && (
                     <div className={`p-4 rounded-xl text-sm border-l-4 ${
                       message.includes('successfully') 
                         ? 'bg-green-50 text-green-800 border-green-500' 
                         : 'bg-red-50 text-red-800 border-red-500'
                     }`}>
                       <div className="flex items-start gap-3">
                         <div className={`w-2 h-2 rounded-full mt-2 ${
                           message.includes('successfully') ? 'bg-green-500' : 'bg-red-500'
                         }`}></div>
                         <p className="font-medium">{message}</p>
                       </div>
                     </div>
                   )}
                </form>
              </CardBody>
            </Card>
          </div>

                     {/* Recent QR Codes */}
           <div className="lg:col-span-1">
             <Card>
               <CardHeader>
                 <div className="flex items-center justify-between">
                   <h3 className="text-lg font-semibold">Recent QR Codes</h3>
                   <div className="flex items-center gap-2">
                     {isUsingSampleData && (
                       <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                         Sample Data
                       </span>
                     )}
                     <span className="text-xs text-muted-foreground bg-primary/10 px-2 py-1 rounded-full">
                       {displayQrCodes.length} {displayQrCodes.length === 1 ? 'code' : 'codes'}
                     </span>
                   </div>
                 </div>
                 {displayQrCodes.length > 0 && (
                   <div className="mt-2">
                     <Button
                       size="sm"
                       variant="light"
                       className="text-xs h-6 px-2 bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                       onPress={() => window.location.href = '/dashboard/qr-codes'}
                     >
                       View All QR Codes
                     </Button>
                   </div>
                 )}
               </CardHeader>
               <CardBody>
                                   {isLoading || isInitializing ? (
                    <div className="text-center py-6">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-3 text-sm text-muted-foreground">Loading QR codes...</p>
                    </div>
                  ) : displayQrCodes.length === 0 ? (
                   <div className="text-center py-8 text-muted-foreground">
                     <div className="bg-gray-100 rounded-full p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                       <QrCode className="h-8 w-8 text-gray-400" />
                     </div>
                     <p className="text-sm font-medium mb-1">No QR codes yet</p>
                     <p className="text-xs text-gray-500">Create your first QR code to get started</p>
                   </div>
                 ) : (
                   <div className="space-y-3">
                                           {displayQrCodes.map((qr) => (
                                                <div 
                                                  key={qr.id} 
                                                  className="group relative bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 border border-gray-600 rounded-xl p-4 hover:shadow-lg hover:shadow-gray-900/50 transition-all duration-200 hover:border-primary/400 cursor-pointer"
                                                  onClick={() => handleQrCodeClick(qr)}
                                                >
                                                                              {/* QR Code Type Badge */}
                           <div className="absolute top-2 left-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              qr.qr_type === 'url' ? 'bg-blue-500/20 text-blue-300' :
                              qr.qr_type === 'wifi' ? 'bg-green-500/20 text-green-300' :
                              qr.qr_type === 'text' ? 'bg-purple-500/20 text-purple-300' :
                              qr.qr_type === 'vcard' ? 'bg-orange-500/20 text-orange-300' :
                              qr.qr_type === 'event' ? 'bg-pink-500/20 text-pink-300' :
                              qr.qr_type === 'file' ? 'bg-indigo-500/20 text-indigo-300' :
                              'bg-gray-500/20 text-gray-300'
                            }`}>
                              {qr.qr_type === 'url' && '🔗'}
                              {qr.qr_type === 'wifi' && '📶'}
                              {qr.qr_type === 'text' && '📝'}
                              {qr.qr_type === 'vcard' && '👤'}
                              {qr.qr_type === 'event' && '📅'}
                              {qr.qr_type === 'file' && '📁'}
                              <span className="ml-1 capitalize">{qr.qr_type}</span>
                            </span>
                          </div>
                         
                                                                                                         {/* QR Code Content */}
                           <div className="pt-8">
                             <h4 className="font-semibold text-white mb-2 truncate drop-shadow-sm">{qr.title}</h4>
                             {qr.description && (
                               <p className="text-sm text-gray-300 mb-3 line-clamp-2">{qr.description}</p>
                             )}
                             
                                                                                         {/* QR Code Preview */}
                               <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-2 w-16 h-16 flex items-center justify-center">
                                 {qr.qr_image_url ? (
                                   <Image 
                                     src={qr.qr_image_url} 
                                     alt={qr.title}
                                     width={64}
                                     height={64}
                                     className="w-full h-full object-contain"
                                   />
                                 ) : (
                                   <QrCode className="h-8 w-8 text-white/80" />
                                 )}
                               </div>
                             
                                                        {/* Status and Date */}
                              <div className="flex items-center justify-between mt-3 text-xs">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full ${
                                  qr.status === 'active' ? 'bg-green-500/20 text-green-300' :
                                  qr.status === 'inactive' ? 'bg-yellow-500/20 text-yellow-300' :
                                  'bg-red-500/20 text-red-300'
                                }`}>
                                  {qr.status === 'active' ? '●' : '○'} {qr.status}
                                </span>
                                <span className="text-gray-300">{formatDate(qr.created_at).date}</span>
                              </div>
                            </div>
                           
                           {/* Action Buttons */}
                           <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <Button
                              size="sm"
                              variant="light"
                              className="min-w-0 px-2 py-1 h-7 text-xs bg-white/10 hover:bg-white/20 text-white border-white/20"
                              onPress={() => downloadQrCode(qr.id, qr.title)}
                              startContent={<Download className="h-3 w-3" />}
                            >
                              Download
                            </Button>
                            <Button
                              size="sm"
                              variant="light"
                              color="danger"
                              className="min-w-0 px-2 py-1 h-7 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 border-red-500/30"
                              onPress={() => deleteQrCode(qr.id)}
                              startContent={<Trash2 className="h-3 w-3" />}
                            >
                              Delete
                            </Button>
                          </div>
                       </div>
                     ))}
                   </div>
                 )}
                 
                                   {/* Quick Actions */}
                  {displayQrCodes.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-600">
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Quick actions</span>
                        <Button
                          size="sm"
                          variant="light"
                          className="text-xs h-6 px-2 bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                          onPress={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        >
                          Create New
                        </Button>
                      </div>
                    </div>
                  )}
               </CardBody>
             </Card>
           </div>
                 </div>
       </div>
       
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
                 <p className="text-white font-medium">
                   {selectedQrCode.qr_type === 'url' ? (selectedQrCode.content as Record<string, unknown>)?.url as string || 'No URL' :
                    selectedQrCode.qr_type === 'wifi' ? ((selectedQrCode.content as Record<string, unknown>)?.wifi as Record<string, unknown>)?.ssid as string || 'No SSID' :
                    selectedQrCode.qr_type === 'text' ? (selectedQrCode.content as Record<string, unknown>)?.text as string || 'No text' :
                    selectedQrCode.qr_type === 'vcard' ? ((selectedQrCode.content as Record<string, unknown>)?.vcard as Record<string, unknown>)?.name as string || 'No name' :
                    selectedQrCode.qr_type === 'event' ? ((selectedQrCode.content as Record<string, unknown>)?.event as Record<string, unknown>)?.title as string || 'No title' :
                    selectedQrCode.qr_type === 'file' ? ((selectedQrCode.content as Record<string, unknown>)?.file as Record<string, unknown>)?.name as string || 'No file' :
                    'Unknown content'}
                 </p>
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
                    {formatDate(selectedQrCode.created_at).date}
                  </span>
               </div>
               
               {/* Scan Count */}
               <div className="flex items-center justify-center gap-2 mb-6 text-sm text-gray-300">
                 <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                 </svg>
                 <span>{selectedQrCode.scan_count || 0} scans</span>
               </div>
               
               {/* Action Buttons */}
               <div className="flex items-center gap-3 mt-6">
                 <Button
                   size="sm"
                   variant="light"
                   className="flex-1 bg-white/10 hover:bg-white/20 text-white border-white/20"
                   onPress={() => downloadQrCode(selectedQrCode.id, selectedQrCode.title)}
                   startContent={<Download className="h-4 w-4" />}
                 >
                   Download
                 </Button>
                 <Button
                   size="sm"
                   variant="light"
                   color="danger"
                   className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 border-red-500/30"
                   onPress={() => deleteQrCode(selectedQrCode.id)}
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
   );
 }
