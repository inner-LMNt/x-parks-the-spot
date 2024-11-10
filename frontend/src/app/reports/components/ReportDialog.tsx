'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ScrollArea } from "@/components/ui/scroll-area";
import { ReportForm } from './ReportForm';
import { X } from 'lucide-react';

export const ReportDialog = ({
                                 isOpen,
                                 onClose,
                                 preselectedReservation = null,
                                 preselectedType = null
                             }) => {
    if (!isOpen) return null;

    return (
        <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <Card className="w-[32rem] max-h-[80vh] flex flex-col bg-white rounded-lg shadow-lg">
                <div className="flex items-start justify-between p-6 pb-0">
                    <CardHeader className="p-0">
                        <CardTitle className="text-xl text-slate-950">
                            Report an Issue
                        </CardTitle>
                        <CardDescription className="text-slate-600">
                            Select the type of issue and provide the necessary details.
                        </CardDescription>
                    </CardHeader>

                    <button
                        type="button"
                        className="text-gray-500 hover:text-gray-700"
                        onClick={onClose}
                        aria-label="Close Report Dialog"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex-1 px-6 pb-6 overflow-y-auto">
                    <CardContent className="p-0">
                        <ReportForm
                            onClose={onClose}
                            preselectedReservation={preselectedReservation}
                            preselectedType={preselectedType}
                        />
                    </CardContent>
                </div>
            </Card>
        </motion.div>
    );
};

export default ReportDialog;