"use client";

import {
    Button,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Textarea,
} from "@heroui/react";
import { NotebookPenIcon } from "lucide-react";
import { useEffect, useState } from "react";

interface INoteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    habitName: string;
    initialNote: string | null;
    onSave: (note: string | null) => void;
    isLoading?: boolean;
}

export const NoteDialog = ({
    open,
    onOpenChange,
    habitName,
    initialNote,
    onSave,
    isLoading,
}: INoteDialogProps) => {
    const [value, setValue] = useState(initialNote ?? "");

    useEffect(() => {
        if (open) setValue(initialNote ?? "");
    }, [open, initialNote]);

    const handleSave = () => {
        const trimmed = value.trim();
        onSave(trimmed.length > 0 ? trimmed : null);
    };

    const handleClear = () => {
        onSave(null);
    };

    const isDirty = value.trim() !== (initialNote ?? "").trim();

    return (
        <Modal
            isOpen={open}
            onOpenChange={onOpenChange}
            placement="center"
            size="sm"
        >
            <ModalContent>
                <ModalHeader className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
                        <NotebookPenIcon size={16} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold leading-tight truncate">
                            {initialNote ? "Edit note" : "Add note"}
                        </p>
                        <p className="text-xs text-foreground-400 font-normal truncate">
                            {habitName}
                        </p>
                    </div>
                </ModalHeader>

                <ModalBody className="pb-2">
                    <Textarea
                        placeholder="What helped, what was hard, or what should you repeat tomorrow?"
                        value={value}
                        onValueChange={setValue}
                        minRows={3}
                        maxRows={6}
                        maxLength={500}
                        autoFocus
                        classNames={{
                            inputWrapper: "bg-white/5 border border-white/10",
                        }}
                    />
                    <p className="text-right text-xs text-foreground-400">
                        {value.length} / 500
                    </p>
                </ModalBody>

                <ModalFooter className="gap-2">
                    {initialNote && (
                        <Button
                            variant="light"
                            color="danger"
                            size="sm"
                            onPress={handleClear}
                            isDisabled={isLoading}
                            className="mr-auto"
                        >
                            Clear
                        </Button>
                    )}
                    <Button
                        variant="light"
                        onPress={() => onOpenChange(false)}
                        isDisabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        color="primary"
                        onPress={handleSave}
                        isLoading={isLoading}
                        isDisabled={!isDirty && !!initialNote}
                    >
                        Save
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
