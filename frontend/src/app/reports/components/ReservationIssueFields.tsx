import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ReservationsGroupSelect } from "./ReservationsGroupSelect";

interface ReservationIssueFieldsProps {
  form: any;
  reservations: any[];
  reservationsLoading: boolean;
}

export const ReservationIssueFields = ({
  form,
}: ReservationIssueFieldsProps) => (
  <FormField
    control={form.control}
    name="reservation_id"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Select Reservation</FormLabel>
        <FormControl>
          <ReservationsGroupSelect
            onChange={field.onChange}
            value={field.value}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);
