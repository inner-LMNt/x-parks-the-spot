--
-- PostgreSQL database dump
--

-- Dumped from database version 16.4 (Debian 16.4-1.pgdg110+2)
-- Dumped by pg_dump version 17.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


--
-- Name: coalesce_timetable_by_parking_space_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.coalesce_timetable_by_parking_space_id(selected_parking_space_id uuid) RETURNS SETOF tstzrange
    LANGUAGE plpgsql
    AS $$
DECLARE
    curr paid_parking_allowed_availability;
    prev paid_parking_allowed_availability;
BEGIN
    for curr in
        SELECT * 
        FROM paid_parking_allowed_availability
		WHERE paid_parking_allowed_availability.parking_space_id = selected_parking_space_id
        ORDER BY time
    loop
        if prev.time && curr.time then 
            prev.time:= prev.time + curr.time;
        else
            if prev notnull then 
                return next prev.time;
            end if;
            prev:= curr;
        end if;
    end loop;
    return next prev.time;
end $$;


--
-- Name: update_parking_space_ratings(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_parking_space_ratings() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE parking_spaces
        SET
            avg_availability_rating = ROUND((
                SELECT AVG(availability_rating)::numeric
                FROM ratings
                WHERE parking_space_id = NEW.parking_space_id
                AND availability_rating IS NOT NULL
            ), 2),
            avg_cleanliness_rating = ROUND((
                SELECT AVG(cleanliness_rating)::numeric
                FROM ratings
                WHERE parking_space_id = NEW.parking_space_id
                AND cleanliness_rating IS NOT NULL
            ), 2),
            avg_total_rating = ROUND((
                SELECT AVG(total_rating)::numeric
                FROM ratings
                WHERE parking_space_id = NEW.parking_space_id
            ), 2),
            ratings_count_availability = (
                SELECT COUNT(*)
                FROM ratings
                WHERE parking_space_id = NEW.parking_space_id
                AND availability_rating IS NOT NULL
            ),
            ratings_count_cleanliness = (
                SELECT COUNT(*)
                FROM ratings
                WHERE parking_space_id = NEW.parking_space_id
                AND cleanliness_rating IS NOT NULL
            )
        WHERE id = NEW.parking_space_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE parking_spaces
        SET
            avg_availability_rating = ROUND((
                SELECT AVG(availability_rating)::numeric
                FROM ratings
                WHERE parking_space_id = OLD.parking_space_id
                AND availability_rating IS NOT NULL
            ), 2),
            avg_cleanliness_rating = ROUND((
                SELECT AVG(cleanliness_rating)::numeric
                FROM ratings
                WHERE parking_space_id = OLD.parking_space_id
                AND cleanliness_rating IS NOT NULL
            ), 2),
            avg_total_rating = ROUND((
                SELECT AVG(total_rating)::numeric
                FROM ratings
                WHERE parking_space_id = OLD.parking_space_id
            ), 2),
            ratings_count_availability = (
                SELECT COUNT(*)
                FROM ratings
                WHERE parking_space_id = OLD.parking_space_id
                AND availability_rating IS NOT NULL
            ),
            ratings_count_cleanliness = (
                SELECT COUNT(*)
                FROM ratings
                WHERE parking_space_id = OLD.parking_space_id
                AND cleanliness_rating IS NOT NULL
            )
        WHERE id = OLD.parking_space_id;
    END IF;
    RETURN NULL;
END;
$$;


--
-- Name: update_renter_ratings(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_renter_ratings() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE users
        SET
            responsiveness_score = ROUND((
                SELECT AVG(responsiveness_score)::numeric
                FROM renter_ratings
                WHERE renter_id = NEW.renter_id
                AND responsiveness_score IS NOT NULL
            ), 2)
        WHERE id = NEW.renter_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE users
        SET
            responsiveness_score = ROUND((
                SELECT AVG(responsiveness_score)::numeric
                FROM renter_ratings
                WHERE renter_id = OLD.renter_id
                AND responsiveness_score IS NOT NULL
            ), 2)
        WHERE id = OLD.renter_id;
    END IF;
    RETURN NULL;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bookmarked_spots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookmarked_spots (
    id integer NOT NULL,
    parking_space_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: bookmarked_spots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bookmarked_spots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bookmarked_spots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bookmarked_spots_id_seq OWNED BY public.bookmarked_spots.id;


--
-- Name: cars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cars (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    make character varying(100) NOT NULL,
    model character varying(100) NOT NULL,
    license_plate character varying(20) NOT NULL,
    color character varying(50),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    license_plate_state character varying(2)
);


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migrations (
    migration_name text NOT NULL
);


--
-- Name: paid_parking_allowed_availability; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.paid_parking_allowed_availability (
    id integer NOT NULL,
    parking_space_id uuid NOT NULL,
    "time" tstzrange
);


--
-- Name: paid_parking_allowed_availability_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.paid_parking_allowed_availability_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: paid_parking_allowed_availability_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.paid_parking_allowed_availability_id_seq OWNED BY public.paid_parking_allowed_availability.id;


--
-- Name: parking_spaces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parking_spaces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner uuid NOT NULL,
    location public.geography(Point,4326),
    is_paid boolean DEFAULT false,
    name text,
    availability_schedule jsonb,
    photos text[],
    verification_status text,
    cancellation_policy text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    address text,
    price double precision,
    is_taken boolean DEFAULT false,
    photo_timestamp timestamp with time zone,
    verification_photos text[],
    avg_availability_rating numeric(3,2) DEFAULT NULL::numeric,
    avg_cleanliness_rating numeric(3,2) DEFAULT NULL::numeric,
    avg_total_rating numeric(3,2) DEFAULT NULL::numeric,
    ratings_count_availability integer DEFAULT 0,
    ratings_count_cleanliness integer DEFAULT 0
);


--
-- Name: points_transaction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.points_transaction (
    transaction_id integer NOT NULL,
    user_id uuid NOT NULL,
    transaction_type character varying(50) NOT NULL,
    points_amount integer NOT NULL,
    description text,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    balance_after_transaction integer,
    status character varying(50) DEFAULT 'inactive'::character varying NOT NULL
);


--
-- Name: points_transaction_transaction_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.points_transaction_transaction_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: points_transaction_transaction_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.points_transaction_transaction_id_seq OWNED BY public.points_transaction.transaction_id;


--
-- Name: ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ratings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parking_space_id uuid NOT NULL,
    user_id uuid NOT NULL,
    availability_rating integer,
    cleanliness_rating integer,
    total_rating numeric(3,2) GENERATED ALWAYS AS (
CASE
    WHEN ((availability_rating IS NOT NULL) AND (cleanliness_rating IS NOT NULL)) THEN (((availability_rating + cleanliness_rating))::numeric / 2.0)
    WHEN (availability_rating IS NOT NULL) THEN (availability_rating)::numeric
    WHEN (cleanliness_rating IS NOT NULL) THEN (cleanliness_rating)::numeric
    ELSE NULL::numeric
END) STORED,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ratings_availability_rating_check CHECK (((availability_rating >= 1) AND (availability_rating <= 5))),
    CONSTRAINT ratings_cleanliness_rating_check CHECK (((cleanliness_rating >= 1) AND (cleanliness_rating <= 5)))
);


--
-- Name: renter_ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.renter_ratings (
    id integer NOT NULL,
    renter_id uuid,
    rater_id uuid,
    responsiveness_score integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT renter_ratings_responsiveness_score_check CHECK (((responsiveness_score >= 1) AND (responsiveness_score <= 5)))
);


--
-- Name: renter_ratings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.renter_ratings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: renter_ratings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.renter_ratings_id_seq OWNED BY public.renter_ratings.id;


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reservation_id uuid,
    description text NOT NULL,
    type character varying(100) DEFAULT 'Other'::character varying NOT NULL,
    status character varying(50) DEFAULT 'open'::character varying NOT NULL,
    admin_response text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid,
    departure_time timestamp with time zone,
    overstay_duration integer,
    image_url text,
    damage_type text,
    damage_severity text,
    overstay_charge numeric(10,2),
    CONSTRAINT reports_status_check CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'in_progress'::character varying, 'resolved'::character varying])::text[]))),
    CONSTRAINT reports_type_check CHECK (((type)::text = ANY ((ARRAY['Other'::character varying, 'Reservation Issue'::character varying, 'Renter Overstay'::character varying, 'Damage Report'::character varying])::text[])))
);


--
-- Name: reservations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reservations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parking_space_id uuid NOT NULL,
    renter_id uuid NOT NULL,
    car_info_id uuid NOT NULL,
    status character varying(20) DEFAULT 'booked'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    "time" tstzrange,
    price double precision,
    acknowledged boolean DEFAULT false NOT NULL
);


--
-- Name: timetable_coalesce; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timetable_coalesce (
    id integer NOT NULL,
    parking_space_id uuid NOT NULL,
    "time" tstzrange NOT NULL
);


--
-- Name: timetable_coalesce_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.timetable_coalesce_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: timetable_coalesce_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.timetable_coalesce_id_seq OWNED BY public.timetable_coalesce.id;


--
-- Name: user_delete_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_delete_requests (
    id integer NOT NULL,
    user_id uuid,
    token text NOT NULL,
    expiry timestamp without time zone NOT NULL
);


--
-- Name: user_delete_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_delete_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_delete_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_delete_requests_id_seq OWNED BY public.user_delete_requests.id;


--
-- Name: user_pw_reset_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_pw_reset_requests (
    id integer NOT NULL,
    user_id uuid,
    token text NOT NULL,
    expiry timestamp without time zone NOT NULL
);


--
-- Name: user_pw_reset_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_pw_reset_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_pw_reset_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_pw_reset_requests_id_seq OWNED BY public.user_pw_reset_requests.id;


--
-- Name: user_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_tokens (
    id integer NOT NULL,
    user_id uuid,
    token text NOT NULL,
    expiry timestamp without time zone NOT NULL
);


--
-- Name: user_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_tokens_id_seq OWNED BY public.user_tokens.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    deleted_at timestamp without time zone,
    user_preferences jsonb DEFAULT '{"notification_time": "30"}'::jsonb,
    points jsonb DEFAULT '{"total": 0, "current": 0}'::jsonb NOT NULL,
    state_city jsonb DEFAULT '{"city": "None", "state": "None"}'::jsonb NOT NULL,
    badges text[] DEFAULT '{}'::text[] NOT NULL,
    is_banned boolean DEFAULT false,
    responsiveness_score integer DEFAULT 5 NOT NULL,
    CONSTRAINT users_responsiveness_score_check CHECK (((responsiveness_score >= 1) AND (responsiveness_score <= 5)))
);


--
-- Name: bookmarked_spots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookmarked_spots ALTER COLUMN id SET DEFAULT nextval('public.bookmarked_spots_id_seq'::regclass);


--
-- Name: paid_parking_allowed_availability id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paid_parking_allowed_availability ALTER COLUMN id SET DEFAULT nextval('public.paid_parking_allowed_availability_id_seq'::regclass);


--
-- Name: points_transaction transaction_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points_transaction ALTER COLUMN transaction_id SET DEFAULT nextval('public.points_transaction_transaction_id_seq'::regclass);


--
-- Name: renter_ratings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.renter_ratings ALTER COLUMN id SET DEFAULT nextval('public.renter_ratings_id_seq'::regclass);


--
-- Name: timetable_coalesce id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_coalesce ALTER COLUMN id SET DEFAULT nextval('public.timetable_coalesce_id_seq'::regclass);


--
-- Name: user_delete_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_delete_requests ALTER COLUMN id SET DEFAULT nextval('public.user_delete_requests_id_seq'::regclass);


--
-- Name: user_pw_reset_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_pw_reset_requests ALTER COLUMN id SET DEFAULT nextval('public.user_pw_reset_requests_id_seq'::regclass);


--
-- Name: user_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_tokens ALTER COLUMN id SET DEFAULT nextval('public.user_tokens_id_seq'::regclass);


--
-- Data for Name: bookmarked_spots; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bookmarked_spots (id, parking_space_id, user_id, created_at, updated_at) FROM stdin;
6	96a998d9-41fc-41b8-bc73-a08e312de595	3ceafe32-5706-4fef-aa09-80f1c29ae821	2024-11-20 14:51:01.413401+00	2024-11-20 14:51:01.413401+00
\.


--
-- Data for Name: cars; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cars (id, user_id, make, model, license_plate, color, created_at, updated_at, license_plate_state) FROM stdin;
1ff4c7dc-ae8a-44b2-92c0-88f8b06057c7	3ceafe32-5706-4fef-aa09-80f1c29ae821	Honda	Pilot	987FGH	Blue	2024-11-11 03:16:34.456151+00	2024-11-11 03:16:34.456151+00	KY
ccaf6d36-f113-4b6b-b7ad-7244fe5302ab	3ceafe32-5706-4fef-aa09-80f1c29ae821	Subaru	Outback	TES123	Blue	2024-11-12 01:14:58.4563+00	2024-11-12 01:14:58.4563+00	KY
2fef51fc-63b3-4058-9743-6a1a4ed787e2	4e43aa54-5313-4f02-985f-efe54b48adc7	Kia	Sportage	1000000	Grey	2024-11-12 01:15:56.503053+00	2024-11-12 01:15:56.503053+00	IN
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.migrations (migration_name) FROM stdin;
00-usertable.sql
01-tokenstore.sql
02-postgis.sql
03-parkingspace.sql
04-addDeletionColumn.sql
05-deletetoken.sql
06-parkingspace.sql
06-resettoken.sql
07-cars.sql
08-reservations.sql
09-availability.sql
10-spacecoalesce.sql
11-parkingspace.sql
11-reports.sql
12-parkingspace.sql
13-cars-license-state.sql
13-parkingspace.sql
14-ratings.sql
14-reservations-price.sql
15-notification.sql
16-reservations.sql
17-reports.sql
18-availabilityFix.sql
19-points.sql
20-statecity.sql
21-badges.sql
21-bookmarks.sql
22-raffles.sql
21-users.sql
21-responsiveness.sql
\.


