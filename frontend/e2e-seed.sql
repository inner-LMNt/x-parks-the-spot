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
\.


--
-- Data for Name: parking_spaces; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.parking_spaces (id, owner, location, is_paid, name, availability_schedule, photos, verification_status, cancellation_policy, created_at, updated_at, address, price, is_taken, photo_timestamp, verification_photos, avg_availability_rating, avg_cleanliness_rating, avg_total_rating, ratings_count_availability, ratings_count_cleanliness) FROM stdin;
8b55c5a3-9084-4999-ab0f-89cb6aeadaac	4e43aa54-5313-4f02-985f-efe54b48adc7	0101000020E6100000929C024F90BA55C014B35E0CE5364440	f	Spot Logged at 08:13 PM, November 11 2024	[]	{/static/images/689a8c22-32b5-4427-8ca3-b1b7f5f8ef5a.jpg}	unverified	\N	2024-11-12 01:13:26.24738+00	2024-11-12 01:13:26.24738+00		0	f	2024-11-12 01:13:26.24738+00	\N	\N	\N	\N	0	0
5e3ef6e8-4d42-4112-a2e4-1452efe56163	4e43aa54-5313-4f02-985f-efe54b48adc7	0101000020E6100000A3CFA2D2E3BA55C0D2F01C80C3364440	t	Spot 1	[{"end_time": "23:59", "start_time": "00:00", "day_of_week": "Monday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Tuesday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Wednesday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Thursday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Friday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Saturday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Sunday"}]	{/static/images/2366253f-7951-4c3a-90b6-2a321fbf1681.jpg}	pending	\N	2024-11-16 19:33:23.414418+00	2024-11-18 06:30:31.125651+00	Winifred Parker Residence Hall, 3rd Street, West Lafayette, IN, USA	1	f	2024-11-16 19:33:23.414418+00	{/static/images/a06e4f28-b1ae-48b0-8b0a-0011cb3eb499.jpg}	5.00	5.00	5.00	1	1
96a998d9-41fc-41b8-bc73-a08e312de595	4e43aa54-5313-4f02-985f-efe54b48adc7	0101000020E6100000DC93D112F5BA55C0B89965AABB364440	t	Spot 2	[{"end_time": "23:59", "start_time": "00:00", "day_of_week": "Monday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Tuesday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Wednesday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Thursday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Friday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Saturday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Sunday"}]	{/static/images/719c267b-eaaf-4081-a467-fdc5472a818c.jpg}	unverified	\N	2024-11-18 06:15:53.603163+00	2024-11-18 06:15:53.603163+00	Krach Leadership Center, 3rd Street, West Lafayette, IN, USA	1.5	f	2024-11-18 06:15:53.603163+00	\N	5.00	2.00	3.50	1	1
5ff0b211-1dec-4b07-9296-5527575cbae9	4e43aa54-5313-4f02-985f-efe54b48adc7	0101000020E6100000F8C0334690BA55C05BA7DB23E5364440	f	Spot Logged at 08:19 PM, November 11 2024	[]	{/static/images/473e9466-d779-41eb-b492-9c92a7e702e0.jpg}	unverified	\N	2024-11-12 01:19:23.76888+00	2024-11-12 01:19:23.76888+00		0	t	2024-11-12 01:19:23.76888+00	\N	\N	\N	\N	0	0
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
\.


--
-- Data for Name: user_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_tokens (id, user_id, token, expiry) FROM stdin;
4	c7264d82-6b1e-4b08-8a1e-e39af9ab6dc8	xpark_k-3HEuSW6SLhRZghYfaJBly_ts1j3KOrwJeBOOnQiSo	2024-12-15 07:35:10.590088
5	c7264d82-6b1e-4b08-8a1e-e39af9ab6dc8	xpark_pd3CY4sEhYc8O0bfUO_taEqO2Fq7qCTjHxXDxxaSbFI	2024-12-15 07:35:41.895123
2	4e43aa54-5313-4f02-985f-efe54b48adc7	xpark_6pqmFseOhnKOXdO6DC9TeMk6MjBqFkY6j2oGHUP2oBg	2024-12-21 07:12:02.426854
6	c7264d82-6b1e-4b08-8a1e-e39af9ab6dc8	xpark_3o8JtNjXuitrPaE5_z1023KL14jyII_bJcIfXhE4wgU	2024-12-15 07:36:37.733645
3	c7264d82-6b1e-4b08-8a1e-e39af9ab6dc8	xpark_A-wQnhSpq5WHfaDpSefBERFZpcKhe8bGB-MNnz77yio	2024-12-15 07:22:20.357944
8	4e43aa54-5313-4f02-985f-efe54b48adc7	xpark_OTZRGJPqyhL2qjNXUTSTWDNnJuu98xRwtk-aiTGHM-c	2024-12-21 20:02:57.880362
1	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_mkTEMD9Ty3SwJVbZXMJjkUttNVYD99YbEmZO5Fcs2QI	2024-12-21 20:04:57.586484
7	c7264d82-6b1e-4b08-8a1e-e39af9ab6dc8	xpark_MY3nFK5G64RdrJ8pm93rPJ8yFiTEFX8yuXH1ugVtyLg	2024-12-21 18:58:11.918195
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, name, email, password_hash, deleted_at, user_preferences, points, state_city, badges, is_banned, responsiveness_score) FROM stdin;
c7264d82-6b1e-4b08-8a1e-e39af9ab6dc8	Test User 3	xparkusr3@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$oQSDbrq8mhhngCV7lrRE1w$Q9itTkHavAWO9ThytLxhOZvO2abbnO3UugIGRe1VDWw	\N	{"notification_time": "30"}	{"total": 10000000, "current": 10000000}	{"city": "None", "state": "None"}	{}	f	5
3ceafe32-5706-4fef-aa09-80f1c29ae821	Test User 1	xparkusr1@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$0dW+FhsE7MupkHOC3LdlXw$1DNkodmxy+9zIA2SEoyL5erxx8ZbCadz8PttUuQKdD4	\N	{"notification_time": "30"}	{"total": 10000000, "current": 9967250}	{"city": "Miami", "state": "FL"}	{1,2,3}	f	5
4e43aa54-5313-4f02-985f-efe54b48adc7	Test User 2	xparkusr2@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$uGSH164Fa1UdHx6FquEc5g$SS62djQOI4yC7OqnosUuB9a3tpmDqd/y1XbTfstBA8Y	\N	{"notification_time": "30"}	{"total": 10000000, "current": 9999250}	{"city": "None", "state": "None"}	{}	f	5
\.


--
-- Name: bookmarked_spots_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bookmarked_spots_id_seq', 6, true);


--
-- Name: paid_parking_allowed_availability_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.paid_parking_allowed_availability_id_seq', 4004, true);


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

SELECT pg_catalog.setval('public.timetable_coalesce_id_seq', 22, true);


--
-- Name: user_delete_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_delete_requests_id_seq', 1, false);


--
-- Name: user_pw_reset_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_pw_reset_requests_id_seq', 1, false);


--
-- Name: user_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_tokens_id_seq', 8, true);


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

