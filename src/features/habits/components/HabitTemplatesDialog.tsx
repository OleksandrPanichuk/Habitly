"use client";

import type { THabitFormValues } from "@/schemas";
import {
    Button,
    Chip,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
} from "@heroui/react";
import { motion } from "framer-motion";
import { CheckIcon, SparklesIcon, XIcon } from "lucide-react";
import { useState } from "react";
import {
    HABIT_CATEGORIES,
    HABIT_TEMPLATES,
    type HabitTemplate,
} from "../constants";

interface IHabitTemplatesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (values: THabitFormValues) => void;
}

function getCategoryMeta(value: string) {
    return (
        HABIT_CATEGORIES.find((c) => c.value === value) ??
        HABIT_CATEGORIES[HABIT_CATEGORIES.length - 1]
    );
}

export const HabitTemplatesDialog = ({
    open,
    onOpenChange,
    onSelect,
}: IHabitTemplatesDialogProps) => {
    const [selected, setSelected] = useState<HabitTemplate | null>(null);
    const [activeGroup, setActiveGroup] = useState<string>(
        Object.keys(HABIT_TEMPLATES)[0],
    );

    const groups = Object.keys(HABIT_TEMPLATES);

    const handleSelect = (template: HabitTemplate) => {
        setSelected((prev) => (prev?.name === template.name ? null : template));
    };

    const handleConfirm = () => {
        if (!selected) return;
        onSelect({
            name: selected.name,
            description: selected.description,
            color: selected.color,
            icon: selected.icon,
            category: selected.category,
            goalType: "binary",
            targetValue: undefined,
            targetUnit: undefined,
            reminderEnabled: false,
            frequencyType: selected.frequencyType,
            frequencyDaysOfWeek: selected.frequencyDaysOfWeek ?? [],
            frequencyInterval: selected.frequencyInterval,
            frequencyUnit: selected.frequencyUnit,
        });
        setSelected(null);
        onOpenChange(false);
    };

    const handleClose = () => {
        setSelected(null);
        onOpenChange(false);
    };

    return (
        <Modal
            isOpen={open}
            onOpenChange={onOpenChange}
            placement="center"
            size="2xl"
            scrollBehavior="inside"
            classNames={{
                base: "max-h-[90vh]",
                body: "py-4",
            }}
            hideCloseButton
        >
            <ModalContent>
                {() => (
                    <>
                        <ModalHeader className="flex items-center justify-between pr-3">
                            <div className="flex items-center gap-2">
                                <SparklesIcon
                                    size={18}
                                    className="text-primary"
                                />
                                <span className="text-base font-semibold">
                                    Habit Templates
                                </span>
                            </div>
                            <Button
                                isIconOnly
                                variant="light"
                                size="sm"
                                onPress={handleClose}
                                className="text-foreground-400"
                            >
                                <XIcon size={16} />
                            </Button>
                        </ModalHeader>

                        <ModalBody>
                            <p className="text-sm text-foreground-500 -mt-1 mb-3">
                                Pick a template to quickly create a habit with
                                sensible defaults. You can customize everything
                                after.
                            </p>

                            {/* Group tabs */}
                            <div className="flex gap-1.5 flex-wrap mb-4">
                                {groups.map((group) => (
                                    <Button
                                        key={group}
                                        size="sm"
                                        variant={
                                            activeGroup === group
                                                ? "solid"
                                                : "flat"
                                        }
                                        color={
                                            activeGroup === group
                                                ? "primary"
                                                : "default"
                                        }
                                        onPress={() => setActiveGroup(group)}
                                        className="h-7 px-3 text-xs font-medium rounded-lg"
                                    >
                                        {group}
                                    </Button>
                                ))}
                            </div>

                            {/* Templates grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {(HABIT_TEMPLATES[activeGroup] ?? []).map(
                                    (template) => {
                                        const isSelected =
                                            selected?.name === template.name;
                                        const catMeta = getCategoryMeta(
                                            template.category,
                                        );

                                        return (
                                            <motion.button
                                                key={template.name}
                                                type="button"
                                                layout
                                                onClick={() =>
                                                    handleSelect(template)
                                                }
                                                className={[
                                                    "relative flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-200 cursor-pointer w-full",
                                                    isSelected
                                                        ? "border-primary bg-primary/10 shadow-sm shadow-primary/20"
                                                        : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8",
                                                ].join(" ")}
                                            >
                                                {/* Color dot + icon */}
                                                <div
                                                    className="mt-0.5 shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg"
                                                    style={{
                                                        backgroundColor: `${template.color}22`,
                                                        border: `1.5px solid ${template.color}44`,
                                                    }}
                                                >
                                                    {template.icon}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm font-semibold text-foreground">
                                                            {template.name}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-foreground-400 mt-0.5 line-clamp-2 leading-relaxed">
                                                        {template.description}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                                        <Chip
                                                            size="sm"
                                                            variant="flat"
                                                            classNames={{
                                                                base: "h-4 px-1.5",
                                                                content:
                                                                    "text-[10px] font-medium",
                                                            }}
                                                            style={{
                                                                backgroundColor: `${catMeta.color}18`,
                                                                color: catMeta.color,
                                                            }}
                                                        >
                                                            {catMeta.icon}{" "}
                                                            {catMeta.label}
                                                        </Chip>
                                                        <span
                                                            className="text-[10px] rounded-full px-1.5 py-0.5 font-medium"
                                                            style={{
                                                                backgroundColor: `${template.color}18`,
                                                                color: template.color,
                                                            }}
                                                        >
                                                            {template.frequencyType ===
                                                            "daily"
                                                                ? "Daily"
                                                                : template.frequencyType ===
                                                                    "weekly"
                                                                  ? "Weekly"
                                                                  : `Every ${template.frequencyInterval} ${template.frequencyUnit}`}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Checkmark when selected */}
                                                {isSelected && (
                                                    <motion.div
                                                        initial={{
                                                            scale: 0,
                                                            opacity: 0,
                                                        }}
                                                        animate={{
                                                            scale: 1,
                                                            opacity: 1,
                                                        }}
                                                        transition={{
                                                            type: "spring",
                                                            stiffness: 400,
                                                            damping: 20,
                                                        }}
                                                        className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                                                    >
                                                        <CheckIcon
                                                            size={11}
                                                            className="text-white"
                                                        />
                                                    </motion.div>
                                                )}

                                                {/* Color bar */}
                                                <div
                                                    className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full"
                                                    style={{
                                                        backgroundColor:
                                                            template.color,
                                                    }}
                                                />
                                            </motion.button>
                                        );
                                    },
                                )}
                            </div>
                        </ModalBody>

                        <ModalFooter>
                            <Button
                                variant="light"
                                onPress={handleClose}
                                className="text-foreground-400"
                            >
                                Cancel
                            </Button>
                            <Button
                                color="primary"
                                isDisabled={!selected}
                                onPress={handleConfirm}
                                startContent={
                                    selected ? (
                                        <CheckIcon size={14} />
                                    ) : (
                                        <SparklesIcon size={14} />
                                    )
                                }
                                className="font-semibold"
                            >
                                {selected
                                    ? `Use "${selected.name}"`
                                    : "Select a template"}
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};
