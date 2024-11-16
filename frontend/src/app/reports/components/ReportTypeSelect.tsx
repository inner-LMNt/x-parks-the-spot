'use client';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Clock, Settings, ShieldX } from 'lucide-react';

interface ReportTypeSelectProps {
    form: any;
    disabled?: boolean;
}

export const ReportTypeSelect = ({ form, disabled }: ReportTypeSelectProps) => (
    <FormField
        control={form.control}
        name="type"
        render={({ field }) => (
            <FormItem>
                <FormLabel>Type of Issue</FormLabel>
                <FormControl>
                    <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={disabled}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Reservation Issue">
                                <div className="flex items-center gap-2 text-slate-950">
                                    <AlertCircle className="w-4 h-4 text-green-600" />
                                    <span>Reservation Issue</span>
                                </div>
                            </SelectItem>
                            <SelectItem value="Renter Overstay">
                                <div className="flex items-center gap-2 text-slate-950">
                                    <Clock className="w-4 h-4 text-yellow-600" />
                                    <span>Renter Overstay</span>
                                </div>
                            </SelectItem>
                            <SelectItem value="Damage Report">
                                <div className="flex items-center gap-2 text-slate-950">
                                    <ShieldX className="w-4 h-4 text-red-600" />
                                    <span>Damage Report</span>
                                </div>
                            </SelectItem>
                            <SelectItem value="Other">
                                <div className="flex items-center gap-2 text-slate-950">
                                    <Settings className="w-4 h-4 text-gray-600" />
                                    <span>Other Issues</span>
                                </div>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </FormControl>
                <FormMessage />
            </FormItem>
        )}
    />
);