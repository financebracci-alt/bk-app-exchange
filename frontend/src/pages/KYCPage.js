import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLang } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { ArrowLeft, Upload, Camera, CheckCircle, Clock, Loader2, Video, Square, ArrowLeftCircle, ArrowRightCircle, Eye } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Compress image to a Blob (binary) - Android-safe with memory limits
const compressImageToBlob = (file, maxWidth = 1024, quality = 0.6) => new Promise((resolve, reject) => {
  // For very large files (>10MB), reduce quality further
  const fileSize = file.size || 0;
  if (fileSize > 10 * 1024 * 1024) { maxWidth = 800; quality = 0.5; }
  if (fileSize > 20 * 1024 * 1024) { maxWidth = 640; quality = 0.4; }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        // Enforce max dimensions for Android memory safety
        const MAX_DIM = 4096;
        if (w > MAX_DIM) { h = Math.round(h * MAX_DIM / w); w = MAX_DIM; }
        if (h > MAX_DIM) { w = Math.round(w * MAX_DIM / h); h = MAX_DIM; }
        if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas context unavailable')); return; }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            canvas.width = 0; canvas.height = 0;
            if (blob) { resolve(blob); }
            else {
              // Fallback: return original file as blob
              resolve(file);
            }
          },
          'image/jpeg', quality
        );
      } catch (err) {
        // Fallback: return original file if compression fails
        console.warn('Image compression failed, using original:', err);
        resolve(file);
      }
    };
    img.onerror = () => {
      // Fallback: return original file if image can't load
      console.warn('Image load failed, using original file');
      resolve(file);
    };
    img.src = e.target.result;
  };
  reader.onerror = () => {
    // Fallback: return original file
    console.warn('FileReader failed, using original file');
    resolve(file);
  };
  reader.readAsDataURL(file);
});

/* ── Video Selfie Recorder ── */
const VIDEO_STEPS = [
  { key: 'center', duration: 2000 },
  { key: 'left', duration: 2500 },
  { key: 'right', duration: 2500 },
  { key: 'center_final', duration: 2000 },
];
const TOTAL_DURATION = VIDEO_STEPS.reduce((s, v) => s + v.duration, 0); // 9 seconds

