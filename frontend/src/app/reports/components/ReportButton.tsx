import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface ReportButtonProps {
    reservation: any;
    onReport: (reservation: any, type?: string) => void;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    reportType?: string;
}

export const ReportButton = ({
                                 reservation,
                                 onReport,
                                 variant = 'outline',
                                 size = 'sm',
                                 reportType
                             }: ReportButtonProps) => {
    return (
        <Button
            variant={variant}
            size={size}
            onClick={() => onReport(reservation, reportType)}
            className="flex items-center gap-2"
        >
            <AlertCircle className="w-4 h-4" />
            <span>Report Issue</span>
        </Button>
    );
};