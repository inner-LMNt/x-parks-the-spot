import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';

interface DescriptionFieldProps {
    form: any;
}

export const DescriptionField = ({ form }: DescriptionFieldProps) => (
    <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
            <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                    <Textarea
                        placeholder="Describe the issue"
                        {...field}
                        className="h-24"
                    />
                </FormControl>
                <FormMessage />
            </FormItem>
        )}
    />
);