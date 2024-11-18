from xpark.utils.db import DB
from psycopg.rows import dict_row
from typing import Dict, Any, Optional
import uuid
from result import Result, Ok, Err
from datetime import datetime, timedelta, timezone


def get_dashboard_analytics(
    user_id: uuid.UUID,
    time_filter: str = "30_days",
    spot_id: Optional[uuid.UUID] = None,
) -> Result[Dict[str, Any], str]:
    time_deltas = {
        "7_days": timedelta(days=7),
        "30_days": timedelta(days=30),
        "1_year": timedelta(days=365),
    }
    if time_filter not in time_deltas:
        return Err("Invalid time filter. Use '7_days', '30_days', or '1_year'.")

    # Calculate start_date and end_date
    now = datetime.now(timezone.utc)
    start_date = now - time_deltas[time_filter]
    end_date = now

    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            # Prepare spot filter
            spot_filter_sql = ""
            if spot_id:
                spot_filter_sql = "AND ps.id = %s"

            # ==== Overall Revenue Metrics ====
            overall_params = [user_id, start_date, end_date]
            if spot_id:
                overall_params.append(spot_id)
            cur.execute(
                f"""
                SELECT 
                    COALESCE(SUM(r.price), 0) AS total_revenue,
                    COUNT(*) AS total_bookings,
                    CASE 
                        WHEN COUNT(*) > 0 THEN SUM(r.price) / COUNT(*)
                        ELSE 0 
                    END AS revenue_per_booking,
                    COALESCE(SUM(CASE WHEN r.status = 'active' THEN 1 ELSE 0 END), 0) AS active_bookings,
                    COALESCE(AVG(EXTRACT(EPOCH FROM UPPER(r.time) - LOWER(r.time))/3600), 0) AS avg_duration,
                    COALESCE(SUM(CASE WHEN r.status = 'completed' THEN 1 ELSE 0 END), 0) AS completed_bookings,
                    COALESCE(SUM(CASE WHEN r.status = 'canceled' THEN 1 ELSE 0 END), 0) AS canceled_bookings,
                    CASE 
                        WHEN COUNT(*) > 0 
                        THEN (COALESCE(SUM(CASE WHEN r.status = 'active' THEN 1 ELSE 0 END), 0)::float / COUNT(*)) * 100 
                        ELSE 0 
                    END AS percentage_active,
                    CASE 
                        WHEN COUNT(*) > 0 
                        THEN (COALESCE(SUM(CASE WHEN r.status = 'completed' THEN 1 ELSE 0 END), 0)::float / COUNT(*)) * 100 
                        ELSE 0 
                    END AS completion_rate
                FROM reservations r
                JOIN parking_spaces ps ON r.parking_space_id = ps.id
                WHERE ps.owner = %s 
                  AND ps.is_paid = TRUE 
                  AND LOWER(r.time) BETWEEN %s AND %s
                  {spot_filter_sql}
                """,
                overall_params,
            )
            overall = cur.fetchone() or {}

            # Set default values
            overall_defaults = {
                "total_revenue": 0,
                "revenue_per_booking": 0,
                "total_bookings": 0,
                "active_bookings": 0,
                "completed_bookings": 0,
                "canceled_bookings": 0,
                "percentage_active": 0,
                "avg_duration": 0,
                "completion_rate": 0,
            }
            for key, default in overall_defaults.items():
                overall.setdefault(key, default)

            # ==== Revenue Trends (Monthly) ====
            monthly_params = [user_id, start_date, end_date]
            if spot_id:
                monthly_params.append(spot_id)
            cur.execute(
                f"""
                SELECT 
                    TO_CHAR(DATE_TRUNC('month', LOWER(r.time)), 'Mon YYYY') AS month,
                    COALESCE(SUM(r.price), 0) AS revenue,
                    COUNT(*) AS bookings
                FROM reservations r
                JOIN parking_spaces ps ON r.parking_space_id = ps.id
                WHERE ps.owner = %s 
                  AND ps.is_paid = TRUE 
                  AND LOWER(r.time) BETWEEN %s AND %s
                  {spot_filter_sql}
                GROUP BY DATE_TRUNC('month', LOWER(r.time))
                ORDER BY DATE_TRUNC('month', LOWER(r.time))
                """,
                monthly_params,
            )
            monthly_revenue = cur.fetchall()

            # ==== Revenue Trends (Daily) ====
            daily_params = [user_id, start_date, end_date]
            if spot_id:
                daily_params.append(spot_id)
            cur.execute(
                f"""
                SELECT 
                    TO_CHAR(DATE_TRUNC('day', LOWER(r.time)), 'YYYY-MM-DD') AS date,
                    COALESCE(SUM(r.price), 0) AS revenue
                FROM reservations r
                JOIN parking_spaces ps ON r.parking_space_id = ps.id
                WHERE ps.owner = %s 
                  AND ps.is_paid = TRUE 
                  AND LOWER(r.time) BETWEEN %s AND %s
                  {spot_filter_sql}
                GROUP BY DATE_TRUNC('day', LOWER(r.time))
                ORDER BY DATE_TRUNC('day', LOWER(r.time))
                """,
                daily_params,
            )
            daily_revenue = cur.fetchall()

            # ==== Revenue Trends (Hourly) ====
            hourly_params = [user_id, start_date, end_date]
            if spot_id:
                hourly_params.append(spot_id)
            cur.execute(
                f"""
                    WITH hours AS (
                        SELECT generate_series(0, 23) AS hour
                    )
                    SELECT 
                        h.hour,
                        COALESCE(SUM(r.price), 0) AS revenue,
                        COALESCE(COUNT(r.id), 0) AS bookings
                    FROM hours h
                    LEFT JOIN reservations r 
                        ON h.hour = EXTRACT(HOUR FROM LOWER(r.time))::integer
                    JOIN parking_spaces ps 
                        ON r.parking_space_id = ps.id
                    WHERE ps.owner = %s 
                      AND ps.is_paid = TRUE 
                      AND LOWER(r.time) BETWEEN %s AND %s
                      {spot_filter_sql}
                    GROUP BY h.hour
                    ORDER BY h.hour
                """,
                hourly_params,
            )
            hourly_revenue = cur.fetchall()

            # ==== Spot Performance and Revenue by Spot ====
            # Adjusted parameters to include end_date
            spot_params = [start_date, end_date, start_date, end_date, user_id]
            cur.execute(
                f"""
                SELECT 
                    ps.id AS spot_id,
                    ps.name AS spot_name,
                    ps.price AS base_price,
                    COALESCE(COUNT(r.id), 0) AS total_bookings,
                    COALESCE(SUM(r.price), 0) AS total_revenue,
                    COALESCE(SUM(CASE WHEN r.status = 'active' THEN 1 ELSE 0 END), 0) AS active_bookings,
                    COALESCE(SUM(CASE WHEN r.status = 'completed' THEN 1 ELSE 0 END), 0) AS completed_bookings,
                    COALESCE(SUM(CASE WHEN r.status = 'canceled' THEN 1 ELSE 0 END), 0) AS canceled_bookings,
                    COALESCE(AVG(EXTRACT(EPOCH FROM UPPER(r.time) - LOWER(r.time))/3600), 0) AS average_booking_length,
                    ARRAY_AGG(EXTRACT(HOUR FROM LOWER(r.time))::integer) FILTER (WHERE r.id IS NOT NULL) AS popular_hours,
                    ARRAY_AGG(TO_CHAR(LOWER(r.time), 'Day')) FILTER (WHERE r.id IS NOT NULL) AS popular_days,
                    (COALESCE(COUNT(r.id), 0)::float / NULLIF(EXTRACT(DAYS FROM %s - %s), 0)) * 100 AS occupancy_rate
                FROM parking_spaces ps
                LEFT JOIN reservations r 
                    ON ps.id = r.parking_space_id 
                    AND LOWER(r.time) BETWEEN %s AND %s
                WHERE ps.owner = %s 
                  AND ps.is_paid = TRUE 
                  {spot_filter_sql}
                GROUP BY ps.id, ps.name, ps.price
                """,
                spot_params,
            )
            spot_metrics_rows = cur.fetchall()

            # Process spot_metrics_rows to create spot_performance and revenue_by_spot
            spot_performance = {}
            revenue_by_spot = []
            overall_occupancy_rate = 0
            for row in spot_metrics_rows:
                spot_id_str = str(row["spot_id"])
                occupancy_rate = row.get("occupancy_rate") or 0
                overall_occupancy_rate += occupancy_rate
                # Process popular hours and days
                popular_hours = []
                hours = row.get("popular_hours") or []
                for hour in set(hours):
                    popular_hours.append(
                        {"hour": int(hour), "bookings": hours.count(hour)}
                    )
                popular_days = []
                days = row.get("popular_days") or []
                for day in set(days):
                    popular_days.append(
                        {"day": day.strip(), "bookings": days.count(day)}
                    )
                spot_performance[spot_id_str] = {
                    "totalRevenue": row.get("total_revenue") or 0,
                    "totalBookings": row.get("total_bookings") or 0,
                    "occupancyRate": occupancy_rate,
                    "averageBookingLength": row.get("average_booking_length") or 0,
                    "activeBookings": row.get("active_bookings") or 0,
                    "completedBookings": row.get("completed_bookings") or 0,
                    "canceledBookings": row.get("canceled_bookings") or 0,
                    "popularHours": popular_hours,
                    "popularDays": popular_days,
                }
                revenue_by_spot.append(
                    {
                        "spotId": spot_id_str,
                        "spotName": row.get("spot_name"),
                        "revenue": row.get("total_revenue") or 0,
                        "bookings": row.get("total_bookings") or 0,
                        "occupancyRate": occupancy_rate,
                        "basePrice": row.get("base_price"),
                    }
                )

            # Calculate overall occupancy rate
            overall_occupancy_rate = (
                int(overall_occupancy_rate / len(spot_metrics_rows))
                if spot_metrics_rows
                else 0
            )

            # ==== Recent Bookings ====
            recent_params = [user_id, start_date, end_date]
            if spot_id:
                recent_params.append(spot_id)
            cur.execute(
                f"""
                SELECT 
                    r.id,
                    r.parking_space_id AS "spotId",
                    ps.name AS "spotName",
                    u.name AS "renterName",
                    LOWER(r.time) AS "startTime",
                    UPPER(r.time) AS "endTime",
                    r.status,
                    r.price,
                    EXTRACT(EPOCH FROM UPPER(r.time) - LOWER(r.time))/3600 AS duration,
                    json_build_object(
                        'make', c.make,
                        'model', c.model,
                        'color', c.color
                    ) AS "carDetails"
                FROM reservations r
                JOIN parking_spaces ps ON r.parking_space_id = ps.id
                LEFT JOIN users u ON r.renter_id = u.id
                LEFT JOIN cars c ON r.car_info_id = c.id
                WHERE ps.owner = %s 
                  AND ps.is_paid = TRUE 
                  AND LOWER(r.time) BETWEEN %s AND %s
                  {spot_filter_sql}
                ORDER BY LOWER(r.time) DESC
                LIMIT 10
                """,
                recent_params,
            )
            recent_bookings_rows = cur.fetchall()

            # ==== Upcoming Earnings (next 7 days) ====
            upcoming_params = [user_id]
            if spot_id:
                upcoming_params.append(spot_id)
            cur.execute(
                f"""
                SELECT 
                    ps.name AS spot_name,
                    LOWER(r.time) AS start_time,
                    UPPER(r.time) AS end_time,
                    r.price AS earnings
                FROM reservations r
                JOIN parking_spaces ps ON r.parking_space_id = ps.id
                WHERE ps.owner = %s 
                  AND ps.is_paid = TRUE 
                  AND r.status NOT IN ('canceled') 
                  AND LOWER(r.time) >= NOW() 
                  AND LOWER(r.time) <= NOW() + INTERVAL '7 days'
                  {spot_filter_sql}
                ORDER BY LOWER(r.time)
                """,
                upcoming_params,
            )
            upcoming_earnings_rows = cur.fetchall()

            total_upcoming_earnings = sum(
                [row["earnings"] for row in upcoming_earnings_rows]
            )

            # ==== Overall Average Ratings ====
            rating_params = [user_id, start_date, end_date]
            if spot_id:
                rating_params.append(spot_id)
            cur.execute(
                f"""
                SELECT 
                    COALESCE(AVG(r.availability_rating), 0) AS avg_availability_rating,
                    COALESCE(AVG(r.cleanliness_rating), 0) AS avg_cleanliness_rating,
                    COALESCE(AVG(r.total_rating), 0) AS avg_total_rating,
                    COUNT(*) AS total_ratings
                FROM ratings r
                JOIN parking_spaces ps ON r.parking_space_id = ps.id
                WHERE ps.owner = %s 
                  AND ps.is_paid = TRUE 
                  AND r.updated_at > %s 
                  AND r.updated_at < %s
                  {spot_filter_sql}
                """,
                rating_params,
            )
            overall_ratings = cur.fetchone() or {}

            # ==== Ratings By Spot ====
            ratings_by_spot_params = [start_date, end_date, user_id]
            if spot_id:
                ratings_by_spot_params.append(spot_id)
            cur.execute(
                f"""
                SELECT 
                    ps.id AS spot_id,
                    ps.name AS spot_name,
                    COALESCE(AVG(r.availability_rating), 0) AS avg_availability_rating,
                    COALESCE(AVG(r.cleanliness_rating), 0) AS avg_cleanliness_rating,
                    COALESCE(AVG(r.total_rating), 0) AS avg_total_rating,
                    COUNT(r.id) AS rating_count
                FROM parking_spaces ps
                LEFT JOIN ratings r 
                    ON ps.id = r.parking_space_id 
                AND r.updated_at > %s 
                AND r.updated_at < %s
                WHERE ps.owner = %s 
                  AND ps.is_paid = TRUE 
                  {spot_filter_sql}
                GROUP BY ps.id, ps.name
                """,
                ratings_by_spot_params,
            )
            ratings_by_spot_rows = cur.fetchall()

            # Rating Distribution and Recent Reviews per Spot
            ratings_by_spot = []
            for spot_row in ratings_by_spot_rows:
                spot_id_str = str(spot_row["spot_id"])
                # Rating Distribution
                cur.execute(
                    """
                    SELECT 
                        FLOOR(r.total_rating)::int AS stars,
                        COUNT(*) AS count
                    FROM ratings r
                    WHERE r.parking_space_id = %s 
                    AND r.updated_at > %s 
                    AND r.updated_at < %s
                    GROUP BY stars
                    ORDER BY stars DESC
                    """,
                    [spot_row["spot_id"], start_date, end_date],
                )
                rating_distribution_rows = cur.fetchall()
                total_ratings = sum([row["count"] for row in rating_distribution_rows])
                rating_distribution = []
                for row in rating_distribution_rows:
                    stars = row["stars"]
                    count = row["count"]
                    percentage = (
                        (count / total_ratings) * 100 if total_ratings > 0 else 0
                    )
                    rating_distribution.append(
                        {"stars": stars, "count": count, "percentage": percentage}
                    )

                # Recent Reviews
                cur.execute(
                    """
                    SELECT 
                        r.total_rating AS rating,
                        EXTRACT(DAY FROM NOW() - r.created_at) AS days_ago,
                        TRUE AS is_verified
                    FROM ratings r
                    WHERE r.parking_space_id = %s 
                    AND r.updated_at > %s 
                    AND r.updated_at < %s
                    ORDER BY r.created_at DESC
                    LIMIT 5
                    """,
                    [spot_row["spot_id"], start_date, end_date],
                )
                recent_reviews = cur.fetchall()

                ratings_by_spot.append(
                    {
                        "spotId": spot_id_str,
                        "spotName": spot_row["spot_name"],
                        "availabilityRating": float(spot_row["avg_availability_rating"]),
                        "cleanlinessRating": float(spot_row["avg_cleanliness_rating"]),
                        "totalRating": float(spot_row["avg_total_rating"]),
                        "ratingCount": spot_row["rating_count"],
                        "ratingDistribution": rating_distribution,
                        "recentReviews": [
                            {
                                "rating": review["rating"],
                                "daysAgo": review["days_ago"],
                                "isVerified": review["is_verified"],
                            }
                            for review in recent_reviews
                        ],
                    }
                )

            rating_metrics = {
                "averageRatings": {
                    "availability": float(
                        overall_ratings.get("avg_availability_rating", 0)
                    ),
                    "cleanliness": float(
                        overall_ratings.get("avg_cleanliness_rating", 0)
                    ),
                    "total": float(overall_ratings.get("avg_total_rating", 0)),
                },
                "totalRatings": overall_ratings.get("total_ratings", 0),
                "ratingsBySpot": ratings_by_spot,
            }

            # ==== Construct the Final Response ====
            return Ok(
                {
                    "overallMetrics": {
                        "revenue": {
                            "total": overall["total_revenue"],
                            "perBooking": overall["revenue_per_booking"],
                            "trends": [
                                {
                                    "date": item.get("month", ""),
                                    "revenue": float(item.get("revenue", 0)),
                                    "bookings": item.get("bookings", 0),
                                }
                                for item in monthly_revenue
                            ],
                        },
                        "occupancy": {
                            "overallRate": overall_occupancy_rate,
                            "popularTimes": [
                                {
                                    "hour": item.get("hour", 0),
                                    "bookings": item.get("bookings", 0),
                                }
                                for item in hourly_revenue
                            ],
                        },
                        "bookings": {
                            "active": overall["active_bookings"],
                            "total": overall["total_bookings"],
                            "percentageActive": overall["percentage_active"],
                        },
                    },
                    "revenueMetrics": {
                        "monthlyRevenue": [
                            {
                                "month": item.get("month", ""),
                                "revenue": float(item.get("revenue", 0)),
                                "bookings": item.get("bookings", 0),
                            }
                            for item in monthly_revenue
                        ],
                        "dailyRevenue": [
                            {
                                "date": item.get("date", ""),
                                "revenue": float(item.get("revenue", 0)),
                            }
                            for item in daily_revenue
                        ],
                        "hourlyRevenue": [
                            {
                                "hour": item.get("hour", 0),
                                "revenue": float(item.get("revenue", 0)),
                                "bookings": item.get("bookings", 0),
                            }
                            for item in hourly_revenue
                        ],
                        "revenueBySpot": revenue_by_spot,
                    },
                    "bookingMetrics": {
                        "stats": {
                            "total": overall["total_bookings"],
                            "active": overall["active_bookings"],
                            "completed": overall["completed_bookings"],
                            "canceled": overall["canceled_bookings"],
                            "avgDuration": float(overall["avg_duration"]),
                            "completionRate": float(overall["completion_rate"]),
                        },
                        "recentBookings": [
                            {
                                "id": booking["id"],
                                "spotId": str(booking["spotId"]),
                                "spotName": booking["spotName"],
                                "renterName": booking["renterName"],
                                "startTime": booking["startTime"].isoformat(),
                                "endTime": booking["endTime"].isoformat(),
                                "status": booking["status"],
                                "price": float(booking["price"]),
                                "duration": float(booking["duration"]),
                                "carDetails": booking["carDetails"],
                            }
                            for booking in recent_bookings_rows
                        ],
                    },
                    "spotPerformance": spot_performance,
                    "upcomingEarnings": {
                        "total": float(total_upcoming_earnings),
                        "reservations": [
                            {
                                "spotName": earning["spot_name"],
                                "startTime": earning["start_time"].isoformat(),
                                "endTime": earning["end_time"].isoformat(),
                                "earnings": float(earning["earnings"]),
                            }
                            for earning in upcoming_earnings_rows
                        ],
                    },
                    "ratingMetrics": rating_metrics,
                }
            )
