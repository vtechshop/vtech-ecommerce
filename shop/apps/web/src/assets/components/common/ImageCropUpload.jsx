import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, X, ZoomIn, ZoomOut, RotateCw, Check, AlertCircle, Info, Maximize2 } from 'lucide-react';
import Button from './Button';

/**
 * Amazon-style Image Upload Component with Advanced Crop & Preview
 */
const ImageCropUpload = ({ onImageCropped, accept = "image/*", maxSize = 10, recommendedDimensions = null }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [originalImage, setOriginalImage] = useState(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // Crop settings
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspectRatio, setAspectRatio] = useState('free'); // free, 16:9, 4:3, 1:1, 21:9

  const [isDragging, setIsDragging] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [dragStart, setDragStart] = useState(null);

  const fileInputRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  // Aspect ratio options
  const aspectRatios = [
    { value: 'free', label: 'Free', ratio: null },
    { value: '16:9', label: '16:9 (Wide)', ratio: 16 / 9 },
    { value: '4:3', label: '4:3 (Standard)', ratio: 4 / 3 },
    { value: '1:1', label: '1:1 (Square)', ratio: 1 },
    { value: '21:9', label: '21:9 (Ultrawide)', ratio: 21 / 9 },
  ];

  const handleFileSelect = useCallback((file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size
    const maxSizeBytes = maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      alert(`File size must be less than ${maxSize}MB`);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height });
        setImagePreview(e.target.result);
        setOriginalImage(img);
        setSelectedImage(file);
        setZoom(1);
        setRotation(0);

        // Initialize crop to center
        const containerWidth = 100;
        const containerHeight = 100;
        setCrop({
          x: 10,
          y: 10,
          width: 80,
          height: 80,
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }, [maxSize]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // Handle crop area drag
  const handleCropMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsCropping(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleCropMouseMove = useCallback((e) => {
    if (!isCropping || !dragStart || !containerRef.current) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    const containerRect = containerRef.current.getBoundingClientRect();
    const movePercentX = (deltaX / containerRect.width) * 100;
    const movePercentY = (deltaY / containerRect.height) * 100;

    setCrop(prev => ({
      ...prev,
      x: Math.max(0, Math.min(100 - prev.width, prev.x + movePercentX)),
      y: Math.max(0, Math.min(100 - prev.height, prev.y + movePercentY)),
    }));

    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isCropping, dragStart]);

  const handleCropMouseUp = useCallback(() => {
    setIsCropping(false);
    setDragStart(null);
  }, []);

  useEffect(() => {
    if (isCropping) {
      document.addEventListener('mousemove', handleCropMouseMove);
      document.addEventListener('mouseup', handleCropMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleCropMouseMove);
        document.removeEventListener('mouseup', handleCropMouseUp);
      };
    }
  }, [isCropping, handleCropMouseMove, handleCropMouseUp]);

  // Update crop when aspect ratio changes
  useEffect(() => {
    if (!imagePreview) return;

    const ratio = aspectRatios.find(r => r.value === aspectRatio)?.ratio;
    if (ratio) {
      const currentWidth = crop.width;
      const newHeight = currentWidth / ratio;

      if (crop.y + newHeight > 100) {
        // Adjust width if height would overflow
        const maxHeight = 100 - crop.y;
        setCrop(prev => ({
          ...prev,
          width: maxHeight * ratio,
          height: maxHeight,
        }));
      } else {
        setCrop(prev => ({
          ...prev,
          height: newHeight,
        }));
      }
    }
  }, [aspectRatio, imagePreview]);

  const handleCrop = useCallback(async () => {
    if (!imagePreview || !originalImage) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Calculate actual pixel dimensions from percentage
    const scaleX = originalImage.width / 100;
    const scaleY = originalImage.height / 100;

    const cropX = crop.x * scaleX;
    const cropY = crop.y * scaleY;
    const cropWidth = crop.width * scaleX;
    const cropHeight = crop.height * scaleY;

    canvas.width = cropWidth * zoom;
    canvas.height = cropHeight * zoom;

    // Apply transformations
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Draw cropped image
    ctx.drawImage(
      originalImage,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      -cropWidth / 2,
      -cropHeight / 2,
      cropWidth,
      cropHeight
    );

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      const croppedFile = new File([blob], selectedImage.name, {
        type: selectedImage.type,
        lastModified: Date.now(),
      });

      onImageCropped(croppedFile, canvas.toDataURL());
      handleCancel();
    }, selectedImage.type, 0.95);
  }, [imagePreview, originalImage, selectedImage, crop, zoom, rotation, onImageCropped]);

  const handleCancel = useCallback(() => {
    setSelectedImage(null);
    setImagePreview(null);
    setOriginalImage(null);
    setImageDimensions({ width: 0, height: 0 });
    setZoom(1);
    setRotation(0);
    setAspectRatio('free');
    setCrop({ x: 10, y: 10, width: 80, height: 80 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Check image quality
  const isLowQuality = imageDimensions.width > 0 && imageDimensions.width < 800;
  const isHighQuality = imageDimensions.width >= 1920;

  return (
    <div className="space-y-4">
      {!imagePreview ? (
        // Upload Area - Amazon Style
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-lg transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-50 scale-[1.02]'
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50 bg-white'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={(e) => handleFileSelect(e.target.files[0])}
            className="hidden"
            id="image-upload-input"
          />

          <label
            htmlFor="image-upload-input"
            className="cursor-pointer flex flex-col items-center justify-center text-center p-8 sm:p-12"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center mb-4 ring-4 ring-blue-100 ring-opacity-50">
              <Upload className="w-10 h-10 text-blue-600" />
            </div>

            <div className="mb-4">
              <p className="text-lg font-semibold text-gray-900 mb-1">
                Drop your image here, or browse
              </p>
              <p className="text-sm text-gray-500">
                Supports: PNG, JPG, JPEG, GIF, WebP, BMP, SVG
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="md"
              className="mb-4 border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-semibold"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('image-upload-input').click();
              }}
            >
              Select Image
            </Button>

            <div className="flex items-start gap-2 max-w-md text-left bg-blue-50 rounded-lg p-4 border border-blue-200">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-700">
                <p className="font-semibold mb-1">Image Requirements:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Maximum file size: {maxSize}MB</li>
                  <li>Recommended: 1920x1080px or higher</li>
                  <li>Minimum: 800x600px for best quality</li>
                  {recommendedDimensions && (
                    <li>Recommended: {recommendedDimensions}</li>
                  )}
                </ul>
              </div>
            </div>
          </label>
        </div>
      ) : (
        // Preview & Crop Area - Amazon Style
        <div className="space-y-6">
          {/* Quality Warnings */}
          {isLowQuality && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-900">Low Resolution Warning</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Image resolution is {imageDimensions.width}x{imageDimensions.height}px.
                    For best quality, use images at least 800x600px.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isHighQuality && (
            <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900">High Quality Image</p>
                  <p className="text-sm text-green-700 mt-1">
                    Perfect! Image resolution is {imageDimensions.width}x{imageDimensions.height}px.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Image Preview with Crop Box */}
          <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-lg">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Maximize2 className="w-5 h-5 text-white" />
                <h4 className="font-semibold text-white text-lg">Adjust Your Image</h4>
              </div>
              <button
                onClick={handleCancel}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Image Container with Crop Overlay */}
              <div
                ref={containerRef}
                className="relative bg-gray-900 rounded-lg overflow-hidden"
                style={{ paddingTop: '56.25%' }}
              >
                <img
                  ref={imageRef}
                  src={imagePreview}
                  alt="Preview"
                  className="absolute inset-0 w-full h-full object-contain"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s ease-in-out',
                  }}
                />

                {/* Crop Overlay */}
                <div
                  className="absolute border-4 border-blue-500 cursor-move shadow-2xl"
                  style={{
                    left: `${crop.x}%`,
                    top: `${crop.y}%`,
                    width: `${crop.width}%`,
                    height: `${crop.height}%`,
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                  }}
                  onMouseDown={handleCropMouseDown}
                >
                  {/* Corner Handles */}
                  <div className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white"></div>
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white"></div>
                  <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white"></div>
                  <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white"></div>

                  {/* Grid Lines */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-50">
                    <div className="border-r border-b border-white"></div>
                    <div className="border-r border-b border-white"></div>
                    <div className="border-b border-white"></div>
                    <div className="border-r border-b border-white"></div>
                    <div className="border-r border-b border-white"></div>
                    <div className="border-b border-white"></div>
                    <div className="border-r border-white"></div>
                    <div className="border-r border-white"></div>
                    <div></div>
                  </div>
                </div>
              </div>

              {/* Aspect Ratio Selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Aspect Ratio</label>
                <div className="grid grid-cols-5 gap-2">
                  {aspectRatios.map((ratio) => (
                    <button
                      key={ratio.value}
                      type="button"
                      onClick={() => setAspectRatio(ratio.value)}
                      className={`px-3 py-2 text-xs font-medium rounded-lg border-2 transition-all ${
                        aspectRatio === ratio.value
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {ratio.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Zoom Control */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Zoom</label>
                <div className="flex items-center gap-4">
                  <ZoomOut className="w-5 h-5 text-gray-500" />
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="flex-1 h-3 bg-gradient-to-r from-gray-200 via-blue-200 to-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg"
                  />
                  <ZoomIn className="w-5 h-5 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-700 min-w-[4rem] text-right bg-gray-100 px-3 py-1 rounded-lg">
                    {Math.round(zoom * 100)}%
                  </span>
                </div>
              </div>

              {/* Rotation Control */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Rotation</label>
                <div className="flex items-center gap-4">
                  <RotateCw className="w-5 h-5 text-gray-500" />
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="15"
                    value={rotation}
                    onChange={(e) => setRotation(parseInt(e.target.value))}
                    className="flex-1 h-3 bg-gradient-to-r from-gray-200 via-purple-200 to-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg"
                  />
                  <span className="text-sm font-semibold text-gray-700 min-w-[4rem] text-right bg-gray-100 px-3 py-1 rounded-lg">
                    {rotation}°
                  </span>
                </div>
              </div>

              {/* File Info */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-blue-900 mb-2">Image Details</p>
                    <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
                      <div>
                        <span className="font-medium">File:</span> {selectedImage.name}
                      </div>
                      <div>
                        <span className="font-medium">Size:</span> {(selectedImage.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                      <div>
                        <span className="font-medium">Dimensions:</span> {imageDimensions.width}x{imageDimensions.height}px
                      </div>
                      <div>
                        <span className="font-medium">Type:</span> {selectedImage.type.split('/')[1].toUpperCase()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t-2 border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1 border-2 border-gray-300 hover:bg-gray-50 font-semibold"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleCrop}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg font-semibold"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Use This Image
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageCropUpload;