--
-- Data for Name: paid_parking_allowed_availability; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.paid_parking_allowed_availability (id, parking_space_id, "time") FROM stdin;
3277	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-11-11 04:59:00+00","2024-11-12 05:00:00+00"]
3278	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-11-18 04:59:00+00","2024-11-19 05:00:00+00"]
3279	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-11-25 04:59:00+00","2024-11-26 05:00:00+00"]
3280	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-12-02 04:59:00+00","2024-12-03 05:00:00+00"]
3281	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-12-09 04:59:00+00","2024-12-10 05:00:00+00"]
3282	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-12-16 04:59:00+00","2024-12-17 05:00:00+00"]
3283	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-12-23 04:59:00+00","2024-12-24 05:00:00+00"]
3284	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-12-30 04:59:00+00","2024-12-31 05:00:00+00"]
3285	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-01-06 04:59:00+00","2025-01-07 05:00:00+00"]
3286	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-01-13 04:59:00+00","2025-01-14 05:00:00+00"]
3287	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-01-20 04:59:00+00","2025-01-21 05:00:00+00"]
3288	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-01-27 04:59:00+00","2025-01-28 05:00:00+00"]
3289	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-02-03 04:59:00+00","2025-02-04 05:00:00+00"]
3290	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-02-10 04:59:00+00","2025-02-11 05:00:00+00"]
3291	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-02-17 04:59:00+00","2025-02-18 05:00:00+00"]
3292	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-02-24 04:59:00+00","2025-02-25 05:00:00+00"]
3293	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-03-03 04:59:00+00","2025-03-04 05:00:00+00"]
3294	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-03-10 03:59:00+00","2025-03-11 04:00:00+00"]
3295	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-03-17 03:59:00+00","2025-03-18 04:00:00+00"]
3296	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-03-24 03:59:00+00","2025-03-25 04:00:00+00"]
3297	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-03-31 03:59:00+00","2025-04-01 04:00:00+00"]
3298	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-04-07 03:59:00+00","2025-04-08 04:00:00+00"]
3299	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-04-14 03:59:00+00","2025-04-15 04:00:00+00"]
3300	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-04-21 03:59:00+00","2025-04-22 04:00:00+00"]
3301	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-04-28 03:59:00+00","2025-04-29 04:00:00+00"]
3302	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-05-05 03:59:00+00","2025-05-06 04:00:00+00"]
3303	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-05-12 03:59:00+00","2025-05-13 04:00:00+00"]
3304	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-05-19 03:59:00+00","2025-05-20 04:00:00+00"]
3305	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-05-26 03:59:00+00","2025-05-27 04:00:00+00"]
3306	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-06-02 03:59:00+00","2025-06-03 04:00:00+00"]
3307	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-06-09 03:59:00+00","2025-06-10 04:00:00+00"]
3308	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-06-16 03:59:00+00","2025-06-17 04:00:00+00"]
3309	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-06-23 03:59:00+00","2025-06-24 04:00:00+00"]
3310	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-06-30 03:59:00+00","2025-07-01 04:00:00+00"]
3311	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-07-07 03:59:00+00","2025-07-08 04:00:00+00"]
3312	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-07-14 03:59:00+00","2025-07-15 04:00:00+00"]
3313	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-07-21 03:59:00+00","2025-07-22 04:00:00+00"]
3314	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-07-28 03:59:00+00","2025-07-29 04:00:00+00"]
3315	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-08-04 03:59:00+00","2025-08-05 04:00:00+00"]
3316	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-08-11 03:59:00+00","2025-08-12 04:00:00+00"]
3317	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-08-18 03:59:00+00","2025-08-19 04:00:00+00"]
3318	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-08-25 03:59:00+00","2025-08-26 04:00:00+00"]
3319	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-09-01 03:59:00+00","2025-09-02 04:00:00+00"]
3320	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-09-08 03:59:00+00","2025-09-09 04:00:00+00"]
3321	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-09-15 03:59:00+00","2025-09-16 04:00:00+00"]
3322	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-09-22 03:59:00+00","2025-09-23 04:00:00+00"]
3323	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-09-29 03:59:00+00","2025-09-30 04:00:00+00"]
3324	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-10-06 03:59:00+00","2025-10-07 04:00:00+00"]
3325	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-10-13 03:59:00+00","2025-10-14 04:00:00+00"]
3326	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-10-20 03:59:00+00","2025-10-21 04:00:00+00"]
3327	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-10-27 03:59:00+00","2025-10-28 04:00:00+00"]
3328	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-11-03 04:59:00+00","2025-11-04 05:00:00+00"]
3329	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-11-12 04:59:00+00","2024-11-13 05:00:00+00"]
3330	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-11-19 04:59:00+00","2024-11-20 05:00:00+00"]
3331	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-11-26 04:59:00+00","2024-11-27 05:00:00+00"]
3332	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-12-03 04:59:00+00","2024-12-04 05:00:00+00"]
3333	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-12-10 04:59:00+00","2024-12-11 05:00:00+00"]
3334	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-12-17 04:59:00+00","2024-12-18 05:00:00+00"]
3335	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-12-24 04:59:00+00","2024-12-25 05:00:00+00"]
3336	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-12-31 04:59:00+00","2025-01-01 05:00:00+00"]
3337	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-01-07 04:59:00+00","2025-01-08 05:00:00+00"]
3338	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-01-14 04:59:00+00","2025-01-15 05:00:00+00"]
3339	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-01-21 04:59:00+00","2025-01-22 05:00:00+00"]
3340	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-01-28 04:59:00+00","2025-01-29 05:00:00+00"]
3341	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-02-04 04:59:00+00","2025-02-05 05:00:00+00"]
3342	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-02-11 04:59:00+00","2025-02-12 05:00:00+00"]
3343	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-02-18 04:59:00+00","2025-02-19 05:00:00+00"]
3344	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-02-25 04:59:00+00","2025-02-26 05:00:00+00"]
3345	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-03-04 04:59:00+00","2025-03-05 05:00:00+00"]
3346	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-03-11 03:59:00+00","2025-03-12 04:00:00+00"]
3347	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-03-18 03:59:00+00","2025-03-19 04:00:00+00"]
3348	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-03-25 03:59:00+00","2025-03-26 04:00:00+00"]
3349	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-04-01 03:59:00+00","2025-04-02 04:00:00+00"]
3350	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-04-08 03:59:00+00","2025-04-09 04:00:00+00"]
3351	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-04-15 03:59:00+00","2025-04-16 04:00:00+00"]
3352	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-04-22 03:59:00+00","2025-04-23 04:00:00+00"]
3353	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-04-29 03:59:00+00","2025-04-30 04:00:00+00"]
3354	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-05-06 03:59:00+00","2025-05-07 04:00:00+00"]
3355	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-05-13 03:59:00+00","2025-05-14 04:00:00+00"]
3356	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-05-20 03:59:00+00","2025-05-21 04:00:00+00"]
3357	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-05-27 03:59:00+00","2025-05-28 04:00:00+00"]
3358	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-06-03 03:59:00+00","2025-06-04 04:00:00+00"]
3359	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-06-10 03:59:00+00","2025-06-11 04:00:00+00"]
3360	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-06-17 03:59:00+00","2025-06-18 04:00:00+00"]
3361	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-06-24 03:59:00+00","2025-06-25 04:00:00+00"]
3362	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-07-01 03:59:00+00","2025-07-02 04:00:00+00"]
3363	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-07-08 03:59:00+00","2025-07-09 04:00:00+00"]
3364	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-07-15 03:59:00+00","2025-07-16 04:00:00+00"]
3365	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-07-22 03:59:00+00","2025-07-23 04:00:00+00"]
3366	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-07-29 03:59:00+00","2025-07-30 04:00:00+00"]
3367	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-08-05 03:59:00+00","2025-08-06 04:00:00+00"]
3368	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-08-12 03:59:00+00","2025-08-13 04:00:00+00"]
3369	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-08-19 03:59:00+00","2025-08-20 04:00:00+00"]
3370	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-08-26 03:59:00+00","2025-08-27 04:00:00+00"]
3371	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-09-02 03:59:00+00","2025-09-03 04:00:00+00"]
3372	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-09-09 03:59:00+00","2025-09-10 04:00:00+00"]
3373	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-09-16 03:59:00+00","2025-09-17 04:00:00+00"]
3374	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-09-23 03:59:00+00","2025-09-24 04:00:00+00"]
3375	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-09-30 03:59:00+00","2025-10-01 04:00:00+00"]
3376	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-10-07 03:59:00+00","2025-10-08 04:00:00+00"]
3377	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-10-14 03:59:00+00","2025-10-15 04:00:00+00"]
3378	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-10-21 03:59:00+00","2025-10-22 04:00:00+00"]
3379	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-10-28 03:59:00+00","2025-10-29 04:00:00+00"]
3380	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-11-04 04:59:00+00","2025-11-05 05:00:00+00"]
3381	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-11-13 04:59:00+00","2024-11-14 05:00:00+00"]
3382	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-11-20 04:59:00+00","2024-11-21 05:00:00+00"]
3383	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-11-27 04:59:00+00","2024-11-28 05:00:00+00"]
3384	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-12-04 04:59:00+00","2024-12-05 05:00:00+00"]
3385	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-12-11 04:59:00+00","2024-12-12 05:00:00+00"]
3386	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-12-18 04:59:00+00","2024-12-19 05:00:00+00"]
3387	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-12-25 04:59:00+00","2024-12-26 05:00:00+00"]
3388	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-01-01 04:59:00+00","2025-01-02 05:00:00+00"]
3389	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-01-08 04:59:00+00","2025-01-09 05:00:00+00"]
3390	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-01-15 04:59:00+00","2025-01-16 05:00:00+00"]
3391	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-01-22 04:59:00+00","2025-01-23 05:00:00+00"]
3392	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-01-29 04:59:00+00","2025-01-30 05:00:00+00"]
3393	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-02-05 04:59:00+00","2025-02-06 05:00:00+00"]
3394	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-02-12 04:59:00+00","2025-02-13 05:00:00+00"]
3395	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-02-19 04:59:00+00","2025-02-20 05:00:00+00"]
3396	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-02-26 04:59:00+00","2025-02-27 05:00:00+00"]
3397	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-03-05 04:59:00+00","2025-03-06 05:00:00+00"]
3398	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-03-12 03:59:00+00","2025-03-13 04:00:00+00"]
3399	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-03-19 03:59:00+00","2025-03-20 04:00:00+00"]
3400	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-03-26 03:59:00+00","2025-03-27 04:00:00+00"]
3401	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-04-02 03:59:00+00","2025-04-03 04:00:00+00"]
3402	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-04-09 03:59:00+00","2025-04-10 04:00:00+00"]
3403	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-04-16 03:59:00+00","2025-04-17 04:00:00+00"]
3404	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-04-23 03:59:00+00","2025-04-24 04:00:00+00"]
3405	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-04-30 03:59:00+00","2025-05-01 04:00:00+00"]
3406	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-05-07 03:59:00+00","2025-05-08 04:00:00+00"]
3407	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-05-14 03:59:00+00","2025-05-15 04:00:00+00"]
3408	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-05-21 03:59:00+00","2025-05-22 04:00:00+00"]
3409	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-05-28 03:59:00+00","2025-05-29 04:00:00+00"]
3410	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-06-04 03:59:00+00","2025-06-05 04:00:00+00"]
3411	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-06-11 03:59:00+00","2025-06-12 04:00:00+00"]
3412	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-06-18 03:59:00+00","2025-06-19 04:00:00+00"]
3413	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-06-25 03:59:00+00","2025-06-26 04:00:00+00"]
3414	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-07-02 03:59:00+00","2025-07-03 04:00:00+00"]
3415	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-07-09 03:59:00+00","2025-07-10 04:00:00+00"]
3416	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-07-16 03:59:00+00","2025-07-17 04:00:00+00"]
3417	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-07-23 03:59:00+00","2025-07-24 04:00:00+00"]
3418	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-07-30 03:59:00+00","2025-07-31 04:00:00+00"]
3419	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-08-06 03:59:00+00","2025-08-07 04:00:00+00"]
3420	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-08-13 03:59:00+00","2025-08-14 04:00:00+00"]
3421	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-08-20 03:59:00+00","2025-08-21 04:00:00+00"]
3422	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-08-27 03:59:00+00","2025-08-28 04:00:00+00"]
3423	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-09-03 03:59:00+00","2025-09-04 04:00:00+00"]
3424	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-09-10 03:59:00+00","2025-09-11 04:00:00+00"]
3425	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-09-17 03:59:00+00","2025-09-18 04:00:00+00"]
3426	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-09-24 03:59:00+00","2025-09-25 04:00:00+00"]
3427	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-10-01 03:59:00+00","2025-10-02 04:00:00+00"]
3428	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-10-08 03:59:00+00","2025-10-09 04:00:00+00"]
3429	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-10-15 03:59:00+00","2025-10-16 04:00:00+00"]
3430	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-10-22 03:59:00+00","2025-10-23 04:00:00+00"]
3431	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-10-29 03:59:00+00","2025-10-30 04:00:00+00"]
3432	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-11-05 04:59:00+00","2025-11-06 05:00:00+00"]
3433	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-11-14 04:59:00+00","2024-11-15 05:00:00+00"]
3434	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-11-21 04:59:00+00","2024-11-22 05:00:00+00"]
3435	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-11-28 04:59:00+00","2024-11-29 05:00:00+00"]
3436	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-12-05 04:59:00+00","2024-12-06 05:00:00+00"]
3437	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-12-12 04:59:00+00","2024-12-13 05:00:00+00"]
3438	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-12-19 04:59:00+00","2024-12-20 05:00:00+00"]
3439	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-12-26 04:59:00+00","2024-12-27 05:00:00+00"]
3440	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-01-02 04:59:00+00","2025-01-03 05:00:00+00"]
3441	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-01-09 04:59:00+00","2025-01-10 05:00:00+00"]
3442	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-01-16 04:59:00+00","2025-01-17 05:00:00+00"]
3443	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-01-23 04:59:00+00","2025-01-24 05:00:00+00"]
3444	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-01-30 04:59:00+00","2025-01-31 05:00:00+00"]
3445	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-02-06 04:59:00+00","2025-02-07 05:00:00+00"]
3446	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-02-13 04:59:00+00","2025-02-14 05:00:00+00"]
3447	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-02-20 04:59:00+00","2025-02-21 05:00:00+00"]
3448	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-02-27 04:59:00+00","2025-02-28 05:00:00+00"]
3449	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-03-06 04:59:00+00","2025-03-07 05:00:00+00"]
3450	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-03-13 03:59:00+00","2025-03-14 04:00:00+00"]
3451	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-03-20 03:59:00+00","2025-03-21 04:00:00+00"]
3452	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-03-27 03:59:00+00","2025-03-28 04:00:00+00"]
3453	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-04-03 03:59:00+00","2025-04-04 04:00:00+00"]
3454	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-04-10 03:59:00+00","2025-04-11 04:00:00+00"]
3455	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-04-17 03:59:00+00","2025-04-18 04:00:00+00"]
3456	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-04-24 03:59:00+00","2025-04-25 04:00:00+00"]
3457	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-05-01 03:59:00+00","2025-05-02 04:00:00+00"]
3458	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-05-08 03:59:00+00","2025-05-09 04:00:00+00"]
3459	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-05-15 03:59:00+00","2025-05-16 04:00:00+00"]
3460	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-05-22 03:59:00+00","2025-05-23 04:00:00+00"]
3461	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-05-29 03:59:00+00","2025-05-30 04:00:00+00"]
3462	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-06-05 03:59:00+00","2025-06-06 04:00:00+00"]
3463	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-06-12 03:59:00+00","2025-06-13 04:00:00+00"]
3464	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-06-19 03:59:00+00","2025-06-20 04:00:00+00"]
3465	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-06-26 03:59:00+00","2025-06-27 04:00:00+00"]
3466	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-07-03 03:59:00+00","2025-07-04 04:00:00+00"]
3467	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-07-10 03:59:00+00","2025-07-11 04:00:00+00"]
3468	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-07-17 03:59:00+00","2025-07-18 04:00:00+00"]
3469	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-07-24 03:59:00+00","2025-07-25 04:00:00+00"]
3470	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-07-31 03:59:00+00","2025-08-01 04:00:00+00"]
3471	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-08-07 03:59:00+00","2025-08-08 04:00:00+00"]
3472	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-08-14 03:59:00+00","2025-08-15 04:00:00+00"]
3473	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-08-21 03:59:00+00","2025-08-22 04:00:00+00"]
3474	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-08-28 03:59:00+00","2025-08-29 04:00:00+00"]
3475	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-09-04 03:59:00+00","2025-09-05 04:00:00+00"]
3476	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-09-11 03:59:00+00","2025-09-12 04:00:00+00"]
3477	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-09-18 03:59:00+00","2025-09-19 04:00:00+00"]
3478	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-09-25 03:59:00+00","2025-09-26 04:00:00+00"]
3479	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-10-02 03:59:00+00","2025-10-03 04:00:00+00"]
3480	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-10-09 03:59:00+00","2025-10-10 04:00:00+00"]
3481	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-10-16 03:59:00+00","2025-10-17 04:00:00+00"]
3482	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-10-23 03:59:00+00","2025-10-24 04:00:00+00"]
3483	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-10-30 03:59:00+00","2025-10-31 04:00:00+00"]
3484	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-11-06 04:59:00+00","2025-11-07 05:00:00+00"]
3485	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-11-15 04:59:00+00","2024-11-16 05:00:00+00"]
3486	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-11-22 04:59:00+00","2024-11-23 05:00:00+00"]
3487	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-11-29 04:59:00+00","2024-11-30 05:00:00+00"]
3488	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-12-06 04:59:00+00","2024-12-07 05:00:00+00"]
3489	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-12-13 04:59:00+00","2024-12-14 05:00:00+00"]
3490	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-12-20 04:59:00+00","2024-12-21 05:00:00+00"]
3491	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-12-27 04:59:00+00","2024-12-28 05:00:00+00"]
3492	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-01-03 04:59:00+00","2025-01-04 05:00:00+00"]
3493	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-01-10 04:59:00+00","2025-01-11 05:00:00+00"]
3494	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-01-17 04:59:00+00","2025-01-18 05:00:00+00"]
3495	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-01-24 04:59:00+00","2025-01-25 05:00:00+00"]
3496	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-01-31 04:59:00+00","2025-02-01 05:00:00+00"]
3497	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-02-07 04:59:00+00","2025-02-08 05:00:00+00"]
3498	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-02-14 04:59:00+00","2025-02-15 05:00:00+00"]
3499	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-02-21 04:59:00+00","2025-02-22 05:00:00+00"]
3500	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-02-28 04:59:00+00","2025-03-01 05:00:00+00"]
3501	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-03-07 04:59:00+00","2025-03-08 05:00:00+00"]
3502	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-03-14 03:59:00+00","2025-03-15 04:00:00+00"]
3503	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-03-21 03:59:00+00","2025-03-22 04:00:00+00"]
3504	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-03-28 03:59:00+00","2025-03-29 04:00:00+00"]
3505	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-04-04 03:59:00+00","2025-04-05 04:00:00+00"]
3506	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-04-11 03:59:00+00","2025-04-12 04:00:00+00"]
3507	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-04-18 03:59:00+00","2025-04-19 04:00:00+00"]
3508	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-04-25 03:59:00+00","2025-04-26 04:00:00+00"]
3509	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-05-02 03:59:00+00","2025-05-03 04:00:00+00"]
3510	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-05-09 03:59:00+00","2025-05-10 04:00:00+00"]
3511	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-05-16 03:59:00+00","2025-05-17 04:00:00+00"]
3512	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-05-23 03:59:00+00","2025-05-24 04:00:00+00"]
3513	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-05-30 03:59:00+00","2025-05-31 04:00:00+00"]
3514	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-06-06 03:59:00+00","2025-06-07 04:00:00+00"]
3515	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-06-13 03:59:00+00","2025-06-14 04:00:00+00"]
3516	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-06-20 03:59:00+00","2025-06-21 04:00:00+00"]
3517	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-06-27 03:59:00+00","2025-06-28 04:00:00+00"]
3518	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-07-04 03:59:00+00","2025-07-05 04:00:00+00"]
3519	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-07-11 03:59:00+00","2025-07-12 04:00:00+00"]
3520	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-07-18 03:59:00+00","2025-07-19 04:00:00+00"]
3521	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-07-25 03:59:00+00","2025-07-26 04:00:00+00"]
3522	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-08-01 03:59:00+00","2025-08-02 04:00:00+00"]
3523	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-08-08 03:59:00+00","2025-08-09 04:00:00+00"]
3524	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-08-15 03:59:00+00","2025-08-16 04:00:00+00"]
3525	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-08-22 03:59:00+00","2025-08-23 04:00:00+00"]
3526	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-08-29 03:59:00+00","2025-08-30 04:00:00+00"]
3527	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-09-05 03:59:00+00","2025-09-06 04:00:00+00"]
3528	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-09-12 03:59:00+00","2025-09-13 04:00:00+00"]
3529	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-09-19 03:59:00+00","2025-09-20 04:00:00+00"]
3530	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-09-26 03:59:00+00","2025-09-27 04:00:00+00"]
3531	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-10-03 03:59:00+00","2025-10-04 04:00:00+00"]
3532	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-10-10 03:59:00+00","2025-10-11 04:00:00+00"]
3533	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-10-17 03:59:00+00","2025-10-18 04:00:00+00"]
3534	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-10-24 03:59:00+00","2025-10-25 04:00:00+00"]
3535	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-10-31 03:59:00+00","2025-11-01 04:00:00+00"]
3536	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-11-07 04:59:00+00","2025-11-08 05:00:00+00"]
3537	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-11-16 04:59:00+00","2024-11-17 05:00:00+00"]
3538	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-11-23 04:59:00+00","2024-11-24 05:00:00+00"]
3539	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-11-30 04:59:00+00","2024-12-01 05:00:00+00"]
3540	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-12-07 04:59:00+00","2024-12-08 05:00:00+00"]
3541	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-12-14 04:59:00+00","2024-12-15 05:00:00+00"]
3542	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-12-21 04:59:00+00","2024-12-22 05:00:00+00"]
3543	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-12-28 04:59:00+00","2024-12-29 05:00:00+00"]
3544	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-01-04 04:59:00+00","2025-01-05 05:00:00+00"]
3545	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-01-11 04:59:00+00","2025-01-12 05:00:00+00"]
3546	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-01-18 04:59:00+00","2025-01-19 05:00:00+00"]
3547	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-01-25 04:59:00+00","2025-01-26 05:00:00+00"]
3548	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-02-01 04:59:00+00","2025-02-02 05:00:00+00"]
3549	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-02-08 04:59:00+00","2025-02-09 05:00:00+00"]
3550	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-02-15 04:59:00+00","2025-02-16 05:00:00+00"]
3551	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-02-22 04:59:00+00","2025-02-23 05:00:00+00"]
3552	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-03-01 04:59:00+00","2025-03-02 05:00:00+00"]
3553	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-03-08 04:59:00+00","2025-03-09 05:00:00+00"]
3554	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-03-15 03:59:00+00","2025-03-16 04:00:00+00"]
3555	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-03-22 03:59:00+00","2025-03-23 04:00:00+00"]
3556	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-03-29 03:59:00+00","2025-03-30 04:00:00+00"]
3557	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-04-05 03:59:00+00","2025-04-06 04:00:00+00"]
3558	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-04-12 03:59:00+00","2025-04-13 04:00:00+00"]
3559	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-04-19 03:59:00+00","2025-04-20 04:00:00+00"]
3560	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-04-26 03:59:00+00","2025-04-27 04:00:00+00"]
3561	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-05-03 03:59:00+00","2025-05-04 04:00:00+00"]
3562	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-05-10 03:59:00+00","2025-05-11 04:00:00+00"]
3563	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-05-17 03:59:00+00","2025-05-18 04:00:00+00"]
3564	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-05-24 03:59:00+00","2025-05-25 04:00:00+00"]
3565	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-05-31 03:59:00+00","2025-06-01 04:00:00+00"]
3566	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-06-07 03:59:00+00","2025-06-08 04:00:00+00"]
3567	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-06-14 03:59:00+00","2025-06-15 04:00:00+00"]
3568	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-06-21 03:59:00+00","2025-06-22 04:00:00+00"]
3569	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-06-28 03:59:00+00","2025-06-29 04:00:00+00"]
3570	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-07-05 03:59:00+00","2025-07-06 04:00:00+00"]
3571	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-07-12 03:59:00+00","2025-07-13 04:00:00+00"]
3572	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-07-19 03:59:00+00","2025-07-20 04:00:00+00"]
3573	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-07-26 03:59:00+00","2025-07-27 04:00:00+00"]
3574	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-08-02 03:59:00+00","2025-08-03 04:00:00+00"]
3575	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-08-09 03:59:00+00","2025-08-10 04:00:00+00"]
3576	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-08-16 03:59:00+00","2025-08-17 04:00:00+00"]
3577	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-08-23 03:59:00+00","2025-08-24 04:00:00+00"]
3578	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-08-30 03:59:00+00","2025-08-31 04:00:00+00"]
3579	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-09-06 03:59:00+00","2025-09-07 04:00:00+00"]
3580	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-09-13 03:59:00+00","2025-09-14 04:00:00+00"]
3581	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-09-20 03:59:00+00","2025-09-21 04:00:00+00"]
3582	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-09-27 03:59:00+00","2025-09-28 04:00:00+00"]
3583	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-10-04 03:59:00+00","2025-10-05 04:00:00+00"]
3584	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-10-11 03:59:00+00","2025-10-12 04:00:00+00"]
3585	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-10-18 03:59:00+00","2025-10-19 04:00:00+00"]
3586	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-10-25 03:59:00+00","2025-10-26 04:00:00+00"]
3587	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-11-01 03:59:00+00","2025-11-02 04:00:00+00"]
3588	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-11-08 04:59:00+00","2025-11-09 05:00:00+00"]
3589	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-11-17 04:59:00+00","2024-11-18 05:00:00+00"]
3590	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-11-24 04:59:00+00","2024-11-25 05:00:00+00"]
3591	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-12-01 04:59:00+00","2024-12-02 05:00:00+00"]
3592	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-12-08 04:59:00+00","2024-12-09 05:00:00+00"]
3593	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-12-15 04:59:00+00","2024-12-16 05:00:00+00"]
3594	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-12-22 04:59:00+00","2024-12-23 05:00:00+00"]
3595	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-12-29 04:59:00+00","2024-12-30 05:00:00+00"]
3596	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-01-05 04:59:00+00","2025-01-06 05:00:00+00"]
3597	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-01-12 04:59:00+00","2025-01-13 05:00:00+00"]
3598	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-01-19 04:59:00+00","2025-01-20 05:00:00+00"]
3599	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-01-26 04:59:00+00","2025-01-27 05:00:00+00"]
3600	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-02-02 04:59:00+00","2025-02-03 05:00:00+00"]
3601	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-02-09 04:59:00+00","2025-02-10 05:00:00+00"]
3602	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-02-16 04:59:00+00","2025-02-17 05:00:00+00"]
3603	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-02-23 04:59:00+00","2025-02-24 05:00:00+00"]
3604	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-03-02 04:59:00+00","2025-03-03 05:00:00+00"]
3605	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-03-09 04:59:00+00","2025-03-10 04:00:00+00"]
3606	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-03-16 03:59:00+00","2025-03-17 04:00:00+00"]
3607	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-03-23 03:59:00+00","2025-03-24 04:00:00+00"]
3608	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-03-30 03:59:00+00","2025-03-31 04:00:00+00"]
3609	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-04-06 03:59:00+00","2025-04-07 04:00:00+00"]
3610	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-04-13 03:59:00+00","2025-04-14 04:00:00+00"]
3611	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-04-20 03:59:00+00","2025-04-21 04:00:00+00"]
3612	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-04-27 03:59:00+00","2025-04-28 04:00:00+00"]
3613	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-05-04 03:59:00+00","2025-05-05 04:00:00+00"]
3614	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-05-11 03:59:00+00","2025-05-12 04:00:00+00"]
3615	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-05-18 03:59:00+00","2025-05-19 04:00:00+00"]
3616	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-05-25 03:59:00+00","2025-05-26 04:00:00+00"]
3617	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-06-01 03:59:00+00","2025-06-02 04:00:00+00"]
3618	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-06-08 03:59:00+00","2025-06-09 04:00:00+00"]
3619	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-06-15 03:59:00+00","2025-06-16 04:00:00+00"]
3620	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-06-22 03:59:00+00","2025-06-23 04:00:00+00"]
3621	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-06-29 03:59:00+00","2025-06-30 04:00:00+00"]
3622	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-07-06 03:59:00+00","2025-07-07 04:00:00+00"]
3623	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-07-13 03:59:00+00","2025-07-14 04:00:00+00"]
3624	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-07-20 03:59:00+00","2025-07-21 04:00:00+00"]
3625	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-07-27 03:59:00+00","2025-07-28 04:00:00+00"]
3626	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-08-03 03:59:00+00","2025-08-04 04:00:00+00"]
3627	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-08-10 03:59:00+00","2025-08-11 04:00:00+00"]
3628	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-08-17 03:59:00+00","2025-08-18 04:00:00+00"]
3629	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-08-24 03:59:00+00","2025-08-25 04:00:00+00"]
3630	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-08-31 03:59:00+00","2025-09-01 04:00:00+00"]
3631	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-09-07 03:59:00+00","2025-09-08 04:00:00+00"]
3632	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-09-14 03:59:00+00","2025-09-15 04:00:00+00"]
3633	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-09-21 03:59:00+00","2025-09-22 04:00:00+00"]
3634	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-09-28 03:59:00+00","2025-09-29 04:00:00+00"]
3635	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-10-05 03:59:00+00","2025-10-06 04:00:00+00"]
3636	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-10-12 03:59:00+00","2025-10-13 04:00:00+00"]
3637	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-10-19 03:59:00+00","2025-10-20 04:00:00+00"]
3638	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-10-26 03:59:00+00","2025-10-27 04:00:00+00"]
3639	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-11-02 03:59:00+00","2025-11-03 05:00:00+00"]
3640	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2025-11-09 04:59:00+00","2025-11-10 05:00:00+00"]
3641	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-11-18 04:59:00+00","2024-11-19 05:00:00+00"]
3642	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-11-25 04:59:00+00","2024-11-26 05:00:00+00"]
3643	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-12-02 04:59:00+00","2024-12-03 05:00:00+00"]
3644	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-12-09 04:59:00+00","2024-12-10 05:00:00+00"]
3645	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-12-16 04:59:00+00","2024-12-17 05:00:00+00"]
3646	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-12-23 04:59:00+00","2024-12-24 05:00:00+00"]
3647	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-12-30 04:59:00+00","2024-12-31 05:00:00+00"]
3648	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-01-06 04:59:00+00","2025-01-07 05:00:00+00"]
3649	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-01-13 04:59:00+00","2025-01-14 05:00:00+00"]
3650	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-01-20 04:59:00+00","2025-01-21 05:00:00+00"]
3651	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-01-27 04:59:00+00","2025-01-28 05:00:00+00"]
3652	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-02-03 04:59:00+00","2025-02-04 05:00:00+00"]
3653	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-02-10 04:59:00+00","2025-02-11 05:00:00+00"]
3654	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-02-17 04:59:00+00","2025-02-18 05:00:00+00"]
3655	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-02-24 04:59:00+00","2025-02-25 05:00:00+00"]
3656	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-03-03 04:59:00+00","2025-03-04 05:00:00+00"]
3657	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-03-10 03:59:00+00","2025-03-11 04:00:00+00"]
3658	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-03-17 03:59:00+00","2025-03-18 04:00:00+00"]
3659	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-03-24 03:59:00+00","2025-03-25 04:00:00+00"]
3660	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-03-31 03:59:00+00","2025-04-01 04:00:00+00"]
3661	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-04-07 03:59:00+00","2025-04-08 04:00:00+00"]
3662	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-04-14 03:59:00+00","2025-04-15 04:00:00+00"]
3663	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-04-21 03:59:00+00","2025-04-22 04:00:00+00"]
3664	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-04-28 03:59:00+00","2025-04-29 04:00:00+00"]
3665	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-05-05 03:59:00+00","2025-05-06 04:00:00+00"]
3666	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-05-12 03:59:00+00","2025-05-13 04:00:00+00"]
3667	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-05-19 03:59:00+00","2025-05-20 04:00:00+00"]
3668	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-05-26 03:59:00+00","2025-05-27 04:00:00+00"]
3669	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-06-02 03:59:00+00","2025-06-03 04:00:00+00"]
3670	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-06-09 03:59:00+00","2025-06-10 04:00:00+00"]
3671	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-06-16 03:59:00+00","2025-06-17 04:00:00+00"]
3672	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-06-23 03:59:00+00","2025-06-24 04:00:00+00"]
3673	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-06-30 03:59:00+00","2025-07-01 04:00:00+00"]
3674	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-07-07 03:59:00+00","2025-07-08 04:00:00+00"]
3675	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-07-14 03:59:00+00","2025-07-15 04:00:00+00"]
3676	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-07-21 03:59:00+00","2025-07-22 04:00:00+00"]
3677	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-07-28 03:59:00+00","2025-07-29 04:00:00+00"]
3678	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-08-04 03:59:00+00","2025-08-05 04:00:00+00"]
3679	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-08-11 03:59:00+00","2025-08-12 04:00:00+00"]
3680	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-08-18 03:59:00+00","2025-08-19 04:00:00+00"]
3681	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-08-25 03:59:00+00","2025-08-26 04:00:00+00"]
3682	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-09-01 03:59:00+00","2025-09-02 04:00:00+00"]
3683	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-09-08 03:59:00+00","2025-09-09 04:00:00+00"]
3684	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-09-15 03:59:00+00","2025-09-16 04:00:00+00"]
3685	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-09-22 03:59:00+00","2025-09-23 04:00:00+00"]
3686	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-09-29 03:59:00+00","2025-09-30 04:00:00+00"]
3687	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-10-06 03:59:00+00","2025-10-07 04:00:00+00"]
3688	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-10-13 03:59:00+00","2025-10-14 04:00:00+00"]
3689	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-10-20 03:59:00+00","2025-10-21 04:00:00+00"]
3690	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-10-27 03:59:00+00","2025-10-28 04:00:00+00"]
3691	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-11-03 04:59:00+00","2025-11-04 05:00:00+00"]
3692	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-11-10 04:59:00+00","2025-11-11 05:00:00+00"]
3693	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-11-19 04:59:00+00","2024-11-20 05:00:00+00"]
3694	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-11-26 04:59:00+00","2024-11-27 05:00:00+00"]
3695	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-12-03 04:59:00+00","2024-12-04 05:00:00+00"]
3696	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-12-10 04:59:00+00","2024-12-11 05:00:00+00"]
3697	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-12-17 04:59:00+00","2024-12-18 05:00:00+00"]
3698	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-12-24 04:59:00+00","2024-12-25 05:00:00+00"]
3699	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-12-31 04:59:00+00","2025-01-01 05:00:00+00"]
3700	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-01-07 04:59:00+00","2025-01-08 05:00:00+00"]
3701	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-01-14 04:59:00+00","2025-01-15 05:00:00+00"]
3702	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-01-21 04:59:00+00","2025-01-22 05:00:00+00"]
3703	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-01-28 04:59:00+00","2025-01-29 05:00:00+00"]
3704	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-02-04 04:59:00+00","2025-02-05 05:00:00+00"]
3705	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-02-11 04:59:00+00","2025-02-12 05:00:00+00"]
3706	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-02-18 04:59:00+00","2025-02-19 05:00:00+00"]
3707	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-02-25 04:59:00+00","2025-02-26 05:00:00+00"]
3708	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-03-04 04:59:00+00","2025-03-05 05:00:00+00"]
3709	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-03-11 03:59:00+00","2025-03-12 04:00:00+00"]
3710	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-03-18 03:59:00+00","2025-03-19 04:00:00+00"]
3711	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-03-25 03:59:00+00","2025-03-26 04:00:00+00"]
3712	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-04-01 03:59:00+00","2025-04-02 04:00:00+00"]
3713	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-04-08 03:59:00+00","2025-04-09 04:00:00+00"]
3714	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-04-15 03:59:00+00","2025-04-16 04:00:00+00"]
3715	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-04-22 03:59:00+00","2025-04-23 04:00:00+00"]
3716	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-04-29 03:59:00+00","2025-04-30 04:00:00+00"]
3717	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-05-06 03:59:00+00","2025-05-07 04:00:00+00"]
3718	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-05-13 03:59:00+00","2025-05-14 04:00:00+00"]
3719	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-05-20 03:59:00+00","2025-05-21 04:00:00+00"]
3720	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-05-27 03:59:00+00","2025-05-28 04:00:00+00"]
3721	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-06-03 03:59:00+00","2025-06-04 04:00:00+00"]
3722	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-06-10 03:59:00+00","2025-06-11 04:00:00+00"]
3723	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-06-17 03:59:00+00","2025-06-18 04:00:00+00"]
3724	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-06-24 03:59:00+00","2025-06-25 04:00:00+00"]
3725	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-07-01 03:59:00+00","2025-07-02 04:00:00+00"]
3726	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-07-08 03:59:00+00","2025-07-09 04:00:00+00"]
3727	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-07-15 03:59:00+00","2025-07-16 04:00:00+00"]
3728	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-07-22 03:59:00+00","2025-07-23 04:00:00+00"]
3729	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-07-29 03:59:00+00","2025-07-30 04:00:00+00"]
3730	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-08-05 03:59:00+00","2025-08-06 04:00:00+00"]
3731	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-08-12 03:59:00+00","2025-08-13 04:00:00+00"]
3732	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-08-19 03:59:00+00","2025-08-20 04:00:00+00"]
3733	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-08-26 03:59:00+00","2025-08-27 04:00:00+00"]
3734	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-09-02 03:59:00+00","2025-09-03 04:00:00+00"]
3735	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-09-09 03:59:00+00","2025-09-10 04:00:00+00"]
3736	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-09-16 03:59:00+00","2025-09-17 04:00:00+00"]
3737	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-09-23 03:59:00+00","2025-09-24 04:00:00+00"]
3738	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-09-30 03:59:00+00","2025-10-01 04:00:00+00"]
3739	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-10-07 03:59:00+00","2025-10-08 04:00:00+00"]
3740	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-10-14 03:59:00+00","2025-10-15 04:00:00+00"]
3741	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-10-21 03:59:00+00","2025-10-22 04:00:00+00"]
3742	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-10-28 03:59:00+00","2025-10-29 04:00:00+00"]
3743	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-11-04 04:59:00+00","2025-11-05 05:00:00+00"]
3744	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-11-11 04:59:00+00","2025-11-12 05:00:00+00"]
3745	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-11-20 04:59:00+00","2024-11-21 05:00:00+00"]
3746	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-11-27 04:59:00+00","2024-11-28 05:00:00+00"]
3747	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-12-04 04:59:00+00","2024-12-05 05:00:00+00"]
3748	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-12-11 04:59:00+00","2024-12-12 05:00:00+00"]
3749	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-12-18 04:59:00+00","2024-12-19 05:00:00+00"]
3750	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-12-25 04:59:00+00","2024-12-26 05:00:00+00"]
3751	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-01-01 04:59:00+00","2025-01-02 05:00:00+00"]
3752	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-01-08 04:59:00+00","2025-01-09 05:00:00+00"]
3753	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-01-15 04:59:00+00","2025-01-16 05:00:00+00"]
3754	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-01-22 04:59:00+00","2025-01-23 05:00:00+00"]
3755	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-01-29 04:59:00+00","2025-01-30 05:00:00+00"]
3756	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-02-05 04:59:00+00","2025-02-06 05:00:00+00"]
3757	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-02-12 04:59:00+00","2025-02-13 05:00:00+00"]
3758	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-02-19 04:59:00+00","2025-02-20 05:00:00+00"]
3759	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-02-26 04:59:00+00","2025-02-27 05:00:00+00"]
3760	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-03-05 04:59:00+00","2025-03-06 05:00:00+00"]
3761	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-03-12 03:59:00+00","2025-03-13 04:00:00+00"]
3762	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-03-19 03:59:00+00","2025-03-20 04:00:00+00"]
3763	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-03-26 03:59:00+00","2025-03-27 04:00:00+00"]
3764	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-04-02 03:59:00+00","2025-04-03 04:00:00+00"]
3765	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-04-09 03:59:00+00","2025-04-10 04:00:00+00"]
3766	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-04-16 03:59:00+00","2025-04-17 04:00:00+00"]
3767	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-04-23 03:59:00+00","2025-04-24 04:00:00+00"]
3768	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-04-30 03:59:00+00","2025-05-01 04:00:00+00"]
3769	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-05-07 03:59:00+00","2025-05-08 04:00:00+00"]
3770	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-05-14 03:59:00+00","2025-05-15 04:00:00+00"]
3771	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-05-21 03:59:00+00","2025-05-22 04:00:00+00"]
3772	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-05-28 03:59:00+00","2025-05-29 04:00:00+00"]
3773	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-06-04 03:59:00+00","2025-06-05 04:00:00+00"]
3774	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-06-11 03:59:00+00","2025-06-12 04:00:00+00"]
3775	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-06-18 03:59:00+00","2025-06-19 04:00:00+00"]
3776	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-06-25 03:59:00+00","2025-06-26 04:00:00+00"]
3777	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-07-02 03:59:00+00","2025-07-03 04:00:00+00"]
3778	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-07-09 03:59:00+00","2025-07-10 04:00:00+00"]
3779	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-07-16 03:59:00+00","2025-07-17 04:00:00+00"]
3780	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-07-23 03:59:00+00","2025-07-24 04:00:00+00"]
3781	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-07-30 03:59:00+00","2025-07-31 04:00:00+00"]
3782	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-08-06 03:59:00+00","2025-08-07 04:00:00+00"]
3783	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-08-13 03:59:00+00","2025-08-14 04:00:00+00"]
3784	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-08-20 03:59:00+00","2025-08-21 04:00:00+00"]
3785	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-08-27 03:59:00+00","2025-08-28 04:00:00+00"]
3786	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-09-03 03:59:00+00","2025-09-04 04:00:00+00"]
3787	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-09-10 03:59:00+00","2025-09-11 04:00:00+00"]
3788	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-09-17 03:59:00+00","2025-09-18 04:00:00+00"]
3789	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-09-24 03:59:00+00","2025-09-25 04:00:00+00"]
3790	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-10-01 03:59:00+00","2025-10-02 04:00:00+00"]
3791	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-10-08 03:59:00+00","2025-10-09 04:00:00+00"]
3792	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-10-15 03:59:00+00","2025-10-16 04:00:00+00"]
3793	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-10-22 03:59:00+00","2025-10-23 04:00:00+00"]
3794	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-10-29 03:59:00+00","2025-10-30 04:00:00+00"]
3795	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-11-05 04:59:00+00","2025-11-06 05:00:00+00"]
3796	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-11-12 04:59:00+00","2025-11-13 05:00:00+00"]
3797	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-11-21 04:59:00+00","2024-11-22 05:00:00+00"]
3798	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-11-28 04:59:00+00","2024-11-29 05:00:00+00"]
3799	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-12-05 04:59:00+00","2024-12-06 05:00:00+00"]
3800	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-12-12 04:59:00+00","2024-12-13 05:00:00+00"]
3801	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-12-19 04:59:00+00","2024-12-20 05:00:00+00"]
3802	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-12-26 04:59:00+00","2024-12-27 05:00:00+00"]
3803	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-01-02 04:59:00+00","2025-01-03 05:00:00+00"]
3804	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-01-09 04:59:00+00","2025-01-10 05:00:00+00"]
3805	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-01-16 04:59:00+00","2025-01-17 05:00:00+00"]
3806	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-01-23 04:59:00+00","2025-01-24 05:00:00+00"]
3807	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-01-30 04:59:00+00","2025-01-31 05:00:00+00"]
3808	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-02-06 04:59:00+00","2025-02-07 05:00:00+00"]
3809	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-02-13 04:59:00+00","2025-02-14 05:00:00+00"]
3810	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-02-20 04:59:00+00","2025-02-21 05:00:00+00"]
3811	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-02-27 04:59:00+00","2025-02-28 05:00:00+00"]
3812	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-03-06 04:59:00+00","2025-03-07 05:00:00+00"]
3813	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-03-13 03:59:00+00","2025-03-14 04:00:00+00"]
3814	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-03-20 03:59:00+00","2025-03-21 04:00:00+00"]
3815	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-03-27 03:59:00+00","2025-03-28 04:00:00+00"]
3816	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-04-03 03:59:00+00","2025-04-04 04:00:00+00"]
3817	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-04-10 03:59:00+00","2025-04-11 04:00:00+00"]
3818	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-04-17 03:59:00+00","2025-04-18 04:00:00+00"]
3819	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-04-24 03:59:00+00","2025-04-25 04:00:00+00"]
3820	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-05-01 03:59:00+00","2025-05-02 04:00:00+00"]
3821	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-05-08 03:59:00+00","2025-05-09 04:00:00+00"]
3822	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-05-15 03:59:00+00","2025-05-16 04:00:00+00"]
3823	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-05-22 03:59:00+00","2025-05-23 04:00:00+00"]
3824	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-05-29 03:59:00+00","2025-05-30 04:00:00+00"]
3825	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-06-05 03:59:00+00","2025-06-06 04:00:00+00"]
3826	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-06-12 03:59:00+00","2025-06-13 04:00:00+00"]
3827	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-06-19 03:59:00+00","2025-06-20 04:00:00+00"]
3828	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-06-26 03:59:00+00","2025-06-27 04:00:00+00"]
3829	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-07-03 03:59:00+00","2025-07-04 04:00:00+00"]
3830	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-07-10 03:59:00+00","2025-07-11 04:00:00+00"]
3831	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-07-17 03:59:00+00","2025-07-18 04:00:00+00"]
3832	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-07-24 03:59:00+00","2025-07-25 04:00:00+00"]
3833	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-07-31 03:59:00+00","2025-08-01 04:00:00+00"]
3834	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-08-07 03:59:00+00","2025-08-08 04:00:00+00"]
3835	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-08-14 03:59:00+00","2025-08-15 04:00:00+00"]
3836	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-08-21 03:59:00+00","2025-08-22 04:00:00+00"]
3837	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-08-28 03:59:00+00","2025-08-29 04:00:00+00"]
3838	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-09-04 03:59:00+00","2025-09-05 04:00:00+00"]
3839	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-09-11 03:59:00+00","2025-09-12 04:00:00+00"]
3840	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-09-18 03:59:00+00","2025-09-19 04:00:00+00"]
3841	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-09-25 03:59:00+00","2025-09-26 04:00:00+00"]
3842	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-10-02 03:59:00+00","2025-10-03 04:00:00+00"]
3843	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-10-09 03:59:00+00","2025-10-10 04:00:00+00"]
3844	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-10-16 03:59:00+00","2025-10-17 04:00:00+00"]
3845	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-10-23 03:59:00+00","2025-10-24 04:00:00+00"]
3846	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-10-30 03:59:00+00","2025-10-31 04:00:00+00"]
3847	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-11-06 04:59:00+00","2025-11-07 05:00:00+00"]
3848	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-11-13 04:59:00+00","2025-11-14 05:00:00+00"]
3849	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-11-22 04:59:00+00","2024-11-23 05:00:00+00"]
3850	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-11-29 04:59:00+00","2024-11-30 05:00:00+00"]
3851	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-12-06 04:59:00+00","2024-12-07 05:00:00+00"]
3852	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-12-13 04:59:00+00","2024-12-14 05:00:00+00"]
3853	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-12-20 04:59:00+00","2024-12-21 05:00:00+00"]
3854	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-12-27 04:59:00+00","2024-12-28 05:00:00+00"]
3855	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-01-03 04:59:00+00","2025-01-04 05:00:00+00"]
3856	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-01-10 04:59:00+00","2025-01-11 05:00:00+00"]
3857	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-01-17 04:59:00+00","2025-01-18 05:00:00+00"]
3858	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-01-24 04:59:00+00","2025-01-25 05:00:00+00"]
3859	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-01-31 04:59:00+00","2025-02-01 05:00:00+00"]
3860	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-02-07 04:59:00+00","2025-02-08 05:00:00+00"]
3861	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-02-14 04:59:00+00","2025-02-15 05:00:00+00"]
3862	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-02-21 04:59:00+00","2025-02-22 05:00:00+00"]
3863	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-02-28 04:59:00+00","2025-03-01 05:00:00+00"]
3864	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-03-07 04:59:00+00","2025-03-08 05:00:00+00"]
3865	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-03-14 03:59:00+00","2025-03-15 04:00:00+00"]
3866	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-03-21 03:59:00+00","2025-03-22 04:00:00+00"]
3867	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-03-28 03:59:00+00","2025-03-29 04:00:00+00"]
3868	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-04-04 03:59:00+00","2025-04-05 04:00:00+00"]
3869	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-04-11 03:59:00+00","2025-04-12 04:00:00+00"]
3870	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-04-18 03:59:00+00","2025-04-19 04:00:00+00"]
3871	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-04-25 03:59:00+00","2025-04-26 04:00:00+00"]
3872	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-05-02 03:59:00+00","2025-05-03 04:00:00+00"]
3873	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-05-09 03:59:00+00","2025-05-10 04:00:00+00"]
3874	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-05-16 03:59:00+00","2025-05-17 04:00:00+00"]
3875	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-05-23 03:59:00+00","2025-05-24 04:00:00+00"]
3876	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-05-30 03:59:00+00","2025-05-31 04:00:00+00"]
3877	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-06-06 03:59:00+00","2025-06-07 04:00:00+00"]
3878	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-06-13 03:59:00+00","2025-06-14 04:00:00+00"]
3879	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-06-20 03:59:00+00","2025-06-21 04:00:00+00"]
3880	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-06-27 03:59:00+00","2025-06-28 04:00:00+00"]
3881	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-07-04 03:59:00+00","2025-07-05 04:00:00+00"]
3882	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-07-11 03:59:00+00","2025-07-12 04:00:00+00"]
3883	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-07-18 03:59:00+00","2025-07-19 04:00:00+00"]
3884	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-07-25 03:59:00+00","2025-07-26 04:00:00+00"]
3885	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-08-01 03:59:00+00","2025-08-02 04:00:00+00"]
3886	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-08-08 03:59:00+00","2025-08-09 04:00:00+00"]
3887	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-08-15 03:59:00+00","2025-08-16 04:00:00+00"]
3888	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-08-22 03:59:00+00","2025-08-23 04:00:00+00"]
3889	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-08-29 03:59:00+00","2025-08-30 04:00:00+00"]
3890	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-09-05 03:59:00+00","2025-09-06 04:00:00+00"]
3891	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-09-12 03:59:00+00","2025-09-13 04:00:00+00"]
3892	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-09-19 03:59:00+00","2025-09-20 04:00:00+00"]
3893	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-09-26 03:59:00+00","2025-09-27 04:00:00+00"]
3894	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-10-03 03:59:00+00","2025-10-04 04:00:00+00"]
3895	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-10-10 03:59:00+00","2025-10-11 04:00:00+00"]
3896	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-10-17 03:59:00+00","2025-10-18 04:00:00+00"]
3897	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-10-24 03:59:00+00","2025-10-25 04:00:00+00"]
3898	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-10-31 03:59:00+00","2025-11-01 04:00:00+00"]
3899	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-11-07 04:59:00+00","2025-11-08 05:00:00+00"]
3900	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-11-14 04:59:00+00","2025-11-15 05:00:00+00"]
3901	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-11-23 04:59:00+00","2024-11-24 05:00:00+00"]
3902	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-11-30 04:59:00+00","2024-12-01 05:00:00+00"]
3903	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-12-07 04:59:00+00","2024-12-08 05:00:00+00"]
3904	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-12-14 04:59:00+00","2024-12-15 05:00:00+00"]
3905	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-12-21 04:59:00+00","2024-12-22 05:00:00+00"]
3906	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-12-28 04:59:00+00","2024-12-29 05:00:00+00"]
3907	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-01-04 04:59:00+00","2025-01-05 05:00:00+00"]
3908	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-01-11 04:59:00+00","2025-01-12 05:00:00+00"]
3909	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-01-18 04:59:00+00","2025-01-19 05:00:00+00"]
3910	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-01-25 04:59:00+00","2025-01-26 05:00:00+00"]
3911	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-02-01 04:59:00+00","2025-02-02 05:00:00+00"]
3912	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-02-08 04:59:00+00","2025-02-09 05:00:00+00"]
3913	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-02-15 04:59:00+00","2025-02-16 05:00:00+00"]
3914	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-02-22 04:59:00+00","2025-02-23 05:00:00+00"]
3915	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-03-01 04:59:00+00","2025-03-02 05:00:00+00"]
3916	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-03-08 04:59:00+00","2025-03-09 05:00:00+00"]
3917	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-03-15 03:59:00+00","2025-03-16 04:00:00+00"]
3918	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-03-22 03:59:00+00","2025-03-23 04:00:00+00"]
3919	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-03-29 03:59:00+00","2025-03-30 04:00:00+00"]
3920	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-04-05 03:59:00+00","2025-04-06 04:00:00+00"]
3921	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-04-12 03:59:00+00","2025-04-13 04:00:00+00"]
3922	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-04-19 03:59:00+00","2025-04-20 04:00:00+00"]
3923	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-04-26 03:59:00+00","2025-04-27 04:00:00+00"]
3924	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-05-03 03:59:00+00","2025-05-04 04:00:00+00"]
3925	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-05-10 03:59:00+00","2025-05-11 04:00:00+00"]
3926	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-05-17 03:59:00+00","2025-05-18 04:00:00+00"]
3927	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-05-24 03:59:00+00","2025-05-25 04:00:00+00"]
3928	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-05-31 03:59:00+00","2025-06-01 04:00:00+00"]
3929	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-06-07 03:59:00+00","2025-06-08 04:00:00+00"]
3930	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-06-14 03:59:00+00","2025-06-15 04:00:00+00"]
3931	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-06-21 03:59:00+00","2025-06-22 04:00:00+00"]
3932	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-06-28 03:59:00+00","2025-06-29 04:00:00+00"]
3933	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-07-05 03:59:00+00","2025-07-06 04:00:00+00"]
3934	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-07-12 03:59:00+00","2025-07-13 04:00:00+00"]
3935	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-07-19 03:59:00+00","2025-07-20 04:00:00+00"]
3936	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-07-26 03:59:00+00","2025-07-27 04:00:00+00"]
3937	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-08-02 03:59:00+00","2025-08-03 04:00:00+00"]
3938	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-08-09 03:59:00+00","2025-08-10 04:00:00+00"]
3939	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-08-16 03:59:00+00","2025-08-17 04:00:00+00"]
3940	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-08-23 03:59:00+00","2025-08-24 04:00:00+00"]
3941	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-08-30 03:59:00+00","2025-08-31 04:00:00+00"]
3942	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-09-06 03:59:00+00","2025-09-07 04:00:00+00"]
3943	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-09-13 03:59:00+00","2025-09-14 04:00:00+00"]
3944	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-09-20 03:59:00+00","2025-09-21 04:00:00+00"]
3945	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-09-27 03:59:00+00","2025-09-28 04:00:00+00"]
3946	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-10-04 03:59:00+00","2025-10-05 04:00:00+00"]
3947	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-10-11 03:59:00+00","2025-10-12 04:00:00+00"]
3948	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-10-18 03:59:00+00","2025-10-19 04:00:00+00"]
3949	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-10-25 03:59:00+00","2025-10-26 04:00:00+00"]
3950	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-11-01 03:59:00+00","2025-11-02 04:00:00+00"]
3951	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-11-08 04:59:00+00","2025-11-09 05:00:00+00"]
3952	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-11-15 04:59:00+00","2025-11-16 05:00:00+00"]
3953	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-11-24 04:59:00+00","2024-11-25 05:00:00+00"]
3954	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-12-01 04:59:00+00","2024-12-02 05:00:00+00"]
3955	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-12-08 04:59:00+00","2024-12-09 05:00:00+00"]
3956	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-12-15 04:59:00+00","2024-12-16 05:00:00+00"]
3957	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-12-22 04:59:00+00","2024-12-23 05:00:00+00"]
3958	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-12-29 04:59:00+00","2024-12-30 05:00:00+00"]
3959	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-01-05 04:59:00+00","2025-01-06 05:00:00+00"]
3960	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-01-12 04:59:00+00","2025-01-13 05:00:00+00"]
3961	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-01-19 04:59:00+00","2025-01-20 05:00:00+00"]
3962	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-01-26 04:59:00+00","2025-01-27 05:00:00+00"]
3963	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-02-02 04:59:00+00","2025-02-03 05:00:00+00"]
3964	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-02-09 04:59:00+00","2025-02-10 05:00:00+00"]
3965	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-02-16 04:59:00+00","2025-02-17 05:00:00+00"]
3966	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-02-23 04:59:00+00","2025-02-24 05:00:00+00"]
3967	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-03-02 04:59:00+00","2025-03-03 05:00:00+00"]
3968	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-03-09 04:59:00+00","2025-03-10 04:00:00+00"]
3969	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-03-16 03:59:00+00","2025-03-17 04:00:00+00"]
3970	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-03-23 03:59:00+00","2025-03-24 04:00:00+00"]
3971	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-03-30 03:59:00+00","2025-03-31 04:00:00+00"]
3972	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-04-06 03:59:00+00","2025-04-07 04:00:00+00"]
3973	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-04-13 03:59:00+00","2025-04-14 04:00:00+00"]
3974	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-04-20 03:59:00+00","2025-04-21 04:00:00+00"]
3975	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-04-27 03:59:00+00","2025-04-28 04:00:00+00"]
3976	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-05-04 03:59:00+00","2025-05-05 04:00:00+00"]
3977	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-05-11 03:59:00+00","2025-05-12 04:00:00+00"]
3978	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-05-18 03:59:00+00","2025-05-19 04:00:00+00"]
3979	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-05-25 03:59:00+00","2025-05-26 04:00:00+00"]
3980	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-06-01 03:59:00+00","2025-06-02 04:00:00+00"]
3981	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-06-08 03:59:00+00","2025-06-09 04:00:00+00"]
3982	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-06-15 03:59:00+00","2025-06-16 04:00:00+00"]
3983	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-06-22 03:59:00+00","2025-06-23 04:00:00+00"]
3984	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-06-29 03:59:00+00","2025-06-30 04:00:00+00"]
3985	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-07-06 03:59:00+00","2025-07-07 04:00:00+00"]
3986	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-07-13 03:59:00+00","2025-07-14 04:00:00+00"]
3987	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-07-20 03:59:00+00","2025-07-21 04:00:00+00"]
3988	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-07-27 03:59:00+00","2025-07-28 04:00:00+00"]
3989	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-08-03 03:59:00+00","2025-08-04 04:00:00+00"]
3990	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-08-10 03:59:00+00","2025-08-11 04:00:00+00"]
3991	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-08-17 03:59:00+00","2025-08-18 04:00:00+00"]
3992	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-08-24 03:59:00+00","2025-08-25 04:00:00+00"]
3993	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-08-31 03:59:00+00","2025-09-01 04:00:00+00"]
3994	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-09-07 03:59:00+00","2025-09-08 04:00:00+00"]
3995	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-09-14 03:59:00+00","2025-09-15 04:00:00+00"]
3996	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-09-21 03:59:00+00","2025-09-22 04:00:00+00"]
3997	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-09-28 03:59:00+00","2025-09-29 04:00:00+00"]
3998	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-10-05 03:59:00+00","2025-10-06 04:00:00+00"]
3999	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-10-12 03:59:00+00","2025-10-13 04:00:00+00"]
4000	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-10-19 03:59:00+00","2025-10-20 04:00:00+00"]
4001	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-10-26 03:59:00+00","2025-10-27 04:00:00+00"]
4002	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-11-02 03:59:00+00","2025-11-03 05:00:00+00"]
4003	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-11-09 04:59:00+00","2025-11-10 05:00:00+00"]
4004	96a998d9-41fc-41b8-bc73-a08e312de595	["2025-11-16 04:59:00+00","2025-11-17 05:00:00+00"]
4005	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-11-18 04:59:00+00","2024-11-19 05:00:00+00"]
4006	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-11-25 04:59:00+00","2024-11-26 05:00:00+00"]
4007	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-12-02 04:59:00+00","2024-12-03 05:00:00+00"]
4008	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-12-09 04:59:00+00","2024-12-10 05:00:00+00"]
4009	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-12-16 04:59:00+00","2024-12-17 05:00:00+00"]
4010	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-12-23 04:59:00+00","2024-12-24 05:00:00+00"]
4011	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-12-30 04:59:00+00","2024-12-31 05:00:00+00"]
4012	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-01-06 04:59:00+00","2025-01-07 05:00:00+00"]
4013	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-01-13 04:59:00+00","2025-01-14 05:00:00+00"]
4014	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-01-20 04:59:00+00","2025-01-21 05:00:00+00"]
4015	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-01-27 04:59:00+00","2025-01-28 05:00:00+00"]
4016	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-02-03 04:59:00+00","2025-02-04 05:00:00+00"]
4017	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-02-10 04:59:00+00","2025-02-11 05:00:00+00"]
4018	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-02-17 04:59:00+00","2025-02-18 05:00:00+00"]
4019	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-02-24 04:59:00+00","2025-02-25 05:00:00+00"]
4020	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-03-03 04:59:00+00","2025-03-04 05:00:00+00"]
4021	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-03-10 03:59:00+00","2025-03-11 04:00:00+00"]
4022	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-03-17 03:59:00+00","2025-03-18 04:00:00+00"]
4023	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-03-24 03:59:00+00","2025-03-25 04:00:00+00"]
4024	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-03-31 03:59:00+00","2025-04-01 04:00:00+00"]
4025	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-04-07 03:59:00+00","2025-04-08 04:00:00+00"]
4026	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-04-14 03:59:00+00","2025-04-15 04:00:00+00"]
4027	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-04-21 03:59:00+00","2025-04-22 04:00:00+00"]
4028	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-04-28 03:59:00+00","2025-04-29 04:00:00+00"]
4029	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-05-05 03:59:00+00","2025-05-06 04:00:00+00"]
4030	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-05-12 03:59:00+00","2025-05-13 04:00:00+00"]
4031	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-05-19 03:59:00+00","2025-05-20 04:00:00+00"]
4032	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-05-26 03:59:00+00","2025-05-27 04:00:00+00"]
4033	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-06-02 03:59:00+00","2025-06-03 04:00:00+00"]
4034	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-06-09 03:59:00+00","2025-06-10 04:00:00+00"]
4035	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-06-16 03:59:00+00","2025-06-17 04:00:00+00"]
4036	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-06-23 03:59:00+00","2025-06-24 04:00:00+00"]
4037	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-06-30 03:59:00+00","2025-07-01 04:00:00+00"]
4038	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-07-07 03:59:00+00","2025-07-08 04:00:00+00"]
4039	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-07-14 03:59:00+00","2025-07-15 04:00:00+00"]
4040	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-07-21 03:59:00+00","2025-07-22 04:00:00+00"]
4041	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-07-28 03:59:00+00","2025-07-29 04:00:00+00"]
4042	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-08-04 03:59:00+00","2025-08-05 04:00:00+00"]
4043	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-08-11 03:59:00+00","2025-08-12 04:00:00+00"]
4044	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-08-18 03:59:00+00","2025-08-19 04:00:00+00"]
4045	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-08-25 03:59:00+00","2025-08-26 04:00:00+00"]
4046	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-09-01 03:59:00+00","2025-09-02 04:00:00+00"]
4047	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-09-08 03:59:00+00","2025-09-09 04:00:00+00"]
4048	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-09-15 03:59:00+00","2025-09-16 04:00:00+00"]
4049	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-09-22 03:59:00+00","2025-09-23 04:00:00+00"]
4050	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-09-29 03:59:00+00","2025-09-30 04:00:00+00"]
4051	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-10-06 03:59:00+00","2025-10-07 04:00:00+00"]
4052	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-10-13 03:59:00+00","2025-10-14 04:00:00+00"]
4053	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-10-20 03:59:00+00","2025-10-21 04:00:00+00"]
4054	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-10-27 03:59:00+00","2025-10-28 04:00:00+00"]
4055	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-11-03 04:59:00+00","2025-11-04 05:00:00+00"]
4056	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-11-10 04:59:00+00","2025-11-11 05:00:00+00"]
4057	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-11-19 04:59:00+00","2024-11-20 05:00:00+00"]
4058	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-11-26 04:59:00+00","2024-11-27 05:00:00+00"]
4059	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-12-03 04:59:00+00","2024-12-04 05:00:00+00"]
4060	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-12-10 04:59:00+00","2024-12-11 05:00:00+00"]
4061	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-12-17 04:59:00+00","2024-12-18 05:00:00+00"]
4062	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-12-24 04:59:00+00","2024-12-25 05:00:00+00"]
4063	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-12-31 04:59:00+00","2025-01-01 05:00:00+00"]
4064	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-01-07 04:59:00+00","2025-01-08 05:00:00+00"]
4065	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-01-14 04:59:00+00","2025-01-15 05:00:00+00"]
4066	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-01-21 04:59:00+00","2025-01-22 05:00:00+00"]
4067	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-01-28 04:59:00+00","2025-01-29 05:00:00+00"]
4068	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-02-04 04:59:00+00","2025-02-05 05:00:00+00"]
4069	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-02-11 04:59:00+00","2025-02-12 05:00:00+00"]
4070	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-02-18 04:59:00+00","2025-02-19 05:00:00+00"]
4071	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-02-25 04:59:00+00","2025-02-26 05:00:00+00"]
4072	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-03-04 04:59:00+00","2025-03-05 05:00:00+00"]
4073	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-03-11 03:59:00+00","2025-03-12 04:00:00+00"]
4074	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-03-18 03:59:00+00","2025-03-19 04:00:00+00"]
4075	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-03-25 03:59:00+00","2025-03-26 04:00:00+00"]
4076	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-04-01 03:59:00+00","2025-04-02 04:00:00+00"]
4077	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-04-08 03:59:00+00","2025-04-09 04:00:00+00"]
4078	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-04-15 03:59:00+00","2025-04-16 04:00:00+00"]
4079	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-04-22 03:59:00+00","2025-04-23 04:00:00+00"]
4080	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-04-29 03:59:00+00","2025-04-30 04:00:00+00"]
4081	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-05-06 03:59:00+00","2025-05-07 04:00:00+00"]
4082	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-05-13 03:59:00+00","2025-05-14 04:00:00+00"]
4083	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-05-20 03:59:00+00","2025-05-21 04:00:00+00"]
4084	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-05-27 03:59:00+00","2025-05-28 04:00:00+00"]
4085	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-06-03 03:59:00+00","2025-06-04 04:00:00+00"]
4086	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-06-10 03:59:00+00","2025-06-11 04:00:00+00"]
4087	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-06-17 03:59:00+00","2025-06-18 04:00:00+00"]
4088	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-06-24 03:59:00+00","2025-06-25 04:00:00+00"]
4089	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-07-01 03:59:00+00","2025-07-02 04:00:00+00"]
4090	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-07-08 03:59:00+00","2025-07-09 04:00:00+00"]
4091	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-07-15 03:59:00+00","2025-07-16 04:00:00+00"]
4092	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-07-22 03:59:00+00","2025-07-23 04:00:00+00"]
4093	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-07-29 03:59:00+00","2025-07-30 04:00:00+00"]
4094	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-08-05 03:59:00+00","2025-08-06 04:00:00+00"]
4095	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-08-12 03:59:00+00","2025-08-13 04:00:00+00"]
4096	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-08-19 03:59:00+00","2025-08-20 04:00:00+00"]
4097	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-08-26 03:59:00+00","2025-08-27 04:00:00+00"]
4098	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-09-02 03:59:00+00","2025-09-03 04:00:00+00"]
4099	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-09-09 03:59:00+00","2025-09-10 04:00:00+00"]
4100	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-09-16 03:59:00+00","2025-09-17 04:00:00+00"]
4101	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-09-23 03:59:00+00","2025-09-24 04:00:00+00"]
4102	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-09-30 03:59:00+00","2025-10-01 04:00:00+00"]
4103	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-10-07 03:59:00+00","2025-10-08 04:00:00+00"]
4104	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-10-14 03:59:00+00","2025-10-15 04:00:00+00"]
4105	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-10-21 03:59:00+00","2025-10-22 04:00:00+00"]
4106	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-10-28 03:59:00+00","2025-10-29 04:00:00+00"]
4107	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-11-04 04:59:00+00","2025-11-05 05:00:00+00"]
4108	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-11-11 04:59:00+00","2025-11-12 05:00:00+00"]
4109	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-11-20 04:59:00+00","2024-11-21 05:00:00+00"]
4110	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-11-27 04:59:00+00","2024-11-28 05:00:00+00"]
4111	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-12-04 04:59:00+00","2024-12-05 05:00:00+00"]
4112	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-12-11 04:59:00+00","2024-12-12 05:00:00+00"]
4113	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-12-18 04:59:00+00","2024-12-19 05:00:00+00"]
4114	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-12-25 04:59:00+00","2024-12-26 05:00:00+00"]
4115	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-01-01 04:59:00+00","2025-01-02 05:00:00+00"]
4116	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-01-08 04:59:00+00","2025-01-09 05:00:00+00"]
4117	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-01-15 04:59:00+00","2025-01-16 05:00:00+00"]
4118	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-01-22 04:59:00+00","2025-01-23 05:00:00+00"]
4119	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-01-29 04:59:00+00","2025-01-30 05:00:00+00"]
4120	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-02-05 04:59:00+00","2025-02-06 05:00:00+00"]
4121	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-02-12 04:59:00+00","2025-02-13 05:00:00+00"]
4122	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-02-19 04:59:00+00","2025-02-20 05:00:00+00"]
4123	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-02-26 04:59:00+00","2025-02-27 05:00:00+00"]
4124	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-03-05 04:59:00+00","2025-03-06 05:00:00+00"]
4125	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-03-12 03:59:00+00","2025-03-13 04:00:00+00"]
4126	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-03-19 03:59:00+00","2025-03-20 04:00:00+00"]
4127	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-03-26 03:59:00+00","2025-03-27 04:00:00+00"]
4128	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-04-02 03:59:00+00","2025-04-03 04:00:00+00"]
4129	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-04-09 03:59:00+00","2025-04-10 04:00:00+00"]
4130	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-04-16 03:59:00+00","2025-04-17 04:00:00+00"]
4131	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-04-23 03:59:00+00","2025-04-24 04:00:00+00"]
4132	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-04-30 03:59:00+00","2025-05-01 04:00:00+00"]
4133	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-05-07 03:59:00+00","2025-05-08 04:00:00+00"]
4134	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-05-14 03:59:00+00","2025-05-15 04:00:00+00"]
4135	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-05-21 03:59:00+00","2025-05-22 04:00:00+00"]
4136	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-05-28 03:59:00+00","2025-05-29 04:00:00+00"]
4137	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-06-04 03:59:00+00","2025-06-05 04:00:00+00"]
4138	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-06-11 03:59:00+00","2025-06-12 04:00:00+00"]
4139	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-06-18 03:59:00+00","2025-06-19 04:00:00+00"]
4140	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-06-25 03:59:00+00","2025-06-26 04:00:00+00"]
4141	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-07-02 03:59:00+00","2025-07-03 04:00:00+00"]
4142	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-07-09 03:59:00+00","2025-07-10 04:00:00+00"]
4143	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-07-16 03:59:00+00","2025-07-17 04:00:00+00"]
4144	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-07-23 03:59:00+00","2025-07-24 04:00:00+00"]
4145	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-07-30 03:59:00+00","2025-07-31 04:00:00+00"]
4146	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-08-06 03:59:00+00","2025-08-07 04:00:00+00"]
4147	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-08-13 03:59:00+00","2025-08-14 04:00:00+00"]
4148	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-08-20 03:59:00+00","2025-08-21 04:00:00+00"]
4149	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-08-27 03:59:00+00","2025-08-28 04:00:00+00"]
4150	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-09-03 03:59:00+00","2025-09-04 04:00:00+00"]
4151	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-09-10 03:59:00+00","2025-09-11 04:00:00+00"]
4152	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-09-17 03:59:00+00","2025-09-18 04:00:00+00"]
4153	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-09-24 03:59:00+00","2025-09-25 04:00:00+00"]
4154	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-10-01 03:59:00+00","2025-10-02 04:00:00+00"]
4155	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-10-08 03:59:00+00","2025-10-09 04:00:00+00"]
4156	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-10-15 03:59:00+00","2025-10-16 04:00:00+00"]
4157	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-10-22 03:59:00+00","2025-10-23 04:00:00+00"]
4158	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-10-29 03:59:00+00","2025-10-30 04:00:00+00"]
4159	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-11-05 04:59:00+00","2025-11-06 05:00:00+00"]
4160	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-11-12 04:59:00+00","2025-11-13 05:00:00+00"]
4161	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-11-21 04:59:00+00","2024-11-22 05:00:00+00"]
4162	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-11-28 04:59:00+00","2024-11-29 05:00:00+00"]
4163	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-12-05 04:59:00+00","2024-12-06 05:00:00+00"]
4164	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-12-12 04:59:00+00","2024-12-13 05:00:00+00"]
4165	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-12-19 04:59:00+00","2024-12-20 05:00:00+00"]
4166	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-12-26 04:59:00+00","2024-12-27 05:00:00+00"]
4167	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-01-02 04:59:00+00","2025-01-03 05:00:00+00"]
4168	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-01-09 04:59:00+00","2025-01-10 05:00:00+00"]
4169	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-01-16 04:59:00+00","2025-01-17 05:00:00+00"]
4170	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-01-23 04:59:00+00","2025-01-24 05:00:00+00"]
4171	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-01-30 04:59:00+00","2025-01-31 05:00:00+00"]
4172	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-02-06 04:59:00+00","2025-02-07 05:00:00+00"]
4173	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-02-13 04:59:00+00","2025-02-14 05:00:00+00"]
4174	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-02-20 04:59:00+00","2025-02-21 05:00:00+00"]
4175	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-02-27 04:59:00+00","2025-02-28 05:00:00+00"]
4176	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-03-06 04:59:00+00","2025-03-07 05:00:00+00"]
4177	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-03-13 03:59:00+00","2025-03-14 04:00:00+00"]
4178	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-03-20 03:59:00+00","2025-03-21 04:00:00+00"]
4179	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-03-27 03:59:00+00","2025-03-28 04:00:00+00"]
4180	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-04-03 03:59:00+00","2025-04-04 04:00:00+00"]
4181	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-04-10 03:59:00+00","2025-04-11 04:00:00+00"]
4182	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-04-17 03:59:00+00","2025-04-18 04:00:00+00"]
4183	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-04-24 03:59:00+00","2025-04-25 04:00:00+00"]
4184	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-05-01 03:59:00+00","2025-05-02 04:00:00+00"]
4185	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-05-08 03:59:00+00","2025-05-09 04:00:00+00"]
4186	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-05-15 03:59:00+00","2025-05-16 04:00:00+00"]
4187	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-05-22 03:59:00+00","2025-05-23 04:00:00+00"]
4188	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-05-29 03:59:00+00","2025-05-30 04:00:00+00"]
4189	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-06-05 03:59:00+00","2025-06-06 04:00:00+00"]
4190	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-06-12 03:59:00+00","2025-06-13 04:00:00+00"]
4191	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-06-19 03:59:00+00","2025-06-20 04:00:00+00"]
4192	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-06-26 03:59:00+00","2025-06-27 04:00:00+00"]
4193	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-07-03 03:59:00+00","2025-07-04 04:00:00+00"]
4194	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-07-10 03:59:00+00","2025-07-11 04:00:00+00"]
4195	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-07-17 03:59:00+00","2025-07-18 04:00:00+00"]
4196	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-07-24 03:59:00+00","2025-07-25 04:00:00+00"]
4197	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-07-31 03:59:00+00","2025-08-01 04:00:00+00"]
4198	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-08-07 03:59:00+00","2025-08-08 04:00:00+00"]
4199	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-08-14 03:59:00+00","2025-08-15 04:00:00+00"]
4200	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-08-21 03:59:00+00","2025-08-22 04:00:00+00"]
4201	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-08-28 03:59:00+00","2025-08-29 04:00:00+00"]
4202	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-09-04 03:59:00+00","2025-09-05 04:00:00+00"]
4203	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-09-11 03:59:00+00","2025-09-12 04:00:00+00"]
4204	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-09-18 03:59:00+00","2025-09-19 04:00:00+00"]
4205	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-09-25 03:59:00+00","2025-09-26 04:00:00+00"]
4206	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-10-02 03:59:00+00","2025-10-03 04:00:00+00"]
4207	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-10-09 03:59:00+00","2025-10-10 04:00:00+00"]
4208	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-10-16 03:59:00+00","2025-10-17 04:00:00+00"]
4209	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-10-23 03:59:00+00","2025-10-24 04:00:00+00"]
4210	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-10-30 03:59:00+00","2025-10-31 04:00:00+00"]
4211	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-11-06 04:59:00+00","2025-11-07 05:00:00+00"]
4212	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-11-13 04:59:00+00","2025-11-14 05:00:00+00"]
4213	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-11-22 04:59:00+00","2024-11-23 05:00:00+00"]
4214	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-11-29 04:59:00+00","2024-11-30 05:00:00+00"]
4215	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-12-06 04:59:00+00","2024-12-07 05:00:00+00"]
4216	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-12-13 04:59:00+00","2024-12-14 05:00:00+00"]
4217	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-12-20 04:59:00+00","2024-12-21 05:00:00+00"]
4218	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-12-27 04:59:00+00","2024-12-28 05:00:00+00"]
4219	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-01-03 04:59:00+00","2025-01-04 05:00:00+00"]
4220	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-01-10 04:59:00+00","2025-01-11 05:00:00+00"]
4221	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-01-17 04:59:00+00","2025-01-18 05:00:00+00"]
4222	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-01-24 04:59:00+00","2025-01-25 05:00:00+00"]
4223	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-01-31 04:59:00+00","2025-02-01 05:00:00+00"]
4224	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-02-07 04:59:00+00","2025-02-08 05:00:00+00"]
4225	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-02-14 04:59:00+00","2025-02-15 05:00:00+00"]
4226	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-02-21 04:59:00+00","2025-02-22 05:00:00+00"]
4227	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-02-28 04:59:00+00","2025-03-01 05:00:00+00"]
4228	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-03-07 04:59:00+00","2025-03-08 05:00:00+00"]
4229	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-03-14 03:59:00+00","2025-03-15 04:00:00+00"]
4230	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-03-21 03:59:00+00","2025-03-22 04:00:00+00"]
4231	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-03-28 03:59:00+00","2025-03-29 04:00:00+00"]
4232	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-04-04 03:59:00+00","2025-04-05 04:00:00+00"]
4233	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-04-11 03:59:00+00","2025-04-12 04:00:00+00"]
4234	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-04-18 03:59:00+00","2025-04-19 04:00:00+00"]
4235	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-04-25 03:59:00+00","2025-04-26 04:00:00+00"]
4236	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-05-02 03:59:00+00","2025-05-03 04:00:00+00"]
4237	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-05-09 03:59:00+00","2025-05-10 04:00:00+00"]
4238	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-05-16 03:59:00+00","2025-05-17 04:00:00+00"]
4239	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-05-23 03:59:00+00","2025-05-24 04:00:00+00"]
4240	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-05-30 03:59:00+00","2025-05-31 04:00:00+00"]
4241	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-06-06 03:59:00+00","2025-06-07 04:00:00+00"]
4242	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-06-13 03:59:00+00","2025-06-14 04:00:00+00"]
4243	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-06-20 03:59:00+00","2025-06-21 04:00:00+00"]
4244	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-06-27 03:59:00+00","2025-06-28 04:00:00+00"]
4245	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-07-04 03:59:00+00","2025-07-05 04:00:00+00"]
4246	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-07-11 03:59:00+00","2025-07-12 04:00:00+00"]
4247	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-07-18 03:59:00+00","2025-07-19 04:00:00+00"]
4248	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-07-25 03:59:00+00","2025-07-26 04:00:00+00"]
4249	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-08-01 03:59:00+00","2025-08-02 04:00:00+00"]
4250	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-08-08 03:59:00+00","2025-08-09 04:00:00+00"]
4251	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-08-15 03:59:00+00","2025-08-16 04:00:00+00"]
4252	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-08-22 03:59:00+00","2025-08-23 04:00:00+00"]
4253	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-08-29 03:59:00+00","2025-08-30 04:00:00+00"]
4254	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-09-05 03:59:00+00","2025-09-06 04:00:00+00"]
4255	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-09-12 03:59:00+00","2025-09-13 04:00:00+00"]
4256	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-09-19 03:59:00+00","2025-09-20 04:00:00+00"]
4257	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-09-26 03:59:00+00","2025-09-27 04:00:00+00"]
4258	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-10-03 03:59:00+00","2025-10-04 04:00:00+00"]
4259	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-10-10 03:59:00+00","2025-10-11 04:00:00+00"]
4260	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-10-17 03:59:00+00","2025-10-18 04:00:00+00"]
4261	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-10-24 03:59:00+00","2025-10-25 04:00:00+00"]
4262	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-10-31 03:59:00+00","2025-11-01 04:00:00+00"]
4263	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-11-07 04:59:00+00","2025-11-08 05:00:00+00"]
4264	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-11-14 04:59:00+00","2025-11-15 05:00:00+00"]
4265	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-11-23 04:59:00+00","2024-11-24 05:00:00+00"]
4266	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-11-30 04:59:00+00","2024-12-01 05:00:00+00"]
4267	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-12-07 04:59:00+00","2024-12-08 05:00:00+00"]
4268	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-12-14 04:59:00+00","2024-12-15 05:00:00+00"]
4269	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-12-21 04:59:00+00","2024-12-22 05:00:00+00"]
4270	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-12-28 04:59:00+00","2024-12-29 05:00:00+00"]
4271	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-01-04 04:59:00+00","2025-01-05 05:00:00+00"]
4272	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-01-11 04:59:00+00","2025-01-12 05:00:00+00"]
4273	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-01-18 04:59:00+00","2025-01-19 05:00:00+00"]
4274	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-01-25 04:59:00+00","2025-01-26 05:00:00+00"]
4275	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-02-01 04:59:00+00","2025-02-02 05:00:00+00"]
4276	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-02-08 04:59:00+00","2025-02-09 05:00:00+00"]
4277	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-02-15 04:59:00+00","2025-02-16 05:00:00+00"]
4278	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-02-22 04:59:00+00","2025-02-23 05:00:00+00"]
4279	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-03-01 04:59:00+00","2025-03-02 05:00:00+00"]
4280	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-03-08 04:59:00+00","2025-03-09 05:00:00+00"]
4281	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-03-15 03:59:00+00","2025-03-16 04:00:00+00"]
4282	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-03-22 03:59:00+00","2025-03-23 04:00:00+00"]
4283	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-03-29 03:59:00+00","2025-03-30 04:00:00+00"]
4284	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-04-05 03:59:00+00","2025-04-06 04:00:00+00"]
4285	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-04-12 03:59:00+00","2025-04-13 04:00:00+00"]
4286	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-04-19 03:59:00+00","2025-04-20 04:00:00+00"]
4287	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-04-26 03:59:00+00","2025-04-27 04:00:00+00"]
4288	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-05-03 03:59:00+00","2025-05-04 04:00:00+00"]
4289	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-05-10 03:59:00+00","2025-05-11 04:00:00+00"]
4290	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-05-17 03:59:00+00","2025-05-18 04:00:00+00"]
4291	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-05-24 03:59:00+00","2025-05-25 04:00:00+00"]
4292	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-05-31 03:59:00+00","2025-06-01 04:00:00+00"]
4293	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-06-07 03:59:00+00","2025-06-08 04:00:00+00"]
4294	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-06-14 03:59:00+00","2025-06-15 04:00:00+00"]
4295	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-06-21 03:59:00+00","2025-06-22 04:00:00+00"]
4296	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-06-28 03:59:00+00","2025-06-29 04:00:00+00"]
4297	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-07-05 03:59:00+00","2025-07-06 04:00:00+00"]
4298	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-07-12 03:59:00+00","2025-07-13 04:00:00+00"]
4299	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-07-19 03:59:00+00","2025-07-20 04:00:00+00"]
4300	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-07-26 03:59:00+00","2025-07-27 04:00:00+00"]
4301	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-08-02 03:59:00+00","2025-08-03 04:00:00+00"]
4302	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-08-09 03:59:00+00","2025-08-10 04:00:00+00"]
4303	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-08-16 03:59:00+00","2025-08-17 04:00:00+00"]
4304	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-08-23 03:59:00+00","2025-08-24 04:00:00+00"]
4305	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-08-30 03:59:00+00","2025-08-31 04:00:00+00"]
4306	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-09-06 03:59:00+00","2025-09-07 04:00:00+00"]
4307	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-09-13 03:59:00+00","2025-09-14 04:00:00+00"]
4308	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-09-20 03:59:00+00","2025-09-21 04:00:00+00"]
4309	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-09-27 03:59:00+00","2025-09-28 04:00:00+00"]
4310	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-10-04 03:59:00+00","2025-10-05 04:00:00+00"]
4311	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-10-11 03:59:00+00","2025-10-12 04:00:00+00"]
4312	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-10-18 03:59:00+00","2025-10-19 04:00:00+00"]
4313	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-10-25 03:59:00+00","2025-10-26 04:00:00+00"]
4314	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-11-01 03:59:00+00","2025-11-02 04:00:00+00"]
4315	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-11-08 04:59:00+00","2025-11-09 05:00:00+00"]
4316	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-11-15 04:59:00+00","2025-11-16 05:00:00+00"]
4317	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-11-24 04:59:00+00","2024-11-25 05:00:00+00"]
4318	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-12-01 04:59:00+00","2024-12-02 05:00:00+00"]
4319	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-12-08 04:59:00+00","2024-12-09 05:00:00+00"]
4320	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-12-15 04:59:00+00","2024-12-16 05:00:00+00"]
4321	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-12-22 04:59:00+00","2024-12-23 05:00:00+00"]
4322	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-12-29 04:59:00+00","2024-12-30 05:00:00+00"]
4323	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-01-05 04:59:00+00","2025-01-06 05:00:00+00"]
4324	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-01-12 04:59:00+00","2025-01-13 05:00:00+00"]
4325	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-01-19 04:59:00+00","2025-01-20 05:00:00+00"]
4326	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-01-26 04:59:00+00","2025-01-27 05:00:00+00"]
4327	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-02-02 04:59:00+00","2025-02-03 05:00:00+00"]
4328	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-02-09 04:59:00+00","2025-02-10 05:00:00+00"]
4329	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-02-16 04:59:00+00","2025-02-17 05:00:00+00"]
4330	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-02-23 04:59:00+00","2025-02-24 05:00:00+00"]
4331	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-03-02 04:59:00+00","2025-03-03 05:00:00+00"]
4332	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-03-09 04:59:00+00","2025-03-10 04:00:00+00"]
4333	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-03-16 03:59:00+00","2025-03-17 04:00:00+00"]
4334	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-03-23 03:59:00+00","2025-03-24 04:00:00+00"]
4335	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-03-30 03:59:00+00","2025-03-31 04:00:00+00"]
4336	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-04-06 03:59:00+00","2025-04-07 04:00:00+00"]
4337	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-04-13 03:59:00+00","2025-04-14 04:00:00+00"]
4338	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-04-20 03:59:00+00","2025-04-21 04:00:00+00"]
4339	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-04-27 03:59:00+00","2025-04-28 04:00:00+00"]
4340	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-05-04 03:59:00+00","2025-05-05 04:00:00+00"]
4341	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-05-11 03:59:00+00","2025-05-12 04:00:00+00"]
4342	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-05-18 03:59:00+00","2025-05-19 04:00:00+00"]
4343	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-05-25 03:59:00+00","2025-05-26 04:00:00+00"]
4344	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-06-01 03:59:00+00","2025-06-02 04:00:00+00"]
4345	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-06-08 03:59:00+00","2025-06-09 04:00:00+00"]
4346	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-06-15 03:59:00+00","2025-06-16 04:00:00+00"]
4347	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-06-22 03:59:00+00","2025-06-23 04:00:00+00"]
4348	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-06-29 03:59:00+00","2025-06-30 04:00:00+00"]
4349	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-07-06 03:59:00+00","2025-07-07 04:00:00+00"]
4350	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-07-13 03:59:00+00","2025-07-14 04:00:00+00"]
4351	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-07-20 03:59:00+00","2025-07-21 04:00:00+00"]
4352	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-07-27 03:59:00+00","2025-07-28 04:00:00+00"]
4353	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-08-03 03:59:00+00","2025-08-04 04:00:00+00"]
4354	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-08-10 03:59:00+00","2025-08-11 04:00:00+00"]
4355	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-08-17 03:59:00+00","2025-08-18 04:00:00+00"]
4356	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-08-24 03:59:00+00","2025-08-25 04:00:00+00"]
4357	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-08-31 03:59:00+00","2025-09-01 04:00:00+00"]
4358	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-09-07 03:59:00+00","2025-09-08 04:00:00+00"]
4359	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-09-14 03:59:00+00","2025-09-15 04:00:00+00"]
4360	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-09-21 03:59:00+00","2025-09-22 04:00:00+00"]
4361	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-09-28 03:59:00+00","2025-09-29 04:00:00+00"]
4362	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-10-05 03:59:00+00","2025-10-06 04:00:00+00"]
4363	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-10-12 03:59:00+00","2025-10-13 04:00:00+00"]
4364	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-10-19 03:59:00+00","2025-10-20 04:00:00+00"]
4365	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-10-26 03:59:00+00","2025-10-27 04:00:00+00"]
4366	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-11-02 03:59:00+00","2025-11-03 05:00:00+00"]
4367	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-11-09 04:59:00+00","2025-11-10 05:00:00+00"]
4368	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2025-11-16 04:59:00+00","2025-11-17 05:00:00+00"]
\.


