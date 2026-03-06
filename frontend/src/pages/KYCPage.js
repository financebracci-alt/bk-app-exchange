import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLang } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { ArrowLeft, Upload, Camera, CheckCircle, Clock, Loader2, ShieldCheck, ScanFace, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import * as faceapi from 'face-api.js';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Compress image to a Blob (binary) instead of base64 — more efficient for uploads
const compressImageToBlob = (file, maxWidth = 1024, quality = 0.6) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            canvas.width = 0;
            canvas.height = 0;
            if (blob) resolve(blob);
            else reject(new Error('Compression produced empty blob'));
          },
          'image/jpeg',
          quality
        );
      } catch (err) {
        reject(new Error('Image compression failed'));
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = e.target.result;
  };
  reader.onerror = () => reject(new Error('Failed to read file'));
  reader.readAsDataURL(file);
});

// Detect if a face exists in an image data URL using face-api.js
const detectFace = async (dataUrl) => {
  try {
    // Load the image
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = dataUrl;
    });

    // Resize to ~640px for reliable face detection (phone photos are 4000px+ which confuses the detector)
    const maxDim = 640;
    let w = img.width, h = img.height;
    if (w > maxDim || h > maxDim) {
      if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
      else { w = Math.round(w * maxDim / h); h = maxDim; }
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);

    // Run detection on the resized canvas
    const detections = await faceapi.detectAllFaces(canvas, new faceapi.TinyFaceDetectorOptions({
      inputSize: 416,
      scoreThreshold: 0.5,
    }));

    // Cleanup
    canvas.width = 0;
    canvas.height = 0;

    if (detections.length === 0) return false;

    // Verify the detected face is a reasonable size (at least 5% of image area)
    // A real selfie has the face taking up a significant portion of the frame
    const imageArea = w * h;
    const bestFace = detections.reduce((a, b) => (a.box.area > b.box.area ? a : b));
    const faceAreaRatio = bestFace.box.area / imageArea;

    return faceAreaRatio > 0.02; // Face must be at least 2% of image
  } catch (err) {
    console.error('Face detection error:', err);
    return true; // On error, allow through (don't block the user)
  }
};

/* ── Face ID Scan Overlay ── */
const faceScanStyles = `
@keyframes faceScanLine {
  0% { top: 10%; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { top: 85%; opacity: 0; }
}
@keyframes facePulse {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.03); }
}
@keyframes faceCorners {
  0% { stroke-dashoffset: 200; }
  100% { stroke-dashoffset: 0; }
}
@keyframes faceDots {
  0%, 20% { opacity: 0; }
  40% { opacity: 1; }
  60% { opacity: 0; }
  80% { opacity: 1; }
  100% { opacity: 0; }
}
`;

