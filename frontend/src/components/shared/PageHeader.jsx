import React from 'react';

export function PageHeader({ title, children, className = "" }) {
    return (
        <div className={`flex flex-col gap-4 p-4 border-b bg-background md:flex-row md:items-center md:justify-between ${className}`}>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
                {children}
            </div>
        </div>
    );
}
