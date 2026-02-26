import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from './AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Eye, Clock, User, RefreshCw, Download, X } from 'lucide-react';

const getDownloadUrl = (src) => {
  if (!src || !src.includes('cloudinary.com')) return src;
  return src.replace('/upload/', '/upload/fl_attachment,f_jpg/');
};

const DocImage = ({ src, label, onZoom }) => {
  if (!src) {
    return (
      <div>
        <p className="text-sm text-gray-500 mb-2">{label}</p>
        <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
          <span className="text-gray-400">Not provided</span>
        </div>
      </div>
    );
  }

  const isUrl = src.startsWith('http');

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500">{label}</p>
        {isUrl && (
          <a
            href={getDownloadUrl(src)}
            data-testid={`download-${label.toLowerCase().replace(/[^a-z]/g, '-')}`}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </a>
        )}
      </div>
      <img
        src={src}
        alt={label}
        className="w-full h-48 object-cover rounded-lg border hover:opacity-90 transition cursor-zoom-in"
        onClick={() => onZoom(src, label)}
      />
    </div>
  );
};

const AdminKYCQueue = () => {
  const { api } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedKYC, setSelectedKYC] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [zoomImage, setZoomImage] = useState(null);

  useEffect(() => {
    loadKYCQueue();
  }, []);

  const loadKYCQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/admin/kyc-queue');
      if (response.data.ok) {
        setSubmissions(response.data.data.kyc_submissions || []);
      } else {
        setError('Failed to load KYC queue');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load KYC queue. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (userId, status) => {
    setProcessing(true);
    try {
      const response = await api.post(`/admin/kyc/${userId}/review`, {
        status,
        rejection_reason: status === 'rejected' ? rejectionReason : null
      });

      if (response.data.ok) {
        toast.success(`KYC ${status}`);
        if (response.data.email_sent) {
          toast.info('Password reset email sent to user');
        }
        setSelectedKYC(null);
        setRejectionReason('');
        loadKYCQueue();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to process KYC');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AdminLayout title="KYC Queue">
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadKYCQueue} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : submissions.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No pending KYC submissions</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {submissions.map((kyc) => (
            <Card key={kyc.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {kyc.user?.first_name} {kyc.user?.last_name}
                      </h3>
                      <p className="text-gray-500">{kyc.user?.email}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className="bg-yellow-100 text-yellow-700">{kyc.status}</Badge>
                        <span className="text-xs text-gray-400">
                          Submitted: {new Date(kyc.submitted_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button onClick={() => setSelectedKYC(kyc)} data-testid={`review-kyc-${kyc.user_id}`}>
                    <Eye className="w-4 h-4 mr-2" />
                    Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Modal */}
      <Dialog open={!!selectedKYC} onOpenChange={() => setSelectedKYC(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Review KYC - {selectedKYC?.user?.first_name} {selectedKYC?.user?.last_name}
            </DialogTitle>
          </DialogHeader>

          {selectedKYC && (
            <div className="space-y-6">
              {/* User Info */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">User Information</h4>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div><dt className="text-gray-500">Email:</dt><dd>{selectedKYC.user?.email}</dd></div>
                  <div><dt className="text-gray-500">Username:</dt><dd>@{selectedKYC.user?.username}</dd></div>
                  <div><dt className="text-gray-500">DOB:</dt><dd>{selectedKYC.user?.date_of_birth}</dd></div>
                  <div><dt className="text-gray-500">Document Type:</dt><dd className="capitalize">{selectedKYC.id_document_type}</dd></div>
                </dl>
              </div>

              {/* Documents with download + zoom */}
              <div className="space-y-4">
                <h4 className="font-semibold">Documents</h4>
                <div className="grid grid-cols-2 gap-4">
                  <DocImage src={selectedKYC.id_document_front} label="ID Document (Front)" onZoom={(s, l) => setZoomImage({ src: s, label: l })} />
                  {selectedKYC.id_document_type === 'id_card' && (
                    <DocImage src={selectedKYC.id_document_back} label="ID Document (Back)" onZoom={(s, l) => setZoomImage({ src: s, label: l })} />
                  )}
                  <DocImage src={selectedKYC.selfie_with_id} label="Selfie with ID" onZoom={(s, l) => setZoomImage({ src: s, label: l })} />
                  <DocImage src={selectedKYC.proof_of_address} label="Proof of Address" onZoom={(s, l) => setZoomImage({ src: s, label: l })} />
                </div>
              </div>

              {/* Rejection Reason */}
              <div>
                <label className="text-sm font-medium">Rejection Reason (if rejecting)</label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  className="mt-2"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setSelectedKYC(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleReview(selectedKYC.user_id, 'rejected')}
                  disabled={processing}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleReview(selectedKYC.user_id, 'approved')}
                  disabled={processing}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Zoom Lightbox — rendered via portal to avoid Dialog interference */}
      {zoomImage && createPortal(
        <div
          data-testid="image-zoom-overlay"
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center cursor-pointer"
          onClick={() => setZoomImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 z-[201]"
            onClick={(e) => { e.stopPropagation(); setZoomImage(null); }}
          >
            <X className="w-6 h-6" />
          </button>
          <p className="absolute top-4 left-4 text-white/70 text-sm">{zoomImage.label}</p>
          <img
            src={zoomImage.src}
            alt={zoomImage.label}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body
      )}
    </AdminLayout>
  );
};

export default AdminKYCQueue;
