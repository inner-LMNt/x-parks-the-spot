import { z } from 'zod';

const MAX_FILE_SIZE = 5000000; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const ImageSchema = z.any()
    .refine((file) => file instanceof File, 'Please upload a file')
    .refine((file) => file.size <= MAX_FILE_SIZE, 'Max file size is 5MB')
    .refine(
        (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
        'Only .jpg, .jpeg, .png and .webp files are accepted'
    );

export const FormSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('Reservation Issue'),
        reservation_id: z.string().nonempty('Please select a reservation.'),
        description: z.string().min(10, 'Description must be at least 10 characters long.'),
    }),
    z.object({
        type: z.literal('Renter Overstay'),
        owner_reservation_id: z.string().nonempty('Please select a reservation.'),
        departure_time: z.string().nonempty('Please provide departure time.'),
        image: ImageSchema,
        description: z.string().min(10, 'Description must be at least 10 characters long.'),
    }),
    z.object({
        type: z.literal('Damage Report'),
        owner_reservation_id: z.string().nonempty('Please select a reservation.'),
        damage_type: z.string().nonempty('Please specify damage type.'),
        damage_severity: z.enum(['Minor', 'Moderate', 'Severe'], {
            required_error: 'Please specify damage severity.',
        }),
        image: ImageSchema,
        description: z.string().min(10, 'Description must be at least 10 characters long.'),
    }),
    z.object({
        type: z.literal('Other'),
        description: z.string().min(10, 'Description must be at least 10 characters long.'),
    }),
]);