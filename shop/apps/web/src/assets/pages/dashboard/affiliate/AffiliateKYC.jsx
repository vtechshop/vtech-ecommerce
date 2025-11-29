import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Upload, X, FileText, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import api from '../../../utils/api';
import { useToast } from '../../../components/common/ToastContainer';

const AffiliateKYC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    fullName: '',
    address: '',
    city: '',
    state: '',
    country: '',
    zipCode: '',
    phoneNumber: '',
    idType: '',
    idNumber: '',
  });
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Fetch KYC data
  const { data: kycData, isLoading, error } = useQuery({
    queryKey: ['affiliate-kyc'],
    queryFn: async () => {
      const response = await api.get('/affiliates/kyc');
      return response.data.data;
    },
    onSuccess: (data) => {
      if (data.kyc) {
        setFormData({
          fullName: data.kyc.fullName || '',
          address: data.kyc.address || '',
          city: data.kyc.city || '',
          state: data.kyc.state || '',
          country: data.kyc.country || '',
          zipCode: data.kyc.zipCode || '',
          phoneNumber: data.kyc.phoneNumber || '',
          idType: data.kyc.idType || '',
          idNumber: data.kyc.idNumber || '',
        });
      }
    },
    retry: false,
  });

  // Update KYC mutation
  const updateKYCMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put('/affiliates/kyc', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['affiliate-kyc']);
      toast.success('KYC information updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update KYC information');
    },
  });

  // Upload document mutation
  const uploadDocMutation = useMutation({
    mutationFn: async ({ type, url, filename }) => {
      const response = await api.post('/affiliates/kyc/documents', { type, url, filename });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['affiliate-kyc']);
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
      const response = await api.delete(`/affiliates/kyc/documents/${documentId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['affiliate-kyc']);
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

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Show error only for non-404 errors
  if (error && error?.response?.status !== 404) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Unable to load KYC</h2>
          <p className="text-gray-600 mb-4">Something went wrong. Please try again later.</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // For 404 errors, show setup message and retry button
  if (error && error?.response?.status === 404) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <Shield className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Setting up your affiliate profile...</h2>
          <p className="text-gray-600 mb-4">Your profile is being created. Please refresh the page.</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  const kyc = kycData?.kyc || {};

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            KYC Verification
          </h1>
          <p className="text-gray-700 mt-1">Complete your verification to receive payouts</p>
        </div>
        {getStatusBadge(kyc.status || 'pending')}
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
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address *
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City *
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State / Province *
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country *
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ZIP / Postal Code *
              </label>
              <input
                type="text"
                value={formData.zipCode}
                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID Type *
              </label>
              <select
                value={formData.idType}
                onChange={(e) => setFormData({ ...formData, idType: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value="">Select ID type</option>
                <option value="passport">Passport</option>
                <option value="drivers_license">Driver's License</option>
                <option value="national_id">National ID</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID Number *
              </label>
              <input
                type="text"
                value={formData.idNumber}
                onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
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
          {/* ID Proof */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">ID Proof</h3>
            <p className="text-sm text-gray-700 mb-3">Upload a copy of your government-issued ID</p>

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

          {/* Address Proof */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Address Proof</h3>
            <p className="text-sm text-gray-700 mb-3">Upload a utility bill or bank statement showing your address</p>

            {kyc.documents?.filter(doc => doc.type === 'address_proof').map((doc) => (
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
                onChange={(e) => handleFileUpload(e, 'address_proof')}
                className="hidden"
                disabled={uploadingDoc}
              />
              <div className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 inline-flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Document
              </div>
            </label>
          </div>

          {/* Tax Document (Optional) */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Tax Document (Optional)</h3>
            <p className="text-sm text-gray-700 mb-3">Upload tax identification documents if applicable</p>

            {kyc.documents?.filter(doc => doc.type === 'tax_document').map((doc) => (
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
                onChange={(e) => handleFileUpload(e, 'tax_document')}
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
          <li>Fill out all required personal information</li>
          <li>Upload all required documents (ID Proof and Address Proof)</li>
          <li>Our team will review your application within 2-3 business days</li>
          <li>You will be notified via email once your application is approved</li>
          <li>After approval, you can start earning commissions and receiving payouts</li>
        </ul>
      </div>
    </div>
  );
};

export default AffiliateKYC;
