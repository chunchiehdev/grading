// app/components/grading/StatusSnackbar.tsx
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useEffect, useState } from "react";
import { CheckCircledIcon, CrossCircledIcon, InfoCircledIcon } from "@radix-ui/react-icons";

type AlertType = "success" | "error" | "info";

interface StatusSnackbarProps {
  open: boolean;
  message: string;
  severity: AlertType;
  onClose: () => void;
}

const iconMap = {
  success: CheckCircledIcon,
  error: CrossCircledIcon,
  info: InfoCircledIcon,
};

const colorMap = {
  success: "bg-green-100 text-green-800 border-green-200",
  error: "bg-red-100 text-red-800 border-red-200",
  info: "bg-blue-100 text-blue-800 border-blue-200",
};

export function StatusSnackbar({
  open,
  message,
  severity,
  onClose,
}: StatusSnackbarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const Icon = iconMap[severity];
  const colors = colorMap[severity];

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose();
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [open, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div
        className={`${colors} flex items-center px-4 py-3 rounded-lg shadow border`}
      >
        <Icon className="w-5 h-5 mr-2" />
        <span className="text-sm font-medium">{message}</span>
        <button
          onClick={onClose}
          className="ml-4 text-gray-500 hover:text-gray-700"
        >
          <CrossCircledIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}