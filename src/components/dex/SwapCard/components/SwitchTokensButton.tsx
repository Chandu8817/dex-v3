import { ArrowDown, Loader } from "lucide-react";
import { motion } from "framer-motion";

interface SwitchTokensButtonProps {
  isLoading: boolean;
  onSwitch: () => void;
}

export function SwitchTokensButton({ isLoading, onSwitch }: SwitchTokensButtonProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center -my-1 relative z-10">
        <Loader className="h-5 w-5 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex justify-center -my-1 relative z-10">
      <motion.button
        whileHover={{ rotate: 180 }}
        whileTap={{ scale: 0.9 }}
        transition={{ duration: 0.2 }}
        onClick={onSwitch}
        className="p-2 rounded-xl bg-card border border-border hover:border-primary hover:bg-muted transition-colors"
      >
        <ArrowDown className="h-5 w-5" />
      </motion.button>
    </div>
  );
}
