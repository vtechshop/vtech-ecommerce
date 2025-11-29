import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import api from '@/utils/api';
import { useToast } from '@/components/common/ToastContainer';
import useAuth from '@/hooks/useAuth';

const ReviewForm = ({ productId, onReviewSubmitted }) => {
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast.error('Please login to submit a review');
      return;
    }

    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    if (!comment.trim()) {
      toast.error('Please write a review comment');
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post(`/products/${productId}/reviews`, {
        rating,
        comment: comment.trim(),
      });

      toast.success('Review submitted successfully!');
      setRating(0);
      setComment('');

      if (onReviewSubmitted) {
        onReviewSubmitted();
      }
    } catch (error) {
      console.error('Review submission error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-white to-primary-50 rounded-xl border-2 border-primary-200 shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col" style={{height: '400px'}}>
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-2 relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2 relative z-10">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          Write a Review
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 p-4 space-y-3 bg-white rounded-b-xl flex flex-col overflow-hidden">
        {/* Rating Stars */}
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Your Rating *
          </label>
          <div className="flex gap-1 items-center justify-center bg-gradient-to-r from-primary-50 to-primary-100 p-3 rounded-lg border-2 border-primary-200">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="focus:outline-none transition-all hover:scale-110"
              >
                <Star
                  className={`w-6 h-6 ${
                    star <= (hoveredRating || rating)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300 hover:text-gray-400'
                  }`}
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-2 text-sm font-bold text-blue-600">
                {rating}/5
              </span>
            )}
          </div>
        </div>

        {/* Review Comment */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <label htmlFor="review-comment" className="block text-sm font-bold text-gray-900 mb-1.5">
            Your Review *
          </label>
          <textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="flex-1 w-full px-3 py-2 border-2 border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-400 resize-none text-sm transition-all bg-gradient-to-br from-white to-primary-50"
            placeholder="Share your experience with this product..."
            disabled={isSubmitting}
          />
          <div className="flex justify-between items-center mt-1.5">
            <p className="text-xs text-gray-700">
              Minimum 10 characters
            </p>
            <p className={`text-xs font-bold px-2 py-0.5 rounded-full ${comment.length >= 10 ? 'text-green-700 bg-green-100' : 'text-gray-700 bg-gray-100'}`}>
              {comment.length}/10
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="submit"
            disabled={isSubmitting || !isAuthenticated || rating === 0 || comment.length < 10}
            className="w-full px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg font-semibold text-sm hover:from-primary-600 hover:to-primary-700 transition-all shadow-md hover:shadow-lg disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Submitting...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1">
                ⭐ Submit Review
              </span>
            )}
          </button>

          {!isAuthenticated && (
            <p className="text-xs text-gray-700 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-200">
              Please <Link to="/login" className="text-blue-600 font-bold hover:underline">login</Link> to submit a review
            </p>
          )}
        </div>
      </form>
    </div>
  );
};

export default ReviewForm;
