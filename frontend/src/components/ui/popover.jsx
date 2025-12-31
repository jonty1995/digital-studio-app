import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { cn } from "@/lib/utils";

const PopoverContext = createContext({});

export const Popover = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef(null);
    const contentRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                triggerRef.current &&
                !triggerRef.current.contains(event.target) &&
                contentRef.current &&
                !contentRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const toggle = () => setIsOpen(!isOpen);

    return (
        <PopoverContext.Provider value={{ isOpen, toggle, triggerRef, contentRef }}>
            <div className="relative inline-block">
                {children}
            </div>
        </PopoverContext.Provider>
    );
};

export const PopoverTrigger = ({ asChild, children, ...props }) => {
    const { toggle, triggerRef } = useContext(PopoverContext);

    if (asChild) {
        return React.cloneElement(children, {
            onClick: (e) => {
                children.props.onClick && children.props.onClick(e);
                toggle();
            },
            ref: triggerRef,
            ...props
        });
    }

    return (
        <button ref={triggerRef} onClick={toggle} {...props}>
            {children}
        </button>
    );
};

export const PopoverContent = ({ children, className, ...props }) => {
    const { isOpen, contentRef } = useContext(PopoverContext);

    if (!isOpen) return null;

    return (
        <div
            ref={contentRef}
            className={cn(
                "absolute z-50 mt-2 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};
