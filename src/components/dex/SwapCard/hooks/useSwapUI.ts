import { useState, useCallback } from "react";

export const useSwapNotification = () => {
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showNotification = useCallback((type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  return { notification, showNotification };
};

export const useSwapUIState = () => {
  const [tokenSelectorOpen, setTokenSelectorOpen] = useState<
    "input" | "output" | null
  >(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [isOutput, setIsOutput] = useState(false);
  

  return {
    tokenSelectorOpen,
    setTokenSelectorOpen,
    isRefreshing,
    setIsRefreshing,
    isSwapping,
    setIsSwapping,
    isOutput,
    setIsOutput,
    
  };
};
