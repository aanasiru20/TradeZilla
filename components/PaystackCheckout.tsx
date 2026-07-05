'use client';

import { usePaystackPayment } from 'react-paystack';
import { useRouter } from 'next/navigation';

interface PaystackCheckoutProps {
  email: string;
  userId: string;
  amountInNaira: number;
  planName: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

export default function PaystackCheckout({ 
  email,
  userId,
  amountInNaira, 
  planName,
  onSuccess,
  onClose
}: PaystackCheckoutProps) {
  const router = useRouter();

  const config = {
    reference: (new Date()).getTime().toString(),
    email: email,
    amount: amountInNaira * 100, // Paystack expects amount in Kobo
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY as string,
    metadata: {
      custom_fields: [
        {
          display_name: "Plan Name",
          variable_name: "plan_name",
          value: planName
        },
        {
          display_name: "User ID",
          variable_name: "user_id",
          value: userId
        }
      ]
    }
  };

  const initializePayment = usePaystackPayment(config);

  const handleSuccess = (reference: any) => {
    console.log('Payment successful. Reference: ', reference);
    if (onSuccess) onSuccess();
    // Redirect to the callback URL (payment success page)
    router.push('/payment-success');
  };

  const handleClose = () => {
    console.log('Payment popup closed');
    if (onClose) onClose();
  };

  return (
    <button 
      onClick={() => {
        initializePayment({
            onSuccess: handleSuccess,
            onClose: handleClose
        });
      }}
      className="w-full py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
    >
      Upgrade Now (₦{amountInNaira.toLocaleString()})
    </button>
  );
}