--
-- Data for Name: parking_spaces; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.parking_spaces (id, owner, location, is_paid, name, availability_schedule, photos, verification_status, cancellation_policy, created_at, updated_at, address, price, is_taken, photo_timestamp, verification_photos, avg_availability_rating, avg_cleanliness_rating, avg_total_rating, ratings_count_availability, ratings_count_cleanliness) FROM stdin;
8b55c5a3-9084-4999-ab0f-89cb6aeadaac	4e43aa54-5313-4f02-985f-efe54b48adc7	0101000020E6100000929C024F90BA55C014B35E0CE5364440	f	Spot Logged at 08:13 PM, November 11 2024	[]	{/static/images/689a8c22-32b5-4427-8ca3-b1b7f5f8ef5a.jpg}	unverified	\N	2024-11-12 01:13:26.24738+00	2024-11-12 01:13:26.24738+00		0	f	2024-11-12 01:13:26.24738+00	\N	\N	\N	\N	0	0
5e3ef6e8-4d42-4112-a2e4-1452efe56163	4e43aa54-5313-4f02-985f-efe54b48adc7	0101000020E6100000A3CFA2D2E3BA55C0D2F01C80C3364440	t	Spot 1	[{"end_time": "23:59", "start_time": "00:00", "day_of_week": "Monday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Tuesday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Wednesday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Thursday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Friday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Saturday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Sunday"}]	{/static/images/2366253f-7951-4c3a-90b6-2a321fbf1681.jpg}	pending	\N	2024-11-16 19:33:23.414418+00	2024-11-18 06:30:31.125651+00	Winifred Parker Residence Hall, 3rd Street, West Lafayette, IN, USA	1	f	2024-11-16 19:33:23.414418+00	{/static/images/a06e4f28-b1ae-48b0-8b0a-0011cb3eb499.jpg}	5.00	5.00	5.00	1	1
96a998d9-41fc-41b8-bc73-a08e312de595	4e43aa54-5313-4f02-985f-efe54b48adc7	0101000020E6100000DC93D112F5BA55C0B89965AABB364440	t	Spot 2	[{"end_time": "23:59", "start_time": "00:00", "day_of_week": "Monday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Tuesday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Wednesday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Thursday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Friday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Saturday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Sunday"}]	{/static/images/719c267b-eaaf-4081-a467-fdc5472a818c.jpg}	unverified	\N	2024-11-18 06:15:53.603163+00	2024-11-18 06:15:53.603163+00	Krach Leadership Center, 3rd Street, West Lafayette, IN, USA	1.5	f	2024-11-18 06:15:53.603163+00	\N	5.00	2.00	3.50	1	1
5ff0b211-1dec-4b07-9296-5527575cbae9	4e43aa54-5313-4f02-985f-efe54b48adc7	0101000020E6100000F8C0334690BA55C05BA7DB23E5364440	f	Spot Logged at 08:19 PM, November 11 2024	[]	{/static/images/473e9466-d779-41eb-b492-9c92a7e702e0.jpg}	unverified	\N	2024-11-12 01:19:23.76888+00	2024-11-12 01:19:23.76888+00		0	f	2024-11-12 01:19:23.76888+00	\N	\N	\N	\N	0	0
5b4e1066-150d-4bc9-b8e2-bc554babf5e3	3ceafe32-5706-4fef-aa09-80f1c29ae821	0101000020E6100000D978B0C5EEBA55C01A53B0C6D9364440	t	Test Spot 3	[{"end_time": "23:59", "start_time": "00:00", "day_of_week": "Monday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Tuesday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Wednesday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Thursday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Friday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Saturday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Sunday"}]	{//22d86a67-24f6-462e-bf1a-a3b14d83b95d}	unverified	\N	2024-11-21 21:37:55.752345+00	2024-11-21 21:37:55.752345+00	Wiley Dining Court, North Martin Jischke Drive, West Lafayette, IN, USA	3	f	2024-11-21 21:37:55.752345+00	\N	\N	\N	\N	0	0
\.


--
-- Data for Name: points_transaction; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.points_transaction (transaction_id, user_id, transaction_type, points_amount, description, "timestamp", balance_after_transaction, status) FROM stdin;
1	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	500	Badge purchase: Bronze	2024-11-19 00:59:18.768896	9999500	inactive
2	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	1000	Badge purchase: Silver	2024-11-19 00:59:28.563792	9998500	inactive
3	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	2000	Badge purchase: Gold	2024-11-19 00:59:30.384234	9996500	inactive
43	4e43aa54-5313-4f02-985f-efe54b48adc7	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:40.008413	9999250	active
4	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:01.257362	9995750	inactive
5	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:01.402269	9995000	inactive
6	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:01.526583	9994250	inactive
7	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:01.597865	9993500	inactive
8	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:01.67657	9992750	inactive
9	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:01.769141	9992000	inactive
10	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:01.855861	9991250	inactive
11	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:01.948973	9990500	inactive
12	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:02.034488	9989750	inactive
13	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:02.12672	9989000	inactive
14	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:02.21385	9988250	inactive
15	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:02.304598	9987500	inactive
16	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:02.396793	9986750	inactive
17	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:02.487406	9986000	inactive
18	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:02.576756	9985250	inactive
19	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:02.659644	9984500	inactive
20	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:02.758222	9983750	inactive
21	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:02.844481	9983000	inactive
22	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:02.935837	9982250	inactive
23	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:03.025186	9981500	inactive
24	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:03.112907	9980750	inactive
25	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:03.201324	9980000	inactive
26	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:03.286079	9979250	inactive
27	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:03.369813	9978500	inactive
28	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:03.476172	9977750	inactive
29	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:03.565267	9977000	inactive
30	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:03.650507	9976250	inactive
31	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:03.743175	9975500	inactive
32	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:03.828357	9974750	inactive
33	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:03.913631	9974000	inactive
34	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:03.998001	9973250	inactive
35	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:04.078376	9972500	inactive
36	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:04.168313	9971750	inactive
37	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:04.262281	9971000	inactive
38	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:04.353469	9970250	inactive
39	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:04.542186	9969500	inactive
40	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:04.651047	9968750	inactive
41	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:04.747976	9968000	inactive
42	3ceafe32-5706-4fef-aa09-80f1c29ae821	spend	750	Raffle ticket purchase: $10 Gift Card	2024-11-21 05:20:04.837007	9967250	inactive
\.


--
-- Data for Name: ratings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ratings (id, parking_space_id, user_id, availability_rating, cleanliness_rating, created_at, updated_at) FROM stdin;
fe770160-8d60-4826-978a-c8dbaa7b292f	5e3ef6e8-4d42-4112-a2e4-1452efe56163	3ceafe32-5706-4fef-aa09-80f1c29ae821	5	5	2024-11-18 04:08:50.397966+00	2024-11-21 07:00:33.445011+00
ffe79622-02cd-498a-899f-c683f496c229	96a998d9-41fc-41b8-bc73-a08e312de595	3ceafe32-5706-4fef-aa09-80f1c29ae821	5	2	2024-11-21 06:40:49.865856+00	2024-11-21 07:00:42.641897+00
\.


--
-- Data for Name: renter_ratings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.renter_ratings (id, renter_id, rater_id, responsiveness_score, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reports (id, reservation_id, description, type, status, admin_response, created_at, updated_at, user_id, departure_time, overstay_duration, image_url, damage_type, damage_severity, overstay_charge) FROM stdin;
0a631c10-db93-468d-943c-3da3e57536ae	\N	asdsadasdasda	Other	resolved	All good.	2024-11-11 03:42:10.859119+00	2024-11-11 22:46:58.571764+00	3ceafe32-5706-4fef-aa09-80f1c29ae821	\N	\N	\N	\N	\N	\N
eb8ca88b-516f-4b23-8d0d-09b6d676397b	\N	asdsadasdasda	Other	resolved	okay	2024-11-11 03:39:41.912704+00	2024-11-11 22:47:08.039951+00	3ceafe32-5706-4fef-aa09-80f1c29ae821	\N	\N	\N	\N	\N	\N
94bf4b00-2fce-4383-a966-43e856cac769	3ba04b87-9222-43e8-bcce-65157f0098ed	hkjhkjhjkhkjhkj	Reservation Issue	open	\N	2024-11-16 19:35:18.000581+00	2024-11-16 19:35:18.000581+00	3ceafe32-5706-4fef-aa09-80f1c29ae821	\N	\N	/static/images/2366253f-7951-4c3a-90b6-2a321fbf1681.jpg	\N	\N	\N
0f66bc69-623d-4c77-b76d-864f3d897db9	c51be42d-59f8-401b-9849-3531e6ed7142	Overstay of 11821 minutes detected for reservation ending at Nov 29, 2024 4:38 PM.	Renter Overstay	open	\N	2024-11-21 21:39:29.921135+00	2024-11-21 21:39:29.921135+00	3ceafe32-5706-4fef-aa09-80f1c29ae821	2024-12-07 21:39:00+00	11521	//b70e6ed2-7a6c-4356-a3eb-c767ef589bdd	\N	\N	864.08
89f9888f-4772-4e25-a10f-5d7448790353	c51be42d-59f8-401b-9849-3531e6ed7142	Damage to spot	Damage Report	open	\N	2024-11-21 21:40:34.57758+00	2024-11-21 21:40:34.57758+00	3ceafe32-5706-4fef-aa09-80f1c29ae821	\N	\N	//5c4974b2-a5d6-421a-88a0-0c4deff17cd3	Damage	Moderate	\N
459ed4dd-fb10-4253-bddc-c1557897e428	\N	Just another issue :/	Other	open	\N	2024-11-21 21:44:21.188897+00	2024-11-21 21:44:21.188897+00	3ceafe32-5706-4fef-aa09-80f1c29ae821	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: reservations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reservations (id, parking_space_id, renter_id, car_info_id, status, created_at, updated_at, "time", price, acknowledged) FROM stdin;
3ba04b87-9222-43e8-bcce-65157f0098ed	5e3ef6e8-4d42-4112-a2e4-1452efe56163	3ceafe32-5706-4fef-aa09-80f1c29ae821	ccaf6d36-f113-4b6b-b7ad-7244fe5302ab	canceled	2024-11-16 19:34:43.478941+00	2024-11-16 19:44:56.713196+00	["2024-11-19 19:34:00+00","2024-11-22 19:34:00+00"]	72	t
461bbda8-363d-410c-beb1-11bd535a8ffe	5e3ef6e8-4d42-4112-a2e4-1452efe56163	3ceafe32-5706-4fef-aa09-80f1c29ae821	ccaf6d36-f113-4b6b-b7ad-7244fe5302ab	booked	2024-11-18 04:07:35.623752+00	2024-11-18 04:07:35.623752+00	["2024-11-23 04:07:00+00","2024-11-30 04:07:00+00"]	168	f
612c47dc-94bc-43b7-99c1-170dae5ab6f3	5e3ef6e8-4d42-4112-a2e4-1452efe56163	3ceafe32-5706-4fef-aa09-80f1c29ae821	ccaf6d36-f113-4b6b-b7ad-7244fe5302ab	booked	2024-11-18 04:08:41.099343+00	2024-11-18 04:08:41.099343+00	["2024-11-14 04:08:00+00","2024-11-17 04:11:00+00"]	72.05	f
eef274e9-dd62-4e39-be9a-fe53c768f925	5e3ef6e8-4d42-4112-a2e4-1452efe56163	3ceafe32-5706-4fef-aa09-80f1c29ae821	ccaf6d36-f113-4b6b-b7ad-7244fe5302ab	booked	2024-11-18 04:11:39.34979+00	2024-11-18 04:11:39.34979+00	["2025-05-09 03:11:00+00","2025-05-25 03:11:00+00"]	384	f
0887792d-0591-47d0-b01b-3a7660b2357f	96a998d9-41fc-41b8-bc73-a08e312de595	3ceafe32-5706-4fef-aa09-80f1c29ae821	ccaf6d36-f113-4b6b-b7ad-7244fe5302ab	booked	2024-11-18 06:16:17.536609+00	2024-11-18 06:16:17.536609+00	["2024-11-22 06:16:00+00","2024-11-23 06:16:00+00"]	36	f
683f3b77-43b3-47e2-a02b-d5571fcc13dd	96a998d9-41fc-41b8-bc73-a08e312de595	3ceafe32-5706-4fef-aa09-80f1c29ae821	1ff4c7dc-ae8a-44b2-92c0-88f8b06057c7	booked	2024-11-18 21:30:14.066634+00	2024-11-18 21:30:14.066634+00	["2024-11-19 01:30:00+00","2024-11-19 03:30:00+00"]	3	f
a7118a74-f347-4576-896e-30e331a12c8a	96a998d9-41fc-41b8-bc73-a08e312de595	3ceafe32-5706-4fef-aa09-80f1c29ae821	ccaf6d36-f113-4b6b-b7ad-7244fe5302ab	booked	2024-11-18 21:30:33.642027+00	2024-11-18 21:30:33.642027+00	["2024-11-19 21:30:00+00","2024-11-20 09:30:00+00"]	18	f
684b6718-992d-4b25-a7c6-3f42ac7cc09f	96a998d9-41fc-41b8-bc73-a08e312de595	3ceafe32-5706-4fef-aa09-80f1c29ae821	1ff4c7dc-ae8a-44b2-92c0-88f8b06057c7	booked	2024-11-20 02:33:44.358445+00	2024-11-20 02:33:44.358445+00	["2024-11-22 02:33:00+00","2024-11-22 05:09:00+00"]	3.9000000000000004	f
ecb37951-4600-48dd-9c24-eaa97be6d516	96a998d9-41fc-41b8-bc73-a08e312de595	3ceafe32-5706-4fef-aa09-80f1c29ae821	ccaf6d36-f113-4b6b-b7ad-7244fe5302ab	canceled	2024-11-20 02:37:30.524946+00	2024-11-20 02:37:30.524946+00	["2024-11-23 18:37:00+00","2024-11-27 02:37:00+00"]	120	f
c51be42d-59f8-401b-9849-3531e6ed7142	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	4e43aa54-5313-4f02-985f-efe54b48adc7	2fef51fc-63b3-4058-9743-6a1a4ed787e2	booked	2024-11-21 21:38:43.870041+00	2024-11-21 21:38:43.870041+00	["2024-11-22 21:38:00+00","2024-11-29 21:38:00+00"]	504	f
\.


--
-- Data for Name: spatial_ref_sys; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.spatial_ref_sys (srid, auth_name, auth_srid, srtext, proj4text) FROM stdin;
\.


--
-- Data for Name: timetable_coalesce; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.timetable_coalesce (id, parking_space_id, "time") FROM stdin;
19	5e3ef6e8-4d42-4112-a2e4-1452efe56163	["2024-11-11 04:59:00+00","2025-11-10 05:00:00+00"]
21	96a998d9-41fc-41b8-bc73-a08e312de595	["2024-11-18 04:59:00+00","2025-11-17 05:00:00+00"]
23	5b4e1066-150d-4bc9-b8e2-bc554babf5e3	["2024-11-18 04:59:00+00","2025-11-17 05:00:00+00"]
\.


--
-- Data for Name: user_delete_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_delete_requests (id, user_id, token, expiry) FROM stdin;
\.


--
-- Data for Name: user_pw_reset_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_pw_reset_requests (id, user_id, token, expiry) FROM stdin;
1	4e43aa54-5313-4f02-985f-efe54b48adc7	9SiXf5ep9Hf6heyW2k-AgYaK1h4JUzwsM7QV3XIDQeI	2024-11-21 21:23:09.274285
2	3ceafe32-5706-4fef-aa09-80f1c29ae821	nCfcB6qi3AeI5QJESJbH8tyk4LtA_FhDZtAUVZCwybc	2024-11-21 21:25:14.106992
\.


--
-- Data for Name: user_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_tokens (id, user_id, token, expiry) FROM stdin;
111	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_m9e4fpcSM5k_669FsJIH0DiK5CL9b3OozQub0vOAUJs	2024-12-21 21:31:21.394541
11	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_8NCk8IZhtdLmQdZP2NxpLG4rW3y63MZeretcDTgeFyo	2024-12-21 21:05:40.343537
12	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_CEhcnJQ_IUWO5hMNwiEaZlnyZrAo2gENkL_Kvn6uDrM	2024-12-21 21:05:40.648758
13	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_nq9LEX9ooROkSUZsS4w8wGnMW2fOifRs-suFejNNxSY	2024-12-21 21:05:40.795892
14	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_vdTX_lRcqYVdWfog-opOs4QT11sfmE_J-X4UiZStHZE	2024-12-21 21:05:40.99838
15	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_WOZ85ZOCcuQ-AuvqvAtIkLZeYlMkXqOR8FckFIvvic0	2024-12-21 21:05:41.135967
16	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_TDiqRgTviRjc3Tw8suT3pyUZN4U0Vs-CSorG37vcYzY	2024-12-21 21:05:41.255663
17	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_7eMb9Uou05m9FjLG3dNpZjdgxbrPOJEcW7K_FxRDbJc	2024-12-21 21:05:41.352729
112	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_D3F8pRJw5K27ZDZ7ZbyMmIWpWg-bXN1KVGYL2CimTjc	2024-12-21 21:31:22.550679
113	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_Y3ZlFNZRq5RpW1oGTQX5Yz4p2KH3jHZ6EBb-EemLOf4	2024-12-21 21:31:22.704531
114	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_FW5sovivVUVb-Q9Hw9EX_jVm5Bv64ayRdcl5HJktQXo	2024-12-21 21:31:22.868426
33	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_1vwv5AG9aEEP3JoAgxPVlWNdKafsf5cQkPY7VD7dXEQ	2024-12-21 21:08:04.124126
115	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_MBRZ1jLjjOniQUWWZpeVzNAP2JFRgx69yj67vwG5V9o	2024-12-21 21:31:22.973105
134	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_ilCP-9ovlS-gYXyR4RogU43Eh-qagea-TkXRlrysLEc	2024-12-21 21:32:08.130262
143	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_g0iLHbupjpApLEzUfKx6_6Clc3bQ6SlrzLKVcqvcCms	2024-12-21 21:34:40.159805
4	c7264d82-6b1e-4b08-8a1e-e39af9ab6dc8	xpark_k-3HEuSW6SLhRZghYfaJBly_ts1j3KOrwJeBOOnQiSo	2024-12-15 07:35:10.590088
127	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_vF4IyQqwD8ckSJXG4js7mMSYuhTQEVdV9xpETXbhdSM	2024-12-21 21:32:05.307672
34	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_xJD4TkD2b__rAEvwlyio4seD1qbEtgfnpAw2ie7j0Go	2024-12-21 21:25:16.728154
35	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_USiYSnfwABQj0gPhOW2qaglLSNt_v_oNXh8ahX-t3YA	2024-12-21 21:25:17.004528
36	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_QxAGvt17gQBEj6p9ocfsmQaUiW2ezAC8Y6aBwb9A0jM	2024-12-21 21:25:17.089188
5	c7264d82-6b1e-4b08-8a1e-e39af9ab6dc8	xpark_pd3CY4sEhYc8O0bfUO_taEqO2Fq7qCTjHxXDxxaSbFI	2024-12-15 07:35:41.895123
37	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_mPK9Fcl6WuWA5nzVmPBEuwI7e1QqCOYHi3ftufky860	2024-12-21 21:25:17.164023
38	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_rSt-g-heoH9oxmjBtehsvy7U4rmLFw6ypU28ox0jBLU	2024-12-21 21:25:17.23635
128	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_VBEYQJ0FaIa9bLLk3h_08Uv3uEypMyJ58SQCqQWn0tU	2024-12-21 21:32:05.423027
39	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_aojnx3CMeiDBWhmDsTOUWgQVKvB3WTjanmlVQ7sG9s8	2024-12-21 21:25:17.316786
6	c7264d82-6b1e-4b08-8a1e-e39af9ab6dc8	xpark_3o8JtNjXuitrPaE5_z1023KL14jyII_bJcIfXhE4wgU	2024-12-15 07:36:37.733645
40	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_fdXY7uorwI20PTEXcwnp7ld9FUJgIiqM83df2WMUoxU	2024-12-21 21:25:17.389901
41	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_QLy4gn_KJXYW9L1bw2dHCyOpUBiWUl-n-nsP-4QWP38	2024-12-21 21:25:17.463581
3	c7264d82-6b1e-4b08-8a1e-e39af9ab6dc8	xpark_A-wQnhSpq5WHfaDpSefBERFZpcKhe8bGB-MNnz77yio	2024-12-15 07:22:20.357944
42	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_wX9DkliMrWEYsWLa5exEGdeWNwWQAliEVXwtTHj1ld0	2024-12-21 21:25:17.53436
43	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_BYxzG3M85nOtz07bGZ7OL6CBfHr4AZrr-1hcWwHeejo	2024-12-21 21:25:17.606124
44	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_RpVVqTcRjkAvatApBgmrm6mtkND30fN4hWYn3cwTgVY	2024-12-21 21:25:17.674614
45	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_b2PI5Fd83qbZGvmIh1LGAdtQaaxSo7rRqToCJMhwIm0	2024-12-21 21:25:17.74137
129	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_wbcBzg0tBsboO3dKZlu_9r5V6DZUqJ-WRogz_rpWMRo	2024-12-21 21:32:05.5473
55	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_WRj47qeftERAhSyva-npOUrHFwOmgjlD1FRCL9kjbJI	2024-12-21 21:26:14.663887
56	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_H2Bq273GUNJ07SjDddNUBzwa_FgEhP2J-nrJJY6y6sE	2024-12-21 21:26:14.769286
57	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_VLIceBlKIFCIr-1-PdA01nAR4UGXKeBX3kJptsI9sDc	2024-12-21 21:26:14.863351
130	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_Oc52jI5uoIGxu1RCLGcMtCVStA5Lf0kvSH2zqNtDt6o	2024-12-21 21:32:05.651254
58	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_sLe5QUmoVZBQG1Z1W3SNfmrTJNE4rZrZF8QKbftea4U	2024-12-21 21:27:14.622633
59	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_t5SEu1G22fL475mSHX43khrMuVVt_mPP_GXnNmoh4do	2024-12-21 21:27:14.92028
60	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_j1uIgCvZV7MQ9J9a5xOhn_hRP7TNZyUep-_IXKHCyiY	2024-12-21 21:27:15.081404
61	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_nE763aJA3ZcKp5TLAjYkliSraCAqzNNpQwLgW_ZSdmw	2024-12-21 21:27:15.205556
62	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_UqDoCuEi0Q_wgzGsX4837H46UDoUOR2ANeUbZNoRyJE	2024-12-21 21:27:15.339716
63	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_Ge2q7trfKYsysssFjLghKfSJjoXRvP962jvWjSFT2qA	2024-12-21 21:27:16.519642
64	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_YhbbGr8blao0-kk6VR9GHJCwJTWSHsO12S1HlDGAex8	2024-12-21 21:27:16.727113
65	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_28n0HAJZ7lmuw1WJj8sdhQmfqbib_jnx8xoPEt3KCPA	2024-12-21 21:27:17.867579
66	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_D9nVzLtel_PGay-CJZwZP7Ew9K4Ze38DJm27nEPW5So	2024-12-21 21:27:18.003906
67	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_gsDNzD_jhD110EzyBXfEoufd4F4dPu67kHO6SKGqvXA	2024-12-21 21:27:18.154526
68	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_2Ev7TX_xLHeJFAvkEommOmC8qqI2XSSSd6QGIGFnlNA	2024-12-21 21:27:18.250202
69	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_IynDhGmRJ5rxn2UZ1nSzrUaS6GLFTy2g6-1cF6odNCI	2024-12-21 21:27:19.408246
70	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_n4f-nl3JfedVT-dRlTqbL5uc_TNT02UIJkWnwyfHlNw	2024-12-21 21:27:19.531511
71	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_N3BL40BR_8rXKbLNOBZyvTOrS-gcv7FWeJbLJaz0RkE	2024-12-21 21:27:19.635173
72	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_cYJVsgcXo9W4PWiom-FJBqAvx7IVKYcvY2WbmdTtRMc	2024-12-21 21:27:19.719898
73	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_sxJPzAHEYWHZQVy3kpIJ-PawsdGooRWSreka34MJoFE	2024-12-21 21:27:19.811433
131	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_w7rQzP1BC5or6wB-mk8_qB4cZcirBAQSesbbcZLcEEI	2024-12-21 21:32:05.755177
90	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark__jo8oqga3BvARMQbTtIswUb7CwuhT76eAt5eSJ1AvUY	2024-12-21 21:28:27.79638
91	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_l9pv4TuNldbIeUK0dyShbXW40JNZxDH92VC095WpOFE	2024-12-21 21:28:28.080998
92	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_o5dBOLhVQCQKbY-THsw8L48XaHnVMlGJltrgly8q64k	2024-12-21 21:28:28.269994
93	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark__76X3lRrxKMCtwILjTzmJu5DlUIB8NudsLLG07omLCQ	2024-12-21 21:28:28.368369
94	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark__UsbaPwFu9H5dGUZ4LZRUapL_GcyHW8m2_uN47LWhb4	2024-12-21 21:28:28.514075
132	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_mPP2STfzOz-lU_Q-qvS_1L3CupKYAHeJtVjodNm7NsQ	2024-12-21 21:32:05.876581
133	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_Rsqr9gpRJYyW0id_cm73aMmDKw21p5FNPDNXQyM5pLQ	2024-12-21 21:32:06.983022
135	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_aZqKi9lOfP9yYK1I7xcusv2a9wmC3llQ2fJEjcU5Jv0	2024-12-21 21:32:09.336199
106	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_iOdyVHXQXfZ9h0n3lu2A7x7WnniJjodYIdH01xJkK74	2024-12-21 21:31:16.441476
107	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_d-G1286LYbbVNRk_WINnVNlOowEJ2lDEFHff5E51Tho	2024-12-21 21:31:17.673445
108	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_oO0lB-3DHvwu5MBBOjidjWTCtv9pt_XS56RWSydiE48	2024-12-21 21:31:18.83888
109	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_DQ6n47FBtlsGD17U7b-CYTFBW4YOVWDsQmCZp6xpMz4	2024-12-21 21:31:19.988336
110	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_T0vRBxTNPK1e9Lpi1SrjUZxErTe_1-MWNfieGRfHg80	2024-12-21 21:31:21.160009
136	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_7UPbcnX7-apMzzVJ6yIfe9pXezDiz8T_l5c2iJS5ubo	2024-12-21 21:32:10.541299
137	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_Q2-Bu8l8hs5Mc733wXYzjtROfSlexyUa3tze4rKr5P8	2024-12-21 21:32:10.69332
138	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_20KNAB211_lbaXTyRbR8g5Ipd7aQ_Ro9LVZnRvVEfn4	2024-12-21 21:32:11.875554
139	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_lAC3_c3Um7ju0Bj1Q6TvAtrf4pfa8tIMa-r7FFPXYbE	2024-12-21 21:32:12.010116
140	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_v_6m8T3cZkhsomFySjSwSi90Q7P04dv1mVf1Pn7cr30	2024-12-21 21:32:12.171842
141	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_moRnl-_B9fPQe31g7q0gbQzg0QImbi1xx6sG2q2wfvM	2024-12-21 21:32:12.26649
7	c7264d82-6b1e-4b08-8a1e-e39af9ab6dc8	xpark_MY3nFK5G64RdrJ8pm93rPJ8yFiTEFX8yuXH1ugVtyLg	2024-12-21 18:58:11.918195
87	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_1gsKr7Hy_3jD6PDL607f80ovK9vFQ8EovyM0Cu27tNI	2024-12-21 21:28:07.056679
88	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_zz_v5r_xB5Xg7Hq2DOVrR2NC7Vmxw8jCfd5biL0PxtE	2024-12-21 21:28:07.158998
89	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_sk-vfoHGpz_wFLmoECcpM2Rd5BWyJe8IfdehOKpPR4U	2024-12-21 21:28:07.25013
119	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_T0gt2NaMb3wc0gH1MDo4qib5_5yS5v3W9qnFackvgg8	2024-12-21 21:32:01.226674
95	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_L8PMiXffR1eU_MjMLl6GYXMY7wEecTKGwHJEgQVzj7U	2024-12-21 21:28:29.684081
96	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_qVMHfrsgJkMejcRhp__WwGAmlqyKZt0_6cI50qArhY8	2024-12-21 21:28:29.839943
97	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_fSi_gFKvtITpmW_-lXyYkzcE8JJI9lR4iEXOn7jO6Q0	2024-12-21 21:28:31.04312
98	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_k5UThmB57YS62zWFEozH3Q6nfDWCESMygJz88kPJw5A	2024-12-21 21:28:31.209315
18	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_Od9rhkCJh6PtCRE-6MnFITN48-5aUPdSdFY4z-V_oCM	2024-12-21 21:07:59.182703
19	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_GR5NSeOmXn2O6yh63_JIESjybBdYkNoQGVTolfdQpgk	2024-12-21 21:07:59.491205
20	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_hHv65toaULXC6aU7kGnHmRuWy0axE3Elsfd4XUGoXUY	2024-12-21 21:07:59.62828
21	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_A6F5Ls2u8owvX9Y2m5BwMVnMS6wVp5sZBPNaMXzFAfI	2024-12-21 21:07:59.738006
22	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_ZS7FrEPgw-faGGXUY_PZyZ7ynsUc0i405ZIV3dKrZeI	2024-12-21 21:07:59.866978
23	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_a_9k_SGYMRnYvK_uopnkXU08kDlufRqwBoMsb00qe0g	2024-12-21 21:08:00.999911
24	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_7ZZ8cknLpQAucqHMJvnbqD0ClnFk2CGDa8L0kl3gTig	2024-12-21 21:08:01.103365
25	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_D6uuC7LEUiFIMGdMZOJmy4uiVESM3WMJ5wrMc9gDNTc	2024-12-21 21:08:02.245477
26	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_ktVFZ1FMDEBvRAgoSv-PGemlaRc7Mr1LLVsM5EweZOA	2024-12-21 21:08:02.351312
27	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_VhZ4mOMV6P8ViNiOYr3ZjT-ewjkKsCnP7bqmW93DSA8	2024-12-21 21:08:02.454578
28	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_WqDrOrFr750f3wSETnZV8SXXnc4eY-HB7jElHOeBn0o	2024-12-21 21:08:02.552478
29	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_ODLujz0-j3yIQYGdOoctYKfqWBFWR2B4Md2zSMGDaRE	2024-12-21 21:08:03.67876
30	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_z77rPaGIeyoz4fYLFxjc5eQOgUwrCO3vHzKM5Z-tzfk	2024-12-21 21:08:03.81808
31	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_h5EiwMfrTk5nzmFX4Tv8BAwh9kOEO6zlBrLO1EOxOBs	2024-12-21 21:08:03.922744
32	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_G6GOy4C3W8zLnIMYsxwBS3fjqGi6OyrLoA5-BXgtr-Q	2024-12-21 21:08:04.023787
99	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_QCTpNszyttp94Bcc5eExRlTGDSWz6Q5-Rz0JynE7TuY	2024-12-21 21:28:31.298937
100	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_v6gnmWyOuBDvPkI0K6yivSzoUzgNYQv8YDzz0zqdd9o	2024-12-21 21:28:31.38455
101	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_AAI5WaLFogz1CcL839RZnfW_ypf9e991jvmeiNFfHZY	2024-12-21 21:28:32.535779
102	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_VP9RtOkGEY5hjy4iU-pOdctxJJNamF-VZz_IZwtabmE	2024-12-21 21:28:32.680349
103	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_gZKyJJGcWHaL4EmUB4QtV3aSnhG4Em2L3je_yUXwASU	2024-12-21 21:28:32.779652
104	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_JIelXyHq0fXrJWVxQK9AANJbmv4Dtp4qbKK5ZlvOqEM	2024-12-21 21:28:32.87337
105	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_qgN3VUDxn3uELNPOr-IvzOj5WRM2onRv5SbDcd5miy4	2024-12-21 21:28:32.967218
120	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_rIq4-YfSQ5b8Ftoxp5Wg8VmhjyEcKzIEVea51BkNgYM	2024-12-21 21:32:01.356283
121	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_kCQBp6T2V7jsVryyJBkHJaAZ6CzZhoO4n9iIOSBeDlk	2024-12-21 21:32:02.507894
122	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_Xc3cvJ_RUoYfv96_n_4Q56hWMtPXMRWUBNkBsdP2F9g	2024-12-21 21:32:02.651519
123	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_pddJrLSTcp7yN_3bBGwRNrn-wE5RpOqLLtijlg_eh2Q	2024-12-21 21:32:03.806324
124	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_LfXHhv57XVrHCkwiCHJA_72Sj7qhwPWCig8z0XL8h2o	2024-12-21 21:32:03.939281
125	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_phkSS0XXfQmy49FARWqML1keEfQvMMgUk9d4NviuQbg	2024-12-21 21:32:04.051475
126	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_e9GzrO0-wgwFyjhVPKjypd6lVeCDFofCTCSGLMh5zB8	2024-12-21 21:32:04.15635
144	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_sCua4ip8U0qRCBK0tYZG1BWoHb6GoIjnBL8FfF8p9Tw	2024-12-21 21:34:40.169192
145	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_jm37T8utP4vXrL_2xMnGZsXVX4IKAimAbT5hl9p1Hyw	2024-12-21 21:34:40.180155
46	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_kaEAIlJ781BkQ0I5wWijHkm1pMf0NP4v8OuGmc5zYIs	2024-12-21 21:26:11.891797
47	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_XIPmT3hFL788haJAMSo81mFirUVQHOttBfcIcXrUCOk	2024-12-21 21:26:12.157828
48	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_uRxJnxWUE4HBvWEsJtQT-Y3m0Hz-fSAtd7JxLzAq3nc	2024-12-21 21:26:12.273988
49	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_tt1GYtCkBv1kBcBE6hcFc6cNRkLfPY0ZFmVx8wm7NuQ	2024-12-21 21:26:12.584451
50	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_MPK3DKa4wPShsWrvFccatoAcAj-uhIXvgXNG8kZoEG8	2024-12-21 21:26:12.879072
51	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_Ja5cQFGddt-Vf_uQWS1f6KQf7jbjhZVNpWMFI9ZJ7IE	2024-12-21 21:26:12.977275
52	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_NAze_yppvOp95ZrGx2ymr8-Ap4eiz0zmKN7tXJsOj-M	2024-12-21 21:26:13.156386
53	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_Eqps-8ZQrbjsRlLuakb3bQ-3hJjTXVxtfuomSFX3o2A	2024-12-21 21:26:13.248439
54	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_1BukkqS2IyqX3_lYbm4-avaWK0FSJ1uVQBNdCy7m8dE	2024-12-21 21:26:13.54561
146	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_NJlpJnumdXWL0gFufyjbhVZU00NOQ73v7UMe8-yekbs	2024-12-21 21:34:40.201912
116	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_e6V6B1m8ywjqlgpTj1F1Lw-FamaWO1I98gMchb9xBps	2024-12-21 21:32:00.705871
117	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_YU1S-iESWWao6kij_mYG40gmGeCI_aPM1_JwgpoxjOg	2024-12-21 21:32:00.991932
118	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_zB6MtOyNPNfuA7PTVJV02LkAj7eesdCMVDfjjchw1Q0	2024-12-21 21:32:01.125284
147	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_s3vkee5wdopCtc_IS44vJT9duuSE32Z8ZcuOtSULHCc	2024-12-21 21:34:40.249987
74	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_A7Ug2FD3F-d-dYRQtXx0NpEHYgyWXAMy9fO0uVen-m0	2024-12-21 21:28:01.251704
75	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_5MdL0EG7bcaupzvNoiYOpiXaI_yf7l6XpwLvTxrdM7Q	2024-12-21 21:28:01.52085
76	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_4HWXaFLxlV-15PYQWM5VflRddaArTTHnCE6czyj3dwM	2024-12-21 21:28:01.657363
77	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_ulCjjaIabXJlP8PbFLrUGX7ZW39ijd78FxD3XvF9WVs	2024-12-21 21:28:01.764683
78	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_R5N_iap7mp0eBWahwaUBIhiADlq_SSKX9oNUVOQkqLc	2024-12-21 21:28:01.898991
79	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_91uICRy53yr3wew7d_T0E-7YoXmqdXa8p4nVXuIYlDc	2024-12-21 21:28:03.039753
80	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_iVFR9S4oyLwHyNnm-vy3IxIltqgWaCQm1AmaVrG8eZo	2024-12-21 21:28:03.170255
81	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_YGxldmQmawJO5pt2u-0issAj_zn88kg8yg7LMAAVbTI	2024-12-21 21:28:04.333782
82	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_TUEr8SF_KANOTrWej39tuGbzSSjK1N6nGn1dKVTfOLM	2024-12-21 21:28:04.452667
83	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_nNLdJPJQQm5Gd29zBKHrSv8LxamXvxFzLTI7XQJvWeE	2024-12-21 21:28:04.552286
84	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_R-ibjpLkQtIsXX61KFPuE_tY-Cmt8Z3w-hj9K6Or5wE	2024-12-21 21:28:05.697358
85	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_muCZH_7kKLVuaafZgQOs5Vt4wT_fsLtqu10dhKhFiAc	2024-12-21 21:28:06.840006
86	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_JaXg337OhJc0E-Fl3sGVsjbBSiyspyn0_6Mav_MkPfk	2024-12-21 21:28:06.950901
142	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_42t_IRT1NDcUH8tSF9dNGP8eL-hIH2jBMOzaT6YK5Ck	2024-12-21 21:34:40.155409
148	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_2RtFuC92MGs8Af78YPvGdeO4XzC_BDGI-AdS-AiTdyc	2024-12-21 21:34:40.25166
149	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark__NoCSBRTBLkLu7fG7AUFaZbjjJ3abcQwi9ccEGRD9CE	2024-12-21 21:34:40.271987
150	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_7jBY6rxM5VVtznx7wErQn4NLxqF6Y1A6bUebxR3s2mc	2024-12-21 21:34:40.331274
151	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_Av1lzDNW2stFO8HBxCt0vl2Gv2eEhbZpu5HjzVdHOEQ	2024-12-21 21:34:40.660766
152	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_4VNHDThgl_JPKWoPaK78InSk_3z9KpQELgQ1JwV14Z8	2024-12-21 21:34:40.740607
153	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_k0Wtj5L-kcK8eKXFM-bwRjuoOJFW36_GoKS1cDmUbag	2024-12-21 21:34:40.790853
154	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_SBHTMDZlLfTMIiaZZ_28onLK6xfGu2lAlTPBc9eFr64	2024-12-21 21:34:40.798822
157	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_A49_4NDi4Dq89MFcnZfe75EdCQ0z_Mc7wJt015TDxUk	2024-12-21 21:34:40.903189
163	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_Qd4YlVc-5U9HE3HbtjLW3_q3kPqMIh2TQu4xJLircqU	2024-12-21 21:34:42.075979
167	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_bsf_ayd19aWB1tvRTCv9ZnL275tB61X1t5cki_a60uI	2024-12-21 21:34:42.178094
176	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_ufzZQiTx02Fu-x2D4T-U3LGNDMtGXEMg9tbLgml6Jzo	2024-12-21 21:34:43.408524
179	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_bgDEJWFnjIsLY2P6vX3DOAc2vDb7K_zoK6IZP-0cVug	2024-12-21 21:34:43.534442
183	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_4hJzGm5di73lhvfYkN65T4uFeGUTbwJ8xJS5CH8eskE	2024-12-21 21:34:43.755615
194	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_CeS9Loq7KerFZR95bFmCDHq9NoxxACmyLRVkWyGA5Fg	2024-12-21 21:34:44.172028
198	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_Z1sU9rLb64XofkeLyGoP8AVyuQbaMggwfWztVJ113L8	2024-12-21 21:34:45.218528
200	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_52X58zbSYnGOQoNoaUSGjGM_JEFRxrBNbbUjnXhxU90	2024-12-21 21:34:45.234324
204	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_ws7qS-V21EtUESowjQ6aN5EJdV2a8MJBboCzVf5ZqNs	2024-12-21 21:34:45.372605
205	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_Qv1rdYlJZSRDP9avFIMF95UCre4ZqpZQrRWpJPW1hvQ	2024-12-21 21:34:45.539365
206	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_kLp_DxsqRVB7stF4Ey344i-uL9rmyt0G1M5_yHmkXio	2024-12-21 21:34:45.753668
208	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_GvIuJAe7rJA9QB0nUHRRL-m4BXtP9wtR6pECRass5yM	2024-12-21 21:34:46.542671
213	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_UCZ8YOO_8DnxHHOn5nQgeQD81TBiCE6cZr5XO0LJAEQ	2024-12-21 21:34:46.625545
214	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_3f7B_XSJmybb6HbSDvEuT2UR_olCbfM0rQeXigkKKoE	2024-12-21 21:34:46.698171
215	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_Siz3i-FudOS1fgm8InXPSN3EzYEe4OxFysRPAFb71AI	2024-12-21 21:34:46.883074
217	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_LMsLZkBdBF9pUOy5Oq7Bndz8PvPQpCnXgP-gncEi5_c	2024-12-21 21:34:47.819866
218	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_aNu0BwUd5W_U64JhkRGFmWGVgC-ia_QZrw7qf1FF3C0	2024-12-21 21:34:47.829296
219	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_R-GR3RTfs-y_JcH2PxcUxfNNp5rvY6gecjtu0225IjQ	2024-12-21 21:34:47.889992
222	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_8z246IZbGddLNkWMtSKqtdIQRgpmr2jwsh3jv9F5K7A	2024-12-21 21:34:47.951897
223	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_RtJfin8y4902cpDO57d7I3e1ORzINY_jFFFn1cc9l3A	2024-12-21 21:34:47.974817
236	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_-jUa65_jMuOMq4Yb2D0xRhk4VkAM9M-Qb4W62bqlaHg	2024-12-21 21:34:50.464793
251	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_V7cqGhd3ZbtcjtZzE9E_LT_OtRLI3dtt6TJhYAf3QCE	2024-12-21 21:34:51.582641
256	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_AOsaBn6YoIOSYuCn_UwMsp5VuImjQiS43y4UFXdJ7p0	2024-12-21 21:34:51.85668
263	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_L9Cjymtlhzt5TEcMVClj0mnWwJSerX1ruT5Ujclv3uI	2024-12-21 21:34:52.188195
269	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_iC5Y4PrwMgrZhUFK2SDS08iv7b8Ag5qiFt52SVcm7as	2024-12-21 21:34:53.388226
277	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_KFtbaiT8t_J7tExT88INFEOaqodHXuKFkmtLvS8XSgQ	2024-12-21 21:34:54.545439
279	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_Iq73fuDqs6szdT3ZKolkctJswubMB5GMU_s1m4EYRrI	2024-12-21 21:34:54.67621
285	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_35Liab7ekhvF1dmrThKK-YzavkPNQ69Z6MiQD3r27jk	2024-12-21 21:34:55.911135
287	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_I7BaJuFvDbmiWzSMG3rQJLVyVUFsYKrqMpoOLF_QAC8	2024-12-21 21:34:55.937872
293	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_qblz8ERoKND8iuCYqrkADYiMb_g120wimGkjA4DNCKk	2024-12-21 21:34:58.312082
297	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_IaL9HotmvK_BwyGhR_4vRCdLk7QQmeEydIP1J98pejw	2024-12-21 21:34:59.494981
300	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_kvnW3GylH5y_skbLVPbvQF4yzqTjp-sKPoYeKS9WSPc	2024-12-21 21:34:59.504764
304	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_2b9RJol-RsgizJU8AYka5PoMGe9Fxj3LiPW5PLgW464	2024-12-21 21:35:00.697032
9	4e43aa54-5313-4f02-985f-efe54b48adc7	xpark_hl0jWdwfjRzzmP7_fv15QiB5nA8PORnJfpmCJOddTIw	2024-12-22 00:00:13.348851
10	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_INSqEawHs8Esq2_lc01ROcbvGx9XbiiZh9KMG-UOpwM	2024-12-22 00:00:13.697262
155	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_FyZOTzTlJPSG9qH3a8TRFgVRggWZToqCUDuSZcbAEWI	2024-12-21 21:34:40.812787
158	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_h0Qi-o0rqM7ZpV72szcWuksMG7B1VPUBMaAsBGhCk10	2024-12-21 21:34:40.903748
159	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_5wnaOgi7iILiduSpfq_FY19UDhAtjQnGtzd_LXbejX8	2024-12-21 21:34:41.068426
160	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_gqs7vnsgDc8ETtydFpQKp1P82w4S-8ovASm-V11RZ3c	2024-12-21 21:34:41.910304
161	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_Gs4ndcLZw7zWyuS8fkNzlxB5asX2rulxXzCPiQISFHw	2024-12-21 21:34:41.96729
164	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_utHTE8QZm4wwV6ECJefV11TcvJ05RM-7vH3qtjDBNfI	2024-12-21 21:34:42.088654
165	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_6f8Qsy-nFsd-y5cq33Olc3wHD-2Zh7aZjcMrwnyVsOY	2024-12-21 21:34:42.115961
168	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_70WfGhvkdCkrGoPFFJqAeHcCUN3hC845bKrPonVODN0	2024-12-21 21:34:42.242577
169	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_-Lfxcqh0k-lPp9O1rpvnrumtzW5Nt8dzMH3D1j1-Qbs	2024-12-21 21:34:43.09534
170	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_3s02L0j-Vj8oBHlAlB4AoDRl4YAmscg_3H7qHGcPtu8	2024-12-21 21:34:43.160745
171	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_0XFreT2YHJkafPD6uVEkYnU1afd1Oya2zOzZTapYaeo	2024-12-21 21:34:43.20751
175	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_g6IpYGlNVAAw4qFAT9kqldJ43nY8UTXX1o7bMvbnzeg	2024-12-21 21:34:43.406739
177	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_IY-vi9jsx3MOD-U6pQ1JuP1j8hmkVdDHu3hDLExQAzs	2024-12-21 21:34:43.529594
180	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_kDFN1OI_jaFkL363-c5iazABraqHe8ihwbW83yCkqPE	2024-12-21 21:34:43.53638
184	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_RqVMsfqVpF69JbX9MmNYYoFvmKwpERVXog1tkkcL-yo	2024-12-21 21:34:43.814614
192	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_J9tY6mudgbr6zDvt2Jg6_1fkytSq0MimHAwxPPMzrmU	2024-12-21 21:34:44.047701
195	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_UDmzO31xUlzBSi22jrSt3WFexUdjspFteIxfrEHrpII	2024-12-21 21:34:44.220816
196	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_g9NeXuZbOMq8pu79O38KQkZXbCsghlYBX6z324i_8lQ	2024-12-21 21:34:44.427504
197	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_2mC7DgpTRh_ks16EjAxir11HAbrVaTQaI6ZWOA-2fjE	2024-12-21 21:34:44.64995
203	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_xn9rd3jYrayEeUpv1YkhFtsNM-7J4B5965k5zQI7Iiw	2024-12-21 21:34:45.347627
210	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark__mlL3hPxF9K_hJCUpN-8ZHplBETcokPosOMyRHstVWI	2024-12-21 21:34:46.547043
211	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_MytNbUGEeG9gqHn21bbhXjKYCB4OsGLIhBwMZtGeFIk	2024-12-21 21:34:46.621736
216	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_CifHnBuOMP3_qGEdtuXI_1V2jl-ZOd6HRYYUrDK0UB0	2024-12-21 21:34:47.812826
220	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_6Xu72aO1pul4ptmvdN0_xhUAOrgLkjpKBzjlHmFrHBY	2024-12-21 21:34:47.893163
226	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_CjWQSwaMcS_9s_QI1Y0e2_-8idYYQ0svqCtw4oMjRig	2024-12-21 21:34:49.317287
230	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_sYAsVdmLKqr89jBz4ZqHsi7WE_-c4hpokbFn-gqYugI	2024-12-21 21:34:49.328294
233	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_WoJrKsWAmjtV3FHagCId47lWl24Lke8jD8gX2eIo0mc	2024-12-21 21:34:49.339663
234	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_N6gLr5lCw9w_KVlm1xD1DFE99nCbi5AHKGlhlWW9VVY	2024-12-21 21:34:50.352788
242	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_2rkmgATB0xCkCffEOBUbtAvAKPB6ynJeOBrd7HFVm-Y	2024-12-21 21:34:50.659229
243	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_eKvQ-suJN1QHnSMqtUpoM7IqL-P05Ncx-bJAPVjLVrw	2024-12-21 21:34:50.762343
244	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_r6nMeQlufC2z-S6CYZgoM_QJbVa9n2aHEzRosMbRxKw	2024-12-21 21:34:50.926962
245	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_mDfNaKkgS9qe6ZeCOzKOeAP-SfsOCfJ_50yOfbIzzUA	2024-12-21 21:34:51.038317
246	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_oAXtnmhOc5xcucdI2dbiazI96u4eGW_MLE54XQt5CxQ	2024-12-21 21:34:51.172419
247	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_AvtPAAe3bkZHp47Mt3UBCVNaqtauaUFwTF8nblAdiOI	2024-12-21 21:34:51.23569
248	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_C09H-NH5vWThXlaWxjRkINOyFTkS8s7YgFdWsdZphFQ	2024-12-21 21:34:51.35684
249	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_JMatcxMghWv4L3gNXFsayPpFlX1UXzqwaE-JdfJAhSU	2024-12-21 21:34:51.454334
254	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_N9egkV_idei5F68mnJS6PhnOL1Ww7erHGHbEfEVl0EU	2024-12-21 21:34:51.712086
255	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_cZAvJGanF8-LHs3Vvwhf-umvgFkU3q90KeMNNHFkRMk	2024-12-21 21:34:51.803869
262	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_rDW9VB-pABH1G20qtlR0w4CcvnozucjQ9h0KBe0r35I	2024-12-21 21:34:52.143756
264	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_fw76VxRJyzCD0aG8A0aPUeHnjJegy1cZSTaqn3Nicus	2024-12-21 21:34:52.199319
266	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_DLqMOKUIg-_6kJbgZ0x_9i47AUcbA-JlsWfjhlJEnZM	2024-12-21 21:34:52.248455
267	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_IE0nc_YdvdGfLfPl5xr1pYig8ONyuLe2JrYYlSv5Dlo	2024-12-21 21:34:52.340297
268	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_fLLd8edcU_epq29j0oDtfwRV8IvQ637GmIw_0rqx63U	2024-12-21 21:34:52.440433
271	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_75p_f6YyyPCvV2XPtoOIUUUpkcwF8q_WXgHLYtMQhnQ	2024-12-21 21:34:53.452034
272	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_l_igElI3q1078P40k7zQAiE5IAbJGvcYUK6vfWP4cPY	2024-12-21 21:34:53.554439
278	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_BVmWExsVru7ZQ1nHaxSRFvn2pLhELmHn214qkIdMpws	2024-12-21 21:34:54.546617
280	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_HPPgia8BJ1AGS3BnTCqCR_cb8Lv2FvBOxJ0Co4yMtLg	2024-12-21 21:34:54.676966
283	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_pnkJJwN-cnuZyWHX5H5Kjtf7YmMy0ELq1UUWDZAaIL0	2024-12-21 21:34:54.797118
288	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_9e3h8MWFnmlni4ZIFDKlQnlqSDKbeyM5tsoVBP0y1ws	2024-12-21 21:34:55.979763
290	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_6GXKnGcdUzTMbisG-lwOEM4KHbMnSDlOdsDzA3QYTmo	2024-12-21 21:34:57.108735
294	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_54tZNZpJRK2d3ANQVOemuf9Q-MCi3YApxuSRpHJSp-U	2024-12-21 21:34:58.313517
299	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_nZCSRTkBbKjvwYaic0zwf90iIJin2ObAG_bpavZIJHY	2024-12-21 21:34:59.504936
303	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_encEvEs9_Ct4TfWudcb0-t7JEtsGIWVw1WEiKMB30mw	2024-12-21 21:35:00.695268
305	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_oK_hewQTy_LMhw0WmHs9UkijOKkLZ8vdu_nvWxtVL8Q	2024-12-21 21:35:00.813789
307	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_yPj8S-FskJO3KGBQxWgdc985pgOUB5iBcFFwmY2f_iE	2024-12-21 21:35:01.836331
156	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_vxPuZbJA4Z3oYfHe2mZCjawC7MVq0ClDy-VmKv4UH2c	2024-12-21 21:34:40.903719
173	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_s3quTyH1PWWNDS_PSUM_N_0hFXqlZdO5UQwrYPrqR5Q	2024-12-21 21:34:43.321856
174	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_moiegExwM5dOncThKu0bs09q_veekUOqNrEMcuCTb4o	2024-12-21 21:34:43.399717
178	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark__jLi-0NRVQ7SCVEhsAUximsmbj-EbM9N3pBWmSUg52w	2024-12-21 21:34:43.532073
181	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_qs9kpJNMoQGTczKRDMNlGc9CDRLkXQLzbUzgtZtEQ0M	2024-12-21 21:34:43.56619
182	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_h9qc13aVZZPjuWLGbH5vPrEB0g-bviZQ1USEAKTAqSU	2024-12-21 21:34:43.719726
185	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_l8Er8XbmgOHXamDe22-TPBCdim_sSIpwon-LZwzqfDQ	2024-12-21 21:34:43.822917
186	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_v0G98Q9syq3ZWiwVKwtPu5lAIDUbbWKxRmQuaCjyub8	2024-12-21 21:34:43.849143
187	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_Qi8tgcuieS3b_UuoljkTLjjpmqcVkp0iLFjbJB_MptA	2024-12-21 21:34:43.884043
191	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_ttSpwvMb7Yd3xgGgmbi0zV_wY165INvy6k1koees9uI	2024-12-21 21:34:44.016359
193	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_YMbivpDvHy50j-pAfU9ZgoqYZkugEpY5d4IvKQmESsk	2024-12-21 21:34:44.118766
201	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_8AYd92fHbDumXQmIvuhQolh43-yCp8Uj8kpK15kYbJ8	2024-12-21 21:34:45.265055
202	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_oHdYqOj4Kg2iasQfV4B5F0pTE5yXjDN_WanQjG4RMpU	2024-12-21 21:34:45.338153
209	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_pRM_mcQ2eEyYYhposYYobNSodMrT5HD_WN2PWOMsf6E	2024-12-21 21:34:46.544192
212	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_BSpnDi3IzGIfDkt9nJPg18ZW8I-gxmMOj3F8MOpj-O4	2024-12-21 21:34:46.625444
221	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_F3Ek6DctCohuXR7UtUGhzq9sOhmxCi00BYsbvL_WIT4	2024-12-21 21:34:47.894227
224	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_k_avMWZZbie9Q1fKAtLNX9EWTX6mIWZUIHiscE4QN7I	2024-12-21 21:34:48.033731
225	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_Y8oQyjO8HZ8glsnfxU7jdu0Ub2Fw387ESI2xvRu2nF0	2024-12-21 21:34:49.138498
227	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_hNrFvwuVWGSWufOB4ScJDhGIURzBJOIBs45RVZs_9CM	2024-12-21 21:34:49.317778
229	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_9RkrmkurUMaFYcEkdilG6V5SZVctoB2aQxsgj6gOA-k	2024-12-21 21:34:49.328198
232	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_wdB6trgQ6Ou_5scXRSSRwSF_HjLlCweZ1X-jQknA1wY	2024-12-21 21:34:49.335865
235	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_RzD9ycVYpHfbnUIN-C5A7AclvQsaM6G8ItqS24LSNpo	2024-12-21 21:34:50.464194
239	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_WFcpGx8n8Fy8jznaWYLjeB4u93d7IcrQSqfctIw7i3k	2024-12-21 21:34:50.598933
240	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_4odpKFOupmQOCJjeiKl75_9wUASDbwPjn0PnmnjYlS0	2024-12-21 21:34:50.648061
250	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_UUeLSHQjVDP4da7mDU_DVDQ8bSBHX992urLruzRU6LQ	2024-12-21 21:34:51.56594
252	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_0ab9RUANgxkwVUlWD8LYvr97CVawl98ckuC46MYKizs	2024-12-21 21:34:51.583479
253	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_UDqbCOZBbM-KGnIbWliV8E6AdYFy-DkgcVHpiGg2hHk	2024-12-21 21:34:51.702653
257	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_hL5A3-VZQpJ1B6qOLIH8x0Qy9Gh-zdc8mD5dbVusz1s	2024-12-21 21:34:51.860712
259	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_ZB5f-PIyHJo6L-FGO1Lo_m7gLZnrmKF_lR25hDLG-QY	2024-12-21 21:34:51.906125
270	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_oscblbV2drWgcbZyiamLAKm6LmZIxf55lw7dfptuLsw	2024-12-21 21:34:53.397564
273	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_jpXzeUUvnyAQrMCfqyKz0-Hc3evGt9LXuxGRGYXNBig	2024-12-21 21:34:53.563174
275	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_a895zGZGMkWBNfXgFFIySKVoRpsYhPxSaOiRUDuhXec	2024-12-21 21:34:53.656345
276	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_yn681dC6mfSb-wkGtye2u5EXe-ZdiX1DDwwaGSO7Aco	2024-12-21 21:34:53.751854
281	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_zd6VWQvECB-jtpuvj-pp51NwrsoHsve4evNuuWamrEg	2024-12-21 21:34:54.736068
282	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_Ia4g5Y6ie_OES88fItW7cNOIq8WT9AeknqqlRmaFYrw	2024-12-21 21:34:54.794294
286	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_mnldNK71IV_X5uuO5WAshPufEDonZwEzh1WIhUz1vkc	2024-12-21 21:34:55.933225
292	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_TIEiCXJmfNq0yKz47zhRVum0j_rGvyI2nbCeCH72-aI	2024-12-21 21:34:57.132557
296	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_uzC1xspUnSoYdJ7RuSWbJKuF5CZ6TaXdI_zLgmUVuac	2024-12-21 21:34:58.321
298	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_OlWRl48qJdD1YbERb5hc5TiHq3oRMKm45vKppLxexNE	2024-12-21 21:34:59.502415
301	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_IB9yhC7zsHOm1u0oVUa5sCeQZgxybjkjEbYubM-yxVg	2024-12-21 21:35:00.687583
306	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_eQf-OKaUyYSOnosexkd8GkjIO71AjGWzRaDY-Um_3Wk	2024-12-21 21:35:00.82248
308	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_3NyLs_orVd9t3U4Wrj6QV0ub5i69-k6ikvvt9x3U81g	2024-12-21 21:35:01.837577
309	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_oOKNzq7ZRWaPPBRFOA42abv0f5gFlLRSSWEPLZmveQw	2024-12-21 21:35:01.946663
311	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_PohCz4CQgXBROr4WRP04mEsI4mrXSv0KXfBuh5v7_Ro	2024-12-21 21:35:17.378044
312	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_-exskZ8AzsBdm3HF0WoblAqg5mBzNBDFgNiG1vRkW1w	2024-12-21 21:35:17.650889
313	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_uX0Ms0rDBk3RL0QgEKb1Vyls4liSamJ7SllgTjpfdxM	2024-12-21 21:35:17.779141
314	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_ottnz8LOMGfyxs0L2X4gmm8hqw5v-vqKzRDCArBzSeM	2024-12-21 21:35:17.894342
315	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_YaVbxIFAmjDrCAIsT7mHeGsAaerUhr5FwI0Zh8RpnKk	2024-12-21 21:35:18.016428
316	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_wIomM3XxBRgOERW96W60-V6112pviOmOYXqVc0x3LTE	2024-12-21 21:35:19.152393
317	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_76FEm6WqGzDvbNhvZziXvq64NdkghkeDHyeSJ_t-ZTU	2024-12-21 21:35:19.268485
318	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_8B4QdzTTkiInh_M_QvNuVQ8UX0-JqLyY38dvHK3nasw	2024-12-21 21:35:20.455876
319	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_hNYlo33AqfaGKIWpstsjgkvkinZztc5Ep_Fq7qVZmhk	2024-12-21 21:35:20.54829
320	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_9oebHPAaMfj5Ck01w-1aCDbI9Inq3tFHES9NCwi5OGQ	2024-12-21 21:35:20.651352
321	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_yrFtYhj6eQ8-voDQ1ir7LiEzDarrWMxwnQKDM_pQ9ME	2024-12-21 21:35:20.761602
322	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_L-reU1_NZuoydMvKYDnyPa2dnv48yQhuiqNJZ7y7xr0	2024-12-21 21:35:21.878291
323	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_xRT5-mbq-vZFSe7VX1bUtPmNDLV_-bl5rp7BWrnAlhI	2024-12-21 21:35:21.99524
324	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_-PQci0GTyeqgOSklH8YyIOWY0G90W8z_zMyPUYB7fbw	2024-12-21 21:35:22.09492
325	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_4w8uQrhXA7KKImBoAZ1OKP9xrAjhYLZAuPj8UNn49Aw	2024-12-21 21:35:22.199081
326	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_cU7z54d7PaYjtZJxhYRaxMlVHG6iCGbSqZdrkhLzNcA	2024-12-21 21:35:22.328197
327	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_7oEgLi_C1p4E8ZXH8kWWxX13urpOzxjvW_q1TyzK7eo	2024-12-21 21:35:22.456976
328	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_VOcj6_cNhimy8bmIp6wO8bkifyuvg7YeCUOcNVvuL5U	2024-12-21 21:35:23.59651
329	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark__zGXbWa68HM828y8-riRZ9PqUOKz-L6ZVgsKFwvHBbY	2024-12-21 21:35:24.729445
330	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_-Su9hiqQ_ftjAavutQY8Hjoli7q1n6_H1REHjPGypXs	2024-12-21 21:35:25.885513
331	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_VEZ2u1ovQXe23ID2ZDaKBk7wAR7lvySH8aLWyVzAb1A	2024-12-21 21:35:27.001231
332	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_7Lz-XSBQonmUVXd6dCC2jmEJI-kfI09JU1FSQWx9tug	2024-12-21 21:35:27.16024
333	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_12TWViQ2YoLLtkhLcTPTRyhEN7s0cUQevgjAfbkLMK8	2024-12-21 21:35:28.312881
334	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_zT0HXrg1p9vGhDiMfG1iDV3xolTPrsqxDV5BD_OTUAY	2024-12-21 21:35:28.467245
335	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_3i6xPVq31CSgbAzW5XL-7jwUYVnqt77CuZMzAWD3kQM	2024-12-21 21:35:28.6478
336	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_tL6G1hKEE44sSz9zmFbcqKZlCOxH4nc7i6ZKB3qBkEs	2024-12-21 21:35:28.754054
162	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_97Oqe1WDUiFhUd0oolATNFk0KDBftNFFSt_-WKj1Sis	2024-12-21 21:34:42.041813
166	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_4BdNvoEAeuUDSZS_iGJdY3rMqJyx2WxPjHmv4H_EWtA	2024-12-21 21:34:42.165824
172	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_Z9iriwo9f_JJnt_X2K9_p4V8QWJRZwLmtsFMX6J7zlQ	2024-12-21 21:34:43.270908
188	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_Y7CxXrY8TXR_eoH9Bt8jp7RkaW_qhJupWDvphobqfxc	2024-12-21 21:34:43.913646
189	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_2lRJtR2yrYumLqjcFGr07ixYJ6DWYh3WRZY2ST3U1nw	2024-12-21 21:34:43.973972
190	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark___X7s6DdLwBs5pFW_9G6dsvJnZ_YaKUR5b6f1mshj1I	2024-12-21 21:34:43.989318
199	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_cQwaXnk34fEKW2Doo0qwt4K0m5FZNaH3TDxjGtYFsDs	2024-12-21 21:34:45.218688
207	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_lKGx8foIQEkTR2albM9bN1VQa4XXurPu7wuBBS2rYdY	2024-12-21 21:34:46.539988
228	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_Tt_uqRrt3De2PGdTDh8N9LSB4Df5J8jZjRi9jefkHg0	2024-12-21 21:34:49.321724
231	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_N_Zct7S-pxWeRq-7ov2Ms1Pxm5yiIBVOsnmow8cBimg	2024-12-21 21:34:49.331519
237	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_dWxmGjpWJgzAkyn79Dcb0gUavqNL1YBDIHrLtMyrN7o	2024-12-21 21:34:50.46873
238	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_62g1dSZnDEFNmnf0BN3KBhKiUqnWF7BHUChswGAqrGo	2024-12-21 21:34:50.551997
241	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_oMuzl7jlD-BgjiMESea6NeQt3vD4VIMDNyq12TcJIyQ	2024-12-21 21:34:50.648466
258	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_X6tt_d9qN4exR0beeHUiMN4BY8Gn_OCZhV6tNvE5B8I	2024-12-21 21:34:51.906338
260	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_DN7iN0G_VMIICBnx8XnQmUKmzhufY5e-ym2XSVQJ5nM	2024-12-21 21:34:51.976162
261	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_BrejBhKTCpmzs-0it1obr1EqZ3DzxYroLR-svg_1A1E	2024-12-21 21:34:52.13116
265	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_uzDq3TbQ8StqjzOi4QR0jOj08yNxDJ8ACiIeyVrWhyk	2024-12-21 21:34:52.229445
274	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_sAzf7qVLSjLqR1jFD1qF7ISl4KXcj4wngp-XT9c_axo	2024-12-21 21:34:53.653619
284	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_NHuJ82swogE_pIEULrrY4IUTq3Zl2LK3YkqnPANZ32k	2024-12-21 21:34:54.85649
289	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_t_yAGCaGAmaYSW3aM38ckGx8u4Jon56uPikhxtniUvo	2024-12-21 21:34:57.096236
291	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_hUzTTbeQ0POpr7A78YaEfaxevNnvvetdpujU1hkNvD4	2024-12-21 21:34:57.111528
295	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_yPpMrg8XX46XgMDxpV_uWNHiPZuRwAlS5TzHWsaNC9w	2024-12-21 21:34:58.314852
302	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_JmkqI8upvxtExYMAUlJ8Cr6yPo9nEnRm2k4lHIMeuHA	2024-12-21 21:35:00.689118
310	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_iCiTTu7odxKQByTqIAnxjoaJ4WG6savZ3K2kOexD4e4	2024-12-21 21:35:01.955747
337	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_oL5TINL8BYQVCGsuq64n57YkjQL9PmODKSWYeTcaE-Y	2024-12-21 21:40:41.753015
338	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_WpdaCERW8UVZKvdUb8OdPiNX4BOlmhouaWs08EEPVAM	2024-12-21 21:40:42.034931
339	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_uuWwus4Lxq7gGfMtr4lbej45hN6er684LVISm4CJyN0	2024-12-21 21:40:42.162119
340	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_Q4vANwZ2SrQvWKGltc91_qHWuR29gwtErAUJDuPLzJ8	2024-12-21 21:40:42.33642
341	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_AZOAz1TLHISkRfx4MDicDtTlJPyCPuF4QjzM2DzFq2I	2024-12-21 21:40:42.47717
342	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_23sMwHAe68_xkNis8Fqqut3oilFv-cAEAPseJeVOByc	2024-12-21 21:40:43.634141
343	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_BUrD7iOb9lnnEwjAt7Bba9XLjzBEwlnaFleXmfWx3os	2024-12-21 21:40:43.77951
344	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_TtL0sxwcLmFwdltD4kydEP22cekqKOv5-DY2vK6UiGw	2024-12-21 21:40:44.94992
345	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_dTB76VnIvKhnDWpL3XToV20qnwG4JcnsXGGQcJoUHVg	2024-12-21 21:40:45.091182
346	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_y2S0V-KG3E8hr1rWDieZVgOYW_l_SSOo-UujohTIHhQ	2024-12-21 21:40:45.190047
347	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_TRyqOLSAOh_kqYoTSYkynKBTbpPEUBhbWgfNkMr6iy0	2024-12-21 21:40:45.28351
348	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_WR8oeNoUgyq_sJkYdDCpelLF0eswzCA20QwufVpAuZI	2024-12-21 21:40:46.40685
349	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_36YYEhC5lWaL7oo5wK14s7e7mB9AcOYuTJq1qFj6jWk	2024-12-21 21:40:46.493207
350	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_AgvUQrZmOpq6Xc03fsaNW-3tRU4hgjjEcWPSUKEFRXQ	2024-12-21 21:40:46.69831
351	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_4U_btKLz8ff_AyrwcabtFC8Ny_N-zzVhmxurnA6Sbcc	2024-12-21 21:40:46.784294
352	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_cwhu_QGMcn6Uo6CuK8xItoy5tu9HwlxnqF6HmQTyg_M	2024-12-21 21:40:46.868194
353	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_uCpDURiCWOhcpUIRyXYh69auIJBXecL1DB49mhgGeqY	2024-12-21 21:40:46.976355
354	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_vScDgqqoiYNJPcY_4rgyzuHadhG2c6dNem2xsTAW4e8	2024-12-21 21:40:48.426801
355	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_-TVymzHOIiDKmv9HuxZ0Y3Gk4xkPvwq21I6glNQRt4w	2024-12-21 21:40:49.689899
356	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_PFPhV-zirZo9Y38KRt38s2qm2qpgCwIXoEIJl210CIo	2024-12-21 21:40:50.874581
357	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_SVlpcXwQPk56xgANfJnxv5revZUEF78mp6ueB4Q_3AA	2024-12-21 21:40:52.059634
358	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_GJxG8zr8KmDo8bHH1CT8VtFYuUexNCaIkw5GswPNgL0	2024-12-21 21:40:52.207723
359	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_MGZ3KM4w4aCvoeNJDbEC9vV-ju4oRR5z1B1rGh9Fobw	2024-12-21 21:40:53.369793
360	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_CoHWT1Eixgef_CP1wlIFOhDsm0uQ3zQ352IithgeRTo	2024-12-21 21:40:53.524017
361	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_dw_njMX_WnoVZ-rpNkxL9kXe3m5MJiMKnTteaCToshE	2024-12-21 21:40:53.683188
362	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_B3GRP79Ty5Y0vlZKUiksPWSXJyzaZxkaHg49CLGSAVA	2024-12-21 21:40:53.778783
363	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_wpWaAZymjFhEBmzgRyWqMUHhPkAy_Sbo70Ydt3NI5Fc	2024-12-21 21:45:08.123219
364	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_akF4V8RVsQ_CTmcBdgELrs8rMUSHsX92AguVcUJAfeI	2024-12-21 21:45:08.418205
365	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_E3jdkdrVW1VH_vvXi4NliVTV6KN_mKIe2d6sOwfOGQg	2024-12-21 21:45:08.546651
366	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_PoG5AfgTwBrho8Q4A2IpMv2dPehRdtl1rTtgJpPfJIo	2024-12-21 21:45:08.652562
367	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_75RTSOOPHdodjZYk46unTSCei4ZQQZhFNV6oRb0mNUs	2024-12-21 21:45:08.792399
368	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_TX0Q_LL6JXOJbKi0ksDrXdn0WvHkXKkCYkWfurVdGc0	2024-12-21 21:45:09.910234
369	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_gEHy-N9-6N8ynd_XdxDACtGK3vQjDhEp6kWXHqB6p4k	2024-12-21 21:45:10.030736
370	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_Vw8ajr7Je_0eUS6FKcbL57-0lRz9zroRo-OotM5WDNQ	2024-12-21 21:45:11.181554
371	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_GFUW725h0ec-VdtQ7yESchD5_FDPxNhcXNGl6_ifQ6Y	2024-12-21 21:45:11.289072
372	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_1mJ21q4RStib3BN81oOfQiW5GbMTgUrCp5WvLvzpC5Y	2024-12-21 21:45:11.388242
373	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_fMneygHIfb2y3NquPOKZ6PGLFPEZqwKq15aZioC7tXU	2024-12-21 21:45:11.486708
374	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_35n6a8FxepUiTWP-wmoHf7X95YkOr-CN3LP-jqr0phg	2024-12-21 21:45:12.629407
375	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_WOPUgIOPE1QVepHaL6aVOCjkaVGPNE-_a8AGJJPGp8I	2024-12-21 21:45:12.788028
376	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_8uhrSX5MQ0seGweHna9ZVezZ2axwBv9peXMKqkvJJis	2024-12-21 21:45:12.887869
377	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_XXKx-XVg9l6ZRWS3KrhaMCwZGFjB5vyd5REoCQqQzhE	2024-12-21 21:45:12.981719
378	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_TFtqLIV_1msygOsfZLV5kNM1WnMKVcbBlPVeQVHLVcw	2024-12-21 21:45:13.08157
379	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_6GRKbS6B77vWUTJTtmZWbwIksfWUkT6KR6VFi3IYx_0	2024-12-21 21:45:13.180546
380	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_29GHQ_CLnv2m9YMcyzZY3BUWRbisZLdAb8LO4x8LhyY	2024-12-21 21:45:13.503805
381	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_cC0KC7f_WfpCpFCjopDYJb-VfKgH3Tw8f9TrBbBQwfs	2024-12-21 21:45:13.823003
382	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_CyS7nApix_NfPfJBCAvhd22j0kqlqvQVpZimaokWf-8	2024-12-21 21:45:14.133186
383	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_NYx91xxegWWCYJkfWgjzfhd5TgxUJxUaDb153mMxWCc	2024-12-21 21:45:15.276851
384	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_1guCpvs2wjGR7s-cXZpQ8qAdADoPgQtI-hcJssJ21tQ	2024-12-21 21:45:15.468507
385	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_h-rBx2hW2EeDiOazvR1r7urJWxYiy8kDgdJerRJvuGo	2024-12-21 21:45:16.597334
386	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_mAkbOH0Gqw9bh_ssIpPjwaqsMcNGm2pq8Mtr68nJbuU	2024-12-21 21:45:16.714244
387	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_Xod-9bzpBlWWR_LwoDGoFiBHyDGOCCsS4YdkPdOFt9s	2024-12-21 21:45:16.897299
388	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_CdfT3m6PqbyYahL5-p7xUQIllBDwbmN0zLzNjxJ6yu8	2024-12-21 21:45:16.999124
389	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_g4ex7LOBm5VmKLbzYGebKHjekKzJ-NG_ucKnmbJ7kxY	2024-12-21 21:53:46.447638
390	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_VZzDP5eHiRXnrUAno_yK0HlSiz3S5sEBc6tBVwoxC1Q	2024-12-21 21:53:46.730763
391	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_g72azYAFG2hHOjsMsxCswXc73KTtgT57nZk4FgCyAdU	2024-12-21 21:53:46.882112
392	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_M3fuR-8IchjMzguyXOrAtneFFjPqe5h1XyotGqxmBJ8	2024-12-21 21:53:46.992103
393	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_FRX3Ho4UU4WpXv1dyWmy2YIJqcVZ4cqpO5d0DcbrwL0	2024-12-21 21:53:47.185456
394	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_rP-nujOWFZKY7oDMo2TpqYP7lZaZWwN45qBd_FmFLjE	2024-12-21 21:53:48.316375
395	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_nBuZ-aWggREceyoO6pDxDfH_dcthgue6CuFXQESQXeA	2024-12-21 21:53:48.464163
396	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_0OynDhWLWk0hgUpaY0wm63RO7kydb3uMqDjuxVaZmS8	2024-12-21 21:53:49.637768
397	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_Ei9UbV1_MPBWli74GWI9it5fjzINcqPS11ffQzp8mSQ	2024-12-21 21:53:49.75726
398	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_rONJ15XQnJWQVU5SJjeAAEkMeQkr59JaVZUd1fQzTEY	2024-12-21 21:53:49.856648
399	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_zE1eYpkxfNTym1iFl6j_QBBaTTjUBLV-VDjHt7iHrGA	2024-12-21 21:53:49.964856
400	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_KbFvvYRd5826_VAtpFdBlR88ZSHLKJ6yJbezND6lwYc	2024-12-21 21:53:51.11432
401	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_kXaOlGafBjgl56h9aY1swDNeXtoar8LvKQbFbGlH62g	2024-12-21 21:53:51.260466
402	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_YWFSCzE_QT3PyhbIeC8DUJVIz5Yy_wCzLteHz_dNR1E	2024-12-21 21:53:51.380589
403	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_Du0R5mIEDSNKa7VM44HG8MzP0-ZS_ruRwBwIg9AkZek	2024-12-21 21:53:51.487229
404	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_RKGqqtRmcTUjCdtDsPP0GMtO1dU98kGpmke0-UaK3rQ	2024-12-21 21:53:51.589901
405	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_rHj569yTO63xxo6XutXLGwlqoauaeyyThi4lCZJAdDw	2024-12-21 21:53:51.698717
406	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_l20ga8vUKWXbhM2Dlkpav3dU9mmOA-BBIDx9I3r_OLQ	2024-12-21 21:53:52.024218
407	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_lHZgPnmAdH4nKWCVyFxpAIuqGcSpgoocE-SkZL4Aspw	2024-12-21 21:53:52.355226
408	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_ce7VTw4Ga-DlZTUBcsD9_wQhO0VgBPsrrCsGE1WbAL4	2024-12-21 21:53:52.667527
409	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_o0ftbOGzkWUgu-9ki6rM6dDCau46txN9clLUbMtYE9U	2024-12-21 21:53:53.831216
410	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_OR-ZhC-csBdvRGa37c4NJvncdpmkDnffcQiVTiiGOzI	2024-12-21 21:53:54.020611
411	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_KBbYDAwzLGl6JKDEWfVOoQzDRNERkSJxJjQ8N2Td_Es	2024-12-21 21:53:55.175243
412	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_Z2n3Co1r1rknI-cn3MlsGOThSMEQQMEcTyctjKPtVnk	2024-12-21 21:53:55.399877
413	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_QURK5aRcYwHHQC0BqPI1Ju2jTFr6YFI8USCBiVb_G3w	2024-12-21 21:53:55.572627
414	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_46Gzad_2ZPmLa3gdrjfudVJ0DJyMKZ21cjwE5xaaUtA	2024-12-21 21:53:55.669092
415	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_L28K8of_98pGTEDp32rLqqEcmJN_lhaAiqFIHPngN5M	2024-12-21 21:55:26.230427
416	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_CVegb3ueGiEskJekoXNKh33-z70zyAxlbsq3zjhTM3g	2024-12-21 21:55:26.518479
417	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_pqP6eSJ7Zr5MXHkS6IKJJxiBoFaszuurvsOj0i-tqb0	2024-12-21 21:55:26.674772
418	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_xJVb3tdV025wNz7nm18V-JG0vkhluhFrxejj20kA8_I	2024-12-21 21:55:26.793088
419	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_z-CgqeB6D6ecFhwysmqOoIOZsmlPmdjS-KuCfQQvvUk	2024-12-21 21:55:26.963399
420	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_hPkLpVITkTFaVf5Q8qwlocyQAkm6wYg6u63t3L-WykI	2024-12-21 21:55:28.092871
421	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_E9b9tWXuruVwDlqEKk31QCHKLO6mWQ1w-dIgp2mbcc8	2024-12-21 21:55:28.235605
422	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_5Zo316XDVgdG3r84MrNnKtQqJo7eeNyhxlMlUGqsVmA	2024-12-21 21:55:29.450375
423	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_7G9h6X3ubVLF7c3A5K-IuVU1BzjRScLJnef_Rggndzk	2024-12-21 21:55:29.609841
424	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_Za_PiUD9oC6MooZ0JrkzrMRGIzFrf13U-n9ODF_kLy4	2024-12-21 21:55:29.760091
425	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_IlTt7gOkYO00hPH5OIfo5GQk3KiWY_q5p8ul9gdgh3A	2024-12-21 21:55:29.872648
426	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_x1jgV1OdUoArCXYFolT4mZSKWVg508XhgYKcrEjooxA	2024-12-21 21:55:31.026621
427	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_h6Acnqn1xRlJtl4B_3oX2fTffRnsIfYMXrRWvP01OEA	2024-12-21 21:55:31.184032
428	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_-CWZbVrav-48EViXoe76biAoC7_qkAcZFqmoeJyAiw8	2024-12-21 21:55:31.299109
429	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_bqTICO83EOgZWnOZeUNijMqSMJLZg-3dd4l8_pR1p_Y	2024-12-21 21:55:31.407194
430	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_KVoW7QZIux27KaZOXr1wLthV_g7H6Yvre4xaQz4SwEs	2024-12-21 21:55:31.506647
431	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_KN6k_9sQ8WpmJG-86S7N0kWnY8Rhx3VDy6ea7VR6PjA	2024-12-21 21:55:31.611631
432	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_v2ZtlRp-l-Ag638VQZvulmvg7hFI_ikgNcrJAqMR44M	2024-12-21 21:55:31.927313
433	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_mAVh-Gs6H32izpEeWlxQgYFfidAoSWzvyjdZU_-k8c4	2024-12-21 21:55:32.889078
434	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_olnz5VpAfN0BPDE16lZXFFdlTILnQZoD-6Oa4wCGVdA	2024-12-21 21:55:33.46555
435	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_WVHH3wEVg7y1fTd93Ij9nOXv0oSnFYSt6Vpech8bPww	2024-12-21 21:55:34.619202
436	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_X6fW2UCilOlTGS7XlI3IuyPGk5BY2ORyyQW2CTCDxZE	2024-12-21 21:55:34.781974
437	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_8u9dQAHBnyey7WG3v9XafnJONWk0fcXAxV7-f-pVkrc	2024-12-21 21:55:35.989089
438	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_jPA2mdG8OsiiRg2no9JLfvyRDdsS0DnP5RKKryi0Ft8	2024-12-21 21:55:36.100549
439	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark__x_HTG3QU_jLRTaZta4c3dgAYyzH8qHRuJVJalGeSw4	2024-12-21 21:55:36.274839
440	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_An-cklc3sz639y35i93sI15dYzlVrJhqAObi1pP3XsE	2024-12-21 21:55:36.377385
441	4e43aa54-5313-4f02-985f-efe54b48adc7	xpark_UT2OoxxcLS0Kw-vWNVD39EkjV4-zuwTpgMImh0JqdlY	2024-12-21 21:56:37.812275
442	4e43aa54-5313-4f02-985f-efe54b48adc7	xpark_GxZ2qUJqNY-2VHHJRJPhFYGseXJtgoA7JRY1TX4cXec	2024-12-21 21:56:38.063744
443	4e43aa54-5313-4f02-985f-efe54b48adc7	xpark_lCW0u4Z51NF8NEmu5kFYfpBd5JHksOqWjlC9VpR9twg	2024-12-21 21:56:38.209142
444	4e43aa54-5313-4f02-985f-efe54b48adc7	xpark_ITmUogq587Ed5zQhQYaZ3AO6SA1fwLHBMOszjQ7Ygc4	2024-12-21 21:56:38.327737
445	4e43aa54-5313-4f02-985f-efe54b48adc7	xpark_9duVSeNJvtH0P6IOMsp_g1LShT71RmwQYQroBSgO9PA	2024-12-21 21:56:38.496877
446	4e43aa54-5313-4f02-985f-efe54b48adc7	xpark_m0l1HT-fEB72YX5TOxTiDsrGgn2ivXaZ93AM8ty7Ssw	2024-12-21 21:56:39.599866
447	4e43aa54-5313-4f02-985f-efe54b48adc7	xpark_rv7ruwklP9bpm3Ah8YfdozdaIQq_xJCATlpL6pZxi08	2024-12-21 21:56:39.714213
448	4e43aa54-5313-4f02-985f-efe54b48adc7	xpark_bzdrcibFujsP-Pp035zpUqTcc4K_zE3p9ORXKqFtcYA	2024-12-21 21:56:40.88103
449	4e43aa54-5313-4f02-985f-efe54b48adc7	xpark_AgI1k0EdF7-dEcVywcSezO0EmtQKmAaD5C9kdQeN-yo	2024-12-21 21:56:40.977134
450	4e43aa54-5313-4f02-985f-efe54b48adc7	xpark_wceVo4jlYY6rfi4lG3pmIgEfnZiqfItDXAfwYZOraKU	2024-12-21 21:56:41.070742
451	4e43aa54-5313-4f02-985f-efe54b48adc7	xpark_IjW0bnY2ZuH4VtdwiX3tXVmDr8jTHSx0b_KeyVQ6DOw	2024-12-21 21:56:41.165854
452	4e43aa54-5313-4f02-985f-efe54b48adc7	xpark_58iTTOSuXVpr1tBlZ9-AUtWdpIEnyRdAOnX68fTN0us	2024-12-21 21:56:42.288991
453	4e43aa54-5313-4f02-985f-efe54b48adc7	xpark_3cFFWAzPZstny1omN6HJk53WeWuirVuHzOAEN7edN_o	2024-12-21 21:56:42.504358
454	4e43aa54-5313-4f02-985f-efe54b48adc7	xpark_DCHGMISb3SgmlyunNDeatW2sA7_zfnF9JJ_PIO01MGM	2024-12-21 21:56:42.616604
455	4e43aa54-5313-4f02-985f-efe54b48adc7	xpark_5NUF0EEvH85hDEpxo6CVGX9_lYALvn6W62qchGHvEwY	2024-12-21 21:56:42.738058
456	4e43aa54-5313-4f02-985f-efe54b48adc7	xpark_lb2bjhdJKtLqPWWR1AWaw-1uizGh-KuQgA2SKA0GtDo	2024-12-21 21:56:42.839415
457	4e43aa54-5313-4f02-985f-efe54b48adc7	xpark_gE9kY43xGQYfSWrKKLn_LwikzXjxJ9S6RbFM8Cqx3aY	2024-12-21 21:56:42.950616
458	4e43aa54-5313-4f02-985f-efe54b48adc7	xpark_Ij6izp6e2xmeHwvNBiRlLzuQieELJBsCgYY6ReO3W_E	2024-12-21 21:56:43.255982
459	4e43aa54-5313-4f02-985f-efe54b48adc7	xpark_aquPDS9bAkk2XWljAUUwruBSkc6eX4xQ1cohrbWDvyo	2024-12-21 21:56:43.537384
460	4e43aa54-5313-4f02-985f-efe54b48adc7	xpark_Bsn-YEC9JV86AjnJKkWQhu68cauVWuyybAumScRBBQc	2024-12-21 21:56:43.824248
461	4e43aa54-5313-4f02-985f-efe54b48adc7	xpark_fxG9WFVCl4-Cald9ZQCmbJfTOjs08YphQYsAUwupris	2024-12-21 21:56:44.947753
462	4e43aa54-5313-4f02-985f-efe54b48adc7	xpark_xAPD77cyEa2LWc9dFgeni6fgdPpXl0RlhPBm2qGdmDQ	2024-12-21 21:56:45.089559
463	4e43aa54-5313-4f02-985f-efe54b48adc7	xpark_ntTLKOiSN27BYHVYjxuVFh5edKQSIBUq5-GIzBpbWsY	2024-12-21 21:56:46.244369
464	4e43aa54-5313-4f02-985f-efe54b48adc7	xpark_iYQj2HrHx_2OAYFsRhgS5Rn6p0pJetaQmMuzYFq0NQQ	2024-12-21 21:56:46.399108
465	4e43aa54-5313-4f02-985f-efe54b48adc7	xpark_-wBW1aq9bpjeyOQB73R5Fu4lhbb7j43uWwmwbPqgzNM	2024-12-21 21:56:46.597475
466	4e43aa54-5313-4f02-985f-efe54b48adc7	xpark_SRVRGBQPFqugKU3PprxhEdh6SWRmN3FVK-_K6DF6RBY	2024-12-21 21:56:46.708796
467	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_prZivrvxit05rfw8rWe8V4GNfJxC0606NTzwGvwfmok	2024-12-21 21:59:48.803132
468	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_GIpgXF2Zezsn6VcM5tc25cA76v2HjR1AvIVPsGZci6Q	2024-12-21 21:59:53.93132
469	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_M2w8MIl6vNnmWdVM8vGFH3kvTDF7dYa_3fETkuROW3o	2024-12-21 21:59:59.05416
470	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_knxeFip69lrEBrnaCR7TJHN6JL3YTkXYXRtH-P1suAo	2024-12-21 22:00:04.166044
471	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_UAMquwZ23E4wkOwrNMaR0SwrZWJJF5SN8hTITHBoGwY	2024-12-21 22:00:09.303915
472	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_m1Ri0CoKPBtSfasaz8JDwtWz5iWAoChRWVpcRRF02j4	2024-12-21 22:00:14.45101
473	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_z3ZOvM6Vd65ljvGsyjT437ICcv7J5t_0QEu7ozt5XlQ	2024-12-21 22:00:19.590393
474	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_I1ZchBWrT604Dnx0O2lgcyjZQifTpekBwkh9B3Ckr7I	2024-12-21 22:00:24.72033
475	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_GZP0REqFi9oPd7zU2J7sOndgrWkXqzqgDHm5ErYUBPw	2024-12-21 22:00:29.839669
476	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_qQx949KJISI-fMQTGV8jQZfwYnlIYpmjgbTJDdN1brg	2024-12-21 22:02:00.541564
477	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_t39W-5iU-4hqw3PSqEqmVAp-SMJ9fq9evLum5XyufK4	2024-12-21 22:02:05.680801
478	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_TYGIiq_pXbllgPPaU2ExmUrjKz33fI375BjrTGJ4mLA	2024-12-21 22:02:10.813437
479	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_I6jhiAWf34R3Mdnc5AVQI3oq205geBfq9x57FqNEzcA	2024-12-21 22:02:15.940703
480	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_CFK3ZKfAzApQWdjzzCgkcqw11SHKaHDMg5vZJiROkTg	2024-12-21 22:02:21.082741
481	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_yZS-CkLvicYEoW3ZLxd_I4ajWO8dqpG1kG63WFIhAzg	2024-12-21 22:02:26.211696
482	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_az5kPXX6RWugqzCs6OkXIWwhJzcfi8TW4zFFIQk6n1Y	2024-12-21 22:02:31.358792
483	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_cBKManr10SiLb0L-ICLzWLdcHPcvlgE8EcmEdOpEs1g	2024-12-21 22:02:36.46432
484	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_jVppbwJhW0qHbmiHjMrGoD6rvnjoMb6MfXWC0HfUUhs	2024-12-21 22:02:41.765979
485	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_vXef3dRrvvaCU-e5oBvEy3g7n1DIMQbh9dscyUEgqhU	2024-12-21 22:39:40.942085
486	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_wz3nL5NSYOX9NrKmzwKbZ5KzJxnHONNLD68vswkcDcA	2024-12-21 22:42:57.256235
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, name, email, password_hash, deleted_at, user_preferences, points, state_city, badges, is_banned, responsiveness_score) FROM stdin;
c7264d82-6b1e-4b08-8a1e-e39af9ab6dc8	Test User 3	xparkusr3@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$oQSDbrq8mhhngCV7lrRE1w$Q9itTkHavAWO9ThytLxhOZvO2abbnO3UugIGRe1VDWw	\N	{"notification_time": "30"}	{"total": 10000000, "current": 10000000}	{"city": "None", "state": "None"}	{}	f	5
4e43aa54-5313-4f02-985f-efe54b48adc7	Test User 2	xparkusr2@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$CAUZLw9SfHsFBoGscxUCtQ$MYI5Bf262c7dT69SS5MKJktGoa8ktY2hVMNZQQw6UK4	\N	{"notification_time": "30"}	{"total": 10000000, "current": 9999250}	{"city": "None", "state": "None"}	{}	f	5
3ceafe32-5706-4fef-aa09-80f1c29ae821	Test User 1	xparkusr1@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$beuWo/aLl+XWCwRexnTC4Q$Jiek9jSIzrjcJxGONAsM9vSTgb29nQiZm8+mWzFatCM	\N	{"notification_time": "30"}	{"total": 10000000, "current": 9967250}	{"city": "Miami", "state": "FL"}	{1,2,3}	f	5
\.


--
-- Name: bookmarked_spots_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bookmarked_spots_id_seq', 6, true);


--
-- Name: paid_parking_allowed_availability_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.paid_parking_allowed_availability_id_seq', 4368, true);


--
-- Name: points_transaction_transaction_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.points_transaction_transaction_id_seq', 43, true);


--
-- Name: renter_ratings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.renter_ratings_id_seq', 1, false);


--
-- Name: timetable_coalesce_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.timetable_coalesce_id_seq', 24, true);


--
-- Name: user_delete_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_delete_requests_id_seq', 1, false);


--
-- Name: user_pw_reset_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_pw_reset_requests_id_seq', 2, true);


--
-- Name: user_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_tokens_id_seq', 887, true);


--
-- Name: bookmarked_spots bookmarked_spots_parking_space_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookmarked_spots
    ADD CONSTRAINT bookmarked_spots_parking_space_id_user_id_key UNIQUE (parking_space_id, user_id);


--
-- Name: bookmarked_spots bookmarked_spots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookmarked_spots
    ADD CONSTRAINT bookmarked_spots_pkey PRIMARY KEY (id);


--
-- Name: cars cars_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cars
    ADD CONSTRAINT cars_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (migration_name);


--
-- Name: paid_parking_allowed_availability paid_parking_allowed_availability_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paid_parking_allowed_availability
    ADD CONSTRAINT paid_parking_allowed_availability_pkey PRIMARY KEY (id);


--
-- Name: parking_spaces parking_spaces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parking_spaces
    ADD CONSTRAINT parking_spaces_pkey PRIMARY KEY (id);


--
-- Name: points_transaction points_transaction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points_transaction
    ADD CONSTRAINT points_transaction_pkey PRIMARY KEY (transaction_id);


--
-- Name: ratings ratings_parking_space_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_parking_space_id_user_id_key UNIQUE (parking_space_id, user_id);


--
-- Name: ratings ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_pkey PRIMARY KEY (id);


--
-- Name: renter_ratings renter_ratings_renter_id_rater_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.renter_ratings
    ADD CONSTRAINT renter_ratings_renter_id_rater_id_key UNIQUE (renter_id, rater_id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: reservations reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_pkey PRIMARY KEY (id);


--
-- Name: timetable_coalesce timetable_coalesce_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_coalesce
    ADD CONSTRAINT timetable_coalesce_pkey PRIMARY KEY (id);


--
-- Name: cars unique_license_plate; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cars
    ADD CONSTRAINT unique_license_plate UNIQUE (license_plate, license_plate_state);


--
-- Name: user_delete_requests user_delete_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_delete_requests
    ADD CONSTRAINT user_delete_requests_pkey PRIMARY KEY (id);


--
-- Name: user_delete_requests user_delete_requests_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_delete_requests
    ADD CONSTRAINT user_delete_requests_token_key UNIQUE (token);


--
-- Name: user_pw_reset_requests user_pw_reset_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_pw_reset_requests
    ADD CONSTRAINT user_pw_reset_requests_pkey PRIMARY KEY (id);


--
-- Name: user_pw_reset_requests user_pw_reset_requests_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_pw_reset_requests
    ADD CONSTRAINT user_pw_reset_requests_token_key UNIQUE (token);


--
-- Name: user_tokens user_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_tokens
    ADD CONSTRAINT user_tokens_pkey PRIMARY KEY (id);


--
-- Name: user_tokens user_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_tokens
    ADD CONSTRAINT user_tokens_token_key UNIQUE (token);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_ratings_availability_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ratings_availability_rating ON public.ratings USING btree (availability_rating);


--
-- Name: idx_ratings_cleanliness_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ratings_cleanliness_rating ON public.ratings USING btree (cleanliness_rating);


--
-- Name: idx_ratings_parking_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ratings_parking_space_id ON public.ratings USING btree (parking_space_id);


--
-- Name: idx_ratings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ratings_user_id ON public.ratings USING btree (user_id);


--
-- Name: ratings trg_update_parking_space_ratings; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_parking_space_ratings AFTER INSERT OR DELETE OR UPDATE ON public.ratings FOR EACH ROW EXECUTE FUNCTION public.update_parking_space_ratings();


--
-- Name: renter_ratings trg_update_renter_ratings; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_renter_ratings AFTER INSERT OR DELETE OR UPDATE ON public.renter_ratings FOR EACH ROW EXECUTE FUNCTION public.update_renter_ratings();


--
-- Name: bookmarked_spots bookmarked_spots_parking_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookmarked_spots
    ADD CONSTRAINT bookmarked_spots_parking_space_id_fkey FOREIGN KEY (parking_space_id) REFERENCES public.parking_spaces(id) ON DELETE CASCADE;


--
-- Name: bookmarked_spots bookmarked_spots_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookmarked_spots
    ADD CONSTRAINT bookmarked_spots_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: cars cars_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cars
    ADD CONSTRAINT cars_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: paid_parking_allowed_availability paid_parking_allowed_availability_parking_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paid_parking_allowed_availability
    ADD CONSTRAINT paid_parking_allowed_availability_parking_space_id_fkey FOREIGN KEY (parking_space_id) REFERENCES public.parking_spaces(id) ON DELETE CASCADE;


--
-- Name: parking_spaces parking_spaces_owner_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parking_spaces
    ADD CONSTRAINT parking_spaces_owner_fkey FOREIGN KEY (owner) REFERENCES public.users(id);


--
-- Name: points_transaction points_transaction_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points_transaction
    ADD CONSTRAINT points_transaction_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: ratings ratings_parking_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_parking_space_id_fkey FOREIGN KEY (parking_space_id) REFERENCES public.parking_spaces(id) ON DELETE CASCADE;


--
-- Name: ratings ratings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: renter_ratings renter_ratings_rater_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.renter_ratings
    ADD CONSTRAINT renter_ratings_rater_id_fkey FOREIGN KEY (rater_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: renter_ratings renter_ratings_renter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.renter_ratings
    ADD CONSTRAINT renter_ratings_renter_id_fkey FOREIGN KEY (renter_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reports reports_reservation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.reservations(id) ON DELETE CASCADE;


--
-- Name: reports reports_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reservations reservations_car_info_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_car_info_id_fkey FOREIGN KEY (car_info_id) REFERENCES public.cars(id) ON DELETE CASCADE;


--
-- Name: reservations reservations_parking_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_parking_space_id_fkey FOREIGN KEY (parking_space_id) REFERENCES public.parking_spaces(id) ON DELETE CASCADE;


--
-- Name: reservations reservations_renter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_renter_id_fkey FOREIGN KEY (renter_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: timetable_coalesce timetable_coalesce_parking_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_coalesce
    ADD CONSTRAINT timetable_coalesce_parking_space_id_fkey FOREIGN KEY (parking_space_id) REFERENCES public.parking_spaces(id) ON DELETE CASCADE;


--
-- Name: user_delete_requests user_delete_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_delete_requests
    ADD CONSTRAINT user_delete_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_pw_reset_requests user_pw_reset_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_pw_reset_requests
    ADD CONSTRAINT user_pw_reset_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_tokens user_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_tokens
    ADD CONSTRAINT user_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

