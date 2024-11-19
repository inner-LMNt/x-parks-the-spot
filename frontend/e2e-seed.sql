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


SET default_tablespace = '';

SET default_table_access_method = heap;

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
    user_preferences jsonb DEFAULT '{"notification_time": "30"}'::jsonb
);


--
-- Name: paid_parking_allowed_availability id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paid_parking_allowed_availability ALTER COLUMN id SET DEFAULT nextval('public.paid_parking_allowed_availability_id_seq'::regclass);


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
\.


--
-- Data for Name: paid_parking_allowed_availability; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.paid_parking_allowed_availability (id, parking_space_id, "time") FROM stdin;
1	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-11-04 04:59:00+00","2024-11-05 05:00:00+00"]
2	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-11-11 04:59:00+00","2024-11-12 05:00:00+00"]
3	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-11-18 04:59:00+00","2024-11-19 05:00:00+00"]
4	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-11-25 04:59:00+00","2024-11-26 05:00:00+00"]
5	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-12-02 04:59:00+00","2024-12-03 05:00:00+00"]
6	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-12-09 04:59:00+00","2024-12-10 05:00:00+00"]
7	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-12-16 04:59:00+00","2024-12-17 05:00:00+00"]
8	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-12-23 04:59:00+00","2024-12-24 05:00:00+00"]
9	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-12-30 04:59:00+00","2024-12-31 05:00:00+00"]
10	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-01-06 04:59:00+00","2025-01-07 05:00:00+00"]
11	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-01-13 04:59:00+00","2025-01-14 05:00:00+00"]
12	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-01-20 04:59:00+00","2025-01-21 05:00:00+00"]
13	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-01-27 04:59:00+00","2025-01-28 05:00:00+00"]
14	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-02-03 04:59:00+00","2025-02-04 05:00:00+00"]
15	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-02-10 04:59:00+00","2025-02-11 05:00:00+00"]
16	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-02-17 04:59:00+00","2025-02-18 05:00:00+00"]
17	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-02-24 04:59:00+00","2025-02-25 05:00:00+00"]
18	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-03-03 04:59:00+00","2025-03-04 05:00:00+00"]
19	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-03-10 03:59:00+00","2025-03-11 04:00:00+00"]
20	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-03-17 03:59:00+00","2025-03-18 04:00:00+00"]
21	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-03-24 03:59:00+00","2025-03-25 04:00:00+00"]
22	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-03-31 03:59:00+00","2025-04-01 04:00:00+00"]
23	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-04-07 03:59:00+00","2025-04-08 04:00:00+00"]
24	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-04-14 03:59:00+00","2025-04-15 04:00:00+00"]
25	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-04-21 03:59:00+00","2025-04-22 04:00:00+00"]
26	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-04-28 03:59:00+00","2025-04-29 04:00:00+00"]
27	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-05-05 03:59:00+00","2025-05-06 04:00:00+00"]
28	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-05-12 03:59:00+00","2025-05-13 04:00:00+00"]
29	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-05-19 03:59:00+00","2025-05-20 04:00:00+00"]
30	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-05-26 03:59:00+00","2025-05-27 04:00:00+00"]
31	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-06-02 03:59:00+00","2025-06-03 04:00:00+00"]
32	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-06-09 03:59:00+00","2025-06-10 04:00:00+00"]
33	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-06-16 03:59:00+00","2025-06-17 04:00:00+00"]
34	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-06-23 03:59:00+00","2025-06-24 04:00:00+00"]
35	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-06-30 03:59:00+00","2025-07-01 04:00:00+00"]
36	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-07-07 03:59:00+00","2025-07-08 04:00:00+00"]
37	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-07-14 03:59:00+00","2025-07-15 04:00:00+00"]
38	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-07-21 03:59:00+00","2025-07-22 04:00:00+00"]
39	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-07-28 03:59:00+00","2025-07-29 04:00:00+00"]
40	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-08-04 03:59:00+00","2025-08-05 04:00:00+00"]
41	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-08-11 03:59:00+00","2025-08-12 04:00:00+00"]
42	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-08-18 03:59:00+00","2025-08-19 04:00:00+00"]
43	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-08-25 03:59:00+00","2025-08-26 04:00:00+00"]
44	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-09-01 03:59:00+00","2025-09-02 04:00:00+00"]
45	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-09-08 03:59:00+00","2025-09-09 04:00:00+00"]
46	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-09-15 03:59:00+00","2025-09-16 04:00:00+00"]
47	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-09-22 03:59:00+00","2025-09-23 04:00:00+00"]
48	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-09-29 03:59:00+00","2025-09-30 04:00:00+00"]
49	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-10-06 03:59:00+00","2025-10-07 04:00:00+00"]
50	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-10-13 03:59:00+00","2025-10-14 04:00:00+00"]
51	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-10-20 03:59:00+00","2025-10-21 04:00:00+00"]
52	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-10-27 03:59:00+00","2025-10-28 04:00:00+00"]
53	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-11-05 04:59:00+00","2024-11-06 05:00:00+00"]
54	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-11-12 04:59:00+00","2024-11-13 05:00:00+00"]
55	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-11-19 04:59:00+00","2024-11-20 05:00:00+00"]
56	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-11-26 04:59:00+00","2024-11-27 05:00:00+00"]
57	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-12-03 04:59:00+00","2024-12-04 05:00:00+00"]
58	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-12-10 04:59:00+00","2024-12-11 05:00:00+00"]
59	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-12-17 04:59:00+00","2024-12-18 05:00:00+00"]
60	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-12-24 04:59:00+00","2024-12-25 05:00:00+00"]
61	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-12-31 04:59:00+00","2025-01-01 05:00:00+00"]
62	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-01-07 04:59:00+00","2025-01-08 05:00:00+00"]
63	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-01-14 04:59:00+00","2025-01-15 05:00:00+00"]
64	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-01-21 04:59:00+00","2025-01-22 05:00:00+00"]
65	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-01-28 04:59:00+00","2025-01-29 05:00:00+00"]
66	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-02-04 04:59:00+00","2025-02-05 05:00:00+00"]
67	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-02-11 04:59:00+00","2025-02-12 05:00:00+00"]
68	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-02-18 04:59:00+00","2025-02-19 05:00:00+00"]
69	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-02-25 04:59:00+00","2025-02-26 05:00:00+00"]
70	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-03-04 04:59:00+00","2025-03-05 05:00:00+00"]
71	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-03-11 03:59:00+00","2025-03-12 04:00:00+00"]
72	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-03-18 03:59:00+00","2025-03-19 04:00:00+00"]
73	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-03-25 03:59:00+00","2025-03-26 04:00:00+00"]
74	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-04-01 03:59:00+00","2025-04-02 04:00:00+00"]
75	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-04-08 03:59:00+00","2025-04-09 04:00:00+00"]
76	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-04-15 03:59:00+00","2025-04-16 04:00:00+00"]
77	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-04-22 03:59:00+00","2025-04-23 04:00:00+00"]
78	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-04-29 03:59:00+00","2025-04-30 04:00:00+00"]
79	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-05-06 03:59:00+00","2025-05-07 04:00:00+00"]
80	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-05-13 03:59:00+00","2025-05-14 04:00:00+00"]
81	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-05-20 03:59:00+00","2025-05-21 04:00:00+00"]
82	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-05-27 03:59:00+00","2025-05-28 04:00:00+00"]
83	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-06-03 03:59:00+00","2025-06-04 04:00:00+00"]
84	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-06-10 03:59:00+00","2025-06-11 04:00:00+00"]
85	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-06-17 03:59:00+00","2025-06-18 04:00:00+00"]
86	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-06-24 03:59:00+00","2025-06-25 04:00:00+00"]
87	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-07-01 03:59:00+00","2025-07-02 04:00:00+00"]
88	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-07-08 03:59:00+00","2025-07-09 04:00:00+00"]
89	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-07-15 03:59:00+00","2025-07-16 04:00:00+00"]
90	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-07-22 03:59:00+00","2025-07-23 04:00:00+00"]
91	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-07-29 03:59:00+00","2025-07-30 04:00:00+00"]
92	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-08-05 03:59:00+00","2025-08-06 04:00:00+00"]
93	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-08-12 03:59:00+00","2025-08-13 04:00:00+00"]
94	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-08-19 03:59:00+00","2025-08-20 04:00:00+00"]
95	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-08-26 03:59:00+00","2025-08-27 04:00:00+00"]
96	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-09-02 03:59:00+00","2025-09-03 04:00:00+00"]
97	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-09-09 03:59:00+00","2025-09-10 04:00:00+00"]
98	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-09-16 03:59:00+00","2025-09-17 04:00:00+00"]
99	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-09-23 03:59:00+00","2025-09-24 04:00:00+00"]
100	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-09-30 03:59:00+00","2025-10-01 04:00:00+00"]
101	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-10-07 03:59:00+00","2025-10-08 04:00:00+00"]
102	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-10-14 03:59:00+00","2025-10-15 04:00:00+00"]
103	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-10-21 03:59:00+00","2025-10-22 04:00:00+00"]
104	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-10-28 03:59:00+00","2025-10-29 04:00:00+00"]
105	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-11-06 04:59:00+00","2024-11-07 05:00:00+00"]
106	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-11-13 04:59:00+00","2024-11-14 05:00:00+00"]
107	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-11-20 04:59:00+00","2024-11-21 05:00:00+00"]
108	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-11-27 04:59:00+00","2024-11-28 05:00:00+00"]
109	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-12-04 04:59:00+00","2024-12-05 05:00:00+00"]
110	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-12-11 04:59:00+00","2024-12-12 05:00:00+00"]
111	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-12-18 04:59:00+00","2024-12-19 05:00:00+00"]
112	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-12-25 04:59:00+00","2024-12-26 05:00:00+00"]
113	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-01-01 04:59:00+00","2025-01-02 05:00:00+00"]
114	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-01-08 04:59:00+00","2025-01-09 05:00:00+00"]
115	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-01-15 04:59:00+00","2025-01-16 05:00:00+00"]
116	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-01-22 04:59:00+00","2025-01-23 05:00:00+00"]
117	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-01-29 04:59:00+00","2025-01-30 05:00:00+00"]
118	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-02-05 04:59:00+00","2025-02-06 05:00:00+00"]
119	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-02-12 04:59:00+00","2025-02-13 05:00:00+00"]
120	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-02-19 04:59:00+00","2025-02-20 05:00:00+00"]
121	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-02-26 04:59:00+00","2025-02-27 05:00:00+00"]
122	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-03-05 04:59:00+00","2025-03-06 05:00:00+00"]
123	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-03-12 03:59:00+00","2025-03-13 04:00:00+00"]
124	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-03-19 03:59:00+00","2025-03-20 04:00:00+00"]
125	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-03-26 03:59:00+00","2025-03-27 04:00:00+00"]
126	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-04-02 03:59:00+00","2025-04-03 04:00:00+00"]
127	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-04-09 03:59:00+00","2025-04-10 04:00:00+00"]
128	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-04-16 03:59:00+00","2025-04-17 04:00:00+00"]
129	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-04-23 03:59:00+00","2025-04-24 04:00:00+00"]
130	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-04-30 03:59:00+00","2025-05-01 04:00:00+00"]
131	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-05-07 03:59:00+00","2025-05-08 04:00:00+00"]
132	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-05-14 03:59:00+00","2025-05-15 04:00:00+00"]
133	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-05-21 03:59:00+00","2025-05-22 04:00:00+00"]
134	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-05-28 03:59:00+00","2025-05-29 04:00:00+00"]
135	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-06-04 03:59:00+00","2025-06-05 04:00:00+00"]
136	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-06-11 03:59:00+00","2025-06-12 04:00:00+00"]
137	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-06-18 03:59:00+00","2025-06-19 04:00:00+00"]
138	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-06-25 03:59:00+00","2025-06-26 04:00:00+00"]
139	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-07-02 03:59:00+00","2025-07-03 04:00:00+00"]
140	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-07-09 03:59:00+00","2025-07-10 04:00:00+00"]
141	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-07-16 03:59:00+00","2025-07-17 04:00:00+00"]
142	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-07-23 03:59:00+00","2025-07-24 04:00:00+00"]
143	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-07-30 03:59:00+00","2025-07-31 04:00:00+00"]
144	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-08-06 03:59:00+00","2025-08-07 04:00:00+00"]
145	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-08-13 03:59:00+00","2025-08-14 04:00:00+00"]
146	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-08-20 03:59:00+00","2025-08-21 04:00:00+00"]
147	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-08-27 03:59:00+00","2025-08-28 04:00:00+00"]
148	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-09-03 03:59:00+00","2025-09-04 04:00:00+00"]
149	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-09-10 03:59:00+00","2025-09-11 04:00:00+00"]
150	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-09-17 03:59:00+00","2025-09-18 04:00:00+00"]
151	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-09-24 03:59:00+00","2025-09-25 04:00:00+00"]
152	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-10-01 03:59:00+00","2025-10-02 04:00:00+00"]
153	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-10-08 03:59:00+00","2025-10-09 04:00:00+00"]
154	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-10-15 03:59:00+00","2025-10-16 04:00:00+00"]
155	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-10-22 03:59:00+00","2025-10-23 04:00:00+00"]
156	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-10-29 03:59:00+00","2025-10-30 04:00:00+00"]
157	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-11-07 04:59:00+00","2024-11-08 05:00:00+00"]
158	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-11-14 04:59:00+00","2024-11-15 05:00:00+00"]
159	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-11-21 04:59:00+00","2024-11-22 05:00:00+00"]
160	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-11-28 04:59:00+00","2024-11-29 05:00:00+00"]
161	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-12-05 04:59:00+00","2024-12-06 05:00:00+00"]
162	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-12-12 04:59:00+00","2024-12-13 05:00:00+00"]
163	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-12-19 04:59:00+00","2024-12-20 05:00:00+00"]
164	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-12-26 04:59:00+00","2024-12-27 05:00:00+00"]
165	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-01-02 04:59:00+00","2025-01-03 05:00:00+00"]
166	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-01-09 04:59:00+00","2025-01-10 05:00:00+00"]
167	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-01-16 04:59:00+00","2025-01-17 05:00:00+00"]
168	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-01-23 04:59:00+00","2025-01-24 05:00:00+00"]
169	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-01-30 04:59:00+00","2025-01-31 05:00:00+00"]
170	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-02-06 04:59:00+00","2025-02-07 05:00:00+00"]
171	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-02-13 04:59:00+00","2025-02-14 05:00:00+00"]
172	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-02-20 04:59:00+00","2025-02-21 05:00:00+00"]
173	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-02-27 04:59:00+00","2025-02-28 05:00:00+00"]
174	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-03-06 04:59:00+00","2025-03-07 05:00:00+00"]
175	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-03-13 03:59:00+00","2025-03-14 04:00:00+00"]
176	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-03-20 03:59:00+00","2025-03-21 04:00:00+00"]
177	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-03-27 03:59:00+00","2025-03-28 04:00:00+00"]
178	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-04-03 03:59:00+00","2025-04-04 04:00:00+00"]
179	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-04-10 03:59:00+00","2025-04-11 04:00:00+00"]
180	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-04-17 03:59:00+00","2025-04-18 04:00:00+00"]
181	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-04-24 03:59:00+00","2025-04-25 04:00:00+00"]
182	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-05-01 03:59:00+00","2025-05-02 04:00:00+00"]
183	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-05-08 03:59:00+00","2025-05-09 04:00:00+00"]
184	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-05-15 03:59:00+00","2025-05-16 04:00:00+00"]
185	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-05-22 03:59:00+00","2025-05-23 04:00:00+00"]
186	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-05-29 03:59:00+00","2025-05-30 04:00:00+00"]
187	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-06-05 03:59:00+00","2025-06-06 04:00:00+00"]
188	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-06-12 03:59:00+00","2025-06-13 04:00:00+00"]
189	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-06-19 03:59:00+00","2025-06-20 04:00:00+00"]
190	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-06-26 03:59:00+00","2025-06-27 04:00:00+00"]
191	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-07-03 03:59:00+00","2025-07-04 04:00:00+00"]
192	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-07-10 03:59:00+00","2025-07-11 04:00:00+00"]
193	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-07-17 03:59:00+00","2025-07-18 04:00:00+00"]
194	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-07-24 03:59:00+00","2025-07-25 04:00:00+00"]
195	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-07-31 03:59:00+00","2025-08-01 04:00:00+00"]
196	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-08-07 03:59:00+00","2025-08-08 04:00:00+00"]
197	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-08-14 03:59:00+00","2025-08-15 04:00:00+00"]
198	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-08-21 03:59:00+00","2025-08-22 04:00:00+00"]
199	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-08-28 03:59:00+00","2025-08-29 04:00:00+00"]
200	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-09-04 03:59:00+00","2025-09-05 04:00:00+00"]
201	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-09-11 03:59:00+00","2025-09-12 04:00:00+00"]
202	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-09-18 03:59:00+00","2025-09-19 04:00:00+00"]
203	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-09-25 03:59:00+00","2025-09-26 04:00:00+00"]
204	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-10-02 03:59:00+00","2025-10-03 04:00:00+00"]
205	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-10-09 03:59:00+00","2025-10-10 04:00:00+00"]
206	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-10-16 03:59:00+00","2025-10-17 04:00:00+00"]
207	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-10-23 03:59:00+00","2025-10-24 04:00:00+00"]
208	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-10-30 03:59:00+00","2025-10-31 04:00:00+00"]
209	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-11-08 04:59:00+00","2024-11-09 05:00:00+00"]
210	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-11-15 04:59:00+00","2024-11-16 05:00:00+00"]
211	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-11-22 04:59:00+00","2024-11-23 05:00:00+00"]
212	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-11-29 04:59:00+00","2024-11-30 05:00:00+00"]
213	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-12-06 04:59:00+00","2024-12-07 05:00:00+00"]
214	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-12-13 04:59:00+00","2024-12-14 05:00:00+00"]
215	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-12-20 04:59:00+00","2024-12-21 05:00:00+00"]
216	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-12-27 04:59:00+00","2024-12-28 05:00:00+00"]
217	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-01-03 04:59:00+00","2025-01-04 05:00:00+00"]
218	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-01-10 04:59:00+00","2025-01-11 05:00:00+00"]
219	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-01-17 04:59:00+00","2025-01-18 05:00:00+00"]
220	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-01-24 04:59:00+00","2025-01-25 05:00:00+00"]
221	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-01-31 04:59:00+00","2025-02-01 05:00:00+00"]
222	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-02-07 04:59:00+00","2025-02-08 05:00:00+00"]
223	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-02-14 04:59:00+00","2025-02-15 05:00:00+00"]
224	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-02-21 04:59:00+00","2025-02-22 05:00:00+00"]
225	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-02-28 04:59:00+00","2025-03-01 05:00:00+00"]
226	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-03-07 04:59:00+00","2025-03-08 05:00:00+00"]
227	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-03-14 03:59:00+00","2025-03-15 04:00:00+00"]
228	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-03-21 03:59:00+00","2025-03-22 04:00:00+00"]
229	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-03-28 03:59:00+00","2025-03-29 04:00:00+00"]
230	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-04-04 03:59:00+00","2025-04-05 04:00:00+00"]
231	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-04-11 03:59:00+00","2025-04-12 04:00:00+00"]
232	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-04-18 03:59:00+00","2025-04-19 04:00:00+00"]
233	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-04-25 03:59:00+00","2025-04-26 04:00:00+00"]
234	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-05-02 03:59:00+00","2025-05-03 04:00:00+00"]
235	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-05-09 03:59:00+00","2025-05-10 04:00:00+00"]
236	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-05-16 03:59:00+00","2025-05-17 04:00:00+00"]
237	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-05-23 03:59:00+00","2025-05-24 04:00:00+00"]
238	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-05-30 03:59:00+00","2025-05-31 04:00:00+00"]
239	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-06-06 03:59:00+00","2025-06-07 04:00:00+00"]
240	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-06-13 03:59:00+00","2025-06-14 04:00:00+00"]
241	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-06-20 03:59:00+00","2025-06-21 04:00:00+00"]
242	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-06-27 03:59:00+00","2025-06-28 04:00:00+00"]
243	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-07-04 03:59:00+00","2025-07-05 04:00:00+00"]
244	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-07-11 03:59:00+00","2025-07-12 04:00:00+00"]
245	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-07-18 03:59:00+00","2025-07-19 04:00:00+00"]
246	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-07-25 03:59:00+00","2025-07-26 04:00:00+00"]
247	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-08-01 03:59:00+00","2025-08-02 04:00:00+00"]
248	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-08-08 03:59:00+00","2025-08-09 04:00:00+00"]
249	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-08-15 03:59:00+00","2025-08-16 04:00:00+00"]
250	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-08-22 03:59:00+00","2025-08-23 04:00:00+00"]
251	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-08-29 03:59:00+00","2025-08-30 04:00:00+00"]
252	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-09-05 03:59:00+00","2025-09-06 04:00:00+00"]
253	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-09-12 03:59:00+00","2025-09-13 04:00:00+00"]
254	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-09-19 03:59:00+00","2025-09-20 04:00:00+00"]
255	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-09-26 03:59:00+00","2025-09-27 04:00:00+00"]
256	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-10-03 03:59:00+00","2025-10-04 04:00:00+00"]
257	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-10-10 03:59:00+00","2025-10-11 04:00:00+00"]
258	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-10-17 03:59:00+00","2025-10-18 04:00:00+00"]
259	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-10-24 03:59:00+00","2025-10-25 04:00:00+00"]
260	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-10-31 03:59:00+00","2025-11-01 04:00:00+00"]
261	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-11-09 04:59:00+00","2024-11-10 05:00:00+00"]
262	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-11-16 04:59:00+00","2024-11-17 05:00:00+00"]
263	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-11-23 04:59:00+00","2024-11-24 05:00:00+00"]
264	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-11-30 04:59:00+00","2024-12-01 05:00:00+00"]
265	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-12-07 04:59:00+00","2024-12-08 05:00:00+00"]
266	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-12-14 04:59:00+00","2024-12-15 05:00:00+00"]
267	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-12-21 04:59:00+00","2024-12-22 05:00:00+00"]
268	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-12-28 04:59:00+00","2024-12-29 05:00:00+00"]
269	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-01-04 04:59:00+00","2025-01-05 05:00:00+00"]
270	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-01-11 04:59:00+00","2025-01-12 05:00:00+00"]
271	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-01-18 04:59:00+00","2025-01-19 05:00:00+00"]
272	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-01-25 04:59:00+00","2025-01-26 05:00:00+00"]
273	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-02-01 04:59:00+00","2025-02-02 05:00:00+00"]
274	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-02-08 04:59:00+00","2025-02-09 05:00:00+00"]
275	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-02-15 04:59:00+00","2025-02-16 05:00:00+00"]
276	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-02-22 04:59:00+00","2025-02-23 05:00:00+00"]
277	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-03-01 04:59:00+00","2025-03-02 05:00:00+00"]
278	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-03-08 04:59:00+00","2025-03-09 05:00:00+00"]
279	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-03-15 03:59:00+00","2025-03-16 04:00:00+00"]
280	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-03-22 03:59:00+00","2025-03-23 04:00:00+00"]
281	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-03-29 03:59:00+00","2025-03-30 04:00:00+00"]
282	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-04-05 03:59:00+00","2025-04-06 04:00:00+00"]
283	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-04-12 03:59:00+00","2025-04-13 04:00:00+00"]
284	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-04-19 03:59:00+00","2025-04-20 04:00:00+00"]
285	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-04-26 03:59:00+00","2025-04-27 04:00:00+00"]
286	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-05-03 03:59:00+00","2025-05-04 04:00:00+00"]
287	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-05-10 03:59:00+00","2025-05-11 04:00:00+00"]
288	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-05-17 03:59:00+00","2025-05-18 04:00:00+00"]
289	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-05-24 03:59:00+00","2025-05-25 04:00:00+00"]
290	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-05-31 03:59:00+00","2025-06-01 04:00:00+00"]
291	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-06-07 03:59:00+00","2025-06-08 04:00:00+00"]
292	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-06-14 03:59:00+00","2025-06-15 04:00:00+00"]
293	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-06-21 03:59:00+00","2025-06-22 04:00:00+00"]
294	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-06-28 03:59:00+00","2025-06-29 04:00:00+00"]
295	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-07-05 03:59:00+00","2025-07-06 04:00:00+00"]
296	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-07-12 03:59:00+00","2025-07-13 04:00:00+00"]
297	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-07-19 03:59:00+00","2025-07-20 04:00:00+00"]
298	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-07-26 03:59:00+00","2025-07-27 04:00:00+00"]
299	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-08-02 03:59:00+00","2025-08-03 04:00:00+00"]
300	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-08-09 03:59:00+00","2025-08-10 04:00:00+00"]
301	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-08-16 03:59:00+00","2025-08-17 04:00:00+00"]
302	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-08-23 03:59:00+00","2025-08-24 04:00:00+00"]
303	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-08-30 03:59:00+00","2025-08-31 04:00:00+00"]
304	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-09-06 03:59:00+00","2025-09-07 04:00:00+00"]
305	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-09-13 03:59:00+00","2025-09-14 04:00:00+00"]
306	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-09-20 03:59:00+00","2025-09-21 04:00:00+00"]
307	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-09-27 03:59:00+00","2025-09-28 04:00:00+00"]
308	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-10-04 03:59:00+00","2025-10-05 04:00:00+00"]
309	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-10-11 03:59:00+00","2025-10-12 04:00:00+00"]
310	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-10-18 03:59:00+00","2025-10-19 04:00:00+00"]
311	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-10-25 03:59:00+00","2025-10-26 04:00:00+00"]
312	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-11-01 03:59:00+00","2025-11-02 04:00:00+00"]
313	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-11-10 04:59:00+00","2024-11-11 05:00:00+00"]
314	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-11-17 04:59:00+00","2024-11-18 05:00:00+00"]
315	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-11-24 04:59:00+00","2024-11-25 05:00:00+00"]
316	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-12-01 04:59:00+00","2024-12-02 05:00:00+00"]
317	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-12-08 04:59:00+00","2024-12-09 05:00:00+00"]
318	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-12-15 04:59:00+00","2024-12-16 05:00:00+00"]
319	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-12-22 04:59:00+00","2024-12-23 05:00:00+00"]
320	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-12-29 04:59:00+00","2024-12-30 05:00:00+00"]
321	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-01-05 04:59:00+00","2025-01-06 05:00:00+00"]
322	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-01-12 04:59:00+00","2025-01-13 05:00:00+00"]
323	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-01-19 04:59:00+00","2025-01-20 05:00:00+00"]
324	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-01-26 04:59:00+00","2025-01-27 05:00:00+00"]
325	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-02-02 04:59:00+00","2025-02-03 05:00:00+00"]
326	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-02-09 04:59:00+00","2025-02-10 05:00:00+00"]
327	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-02-16 04:59:00+00","2025-02-17 05:00:00+00"]
328	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-02-23 04:59:00+00","2025-02-24 05:00:00+00"]
329	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-03-02 04:59:00+00","2025-03-03 05:00:00+00"]
330	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-03-09 04:59:00+00","2025-03-10 04:00:00+00"]
331	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-03-16 03:59:00+00","2025-03-17 04:00:00+00"]
332	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-03-23 03:59:00+00","2025-03-24 04:00:00+00"]
333	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-03-30 03:59:00+00","2025-03-31 04:00:00+00"]
334	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-04-06 03:59:00+00","2025-04-07 04:00:00+00"]
335	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-04-13 03:59:00+00","2025-04-14 04:00:00+00"]
336	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-04-20 03:59:00+00","2025-04-21 04:00:00+00"]
337	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-04-27 03:59:00+00","2025-04-28 04:00:00+00"]
338	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-05-04 03:59:00+00","2025-05-05 04:00:00+00"]
339	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-05-11 03:59:00+00","2025-05-12 04:00:00+00"]
340	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-05-18 03:59:00+00","2025-05-19 04:00:00+00"]
341	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-05-25 03:59:00+00","2025-05-26 04:00:00+00"]
342	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-06-01 03:59:00+00","2025-06-02 04:00:00+00"]
343	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-06-08 03:59:00+00","2025-06-09 04:00:00+00"]
344	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-06-15 03:59:00+00","2025-06-16 04:00:00+00"]
345	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-06-22 03:59:00+00","2025-06-23 04:00:00+00"]
346	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-06-29 03:59:00+00","2025-06-30 04:00:00+00"]
347	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-07-06 03:59:00+00","2025-07-07 04:00:00+00"]
348	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-07-13 03:59:00+00","2025-07-14 04:00:00+00"]
349	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-07-20 03:59:00+00","2025-07-21 04:00:00+00"]
350	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-07-27 03:59:00+00","2025-07-28 04:00:00+00"]
351	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-08-03 03:59:00+00","2025-08-04 04:00:00+00"]
352	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-08-10 03:59:00+00","2025-08-11 04:00:00+00"]
353	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-08-17 03:59:00+00","2025-08-18 04:00:00+00"]
354	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-08-24 03:59:00+00","2025-08-25 04:00:00+00"]
355	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-08-31 03:59:00+00","2025-09-01 04:00:00+00"]
356	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-09-07 03:59:00+00","2025-09-08 04:00:00+00"]
357	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-09-14 03:59:00+00","2025-09-15 04:00:00+00"]
358	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-09-21 03:59:00+00","2025-09-22 04:00:00+00"]
359	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-09-28 03:59:00+00","2025-09-29 04:00:00+00"]
360	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-10-05 03:59:00+00","2025-10-06 04:00:00+00"]
361	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-10-12 03:59:00+00","2025-10-13 04:00:00+00"]
362	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-10-19 03:59:00+00","2025-10-20 04:00:00+00"]
363	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-10-26 03:59:00+00","2025-10-27 04:00:00+00"]
364	0c1d42db-16e1-4626-8699-d9687a4d2867	["2025-11-02 03:59:00+00","2025-11-03 05:00:00+00"]
365	fa255a66-c214-4e74-9811-25ae92911096	["2024-11-11 04:59:00+00","2024-11-12 05:00:00+00"]
366	fa255a66-c214-4e74-9811-25ae92911096	["2024-11-18 04:59:00+00","2024-11-19 05:00:00+00"]
367	fa255a66-c214-4e74-9811-25ae92911096	["2024-11-25 04:59:00+00","2024-11-26 05:00:00+00"]
368	fa255a66-c214-4e74-9811-25ae92911096	["2024-12-02 04:59:00+00","2024-12-03 05:00:00+00"]
369	fa255a66-c214-4e74-9811-25ae92911096	["2024-12-09 04:59:00+00","2024-12-10 05:00:00+00"]
370	fa255a66-c214-4e74-9811-25ae92911096	["2024-12-16 04:59:00+00","2024-12-17 05:00:00+00"]
371	fa255a66-c214-4e74-9811-25ae92911096	["2024-12-23 04:59:00+00","2024-12-24 05:00:00+00"]
372	fa255a66-c214-4e74-9811-25ae92911096	["2024-12-30 04:59:00+00","2024-12-31 05:00:00+00"]
373	fa255a66-c214-4e74-9811-25ae92911096	["2025-01-06 04:59:00+00","2025-01-07 05:00:00+00"]
374	fa255a66-c214-4e74-9811-25ae92911096	["2025-01-13 04:59:00+00","2025-01-14 05:00:00+00"]
375	fa255a66-c214-4e74-9811-25ae92911096	["2025-01-20 04:59:00+00","2025-01-21 05:00:00+00"]
376	fa255a66-c214-4e74-9811-25ae92911096	["2025-01-27 04:59:00+00","2025-01-28 05:00:00+00"]
377	fa255a66-c214-4e74-9811-25ae92911096	["2025-02-03 04:59:00+00","2025-02-04 05:00:00+00"]
378	fa255a66-c214-4e74-9811-25ae92911096	["2025-02-10 04:59:00+00","2025-02-11 05:00:00+00"]
379	fa255a66-c214-4e74-9811-25ae92911096	["2025-02-17 04:59:00+00","2025-02-18 05:00:00+00"]
380	fa255a66-c214-4e74-9811-25ae92911096	["2025-02-24 04:59:00+00","2025-02-25 05:00:00+00"]
381	fa255a66-c214-4e74-9811-25ae92911096	["2025-03-03 04:59:00+00","2025-03-04 05:00:00+00"]
382	fa255a66-c214-4e74-9811-25ae92911096	["2025-03-10 03:59:00+00","2025-03-11 04:00:00+00"]
383	fa255a66-c214-4e74-9811-25ae92911096	["2025-03-17 03:59:00+00","2025-03-18 04:00:00+00"]
384	fa255a66-c214-4e74-9811-25ae92911096	["2025-03-24 03:59:00+00","2025-03-25 04:00:00+00"]
385	fa255a66-c214-4e74-9811-25ae92911096	["2025-03-31 03:59:00+00","2025-04-01 04:00:00+00"]
386	fa255a66-c214-4e74-9811-25ae92911096	["2025-04-07 03:59:00+00","2025-04-08 04:00:00+00"]
387	fa255a66-c214-4e74-9811-25ae92911096	["2025-04-14 03:59:00+00","2025-04-15 04:00:00+00"]
388	fa255a66-c214-4e74-9811-25ae92911096	["2025-04-21 03:59:00+00","2025-04-22 04:00:00+00"]
389	fa255a66-c214-4e74-9811-25ae92911096	["2025-04-28 03:59:00+00","2025-04-29 04:00:00+00"]
390	fa255a66-c214-4e74-9811-25ae92911096	["2025-05-05 03:59:00+00","2025-05-06 04:00:00+00"]
391	fa255a66-c214-4e74-9811-25ae92911096	["2025-05-12 03:59:00+00","2025-05-13 04:00:00+00"]
392	fa255a66-c214-4e74-9811-25ae92911096	["2025-05-19 03:59:00+00","2025-05-20 04:00:00+00"]
393	fa255a66-c214-4e74-9811-25ae92911096	["2025-05-26 03:59:00+00","2025-05-27 04:00:00+00"]
394	fa255a66-c214-4e74-9811-25ae92911096	["2025-06-02 03:59:00+00","2025-06-03 04:00:00+00"]
395	fa255a66-c214-4e74-9811-25ae92911096	["2025-06-09 03:59:00+00","2025-06-10 04:00:00+00"]
396	fa255a66-c214-4e74-9811-25ae92911096	["2025-06-16 03:59:00+00","2025-06-17 04:00:00+00"]
397	fa255a66-c214-4e74-9811-25ae92911096	["2025-06-23 03:59:00+00","2025-06-24 04:00:00+00"]
398	fa255a66-c214-4e74-9811-25ae92911096	["2025-06-30 03:59:00+00","2025-07-01 04:00:00+00"]
399	fa255a66-c214-4e74-9811-25ae92911096	["2025-07-07 03:59:00+00","2025-07-08 04:00:00+00"]
400	fa255a66-c214-4e74-9811-25ae92911096	["2025-07-14 03:59:00+00","2025-07-15 04:00:00+00"]
401	fa255a66-c214-4e74-9811-25ae92911096	["2025-07-21 03:59:00+00","2025-07-22 04:00:00+00"]
402	fa255a66-c214-4e74-9811-25ae92911096	["2025-07-28 03:59:00+00","2025-07-29 04:00:00+00"]
403	fa255a66-c214-4e74-9811-25ae92911096	["2025-08-04 03:59:00+00","2025-08-05 04:00:00+00"]
404	fa255a66-c214-4e74-9811-25ae92911096	["2025-08-11 03:59:00+00","2025-08-12 04:00:00+00"]
405	fa255a66-c214-4e74-9811-25ae92911096	["2025-08-18 03:59:00+00","2025-08-19 04:00:00+00"]
406	fa255a66-c214-4e74-9811-25ae92911096	["2025-08-25 03:59:00+00","2025-08-26 04:00:00+00"]
407	fa255a66-c214-4e74-9811-25ae92911096	["2025-09-01 03:59:00+00","2025-09-02 04:00:00+00"]
408	fa255a66-c214-4e74-9811-25ae92911096	["2025-09-08 03:59:00+00","2025-09-09 04:00:00+00"]
409	fa255a66-c214-4e74-9811-25ae92911096	["2025-09-15 03:59:00+00","2025-09-16 04:00:00+00"]
410	fa255a66-c214-4e74-9811-25ae92911096	["2025-09-22 03:59:00+00","2025-09-23 04:00:00+00"]
411	fa255a66-c214-4e74-9811-25ae92911096	["2025-09-29 03:59:00+00","2025-09-30 04:00:00+00"]
412	fa255a66-c214-4e74-9811-25ae92911096	["2025-10-06 03:59:00+00","2025-10-07 04:00:00+00"]
413	fa255a66-c214-4e74-9811-25ae92911096	["2025-10-13 03:59:00+00","2025-10-14 04:00:00+00"]
414	fa255a66-c214-4e74-9811-25ae92911096	["2025-10-20 03:59:00+00","2025-10-21 04:00:00+00"]
415	fa255a66-c214-4e74-9811-25ae92911096	["2025-10-27 03:59:00+00","2025-10-28 04:00:00+00"]
416	fa255a66-c214-4e74-9811-25ae92911096	["2025-11-03 04:59:00+00","2025-11-04 05:00:00+00"]
417	fa255a66-c214-4e74-9811-25ae92911096	["2024-11-12 04:59:00+00","2024-11-13 05:00:00+00"]
418	fa255a66-c214-4e74-9811-25ae92911096	["2024-11-19 04:59:00+00","2024-11-20 05:00:00+00"]
419	fa255a66-c214-4e74-9811-25ae92911096	["2024-11-26 04:59:00+00","2024-11-27 05:00:00+00"]
420	fa255a66-c214-4e74-9811-25ae92911096	["2024-12-03 04:59:00+00","2024-12-04 05:00:00+00"]
421	fa255a66-c214-4e74-9811-25ae92911096	["2024-12-10 04:59:00+00","2024-12-11 05:00:00+00"]
422	fa255a66-c214-4e74-9811-25ae92911096	["2024-12-17 04:59:00+00","2024-12-18 05:00:00+00"]
423	fa255a66-c214-4e74-9811-25ae92911096	["2024-12-24 04:59:00+00","2024-12-25 05:00:00+00"]
424	fa255a66-c214-4e74-9811-25ae92911096	["2024-12-31 04:59:00+00","2025-01-01 05:00:00+00"]
425	fa255a66-c214-4e74-9811-25ae92911096	["2025-01-07 04:59:00+00","2025-01-08 05:00:00+00"]
426	fa255a66-c214-4e74-9811-25ae92911096	["2025-01-14 04:59:00+00","2025-01-15 05:00:00+00"]
427	fa255a66-c214-4e74-9811-25ae92911096	["2025-01-21 04:59:00+00","2025-01-22 05:00:00+00"]
428	fa255a66-c214-4e74-9811-25ae92911096	["2025-01-28 04:59:00+00","2025-01-29 05:00:00+00"]
429	fa255a66-c214-4e74-9811-25ae92911096	["2025-02-04 04:59:00+00","2025-02-05 05:00:00+00"]
430	fa255a66-c214-4e74-9811-25ae92911096	["2025-02-11 04:59:00+00","2025-02-12 05:00:00+00"]
431	fa255a66-c214-4e74-9811-25ae92911096	["2025-02-18 04:59:00+00","2025-02-19 05:00:00+00"]
432	fa255a66-c214-4e74-9811-25ae92911096	["2025-02-25 04:59:00+00","2025-02-26 05:00:00+00"]
433	fa255a66-c214-4e74-9811-25ae92911096	["2025-03-04 04:59:00+00","2025-03-05 05:00:00+00"]
434	fa255a66-c214-4e74-9811-25ae92911096	["2025-03-11 03:59:00+00","2025-03-12 04:00:00+00"]
435	fa255a66-c214-4e74-9811-25ae92911096	["2025-03-18 03:59:00+00","2025-03-19 04:00:00+00"]
436	fa255a66-c214-4e74-9811-25ae92911096	["2025-03-25 03:59:00+00","2025-03-26 04:00:00+00"]
437	fa255a66-c214-4e74-9811-25ae92911096	["2025-04-01 03:59:00+00","2025-04-02 04:00:00+00"]
438	fa255a66-c214-4e74-9811-25ae92911096	["2025-04-08 03:59:00+00","2025-04-09 04:00:00+00"]
439	fa255a66-c214-4e74-9811-25ae92911096	["2025-04-15 03:59:00+00","2025-04-16 04:00:00+00"]
440	fa255a66-c214-4e74-9811-25ae92911096	["2025-04-22 03:59:00+00","2025-04-23 04:00:00+00"]
441	fa255a66-c214-4e74-9811-25ae92911096	["2025-04-29 03:59:00+00","2025-04-30 04:00:00+00"]
442	fa255a66-c214-4e74-9811-25ae92911096	["2025-05-06 03:59:00+00","2025-05-07 04:00:00+00"]
443	fa255a66-c214-4e74-9811-25ae92911096	["2025-05-13 03:59:00+00","2025-05-14 04:00:00+00"]
444	fa255a66-c214-4e74-9811-25ae92911096	["2025-05-20 03:59:00+00","2025-05-21 04:00:00+00"]
445	fa255a66-c214-4e74-9811-25ae92911096	["2025-05-27 03:59:00+00","2025-05-28 04:00:00+00"]
446	fa255a66-c214-4e74-9811-25ae92911096	["2025-06-03 03:59:00+00","2025-06-04 04:00:00+00"]
447	fa255a66-c214-4e74-9811-25ae92911096	["2025-06-10 03:59:00+00","2025-06-11 04:00:00+00"]
448	fa255a66-c214-4e74-9811-25ae92911096	["2025-06-17 03:59:00+00","2025-06-18 04:00:00+00"]
449	fa255a66-c214-4e74-9811-25ae92911096	["2025-06-24 03:59:00+00","2025-06-25 04:00:00+00"]
450	fa255a66-c214-4e74-9811-25ae92911096	["2025-07-01 03:59:00+00","2025-07-02 04:00:00+00"]
451	fa255a66-c214-4e74-9811-25ae92911096	["2025-07-08 03:59:00+00","2025-07-09 04:00:00+00"]
452	fa255a66-c214-4e74-9811-25ae92911096	["2025-07-15 03:59:00+00","2025-07-16 04:00:00+00"]
453	fa255a66-c214-4e74-9811-25ae92911096	["2025-07-22 03:59:00+00","2025-07-23 04:00:00+00"]
454	fa255a66-c214-4e74-9811-25ae92911096	["2025-07-29 03:59:00+00","2025-07-30 04:00:00+00"]
455	fa255a66-c214-4e74-9811-25ae92911096	["2025-08-05 03:59:00+00","2025-08-06 04:00:00+00"]
456	fa255a66-c214-4e74-9811-25ae92911096	["2025-08-12 03:59:00+00","2025-08-13 04:00:00+00"]
457	fa255a66-c214-4e74-9811-25ae92911096	["2025-08-19 03:59:00+00","2025-08-20 04:00:00+00"]
458	fa255a66-c214-4e74-9811-25ae92911096	["2025-08-26 03:59:00+00","2025-08-27 04:00:00+00"]
459	fa255a66-c214-4e74-9811-25ae92911096	["2025-09-02 03:59:00+00","2025-09-03 04:00:00+00"]
460	fa255a66-c214-4e74-9811-25ae92911096	["2025-09-09 03:59:00+00","2025-09-10 04:00:00+00"]
461	fa255a66-c214-4e74-9811-25ae92911096	["2025-09-16 03:59:00+00","2025-09-17 04:00:00+00"]
462	fa255a66-c214-4e74-9811-25ae92911096	["2025-09-23 03:59:00+00","2025-09-24 04:00:00+00"]
463	fa255a66-c214-4e74-9811-25ae92911096	["2025-09-30 03:59:00+00","2025-10-01 04:00:00+00"]
464	fa255a66-c214-4e74-9811-25ae92911096	["2025-10-07 03:59:00+00","2025-10-08 04:00:00+00"]
465	fa255a66-c214-4e74-9811-25ae92911096	["2025-10-14 03:59:00+00","2025-10-15 04:00:00+00"]
466	fa255a66-c214-4e74-9811-25ae92911096	["2025-10-21 03:59:00+00","2025-10-22 04:00:00+00"]
467	fa255a66-c214-4e74-9811-25ae92911096	["2025-10-28 03:59:00+00","2025-10-29 04:00:00+00"]
468	fa255a66-c214-4e74-9811-25ae92911096	["2025-11-04 04:59:00+00","2025-11-05 05:00:00+00"]
469	fa255a66-c214-4e74-9811-25ae92911096	["2024-11-13 04:59:00+00","2024-11-14 05:00:00+00"]
470	fa255a66-c214-4e74-9811-25ae92911096	["2024-11-20 04:59:00+00","2024-11-21 05:00:00+00"]
471	fa255a66-c214-4e74-9811-25ae92911096	["2024-11-27 04:59:00+00","2024-11-28 05:00:00+00"]
472	fa255a66-c214-4e74-9811-25ae92911096	["2024-12-04 04:59:00+00","2024-12-05 05:00:00+00"]
473	fa255a66-c214-4e74-9811-25ae92911096	["2024-12-11 04:59:00+00","2024-12-12 05:00:00+00"]
474	fa255a66-c214-4e74-9811-25ae92911096	["2024-12-18 04:59:00+00","2024-12-19 05:00:00+00"]
475	fa255a66-c214-4e74-9811-25ae92911096	["2024-12-25 04:59:00+00","2024-12-26 05:00:00+00"]
476	fa255a66-c214-4e74-9811-25ae92911096	["2025-01-01 04:59:00+00","2025-01-02 05:00:00+00"]
477	fa255a66-c214-4e74-9811-25ae92911096	["2025-01-08 04:59:00+00","2025-01-09 05:00:00+00"]
478	fa255a66-c214-4e74-9811-25ae92911096	["2025-01-15 04:59:00+00","2025-01-16 05:00:00+00"]
479	fa255a66-c214-4e74-9811-25ae92911096	["2025-01-22 04:59:00+00","2025-01-23 05:00:00+00"]
480	fa255a66-c214-4e74-9811-25ae92911096	["2025-01-29 04:59:00+00","2025-01-30 05:00:00+00"]
481	fa255a66-c214-4e74-9811-25ae92911096	["2025-02-05 04:59:00+00","2025-02-06 05:00:00+00"]
482	fa255a66-c214-4e74-9811-25ae92911096	["2025-02-12 04:59:00+00","2025-02-13 05:00:00+00"]
483	fa255a66-c214-4e74-9811-25ae92911096	["2025-02-19 04:59:00+00","2025-02-20 05:00:00+00"]
484	fa255a66-c214-4e74-9811-25ae92911096	["2025-02-26 04:59:00+00","2025-02-27 05:00:00+00"]
485	fa255a66-c214-4e74-9811-25ae92911096	["2025-03-05 04:59:00+00","2025-03-06 05:00:00+00"]
486	fa255a66-c214-4e74-9811-25ae92911096	["2025-03-12 03:59:00+00","2025-03-13 04:00:00+00"]
487	fa255a66-c214-4e74-9811-25ae92911096	["2025-03-19 03:59:00+00","2025-03-20 04:00:00+00"]
488	fa255a66-c214-4e74-9811-25ae92911096	["2025-03-26 03:59:00+00","2025-03-27 04:00:00+00"]
489	fa255a66-c214-4e74-9811-25ae92911096	["2025-04-02 03:59:00+00","2025-04-03 04:00:00+00"]
490	fa255a66-c214-4e74-9811-25ae92911096	["2025-04-09 03:59:00+00","2025-04-10 04:00:00+00"]
491	fa255a66-c214-4e74-9811-25ae92911096	["2025-04-16 03:59:00+00","2025-04-17 04:00:00+00"]
492	fa255a66-c214-4e74-9811-25ae92911096	["2025-04-23 03:59:00+00","2025-04-24 04:00:00+00"]
493	fa255a66-c214-4e74-9811-25ae92911096	["2025-04-30 03:59:00+00","2025-05-01 04:00:00+00"]
494	fa255a66-c214-4e74-9811-25ae92911096	["2025-05-07 03:59:00+00","2025-05-08 04:00:00+00"]
495	fa255a66-c214-4e74-9811-25ae92911096	["2025-05-14 03:59:00+00","2025-05-15 04:00:00+00"]
496	fa255a66-c214-4e74-9811-25ae92911096	["2025-05-21 03:59:00+00","2025-05-22 04:00:00+00"]
497	fa255a66-c214-4e74-9811-25ae92911096	["2025-05-28 03:59:00+00","2025-05-29 04:00:00+00"]
498	fa255a66-c214-4e74-9811-25ae92911096	["2025-06-04 03:59:00+00","2025-06-05 04:00:00+00"]
499	fa255a66-c214-4e74-9811-25ae92911096	["2025-06-11 03:59:00+00","2025-06-12 04:00:00+00"]
500	fa255a66-c214-4e74-9811-25ae92911096	["2025-06-18 03:59:00+00","2025-06-19 04:00:00+00"]
501	fa255a66-c214-4e74-9811-25ae92911096	["2025-06-25 03:59:00+00","2025-06-26 04:00:00+00"]
502	fa255a66-c214-4e74-9811-25ae92911096	["2025-07-02 03:59:00+00","2025-07-03 04:00:00+00"]
503	fa255a66-c214-4e74-9811-25ae92911096	["2025-07-09 03:59:00+00","2025-07-10 04:00:00+00"]
504	fa255a66-c214-4e74-9811-25ae92911096	["2025-07-16 03:59:00+00","2025-07-17 04:00:00+00"]
505	fa255a66-c214-4e74-9811-25ae92911096	["2025-07-23 03:59:00+00","2025-07-24 04:00:00+00"]
506	fa255a66-c214-4e74-9811-25ae92911096	["2025-07-30 03:59:00+00","2025-07-31 04:00:00+00"]
507	fa255a66-c214-4e74-9811-25ae92911096	["2025-08-06 03:59:00+00","2025-08-07 04:00:00+00"]
508	fa255a66-c214-4e74-9811-25ae92911096	["2025-08-13 03:59:00+00","2025-08-14 04:00:00+00"]
509	fa255a66-c214-4e74-9811-25ae92911096	["2025-08-20 03:59:00+00","2025-08-21 04:00:00+00"]
510	fa255a66-c214-4e74-9811-25ae92911096	["2025-08-27 03:59:00+00","2025-08-28 04:00:00+00"]
511	fa255a66-c214-4e74-9811-25ae92911096	["2025-09-03 03:59:00+00","2025-09-04 04:00:00+00"]
512	fa255a66-c214-4e74-9811-25ae92911096	["2025-09-10 03:59:00+00","2025-09-11 04:00:00+00"]
513	fa255a66-c214-4e74-9811-25ae92911096	["2025-09-17 03:59:00+00","2025-09-18 04:00:00+00"]
514	fa255a66-c214-4e74-9811-25ae92911096	["2025-09-24 03:59:00+00","2025-09-25 04:00:00+00"]
515	fa255a66-c214-4e74-9811-25ae92911096	["2025-10-01 03:59:00+00","2025-10-02 04:00:00+00"]
516	fa255a66-c214-4e74-9811-25ae92911096	["2025-10-08 03:59:00+00","2025-10-09 04:00:00+00"]
517	fa255a66-c214-4e74-9811-25ae92911096	["2025-10-15 03:59:00+00","2025-10-16 04:00:00+00"]
518	fa255a66-c214-4e74-9811-25ae92911096	["2025-10-22 03:59:00+00","2025-10-23 04:00:00+00"]
519	fa255a66-c214-4e74-9811-25ae92911096	["2025-10-29 03:59:00+00","2025-10-30 04:00:00+00"]
520	fa255a66-c214-4e74-9811-25ae92911096	["2025-11-05 04:59:00+00","2025-11-06 05:00:00+00"]
521	fa255a66-c214-4e74-9811-25ae92911096	["2024-11-14 04:59:00+00","2024-11-15 05:00:00+00"]
522	fa255a66-c214-4e74-9811-25ae92911096	["2024-11-21 04:59:00+00","2024-11-22 05:00:00+00"]
523	fa255a66-c214-4e74-9811-25ae92911096	["2024-11-28 04:59:00+00","2024-11-29 05:00:00+00"]
524	fa255a66-c214-4e74-9811-25ae92911096	["2024-12-05 04:59:00+00","2024-12-06 05:00:00+00"]
525	fa255a66-c214-4e74-9811-25ae92911096	["2024-12-12 04:59:00+00","2024-12-13 05:00:00+00"]
526	fa255a66-c214-4e74-9811-25ae92911096	["2024-12-19 04:59:00+00","2024-12-20 05:00:00+00"]
527	fa255a66-c214-4e74-9811-25ae92911096	["2024-12-26 04:59:00+00","2024-12-27 05:00:00+00"]
528	fa255a66-c214-4e74-9811-25ae92911096	["2025-01-02 04:59:00+00","2025-01-03 05:00:00+00"]
529	fa255a66-c214-4e74-9811-25ae92911096	["2025-01-09 04:59:00+00","2025-01-10 05:00:00+00"]
530	fa255a66-c214-4e74-9811-25ae92911096	["2025-01-16 04:59:00+00","2025-01-17 05:00:00+00"]
531	fa255a66-c214-4e74-9811-25ae92911096	["2025-01-23 04:59:00+00","2025-01-24 05:00:00+00"]
532	fa255a66-c214-4e74-9811-25ae92911096	["2025-01-30 04:59:00+00","2025-01-31 05:00:00+00"]
533	fa255a66-c214-4e74-9811-25ae92911096	["2025-02-06 04:59:00+00","2025-02-07 05:00:00+00"]
534	fa255a66-c214-4e74-9811-25ae92911096	["2025-02-13 04:59:00+00","2025-02-14 05:00:00+00"]
535	fa255a66-c214-4e74-9811-25ae92911096	["2025-02-20 04:59:00+00","2025-02-21 05:00:00+00"]
536	fa255a66-c214-4e74-9811-25ae92911096	["2025-02-27 04:59:00+00","2025-02-28 05:00:00+00"]
537	fa255a66-c214-4e74-9811-25ae92911096	["2025-03-06 04:59:00+00","2025-03-07 05:00:00+00"]
538	fa255a66-c214-4e74-9811-25ae92911096	["2025-03-13 03:59:00+00","2025-03-14 04:00:00+00"]
539	fa255a66-c214-4e74-9811-25ae92911096	["2025-03-20 03:59:00+00","2025-03-21 04:00:00+00"]
540	fa255a66-c214-4e74-9811-25ae92911096	["2025-03-27 03:59:00+00","2025-03-28 04:00:00+00"]
541	fa255a66-c214-4e74-9811-25ae92911096	["2025-04-03 03:59:00+00","2025-04-04 04:00:00+00"]
542	fa255a66-c214-4e74-9811-25ae92911096	["2025-04-10 03:59:00+00","2025-04-11 04:00:00+00"]
543	fa255a66-c214-4e74-9811-25ae92911096	["2025-04-17 03:59:00+00","2025-04-18 04:00:00+00"]
544	fa255a66-c214-4e74-9811-25ae92911096	["2025-04-24 03:59:00+00","2025-04-25 04:00:00+00"]
545	fa255a66-c214-4e74-9811-25ae92911096	["2025-05-01 03:59:00+00","2025-05-02 04:00:00+00"]
546	fa255a66-c214-4e74-9811-25ae92911096	["2025-05-08 03:59:00+00","2025-05-09 04:00:00+00"]
547	fa255a66-c214-4e74-9811-25ae92911096	["2025-05-15 03:59:00+00","2025-05-16 04:00:00+00"]
548	fa255a66-c214-4e74-9811-25ae92911096	["2025-05-22 03:59:00+00","2025-05-23 04:00:00+00"]
549	fa255a66-c214-4e74-9811-25ae92911096	["2025-05-29 03:59:00+00","2025-05-30 04:00:00+00"]
550	fa255a66-c214-4e74-9811-25ae92911096	["2025-06-05 03:59:00+00","2025-06-06 04:00:00+00"]
551	fa255a66-c214-4e74-9811-25ae92911096	["2025-06-12 03:59:00+00","2025-06-13 04:00:00+00"]
552	fa255a66-c214-4e74-9811-25ae92911096	["2025-06-19 03:59:00+00","2025-06-20 04:00:00+00"]
553	fa255a66-c214-4e74-9811-25ae92911096	["2025-06-26 03:59:00+00","2025-06-27 04:00:00+00"]
554	fa255a66-c214-4e74-9811-25ae92911096	["2025-07-03 03:59:00+00","2025-07-04 04:00:00+00"]
555	fa255a66-c214-4e74-9811-25ae92911096	["2025-07-10 03:59:00+00","2025-07-11 04:00:00+00"]
556	fa255a66-c214-4e74-9811-25ae92911096	["2025-07-17 03:59:00+00","2025-07-18 04:00:00+00"]
557	fa255a66-c214-4e74-9811-25ae92911096	["2025-07-24 03:59:00+00","2025-07-25 04:00:00+00"]
558	fa255a66-c214-4e74-9811-25ae92911096	["2025-07-31 03:59:00+00","2025-08-01 04:00:00+00"]
559	fa255a66-c214-4e74-9811-25ae92911096	["2025-08-07 03:59:00+00","2025-08-08 04:00:00+00"]
560	fa255a66-c214-4e74-9811-25ae92911096	["2025-08-14 03:59:00+00","2025-08-15 04:00:00+00"]
561	fa255a66-c214-4e74-9811-25ae92911096	["2025-08-21 03:59:00+00","2025-08-22 04:00:00+00"]
562	fa255a66-c214-4e74-9811-25ae92911096	["2025-08-28 03:59:00+00","2025-08-29 04:00:00+00"]
563	fa255a66-c214-4e74-9811-25ae92911096	["2025-09-04 03:59:00+00","2025-09-05 04:00:00+00"]
564	fa255a66-c214-4e74-9811-25ae92911096	["2025-09-11 03:59:00+00","2025-09-12 04:00:00+00"]
565	fa255a66-c214-4e74-9811-25ae92911096	["2025-09-18 03:59:00+00","2025-09-19 04:00:00+00"]
566	fa255a66-c214-4e74-9811-25ae92911096	["2025-09-25 03:59:00+00","2025-09-26 04:00:00+00"]
567	fa255a66-c214-4e74-9811-25ae92911096	["2025-10-02 03:59:00+00","2025-10-03 04:00:00+00"]
568	fa255a66-c214-4e74-9811-25ae92911096	["2025-10-09 03:59:00+00","2025-10-10 04:00:00+00"]
569	fa255a66-c214-4e74-9811-25ae92911096	["2025-10-16 03:59:00+00","2025-10-17 04:00:00+00"]
570	fa255a66-c214-4e74-9811-25ae92911096	["2025-10-23 03:59:00+00","2025-10-24 04:00:00+00"]
571	fa255a66-c214-4e74-9811-25ae92911096	["2025-10-30 03:59:00+00","2025-10-31 04:00:00+00"]
572	fa255a66-c214-4e74-9811-25ae92911096	["2025-11-06 04:59:00+00","2025-11-07 05:00:00+00"]
573	fa255a66-c214-4e74-9811-25ae92911096	["2024-11-15 04:59:00+00","2024-11-16 05:00:00+00"]
574	fa255a66-c214-4e74-9811-25ae92911096	["2024-11-22 04:59:00+00","2024-11-23 05:00:00+00"]
575	fa255a66-c214-4e74-9811-25ae92911096	["2024-11-29 04:59:00+00","2024-11-30 05:00:00+00"]
576	fa255a66-c214-4e74-9811-25ae92911096	["2024-12-06 04:59:00+00","2024-12-07 05:00:00+00"]
577	fa255a66-c214-4e74-9811-25ae92911096	["2024-12-13 04:59:00+00","2024-12-14 05:00:00+00"]
578	fa255a66-c214-4e74-9811-25ae92911096	["2024-12-20 04:59:00+00","2024-12-21 05:00:00+00"]
579	fa255a66-c214-4e74-9811-25ae92911096	["2024-12-27 04:59:00+00","2024-12-28 05:00:00+00"]
580	fa255a66-c214-4e74-9811-25ae92911096	["2025-01-03 04:59:00+00","2025-01-04 05:00:00+00"]
581	fa255a66-c214-4e74-9811-25ae92911096	["2025-01-10 04:59:00+00","2025-01-11 05:00:00+00"]
582	fa255a66-c214-4e74-9811-25ae92911096	["2025-01-17 04:59:00+00","2025-01-18 05:00:00+00"]
583	fa255a66-c214-4e74-9811-25ae92911096	["2025-01-24 04:59:00+00","2025-01-25 05:00:00+00"]
584	fa255a66-c214-4e74-9811-25ae92911096	["2025-01-31 04:59:00+00","2025-02-01 05:00:00+00"]
585	fa255a66-c214-4e74-9811-25ae92911096	["2025-02-07 04:59:00+00","2025-02-08 05:00:00+00"]
586	fa255a66-c214-4e74-9811-25ae92911096	["2025-02-14 04:59:00+00","2025-02-15 05:00:00+00"]
587	fa255a66-c214-4e74-9811-25ae92911096	["2025-02-21 04:59:00+00","2025-02-22 05:00:00+00"]
588	fa255a66-c214-4e74-9811-25ae92911096	["2025-02-28 04:59:00+00","2025-03-01 05:00:00+00"]
589	fa255a66-c214-4e74-9811-25ae92911096	["2025-03-07 04:59:00+00","2025-03-08 05:00:00+00"]
590	fa255a66-c214-4e74-9811-25ae92911096	["2025-03-14 03:59:00+00","2025-03-15 04:00:00+00"]
591	fa255a66-c214-4e74-9811-25ae92911096	["2025-03-21 03:59:00+00","2025-03-22 04:00:00+00"]
592	fa255a66-c214-4e74-9811-25ae92911096	["2025-03-28 03:59:00+00","2025-03-29 04:00:00+00"]
593	fa255a66-c214-4e74-9811-25ae92911096	["2025-04-04 03:59:00+00","2025-04-05 04:00:00+00"]
594	fa255a66-c214-4e74-9811-25ae92911096	["2025-04-11 03:59:00+00","2025-04-12 04:00:00+00"]
595	fa255a66-c214-4e74-9811-25ae92911096	["2025-04-18 03:59:00+00","2025-04-19 04:00:00+00"]
596	fa255a66-c214-4e74-9811-25ae92911096	["2025-04-25 03:59:00+00","2025-04-26 04:00:00+00"]
597	fa255a66-c214-4e74-9811-25ae92911096	["2025-05-02 03:59:00+00","2025-05-03 04:00:00+00"]
598	fa255a66-c214-4e74-9811-25ae92911096	["2025-05-09 03:59:00+00","2025-05-10 04:00:00+00"]
599	fa255a66-c214-4e74-9811-25ae92911096	["2025-05-16 03:59:00+00","2025-05-17 04:00:00+00"]
600	fa255a66-c214-4e74-9811-25ae92911096	["2025-05-23 03:59:00+00","2025-05-24 04:00:00+00"]
601	fa255a66-c214-4e74-9811-25ae92911096	["2025-05-30 03:59:00+00","2025-05-31 04:00:00+00"]
602	fa255a66-c214-4e74-9811-25ae92911096	["2025-06-06 03:59:00+00","2025-06-07 04:00:00+00"]
603	fa255a66-c214-4e74-9811-25ae92911096	["2025-06-13 03:59:00+00","2025-06-14 04:00:00+00"]
604	fa255a66-c214-4e74-9811-25ae92911096	["2025-06-20 03:59:00+00","2025-06-21 04:00:00+00"]
605	fa255a66-c214-4e74-9811-25ae92911096	["2025-06-27 03:59:00+00","2025-06-28 04:00:00+00"]
606	fa255a66-c214-4e74-9811-25ae92911096	["2025-07-04 03:59:00+00","2025-07-05 04:00:00+00"]
607	fa255a66-c214-4e74-9811-25ae92911096	["2025-07-11 03:59:00+00","2025-07-12 04:00:00+00"]
608	fa255a66-c214-4e74-9811-25ae92911096	["2025-07-18 03:59:00+00","2025-07-19 04:00:00+00"]
609	fa255a66-c214-4e74-9811-25ae92911096	["2025-07-25 03:59:00+00","2025-07-26 04:00:00+00"]
610	fa255a66-c214-4e74-9811-25ae92911096	["2025-08-01 03:59:00+00","2025-08-02 04:00:00+00"]
611	fa255a66-c214-4e74-9811-25ae92911096	["2025-08-08 03:59:00+00","2025-08-09 04:00:00+00"]
612	fa255a66-c214-4e74-9811-25ae92911096	["2025-08-15 03:59:00+00","2025-08-16 04:00:00+00"]
613	fa255a66-c214-4e74-9811-25ae92911096	["2025-08-22 03:59:00+00","2025-08-23 04:00:00+00"]
614	fa255a66-c214-4e74-9811-25ae92911096	["2025-08-29 03:59:00+00","2025-08-30 04:00:00+00"]
615	fa255a66-c214-4e74-9811-25ae92911096	["2025-09-05 03:59:00+00","2025-09-06 04:00:00+00"]
616	fa255a66-c214-4e74-9811-25ae92911096	["2025-09-12 03:59:00+00","2025-09-13 04:00:00+00"]
617	fa255a66-c214-4e74-9811-25ae92911096	["2025-09-19 03:59:00+00","2025-09-20 04:00:00+00"]
618	fa255a66-c214-4e74-9811-25ae92911096	["2025-09-26 03:59:00+00","2025-09-27 04:00:00+00"]
619	fa255a66-c214-4e74-9811-25ae92911096	["2025-10-03 03:59:00+00","2025-10-04 04:00:00+00"]
620	fa255a66-c214-4e74-9811-25ae92911096	["2025-10-10 03:59:00+00","2025-10-11 04:00:00+00"]
621	fa255a66-c214-4e74-9811-25ae92911096	["2025-10-17 03:59:00+00","2025-10-18 04:00:00+00"]
622	fa255a66-c214-4e74-9811-25ae92911096	["2025-10-24 03:59:00+00","2025-10-25 04:00:00+00"]
623	fa255a66-c214-4e74-9811-25ae92911096	["2025-10-31 03:59:00+00","2025-11-01 04:00:00+00"]
624	fa255a66-c214-4e74-9811-25ae92911096	["2025-11-07 04:59:00+00","2025-11-08 05:00:00+00"]
625	fa255a66-c214-4e74-9811-25ae92911096	["2024-11-16 04:59:00+00","2024-11-17 05:00:00+00"]
626	fa255a66-c214-4e74-9811-25ae92911096	["2024-11-23 04:59:00+00","2024-11-24 05:00:00+00"]
627	fa255a66-c214-4e74-9811-25ae92911096	["2024-11-30 04:59:00+00","2024-12-01 05:00:00+00"]
628	fa255a66-c214-4e74-9811-25ae92911096	["2024-12-07 04:59:00+00","2024-12-08 05:00:00+00"]
629	fa255a66-c214-4e74-9811-25ae92911096	["2024-12-14 04:59:00+00","2024-12-15 05:00:00+00"]
630	fa255a66-c214-4e74-9811-25ae92911096	["2024-12-21 04:59:00+00","2024-12-22 05:00:00+00"]
631	fa255a66-c214-4e74-9811-25ae92911096	["2024-12-28 04:59:00+00","2024-12-29 05:00:00+00"]
632	fa255a66-c214-4e74-9811-25ae92911096	["2025-01-04 04:59:00+00","2025-01-05 05:00:00+00"]
633	fa255a66-c214-4e74-9811-25ae92911096	["2025-01-11 04:59:00+00","2025-01-12 05:00:00+00"]
634	fa255a66-c214-4e74-9811-25ae92911096	["2025-01-18 04:59:00+00","2025-01-19 05:00:00+00"]
635	fa255a66-c214-4e74-9811-25ae92911096	["2025-01-25 04:59:00+00","2025-01-26 05:00:00+00"]
636	fa255a66-c214-4e74-9811-25ae92911096	["2025-02-01 04:59:00+00","2025-02-02 05:00:00+00"]
637	fa255a66-c214-4e74-9811-25ae92911096	["2025-02-08 04:59:00+00","2025-02-09 05:00:00+00"]
638	fa255a66-c214-4e74-9811-25ae92911096	["2025-02-15 04:59:00+00","2025-02-16 05:00:00+00"]
639	fa255a66-c214-4e74-9811-25ae92911096	["2025-02-22 04:59:00+00","2025-02-23 05:00:00+00"]
640	fa255a66-c214-4e74-9811-25ae92911096	["2025-03-01 04:59:00+00","2025-03-02 05:00:00+00"]
641	fa255a66-c214-4e74-9811-25ae92911096	["2025-03-08 04:59:00+00","2025-03-09 05:00:00+00"]
642	fa255a66-c214-4e74-9811-25ae92911096	["2025-03-15 03:59:00+00","2025-03-16 04:00:00+00"]
643	fa255a66-c214-4e74-9811-25ae92911096	["2025-03-22 03:59:00+00","2025-03-23 04:00:00+00"]
644	fa255a66-c214-4e74-9811-25ae92911096	["2025-03-29 03:59:00+00","2025-03-30 04:00:00+00"]
645	fa255a66-c214-4e74-9811-25ae92911096	["2025-04-05 03:59:00+00","2025-04-06 04:00:00+00"]
646	fa255a66-c214-4e74-9811-25ae92911096	["2025-04-12 03:59:00+00","2025-04-13 04:00:00+00"]
647	fa255a66-c214-4e74-9811-25ae92911096	["2025-04-19 03:59:00+00","2025-04-20 04:00:00+00"]
648	fa255a66-c214-4e74-9811-25ae92911096	["2025-04-26 03:59:00+00","2025-04-27 04:00:00+00"]
649	fa255a66-c214-4e74-9811-25ae92911096	["2025-05-03 03:59:00+00","2025-05-04 04:00:00+00"]
650	fa255a66-c214-4e74-9811-25ae92911096	["2025-05-10 03:59:00+00","2025-05-11 04:00:00+00"]
651	fa255a66-c214-4e74-9811-25ae92911096	["2025-05-17 03:59:00+00","2025-05-18 04:00:00+00"]
652	fa255a66-c214-4e74-9811-25ae92911096	["2025-05-24 03:59:00+00","2025-05-25 04:00:00+00"]
653	fa255a66-c214-4e74-9811-25ae92911096	["2025-05-31 03:59:00+00","2025-06-01 04:00:00+00"]
654	fa255a66-c214-4e74-9811-25ae92911096	["2025-06-07 03:59:00+00","2025-06-08 04:00:00+00"]
655	fa255a66-c214-4e74-9811-25ae92911096	["2025-06-14 03:59:00+00","2025-06-15 04:00:00+00"]
656	fa255a66-c214-4e74-9811-25ae92911096	["2025-06-21 03:59:00+00","2025-06-22 04:00:00+00"]
657	fa255a66-c214-4e74-9811-25ae92911096	["2025-06-28 03:59:00+00","2025-06-29 04:00:00+00"]
658	fa255a66-c214-4e74-9811-25ae92911096	["2025-07-05 03:59:00+00","2025-07-06 04:00:00+00"]
659	fa255a66-c214-4e74-9811-25ae92911096	["2025-07-12 03:59:00+00","2025-07-13 04:00:00+00"]
660	fa255a66-c214-4e74-9811-25ae92911096	["2025-07-19 03:59:00+00","2025-07-20 04:00:00+00"]
661	fa255a66-c214-4e74-9811-25ae92911096	["2025-07-26 03:59:00+00","2025-07-27 04:00:00+00"]
662	fa255a66-c214-4e74-9811-25ae92911096	["2025-08-02 03:59:00+00","2025-08-03 04:00:00+00"]
663	fa255a66-c214-4e74-9811-25ae92911096	["2025-08-09 03:59:00+00","2025-08-10 04:00:00+00"]
664	fa255a66-c214-4e74-9811-25ae92911096	["2025-08-16 03:59:00+00","2025-08-17 04:00:00+00"]
665	fa255a66-c214-4e74-9811-25ae92911096	["2025-08-23 03:59:00+00","2025-08-24 04:00:00+00"]
666	fa255a66-c214-4e74-9811-25ae92911096	["2025-08-30 03:59:00+00","2025-08-31 04:00:00+00"]
667	fa255a66-c214-4e74-9811-25ae92911096	["2025-09-06 03:59:00+00","2025-09-07 04:00:00+00"]
668	fa255a66-c214-4e74-9811-25ae92911096	["2025-09-13 03:59:00+00","2025-09-14 04:00:00+00"]
669	fa255a66-c214-4e74-9811-25ae92911096	["2025-09-20 03:59:00+00","2025-09-21 04:00:00+00"]
670	fa255a66-c214-4e74-9811-25ae92911096	["2025-09-27 03:59:00+00","2025-09-28 04:00:00+00"]
671	fa255a66-c214-4e74-9811-25ae92911096	["2025-10-04 03:59:00+00","2025-10-05 04:00:00+00"]
672	fa255a66-c214-4e74-9811-25ae92911096	["2025-10-11 03:59:00+00","2025-10-12 04:00:00+00"]
673	fa255a66-c214-4e74-9811-25ae92911096	["2025-10-18 03:59:00+00","2025-10-19 04:00:00+00"]
674	fa255a66-c214-4e74-9811-25ae92911096	["2025-10-25 03:59:00+00","2025-10-26 04:00:00+00"]
675	fa255a66-c214-4e74-9811-25ae92911096	["2025-11-01 03:59:00+00","2025-11-02 04:00:00+00"]
676	fa255a66-c214-4e74-9811-25ae92911096	["2025-11-08 04:59:00+00","2025-11-09 05:00:00+00"]
677	fa255a66-c214-4e74-9811-25ae92911096	["2024-11-17 04:59:00+00","2024-11-18 05:00:00+00"]
678	fa255a66-c214-4e74-9811-25ae92911096	["2024-11-24 04:59:00+00","2024-11-25 05:00:00+00"]
679	fa255a66-c214-4e74-9811-25ae92911096	["2024-12-01 04:59:00+00","2024-12-02 05:00:00+00"]
680	fa255a66-c214-4e74-9811-25ae92911096	["2024-12-08 04:59:00+00","2024-12-09 05:00:00+00"]
681	fa255a66-c214-4e74-9811-25ae92911096	["2024-12-15 04:59:00+00","2024-12-16 05:00:00+00"]
682	fa255a66-c214-4e74-9811-25ae92911096	["2024-12-22 04:59:00+00","2024-12-23 05:00:00+00"]
683	fa255a66-c214-4e74-9811-25ae92911096	["2024-12-29 04:59:00+00","2024-12-30 05:00:00+00"]
684	fa255a66-c214-4e74-9811-25ae92911096	["2025-01-05 04:59:00+00","2025-01-06 05:00:00+00"]
685	fa255a66-c214-4e74-9811-25ae92911096	["2025-01-12 04:59:00+00","2025-01-13 05:00:00+00"]
686	fa255a66-c214-4e74-9811-25ae92911096	["2025-01-19 04:59:00+00","2025-01-20 05:00:00+00"]
687	fa255a66-c214-4e74-9811-25ae92911096	["2025-01-26 04:59:00+00","2025-01-27 05:00:00+00"]
688	fa255a66-c214-4e74-9811-25ae92911096	["2025-02-02 04:59:00+00","2025-02-03 05:00:00+00"]
689	fa255a66-c214-4e74-9811-25ae92911096	["2025-02-09 04:59:00+00","2025-02-10 05:00:00+00"]
690	fa255a66-c214-4e74-9811-25ae92911096	["2025-02-16 04:59:00+00","2025-02-17 05:00:00+00"]
691	fa255a66-c214-4e74-9811-25ae92911096	["2025-02-23 04:59:00+00","2025-02-24 05:00:00+00"]
692	fa255a66-c214-4e74-9811-25ae92911096	["2025-03-02 04:59:00+00","2025-03-03 05:00:00+00"]
693	fa255a66-c214-4e74-9811-25ae92911096	["2025-03-09 04:59:00+00","2025-03-10 04:00:00+00"]
694	fa255a66-c214-4e74-9811-25ae92911096	["2025-03-16 03:59:00+00","2025-03-17 04:00:00+00"]
695	fa255a66-c214-4e74-9811-25ae92911096	["2025-03-23 03:59:00+00","2025-03-24 04:00:00+00"]
696	fa255a66-c214-4e74-9811-25ae92911096	["2025-03-30 03:59:00+00","2025-03-31 04:00:00+00"]
697	fa255a66-c214-4e74-9811-25ae92911096	["2025-04-06 03:59:00+00","2025-04-07 04:00:00+00"]
698	fa255a66-c214-4e74-9811-25ae92911096	["2025-04-13 03:59:00+00","2025-04-14 04:00:00+00"]
699	fa255a66-c214-4e74-9811-25ae92911096	["2025-04-20 03:59:00+00","2025-04-21 04:00:00+00"]
700	fa255a66-c214-4e74-9811-25ae92911096	["2025-04-27 03:59:00+00","2025-04-28 04:00:00+00"]
701	fa255a66-c214-4e74-9811-25ae92911096	["2025-05-04 03:59:00+00","2025-05-05 04:00:00+00"]
702	fa255a66-c214-4e74-9811-25ae92911096	["2025-05-11 03:59:00+00","2025-05-12 04:00:00+00"]
703	fa255a66-c214-4e74-9811-25ae92911096	["2025-05-18 03:59:00+00","2025-05-19 04:00:00+00"]
704	fa255a66-c214-4e74-9811-25ae92911096	["2025-05-25 03:59:00+00","2025-05-26 04:00:00+00"]
705	fa255a66-c214-4e74-9811-25ae92911096	["2025-06-01 03:59:00+00","2025-06-02 04:00:00+00"]
706	fa255a66-c214-4e74-9811-25ae92911096	["2025-06-08 03:59:00+00","2025-06-09 04:00:00+00"]
707	fa255a66-c214-4e74-9811-25ae92911096	["2025-06-15 03:59:00+00","2025-06-16 04:00:00+00"]
708	fa255a66-c214-4e74-9811-25ae92911096	["2025-06-22 03:59:00+00","2025-06-23 04:00:00+00"]
709	fa255a66-c214-4e74-9811-25ae92911096	["2025-06-29 03:59:00+00","2025-06-30 04:00:00+00"]
710	fa255a66-c214-4e74-9811-25ae92911096	["2025-07-06 03:59:00+00","2025-07-07 04:00:00+00"]
711	fa255a66-c214-4e74-9811-25ae92911096	["2025-07-13 03:59:00+00","2025-07-14 04:00:00+00"]
712	fa255a66-c214-4e74-9811-25ae92911096	["2025-07-20 03:59:00+00","2025-07-21 04:00:00+00"]
713	fa255a66-c214-4e74-9811-25ae92911096	["2025-07-27 03:59:00+00","2025-07-28 04:00:00+00"]
714	fa255a66-c214-4e74-9811-25ae92911096	["2025-08-03 03:59:00+00","2025-08-04 04:00:00+00"]
715	fa255a66-c214-4e74-9811-25ae92911096	["2025-08-10 03:59:00+00","2025-08-11 04:00:00+00"]
716	fa255a66-c214-4e74-9811-25ae92911096	["2025-08-17 03:59:00+00","2025-08-18 04:00:00+00"]
717	fa255a66-c214-4e74-9811-25ae92911096	["2025-08-24 03:59:00+00","2025-08-25 04:00:00+00"]
718	fa255a66-c214-4e74-9811-25ae92911096	["2025-08-31 03:59:00+00","2025-09-01 04:00:00+00"]
719	fa255a66-c214-4e74-9811-25ae92911096	["2025-09-07 03:59:00+00","2025-09-08 04:00:00+00"]
720	fa255a66-c214-4e74-9811-25ae92911096	["2025-09-14 03:59:00+00","2025-09-15 04:00:00+00"]
721	fa255a66-c214-4e74-9811-25ae92911096	["2025-09-21 03:59:00+00","2025-09-22 04:00:00+00"]
722	fa255a66-c214-4e74-9811-25ae92911096	["2025-09-28 03:59:00+00","2025-09-29 04:00:00+00"]
723	fa255a66-c214-4e74-9811-25ae92911096	["2025-10-05 03:59:00+00","2025-10-06 04:00:00+00"]
724	fa255a66-c214-4e74-9811-25ae92911096	["2025-10-12 03:59:00+00","2025-10-13 04:00:00+00"]
725	fa255a66-c214-4e74-9811-25ae92911096	["2025-10-19 03:59:00+00","2025-10-20 04:00:00+00"]
726	fa255a66-c214-4e74-9811-25ae92911096	["2025-10-26 03:59:00+00","2025-10-27 04:00:00+00"]
727	fa255a66-c214-4e74-9811-25ae92911096	["2025-11-02 03:59:00+00","2025-11-03 05:00:00+00"]
728	fa255a66-c214-4e74-9811-25ae92911096	["2025-11-09 04:59:00+00","2025-11-10 05:00:00+00"]
\.


--
-- Data for Name: parking_spaces; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.parking_spaces (id, owner, location, is_paid, name, availability_schedule, photos, verification_status, cancellation_policy, created_at, updated_at, address, price, is_taken, photo_timestamp, verification_photos, avg_availability_rating, avg_cleanliness_rating, avg_total_rating, ratings_count_availability, ratings_count_cleanliness) FROM stdin;
0c1d42db-16e1-4626-8699-d9687a4d2867	4e43aa54-5313-4f02-985f-efe54b48adc7	0101000020E6100000A3CFA2D2E3BA55C0D2F01C80C3364440	t	Spot 1	[{"end_time": "23:59", "start_time": "00:00", "day_of_week": "Monday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Tuesday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Wednesday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Thursday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Friday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Saturday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Sunday"}]	{/static/images/bb1b348c-9529-4d6f-9c6a-28dd13b2832b.png}	unverified	\N	2024-11-11 03:16:09.182906+00	2024-11-11 03:16:09.182906+00	Winifred Parker Residence Hall, 3rd Street, West Lafayette, IN, USA	2	f	2024-11-11 03:16:09.182906+00	\N	\N	\N	\N	0	0
fa255a66-c214-4e74-9811-25ae92911096	4e43aa54-5313-4f02-985f-efe54b48adc7	0101000020E6100000EE2422FC8BBA55C042CF66D5E7364440	t	Spot 2	[{"end_time": "23:59", "start_time": "00:00", "day_of_week": "Monday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Tuesday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Wednesday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Thursday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Friday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Saturday"}, {"end_time": "23:59", "start_time": "00:00", "day_of_week": "Sunday"}]	{/static/images/d0602823-981e-4c9f-b759-cf9ab286d197.png}	unverified	\N	2024-11-12 01:13:02.911206+00	2024-11-12 01:13:02.911206+00	Hall of Data Science and AI, Stadium Mall Drive, West Lafayette, IN, USA	10	f	2024-11-12 01:13:02.911206+00	\N	\N	\N	\N	0	0
8b55c5a3-9084-4999-ab0f-89cb6aeadaac	4e43aa54-5313-4f02-985f-efe54b48adc7	0101000020E6100000929C024F90BA55C014B35E0CE5364440	f	Spot Logged at 08:13 PM, November 11 2024	[]	{/static/images/689a8c22-32b5-4427-8ca3-b1b7f5f8ef5a.jpg}	unverified	\N	2024-11-12 01:13:26.24738+00	2024-11-12 01:13:26.24738+00		0	f	2024-11-12 01:13:26.24738+00	\N	\N	\N	\N	0	0
\.


