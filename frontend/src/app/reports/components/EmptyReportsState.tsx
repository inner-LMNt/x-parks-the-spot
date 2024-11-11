import { AlertCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

const EmptyReportsState = ({
                               hasReports = false,
                               onClearFilters,
                               onCreateReport
                           }) => {
    return (
        <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="w-12 h-12 mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <Search className="w-6 h-6 text-slate-600" />
            </div>

            <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {hasReports ? 'No matching reports found' : 'No reports yet'}
            </h3>

            <p className="text-slate-600 text-center mb-6 max-w-sm">
                {hasReports
                    ? 'Try adjusting your filters to see more reports or create a new report if you need to report an issue.'
                    : 'Need to report an issue? Click below to create your first report.'}
            </p>

            <div className="flex gap-3">
                {hasReports && (
                    <Button
                        variant="outline"
                        className="flex items-center gap-2 text-slate-950"
                        onClick={onClearFilters}
                    >
                        <Search className="w-4 h-4" />
                        Clear Filters
                    </Button>
                )}

                <Button
                    className="flex items-center gap-2"
                    onClick={onCreateReport}
                >
                    <AlertCircle className="w-4 h-4" />
                    New Report
                </Button>
            </div>
        </div>
    );
};

export default EmptyReportsState;