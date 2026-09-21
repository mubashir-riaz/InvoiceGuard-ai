import { useState, useCallback, useRef } from "react";
import { ConfirmDialogProps } from "../components/ConfirmDialog";

export interface ConfirmOptions {
  title?: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export const useConfirm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    title: "Confirm Action",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    isDestructive: true,
  });

  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback(
    (messageOrOptions: string | React.ReactNode | ConfirmOptions): Promise<boolean> => {
      let resolvedOptions: ConfirmOptions;

      if (
        typeof messageOrOptions === "object" &&
        messageOrOptions !== null &&
        "message" in (messageOrOptions as object)
      ) {
        resolvedOptions = messageOrOptions as ConfirmOptions;
      } else {
        resolvedOptions = {
          title: "Are you sure?",
          message: messageOrOptions as React.ReactNode,
          confirmText: "Delete",
          cancelText: "Cancel",
          isDestructive: true,
        };
      }

      setOptions(resolvedOptions);
      setIsOpen(true);

      return new Promise<boolean>((resolve) => {
        resolverRef.current = resolve;
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  }, []);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  }, []);

  const dialogProps: ConfirmDialogProps = {
    isOpen,
    title: options.title,
    message: options.message,
    confirmText: options.confirmText,
    cancelText: options.cancelText,
    isDestructive: options.isDestructive ?? true,
    onConfirm: handleConfirm,
    onCancel: handleCancel,
  };

  return {
    confirm,
    dialogProps,
  };
};

export default useConfirm;