const VideoSelfieRecorder = ({ onComplete, onCancel, t }) => {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const [phase, setPhase] = useState('ready'); // ready | recording | uploading
  const [currentStep, setCurrentStep] = useState(0);
  const [timeLeft, setTimeLeft] = useState(Math.ceil(TOTAL_DURATION / 1000));

  // Start camera on mount
  useEffect(() => {
    let mounted = true;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })
      .then(stream => {
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; }
      })
      .catch(() => {
        if (mounted) toast.error(t.cameraUnavailable || 'Camera not available');
      });
    return () => { mounted = false; if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, [t]);

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm') ? 'video/webm'
      : 'video/mp4';

    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      // Stop camera
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      onComplete(blob);
    };
    mediaRecorderRef.current = recorder;
    recorder.start(100);
    setPhase('recording');
    setCurrentStep(0);

    // Progress through steps
    let elapsed = 0;
    VIDEO_STEPS.forEach((step, i) => {
      setTimeout(() => setCurrentStep(i), elapsed);
      elapsed += step.duration;
    });

    // Countdown timer
    let remaining = Math.ceil(TOTAL_DURATION / 1000);
    setTimeLeft(remaining);
    const timer = setInterval(() => {
      remaining--;
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(timer);
    }, 1000);

    // Auto-stop after total duration
    setTimeout(() => {
      clearInterval(timer);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        setPhase('uploading');
      }
    }, TOTAL_DURATION);
  };

  const handleCancel = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    onCancel();
  };

  const stepInstructions = {
    center: { icon: <Eye className="w-8 h-8" />, text: t.videoLookStraight || 'Look straight at the camera' },
    left: { icon: <ArrowLeftCircle className="w-8 h-8" />, text: t.videoTurnLeft || 'Slowly turn your head to the left' },
    right: { icon: <ArrowRightCircle className="w-8 h-8" />, text: t.videoTurnRight || 'Slowly turn your head to the right' },
    center_final: { icon: <Eye className="w-8 h-8" />, text: t.videoLookStraight || 'Look straight at the camera' },
  };

  const step = VIDEO_STEPS[currentStep] || VIDEO_STEPS[0];
  const instruction = stepInstructions[step.key];

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col" data-testid="video-selfie-recorder">
      {/* Camera feed */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />

        {/* Face guide oval */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-56 h-72 sm:w-64 sm:h-80 rounded-full border-2 border-white/40" />
        </div>

        {/* Recording indicator */}
        {phase === 'recording' && (
          <div className="absolute top-4 left-4 flex items-center space-x-2 bg-black/60 px-3 py-1.5 rounded-full">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white text-sm font-medium">REC {timeLeft}s</span>
          </div>
        )}

        {/* Step instruction overlay */}
        {phase === 'recording' && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-16">
            <div className="flex flex-col items-center text-center">
              <div className="text-white mb-2">{instruction.icon}</div>
              <p className="text-white text-lg font-semibold">{instruction.text}</p>
            </div>
          </div>
        )}

        {/* Uploading overlay */}
        {phase === 'uploading' && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 text-white animate-spin mb-4" />
            <p className="text-white text-lg">{t.uploading || 'Uploading'}...</p>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="bg-black p-4 pb-8 flex items-center justify-center gap-6">
        {phase === 'ready' && (
          <>
            <Button variant="ghost" onClick={handleCancel} className="text-white hover:bg-white/10" data-testid="video-cancel-btn">
              {t.cancel || 'Cancel'}
            </Button>
            <button
              onClick={startRecording}
              className="w-16 h-16 rounded-full bg-red-500 border-4 border-white flex items-center justify-center hover:bg-red-600 transition-colors"
              data-testid="video-start-btn"
            >
              <Video className="w-7 h-7 text-white" />
            </button>
            <div className="w-20" />
          </>
        )}
        {phase === 'recording' && (
          <div className="flex flex-col items-center">
            {/* Progress dots */}
            <div className="flex space-x-2 mb-3">
              {VIDEO_STEPS.map((_, i) => (
                <div key={i} className={`w-2.5 h-2.5 rounded-full transition-colors ${i <= currentStep ? 'bg-red-500' : 'bg-white/30'}`} />
              ))}
            </div>
            <p className="text-white/60 text-xs">{t.videoAutoStop || 'Recording stops automatically'}</p>
          </div>
        )}
      </div>
    </div>,
    document.body
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
  const [uploadingField, setUploadingField] = useState(null);

  // Show video recorder
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);

  // Previews for display (use uploaded URLs as fallback when no object URL)
  const [previews, setPreviews] = useState({ id_front: null, id_back: null, selfie: null, address_proof: null });

  // Cloudinary URLs
  const [uploadedUrls, setUploadedUrls] = useState(() => {
    try {
      const saved = sessionStorage.getItem('kyc_urls');
      return saved ? JSON.parse(saved) : { id_front: null, id_back: null, selfie: null, address_proof: null, selfie_video: null };
    } catch { return { id_front: null, id_back: null, selfie: null, address_proof: null, selfie_video: null }; }
  });

  // Persist state (only save URLs, not object URL previews)
  useEffect(() => {
    try {
      sessionStorage.setItem('kyc_step', step.toString());
      sessionStorage.setItem('kyc_doc_type', documentType);
      sessionStorage.setItem('kyc_urls', JSON.stringify(uploadedUrls));
    } catch {}
  }, [step, documentType, uploadedUrls]);

  const fileInputRefs = { id_front: useRef(), id_back: useRef(), selfie: useRef(), address_proof: useRef() };
  const cameraInputRefs = { id_front: useRef(), id_back: useRef(), selfie: useRef(), address_proof: useRef() };

  // Upload a single file to Cloudinary via FormData
  const uploadFileToCloudinary = useCallback(async (file, field) => {
    setUploadingField(field);
    try {
      const blob = await compressImageToBlob(file);
      const formData = new FormData();
      formData.append('file', blob, `${field}.jpg`);
      formData.append('field', field);

      let lastError = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await api.post('/kyc/upload-file', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 60000,
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

  // Upload video blob to Cloudinary
  const uploadVideoToCloudinary = useCallback(async (blob) => {
    setUploadingField('selfie_video');
    try {
      const formData = new FormData();
      formData.append('file', blob, 'selfie_video.webm');
      formData.append('field', 'selfie_video');

      let lastError = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await api.post('/kyc/upload-file', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 120000, // 2 min for video
          });
          if (res.data.ok) {
            setUploadedUrls(prev => ({ ...prev, selfie_video: res.data.url }));
            toast.success(t.videoUploaded || 'Video uploaded successfully');
            return res.data.url;
          }
        } catch (err) {
          lastError = err;
          if (attempt < 2) await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        }
      }
      throw lastError || new Error('Upload failed');
    } catch (err) {
      console.error('Video upload failed:', err);
      toast.error(`${t.uploadFailed || 'Upload failed'} — ${t.tryAgain || 'try again'}`);
      return null;
    } finally {
      setUploadingField(null);
    }
  }, [api, t]);

  // Handle file selection — set preview + upload
  const handleFileChange = (field) => async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && !file.name.match(/\.(heic|heif)$/i)) {
      toast.error(t.fileTypeError);
      return;
    }
    // Use object URL for preview (much faster & less memory than data URL)
    const objectUrl = URL.createObjectURL(file);
    setPreviews(prev => ({ ...prev, [field]: objectUrl }));
    try {
      await uploadFileToCloudinary(file, field);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(t.uploadFailed || 'Upload failed');
    }
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  // Handle video recording complete
  const handleVideoComplete = async (blob) => {
    setShowVideoRecorder(false);
    await uploadVideoToCloudinary(blob);
  };

  const renderUploadArea = (field, label, captureMode = "environment", Icon = Upload) => {
    const previewSrc = previews[field] || uploadedUrls[field];
    return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <input type="file" ref={fileInputRefs[field]} onChange={handleFileChange(field)} accept="image/*,.heic,.heif" className="hidden" />
      <input type="file" ref={cameraInputRefs[field]} onChange={handleFileChange(field)} accept="image/*" capture={captureMode} className="hidden" />
      {previewSrc ? (
        <div className="relative">
          <img src={previewSrc} alt={field} className="w-full h-48 object-cover rounded-lg" onError={(e) => { e.target.style.display = 'none'; }} />
          {uploadingField === field && (
            <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
              <div className="flex items-center space-x-2 bg-white/90 px-3 py-2 rounded-full">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-sm font-medium text-gray-800">{t.uploading || 'Uploading'}...</span>
              </div>
            </div>
          )}
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
  );};

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
    if (!uploadedUrls.id_front) { toast.error(previews.id_front ? (t.imageStillUploading || 'Image still uploading') : t.uploadIdFront); return; }
    if ((documentType === 'id_card' || documentType === 'driver_license') && !uploadedUrls.id_back) { toast.error(previews.id_back ? (t.imageStillUploading || 'Image still uploading') : t.uploadIdBack); return; }
    if (!uploadedUrls.selfie_video) { toast.error(t.videoRequired || 'Please record a video selfie'); return; }
    if (!uploadedUrls.address_proof) { toast.error(previews.address_proof ? (t.imageStillUploading || 'Image still uploading') : t.uploadAddress); return; }

    setLoading(true);
    setUploadProgress(t.submitting || 'Submitting...');
    try {
      const kycData = {
        id_document_type: documentType,
        id_document_front: uploadedUrls.id_front,
        id_document_back: uploadedUrls.id_back || null,
        selfie_with_id: uploadedUrls.selfie_video,
        selfie_video: uploadedUrls.selfie_video,
        proof_of_address: uploadedUrls.address_proof,
      };
      const response = await api.post('/kyc/submit', kycData);
      if (response.data.ok) {
        try { sessionStorage.removeItem('kyc_step'); sessionStorage.removeItem('kyc_doc_type'); sessionStorage.removeItem('kyc_urls'); } catch {}
        toast.success(t.kycSubmitted);
        await refreshUser();
        navigate('/wallet');
      } else {
        toast.error(response.data.error?.message || t.kycSubmitFailed);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || t.kycSubmitFailed);
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  if (authenticating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4"><CardContent className="pt-6 text-center">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t.verifyingAccess}</h2>
          <p className="text-gray-600">{t.pleaseWaitAuth}</p>
        </CardContent></Card>
      </div>
    );
  }

  if (!isAuthenticated && !tokenUser && !searchParams.get('token')) { navigate('/login'); return null; }

  if (currentUser?.kyc_status === 'approved') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200"><div className="max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <Link to="/wallet" className="flex items-center text-gray-600 hover:text-gray-900"><ArrowLeft className="w-5 h-5 mr-2" /><span className="font-semibold">{t.kycTitle}</span></Link>
        </div></header>
        <main className="max-w-lg md:max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <Card className="text-center"><CardContent className="pt-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t.verificationComplete}</h2>
            <p className="text-gray-600">{t.verificationCompleteDesc}</p>
            <Link to="/wallet"><Button className="mt-6 bg-blue-600 hover:bg-blue-700">{t.backToWallet}</Button></Link>
          </CardContent></Card>
        </main>
      </div>
    );
  }

  if (currentUser?.kyc_status === 'pending' || currentUser?.kyc_status === 'under_review') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200"><div className="max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <Link to="/wallet" className="flex items-center text-gray-600 hover:text-gray-900"><ArrowLeft className="w-5 h-5 mr-2" /><span className="font-semibold">{t.kycTitle}</span></Link>
        </div></header>
        <main className="max-w-lg md:max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <Card className="text-center"><CardContent className="pt-6">
            <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t.verificationPending}</h2>
            <p className="text-gray-600">{t.verificationPendingDesc}</p>
            <Link to="/wallet"><Button className="mt-6" variant="outline">{t.backToWallet}</Button></Link>
          </CardContent></Card>
        </main>
      </div>
    );
  }

  const isUploading = uploadingField !== null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200"><div className="max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto px-4 sm:px-6 py-4">
        <Link to="/wallet" className="flex items-center text-gray-600 hover:text-gray-900"><ArrowLeft className="w-5 h-5 mr-2" /><span className="font-semibold">{t.kycTitle}</span></Link>
      </div></header>

      <main className="max-w-lg md:max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <Card className="mb-6 bg-blue-50 border-blue-200"><CardContent className="pt-4">
          <p className="text-blue-800"><strong>{t.helloUser.replace('{name}', currentUser?.first_name || '')}</strong></p>
        </CardContent></Card>

        {/* Progress */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>{s}</div>
              {s < 3 && <div className={`w-16 h-1 ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <Card><CardHeader><CardTitle>{t.selectDocType}</CardTitle><CardDescription>{t.selectDocTypeDesc}</CardDescription></CardHeader>
            <CardContent>
              <RadioGroup value={documentType} onValueChange={setDocumentType} className="space-y-3">
                {[['passport', t.passport, t.internationalPassport], ['id_card', t.idCard, t.nationalIdCard], ['driver_license', t.driverLicense, t.driverLicenseDesc]].map(([val, label, desc]) => (
                  <div key={val} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value={val} id={val} />
                    <Label htmlFor={val} className="flex-1 cursor-pointer"><div className="font-medium">{label}</div><div className="text-sm text-gray-500">{desc}</div></Label>
                  </div>
                ))}
              </RadioGroup>
              <Button className="w-full mt-6 bg-blue-600 hover:bg-blue-700" onClick={() => setStep(2)}>{t.continue}</Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <Card><CardHeader><CardTitle>{t.uploadDocuments}</CardTitle><CardDescription>{t.uploadDocumentsDesc}</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              {renderUploadArea("id_front", documentType === 'passport' ? t.passportPhotoPage : documentType === 'driver_license' ? t.driverLicenseFront : t.idCardFront)}
              {(documentType === 'id_card' || documentType === 'driver_license') && renderUploadArea("id_back", documentType === 'driver_license' ? t.driverLicenseBack : t.idCardBack)}
              <div className="flex space-x-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">{t.back}</Button>
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={() => setStep(3)}
                  disabled={!uploadedUrls.id_front || ((documentType === 'id_card' || documentType === 'driver_license') && !uploadedUrls.id_back) || isUploading}>
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}{t.continue}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Selfie + Video + Address */}
        {step === 3 && (
          <Card><CardHeader><CardTitle>{t.finalStep}</CardTitle><CardDescription>{t.finalStepDesc}</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              {/* Video selfie */}
              <div>
                <Label className="mb-2 block">{t.videoSelfieLabel || 'Video Selfie (Liveness Check)'}</Label>
                {uploadedUrls.selfie_video ? (
                  <div className="relative border rounded-lg overflow-hidden bg-gray-900">
                    <div className="flex items-center justify-center p-6 gap-3">
                      <CheckCircle className="w-6 h-6 text-green-500" />
                      <span className="text-green-500 font-medium">{t.videoRecorded || 'Video recorded successfully'}</span>
                    </div>
                    <Button variant="outline" size="sm" className="absolute top-2 right-2 bg-white/90" onClick={() => { setUploadedUrls(prev => ({ ...prev, selfie_video: null })); }}>
                      {t.retake || 'Retake'}
                    </Button>
                  </div>
                ) : (
                  <div className="w-full border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-3 bg-gray-50/50 p-6">
                    {uploadingField === 'selfie_video' ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                        <span className="text-sm text-gray-600">{t.uploadingVideo || 'Uploading video'}...</span>
                      </div>
                    ) : (
                      <>
                        <Video className="w-8 h-8 text-gray-400" />
                        <p className="text-sm text-gray-500 text-center">{t.videoSelfieDesc || 'Record a short video turning your head left and right'}</p>
                        <Button onClick={() => setShowVideoRecorder(true)} className="bg-blue-600 hover:bg-blue-700" data-testid="start-video-btn">
                          <Video className="w-4 h-4 mr-2" />{t.startVideo || 'Start Video'}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Proof of address */}
              <div>
                {renderUploadArea("address_proof", t.proofOfAddress)}
                <p className="text-sm text-gray-500 mt-1">{t.proofOfAddressDesc}</p>
              </div>

              <div className="flex space-x-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">{t.back}</Button>
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleSubmit}
                  disabled={loading || isUploading || !uploadedUrls.selfie_video || !uploadedUrls.address_proof}
                  data-testid="kyc-submit-btn">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />{uploadProgress}</> : t.submitForReview}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Video recorder overlay — rendered via Portal on document.body */}
      {showVideoRecorder && (
        <VideoSelfieRecorder
          onComplete={handleVideoComplete}
          onCancel={() => setShowVideoRecorder(false)}
          t={t}
        />
      )}
    </div>
  );
};

export default KYCPage;
