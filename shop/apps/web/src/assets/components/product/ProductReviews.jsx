// FILE: apps/web/src/components/products/ProductReviews.jsx
import { useState } from 'react';
import { Star, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useSelector } from 'react-redux';
import { formatDate } from '@/utils/format';

const ProductReviews = ({ reviews = [], rating, reviewCount, onEdit, onDelete }) => {
  const { user } = useSelector((state) => state.auth);
  const [showAll, setShowAll] = useState(false);

  // Show only 3 reviews initially, like Amazon
  const INITIAL_REVIEWS_COUNT = 3;
  const displayedReviews = showAll ? reviews : reviews.slice(0, INITIAL_REVIEWS_COUNT);
  const hasMoreReviews = reviews.length > INITIAL_REVIEWS_COUNT;
  const renderStars = (rating) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${
          index < Math.floor(rating)
            ? 'fill-yellow-400 text-yellow-400'
            : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
      <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>

      {/* Rating Summary */}
      <div className="flex items-center gap-6 mb-8 pb-8 border-b">
        <div className="text-center">
          <p className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2">{rating?.toFixed(1) || '0.0'}</p>
          <div className="flex justify-center mb-1">
            {renderStars(rating || 0)}
          </div>
          <p className="text-sm text-gray-700">{reviewCount || 0} reviews</p>
        </div>

        <div className="flex-1 space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = reviews.filter((r) => r.rating === star).length;
            const percentage = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-3">
                <span className="text-sm w-8">{star} ★</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-700 w-12 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-6">
        {reviews.length === 0 ? (
          <p className="text-center text-gray-700 py-8">No reviews yet. Be the first to review!</p>
        ) : (
          displayedReviews.map((review) => {
            // Get user name from userId field (populated by API)
            const userName = review.userId?.name || review.userName || 'Anonymous';

            // Check if current user is the review author OR admin
            const isOwnReview = user && review.userId?._id === user._id;
            const isAdmin = user && user.role === 'admin';
            const canModify = isOwnReview || isAdmin;

            return (
              <div key={review._id} className="border-b pb-6 last:border-b-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{userName}</p>
                      {review.verified && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Verified Purchase
                        </span>
                      )}
                      {isAdmin && !isOwnReview && (
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                          Admin Actions
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex">{renderStars(review.rating)}</div>
                      <span className="text-sm text-gray-700">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Edit/Delete buttons for own review OR admin */}
                  {canModify && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEdit && onEdit(review)}
                        className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                        title={isAdmin && !isOwnReview ? "Edit review (Admin)" : "Edit review"}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete && onDelete(review._id)}
                        className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title={isAdmin && !isOwnReview ? "Delete review (Admin)" : "Delete review"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-gray-700 mt-3">{review.comment}</p>
                {review.images?.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {review.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Review ${idx + 1}`}
                        className="w-20 h-20 object-cover rounded"
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Show More / Show Less Button */}
      {hasMoreReviews && (
        <div className="mt-6 pt-6 border-t text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all"
          >
            {showAll ? (
              <>
                <ChevronUp className="w-5 h-5" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="w-5 h-5" />
                See More Reviews ({reviews.length - INITIAL_REVIEWS_COUNT} more)
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductReviews;