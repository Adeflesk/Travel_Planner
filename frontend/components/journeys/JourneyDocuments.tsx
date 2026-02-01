'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { JourneyDocument, DocumentType } from '@/lib/types';
import { journeyDocumentApi } from '@/lib/api';
import {
  FileText,
  Link as LinkIcon,
  Trash2,
  ExternalLink,
  Upload,
  Plus,
  X,
  Ticket,
  FileCheck,
  Car,
  Map,
  Shield,
  FileQuestion,
} from 'lucide-react';
import { format } from 'date-fns';

const documentTypeIcons: Record<DocumentType, React.ReactNode> = {
  ticket: <Ticket className="w-4 h-4" />,
  confirmation: <FileCheck className="w-4 h-4" />,
  rental: <Car className="w-4 h-4" />,
  map: <Map className="w-4 h-4" />,
  visa: <Shield className="w-4 h-4" />,
  insurance: <Shield className="w-4 h-4" />,
  other: <FileQuestion className="w-4 h-4" />,
};

const documentTypeLabels: Record<DocumentType, string> = {
  ticket: 'Ticket',
  confirmation: 'Confirmation',
  rental: 'Rental',
  map: 'Map',
  visa: 'Visa',
  insurance: 'Insurance',
  other: 'Other',
};

interface JourneyDocumentsProps {
  journeyId: number;
}

export function JourneyDocuments({ journeyId }: JourneyDocumentsProps) {
  const [documents, setDocuments] = useState<JourneyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddLink, setShowAddLink] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state for link
  const [linkForm, setLinkForm] = useState({
    name: '',
    url: '',
    document_type: 'other' as DocumentType,
    notes: '',
  });

  // Form state for upload
  const [uploadForm, setUploadForm] = useState({
    name: '',
    document_type: 'other' as DocumentType,
    notes: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await journeyDocumentApi.getByJourneyId(journeyId);
      setDocuments(response.data);
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  }, [journeyId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await journeyDocumentApi.create({
        journey_id: journeyId,
        name: linkForm.name,
        url: linkForm.url,
        document_type: linkForm.document_type,
        notes: linkForm.notes || undefined,
      });
      setLinkForm({ name: '', url: '', document_type: 'other', notes: '' });
      setShowAddLink(false);
      fetchDocuments();
    } catch (err) {
      console.error('Error adding link:', err);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    try {
      setUploading(true);
      await journeyDocumentApi.upload(
        journeyId,
        selectedFile,
        uploadForm.name || selectedFile.name,
        uploadForm.document_type,
        uploadForm.notes || undefined
      );
      setUploadForm({ name: '', document_type: 'other', notes: '' });
      setSelectedFile(null);
      setShowUpload(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchDocuments();
    } catch (err) {
      console.error('Error uploading file:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: number) => {
    if (!confirm('Delete this document?')) return;
    try {
      await journeyDocumentApi.delete(journeyId, documentId);
      fetchDocuments();
    } catch (err) {
      console.error('Error deleting document:', err);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!uploadForm.name) {
        setUploadForm({ ...uploadForm, name: file.name });
      }
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500 py-2">Loading documents...</div>;
  }

  return (
    <div className="space-y-3">
      {/* Documents List */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                  {doc.file_path ? (
                    <FileText className="w-4 h-4" />
                  ) : (
                    <LinkIcon className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{doc.name}</span>
                    <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600 flex items-center gap-1">
                      {documentTypeIcons[doc.document_type]}
                      {documentTypeLabels[doc.document_type]}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {doc.url && (
                      <span className="truncate max-w-[200px] inline-block align-bottom">
                        {doc.url}
                      </span>
                    )}
                    {doc.file_path && <span>Uploaded file</span>}
                    <span className="mx-1">·</span>
                    {format(new Date(doc.created_at), 'MMM dd, yyyy')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {doc.url && (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-blue-600 hover:text-blue-700"
                    title="Open link"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-2 text-red-600 hover:text-red-700"
                  title="Delete document"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {documents.length === 0 && !showAddLink && !showUpload && (
        <div className="text-center py-4 text-gray-500 text-sm">
          No documents attached yet.
        </div>
      )}

      {/* Add Link Form */}
      {showAddLink && (
        <form onSubmit={handleAddLink} className="p-4 bg-white border border-gray-200 rounded-lg space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-gray-800">Add Link</h4>
            <button type="button" onClick={() => setShowAddLink(false)} className="text-gray-500">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Document name"
              value={linkForm.name}
              onChange={(e) => setLinkForm({ ...linkForm, name: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm"
              required
            />
            <select
              value={linkForm.document_type}
              onChange={(e) => setLinkForm({ ...linkForm, document_type: e.target.value as DocumentType })}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              {Object.entries(documentTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <input
              type="url"
              placeholder="https://..."
              value={linkForm.url}
              onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
              className="col-span-2 border rounded-lg px-3 py-2 text-sm"
              required
            />
            <input
              type="text"
              placeholder="Notes (optional)"
              value={linkForm.notes}
              onChange={(e) => setLinkForm({ ...linkForm, notes: e.target.value })}
              className="col-span-2 border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAddLink(false)} className="px-3 py-1.5 text-sm text-gray-600">
              Cancel
            </button>
            <button type="submit" className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm">
              Add Link
            </button>
          </div>
        </form>
      )}

      {/* Upload Form */}
      {showUpload && (
        <form onSubmit={handleUpload} className="p-4 bg-white border border-gray-200 rounded-lg space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-gray-800">Upload File</h4>
            <button type="button" onClick={() => setShowUpload(false)} className="text-gray-500">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept=".pdf,.png,.jpg,.jpeg,.gif,.txt,.doc,.docx"
              className="w-full text-sm"
              required
            />
            {selectedFile && (
              <p className="text-xs text-gray-500">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Document name"
                value={uploadForm.name}
                onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                className="border rounded-lg px-3 py-2 text-sm"
              />
              <select
                value={uploadForm.document_type}
                onChange={(e) => setUploadForm({ ...uploadForm, document_type: e.target.value as DocumentType })}
                className="border rounded-lg px-3 py-2 text-sm"
              >
                {Object.entries(documentTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Notes (optional)"
                value={uploadForm.notes}
                onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                className="col-span-2 border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowUpload(false)} className="px-3 py-1.5 text-sm text-gray-600">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      )}

      {/* Action Buttons */}
      {!showAddLink && !showUpload && (
        <div className="flex gap-2">
          <button
            onClick={() => setShowUpload(true)}
            className="flex-1 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 flex items-center justify-center gap-2 text-sm"
          >
            <Upload className="w-4 h-4" />
            Upload File
          </button>
          <button
            onClick={() => setShowAddLink(true)}
            className="flex-1 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 flex items-center justify-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Link
          </button>
        </div>
      )}
    </div>
  );
}
