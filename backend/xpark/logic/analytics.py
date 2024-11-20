from xpark.utils.db import DB
from psycopg.rows import dict_row
from typing import Dict, Any, Optional
import uuid
from result import Result, Ok, Err
from datetime import datetime, timedelta, timezone


def get_dashboard_analytics(
    user_id: uuid.UUID,
    time_filter: str = "30_days",
    filter_ps_id: Optional[uuid.UUID] = None,
) -> Result[Dict[str, Any], str]:
    # Define time deltas
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

    params = {
        "user_id": user_id,
        "start_date": start_date,
        "end_date": end_date,
        "now": now,
        "next_7_days": now + timedelta(days=7),
        "time_delta": time_deltas[time_filter],
        "time_filter": time_filter,
        "filter_ps_id": filter_ps_id,  # Add the filter parameter
    }
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            # ==== Overall Revenue Metrics ====
            overall_params = [
                start_date,  # For total_possible_completions
                start_date,  # For first condition of total_relevant_bookings
                end_date + timedelta(days=7),  # For cancellation check
                start_date,  # For successful_completions
                user_id,  # For CTE WHERE clause
                filter_ps_id,  # Add filter parameter
                start_date,
                end_date + timedelta(days=7),  # For CTE date range
                user_id,  # For main query
                filter_ps_id,  # Add filter parameter
                start_date,
                end_date + timedelta(days=7),  # For main query
            ]
            cur.execute(
                f"""
                    WITH time_metrics AS (
                        SELECT 
                            -- Total reservations that could have been completed in period
                            COUNT(*) FILTER (
                                WHERE UPPER(r.time) < NOW() 
                                AND UPPER(r.time) > %s
                            ) as total_possible_completions,
                            -- Actually completed (including early cancellations as failures)
                            COUNT(*) FILTER (
                                WHERE (
                                    -- Completed normally
                                    (UPPER(r.time) < NOW() AND UPPER(r.time) > %s AND r.status != 'canceled')
                                    OR
                                    -- Or was cancelled during this period
                                    (r.status = 'canceled' AND LOWER(r.time) < %s)
                                )
                            ) as total_relevant_bookings,
                            -- Successfully completed (not canceled)
                            COUNT(*) FILTER (
                                WHERE UPPER(r.time) < NOW() 
                                AND UPPER(r.time) > %s
                                AND r.status != 'canceled'
                            ) as successful_completions
                        FROM reservations r
                        JOIN parking_spaces ps ON r.parking_space_id = ps.id
                        WHERE ps.owner = %s 
                          AND ps.is_paid = TRUE 
                          AND COALESCE(ps.id = %s, TRUE)
                          AND LOWER(r.time) BETWEEN %s AND %s
                    )
                    SELECT 
                        COALESCE(SUM(r.price), 0) AS total_revenue,
                        COUNT(*) AS total_bookings,
                        CASE 
                            WHEN COUNT(*) > 0 THEN SUM(r.price) / COUNT(*)
                            ELSE 0 
                        END AS revenue_per_booking,
                        -- Active bookings: currently ongoing
                        COALESCE(SUM(
                            CASE WHEN r.status != 'canceled' 
                                 AND LOWER(r.time) <= NOW() 
                                 AND UPPER(r.time) > NOW() 
                            THEN 1 ELSE 0 END
                        ), 0) AS active_bookings,
                        -- Average duration
                        COALESCE(AVG(
                            EXTRACT(EPOCH FROM UPPER(r.time) - LOWER(r.time))/3600
                        ), 0) AS avg_duration,
                        -- Completed: past bookings that weren't canceled
                        COALESCE(SUM(
                            CASE WHEN r.status != 'canceled' 
                                 AND UPPER(r.time) < NOW() 
                            THEN 1 ELSE 0 END
                        ), 0) AS completed_bookings,
                        -- Canceled bookings
                        COALESCE(SUM(
                            CASE WHEN r.status = 'canceled' 
                            THEN 1 ELSE 0 END
                        ), 0) AS canceled_bookings,
                        -- Percentage active (of non-canceled)
                        CASE WHEN COUNT(*) > 0 THEN
                            (COALESCE(SUM(
                                CASE WHEN r.status != 'canceled' 
                                     AND LOWER(r.time) <= NOW() 
                                     AND UPPER(r.time) > NOW() 
                                THEN 1 ELSE 0 END
                            ), 0)::float / 
                            NULLIF(COUNT(*) - COALESCE(SUM(
                                CASE WHEN r.status = 'canceled' 
                                THEN 1 ELSE 0 END
                            ), 0), 0)) * 100
                        ELSE 0 END AS percentage_active,
                        -- Completion rate: successful completions / (completed + relevant cancellations)
                        CASE 
                            WHEN tm.total_relevant_bookings > 0 
                            THEN (tm.successful_completions::float / tm.total_relevant_bookings) * 100
                            ELSE 0 
                        END AS completion_rate
                    FROM reservations r
                    JOIN parking_spaces ps ON r.parking_space_id = ps.id
                    CROSS JOIN time_metrics tm
                    WHERE ps.owner = %s 
                      AND ps.is_paid = TRUE
                      AND COALESCE(ps.id = %s, TRUE)
                      AND LOWER(r.time) BETWEEN %s AND %s
                    GROUP BY tm.total_relevant_bookings, tm.successful_completions
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

            # Add filter_ps_id to historical revenue query
            cur.execute(
                """
            WITH time_series AS (
                SELECT generate_series(
                    DATE_TRUNC(
                        CASE %(time_filter)s 
                            WHEN '7_days' THEN 'hour'
                            WHEN '30_days' THEN 'day'
                            ELSE 'month'
                        END,
                        %(start_date)s
                    ),
                    DATE_TRUNC(
                        CASE %(time_filter)s 
                            WHEN '7_days' THEN 'hour'
                            WHEN '30_days' THEN 'day'
                            ELSE 'month'
                        END,
                        %(end_date)s
                    ),
                    CASE %(time_filter)s 
                        WHEN '7_days' THEN '1 hour'::interval
                        WHEN '30_days' THEN '1 day'::interval
                        ELSE '1 month'::interval
                    END
                ) AS timestamp
            ),
            actual_revenue AS (
                SELECT 
                    DATE_TRUNC(
                        CASE %(time_filter)s 
                            WHEN '7_days' THEN 'hour'
                            WHEN '30_days' THEN 'day'
                            ELSE 'month'
                        END,
                        LOWER(r.time)
                    ) as timestamp,
                    SUM(r.price) as actual,
                    COUNT(*) as booking_count,
                    AVG(r.price) as avg_booking_value
                FROM reservations r
                JOIN parking_spaces ps ON r.parking_space_id = ps.id
                WHERE ps.owner = %(user_id)s 
                    AND ps.is_paid = TRUE
                    AND COALESCE(ps.id = %(filter_ps_id)s, TRUE)
                    AND r.status != 'canceled'
                    AND LOWER(r.time) BETWEEN %(start_date)s AND %(end_date)s
                GROUP BY 1
            ),
            previous_period AS (
                SELECT 
                    DATE_TRUNC(
                        CASE %(time_filter)s 
                            WHEN '7_days' THEN 'hour'
                            WHEN '30_days' THEN 'day'
                            ELSE 'month'
                        END,
                        LOWER(r.time) + %(time_delta)s
                    ) as timestamp,
                    SUM(r.price) as previous_revenue
                FROM reservations r
                JOIN parking_spaces ps ON r.parking_space_id = ps.id
                WHERE ps.owner = %(user_id)s 
                    AND ps.is_paid = TRUE
                    AND COALESCE(ps.id = %(filter_ps_id)s, TRUE)
                    AND r.status != 'canceled'
                    AND LOWER(r.time) BETWEEN 
                        %(start_date)s - %(time_delta)s 
                        AND %(end_date)s - %(time_delta)s
                GROUP BY 1
            ),
            running_totals AS (
                SELECT 
                    timestamp,
                    SUM(COALESCE(actual, 0)) OVER (ORDER BY timestamp) as cumulative_revenue
                FROM time_series
                LEFT JOIN actual_revenue USING (timestamp)
            )
            SELECT 
                ts.timestamp,
                COALESCE(ar.actual, 0) as actual,
                CASE 
                    WHEN ts.timestamp > %(now)s
                    THEN COALESCE(
                        (
                            SELECT AVG(actual) 
                            FROM actual_revenue 
                            WHERE EXTRACT(DOW FROM timestamp) = EXTRACT(DOW FROM ts.timestamp)
                        ),
                        0
                    )
                    ELSE 0
                END as projected,
                COALESCE(ar.booking_count, 0) as booking_count,
                COALESCE(ar.avg_booking_value, 0) as avg_booking_value,
                COALESCE(rt.cumulative_revenue, 0) as cumulative_revenue,
                CASE 
                    WHEN COALESCE(pp.previous_revenue, 0) > 0
                    THEN ((COALESCE(ar.actual, 0) - pp.previous_revenue) / pp.previous_revenue) * 100
                    ELSE 0
                END as period_over_period_growth
            FROM time_series ts
            LEFT JOIN actual_revenue ar USING (timestamp)
            LEFT JOIN previous_period pp USING (timestamp)
            LEFT JOIN running_totals rt USING (timestamp)
            ORDER BY timestamp;
            """,
                params,
            )
            historical_revenue = cur.fetchall()

            # ==== Enhanced Upcoming Revenue Query ====
            cur.execute(
                f"""
                    WITH spot_counts AS (
                        SELECT COUNT(*) as total_spots
                        FROM parking_spaces
                        WHERE owner = %(user_id)s 
                          AND is_paid = TRUE
                          AND COALESCE(id = %(filter_ps_id)s, TRUE)
                    ),
                    hourly_series AS (
                        SELECT generate_series(
                            DATE_TRUNC('hour', %(now)s),
                            DATE_TRUNC('hour', %(next_7_days)s),
                            '1 hour'::interval
                        ) AS timestamp
                    ),
                    upcoming_bookings AS (
                        SELECT 
                            DATE_TRUNC('hour', LOWER(r.time)) as timestamp,
                            SUM(r.price) as revenue,
                            COUNT(*) as booking_count
                        FROM reservations r
                        JOIN parking_spaces ps ON r.parking_space_id = ps.id
                        WHERE status != 'canceled'
                            AND ps.owner = %(user_id)s
                            AND COALESCE(ps.id = %(filter_ps_id)s, TRUE)
                            AND LOWER(r.time) >= %(now)s
                            AND LOWER(r.time) < %(next_7_days)s
                        GROUP BY 1
                    )
                    SELECT 
                        hs.timestamp,
                        COALESCE(ub.revenue, 0) as potential_revenue
                    FROM hourly_series hs
                    CROSS JOIN spot_counts sc
                    LEFT JOIN upcoming_bookings ub USING (timestamp)
                    ORDER BY timestamp;
                """,
                params,
            )
            upcoming_revenue = cur.fetchall()

            # ==== Spot Performance and Revenue by Spot ====
            # Add filter to the spot performance query
            spot_query = f"""
                WITH RECURSIVE daily_hours AS (
                    SELECT 
                        r.id,
                        r.parking_space_id,
                        generate_series(
                            date_trunc('day', LOWER(r.time)),
                            date_trunc('day', UPPER(r.time)),
                            '1 day'::interval
                        )::date as booking_date,
                        CASE 
                            WHEN date_trunc('day', generate_series) = date_trunc('day', LOWER(r.time))
                            THEN date_trunc('hour', LOWER(r.time))
                            ELSE date_trunc('hour', generate_series)
                        END +
                        INTERVAL '1 hour' * generate_series(
                            0,
                            CASE 
                                WHEN date_trunc('day', generate_series) = date_trunc('day', LOWER(r.time))
                                THEN 23 - EXTRACT(HOUR FROM LOWER(r.time))::integer
                                WHEN date_trunc('day', generate_series) = date_trunc('day', UPPER(r.time))
                                THEN EXTRACT(HOUR FROM UPPER(r.time))::integer
                                ELSE 23
                            END
                        ) AS hour_timestamp
                    FROM reservations r,
                        generate_series(
                            date_trunc('day', LOWER(r.time)),
                            date_trunc('day', UPPER(r.time)),
                            '1 day'::interval
                        )
WHERE LOWER(r.time) BETWEEN %(start_date)s AND %(end_date)s
                ),
                aggregated_hours AS (
                    SELECT 
                        parking_space_id,
                        ARRAY_AGG(DISTINCT EXTRACT(HOUR FROM hour_timestamp)::integer) AS hours,
                        COUNT(*) AS hour_count,
                        EXTRACT(HOUR FROM hour_timestamp)::integer AS hour
                    FROM daily_hours
                    GROUP BY parking_space_id, EXTRACT(HOUR FROM hour_timestamp)::integer
                ),
                daily_bookings AS (
                    SELECT 
                        r.parking_space_id,
                        generate_series::date as booking_date,
                        TRIM(TO_CHAR(generate_series, 'Day')) as day_name
                    FROM reservations r
                    JOIN parking_spaces ps ON r.parking_space_id = ps.id
                    CROSS JOIN generate_series(
                        date_trunc('day', LOWER(r.time)),
                        date_trunc('day', UPPER(r.time)),
                        '1 day'::interval
                    )
                    WHERE LOWER(r.time) BETWEEN %(start_date)s AND %(end_date)s
                    AND COALESCE(ps.id = %(filter_ps_id)s, TRUE)
                ),
                weekly_days AS (
                    SELECT 
                        parking_space_id,
                        day_name,
                        COUNT(*) as booking_count
                    FROM daily_bookings
                    GROUP BY parking_space_id, day_name
                ),
                occupied_hours AS (
                    SELECT
                        parking_space_id,
                        SUM(
                            EXTRACT(EPOCH FROM 
                                LEAST(UPPER(r.time), %(now)s) - 
                                GREATEST(LOWER(r.time), %(start_date)s)
                            )/3600
                        ) as total_occupied_hours
                    FROM reservations r
                    JOIN parking_spaces ps ON r.parking_space_id = ps.id
                    WHERE 
                        r.status != 'canceled' AND
                        (LOWER(r.time), UPPER(r.time)) OVERLAPS (%(start_date)s, %(end_date)s)
                        AND COALESCE(ps.id = %(filter_ps_id)s, TRUE)
                    GROUP BY parking_space_id
                ),
                total_revenue_cte AS (
                    SELECT
                        ps.id AS spot_id,
                        COALESCE(SUM(r.price), 0) AS total_revenue
                    FROM parking_spaces ps
                    LEFT JOIN reservations r 
                        ON ps.id = r.parking_space_id 
                        AND LOWER(r.time) BETWEEN %(start_date)s AND %(end_date)s
                        AND r.status != 'canceled'
                    WHERE ps.owner = %(user_id)s 
                      AND ps.is_paid = TRUE 
                      AND COALESCE(ps.id = %(filter_ps_id)s, TRUE)
                    GROUP BY ps.id
                )
                SELECT 
                    ps.id AS spot_id,
                    ps.name AS spot_name,
                    ps.price AS base_price,
                    COALESCE(COUNT(DISTINCT r.id), 0) AS total_bookings,
                    COALESCE(tr.total_revenue, 0) AS total_revenue,
                    COALESCE(SUM(CASE WHEN r.status = 'active' THEN 1 ELSE 0 END), 0) AS active_bookings,
                    COALESCE(SUM(CASE WHEN r.status = 'completed' THEN 1 ELSE 0 END), 0) AS completed_bookings,
                    COALESCE(SUM(CASE WHEN r.status = 'canceled' THEN 1 ELSE 0 END), 0) AS canceled_bookings,
                    COALESCE(AVG(EXTRACT(EPOCH FROM UPPER(r.time) - LOWER(r.time))/3600), 0) AS average_booking_length,
                    COALESCE(
                        jsonb_agg(
                            jsonb_build_object(
                                'hour', ah.hour,
                                'bookings', ah.hour_count
                            )
                        ) FILTER (WHERE ah.hour IS NOT NULL),
                        '[]'::jsonb
                    ) AS popular_hours,
                    COALESCE(
                        jsonb_agg(
                            jsonb_build_object(
                                'day', wd.day_name,
                                'bookings', wd.booking_count
                            )
                        ) FILTER (WHERE wd.day_name IS NOT NULL),
                        '[]'::jsonb
                    ) AS popular_days,
                    COALESCE(
                        (oh.total_occupied_hours / 
                        (EXTRACT(EPOCH FROM %(now)s - %(start_date)s)/3600)) * 100,
                        0
                    ) AS occupancy_rate
                FROM parking_spaces ps
                LEFT JOIN reservations r 
                    ON ps.id = r.parking_space_id 
                    AND LOWER(r.time) BETWEEN %(start_date)s AND %(end_date)s
                LEFT JOIN aggregated_hours ah
                    ON ps.id = ah.parking_space_id
                LEFT JOIN weekly_days wd
                    ON ps.id = wd.parking_space_id
                LEFT JOIN occupied_hours oh
                    ON ps.id = oh.parking_space_id
                LEFT JOIN total_revenue_cte tr
                    ON ps.id = tr.spot_id
                WHERE ps.owner = %(user_id)s 
                  AND ps.is_paid = TRUE 
                  AND COALESCE(ps.id = %(filter_ps_id)s, TRUE)
                GROUP BY ps.id, ps.name, ps.price, oh.total_occupied_hours, tr.total_revenue
            """
            cur.execute(spot_query, params)
            spot_metrics_rows = cur.fetchall()

            # Process spot_metrics for spot_performance and revenue_by_spot
            spot_performance = {}
            revenue_by_spot = []
            overall_occupancy_rate = 0
            for row in spot_metrics_rows:
                spot_id_str = str(row["spot_id"])
                occupancy_rate = row.get("occupancy_rate") or 0
                overall_occupancy_rate += occupancy_rate

                popular_hours = row.get("popular_hours") or []
                popular_days = row.get("popular_days") or []
                unique_hours = list(
                    {entry["hour"]: entry for entry in popular_hours}.values()
                )
                unique_days = list(
                    {entry["day"]: entry for entry in popular_days}.values()
                )

                spot_performance[spot_id_str] = {
                    "totalRevenue": float(row.get("total_revenue") or 0),
                    "totalBookings": int(row.get("total_bookings") or 0),
                    "occupancyRate": float(occupancy_rate),
                    "averageBookingLength": float(
                        row.get("average_booking_length") or 0
                    ),
                    "activeBookings": int(row.get("active_bookings") or 0),
                    "completedBookings": int(row.get("completed_bookings") or 0),
                    "canceledBookings": int(row.get("canceled_bookings") or 0),
                    "popularHours": unique_hours,
                    "popularDays": unique_days,
                }
                revenue_by_spot.append(
                    {
                        "spotId": spot_id_str,
                        "spotName": row.get("spot_name"),
                        "revenue": float(row.get("total_revenue") or 0),
                        "bookings": int(row.get("total_bookings") or 0),
                        "occupancyRate": float(occupancy_rate),
                        "basePrice": float(row.get("base_price") or 0),
                    }
                )

            # ==== Recent Bookings ====
            recent_params = [
                user_id,
                filter_ps_id,  # Add filter parameter
                start_date,
                end_date + timedelta(days=7),
                start_date,
                end_date + timedelta(days=7),
                end_date + timedelta(days=7),
                start_date,
            ]
            recent_bookings_query = f"""
                WITH reservation_details AS (
                    SELECT 
                        r.id,
                        r.parking_space_id,
                        ps.name AS spot_name,
                        u.name AS renter_name,
                        u.email AS renter_email,
                        LOWER(r.time) AS start_time,
                        UPPER(r.time) AS end_time,
                        r.status,
                        r.price,
                        EXTRACT(EPOCH FROM UPPER(r.time) - LOWER(r.time))/3600 AS duration,
                        c.make AS car_make,
                        c.model AS car_model,
                        c.color AS car_color,
                        c.license_plate_state AS car_state,
                        c.license_plate AS car_plate,
                        ROW_NUMBER() OVER (
                            PARTITION BY r.parking_space_id 
                            ORDER BY LOWER(r.time) DESC
                        ) as spot_booking_rank,
                        CASE 
                            WHEN LOWER(r.time) > NOW() THEN 'upcoming'
                            WHEN UPPER(r.time) < NOW() THEN 'past'
                            ELSE 'current'
                        END as time_status,
                        CASE 
                            WHEN DATE_TRUNC('day', UPPER(r.time)) > DATE_TRUNC('day', LOWER(r.time))
                            THEN true
                            ELSE false
                        END as is_multi_day,
                        EXTRACT(DAY FROM UPPER(r.time) - LOWER(r.time)) as days_duration,
                        COUNT(*) OVER (PARTITION BY r.renter_id) as rental_count_by_user
                    FROM reservations r
                    JOIN parking_spaces ps ON r.parking_space_id = ps.id
                    LEFT JOIN users u ON r.renter_id = u.id
                    LEFT JOIN cars c ON r.car_info_id = c.id
                    WHERE ps.owner = %s
                        AND COALESCE(ps.id = %s, TRUE)
                        AND (
                            LOWER(r.time) BETWEEN %s AND %s
                            OR UPPER(r.time) BETWEEN %s AND %s
                            OR (LOWER(r.time) <= %s AND UPPER(r.time) >= %s)
                        )
                )
                SELECT 
                    id,
                    parking_space_id AS "spotId",
                    spot_name AS "spotName",
                    renter_name AS "renterName",
                    renter_email AS "renterEmail",
                    start_time AS "startTime",
                    end_time AS "endTime",
                    status,
                    price,
                    duration,
                    time_status AS "timeStatus",
                    is_multi_day AS "isMultiDay",
                    days_duration AS "daysDuration",
                    rental_count_by_user AS "rentalCount",
                    jsonb_build_object(
                        'make', car_make,
                        'model', car_model,
                        'color', car_color,
                        'plate', car_plate,
                        'state', car_state
                    ) AS "carDetails"
                FROM reservation_details
                WHERE spot_booking_rank <= 10
                ORDER BY start_time DESC
            """
            cur.execute(recent_bookings_query, recent_params)
            recent_bookings_rows = cur.fetchall()

            # ==== Upcoming Earnings ====
            upcoming_params = [user_id, filter_ps_id]  # Add filter parameter
            upcoming_query = """
                SELECT 
                    ps.name AS spot_name,
                    LOWER(r.time) AS start_time,
                    UPPER(r.time) AS end_time,
                    r.price AS earnings
                FROM reservations r
                JOIN parking_spaces ps ON r.parking_space_id = ps.id
                WHERE ps.owner = %s 
                  AND ps.is_paid = TRUE 
                  AND COALESCE(ps.id = %s, TRUE)
                  AND r.status NOT IN ('canceled') 
                  AND LOWER(r.time) >= NOW() 
                  AND LOWER(r.time) <= NOW() + INTERVAL '7 days'
                ORDER BY LOWER(r.time)
            """
            cur.execute(upcoming_query, upcoming_params)
            upcoming_earnings_rows = cur.fetchall()
            total_upcoming_earnings = sum(
                [row["earnings"] for row in upcoming_earnings_rows]
            )

            # ==== Overall Average Ratings ====
            rating_params = [
                user_id,
                filter_ps_id,
                start_date,
                end_date,
            ]  # Add filter parameter
            ratings_query = """
                SELECT 
                    COALESCE(AVG(r.availability_rating), 0) AS avg_availability_rating,
                    COALESCE(AVG(r.cleanliness_rating), 0) AS avg_cleanliness_rating,
                    COALESCE(AVG(r.total_rating), 0) AS avg_total_rating,
                    COUNT(*) AS total_ratings
                FROM ratings r
                JOIN parking_spaces ps ON r.parking_space_id = ps.id
                WHERE ps.owner = %s 
                  AND ps.is_paid = TRUE 
                  AND COALESCE(ps.id = %s, TRUE)
                  AND r.updated_at > %s 
                  AND r.updated_at < %s
            """
            cur.execute(ratings_query, rating_params)
            overall_ratings = cur.fetchone() or {}

            # ==== Ratings By Spot ====
            ratings_by_spot_params = [
                start_date,
                end_date,
                user_id,
                filter_ps_id,
            ]  # Add filter parameter
            ratings_by_spot_query = """
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
                  AND COALESCE(ps.id = %s, TRUE)
                GROUP BY ps.id, ps.name
            """
            cur.execute(ratings_by_spot_query, ratings_by_spot_params)
            ratings_by_spot_rows = cur.fetchall()

            # Process ratings by spot
            ratings_by_spot = []
            for spot_row in ratings_by_spot_rows:
                spot_id_str = str(spot_row["spot_id"])
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
                    count = row["count"]  # This was incorrectly indented
                    percentage = (
                        (count / total_ratings) * 100 if total_ratings > 0 else 0
                    )
                    rating_distribution.append(
                        {"stars": stars, "count": count, "percentage": percentage}
                    )

            # Get recent reviews
            cur.execute(
                """
            SELECT 
                r.total_rating AS rating,
                EXTRACT(DAY FROM NOW() - r.updated_at) AS days_ago,
                TRUE AS is_verified
            FROM ratings r
            WHERE r.parking_space_id = %s 
              AND r.updated_at > %s 
              AND r.updated_at < %s
            ORDER BY r.updated_at DESC
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
                            "daysAgo": int(review["days_ago"]),
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
                            "total": sum(row["actual"] for row in historical_revenue),
                            "perBooking": (
                                sum(row["actual"] for row in historical_revenue)
                                / sum(
                                    row["booking_count"] for row in historical_revenue
                                )
                                if sum(
                                    row["booking_count"] for row in historical_revenue
                                )
                                > 0
                                else 0
                            ),
                        },
                        "occupancy": {
                            "overallRate": overall_occupancy_rate
                            / len(spot_metrics_rows)
                            if spot_metrics_rows
                            else 0
                        },
                        "bookings": {
                            "active": overall["active_bookings"],
                            "total": overall["total_bookings"],
                            "percentageActive": overall["percentage_active"],
                        },
                    },
                    "revenueMetrics": {
                        "historicalRevenue": [
                            {
                                "timestamp": row["timestamp"].isoformat(),
                                "actual": float(row["actual"]),
                            }
                            for row in historical_revenue
                        ],
                        "upcomingRevenue": [
                            {
                                "timestamp": row["timestamp"].isoformat(),
                                "potential": float(row["potential_revenue"]),
                            }
                            for row in upcoming_revenue
                        ],
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
                                "time_status": booking["timeStatus"],
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
