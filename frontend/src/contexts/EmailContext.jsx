import React, { createContext, useContext, useState, useCallback } from 'react';

const EmailContext = createContext();

export function EmailProvider({ children }) {
    const [sending, setSending] = useState(false);
    const [progress, setProgress] = useState({ total: 0, current: 0 });
    const [status, setStatus] = useState('idle'); // idle, sending, success, error
    const [error, setError] = useState(null);
    const [visible, setVisible] = useState(false);

    const [batchProgress, setBatchProgress] = useState(0); // 0-100 for current batch
    const [isDelivering, setIsDelivering] = useState(false); // True when upload is 100% but XHR is pending

    const sendEmailQueue = useCallback(async (tasks) => {
        setSending(true);
        setStatus('sending');
        setError(null);
        setProgress({ total: tasks.length, current: 0 });
        setBatchProgress(0);
        setIsDelivering(false);
        setVisible(true);

        try {
            for (let i = 0; i < tasks.length; i++) {
                const task = tasks[i];
                setIsDelivering(false);
                setBatchProgress(0);

                // Use XMLHttpRequest to track upload progress
                await new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open("POST", "/api/lab-process/send-email", true);

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
                            let errorMsg = `Batch ${i + 1} failed`;
                            try {
                                const data = JSON.parse(xhr.responseText);
                                errorMsg = data.error || errorMsg;
                            } catch (e) { }
                            reject(new Error(errorMsg));
                        }
                    };

                    xhr.onerror = () => {
                        setIsDelivering(false);
                        reject(new Error(`Network error sending batch ${i + 1}`));
                    };

                    xhr.send(task.formData);
                });

                setProgress(prev => ({ ...prev, current: i + 1 }));
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

    const closeWidget = useCallback(() => {
        setVisible(false);
        if (status === 'success' || status === 'error') {
            setStatus('idle');
            setError(null);
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
            closeWidget
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
