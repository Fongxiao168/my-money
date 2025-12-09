import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { QrCode, Lock, CheckCircle2, Upload, Download } from 'lucide-react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PaymentModal({ isOpen, onClose }: PaymentModalProps) {
  const [step, setStep] = useState<'choice' | 'form'>('choice');
  const [loading, setLoading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const { profile } = useStore();

  const handlePayNow = () => {
    setStep('form');
  };

  const handlePayLater = () => {
    onClose();
    setStep('choice');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptFile || !profile?.id) return;

    setLoading(true);

    try {
      // 1. Upload receipt
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, receiptFile);

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      // 3. Create payment request
      const { error: dbError } = await supabase
        .from('payment_requests')
        .insert({
          user_id: profile.id,
          amount: 3.00,
          receipt_url: publicUrl,
          status: 'pending'
        });

      if (dbError) throw dbError;

      toast.success('Payment receipt submitted! Admin will review shortly.');
      onClose();
      setStep('choice');
      setReceiptFile(null);
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to submit payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'choice') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Premium Feature">
        <div className="flex flex-col items-center text-center space-y-6 py-4">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Unlock Premium Access</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
              To record transactions and manage accounts, you need to upgrade to our Premium plan.
            </p>
          </div>

          <div className="grid grid-cols-1 w-full gap-3">
            <button
              onClick={handlePayNow}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              <QrCode className="w-5 h-5" />
              Pay Now ($3.00)
            </button>
            <button
              onClick={handlePayLater}
              className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
            >
              Pay Later
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Scan to Pay">
      <form onSubmit={handlePaymentSubmit} className="space-y-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100">Lifetime Premium</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">One-time payment via KHQR</p>
          </div>
          <div className="ml-auto font-bold text-blue-900 dark:text-blue-100">$3.00</div>
        </div>

        <div className="flex flex-col items-center space-y-4">
            <div className="relative group">
                <img 
                    src="/aba_qr.jpg" 
                    alt="Payment QR Code" 
                    className="w-64 h-auto rounded-lg border-2 border-gray-200 dark:border-gray-700"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                />
                <div className="hidden w-64 h-64 bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-center p-4">
                  <p className="text-sm text-gray-500">
                    QR Code image not found.<br/>
                    Please add <b>aba_qr.jpg</b> to your <b>public</b> folder.
                  </p>
                </div>
                <a 
                    href="/aba_qr.jpg" 
                    download="payment_qr.jpg"
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-medium rounded-lg"
                >
                    <Download className="w-6 h-6 mr-2" />
                    Download QR
                </a>
            </div>
            <p className="text-sm text-gray-500 text-center">
                Scan with ABA, Acleda, Wing, or any KHQR supported app.
            </p>
        </div>

        <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Upload Payment Receipt</label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-blue-500 transition-colors cursor-pointer relative">
                <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    required
                />
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                {receiptFile ? (
                    <p className="text-sm font-medium text-blue-600">{receiptFile.name}</p>
                ) : (
                    <>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Click to upload receipt</p>
                        <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                    </>
                )}
            </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => setStep('choice')}
            className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={loading || !receiptFile}
            className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Submit Receipt'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
