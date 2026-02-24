import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { ArrowLeft, Upload, Camera, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const KYCPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, api, refreshUser, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [step, setStep] = useState(1);
  const [documentType, setDocumentType] = useState('passport');
  const [tokenUser, setTokenUser] = useState(null); // User authenticated via token
  const [files, setFiles] = useState({
    id_front: null,
    id_back: null,
    selfie: null,
    address_proof: null,
  });
  const [previews, setPreviews] = useState({
    id_front: null,
    id_back: null,
    selfie: null,
    address_proof: null,
  });

  const fileInputRefs = {
    id_front: useRef(),
    id_back: useRef(),
    selfie: useRef(),
    address_proof: useRef(),
  };

  // Check for token in URL and authenticate
  useEffect(() => {
    const token = searchParams.get('token');
    if (token && !isAuthenticated) {
      authenticateWithToken(token);
    }
  }, [searchParams, isAuthenticated]);

  const authenticateWithToken = async (token) => {
    setAuthenticating(true);
    try {
      const response = await axios.post(`${API}/auth/kyc-access/${token}`);
      if (response.data.ok) {
        // Store the JWT token
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        setTokenUser(response.data.data.user);
        // Refresh the auth context
        await refreshUser();
        toast.success('Welcome! Please complete your identity verification.');
      }
    } catch (error) {
      toast.error('Invalid or expired verification link. Please request a new one.');
      navigate('/login');
    } finally {
      setAuthenticating(false);
    }
  };

  // Get the current user (either from auth context or token auth)
  const currentUser = user || tokenUser;

  const handleFileChange = (field) => (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }

      setFiles(prev => ({ ...prev, [field]: file }));

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => ({ ...prev, [field]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async () => {
    // Validate required files
    if (!files.id_front) {
      toast.error('Please upload your ID document (front)');
      return;
    }
    if (documentType === 'id_card' && !files.id_back) {
      toast.error('Please upload your ID document (back)');
      return;
    }
    if (!files.selfie) {
      toast.error('Please upload a selfie with your ID');
      return;
    }
    if (!files.address_proof) {
      toast.error('Please upload proof of address');
      return;
    }

    setLoading(true);

    try {
      const kycData = {
        id_document_type: documentType,
        id_document_front: await convertToBase64(files.id_front),
        id_document_back: documentType === 'id_card' ? await convertToBase64(files.id_back) : null,
        selfie_with_id: await convertToBase64(files.selfie),
        proof_of_address: await convertToBase64(files.address_proof),
      };

      const response = await api.post('/kyc/submit', kycData);

      if (response.data.ok) {
        toast.success('KYC documents submitted successfully! Our team will review them shortly.');
        await refreshUser();
        navigate('/wallet');
      } else {
        toast.error(response.data.error?.message || 'Submission failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit KYC documents');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while authenticating via token
  if (authenticating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying your access...</h2>
            <p className="text-gray-600">Please wait while we authenticate you.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If not authenticated and no token, redirect to login
  if (!isAuthenticated && !tokenUser && !searchParams.get('token')) {
    navigate('/login');
    return null;
  }

  // If KYC already approved
  if (currentUser?.kyc_status === 'approved') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-lg mx-auto px-4 py-4">
            <Link to="/wallet" className="flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span className="font-semibold">Identity Verification</span>
            </Link>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-12">
          <Card className="text-center">
            <CardContent className="pt-6">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Verification Complete</h2>
              <p className="text-gray-600">Your identity has been verified successfully.</p>
              <Link to="/wallet">
                <Button className="mt-6 bg-blue-600 hover:bg-blue-700">
                  Back to Wallet
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // If KYC pending
  if (currentUser?.kyc_status === 'pending' || currentUser?.kyc_status === 'under_review') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-lg mx-auto px-4 py-4">
            <Link to="/wallet" className="flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span className="font-semibold">Identity Verification</span>
            </Link>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-12">
          <Card className="text-center">
            <CardContent className="pt-6">
              <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Verification Pending</h2>
              <p className="text-gray-600">Your documents are being reviewed. This usually takes 1-2 business days.</p>
              <Link to="/wallet">
                <Button className="mt-6" variant="outline">
                  Back to Wallet
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-4">
          <Link to="/wallet" className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="font-semibold">Identity Verification</span>
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Welcome Message */}
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <p className="text-blue-800">
              <strong>Hello {currentUser?.first_name}!</strong> Please complete the identity verification process below to unlock your account.
            </p>
          </CardContent>
        </Card>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {s}
              </div>
              {s < 3 && (
                <div className={`w-16 h-1 ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Document Type */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Document Type</CardTitle>
              <CardDescription>Choose the type of ID document you'll upload</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={documentType} onValueChange={setDocumentType} className="space-y-3">
                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="passport" id="passport" />
                  <Label htmlFor="passport" className="flex-1 cursor-pointer">
                    <div className="font-medium">Passport</div>
                    <div className="text-sm text-gray-500">International passport</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="id_card" id="id_card" />
                  <Label htmlFor="id_card" className="flex-1 cursor-pointer">
                    <div className="font-medium">ID Card</div>
                    <div className="text-sm text-gray-500">National ID card (front & back)</div>
                  </Label>
                </div>
              </RadioGroup>
              <Button 
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700"
                onClick={() => setStep(2)}
              >
                Continue
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Upload Documents */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Documents</CardTitle>
              <CardDescription>Upload clear photos of your documents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* ID Front */}
              <div>
                <Label className="mb-2 block">
                  {documentType === 'passport' ? 'Passport Photo Page' : 'ID Card (Front)'}
                </Label>
                <input
                  type="file"
                  ref={fileInputRefs.id_front}
                  onChange={handleFileChange('id_front')}
                  accept="image/*"
                  className="hidden"
                />
                {previews.id_front ? (
                  <div className="relative">
                    <img src={previews.id_front} alt="ID Front" className="w-full h-48 object-cover rounded-lg" />
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="absolute bottom-2 right-2"
                      onClick={() => fileInputRefs.id_front.current.click()}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRefs.id_front.current.click()}
                    className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:bg-gray-50 transition"
                  >
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-gray-600">Click to upload</span>
                  </button>
                )}
              </div>

              {/* ID Back (only for ID card) */}
              {documentType === 'id_card' && (
                <div>
                  <Label className="mb-2 block">ID Card (Back)</Label>
                  <input
                    type="file"
                    ref={fileInputRefs.id_back}
                    onChange={handleFileChange('id_back')}
                    accept="image/*"
                    className="hidden"
                  />
                  {previews.id_back ? (
                    <div className="relative">
                      <img src={previews.id_back} alt="ID Back" className="w-full h-48 object-cover rounded-lg" />
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="absolute bottom-2 right-2"
                        onClick={() => fileInputRefs.id_back.current.click()}
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRefs.id_back.current.click()}
                      className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:bg-gray-50 transition"
                    >
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-gray-600">Click to upload</span>
                    </button>
                  )}
                </div>
              )}

              <div className="flex space-x-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={() => setStep(3)}
                  disabled={!files.id_front || (documentType === 'id_card' && !files.id_back)}
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Selfie & Address */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Final Step</CardTitle>
              <CardDescription>Upload selfie and proof of address</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Selfie */}
              <div>
                <Label className="mb-2 block">Selfie with ID</Label>
                <p className="text-sm text-gray-500 mb-2">
                  Take a photo of yourself holding your ID document
                </p>
                <input
                  type="file"
                  ref={fileInputRefs.selfie}
                  onChange={handleFileChange('selfie')}
                  accept="image/*"
                  className="hidden"
                />
                {previews.selfie ? (
                  <div className="relative">
                    <img src={previews.selfie} alt="Selfie" className="w-full h-48 object-cover rounded-lg" />
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="absolute bottom-2 right-2"
                      onClick={() => fileInputRefs.selfie.current.click()}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRefs.selfie.current.click()}
                    className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:bg-gray-50 transition"
                  >
                    <Camera className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-gray-600">Upload selfie with ID</span>
                  </button>
                )}
              </div>

              {/* Proof of Address */}
              <div>
                <Label className="mb-2 block">Proof of Address</Label>
                <p className="text-sm text-gray-500 mb-2">
                  Utility bill or bank statement (less than 3 months old)
                </p>
                <input
                  type="file"
                  ref={fileInputRefs.address_proof}
                  onChange={handleFileChange('address_proof')}
                  accept="image/*"
                  className="hidden"
                />
                {previews.address_proof ? (
                  <div className="relative">
                    <img src={previews.address_proof} alt="Address Proof" className="w-full h-48 object-cover rounded-lg" />
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="absolute bottom-2 right-2"
                      onClick={() => fileInputRefs.address_proof.current.click()}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRefs.address_proof.current.click()}
                    className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:bg-gray-50 transition"
                  >
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-gray-600">Upload proof of address</span>
                  </button>
                )}
              </div>

              <div className="flex space-x-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  Back
                </Button>
                <Button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleSubmit}
                  disabled={loading || !files.selfie || !files.address_proof}
                >
                  {loading ? 'Submitting...' : 'Submit for Review'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default KYCPage;
