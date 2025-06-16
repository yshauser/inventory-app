import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Scan } from 'lucide-react';
import { BrowserMultiFormatReader, NotFoundException, Result } from '@zxing/library';
import { useTranslation } from 'react-i18next';

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
  const streamRef = useRef<MediaStream | null>(null);

  const {t} = useTranslation();

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
      setIsCameraActive(true);
      setIsScanning(true);
      
      // Wait for video element to be available
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!videoRef.current) {
        throw new Error('Video element not available');
      }

      // Initialize the code reader
      codeReaderRef.current = new BrowserMultiFormatReader();

      // First, try to get available video devices
      try {
        const videoInputDevices = await codeReaderRef.current.listVideoInputDevices();
        console.log('Available cameras:', videoInputDevices);
        
        if (videoInputDevices.length === 0) {
          throw new Error('No camera devices found');
        }

        // Try to find back camera (environment) first, fallback to first available
        const selectedDevice = videoInputDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('environment')
        ) || videoInputDevices[0];

        console.log('Selected camera:', selectedDevice);

        // Start decoding from the selected video device
        await codeReaderRef.current.decodeFromVideoDevice(
          selectedDevice.deviceId,
          videoRef.current,
          (result: Result | undefined, error?: Error) => {
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
      } catch (deviceError) {
        console.log('Device enumeration failed, trying with constraints:', deviceError);
        
        // Fallback: try with getUserMedia constraints directly
        const constraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        videoRef.current.srcObject = stream;
        streamRef.current = stream;

        // Wait for video to be ready
        await new Promise((resolve) => {
          videoRef.current!.onloadedmetadata = () => resolve(undefined);
        });

        // Start decoding from video element with stream
        codeReaderRef.current.decodeFromVideoElement(
          videoRef.current
        ).then((result: Result) => {
          // Barcode found!
          const barcodeText = result.getText();
          setBarcodeInput(barcodeText);
          stopCamera();
          alert(`Barcode detected: ${barcodeText}`);
        }).catch((error) => {
          if (!(error instanceof NotFoundException)) {
            console.error('Scan error:', error);
          }
        });
      }
      
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error accessing camera:', error);
        setScanError(`Unable to access camera: ${error.message}. Please ensure you have granted camera permissions.`);
      } else {
        console.error('Error accessing camera:', error);
        setScanError('Unable to access camera: Unknown error. Please ensure you have granted camera permissions.');
      }
      setIsCameraActive(false);
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    // Stop ZXing reader
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
      codeReaderRef.current = null;
    }
    
    // Stop media stream if we created one manually
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
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
        {t('header.appTitle')}
      </h1>
      
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          {t('general.enterBarcode')}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder=          {t('general.enterBarcodePlaceholder')}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSubmit}
            disabled={!barcodeInput.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {t('buttons.add')}
          </button>
          <button 
            onClick={startCamera}
            disabled={isCameraActive}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            title={t('general.scanCameraTitle')}
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
              <h3 className="text-lg font-semibold">{t('general.scanBarcode')}</h3>
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
                  <span className="text-sm">{t('general.scanning')}</span>
                </div>
              )}
            </div>
            
            <div className="mt-4 text-sm text-gray-600 text-center">
              {t('general.scanningInstructions')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarcodeInput;