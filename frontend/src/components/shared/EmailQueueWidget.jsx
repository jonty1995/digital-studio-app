import React from 'react';
import { useEmail } from '@/contexts/EmailContext';
import { Mail, Loader2, CheckCircle, XCircle, X, Minimize2, Maximize2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export function EmailQueueWidget() {
    const { sending, progress, status, error, visible, batchProgress, isDelivering, closeWidget, interrupted, resumeQueue } = useEmail();
    const [isMinimized, setIsMinimized] = React.useState(false);

    if (!visible) return null;

    const getStatusConfig = () => {
        if (interrupted) {
            return {
                icon: <Mail className="w-4 h-4 text-orange-500" />,
                title: 'Queue Interrupted',
                color: 'text-orange-700',
                bgColor: 'bg-orange-50',
                border: 'border-orange-200'
            };
        }
        if (isDelivering && status === 'sending') {
            return {
                icon: <Send className="w-4 h-4 animate-pulse text-blue-600" />,
                title: 'Delivering to Lab...',
                color: 'text-blue-700',
                bgColor: 'bg-blue-50',
                border: 'border-blue-400'
            };
        }
        switch (status) {
            case 'sending':
                return {
                    icon: <Loader2 className="w-4 h-4 animate-spin text-blue-500" />,
                    title: 'Sending Emails...',
                    color: 'text-blue-700',
                    bgColor: 'bg-blue-50',
                    border: 'border-blue-200'
                };
            case 'success':
                return {
                    icon: <CheckCircle className="w-4 h-4 text-green-500" />,
                    title: 'Emails Sent Successfully',
                    color: 'text-green-700',
                    bgColor: 'bg-green-50',
                    border: 'border-green-200'
                };
            case 'error':
                return {
                    icon: <XCircle className="w-4 h-4 text-red-500" />,
                    title: 'Email Sending Failed',
                    color: 'text-red-700',
                    bgColor: 'bg-red-50',
                    border: 'border-red-200'
                };
            default:
                return {
                    icon: <Mail className="w-4 h-4 text-gray-500" />,
                    title: 'Email Process',
                    color: 'text-gray-700',
                    bgColor: 'bg-gray-50',
                    border: 'border-gray-200'
                };
        }
    };

    const config = getStatusConfig();
    const overallPercent = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

    return (
        <div className={`fixed bottom-4 left-4 z-[60] ${config.bgColor} border ${config.border} rounded-lg shadow-xl transition-all duration-300 w-80 flex flex-col overflow-hidden`}>
            <div className="flex items-center justify-between p-3 border-b border-inherit bg-white/40">
                <div className="flex items-center gap-2">
                    {config.icon}
                    <span className={`font-semibold text-sm ${config.color}`}>{config.title}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-black/5" onClick={() => setIsMinimized(!isMinimized)}>
                        {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                    </Button>
                    {!sending && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-black/5" onClick={closeWidget}>
                            <X className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>

            {!isMinimized && (
                <div className="p-4 space-y-4">
                    {status === 'sending' && (
                        <>
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    <span>Overall Progress</span>
                                    <span>{progress.current} / {progress.total} Emails</span>
                                </div>
                                <Progress value={overallPercent} className="h-1.5" />
                            </div>

                            <div className="space-y-1.5 p-2 bg-white/50 rounded border border-blue-100/50">
                                <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wider text-blue-600">
                                    <span>Current Batch Upload</span>
                                    <span>{batchProgress}%</span>
                                </div>
                                <Progress value={batchProgress} className="h-1.5 bg-blue-100/50" />
                            </div>
                        </>
                    )}

                    {status === 'error' && (
                        <div className="text-xs text-red-600 bg-red-100/50 p-2 rounded border border-red-200 italic">
                            {error}
                        </div>
                    )}

                    {status === 'success' && (
                        <p className="text-xs text-green-600">
                            All {progress.total} emails were delivered successfully.
                        </p>
                    )}

                    {interrupted && (
                        <div className="space-y-3">
                            <p className="text-xs text-orange-600 italic">
                                Page was refreshed. {progress.total - progress.current} batches are still pending.
                            </p>
                            <Button
                                onClick={() => resumeQueue()}
                                className="w-full bg-orange-600 hover:bg-orange-700 text-white h-8 text-xs gap-2"
                            >
                                <Send className="w-3.5 h-3.5" />
                                Resume Sending
                            </Button>
                        </div>
                    )}

                    {!sending && !interrupted && (
                        <div className="flex justify-end pt-1">
                            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={closeWidget}>
                                Clear and Close
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
