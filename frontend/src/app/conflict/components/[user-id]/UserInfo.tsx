import React from "react";

interface UserDetails {
    id: string;
    name: string;
    email: string;
    pastBookings?: any[];
    parkingSpaces?: any[];
    reports?: any[];
}

const UserInfo: React.FC<{ userId: string; userDetails?: UserDetails }> = ({ userId, userDetails }) => {
    // Dummy data
    const dummyData: UserDetails = {
        id: "dummy-id",
        name: "John Doe",
        email: "john.doe@example.com",
        pastBookings: [{ id: 1, name: "Dummy Booking 1" }],
        parkingSpaces: [{ id: 1, name: "Dummy Parking Space 1" }],
        reports: [{ id: 1, description: "Dummy Report 1" }],
    };

    // Use either provided userDetails or dummy data
    const details = userDetails || dummyData;

    return (
        <div>
            <h1>User Info</h1>
            {details ? (
                <div>
                    <h2>{details.name}</h2>
                    <p>Email: {details.email}</p>
                    <h3>Past Bookings</h3>
                    {details.pastBookings?.length ? (
                        details.pastBookings.map((booking) => (
                            <p key={booking.id}>{JSON.stringify(booking)}</p>
                        ))
                    ) : (
                        <p>No past bookings available.</p>
                    )}
                    <h3>Parking Spaces</h3>
                    {details.parkingSpaces?.length ? (
                        details.parkingSpaces.map((space) => (
                            <p key={space.id}>{JSON.stringify(space)}</p>
                        ))
                    ) : (
                        <p>No parking spaces available.</p>
                    )}
                    <h3>Reports</h3>
                    {details.reports?.length ? (
                        details.reports.map((report) => (
                            <p key={report.id}>{JSON.stringify(report)}</p>
                        ))
                    ) : (
                        <p>No reports available.</p>
                    )}
                </div>
            ) : (
                <p>User details not found.</p>
            )}
        </div>
    );
};

export default UserInfo;
