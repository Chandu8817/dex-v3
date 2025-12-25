import { useState, useCallback } from "react";
import { LiquidityState, NotificationState } from "../types";

export const useLiquidityNotification = () => {
  const [notification, setNotification] = useState<NotificationState | null>(null);

  const showNotification = useCallback((type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  return { notification, showNotification };
};

export const useLiquidityProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  return { isProcessing, setIsProcessing };
};

export const useTokenSelector = () => {
  const [tokenSelectorOpen, setTokenSelectorOpen] = useState<"token0" | "token1" | null>(null);
  const [isFullRange, setIsFullRange] = useState(false);

  return { tokenSelectorOpen, setTokenSelectorOpen, isFullRange, setIsFullRange };
};

export const usePriceRange = () => {
  const [tickLower, setTickLower] = useState("");
  const [tickUpper, setTickUpper] = useState("");
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceRangeSuggestions, setPriceRangeSuggestions] = useState<
    Array<{ label: string; min: number; max: number; range: number }>
  >([]);
  const [selectedRange, setSelectedRange] = useState<
    { label: string; min: number; max: number; range: number } | null
  >(null);

  return {
    tickLower,
    setTickLower,
    tickUpper,
    setTickUpper,
    currentPrice,
    setCurrentPrice,
    priceRangeSuggestions,
    setPriceRangeSuggestions,
    selectedRange,
    setSelectedRange,
  };
};
