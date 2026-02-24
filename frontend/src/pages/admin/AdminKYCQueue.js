import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from './AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Eye, Clock, User } from 'lucide-react';

const AdminKYCQueue = () => {
  const { api } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedKYC, setSelectedKYC] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

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
      console.error('Error loading KYC queue:', err);
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
                  <Button onClick={() => setSelectedKYC(kyc)}>
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

              {/* Documents */}
              <div className="space-y-4">
                <h4 className="font-semibold">Documents</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* ID Front */}
                  <div>
                    <p className="text-sm text-gray-500 mb-2">ID Document (Front)</p>
                    {selectedKYC.id_document_front ? (
                      <img 
                        src={selectedKYC.id_document_front} 
                        alt="ID Front" 
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-gray-400">Not provided</span>
                      </div>
                    )}
                  </div>

                  {/* ID Back */}
                  {selectedKYC.id_document_type === 'id_card' && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">ID Document (Back)</p>
                      {selectedKYC.id_document_back ? (
                        <img 
                          src={selectedKYC.id_document_back} 
                          alt="ID Back" 
                          className="w-full h-48 object-cover rounded-lg border"
                        />
                      ) : (
                        <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                          <span className="text-gray-400">Not provided</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Selfie */}
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Selfie with ID</p>
                    {selectedKYC.selfie_with_id ? (
                      <img 
                        src={selectedKYC.selfie_with_id} 
                        alt="Selfie" 
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-gray-400">Not provided</span>
                      </div>
                    )}
                  </div>

                  {/* Proof of Address */}
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Proof of Address</p>
                    {selectedKYC.proof_of_address ? (
                      <img 
                        src={selectedKYC.proof_of_address} 
                        alt="Proof of Address" 
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-gray-400">Not provided</span>
                      </div>
                    )}
                  </div>
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
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedKYC(null)}
                >
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
    </AdminLayout>
  );
};

export default AdminKYCQueue;
