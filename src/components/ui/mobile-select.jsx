import React, { useState, useId } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileSelect({ 
  value, 
  onValueChange, 
  placeholder, 
  options = [],
  label,
  className 
}) {
  const [open, setOpen] = useState(false);
  
  const selectedOption = options.find(opt => opt.value === value);
  const displayValue = selectedOption?.label || placeholder;

  const handleSelect = (newValue) => {
    onValueChange(newValue);
    setOpen(false);
  };

  const triggerId = useId();

  return (
    <>
      <button
        type="button"
        id={triggerId}
        onClick={() => setOpen(true)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label || placeholder}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-muted-foreground",
          className
        )}
      >
        <span className="truncate">{displayValue}</span>
        <svg
          className="h-4 w-4 opacity-50 flex-shrink-0 ml-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="bg-gray-900 border-gray-800 max-h-[70vh]">
          <DrawerHeader className="border-b border-gray-800">
            <DrawerTitle className="text-white">{label || placeholder}</DrawerTitle>
          </DrawerHeader>
          <div
            role="listbox"
            aria-labelledby={triggerId}
            aria-label={label || placeholder}
            className="overflow-y-auto p-4"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
          >
            <div className="space-y-2">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={value === option.value}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors min-h-[44px]",
                    value === option.value
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-800/50 text-gray-200 hover:bg-gray-800"
                  )}
                >
                  <span>{option.label}</span>
                  {value === option.value && <Check className="w-5 h-5 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}