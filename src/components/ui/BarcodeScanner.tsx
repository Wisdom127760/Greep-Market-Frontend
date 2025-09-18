import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera, AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: string) => void;
  onError?: (error: string) => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  isOpen,
  onClose,
  onScan,
  onError,
}) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !scannerRef.current) {
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      };

      scannerRef.current = new Html5QrcodeScanner(
        'barcode-scanner',
        config,
        false
      );

      scannerRef.current.render(
        (decodedText) => {
          onScan(decodedText);
          setIsScanning(false);
          onClose();
        },
        (error) => {
          if (error.includes('No MultiFormat Readers')) {
            setError('Camera not supported. Please use a device with a camera.');
            onError?.('Camera not supported');
          } else if (!error.includes('NotFoundException')) {
            setError('Scanning error. Please try again.');
            onError?.(error);
          }
        }
      );

      setIsScanning(true);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, [isOpen, onScan, onClose, onError]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
      <div className="relative w-full max-w-md mx-4">
        <div className="bg-white rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Scan Barcode
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="!p-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-4">
            {error ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={onClose}>Close</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <Camera className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Position the barcode within the frame
                  </p>
                </div>
                <div id="barcode-scanner" className="w-full" />
                {isScanning && (
                  <div className="text-center">
                    <div className="animate-pulse text-primary-600">
                      Scanning...
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
