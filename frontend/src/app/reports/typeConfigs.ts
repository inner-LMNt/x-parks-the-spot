export const REPORT_TYPE_CONFIGS: Record<string, (data: any) => any> = {
  "Reservation Issue": (data) => ({
    title: "Reservation Issue",
    fields: [
      { label: "Reservation", value: data.reservation_id },
      { label: "Description", value: data.description },
    ],
  }),
  "Renter Overstay": (data) => ({
    title: "Renter Overstay Report",
    fields: [
      { label: "Reservation", value: data.owner_reservation_id },
      {
        label: "Expected Departure",
        value: new Date(data.departure_time).toLocaleString(),
      },
      {
        label: "Overstay Duration",
        value: `${data.overstay_duration} minutes`,
      },
      {
        label: "Photo Evidence",
        value: data.image ? "Attached" : "Not attached",
      },
      { label: "Description", value: data.description },
    ],
  }),
  "Damage Report": (data) => ({
    title: "Damage Report",
    fields: [
      { label: "Reservation", value: data.owner_reservation_id },
      { label: "Damage Type", value: data.damage_type },
      { label: "Severity", value: data.damage_severity },
      {
        label: "Photo Evidence",
        value: data.image ? "Attached" : "Not attached",
      },
      { label: "Description", value: data.description },
    ],
  }),
  Other: (data) => ({
    title: "Other Issue",
    fields: [{ label: "Description", value: data.description }],
  }),
}
