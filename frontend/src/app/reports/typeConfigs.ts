export const REPORT_TYPE_CONFIGS: Record<string, (data: any) => any> = {
    "Reservation Issue": (data) => ({
        title: "Reservation Issue",
        fields: [
            { label: "Type of Issue", value: data.type },
            { label: "Reservation", value: data.reservation_id },
            { label: "Description", value: data.description }
        ]
    }),
    "Renter Overstay": (data) => ({
        title: "Renter Overstay Report",
        fields: [
            { label: "Original End Time", value: data.originalEndTime },
            { label: "Current Time", value: data.currentTime },
            { label: "Overstay Duration", value: data.overstayDuration },
        ]
    }),
    "Damage Report": (data) => ({
        title: "Damage Report",
        fields: [
            { label: "Severity", value: data.severity },
            { label: "Location", value: data.location },
            { label: "Description", value: data.description }
        ]
    })
};