--
-- Data for Name: ratings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ratings (id, parking_space_id, user_id, availability_rating, cleanliness_rating, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reports (id, reservation_id, description, type, status, admin_response, created_at, updated_at, user_id, departure_time, overstay_duration, image_url, damage_type, damage_severity, overstay_charge) FROM stdin;
f65368e4-8b9c-4f4d-a43a-a3d011e4e118	64f7b699-a111-4e25-a4cc-c5976a715959	Overstay of 1356 minutes detected for reservation ending at Nov 12, 2024 10:16 PM.	Renter Overstay	resolved	Nahasdasdasd	2024-11-11 20:52:10.987097+00	2024-11-11 22:46:12.716794+00	4e43aa54-5313-4f02-985f-efe54b48adc7	2024-11-13 20:52:00+00	1056	/static/images/13c5302e-bbe8-4ff1-a15f-3d5422c10448.png	\N	\N	52.80
44129262-6071-44c8-b060-73649fe8dd86	64f7b699-a111-4e25-a4cc-c5976a715959	asdsadasdsadasda	Damage Report	resolved	lmao L	2024-11-11 03:52:33.559708+00	2024-11-11 22:46:35.778124+00	4e43aa54-5313-4f02-985f-efe54b48adc7	\N	\N	/static/images/e2a357c7-6f5e-4375-922f-f9a5ac437a11.png	asdasdasda	Moderate	\N
05011f83-a72c-4bb7-8c9d-f7f302920ea9	64f7b699-a111-4e25-a4cc-c5976a715959	asdadsasdadssad	Damage Report	resolved	asdasdasd	2024-11-11 03:42:43.429122+00	2024-11-11 22:46:40.543245+00	4e43aa54-5313-4f02-985f-efe54b48adc7	\N	\N	/static/images/ba593b49-625f-4853-81cd-a012a2fe39f2.png	asdsadasdasda	Minor	\N
03407bd4-04bd-4ed8-9935-62daab3fe831	64f7b699-a111-4e25-a4cc-c5976a715959	Overstay of 4646 minutes detected for reservation ending at Nov 12, 2024 10:16 PM.	Renter Overstay	resolved	asdada	2024-11-11 03:42:31.549459+00	2024-11-11 22:46:43.961719+00	4e43aa54-5313-4f02-985f-efe54b48adc7	2024-11-16 03:42:00+00	4346	/static/images/2c6050de-7c63-4952-8766-7eb56759871b.png	\N	\N	217.30
f4341a30-e637-42f3-99ae-91c3b9318e30	64f7b699-a111-4e25-a4cc-c5976a715959	asdsadadsadsa	Reservation Issue	resolved	Fine	2024-11-11 03:42:18.704433+00	2024-11-11 22:46:51.506828+00	3ceafe32-5706-4fef-aa09-80f1c29ae821	\N	\N	\N	\N	\N	\N
0a631c10-db93-468d-943c-3da3e57536ae	\N	asdsadasdasda	Other	resolved	All good.	2024-11-11 03:42:10.859119+00	2024-11-11 22:46:58.571764+00	3ceafe32-5706-4fef-aa09-80f1c29ae821	\N	\N	\N	\N	\N	\N
eb8ca88b-516f-4b23-8d0d-09b6d676397b	\N	asdsadasdasda	Other	resolved	okay	2024-11-11 03:39:41.912704+00	2024-11-11 22:47:08.039951+00	3ceafe32-5706-4fef-aa09-80f1c29ae821	\N	\N	\N	\N	\N	\N
f6076da5-f7ab-4338-a131-8055f95fa3fa	64f7b699-a111-4e25-a4cc-c5976a715959	asdasdasdadas	Reservation Issue	resolved	jhdjkahdkjdkjahdkjsa	2024-11-11 03:39:27.998171+00	2024-11-11 22:48:29.923469+00	3ceafe32-5706-4fef-aa09-80f1c29ae821	\N	\N	\N	\N	\N	\N
f77b7008-bed2-4832-8b0d-9df33b19d82d	64f7b699-a111-4e25-a4cc-c5976a715959	adsasdadasd	Damage Report	resolved	asdasdadasd	2024-11-11 03:38:29.765532+00	2024-11-11 22:51:48.326473+00	4e43aa54-5313-4f02-985f-efe54b48adc7	\N	\N	/static/images/491b7733-baf9-4884-bca2-adeb748974f1.png	asdasdad	Moderate	\N
03fc0438-4d5f-4fba-a176-1fd561d87e2d	64f7b699-a111-4e25-a4cc-c5976a715959	Many scratches left on the space	Damage Report	resolved	asdsadadasd	2024-11-11 03:18:32.7137+00	2024-11-11 22:52:49.481592+00	4e43aa54-5313-4f02-985f-efe54b48adc7	\N	\N	/static/images/c6be997c-a288-497b-8795-0f8b5475df20.png	Lots of scratches	Severe	\N
7cb2fa5a-89e1-4084-9028-933a22411d73	64f7b699-a111-4e25-a4cc-c5976a715959	asdasdadadasdads	Reservation Issue	resolved	asdasdasda	2024-11-11 03:17:35.882651+00	2024-11-11 22:52:54.292712+00	3ceafe32-5706-4fef-aa09-80f1c29ae821	\N	\N	\N	\N	\N	\N
e4eea639-54df-47f5-8061-a5530b251452	64f7b699-a111-4e25-a4cc-c5976a715959	Overstay of 301 minutes detected for reservation ending at Nov 12, 2024 10:16 PM. Also didn't respond to texts.	Renter Overstay	resolved	asddadasdsa	2024-11-11 03:17:57.999074+00	2024-11-11 22:53:02.206899+00	4e43aa54-5313-4f02-985f-efe54b48adc7	2024-11-13 03:17:00+00	1	/static/images/fe4988b2-444a-43d2-9ef4-65a11c9245e0.png	\N	\N	0.05
5bad3317-4d47-4c16-963e-892c4dafed6c	64f7b699-a111-4e25-a4cc-c5976a715959	Overstay of 1761 minutes detected for reservation ending at Nov 12, 2024 10:16 PM.	Renter Overstay	resolved	asdasdsddadadsa	2024-11-11 03:38:06.201072+00	2024-11-11 22:54:22.497166+00	4e43aa54-5313-4f02-985f-efe54b48adc7	2024-11-14 03:37:00+00	1461	/static/images/a3aff676-1c26-4cfa-9135-b125a267748d.png	\N	\N	73.05
dfa1540b-4435-4843-9b79-b2088f2d00a1	64f7b699-a111-4e25-a4cc-c5976a715959	hasjdhasjkdhakjdahd	Reservation Issue	open	\N	2024-11-12 00:37:55.463874+00	2024-11-12 00:37:55.463874+00	3ceafe32-5706-4fef-aa09-80f1c29ae821	\N	\N	\N	\N	\N	\N
140285fc-d543-4536-91e2-52c640087130	64f7b699-a111-4e25-a4cc-c5976a715959	Damaasdlkasjdakjdklad	Damage Report	open	\N	2024-11-12 00:40:41.992876+00	2024-11-12 00:40:41.992876+00	4e43aa54-5313-4f02-985f-efe54b48adc7	\N	\N	/static/images/92aaadf2-2a81-408a-81ae-441551f34d7f.png	Scratch	Moderate	\N
87a14980-3a21-40d6-9af3-0c4ce38f54d0	64f7b699-a111-4e25-a4cc-c5976a715959	Overstay of 3729 minutes detected for reservation ending at Nov 12, 2024 10:16 PM. This picture shows they are still there	Renter Overstay	resolved	Okay, email me at a@asd.asd	2024-11-12 00:39:19.394521+00	2024-11-12 00:41:17.181439+00	4e43aa54-5313-4f02-985f-efe54b48adc7	2024-11-15 12:25:00+00	3429	/static/images/2c4a9a4f-d154-471f-9bfe-80cc70818ef6.png	\N	\N	171.45
facf1f46-436c-4940-95cb-1858fd8c933a	64f7b699-a111-4e25-a4cc-c5976a715959	Overstay of 4481 minutes detected for reservation ending at Nov 12, 2024 10:16 PM.	Renter Overstay	open	\N	2024-11-12 00:57:23.473687+00	2024-11-12 00:57:23.473687+00	4e43aa54-5313-4f02-985f-efe54b48adc7	2024-11-16 00:57:00+00	4181	/static/images/4bd6f1b2-a30a-4cf1-b372-4c1cf2b4b90c.png	\N	\N	209.05
f7b4bd8b-4e54-4054-80dd-f906acad8a3b	64f7b699-a111-4e25-a4cc-c5976a715959	asdasdadadsadadsa	Reservation Issue	open	\N	2024-11-12 00:57:38.165326+00	2024-11-12 00:57:38.165326+00	3ceafe32-5706-4fef-aa09-80f1c29ae821	\N	\N	\N	\N	\N	\N
db51c7bc-6cce-4808-876b-92d573beb270	64f7b699-a111-4e25-a4cc-c5976a715959	Testadsdasdada	Reservation Issue	open	\N	2024-11-12 01:00:11.010936+00	2024-11-12 01:00:11.010936+00	3ceafe32-5706-4fef-aa09-80f1c29ae821	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: reservations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reservations (id, parking_space_id, renter_id, car_info_id, status, created_at, updated_at, "time", price, acknowledged) FROM stdin;
64f7b699-a111-4e25-a4cc-c5976a715959	0c1d42db-16e1-4626-8699-d9687a4d2867	3ceafe32-5706-4fef-aa09-80f1c29ae821	1ff4c7dc-ae8a-44b2-92c0-88f8b06057c7	booked	2024-11-11 03:16:41.316891+00	2024-11-11 22:52:57.264755+00	["2024-11-12 03:16:00+00","2024-11-13 03:16:00+00"]	48	t
c5237f3c-3a90-4b3e-878e-c221fba7ef6c	fa255a66-c214-4e74-9811-25ae92911096	3ceafe32-5706-4fef-aa09-80f1c29ae821	1ff4c7dc-ae8a-44b2-92c0-88f8b06057c7	booked	2024-11-12 01:14:04.513278+00	2024-11-12 01:14:04.513278+00	["2024-11-15 01:13:00+00","2024-11-23 01:14:00+00"]	1920.1666666666667	f
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
1	0c1d42db-16e1-4626-8699-d9687a4d2867	["2024-11-04 04:59:00+00","2025-11-03 05:00:00+00"]
3	fa255a66-c214-4e74-9811-25ae92911096	["2024-11-11 04:59:00+00","2025-11-10 05:00:00+00"]
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
2	4e43aa54-5313-4f02-985f-efe54b48adc7	xpark_6pqmFseOhnKOXdO6DC9TeMk6MjBqFkY6j2oGHUP2oBg	2024-12-12 01:16:02.652365
1	3ceafe32-5706-4fef-aa09-80f1c29ae821	xpark_mkTEMD9Ty3SwJVbZXMJjkUttNVYD99YbEmZO5Fcs2QI	2024-12-12 01:16:09.024437
3	c7264d82-6b1e-4b08-8a1e-e39af9ab6dc8	xpark_A-wQnhSpq5WHfaDpSefBERFZpcKhe8bGB-MNnz77yio	2024-12-12 01:12:24.235935
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, name, email, password_hash, deleted_at, user_preferences) FROM stdin;
3ceafe32-5706-4fef-aa09-80f1c29ae821	Test User 1	xparkusr1@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$0dW+FhsE7MupkHOC3LdlXw$1DNkodmxy+9zIA2SEoyL5erxx8ZbCadz8PttUuQKdD4	\N	{"notification_time": "30"}
4e43aa54-5313-4f02-985f-efe54b48adc7	Test User 2	xparkusr2@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$uGSH164Fa1UdHx6FquEc5g$SS62djQOI4yC7OqnosUuB9a3tpmDqd/y1XbTfstBA8Y	\N	{"notification_time": "30"}
c7264d82-6b1e-4b08-8a1e-e39af9ab6dc8	Test User 3	xparkusr3@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$oQSDbrq8mhhngCV7lrRE1w$Q9itTkHavAWO9ThytLxhOZvO2abbnO3UugIGRe1VDWw	\N	{"notification_time": "30"}
\.


--
-- Name: paid_parking_allowed_availability_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.paid_parking_allowed_availability_id_seq', 728, true);


--
-- Name: timetable_coalesce_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.timetable_coalesce_id_seq', 4, true);


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

SELECT pg_catalog.setval('public.user_tokens_id_seq', 3, true);


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
-- Name: cars cars_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cars
    ADD CONSTRAINT cars_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: paid_parking_allowed_availability paid_parking_allowed_availability_parking_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paid_parking_allowed_availability
    ADD CONSTRAINT paid_parking_allowed_availability_parking_space_id_fkey FOREIGN KEY (parking_space_id) REFERENCES public.parking_spaces(id);


--
-- Name: paid_parking_allowed_availability paid_parking_allowed_availability_parking_space_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paid_parking_allowed_availability
    ADD CONSTRAINT paid_parking_allowed_availability_parking_space_id_fkey1 FOREIGN KEY (parking_space_id) REFERENCES public.parking_spaces(id) ON DELETE CASCADE;


--
-- Name: parking_spaces parking_spaces_owner_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parking_spaces
    ADD CONSTRAINT parking_spaces_owner_fkey FOREIGN KEY (owner) REFERENCES public.users(id);


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

