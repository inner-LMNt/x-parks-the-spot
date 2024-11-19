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
        "spot_id": spot_id,
        "now": now,
        "next_7_days": now + timedelta(days=7),
        "time_delta": time_deltas[time_filter],
        "time_filter": time_filter  # Added this for the CASE statements
    }
    with DB.pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            # ==== Prepare spot filter ====
            # Added leading space to ensure correct SQL syntax
            spot_filter_sql = ""
            if spot_id:
                spot_filter_sql = " AND ps.id = %s"

            # ==== Overall Revenue Metrics ====
            overall_params = [
                start_date,  # For total_possible_completions
                start_date,  # For first condition of total_relevant_bookings
                end_date + timedelta(days=7),  # For cancellation check
                start_date,  # For successful_completions
                user_id,  # For CTE WHERE clause
                start_date, end_date + timedelta(days=7),  # For CTE date range
                user_id,  # For main query
                start_date, end_date + timedelta(days=7)  # For main query
            ]
            if spot_id:
                overall_params.append(spot_id)
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
                          AND LOWER(r.time) BETWEEN %s AND %s
                          {spot_filter_sql}
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
                      AND LOWER(r.time) BETWEEN %s AND %s
                      {spot_filter_sql}
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

            cur.execute("""
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
                    AND r.status != 'canceled'
                    AND LOWER(r.time) BETWEEN %(start_date)s AND %(end_date)s
                    {spot_filter_sql}
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
                    AND r.status != 'canceled'
                    AND LOWER(r.time) BETWEEN 
                        %(start_date)s - %(time_delta)s 
                        AND %(end_date)s - %(time_delta)s
                    {spot_filter_sql}
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
            """.format(spot_filter_sql=spot_filter_sql), params)
            historical_revenue = cur.fetchall()

            # ==== Enhanced Upcoming Revenue Query ====
            cur.execute(
                f"""
                    WITH spot_counts AS (
                        SELECT COUNT(*) as total_spots
                        FROM parking_spaces
                        WHERE owner = %(user_id)s AND is_paid = TRUE
                        {spot_filter_sql}
                    ),
                    hourly_series AS (
                        SELECT generate_series(
                            DATE_TRUNC('hour', %(now)s),
                            DATE_TRUNC('hour', %(next_7_days)s),
                            '1 hour'::interval
                        ) AS timestamp
                    ),
                    confirmed_bookings AS (
                        SELECT 
                            DATE_TRUNC('hour', LOWER(r.time)) as timestamp,
                            SUM(r.price) as confirmed_revenue,
                            COUNT(*) as booking_count,
                            COUNT(*) * 100.0 / sc.total_spots as utilization_rate
                        FROM reservations r
                        JOIN parking_spaces ps ON r.parking_space_id = ps.id
                        CROSS JOIN spot_counts sc
                        WHERE ps.owner = %(user_id)s 
                            AND ps.is_paid = TRUE
                            AND r.status != 'canceled'
                            AND LOWER(r.time) >= %(now)s
                            AND LOWER(r.time) < %(next_7_days)s
                            {spot_filter_sql}
                        GROUP BY 1, sc.total_spots
                    ),
                    historical_patterns AS (
                        SELECT 
                            EXTRACT(DOW FROM LOWER(r.time)) as day_of_week,
                            EXTRACT(HOUR FROM LOWER(r.time)) as hour,
                            AVG(r.price) as avg_historical_revenue,
                            COUNT(*) * 100.0 / 
                                NULLIF(COUNT(DISTINCT DATE_TRUNC('day', LOWER(r.time))), 0) as avg_utilization
                        FROM reservations r
                        JOIN parking_spaces ps ON r.parking_space_id = ps.id
                        WHERE ps.owner = %(user_id)s 
                            AND ps.is_paid = TRUE
                            AND r.status != 'canceled'
                            AND LOWER(r.time) >= %(start_date)s - %(time_delta)s
                            {spot_filter_sql}
                        GROUP BY 1, 2
                    )
                    SELECT 
                        hs.timestamp,
                        COALESCE(cb.confirmed_revenue, 0) as confirmed_revenue,
                        COALESCE(
                            (SELECT avg_historical_revenue 
                             FROM historical_patterns 
                             WHERE day_of_week = EXTRACT(DOW FROM hs.timestamp)
                             AND hour = EXTRACT(HOUR FROM hs.timestamp)
                            ), 0
                        ) * (sc.total_spots - COALESCE(cb.booking_count, 0)) as potential_revenue,
                        COALESCE(cb.booking_count, 0) as booking_count,
                        COALESCE(cb.utilization_rate, 0) as spot_utilization,
                        sc.total_spots as available_spots
                    FROM hourly_series hs
                    CROSS JOIN spot_counts sc
                    LEFT JOIN confirmed_bookings cb USING (timestamp)
                    ORDER BY timestamp;
                            """,
                params
            )
            upcoming_revenue = cur.fetchall()

            # ==== Spot Performance and Revenue by Spot ====
            spot_params = [
                start_date, end_date + timedelta(days=7),  # For daily_hours
                start_date, end_date + timedelta(days=7),  # For daily_bookings
                end_date, start_date,  # For occupied_hours LEAST/GREATEST
                start_date, end_date,  # For occupied_hours OVERLAPS
                end_date, start_date,  # For occupancy rate calculation
                start_date, end_date + timedelta(days=7),  # For reservations join
                user_id  # For owner check
            ]
            if spot_id:
                spot_params.append(spot_id)
            cur.execute(
                f"""
                    WITH RECURSIVE daily_hours AS (
                        -- Generate series of days and hours for each reservation
                        SELECT 
                            r.id,
                            r.parking_space_id,
                            -- Generate each day within the reservation
                            generate_series(
                                date_trunc('day', LOWER(r.time)),
                                date_trunc('day', UPPER(r.time)),
                                '1 day'::interval
                            )::date as booking_date,
                            -- For first day, start from actual start time
                            CASE 
                                WHEN date_trunc('day', generate_series) = date_trunc('day', LOWER(r.time))
                                THEN date_trunc('hour', LOWER(r.time))
                                ELSE date_trunc('hour', generate_series)
                            END +
                            INTERVAL '1 hour' * generate_series(
                                0,
                                CASE 
                                    -- For first day, start counting from actual start hour
                                    WHEN date_trunc('day', generate_series) = date_trunc('day', LOWER(r.time))
                                    THEN 23 - EXTRACT(HOUR FROM LOWER(r.time))::integer
                                    -- For last day, only count until end hour
                                    WHEN date_trunc('day', generate_series) = date_trunc('day', UPPER(r.time))
                                    THEN EXTRACT(HOUR FROM UPPER(r.time))::integer
                                    -- For middle days, count all 24 hours
                                    ELSE 23
                                END
                            ) AS hour_timestamp
                        FROM reservations r,
                            generate_series(
                                date_trunc('day', LOWER(r.time)),
                                date_trunc('day', UPPER(r.time)),
                                '1 day'::interval
                            )
                        WHERE LOWER(r.time) BETWEEN %s AND %s
                    ),
                    aggregated_hours AS (
                        -- Count each hour occurrence across all days
                        SELECT 
                            parking_space_id,
                            ARRAY_AGG(DISTINCT EXTRACT(HOUR FROM hour_timestamp)::integer) AS hours,
                            COUNT(*) AS hour_count,
                            EXTRACT(HOUR FROM hour_timestamp)::integer AS hour
                        FROM daily_hours
                        GROUP BY parking_space_id, EXTRACT(HOUR FROM hour_timestamp)::integer
                    ),
                    daily_bookings AS (
                        -- Get each individual day from reservations
                        SELECT 
                            r.parking_space_id,
                            generate_series::date as booking_date,
                            TRIM(TO_CHAR(generate_series, 'Day')) as day_name
                        FROM reservations r,
                            generate_series(
                                date_trunc('day', LOWER(r.time)),
                                date_trunc('day', UPPER(r.time)),
                                '1 day'::interval
                            )
                        WHERE LOWER(r.time) BETWEEN %s AND %s
                    ),
                    weekly_days AS (
                        -- Count occurrences of each day
                        SELECT 
                            parking_space_id,
                            day_name,
                            COUNT(*) as booking_count
                        FROM daily_bookings
                        GROUP BY parking_space_id, day_name
                    ),
                    occupied_hours AS (
                        -- Calculate total occupied hours per spot
                        SELECT
                            parking_space_id,
                            SUM(
                                EXTRACT(EPOCH FROM 
                                    LEAST(UPPER(r.time), %s) - 
                                    GREATEST(LOWER(r.time), %s)
                                )/3600
                            ) as total_occupied_hours
                        FROM reservations r
                        WHERE 
                            r.status != 'canceled' AND
                            (LOWER(r.time), UPPER(r.time)) OVERLAPS (%s, %s)
                        GROUP BY parking_space_id
                    )
                    SELECT 
                        ps.id AS spot_id,
                        ps.name AS spot_name,
                        ps.price AS base_price,
                        COALESCE(COUNT(DISTINCT r.id), 0) AS total_bookings,
                        COALESCE(SUM(r.price), 0) AS total_revenue,
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
                        -- New occupancy rate calculation
                        COALESCE(
                            (oh.total_occupied_hours / 
                            (EXTRACT(EPOCH FROM %s - %s)/3600)) * 100,
                            0
                        ) AS occupancy_rate
                    FROM parking_spaces ps
                    LEFT JOIN reservations r 
                        ON ps.id = r.parking_space_id 
                        AND LOWER(r.time) BETWEEN %s AND %s
                    LEFT JOIN aggregated_hours ah
                        ON ps.id = ah.parking_space_id
                    LEFT JOIN weekly_days wd
                        ON ps.id = wd.parking_space_id
                    LEFT JOIN occupied_hours oh
                        ON ps.id = oh.parking_space_id
                    WHERE ps.owner = %s 
                      AND ps.is_paid = TRUE 
                      {spot_filter_sql}
                    GROUP BY ps.id, ps.name, ps.price, oh.total_occupied_hours
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
                popular_hours = row.get("popular_hours") or []
                popular_days = row.get("popular_days") or []

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
            # Corrected parameter ordering: [user_id, start_date, end_date, spot_id (if any)]
            recent_params = [
                user_id,
                start_date, end_date + timedelta(days=7),  # First period check
                start_date, end_date + timedelta(days=7),  # Second period check
                end_date + timedelta(days=7), start_date  # Third period check (for overlapping)
            ]
            if spot_id:
                recent_params.append(spot_id)
            cur.execute(
                f"""
                    WITH reservation_details AS (
                        -- Get all reservations within the time period with their status counts
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
                            -- Add row number to ensure we get the most recent bookings first
                            ROW_NUMBER() OVER (
                                PARTITION BY r.parking_space_id 
                                ORDER BY LOWER(r.time) DESC
                            ) as spot_booking_rank,
                            -- Add time-based flags
                            CASE 
                                WHEN LOWER(r.time) > NOW() THEN 'upcoming'
                                WHEN UPPER(r.time) < NOW() THEN 'past'
                                ELSE 'current'
                            END as time_status,
                            -- Calculate if the booking spans multiple days
                            CASE 
                                WHEN DATE_TRUNC('day', UPPER(r.time)) > DATE_TRUNC('day', LOWER(r.time))
                                THEN true
                                ELSE false
                            END as is_multi_day,
                            -- Calculate the total duration in days (for multi-day bookings)
                            EXTRACT(DAY FROM UPPER(r.time) - LOWER(r.time)) as days_duration,
                            -- Track if this is a repeat renter
                            COUNT(*) OVER (PARTITION BY r.renter_id) as rental_count_by_user
                        FROM reservations r
                        JOIN parking_spaces ps 
                            ON r.parking_space_id = ps.id
                        LEFT JOIN users u 
                            ON r.renter_id = u.id
                        LEFT JOIN cars c 
                            ON r.car_info_id = c.id
                        WHERE ps.owner = %s
                            -- Include bookings that overlap with the time period
                            AND (
                                LOWER(r.time) BETWEEN %s AND %s
                                OR UPPER(r.time) BETWEEN %s AND %s
                                OR (LOWER(r.time) <= %s AND UPPER(r.time) >= %s)
                            )
                            {spot_filter_sql}
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
                    WHERE spot_booking_rank <= 10  -- Get the 10 most recent bookings per spot
                    ORDER BY start_time DESC
                """,
                recent_params,
            )
            recent_bookings_rows = cur.fetchall()

            # ==== Upcoming Earnings (next 7 days) ====
            # Corrected parameter ordering: [user_id, spot_id (if any)]
            upcoming_query = f"""
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
            """
            upcoming_params = [user_id]
            if spot_id:
                upcoming_params.append(spot_id)
            cur.execute(
                upcoming_query,
                upcoming_params,
            )
            upcoming_earnings_rows = cur.fetchall()

            total_upcoming_earnings = sum(
                [row["earnings"] for row in upcoming_earnings_rows]
            )

            # ==== Overall Average Ratings ====
            # Corrected parameter ordering: [user_id, start_date, end_date, spot_id (if any)]
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
            # Corrected parameter ordering: [start_date, end_date, user_id, spot_id (if any)]
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

            # ==== Rating Distribution and Recent Reviews per Spot ====
            ratings_by_spot = []
            for spot_row in ratings_by_spot_rows:
                spot_id_str = str(spot_row["spot_id"])
                # ==== Rating Distribution ====
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

                # ==== Recent Reviews ====
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
                        "availabilityRating": float(
                            spot_row["avg_availability_rating"]
                        ),
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
                                sum(row["actual"] for row in historical_revenue) /
                                sum(row["booking_count"] for row in historical_revenue)
                                if sum(row["booking_count"] for row in historical_revenue) > 0
                                else 0
                            ),
                            "projectedNext7Days": sum(
                                row["confirmed_revenue"] + row["potential_revenue"]
                                for row in upcoming_revenue
                            ),
                            "periodOverPeriodGrowth": sum(
                                row["period_over_period_growth"] for row in historical_revenue
                            ) / len(historical_revenue) if historical_revenue else 0
                        },
                        "occupancy": {
                            "overallRate": overall_occupancy_rate
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
                                "projected": float(row["projected"]),
                                "bookingCount": row["booking_count"],
                                "avgBookingValue": float(row["avg_booking_value"]),
                                "cumulativeRevenue": float(row["cumulative_revenue"]),
                                "periodOverPeriodGrowth": float(row["period_over_period_growth"])
                            }
                            for row in historical_revenue
                        ],
                        "upcomingRevenue": [
                            {
                                "timestamp": row["timestamp"].isoformat(),
                                "confirmed": float(row["confirmed_revenue"]),
                                "potential": float(row["potential_revenue"]),
                                "bookingCount": row["booking_count"],
                                "spotUtilization": float(row["spot_utilization"]),
                                "availableSpots": row["available_spots"]
                            }
                            for row in upcoming_revenue
                        ]
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
