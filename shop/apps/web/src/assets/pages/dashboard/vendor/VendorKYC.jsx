// FILE: apps/web/src/pages/dashboard/vendor/VendorKYC.jsx
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Shield, Upload, X, FileText, AlertCircle, CheckCircle, Clock, RefreshCw,
  BadgeCheck, Loader2, ChevronRight, Building, CreditCard, User, Eye,
  HelpCircle, ChevronDown, ChevronUp, Check, AlertTriangle, Info, ExternalLink,
  Image, File, Trash2
} from 'lucide-react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import { useToast } from '../../../components/common/ToastContainer';
import CustomSelect from '../../../components/common/CustomSelect';
import Spinner from '../../../components/common/Spinner';
import { setUser } from '../../../store/slices/authSlice';

// Progress Step Component
const ProgressStep = ({ number, title, status, isLast }) => {
  const getStepStyle = () => {
    if (status === 'completed') return 'bg-green-500 text-white border-green-500';
    if (status === 'current') return 'bg-blue-500 text-white border-blue-500';
    return 'bg-white text-gray-400 border-gray-300';
  };

  const getLineStyle = () => {
    if (status === 'completed') return 'bg-green-500';
    return 'bg-gray-200';
  };

  return (
    <div className="flex items-center">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center font-semibold text-sm ${getStepStyle()}`}>
          {status === 'completed' ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : number}
        </div>
        <span className={`text-[10px] sm:text-xs mt-1 font-medium text-center max-w-[60px] sm:max-w-[80px] ${
          status === 'completed' ? 'text-green-600' : status === 'current' ? 'text-blue-600' : 'text-gray-400'
        }`}>
          {title}
        </span>
      </div>
      {!isLast && (
        <div className={`w-8 sm:w-16 lg:w-24 h-1 mx-1 sm:mx-2 -mt-5 ${getLineStyle()}`} />
      )}
    </div>
  );
};

// Document Card Component
const DocumentCard = ({ type, title, description, documents, onUpload, onDelete, uploading, icon: Icon, required = false }) => {
  const doc = documents?.find(d => d.type === type);
  const hasDoc = !!doc;

  return (
    <div className={`bg-white rounded-lg border-2 p-4 transition-all ${
      hasDoc ? 'border-green-200 bg-green-50' : required ? 'border-orange-200 border-dashed' : 'border-gray-200 border-dashed'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
          hasDoc ? 'bg-green-100' : required ? 'bg-orange-50' : 'bg-gray-100'
        }`}>
          <Icon className={`w-5 h-5 ${hasDoc ? 'text-green-600' : required ? 'text-orange-500' : 'text-gray-400'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="font-medium text-gray-900">{title}</h4>
            {required && !hasDoc && (
              <span className="inline-flex items-center text-xs text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                Required
              </span>
            )}
            {hasDoc && (
              <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                <CheckCircle className="w-3 h-3" /> Uploaded
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-3">{description}</p>

          {hasDoc ? (
            <div className="flex items-center justify-between bg-white rounded-lg border border-green-200 p-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-sm text-gray-700 truncate">{doc.filename}</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                  title="View"
                >
                  <Eye className="w-4 h-4" />
                </a>
                <button
                  onClick={() => onDelete(doc._id)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => onUpload(e, type)}
                className="hidden"
                disabled={uploading}
              />
              <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Upload Document'}
              </div>
            </label>
          )}
        </div>
      </div>
    </div>
  );
};

const VendorKYC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [gstVerifying, setGstVerifying] = useState(false);
  const [gstVerified, setGstVerified] = useState(false);
  const [gstDetails, setGstDetails] = useState(null);
  const [gstError, setGstError] = useState('');
  const [showTips, setShowTips] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: '',
    businessAddress: '',
    taxId: '',
    phoneNumber: '',
  });
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Manual refresh user session
  const refreshUserSession = async () => {
    setIsRefreshing(true);
    try {
      const response = await api.get('/auth/me');
      dispatch(setUser(response.data.data));
      toast.success('Status refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh status');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Fetch KYC data
  const { data: kycData, isLoading, error: kycError } = useQuery({
    queryKey: ['vendor-kyc'],
    queryFn: async () => {
      const response = await api.get('/vendors/kyc');
      return response.data.data;
    },
    onSuccess: (data) => {
      if (data.kyc) {
        setFormData({
          businessName: data.kyc.businessName || '',
          businessType: data.kyc.businessType || '',
          businessAddress: data.kyc.businessAddress || '',
          taxId: data.kyc.taxId || '',
          phoneNumber: data.kyc.phoneNumber || '',
        });
        if (data.kyc.gstVerified) {
          setGstVerified(true);
          setGstDetails(data.kyc.gstDetails || null);
        }
      }
    },
    retry: false,
  });

  // Fetch KYC stats for progress tracking
  const { data: kycStats } = useQuery({
    queryKey: ['vendor-kyc-stats'],
    queryFn: async () => {
      const response = await api.get('/vendors/kyc/stats');
      return response.data.data;
    },
    enabled: !kycError,
    retry: false,
  });

  // Calculate completion progress using backend stats if available
  const completionStatus = useMemo(() => {
    // Use backend stats if available
    if (kycStats?.completion) {
      const { businessInfo, gst, documents, overall } = kycStats.completion;
      return {
        businessInfo: businessInfo.percentage === 100,
        businessInfoPercentage: businessInfo.percentage,
        gst: gst.verified,
        gstPercentage: gst.percentage,
        documents: documents.percentage === 100,
        documentsPercentage: documents.percentage,
        overall: overall >= 90,
        percentage: overall
      };
    }

    // Fallback to local calculation
    const kyc = kycData?.kyc || {};
    const docs = kyc.documents || [];

    const businessInfoComplete = !!(
      formData.businessName &&
      formData.businessType &&
      formData.businessAddress &&
      formData.phoneNumber
    );

    const gstComplete = gstVerified;

    // Required documents: id_proof and address_proof
    const docsComplete = (
      docs.some(d => d.type === 'id_proof') &&
      docs.some(d => d.type === 'address_proof')
    );

    const overallComplete = businessInfoComplete && gstComplete && docsComplete;

    return {
      businessInfo: businessInfoComplete,
      businessInfoPercentage: businessInfoComplete ? 100 : 0,
      gst: gstComplete,
      gstPercentage: gstComplete ? 100 : 0,
      documents: docsComplete,
      documentsPercentage: docsComplete ? 100 : 0,
      overall: overallComplete,
      percentage: Math.round(
        ((businessInfoComplete ? 30 : 0) + (gstComplete ? 30 : 0) + (docsComplete ? 40 : 0))
      )
    };
  }, [kycData, kycStats, formData, gstVerified]);

  // Mutations
  const updateKYCMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put('/vendors/kyc', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-kyc'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-kyc-stats'] });
      toast.success('KYC information updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update KYC information');
    },
  });

  const uploadDocMutation = useMutation({
    mutationFn: async ({ type, url, filename }) => {
      const response = await api.post('/vendors/kyc/documents', { type, url, filename });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-kyc'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-kyc-stats'] });
      toast.success('Document uploaded successfully');
      setUploadingDoc(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to upload document');
      setUploadingDoc(false);
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (documentId) => {
      const response = await api.delete(`/vendors/kyc/documents/${documentId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-kyc'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-kyc-stats'] });
      toast.success('Document deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete document');
    },
  });

  const handleVerifyGST = async () => {
    const gstNumber = formData.taxId.trim();
    if (!gstNumber) {
      setGstError('Please enter a GST number first');
      return;
    }
    setGstVerifying(true);
    setGstError('');
    try {
      const response = await api.post('/gst/verify', { gstNumber });
      const { data, active } = response.data;
      setGstVerified(true);
      setGstDetails(data);
      if (!active) {
        toast.info('GST is verified but currently inactive');
      } else {
        toast.success('GST verified successfully');
      }
      setFormData(prev => ({
        ...prev,
        businessName: data.tradeName || data.legalName || prev.businessName,
        businessAddress: data.address || prev.businessAddress,
      }));
    } catch (error) {
      const msg = error.response?.data?.error?.message || 'GST verification failed';
      setGstError(msg);
      setGstVerified(false);
      setGstDetails(null);
    } finally {
      setGstVerifying(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!gstVerified) {
      toast.error('Please verify your GST number before submitting');
      return;
    }
    updateKYCMutation.mutate({ ...formData, gstVerified, gstDetails });
  };

  const handleFileUpload = async (e, docType) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, and PDF files are allowed');
      return;
    }

    setUploadingDoc(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'kyc-documents');

      const uploadResponse = await api.post('/upload/single', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await uploadDocMutation.mutateAsync({
        type: docType,
        url: uploadResponse.data.data.url,
        filename: file.name,
      });
    } catch (error) {
      toast.error('Failed to upload file');
      setUploadingDoc(false);
    }
  };

  const getProgressSteps = () => {
    // Use backend-provided steps if available
    if (kycStats?.steps) {
      return kycStats.steps;
    }

    // Fallback to local calculation
    const status = kycData?.kyc?.status || 'pending';
    if (status === 'approved') {
      return [
        { number: 1, title: 'Business Info', status: 'completed' },
        { number: 2, title: 'GST Verify', status: 'completed' },
        { number: 3, title: 'Documents', status: 'completed' },
        { number: 4, title: 'Approved', status: 'completed' },
      ];
    }

    return [
      { number: 1, title: 'Business Info', status: completionStatus.businessInfo ? 'completed' : 'current' },
      { number: 2, title: 'GST Verify', status: completionStatus.gst ? 'completed' : completionStatus.businessInfo ? 'current' : 'pending' },
      { number: 3, title: 'Documents', status: completionStatus.documents ? 'completed' : completionStatus.gst ? 'current' : 'pending' },
      { number: 4, title: 'Review', status: completionStatus.overall ? 'current' : 'pending' },
    ];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (kycError?.response?.data?.error?.code === 'NOT_FOUND') {
    return (
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-8 text-center">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-yellow-800 mb-2">Vendor Profile Not Found</h2>
          <p className="text-yellow-700 mb-6">
            Your vendor profile has not been created yet. Please complete the vendor onboarding process first.
          </p>
          <button
            onClick={() => navigate('/dashboard/become-vendor')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Complete Vendor Onboarding
          </button>
        </div>
      </div>
    );
  }

  const kyc = kycData?.kyc || {};
  const status = kyc.status || 'pending';

  return (
    <div className="px-2 sm:px-0 pb-8 space-y-4 sm:space-y-6">
      {/* Header with Status */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-6 h-6 text-blue-600" />
              KYC Verification
            </h1>
            <p className="text-sm text-gray-600 mt-1">Complete your verification to start selling</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={refreshUserSession}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Status</span>
            </button>
            {/* Status Badge */}
            <div className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border ${
              status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
              status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
              'bg-yellow-100 text-yellow-800 border-yellow-200'
            }`}>
              {status === 'approved' ? <CheckCircle className="w-4 h-4" /> :
               status === 'rejected' ? <AlertCircle className="w-4 h-4" /> :
               <Clock className="w-4 h-4" />}
              {status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Pending'}
            </div>
          </div>
        </div>

        {/* Progress Stepper */}
        <div className="flex justify-center overflow-x-auto py-2">
          {getProgressSteps().map((step, index) => (
            <ProgressStep
              key={step.number}
              number={step.number}
              title={step.title}
              status={step.status}
              isLast={index === getProgressSteps().length - 1}
            />
          ))}
        </div>

        {/* Completion Progress Bar */}
        {status !== 'approved' && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Profile Completion</span>
              <span className={`text-sm font-bold ${completionStatus.percentage === 100 ? 'text-green-600' : 'text-blue-600'}`}>
                {completionStatus.percentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${completionStatus.percentage === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                style={{ width: `${completionStatus.percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Approved Success Banner */}
      {status === 'approved' && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-4 sm:p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <BadgeCheck className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold">Congratulations! Your account is verified</h2>
              <p className="text-green-100 text-sm mt-0.5">You can now start selling on our platform</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            <Link
              to="/vendor-dashboard/products"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-green-700 rounded-lg font-medium text-sm hover:bg-green-50"
            >
              Add Products <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              to="/vendor-dashboard/settings"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg font-medium text-sm hover:bg-white/30"
            >
              Store Settings <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Rejection Alert */}
      {status === 'rejected' && kyc.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Application Rejected</h3>
            <p className="text-red-700 mt-1">{kyc.rejectionReason}</p>
            <p className="text-red-600 text-sm mt-2">Please update your information and resubmit for review.</p>
          </div>
        </div>
      )}

      {/* Business Information Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              completionStatus.businessInfo ? 'bg-green-100' : 'bg-blue-100'
            }`}>
              <Building className={`w-5 h-5 ${completionStatus.businessInfo ? 'text-green-600' : 'text-blue-600'}`} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Business Information</h2>
              <p className="text-xs text-gray-500">Your business details for verification</p>
            </div>
          </div>
          {completionStatus.businessInfo && (
            <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full">
              <Check className="w-3 h-3" /> Complete
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Business Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                required
                placeholder="Enter your business name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Business Type <span className="text-red-500">*</span>
              </label>
              <CustomSelect
                value={formData.businessType}
                onChange={(value) => setFormData({ ...formData, businessType: value })}
                options={[
                  { value: '', label: 'Select type' },
                  { value: 'sole_proprietorship', label: 'Individual/Sole Proprietor' },
                  { value: 'partnership', label: 'Partnership' },
                  { value: 'private_limited', label: 'Private Limited' },
                  { value: 'public_limited', label: 'Public Limited' },
                  { value: 'llp', label: 'LLP (Limited Liability Partnership)' },
                  { value: 'other', label: 'Other' }
                ]}
                placeholder="Select type"
                className="w-full"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Business Address <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.businessAddress}
                onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                rows={3}
                required
                placeholder="Enter your complete business address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                required
                placeholder="Enter phone number"
              />
            </div>
          </div>

          <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={updateKYCMutation.isLoading || !gstVerified}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
            >
              {updateKYCMutation.isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              ) : (
                'Save Information'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* GST Verification Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              gstVerified ? 'bg-green-100' : 'bg-yellow-100'
            }`}>
              <CreditCard className={`w-5 h-5 ${gstVerified ? 'text-green-600' : 'text-yellow-600'}`} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">GST Verification</h2>
              <p className="text-xs text-gray-500">Mandatory for tax compliance</p>
            </div>
          </div>
          {gstVerified && (
            <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full">
              <BadgeCheck className="w-3 h-3" /> Verified
            </span>
          )}
        </div>

        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={formData.taxId}
                onChange={(e) => {
                  setFormData({ ...formData, taxId: e.target.value.toUpperCase() });
                  if (gstVerified) {
                    setGstVerified(false);
                    setGstDetails(null);
                  }
                }}
                placeholder="e.g. 33AABCU9603R1ZM"
                className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-mono ${
                  gstVerified ? 'border-green-400 bg-green-50' : 'border-gray-300'
                }`}
                maxLength={15}
              />
              {gstError && <p className="text-red-600 text-xs mt-1.5">{gstError}</p>}
              {!gstVerified && !gstError && (
                <p className="text-amber-600 text-xs mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  GST verification is mandatory for KYC approval
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleVerifyGST}
              disabled={gstVerifying || gstVerified}
              className={`px-5 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap inline-flex items-center justify-center gap-2 ${
                gstVerified
                  ? 'bg-green-100 text-green-700 border border-green-300 cursor-default'
                  : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
              }`}
            >
              {gstVerifying ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
              ) : gstVerified ? (
                <><BadgeCheck className="w-4 h-4" /> Verified</>
              ) : (
                'Verify GST'
              )}
            </button>
          </div>

          {/* GST Details */}
          {gstVerified && gstDetails && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-green-800 mb-3 flex items-center gap-2">
                <BadgeCheck className="w-4 h-4" /> Verified GST Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {gstDetails.tradeName && (
                  <div><span className="text-gray-600">Trade Name:</span> <span className="font-medium">{gstDetails.tradeName}</span></div>
                )}
                {gstDetails.legalName && (
                  <div><span className="text-gray-600">Legal Name:</span> <span className="font-medium">{gstDetails.legalName}</span></div>
                )}
                {gstDetails.gstNumber && (
                  <div><span className="text-gray-600">GST Number:</span> <span className="font-mono font-medium">{gstDetails.gstNumber}</span></div>
                )}
                {gstDetails.status && (
                  <div><span className="text-gray-600">Status:</span> <span className={`font-medium ${gstDetails.status === 'Active' ? 'text-green-700' : 'text-amber-700'}`}>{gstDetails.status}</span></div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Documents Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              completionStatus.documents ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <FileText className={`w-5 h-5 ${completionStatus.documents ? 'text-green-600' : 'text-gray-500'}`} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Required Documents</h2>
              <p className="text-xs text-gray-500">Upload verification documents</p>
            </div>
          </div>
          {completionStatus.documents && (
            <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full">
              <Check className="w-3 h-3" /> All Uploaded
            </span>
          )}
        </div>

        <div className="p-4 sm:p-6">
          {/* Required Documents */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <span className="text-red-500">*</span> Required Documents
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DocumentCard
                type="id_proof"
                title="Owner ID Proof"
                description="Government-issued ID (Aadhaar/PAN/Voter ID)"
                documents={kyc.documents}
                onUpload={handleFileUpload}
                onDelete={(id) => deleteDocMutation.mutate(id)}
                uploading={uploadingDoc}
                icon={User}
                required
              />
              <DocumentCard
                type="address_proof"
                title="Address Proof"
                description="Utility bill, bank statement, or rent agreement"
                documents={kyc.documents}
                onUpload={handleFileUpload}
                onDelete={(id) => deleteDocMutation.mutate(id)}
                uploading={uploadingDoc}
                icon={FileText}
                required
              />
            </div>
          </div>

          {/* Optional Documents */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-3">Optional Documents</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DocumentCard
                type="business_license"
                title="Business License"
                description="Business registration or license copy"
                documents={kyc.documents}
                onUpload={handleFileUpload}
                onDelete={(id) => deleteDocMutation.mutate(id)}
                uploading={uploadingDoc}
                icon={Building}
              />
              <DocumentCard
                type="tax_certificate"
                title="Tax Certificate"
                description="GST registration certificate"
                documents={kyc.documents}
                onUpload={handleFileUpload}
                onDelete={(id) => deleteDocMutation.mutate(id)}
                uploading={uploadingDoc}
                icon={CreditCard}
              />
            </div>
          </div>
        </div>

        {uploadingDoc && (
          <div className="px-6 pb-4 text-center">
            <div className="inline-flex items-center gap-2 text-blue-600 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading document...
            </div>
          </div>
        )}
      </div>

      {/* Tips & Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowTips(!showTips)}
          className="w-full p-4 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <HelpCircle className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-900">Verification Tips & FAQs</span>
          </div>
          {showTips ? <ChevronUp className="w-5 h-5 text-blue-600" /> : <ChevronDown className="w-5 h-5 text-blue-600" />}
        </button>

        {showTips && (
          <div className="px-4 pb-4 space-y-3">
            <div className="bg-white rounded-lg p-3 border border-blue-200">
              <h4 className="font-medium text-gray-900 text-sm mb-1">What documents are accepted?</h4>
              <p className="text-xs text-gray-600">Business License, GST Certificate, PAN Card, Aadhaar Card, or Passport. Files must be in JPG, PNG, or PDF format under 5MB.</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-200">
              <h4 className="font-medium text-gray-900 text-sm mb-1">How long does verification take?</h4>
              <p className="text-xs text-gray-600">Our team reviews applications within 2-3 business days. You'll receive an email notification once approved.</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-200">
              <h4 className="font-medium text-gray-900 text-sm mb-1">Why is GST verification mandatory?</h4>
              <p className="text-xs text-gray-600">GST verification ensures tax compliance and helps us verify your business legitimacy for secure marketplace transactions.</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-200">
              <h4 className="font-medium text-gray-900 text-sm mb-1">What if my application is rejected?</h4>
              <p className="text-xs text-gray-600">You can update your information and resubmit. The rejection reason will be displayed, so you can correct the specific issue.</p>
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-gray-600">
          <p className="font-medium text-gray-900 mb-1">Need help?</p>
          <p>Contact our vendor support team at <a href="mailto:vendor-support@vtech.com" className="text-blue-600 hover:underline">vendor-support@vtech.com</a> or visit our <Link to="/vendor-dashboard/support" className="text-blue-600 hover:underline">Support Center</Link>.</p>
        </div>
      </div>
    </div>
  );
};

export default VendorKYC;
