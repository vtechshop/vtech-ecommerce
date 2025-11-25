// FILE: apps/web/src/components/product/VariantSelector.jsx
const VariantSelector = ({ variants, selectedVariant, onSelect }) => {
  if (!variants || variants.length === 0) return null;

  return (
    <div>
      <label className="block font-medium mb-2">Select Variant:</label>
      <div className="flex flex-wrap gap-2">
        {variants.map((variant) => (
          <button
            key={variant._id}
            onClick={() => onSelect(variant)}
            className={`px-4 py-2 border rounded-md transition-colors ${
              selectedVariant?._id === variant._id
                ? 'border-primary-600 bg-primary-50 text-blue-600'
                : 'border-gray-300 hover:border-gray-400'
            } ${variant.stock === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={variant.stock === 0}
          >
            {variant.name}
            {variant.stock === 0 && <span className="ml-2 text-xs">(Out of stock)</span>}
          </button>
        ))}
      </div>
    </div>
  );
};

export default VariantSelector;