/**
 * OrbitByte Payment Service - Provider-Agnostic Payment Library
 * 
 * This module replaces Razorpay with a provider-independent payment abstraction.
 * All payment processing goes through the PaymentMethod and PaymentTransaction
 * models, with adapters for specific payment providers.
 * 
 * To add a new payment provider, configure via PaymentMethod or implement
 * a payment adapter following the architecture in app/lib/payment-adapter.ts.
 */

// Provider configuration interfaces
export interface PaymentProviderConfig {
  name: string;
  type: "upi" | "bank_transfer" | "card" | "wallet" | "manual";
  enabled: boolean;
  currency: "INR";
  minAmountPaise?: number;
  maxAmountPaise?: number;
  configuration?: Record<string, unknown>;
}

// Default OrbitByte payment configuration (UPI/manual focused)
export const ORBITBYTE_PAYMENT_CONFIG: PaymentProviderConfig = {
  name: "orbitbyte",
  type: "manual",
  enabled: true,
  currency: "INR",
  minAmountPaise: 100,
  maxAmountPaise: 10000000,
};

// Provider lookup by type
export const PAYMENT_PROVIDERS: Record<string, PaymentProviderConfig> = {
  orbitbyte: ORBITBYTE_PAYMENT_CONFIG,
  upi: {
    name: "UPI",
    type: "upi",
    enabled: true,
    currency: "INR",
    minAmountPaise: 1,
    maxAmountPaise: 10000000,
  },
  bank_transfer: {
    name: "Bank Transfer",
    type: "bank_transfer",
    enabled: true,
    currency: "INR",
    minAmountPaise: 1000,
    maxAmountPaise: 10000000,
  },
  card: {
    name: "Card",
    type: "card",
    enabled: false, // Disabled by default - requires authorized payment/acquiring integration
    currency: "INR",
    minAmountPaise: 100,
    maxAmountPaise: 10000000,
  },
  wallet: {
    name: "Wallet",
    type: "wallet",
    enabled: true,
    currency: "INR",
    minAmountPaise: 1,
    maxAmountPaise: 10000000,
  },
  manual: {
    name: "Manual",
    type: "manual",
    enabled: true,
    currency: "INR",
    minAmountPaise: 100,
    maxAmountPaise: 10000000,
  },
};

/**
 * Get provider configuration by type
 */
export function getProviderConfig(type: string): PaymentProviderConfig {
  return PAYMENT_PROVIDERS[type] || PAYMENT_PROVIDERS.manual;
}

/**
 * Check if a provider type is enabled
 */
export function isProviderEnabled(type: string): boolean {
  const config = getProviderConfig(type);
  return config.enabled;
}