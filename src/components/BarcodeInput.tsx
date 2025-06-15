import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Scan } from 'lucide-react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

interface BarcodeInputProps {
  onBarcodeSubmit: (barcode: string) => void;
}

const BarcodeInput: React.FC<BarcodeInputProps> = ({ onBarcodeSubmit }) => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  // const streamRef = useRef<MediaStream | null>(null);

  const handleSubmit = () => {
    if (!barcodeInput.trim()) return;
    onBarcodeSubmit(barcodeInput.trim());
    setBarcodeInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const startCamera = async () => {
    try {
      setScanError(null);
      
      // Initialize the code reader
      codeReaderRef.current = new BrowserMultiFormatReader();
      
      // Get available video input devices
      const videoInputDevices = await codeReaderRef.current.listVideoInputDevices();
      
      if (videoInputDevices.length === 0) {
        throw new Error('No camera devices found');
      }

      // Try to find back camera (environment) first, fallback to first available
      const selectedDevice = videoInputDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('environment')
      ) || videoInputDevices[0];

      if (videoRef.current) {
        setIsCameraActive(true);
        setIsScanning(true);

        // Start decoding from video element
        codeReaderRef.current.decodeFromVideoDevice(
          selectedDevice.deviceId,
          videoRef.current,
          (result, error) => {
            if (result) {
              // Barcode found!
              const barcodeText = result.getText();
              setBarcodeInput(barcodeText);
              stopCamera();
              alert(`Barcode detected: ${barcodeText}`);
            }
            
            if (error && !(error instanceof NotFoundException)) {
              // Only log non-NotFoundException errors (NotFoundException is normal when no barcode is visible)
              console.error('Scan error:', error);
            }
          }
        );
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setScanError('Unable to access camera. Please ensure you have granted camera permissions.');
      setIsCameraActive(false);
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
      codeReaderRef.current = null;
    }
    setIsCameraActive(false);
    setIsScanning(false);
    setScanError(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-4 text-center">
        Inventory Manager
      </h1>
      
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Enter Barcode Number
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type barcode number..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSubmit}
            disabled={!barcodeInput.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Add
          </button>
          <button 
            onClick={startCamera}
            disabled={isCameraActive}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            title="Scan barcode with camera"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Camera Modal */}
      {isCameraActive && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-lg w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Scan Barcode</h3>
              <button
                onClick={stopCamera}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {scanError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {scanError}
              </div>
            )}
            
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded-lg"
                style={{ maxHeight: '300px' }}
              />
              
              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-2 border-red-500 w-48 h-24 bg-transparent"></div>
              </div>
              
              {/* Scanning indicator */}
              {isScanning && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full flex items-center gap-2">
                  <Scan className="w-4 h-4 animate-pulse" />
                  <span className="text-sm">Scanning...</span>
                </div>
              )}
            </div>
            
            <div className="mt-4 text-sm text-gray-600 text-center">
              Position the barcode within the red rectangle to scan
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarcodeInput;