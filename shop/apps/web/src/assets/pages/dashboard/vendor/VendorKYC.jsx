import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Upload, X, FileText, AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { useDispatch } from 'react-redux';
import api from '../../../utils/api';
import { useToast } from '../../../components/common/ToastContainer';
import CustomSelect from '../../../components/common/CustomSelect';
import { setUser } from '../../../store/slices/authSlice';

const VendorKYC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Manual refresh user session to get latest KYC status
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
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: '',
    businessAddress: '',
    taxId: '',
    phoneNumber: '',
  });
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Fetch KYC data
  const { data: kycData, isLoading } = useQuery({
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
      }
    },
  });

  // Update KYC mutation
  const updateKYCMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put('/vendors/kyc', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vendor-kyc']);
      toast.success('KYC information updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update KYC information');
    },
  });

  // Upload document mutation
  const uploadDocMutation = useMutation({
    mutationFn: async ({ type, url, filename }) => {
      const response = await api.post('/vendors/kyc/documents', { type, url, filename });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vendor-kyc']);
      toast.success('Document uploaded successfully');
      setUploadingDoc(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to upload document');
      setUploadingDoc(false);
    },
  });

  // Delete document mutation
  const deleteDocMutation = useMutation({
    mutationFn: async (documentId) => {
      const response = await api.delete(`/vendors/kyc/documents/${documentId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vendor-kyc']);
      toast.success('Document deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete document');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateKYCMutation.mutate(formData);
  };

  const handleFileUpload = async (e, docType) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, and PDF files are allowed');
      return;
    }

    setUploadingDoc(true);

    try {
      // Upload to server using FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'kyc-documents');

      const uploadResponse = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Add document to KYC
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

  const getStatusBadge = (status) => {
    const badges = {
      pending: {
        icon: <Clock className="w-4 h-4" />,
        text: 'Pending Review',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      },
      approved: {
        icon: <CheckCircle className="w-4 h-4" />,
        text: 'Approved',
        className: 'bg-green-100 text-green-800 border-green-200',
      },
      rejected: {
        icon: <AlertCircle className="w-4 h-4" />,
        text: 'Rejected',
        className: 'bg-red-100 text-red-800 border-red-200',
      },
    };

    const badge = badges[status] || badges.pending;

    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${badge.className}`}>
        {badge.icon}
        <span className="text-sm font-medium">{badge.text}</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const kyc = kycData?.kyc || {};
  const status = kycData?.status || 'pending';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            KYC Verification
          </h1>
          <p className="text-gray-700 mt-1">Complete your verification to start selling</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refreshUserSession(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh approval status"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Status
          </button>
          {getStatusBadge(kyc.status || 'pending')}
        </div>
      </div>

      {/* Rejection reason */}
      {kyc.status === 'rejected' && kyc.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Application Rejected</h3>
            <p className="text-red-700 mt-1">{kyc.rejectionReason}</p>
            <p className="text-red-600 text-sm mt-2">Please update your information and resubmit.</p>
          </div>
        </div>
      )}

      {/* KYC Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Name *
              </label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Type *
              </label>
              <CustomSelect
                value={formData.businessType}
                onChange={(value) => setFormData({ ...formData, businessType: value })}
                options={[
                  { value: '', label: 'Select type' },
                  { value: 'individual', label: 'Individual/Sole Proprietor' },
                  { value: 'llc', label: 'LLC' },
                  { value: 'corporation', label: 'Corporation' },
                  { value: 'partnership', label: 'Partnership' }
                ]}
                placeholder="Select type"
                className="w-full"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Address *
              </label>
              <textarea
                value={formData.businessAddress}
                onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={3}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tax ID / EIN *
              </label>
              <input
                type="text"
                value={formData.taxId}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={updateKYCMutation.isLoading}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateKYCMutation.isLoading ? 'Saving...' : 'Save Information'}
            </button>
          </div>
        </form>
      </div>

      {/* Documents */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Required Documents</h2>

        <div className="space-y-4">
          {/* Business License */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Business License</h3>
            <p className="text-sm text-gray-700 mb-3">Upload a copy of your business license or registration</p>

            {kyc.documents?.filter(doc => doc.type === 'business_license').map((doc) => (
              <div key={doc._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-700" />
                  <span className="text-sm font-medium text-gray-900">{doc.filename}</span>
                </div>
                <button
                  onClick={() => deleteDocMutation.mutate(doc._id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}

            <label className="inline-block cursor-pointer">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => handleFileUpload(e, 'business_license')}
                className="hidden"
                disabled={uploadingDoc}
              />
              <div className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 inline-flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Document
              </div>
            </label>
          </div>

          {/* Tax Certificate */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Tax Certificate</h3>
            <p className="text-sm text-gray-700 mb-3">Upload your tax identification certificate</p>

            {kyc.documents?.filter(doc => doc.type === 'tax_certificate').map((doc) => (
              <div key={doc._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-700" />
                  <span className="text-sm font-medium text-gray-900">{doc.filename}</span>
                </div>
                <button
                  onClick={() => deleteDocMutation.mutate(doc._id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}

            <label className="inline-block cursor-pointer">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => handleFileUpload(e, 'tax_certificate')}
                className="hidden"
                disabled={uploadingDoc}
              />
              <div className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 inline-flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Document
              </div>
            </label>
          </div>

          {/* ID Proof */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Owner ID Proof</h3>
            <p className="text-sm text-gray-700 mb-3">Upload a government-issued ID of the business owner</p>

            {kyc.documents?.filter(doc => doc.type === 'id_proof').map((doc) => (
              <div key={doc._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-700" />
                  <span className="text-sm font-medium text-gray-900">{doc.filename}</span>
                </div>
                <button
                  onClick={() => deleteDocMutation.mutate(doc._id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}

            <label className="inline-block cursor-pointer">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => handleFileUpload(e, 'id_proof')}
                className="hidden"
                disabled={uploadingDoc}
              />
              <div className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 inline-flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Document
              </div>
            </label>
          </div>
        </div>

        {uploadingDoc && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center gap-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
              <span>Uploading...</span>
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Verification Process</h3>
        <ul className="text-sm text-primary-800 space-y-1 list-disc list-inside">
          <li>Fill out all required business information</li>
          <li>Upload all required documents (Business License, Tax Certificate, Owner ID)</li>
          <li>Our team will review your application within 2-3 business days</li>
          <li>You will be notified via email once your application is approved</li>
        </ul>
      </div>
    </div>
  );
};

export default VendorKYC;
