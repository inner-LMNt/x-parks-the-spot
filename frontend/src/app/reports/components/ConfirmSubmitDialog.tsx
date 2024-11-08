import React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {AlertCircle} from "lucide-react";
import {Button} from "@/components/ui/button";
import {REPORT_TYPE_CONFIGS} from "../typeConfigs";


interface ConfirmSubmitDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    reportType: string;
    reportData: any;
    isSubmitting: boolean;
}


export const ConfirmSubmitDialog: React.FC<ConfirmSubmitDialogProps> = ({
                                                                     isOpen,
                                                                     onClose,
                                                                     onConfirm,
                                                                     reportType,
                                                                     reportData,
                                                                     isSubmitting
                                                                 }) => {
    // Get the report configuration based on type
    const getReportConfig = (type: string, data: any) => {
        // Normalize the type string to match our config keys
        const normalizedType = type.toString().trim();

        // Get the config generator or fall back to OTHER
        const configGenerator = REPORT_TYPE_CONFIGS[normalizedType] || REPORT_TYPE_CONFIGS["OTHER"];

        if (typeof configGenerator !== 'function') {
            console.error('Invalid config generator for type:', normalizedType);
            return REPORT_TYPE_CONFIGS["OTHER"](data);
        }

        return configGenerator(data);
    };

    const actualReportData = reportData.pendingSubmission || reportData;
    const reportConfig = getReportConfig(reportType, actualReportData);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-96">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-slate-100">
                        <AlertCircle className="w-5 h-5 text-yellow-500" />
                        {reportConfig.title}
                    </DialogTitle>
                    <DialogDescription className="text-slate-200">
                        Please review your report details before submitting:
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                    {reportConfig.fields.map((field : any, index: number) => (
                        <div key={index} className="space-y-1">
                            <p className="text-sm font-medium text-slate-200">
                                {field.label}
                            </p>
                            <p className="text-sm text-slate-300">
                                {field.value || 'Not specified'}
                            </p>
                        </div>
                    ))}
                </div>
                <DialogFooter className="flex justify-end gap-4">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="text-slate-950 w-24"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={onConfirm}
                        disabled={isSubmitting}
                        className="text-slate-100 w-24"
                    >
                        {isSubmitting ? "..." : "Confirm"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};