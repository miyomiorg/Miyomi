import * as React from "react";
import { X, Check, ChevronsUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/admin/AdminFormElements";

interface AdminSmartSelectProps {
    label?: string;
    value: string[];
    onChange: (value: string[]) => void;
    options: string[];
    placeholder?: string;
    creatable?: boolean;
    renderOption?: (option: string) => React.ReactNode;
}

export function AdminSmartSelect({
    label,
    value = [],
    onChange,
    options = [],
    placeholder = "Select...",
    creatable = true,
    renderOption,
}: AdminSmartSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState("");

    const safeValue = Array.isArray(value) ? value : [];

    const handleSelect = (currentValue: string) => {
        // Check if already selected
        if (safeValue.includes(currentValue)) {
            // Optional: toggle off? usually multi-select keeps adding, or toggles.
            // Let's toggle off for ease
            onChange(safeValue.filter((v) => v !== currentValue));
        } else {
            onChange([...safeValue, currentValue]);
        }
        setInputValue("");
        // Keep open for multiple selection? Yes.
    };

    const handleCreate = () => {
        if (inputValue && !safeValue.includes(inputValue)) {
            onChange([...safeValue, inputValue]);
            setInputValue("");
        }
    };

    const handleRemove = (itemToRemove: string) => {
        onChange(safeValue.filter((item) => item !== itemToRemove));
    };

    const availableOptions = options.filter(opt => !safeValue.includes(opt));

    // Combine predefined options with any custom selected values that aren't in options
    // (Though usually we just show selected badges)

    return (
        <div className="space-y-2">
            {label && <Label>{label}</Label>}

            <div className="flex flex-wrap gap-2 mb-2">
                {safeValue.map((item) => (
                    <Badge key={item} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1.5 transition-all hover:bg-[var(--bg-elev-2)]">
                        {renderOption ? renderOption(item) : item}
                        <button
                            type="button"
                            onClick={() => handleRemove(item)}
                            className="hover:bg-[var(--divider)] rounded-full p-0.5 focus:outline-none"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </Badge>
                ))}
            </div>

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        role="combobox"
                        aria-expanded={open}
                        className="flex h-10 w-full items-center justify-between rounded-lg border border-[var(--divider)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <span className={safeValue.length === 0 ? "text-[var(--text-secondary)]" : ""}>
                            {placeholder}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                        <CommandInput
                            placeholder="Search or type..."
                            value={inputValue}
                            onValueChange={setInputValue}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && creatable && inputValue) {
                                    e.preventDefault();
                                    handleCreate();
                                }
                            }}
                        />
                        <CommandList>
                            <CommandEmpty>
                                {creatable && inputValue ? (
                                    <button
                                        className="w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-[var(--bg-elev-1)] flex items-center"
                                        onClick={handleCreate}
                                    >
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Create "{inputValue}"
                                    </button>
                                ) : "No results found."}
                            </CommandEmpty>
                            <CommandGroup heading="Suggestions">
                                {options.map((option) => (
                                    <CommandItem
                                        key={option}
                                        value={option}
                                        onSelect={(currentValue) => {
                                            // CommandItem lowercases values usually, so we use original option text
                                            handleSelect(option);
                                        }}
                                        className="flex justify-between"
                                    >
                                        <div className="flex items-center gap-2">
                                            {renderOption ? renderOption(option) : option}
                                        </div>
                                        {safeValue.includes(option) && <Check className="h-4 w-4 opacity-50" />}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}

// Icons
import { PlusCircle } from "lucide-react";