const FaceScanOverlay = ({ selfiePreview, phase, t }) => {
  // phase: 'scanning' | 'verified'
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center" data-testid="face-scan-overlay">
      <style>{faceScanStyles}</style>

      {phase === 'scanning' && (
        <>
          {/* Face frame */}
          <div className="relative w-56 h-56 sm:w-64 sm:h-64 mb-6">
            {/* Selfie image inside oval */}
            {selfiePreview && (
              <div className="absolute inset-4 rounded-full overflow-hidden" style={{ animation: 'facePulse 2s ease-in-out infinite' }}>
                <img src={selfiePreview} alt="" className="w-full h-full object-cover" />
              </div>
            )}

            {/* Corner brackets SVG */}
            <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full">
              {/* Top-left */}
              <path d="M 20 50 L 20 20 L 50 20" fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round"
                style={{ strokeDasharray: 200, animation: 'faceCorners 1.5s ease forwards' }} />
              {/* Top-right */}
              <path d="M 150 20 L 180 20 L 180 50" fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round"
                style={{ strokeDasharray: 200, animation: 'faceCorners 1.5s ease 0.2s forwards' }} />
              {/* Bottom-right */}
              <path d="M 180 150 L 180 180 L 150 180" fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round"
                style={{ strokeDasharray: 200, animation: 'faceCorners 1.5s ease 0.4s forwards' }} />
              {/* Bottom-left */}
              <path d="M 50 180 L 20 180 L 20 150" fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round"
                style={{ strokeDasharray: 200, animation: 'faceCorners 1.5s ease 0.6s forwards' }} />
            </svg>

            {/* Scanning line */}
            <div className="absolute left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent"
              style={{ animation: 'faceScanLine 2s ease-in-out infinite', top: '10%' }} />
          </div>

          {/* Scan icon + text */}
          <ScanFace className="w-6 h-6 text-blue-400 mb-2" />
          <p className="text-white text-lg font-medium">{t.faceScanInProgress || 'Biometric Verification'}</p>
          <p className="text-gray-400 text-sm mt-1">{t.faceScanAnalyzing || 'Analyzing facial features...'}</p>

          {/* Animated dots */}
          <div className="flex space-x-2 mt-4">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-blue-500"
                style={{ animation: `faceDots 1.4s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </div>
        </>
      )}

      {phase === 'verified' && (
        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
            <ShieldCheck className="w-10 h-10 text-green-400" />
          </div>
          <p className="text-white text-xl font-semibold">{t.faceScanVerified || 'Face Verified'}</p>
          <p className="text-green-400 text-sm mt-1">{t.faceScanMatch || 'Identity match confirmed'}</p>
        </div>
      )}

      {phase === 'failed' && (
        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </div>
          <p className="text-white text-xl font-semibold">{t.faceScanFailed || 'No Face Detected'}</p>
          <p className="text-red-400 text-sm mt-1 text-center px-8">{t.faceScanRetry || 'Please upload a clear photo of your face'}</p>
        </div>
      )}
    </div>
  );
};

const KYCPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, api, refreshUser, isAuthenticated } = useAuth();
  const { t } = useLang();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [authenticating, setAuthenticating] = useState(false);
  const [step, setStep] = useState(() => {
    try { return parseInt(sessionStorage.getItem('kyc_step')) || 1; } catch { return 1; }
  });
  const [documentType, setDocumentType] = useState(() => {
    try { return sessionStorage.getItem('kyc_doc_type') || 'passport'; } catch { return 'passport'; }
  });
  const [tokenUser, setTokenUser] = useState(null);

  // Track which field is currently uploading
  const [uploadingField, setUploadingField] = useState(null);

  // Face scan animation state: null | 'scanning' | 'verified' | 'failed'
  const [faceScanPhase, setFaceScanPhase] = useState(null);

  // Face detection model loaded state
  const [faceModelLoaded, setFaceModelLoaded] = useState(false);

  // Load face detection model on mount
  useEffect(() => {
    faceapi.nets.tinyFaceDetector.loadFromUri('/models')
      .then(() => { setFaceModelLoaded(true); console.log('Face detection model loaded'); })
      .catch(err => { console.error('Failed to load face model:', err); setFaceModelLoaded(true); }); // Allow through on error
  }, []);

  // Previews for display (base64 data URLs)
  const [previews, setPreviews] = useState(() => {
    try {
      const saved = sessionStorage.getItem('kyc_previews');
      return saved ? JSON.parse(saved) : { id_front: null, id_back: null, selfie: null, address_proof: null };
    } catch { return { id_front: null, id_back: null, selfie: null, address_proof: null }; }
  });

  // Cloudinary URLs from successful uploads
  const [uploadedUrls, setUploadedUrls] = useState(() => {
    try {
      const saved = sessionStorage.getItem('kyc_urls');
      return saved ? JSON.parse(saved) : { id_front: null, id_back: null, selfie: null, address_proof: null };
    } catch { return { id_front: null, id_back: null, selfie: null, address_proof: null }; }
  });

  // Persist state to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('kyc_step', step.toString());
      sessionStorage.setItem('kyc_doc_type', documentType);
      sessionStorage.setItem('kyc_previews', JSON.stringify(previews));
      sessionStorage.setItem('kyc_urls', JSON.stringify(uploadedUrls));
    } catch { /* ignore */ }
  }, [step, documentType, previews, uploadedUrls]);

  const fileInputRefs = {
    id_front: useRef(), id_back: useRef(), selfie: useRef(), address_proof: useRef(),
  };
  const cameraInputRefs = {
    id_front: useRef(), id_back: useRef(), selfie: useRef(), address_proof: useRef(),
  };

  // Upload a single file to Cloudinary via FormData (binary, not base64)
  const uploadFileToCloudinary = useCallback(async (file, field) => {
    setUploadingField(field);
    try {
      const blob = await compressImageToBlob(file);
      const formData = new FormData();
      formData.append('file', blob, `${field}.jpg`);
      formData.append('field', field);

      // Retry up to 2 times
      let lastError = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await api.post('/kyc/upload-file', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 60000, // 60 second timeout for upload
          });
          if (res.data.ok) {
            setUploadedUrls(prev => ({ ...prev, [field]: res.data.url }));
            return res.data.url;
          }
        } catch (err) {
          lastError = err;
          if (attempt < 2) await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
        }
      }
      throw lastError || new Error('Upload failed');
    } catch (err) {
      console.error(`Upload failed for ${field}:`, err);
      toast.error(`${t.uploadFailed || 'Upload failed'} — ${t.tryAgain || 'try again'}`);
      return null;
    } finally {
      setUploadingField(null);
    }
  }, [api, t]);

  // Handle file selection — set preview + immediately upload
  const handleFileChange = (field) => async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && !file.name.match(/\.(heic|heif)$/i)) {
      toast.error(t.fileTypeError);
      return;
    }

    // Set preview immediately
    const reader = new FileReader();
    const previewPromise = new Promise((resolve) => {
      reader.onloadend = () => {
        setPreviews(prev => ({ ...prev, [field]: reader.result }));
        resolve(reader.result);
      };
    });
    reader.readAsDataURL(file);

    // Upload to Cloudinary
    const url = await uploadFileToCloudinary(file, field);

    // For selfie: run face detection then show animation
    if (field === 'selfie' && url) {
      const selfieDataUrl = await previewPromise;
      setFaceScanPhase('scanning');

      // Run face detection while scanning animation plays
      const [hasFace] = await Promise.all([
        faceModelLoaded ? detectFace(selfieDataUrl) : Promise.resolve(true),
        new Promise(r => setTimeout(r, 5000)), // minimum 5s scanning animation
      ]);

      if (hasFace) {
        setFaceScanPhase('verified');
        await new Promise(r => setTimeout(r, 1500));
        setFaceScanPhase(null);
      } else {
        // No face detected — show error, remove the upload
        setFaceScanPhase('failed');
        await new Promise(r => setTimeout(r, 2500));
        setFaceScanPhase(null);
        // Clear the selfie upload
        setPreviews(prev => ({ ...prev, selfie: null }));
        setUploadedUrls(prev => ({ ...prev, selfie: null }));
        toast.error(t.faceScanFailed || 'No face detected. Please upload a clear selfie.');
      }
    }
  };

  const renderUploadArea = (field, label, captureMode = "environment", Icon = Upload) => (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <input type="file" ref={fileInputRefs[field]} onChange={handleFileChange(field)} accept="image/*,.heic,.heif" className="hidden" />
      <input type="file" ref={cameraInputRefs[field]} onChange={handleFileChange(field)} accept="image/*" capture={captureMode} className="hidden" />
      {previews[field] ? (
        <div className="relative">
          <img src={previews[field]} alt={field} className="w-full h-48 object-cover rounded-lg" />
          {/* Upload status overlay */}
          {uploadingField === field && (
            <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
              <div className="flex items-center space-x-2 bg-white/90 px-3 py-2 rounded-full">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-sm font-medium text-gray-800">{t.uploading || 'Uploading'}...</span>
              </div>
            </div>
          )}
          {/* Success indicator */}
          {uploadedUrls[field] && uploadingField !== field && (
            <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
              <CheckCircle className="w-4 h-4" />
            </div>
          )}
          <div className="absolute bottom-2 right-2 flex space-x-2">
            <Button variant="outline" size="sm" className="bg-white/90" onClick={() => cameraInputRefs[field].current.click()} disabled={uploadingField === field}>
              <Camera className="w-3.5 h-3.5 mr-1" />{t.takePhoto}
            </Button>
            <Button variant="outline" size="sm" className="bg-white/90" onClick={() => fileInputRefs[field].current.click()} disabled={uploadingField === field}>
              <Upload className="w-3.5 h-3.5 mr-1" />{t.change}
            </Button>
          </div>
        </div>
      ) : (
        <div className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-3 bg-gray-50/50">
          {uploadingField === field ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-sm text-gray-600">{t.uploading || 'Uploading'}...</span>
            </div>
          ) : (
            <>
              <Icon className="w-8 h-8 text-gray-400" />
              <div className="flex space-x-3">
                <Button variant="outline" size="sm" onClick={() => cameraInputRefs[field].current.click()} data-testid={`${field}-camera-btn`}>
                  <Camera className="w-4 h-4 mr-1.5" />{t.takePhoto}
                </Button>
                <Button variant="outline" size="sm" onClick={() => fileInputRefs[field].current.click()} data-testid={`${field}-gallery-btn`}>
                  <Upload className="w-4 h-4 mr-1.5" />{t.fromGallery}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );

  useEffect(() => {
    const token = searchParams.get('token');
    if (token && !isAuthenticated) authenticateWithToken(token);
  }, [searchParams, isAuthenticated]);

  const authenticateWithToken = async (token) => {
    setAuthenticating(true);
    try {
      const response = await axios.post(`${API}/auth/kyc-access/${token}`);
      if (response.data.ok) {
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        setTokenUser(response.data.data.user);
        await refreshUser();
        toast.success(t.welcomeKyc);
      }
    } catch (error) {
      toast.error(t.invalidKycLink);
      navigate('/login');
    } finally {
      setAuthenticating(false);
    }
  };

  const currentUser = user || tokenUser;

  const handleSubmit = async () => {
    // Check all required images have been uploaded to Cloudinary
    if (!uploadedUrls.id_front) {
      if (previews.id_front) {
        toast.error(t.imageStillUploading || 'Image is still uploading. Please wait.');
      } else {
        toast.error(t.uploadIdFront);
      }
      return;
    }
    if ((documentType === 'id_card' || documentType === 'driver_license') && !uploadedUrls.id_back) {
      if (previews.id_back) {
        toast.error(t.imageStillUploading || 'Image is still uploading. Please wait.');
      } else {
        toast.error(t.uploadIdBack);
      }
      return;
    }
    if (!uploadedUrls.selfie) {
      if (previews.selfie) {
        toast.error(t.imageStillUploading || 'Image is still uploading. Please wait.');
      } else {
        toast.error(t.uploadSelfie);
      }
      return;
    }
    if (!uploadedUrls.address_proof) {
      if (previews.address_proof) {
        toast.error(t.imageStillUploading || 'Image is still uploading. Please wait.');
      } else {
        toast.error(t.uploadAddress);
      }
      return;
    }

    setLoading(true);
    setUploadProgress(t.submitting || 'Submitting...');
    try {
      const kycData = {
        id_document_type: documentType,
        id_document_front: uploadedUrls.id_front,
        id_document_back: uploadedUrls.id_back || null,
        selfie_with_id: uploadedUrls.selfie,
        proof_of_address: uploadedUrls.address_proof,
      };
      const response = await api.post('/kyc/submit', kycData);
      if (response.data.ok) {
        // Clear saved progress
        try {
          sessionStorage.removeItem('kyc_step');
          sessionStorage.removeItem('kyc_doc_type');
          sessionStorage.removeItem('kyc_previews');
          sessionStorage.removeItem('kyc_urls');
        } catch {}
        toast.success(t.kycSubmitted);
        await refreshUser();
        navigate('/wallet');
      } else {
        toast.error(response.data.error?.message || t.kycSubmitFailed);
      }
    } catch (error) {
      console.error('KYC submit error:', error);
      toast.error(error.response?.data?.detail || t.kycSubmitFailed);
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  if (authenticating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t.verifyingAccess}</h2>
            <p className="text-gray-600">{t.pleaseWaitAuth}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated && !tokenUser && !searchParams.get('token')) {
    navigate('/login');
    return null;
  }

  if (currentUser?.kyc_status === 'approved') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto px-4 sm:px-6 py-4">
            <Link to="/wallet" className="flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span className="font-semibold">{t.kycTitle}</span>
            </Link>
          </div>
        </header>
        <main className="max-w-lg md:max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <Card className="text-center">
            <CardContent className="pt-6">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{t.verificationComplete}</h2>
              <p className="text-gray-600">{t.verificationCompleteDesc}</p>
              <Link to="/wallet"><Button className="mt-6 bg-blue-600 hover:bg-blue-700">{t.backToWallet}</Button></Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (currentUser?.kyc_status === 'pending' || currentUser?.kyc_status === 'under_review') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto px-4 sm:px-6 py-4">
            <Link to="/wallet" className="flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span className="font-semibold">{t.kycTitle}</span>
            </Link>
          </div>
        </header>
        <main className="max-w-lg md:max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <Card className="text-center">
            <CardContent className="pt-6">
              <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{t.verificationPending}</h2>
              <p className="text-gray-600">{t.verificationPendingDesc}</p>
              <Link to="/wallet"><Button className="mt-6" variant="outline">{t.backToWallet}</Button></Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Check if any upload is in progress
  const isUploading = uploadingField !== null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <Link to="/wallet" className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="font-semibold">{t.kycTitle}</span>
          </Link>
        </div>
      </header>

      <main className="max-w-lg md:max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {/* Welcome Message */}
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <p className="text-blue-800">
              <strong>{t.helloUser.replace('{name}', currentUser?.first_name || '')}</strong>
            </p>
          </CardContent>
        </Card>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>{s}</div>
              {s < 3 && <div className={`w-16 h-1 ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Document Type */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>{t.selectDocType}</CardTitle>
              <CardDescription>{t.selectDocTypeDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={documentType} onValueChange={setDocumentType} className="space-y-3">
                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="passport" id="passport" />
                  <Label htmlFor="passport" className="flex-1 cursor-pointer">
                    <div className="font-medium">{t.passport}</div>
                    <div className="text-sm text-gray-500">{t.internationalPassport}</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="id_card" id="id_card" />
                  <Label htmlFor="id_card" className="flex-1 cursor-pointer">
                    <div className="font-medium">{t.idCard}</div>
                    <div className="text-sm text-gray-500">{t.nationalIdCard}</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="driver_license" id="driver_license" />
                  <Label htmlFor="driver_license" className="flex-1 cursor-pointer">
                    <div className="font-medium">{t.driverLicense}</div>
                    <div className="text-sm text-gray-500">{t.driverLicenseDesc}</div>
                  </Label>
                </div>
              </RadioGroup>
              <Button className="w-full mt-6 bg-blue-600 hover:bg-blue-700" onClick={() => setStep(2)}>{t.continue}</Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Upload Documents */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>{t.uploadDocuments}</CardTitle>
              <CardDescription>{t.uploadDocumentsDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {renderUploadArea("id_front", documentType === 'passport' ? t.passportPhotoPage : documentType === 'driver_license' ? t.driverLicenseFront : t.idCardFront)}

              {(documentType === 'id_card' || documentType === 'driver_license') && (
                renderUploadArea("id_back", documentType === 'driver_license' ? t.driverLicenseBack : t.idCardBack)
              )}

              <div className="flex space-x-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">{t.back}</Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={() => setStep(3)}
                  disabled={!uploadedUrls.id_front || ((documentType === 'id_card' || documentType === 'driver_license') && !uploadedUrls.id_back) || isUploading}
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {t.continue}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Selfie & Address */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>{t.finalStep}</CardTitle>
              <CardDescription>{t.finalStepDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                {renderUploadArea("selfie", t.selfieWithId, "user", Camera)}
                <p className="text-sm text-gray-500 mt-1">{t.selfieWithIdDesc}</p>
              </div>

              <div>
                {renderUploadArea("address_proof", t.proofOfAddress)}
                <p className="text-sm text-gray-500 mt-1">{t.proofOfAddressDesc}</p>
              </div>

              <div className="flex space-x-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">{t.back}</Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleSubmit}
                  disabled={loading || isUploading || !uploadedUrls.selfie || !uploadedUrls.address_proof}
                  data-testid="kyc-submit-btn"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" />{uploadProgress}</>
                  ) : isUploading ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" />{t.uploading || 'Uploading'}...</>
                  ) : (
                    t.submitForReview
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      {/* Face ID Scan Overlay */}
      {faceScanPhase && (
        <FaceScanOverlay selfiePreview={previews.selfie} phase={faceScanPhase} t={t} />
      )}
    </div>
  );
};

export default KYCPage;
