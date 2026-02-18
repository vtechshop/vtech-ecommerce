// FILE: apps/web/src/components/common/Pagination.jsx
import clsx from 'clsx';

const Pagination = ({ currentPage, totalPages, onPageChange, showPages = 5 }) => {
  const getPageNumbers = () => {
    const pages = [];
    let startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
    let endPage = Math.min(totalPages, startPage + showPages - 1);

    if (endPage - startPage + 1 < showPages) {
      startPage = Math.max(1, endPage - showPages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  const pages = getPageNumbers();

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-2 py-2 sm:px-3 sm:py-2.5 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm min-h-[44px]"
      >
        Previous
      </button>

      {pages[0] > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            className="px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-md border border-gray-300 hover:bg-gray-50 text-sm min-h-[44px] min-w-[44px]"
          >
            1
          </button>
          {pages[0] > 2 && <span className="px-1 sm:px-2">...</span>}
        </>
      )}

      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={clsx(
            'px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-md border text-sm min-h-[44px] min-w-[44px]',
            page === currentPage
              ? 'bg-primary-600 text-white border-primary-600'
              : 'border-gray-300 hover:bg-gray-50'
          )}
        >
          {page}
        </button>
      ))}

      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && <span className="px-1 sm:px-2">...</span>}
          <button
            onClick={() => onPageChange(totalPages)}
            className="px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-md border border-gray-300 hover:bg-gray-50 text-sm min-h-[44px] min-w-[44px]"
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-2 py-2 sm:px-3 sm:py-2.5 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm min-h-[44px]"
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;