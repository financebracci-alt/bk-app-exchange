import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLang } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { ArrowLeft, Upload, Camera, CheckCircle, Clock, Loader2 } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const KYCPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, api, refreshUser, isAuthenticated } = useAuth();
  const { t } = useLang();
  const [loading, setLoading] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [step, setStep] = useState(1);
  const [documentType, setDocumentType] = useState('passport');
  const [tokenUser, setTokenUser] = useState(null);
  const [files, setFiles] = useState({ id_front: null, id_back: null, selfie: null, address_proof: null });
  const [previews, setPreviews] = useState({ id_front: null, id_back: null, selfie: null, address_proof: null });

  const fileInputRefs = {
    id_front: useRef(), id_back: useRef(), selfie: useRef(), address_proof: useRef(),
  };
  const cameraInputRefs = {
    id_front: useRef(), id_back: useRef(), selfie: useRef(), address_proof: useRef(),
  };

  const renderUploadArea = (field, label, captureMode = "environment", Icon = Upload) => (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <input type="file" ref={fileInputRefs[field]} onChange={handleFileChange(field)} accept="image/*,.heic,.heif" className="hidden" />
      <input type="file" ref={cameraInputRefs[field]} onChange={handleFileChange(field)} accept="image/*" capture={captureMode} className="hidden" />
      {previews[field] ? (
        <div className="relative">
          <img src={previews[field]} alt={field} className="w-full h-48 object-cover rounded-lg" />
          <div className="absolute bottom-2 right-2 flex space-x-2">
            <Button variant="outline" size="sm" className="bg-white/90" onClick={() => cameraInputRefs[field].current.click()}>
              <Camera className="w-3.5 h-3.5 mr-1" />{t.takePhoto}
            </Button>
            <Button variant="outline" size="sm" className="bg-white/90" onClick={() => fileInputRefs[field].current.click()}>
              <Upload className="w-3.5 h-3.5 mr-1" />{t.change}
            </Button>
          </div>
        </div>
      ) : (
        <div className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-3 bg-gray-50/50">
          <Icon className="w-8 h-8 text-gray-400" />
          <div className="flex space-x-3">
            <Button variant="outline" size="sm" onClick={() => cameraInputRefs[field].current.click()} data-testid={`${field}-camera-btn`}>
              <Camera className="w-4 h-4 mr-1.5" />{t.takePhoto}
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRefs[field].current.click()} data-testid={`${field}-gallery-btn`}>
              <Upload className="w-4 h-4 mr-1.5" />{t.fromGallery}
            </Button>
          </div>
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

  const handleFileChange = (field) => (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/') && !file.name.match(/\.(heic|heif)$/i)) { toast.error(t.fileTypeError); return; }
      setFiles(prev => ({ ...prev, [field]: file }));
      const reader = new FileReader();
      reader.onloadend = () => { setPreviews(prev => ({ ...prev, [field]: reader.result })); };
      reader.readAsDataURL(file);
    }
  };

  const compressImage = (file, maxWidth = 1920, quality = 0.8) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

  const handleSubmit = async () => {
    if (!files.id_front) { toast.error(t.uploadIdFront); return; }
    if ((documentType === 'id_card' || documentType === 'driver_license') && !files.id_back) { toast.error(t.uploadIdBack); return; }
    if (!files.selfie) { toast.error(t.uploadSelfie); return; }
    if (!files.address_proof) { toast.error(t.uploadAddress); return; }
    setLoading(true);
    try {
      const kycData = {
        id_document_type: documentType,
        id_document_front: await compressImage(files.id_front),
        id_document_back: (documentType === 'id_card' || documentType === 'driver_license') ? await compressImage(files.id_back) : null,
        selfie_with_id: await compressImage(files.selfie),
        proof_of_address: await compressImage(files.address_proof),
      };
      const response = await api.post('/kyc/submit', kycData);
      if (response.data.ok) {
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
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={() => setStep(3)} disabled={!files.id_front || ((documentType === 'id_card' || documentType === 'driver_license') && !files.id_back)}>{t.continue}</Button>
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
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleSubmit} disabled={loading || !files.selfie || !files.address_proof}>
                  {loading ? t.submitting : t.submitForReview}
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
