import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { NotificationState } from "../types";

interface NotificationToastProps {
  notification: NotificationState | null;
}

export function NotificationToast({ notification }: NotificationToastProps) {
  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`fixed top-4 right-4 rounded-lg p-4 flex items-center gap-2 z-50 ${
            notification.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {notification.type === "success" ? (
            <Check className="h-5 w-5" />
          ) : (
            <X className="h-5 w-5" />
          )}
          <span>{notification.message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
