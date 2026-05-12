import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { saveQueue, getQueue, clearQueue } from '@/services/emailQueuePersistence';

import { saveLabProcessLog, updateLabProcessLog } from '@/services/labProcessService';

const EmailContext = createContext();

export function EmailProvider({ children }) {
    const [sending, setSending] = useState(false);
    const [progress, setProgress] = useState({ total: 0, current: 0 });
    const [status, setStatus] = useState('idle'); // idle, sending, success, error, interrupted
    const [error, setError] = useState(null);
    const [visible, setVisible] = useState(false);
    const [interruptedQueue, setInterruptedQueue] = useState(null);

    const [batchProgress, setBatchProgress] = useState(0); // 0-100 for current batch
    const [isDelivering, setIsDelivering] = useState(false); // True when upload is 100% but XHR is pending
    const [taskLogs, setTaskLogs] = useState({}); // Mapping of index -> log.id

    // Warning before refresh if sending
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (sending) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [sending]);

    const sendEmailQueue = useCallback(async (tasks, { onBatchStart, onBatchSuccess, onBatchError, startAt = 0, initialTaskLogs = {} } = {}) => {
        setSending(true);
        setStatus('sending');
        setError(null);
        setProgress({ total: tasks.length, current: startAt });
        setBatchProgress(0);
        setIsDelivering(false);
        setVisible(true);
        setInterruptedQueue(null);

        let currentTaskLogs = { ...initialTaskLogs };
        setTaskLogs(currentTaskLogs);

        // Initial save to persistence
        await saveQueue(tasks, startAt, currentTaskLogs);

        try {
            for (let i = startAt; i < tasks.length; i++) {
                const task = tasks[i];
                let success = false;
                let lastError = null;
                const maxRetries = 3;

                // Auto-logging: IN PROGRESS (if not already logged)
                if (!currentTaskLogs[i]) {
                    const log = await saveLabProcessLog(
                        "IN PROGRESS",
                        task.categoryName,
                        task.recipient,
                        task.batchSummary,
                        task.files
                    );
                    if (log) {
                        currentTaskLogs[i] = log.id;
                        setTaskLogs({ ...currentTaskLogs });
                        await saveQueue(tasks, i, currentTaskLogs);
                    }
                }

                if (onBatchStart) onBatchStart(task, i);

                for (let attempt = 1; attempt <= maxRetries; attempt++) {
                    try {
                        setIsDelivering(false);
                        setBatchProgress(0);

                        await new Promise((resolve, reject) => {
                            const xhr = new XMLHttpRequest();
                            xhr.open("POST", "/api/lab-process/send-email", true);
                            
                            const token = localStorage.getItem("token");
                            if (token) {
                                xhr.setRequestHeader("Authorization", `Bearer ${token}`);
                            }

                            xhr.upload.onprogress = (event) => {
                                if (event.lengthComputable) {
                                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                                    setBatchProgress(percentComplete);
                                    if (percentComplete === 100) {
                                        setIsDelivering(true);
                                    }
                                }
                            };

                            xhr.onload = () => {
                                setIsDelivering(false);
                                if (xhr.status >= 200 && xhr.status < 300) {
                                    resolve();
                                } else {
                                    let errorDetail = `Status ${xhr.status}`;
                                    try {
                                        const data = JSON.parse(xhr.responseText);
                                        errorDetail = data.error || data.message || errorDetail;
                                    } catch (e) {
                                        if (xhr.responseText && xhr.responseText.length < 100) {
                                            errorDetail = xhr.responseText;
                                        }
                                    }
                                    reject(new Error(errorDetail));
                                }
                            };

                            xhr.onerror = () => {
                                setIsDelivering(false);
                                reject(new Error("Network connection error"));
                            };

                            const formData = new FormData();
                            formData.append("recipient", task.recipient);
                            formData.append("subject", task.subject);
                            formData.append("body", task.body);
                            task.files.forEach(file => {
                                formData.append("files", file);
                            });

                            xhr.send(formData);
                        });

                        success = true;

                        // Auto-logging: Mailed
                        if (currentTaskLogs[i]) {
                            await updateLabProcessLog(currentTaskLogs[i], "Mailed");
                        }

                        if (onBatchSuccess) onBatchSuccess(task, i);
                        break; // Exit retry loop
                    } catch (err) {
                        lastError = err.message;
                        if (attempt < maxRetries) {
                            await new Promise(r => setTimeout(r, 2000));
                        }
                    }
                }

                if (!success) {
                    // Auto-logging: Failed
                    if (currentTaskLogs[i]) {
                        await updateLabProcessLog(currentTaskLogs[i], "Failed");
                    }

                    if (onBatchError) onBatchError(task, i, lastError);
                    throw new Error(`${task.subject} failed after ${maxRetries} attempts: ${lastError}`);
                }

                const nextIndex = i + 1;
                setProgress(prev => ({ ...prev, current: nextIndex }));

                if (nextIndex < tasks.length) {
                    await saveQueue(tasks, nextIndex, currentTaskLogs);
                } else {
                    await clearQueue();
                }
            }
            setStatus('success');
        } catch (err) {
            setError(err.message);
            setStatus('error');
        } finally {
            setSending(false);
            setIsDelivering(false);
        }
    }, []);

    // Check for recovery on mount
    useEffect(() => {
        const checkRecovery = async () => {
            const data = await getQueue();
            if (data && data.tasks && data.currentIndex < data.tasks.length) {
                setInterruptedQueue(data);
                setTaskLogs(data.taskLogs || {});
                setStatus('interrupted');
                setProgress({ total: data.tasks.length, current: data.currentIndex });
                setVisible(true);
            }
        };
        checkRecovery();
    }, []);

    const resumeQueue = useCallback(async (callbacks = {}) => {
        if (!interruptedQueue) return;
        const { tasks, currentIndex, taskLogs: savedTaskLogs } = interruptedQueue;
        await sendEmailQueue(tasks, { ...callbacks, startAt: currentIndex, initialTaskLogs: savedTaskLogs });
    }, [interruptedQueue, sendEmailQueue]);

    const closeWidget = useCallback(() => {
        setVisible(false);
        if (status === 'success' || status === 'error' || status === 'interrupted') {
            setStatus('idle');
            setError(null);
            if (status === 'interrupted') {
                clearQueue().then(() => setInterruptedQueue(null));
            }
        }
    }, [status]);

    return (
        <EmailContext.Provider value={{
            sending,
            progress,
            status,
            error,
            visible,
            batchProgress,
            isDelivering,
            sendEmailQueue,
            resumeQueue,
            closeWidget,
            interrupted: status === 'interrupted'
        }}>
            {children}
        </EmailContext.Provider>
    );
}

export function useEmail() {
    const context = useContext(EmailContext);
    if (!context) {
        throw new Error('useEmail must be used within an EmailProvider');
    }
    return context;
}
