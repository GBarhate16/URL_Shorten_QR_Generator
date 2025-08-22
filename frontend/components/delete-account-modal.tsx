"use client";

import React, { useState } from 'react';
import { Button } from '@heroui/button';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/modal';
import { Input } from '@heroui/input';
import { Trash2, AlertTriangle } from 'lucide-react';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<boolean>;
  username: string;
}

export default function DeleteAccountModal({ isOpen, onClose, onConfirm, username }: DeleteAccountModalProps) {
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (confirmationText !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const success = await onConfirm();
      if (success) {
        onClose();
      } else {
        setError('Failed to delete account. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setConfirmationText('');
      setError('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} isDismissable={!isDeleting}>
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            <span>Delete Account</span>
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800 dark:text-red-200">
                <p className="font-medium mb-1">This action cannot be undone!</p>
                <p>Deleting your account will permanently remove:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>All your shortened URLs</li>
                  <li>All your QR codes</li>
                  <li>All analytics and click data</li>
                  <li>Your user profile and settings</li>
                </ul>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                To confirm deletion, please type <span className="font-mono font-bold">DELETE</span> in the field below:
              </p>
              <Input
                placeholder="Type DELETE to confirm"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                disabled={isDeleting}
                className={error ? 'border-red-500' : ''}
              />
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p><strong>Account:</strong> {username}</p>
              <p><strong>Action:</strong> Permanent deletion</p>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="light"
            onPress={handleClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            color="danger"
            onPress={handleConfirm}
            disabled={confirmationText !== 'DELETE' || isDeleting}
            isLoading={isDeleting}
            startContent={!isDeleting ? <Trash2 className="h-4 w-4" /> : undefined}
          >
            {isDeleting ? 'Deleting...' : 'Delete Account'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
