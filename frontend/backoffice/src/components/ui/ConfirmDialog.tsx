"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { Button } from "./Button";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  variant = "danger",
  loading,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-md bg-white rounded-md shadow-xl border-t-[6px] border-catl-danger p-6 focus:outline-none">
          <Dialog.Title className="text-lg font-bold text-catl-primary mb-2">
            {title}
          </Dialog.Title>
          {description && (
            <Dialog.Description asChild>
              <div className="text-sm text-catl-text mb-5">{description}</div>
            </Dialog.Description>
          )}
          <div className="flex justify-end gap-3">
            <Dialog.Close asChild>
              <Button variant="secondary" size="md" disabled={loading}>
                {cancelLabel}
              </Button>
            </Dialog.Close>
            <Button
              variant={variant === "danger" ? "danger" : "primary"}
              size="md"
              loading={loading}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
